import { C } from "./config.js";
import { TINT } from "./SharedUI.jsx";

// ─── LoginJsaSignStep (v28.163 — ship 6 of the LoginScreen split) ─────────
// The JSA sign-link landing. A crew member opened a sign-link from email
// or SMS; they confirm with biometric and their signature is recorded on
// that JSA. This flow does NOT log them into the dashboard — it's a
// single-purpose signing confirmation, so once jsaSignDone is true the
// panel just shows a success message.
//
// Presentational — LoginScreen owns jsaSignLanding (fetched by the
// URL-param effect) and the jsaSignDone flag; onSign runs the WebAuthn
// ceremony + the /jsas/:id/sign POST from the button's user-activation.

function LoginJsaSignStep({ jsaSignLanding, jsaSignDone, error, loading, onSign }) {
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
          textAlign: "center",
        }}
      >
        ✓ JSA signed.
        <br />
        <span style={{ fontSize: 12, fontWeight: 400, color: C.text }}>Your signature has been recorded. You can close this window.</span>
      </div>
    );
  }

  return (
    <>
      <div style={{ marginBottom: 14, fontSize: 13, color: C.text, lineHeight: 1.5 }}>
        Hi <strong>{jsaSignLanding.user_name}</strong>. You've been asked to sign the JSA for{" "}
        <strong>{jsaSignLanding.jsa.customer_name || "this ticket"}</strong>
        {jsaSignLanding.jsa.ticket_date ? (
          <>
            {" "}
            on <strong>{new Date(jsaSignLanding.jsa.ticket_date).toLocaleDateString()}</strong>
          </>
        ) : null}
        {jsaSignLanding.jsa.ticket_number ? <> — Ticket #{jsaSignLanding.jsa.ticket_number}</> : null}.
      </div>
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
        By tapping CONFIRM WITH BIOMETRIC, you attest under penalty of perjury that you have read and understood the JSA, that you participated in the JSA
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
