import { useEffect, useState } from "react";
import { C } from "./config.js";
import { PANEL_TEXT, PANEL_MUTED } from "./SharedUI.jsx";
import { checkConsent, getActiveScripts } from "./smsConsent.js";

// ─── SMS CONSENT CHECKBOX (v28.54) ───────────────────────────────────────────
//
// Controlled inline widget that sits under a phone-number input on
// New/EditJobModal (customer rep) or EditPersonModal (employee, admin-entered).
//
// Behavior:
//   - When `phone` is empty → muted placeholder ("Enter phone to capture
//     consent"). No UI interaction.
//   - When `phone` is non-empty → fetch /api/sms-consents/check?phone=...
//     - If an active consent row exists → render a non-interactive
//       "✓ SMS consent on file (method, date)" badge.
//     - If none exists → render the checkbox bound to consentIntent +
//       inline script preview (expand-arrow to reveal full text).
//
// Parent owns the consentIntent boolean. SmsConsentCheckbox does NOT POST
// the consent itself — that happens in the parent on form save, after the
// WO/employee save returns success (so we never record consent for a job
// that wasn't actually created). See NewJobModal.handleSave for the
// pattern.
//
// Props:
//   phone           — string, the phone number to check
//   recipientType   — "customer_rep" | "employee"
//   consentIntent   — boolean from parent state
//   setConsentIntent — setter from parent state
//   labelHint       — optional short string above the checkbox; defaults to
//                     a sensible recipient-type-specific label

export default function SmsConsentCheckbox({
  phone, recipientType, consentIntent, setConsentIntent, labelHint,
}) {
  const [checking, setChecking] = useState(false);
  const [existingConsent, setExistingConsent] = useState(null);
  const [script, setScript] = useState("");
  const [showScript, setShowScript] = useState(false);

  // Load active scripts once on mount — used for the inline preview.
  // The actual consent record on POST pins to the active script_id
  // server-side, so the UI script_text doesn't need to be sent.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getActiveScripts();
        if (cancelled) return;
        setScript(data[recipientType]?.script_text || "");
      } catch (err) {
        // Non-fatal — UI shows generic label without the script preview.
        console.warn("SMS consent script load failed:", err);
      }
    })();
    return () => { cancelled = true; };
  }, [recipientType]);

  // Re-check existing consent whenever the phone changes.
  useEffect(() => {
    let cancelled = false;
    if (!phone || !String(phone).trim()) {
      setExistingConsent(null);
      return;
    }
    setChecking(true);
    (async () => {
      const res = await checkConsent(phone);
      if (cancelled) return;
      setExistingConsent(res.consent || null);
      setChecking(false);
    })();
    return () => { cancelled = true; };
  }, [phone]);

  // Empty-phone state: muted placeholder.
  if (!phone || !String(phone).trim()) {
    return (
      <div style={{ fontSize: 11, color: C.muted, marginTop: 4, marginBottom: 4, fontStyle: "italic" }}>
        Enter phone to capture SMS consent
      </div>
    );
  }

  // Checking state: spinner-equivalent.
  if (checking) {
    return (
      <div style={{ fontSize: 11, color: C.muted, marginTop: 4, marginBottom: 4 }}>
        Checking consent status…
      </div>
    );
  }

  // Active consent on file: non-interactive badge.
  if (existingConsent && !existingConsent.revoked_at) {
    const when = existingConsent.consent_given_at
      ? new Date(existingConsent.consent_given_at).toLocaleDateString()
      : null;
    const methodLabel = {
      verbal: "verbal",
      biometric_inapp: "in-app",
      retroactive_assumed: "retroactive",
    }[existingConsent.consent_method] || existingConsent.consent_method;
    return (
      <div style={{
        marginTop: 4, marginBottom: 4, padding: "6px 10px",
        background: "#e6f5ec", border: `1px solid ${C.green}44`, borderRadius: 4,
        fontSize: 11, color: PANEL_TEXT, fontWeight: 600,
        display: "inline-flex", alignItems: "center", gap: 6,
      }}>
        <span style={{ color: C.green, fontWeight: 800 }}>✓ SMS consent on file</span>
        <span style={{ color: PANEL_MUTED, fontWeight: 500 }}>
          {when && `· ${when}`} · {methodLabel}
        </span>
      </div>
    );
  }

  // No consent on file → capture UI. Checkbox + script preview.
  const defaultHint = recipientType === "customer_rep"
    ? "Verbal consent given — sales rep asked the customer rep:"
    : "Employee consented via in-app confirmation:";
  const hint = labelHint || defaultHint;

  return (
    <div style={{ marginTop: 4, marginBottom: 4 }}>
      <label style={{
        display: "flex", alignItems: "flex-start", gap: 8,
        fontSize: 12, color: C.text, cursor: "pointer",
        padding: "6px 8px", border: `1px solid ${C.border}`, borderRadius: 4,
        background: C.steel,
      }}>
        <input
          type="checkbox"
          checked={!!consentIntent}
          onChange={e => setConsentIntent(e.target.checked)}
          style={{ width: 16, height: 16, marginTop: 1, cursor: "pointer", flexShrink: 0 }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: C.text }}>
            {hint}
          </div>
          {script && (
            <div style={{ marginTop: 4 }}>
              <div
                onClick={(e) => { e.preventDefault(); setShowScript(s => !s); }}
                style={{
                  fontSize: 10, color: C.blue, fontWeight: 600,
                  letterSpacing: "0.04em", cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                {showScript ? "▾ Hide script" : "▸ Show script"}
              </div>
              {showScript && (
                <div style={{
                  marginTop: 6, padding: "8px 10px",
                  background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 3,
                  fontSize: 11, color: C.muted, fontStyle: "italic", lineHeight: 1.5,
                  whiteSpace: "pre-wrap",
                }}>
                  {script}
                </div>
              )}
            </div>
          )}
        </div>
      </label>
    </div>
  );
}
