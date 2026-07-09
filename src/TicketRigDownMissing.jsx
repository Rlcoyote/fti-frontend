import { C } from "./config.js";
import { TINT } from "./SharedUI.jsx";

// ─── TicketRigDownMissing (v27.86) ──────────────────────────────────────────
// Extracted from TicketDetail.jsx. Rig-Down-only prompt asking whether any
// pieces are missing vs the paired Rig Up ticket. When editable, renders a
// YES/NO toggle; when locked, renders a static YES/NO readout.
//
// Parent owns the missingPieces state (save payload includes it).
//
// Renders nothing if the ticket type is not "Rig Down".
//
// Props:
//   ticketType — only renders when "Rig Down"
//   isLocked — edit lock flag
//   missingPieces — null | true | false
//   setMissingPieces — setter

function TicketRigDownMissing({ ticketType, isLocked, missingPieces, setMissingPieces }) {
  if (ticketType !== "Rig Down") return null;
  return (
    <div style={{ background: TINT.yellowBg, border: `1px solid ${TINT.yellowBorder}`, borderRadius: 6, padding: 12, marginBottom: 16 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: C.yellow }}>Check quantities against R/U — any pieces missing? </span>
      {!isLocked ? (
        <>
          <span
            onClick={() => setMissingPieces(false)}
            style={{ cursor: "pointer", fontWeight: 700, color: missingPieces === false ? C.green : C.muted, marginLeft: 8 }}
          >
            NO
          </span>
          <span style={{ color: C.muted, margin: "0 6px" }}>|</span>
          <span onClick={() => setMissingPieces(true)} style={{ cursor: "pointer", fontWeight: 700, color: missingPieces === true ? C.red : C.muted }}>
            YES
          </span>
        </>
      ) : (
        <span style={{ fontWeight: 700, color: missingPieces ? C.red : C.green, marginLeft: 8 }}>{missingPieces ? "YES" : "NO"}</span>
      )}
    </div>
  );
}

export default TicketRigDownMissing;
