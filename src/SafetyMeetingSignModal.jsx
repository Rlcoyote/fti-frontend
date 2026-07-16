import { useState } from "react";
import { startAuthentication } from "@simplewebauthn/browser";
import { C, F, SP, R } from "./config.js";
import { api } from "./api.js";
import { Btn, ModalWrap } from "./SharedUI.jsx";
import { fmtMeetingDate } from "./SafetyMeetingShared.jsx";

// ─── SafetyMeetingSignModal (v28.335) ────────────────────────────────────────
// Biometric self sign-in — the JSA ceremony (JSASignSubmitModal) adapted to
// the safety meeting. Two-step by design (v28.01 iOS user-activation rule):
// startAuthentication() fires inside the CONFIRM tap, never auto-fired after
// an awaited fetch outside an activation.
//
// The attestation is ATTENDANCE ONLY (JSA doctrine, spec §2.2): no perjury
// stack, no content acknowledgment — the signature says "I was there."
// The backend stores its own copy of this language verbatim on the row.

function SafetyMeetingSignModal({ meeting, onClose, onSigned }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const attestation = `I attest by my own biometric signature that I attended the safety meeting held on ${fmtMeetingDate(meeting.meeting_date)}.`;

  const fireSign = async () => {
    setBusy(true);
    setError("");
    try {
      // 1. Challenge from the server (self-scoped — nobody signs anyone else in).
      let opts;
      try {
        opts = await api.post(`/safety-meetings/${meeting.id}/sign-options`, {});
      } catch (e) {
        setError(e.message || "Could not start the sign-in ceremony");
        return;
      }

      // 2. Browser WebAuthn — runs inside this button-click activation.
      let assertion;
      try {
        assertion = await startAuthentication({ optionsJSON: opts.authentication_options });
      } catch (browserErr) {
        let msg = browserErr?.message || "Biometric sign-in cancelled";
        if (browserErr?.name === "NotAllowedError") msg = "Biometric did not complete. Try again, or ask a manager to sign you in with a reason.";
        setError(msg);
        return;
      }

      // 3. Submit the attestation row.
      try {
        await api.post(`/safety-meetings/${meeting.id}/sign`, { webauthn_response: assertion });
      } catch (e) {
        setError(e.message || "Sign-in verification failed");
        return;
      }
      onSigned();
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalWrap title="Sign In to the Safety Meeting" onClose={onClose} width={480}>
      <div style={{ marginBottom: SP.xl, fontSize: F.body, color: C.text, lineHeight: 1.5 }}>
        Safety meeting of <strong>{fmtMeetingDate(meeting.meeting_date)}</strong>, conducted by <strong>{meeting.conducted_by_name}</strong>.
      </div>
      <div
        style={{
          background: C.steel,
          border: `1px solid ${C.border}`,
          borderRadius: R.md,
          padding: SP.xl,
          marginBottom: SP.xxl,
          fontSize: F.meta,
          color: C.text,
          lineHeight: 1.55,
        }}
      >
        {attestation}
      </div>
      {error && <div style={{ color: C.red, fontSize: F.meta, fontWeight: 700, marginBottom: SP.xl }}>{error}</div>}
      <div style={{ display: "flex", gap: SP.md }}>
        <Btn onClick={fireSign} disabled={busy}>
          {busy ? "WAITING FOR BIOMETRIC..." : "CONFIRM WITH BIOMETRIC"}
        </Btn>
        <Btn variant="ghost" onClick={onClose}>
          CANCEL
        </Btn>
      </div>
    </ModalWrap>
  );
}

export default SafetyMeetingSignModal;
