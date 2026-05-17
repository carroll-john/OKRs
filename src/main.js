import {
  CONFIDENCE_OPTIONS,
  DEMO_CREDENTIALS,
  INITIATIVE_STATUS_OPTIONS,
  KR_STATUS_OPTIONS,
} from "./data.js";
import {
  activeCycle,
  activeWorkspace,
  buildNeedsAttention,
  dashboardSummary,
  derivedConfidence,
  derivedKeyResultStatus,
  filterDashboard,
  getKeyResult,
  hasBlocker,
  initiativesForKeyResult,
  isKeyResultStale,
  keyResultsForObjective,
  latestWeeklyUpdate,
  membershipName,
  progressForKeyResult,
} from "./domain.js";
import { clearSession, loadPlanFromStorage, loadSession, savePlanToStorage, saveSession } from "./storage.js";

const app = document.querySelector("#app");
const persisted = loadPlanFromStorage();

const views = [
  ["plan", "Plan Quarter"],
  ["review", "Review Dashboard"],
  ["weekly", "Weekly Update"],
];

const state = {
  booting: true,
  view: "plan",
  plan: persisted.plan,
  user: loadSession(),
  savedAt: persisted.savedAt,
  storageWarning: persisted.warning,
  loginError: "",
  saveState: "idle",
  config: {
    databaseConfigured: false,
    model: "okr-v1",
  },
  filters: {
    workspaceId: "ALL",
    ownerMembershipId: "ALL",
    krStatus: "ALL",
    confidence: "ALL",
    initiativeStatus: "ALL",
    staleOnly: false,
    blockersOnly: false,
  },
  weeklyForm: {
    keyResultId: persisted.plan.keyResults[0]?.id ?? "",
    weekStart: todayDate(),
    value: "",
    confidence: "MEDIUM",
    status: "ON_TRACK",
    blockers: "",
    nextStep: "",
  },
  apiMessage: null,
};

init();

async function init() {
  render();
  try {
    const response = await fetch("/api/config");
    if (response.ok) state.config = await response.json();
  } catch {
    state.config = { databaseConfigured: false, model: "okr-v1" };
  } finally {
    state.booting = false;
    render();
  }
}

function render() {
  if (state.booting) {
    app.innerHTML = renderLoading();
    return;
  }

  if (!state.user) {
    app.innerHTML = renderLogin();
    return;
  }

  app.innerHTML = `
    <div class="app-shell">
      ${renderTopbar()}
      <main class="page-shell">
        ${renderGlobalStates()}
        ${renderViewIntro()}
        ${renderPrimaryNav()}
        ${renderActiveView()}
      </main>
    </div>
  `;
}

function renderTopbar() {
  const workspace = activeWorkspace(state.plan);
  const cycle = activeCycle(state.plan);

  return `
    <header class="topbar">
      <div>
        <p class="context-label">${escapeHtml(workspace?.name ?? "No workspace")}</p>
        <h1>${escapeHtml(cycle?.name ?? "No active cycle")}</h1>
      </div>
      <div class="topbar-context" aria-label="Active context">
        <span>${escapeHtml(workspace?.name ?? "No workspace")}</span>
        <span>${escapeHtml(cycle?.name ?? "No active cycle")}</span>
      </div>
      <div class="topbar-actions">
        <span class="mode-badge ${state.config.databaseConfigured ? "mode-db" : "mode-demo"}">
          ${state.config.databaseConfigured ? "Database" : "Demo mode"}
        </span>
        <span class="user-chip">${escapeHtml(state.user.name)}</span>
        <button class="ghost-button" data-action="sign-out" type="button">Sign out</button>
      </div>
    </header>
  `;
}

function renderGlobalStates() {
  const messages = [];

  if (state.storageWarning) {
    messages.push(`<div class="notice notice-warning" role="status">${escapeHtml(state.storageWarning)}</div>`);
  }

  if (state.saveState === "saved") {
    messages.push(`<div class="notice notice-success" role="status">Saved browser plan at ${formatTimestamp(state.savedAt)}.</div>`);
  }

  return messages.join("");
}

