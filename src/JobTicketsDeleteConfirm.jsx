import { C } from "./config.js";
import { Btn, Z_INDEX } from "./SharedUI.jsx";

// ─── JobTicketsDeleteConfirm (v28.87 — ship 6 of JobTicketsTab split) ──────
// Confirmation modal for row-level "DELETE" on the Tickets tab. Pure
// presentation; parent owns the delete logic and the close logic.
//
// Naming note — DIFFERENT from `TicketDeleteModal.jsx`:
//   - JobTicketsDeleteConfirm (this file): true hard delete from the row
//     button. Copy reads "This cannot be undone." Used here in the Tab.
//   - TicketDeleteModal: opens from inside TicketDetail; goes through a
//     soft-archive path where an admin can still recover. Copy reads
//     "can be recovered by an admin."
// The names differ on purpose so future-Reggie sees the distinction at
// the import line. Don't unify them unless the actual semantics merge.
//
// Props:
//   ticket    — the ticket being deleted (used for the display label).
//               Pass null to suppress rendering — the component returns
//               null in that case so the parent doesn't need a guard.
//   onConfirm — async () => boolean. Returns true on successful delete.
//               Component does NOT close on its own; parent decides
//               (typically: parent closes on success, leaves open on
//               failure so the user can retry).
//   onClose   — () => void. Called on CANCEL click and overlay click.

export default function JobTicketsDeleteConfirm({ ticket, onConfirm, onClose }) {
  if (!ticket) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#00000088",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: Z_INDEX.overlay,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: C.cardBg,
          border: `1px solid ${C.border}`,
          borderTop: `4px solid ${C.red}`,
          borderRadius: 8,
          padding: 28,
          width: 420,
          maxWidth: "90vw",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 12 }}>Delete Ticket?</div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>
          This will permanently delete ticket #{ticket.jobId}
          {ticket.ticketNumber ? `-${ticket.ticketNumber}` : ""} ({ticket.type}). This cannot be undone.
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Btn variant="red" onClick={onConfirm}>
            DELETE
          </Btn>
          <Btn variant="ghost" onClick={onClose}>
            CANCEL
          </Btn>
        </div>
      </div>
    </div>
  );
}
