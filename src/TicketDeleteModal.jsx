import { C, API_URL } from "./config.js";
import useBodyScrollLock from "./useBodyScrollLock.js";
import { Btn, Z_INDEX } from "./SharedUI.jsx";
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
        <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 10 }}>Delete Ticket?</div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 20, lineHeight: 1.6 }}>
          This will remove ticket{" "}
          <strong>
            #{ticket.jobId}
            {ticket.ticketNumber ? `-${ticket.ticketNumber}` : ""}
          </strong>{" "}
          ({ticket.type}). The ticket can be recovered by an admin.
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn onClick={handleDelete}>YES, DELETE</Btn>
          <Btn variant="ghost" onClick={onClose}>
            CANCEL
          </Btn>
        </div>
      </div>
    </div>
  );
}

export default TicketDeleteModal;
