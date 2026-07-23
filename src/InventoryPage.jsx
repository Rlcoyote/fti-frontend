import { useState, useMemo } from "react";
import { useQueryPrefill } from "./useQueryPrefill.js";
import { C, API_URL } from "./config.js";
import { Btn, FilterBtn, ModalWrap, inputStyle, labelStyle } from "./SharedUI.jsx";
import { useApp } from "./AppContext.jsx";

function InventoryPage({ inventory, setInventory, jobs }) {
  const { showNotice } = useApp();
  const [sizeFilter, setSizeFilter] = useState("All");
  const [catFilter, setCatFilter] = useState("All");
  const [search, setSearch] = useState("");
  useQueryPrefill("q", setSearch); // v28.394 — search results arrive pre-filtered
  const [showCheckOut, setShowCheckOut] = useState(null);
  const [showCheckIn, setShowCheckIn] = useState(null);
  const [showEdit, setShowEdit] = useState(null);
  const [showAdd, setShowAdd] = useState(false);

  const sizes = ["All", '2"', '3"', '4"'];
  const categories = ["All", "Fitting", "Pup Joint", "Valve", "Cross Over"];

  const filtered = inventory.filter((item) => {
    if (sizeFilter !== "All" && item.size !== sizeFilter) return false;
    if (catFilter !== "All" && item.category !== catFilter) return false;
    if (search && !item.item.toLowerCase().includes(search.toLowerCase()) && !item.itemNum.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const summaryBySize = useMemo(() => {
    const m = {};
    inventory.forEach((i) => {
      if (!m[i.size]) m[i.size] = { owned: 0, inYard: 0, out: 0, items: 0 };
      m[i.size].owned += i.qtyOwned;
      m[i.size].inYard += i.inYard;
      m[i.size].out += i.qtyOwned - i.inYard;
      m[i.size].items += 1;
    });
    return m;
  }, [inventory]);

  const totalOwned = inventory.reduce((s, i) => s + i.qtyOwned, 0);
  const totalInYard = inventory.reduce((s, i) => s + i.inYard, 0);
  const totalOut = totalOwned - totalInYard;

  const handleCheckOut = async (id, qty, customer, fieldTicket) => {
    const item = inventory.find((i) => i.id === id);
    if (!item) return;
    const newInYard = Math.max(0, item.inYard - qty);
    // v28.232 — fetch doesn't throw on 4xx/5xx; don't show stock as moved if
    // the backend rejected the write.
    try {
      const r = await fetch(`${API_URL}/inventory/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ in_yard: newInYard, customer, field_ticket: fieldTicket }),
      });
      if (!r.ok) {
        showNotice("Checkout failed", "Couldn't update inventory — try again.", "error");
        return;
      }
    } catch (err) {
      console.error("Inventory checkout failed:", err);
      showNotice("Checkout failed", "A network error occurred.", "error");
      return;
    }
    setInventory((prev) => prev.map((i) => (i.id !== id ? i : { ...i, inYard: newInYard, customer, fieldTicket })));
    setShowCheckOut(null);
  };

  const handleCheckIn = async (id, qty) => {
    const item = inventory.find((i) => i.id === id);
    if (!item) return;
    const maxReturn = item.qtyOwned - item.inYard;
    const newInYard = item.inYard + Math.min(qty, maxReturn);
    const allBack = newInYard >= item.qtyOwned;
    try {
      const r = await fetch(`${API_URL}/inventory/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ in_yard: newInYard, customer: allBack ? null : item.customer, field_ticket: allBack ? null : item.fieldTicket }),
      });
      if (!r.ok) {
        showNotice("Check-in failed", "Couldn't update inventory — try again.", "error");
        return;
      }
    } catch (err) {
      console.error("Inventory checkin failed:", err);
      showNotice("Check-in failed", "A network error occurred.", "error");
      return;
    }
    setInventory((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        return { ...i, inYard: newInYard, customer: allBack ? null : i.customer, fieldTicket: allBack ? null : i.fieldTicket };
      }),
    );
    setShowCheckIn(null);
  };

  const handleEdit = async (id, updates) => {
    try {
      const r = await fetch(`${API_URL}/inventory/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          in_yard: updates.inYard,
          qty_owned: updates.qtyOwned,
          customer: updates.customer,
          field_ticket: updates.fieldTicket,
          notes: updates.notes,
        }),
      });
      if (!r.ok) {
        showNotice("Update failed", "Couldn't save inventory changes — try again.", "error");
        return;
      }
    } catch (err) {
      console.error("Inventory edit failed:", err);
      showNotice("Update failed", "A network error occurred.", "error");
      return;
    }
    setInventory((prev) => prev.map((item) => (item.id !== id ? item : { ...item, ...updates })));
    setShowEdit(null);
  };

  const handleAdd = (newItem) => {
    setInventory((prev) => [...prev, { ...newItem, id: Math.max(...prev.map((i) => i.id)) + 1 }]);
    setShowAdd(false);
  };

  const handleDelete = (id) => {
    setInventory((prev) => prev.filter((i) => i.id !== id));
    setShowEdit(null);
  };

  return (
    <div style={{ padding: "24px 28px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Iron Inventory</h1>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
            {inventory.length} items · {totalOwned.toLocaleString()} owned · {totalInYard.toLocaleString()} in yard · {totalOut.toLocaleString()} out
          </div>
        </div>
        <Btn onClick={() => setShowAdd(true)}>+ ADD ITEM</Btn>
      </div>

      {/* Summary Cards */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {['2"', '3"', '4"'].map((size) => {
          const s = summaryBySize[size] || { owned: 0, inYard: 0, out: 0, items: 0 };
          const pctOut = s.owned > 0 ? ((s.out / s.owned) * 100).toFixed(0) : 0;
          return (
            <div
              key={size}
              onClick={() => setSizeFilter(sizeFilter === size ? "All" : size)}
              style={{
                flex: 1,
                background: C.cardBg,
                border: `1px solid ${sizeFilter === size ? C.blue : C.border}`,
                borderTop: `2px solid ${sizeFilter === size ? C.blue : C.red}`,
                borderRadius: 6,
                padding: "12px 14px",
                cursor: "pointer",
                transition: "border-color 0.15s",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: C.text }}>{size}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted }}>{s.items} items</div>
              </div>
              <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
                <div>
                  <div style={{ fontSize: 11, color: C.muted, fontWeight: 700 }}>OWNED</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>{s.owned.toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: C.muted, fontWeight: 700 }}>IN YARD</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: C.green }}>{s.inYard.toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: C.muted, fontWeight: 700 }}>OUT</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: s.out > 0 ? C.orange : C.muted }}>{s.out.toLocaleString()}</div>
                </div>
              </div>
              {s.out > 0 && (
                <div style={{ marginTop: 8, height: 4, background: C.lightSteel, borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${100 - pctOut}%`, background: C.green, borderRadius: 2 }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginRight: 4 }}>SIZE:</span>
        {sizes.map((s) => (
          <FilterBtn key={s} active={sizeFilter === s} onClick={() => setSizeFilter(s)}>
            {s === "All" ? "ALL" : s}
          </FilterBtn>
        ))}
        <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginLeft: 12, marginRight: 4 }}>TYPE:</span>
        {categories.map((c) => (
          <FilterBtn key={c} active={catFilter === c} onClick={() => setCatFilter(c)}>
            {c.toUpperCase()}
          </FilterBtn>
        ))}
        <div style={{ marginLeft: "auto" }}>
          <input
            style={{ ...inputStyle, width: 220, background: C.cardBg }}
            placeholder="Search item or item #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 6, overflow: "auto", maxHeight: "calc(100vh - 340px)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "'Arial', sans-serif" }}>
          <thead>
            <tr style={{ background: C.navy, position: "sticky", top: 0, zIndex: 2 }}>
              {["#", "SIZE", "CATEGORY", "ITEM", "ITEM #", "OWNED", "IN YARD", "OUT", "CUSTOMER / LOCATION", "FT #", "ACTIONS"].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "10px 10px",
                    textAlign: "left",
                    fontSize: 10,
                    fontWeight: 800,
                    color: C.white,
                    letterSpacing: "0.1em",
                    borderBottom: `2px solid ${C.red}`,
                    background: C.navy,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((item, idx) => {
              const out = item.qtyOwned - item.inYard;
              const isLow = item.qtyOwned > 0 && item.inYard > 0 && item.inYard < 4;
              const isEmpty = item.qtyOwned > 0 && item.inYard === 0;
              return (
                <tr
                  key={item.id}
                  style={{
                    background: isEmpty ? C.overdueB : isLow ? C.yellowB : idx % 2 === 0 ? C.cardBg : C.steel,
                    borderBottom: `1px solid ${C.border}`,
                  }}
                >
                  <td style={{ padding: "8px 10px", color: C.muted, fontSize: 11, fontWeight: 600, textAlign: "center", minWidth: 32 }}>{idx + 1}</td>
                  <td style={{ padding: "8px 10px", fontWeight: 700 }}>{item.size}</td>
                  <td style={{ padding: "8px 10px", color: C.muted }}>{item.category}</td>
                  <td style={{ padding: "8px 10px", fontWeight: 700 }}>{item.item}</td>
                  <td style={{ padding: "8px 10px", color: C.blue, fontWeight: 600, fontSize: 11 }}>{item.itemNum}</td>
                  <td style={{ padding: "8px 10px", fontWeight: 700, textAlign: "center" }}>{item.qtyOwned}</td>
                  <td style={{ padding: "8px 10px", fontWeight: 800, textAlign: "center", color: isEmpty ? C.red : isLow ? C.orange : C.green }}>
                    {item.inYard}
                  </td>
                  <td style={{ padding: "8px 10px", fontWeight: 700, textAlign: "center", color: out > 0 ? C.orange : C.muted }}>{out}</td>
                  <td style={{ padding: "8px 10px", fontSize: 11, color: item.customer ? C.text : C.muted }}>{item.customer || "—"}</td>
                  <td style={{ padding: "8px 10px", fontSize: 11, color: item.fieldTicket ? C.blue : C.muted }}>{item.fieldTicket || "—"}</td>
                  <td style={{ padding: "6px 6px", whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", gap: 4 }}>
                      {item.inYard > 0 && (
                        <button
                          className="fti-btn"
                          onClick={() => setShowCheckOut(item)}
                          style={{
                            background: C.red,
                            color: C.white,
                            border: "none",
                            borderRadius: 3,
                            padding: "4px 8px",
                            fontSize: 10,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          OUT
                        </button>
                      )}
                      {out > 0 && (
                        <button
                          className="fti-btn"
                          onClick={() => setShowCheckIn(item)}
                          style={{
                            background: C.green,
                            color: C.white,
                            border: "none",
                            borderRadius: 3,
                            padding: "4px 8px",
                            fontSize: 10,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          IN
                        </button>
                      )}
                      <button
                        className="fti-btn"
                        onClick={() => setShowEdit(item)}
                        style={{
                          background: "transparent",
                          color: C.muted,
                          border: `1px solid ${C.border}`,
                          borderRadius: 3,
                          padding: "4px 8px",
                          fontSize: 10,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        EDIT
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <div style={{ textAlign: "center", padding: "40px 0", color: C.muted, fontSize: 14 }}>No items match filters.</div>}
      </div>

      {/* CHECK OUT MODAL */}
      {showCheckOut && <CheckOutModal item={showCheckOut} jobs={jobs} onCheckOut={handleCheckOut} onClose={() => setShowCheckOut(null)} />}
      {/* CHECK IN MODAL */}
      {showCheckIn && <CheckInModal item={showCheckIn} onCheckIn={handleCheckIn} onClose={() => setShowCheckIn(null)} />}
      {/* EDIT MODAL */}
      {showEdit && <EditItemModal item={showEdit} onSave={handleEdit} onDelete={handleDelete} onClose={() => setShowEdit(null)} />}
      {/* ADD MODAL */}
      {showAdd && <AddItemModal onSave={handleAdd} onClose={() => setShowAdd(false)} />}
    </div>
  );
}

// ─── MODALS ───────────────────────────────────────────────────────────────────

function CheckOutModal({ item, jobs, onCheckOut, onClose }) {
  const [qty, setQty] = useState(1);
  const [customer, setCustomer] = useState("");
  const [ft, setFt] = useState("");
  const [jobLink, setJobLink] = useState("");

  const activeWorkOrders = jobs.filter((j) => j.status !== "Invoiced");

  const handleJobSelect = (workOrderId) => {
    setJobLink(workOrderId);
    if (workOrderId) {
      const job = jobs.find((j) => j.id === Number(workOrderId));
      if (job) setCustomer(`${job.customer} — ${job.location}`);
    }
  };

  return (
    <ModalWrap title={`Check Out — ${item.size} ${item.item}`} onClose={onClose}>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>
        Available: <strong style={{ color: C.green }}>{item.inYard}</strong> in yard
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>LINK TO WORK ORDER</label>
        <select style={inputStyle} value={jobLink} onChange={(e) => handleJobSelect(e.target.value)}>
          <option value="">— No Work Order / Manual Entry —</option>
          {activeWorkOrders.map((j) => (
            <option key={j.id} value={j.id}>
              #{j.id} {j.customer}
            </option>
          ))}
        </select>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: 10, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>QTY</label>
          <input
            type="number"
            min={1}
            max={item.inYard}
            style={inputStyle}
            value={qty}
            onChange={(e) => setQty(Math.min(Number(e.target.value), item.inYard))}
          />
        </div>
        <div>
          <label style={labelStyle}>CUSTOMER / LOCATION</label>
          <input style={inputStyle} value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Customer or location..." />
        </div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>FIELD TICKET #</label>
        <input style={inputStyle} value={ft} onChange={(e) => setFt(e.target.value)} placeholder="Optional" />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Btn
          onClick={() => {
            if (qty > 0 && qty <= item.inYard) onCheckOut(item.id, qty, customer || null, ft || null);
          }}
        >
          CHECK OUT {qty}
        </Btn>
        <Btn onClick={onClose} variant="ghost">
          CANCEL
        </Btn>
      </div>
    </ModalWrap>
  );
}

function CheckInModal({ item, onCheckIn, onClose }) {
  const out = item.qtyOwned - item.inYard;
  const [qty, setQty] = useState(out);

  return (
    <ModalWrap title={`Check In — ${item.size} ${item.item}`} onClose={onClose} width={360}>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>
        Currently out: <strong style={{ color: C.orange }}>{out}</strong>
        {item.customer && <span> — {item.customer}</span>}
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>QTY RETURNING</label>
        <input type="number" min={1} max={out} style={inputStyle} value={qty} onChange={(e) => setQty(Math.min(Number(e.target.value), out))} />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Btn
          variant="blue"
          onClick={() => {
            if (qty > 0 && qty <= out) onCheckIn(item.id, qty);
          }}
        >
          CHECK IN {qty}
        </Btn>
        <Btn onClick={onClose} variant="ghost">
          CANCEL
        </Btn>
      </div>
    </ModalWrap>
  );
}

function EditItemModal({ item, onSave, onDelete, onClose }) {
  const [form, setForm] = useState({
    size: item.size,
    category: item.category,
    item: item.item,
    psi: item.psi || "",
    itemNum: item.itemNum,
    serial: item.serial || "",
    qtyOwned: item.qtyOwned,
    inYard: item.inYard,
    notes: item.notes || "",
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <ModalWrap title={`Edit — ${item.size} ${item.item}`} onClose={onClose} width={520}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>SIZE</label>
          <select style={inputStyle} value={form.size} onChange={(e) => set("size", e.target.value)}>
            {['2"', '3"', '4"'].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>CATEGORY</label>
          <select style={inputStyle} value={form.category} onChange={(e) => set("category", e.target.value)}>
            {["Fitting", "Pup Joint", "Valve", "Cross Over"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>PSI</label>
          <input style={inputStyle} value={form.psi} onChange={(e) => set("psi", e.target.value)} placeholder="Optional" />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>ITEM NAME</label>
          <input style={inputStyle} value={form.item} onChange={(e) => set("item", e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>ITEM #</label>
          <input style={inputStyle} value={form.itemNum} onChange={(e) => set("itemNum", e.target.value)} />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>SERIAL #</label>
          <input style={inputStyle} value={form.serial} onChange={(e) => set("serial", e.target.value)} placeholder="If any" />
        </div>
        <div>
          <label style={labelStyle}>QTY OWNED</label>
          <input type="number" min={0} style={inputStyle} value={form.qtyOwned} onChange={(e) => set("qtyOwned", Number(e.target.value))} />
        </div>
        <div>
          <label style={labelStyle}>IN YARD</label>
          <input
            type="number"
            min={0}
            max={form.qtyOwned}
            style={inputStyle}
            value={form.inYard}
            onChange={(e) => set("inYard", Math.min(Number(e.target.value), form.qtyOwned))}
          />
        </div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>NOTES</label>
        <input style={inputStyle} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn onClick={() => onSave(item.id, { ...form, psi: form.psi || null, serial: form.serial || null, notes: form.notes || null })}>SAVE</Btn>
          <Btn onClick={onClose} variant="ghost">
            CANCEL
          </Btn>
        </div>
        <button
          className="fti-btn"
          onClick={() => onDelete(item.id)}
          style={{
            background: "transparent",
            color: C.red,
            border: `1px solid ${C.red}44`,
            borderRadius: 4,
            padding: "8px 14px",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          DELETE
        </button>
      </div>
    </ModalWrap>
  );
}

function AddItemModal({ onSave, onClose }) {
  const [form, setForm] = useState({
    size: '2"',
    category: "Fitting",
    item: "",
    psi: null,
    itemNum: "",
    serial: null,
    qtyOwned: 0,
    inYard: 0,
    customer: null,
    fieldTicket: null,
    notes: null,
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <ModalWrap title="Add New Inventory Item" onClose={onClose} width={520}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>SIZE *</label>
          <select style={inputStyle} value={form.size} onChange={(e) => set("size", e.target.value)}>
            {['2"', '3"', '4"'].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>CATEGORY *</label>
          <select style={inputStyle} value={form.category} onChange={(e) => set("category", e.target.value)}>
            {["Fitting", "Pup Joint", "Valve", "Cross Over"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>PSI</label>
          <input style={inputStyle} value={form.psi || ""} onChange={(e) => set("psi", e.target.value || null)} placeholder="Optional" />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>ITEM NAME *</label>
          <input style={inputStyle} value={form.item} onChange={(e) => set("item", e.target.value)} placeholder="e.g. Cushion 90" />
        </div>
        <div>
          <label style={labelStyle}>ITEM #</label>
          <input style={inputStyle} value={form.itemNum} onChange={(e) => set("itemNum", e.target.value)} placeholder="e.g. 2C90-###" />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>QTY OWNED</label>
          <input
            type="number"
            min={0}
            style={inputStyle}
            value={form.qtyOwned}
            onChange={(e) => {
              const v = Number(e.target.value);
              set("qtyOwned", v);
              set("inYard", v);
            }}
          />
        </div>
        <div>
          <label style={labelStyle}>IN YARD</label>
          <input
            type="number"
            min={0}
            max={form.qtyOwned}
            style={inputStyle}
            value={form.inYard}
            onChange={(e) => set("inYard", Math.min(Number(e.target.value), form.qtyOwned))}
          />
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Btn
          onClick={() => {
            if (form.item.trim()) onSave(form);
          }}
        >
          ADD ITEM
        </Btn>
        <Btn onClick={onClose} variant="ghost">
          CANCEL
        </Btn>
      </div>
    </ModalWrap>
  );
}

export default InventoryPage;
