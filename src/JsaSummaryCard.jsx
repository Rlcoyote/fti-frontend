/* eslint-disable react-refresh/only-export-components -- v28.407 (audit F5
   resolution): this file exports non-component values ALONGSIDE components
   DELIBERATELY. Shared JSA summary constants co-live with their renderer by design.
   The warning is HMR-only (a full reload instead of hot refresh in dev);
   fragmenting the one-home to satisfy it would trade architecture for
   dev-loop sugar. Documented, not silenced blindly. */
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
  // v28.318 — Reggie's ratified order: type, date, ticket #, customer,
  // location, wells. The ticket number is the FULL house format (#WO-seq,
  // e.g. #300033-14) — a bare per-job sequence ("#1") tells no one nothing.
  const fullTicketNum = jsa.job_number ? `#${jsa.job_number}${jsa.ticket_number ? `-${jsa.ticket_number}` : ""}` : null;
  const rows = [
    ["TYPE", jsa.ticket_type],
    ["DATE", fmtDate(jsa.jsa_date || jsa.ticket_date)],
    ["TICKET #", fullTicketNum],
    ["CUSTOMER", jsa.customer_name],
    ["LOCATION", jsa.job_location],
    ["WELLS", jsa.well_name],
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
