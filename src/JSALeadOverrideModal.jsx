import { useState } from "react";
import { startAuthentication } from "@simplewebauthn/browser";
import { C, API_URL } from "./config.js";
import { Btn, ModalWrap, inputStyle, labelStyle } from "./SharedUI.jsx";
import { useApp } from "./AppContext.jsx";

// ─── JSALeadOverrideModal (v28.07) ──────────────────────────────────────────
// Path C — lead/manager+ overrides JSA acknowledgment for a crew member
// who could not sign through Paths A or B. Captures:
//   - Reason code (dropdown — must be one of OVERRIDE_REASON_CODES)
//   - Reason text (free-form detail)
//   - Lead's WebAuthn assertion (anchors the override forensically)
//   - Perjury attestation displayed verbatim and stored server-side
//
// The override is a real signature record on the JSA (sign_method =
// 'lead_override') so the JSA's "all required signers signed" gate is
// satisfied. Audit trail captures who overrode whom and why.

const REASON_OPTIONS = [
  { code: 'unreachable_offsite',  label: 'Unreachable / off-site' },
  { code: 'incapacitated_or_ill', label: 'Incapacitated or ill' },
  { code: 'unresponsive_present', label: 'Unresponsive (on-site, refusing to participate)' },
  { code: 'departed_site',        label: 'Departed site before JSA acknowledgment' },
  { code: 'phone_lost_or_dead',   label: 'Phone lost or dead — no other path' },
  { code: 'other',                label: 'Other (describe in detail)' },
];

function JSALeadOverrideModal({ jsaId, target, jsaContext, onClose, onOverridden }) {
  const { currentUser } = useApp();
  const [reasonCode, setReasonCode] = useState("");
  const [reasonText, setReasonText] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const leadName = currentUser?.name || 'Crew Lead';
  const targetName = target?.user_name || 'Crew Member';
  const reasonLabel = REASON_OPTIONS.find(r => r.code === reasonCode)?.label || '';

  const attestationDisplay = `I, ${leadName}, serving as crew lead, attest under penalty of perjury that ${targetName} was assigned to this ticket but was unable to acknowledge the Job Safety Analysis through personal biometric or witnessed PIN. The reason for unavailability is: ${reasonCode || '[reason code]'} — ${reasonText || '[reason detail]'}. I understand that submitting this override falsely, or to circumvent legitimate JSA acknowledgment requirements, constitutes fraud, may result in immediate termination, may expose Flo-Test Inc. to OSHA citation, and that I may be referred for criminal prosecution.`;

  const captureGps = () =>
    new Promise(resolve => {
      if (!navigator.geolocation) return resolve({ lat: null, lng: null });
      navigator.geolocation.getCurrentPosition(
        pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve({ lat: null, lng: null }),
        { timeout: 4000, enableHighAccuracy: false }
      );
    });

  const submit = async () => {
    if (!reasonCode) { setError("Pick a reason code"); return; }
    if (!reasonText.trim() || reasonText.trim().length < 8) { setError("Reason detail must be at least 8 characters"); return; }
    if (!acknowledged) { setError("You must acknowledge the attestation"); return; }
    setBusy(true); setError("");
    try {
      // 1. Get auth options for THE LEAD (req.user)
      const optsRes = await fetch(`${API_URL}/jsas/${jsaId}/auth-options-self`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const optsData = await optsRes.json();
      if (!optsRes.ok) {
        setError(optsData?.error || "Could not start ceremony");
        return;
      }

      // 2. Lead's biometric ceremony (fresh user-activation from this click)
      let assertion;
      try {
        assertion = await startAuthentication({ optionsJSON: optsData.authentication_options });
      } catch (browserErr) {
        const name = browserErr?.name || "";
        let msg = browserErr?.message || "Biometric cancelled";
        if (name === "NotAllowedError") msg = "Your biometric did not complete. Tap CONFIRM again to retry.";
        setError(msg);
        return;
      }

      // 3. Submit the override
      const gps = await captureGps();
      const r = await fetch(`${API_URL}/jsas/${jsaId}/lead-override`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_user_id: target.user_id,
          reason_code: reasonCode,
          reason_text: reasonText.trim(),
          lead_webauthn_response: assertion,
          gps_lat: gps.lat,
          gps_lng: gps.lng,
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data?.error || "Override failed");
        return;
      }
      onOverridden();
    } catch {
      setError("Connection error during override");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalWrap title={`Lead Override — ${targetName}`} onClose={onClose} width={560}>
      <div style={{ marginBottom: 14, fontSize: 13, color: C.text, lineHeight: 1.5 }}>
        Use this only when <strong>{targetName}</strong> cannot acknowledge the JSA through
        their own biometric or via a sign-link. Your biometric will anchor the override
        forensically.
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>REASON</label>
        <select
          style={inputStyle}
          value={reasonCode}
          onChange={e => setReasonCode(e.target.value)}
        >
          <option value="">— pick reason —</option>
          {REASON_OPTIONS.map(r => (
            <option key={r.code} value={r.code}>{r.label}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>DETAIL (required, ≥ 8 characters)</label>
        <textarea
          style={{ ...inputStyle, minHeight: 70, resize: "vertical" }}
          value={reasonText}
          onChange={e => setReasonText(e.target.value)}
          placeholder="Describe the specific circumstance — e.g. 'Crew member departed site at 14:30 due to illness, supervisor notified.'"
          maxLength={500}
        />
      </div>

      <div style={{
        background: C.steel, border: `1px solid ${C.border}`, borderRadius: 4,
        padding: 12, marginBottom: 14, fontSize: 11, color: C.text, lineHeight: 1.5,
      }}>
        <strong>Attestation (will be stored verbatim with your signature):</strong>
        <div style={{ marginTop: 8, fontStyle: "italic" }}>{attestationDisplay}</div>
      </div>

      <label style={{
        display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 16,
        fontSize: 12, color: C.text, cursor: "pointer", lineHeight: 1.45,
      }}>
        <input type="checkbox" checked={acknowledged} onChange={e => setAcknowledged(e.target.checked)} style={{ marginTop: 2 }} />
        <span>I acknowledge the attestation above. By tapping CONFIRM, I am submitting this override under penalty of perjury.</span>
      </label>

      {error && (
        <div style={{ color: C.red, fontSize: 12, fontWeight: 700, marginBottom: 12 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <Btn onClick={submit} disabled={busy || !reasonCode || !reasonText.trim() || !acknowledged}>
          {busy ? "WAITING FOR BIOMETRIC..." : "CONFIRM OVERRIDE WITH BIOMETRIC"}
        </Btn>
        <Btn variant="ghost" onClick={onClose}>CANCEL</Btn>
      </div>
    </ModalWrap>
  );
}

export default JSALeadOverrideModal;
