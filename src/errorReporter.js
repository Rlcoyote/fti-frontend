import { API_URL } from "./config.js";
import { APP_VERSION } from "./version.js";

// ─── errorReporter (v28.368) — THE ERROR LOG's frontend half ────────────────
// Ratified 2026-07-20: "every error that is encountered is logged... with a
// complete description from when the user logged in to the error."
//
// Four mouths feed report():
//   1. window.onerror            — uncaught exceptions (severity: crash)
//   2. onunhandledrejection      — unawaited promise failures (crash)
//   3. ErrorBoundary             — React render crashes (crash)
//   4. api.js                    — 5xx / network failures (api)
//   plus data-sanity events from tolerant formatters (data).
//
// The STORY rides along: a rolling breadcrumb trail (login, navigation,
// API calls, key actions — last 40) so every report reads start-to-finish.
// Fire-and-forget, deduped by signature, capped per session: the reporter
// itself must never become a source of noise or failure.

const MAX_BREADCRUMBS = 40;
const MAX_REPORTS_PER_SESSION = 15;

const breadcrumbs = [];
const seen = new Set();
let reportCount = 0;
let currentUserName = null;

export function setReporterUser(name) {
  currentUserName = name || null;
}

export function addBreadcrumb(type, data) {
  breadcrumbs.push({ t: new Date().toISOString(), type, ...(data ? { data: String(data).slice(0, 200) } : {}) });
  if (breadcrumbs.length > MAX_BREADCRUMBS) breadcrumbs.shift();
}

export function reportError({ message, stack, severity = "error", context }) {
  try {
    const signature = `${severity}:${String(message).slice(0, 120)}`;
    if (seen.has(signature) || reportCount >= MAX_REPORTS_PER_SESSION) return;
    seen.add(signature);
    reportCount += 1;
    // fetch, not api.js — the reporter must not recurse through the layer it watches.
    fetch(`${API_URL}/errors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: String(message || "(no message)").slice(0, 2000),
        stack: stack ? String(stack).slice(0, 8000) : undefined,
        severity,
        context: { ...context, page: window.location?.pathname },
        breadcrumbs,
        app_version: APP_VERSION,
        user_name: currentUserName || undefined,
      }),
    }).catch(() => {});
  } catch {
    /* never throw from the reporter */
  }
}

// Mouths 1 + 2 — installed once at module load.
if (typeof window !== "undefined" && !window.__ftiErrorReporterInstalled) {
  window.__ftiErrorReporterInstalled = true;
  window.addEventListener("error", (e) => {
    reportError({ message: e.message || "window.onerror", stack: e.error?.stack, severity: "crash", context: { file: e.filename, line: e.lineno } });
  });
  window.addEventListener("unhandledrejection", (e) => {
    const r = e.reason;
    reportError({ message: r?.message || String(r), stack: r?.stack, severity: "crash", context: { kind: "unhandledrejection" } });
  });
}