function renderViewIntro() {
  return `
    <section class="view-intro">
      <div>
        <p class="context-label">Quarterly OKR planning</p>
        <h2>Plan the quarter, then review weekly progress.</h2>
        <p>
          Enter objectives, measurable key results, and the initiatives expected to move them. The dashboard keeps stale updates, blockers, and at-risk KRs visible for weekly check-ins.
        </p>
      </div>
      <div class="view-actions">
        <a class="secondary-button" href="/api/export/csv" download="okr-dashboard.csv">Export CSV</a>
        <button class="primary-button" data-action="save-plan" type="button" ${state.saveState === "saving" ? "disabled" : ""}>
          ${state.saveState === "saving" ? "Saving..." : "Save plan"}
        </button>
      </div>
    </section>
  `;
}

function renderPrimaryNav() {
  return `
    <nav class="flow-nav" aria-label="Primary workflow">
      ${views
        .map(
          ([view, label], index) => `
            <button class="flow-step ${state.view === view ? "is-active" : ""}" data-action="set-view" data-view="${view}" type="button">
              <span>${index + 1}</span>
              ${escapeHtml(label)}
            </button>
          `,
        )
        .join("")}
    </nav>
  `;
}

function renderActiveView() {
  if (!activeWorkspace(state.plan)) return renderEmptyPanel("No workspace", "This demo needs an active workspace before OKRs can be planned.");
  if (!activeCycle(state.plan)) return renderEmptyPanel("No active cycle", "Create or select an active cycle to plan quarterly OKRs.");

  if (state.view === "review") return renderReviewDashboard();
  if (state.view === "weekly") return renderWeeklyUpdate();
  return renderPlanQuarter();
}

function renderLoading() {
  return `
    <main class="loading-page" aria-busy="true">
      <section class="loading-panel">
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton skeleton-line"></div>
        <div class="skeleton skeleton-grid">
          <div class="skeleton skeleton-card"></div>
          <div class="skeleton skeleton-card"></div>
          <div class="skeleton skeleton-card"></div>
        </div>
      </section>
    </main>
  `;
}

function renderLogin() {
  return `
    <main class="login-page">
      <section class="login-card" aria-labelledby="login-title">
        <div class="brand-mark">OKR</div>
        <h1 id="login-title">Sign in</h1>
        <p class="login-copy">Use the demo manager account to plan and review Q2 OKRs.</p>
        <form class="stacked-form" data-login-form>
          <label>
            Email
            <input name="email" type="email" autocomplete="email" value="${escapeAttr(DEMO_CREDENTIALS.email)}" required />
          </label>
          <label>
            Password
            <input name="password" type="password" autocomplete="current-password" value="${escapeAttr(DEMO_CREDENTIALS.password)}" required />
          </label>
          ${state.loginError ? `<div class="form-error" role="alert">${escapeHtml(state.loginError)}</div>` : ""}
          <button class="primary-button" type="submit">Continue</button>
        </form>
      </section>
    </main>
  `;
}

function renderPlanQuarter() {
  return `
    <section class="object-strip" aria-label="OKR hierarchy">
      ${renderObjectNode("Objective", "Qualitative quarterly outcome", "objective")}
      ${renderConnector()}
      ${renderObjectNode("Key Result", "Metric, baseline, target", "kr")}
      ${renderConnector()}
      ${renderObjectNode("Initiative", "Work expected to move a KR", "initiative")}
      ${renderConnector()}
      ${renderObjectNode("Weekly Update", "Progress, confidence, blockers", "update")}
    </section>
    <section class="planner-layout">
      <div class="planner-main">
        ${state.plan.objectives.length ? state.plan.objectives.map(renderObjectiveEditor).join("") : renderEmptyPanel("No objectives yet", "Add an objective to start planning this quarter.")}
        <button class="secondary-button add-button" data-action="add-objective" type="button">Add objective</button>
      </div>
      <aside class="panel checklist-panel">
        ${renderPanelHeading("Planning checklist", "Keep the structure complete without turning this into task management.")}
        ${renderChecklistItem("Every objective has an owner.", state.plan.objectives.every((objective) => objective.ownerMembershipId))}
        ${renderChecklistItem("Every objective has at least one key result.", state.plan.objectives.every((objective) => keyResultsForObjective(state.plan, objective.id).length > 0))}
        ${renderChecklistItem("Every key result has baseline, target, and unit.", state.plan.keyResults.every((keyResult) => keyResult.title && keyResult.metricUnit && Number.isFinite(Number(keyResult.baseline)) && Number.isFinite(Number(keyResult.target))))}
        ${renderChecklistItem("Every key result has at least one initiative.", state.plan.keyResults.every((keyResult) => initiativesForKeyResult(state.plan, keyResult.id).length > 0))}
        <div class="local-save-box">
          <strong>Browser demo save</strong>
          <p>${state.savedAt ? `Last saved ${formatTimestamp(state.savedAt)}.` : "Not saved in this browser yet."}</p>
        </div>
      </aside>
    </section>
  `;
}

