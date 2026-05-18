import { C } from "./config.js";
import { inputStyle, labelStyle } from "./SharedUI.jsx";

// ─── LoginForgotForm (v28.160 — ship 3 of the LoginScreen split) ──────────
// The "forgot password" mode: an email field and SEND RESET LINK button,
// plus a Back-to-login link. Presentational — LoginScreen owns the email
// state; onSubmit POSTs /auth/forgot-password, onBack returns to login.

function LoginForgotForm({ email, setEmail, error, msg, loading, onSubmit, onBack }) {
  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>EMAIL</label>
        <input
          style={inputStyle}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@flotest.com"
          onKeyDown={(e) => e.key === "Enter" && onSubmit()}
        />
      </div>
      {error && <div style={{ color: C.red, fontSize: 12, fontWeight: 700, marginBottom: 12, textAlign: "center" }}>{error}</div>}
      {msg && <div style={{ color: C.green, fontSize: 12, fontWeight: 700, marginBottom: 12, textAlign: "center" }}>{msg}</div>}
      <button
        onClick={onSubmit}
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
        {loading ? "SENDING..." : "SEND RESET LINK"}
      </button>
      <div style={{ textAlign: "center" }}>
        <span onClick={onBack} style={{ fontSize: 11, color: C.blue, cursor: "pointer", fontWeight: 600 }}>
          Back to login
        </span>
      </div>
    </>
  );
}

export default LoginForgotForm;
