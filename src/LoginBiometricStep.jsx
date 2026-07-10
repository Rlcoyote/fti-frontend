import { C } from "./config.js";

// ─── LoginBiometricStep (v28.161 — ship 4 of the LoginScreen split) ───────
// Stage 2a of login: password verified, now confirm with the device's
// biometric. The CONFIRM WITH BIOMETRIC button calls onConfirm, which
// fires the WebAuthn ceremony from a fresh user-activation (the click) —
// that activation boundary is why this is a button and not auto-fired.
//
// After a failed biometric (typically a new device with no passkey),
// LoginScreen flips authFailedShowLinkOption and this panel surfaces the
// magic-link CTA (onRequestLink emails a one-time registration link).
// Presentational — every handler lives in LoginScreen.

function LoginBiometricStep({ error, linkSentMsg, loading, authFailedShowLinkOption, onConfirm, onRequestLink, onCancel }) {
  return (
    <>
      <div style={{ marginBottom: 14, fontSize: 13, color: C.text, lineHeight: 1.5 }}>Password verified. Tap below to confirm with your biometric.</div>
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
        Your device will prompt for Touch ID, Face ID, Windows Hello, or your saved passkey.
      </div>
      {error && <div style={{ color: C.red, fontSize: 12, fontWeight: 700, marginBottom: 12, textAlign: "center" }}>{error}</div>}
      {linkSentMsg && (
        <div
          style={{
            background: C.greenB,
            border: `1px solid ${C.green}33`,
            color: C.green,
            padding: "10px 14px",
            borderRadius: 4,
            fontSize: 12,
            marginBottom: 12,
            fontWeight: 600,
            textAlign: "center",
          }}
        >
          {linkSentMsg}
        </div>
      )}
      <button
        onClick={onConfirm}
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

      {/* v28.03 — magic-link CTA. Shown after a failed biometric attempt
          (NotAllowedError typically means "no matching passkey on this
          device"). One tap → email link → register on this device. */}
      {authFailedShowLinkOption && !linkSentMsg && (
        <div
          style={{
            marginBottom: 12,
            padding: "12px 14px",
            background: C.steel,
            border: `1px solid ${C.border}`,
            borderRadius: 4,
          }}
        >
          <div style={{ fontSize: 12, color: C.text, marginBottom: 10, lineHeight: 1.5 }}>
            Is this a new device that hasn't been registered yet? We can email you a one-time link to register it.
          </div>
          <button
            onClick={onRequestLink}
            disabled={loading}
            style={{
              width: "100%",
              padding: "10px 0",
              background: "transparent",
              border: `1px solid ${C.blue}`,
              color: C.blue,
              borderRadius: 4,
              fontSize: 13,
              fontWeight: 700,
              cursor: loading ? "default" : "pointer",
              letterSpacing: "0.04em",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "SENDING..." : "SEND REGISTRATION LINK TO MY EMAIL"}
          </button>
        </div>
      )}

      <div style={{ textAlign: "center" }}>
        <span onClick={onCancel} style={{ fontSize: 11, color: C.blue, cursor: "pointer", fontWeight: 600 }}>
          Back
        </span>
      </div>
    </>
  );
}

export default LoginBiometricStep;
