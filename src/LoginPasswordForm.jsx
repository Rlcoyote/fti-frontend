import { C } from "./config.js";
import { inputStyle, labelStyle } from "./SharedUI.jsx";

// ─── LoginPasswordForm (v28.159 — ship 2 of the LoginScreen split) ────────
// Stage 1 of login: the email + password form, the "Forgot password?"
// link, and the SIGN IN button. Presentational — LoginScreen owns the
// field state and the auth handlers. onLogin runs the password POST;
// onForgot switches to the password-reset mode.
//
// The Enter key on either field submits, matching the SIGN IN button.

function LoginPasswordForm({ email, setEmail, password, setPassword, error, msg, loading, webauthnSupported, onLogin, onForgot }) {
  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>EMAIL</label>
        <input
          style={inputStyle}
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@flotest.com"
          onKeyDown={(e) => e.key === "Enter" && onLogin()}
        />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>PASSWORD</label>
        <input
          style={inputStyle}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••"
          onKeyDown={(e) => e.key === "Enter" && onLogin()}
        />
      </div>
      <div style={{ textAlign: "right", marginBottom: 16 }}>
        <span onClick={onForgot} style={{ fontSize: 11, color: C.blue, cursor: "pointer", fontWeight: 600 }}>
          Forgot password?
        </span>
      </div>
      {error && <div style={{ color: C.red, fontSize: 12, fontWeight: 700, marginBottom: 12, textAlign: "center" }}>{error}</div>}
      {msg && <div style={{ color: C.green, fontSize: 12, fontWeight: 700, marginBottom: 12, textAlign: "center" }}>{msg}</div>}
      <button
        onClick={onLogin}
        disabled={loading || !webauthnSupported}
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
        }}
      >
        {loading ? "SIGNING IN..." : "SIGN IN"}
      </button>
      <div style={{ fontSize: 10, color: C.muted, textAlign: "center", marginTop: 12, lineHeight: 1.4 }}>
        After your password, you'll confirm with Touch ID, Face ID, or Windows Hello.
      </div>
    </>
  );
}

export default LoginPasswordForm;
