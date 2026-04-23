import { C } from "./config.js";

// ─── TicketStatusBanners (v27.85) ───────────────────────────────────────────
// Extracted from TicketDetail.jsx. Display-only status strips that render at
// the top of the ticket body. All mutually-compatible (more than one can show
// at once — e.g., a voided revision shows both the VOIDED and Revision banners).
// No state, no handlers — pure props in, JSX out.
//
// Banners:
//   VOIDED — ticket.voidedAt set. Shows "Replaced by #X" when a revision
//     points back to this one.
//   Revision — ticket.revisionOf set. Shows the original ticket label.
//   Duplicate reminder — ticket._duplicateReminder flag (set transiently by
//     parent after a duplicate completes, to prompt user to update the date).
//   Awaiting signature — status === "emailed" && !signedBy. Pulsing purple dot.
//   Edit warning — user is editing a signed ticket (line-item change would
//     clear the signature). Two variants: before line-item change (yellow
//     "will require a new signature") and after (red "signature cleared").
//
// Props:
//   ticket — for voidedAt, _replacedByLabel, revisionOf, _revisionOfLabel,
//            _duplicateReminder, emailedAt
//   status — "emailed" triggers awaiting-signature
//   signedBy — for awaiting-signature + edit-warning conditionals
//   isEditing, sigWiped — edit-warning flags

function TicketStatusBanners({ ticket, status, signedBy, isEditing, sigWiped }) {
  return (
    <>
      {ticket.voidedAt && (
        <div style={{ background: "#fdecea", border: `1px solid ${C.red}44`, borderRadius: 4, padding: "10px 14px", marginBottom: 12, fontSize: 13, fontWeight: 700, color: C.red }}>
          VOIDED{ticket._replacedByLabel ? ` — Replaced by #${ticket._replacedByLabel}` : ""}
        </div>
      )}

      {ticket.revisionOf && (
        <div style={{ background: "#e8f0fb", border: `1px solid ${C.blue}44`, borderRadius: 4, padding: "10px 14px", marginBottom: 12, fontSize: 13, fontWeight: 700, color: C.blue }}>
          Revision of #{ticket._revisionOfLabel || "previous ticket"}
        </div>
      )}

      {ticket._duplicateReminder && (
        <div style={{ background: "#e8f0fb", border: `1px solid ${C.blue}44`, borderRadius: 4, padding: "8px 12px", marginBottom: 12, fontSize: 12, fontWeight: 700, color: C.blue }}>
          This ticket was duplicated. Please update the date and review before saving.
        </div>
      )}

      {status === "emailed" && !signedBy && (
        <div style={{ background: "#f3eafa", border: "1px solid #7a3ca044", borderRadius: 4, padding: "10px 14px", marginBottom: 12, fontSize: 13, fontWeight: 700, color: "#7a3ca0", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#7a3ca0", animation: "pulse 2s infinite" }} />
          Emailed for signature — awaiting response
          {ticket.emailedAt && (
            <span style={{ fontWeight: 400, fontSize: 12, marginLeft: "auto" }}>
              Sent {new Date(ticket.emailedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
            </span>
          )}
        </div>
      )}

      {isEditing && !sigWiped && signedBy && (
        <div style={{ background: "#fdf5d8", border: "1px solid #e6c200", borderRadius: 4, padding: "8px 12px", marginBottom: 12, fontSize: 12, fontWeight: 700, color: "#8a6500" }}>
          ⚠ Editing signed ticket — changing line items, rate, or qty will require a new signature.
        </div>
      )}

      {sigWiped && (
        <div style={{ background: "#fdecea", border: `1px solid ${C.red}44`, borderRadius: 4, padding: "8px 12px", marginBottom: 12, fontSize: 12, fontWeight: 700, color: C.red }}>
          ⚠ Line items changed — signature cleared. Customer must re-sign before saving.
        </div>
      )}
    </>
  );
}

export default TicketStatusBanners;
