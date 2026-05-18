import { useState, useEffect, useMemo } from "react";
import { C, API_URL } from "./config.js";
import { Btn, inputStyle, labelStyle, ModalWrap } from "./SharedUI.jsx";
import { useApp } from "./AppContext.jsx";

// ─── v28.78 — ContactsPage rebuilt for the migration-005 schema ──────────
// Uses the v28.76 dual-shape backend (writes go to BOTH legacy `phone` /
// `role_tag` AND new `phone_work` / `category` / `title` / ...) and the
// v28.77 lifecycle endpoints (soft-delete, hard-delete with reason, merge).
// Legacy `role_tag` values (site_manager, company_man) are still rendered
// in display where they appear on older rows, but the EDIT path writes
// only canonical values (poc / site_rep / approver / other).

// Category enum drives the dropdown and the picker filters. Site Manager,
// Company Man, DSM, etc. all map to "site_rep" per v28.72 canonical
// (operator-specific terminology lives in the title / title_other fields,
// not in the category field).
const CATEGORY_OPTIONS = [
  { value: "poc", label: "Point of Contact" },
  { value: "site_rep", label: "Site Rep (Site Mgr / Co Man / DSM)" },
  { value: "approver", label: "Approver" },
  { value: "other", label: "Other" },
];

// Title enum — the controlled vocabulary that drives display + metrics.
// Operator-specific terms (Night DSM, Co Man, Customer Liaison) go in
// title_other when title = "Other".
const TITLE_OPTIONS = ["Site Manager", "Field Superintendent", "Superintendent", "Operations Manager", "Engineer", "Other"];

// Display labels for both canonical and legacy role_tag values. Old rows
// pre-v28.72 may still carry site_manager / company_man until they get
// edited once (which canonicalizes them).
const ROLE_LABELS = {
  poc: "POC",
  site_rep: "SITE REP",
  site_manager: "SITE MGR (LEGACY)",
  company_man: "CO MAN (LEGACY)",
  approver: "APPROVER",
  other: "OTHER",
};

function categoryLabel(c) {
  return ROLE_LABELS[c?.category || c?.role_tag] || c?.category || c?.role_tag || "—";
}

