import { C } from "./config.js";
import { TicketTypeBadge, TicketStatusBadge, PANEL_TEXT, PANEL_MUTED, PANEL_FAINT, TINT } from "./SharedUI.jsx";
import { formatDate, formatShortStamp, shortName } from "./utils.js";
import TimePicker from "./TimePicker.jsx";

// ─── TicketHeaderRow (v27.83) ───────────────────────────────────────────────
// Extracted from TicketDetail.jsx. The block below the ticket type bar:
// badges + ticket # + lock pill, dollar total + created-by stamp, customer
// + editable date, and Location Time / Time Zone / Yard row for non-Rental
// tickets. Pure presentation — parent owns all the state.
//
// Mobile stacks vertically; desktop uses horizontal layout where the total
// aligns right. isPageMode tightens padding when the ticket is opened as a
// route page (mobile route) vs an overlay modal.
//
// Props:
//   ticket — id/number/type/createdBy/createdAt
//   status — current status (for badge)
//   total — computed dollar total (formatted by parent)
//   isLocked, isFullyLocked — gate display of LOCKED / QB VERIFIED pills
//   editable — gates editable fields (date, location time, time zone, yard)
//   job — for customer display
//   isPageMode — mobile route mode (smaller padding + smaller total font)
//   ticketDate, onDateChange — controlled date value + change handler
//   dueOnLoc, setDueOnLoc — location time (only rendered for non-Rental)
//   timeZone, setTimeZone — "TX" | "NM" radio pair
//   yardLocationIndex, setYardLocationIndex — yard selector (1-indexed)
//   yardsList — array of yard records from parseYards(settings)

function TicketHeaderRow({
  ticket,
  status,
  total,
  isLocked,
  isFullyLocked,
  editable,
  job,
  isPageMode,
  ticketDate,
  onDateChange,
  dueOnLoc,
  setDueOnLoc,
  timeZone,
  setTimeZone,
  yardLocationIndex,
  setYardLocationIndex,
  yardsList,
}) {
  const lockPillColor = isFullyLocked ? C.green : C.orange;
  const lockPillBg = isFullyLocked ? TINT.greenDeepBg : TINT.yellowBg;
  const lockPillLabel = isFullyLocked ? "QB VERIFIED" : "LOCKED";

  // v28.39 — TicketDetail panel sits on a light pastel tcfg.bg (always
  // light, regardless of theme). v28.44 — PANEL_TEXT / MUTED / FAINT are
  // now exported from SharedUI as the single source of truth; this file
  // imports them. Inputs (date, yard select) keep their own theme since
  // they have their own dark C.cardBg backgrounds.
  return (
    <div style={{ padding: isPageMode ? "14px 16px 12px" : "20px 24px 16px", borderBottom: `1px solid ${C.border}` }}>
      {/* Row 1: type + status badges + ticket # + lock pill */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
        <TicketTypeBadge type={ticket.type} />
        <TicketStatusBadge status={status} />
        <span style={{ fontSize: 13, fontWeight: 700, color: PANEL_TEXT }}>
          #{ticket.jobId}
          {ticket.ticketNumber ? `-${ticket.ticketNumber}` : ""}
        </span>
        {isLocked && (
          <span style={{ fontSize: 10, fontWeight: 700, color: lockPillColor, background: lockPillBg, padding: "2px 8px", borderRadius: 3 }}>
            {lockPillLabel}
          </span>
        )}
      </div>

      {/* Row 2: dollar total + created-by stamp */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontSize: isPageMode ? 18 : 20, fontWeight: 800, color: PANEL_TEXT }}>
          {"$"}
          {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        {ticket.createdBy && (
          <span style={{ fontSize: 9, color: PANEL_FAINT }}>
            {shortName(ticket.createdBy)} · {formatShortStamp(ticket.createdAt)}
          </span>
        )}
      </div>

      {/* Row 3: customer + editable date */}
      <div style={{ fontSize: 12, color: PANEL_MUTED, marginBottom: 6 }}>
        <span>
          {job?.customer || "Unknown"} ·{" "}
          {isLocked ? (
            formatDate(ticketDate)
          ) : (
            <input
              type="date"
              value={ticketDate}
              onChange={(e) => onDateChange(e.target.value)}
              style={{ border: `1px solid ${C.border}`, borderRadius: 4, padding: "2px 6px", fontSize: 12, color: C.text, background: C.cardBg }}
            />
          )}
        </span>
      </div>

      {/* Row 4: Location Time + Time Zone + Yard (non-Rental only) */}
      {ticket.type !== "Rental" && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", fontSize: 12, color: PANEL_MUTED }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em" }}>LOCATION TIME:</span>
            {editable ? (
              <TimePicker value={dueOnLoc} onChange={setDueOnLoc} startHour={6} startPeriod="AM" />
            ) : (
              <span style={{ fontWeight: 600 }}>{dueOnLoc || "—"}</span>
            )}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em" }}>TIME ZONE:</span>
            {editable ? (
              <span style={{ display: "flex", gap: 6 }}>
                {["TX", "NM"].map((tz) => (
                  <span
                    key={tz}
                    onClick={() => setTimeZone(tz)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 3,
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 700,
                      color: timeZone === tz ? C.red : PANEL_MUTED,
                    }}
                  >
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        border: `2px solid ${timeZone === tz ? C.red : C.border}`,
                        background: timeZone === tz ? C.red : "transparent",
                        display: "inline-block",
                      }}
                    />
                    {tz}
                  </span>
                ))}
              </span>
            ) : (
              <span style={{ fontWeight: 600 }}>{timeZone || "—"}</span>
            )}
          </span>
          {yardsList.length > 1 && (
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em" }}>YARD:</span>
              <select
                value={yardLocationIndex}
                onChange={(e) => setYardLocationIndex(parseInt(e.target.value, 10))}
                style={{
                  border: `1px solid ${C.border}`,
                  borderRadius: 4,
                  padding: "2px 6px",
                  fontSize: 12,
                  color: C.text,
                  background: C.cardBg,
                  fontWeight: 600,
                  maxWidth: isPageMode ? 200 : "none",
                }}
              >
                {yardsList.map((y, i) => (
                  <option key={i} value={i + 1}>
                    {y.name || `Yard #${i + 1}`}
                  </option>
                ))}
              </select>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default TicketHeaderRow;
