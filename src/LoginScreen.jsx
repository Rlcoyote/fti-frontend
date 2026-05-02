import { useState, useEffect } from "react";
import { startRegistration, startAuthentication, browserSupportsWebAuthn } from "@simplewebauthn/browser";
import { C, API_URL } from "./config.js";
import { inputStyle, labelStyle } from "./SharedUI.jsx";
import { useApp } from "./AppContext.jsx";

// ─── LoginScreen (v27.99) ───────────────────────────────────────────────────
// Two-stage login: password → biometric.
//
// Stage 1 — POST /auth/login with email + password.
//   Response branches on whether the user already has a registered device:
//     - requires_webauthn_registration: true → first login post-deploy.
//       Browser runs navigator.credentials.create() with the supplied options;
//       on success we POST /auth/webauthn/register-verify with the attestation
//       + pending_token; server returns the full session JWT.
//     - requires_webauthn_authentication: true → existing device.
//       Browser runs navigator.credentials.get() with the supplied options;
//       on success we POST /auth/webauthn/auth-verify; server returns JWT.
//
// Stage 2 happens entirely inside the same handleLogin() flow — after the
// browser's biometric prompt. No second screen, no code entry. The user
// experiences: enter email + password → tap Touch ID / Face ID → in.
//
// First-login UX:
//   The user must register a device on their first login post-v27.99 deploy.
//   We ask for a friendly device label (defaults to a guess from user agent)
//   so they'll recognize it on the Manage Devices page later. Skipping this
//   step is not allowed — biometric is required for everyone.
//
// Browser support:
//   browserSupportsWebAuthn() is checked on mount. If the browser is too old
//   or running in a context that doesn't support WebAuthn (some embedded
//   webviews), we surface a clear "use a modern browser" message instead of
//   letting the user hit a cryptic error.

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

  // v27.99 — WebAuthn registration step state. When backend returns
  // requires_webauthn_registration on a valid password, we hold the pending
  // token + reg options here while the user names their device. On confirm,
  // we run startRegistration() and post the result to register-verify.
  const [pendingRegistration, setPendingRegistration] = useState(null);
  const [deviceLabel, setDeviceLabel] = useState("");

  // v28.01 — Pending authentication state. iOS WebKit (Safari + Chrome on
  // iOS) revokes user-activation across an awaited fetch, so calling
  // startAuthentication() inline after `await fetch('/auth/login')` throws
  // NotAllowedError on iPhones — the activation token expired during the
  // network round-trip. Fix: stash the auth payload here and render a fresh
  // "Confirm with Biometric" button. The user's tap on that button creates
  // a new activation, then startAuthentication() fires inside the activation
  // window. Costs one extra tap; eliminates iOS NotAllowedError entirely.
  const [pendingAuthentication, setPendingAuthentication] = useState(null);

  // v28.03 — Magic-link new-device enrollment state. Three sub-states:
  //   - authFailedShowLinkOption: after a failed startAuthentication() on a
  //     device with no matching passkey, surface the "Send registration link"
  //     CTA. User taps → POST /webauthn/request-device-link → email sent.
  //   - linkSentMsg: after the email goes out, show a confirmation banner.
  //   - enrollmentLanding: when the user opens the email link, the URL has
  //     ?enroll=<token>&uid=<id>; we fetch options, render a name-this-device
  //     panel, run startRegistration() on tap, then complete login.
  const [authFailedShowLinkOption, setAuthFailedShowLinkOption] = useState(false);
  const [linkSentMsg, setLinkSentMsg] = useState("");
  const [enrollmentLanding, setEnrollmentLanding] = useState(null); // { pending_token, registration_options, user_email, user_name } | null
  const [enrollmentLoading, setEnrollmentLoading] = useState(false);

  // v28.07 — JSA sign-link landing state. Set when ?jsa_sign=&uid=&jsa= URL
  // params are present and the /api/jsas/sign-options call succeeds.
  // Carries: pending_token, authentication_options, user_name, jsa { id,
  // ticket_number, ticket_type, ticket_date, customer_name }.
  const [jsaSignLanding, setJsaSignLanding] = useState(null);
  const [jsaSignLoading, setJsaSignLoading] = useState(false);
  const [jsaSignDone, setJsaSignDone] = useState(false);

  const webauthnSupported = typeof window !== "undefined" ? browserSupportsWebAuthn() : true;

  // Check URL for reset token on mount, OR for v28.03 enrollment token,
  // OR for v28.07 JSA-sign magic-link.
  // Three link types share the same landing page; disambiguated by which
  // query param is present (`?reset=` / `?enroll=` / `?jsa_sign=`).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const resetTokenParam = params.get("reset");
    const enrollTokenParam = params.get("enroll");
    const jsaSignTokenParam = params.get("jsa_sign");
    const uid = params.get("uid");
    if (resetTokenParam && uid) {
      setResetToken(resetTokenParam);
      setResetUid(uid);
      setMode("reset");
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }
    if (enrollTokenParam && uid) {
      // v28.03 — magic-link device enrollment landing.
      window.history.replaceState({}, document.title, window.location.pathname);
      (async () => {
        setEnrollmentLoading(true); setError("");
        try {
          const r = await fetch(`${API_URL}/auth/webauthn/enroll-options`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: enrollTokenParam, user_id: uid }),
          });
          const data = await r.json();
          if (!r.ok) {
            setError(data.error || "Could not start enrollment");
            return;
          }
          setEnrollmentLanding(data);
          setDeviceLabel(suggestDeviceLabel());
        } catch {
          setError("Connection error opening enrollment link");
        } finally {
          setEnrollmentLoading(false);
        }
      })();
      return;
    }
    if (jsaSignTokenParam && uid) {
      // v28.07 — JSA sign magic-link landing. Validates token, fetches
      // WebAuthn auth options, drops user into a sign-this-JSA flow.
      const jsaIdParam = params.get("jsa");
      if (!jsaIdParam) {
        setError("Sign link is missing the JSA reference. Ask the lead to send a fresh link.");
        return;
      }
      window.history.replaceState({}, document.title, window.location.pathname);
      (async () => {
        setJsaSignLoading(true); setError("");
        try {
          // v28.20 — jsa_id is UUID per schema.sql; pass the URL param string
          // through verbatim, do not coerce to integer.
          const r = await fetch(`${API_URL}/jsas/sign-options`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: jsaSignTokenParam, user_id: uid, jsa_id: jsaIdParam }),
          });
          const data = await r.json();
          if (!r.ok) {
            setError(data.error || "Could not open sign link");
            return;
          }
          setJsaSignLanding({ ...data, jsa_id: jsaIdParam });
        } catch {
          setError("Connection error opening sign link");
        } finally {
          setJsaSignLoading(false);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Suggest a device label based on user agent — user can edit before registering.
  const suggestDeviceLabel = () => {
    const ua = (navigator.userAgent || "").toLowerCase();
    if (/iphone/.test(ua)) return "iPhone";
    if (/ipad/.test(ua)) return "iPad";
    if (/android/.test(ua)) return "Android phone";
    if (/mac/.test(ua)) return "MacBook";
    if (/windows/.test(ua)) return "Windows PC";
    return "This device";
  };

  // ── Stage 2a: complete authentication with existing device ──
  // v28.01 — Called from the "Confirm with Biometric" button click handler so
  // the WebAuthn call runs inside a fresh user-activation window. Reads the
  // pending payload from state instead of taking it as args; the button-click
  // boundary is the activation source.
  const completeAuthentication = async () => {
    if (!pendingAuthentication) return;
    const { pending_token: pendingToken, authentication_options: authOptions } = pendingAuthentication;
    setError(""); setLinkSentMsg(""); setAuthFailedShowLinkOption(false); setLoading(true);
    let assertion;
    try {
      assertion = await startAuthentication({ optionsJSON: authOptions });
    } catch (browserErr) {
      const name = browserErr?.name || "";
      let msg = browserErr?.message || "Biometric verification cancelled";
      if (name === "NotAllowedError") {
        // v28.03 — surface the magic-link CTA when biometric fails. This is
        // the typical "I'm on a new device, I don't have a passkey here" path.
        msg = "Biometric verification didn't complete. If this is a new device, you can register it via an email link below.";
        setAuthFailedShowLinkOption(true);
      }
      setError(msg);
      setLoading(false);
      return;
    }
    try {
      const r = await fetch(`${API_URL}/auth/webauthn/auth-verify`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pending_token: pendingToken, response: assertion }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data.error || "Verification failed");
        return;
      }
      if (data.token) {
        setCurrentUser(data);
      } else {
        setError("Server did not return a session token");
      }
    } catch {
      setError("Connection error during verification");
    } finally {
      setLoading(false);
    }
  };

  const cancelAuthentication = () => {
    setPendingAuthentication(null);
    setAuthFailedShowLinkOption(false);
    setLinkSentMsg("");
    setError("");
  };

  // v28.03 — User clicked "Send registration link to my email" after a failed
  // biometric on this device. POSTs to /auth/webauthn/request-device-link
  // with the pending_token from the prior /auth/login response.
  const requestDeviceLink = async () => {
    if (!pendingAuthentication) return;
    const { pending_token: pendingToken } = pendingAuthentication;
    setLoading(true); setError(""); setLinkSentMsg("");
    try {
      const r = await fetch(`${API_URL}/auth/webauthn/request-device-link`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pending_token: pendingToken }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data.error || "Could not send registration link");
        return;
      }
      setLinkSentMsg(data.message || "Registration link sent. Check your email on this device.");
      setAuthFailedShowLinkOption(false);
    } catch {
      setError("Connection error — could not send registration link");
    } finally {
      setLoading(false);
    }
  };

  // v28.07 — User opened the JSA sign-link on their device. Runs the
  // WebAuthn authentication ceremony with options already fetched by the
  // URL-param effect, then posts the assertion to /jsas/:id/sign with the
  // pending_token. This flow does NOT log them into the dashboard — it
  // signs the JSA and shows a success state.
  const completeJsaSign = async () => {
    if (!jsaSignLanding) return;
    setError(""); setLoading(true);
    try {
      let assertion;
      try {
        assertion = await startAuthentication({ optionsJSON: jsaSignLanding.authentication_options });
      } catch (browserErr) {
        const msg = browserErr?.name === "NotAllowedError"
          ? "Biometric did not complete. Tap CONFIRM again."
          : browserErr?.message || "Biometric cancelled";
        setError(msg);
        return;
      }
      const captureGps = () => new Promise(resolve => {
        if (!navigator.geolocation) return resolve({ lat: null, lng: null });
        navigator.geolocation.getCurrentPosition(
          pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve({ lat: null, lng: null }),
          { timeout: 4000, enableHighAccuracy: false }
        );
      });
      const gps = await captureGps();
      const r = await fetch(`${API_URL}/jsas/${jsaSignLanding.jsa_id}/sign`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "biometric",
          webauthn_response: assertion,
          pending_token: jsaSignLanding.pending_token,
          gps_lat: gps.lat,
          gps_lng: gps.lng,
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data.error || "Sign verification failed");
        return;
      }
      setJsaSignDone(true);
    } catch {
      setError("Connection error during signing");
    } finally {
      setLoading(false);
    }
  };

  // v28.03 — User opened the email link on the new device and clicked
  // REGISTER & SIGN IN. Runs the WebAuthn registration ceremony with options
  // already fetched by the URL-param effect, then posts the attestation.
  const completeDeviceEnrollment = async () => {
    if (!enrollmentLanding) return;
    const label = (deviceLabel || "").trim() || suggestDeviceLabel();
    setError(""); setLoading(true);
    try {
      let attResp;
      try {
        attResp = await startRegistration({ optionsJSON: enrollmentLanding.registration_options });
      } catch (browserErr) {
        const msg = browserErr?.name === "InvalidStateError"
          ? "This device is already registered for your account."
          : browserErr?.message || "Biometric registration cancelled";
        setError(msg);
        return;
      }
      const r = await fetch(`${API_URL}/auth/webauthn/enroll-verify`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pending_token: enrollmentLanding.pending_token, response: attResp, device_label: label }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data.error || "Enrollment failed");
        return;
      }
      if (data.token) {
        setCurrentUser(data);
      } else {
        setError("Server did not return a session token");
      }
    } catch {
      setError("Connection error during enrollment");
    } finally {
      setLoading(false);
    }
  };

  // ── Stage 2b: register first device, then complete login ──
  const completeFirstRegistration = async () => {
    if (!pendingRegistration) return;
    const { pending_token, registration_options } = pendingRegistration;
    const label = (deviceLabel || "").trim() || suggestDeviceLabel();
    setError(""); setLoading(true);
    try {
      let attResp;
      try {
        attResp = await startRegistration({ optionsJSON: registration_options });
      } catch (browserErr) {
        const msg = browserErr?.name === "InvalidStateError"
          ? "This device is already registered."
          : browserErr?.message || "Biometric registration cancelled";
        setError(msg);
        return;
      }
      const r = await fetch(`${API_URL}/auth/webauthn/register-verify`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pending_token, response: attResp, device_label: label }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data.error || "Registration failed");
        return;
      }
      if (data.token) {
        setCurrentUser(data);
      } else {
        setError("Server did not return a session token");
      }
    } catch {
      setError("Connection error during registration");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    // Read directly from DOM as fallback in case Chrome autofill bypassed onChange
    const emailVal = email.trim() || document.querySelector('input[type="email"]')?.value?.trim() || "";
    const pwVal = password || document.querySelector('input[type="password"]')?.value || "";
    if (!emailVal || !pwVal) { setError("Email and password required"); return; }
    if (!webauthnSupported) {
      setError("Your browser doesn't support biometric sign-in. Use a modern browser (Chrome, Safari, Edge, Firefox).");
      return;
    }
    if (!email.trim() && emailVal) setEmail(emailVal);
    if (!password && pwVal) setPassword(pwVal);
    setLoading(true); setError("");
    try {
      const r = await fetch(`${API_URL}/auth/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailVal.toLowerCase(), password: pwVal }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data.error || "Login failed");
        return;
      }
      // v27.99 — biometric authentication branch.
      // v28.01 — Don't auto-fire startAuthentication(); stash the payload and
      // require a fresh tap on the Confirm button so iOS WebKit sees a live
      // user-activation token when the WebAuthn call runs.
      if (data.requires_webauthn_authentication && data.pending_token && data.authentication_options) {
        setPendingAuthentication({
          pending_token: data.pending_token,
          authentication_options: data.authentication_options,
        });
        return;
      }
      // v27.99 — first-login device registration branch.
      if (data.requires_webauthn_registration && data.pending_token && data.registration_options) {
        setPendingRegistration({
          pending_token: data.pending_token,
          registration_options: data.registration_options,
        });
        setDeviceLabel(suggestDeviceLabel());
        return;
      }
      // Defensive — backend should never reach here.
      setError("Unexpected login response. Contact your administrator.");
    } catch {
      setError("Connection error — check internet");
    } finally { setLoading(false); }
  };

  const cancelRegistration = () => {
    setPendingRegistration(null);
    setDeviceLabel("");
    setError("");
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
    } catch { setError("Connection error"); }
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
    } catch { setError("Connection error"); }
    finally { setLoading(false); }
  };

  const showJsaSignStep = mode === "login" && !!jsaSignLanding;
  const showEnrollmentStep = mode === "login" && !!enrollmentLanding && !jsaSignLanding;
  const showRegistrationStep = mode === "login" && !!pendingRegistration && !enrollmentLanding && !jsaSignLanding;
  const showAuthenticationStep = mode === "login" && !!pendingAuthentication && !pendingRegistration && !enrollmentLanding && !jsaSignLanding;
  const showLoginForm = mode === "login" && !pendingRegistration && !pendingAuthentication && !enrollmentLanding && !jsaSignLanding;

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
            {mode === "login"
              ? (showJsaSignStep ? "SIGN THE JSA" : showEnrollmentStep ? "REGISTER THIS DEVICE" : showRegistrationStep ? "REGISTER THIS DEVICE" : showAuthenticationStep ? "CONFIRM WITH BIOMETRIC" : "OPERATIONS DASHBOARD")
              : mode === "forgot" ? "PASSWORD RESET" : "SET NEW PASSWORD"}
            {" "}<span style={{ color: C.white, fontWeight: 700 }}>v28.27</span>
          </div>
        </div>

        {!webauthnSupported && (
          <div style={{
            background: "#fdecea", border: `1px solid ${C.red}33`, color: C.red,
            padding: "10px 14px", borderRadius: 4, fontSize: 12, marginBottom: 16, fontWeight: 600,
          }}>
            Your browser doesn't support biometric sign-in. Use Chrome, Safari, Edge, or Firefox.
          </div>
        )}

        {showLoginForm && (
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
            <button onClick={handleLogin} disabled={loading || !webauthnSupported} style={{
              width: "100%", padding: "12px 0", background: C.red, color: C.white, border: "none",
              borderRadius: 4, fontSize: 14, fontWeight: 700, cursor: loading ? "default" : "pointer",
              letterSpacing: "0.06em", opacity: loading ? 0.6 : 1,
            }}>{loading ? "SIGNING IN..." : "SIGN IN"}</button>
            <div style={{ fontSize: 10, color: C.muted, textAlign: "center", marginTop: 12, lineHeight: 1.4 }}>
              After your password, you'll confirm with Touch ID, Face ID, or Windows Hello.
            </div>
          </>
        )}

        {/* v28.07 — JSA sign-link landing. User clicked a sign-link from
            email/SMS. They auth via biometric (existing passkey on this
            device required) and the JSA gets signed in their slot. They
            do NOT log into the dashboard from this flow — it's a single-
            purpose JSA sign confirmation. */}
        {showJsaSignStep && !jsaSignDone && (
          <>
            <div style={{ marginBottom: 14, fontSize: 13, color: C.text, lineHeight: 1.5 }}>
              Hi <strong>{jsaSignLanding.user_name}</strong>. You've been asked to sign the
              JSA for <strong>{jsaSignLanding.jsa.customer_name || 'this ticket'}</strong>
              {jsaSignLanding.jsa.ticket_date ? <> on <strong>{new Date(jsaSignLanding.jsa.ticket_date).toLocaleDateString()}</strong></> : null}
              {jsaSignLanding.jsa.ticket_number ? <> — Ticket #{jsaSignLanding.jsa.ticket_number}</> : null}.
            </div>
            <div style={{
              fontSize: 12, color: C.muted, marginBottom: 16, padding: "10px 12px",
              background: C.steel, border: `1px solid ${C.border}`, borderRadius: 4, lineHeight: 1.5,
            }}>
              By tapping CONFIRM WITH BIOMETRIC, you attest under penalty of perjury
              that you have read and understood the JSA, that you participated in the
              JSA meeting, and that this is your legally binding signature.
            </div>
            {error && <div style={{ color: C.red, fontSize: 12, fontWeight: 700, marginBottom: 12, textAlign: "center" }}>{error}</div>}
            <button onClick={completeJsaSign} disabled={loading} style={{
              width: "100%", padding: "12px 0", background: C.red, color: C.white, border: "none",
              borderRadius: 4, fontSize: 14, fontWeight: 700, cursor: loading ? "default" : "pointer",
              letterSpacing: "0.06em", opacity: loading ? 0.6 : 1, marginBottom: 12,
            }}>{loading ? "WAITING FOR BIOMETRIC..." : "CONFIRM WITH BIOMETRIC"}</button>
          </>
        )}

        {showJsaSignStep && jsaSignDone && (
          <>
            <div style={{
              padding: "14px 16px", background: "#e6f5ec",
              border: `1px solid #00633a44`, borderRadius: 4, marginBottom: 16,
              fontSize: 14, fontWeight: 700, color: "#00633a", textAlign: "center",
            }}>
              ✓ JSA signed.<br/>
              <span style={{ fontSize: 12, fontWeight: 400, color: C.text }}>
                Your signature has been recorded. You can close this window.
              </span>
            </div>
          </>
        )}

        {jsaSignLoading && !jsaSignLanding && (
          <div style={{ textAlign: "center", fontSize: 13, color: C.muted, padding: "20px 0" }}>
            Opening sign link...
          </div>
        )}

        {showAuthenticationStep && (
          <>
            <div style={{ marginBottom: 14, fontSize: 13, color: C.text, lineHeight: 1.5 }}>
              Password verified. Tap below to confirm with your biometric.
            </div>
            <div style={{
              fontSize: 12, color: C.muted, marginBottom: 16, padding: "10px 12px",
              background: C.steel, border: `1px solid ${C.border}`, borderRadius: 4, lineHeight: 1.5,
            }}>
              Your device will prompt for Touch ID, Face ID, Windows Hello, or your saved passkey.
            </div>
            {error && <div style={{ color: C.red, fontSize: 12, fontWeight: 700, marginBottom: 12, textAlign: "center" }}>{error}</div>}
            {linkSentMsg && (
              <div style={{
                background: "#e6f5ec", border: `1px solid ${C.green}33`, color: C.green,
                padding: "10px 14px", borderRadius: 4, fontSize: 12, marginBottom: 12, fontWeight: 600, textAlign: "center",
              }}>
                {linkSentMsg}
              </div>
            )}
            <button onClick={completeAuthentication} disabled={loading} style={{
              width: "100%", padding: "12px 0", background: C.red, color: C.white, border: "none",
              borderRadius: 4, fontSize: 14, fontWeight: 700, cursor: loading ? "default" : "pointer",
              letterSpacing: "0.06em", opacity: loading ? 0.6 : 1, marginBottom: 12,
            }}>{loading ? "WAITING FOR BIOMETRIC..." : "CONFIRM WITH BIOMETRIC"}</button>

            {/* v28.03 — magic-link CTA. Shown after a failed biometric attempt
                (NotAllowedError typically means "no matching passkey on this
                device"). One tap → email link → register on this device. */}
            {authFailedShowLinkOption && !linkSentMsg && (
              <div style={{
                marginBottom: 12, padding: "12px 14px",
                background: C.steel, border: `1px solid ${C.border}`, borderRadius: 4,
              }}>
                <div style={{ fontSize: 12, color: C.text, marginBottom: 10, lineHeight: 1.5 }}>
                  Is this a new device that hasn't been registered yet? We can email you a one-time link to register it.
                </div>
                <button onClick={requestDeviceLink} disabled={loading} style={{
                  width: "100%", padding: "10px 0", background: "transparent",
                  border: `1px solid ${C.blue}`, color: C.blue, borderRadius: 4,
                  fontSize: 13, fontWeight: 700, cursor: loading ? "default" : "pointer",
                  letterSpacing: "0.04em", opacity: loading ? 0.6 : 1,
                }}>
                  {loading ? "SENDING..." : "SEND REGISTRATION LINK TO MY EMAIL"}
                </button>
              </div>
            )}

            <div style={{ textAlign: "center" }}>
              <span onClick={cancelAuthentication} style={{ fontSize: 11, color: C.blue, cursor: "pointer", fontWeight: 600 }}>Back</span>
            </div>
          </>
        )}

        {/* v28.03 — Magic-link landing. User opened the email on the new device
            and clicked the link. Options were fetched in the URL-param effect;
            user names the device and confirms registration. The biometric
            ceremony fires from a fresh user-activation (the click on this
            button), so iOS WebKit can't revoke it mid-flight. */}
        {showEnrollmentStep && (
          <>
            <div style={{ marginBottom: 14, fontSize: 13, color: C.text, lineHeight: 1.5 }}>
              Welcome, <strong>{enrollmentLanding.user_name}</strong>. Register this device to sign in here going forward.
            </div>
            <div style={{
              fontSize: 12, color: C.muted, marginBottom: 14, padding: "10px 12px",
              background: C.steel, border: `1px solid ${C.border}`, borderRadius: 4, lineHeight: 1.5,
            }}>
              When you tap below, this device will prompt for Touch ID, Face ID, or Windows Hello. The biometric never leaves the device — only a public key is stored on the server.
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>NAME THIS DEVICE</label>
              <input
                style={inputStyle}
                value={deviceLabel}
                onChange={e => setDeviceLabel(e.target.value.slice(0, 60))}
                maxLength={60}
                placeholder="iPhone, MacBook, etc."
                onKeyDown={e => e.key === "Enter" && !loading && completeDeviceEnrollment()}
                autoFocus
              />
            </div>
            {error && <div style={{ color: C.red, fontSize: 12, fontWeight: 700, marginBottom: 12, textAlign: "center" }}>{error}</div>}
            <button onClick={completeDeviceEnrollment} disabled={loading} style={{
              width: "100%", padding: "12px 0", background: C.red, color: C.white, border: "none",
              borderRadius: 4, fontSize: 14, fontWeight: 700, cursor: loading ? "default" : "pointer",
              letterSpacing: "0.06em", opacity: loading ? 0.6 : 1, marginBottom: 12,
            }}>{loading ? "WAITING FOR BIOMETRIC..." : "REGISTER & SIGN IN"}</button>
          </>
        )}

        {/* Loading state for the enrollment-options fetch. Shown briefly while
            the URL-param effect resolves before showEnrollmentStep flips on. */}
        {enrollmentLoading && !enrollmentLanding && (
          <div style={{ textAlign: "center", fontSize: 13, color: C.muted, padding: "20px 0" }}>
            Opening registration link...
          </div>
        )}

        {showRegistrationStep && (
          <>
            <div style={{ marginBottom: 14, fontSize: 13, color: C.text, lineHeight: 1.5 }}>
              First time signing in. Register this device's biometric so you can use it next time.
            </div>
            <div style={{
              fontSize: 12, color: C.muted, marginBottom: 14, padding: "10px 12px",
              background: C.steel, border: `1px solid ${C.border}`, borderRadius: 4, lineHeight: 1.5,
            }}>
              When you click below, your device will prompt for Touch ID, Face ID, or Windows Hello.
              The biometric never leaves this device — only a public key is stored on the server.
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>NAME THIS DEVICE</label>
              <input
                style={inputStyle}
                value={deviceLabel}
                onChange={e => setDeviceLabel(e.target.value.slice(0, 60))}
                maxLength={60}
                placeholder="iPhone, MacBook, etc."
                onKeyDown={e => e.key === "Enter" && !loading && completeFirstRegistration()}
                autoFocus
              />
            </div>
            {error && <div style={{ color: C.red, fontSize: 12, fontWeight: 700, marginBottom: 12, textAlign: "center" }}>{error}</div>}
            <button onClick={completeFirstRegistration} disabled={loading} style={{
              width: "100%", padding: "12px 0", background: C.red, color: C.white, border: "none",
              borderRadius: 4, fontSize: 14, fontWeight: 700, cursor: loading ? "default" : "pointer",
              letterSpacing: "0.06em", opacity: loading ? 0.6 : 1, marginBottom: 12,
            }}>{loading ? "WAITING FOR BIOMETRIC..." : "REGISTER & SIGN IN"}</button>
            <div style={{ textAlign: "center" }}>
              <span onClick={cancelRegistration} style={{ fontSize: 11, color: C.blue, cursor: "pointer", fontWeight: 600 }}>Back</span>
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
