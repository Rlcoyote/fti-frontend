import { useState, useRef } from "react";
import { C } from "./config.js";
import { Btn, Z_INDEX, TICKET_TYPES } from "./SharedUI.jsx";

// ─── WorkOrderTicketsHeader (v28.84 split; v28.271 type menu) ─────────────────────
// The top of the Tickets tab. ADD TICKET opens the type picker; picking a
// type opens the form already typed and colored. Parent receives onAdd(type).
//
// v28.320 — the hand-rolled dropdown is GONE. It rendered absolutely inside
// WorkOrderCard, whose `overflow: hidden` CLIPPED it to the card's bounds — on a
// short card only Rig Up + Rig Down were visible/clickable ("tester and
// pumper no longer populate", field report 2026-07-14, with screenshot).
// Worse, it was a second sibling surface for type picking next to
// AddTicketTypeSelector (Anti-Pattern Entry 7). Now there is ONE picker —
// AddTicketTypeSelector — rendered in a ModalWrap dialog, which is a fixed
// overlay no ancestor overflow can clip. Structurally unclippable
// (Article XVII).

// v28.413 (Reggie: "would it be simpler for the user to click 'add ticket'
// and a drop down populate?") — the v28.271 dropdown returns, this time
// UNCLIPPABLE: rendered position:fixed from the button's rect (the gear-
// flyout technique), so no ancestor overflow can eat Tester/Pumper again
// (the v28.320 incident). White-label dividend: a one-ticket-type tenant
// skips the menu entirely — ADD TICKET goes straight to the form.
export default function WorkOrderTicketsHeader({ ticketCount, approvedCount, onAdd }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [menuPos, setMenuPos] = useState(null);
  const btnRef = useRef(null);
  const typeKeys = Object.keys(TICKET_TYPES);
  const openPicker = () => {
    if (typeKeys.length === 1) {
      onAdd(typeKeys[0]);
      return;
    }
    const r = btnRef.current?.getBoundingClientRect();
    setMenuPos(r ? { top: r.bottom + 6, right: Math.max(8, window.innerWidth - r.right) } : { top: 80, right: 16 });
    setPickerOpen(true);
  };
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
      <span ref={btnRef}>
        <Btn small onClick={openPicker}>
          + ADD TICKET
        </Btn>
      </span>
      {pickerOpen && menuPos && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: Z_INDEX.overlay - 1 }} onClick={() => setPickerOpen(false)} />
          <div
            style={{
              position: "fixed",
              top: menuPos.top,
              right: menuPos.right,
              zIndex: Z_INDEX.overlay,
              background: C.cardBg,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              boxShadow: "0 6px 24px rgba(0,0,0,0.35)",
              minWidth: 180,
              overflow: "hidden",
            }}
          >
            {/* v28.418 — real <button>s, not click-divs: keyboard/screen-reader
                reachable, and the E2E all-five-types fence targets button
                roles (it rightly refused the div version). */}
            {typeKeys.map((key) => {
              const t = TICKET_TYPES[key];
              return (
                <button
                  key={key}
                  type="button"
                  className="fti-btn"
                  onClick={() => {
                    setPickerOpen(false);
                    onAdd(key);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 14px",
                    cursor: "pointer",
                    width: "100%",
                    background: "transparent",
                    border: "none",
                    textAlign: "left",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = C.steel)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: t.color, display: "inline-block" }} />
                  <span style={{ fontSize: 13, fontWeight: 800, color: C.text, letterSpacing: "0.04em" }}>{t.label}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
