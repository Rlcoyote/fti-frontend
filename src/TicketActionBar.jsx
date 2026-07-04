import { C } from "./config.js";
import { typeCaps } from "./ticketFamilies.js";
import { Btn } from "./SharedUI.jsx";

// ─── TicketActionBar (v27.80) ───────────────────────────────────────────────
// Extracted footer action bar from TicketDetail.jsx. Pure presentational —
// all state comes in via props, all mutations go out via callbacks. Includes
// every button + status-pill the footer can render, gated by the same
// conditional logic as before.
//
// The button array is intentionally dense because the valid action set
// depends on: status, isLocked, isFullyLocked, isEditing, sigWiped, signedBy,
// existingJSA, jsaLoaded, ticket.type, canApprove, and whether the parent
// passed onRevise / onDuplicate / onDelete handlers.
//
// Layout:
//   [ status pills / primary actions ] [ close/cancel ] | [ duplicate | delete ]
// The flex:1 spacer in the middle pushes the destructive actions to the right.
//
// Props:
//   ticket — for type check and voidedAt
//   status — current ticket status
//   isLocked, isFullyLocked, isEditing, sigWiped, signedBy — edit-state flags
//   existingJSA, jsaLoaded — JSA availability
//   canApprove — role gate (owner/admin/manager/lead)
//   showSigPad, showSigOptions — mask "save/sign buttons" during sig flow
//   handleSave, handleClose, handleCancel, handleApprove — parent handlers
//   onClose — raw close (used when fully locked, bypasses dirty save)
//   setIsEditing, setShowSigPad, setShowSigOptions, setShowJSA,
//     setShowVoidConfirm, setShowDupModal, setShowDeleteConfirm — state setters
//   onRevise, onDuplicate, onDelete — optional parent handlers; buttons
//     only render when provided
//
// Design note: the many-props surface reflects the density of logic in the
// footer. An alternative would be to compute "which buttons to show" up in
// the parent and pass a single config object, but that just moves the
// complexity — the conditionals still exist somewhere. Keeping them co-located
// with the rendering they gate (here) is easier to read.

