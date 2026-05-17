import { CONFIDENCE_OPTIONS, INITIATIVE_STATUS_OPTIONS, KR_STATUS_OPTIONS } from "./data.js";

export const STALE_DAYS = 10;

export function activeWorkspace(plan) {
  return plan.workspaces.find((workspace) => workspace.id === plan.activeWorkspaceId) ?? null;
}

export function activeCycle(plan) {
  return plan.cycles.find((cycle) => cycle.id === plan.activeCycleId) ?? null;
}

export function membershipName(plan, membershipId) {
  return plan.memberships.find((membership) => membership.id === membershipId)?.name ?? "Unassigned";
}

export function getObjective(plan, objectiveId) {
  return plan.objectives.find((objective) => objective.id === objectiveId) ?? null;
}

export function getKeyResult(plan, keyResultId) {
  return plan.keyResults.find((keyResult) => keyResult.id === keyResultId) ?? null;
}

export function keyResultsForObjective(plan, objectiveId) {
  return plan.keyResults.filter((keyResult) => keyResult.objectiveId === objectiveId);
}

export function initiativesForKeyResult(plan, keyResultId) {
  return plan.initiatives.filter((initiative) => initiative.keyResultId === keyResultId);
}

export function weeklyUpdatesForKeyResult(plan, keyResultId) {
  return plan.weeklyUpdates
    .filter((update) => update.keyResultId === keyResultId)
    .sort((a, b) => b.weekStart.localeCompare(a.weekStart));
}

export function latestWeeklyUpdate(plan, keyResultId) {
  return weeklyUpdatesForKeyResult(plan, keyResultId)[0] ?? null;
}

export function normalizeWeekStart(input) {
  if (!input) return null;
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return null;

  const normalized = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = normalized.getUTCDay();
  const daysSinceMonday = (day + 6) % 7;
  normalized.setUTCDate(normalized.getUTCDate() - daysSinceMonday);
  return normalized.toISOString().slice(0, 10);
}

export function progressForKeyResult(plan, keyResult) {
  const latest = latestWeeklyUpdate(plan, keyResult.id);
  if (!latest) return 0;

  const baseline = Number(keyResult.baseline);
  const target = Number(keyResult.target);
  const value = Number(latest.value);
  const span = Math.abs(target - baseline);

  if (!Number.isFinite(span) || span === 0 || !Number.isFinite(value)) return 0;

  const raw =
    target >= baseline
      ? ((value - baseline) / span) * 100
      : ((baseline - value) / span) * 100;

  return Math.max(0, Math.min(100, Math.round(raw)));
}

export function isKeyResultStale(plan, keyResult, now = new Date()) {
  const latest = latestWeeklyUpdate(plan, keyResult.id);
  if (!latest) return true;

  const weekStart = new Date(`${latest.weekStart}T00:00:00.000Z`);
  if (Number.isNaN(weekStart.getTime())) return true;

  const ageInDays = (now.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24);
  return ageInDays > STALE_DAYS;
}

export function hasBlocker(plan, keyResult) {
  const latest = latestWeeklyUpdate(plan, keyResult.id);
  return Boolean(latest?.blockers?.trim()) || initiativesForKeyResult(plan, keyResult.id).some((initiative) => initiative.status === "BLOCKED");
}

export function derivedKeyResultStatus(plan, keyResult) {
  return latestWeeklyUpdate(plan, keyResult.id)?.status ?? "NO_UPDATE";
}

export function derivedConfidence(plan, keyResult) {
  return latestWeeklyUpdate(plan, keyResult.id)?.confidence ?? "NONE";
}

export function isAtRiskKeyResult(plan, keyResult) {
  const status = derivedKeyResultStatus(plan, keyResult);
  return status === "AT_RISK" || status === "OFF_TRACK";
}

export function dashboardSummary(plan) {
  const staleKrs = plan.keyResults.filter((keyResult) => isKeyResultStale(plan, keyResult)).length;
  const atRiskKrs = plan.keyResults.filter((keyResult) => isAtRiskKeyResult(plan, keyResult)).length;
  const blockedInitiatives = plan.initiatives.filter((initiative) => initiative.status === "BLOCKED").length;

  return {
    objectives: plan.objectives.length,
    keyResults: plan.keyResults.length,
    initiatives: plan.initiatives.length,
    atRiskKrs,
    staleKrs,
    blockedInitiatives,
  };
}

