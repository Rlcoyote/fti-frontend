import { C } from "./config.js";

// ─── JSAModalHeader (v28.154 — ship 1 of the JSAModal split) ──────────────
// The JSA modal's title bar: the FLO-TEST / JSA heading, the ticket line,
// and the emergency-contacts block. Presentational — JSAModal owns the
// emergency-contacts data and the edit modal; onEditEmergency opens it.
//
// Emergency contacts are deliberately bold red for immediate-recognition
// visibility — these are safety-critical phone numbers. Per CAM Article X:
// dummy-proof in field conditions (2 AM windstorm).

function JSAModalHeader({ ticketNum, customer, ticket, emergencyContacts, currentUser, onEditEmergency }) {
  return (
    <div style={{ padding: "16px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div>
        <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "0.06em" }}>FLO-TEST, INC. — JSA</div>
        <div style={{ fontSize: 11, color: C.muted }}>
          #{ticketNum} — Tailgate Safety Meeting · {customer}
          {ticket ? ` · ${ticket.type}` : ""}
        </div>
      </div>
      <div style={{ fontSize: 11, textAlign: "right" }}>
        {emergencyContacts.length > 0 ? (
          emergencyContacts.map((c, i) => (
            <div key={i} style={{ fontWeight: 800, color: C.red }}>
              {c.label}: {c.phone}
            </div>
          ))
        ) : (
          <div style={{ fontWeight: 800, color: C.red }}>AIRLIFE: 800-627-2376</div>
        )}
        {currentUser?.role === "owner" && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              onEditEmergency();
            }}
            style={{ fontSize: 10, color: C.blue, cursor: "pointer", marginTop: 4, fontWeight: 600 }}
          >
            Edit Emergency Info
          </div>
        )}
      </div>
    </div>
  );
}

export default JSAModalHeader;
