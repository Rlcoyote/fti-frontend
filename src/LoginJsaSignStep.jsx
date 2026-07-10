import { useMemo } from "react";
import { C } from "./config.js";
import { TINT } from "./SharedUI.jsx";
import JsaSummaryCard, { fmtDate } from "./JsaSummaryCard.jsx";

// ─── LoginJsaSignStep (v28.163 — ship 6 of the LoginScreen split) ─────────
// The JSA sign-link landing. A crew member opened a sign-link from email
// or SMS; they confirm with biometric and their signature is recorded on
// that JSA. This flow does NOT log them into the dashboard — it's a
// single-purpose signing confirmation.
//
// v28.301 — the signer SEES the JSA before signing and gets a specific
// receipt after. The perjury attestation says "you have read and understood
// the JSA" — so the JSA's substance (operator, well, PPE, presenter review)
// renders ABOVE the button, and the success panel echoes exactly what was
// signed, by whom, and when. A bare "✓ JSA signed." is not a record.
//
// Presentational — LoginScreen owns jsaSignLanding (fetched by the
// URL-param effect) and the jsaSignDone flag; onSign runs the WebAuthn
// ceremony + the /jsas/:id/sign POST from the button's user-activation.

function LoginJsaSignStep({ jsaSignLanding, jsaSignDone, error, loading, onSign }) {
  // Stamped when the success panel first renders — display-only; the
  // authoritative signature timestamp is recorded server-side by /sign.
  const signedStamp = useMemo(() => (jsaSignDone ? new Date().toLocaleString() : null), [jsaSignDone]);

  const jsa = jsaSignLanding.jsa || {};

  if (jsaSignDone) {
    return (
      <div
        style={{
          padding: "14px 16px",
          background: TINT.greenBg,
          border: `1px solid ${TINT.jsaGreenText}44`,
          borderRadius: 4,
          marginBottom: 16,
          fontSize: 14,
          fontWeight: 700,
          color: TINT.jsaGreenText,
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 8 }}>✓ JSA SIGNED</div>
        {/* v28.301 — the receipt: exactly what was signed, by whom, when */}
        <div style={{ fontSize: 12, fontWeight: 600, color: TINT.grayText, lineHeight: 1.7 }}>
          {jsa.customer_name && (
            <div>
              Customer: <strong>{jsa.customer_name}</strong>
            </div>
          )}
          {jsa.ticket_number && (
            <div>
              Ticket: <strong>#{jsa.ticket_number}</strong>
              {jsa.ticket_type ? ` (${jsa.ticket_type})` : ""}
            </div>
          )}
          {(jsa.jsa_date || jsa.ticket_date) && (
            <div>
              JSA date: <strong>{fmtDate(jsa.jsa_date || jsa.ticket_date)}</strong>
            </div>
          )}
          {jsa.well_name && (
            <div>
              Well: <strong>{jsa.well_name}</strong>
            </div>
          )}
          <div>
            Signed as: <strong>{jsaSignLanding.user_name}</strong>
          </div>
          <div>
            Signed at: <strong>{signedStamp}</strong>
          </div>
        </div>
        <div style={{ fontSize: 12, fontWeight: 400, color: TINT.grayText, marginTop: 8, textAlign: "center" }}>
          Your signature has been recorded. You can close this window.
        </div>
      </div>
    );
  }

  return (
    <>
      <div style={{ marginBottom: 12, fontSize: 13, color: C.text, lineHeight: 1.5 }}>
        Hi <strong>{jsaSignLanding.user_name}</strong>. You've been asked to sign this JSA. Review it below before confirming.
      </div>
      <JsaSummaryCard jsa={jsa} />
      <div
        style={{
          fontSize: 12,
          color: C.muted,
          marginBottom: 16,
          padding: "10px 12px",
          background: C.steel,
          border: `1px solid ${C.border}`,
          borderRadius: 4,
          lineHeight: 1.5,
        }}
      >
        By tapping CONFIRM WITH BIOMETRIC, you attest under penalty of perjury that you have read and understood the JSA above, that you participated in the JSA
        meeting, and that this is your legally binding signature.
      </div>
      {error && <div style={{ color: C.red, fontSize: 12, fontWeight: 700, marginBottom: 12, textAlign: "center" }}>{error}</div>}
      <button
        onClick={onSign}
        disabled={loading}
        style={{
          width: "100%",
          padding: "12px 0",
          background: C.red,
          color: C.white,
          border: "none",
          borderRadius: 4,
          fontSize: 14,
          fontWeight: 700,
          cursor: loading ? "default" : "pointer",
          letterSpacing: "0.06em",
          opacity: loading ? 0.6 : 1,
          marginBottom: 12,
        }}
      >
        {loading ? "WAITING FOR BIOMETRIC..." : "CONFIRM WITH BIOMETRIC"}
      </button>
    </>
  );
}

export default LoginJsaSignStep;