function renderObjectiveEditor(objective) {
  const keyResults = keyResultsForObjective(state.plan, objective.id);

  return `
    <article class="objective-card">
      <div class="object-card-heading">
        <div>
          <span class="object-label objective-label">Objective</span>
          <h3>${escapeHtml(objective.title || "Untitled objective")}</h3>
        </div>
        <button class="ghost-button" data-action="remove-objective" data-objective-id="${escapeAttr(objective.id)}" type="button">Remove</button>
      </div>
      <div class="field-grid two">
        <label>
          Objective title
          <input data-plan-field data-entity="objective" data-id="${escapeAttr(objective.id)}" data-field="title" value="${escapeAttr(objective.title)}" />
        </label>
        <label>
          Owner
          ${renderOwnerSelect("objective", objective.id, objective.ownerMembershipId)}
        </label>
      </div>
      <div class="kr-editor-list">
        ${keyResults.length ? keyResults.map(renderKeyResultEditor).join("") : renderMiniEmpty("No key results yet. Add one measurable outcome.")}
      </div>
      <button class="secondary-button add-button" data-action="add-kr" data-objective-id="${escapeAttr(objective.id)}" type="button">Add key result</button>
    </article>
  `;
}

function renderKeyResultEditor(keyResult) {
  const initiatives = initiativesForKeyResult(state.plan, keyResult.id);

  return `
    <section class="kr-editor">
      <div class="object-card-heading compact">
        <div>
          <span class="object-label kr-label">Key Result</span>
          <h4>${escapeHtml(keyResult.title || "Untitled key result")}</h4>
        </div>
        <button class="ghost-button" data-action="remove-kr" data-kr-id="${escapeAttr(keyResult.id)}" type="button">Remove KR</button>
      </div>
      <div class="field-grid five">
        <label>
          KR title
          <input data-plan-field data-entity="keyResult" data-id="${escapeAttr(keyResult.id)}" data-field="title" value="${escapeAttr(keyResult.title)}" />
        </label>
        <label>
          Unit
          <input data-plan-field data-entity="keyResult" data-id="${escapeAttr(keyResult.id)}" data-field="metricUnit" value="${escapeAttr(keyResult.metricUnit)}" />
        </label>
        <label>
          Baseline
          <input data-plan-field data-entity="keyResult" data-id="${escapeAttr(keyResult.id)}" data-field="baseline" type="number" step="any" value="${escapeAttr(keyResult.baseline)}" />
        </label>
        <label>
          Target
          <input data-plan-field data-entity="keyResult" data-id="${escapeAttr(keyResult.id)}" data-field="target" type="number" step="any" value="${escapeAttr(keyResult.target)}" />
        </label>
        <label>
          Owner
          ${renderOwnerSelect("keyResult", keyResult.id, keyResult.ownerMembershipId)}
        </label>
      </div>
      <div class="initiative-editor-list">
        ${initiatives.length ? initiatives.map(renderInitiativeEditor).join("") : renderMiniEmpty("No initiatives linked to this KR yet.")}
      </div>
      <button class="secondary-button add-button" data-action="add-initiative" data-kr-id="${escapeAttr(keyResult.id)}" type="button">Add initiative</button>
    </section>
  `;
}

