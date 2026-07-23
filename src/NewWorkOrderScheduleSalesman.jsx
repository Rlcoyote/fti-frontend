import { C } from "./config.js";
import { inputStyle, labelStyle } from "./SharedUI.jsx";

// ─── NewWorkOrderScheduleSalesman (v28.99 — ship 6 of NewWorkOrderModal split) ─────────
// Top of the New Job form: Scheduled Date + Salesman selector. Two
// coupled fields that always render together as a row (desktop) or a
// stack (mobile).
//
// The mobile branch uses an explicit column flex direction instead of
// flex-wrap. v28.08 found that iOS Safari + native <select> chevron
// sizing produced a visual overlap at iPhone widths under flex-wrap —
// the explicit column variant avoids that geometry. Preserve verbatim.
//
// "No Salesman Assigned" is a real option, not a placeholder — saves
// as a literal string so reports can distinguish "unassigned" from
// "not yet picked." The dash-Select-dash on top is just the empty
// state.
//
// Props:
//   schedDate / setSchedDate         — date input value + setter
//   salesman / setSalesman           — select value + setter
//   salesmenList                     — pre-filtered list (role === "salesman")
//   isMobile                         — viewport flag from parent
//   error                            — errors.salesman from parent
//   clearError                       — () => parent clears errors.salesman

export default function NewWorkOrderScheduleSalesman({ schedDate, setSchedDate, salesman, setSalesman, salesmenList, isMobile, error, clearError }) {
  return (
    <div
      style={
        isMobile ? { display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 } : { display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14 }
      }
    >
      <div style={isMobile ? {} : { flex: 1, minWidth: 140 }}>
        <label style={labelStyle}>SCHEDULED DATE</label>
        <input type="date" style={inputStyle} value={schedDate} onChange={(e) => setSchedDate(e.target.value)} />
      </div>
      <div style={isMobile ? {} : { flex: 1, minWidth: 180 }}>
        <label style={labelStyle}>SALESMAN *</label>
        <select
          style={{ ...inputStyle, borderColor: error ? C.red : C.border }}
          value={salesman}
          onChange={(e) => {
            setSalesman(e.target.value);
            if (clearError) clearError();
          }}
        >
          <option value="">— Select —</option>
          <option value="No Salesman Assigned">No Salesman Assigned</option>
          {salesmenList.map((u) => (
            <option key={u.id} value={u.name}>
              {u.name}
            </option>
          ))}
        </select>
        {error && (
          <div data-error="salesman" style={{ fontSize: 11, color: C.red, marginTop: 3, fontWeight: 700 }}>
            ⚠ {error}
          </div>
        )}
      </div>
    </div>
  );
}
