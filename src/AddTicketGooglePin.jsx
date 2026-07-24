import { C, API_URL } from "./config.js";
import { resolveMapPin } from "./mapPin.js";
import { inputStyle, TINT } from "./SharedUI.jsx";

// ─── AddTicketGooglePin (v28.68 — extracted from AddTicketModal) ──────────────
// Google Pin input + resolver + lat/lng display. Lets the lead paste a
// Google Maps share link, hit RESOLVE, and see the resolved coordinates
// (with a link out to the resolved location on Google Maps).
//
// "ALT PIN" badge fires when the ticket-level pin differs from the job-
// level pin — visual cue that the lead intentionally overrode the parent
// WO's pin for this specific ticket.
//
// Per CAM XXV: receives ticketPin + setters + resolved lat/lng + the
// jobGooglePin for mismatch detection. The fetch to /work-orders/resolve-map-pin
// stays here because no other site uses it.

export default function AddTicketGooglePin({
  jobGooglePin,
  pinMismatch,
  ticketPin,
  setTicketPin,
  ticketPinLat,
  ticketPinLng,
  setTicketPinLat,
  setTicketPinLng,
  ticketPinResolving,
  setTicketPinResolving,
  ticketPinError,
  setTicketPinError,
}) {
  const onResolve = async () => {
    if (!ticketPin.trim()) return;
    setTicketPinResolving(true);
    setTicketPinError("");
    const res = await resolveMapPin(ticketPin);
    if (res.ok) {
      setTicketPinLat(res.lat);
      setTicketPinLng(res.lng);
    } else {
      setTicketPinError(res.error);
    }
    setTicketPinResolving(false);
  };

  return (
    <div style={{ background: C.steel, border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 14px", marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, letterSpacing: "0.08em" }}>GOOGLE PIN</div>
        {pinMismatch && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: TINT.yellowText,
              background: TINT.yellowBg,
              border: `1px solid ${TINT.yellowBorder}44`,
              borderRadius: 3,
              padding: "2px 8px",
              letterSpacing: "0.04em",
            }}
          >
            ALT PIN — differs from Work Order
          </span>
        )}
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input
          style={{ ...inputStyle, flex: 1, fontFamily: "monospace", fontSize: 11, padding: "6px 8px" }}
          placeholder={jobGooglePin ? "Override Work Order pin or leave blank to use Work Order pin" : "Paste Google Maps link..."}
          value={ticketPin}
          onChange={(e) => {
            setTicketPin(e.target.value);
            setTicketPinLat(null);
            setTicketPinLng(null);
            setTicketPinError("");
          }}
        />
        {ticketPin && (
          <button
            className="fti-btn"
            type="button"
            onClick={onResolve}
            disabled={ticketPinResolving}
            style={{
              background: C.blue,
              color: C.white,
              border: "none",
              borderRadius: 4,
              padding: "6px 12px",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {ticketPinResolving ? "..." : "RESOLVE"}
          </button>
        )}
      </div>
      {ticketPinError && <div style={{ fontSize: 11, color: C.red, marginTop: 4, fontWeight: 700 }}>⚠ {ticketPinError}</div>}
      {/* v28.224 — pin entered but not yet resolved to coordinates. Drive time
          and the clock-in window depend on the coords; saving will auto-resolve,
          but flag it here so it's never silent. */}
      {ticketPin.trim() && (!ticketPinLat || !ticketPinLng) && !ticketPinResolving && !ticketPinError && (
        <div style={{ fontSize: 11, color: TINT.yellowText, marginTop: 4, fontWeight: 700 }}>
          ⚠ Pin not resolved to coordinates — tap RESOLVE (needed for drive time &amp; clock-in). Saving will try automatically.
        </div>
      )}
      {ticketPinLat && ticketPinLng && (
        <div
          style={{
            fontSize: 11,
            color: C.green,
            fontWeight: 700,
            fontFamily: "monospace",
            marginTop: 4,
            display: "flex",
            gap: 12,
            alignItems: "center",
          }}
        >
          <span>
            ✓ {parseFloat(ticketPinLat).toFixed(6)}, {parseFloat(ticketPinLng).toFixed(6)}
          </span>
          <a
            href={`https://www.google.com/maps?q=${ticketPinLat},${ticketPinLng}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 10, color: C.blue, fontWeight: 600, textDecoration: "none", fontFamily: "'Arial', sans-serif" }}
          >
            View on Google Maps ↗
          </a>
        </div>
      )}
    </div>
  );
}
