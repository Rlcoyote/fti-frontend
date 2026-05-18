import { C } from "./config.js";
import { inputStyle, labelStyle } from "./SharedUI.jsx";

// ─── LoginResetForm (v28.160 — ship 3 of the LoginScreen split) ───────────
// The "reset" mode reached from a /auth password-reset email link: a new
// password + confirm field and the SET NEW PASSWORD button.
// Presentational — LoginScreen owns the field state and validation;
// onSubmit POSTs /auth/reset-password with the token from the URL.

function LoginResetForm({ newPw, setNewPw, confirmPw, setConfirmPw, error, msg, loading, onSubmit }) {
  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>NEW PASSWORD</label>
        <input style={inputStyle} type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="Min 6 characters" />
      </div>
      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>CONFIRM PASSWORD</label>
        <input
          style={inputStyle}
          type="password"
          value={confirmPw}
          onChange={(e) => setConfirmPw(e.target.value)}
          placeholder="Re-enter password"
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
        }}
      >
        {loading ? "RESETTING..." : "SET NEW PASSWORD"}
      </button>
    </>
  );
}

export default LoginResetForm;
