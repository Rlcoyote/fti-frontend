import { C } from "./config.js";
import { Btn, inputStyle, TINT } from "./SharedUI.jsx";
import SignaturePad from "./SignaturePad.jsx";

// ─── TicketSignatureFlow (v27.84) ───────────────────────────────────────────
// Extracted from TicketDetail.jsx. Four signature-related sub-panels combined
// into one module since they all render in the same body region and share
// the signature/sigNotReq domain. Only one renders at a time depending on
// state:
//
//   1. Signature display — signed/approved/sentToQB/qbVerified/voided
//      tickets show the signer name, timestamp, and captured signature image.
//      Color switches between green (normal) and red (voided).
//
//   2. Sig-not-required display — sigNotReq tickets show a blue banner with
//      the reason + optional note.
//
//   3. Sig-not-required options picker — when the user clicks SIG NOT
//      REQUIRED in the footer (showSigOptions true), picks between
//      "Customer does not require field signature" and "Other" (with text
//      input). Confirm / Cancel buttons.
//
//   4. Signature pad — when showSigPad is true, renders the SignaturePad
//      component. Parent's handleSign captures and saves.
//
// Props:
//   status — current ticket status (drives which display variant)
//   signedBy, signedAt, signatureImage — signed-display content
//   sigNotReqReason, sigNotReqNote — sigNotReq-display content
//   showSigOptions — flag; parent-owned; child renders picker when true
//   setSigNotReqReason, setSigNotReqNote — controlled picker
//   onConfirmSigNotRequired — parent handler (reads reason + note from state)
//   onCancelSigOptions — closes the options panel
//   showSigPad — flag; parent-owned; child renders SignaturePad when true
//   onSign — parent handler from SignaturePad onSign callback
//   onCancelSigPad — closes the signature pad

function TicketSignatureFlow({
  status,
  signedBy,
  signedAt,
  signatureImage,
  sigNotReqReason,
  sigNotReqNote,
  showSigOptions,
  setSigNotReqReason,
  setSigNotReqNote,
  onConfirmSigNotRequired,
  onCancelSigOptions,
  showSigPad,
  onSign,
  onCancelSigPad,
}) {
  const isSigned = ["signed", "approved", "sentToQB", "qbVerified", "voided"].includes(status) && signedBy;

  return (
    <>
      {/* Signature display */}
      {isSigned && (
        <div
          style={{
            background: status === "voided" ? TINT.redBg : TINT.greenBg,
            border: `1px solid ${status === "voided" ? TINT.redText : TINT.greenText}44`,
            borderRadius: 6,
            padding: 14,
            marginTop: 16,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 800, color: status === "voided" ? C.red : C.green, marginBottom: 6 }}>✓ SIGNED &nbsp; {signedBy}</div>
          {signedAt && (
            <div style={{ fontSize: 10, color: C.muted, marginBottom: 6 }}>
              Signed:{" "}
              {new Date(signedAt).toLocaleString("en-US", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              })}
            </div>
          )}
          {signatureImage && (
            <img
              src={signatureImage}
              alt="Signature"
              style={{ maxWidth: 300, height: 80, display: "block", border: `1px solid ${C.border}`, borderRadius: 4, background: C.white }}
            />
          )}
        </div>
      )}

      {/* Sig-not-required display */}
      {status === "sigNotReq" && (
        <div style={{ background: TINT.blueBg, border: `1px solid ${TINT.blueText}44`, borderRadius: 6, padding: 14, marginTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: C.blue }}>SIGNATURE NOT REQUIRED</div>
          <div style={{ fontSize: 11, color: C.text, marginTop: 4 }}>{sigNotReqReason}</div>
          {sigNotReqNote && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{sigNotReqNote}</div>}
        </div>
      )}

      {/* Sig-not-required options picker (shown when showSigOptions) */}
      {showSigOptions && (
        <div style={{ background: C.steel, border: `1px solid ${C.border}`, borderRadius: 6, padding: 16, marginTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 10 }}>REASON SIGNATURE NOT REQUIRED</div>
          {[
            ["not_required", "Customer does not require field signature"],
            ["other", "Other"],
          ].map(([val, lbl]) => (
            <div
              key={val}
              style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, cursor: "pointer" }}
              onClick={() => setSigNotReqReason(sigNotReqReason === val ? null : val)}
            >
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  border: `2px solid ${sigNotReqReason === val ? C.blue : C.border}`,
                  background: sigNotReqReason === val ? C.blue : "transparent",
                }}
              />
              <span style={{ fontSize: 12, fontWeight: 700 }}>{lbl}</span>
            </div>
          ))}
          {sigNotReqReason === "other" && (
            <input style={inputStyle} value={sigNotReqNote} onChange={(e) => setSigNotReqNote(e.target.value)} placeholder="Reason..." />
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <Btn onClick={onConfirmSigNotRequired}>CONFIRM</Btn>
            <Btn variant="ghost" onClick={onCancelSigOptions}>
              CANCEL
            </Btn>
          </div>
        </div>
      )}

      {/* Signature pad */}
      {showSigPad && <SignaturePad onSign={onSign} onCancel={onCancelSigPad} />}
    </>
  );
}

export default TicketSignatureFlow;
