import { useEffect, useState } from "react";
import { C } from "./config.js";
import { PANEL_TEXT, PANEL_MUTED } from "./SharedUI.jsx";
import { checkConsent } from "./smsConsent.js";

// ─── SMS CONSENT STATUS DISPLAY (v28.197) ────────────────────────────────────
//
// Was: a verbal/in-app "I got consent" checkbox.
// Is now: a truthful status pill — the moment FTI moved to Telnyx + double
// opt-in (v28.192–v28.196), verbal/biometric/retroactive consent rows stopped
// authorizing sends. The single authority is now an active confirmed_sms
// consent row (services/smsOptIn.isSendEligible). So this UI no longer captures
// consent — the backend startOptIn trigger does that on job save / PIN setup,
// and the recipient confirms by replying YES to the confirmation text.
//
// This component just reflects reality from /api/sms-consents/check:
//   confirmed_sms (active)       → ✓ green "SMS confirmed"
//   other method (active)         → ⚠ yellow "Will reconfirm by SMS on save"
//   no row                        → gray  "Confirmation text will send on save"
//   revoked (STOP)                → ✗ red  "Opted out (STOP)"
//
// Filename + props are preserved so existing call sites
// (NewJobContactsPanel, EditJobContactGrid, PinSetupPage) don't need to change.
// `consentIntent` / `setConsentIntent` / `labelHint` props are now accepted but
// ignored — they kept their slots so v28.197 ships as a focused FE-only change
// without touching parent state plumbing. A follow-up can rename + clean up.

// Pill — single shape, four variants (color / icon / label) driven by state.
// Defined at module scope so each render of SmsConsentCheckbox doesn't create
// a new component identity (which causes unnecessary remounts / warnings).
function Pill({ bg, border, iconColor, icon, label, detail }) {
  return (
    <div
      style={{
        marginTop: 4,
        marginBottom: 4,
        padding: "6px 10px",
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 4,
        fontSize: 11,
        color: PANEL_TEXT,
        fontWeight: 600,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      <span style={{ color: iconColor, fontWeight: 800 }}>
        {icon} {label}
      </span>
      {detail && <span style={{ color: PANEL_MUTED, fontWeight: 500 }}>· {detail}</span>}
    </div>
  );
}

export default function SmsConsentCheckbox({ phone, recipientType: _recipientType, consentIntent: _ci, setConsentIntent: _sci, labelHint: _lh }) {
  const [checking, setChecking] = useState(false);
  const [consent, setConsent] = useState(null);

  // Re-check whenever the phone changes.
  useEffect(() => {
    let cancelled = false;
    if (!phone || !String(phone).trim()) {
      setConsent(null);
      return;
    }
    setChecking(true);
    (async () => {
      const res = await checkConsent(phone);
      if (cancelled) return;
      setConsent(res.consent || null);
      setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [phone]);

  // Empty phone: muted placeholder.
  if (!phone || !String(phone).trim()) {
    return <div style={{ fontSize: 11, color: C.muted, marginTop: 4, marginBottom: 4, fontStyle: "italic" }}>Enter phone to check SMS consent status</div>;
  }

  if (checking) {
    return <div style={{ fontSize: 11, color: C.muted, marginTop: 4, marginBottom: 4 }}>Checking consent status…</div>;
  }

  // Revoked (STOP) — wins regardless of method.
  if (consent && consent.revoked_at) {
    return <Pill bg={C.redB} border={`${C.red}55`} iconColor={C.red} icon="✗" label="Opted out (STOP)" detail="will not receive SMS" />;
  }

  // Confirmed via double opt-in (the only state that authorizes sends).
  if (consent && consent.consent_method === "confirmed_sms") {
    const when = consent.consent_given_at ? new Date(consent.consent_given_at).toLocaleDateString() : null;
    return <Pill bg={C.greenB} border={`${C.green}44`} iconColor={C.green} icon="✓" label="SMS confirmed" detail={when ? `${when}` : null} />;
  }

  // Legacy consent on file (verbal / biometric_inapp / retroactive_assumed) —
  // does NOT authorize sends post-v28.193. Next save fires startOptIn, which
  // texts a confirmation; recipient replies YES to activate.
  if (consent && !consent.revoked_at) {
    return <Pill bg={C.yellowB} border={`${C.yellow}55`} iconColor={C.yellow} icon="⟳" label="Will reconfirm by SMS" detail="legacy consent on file" />;
  }

  // No consent row at all.
  return <Pill bg={C.steel} border={C.border} iconColor={C.muted} icon="○" label="No consent yet" detail="confirmation text sends on save" />;
}
