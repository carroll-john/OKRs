import { cloneDemoPlan, PLAN_MODEL_VERSION } from "./data.js";
import { isValidPlanShape } from "./domain.js";

const PLAN_STORAGE_KEY = "okr-v1-plan-v3";
const SESSION_STORAGE_KEY = "okr-demo-session-v1";

export function loadPlanFromStorage() {
  const fallback = {
    plan: cloneDemoPlan(),
    savedAt: null,
    warning: null,
  };

  const raw = window.localStorage.getItem(PLAN_STORAGE_KEY);
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw);
    const plan = parsed?.plan;
    if (!isValidPlanShape(plan, PLAN_MODEL_VERSION)) {
      throw new Error("Plan is missing the V1 OKR shape.");
    }

    return {
      plan,
      savedAt: parsed.savedAt ?? null,
      warning: null,
    };
  } catch {
    window.localStorage.removeItem(PLAN_STORAGE_KEY);
    return {
      ...fallback,
      warning: "Saved browser plan was unreadable or from an older prototype, so demo data was restored.",
    };
  }
}

export function savePlanToStorage(plan) {
  const savedAt = new Date().toISOString();
  window.localStorage.setItem(
    PLAN_STORAGE_KEY,
    JSON.stringify({
      version: PLAN_MODEL_VERSION,
      savedAt,
      plan,
    }),
  );
  return savedAt;
}

export function saveSession(user) {
  window.localStorage.setItem(
    SESSION_STORAGE_KEY,
    JSON.stringify({
      user,
      signedInAt: new Date().toISOString(),
    }),
  );
}

export function loadSession() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SESSION_STORAGE_KEY));
    return parsed?.user ?? null;
  } catch {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

export function clearSession() {
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
}
