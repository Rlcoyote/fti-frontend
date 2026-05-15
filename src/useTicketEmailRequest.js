import { useState } from "react";
import { API_URL } from "./config.js";
import { buildTicketPayload } from "./utils.js";
import { useApp } from "./AppContext.jsx";

// ─── useTicketEmailRequest (v28.85 — ship 4 of JobTicketsTab split) ────────
// Owns the state + async behavior for the "email signature request" flow.
// The JSX (modal layout, input bindings, buttons) stays in the parent — ship
// 5 of the split arc extracts that into EmailSignatureRequestModal.
//
// Returned shape:
//   emailConfirm       — null | { ticketId, email, emailedAt }
//                        truthy = modal open, null = modal closed
//   emailConfirmTo, setEmailConfirmTo — TO field state
//   emailConfirmCc, setEmailConfirmCc — CC field state
//   openEmailRequest(ticket, fallbackEmail) — opens the modal, seeds the
//                        TO field from the ticket's emailTo or the
//                        fallback (typically the customer POC email)
//   closeEmailRequest() — closes the modal
//   sendEmailRequest()  — async; validates, saves emailTo to backend,
//                        POSTs /signature/send, optimistically updates
//                        the ticket in setTickets, closes the modal
//
// Closes over `setTickets` (passed in) and reaches `useApp()` for
// `currentUser.name` and `showNotice`. Calling useApp inside a custom
// hook is fine — that's what hooks are for.
//
// Two-step backend behavior preserved: emailTo gets saved FIRST (so a
// failed signature send still leaves the chosen address persisted),
// then the signature request fires. If the second fails, the first
// remains. Existing v28.40 behavior.

export default function useTicketEmailRequest({ setTickets }) {
  const { currentUser, showNotice } = useApp();
  const [emailConfirm, setEmailConfirm] = useState(null);
  const [emailConfirmTo, setEmailConfirmTo] = useState("");
  const [emailConfirmCc, setEmailConfirmCc] = useState("");

  const openEmailRequest = (ticket, fallbackEmail) => {
    setEmailConfirm({ ticketId: ticket.id, email: ticket.emailTo || fallbackEmail, emailedAt: ticket.emailedAt || null });
    setEmailConfirmTo(ticket.emailTo || fallbackEmail || "");
    setEmailConfirmCc("");
  };

  const closeEmailRequest = () => setEmailConfirm(null);

  const sendEmailRequest = async () => {
    if (!emailConfirm) return;
    const email = emailConfirmTo.trim();
    if (!email) {
      showNotice("Email Required", "Enter a recipient email address before sending.", "error");
      return;
    }
    try {
      // Save emailTo to backend first
      const payload = buildTicketPayload({ emailTo: email });
      await fetch(`${API_URL}/tickets/${emailConfirm.ticketId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      // Send the signature request email
      const r = await fetch(`${API_URL}/signature/send/${emailConfirm.ticketId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ performed_by: currentUser?.name }),
      });
      if (!r.ok) {
        const d = await r.json();
        showNotice("Email Failed", d.error || "Could not send the email.", "error");
        return;
      }
      // Single state update with all changes
      setTickets((prev) =>
        prev.map((tk) => (tk.id === emailConfirm.ticketId ? { ...tk, status: "emailed", emailTo: email, emailedAt: new Date().toISOString() } : tk)),
      );
      setEmailConfirm(null);
    } catch (err) {
      showNotice("Email Failed", err.message, "error");
    }
  };

  return {
    emailConfirm,
    emailConfirmTo,
    setEmailConfirmTo,
    emailConfirmCc,
    setEmailConfirmCc,
    openEmailRequest,
    closeEmailRequest,
    sendEmailRequest,
  };
}