function renderInitiativeEditor(initiative) {
  return `
    <article class="initiative-editor">
      <div class="object-card-heading compact">
        <div>
          <span class="object-label initiative-label">Initiative</span>
          <strong>${escapeHtml(initiative.title || "Untitled initiative")}</strong>
        </div>
        <button class="ghost-button" data-action="remove-initiative" data-initiative-id="${escapeAttr(initiative.id)}" type="button">Remove</button>
      </div>
      <div class="field-grid initiative-fields">
        <label>
          Title
          <input data-plan-field data-entity="initiative" data-id="${escapeAttr(initiative.id)}" data-field="title" value="${escapeAttr(initiative.title)}" />
        </label>
        <label>
          Owner
          ${renderOwnerSelect("initiative", initiative.id, initiative.ownerMembershipId)}
        </label>
        <label>
          Status
          <select data-plan-field data-entity="initiative" data-id="${escapeAttr(initiative.id)}" data-field="status">
            ${INITIATIVE_STATUS_OPTIONS.map((status) => `<option value="${status}" ${initiative.status === status ? "selected" : ""}>${formatStatus(status)}</option>`).join("")}
          </select>
        </label>
        <label>
          Due date
          <input data-plan-field data-entity="initiative" data-id="${escapeAttr(initiative.id)}" data-field="dueDate" type="date" value="${escapeAttr(initiative.dueDate ?? "")}" />
        </label>
        <label class="wide-field">
          Notes
          <input data-plan-field data-entity="initiative" data-id="${escapeAttr(initiative.id)}" data-field="notes" value="${escapeAttr(initiative.notes ?? "")}" />
        </label>
      </div>
    </article>
  `;
}

function renderReviewDashboard() {
  const summary = dashboardSummary(state.plan);
  const filteredObjectives = filterDashboard(state.plan, state.filters);
  const attentionItems = buildNeedsAttention(state.plan);

  return `
    <section class="dashboard-layout">
      <div class="dashboard-main">
        <section class="metric-grid">
          ${renderMetric("Objectives", summary.objectives, "Quarter outcomes")}
          ${renderMetric("Key results", summary.keyResults, "Progress proof")}
          ${renderMetric("Initiatives", summary.initiatives, "Linked work")}
          ${renderMetric("At risk", summary.atRiskKrs, "KR status")}
          ${renderMetric("Stale", summary.staleKrs, "Needs update")}
          ${renderMetric("Blocked", summary.blockedInitiatives, "Initiatives")}
        </section>
        ${renderFilterPanel()}
        <section class="hierarchy-stack">
          ${filteredObjectives.length ? filteredObjectives.map(renderObjectiveReview).join("") : renderEmptyPanel("No matching dashboard results", "Adjust filters to see more objectives, key results, or initiatives.")}
        </section>
      </div>
      <aside class="panel attention-panel">
        ${renderPanelHeading("Needs attention", "Blockers, stale updates, and at-risk KRs stay visible for the weekly review.")}
        ${attentionItems.length ? attentionItems.map(renderAttentionItem).join("") : renderMiniEmpty("No current attention items.")}
      </aside>
    </section>
  `;
}

function renderFilterPanel() {
  return `
    <section class="panel filter-panel" aria-label="Dashboard filters">
      <div class="filter-row">
        <label>
          Workspace
          <select data-filter-field="workspaceId">
            <option value="ALL">All workspaces</option>
            ${state.plan.workspaces.map((workspace) => `<option value="${workspace.id}" ${state.filters.workspaceId === workspace.id ? "selected" : ""}>${escapeHtml(workspace.name)}</option>`).join("")}
          </select>
        </label>
        <label>
          Owner
          <select data-filter-field="ownerMembershipId">
            <option value="ALL">All owners</option>
            ${state.plan.memberships.map((membership) => `<option value="${membership.id}" ${state.filters.ownerMembershipId === membership.id ? "selected" : ""}>${escapeHtml(membership.name)}</option>`).join("")}
          </select>
        </label>
        <label>
          KR status
          <select data-filter-field="krStatus">
            <option value="ALL">All statuses</option>
            ${KR_STATUS_OPTIONS.map((status) => `<option value="${status}" ${state.filters.krStatus === status ? "selected" : ""}>${formatStatus(status)}</option>`).join("")}
          </select>
        </label>
        <label>
          Confidence
          <select data-filter-field="confidence">
            <option value="ALL">All confidence</option>
            ${CONFIDENCE_OPTIONS.map((confidence) => `<option value="${confidence}" ${state.filters.confidence === confidence ? "selected" : ""}>${formatStatus(confidence)}</option>`).join("")}
          </select>
        </label>
        <label>
          Initiative status
          <select data-filter-field="initiativeStatus">
            <option value="ALL">All initiatives</option>
            ${INITIATIVE_STATUS_OPTIONS.map((status) => `<option value="${status}" ${state.filters.initiativeStatus === status ? "selected" : ""}>${formatStatus(status)}</option>`).join("")}
          </select>
        </label>
        <label class="check-filter">
          <input data-filter-field="staleOnly" type="checkbox" ${state.filters.staleOnly ? "checked" : ""} />
          Stale only
        </label>
        <label class="check-filter">
          <input data-filter-field="blockersOnly" type="checkbox" ${state.filters.blockersOnly ? "checked" : ""} />
          Blockers only
        </label>
      </div>
    </section>
  `;
}

