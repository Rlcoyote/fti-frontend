import { C } from "./config.js";
import { typeCaps, isLogType } from "./ticketFamilies.js";
import { inputStyle, labelStyle, PANEL_TEXT } from "./SharedUI.jsx";
import TimePicker from "./TimePicker.jsx";

// ─── AddTicketDateTimeFields (v28.66 — extracted from AddTicketModal) ─────────
// Two-mode date/time/yard fieldset. Branches on ticket type:
//   - Rental: START DATE / CYCLE DAYS / END DATE (readonly, computed) +
//     "Recurring" checkbox
//   - All others: DATE / LOCATION TIME / TIME ZONE (TX/NM radio) +
//     optional YARD selector (only when more than one yard configured)
//
// Per CAM XXV: controlled. The full state surface for both branches is
// passed as props. Yards list comes from parent (useMemo'd parseYards
// result there).

export default function AddTicketDateTimeFields({
  type,
  // Rental branch
  startDate,
  setStartDate,
  cycleDays,
  setCycleDays,
  endDate,
  isRecurring,
  setIsRecurring,
  // Non-rental branch
  date,
  setDate,
  dueOnLoc,
  setDueOnLoc,
  timeZone,
  setTimeZone,
  yardsList,
  yardLocationIndex,
  setYardLocationIndex,
  // v28.261 — optional rental window for the non-Rental visit types (the paper
  // RU/RD forms carry "Rental Date From / To" on their charges block). When
  // both are set the parent auto-fills every line item's DAYS (Option 2);
  // per-line hand edits still override.
  windowFrom,
  setWindowFrom,
  windowTo,
  setWindowTo,
  showWindow,
}) {
  if (typeCaps(type).cycle) {
    return (
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
          <div>
            <label style={labelStyle}>START DATE</label>
            <input type="date" style={{ ...inputStyle, width: 160 }} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>CYCLE (DAYS)</label>
            <input type="number" style={{ ...inputStyle, width: 80 }} value={cycleDays} onChange={(e) => setCycleDays(e.target.value)} min={1} />
          </div>
          <div>
            <label style={labelStyle}>END DATE</label>
            <input type="date" style={{ ...inputStyle, width: 160, background: "#f0f3f8", color: PANEL_TEXT }} value={endDate} readOnly />
          </div>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: PANEL_TEXT, cursor: "pointer" }}>
          <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} style={{ width: 16, height: 16 }} />
          Recurring (auto-create next cycle ticket)
        </label>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 14 }}>
      {isLogType(type) && (
        <div style={{ fontSize: 11.5, fontWeight: 600, color: PANEL_TEXT, opacity: 0.75, marginBottom: 6 }}>
          Tester/Pumper tickets run Monday–Sunday. Pick your first working day — the ticket anchors to that week, and you'll fill each day's hours on the ticket
          itself.
        </div>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", alignItems: "flex-end" }}>
        <div>
          <label style={labelStyle}>DATE</label>
          <input type="date" style={{ ...inputStyle, width: 180 }} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>LOCATION TIME</label>
          <TimePicker value={dueOnLoc} onChange={setDueOnLoc} startHour={6} startPeriod="AM" />
        </div>
        <div>
          <label style={labelStyle}>TIME ZONE</label>
          <div style={{ display: "flex", gap: 10, paddingTop: 6 }}>
            {["TX", "NM"].map((tz) => (
              <span
                key={tz}
                onClick={() => setTimeZone(tz)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 700,
                  color: timeZone === tz ? C.red : C.muted,
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
          </div>
        </div>
        {showWindow && (
          <>
            <div>
              <label style={labelStyle}>RENTAL FROM</label>
              <input type="date" style={{ ...inputStyle, width: 160 }} value={windowFrom} onChange={(e) => setWindowFrom(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>RENTAL TO</label>
              <input type="date" style={{ ...inputStyle, width: 160 }} value={windowTo} onChange={(e) => setWindowTo(e.target.value)} />
            </div>
          </>
        )}
        {yardsList.length > 1 && (
          <div>
            <label style={labelStyle}>YARD</label>
            <select value={yardLocationIndex} onChange={(e) => setYardLocationIndex(parseInt(e.target.value, 10))} style={{ ...inputStyle, width: 180 }}>
              {yardsList.map((y, i) => (
                <option key={i} value={i + 1}>
                  {y.name || `Yard #${i + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
