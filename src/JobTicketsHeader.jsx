import { useState } from "react";
import { C } from "./config.js";
import { Btn, TICKET_TYPES } from "./SharedUI.jsx";

// ─── JobTicketsHeader (v28.84 split; v28.271 type menu) ─────────────────────
// The top of the Tickets tab. v28.271 (Reggie, white-label direction): the
// separate "Select Type" screen was a dead step once the ticket form owns a
// live type dropdown — ADD TICKET now IS the type menu. One tap shows the
// five types (color dot + plain-English line, the discovery surface for a
// hand or a new tenant); picking one opens the form already typed and
// colored. Parent receives onAdd(type).

export default function JobTicketsHeader({ ticketCount, approvedCount, onAdd }) {
  const [menuOpen, setMenuOpen] = useState(false);
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
      <div style={{ position: "relative" }}>
        <Btn small onClick={() => setMenuOpen((o) => !o)}>
          + ADD TICKET ▾
        </Btn>
        {menuOpen && (
          <>
            <div style={{ position: "fixed", inset: 0, zIndex: 120 }} onClick={() => setMenuOpen(false)} />
            <div
              style={{
                position: "absolute",
                right: 0,
                top: "calc(100% + 6px)",
                zIndex: 121,
                background: C.cardBg,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
                minWidth: 260,
                overflow: "hidden",
              }}
            >
              {Object.entries(TICKET_TYPES).map(([key, cfg]) => (
                <div
                  key={key}
                  onClick={() => {
                    setMenuOpen(false);
                    onAdd(key);
                  }}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", cursor: "pointer", transition: "background 0.12s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = `${cfg.color}18`)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <span style={{ width: 12, height: 12, borderRadius: "50%", background: cfg.color, flexShrink: 0 }} />
                  <span>
                    <span style={{ display: "block", fontSize: 13, fontWeight: 800, color: C.text, letterSpacing: "0.04em" }}>{key}</span>
                    <span style={{ display: "block", fontSize: 11, color: C.muted }}>{cfg.desc}</span>
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
