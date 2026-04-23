import { useEffect } from "react";
import { API_URL } from "./config.js";

// ─── useSignaturePolling (v27.88) ────────────────────────────────────────────
// Polls the tickets endpoint every 30s while a ticket is in "emailed" state
// (external signer has been sent a link) and unsigned locally, then calls
// onSignatureArrived({ signedBy, signedAt, signatureImage }) the instant a
// signature shows up in the database. This is how the editor reflects a
// remote sign-event without a page refresh.
//
// Extracted from TicketDetail.jsx (Article XXV, Option-3 pass). The effect
// was entangled with the earlier comment-thread polling in v27.74; the
// comment poll moved into TicketCommentThread (v27.75) but the signature
// poll kept living in TicketDetail as orphaned effect logic. Now isolated.
//
// Params:
//   ticketId — the ticket being watched
//   jobId — needed for the tickets-by-job fetch (poll endpoint filters by job)
//   status — current local status; poll only runs when === "emailed"
//   signedBy — current local signer; poll only runs when falsy
//   onSignatureArrived({ signedBy, signedAt, signatureImage }) — called
//     when a signature lands in the DB. Caller is responsible for setting
//     local state from the payload.
//
// Poll interval: 30 seconds. Stops automatically when status leaves "emailed"
// or signedBy becomes truthy (normal dep-array re-evaluation).

export default function useSignaturePolling(ticketId, jobId, status, signedBy, onSignatureArrived) {
  useEffect(() => {
    if (!ticketId || status !== "emailed" || signedBy) return;
    const check = () => {
      fetch(`${API_URL}/tickets?job_id=${jobId}&include_voided=true`)
        .then(r => r.ok ? r.json() : [])
        .then(data => {
          const updated = data.find(t => t.id === ticketId);
          if (updated && updated.signature_img) {
            onSignatureArrived({
              signedBy: updated.signed_by,
              signedAt: updated.signed_at,
              signatureImage: updated.signature_img,
            });
          }
        })
        .catch(() => {});
    };
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
    // onSignatureArrived intentionally excluded — callers may pass inline
    // functions and we don't want a fresh interval every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId, jobId, status, signedBy]);
}
