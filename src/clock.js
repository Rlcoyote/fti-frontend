import { API_URL } from "./config.js";

// ─── CLOCK API CLIENT (v28.204, Labor Time Phase 2) ─────────────────────────
// Thin wrappers around /api/time. All self-scoped to the logged-in user.

async function j(method, path, body) {
  const r = await fetch(`${API_URL}/time${path}`, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
  return data;
}

export const getCurrent = () => j("GET", "/current");
export const getMine = (from, to) => {
  const qs = [];
  if (from) qs.push(`from=${from}`);
  if (to) qs.push(`to=${to}`);
  return j("GET", `/mine${qs.length ? `?${qs.join("&")}` : ""}`);
};
export const getClockable = () => j("GET", "/clockable");
export const clockIn = (payload) => j("POST", "/clock-in", payload); // { ticket_id } | { shop_ticket_id }
export const clockOut = () => j("POST", "/clock-out", {});

// Phase 5A — flag review queue (approve_time_corrections gated on the BE).
export const getFlagged = (status) => j("GET", `/flagged${status ? `?status=${status}` : ""}`);
export const approveEntry = (id) => j("POST", `/${id}/approve`, {});

// Format a seconds duration as Hh Mm (timestamp-native — never decimal).
export function fmtDur(seconds) {
  if (seconds == null) return "—";
  const m = Math.floor(seconds / 60);
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}
