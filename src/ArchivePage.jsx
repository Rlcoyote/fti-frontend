import { useState, useEffect } from "react";
import { C, API_URL } from "./config.js";
import { formatDate } from "./utils.js";
import { TICKET_TYPES } from "./SharedUI.jsx";

function ArchivePage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("All");
  const [filterReason, setFilterReason] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const params = new URLSearchParams();
        if (filterType !== "All") params.set("entity_type", filterType);
        if (filterReason !== "All") params.set("reason", filterReason);
        if (searchTerm) params.set("search", searchTerm);
        const r = await fetch(`${API_URL}/archive?${params}`);
        if (r.ok) setItems(await r.json());
      } catch (err) {
        console.error("Archive load failed:", err);
      }
      setLoading(false);
    };
    load();
  }, [filterType, filterReason, searchTerm]);

  const selStyle = { border: `1px solid ${C.border}`, borderRadius: 4, padding: "4px 8px", fontSize: 12, color: C.text, background: C.cardBg };

  return (
    <div style={{ padding: "24px 28px" }}>
      <h1 style={{ margin: "0 0 16px", fontSize: 22, fontWeight: 700 }}>Archive</h1>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>Permanent records. Archived items cannot be edited or restored.</div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={selStyle}>
          <option value="All">All Types</option>
          <option value="ticket">Tickets</option>
          <option value="job">Work Orders</option>
        </select>
        <select value={filterReason} onChange={(e) => setFilterReason(e.target.value)} style={selStyle}>
          <option value="All">All Reasons</option>
          <option value="voided">Voided</option>
          <option value="deleted">Deleted</option>
          <option value="job_closed">Work Order Closed</option>
          <option value="manual">Manual</option>
        </select>
        <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ ...selStyle, width: 200 }} />
        <span style={{ fontSize: 11, color: C.muted }}>
          {items.length} record{items.length !== 1 ? "s" : ""}
        </span>
      </div>

      {loading && <div style={{ textAlign: "center", padding: 40, color: C.muted }}>Loading archive...</div>}
      {!loading && items.length === 0 && <div style={{ textAlign: "center", padding: 60, color: C.muted, fontSize: 14 }}>No archived items.</div>}

      {items.map((item) => {
        const snap = typeof item.data_snapshot === "string" ? JSON.parse(item.data_snapshot) : item.data_snapshot;
        const liSnap = item.line_items_snapshot
          ? typeof item.line_items_snapshot === "string"
            ? JSON.parse(item.line_items_snapshot)
            : item.line_items_snapshot
          : [];
        const sigSnap = item.signature_snapshot
          ? typeof item.signature_snapshot === "string"
            ? JSON.parse(item.signature_snapshot)
            : item.signature_snapshot
          : null;
        const isExp = expanded === item.id;
        const typeCfg = TICKET_TYPES[snap.type] || { color: C.muted, label: snap.type || "—" };

        return (
          <div
            key={item.id}
            onClick={() => setExpanded(isExp ? null : item.id)}
            style={{
              background: C.cardBg,
              border: `1px solid ${C.border}`,
              borderLeft: `3px solid ${item.entity_type === "ticket" ? typeCfg.color : C.blue}`,
              borderRadius: 5,
              marginBottom: 6,
              cursor: "pointer",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", flexWrap: "wrap" }}>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 800,
                  padding: "2px 6px",
                  borderRadius: 3,
                  background: item.entity_type === "ticket" ? C.redB : C.blueB,
                  color: item.entity_type === "ticket" ? C.red : C.blue,
                  letterSpacing: "0.06em",
                }}
              >
                {item.entity_type.toUpperCase()}
              </span>
              {item.entity_type === "ticket" && (
                <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 3, background: typeCfg.bg || C.steel, color: typeCfg.color }}>
                  {typeCfg.label}
                </span>
              )}
              <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>
                #{item.job_id || snap.job_id || snap.id}
                {snap.ticket_number ? `-${snap.ticket_number}` : ""}
              </span>
              <span style={{ fontSize: 11, color: C.muted }}>{snap.customer || ""}</span>
              <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 3, background: C.yellowB, color: C.yellow }}>
                {(item.archive_reason || "").toUpperCase()}
              </span>
              <span style={{ fontSize: 10, color: C.muted, marginLeft: "auto" }}>{new Date(item.archived_at).toLocaleDateString("en-US")}</span>
              <span style={{ fontSize: 12, color: C.muted }}>{isExp ? "▲" : "▼"}</span>
            </div>

            {isExp && (
              <div style={{ padding: "0 14px 14px", borderTop: `1px solid ${C.border}` }} onClick={(e) => e.stopPropagation()}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 20px", marginTop: 10, fontSize: 12 }}>
                  {snap.date && (
                    <div>
                      <span style={{ color: C.muted }}>Date: </span>
                      {formatDate(snap.date)}
                    </div>
                  )}
                  {snap.customer && (
                    <div>
                      <span style={{ color: C.muted }}>Customer: </span>
                      {snap.customer}
                    </div>
                  )}
                  {snap.location && (
                    <div>
                      <span style={{ color: C.muted }}>Location: </span>
                      {snap.location}
                    </div>
                  )}
                  {snap.status && (
                    <div>
                      <span style={{ color: C.muted }}>Status at archive: </span>
                      {snap.status}
                    </div>
                  )}
                  {item.notes && (
                    <div>
                      <span style={{ color: C.muted }}>Notes: </span>
                      {item.notes}
                    </div>
                  )}
                </div>

                {/* Line items */}
                {liSnap.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, letterSpacing: "0.08em", marginBottom: 4 }}>LINE ITEMS</div>
                    {liSnap.map((li, idx) => (
                      <div
                        key={idx}
                        style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "2px 0", borderBottom: `1px solid ${C.border}22` }}
                      >
                        <span style={{ color: C.text }}>{li.qb_code || li.description || "—"}</span>
                        <span style={{ color: C.green, fontWeight: 700 }}>
                          {"$"}
                          {((li.rate || 0) * (li.qty || 0) * (li.days || 1)).toFixed(2)}
                        </span>
                      </div>
                    ))}
                    <div style={{ display: "flex", justifyContent: "flex-end", fontSize: 12, fontWeight: 800, color: C.green, marginTop: 4 }}>
                      {"$"}
                      {liSnap.reduce((s, li) => s + (li.rate || 0) * (li.qty || 0) * (li.days || 1), 0).toFixed(2)}
                    </div>
                  </div>
                )}

                {/* Signature */}
                {sigSnap && sigSnap.signed_by && (
                  <div style={{ marginTop: 10, background: C.greenB, border: `1px solid ${C.green}44`, borderRadius: 6, padding: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.green }}>✓ SIGNED — {sigSnap.signed_by}</div>
                    {sigSnap.signed_at && (
                      <div style={{ fontSize: 10, color: C.muted }}>
                        {new Date(sigSnap.signed_at).toLocaleString("en-US", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </div>
                    )}
                    {sigSnap.signature_img && (
                      <img
                        src={sigSnap.signature_img}
                        alt="Signature"
                        style={{
                          maxWidth: 200,
                          height: 50,
                          display: "block",
                          marginTop: 6,
                          border: `1px solid ${C.border}`,
                          borderRadius: 4,
                          background: C.white,
                        }}
                      />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default ArchivePage;
