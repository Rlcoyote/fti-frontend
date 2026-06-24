import { api } from "./api.js";

// ─── SMS CONSENT API CLIENT (v28.54) ─────────────────────────────────────────
// Thin wrappers around /api/sms-consents and /api/sms-consent-scripts.
// Backend route shape documented in fti-backend/src/routes/smsConsents.js
// and smsConsentScripts.js.
//
// v28.245 — migrated to the shared api client. The hand-written
// `if (!r.ok) throw new Error(data.error || 'HTTP x')` in every function IS
// what api.request does now (throws ApiError, message = the server's error),
// so these collapse to one line each and the throw-with-message contract every
// caller relies on is unchanged. credentials:"include" is passed through.
//
// All calls assume the auth cookie is set (post-login). PIN setup public
// flow uses recordConsentViaToken() instead, which doesn't require auth
// but does require a valid setup token (v28.54 — see PinSetupPage.jsx).

// Check active consent for a phone. Returns { phone, consent } — consent is the
// active row or null. Non-throwing: a failure comes back as an error field so
// the caller can degrade gracefully rather than break.
export async function checkConsent(phone) {
  if (!phone) return { phone: null, consent: null };
  try {
    return await api.get(`/sms-consents/check?phone=${encodeURIComponent(phone)}`, { credentials: "include" });
  } catch (err) {
    return { phone, consent: null, error: err.message };
  }
}

// Record a new consent. payload: { phone_number, recipient_type, consent_method,
// context, device_info?, recorded_for_user_id? }. Returns { created, consent }
// or { existing } if a row already exists.
export function recordConsent(payload) {
  return api.post("/sms-consents", payload, { credentials: "include" });
}

// Revoke an existing consent (owner/admin).
export function revokeConsent(consentId, reason) {
  return api.post(`/sms-consents/${consentId}/revoke`, { reason }, { credentials: "include" });
}

// Fetch the active scripts. Returns { customer_rep: { script_text, ... }, employee: { ... } }.
export function getActiveScripts() {
  return api.get("/sms-consent-scripts", { credentials: "include" });
}

// Update a script (owner/admin).
export function updateScript(type, scriptText) {
  return api.put(`/sms-consent-scripts/${type}`, { script_text: scriptText }, { credentials: "include" });
}

// Fetch script edit history (admin audit view).
export function getScriptHistory(type) {
  return api.get(`/sms-consent-scripts/history?type=${encodeURIComponent(type)}`, { credentials: "include" });
}
