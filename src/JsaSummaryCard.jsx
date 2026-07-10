import { C } from "./config.js";

// ─── JsaSummaryCard (v28.307 — extracted from LoginJsaSignStep) ──────────────
// v28.309 — SIMPLIFIED per Reggie (2026-07-10): the card's job is to TIE the
// signer to the right document, not to re-teach it — comprehension happens
// at the JSA meeting the attestation already covers. Field feedback: the
// full PPE/weather/review dump on a phone caused confusion (and surfaced
// per-day-JSA differences as "the app disagrees with itself"). Now it
// answers exactly one question — WHICH JSA is this? — with DATE, CUSTOMER,
// LOCATION (+ well/ticket when present), in big type.
//
// Shared by LoginJsaSignStep (Path A) and JSALeadOverrideModal (Path C).
// Field names match the loadJsaContext payloads (sign-options,
// required-signers).

export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : null);

export default function JsaSummaryCard({ jsa, heading = "THE JSA YOU ARE SIGNING" }) {
  const rows = [
    ["DATE", fmtDate(jsa.jsa_date || jsa.ticket_date)],
    ["CUSTOMER", jsa.customer_name],
    ["LOCATION", jsa.job_location],
    ["WELL", jsa.well_name],
    ["TICKET", jsa.ticket_number ? `#${jsa.ticket_number}${jsa.ticket_type ? ` (${jsa.ticket_type})` : ""}` : null],
  ].filter(([, v]) => v);

  return (
    <div
      style={{
        border: `1px solid ${C.border}`,
        borderLeft: `3px solid ${C.red}`,
        borderRadius: 6,
        background: C.steel,
        padding: "14px 16px",
        marginBottom: 14,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: C.muted, marginBottom: 10 }}>{heading}</div>
      {rows.map(([label, value]) => (
        <div key={label} style={{ display: "flex", gap: 10, alignItems: "baseline", marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: C.muted, fontWeight: 700, minWidth: 84, flexShrink: 0, letterSpacing: "0.04em" }}>{label}</span>
          <span style={{ fontSize: 15, color: C.text, fontWeight: 800 }}>{value}</span>
        </div>
      ))}
    </div>
  );
}
