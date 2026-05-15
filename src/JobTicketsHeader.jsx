import { C } from "./config.js";
import { Btn } from "./SharedUI.jsx";

// ─── JobTicketsHeader (v28.84 — ship 3 of JobTicketsTab split) ─────────────
// The top of the Tickets tab: a count line, the "approved → Final Review"
// callout (only when > 0), and the + ADD TICKET button. Pure presentation;
// the parent owns the click handler.

export default function JobTicketsHeader({ ticketCount, approvedCount, onAdd }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.muted }}>
          {ticketCount} ticket{ticketCount !== 1 ? "s" : ""}
        </div>
        {approvedCount > 0 && (
          <div style={{ fontSize: 11, color: C.blue, marginTop: 2 }}>
            {approvedCount} approved {approvedCount === 1 ? "ticket" : "tickets"} → Final Review
          </div>
        )}
      </div>
      <Btn small onClick={onAdd}>
        + ADD TICKET
      </Btn>
    </div>
  );
}