function ContactsPage() {
  const { customers, currentUser, can } = useApp();
  const isAdmin = can("edit_contacts");
  const isOwner = currentUser?.role === "owner";

  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCustomer, setFilterCustomer] = useState("All");
  const [filterCategory, setFilterCategory] = useState("All");
  const [showInactive, setShowInactive] = useState(false);

  const [editContact, setEditContact] = useState(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [confirmSoftDelete, setConfirmSoftDelete] = useState(false);
  const [confirmHardDelete, setConfirmHardDelete] = useState(null); // { contact } or null
  const [hardDeleteReason, setHardDeleteReason] = useState("");
  const [mergeModal, setMergeModal] = useState(null); // { a, b } or null
  const [mergeKeeperId, setMergeKeeperId] = useState(null);
  const [mergeReason, setMergeReason] = useState("");
  const [msg, setMsg] = useState("");

  // Edit form fields (v28.78 — full new-schema shape)
  const [eFirst, setEFirst] = useState("");
  const [eLast, setELast] = useState("");
  const [ePhoneWork, setEPhoneWork] = useState("");
  const [ePhonePersonal, setEPhonePersonal] = useState("");
  const [eEmail, setEEmail] = useState("");
  const [eCategory, setECategory] = useState("poc");
  const [eTitle, setETitle] = useState("");
  const [eTitleOther, setETitleOther] = useState("");
  const [eNotes, setENotes] = useState("");

  const [winW, setWinW] = useState(window.innerWidth);
  useEffect(() => {
    const h = () => setWinW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  const isMob = winW < 900;

  const fetchAll = async () => {
    try {
      // Fetch contacts for all customers in parallel. include_inactive=true
      // surfaces soft-deleted rows so admins can review or restore them
      // via the merge-keeper path (no explicit restore endpoint in v28.77;
      // a future ship can add one if needed).
      const results = await Promise.all(
        (customers || []).map((c) =>
          fetch(`${API_URL}/customers/${c.id}/contacts?include_inactive=true`)
            .then((r) => (r.ok ? r.json() : []))
            .then((contacts) => contacts.map((ct) => ({ ...ct, customer_name: c.name }))),
        ),
      );
      setContacts(results.flat());
    } catch {
      setContacts([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (customers?.length) fetchAll();
    else setLoading(false);
  }, [customers]);

  // Group contacts by (lower(name), customer_id) so multi-category records
  // for the same person collapse into one display row. is_active is treated
  // pessimistically — if ANY underlying record is inactive, the row shows
  // inactive in the badges.
  const merged = useMemo(() => {
    const map = new Map();
    for (const c of contacts) {
      const key = `${(c.name || "").toLowerCase().trim()}::${c.customer_id}`;
      if (map.has(key)) {
        const existing = map.get(key);
        existing.rows.push(c);
        if (!existing.phone_work && c.phone_work) existing.phone_work = c.phone_work;
        if (!existing.phone_personal && c.phone_personal) existing.phone_personal = c.phone_personal;
        if (!existing.email && c.email) existing.email = c.email;
        if (c.is_active === false) existing.any_inactive = true;
      } else {
        map.set(key, { ...c, rows: [c], any_inactive: c.is_active === false });
      }
    }
    return Array.from(map.values());
  }, [contacts]);

  // Apply filters AFTER merging so showing/hiding inactive operates at the
  // grouped-row level rather than per-row.
  const filtered = useMemo(() => {
    let list = [...merged];
    if (!showInactive) list = list.filter((c) => !c.any_inactive);
    if (filterCustomer !== "All") list = list.filter((c) => c.customer_id === filterCustomer);
    if (filterCategory !== "All") {
      list = list.filter((c) => c.rows.some((r) => (r.category || r.role_tag) === filterCategory));
    }
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(
        (c) =>
          (c.name || "").toLowerCase().includes(s) ||
          (c.customer_name || "").toLowerCase().includes(s) ||
          (c.phone_work || c.phone || "").includes(s) ||
          (c.phone_personal || "").includes(s) ||
          (c.email || "").toLowerCase().includes(s),
      );
    }
    return list.sort((a, b) => (a.customer_name || "").localeCompare(b.customer_name || "") || (a.name || "").localeCompare(b.name || ""));
  }, [merged, filterCustomer, filterCategory, search, showInactive]);

  const openEdit = (contactRow) => {
    // contactRow is a merged row; use its first underlying record as the edit target
    const c = contactRow.rows ? contactRow.rows[0] : contactRow;
    const parts = (c.name || "").split(" ");
    setEFirst(parts[0] || "");
    setELast(parts.slice(1).join(" ") || "");
    setEPhoneWork(c.phone_work || c.phone || "");
    setEPhonePersonal(c.phone_personal || "");
    setEEmail(c.email || "");
    setECategory(c.category || c.role_tag || "poc");
    // If category is a legacy value, canonicalize on entry so the dropdown shows valid option
    if (["site_manager", "company_man"].includes(c.category || c.role_tag)) {
      setECategory("site_rep");
    }
    setETitle(c.title || "");
    setETitleOther(c.title_other || "");
    setENotes(c.notes || "");
    setEditContact(c);
  };

  const handleSaveEdit = async () => {
    if (!eFirst.trim()) return;
    const fullName = [eFirst.trim(), eLast.trim()].filter(Boolean).join(" ");
    try {
      const r = await fetch(`${API_URL}/customers/contacts/${editContact.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fullName,
          phone_work: ePhoneWork || null,
          phone_personal: ePhonePersonal || null,
          email: eEmail || null,
          category: eCategory,
          title: eTitle || null,
          title_other: eTitle === "Other" ? eTitleOther || null : null,
          notes: eNotes || null,
        }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setMsg(`Update failed: ${j.error || r.statusText}`);
        return;
      }
      await fetchAll();
      setEditContact(null);
      setMsg("Contact updated.");
      setTimeout(() => setMsg(""), 3000);
    } catch (err) {
      setMsg(`Update failed: ${err.message}`);
    }
  };

  // Soft-delete: any auth user. Single-row.
  const handleSoftDeleteOne = async (id, reason = null) => {
    const r = await fetch(`${API_URL}/customers/contacts/${id}/soft-delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason || null }),
    });
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Soft-delete failed");
    return r.json();
  };

  // Batch soft-delete from selectMode
  const handleBatchSoftDelete = async () => {
    const ids = [...selected];
    let ok = 0;
    let fail = 0;
    for (const id of ids) {
      try {
        await handleSoftDeleteOne(id);
        ok++;
      } catch {
        fail++;
      }
    }
    await fetchAll();
    setSelected(new Set());
    setSelectMode(false);
    setConfirmSoftDelete(false);
    setMsg(`Marked ${ok} inactive${fail ? `, ${fail} failed` : ""}.`);
    setTimeout(() => setMsg(""), 3000);
  };

  // Row-level soft-delete (trash icon on each row)
  const handleRowSoftDelete = async (mergedContact) => {
    const ids = mergedContact.rows.map((r) => r.id);
    for (const id of ids) {
      try {
        await handleSoftDeleteOne(id);
      } catch {
        // ignore individual failures; UI message comes from the aggregate
      }
    }
    await fetchAll();
    setMsg(`Marked ${mergedContact.name} inactive.`);
    setTimeout(() => setMsg(""), 3000);
  };

  // Hard-delete: owner only. Requires written reason. Opens confirm modal.
  const openHardDelete = (mergedContact) => {
    if (!isOwner) return;
    setHardDeleteReason("");
    setConfirmHardDelete(mergedContact);
  };

  const handleHardDeleteConfirm = async () => {
    if (!confirmHardDelete) return;
    const reason = hardDeleteReason.trim();
    if (!reason) {
      setMsg("Reason is required for permanent deletion.");
      return;
    }
    const ids = confirmHardDelete.rows.map((r) => r.id);
    let ok = 0;
    let fail = 0;
    for (const id of ids) {
      try {
        const r = await fetch(`${API_URL}/customers/contacts/${id}/hard-delete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason }),
        });
        if (r.ok) ok++;
        else fail++;
      } catch {
        fail++;
      }
    }
    await fetchAll();
    setConfirmHardDelete(null);
    setHardDeleteReason("");
    setMsg(`Permanently deleted ${ok} row${ok !== 1 ? "s" : ""}${fail ? `, ${fail} failed` : ""}.`);
    setTimeout(() => setMsg(""), 4000);
  };

  // Merge: admin/owner only. Opens when exactly 2 contacts selected and the
  // selection spans 2 separate underlying rows that share the same customer.
  const eligibleForMerge = useMemo(() => {
    if (!isAdmin) return null;
    const ids = [...selected];
    if (ids.length !== 2) return null;
    const a = contacts.find((c) => c.id === ids[0]);
    const b = contacts.find((c) => c.id === ids[1]);
    if (!a || !b) return null;
    if (a.customer_id !== b.customer_id) return null;
    return { a, b };
  }, [selected, contacts, isAdmin]);

  const openMerge = () => {
    if (!eligibleForMerge) return;
    setMergeKeeperId(eligibleForMerge.a.id);
    setMergeReason("");
    setMergeModal(eligibleForMerge);
  };

  const handleMergeConfirm = async () => {
    if (!mergeModal || !mergeKeeperId) return;
    const killedId = mergeKeeperId === mergeModal.a.id ? mergeModal.b.id : mergeModal.a.id;
    try {
      const r = await fetch(`${API_URL}/customers/contacts/merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keeper_id: mergeKeeperId, killed_id: killedId, reason: mergeReason || null }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setMsg(`Merge failed: ${j.error || r.statusText}`);
        return;
      }
      const result = await r.json();
      await fetchAll();
      setMergeModal(null);
      setMergeKeeperId(null);
      setMergeReason("");
      setSelected(new Set());
      setSelectMode(false);
      const carried = result.carried_fields?.length ? ` (carried: ${result.carried_fields.join(", ")})` : "";
      setMsg(`Merged successfully${carried}.`);
      setTimeout(() => setMsg(""), 4000);
    } catch (err) {
      setMsg(`Merge failed: ${err.message}`);
    }
  };

  // Selection helpers for select mode. A merged row may correspond to multiple
  // underlying contact_ids; selecting toggles ALL of them.
  const toggleSelect = (mergedContact) => {
    const ids = mergedContact.rows.map((r) => r.id);
    setSelected((prev) => {
      const n = new Set(prev);
      const allSelected = ids.every((id) => n.has(id));
      if (allSelected) ids.forEach((id) => n.delete(id));
      else ids.forEach((id) => n.add(id));
      return n;
    });
  };
  const isSelected = (mergedContact) => mergedContact.rows.every((r) => selected.has(r.id));

  return (
    <div style={{ padding: isMob ? "16px 12px" : "24px 28px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Contacts</h1>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
            {merged.length} contact{merged.length !== 1 ? "s" : ""} across {new Set(merged.map((c) => c.customer_id)).size} customer
            {new Set(merged.map((c) => c.customer_id)).size !== 1 ? "s" : ""}
            {showInactive && (
              <span>
                {" · "}including {merged.filter((c) => c.any_inactive).length} inactive
              </span>
            )}
          </div>
        </div>
        {isAdmin && merged.length > 0 && (
          <div style={{ display: "flex", gap: 8 }}>
            {!selectMode ? (
              <Btn variant="ghost" small onClick={() => setSelectMode(true)}>
                SELECT
              </Btn>
            ) : (
              <>
                {eligibleForMerge && (
                  <button
                    type="button"
                    onClick={openMerge}
                    style={{
                      background: C.blue,
                      color: C.white,
                      border: "none",
                      borderRadius: 4,
                      padding: "6px 14px",
                      fontSize: 11,
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    MERGE
                  </button>
                )}
                <button
                  type="button"
                  disabled={selected.size === 0}
                  onClick={() => setConfirmSoftDelete(true)}
                  style={{
                    background: selected.size === 0 ? C.steel : "#8a6500",
                    color: selected.size === 0 ? C.muted : C.white,
                    border: "none",
                    borderRadius: 4,
                    padding: "6px 14px",
                    fontSize: 11,
                    fontWeight: 800,
                    cursor: selected.size === 0 ? "not-allowed" : "pointer",
                  }}
                >
                  MARK INACTIVE ({selected.size})
                </button>
                <Btn
                  variant="ghost"
                  small
                  onClick={() => {
                    setSelectMode(false);
                    setSelected(new Set());
                  }}
                >
                  CANCEL
                </Btn>
              </>
            )}
          </div>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ flex: 1, minWidth: 160 }}>
          <label style={labelStyle}>SEARCH</label>
          <input style={inputStyle} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, company, phone, email..." />
        </div>
        <div>
          <label style={labelStyle}>CUSTOMER</label>
          <select style={{ ...inputStyle, width: 180 }} value={filterCustomer} onChange={(e) => setFilterCustomer(e.target.value)}>
            <option value="All">All Customers</option>
            {(customers || []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>CATEGORY</label>
          <select style={{ ...inputStyle, width: 200 }} value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="All">All Categories</option>
            {CATEGORY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} style={{ accentColor: C.blue }} /> Show inactive
          </label>
        </div>
      </div>

      {msg && <div style={{ fontSize: 12, fontWeight: 700, color: msg.toLowerCase().includes("fail") ? C.red : C.green, marginBottom: 10 }}>{msg}</div>}

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: C.muted }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: C.muted, fontSize: 13 }}>
          {merged.length === 0
            ? "No contacts saved yet. They're automatically created when you add POC, Site Manager, or Approver info to a work order or ticket."
            : "No contacts match your filters."}
        </div>
      ) : (
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <div style={{ minWidth: 720 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: selectMode ? "36px 1fr 1fr 1.2fr 130px 130px 1.2fr 1.1fr 56px" : "1fr 1fr 1.2fr 130px 130px 1.2fr 1.1fr 56px",
                  background: C.darkBlue,
                  padding: "10px 14px",
                }}
              >
                {selectMode && <div />}
                {["FIRST", "LAST", "CUSTOMER", "WORK PHONE", "PERSONAL", "EMAIL", "CATEGORY", ""].map((h) => (
                  <div key={h} style={{ fontSize: 9, fontWeight: 800, color: C.white, letterSpacing: "0.08em" }}>
                    {h}
                  </div>
                ))}
              </div>
              {filtered.map((c, i) => {
                const nameParts = (c.name || "").split(" ");
                const firstName = nameParts[0] || "";
                const lastName = nameParts.slice(1).join(" ") || "";
                const sel = isSelected(c);
                const inactive = c.any_inactive;
                return (
                  <div
                    key={c.rows.map((r) => r.id).join("-")}
                    style={{
                      display: "grid",
                      gridTemplateColumns: selectMode ? "36px 1fr 1fr 1.2fr 130px 130px 1.2fr 1.1fr 56px" : "1fr 1fr 1.2fr 130px 130px 1.2fr 1.1fr 56px",
                      padding: "8px 14px",
                      borderBottom: `1px solid ${C.border}22`,
                      background: sel ? "#e8f0fb" : i % 2 === 0 ? C.cardBg : C.steel,
                      cursor: isAdmin ? "pointer" : "default",
                      alignItems: "center",
                      opacity: inactive ? 0.55 : 1,
                    }}
                    onClick={() => (selectMode ? toggleSelect(c) : isAdmin && openEdit(c))}
                  >
                    {selectMode && (
                      <div>
                        <input
                          type="checkbox"
                          checked={sel}
                          onChange={() => toggleSelect(c)}
                          style={{ width: 15, height: 15, accentColor: C.blue }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    )}
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                      {firstName}
                      {inactive && <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 800, color: "#8a6500", letterSpacing: "0.06em" }}>(INACTIVE)</span>}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{lastName}</div>
                    <div style={{ fontSize: 12, color: C.muted }}>{c.customer_name}</div>
                    <div style={{ fontSize: 12, color: C.muted }}>{c.phone_work || c.phone || "—"}</div>
                    <div style={{ fontSize: 12, color: C.muted }}>{c.phone_personal || "—"}</div>
                    <div style={{ fontSize: 11, color: C.muted, overflow: "hidden", textOverflow: "ellipsis" }}>{c.email || "—"}</div>
                    <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                      {[...new Set(c.rows.map((r) => r.category || r.role_tag))].map((cat) => (
                        <span
                          key={cat}
                          style={{
                            fontSize: 8,
                            fontWeight: 800,
                            padding: "2px 5px",
                            borderRadius: 3,
                            background: C.steel,
                            color: C.muted,
                            letterSpacing: "0.04em",
                          }}
                        >
                          {(ROLE_LABELS[cat] || cat || "").slice(0, 16)}
                        </span>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                      {isAdmin && !selectMode && !inactive && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRowSoftDelete(c);
                          }}
                          title="Mark inactive (reversible)"
                          style={{ background: "transparent", border: "none", color: "#ccc", cursor: "pointer", fontSize: 14 }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = "#8a6500";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = "#ccc";
                          }}
                        >
                          🚫
                        </button>
                      )}
                      {isOwner && !selectMode && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openHardDelete(c);
                          }}
                          title="Permanently delete (owner only)"
                          style={{ background: "transparent", border: "none", color: "#ccc", cursor: "pointer", fontSize: 14 }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = C.red;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = "#ccc";
                          }}
                        >
                          🗑
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Edit modal — full new-schema shape */}
      {editContact && (
        <ModalWrap title="EDIT CONTACT" onClose={() => setEditContact(null)} width={480}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div>
              <label style={labelStyle}>FIRST NAME</label>
              <input style={inputStyle} value={eFirst} onChange={(e) => setEFirst(e.target.value)} autoFocus />
            </div>
            <div>
              <label style={labelStyle}>LAST NAME</label>
              <input style={inputStyle} value={eLast} onChange={(e) => setELast(e.target.value)} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div>
              <label style={labelStyle}>WORK PHONE</label>
              <input style={inputStyle} value={ePhoneWork} onChange={(e) => setEPhoneWork(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>PERSONAL PHONE</label>
              <input style={inputStyle} value={ePhonePersonal} onChange={(e) => setEPhonePersonal(e.target.value)} />
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>EMAIL</label>
            <input style={inputStyle} value={eEmail} onChange={(e) => setEEmail(e.target.value)} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div>
              <label style={labelStyle}>CATEGORY</label>
              <select style={inputStyle} value={eCategory} onChange={(e) => setECategory(e.target.value)}>
                {CATEGORY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>TITLE</label>
              <select style={inputStyle} value={eTitle} onChange={(e) => setETitle(e.target.value)}>
                <option value="">— None —</option>
                {TITLE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {eTitle === "Other" && (
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>TITLE (SPECIFY)</label>
              <input style={inputStyle} value={eTitleOther} onChange={(e) => setETitleOther(e.target.value)} placeholder="e.g., Night DSM, Customer Liaison" />
            </div>
          )}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>NOTES</label>
            <textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={eNotes} onChange={(e) => setENotes(e.target.value)} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={handleSaveEdit}>SAVE</Btn>
            <Btn variant="ghost" onClick={() => setEditContact(null)}>
              CANCEL
            </Btn>
          </div>
        </ModalWrap>
      )}

      {/* Batch soft-delete confirm */}
      {confirmSoftDelete && (
        <div
          style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}
          onClick={() => setConfirmSoftDelete(false)}
        >
          <div
            style={{
              background: C.cardBg,
              border: `1px solid ${C.border}`,
              borderTop: `4px solid #8a6500`,
              borderRadius: 8,
              padding: 28,
              width: 460,
              maxWidth: "90vw",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 10 }}>
              Mark {selected.size} contact{selected.size !== 1 ? "s" : ""} inactive?
            </div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 20, lineHeight: 1.6 }}>
              Inactive contacts are hidden from pickers but preserved in historical references on tickets and audit rows. Reversible — toggle "Show inactive" to
              view them later.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn onClick={handleBatchSoftDelete}>MARK {selected.size} INACTIVE</Btn>
              <Btn variant="ghost" onClick={() => setConfirmSoftDelete(false)}>
                CANCEL
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* Hard-delete confirm (owner only) */}
      {confirmHardDelete && (
        <div
          style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}
          onClick={() => setConfirmHardDelete(null)}
        >
          <div
            style={{
              background: C.cardBg,
              border: `1px solid ${C.border}`,
              borderTop: `4px solid ${C.red}`,
              borderRadius: 8,
              padding: 28,
              width: 480,
              maxWidth: "90vw",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 10 }}>Permanently delete {confirmHardDelete.name}?</div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 14, lineHeight: 1.6 }}>
              This is irreversible. The contact row is removed from the database. The audit log retains the deletion record forever — including the reason
              below. Use "Mark inactive" if you might need to restore later.
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>REASON (required)</label>
              <textarea
                style={{ ...inputStyle, minHeight: 60, resize: "vertical" }}
                value={hardDeleteReason}
                onChange={(e) => setHardDeleteReason(e.target.value)}
                placeholder="Why is this contact being permanently deleted?"
                autoFocus
              />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={handleHardDeleteConfirm}
                disabled={!hardDeleteReason.trim()}
                style={{
                  background: hardDeleteReason.trim() ? C.red : C.steel,
                  color: hardDeleteReason.trim() ? C.white : C.muted,
                  border: "none",
                  borderRadius: 4,
                  padding: "8px 16px",
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: hardDeleteReason.trim() ? "pointer" : "not-allowed",
                  letterSpacing: "0.06em",
                }}
              >
                PERMANENTLY DELETE
              </button>
              <Btn variant="ghost" onClick={() => setConfirmHardDelete(null)}>
                CANCEL
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* Merge modal */}
      {mergeModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}
          onClick={() => setMergeModal(null)}
        >
          <div
            style={{
              background: C.cardBg,
              border: `1px solid ${C.border}`,
              borderTop: `4px solid ${C.blue}`,
              borderRadius: 8,
              padding: 28,
              width: 540,
              maxWidth: "90vw",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 10 }}>Merge contacts</div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 16, lineHeight: 1.6 }}>
              Pick which contact is the keeper. Non-empty fields from the other will be carried over where the keeper is empty. The keeper's name and category
              are preserved. The non-keeper is marked inactive.
            </div>
            {[mergeModal.a, mergeModal.b].map((c) => (
              <label
                key={c.id}
                style={{
                  display: "block",
                  border: `2px solid ${mergeKeeperId === c.id ? C.blue : C.border}`,
                  borderRadius: 6,
                  padding: 12,
                  marginBottom: 10,
                  cursor: "pointer",
                  background: mergeKeeperId === c.id ? "#e8f0fb" : C.cardBg,
                }}
              >
                <input
                  type="radio"
                  name="keeper"
                  checked={mergeKeeperId === c.id}
                  onChange={() => setMergeKeeperId(c.id)}
                  style={{ marginRight: 10, accentColor: C.blue }}
                />
                <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
                  {c.name} <span style={{ fontSize: 11, fontWeight: 500, color: C.muted }}>({categoryLabel(c)})</span>
                </span>
                <div style={{ fontSize: 12, color: C.muted, marginLeft: 24, marginTop: 4 }}>
                  {c.phone_work || c.phone || "no phone"} · {c.email || "no email"} · {c.title || "no title"}
                </div>
              </label>
            ))}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>REASON (optional)</label>
              <input
                style={inputStyle}
                value={mergeReason}
                onChange={(e) => setMergeReason(e.target.value)}
                placeholder="e.g., Duplicate from typo at job setup"
              />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn onClick={handleMergeConfirm}>CONFIRM MERGE</Btn>
              <Btn variant="ghost" onClick={() => setMergeModal(null)}>
                CANCEL
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ContactsPage;
