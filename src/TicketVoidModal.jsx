import { useState } from "react";
import useBodyScrollLock from "./useBodyScrollLock.js";
import { C } from "./config.js";
import { Btn, inputStyle, ModalWrap, Z_INDEX } from "./SharedUI.jsx";

// ─── TicketVoidModal (v27.71) ───────────────────────────────────────────────
// Extracted from TicketDetail.jsx. Two-action confirmation for voiding a
// signed / sigNotReq / approved ticket:
//   VOID ONLY          — voids the ticket, no replacement
//   VOID & CREATE NEW  — voids and opens a new draft with carry-over context
//
// Reason is required for either action. When reason = "Other", a free-text
// details field is required. Formatted reason string is passed back to
// onRevise as e.g. "Signed, but Found Discrepancy" or "Other: <note>".
//
// State is local (void reason + note). Parent's onClose clears the modal;
// no need to hoist selection state up unless we add reason persistence
// across opens (we don't — each open starts fresh).
//
// Props:
//   ticket — for display (number + type)
//   onClose — called to dismiss (cancel or after action fires)
//   onRevise(ticket, reasonString, { alsoCreateNew }) — parent handler that
//     runs the reviseTicketRequest utility. Parent decides how to open the
//     new ticket (modal vs navigate).

function TicketVoidModal({ ticket, onClose, onRevise }) {
  useBodyScrollLock(true); // v28.274 sweep — modal locks the page behind it
  const [voidReason, setVoidReason] = useState("");
  const [voidReasonNote, setVoidReasonNote] = useState("");

  const canSubmit = !!voidReason && !(voidReason === "Other" && !voidReasonNote.trim());

  const submit = (alsoCreateNew) => {
    if (!canSubmit) return;
    const reason = voidReason === "Other" ? `Other: ${voidReasonNote.trim()}` : voidReason;
    onClose();
    if (onRevise) onRevise(ticket, reason, { alsoCreateNew });
  };

  return (
    <ModalWrap variant="dialog" z={Z_INDEX.overlay} width={460} accent={C.red} onClose={onClose}>
      <div style={{ fontSize: 15, fontWeight: 800, color: C.red, marginBottom: 10 }}>Void This Ticket?</div>
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 12, lineHeight: 1.7 }}>
        Ticket{" "}
        <strong>
          #{ticket.workOrderId}
          {ticket.ticketNumber ? `-${ticket.ticketNumber}` : ""}
        </strong>{" "}
        is signed and permanent.
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.08em", marginBottom: 4 }}>REASON FOR VOIDING *</div>
        <select
          value={voidReason}
          onChange={(e) => setVoidReason(e.target.value)}
          style={{ width: "100%", padding: "8px 10px", border: `1px solid ${voidReason ? C.border : C.red}`, borderRadius: 4, fontSize: 13 }}
        >
          <option value="">Select a reason...</option>
          <option value="Signed, but Found Discrepancy">Signed, but Found Discrepancy</option>
          <option value="Other">Other</option>
        </select>
      </div>

      {voidReason === "Other" && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.08em", marginBottom: 4 }}>DETAILS</div>
          <textarea
            value={voidReasonNote}
            onChange={(e) => setVoidReasonNote(e.target.value)}
            style={{ ...inputStyle, width: "100%", minHeight: 60, resize: "vertical", boxSizing: "border-box" }}
            placeholder="Describe the reason..."
          />
        </div>
      )}

      <div style={{ fontSize: 13, color: C.text, marginBottom: 20, lineHeight: 1.8, paddingLeft: 16 }}>
        <div>
          • <strong>VOID ONLY</strong> — voids the ticket; no replacement created.
        </div>
        <div>
          • <strong>VOID &amp; CREATE NEW</strong> — voids and opens a new draft carrying the job's line items, pin, site manager, time &amp; mileage.
        </div>
        <div style={{ marginTop: 6, color: C.muted }}>Signature is preserved on the voided ticket for audit records.</div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Btn disabled={!canSubmit} onClick={() => submit(false)}>
          VOID ONLY
        </Btn>
        <Btn disabled={!canSubmit} onClick={() => submit(true)}>
          VOID &amp; CREATE NEW
        </Btn>
        <Btn variant="ghost" onClick={onClose}>
          CANCEL
        </Btn>
      </div>
    </ModalWrap>
  );
}

export default TicketVoidModal;
