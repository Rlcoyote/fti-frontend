import { C } from "./config.js";

// ─── Report helpers (extracted from ReportsPage v28.237) ─────────────────────
// Shared by every report tab. NOTE: calcLineTotal/ticketTotal are kept DEFENSIVE
// here (|| 0, || []) — utils.js's versions omit those guards (NaN / throw on
// missing data), so deduping to them would change behavior. That dedup is a
// separate pass (harden utils first), per Article XXIV's Compression clause.

export const JOB_STATUS_REPORT = [
  { value: "Scheduled", label: "ACTIVE", color: "#1a5fa8" },
  { value: "Completed", label: "COMPLETED", color: "#1a7a3c" },
];

export const REPORT_TABS = [
  { key: "revenue", label: "Revenue" },
  { key: "operations", label: "Operations" },
  { key: "crew", label: "Crew & Hours" },
  { key: "efficiency", label: "Efficiency" },
  { key: "inventory", label: "Inventory" },
];

// "8:20 AM" → minutes since midnight, or null.
export const parseTime = (s) => {
  if (!s) return null;
  const m = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return null;
  let h = parseInt(m[1]);
  const min = parseInt(m[2]);
  const p = m[3].toUpperCase();
  if (p === "PM" && h !== 12) h += 12;
  if (p === "AM" && h === 12) h = 0;
  return h * 60 + min;
};

export const diffMinutes = (start, end) => {
  const s = parseTime(start);
  const e = parseTime(end);
  if (s === null || e === null) return null;
  let d = e - s;
  if (d < 0) d += 1440; // overnight
  return d;
};

export const fmtHrs = (mins) => {
  if (mins === null || mins === undefined) return "—";
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
};

export const fmtMoney = (n) => "$" + (n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const calcLineTotal = (li) => (li.rate || 0) * (li.qty || 0) * (li.days || 1);
export const ticketTotal = (t) => (t.lineItems || []).reduce((s, li) => s + calcLineTotal(li), 0);

export const getField = (t, camel, snake) => t[camel] || t[snake] || "";

// ── Shared card styles ──
export const cardStyle = { background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 6, padding: "20px 24px", marginBottom: 16 };
export const headerStyle = {
  fontSize: 13,
  fontWeight: 800,
  color: C.text,
  letterSpacing: "0.06em",
  marginBottom: 12,
  borderBottom: `2px solid ${C.red}`,
  paddingBottom: 8,
};
export const rowStyle = { display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.border}22`, fontSize: 13 };
