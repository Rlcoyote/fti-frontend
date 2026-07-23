import { useState } from "react";
import { C } from "./config.js";
import { Btn, ModalWrap, Z_INDEX } from "./SharedUI.jsx";
import AddTicketTypeSelector from "./AddTicketTypeSelector.jsx";

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

export default function WorkOrderTicketsHeader({ ticketCount, approvedCount, onAdd }) {
  const [pickerOpen, setPickerOpen] = useState(false);
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
      <Btn small onClick={() => setPickerOpen(true)}>
        + ADD TICKET
      </Btn>
      {pickerOpen && (
        <ModalWrap variant="dialog" z={Z_INDEX.overlay} width={340} accent={C.red} onClose={() => setPickerOpen(false)}>
          <AddTicketTypeSelector
            onSelect={(key) => {
              setPickerOpen(false);
              onAdd(key);
            }}
            onCancel={() => setPickerOpen(false)}
          />
        </ModalWrap>
      )}
    </div>
  );
}
