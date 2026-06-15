import { useState, useEffect, useMemo, useRef } from "react";
import { C, API_URL } from "./config.js";
import { Btn, inputStyle, labelStyle } from "./SharedUI.jsx";
import { useApp } from "./AppContext.jsx";
import { CATEGORY_OPTIONS } from "./ContactsConstants.js";
import ContactEditModal from "./ContactEditModal.jsx";
import ContactSoftDeleteModal from "./ContactSoftDeleteModal.jsx";
import ContactHardDeleteModal from "./ContactHardDeleteModal.jsx";
import ContactMergeModal from "./ContactMergeModal.jsx";
import ContactsTable from "./ContactsTable.jsx";

// ─── v28.78 — ContactsPage rebuilt for the migration-005 schema ──────────
// Uses the v28.76 dual-shape backend (writes go to BOTH legacy `phone` /
// `role_tag` AND new `phone_work` / `category` / `title` / ...) and the
// v28.77 lifecycle endpoints (soft-delete, hard-delete with reason, merge).
// Legacy `role_tag` values (site_manager, company_man) are still rendered
// in display where they appear on older rows, but the EDIT path writes
// only canonical values (poc / site_rep / approver / other).
//
// The category / title vocabulary + role-tag labels live in
// ContactsConstants.js (v28.150 — ship 1 of the ContactsPage split).

function ContactsPage() {
  const { customers, currentUser, can } = useApp();
  const isAdmin = can("edit_contacts");
  const isOwner = currentUser?.role === "owner";

  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  // v28.210 — bulk customer-contact import (xlsx). Header-name mapped on the BE.
  const importRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const handleImportContacts = async (file) => {
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch(`${API_URL}/customers/contacts/import`, { method: "POST", credentials: "include", body: fd });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        alert(`Import failed: ${data.error || r.status}`);
        return;
      }
      const errs = (data.errors || []).slice(0, 12).join("\n");
      alert(
        `Imported ${data.inserted} contact(s). Skipped ${data.skipped}.` +
          (data.errors?.length ? `\n\nIssues:\n${errs}${data.errors.length > 12 ? "\n…and more" : ""}` : ""),
      );
      if (data.inserted > 0) window.location.reload();
    } catch (e) {
      alert(`Import error: ${e.message}`);
    } finally {
      setImporting(false);
    }
  };
  const [filterCustomer, setFilterCustomer] = useState("All");
  const [filterCategory, setFilterCategory] = useState("All");
  const [showInactive, setShowInactive] = useState(false);

  const [editContact, setEditContact] = useState(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [confirmSoftDelete, setConfirmSoftDelete] = useState(false);
  const [confirmHardDelete, setConfirmHardDelete] = useState(null); // merged contact row, or null
  const [mergeModal, setMergeModal] = useState(null); // { a, b } or null
  const [msg, setMsg] = useState("");
  // hardDeleteReason, mergeKeeperId, mergeReason moved into their modals
  // (v28.152) — they're modal-local form state.

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

  // openEdit resolves a merged display row down to its first underlying
  // contact record — that record is the edit target. ContactEditModal
  // (v28.151) owns the form, the PUT, and the legacy-category
  // canonicalization on entry.
  const openEdit = (contactRow) => setEditContact(contactRow.rows ? contactRow.rows[0] : contactRow);

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

  // Hard-delete: owner only. Requires written reason. Opens confirm modal;
  // ContactHardDeleteModal (v28.152) owns the reason and passes it back.
  const openHardDelete = (mergedContact) => {
    if (!isOwner) return;
    setConfirmHardDelete(mergedContact);
  };

  const handleHardDeleteConfirm = async (rawReason) => {
    if (!confirmHardDelete) return;
    const reason = (rawReason || "").trim();
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
    setMergeModal(eligibleForMerge);
  };

  // ContactMergeModal (v28.152) owns the keeper choice + reason and passes
  // both back here.
  const handleMergeConfirm = async (keeperId, mergeReason) => {
    if (!mergeModal || !keeperId) return;
    const killedId = keeperId === mergeModal.a.id ? mergeModal.b.id : mergeModal.a.id;
    try {
      const r = await fetch(`${API_URL}/customers/contacts/merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keeper_id: keeperId, killed_id: killedId, reason: mergeReason || null }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setMsg(`Merge failed: ${j.error || r.statusText}`);
        return;
      }
      const result = await r.json();
      await fetchAll();
      setMergeModal(null);
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
        {isAdmin && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              ref={importRef}
              type="file"
              accept=".xlsx,.xls"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImportContacts(f);
                e.target.value = "";
              }}
            />
            <Btn variant="ghost" small onClick={() => importRef.current?.click()} disabled={importing}>
              {importing ? "IMPORTING…" : "IMPORT FROM SPREADSHEET"}
            </Btn>
          </div>
        )}
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

      {/* Contacts grid — extracted to ContactsTable (v28.153) */}
      <ContactsTable
        loading={loading}
        filtered={filtered}
        merged={merged}
        selectMode={selectMode}
        isAdmin={isAdmin}
        isOwner={isOwner}
        isSelected={isSelected}
        toggleSelect={toggleSelect}
        openEdit={openEdit}
        handleRowSoftDelete={handleRowSoftDelete}
        openHardDelete={openHardDelete}
      />

      {/* Edit modal — extracted to ContactEditModal (v28.151) */}
      {editContact && (
        <ContactEditModal
          contact={editContact}
          onClose={() => setEditContact(null)}
          onError={(m) => setMsg(m)}
          onSaved={async () => {
            await fetchAll();
            setEditContact(null);
            setMsg("Contact updated.");
            setTimeout(() => setMsg(""), 3000);
          }}
        />
      )}

      {/* Batch soft-delete confirm — extracted to ContactSoftDeleteModal (v28.152) */}
      {confirmSoftDelete && <ContactSoftDeleteModal count={selected.size} onConfirm={handleBatchSoftDelete} onClose={() => setConfirmSoftDelete(false)} />}

      {/* Hard-delete confirm (owner only) — extracted to ContactHardDeleteModal (v28.152) */}
      {confirmHardDelete && (
        <ContactHardDeleteModal contact={confirmHardDelete} onConfirm={handleHardDeleteConfirm} onClose={() => setConfirmHardDelete(null)} />
      )}

      {/* Merge modal — extracted to ContactMergeModal (v28.152) */}
      {mergeModal && <ContactMergeModal pair={mergeModal} onConfirm={handleMergeConfirm} onClose={() => setMergeModal(null)} />}
    </div>
  );
}

export default ContactsPage;
