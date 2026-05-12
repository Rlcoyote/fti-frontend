import { API_URL } from "./config.js";

// ─── SMS CONSENT API CLIENT (v28.54) ─────────────────────────────────────────
// Thin wrappers around /api/sms-consents and /api/sms-consent-scripts.
// Backend route shape documented in fti-backend/src/routes/smsConsents.js
// and smsConsentScripts.js.
//
// All calls assume the auth cookie is set (post-login). PIN setup public
// flow uses recordConsentViaToken() instead, which doesn't require auth
// but does require a valid setup token (v28.54 — see PinSetupPage.jsx).

// ─── Check active consent for a phone ────────────────────────────────────────
// Returns { phone, consent } where consent is the active row or null.
export async function checkConsent(phone) {
  if (!phone) return { phone: null, consent: null };
  try {
    const r = await fetch(`${API_URL}/sms-consents/check?phone=${encodeURIComponent(phone)}`, {
      credentials: "include",
    });
    if (!r.ok) return { phone, consent: null, error: `HTTP ${r.status}` };
    return await r.json();
  } catch (err) {
    return { phone, consent: null, error: err.message };
  }
}

// ─── Record a new consent ────────────────────────────────────────────────────
// payload: { phone_number, recipient_type, consent_method, context, device_info?, recorded_for_user_id? }
// Returns { created, consent } on success or { existing } if a row already exists.
export async function recordConsent(payload) {
  const r = await fetch(`${API_URL}/sms-consents`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
  return data;
}

// ─── Revoke an existing consent (owner/admin) ────────────────────────────────
export async function revokeConsent(consentId, reason) {
  const r = await fetch(`${API_URL}/sms-consents/${consentId}/revoke`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
  return data;
}

// ─── Fetch the active scripts ────────────────────────────────────────────────
// Returns { customer_rep: { script_text, ... }, employee: { ... } }
export async function getActiveScripts() {
  const r = await fetch(`${API_URL}/sms-consent-scripts`, { credentials: "include" });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return await r.json();
}

// ─── Update a script (owner/admin) ───────────────────────────────────────────
export async function updateScript(type, scriptText) {
  const r = await fetch(`${API_URL}/sms-consent-scripts/${type}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ script_text: scriptText }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
  return data;
}

// ─── Fetch script edit history (admin audit view) ────────────────────────────
export async function getScriptHistory(type) {
  const r = await fetch(`${API_URL}/sms-consent-scripts/history?type=${encodeURIComponent(type)}`, {
    credentials: "include",
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return await r.json();
}
