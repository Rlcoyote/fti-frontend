import { C } from "./config.js";
import { TINT } from "./SharedUI.jsx";
import { formatDate } from "./utils.js";

// ─── RentalCountdown (v27.79 — moved from TicketDetail.jsx) ─────────────────
// Displays a colored pill with "N days left" / "Last day" / "1 day left"
// based on the rental's endDate. Renders nothing if the ticket isn't a
// Rental, has no endDate, is past-due, is voided, or has cycleEnded set.
//
// Used by this module's RentalCycle component AND by JobTicketsTab rows
// (hence the named export).
export function RentalCountdown({ ticket }) {
  const endDate = ticket.endDate || ticket.end_date;
  if (!endDate || endDate === "" || ticket.type !== "Rental") return null;
  if (ticket.cycleEnded || ticket.cycle_ended || ticket.voidedAt || ticket.voided_at) return null;
  const end = new Date(endDate + "T23:59:59");
  if (isNaN(end.getTime())) return null;
  const now = new Date();
  const diffMs = end - now;
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (daysLeft < 0 || isNaN(daysLeft)) return null;
  const color = daysLeft <= 1 ? TINT.redText : daysLeft <= 7 ? TINT.yellowText : TINT.greenText;
  const bg = daysLeft <= 1 ? TINT.redBg : daysLeft <= 7 ? TINT.yellowBg : TINT.greenBg;
  const border = daysLeft <= 1 ? TINT.redText + "44" : daysLeft <= 7 ? TINT.yellowBorder + "44" : TINT.greenText + "44";
  const label = daysLeft === 0 ? "Last day" : daysLeft === 1 ? "1 day left" : `${daysLeft} days left`;
  return (
    <span
      style={{
        background: bg,
        color,
        borderRadius: 4,
        padding: "2px 8px",
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: "0.04em",
        border: `1px solid ${border}`,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

// ─── TicketRentalCycle (v27.79) ─────────────────────────────────────────────
// Extracted from TicketDetail.jsx. Rental-only band showing start/end/cycle
// days + recurring toggle, with RentalCountdown pill inline. Renders nothing
// if the ticket isn't a Rental OR if it has no start date yet.
//
// Read-only mode when the ticket is fully-locked (sentToQB/qbVerified) OR
// voided — matches the TicketDetail edit-lock rules.
//
// Props:
//   ticket — parent ticket (for type check, voided flag, cycleEnded, passing
//            through to RentalCountdown)
//   readOnly — true when fully-locked / voided; renders pill display
//   values — { startDate, endDate, cycleDays, recurring }
//   onChange(partial) — partial updates for editable fields

function TicketRentalCycle({ ticket, readOnly, values, onChange }) {
  const { startDate = "", endDate = "", cycleDays = 28, recurring = false } = values || {};
  // Hide the entire band until the rental has a start date (fresh rentals
  // get populated via the rental-template auto-fill flow elsewhere).
  // v28.261 — RU/RD get a lean RENTAL WINDOW band (From/To only — no cycle,
  // no recurring; those are Rental-cycle machinery). Shown whenever editable
  // so the window can be ADDED to a ticket that doesn't have one yet.
  if (ticket.type === "Rig Up" || ticket.type === "Rig Down") {
    if (readOnly && !startDate) return null;
    const winStyle = { border: `1px solid ${C.border}`, borderRadius: 4, padding: "2px 6px", fontSize: 12, color: C.text, background: C.cardBg };
    return (
      <div style={{ background: TINT.cream, borderBottom: `1px solid ${C.border}`, padding: "10px 24px" }}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center", fontSize: 12, color: C.text }}>
          <span style={{ fontWeight: 800, letterSpacing: "0.06em", color: C.muted }}>RENTAL WINDOW</span>
          {readOnly ? (
            <>
              <span>
                <span style={{ color: C.muted }}>From: </span>
                <strong>{formatDate(startDate)}</strong>
              </span>
              <span>
                <span style={{ color: C.muted }}>To: </span>
                <strong>{formatDate(endDate)}</strong>
              </span>
            </>
          ) : (
            <>
              <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: C.muted }}>From</span>
                <input type="date" style={winStyle} value={startDate || ""} onChange={(e) => onChange({ startDate: e.target.value })} />
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: C.muted }}>To</span>
                <input type="date" style={winStyle} value={endDate || ""} onChange={(e) => onChange({ endDate: e.target.value })} />
              </label>
            </>
          )}
        </div>
      </div>
    );
  }
  if (ticket.type !== "Rental" || !(startDate || ticket.startDate || ticket.start_date)) return null;

  const ctx = { ...ticket, endDate, isRecurring: recurring };

  if (readOnly) {
    return (
      <div style={{ background: TINT.cream, borderBottom: `1px solid ${C.border}`, padding: "10px 24px" }}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center", fontSize: 12, color: C.text }}>
          <span>
            <span style={{ color: C.muted }}>Start: </span>
            <strong>{formatDate(startDate)}</strong>
          </span>
          <span>
            <span style={{ color: C.muted }}>End: </span>
            <strong>{formatDate(endDate)}</strong>
          </span>
          <span>
            <span style={{ color: C.muted }}>Cycle: </span>
            <strong>{cycleDays} days</strong>
          </span>
          <span style={{ color: recurring ? C.green : C.muted, fontWeight: 700 }}>{recurring ? "● Recurring" : "○ Not recurring"}</span>
          {(ticket.cycleEnded || ticket.cycle_ended) && (
            <span
              style={{
                background: TINT.yellowBg,
                color: TINT.yellowText,
                borderRadius: 4,
                padding: "2px 8px",
                fontSize: 10,
                fontWeight: 800,
                border: `1px solid ${TINT.yellowBorder}44`,
              }}
            >
              CYCLE ENDED
            </span>
          )}
          <RentalCountdown ticket={ctx} />
        </div>
      </div>
    );
  }

  const inputStyle = { border: `1px solid ${C.border}`, borderRadius: 4, padding: "2px 6px", fontSize: 12, color: C.text, background: C.cardBg };
  const lblStyle = { color: C.muted, fontWeight: 600, fontSize: 10, letterSpacing: "0.06em" };

  return (
    <div style={{ background: TINT.cream, borderBottom: `1px solid ${C.border}`, padding: "10px 24px" }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", fontSize: 12, color: C.text }}>
        <div>
          <span style={lblStyle}>START </span>
          <input type="date" value={startDate} onChange={(e) => onChange({ startDate: e.target.value })} style={inputStyle} />
        </div>
        <div>
          <span style={lblStyle}>END </span>
          <input type="date" value={endDate} onChange={(e) => onChange({ endDate: e.target.value })} style={inputStyle} />
        </div>
        <div>
          <span style={lblStyle}>CYCLE </span>
          <input type="number" value={cycleDays} onChange={(e) => onChange({ cycleDays: e.target.value })} min={1} style={{ ...inputStyle, width: 50 }} />
          <span style={{ fontSize: 11, color: C.muted }}> days</span>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
          <input type="checkbox" checked={recurring} onChange={(e) => onChange({ recurring: e.target.checked })} style={{ width: 14, height: 14 }} />
          <span style={{ color: recurring ? C.green : C.muted }}>{recurring ? "● Recurring" : "○ Not recurring"}</span>
        </label>
        <RentalCountdown ticket={ctx} />
      </div>
    </div>
  );
}

export default TicketRentalCycle;