export function buildNeedsAttention(plan) {
  const items = [];

  for (const keyResult of plan.keyResults) {
    const latest = latestWeeklyUpdate(plan, keyResult.id);
    const objective = getObjective(plan, keyResult.objectiveId);

    if (latest?.blockers?.trim()) {
      items.push({
        type: "Blocker",
        tone: "rose",
        title: keyResult.title,
        detail: latest.blockers,
        meta: objective?.title ?? "Objective",
      });
    }

    if (isKeyResultStale(plan, keyResult)) {
      items.push({
        type: "Stale KR",
        tone: "amber",
        title: keyResult.title,
        detail: latest ? `Last update was ${latest.weekStart}.` : "No weekly update yet.",
        meta: objective?.title ?? "Objective",
      });
    }

    if (isAtRiskKeyResult(plan, keyResult)) {
      items.push({
        type: derivedKeyResultStatus(plan, keyResult).replace("_", " "),
        tone: latest?.status === "OFF_TRACK" ? "rose" : "amber",
        title: keyResult.title,
        detail: latest?.nextStep ?? "Needs owner update.",
        meta: objective?.title ?? "Objective",
      });
    }
  }

  for (const initiative of plan.initiatives.filter((item) => item.status === "BLOCKED")) {
    const keyResult = getKeyResult(plan, initiative.keyResultId);
    items.push({
      type: "Blocked initiative",
      tone: "rose",
      title: initiative.title,
      detail: initiative.notes || "Needs unblocker.",
      meta: keyResult?.title ?? "Key result",
    });
  }

  return items;
}

export function filterDashboard(plan, filters) {
  const normalized = {
    workspaceId: filters.workspaceId || "ALL",
    ownerMembershipId: filters.ownerMembershipId || "ALL",
    krStatus: filters.krStatus || "ALL",
    confidence: filters.confidence || "ALL",
    initiativeStatus: filters.initiativeStatus || "ALL",
    staleOnly: Boolean(filters.staleOnly),
    blockersOnly: Boolean(filters.blockersOnly),
  };

  return plan.objectives
    .filter((objective) => {
      const cycle = activeCycle(plan);
      if (normalized.workspaceId !== "ALL" && cycle?.workspaceId !== normalized.workspaceId) return false;
      return true;
    })
    .map((objective) => {
      const keyResults = keyResultsForObjective(plan, objective.id)
        .map((keyResult) => {
          let initiatives = initiativesForKeyResult(plan, keyResult.id);

          if (normalized.initiativeStatus !== "ALL") {
            initiatives = initiatives.filter((initiative) => initiative.status === normalized.initiativeStatus);
          }

          const ownerMatches =
            normalized.ownerMembershipId === "ALL" ||
            objective.ownerMembershipId === normalized.ownerMembershipId ||
            keyResult.ownerMembershipId === normalized.ownerMembershipId ||
            initiatives.some((initiative) => initiative.ownerMembershipId === normalized.ownerMembershipId);

          const krStatusMatches =
            normalized.krStatus === "ALL" || derivedKeyResultStatus(plan, keyResult) === normalized.krStatus;

          const confidenceMatches =
            normalized.confidence === "ALL" || derivedConfidence(plan, keyResult) === normalized.confidence;

          const staleMatches = !normalized.staleOnly || isKeyResultStale(plan, keyResult);
          const blockerMatches = !normalized.blockersOnly || hasBlocker(plan, keyResult);
          const initiativeMatches = normalized.initiativeStatus === "ALL" || initiatives.length > 0;

          if (!ownerMatches || !krStatusMatches || !confidenceMatches || !staleMatches || !blockerMatches || !initiativeMatches) {
            return null;
          }

          return {
            ...keyResult,
            initiatives,
            latestUpdate: latestWeeklyUpdate(plan, keyResult.id),
            progress: progressForKeyResult(plan, keyResult),
            stale: isKeyResultStale(plan, keyResult),
            hasBlocker: hasBlocker(plan, keyResult),
          };
        })
        .filter(Boolean);

      return {
        ...objective,
        keyResults,
      };
    })
    .filter((objective) => objective.keyResults.length > 0);
}

export function validateWeeklyUpdatePayload(payload, plan) {
  const errors = {};
  const keyResult = getKeyResult(plan, payload?.keyResultId);
  const weekStart = normalizeWeekStart(payload?.weekStart);
  const value = Number(payload?.value);
  const confidence = String(payload?.confidence ?? "");
  const status = String(payload?.status ?? "");
  const nextStep = String(payload?.nextStep ?? "").trim();
  const blockers = String(payload?.blockers ?? "").trim();
  const userId = String(payload?.userId ?? "").trim();

  if (!keyResult) errors.keyResultId = "Missing key result.";
  if (!weekStart) errors.weekStart = "Enter a valid weekly date.";
  if (!Number.isFinite(value)) errors.value = "Enter a numeric value.";
  if (!CONFIDENCE_OPTIONS.includes(confidence)) errors.confidence = "Choose a valid confidence.";
  if (!KR_STATUS_OPTIONS.includes(status)) errors.status = "Choose a valid status.";
  if (!nextStep) errors.nextStep = "Next step is required.";
  if (!userId) errors.userId = "User is required.";

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    normalized: {
      keyResultId: keyResult?.id,
      userId,
      weekStart,
      value,
      confidence,
      status,
      blockers,
      nextStep,
    },
  };
}

export function isValidPlanShape(plan, expectedVersion) {
  return Boolean(
    plan?.modelVersion === expectedVersion &&
      Array.isArray(plan?.workspaces) &&
      Array.isArray(plan?.memberships) &&
      Array.isArray(plan?.cycles) &&
      Array.isArray(plan?.objectives) &&
      Array.isArray(plan?.keyResults) &&
      Array.isArray(plan?.initiatives) &&
      Array.isArray(plan?.weeklyUpdates),
  );
}

export function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}
