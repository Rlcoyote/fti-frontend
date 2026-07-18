import { C } from "./config.js";
import { inputStyle, labelStyle } from "./SharedUI.jsx";

// ─── LoginDeviceRegistration (v28.162 — ship 5 of the LoginScreen split) ──
// The "register this device" panel — a name-this-device field and the
// REGISTER & SIGN IN button. LoginScreen renders it for BOTH biometric
// registration paths, which were near-identical inline blocks before:
//   1. first-login registration (pendingRegistration) — has a Back link
//   2. magic-link enrollment on a new device (enrollmentLanding) — no Back
// so this is a split and a dedup.
//
// intro + infoText differ slightly between the two paths and are passed
// in. onCancel is optional — when omitted (the enrollment path), the
// Back link doesn't render. Presentational: onRegister fires the
// WebAuthn ceremony from the button click's user-activation window.

function LoginDeviceRegistration({ intro, infoText, deviceLabel, setDeviceLabel, error, loading, onRegister, onCancel }) {
  return (
    <>
      <div style={{ marginBottom: 14, fontSize: 13, color: C.text, lineHeight: 1.5 }}>{intro}</div>
      <div
        style={{
          fontSize: 12,
          color: C.muted,
          marginBottom: 14,
          padding: "10px 12px",
          background: C.steel,
          border: `1px solid ${C.border}`,
          borderRadius: 4,
          lineHeight: 1.5,
        }}
      >
        {infoText}
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>NAME THIS DEVICE</label>
        <input
          style={inputStyle}
          value={deviceLabel}
          onChange={(e) => setDeviceLabel(e.target.value.slice(0, 60))}
          maxLength={60}
          placeholder="iPhone, MacBook, etc."
          onKeyDown={(e) => e.key === "Enter" && !loading && onRegister()}
          autoFocus
        />
      </div>
      {error && <div style={{ color: C.red, fontSize: 12, fontWeight: 700, marginBottom: 12, textAlign: "center" }}>{error}</div>}
      <button
        className="fti-btn"
        onClick={onRegister}
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
        {loading ? "WAITING FOR BIOMETRIC..." : "REGISTER & SIGN IN"}
      </button>
      {onCancel && (
        <div style={{ textAlign: "center" }}>
          <span onClick={onCancel} style={{ fontSize: 11, color: C.blue, cursor: "pointer", fontWeight: 600 }}>
            Back
          </span>
        </div>
      )}
    </>
  );
}

export default LoginDeviceRegistration;
