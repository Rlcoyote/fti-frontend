import { C } from "./config.js";
import { TINT } from "./SharedUI.jsx";
import { typeCaps } from "./ticketFamilies.js";

// ─── TicketJsaBar (v27.82) ──────────────────────────────────────────────────
// Extracted from TicketDetail.jsx. Top-of-ticket bar that surfaces the JSA
// entry point. Two visual variants depending on the ticket type:
//
//   - Non-Rental types — JSA is REQUIRED before signing. Red-bordered
//     "CREATE JSA" button with "Required before signing" hint when none
//     exists; green "✓ VIEW / EDIT JSA" button when one does.
//
//   - Rental type — JSA is OPTIONAL. Blue-bordered "CREATE JSA" with
//     "Optional for rentals" hint; same green "✓ VIEW / EDIT JSA" when
//     one exists.
//
// Renders nothing until jsaLoaded is true (prevents flash-of-wrong-button
// during the initial JSA fetch).
//
// Props:
//   ticket — for type check (Rental vs non-Rental styling)
//   jsaLoaded — true when the parent's JSA-for-this-ticket lookup completed
//   existingJSA — the JSA record if one exists for this ticket, else null
//   onOpen — fires setShowJSA(true) on the parent to open the JSA modal

function TicketJsaBar({ ticket, jsaLoaded, existingJSA, onOpen }) {
  if (!jsaLoaded) return null;
  const jsaOptional = typeCaps(ticket.type).jsaOptional; // v28.262 — one home for the rule

  if (existingJSA) {
    return (
      <div style={{ padding: "8px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10 }}>
        <button
          type="button"
          onClick={onOpen}
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
          ✓ VIEW / EDIT JSA
        </button>
      </div>
    );
  }

  // No existing JSA — show CREATE variant (different urgency by ticket type)
  const accentColor = jsaOptional ? C.blue : C.red;
  const hintColor = jsaOptional ? C.muted : C.red;
  const hintStyle = { fontSize: 10, color: hintColor, fontWeight: 600, fontStyle: "italic" };
  const hint = jsaOptional ? "Optional for rentals" : "Required before signing";
  const hoverBg = jsaOptional ? TINT.blueBg : TINT.redBg;
  const borderWidth = jsaOptional ? "1px" : "2px";

  return (
    <div style={{ padding: "8px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          type="button"
          onClick={onOpen}
          style={{
            background: "#fff",
            color: accentColor,
            border: `${borderWidth} solid ${accentColor}`,
            borderRadius: 4,
            padding: "5px 14px",
            fontSize: 11,
            fontWeight: 800,
            cursor: "pointer",
            letterSpacing: "0.04em",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = hoverBg;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#fff";
          }}
        >
          CREATE JSA
        </button>
        <span style={hintStyle}>{hint}</span>
      </div>
    </div>
  );
}

export default TicketJsaBar;
