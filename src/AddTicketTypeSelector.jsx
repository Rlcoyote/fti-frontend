import { C } from "./config.js";
import { Btn, TICKET_TYPES } from "./SharedUI.jsx";

// ─── AddTicketTypeSelector (v28.59 — extracted from AddTicketModal) ───────────
// First-screen ticket-type picker. Renders a 2-column grid of buttons, one
// per TICKET_TYPES entry, with the type label, brand color stripe, and a
// short description.
//
// Per CAM XXV (File Split Protocol): presentational, no state of its own.
// Receives onSelect(typeKey) which the parent uses to advance the modal
// state machine (kicks off handleSelectType — fetches prior-Rig-Up
// notes-and-wells for "Rig Down", seeds rental defaults for "Rental",
// resets wellsConfirmed for multi-well jobs).
//
// Description-per-type is centralized here. If a new ticket type is added
// to TICKET_TYPES it'll appear in this grid automatically; only the
// description line needs adding to the lookup below.

export default function AddTicketTypeSelector({ onSelect, onCancel }) {
  return (
    <>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Add Ticket — Select Type</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {Object.entries(TICKET_TYPES).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => onSelect(key)}
            style={{
              background: C.cardBg,
              border: `2px solid ${cfg.color}33`,
              borderLeft: `4px solid ${cfg.color}`,
              borderRadius: 6,
              padding: "16px 18px",
              cursor: "pointer",
              textAlign: "left",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = cfg.color)}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = cfg.color + "33")}
          >
            <div style={{ fontSize: 14, fontWeight: 800, color: cfg.color, letterSpacing: "0.06em" }}>{cfg.label}</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{cfg.desc || ""}</div>
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
