import { ConfirmModal } from "./SharedUI.jsx";

// ─── WorkOrderTicketsDeleteConfirm (v28.87 — ship 6 of WorkOrderTicketsTab split) ──────
// Confirmation modal for row-level "DELETE" on the Tickets tab.
// v28.289 (theme arc): was a hand-rolled copy of ConfirmModal — now IS one.
//
// Naming note — DIFFERENT from `TicketDeleteModal.jsx`:
//   - WorkOrderTicketsDeleteConfirm (this file): true hard delete from the row
//     button. Copy reads "This cannot be undone." Used here in the Tab.
//   - TicketDeleteModal: opens from inside TicketDetail; goes through a
//     soft-archive path where an admin can still recover. Copy reads
//     "can be recovered by an admin."
// The names differ on purpose so future-Reggie sees the distinction at
// the import line. Don't unify them unless the actual semantics merge.
//
// Props:
//   ticket    — the ticket being deleted (used for the display label).
//               Pass null to suppress rendering.
//   onConfirm — async () => boolean. Parent closes on success.
//   onClose   — () => void. CANCEL click.

export default function WorkOrderTicketsDeleteConfirm({ ticket, onConfirm, onClose }) {
  if (!ticket) return null;

  return (
    <ConfirmModal
      title="Delete Ticket?"
      message={`This will permanently delete ticket #${ticket.jobId}${ticket.ticketNumber ? `-${ticket.ticketNumber}` : ""} (${ticket.type}). This cannot be undone.`}
      yesLabel="DELETE"
      onYes={onConfirm}
      onCancel={onClose}
    />
  );
}