function renderObjectiveReview(objective) {
  return `
    <article class="objective-review">
      <div class="object-card-heading">
        <div>
          <span class="object-label objective-label">Objective</span>
          <h3>${escapeHtml(objective.title)}</h3>
        </div>
        <span class="owner-text">${escapeHtml(membershipName(state.plan, objective.ownerMembershipId))}</span>
      </div>
      <div class="review-kr-stack">
        ${objective.keyResults.map(renderKeyResultReview).join("")}
      </div>
    </article>
  `;
}

function renderKeyResultReview(keyResult) {
  const latest = keyResult.latestUpdate;
  const initiatives = keyResult.initiatives;
  const stale = keyResult.stale;
  const status = derivedKeyResultStatus(state.plan, keyResult);
  const confidence = derivedConfidence(state.plan, keyResult);

  return `
    <section class="kr-review">
      <div class="kr-progress-column">
        <div class="kr-title-row">
          <span class="object-label kr-label">Key Result</span>
          <h4>${escapeHtml(keyResult.title)}</h4>
        </div>
        <p class="muted-line">
          Baseline ${escapeHtml(keyResult.baseline)}${escapeHtml(keyResult.metricUnit)} -> target ${escapeHtml(keyResult.target)}${escapeHtml(keyResult.metricUnit)}
        </p>
        <div class="progress-row">
          <div class="progress-bar" aria-label="${escapeAttr(keyResult.title)} progress">
            <span style="width: ${keyResult.progress}%"></span>
          </div>
          <strong>${keyResult.progress}%</strong>
        </div>
        <div class="badge-row">
          ${renderStatusBadge(status)}
          ${renderConfidenceBadge(confidence)}
          ${stale ? `<span class="status-badge status-stale">Stale</span>` : ""}
          ${keyResult.hasBlocker ? `<span class="status-badge status-blocked">Blocked</span>` : ""}
        </div>
        <p class="update-note">
          ${latest ? `Latest value: ${escapeHtml(latest.value)}${escapeHtml(keyResult.metricUnit)}. Next step: ${escapeHtml(latest.nextStep)}.` : "No weekly update yet. Progress is shown as 0% until the KR has an update."}
        </p>
        ${latest?.blockers ? `<p class="blocker-line"><strong>Blocker:</strong> ${escapeHtml(latest.blockers)}</p>` : ""}
      </div>
      <div class="initiative-column">
        <span class="column-label">Initiatives</span>
        ${initiatives.length ? initiatives.map(renderInitiativeReview).join("") : renderMiniEmpty("No initiatives for this KR.")}
      </div>
    </section>
  `;
}

function renderInitiativeReview(initiative) {
  return `
    <article class="initiative-row">
      <div>
        <span class="object-label initiative-label">Initiative</span>
        <strong>${escapeHtml(initiative.title)}</strong>
        <p>${escapeHtml(membershipName(state.plan, initiative.ownerMembershipId))}${initiative.dueDate ? ` | Due ${escapeHtml(initiative.dueDate)}` : ""}</p>
      </div>
      ${renderStatusBadge(initiative.status)}
    </article>
  `;
}

