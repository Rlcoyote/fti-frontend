import { C } from "./config.js";
import { calcLineTotal } from "./utils.js";

function ReadOnlyLineItems({ lineItems, ticketType, total }) {
  const isRental = ticketType === "Rental";
  const cols = isRental
    ? "40px 90px 1fr 65px 55px 60px 55px 85px"
    : "40px 100px 1fr 70px 70px 70px 90px";
  const headers = isRental
    ? ["#", "CODE", "DESCRIPTION", "RATE", "QTY", "U/M", "DAYS", "TOTAL"]
    : ["#", "CODE", "DESCRIPTION", "RATE", "QTY", "U/M", "TOTAL"];

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: cols, gap: 4, padding: "6px 0", borderBottom: `1px solid ${C.border}`, marginBottom: 4 }}>
        {headers.map(h => (
          <div key={h} style={{ fontSize: 9, fontWeight: 800, color: C.muted, letterSpacing: "0.1em" }}>{h}</div>
        ))}
      </div>
      {lineItems.map((li, idx) => (
        <div key={idx} style={{
          display: "grid", gridTemplateColumns: cols,
          gap: 4, padding: "5px 0", borderBottom: `1px solid ${C.border}22`,
        }}>
          <div style={{ fontSize: 11, color: C.muted, textAlign: "center" }}>{idx + 1}</div>
          <div style={{ fontSize: 11, color: C.blue, fontWeight: 600 }}>{li.qbCode}</div>
          <div style={{ fontSize: 11, color: C.text }}>{li.desc}</div>
          <div style={{ fontSize: 11, textAlign: "right" }}>{'$'}{li.rate}</div>
          <div style={{ fontSize: 11, textAlign: "right" }}>{li.qty}</div>
          <div style={{ fontSize: 10, color: C.muted }}>{li.um}</div>
          {isRental && <div style={{ fontSize: 11, textAlign: "right" }}>{li.days || 1}</div>}
          <div style={{ fontSize: 11, fontWeight: 700, textAlign: "right" }}>
            {'$'}{calcLineTotal(li).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      ))}
      <div style={{ display: "grid", gridTemplateColumns: cols, gap: 4, padding: "8px 0", borderTop: `2px solid ${C.border}`, marginTop: 4 }}>
        {headers.slice(0, -1).map((_, i) => <div key={i} />)}
        <div style={{ fontSize: 13, fontWeight: 800, color: C.text, textAlign: "right" }}>
          {'$'}{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>
    </div>
  );
}


export default ReadOnlyLineItems;
