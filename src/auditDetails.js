// ─── auditDetails (v28.398) — ONE home for rendering audit `details` payloads
// as human-readable text (Reggie: "the log should say what happened, when and
// by whom" — not "changes: …"). Consumed by the meeting CHANGE LOG and the
// Activity Log (Entry 7).
const short = (v) => {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v !== "object") return String(v).slice(0, 80);
  return null; // caller recurses
};

export function renderAuditDetails(details) {
  if (!details) return "";
  let obj = details;
  if (typeof details === "string") {
    try {
      obj = JSON.parse(details);
    } catch {
      return details.slice(0, 120);
    }
  }
  if (typeof obj !== "object") return String(obj).slice(0, 120);
  const parts = [];
  for (const [k, v] of Object.entries(obj)) {
    const key = k.replace(/_/g, " ");
    const s = short(v);
    if (s !== null) {
      parts.push(`${key}: ${s}`);
    } else if (v && typeof v === "object" && ("from" in v || "to" in v)) {
      parts.push(`${key}: ${short(v.from) ?? "…"} → ${short(v.to) ?? "…"}`);
    } else if (v && typeof v === "object") {
      // one level deep — {changes: {date: {from,to}, …}} and {removed: {...}}
      const inner = Object.entries(v)
        .slice(0, 4)
        .map(([ik, iv]) => {
          const is = short(iv);
          if (is !== null) return `${ik.replace(/_/g, " ")}: ${is}`;
          if (iv && typeof iv === "object" && ("from" in iv || "to" in iv))
            return `${ik.replace(/_/g, " ")}: ${short(iv.from) ?? "—"} → ${short(iv.to) ?? "—"}`;
          return `${ik.replace(/_/g, " ")}: …`;
        })
        .join(", ");
      parts.push(k === "changes" ? inner : `${key}: ${inner}`);
    }
  }
  return parts.join(" · ");
}