function renderWeeklyUpdate() {
  const selectedKr = getKeyResult(state.plan, state.weeklyForm.keyResultId) ?? state.plan.keyResults[0] ?? null;

  return `
    <section class="weekly-layout">
      <article class="panel">
        ${renderPanelHeading("Weekly update API", "KR owners update progress, confidence, blockers, and next step.")}
        ${state.apiMessage ? `<div class="api-message ${state.apiMessage.type}" role="status">${escapeHtml(state.apiMessage.text)}</div>` : ""}
        ${selectedKr ? renderWeeklyForm(selectedKr) : renderEmptyPanel("No key results", "Add a key result before posting weekly updates.")}
      </article>
      <aside class="panel">
        ${renderPanelHeading("Current KR health", "Latest update state used by the dashboard.")}
        <div class="stack-list">
          ${state.plan.keyResults.map(renderWeeklyStatusRow).join("") || renderMiniEmpty("No key results yet.")}
        </div>
      </aside>
    </section>
  `;
}

function renderWeeklyForm(selectedKr) {
  return `
    <form class="weekly-form" data-weekly-form>
      <label class="wide-field">
        Key result
        <select name="keyResultId">
          ${state.plan.keyResults.map((keyResult) => `<option value="${keyResult.id}" ${selectedKr.id === keyResult.id ? "selected" : ""}>${escapeHtml(keyResult.title)}</option>`).join("")}
        </select>
      </label>
      <label>
        Week
        <input name="weekStart" type="date" value="${escapeAttr(state.weeklyForm.weekStart)}" required />
      </label>
      <label>
        Value
        <input name="value" type="number" step="any" value="${escapeAttr(state.weeklyForm.value)}" placeholder="${escapeAttr(latestWeeklyUpdate(state.plan, selectedKr.id)?.value ?? selectedKr.baseline)}" required />
      </label>
      <label>
        Confidence
        <select name="confidence">
          ${CONFIDENCE_OPTIONS.map((confidence) => `<option value="${confidence}" ${state.weeklyForm.confidence === confidence ? "selected" : ""}>${formatStatus(confidence)}</option>`).join("")}
        </select>
      </label>
      <label>
        Status
        <select name="status">
          ${KR_STATUS_OPTIONS.map((status) => `<option value="${status}" ${state.weeklyForm.status === status ? "selected" : ""}>${formatStatus(status)}</option>`).join("")}
        </select>
      </label>
      <label class="wide-field">
        Blockers
        <input name="blockers" value="${escapeAttr(state.weeklyForm.blockers)}" placeholder="Optional blocker" />
      </label>
      <label class="wide-field">
        Next step
        <input name="nextStep" value="${escapeAttr(state.weeklyForm.nextStep)}" placeholder="What should happen before the next check-in?" required />
      </label>
      <button class="primary-button" type="submit">Post weekly update</button>
    </form>
  `;
}

function renderWeeklyStatusRow(keyResult) {
  const latest = latestWeeklyUpdate(state.plan, keyResult.id);
  return `
    <article class="weekly-status-row">
      <div>
        <span class="object-label kr-label">Key Result</span>
        <strong>${escapeHtml(keyResult.title)}</strong>
        <p>${latest ? `Last update ${escapeHtml(latest.weekStart)} | value ${escapeHtml(latest.value)}${escapeHtml(keyResult.metricUnit)}` : "No weekly update yet"}</p>
      </div>
      <div class="badge-row">
        ${renderStatusBadge(derivedKeyResultStatus(state.plan, keyResult))}
        ${isKeyResultStale(state.plan, keyResult) ? `<span class="status-badge status-stale">Stale</span>` : ""}
      </div>
    </article>
  `;
}

function renderObjectNode(title, detail, tone) {
  return `
    <div class="object-node ${tone}-node">
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(detail)}</span>
    </div>
  `;
}

function renderConnector() {
  return `<div class="connector" aria-hidden="true"></div>`;
}

function renderOwnerSelect(entity, id, selectedId) {
  return `
    <select data-plan-field data-entity="${entity}" data-id="${escapeAttr(id)}" data-field="ownerMembershipId">
      ${state.plan.memberships.map((membership) => `<option value="${membership.id}" ${selectedId === membership.id ? "selected" : ""}>${escapeHtml(membership.name)}</option>`).join("")}
    </select>
  `;
}

function renderPanelHeading(title, description) {
  return `
    <div class="panel-heading">
      <div>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(description)}</p>
      </div>
    </div>
  `;
}