function TicketActionBar({
  ticket,
  status,
  isLocked,
  isFullyLocked,
  isEditing,
  sigWiped,
  signedBy,
  existingJSA,
  jsaLoaded,
  canApprove,
  showSigPad,
  showSigOptions,
  handleSave,
  handleClose,
  handleCancel,
  handleApprove,
  onClose,
  setIsEditing,
  setShowSigPad,
  setShowSigOptions,
  setShowJSA,
  setShowVoidConfirm,
  setShowDupModal,
  setShowDeleteConfirm,
  onRevise,
  onDuplicate,
  onDelete,
}) {
  return (
    <div style={{ padding: "16px 24px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      {/* QB Verified — fully locked */}
      {status === "qbVerified" && (
        <span style={{ fontSize: 12, fontWeight: 800, color: C.green, background: "#d4edda", padding: "6px 14px", borderRadius: 4 }}>✓ QB VERIFIED</span>
      )}

      {status === "sentToQB" && (
        <span
          style={{ fontSize: 12, fontWeight: 700, color: C.muted, background: C.steel, border: `1px solid ${C.border}`, padding: "6px 14px", borderRadius: 4 }}
        >
          AWAITING QB VERIFICATION
        </span>
      )}

      {/* Approved tickets are routed to Final Review for accounting handoff */}
      {status === "approved" && !isEditing && (
        <span
          style={{ fontSize: 12, fontWeight: 700, color: C.muted, background: C.steel, border: `1px solid ${C.border}`, padding: "6px 14px", borderRadius: 4 }}
        >
          READY FOR FINAL REVIEW
        </span>
      )}

      {/* Signed/SigNotReq — approve */}
      {(status === "signed" || status === "sigNotReq") &&
        !isEditing &&
        (canApprove ? (
          <Btn variant="blue" onClick={handleApprove}>
            APPROVE TICKET
          </Btn>
        ) : (
          <span style={{ fontSize: 12, fontWeight: 700, color: C.muted, padding: "6px 0" }}>Awaiting approval</span>
        ))}

      {/* Editable — save/sign buttons */}
      {!isLocked && !showSigPad && !showSigOptions && (
        <>
          <Btn onClick={handleSave}>SAVE &amp; CLOSE</Btn>
          {!sigWiped && (existingJSA || typeCaps(ticket.type).jsaOptional) && (
            <Btn variant="blue" onClick={() => setShowSigPad(true)}>
              COLLECT SIGNATURE
            </Btn>
          )}
          {!sigWiped && !signedBy && (existingJSA || typeCaps(ticket.type).jsaOptional) && (
            <Btn variant="ghost" onClick={() => setShowSigOptions(true)}>
              SIG NOT REQUIRED
            </Btn>
          )}
          {/* v27.68: when JSA is missing on a non-Rental ticket, render one
              active button instead of two greyed ones — makes the dependency
              explicit and avoids title-attribute tooltip delay. */}
          {!sigWiped && !signedBy && !existingJSA && !typeCaps(ticket.type).jsaOptional && jsaLoaded && (
            <Btn variant="blue" onClick={() => setShowJSA(true)}>
              CREATE JSA TO COLLECT SIGNATURE
            </Btn>
          )}
        </>
      )}

      {/* Edit button for locked but NOT signed tickets (e.g., sigNotReq) */}
      {isLocked && !isFullyLocked && !signedBy && status !== "sentToQB" && status !== "voided" && !isEditing && (
        <Btn variant="ghost" onClick={() => setIsEditing(true)}>
          EDIT TICKET
        </Btn>
      )}

      {/* Void button for signed or sigNotReq tickets */}
      {(signedBy || status === "sigNotReq" || status === "approved") && !isFullyLocked && status !== "voided" && !isEditing && onRevise && (
        <Btn variant="ghost" onClick={() => setShowVoidConfirm(true)}>
          VOID TICKET
        </Btn>
      )}

      {/* Voided — no actions */}
      {status === "voided" && (
        <span style={{ fontSize: 12, fontWeight: 800, color: C.red, background: "#fdecea", padding: "6px 14px", borderRadius: 4 }}>VOIDED</span>
      )}

      {/* Close/cancel */}
      {!isFullyLocked && !isEditing && !sigWiped && (
        <Btn variant="ghost" onClick={handleClose}>
          CLOSE
        </Btn>
      )}
      {!isFullyLocked && (isEditing || sigWiped) && (
        <Btn variant="ghost" onClick={handleCancel}>
          CANCEL
        </Btn>
      )}
      {isFullyLocked && (
        <Btn variant="ghost" onClick={onClose}>
          CLOSE
        </Btn>
      )}

      {/* Spacer to push destructive actions right */}
      <div style={{ flex: 1 }} />

      {/* Duplicate */}
      {onDuplicate && !isFullyLocked && (
        <Btn variant="ghost" onClick={() => setShowDupModal(true)}>
          DUPLICATE
        </Btn>
      )}

      {/* Delete — only unsigned tickets. Signed/sigNotReq/approved preserve
          their audit trail via VOID instead. Voided + fully-locked are never
          deletable from here. */}
      {onDelete && !isFullyLocked && !signedBy && status !== "sigNotReq" && status !== "approved" && status !== "voided" && (
        <button
          type="button"
          onClick={() => setShowDeleteConfirm(true)}
          style={{
            background: "transparent",
            border: "none",
            color: C.red,
            fontSize: 11,
            fontWeight: 700,
            cursor: "pointer",
            padding: "6px 10px",
            letterSpacing: "0.04em",
            opacity: 0.7,
          }}
        >
          DELETE
        </button>
      )}
    </div>
  );
}

export default TicketActionBar;
