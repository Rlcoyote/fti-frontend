import { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import { C, API_URL } from "./config.js";
import { Btn, ModalWrap, inputStyle, labelStyle } from "./SharedUI.jsx";

// ─── TotpSetupModal (v27.98) ────────────────────────────────────────────────
// Self-service 2FA enable/disable for the logged-in user. Called from
// UsersPage on the user's own row.
//
// Flow (enable, 3 steps):
//   1. SETUP — POST /auth/totp/setup; backend returns secret + otpauth URL.
//      Modal renders QR (via qrcode lib) + copyable manual-entry string.
//      User scans with their authenticator app.
//   2. VERIFY — user enters the first 6-digit code from their authenticator.
//      POST /auth/totp/verify-setup; backend verifies, enables, returns
//      10 plaintext recovery codes (shown ONCE).
//   3. SAVE CODES — recovery codes displayed with copy-all and
//      "I saved them" button. On confirm, modal closes.
//
// Flow (disable):
//   Single step — current password + current TOTP code required.
//   POST /auth/totp/disable. On success, modal closes.
//
// Design intent:
//   - No round-trip to check TOTP state on mount — caller passes totpEnabled
//     as a prop. Users page already has it from the GET /users response.
//   - Recovery codes are shown ONCE; user must click "I saved them" to close.
//     No back button once codes are shown — emphasizes that this is their
//     last chance to copy. Modal close X is also there if they need it, but
//     the codes won't be retrievable.

function TotpSetupModal({ userName, totpEnabled, onClose, onStateChange }) {
  // enable-flow states: "intro", "setup", "verify", "codes"
  // disable-flow states: "disable"
  const [step, setStep] = useState(totpEnabled ? "disable" : "intro");
  const [secret, setSecret] = useState("");
  const [otpauthUrl, setOtpauthUrl] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [code, setCode] = useState("");
  const [currentPw, setCurrentPw] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const codesRef = useRef(null);

  // Render QR once we have the otpauth URL
  useEffect(() => {
    if (!otpauthUrl) return;
    QRCode.toDataURL(otpauthUrl, { width: 220, margin: 1, color: { dark: "#1a2332", light: "#ffffff" } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(""));
  }, [otpauthUrl]);

  const beginSetup = async () => {
    setLoading(true); setError("");
    try {
      const r = await fetch(`${API_URL}/auth/totp/setup`, { method: "POST", headers: { "Content-Type": "application/json" } });
      const data = await r.json();
      if (!r.ok) { setError(data.error || "Setup failed"); return; }
      setSecret(data.secret);
      setOtpauthUrl(data.otpauth_url);
      setStep("setup");
    } catch { setError("Connection error"); }
    finally { setLoading(false); }
  };

  const verifyCode = async () => {
    if (!/^\d{6}$/.test(code.trim())) { setError("Enter the 6-digit code from your app"); return; }
    setLoading(true); setError("");
    try {
      const r = await fetch(`${API_URL}/auth/totp/verify-setup`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error || "Verification failed"); return; }
      setRecoveryCodes(data.recovery_codes || []);
      setStep("codes");
      if (onStateChange) onStateChange(true);
    } catch { setError("Connection error"); }
    finally { setLoading(false); }
  };

  const disable2fa = async () => {
    if (!currentPw || !/^.{1,}$/.test(code.trim())) { setError("Password and 2FA code required"); return; }
    setLoading(true); setError("");
    try {
      const r = await fetch(`${API_URL}/auth/totp/disable`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_password: currentPw, totp_code: code.trim() }),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error || "Disable failed"); return; }
      if (onStateChange) onStateChange(false);
      onClose();
    } catch { setError("Connection error"); }
    finally { setLoading(false); }
  };

  const copyCodes = () => {
    const text = recoveryCodes.join("\n");
    navigator.clipboard?.writeText(text);
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 2000);
  };

  const title = step === "disable" ? "Disable Two-Factor Authentication"
    : step === "codes" ? "Save Your Recovery Codes"
    : step === "verify" ? "Verify Authenticator"
    : step === "setup" ? "Scan with Authenticator App"
    : "Enable Two-Factor Authentication";

  return (
    <ModalWrap title={title} onClose={onClose} width={440}>
      {/* Disable flow */}
      {step === "disable" && (
        <>
          <div style={{ fontSize: 13, color: C.text, marginBottom: 16 }}>
            Enter your current password and a live 2FA code (or recovery code) to disable two-factor authentication for <strong>{userName}</strong>.
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>CURRENT PASSWORD</label>
            <input style={inputStyle} type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>2FA CODE OR RECOVERY CODE</label>
            <input style={{ ...inputStyle, fontFamily: "monospace" }} value={code} onChange={e => setCode(e.target.value)}
              placeholder="123456 or XXXX-XXXX" onKeyDown={e => e.key === "Enter" && disable2fa()} />
          </div>
          {error && <div style={{ color: C.red, fontSize: 12, fontWeight: 700, marginBottom: 12 }}>{error}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={disable2fa} variant="danger" disabled={loading}>{loading ? "DISABLING..." : "DISABLE 2FA"}</Btn>
            <Btn onClick={onClose} variant="ghost">CANCEL</Btn>
          </div>
        </>
      )}

      {/* Intro */}
      {step === "intro" && (
        <>
          <div style={{ fontSize: 13, color: C.text, marginBottom: 12 }}>
            Two-factor authentication adds a code from your phone on top of your password, preventing logins even if your password is stolen.
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>
            You'll need an authenticator app like Google Authenticator, Microsoft Authenticator, Authy, or 1Password.
          </div>
          {error && <div style={{ color: C.red, fontSize: 12, fontWeight: 700, marginBottom: 12 }}>{error}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={beginSetup} disabled={loading}>{loading ? "PREPARING..." : "BEGIN SETUP"}</Btn>
            <Btn onClick={onClose} variant="ghost">CANCEL</Btn>
          </div>
        </>
      )}

      {/* Setup — QR + secret */}
      {step === "setup" && (
        <>
          <div style={{ fontSize: 13, color: C.text, marginBottom: 12 }}>
            Scan this QR code with your authenticator app, or enter the secret below manually.
          </div>
          {qrDataUrl && (
            <div style={{ textAlign: "center", marginBottom: 14 }}>
              <img src={qrDataUrl} alt="2FA QR code" style={{ border: `1px solid ${C.border}`, borderRadius: 4 }} />
            </div>
          )}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>MANUAL SECRET (if you can't scan)</label>
            <div style={{
              fontFamily: "monospace", fontSize: 14, padding: "10px 12px",
              background: C.steel, border: `1px solid ${C.border}`, borderRadius: 4,
              wordBreak: "break-all", letterSpacing: "0.05em",
            }}>{secret}</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={() => setStep("verify")}>NEXT → ENTER CODE</Btn>
            <Btn onClick={onClose} variant="ghost">CANCEL</Btn>
          </div>
        </>
      )}

      {/* Verify — user enters first code */}
      {step === "verify" && (
        <>
          <div style={{ fontSize: 13, color: C.text, marginBottom: 16 }}>
            Enter the 6-digit code your authenticator app is showing for <strong>Flo-Test Inc.</strong>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>CODE</label>
            <input
              style={{ ...inputStyle, fontFamily: "monospace", fontSize: 20, letterSpacing: "0.15em", textAlign: "center" }}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              autoFocus
              onKeyDown={e => e.key === "Enter" && verifyCode()}
            />
          </div>
          {error && <div style={{ color: C.red, fontSize: 12, fontWeight: 700, marginBottom: 12 }}>{error}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={verifyCode} disabled={loading}>{loading ? "VERIFYING..." : "VERIFY"}</Btn>
            <Btn onClick={() => { setStep("setup"); setCode(""); setError(""); }} variant="ghost">BACK</Btn>
          </div>
        </>
      )}

      {/* Codes — shown ONCE */}
      {step === "codes" && (
        <>
          <div style={{ fontSize: 13, color: C.text, marginBottom: 8, fontWeight: 700 }}>
            2FA enabled. Save these recovery codes now.
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 14 }}>
            Each code works exactly once. Use them if you lose your authenticator. They will not be shown again.
          </div>
          <div
            ref={codesRef}
            style={{
              fontFamily: "monospace", fontSize: 14, padding: "14px 16px",
              background: C.steel, border: `1px solid ${C.border}`, borderRadius: 4,
              marginBottom: 12, letterSpacing: "0.05em",
            }}
          >
            {recoveryCodes.map((c, i) => (
              <div key={i}>{c}</div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <Btn onClick={copyCodes} variant="ghost">{copiedCodes ? "✓ COPIED" : "COPY ALL"}</Btn>
          </div>
          <Btn onClick={onClose}>I'VE SAVED THEM — CLOSE</Btn>
        </>
      )}
    </ModalWrap>
  );
}

export default TotpSetupModal;
