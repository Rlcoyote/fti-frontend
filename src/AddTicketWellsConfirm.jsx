import { C } from "./config.js";
import { Btn, TicketTypeBadge, PANEL_TEXT, PANEL_MUTED } from "./SharedUI.jsx";

// ─── AddTicketWellsConfirm (v28.67 — extracted from AddTicketModal) ───────────
// Multi-well assignment screen. Renders when type is selected but the
// parent job has more than one well — user picks the subset of wells the
// new ticket applies to.
//
// Per CAM XXV: controlled. assignedWells (array of well names) and
// jobWells (parent's wells list) come from the parent. Callbacks:
// onToggleWell, onSelectAll, onConfirm, onCancel.
//
// v28.182 — onChangeType callback + the "← CHANGE TYPE" button it triggered
// were both removed (parallel removal of the same affordance in the main
// AddTicket form). Type recovery is now: cancel → re-open with the right
// type. Removing the in-flow type-switch eliminates state-crossover bugs.

export default function AddTicketWellsConfirm({ type, jobWells, assignedWells, onToggleWell, onSelectAll, onConfirm, onCancel }) {
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <TicketTypeBadge type={type} />
        {/* v28.44 — heading + ancillary text on the always-light pastel
            tcfg.bg panel use PANEL_TEXT/MUTED constants per the
            SharedUI rule. */}
        <span style={{ fontSize: 16, fontWeight: 700, color: PANEL_TEXT }}>Assign Wells — New {type} Ticket</span>
      </div>
      <div style={{ fontSize: 12, color: PANEL_MUTED, marginBottom: 14 }}>Select which wells apply to this ticket.</div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <label style={{ fontSize: 11, fontWeight: 800, color: PANEL_MUTED, letterSpacing: "0.08em" }}>WELLS ON THIS WORK ORDER</label>
          <button
            className="fti-btn"
            type="button"
            onClick={onSelectAll}
            style={{
              background: "transparent",
              border: `1px solid ${C.border}`,
              borderRadius: 3,
              padding: "2px 10px",
              fontSize: 11,
              fontWeight: 700,
              color: PANEL_TEXT,
              cursor: "pointer",
            }}
          >
            SELECT ALL
          </button>
        </div>
        {jobWells.map((well, idx) => {
          const checked = assignedWells.includes(well);
          return (
            <div
              key={idx}
              onClick={() => onToggleWell(well)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                marginBottom: 6,
                // v28.43 — selected bg uses C.priLowB (theme-aware).
                background: checked ? C.priLowB : C.steel,
                border: `1px solid ${checked ? C.blue + "44" : C.border}`,
                borderRadius: 5,
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 3,
                  border: `2px solid ${checked ? C.blue : C.border}`,
                  background: checked ? C.blue : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {checked && <span style={{ color: C.white, fontSize: 12, fontWeight: 900, lineHeight: 1 }}>✓</span>}
              </div>
              <span style={{ fontSize: 13, fontWeight: checked ? 700 : 400, color: C.text }}>{well}</span>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Btn
          onClick={() => {
            if (assignedWells.length === 0) return;
            onConfirm();
          }}
        >
          {assignedWells.length === 0 ? "SELECT AT LEAST ONE WELL" : `CONFIRM — ${assignedWells.length} WELL${assignedWells.length !== 1 ? "S" : ""}`}
        </Btn>
        <Btn variant="ghost" onClick={onCancel}>
          CANCEL
        </Btn>
      </div>
    </>
  );
}
