import { useState } from "react";
import { startAuthentication } from "@simplewebauthn/browser";
import { C, API_URL } from "./config.js";
import { Btn, ModalWrap } from "./SharedUI.jsx";

// ─── JSASignSubmitModal (v28.07) ────────────────────────────────────────────
// Two-step ceremony: (1) review the perjury attestation language and confirm,
// (2) tap CONFIRM WITH BIOMETRIC to fire the WebAuthn assertion. The two-step
// is the v28.01 iOS user-activation fix — startAuthentication() must run
// inside a fresh tap activation, so we don't auto-fire it after any awaited
// fetch.
//
// Used by JSACrewSigners for self-sign (Path A). The user is already logged
// in, so we POST to /api/jsas/:id/sign WITHOUT a pending_token (server
// reads req.user.user_id). The server-side handler accepts both paths.

const PERJURY_DISPLAY = `By confirming with my biometric, I attest under penalty of perjury that I am the person identified above; that I have personally read and understood the Job Safety Analysis for this work; that I personally participated in the JSA meeting for this work; that I am physically capable of performing the work in the manner described; and that this constitutes my legally binding signature acknowledging the JSA. I understand that misrepresenting my identity, or signing on behalf of another person, constitutes fraud, may result in immediate termination, and that I may be referred for criminal prosecution.`;

function JSASignSubmitModal({ jsaId, jsaContext, onClose, onSigned }) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const captureGps = () =>
    new Promise(resolve => {
      if (!navigator.geolocation) return resolve({ lat: null, lng: null });
      navigator.geolocation.getCurrentPosition(
        pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve({ lat: null, lng: null }),
        { timeout: 4000, enableHighAccuracy: false }
      );
    });

  const fireSign = async () => {
    if (!acknowledged) { setError("You must acknowledge the attestation to sign"); return; }
    setBusy(true); setError("");
    try {
      // 1. Fetch authentication options. /webauthn/auth-options style isn't
      // exposed for an in-app session; we hit /jsas/:id/sign directly which
      // expects { method: 'biometric', webauthn_response: ... }. So we need
      // to fetch options first via the WebAuthn auth endpoint we already use.
      // Reuse /auth/webauthn/auth-verify pattern: call /auth/login? No —
      // simpler: hit a small dedicated endpoint we add, or build options
      // client-side. We do: call /webauthn/auth-options-self.
      //
      // Actually the cleanest path: skip the dual-endpoint dance for in-app
      // sign. We call a single sign endpoint that internally builds the
      // challenge as part of the request/response. But WebAuthn requires the
      // server to issue a challenge first. So we DO need an options call.
      //
      // Simplest implementation: reuse the device-enrollment-style options
      // call via a JSA-scoped helper. We'll POST /api/jsas/:id/sign-options-self
      // first, then startAuthentication, then POST /api/jsas/:id/sign.
      //
      // For Phase 1 we use the auth flow's existing options endpoint that
      // doesn't exist for self-signed-in users. Workaround: use the standard
      // /auth/login endpoint? Too heavy. Instead, expose a tiny self-options
      // endpoint server-side — added in jsas.js below.

      const optsRes = await fetch(`${API_URL}/jsas/${jsaId}/auth-options-self`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const optsData = await optsRes.json();
      if (!optsRes.ok) {
        setError(optsData?.error || "Could not start sign ceremony");
        return;
      }

      // 2. Browser WebAuthn — runs inside this button-click activation.
      let assertion;
      try {
        assertion = await startAuthentication({ optionsJSON: optsData.authentication_options });
      } catch (browserErr) {
        const name = browserErr?.name || "";
        let msg = browserErr?.message || "Biometric sign cancelled";
        if (name === "NotAllowedError") msg = "Biometric did not complete. Try again, or use the lead's override path if you cannot biometric on this device.";
        setError(msg);
        return;
      }

      // 3. Submit signature
      const gps = await captureGps();
      const signRes = await fetch(`${API_URL}/jsas/${jsaId}/sign`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "biometric",
          webauthn_response: assertion,
          gps_lat: gps.lat,
          gps_lng: gps.lng,
        }),
      });
      const signData = await signRes.json();
      if (!signRes.ok) {
        setError(signData?.error || "Signature verification failed");
        return;
      }
      onSigned();
    } catch {
      setError("Connection error during signing");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalWrap title="Sign the JSA" onClose={onClose} width={520}>
      <div style={{ marginBottom: 14, fontSize: 13, color: C.text, lineHeight: 1.5 }}>
        You're signing the JSA for <strong>{jsaContext.customer_name || 'this ticket'}</strong>
        {jsaContext.ticket_date ? <> on <strong>{new Date(jsaContext.ticket_date).toLocaleDateString()}</strong></> : null}
        {jsaContext.ticket_number ? <> — Ticket #{jsaContext.ticket_number}</> : null}.
      </div>

      <div style={{
        background: C.steel, border: `1px solid ${C.border}`, borderRadius: 4,
        padding: 14, marginBottom: 14, fontSize: 12, color: C.text, lineHeight: 1.55,
      }}>
        {PERJURY_DISPLAY}
      </div>

      <label style={{
        display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 16,
        fontSize: 12, color: C.text, cursor: "pointer", lineHeight: 1.45,
      }}>
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={e => setAcknowledged(e.target.checked)}
          style={{ marginTop: 2 }}
        />
        <span>
          I have read and understand the attestation above. By tapping CONFIRM WITH BIOMETRIC,
          I am signing the JSA under penalty of perjury.
        </span>
      </label>

      {error && (
        <div style={{ color: C.red, fontSize: 12, fontWeight: 700, marginBottom: 12 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <Btn onClick={fireSign} disabled={!acknowledged || busy}>
          {busy ? "WAITING FOR BIOMETRIC..." : "CONFIRM WITH BIOMETRIC"}
        </Btn>
        <Btn variant="ghost" onClick={onClose}>CANCEL</Btn>
      </div>
    </ModalWrap>
  );
}

export default JSASignSubmitModal;
