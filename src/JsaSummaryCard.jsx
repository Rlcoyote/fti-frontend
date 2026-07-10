import { C } from "./config.js";

// ─── JsaSummaryCard (v28.307 — extracted from LoginJsaSignStep) ──────────────
// The "THE JSA YOU ARE SIGNING" summary block. Renders the JSA's substance
// (customer, ticket, date, operator, well, weather, driver, PPE checklist,
// presenter review) from any payload carrying the loadJsaContext field names
// (sign-options, required-signers). Shared by:
//   - LoginJsaSignStep (Path A sign-link) — what the SIGNER is signing
//   - JSALeadOverrideModal (Path C) — what the LEAD is vouching for
// `heading` names the act; the perjury text in both flows points here.

export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : null);

export default function JsaSummaryCard({ jsa, heading = "THE JSA YOU ARE SIGNING" }) {
  const rows = [
    ["CUSTOMER", jsa.customer_name],
    ["TICKET", jsa.ticket_number ? `#${jsa.ticket_number}${jsa.ticket_type ? ` (${jsa.ticket_type})` : ""}` : null],
    ["JSA DATE", fmtDate(jsa.jsa_date || jsa.ticket_date) ? `${fmtDate(jsa.jsa_date || jsa.ticket_date)}${jsa.jsa_time ? ` · ${jsa.jsa_time}` : ""}` : null],
    ["OPERATOR", jsa.operator],
    ["WELL", jsa.well_name],
    ["WEATHER", jsa.weather],
    ["DESIGNATED DRIVER", jsa.designated_driver],
  ].filter(([, v]) => v);

  const ppe = [
    ["FR clothing / PPE", jsa.ppe_fr_clothing],
    ["Tools inspected / crew trained", jsa.ppe_tools_trained],
    ["Confined space reviewed", jsa.ppe_confined_space],
  ];

  return (
    <div
      style={{
        border: `1px solid ${C.border}`,
        borderLeft: `3px solid ${C.red}`,
        borderRadius: 6,
        background: C.steel,
        padding: "12px 14px",
        marginBottom: 14,
        maxHeight: "45vh",
        overflowY: "auto",
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: C.muted, marginBottom: 8 }}>{heading}</div>
      {rows.map(([label, value]) => (
        <div key={label} style={{ display: "flex", gap: 8, fontSize: 12, marginBottom: 4 }}>
          <span style={{ color: C.muted, fontWeight: 700, minWidth: 130, flexShrink: 0 }}>{label}</span>
          <span style={{ color: C.text, fontWeight: 600 }}>{value}</span>
        </div>
      ))}
      <div style={{ borderTop: `1px solid ${C.border}`, margin: "8px 0" }} />
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", color: C.muted, marginBottom: 4 }}>SAFETY CHECKLIST</div>
      {ppe.map(([label, ok]) => (
        <div key={label} style={{ display: "flex", gap: 8, fontSize: 12, marginBottom: 3, alignItems: "center" }}>
          <span style={{ color: ok ? C.green : C.red, fontWeight: 900, width: 14 }}>{ok ? "✓" : "✗"}</span>
          <span style={{ color: C.text }}>{label}</span>
          {!ok && <span style={{ color: C.red, fontSize: 10, fontWeight: 700 }}>NOT CONFIRMED</span>}
        </div>
      ))}
      {jsa.presenter_review && (
        <>
          <div style={{ borderTop: `1px solid ${C.border}`, margin: "8px 0" }} />
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", color: C.muted, marginBottom: 4 }}>PRESENTER REVIEW</div>
          <div style={{ fontSize: 12, color: C.text, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{jsa.presenter_review}</div>
        </>
      )}
    </div>
  );
}
