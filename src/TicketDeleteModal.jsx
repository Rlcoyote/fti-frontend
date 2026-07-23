import { C, API_URL } from "./config.js";
import useBodyScrollLock from "./useBodyScrollLock.js";
import { ConfirmModal } from "./SharedUI.jsx";
import { useApp } from "./AppContext.jsx";

// ─── TicketDeleteModal (v27.70) ─────────────────────────────────────────────
// Extracted from TicketDetail.jsx. Self-contained delete-confirmation modal
// for unsigned tickets. Signed/sigNotReq/approved tickets use the void flow
// instead — the parent component already decides which button to show based
// on ticket state; this modal only renders when delete is the correct action.
//
// Props:
//   ticket — the ticket being deleted (for display)
//   onClose — called when user cancels or after successful delete
//   onDeleted — called with ticket.id on successful backend delete
//
// Uses useApp().showNotice for error display (network / backend rejection).
// Calls DELETE /api/tickets/:id directly — no intermediate handler needed.

function TicketDeleteModal({ ticket, onClose, onDeleted }) {
  useBodyScrollLock(true); // v28.274 sweep — modal locks the page behind it
  const { showNotice } = useApp();

  const handleDelete = async () => {
    try {
      const r = await fetch(`${API_URL}/tickets/${ticket.id}`, { method: "DELETE" });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        showNotice("Delete Failed", d.error || "Could not delete the ticket.", "error");
        return;
      }
      if (onDeleted) onDeleted(ticket.id);
      onClose();
    } catch (err) {
      showNotice("Delete Failed", err.message, "error");
    }
  };

  // v28.289 (theme arc) — was a hand-rolled copy of ConfirmModal
  return (
    <ConfirmModal
      title="Delete Ticket?"
      message={
        <>
          This will remove ticket{" "}
          <strong>
            #{ticket.workOrderId}
            {ticket.ticketNumber ? `-${ticket.ticketNumber}` : ""}
          </strong>{" "}
          ({ticket.type}). The ticket can be recovered by an admin.
        </>
      }
      yesLabel="YES, DELETE"
      onYes={handleDelete}
      onCancel={onClose}
    />
  );
}

export default TicketDeleteModal;