function renderMetric(label, value, detail) {
  return `
    <article class="metric-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <p>${escapeHtml(detail)}</p>
    </article>
  `;
}

function renderAttentionItem(item) {
  return `
    <article class="attention-item tone-${item.tone}">
      <span>${escapeHtml(item.type)}</span>
      <strong>${escapeHtml(item.title)}</strong>
      <p>${escapeHtml(item.detail)}</p>
      <small>${escapeHtml(item.meta)}</small>
    </article>
  `;
}

function renderChecklistItem(label, complete) {
  return `
    <div class="checklist-item ${complete ? "is-complete" : ""}">
      <span aria-hidden="true">${complete ? "✓" : ""}</span>
      <p>${escapeHtml(label)}</p>
    </div>
  `;
}

function renderStatusBadge(status) {
  return `<span class="status-badge status-${String(status).toLowerCase()}">${escapeHtml(formatStatus(status))}</span>`;
}

function renderConfidenceBadge(confidence) {
  return `<span class="status-badge confidence-${String(confidence).toLowerCase()}">${confidence === "NONE" ? "No confidence" : escapeHtml(formatStatus(confidence))}</span>`;
}

function renderMiniEmpty(message) {
  return `<div class="mini-empty">${escapeHtml(message)}</div>`;
}

function renderEmptyPanel(title, message) {
  return `
    <section class="empty-panel">
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(message)}</p>
    </section>
  `;
}

app.addEventListener("submit", async (event) => {
  const loginForm = event.target.closest("[data-login-form]");
  const weeklyForm = event.target.closest("[data-weekly-form]");

  if (loginForm) {
    event.preventDefault();
    const formData = new FormData(loginForm);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (email !== DEMO_CREDENTIALS.email || password !== DEMO_CREDENTIALS.password) {
      state.loginError = "Invalid login. Use the demo manager credentials.";
      render();
      return;
    }

    state.user = {
      id: "user-demo-manager",
      name: "Demo Manager",
      email,
    };
    state.loginError = "";
    saveSession(state.user);
    render();
  }

  if (weeklyForm) {
    event.preventDefault();
    state.weeklyForm = Object.fromEntries(new FormData(weeklyForm).entries());
    await postWeeklyUpdate();
  }
});

app.addEventListener("input", (event) => {
  const planField = event.target.closest("[data-plan-field]");
  const weeklyForm = event.target.closest("[data-weekly-form]");

  if (planField) {
    updatePlanField(planField);
  }

  if (weeklyForm) {
    state.weeklyForm = {
      ...state.weeklyForm,
      ...Object.fromEntries(new FormData(weeklyForm).entries()),
    };
  }
});

app.addEventListener("change", (event) => {
  const planField = event.target.closest("[data-plan-field]");
  const filterField = event.target.closest("[data-filter-field]");
  const weeklyForm = event.target.closest("[data-weekly-form]");

  if (planField) updatePlanField(planField);

  if (filterField) {
    const field = filterField.dataset.filterField;
    state.filters[field] = filterField.type === "checkbox" ? filterField.checked : filterField.value;
    render();
  }

  if (weeklyForm) {
    state.weeklyForm = {
      ...state.weeklyForm,
      ...Object.fromEntries(new FormData(weeklyForm).entries()),
    };
    if (event.target.name === "keyResultId") render();
  }
});

app.addEventListener("click", (event) => {
  const actionTarget = event.target.closest("[data-action]");
  if (!actionTarget) return;

  const { action } = actionTarget.dataset;

  if (action === "set-view") {
    state.view = actionTarget.dataset.view;
    render();
  }

  if (action === "sign-out") {
    clearSession();
    state.user = null;
    render();
  }

  if (action === "save-plan") {
    savePlan();
  }

  if (action === "add-objective") {
    addObjective();
  }

  if (action === "remove-objective") {
    removeObjective(actionTarget.dataset.objectiveId);
  }

  if (action === "add-kr") {
    addKeyResult(actionTarget.dataset.objectiveId);
  }

  if (action === "remove-kr") {
    removeKeyResult(actionTarget.dataset.krId);
  }

  if (action === "add-initiative") {
    addInitiative(actionTarget.dataset.krId);
  }

  if (action === "remove-initiative") {
    removeInitiative(actionTarget.dataset.initiativeId);
  }
});

