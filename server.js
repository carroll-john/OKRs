import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { cloneDemoPlan } from "./src/data.js";
import {
  activeCycle,
  activeWorkspace,
  csvEscape,
  derivedConfidence,
  derivedKeyResultStatus,
  getKeyResult,
  getObjective,
  initiativesForKeyResult,
  latestWeeklyUpdate,
  membershipName,
  progressForKeyResult,
  validateWeeklyUpdatePayload,
} from "./src/domain.js";

const root = fileURLToPath(new URL(".", import.meta.url));
const preferredPort = Number(process.env.PORT || 3000);
const plan = cloneDemoPlan();
const updateKeys = new Set(plan.weeklyUpdates.map((update) => updateKey(update.keyResultId, update.weekStart)));

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  try {
    if (url.pathname === "/api/config" && request.method === "GET") {
      return sendJson(response, 200, {
        databaseConfigured: Boolean(process.env.DATABASE_URL),
        model: "okr-v1",
      });
    }

    if (url.pathname === "/api/weekly-updates" && request.method === "POST") {
      return handleWeeklyUpdate(request, response);
    }

    if (url.pathname === "/api/export/csv" && request.method === "GET") {
      return handleCsvExport(response);
    }

    if (request.method === "GET") {
      return serveStatic(url.pathname, response);
    }

    sendJson(response, 405, { message: "Method not allowed." });
  } catch (error) {
    sendJson(response, 500, {
      message: "Unexpected server error.",
      detail: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

startServer(preferredPort);

function startServer(port) {
  server.once("error", (error) => {
    if (error.code === "EADDRINUSE" && !process.env.PORT) {
      startServer(port + 1);
      return;
    }

    throw error;
  });

  server.listen(port, "127.0.0.1", () => {
    console.log(`OKR prototype running at http://127.0.0.1:${port}`);
  });
}

async function handleWeeklyUpdate(request, response) {
  const payload = await readJsonBody(request);
  const validation = validateWeeklyUpdatePayload(payload, plan);

  if (!validation.ok) {
    const status = validation.errors.keyResultId ? 404 : 400;
    return sendJson(response, status, {
      message: validation.errors.keyResultId ? "Missing KR." : "Invalid weekly update payload.",
      errors: validation.errors,
    });
  }

  const duplicateKey = updateKey(validation.normalized.keyResultId, validation.normalized.weekStart);
  if (updateKeys.has(duplicateKey)) {
    return sendJson(response, 409, {
      message: "Weekly update already exists for this KR and week.",
      weekStart: validation.normalized.weekStart,
    });
  }

  const update = {
    id: `weekly-${validation.normalized.keyResultId}-${validation.normalized.weekStart}`,
    ...validation.normalized,
  };

  updateKeys.add(duplicateKey);
  plan.weeklyUpdates.push(update);

  return sendJson(response, 201, {
    message: "Weekly update saved.",
    update,
  });
}

function handleCsvExport(response) {
  const workspace = activeWorkspace(plan);
  const cycle = activeCycle(plan);
  const headers = [
    "workspace",
    "cycle",
    "objective",
    "objective_owner",
    "key_result",
    "kr_owner",
    "unit",
    "baseline",
    "target",
    "latest_value",
    "progress",
    "kr_status",
    "confidence",
    "blockers",
    "next_step",
    "initiative",
    "initiative_owner",
    "initiative_status",
    "initiative_due_date",
    "initiative_notes",
  ];

  const rows = plan.keyResults.flatMap((keyResult) => {
    const objective = getObjective(plan, keyResult.objectiveId);
    const latest = latestWeeklyUpdate(plan, keyResult.id);
    const initiatives = initiativesForKeyResult(plan, keyResult.id);
    const initiativeRows = initiatives.length > 0 ? initiatives : [null];

    return initiativeRows.map((initiative) => [
      workspace?.name ?? "",
      cycle?.name ?? "",
      objective?.title ?? "",
      objective ? membershipName(plan, objective.ownerMembershipId) : "",
      keyResult.title,
      membershipName(plan, keyResult.ownerMembershipId),
      keyResult.metricUnit,
      keyResult.baseline,
      keyResult.target,
      latest?.value ?? "",
      `${progressForKeyResult(plan, keyResult)}%`,
      derivedKeyResultStatus(plan, keyResult),
      derivedConfidence(plan, keyResult),
      latest?.blockers ?? "",
      latest?.nextStep ?? "",
      initiative?.title ?? "",
      initiative ? membershipName(plan, initiative.ownerMembershipId) : "",
      initiative?.status ?? "",
      initiative?.dueDate ?? "",
      initiative?.notes ?? "",
    ]);
  });

  const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");

  response.writeHead(200, {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": 'attachment; filename="okr-dashboard.csv"',
    "Cache-Control": "no-store",
    "X-Demo-Mode": process.env.DATABASE_URL ? "false" : "true",
  });
  response.end(csv);
}

async function serveStatic(pathname, response) {
  const filePath = pathname === "/" ? "index.html" : pathname.slice(1);
  const safePath = normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, "");
  const absolutePath = join(root, safePath);

  try {
    const content = await readFile(absolutePath);
    response.writeHead(200, {
      "Content-Type": contentType(absolutePath),
      "Cache-Control": "no-store",
    });
    response.end(content);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

function updateKey(keyResultId, weekStart) {
  return `${keyResultId}:${weekStart}`;
}

function contentType(pathname) {
  const extension = extname(pathname);
  const types = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
  };

  return types[extension] ?? "application/octet-stream";
}
