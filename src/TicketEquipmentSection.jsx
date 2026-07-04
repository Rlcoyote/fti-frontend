import { useState, useEffect } from "react";
import { C } from "./config.js";
import { api } from "./api.js";
import { Btn, inputStyle } from "./SharedUI.jsx";
import { isVisitType } from "./ticketFamilies.js";

// ─── TicketEquipmentSection (v28.264, master-ticket Phase 3) ────────────────
// The paper RU/RD forms' TOP section: what is ON LOCATION — kept strictly
// separate from the charges (line items) below it, so billing codes never
// tangle with field equipment (Reggie 2026-07-02). Rows suggest from the
// inventory list (datalist — free text stays legal, the paper has blank
// rows); picking a suggestion links inventory_id so the checkout is real
// data, not a typed string.
//
// Rig Down: COPY FROM RIG UP pulls the job's latest Rig Up equipment in as
// the starting point — the paper's "check your quantities here against the
// R/U" reconciliation. The YES/NO missing-pieces answer stays where it
// already lives (TicketRigDownMissing).
//
// Controlled: parent owns rows ([{ inventory_id?, item, size, qty, note }]).
// Any edit calls onSigWipe (the equipment grid is part of the signed page).

function TicketEquipmentSection({ rows, setRows, ticketType, jobId, readOnly, onSigWipe }) {
  const [inventory, setInventory] = useState([]);
  const [copyMsg, setCopyMsg] = useState(null);

  useEffect(() => {
    if (readOnly) return;
    api
      .get(`/inventory`)
      .then((list) => setInventory(Array.isArray(list) ? list : []))
      .catch(() => setInventory([]));
  }, [readOnly]);

  if (!isVisitType(ticketType)) return null;

  const label = (inv) => [inv.size, inv.item].filter(Boolean).join(" ");

  const update = (idx, field, value) => {
    onSigWipe?.();
    setRows((prev) =>
      prev.map((r, i) => {
        if (i !== idx) return r;
        const next = { ...r, [field]: value };
        if (field === "item") {
          // exact datalist match links the inventory row + fills size
          const hit = inventory.find((inv) => label(inv) === value || inv.item === value);
          next.inventory_id = hit ? hit.id : null;
          if (hit) {
            next.item = hit.item;
            next.size = hit.size || "";
          }
        }
        return next;
      }),
    );
  };

  const addRow = () => {
    onSigWipe?.();
    setRows((prev) => [...prev, { inventory_id: null, item: "", size: "", qty: 1, note: "" }]);
  };

  const removeRow = (idx) => {
    onSigWipe?.();
    setRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const copyFromRigUp = async () => {
    setCopyMsg(null);
    try {
      const tickets = await api.get(`/tickets?job_id=${jobId}&include_voided=true`);
      const ru = (tickets || []).filter((t) => t.type === "Rig Up" && !t.voided_at).sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""))[0];
      if (!ru) {
        setCopyMsg("No Rig Up ticket on this work order yet.");
        return;
      }
      const eq = await api.get(`/tickets/${ru.id}/equipment`);
      if (!eq.length) {
        setCopyMsg(`Rig Up #${ru.ticket_number || ru.id} has no equipment recorded.`);
        return;
      }
      onSigWipe?.();
      setRows(eq.map((r) => ({ inventory_id: r.inventory_id, item: r.item, size: r.size || "", qty: r.qty, note: r.note || "" })));
      setCopyMsg(`Copied ${eq.length} item${eq.length === 1 ? "" : "s"} from Rig Up #${ru.ticket_number || ru.id} — check quantities against what came back.`);
    } catch (e) {
      setCopyMsg(e.message);
    }
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", color: C.text, opacity: 0.75 }}>EQUIPMENT ON LOCATION</div>
        {!readOnly && ticketType === "Rig Down" && jobId && (
          <Btn variant="ghost" small onClick={copyFromRigUp}>
            COPY FROM RIG UP
          </Btn>
        )}
      </div>
      {copyMsg && <div style={{ fontSize: 12, color: C.blue, marginBottom: 6 }}>{copyMsg}</div>}

      {rows.length === 0 && readOnly && <div style={{ fontSize: 12, opacity: 0.55, marginBottom: 6 }}>No equipment recorded.</div>}

      {rows.map((r, idx) =>
        readOnly ? (
          <div key={idx} style={{ display: "flex", gap: 10, fontSize: 13, padding: "4px 0", borderBottom: `1px solid ${C.border}33` }}>
            <span style={{ fontWeight: 700, minWidth: 34, textAlign: "right" }}>{r.qty}×</span>
            <span>
              {r.size ? `${r.size} ` : ""}
              {r.item}
            </span>
            {r.note && <span style={{ opacity: 0.6 }}>— {r.note}</span>}
          </div>
        ) : (
          <div key={idx} style={{ display: "grid", gridTemplateColumns: "70px 1fr 90px 1fr 32px", gap: 6, marginBottom: 6, alignItems: "center" }}>
            <input
              type="number"
              min={1}
              style={inputStyle}
              value={r.qty}
              onChange={(e) => update(idx, "qty", e.target.value === "" ? "" : Math.max(1, Number(e.target.value) || 1))}
              placeholder="QTY"
            />
            <input
              list="fti-equipment-inventory"
              style={inputStyle}
              value={r.item}
              onChange={(e) => update(idx, "item", e.target.value)}
              placeholder="ITEM (pick from inventory or type)"
            />
            <input style={inputStyle} value={r.size || ""} onChange={(e) => update(idx, "size", e.target.value)} placeholder="SIZE" />
            <input style={inputStyle} value={r.note || ""} onChange={(e) => update(idx, "note", e.target.value)} placeholder="NOTE" />
            <span onClick={() => removeRow(idx)} style={{ color: C.red, fontWeight: 800, cursor: "pointer", textAlign: "center" }} title="Remove row">
              ×
            </span>
          </div>
        ),
      )}

      {!readOnly && (
        <>
          <datalist id="fti-equipment-inventory">
            {inventory.map((inv) => (
              <option key={inv.id} value={label(inv)} />
            ))}
          </datalist>
          <Btn variant="ghost" small onClick={addRow}>
            + ADD EQUIPMENT
          </Btn>
        </>
      )}
    </div>
  );
}

export default TicketEquipmentSection;
