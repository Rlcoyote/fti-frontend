import { API_URL } from "./config.js";

// ─── resolveMapPin (audit 260721, C1) ────────────────────────────────────────
// The ONE home for "Google-Maps pin URL → coordinates" — this exact fetch was
// copy-pasted across seven files (AddTicketGooglePin, NewJobGooglePin,
// TicketGooglePin, JSALocationPin, EditJobPinResolver, WellPinPaste,
// AddTicketModal inline), each with its own drift on error wording and
// missing-coordinate handling (Entry 7). Callers keep their own state; the
// resolve itself happens here, once.
//
// Returns { ok: true, lat, lng } or { ok: false, error } — never throws.
export async function resolveMapPin(url) {
  const clean = String(url || "").trim();
  if (!clean) return { ok: false, error: "No pin URL provided." };
  try {
    const r = await fetch(`${API_URL}/jobs/resolve-map-pin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: clean }),
    });
    if (!r.ok) return { ok: false, error: "Could not resolve pin link. Check the URL and try again." };
    const { lat, lng } = await r.json();
    if (!lat || !lng) return { ok: false, error: "No coordinates found in this link." };
    return { ok: true, lat, lng };
  } catch {
    return { ok: false, error: "Network error resolving pin. Try again." };
  }
}
