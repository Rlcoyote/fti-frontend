import { C } from "./config.js";
import { inputStyle, labelStyle } from "./SharedUI.jsx";

// ─── LoginPasswordForm (v28.159 — ship 2 of the LoginScreen split) ────────
// Stage 1 of login: the email + password form, the "Forgot password?"
// link, and the SIGN IN button. Presentational — LoginScreen owns the
// field state and the auth handlers. onLogin runs the password POST;
// onForgot switches to the password-reset mode.
//
// v28.324 — a REAL <form> with a REAL submit. Chrome (and every password
// manager) offers to save credentials when a form containing a password
// field SUBMITS — this component had no <form> and a click-handler button,
// so no browser ever offered to remember the login ("the only app where it
// happens EVERY time" — Reggie, 2026-07-14; he was right that it was us).
// Enter now submits via native implicit submission; name attributes feed
// the manager's field detection.

function LoginPasswordForm({ email, setEmail, password, setPassword, error, msg, loading, webauthnSupported, onLogin, onForgot }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onLogin();
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle} htmlFor="login-email">
          EMAIL
        </label>
        <input
          style={inputStyle}
          id="login-email"
          name="email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@flotest.com"
        />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle} htmlFor="login-password">
          PASSWORD
        </label>
        <input
          style={inputStyle}
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••"
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
        type="submit"
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
    </form>
  );
}

export default LoginPasswordForm;