function updatePlanField(element) {
  const { entity, id, field } = element.dataset;
  const collectionName = {
    objective: "objectives",
    keyResult: "keyResults",
    initiative: "initiatives",
  }[entity];

  const item = state.plan[collectionName]?.find((candidate) => candidate.id === id);
  if (!item) return;

  item[field] = element.type === "number" ? Number(element.value) : element.value;
}

function savePlan() {
  state.saveState = "saving";
  render();
  window.setTimeout(() => {
    state.savedAt = savePlanToStorage(state.plan);
    state.storageWarning = null;
    state.saveState = "saved";
    render();
  }, 200);
}

function addObjective() {
  const objectiveId = createId("objective");
  state.plan.objectives.push({
    id: objectiveId,
    cycleId: state.plan.activeCycleId,
    title: "New objective",
    ownerMembershipId: state.plan.memberships[0]?.id ?? "",
  });
  render();
}

function removeObjective(objectiveId) {
  const keyResultIds = keyResultsForObjective(state.plan, objectiveId).map((keyResult) => keyResult.id);
  state.plan.objectives = state.plan.objectives.filter((objective) => objective.id !== objectiveId);
  state.plan.keyResults = state.plan.keyResults.filter((keyResult) => keyResult.objectiveId !== objectiveId);
  state.plan.initiatives = state.plan.initiatives.filter((initiative) => !keyResultIds.includes(initiative.keyResultId));
  state.plan.weeklyUpdates = state.plan.weeklyUpdates.filter((update) => !keyResultIds.includes(update.keyResultId));
  render();
}

function addKeyResult(objectiveId) {
  state.plan.keyResults.push({
    id: createId("kr"),
    objectiveId,
    ownerMembershipId: state.plan.memberships[0]?.id ?? "",
    title: "New key result",
    metricUnit: "%",
    baseline: 0,
    target: 100,
  });
  render();
}

function removeKeyResult(keyResultId) {
  state.plan.keyResults = state.plan.keyResults.filter((keyResult) => keyResult.id !== keyResultId);
  state.plan.initiatives = state.plan.initiatives.filter((initiative) => initiative.keyResultId !== keyResultId);
  state.plan.weeklyUpdates = state.plan.weeklyUpdates.filter((update) => update.keyResultId !== keyResultId);
  if (state.weeklyForm.keyResultId === keyResultId) {
    state.weeklyForm.keyResultId = state.plan.keyResults[0]?.id ?? "";
  }
  render();
}

function addInitiative(keyResultId) {
  state.plan.initiatives.push({
    id: createId("initiative"),
    keyResultId,
    ownerMembershipId: state.plan.memberships[0]?.id ?? "",
    title: "New initiative",
    status: "NOT_STARTED",
    dueDate: "",
    notes: "",
  });
  render();
}

function removeInitiative(initiativeId) {
  state.plan.initiatives = state.plan.initiatives.filter((initiative) => initiative.id !== initiativeId);
  render();
}

async function postWeeklyUpdate() {
  state.apiMessage = {
    type: "info",
    text: "Posting weekly update...",
  };
  render();

  try {
    const response = await fetch("/api/weekly-updates", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...state.weeklyForm,
        userId: state.user.id,
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      state.apiMessage = {
        type: "error",
        text: result.message || "Weekly update was not accepted.",
      };
      render();
      return;
    }

    state.plan.weeklyUpdates = [
      ...state.plan.weeklyUpdates.filter((update) => !(update.keyResultId === result.update.keyResultId && update.weekStart === result.update.weekStart)),
      result.update,
    ];
    state.savedAt = savePlanToStorage(state.plan);
    state.apiMessage = {
      type: "success",
      text: `Weekly update saved for ${result.update.weekStart}.`,
    };
    state.weeklyForm = {
      ...state.weeklyForm,
      value: "",
      blockers: "",
      nextStep: "",
    };
    render();
  } catch {
    state.apiMessage = {
      type: "error",
      text: "Weekly update API is unavailable.",
    };
    render();
  }
}

function createId(prefix) {
  if (window.crypto?.randomUUID) return `${prefix}-${window.crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 1000)}`;
}

function formatStatus(status) {
  return String(status)
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatTimestamp(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}
