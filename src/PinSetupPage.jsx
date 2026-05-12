import { useEffect, useState } from "react";
import { C, API_URL } from "./config.js";

// ─── Public PIN setup page (v27.56) ──────────────────────────────────────────
// Accessed via email/SMS link: /set-pin?token=xxx
// Bypasses login (no auth context required). Employee verifies the token,
// picks a 4-digit PIN, ticks SMS consent, submits. Token is single-use; on
// success it is marked used server-side.
//
// v28.54 — SMS consent screen added. Required before "SET MY PIN" enables.
// The active employee consent script is fetched alongside the token verify
// so it renders inline. On submit, sms_consent flag passes through to the
// backend which records the consent in the same transaction as the PIN
// update — see fti-backend/src/routes/employees.js set-pin-via-token.

function PinSetupPage() {
  const [token, setToken] = useState("");
  const [status, setStatus] = useState("loading"); // loading | ready | invalid | expired | used | done
  const [errorMessage, setErrorMessage] = useState("");
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [smsConsent, setSmsConsent] = useState(false);
  const [consentScript, setConsentScript] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token") || "";
    setToken(t);
    if (!t) { setStatus("invalid"); setErrorMessage("No setup token in the link."); return; }
    (async () => {
      try {
        const r = await fetch(`${API_URL}/employees/verify-setup-token`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: t }),
        });
        const data = await r.json().catch(() => ({}));
        if (r.ok) {
          setName(data.name || "");
          setStatus("ready");
        } else if (r.status === 410 && data.error?.includes("expired")) {
          setStatus("expired"); setErrorMessage(data.error);
        } else if (r.status === 410 && data.error?.includes("used")) {
          setStatus("used"); setErrorMessage(data.error);
        } else {
          setStatus("invalid"); setErrorMessage(data.error || "Invalid link");
        }
      } catch (err) {
        setStatus("invalid"); setErrorMessage("Network error. Try again or contact your administrator.");
      }
    })();
    // Fetch the active employee SMS consent script for inline display.
    // The /sms-consent-scripts endpoint requires auth — this is the
    // public flow so we read from a token-scoped variant. The active text
    // is needed for the user to read what they're consenting to. If the
    // fetch fails (e.g. backend not yet on v28.54), we render a fallback
    // boilerplate so the consent step never blocks setup.
    (async () => {
      try {
        const r = await fetch(`${API_URL}/sms-consent-scripts`);
        if (r.ok) {
          const data = await r.json();
          if (data.employee?.script_text) setConsentScript(data.employee.script_text);
        }
      } catch (_) { /* fallback boilerplate below */ }
    })();
  }, []);

  const submit = async () => {
    if (!/^\d{4}$/.test(pin)) { setErrorMessage("PIN must be exactly 4 digits."); return; }
    if (pin !== pin2) { setErrorMessage("PINs don't match. Re-enter to confirm."); return; }
    if (!smsConsent) { setErrorMessage("Please check the SMS consent box to continue."); return; }
    setErrorMessage("");
    setSubmitting(true);
    try {
      const r = await fetch(`${API_URL}/employees/set-pin-via-token`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token, pin,
          sms_consent: smsConsent,
          device_info: typeof navigator !== "undefined" ? navigator.userAgent : null,
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) { setErrorMessage(data.error || "Failed to set PIN."); setSubmitting(false); return; }
      setStatus("done");
    } catch (err) {
      setErrorMessage("Network error. Try again.");
      setSubmitting(false);
    }
  };

  const fallbackScript = "I consent to receive operational SMS text messages from Flo-Test, Inc. at the mobile number on file. Messages include PIN setup links, JSA acknowledgments, and job assignment notifications. Standard message rates apply. Reply STOP at any time to opt out.";

  return (
    <div style={{ minHeight: "100vh", background: "#0c1524", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 10, padding: "32px 36px", width: "100%", maxWidth: 440, boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.14em", color: C.red }}>FLO-TEST INC.</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, letterSpacing: "0.1em", marginTop: 4 }}>PIN SETUP</div>
        </div>

        {status === "loading" && <div style={centerText}>Verifying link…</div>}

        {status === "invalid" && (
          <div>
            <div style={{ ...centerText, color: C.red, marginBottom: 10 }}>Invalid link</div>
            <div style={{ fontSize: 13, color: C.muted, textAlign: "center", lineHeight: 1.6 }}>
              {errorMessage || "This PIN setup link couldn't be verified."}<br/>
              Contact your administrator to request a new one.
            </div>
          </div>
        )}

        {status === "expired" && (
          <div>
            <div style={{ ...centerText, color: C.red, marginBottom: 10 }}>Link expired</div>
            <div style={{ fontSize: 13, color: C.muted, textAlign: "center", lineHeight: 1.6 }}>
              This PIN setup link has expired. Contact your administrator to request a new one.
            </div>
          </div>
        )}

        {status === "used" && (
          <div>
            <div style={{ ...centerText, color: C.red, marginBottom: 10 }}>Link already used</div>
            <div style={{ fontSize: 13, color: C.muted, textAlign: "center", lineHeight: 1.6 }}>
              This setup link has already been used to set a PIN. If you've forgotten your PIN, contact your administrator for a reset.
            </div>
          </div>
        )}

        {status === "ready" && (
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 6 }}>Hi {name},</div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 22, lineHeight: 1.6 }}>
              Choose a 4-digit PIN. You'll use it to sign Job Safety Analyses and other work records in the field.
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={labelStyle}>NEW PIN (4 DIGITS)</div>
              <input
                type="password" inputMode="numeric" pattern="\d{4}" maxLength={4}
                style={pinInputStyle} value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                autoFocus
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={labelStyle}>CONFIRM PIN</div>
              <input
                type="password" inputMode="numeric" pattern="\d{4}" maxLength={4}
                style={pinInputStyle} value={pin2}
                onChange={e => setPin2(e.target.value.replace(/\D/g, "").slice(0, 4))}
              />
            </div>

            {/* v28.54 — SMS consent capture. Required before SET MY PIN
                enables. Backend records consent + PIN in a single
                transaction. */}
            <div style={{ marginBottom: 16, marginTop: 4 }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: "#1a2340", marginBottom: 6 }}>
                SMS CONSENT
              </div>
              <label style={{
                display: "flex", alignItems: "flex-start", gap: 10,
                padding: "10px 12px", border: "1px solid #d0d8e8", borderRadius: 6,
                background: "#f7f9fc", cursor: "pointer",
              }}>
                <input
                  type="checkbox"
                  checked={smsConsent}
                  onChange={e => setSmsConsent(e.target.checked)}
                  style={{ width: 18, height: 18, marginTop: 2, cursor: "pointer", flexShrink: 0 }}
                />
                <div style={{ flex: 1, fontSize: 12, lineHeight: 1.55, color: "#1a2340" }}>
                  {consentScript || fallbackScript}
                </div>
              </label>
              <div style={{ fontSize: 10, color: "#6b7a99", marginTop: 6, textAlign: "center" }}>
                Required to receive operational text messages. View our{" "}
                <a href="https://www.flotest.com/sms-terms/" target="_blank" rel="noopener noreferrer" style={{ color: C.blue, textDecoration: "underline" }}>SMS Terms</a>
                {" · "}
                <a href="https://www.flotest.com/privacy-policy/" target="_blank" rel="noopener noreferrer" style={{ color: C.blue, textDecoration: "underline" }}>Privacy Policy</a>
              </div>
            </div>

            {errorMessage && (
              <div style={{ background: "#fdecea", color: C.red, padding: "10px 14px", borderRadius: 4, fontSize: 12, fontWeight: 700, marginBottom: 16 }}>
                {errorMessage}
              </div>
            )}

            <button
              onClick={submit}
              disabled={submitting || pin.length !== 4 || pin2.length !== 4 || !smsConsent}
              style={{
                width: "100%", background: submitting ? C.muted : C.red, color: "#fff",
                border: "none", borderRadius: 4, padding: "12px 20px",
                fontSize: 14, fontWeight: 800, letterSpacing: "0.06em",
                cursor: (submitting || pin.length !== 4 || pin2.length !== 4 || !smsConsent) ? "not-allowed" : "pointer",
                opacity: (submitting || pin.length !== 4 || pin2.length !== 4 || !smsConsent) ? 0.6 : 1,
              }}
            >{submitting ? "SAVING…" : "SET MY PIN"}</button>

            <div style={{ fontSize: 11, color: C.muted, textAlign: "center", marginTop: 18, lineHeight: 1.6 }}>
              Your PIN is stored encrypted. Administrators cannot see it.
            </div>
          </div>
        )}

        {status === "done" && (
          <div>
            <div style={{ ...centerText, color: C.green, marginBottom: 10, fontSize: 18 }}>✓ PIN set</div>
            <div style={{ fontSize: 13, color: C.muted, textAlign: "center", lineHeight: 1.6, marginBottom: 20 }}>
              You're all set. You can close this window — you'll use your PIN when you sign your first JSA on the job.
            </div>
            <button
              onClick={() => { window.location.href = "/"; }}
              style={{
                width: "100%", background: C.blue, color: "#fff",
                border: "none", borderRadius: 4, padding: "12px 20px",
                fontSize: 13, fontWeight: 800, letterSpacing: "0.06em", cursor: "pointer",
              }}
            >GO TO LOGIN</button>
          </div>
        )}
      </div>
    </div>
  );
}

// v28.43 — getter-object pattern (see SharedUI.jsx inputStyle for rationale).
// Theme-bound colors read C live per access so toggling theme mid-session
// flips these styles without a hard refresh.
const centerText = {
  textAlign: "center", fontSize: 14, fontWeight: 700,
  get color() { return C.text; },
};
const labelStyle = {
  fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", marginBottom: 6,
  get color() { return C.muted; },
};
const pinInputStyle = {
  width: "100%", boxSizing: "border-box", textAlign: "center",
  fontSize: 28, fontWeight: 800, letterSpacing: "0.4em",
  padding: "14px 12px", borderRadius: 6,
  outline: "none", fontFamily: "'Arial', sans-serif",
  get border() { return `2px solid ${C.border}`; },
};

export default PinSetupPage;
