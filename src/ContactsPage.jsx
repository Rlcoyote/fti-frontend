import { useState, useEffect, useMemo } from "react";
import { C, API_URL } from "./config.js";
import { Btn, inputStyle, labelStyle, ModalWrap } from "./SharedUI.jsx";
import { useApp } from "./AppContext.jsx";

const ROLE_LABELS = { poc: "POINT OF CONTACT", site_manager: "SITE MANAGER", approver: "APPROVER", company_man: "COMPANY MAN", other: "OTHER" };

function ContactsPage() {
  const { customers, currentUser } = useApp();
  const isAdmin = ["owner", "admin"].includes(currentUser?.role);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCustomer, setFilterCustomer] = useState("All");
  const [filterRole, setFilterRole] = useState("All");
  const [editContact, setEditContact] = useState(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [msg, setMsg] = useState("");

  // Edit form
  const [eFirst, setEFirst] = useState("");
  const [eLast, setELast] = useState("");
  const [ePhone, setEPhone] = useState("");
  const [eEmail, setEEmail] = useState("");
  const [eRole, setERole] = useState("poc");

  const [winW, setWinW] = useState(window.innerWidth);
  useEffect(() => { const h = () => setWinW(window.innerWidth); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, []);
  const isMob = winW < 900;

  const fetchAll = async () => {
    try {
      // Fetch contacts for all customers in parallel
      const results = await Promise.all(
        (customers || []).map(c =>
          fetch(`${API_URL}/customers/${c.id}/contacts`).then(r => r.ok ? r.json() : []).then(contacts =>
            contacts.map(ct => ({ ...ct, customer_name: c.name }))
          )
        )
      );
      setContacts(results.flat());
    } catch { setContacts([]); }
    setLoading(false);
  };

  useEffect(() => { if (customers?.length) fetchAll(); else setLoading(false); }, [customers]);

  const filtered = useMemo(() => {
    let list = [...contacts];
    if (filterCustomer !== "All") list = list.filter(c => c.customer_id === filterCustomer);
    if (filterRole !== "All") list = list.filter(c => c.role_tag === filterRole);
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(c =>
        (c.name || "").toLowerCase().includes(s) ||
        (c.customer_name || "").toLowerCase().includes(s) ||
        (c.phone || "").includes(s) ||
        (c.email || "").toLowerCase().includes(s)
      );
    }
    return list.sort((a, b) => (a.customer_name || "").localeCompare(b.customer_name || "") || (a.name || "").localeCompare(b.name || ""));
  }, [contacts, filterCustomer, filterRole, search]);

  const uniqueRoles = [...new Set(contacts.map(c => c.role_tag))].sort();

  const openEdit = (c) => {
    const parts = (c.name || "").split(" ");
    setEFirst(parts[0] || ""); setELast(parts.slice(1).join(" ") || "");
    setEPhone(c.phone || ""); setEEmail(c.email || ""); setERole(c.role_tag || "poc");
    setEditContact(c);
  };

  const handleSaveEdit = async () => {
    if (!eFirst.trim()) return;
    const fullName = [eFirst.trim(), eLast.trim()].filter(Boolean).join(" ");
    try {
      await fetch(`${API_URL}/customers/contacts/${editContact.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: fullName, phone: ePhone || null, email: eEmail || null, role_tag: eRole }),
      });
      await fetchAll();
      setEditContact(null);
      setMsg("Contact updated.");
      setTimeout(() => setMsg(""), 3000);
    } catch { setMsg("Update failed."); }
  };

  const handleDelete = async (id) => {
    try {
      await fetch(`${API_URL}/customers/contacts/${id}`, { method: "DELETE" });
      await fetchAll();
    } catch { setMsg("Delete failed."); }
  };

  const handleBatchDelete = async () => {
    const ids = [...selected];
    for (const id of ids) {
      await fetch(`${API_URL}/customers/contacts/${id}`, { method: "DELETE" }).catch(() => {});
    }
    await fetchAll();
    setSelected(new Set());
    setSelectMode(false);
    setConfirmDelete(false);
    setMsg(`Deleted ${ids.length} contact${ids.length !== 1 ? "s" : ""}.`);
    setTimeout(() => setMsg(""), 3000);
  };

  const toggleSelect = (id) => {
    setSelected(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  return (
    <div style={{ padding: isMob ? "16px 12px" : "24px 28px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Contacts</h1>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
            {contacts.length} contact{contacts.length !== 1 ? "s" : ""} across {new Set(contacts.map(c => c.customer_id)).size} customer{new Set(contacts.map(c => c.customer_id)).size !== 1 ? "s" : ""}
          </div>
        </div>
        {isAdmin && contacts.length > 0 && (
          <div style={{ display: "flex", gap: 8 }}>
            {!selectMode ? (
              <Btn variant="ghost" small onClick={() => setSelectMode(true)}>SELECT</Btn>
            ) : (
              <>
                <button type="button" disabled={selected.size === 0} onClick={() => setConfirmDelete(true)}
                  style={{ background: selected.size === 0 ? C.steel : C.red, color: selected.size === 0 ? C.muted : C.white, border: "none", borderRadius: 4, padding: "6px 14px", fontSize: 11, fontWeight: 800, cursor: selected.size === 0 ? "not-allowed" : "pointer" }}>
                  DELETE ({selected.size})
                </button>
                <Btn variant="ghost" small onClick={() => { setSelectMode(false); setSelected(new Set()); }}>CANCEL</Btn>
              </>
            )}
          </div>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ flex: 1, minWidth: 160 }}>
          <label style={labelStyle}>SEARCH</label>
          <input style={inputStyle} value={search} onChange={e => setSearch(e.target.value)} placeholder="Name, company, phone, email..." />
        </div>
        <div>
          <label style={labelStyle}>CUSTOMER</label>
          <select style={{ ...inputStyle, width: 180 }} value={filterCustomer} onChange={e => setFilterCustomer(e.target.value)}>
            <option value="All">All Customers</option>
            {(customers || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>ROLE</label>
          <select style={{ ...inputStyle, width: 140 }} value={filterRole} onChange={e => setFilterRole(e.target.value)}>
            <option value="All">All Roles</option>
            {uniqueRoles.map(r => <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>)}
          </select>
        </div>
      </div>

      {msg && <div style={{ fontSize: 12, fontWeight: 700, color: msg.includes("fail") ? C.red : C.green, marginBottom: 10 }}>{msg}</div>}

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: C.muted }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: C.muted, fontSize: 13 }}>
          {contacts.length === 0 ? "No contacts saved yet. They're automatically created when you add POC, Site Manager, or Approver info to a work order or ticket." : "No contacts match your filters."}
        </div>
      ) : (
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <div style={{ minWidth: 600 }}>
              <div style={{ display: "grid", gridTemplateColumns: selectMode ? "36px 1fr 1fr 1.2fr 130px 1.2fr 90px 40px" : "1fr 1fr 1.2fr 130px 1.2fr 90px 40px", background: C.darkBlue, padding: "10px 14px" }}>
                {selectMode && <div />}
                {["FIRST NAME", "LAST NAME", "CUSTOMER", "PHONE", "EMAIL", "ROLE", ""].map(h => (
                  <div key={h} style={{ fontSize: 9, fontWeight: 800, color: C.white, letterSpacing: "0.08em" }}>{h}</div>
                ))}
              </div>
              {filtered.map((c, i) => {
                const nameParts = (c.name || "").split(" ");
                const firstName = nameParts[0] || "";
                const lastName = nameParts.slice(1).join(" ") || "";
                return (
                <div key={c.id} style={{
                  display: "grid", gridTemplateColumns: selectMode ? "36px 1fr 1fr 1.2fr 130px 1.2fr 90px 40px" : "1fr 1fr 1.2fr 130px 1.2fr 90px 40px",
                  padding: "8px 14px", borderBottom: `1px solid ${C.border}22`,
                  background: selected.has(c.id) ? "#e8f0fb" : i % 2 === 0 ? C.cardBg : C.steel,
                  cursor: isAdmin ? "pointer" : "default",
                  alignItems: "center",
                }}
                  onClick={() => selectMode ? toggleSelect(c.id) : isAdmin && openEdit(c)}
                  onMouseEnter={e => { if (!selectMode) e.currentTarget.style.background = "#e8f0fb"; }}
                  onMouseLeave={e => { if (!selectMode) e.currentTarget.style.background = selected.has(c.id) ? "#e8f0fb" : i % 2 === 0 ? C.cardBg : C.steel; }}>
                  {selectMode && (
                    <div><input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} style={{ width: 15, height: 15, accentColor: C.blue }} /></div>
                  )}
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{firstName}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{lastName}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{c.customer_name}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{c.phone || "—"}</div>
                  <div style={{ fontSize: 11, color: C.muted, overflow: "hidden", textOverflow: "ellipsis" }}>{c.email || "—"}</div>
                  <div><span style={{ fontSize: 8, fontWeight: 800, padding: "2px 6px", borderRadius: 3, background: C.steel, color: C.muted, letterSpacing: "0.04em" }}>{(ROLE_LABELS[c.role_tag] || c.role_tag || "").slice(0, 12)}</span></div>
                  <div>
                    {isAdmin && !selectMode && (
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }}
                        style={{ background: "transparent", border: "none", color: "#ccc", cursor: "pointer", fontSize: 14 }}
                        onMouseEnter={e => { e.currentTarget.style.color = C.red; }}
                        onMouseLeave={e => { e.currentTarget.style.color = "#ccc"; }}>🗑</button>
                    )}
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editContact && (
        <ModalWrap title="EDIT CONTACT" onClose={() => setEditContact(null)} width={420}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div><label style={labelStyle}>FIRST NAME</label><input style={inputStyle} value={eFirst} onChange={e => setEFirst(e.target.value)} autoFocus /></div>
            <div><label style={labelStyle}>LAST NAME</label><input style={inputStyle} value={eLast} onChange={e => setELast(e.target.value)} /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div><label style={labelStyle}>PHONE</label><input style={inputStyle} value={ePhone} onChange={e => setEPhone(e.target.value)} /></div>
            <div><label style={labelStyle}>EMAIL</label><input style={inputStyle} value={eEmail} onChange={e => setEEmail(e.target.value)} /></div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>ROLE</label>
            <select style={inputStyle} value={eRole} onChange={e => setERole(e.target.value)}>
              <option value="poc">Point of Contact</option>
              <option value="site_manager">Site Manager</option>
              <option value="approver">Approver</option>
              <option value="company_man">Company Man</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={handleSaveEdit}>SAVE</Btn>
            <Btn variant="ghost" onClick={() => setEditContact(null)}>CANCEL</Btn>
          </div>
        </ModalWrap>
      )}

      {/* Batch delete confirm */}
      {confirmDelete && (
        <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }} onClick={() => setConfirmDelete(false)}>
          <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderTop: `4px solid ${C.red}`, borderRadius: 8, padding: 28, width: 420, maxWidth: "90vw" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 10 }}>Delete {selected.size} Contact{selected.size !== 1 ? "s" : ""}?</div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 20, lineHeight: 1.6 }}>
              This will permanently remove the selected contacts. They can be re-created automatically the next time their info is entered on a work order or ticket.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn onClick={handleBatchDelete}>DELETE {selected.size}</Btn>
              <Btn variant="ghost" onClick={() => setConfirmDelete(false)}>CANCEL</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ContactsPage;
