import { C } from "./config.js";
import { inputStyle } from "./SharedUI.jsx";

// ─── NewWorkOrderNotesField (v28.97 — ship 4 of NewWorkOrderModal split) ───────────────
// The internal-notes panel at the bottom of the New Job form. Pure
// presentation; parent owns the state since the value flows into the
// create payload (`notes` field).
//
// Placeholder copy is intentional: "internal notes — visible on work
// order only, not on field tickets" — sets user expectation that
// anything typed here stays internal, distinct from on-ticket notes
// that the field signs.

export default function NewWorkOrderNotesField({ value, onChange }) {
  return (
    <div style={{ background: C.steel, border: `1px solid ${C.border}`, borderRadius: 6, padding: 14, marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: C.muted, letterSpacing: "0.08em", marginBottom: 6 }}>NOTES</div>
      <textarea
        style={{ ...inputStyle, minHeight: 60, resize: "vertical", width: "100%", boxSizing: "border-box" }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Internal notes — visible on work order only, not on field tickets"
      />
    </div>
  );
}
