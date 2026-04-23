import { useState, useEffect } from "react";
import { C, API_URL } from "./config.js";
import { inputStyle, labelStyle } from "./SharedUI.jsx";
import { useApp } from "./AppContext.jsx";

function LoginScreen() {
  const { setCurrentUser } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("login"); // login | forgot | reset
  const [msg, setMsg] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [resetToken, setResetToken] = useState(null);
  const [resetUid, setResetUid] = useState(null);
  // v27.98 — TOTP challenge state. When backend returns requires_totp on a
  // valid password, the UI switches to a code-entry step using the same
  // email + password already entered (we keep them in state).
  const [totpRequired, setTotpRequired] = useState(false);
  const [totpCode, setTotpCode] = useState("");

  // Check URL for reset token on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("reset");
    const uid = params.get("uid");
    if (token && uid) {
      setResetToken(token);
      setResetUid(uid);
      setMode("reset");
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleLogin = async () => {
    // Read directly from DOM as fallback in case Chrome autofill bypassed onChange
    const emailVal = email.trim() || document.querySelector('input[type="email"]')?.value?.trim() || "";
    const pwVal = password || document.querySelector('input[type="password"]')?.value || "";
    if (!emailVal || !pwVal) { setError("Email and password required"); return; }
    if (totpRequired && !totpCode.trim()) { setError("2FA code required"); return; }
    // Sync state if DOM had values that React missed
    if (!email.trim() && emailVal) setEmail(emailVal);
    if (!password && pwVal) setPassword(pwVal);
    setLoading(true); setError("");
    try {
      // v27.98 — include totp_code on the second pass (after backend returned requires_totp).
      const body = { email: emailVal.toLowerCase(), password: pwVal };
      if (totpRequired && totpCode.trim()) body.totp_code = totpCode.trim();
      const r = await fetch(`${API_URL}/auth/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (r.ok && data.requires_totp) {
        // v27.98 — backend asks for 2FA code. Keep email + password in state;
        // switch the UI to the code-entry step.
        setTotpRequired(true);
        setTotpCode("");
        setError("");
        return;
      }
      if (r.ok && data.token) {
        // Full login success.
        setCurrentUser(data);
        setTotpRequired(false);
        setTotpCode("");
        return;
      }
      setError(data.error || "Login failed");
      // If the 2FA code was wrong, leave the TOTP step up so user can retry
      // without re-typing password. If error suggests bad password (and
      // we're not in TOTP step), nothing special to do.
    } catch (err) { setError("Connection error — check internet"); }
    finally { setLoading(false); }
  };

  const handleForgot = async () => {
    if (!email.trim()) { setError("Enter your email first"); return; }
    setLoading(true); setError(""); setMsg("");
    try {
      const r = await fetch(`${API_URL}/auth/forgot-password`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await r.json();
      setMsg(data.message || "Check your email for a reset link.");
    } catch (err) { setError("Connection error"); }
    finally { setLoading(false); }
  };

  const handleReset = async () => {
    if (!newPw || !confirmPw) { setError("Both fields required"); return; }
    if (newPw !== confirmPw) { setError("Passwords don't match"); return; }
    if (newPw.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true); setError(""); setMsg("");
    try {
      const r = await fetch(`${API_URL}/auth/reset-password`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: resetUid, token: resetToken, password: newPw }),
      });
      const data = await r.json();
      if (r.ok) { setMsg(data.message); setMode("login"); setResetToken(null); setResetUid(null); }
      else { setError(data.error || "Reset failed"); }
    } catch (err) { setError("Connection error"); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", background: C.darkBlue, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Arial', sans-serif" }}>
      <div style={{ background: C.cardBg, borderRadius: 8, padding: 40, width: 380, maxWidth: "90vw", borderTop: `4px solid ${C.red}` }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, border: `3px solid ${C.red}`, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: C.blue, fontSize: 18, fontWeight: 900, color: C.white,
            margin: "0 auto 12px", boxShadow: `0 0 20px ${C.red}44`,
          }}>FTI</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.text, letterSpacing: "0.1em" }}>FLO-TEST INC.</div>
          <div style={{ fontSize: 11, color: C.muted, letterSpacing: "0.12em", marginTop: 4 }}>
            {mode === "login" ? "OPERATIONS DASHBOARD" : mode === "forgot" ? "PASSWORD RESET" : "SET NEW PASSWORD"}
          </div>
        </div>

        {mode === "login" && !totpRequired && (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>EMAIL</label>
              <input style={inputStyle} type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@flotest.com" onKeyDown={e => e.key === "Enter" && handleLogin()} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>PASSWORD</label>
              <input style={inputStyle} type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••" onKeyDown={e => e.key === "Enter" && handleLogin()} />
            </div>
            <div style={{ textAlign: "right", marginBottom: 16 }}>
              <span onClick={() => { setMode("forgot"); setError(""); setMsg(""); }} style={{ fontSize: 11, color: C.blue, cursor: "pointer", fontWeight: 600 }}>Forgot password?</span>
            </div>
            {error && <div style={{ color: C.red, fontSize: 12, fontWeight: 700, marginBottom: 12, textAlign: "center" }}>{error}</div>}
            {msg && <div style={{ color: C.green, fontSize: 12, fontWeight: 700, marginBottom: 12, textAlign: "center" }}>{msg}</div>}
            <button onClick={handleLogin} disabled={loading} style={{
              width: "100%", padding: "12px 0", background: C.red, color: C.white, border: "none",
              borderRadius: 4, fontSize: 14, fontWeight: 700, cursor: loading ? "default" : "pointer",
              letterSpacing: "0.06em", opacity: loading ? 0.6 : 1,
            }}>{loading ? "SIGNING IN..." : "SIGN IN"}</button>
          </>
        )}

        {mode === "login" && totpRequired && (
          <>
            <div style={{ marginBottom: 8, textAlign: "center" }}>
              <div style={{ fontSize: 13, color: C.text, fontWeight: 600, marginBottom: 4 }}>Two-Factor Authentication</div>
              <div style={{ fontSize: 11, color: C.muted }}>Enter the 6-digit code from your authenticator app, or a recovery code.</div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>CODE</label>
              <input
                style={{ ...inputStyle, fontFamily: "monospace", fontSize: 18, letterSpacing: "0.1em", textAlign: "center" }}
                type="text"
                inputMode="text"
                autoComplete="one-time-code"
                autoFocus
                value={totpCode}
                onChange={e => setTotpCode(e.target.value)}
                placeholder="123456"
                onKeyDown={e => e.key === "Enter" && handleLogin()}
              />
            </div>
            {error && <div style={{ color: C.red, fontSize: 12, fontWeight: 700, marginBottom: 12, textAlign: "center" }}>{error}</div>}
            <button onClick={handleLogin} disabled={loading} style={{
              width: "100%", padding: "12px 0", background: C.red, color: C.white, border: "none",
              borderRadius: 4, fontSize: 14, fontWeight: 700, cursor: loading ? "default" : "pointer",
              letterSpacing: "0.06em", opacity: loading ? 0.6 : 1, marginBottom: 12,
            }}>{loading ? "VERIFYING..." : "VERIFY & SIGN IN"}</button>
            <div style={{ textAlign: "center" }}>
              <span onClick={() => { setTotpRequired(false); setTotpCode(""); setError(""); }} style={{ fontSize: 11, color: C.blue, cursor: "pointer", fontWeight: 600 }}>Back</span>
            </div>
          </>
        )}

        {mode === "forgot" && (
          <>
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>EMAIL</label>
              <input style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@flotest.com" onKeyDown={e => e.key === "Enter" && handleForgot()} />
            </div>
            {error && <div style={{ color: C.red, fontSize: 12, fontWeight: 700, marginBottom: 12, textAlign: "center" }}>{error}</div>}
            {msg && <div style={{ color: C.green, fontSize: 12, fontWeight: 700, marginBottom: 12, textAlign: "center" }}>{msg}</div>}
            <button onClick={handleForgot} disabled={loading} style={{
              width: "100%", padding: "12px 0", background: C.red, color: C.white, border: "none",
              borderRadius: 4, fontSize: 14, fontWeight: 700, cursor: loading ? "default" : "pointer",
              letterSpacing: "0.06em", opacity: loading ? 0.6 : 1, marginBottom: 12,
            }}>{loading ? "SENDING..." : "SEND RESET LINK"}</button>
            <div style={{ textAlign: "center" }}>
              <span onClick={() => { setMode("login"); setError(""); setMsg(""); }} style={{ fontSize: 11, color: C.blue, cursor: "pointer", fontWeight: 600 }}>Back to login</span>
            </div>
          </>
        )}

        {mode === "reset" && (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>NEW PASSWORD</label>
              <input style={inputStyle} type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
                placeholder="Min 6 characters" />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>CONFIRM PASSWORD</label>
              <input style={inputStyle} type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                placeholder="Re-enter password" onKeyDown={e => e.key === "Enter" && handleReset()} />
            </div>
            {error && <div style={{ color: C.red, fontSize: 12, fontWeight: 700, marginBottom: 12, textAlign: "center" }}>{error}</div>}
            {msg && <div style={{ color: C.green, fontSize: 12, fontWeight: 700, marginBottom: 12, textAlign: "center" }}>{msg}</div>}
            <button onClick={handleReset} disabled={loading} style={{
              width: "100%", padding: "12px 0", background: C.red, color: C.white, border: "none",
              borderRadius: 4, fontSize: 14, fontWeight: 700, cursor: loading ? "default" : "pointer",
              letterSpacing: "0.06em", opacity: loading ? 0.6 : 1,
            }}>{loading ? "RESETTING..." : "SET NEW PASSWORD"}</button>
          </>
        )}
      </div>
    </div>
  );
}


export default LoginScreen;
