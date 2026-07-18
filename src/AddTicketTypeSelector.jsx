import { C, E } from "./config.js";
import { Btn, TICKET_TYPES } from "./SharedUI.jsx";

// ─── AddTicketTypeSelector (v28.59 — extracted from AddTicketModal) ───────────
// First-screen ticket-type picker.
//
// v28.304 — single-column stacked list, dropdown-style. The old 2-column
// grid put RIG UP + RIG DOWN on row one and Tester/Pumper/Rental below the
// phone fold with no scroll cue — crews reported "there are only two
// options." Five compact rows fit every screen; nothing hides.
//
// Per CAM XXV (File Split Protocol): presentational, no state of its own.
// Receives onSelect(typeKey) which the parent uses to advance the modal
// state machine (kicks off handleSelectType — fetches prior-Rig-Up
// notes-and-wells for "Rig Down", seeds rental defaults for "Rental",
// resets wellsConfirmed for multi-well jobs).
//
// v28.320 — names only (Reggie: "less is more... all the user needs to
// see is the selection"). New TICKET_TYPES entries appear automatically.

export default function AddTicketTypeSelector({ onSelect, onCancel }) {
  return (
    <>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Add Ticket — Select Type</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {Object.entries(TICKET_TYPES).map(([key, cfg]) => (
          <button
            className="fti-btn"
            key={key}
            onClick={() => onSelect(key)}
            className="fti-btn"
            style={{
              // v28.352 — THE FTI LOOK reaches the type tiles: top-lit surface
              // gradient, raised elevation, type-color identity kept on the
              // spine + a soft wash behind the label. Motion rides .fti-btn.
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: `linear-gradient(180deg, ${C.lightSteel}, ${C.cardBg})`,
              border: `1px solid ${cfg.color}44`,
              borderLeft: `4px solid ${cfg.color}`,
              borderRadius: 8,
              padding: "12px 14px",
              cursor: "pointer",
              textAlign: "left",
              width: "100%",
              boxShadow: E.raised,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = cfg.color)}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = cfg.color + "44")}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: `radial-gradient(circle at 35% 30%, ${cfg.color}, color-mix(in srgb, ${cfg.color} 55%, #000))`,
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 14, fontWeight: 800, color: cfg.color, letterSpacing: "0.06em" }}>{cfg.label}</span>
          </button>
        ))}
      </div>
      <div style={{ marginTop: 16 }}>
        <Btn onClick={onCancel} variant="ghost">
          CANCEL
        </Btn>
      </div>
    </>
  );
}
