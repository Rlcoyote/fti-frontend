import { C } from "./config.js";
import { TINT } from "./SharedUI.jsx";
import { useNavigate } from "react-router-dom";

// ─── TicketDvirBar (v28.190) ─────────────────────────────────────────────────
// Sits below TicketJsaBar at the top of the ticket page. Same visual grammar:
//   - Green "✓ DVIR DONE" pill when the ticket's vehicle has a passing
//     pre-trip on this ticket's date AND no active red-tag
//   - Red "PERFORM DVIR" button when DVIR is missing / failed / red-tag active
//   - Yellow informational pill when the ticket has no vehicle assigned yet
//
// Tap the red button → navigate to /inspection/new?vehicleId=X with the
// ticket's primary vehicle pre-filled. After the driver submits, they can
// navigate back to the ticket and the parent's useTicketDvir refresh() will
// be called to flip the bar from red to green.

function TicketDvirBar({ ticket, dvirState }) {
  const navigate = useNavigate();
  const { loaded, ok, reason, dvir, activeRedTag } = dvirState;

  if (!loaded) return null;

  // No vehicle yet — informational, not blocking. (The sign-time gate handles
  // refusal; this bar just nudges the user to assign a vehicle.)
  if (reason === "no_vehicle") {
    return (
      <div style={{ padding: "8px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{
            background: TINT.yellowBg,
            color: TINT.yellowText,
            border: `1px solid ${TINT.yellowText}44`,
            borderRadius: 4,
            padding: "5px 14px",
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.04em",
          }}
        >
          DVIR — pick a vehicle on this ticket first
        </span>
      </div>
    );
  }

  const vehicleId = ticket?.gpsVehicleId || ticket?.gps_vehicle_id || "";
  const ticketDate = (ticket?.date || "").slice(0, 10);
  const queryDate = ticketDate ? `&date=${encodeURIComponent(ticketDate)}` : "";
  // v28.209 — pass the ticket so the pre-trip can auto-clock the driver into it.
  const queryTicket = ticket?.id ? `&ticketId=${encodeURIComponent(ticket.id)}` : "";
  const launchInspection = () => navigate(`/inspection/new?vehicleId=${encodeURIComponent(vehicleId)}${queryDate}${queryTicket}`);

  if (ok) {
    // Green — DVIR done for today.
    return (
      <div style={{ padding: "8px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10 }}>
        <button
          className="fti-btn"
          type="button"
          onClick={launchInspection}
          title={`Pre-trip signed ${dvir?.signed_at ? new Date(dvir.signed_at).toLocaleString() : "today"}`}
          style={{
            background: TINT.greenBg,
            color: C.green,
            border: `1px solid ${C.green}44`,
            borderRadius: 4,
            padding: "5px 14px",
            fontSize: 11,
            fontWeight: 800,
            cursor: "pointer",
            letterSpacing: "0.04em",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = TINT.greenDeepBg;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = TINT.greenBg;
          }}
        >
          ✓ DVIR DONE
        </button>
      </div>
    );
  }

  // Red — DVIR missing, failed, or vehicle red-tagged.
  let label = "PERFORM DVIR";
  let hint = "Required before signing";
  if (reason === "red_tagged") {
    label = "VEHICLE RED-TAGGED";
    hint = `Out of service — ${activeRedTag?.reason || "see red-tag record"}`;
  } else if (reason === "failed_dvir") {
    label = "DVIR FAILED — RETRY";
    hint = "Today's pre-trip recorded defects. Re-inspect after repair.";
  } else if (reason === "no_dvir") {
    label = "PERFORM DVIR";
    hint = "No pre-trip on file for today's date";
  }

  return (
    <div style={{ padding: "8px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          className="fti-btn"
          type="button"
          onClick={launchInspection}
          style={{
            background: C.white,
            color: C.red,
            border: `2px solid ${C.red}`,
            borderRadius: 4,
            padding: "5px 14px",
            fontSize: 11,
            fontWeight: 800,
            cursor: "pointer",
            letterSpacing: "0.04em",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = TINT.redBg;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = C.white;
          }}
        >
          {label}
        </button>
        <span style={{ fontSize: 10, color: C.red, fontWeight: 600, fontStyle: "italic" }}>{hint}</span>
      </div>
    </div>
  );
}

export default TicketDvirBar;
