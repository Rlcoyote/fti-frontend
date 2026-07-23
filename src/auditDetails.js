// ─── auditDetails (v28.398) — ONE home for rendering audit `details` payloads
// as human-readable text (Reggie: "the log should say what happened, when and
// by whom" — not "changes: …"). Consumed by the meeting CHANGE LOG and the
// Activity Log (Entry 7).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// v28.399 (Reggie: "uuid → uuid doesn't actually tell the user anything") —
// values normalize at RENDER time, so even historical audit rows read as
// names and clean dates:
//   uuid            → the person's name (via the resolver the caller passes)
//   2026-07-21T00:00:00.000Z → 2026-07-21
//   11:00:00        → 11:00
const normalize = (v, resolve) => {
  const str = String(v);
  if (UUID_RE.test(str) && resolve) {
    const name = resolve(str);
    if (name) return name;
  }
  if (/^\d{4}-\d{2}-\d{2}T00:00:00/.test(str)) return str.slice(0, 10);
  if (/^\d{2}:\d{2}:\d{2}$/.test(str)) return str.slice(0, 5);
  return str.slice(0, 80);
};

const makeShort = (resolve) => (v) => {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v !== "object") return normalize(v, resolve);
  return null; // caller recurses
};

export function renderAuditDetails(details, resolve) {
  const short = makeShort(resolve);
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
