import { C } from "./config.js";
import { ROLE_LABELS } from "./ContactsConstants.js";

// ─── ContactsTable (v28.153 — ship 4 of the ContactsPage split) ───────────
// The contacts grid: the loading + empty states and the scrollable
// grid-of-rows. Each row shows one merged contact (a person may carry
// multiple category records — see ContactsPage's merge logic), the
// category badges, and the per-row mark-inactive / hard-delete actions.
//
// Purely presentational — ContactsPage owns the data, the filters, the
// select mode, and every handler. The row click routes to select-toggle
// or edit depending on mode; the action buttons stopPropagation so they
// don't also trigger the row click.

function ContactsTable({ loading, filtered, merged, selectMode, isAdmin, isOwner, isSelected, toggleSelect, openEdit, handleRowSoftDelete, openHardDelete }) {
  if (loading) {
    return <div style={{ textAlign: "center", padding: 40, color: C.muted }}>Loading...</div>;
  }
  if (filtered.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: C.muted, fontSize: 13 }}>
        {merged.length === 0
          ? "No contacts saved yet. They're automatically created when you add POC, Site Manager, or Approver info to a work order or ticket."
          : "No contacts match your filters."}
      </div>
    );
  }

  return (
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
                  background: sel ? C.blueB : i % 2 === 0 ? C.cardBg : C.steel,
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
                  {inactive && <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 800, color: C.yellow, letterSpacing: "0.06em" }}>(INACTIVE)</span>}
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
                        e.currentTarget.style.color = C.yellow;
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
  );
}

export default ContactsTable;
