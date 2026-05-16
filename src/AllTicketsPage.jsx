import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useIsMobile from "./useIsMobile.js";
import { C, API_URL } from "./config.js";
import { formatDate, updateTicketApi } from "./utils.js";
import { TicketTypeBadge, TICKET_TYPES, TICKET_STATUSES } from "./SharedUI.jsx";
import TicketDetail from "./TicketDetail.jsx";

function AllTicketsPage({ tickets, setTickets, jobs }) {
  const navigate = useNavigate();
  const isMobileNav = useIsMobile();
  const [viewTicket, setViewTicket] = useState(null);
  const [filterType, setFilterType] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterCustomer, setFilterCustomer] = useState("All");
  const [sortMode, setSortMode] = useState("date"); // "date" = newest first (default); "customer" = customer A→Z then date desc
  const [dragOrder, setDragOrder] = useState(null); // null = default sort order (drag overrides both date + customer modes)
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);

  // Exclude deleted/voided
  const activeTickets = tickets.filter((t) => !t.voidedAt && t.status !== "voided");

  // Apply filters
  const filtered = activeTickets.filter((t) => {
    if (filterType !== "All" && t.type !== filterType) return false;
    if (filterStatus !== "All") {
      const scfg = TICKET_STATUSES[t.status] || { color: C.muted, bg: C.steel, label: t.status };
      if (scfg?.label !== filterStatus && t.status !== filterStatus) return false;
    }
    if (filterCustomer !== "All") {
      const job = jobs.find((j) => j.id === t.jobId);
      if ((job?.customer || "Unknown") !== filterCustomer) return false;
    }
    return true;
  });

  // Sort: drag reorder wins when active; otherwise apply the selected sortMode.
  //  - "date"     → date desc (newest first)
  //  - "customer" → customer A→Z (from parent job), tiebreak on date desc
  const sorted = dragOrder
    ? dragOrder
        .filter((id) => filtered.some((t) => t.id === id))
        .map((id) => filtered.find((t) => t.id === id))
        .filter(Boolean)
    : [...filtered].sort((a, b) => {
        if (sortMode === "customer") {
          const custA = jobs.find((j) => j.id === a.jobId)?.customer || "";
          const custB = jobs.find((j) => j.id === b.jobId)?.customer || "";
          const cust = custA.localeCompare(custB);
          if (cust !== 0) return cust;
          return (b.date || "").localeCompare(a.date || "");
        }
        return (b.date || "").localeCompare(a.date || "");
      });

  // If filters change and we have a drag order, we keep it but it only shows filtered items
  const resetOrder = () => setDragOrder(null);

  // Simple drag-to-reorder
  const handleDragStart = (idx) => {
    if (!dragOrder) setDragOrder(sorted.map((t) => t.id));
    setDragIdx(idx);
  };
  const handleDragOver = (e, idx) => {
    e.preventDefault();
    setDragOverIdx(idx);
  };
  const handleDragEnd = () => {
    setDragIdx(null);
    setDragOverIdx(null);
  };
  const handleDrop = (idx) => {
    if (dragIdx === null) return;
    const order = dragOrder || sorted.map((t) => t.id);
    const newOrder = [...order];
    const [moved] = newOrder.splice(dragIdx, 1);
    newOrder.splice(idx, 0, moved);
    setDragOrder(newOrder);
    setDragIdx(null);
    setDragOverIdx(null);
  };

  // Unique customer list for filter
  const customerSet = new Set(
    activeTickets.map((t) => {
      const job = jobs.find((j) => j.id === t.jobId);
      return job?.customer || "Unknown";
    }),
  );
  const customerList = ["All", ...Array.from(customerSet).sort()];

  // Status labels for filter
  const statusLabels = [
    "All",
    ...Object.values(TICKET_STATUSES)
      .map((s) => s.label)
      .filter((v, i, a) => a.indexOf(v) === i),
  ];

  const typeKeys = ["All", ...Object.keys(TICKET_TYPES)];

  const handleUpdate = (id, updates) => updateTicketApi(id, updates, setTickets);

  const selStyle = { border: `1px solid ${C.border}`, borderRadius: 4, padding: "5px 8px", fontSize: 11, color: C.text, background: C.cardBg };

  return (
    <div style={{ padding: "16px 16px 24px" }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>All Tickets</h1>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
            {sorted.length} ticket{sorted.length !== 1 ? "s" : ""}
          </div>
        </div>
        {dragOrder && (
          <button
            onClick={resetOrder}
            style={{
              background: C.blue,
              color: C.white,
              border: "none",
              borderRadius: 4,
              padding: "7px 14px",
              fontSize: 11,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            RESET TO DATE ORDER
          </button>
        )}
      </div>

      {/* Filters — order: Sort (ordering control), Customer (primary entity), Type, Status (last) */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <select value={sortMode} onChange={(e) => setSortMode(e.target.value)} style={selStyle} title="Sort">
          <option value="date">Sort: Date (newest)</option>
          <option value="customer">Sort: Customer (A → Z)</option>
        </select>
        <select value={filterCustomer} onChange={(e) => setFilterCustomer(e.target.value)} style={selStyle}>
          {customerList.map((c) => (
            <option key={c} value={c}>
              {c === "All" ? "All Customers" : c}
            </option>
          ))}
        </select>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={selStyle}>
          {typeKeys.map((k) => (
            <option key={k} value={k}>
              {k === "All" ? "All Types" : TICKET_TYPES[k]?.label || k}
            </option>
          ))}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={selStyle}>
          {statusLabels.map((s) => (
            <option key={s} value={s}>
              {s === "All" ? "All Statuses" : s}
            </option>
          ))}
        </select>
      </div>

      {/* Ticket rows */}
      {sorted.length === 0 && <div style={{ textAlign: "center", padding: "60px 0", color: C.muted, fontSize: 14 }}>No tickets match your filters.</div>}
      {sorted.map((t, idx) => {
        const job = jobs.find((j) => j.id === t.jobId);
        const tcfg = TICKET_TYPES[t.type] || { color: C.muted, label: t.type };
        const scfg = TICKET_STATUSES[t.status] || { color: C.muted, bg: C.steel, label: t.status };
        const total = (t.lineItems || []).reduce((s, li) => s + (li.rate || 0) * (li.qty || 0) * (li.days || 1), 0);
        const isDragging = dragIdx === idx;
        const isDropTarget = dragOverIdx === idx && dragIdx !== null && dragIdx !== idx;
        return (
          <div key={t.id}>
            {isDropTarget && dragIdx > idx && <div style={{ height: 3, background: C.blue, borderRadius: 2, margin: "2px 0" }} />}
            <div
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
              onDrop={() => handleDrop(idx)}
              style={{
                background: isDragging ? "#e8f0fb" : C.cardBg,
                border: `1px solid ${isDragging ? C.blue : C.border}`,
                borderLeft: `3px solid ${tcfg.color}`,
                borderRadius: 5,
                marginBottom: 6,
                cursor: "grab",
                opacity: isDragging ? 0.5 : 1,
                transition: "transform 0.15s ease, opacity 0.15s ease",
                transform: isDropTarget ? "translateY(4px)" : "none",
              }}
            >
              <div
                onClick={() => (isMobileNav ? navigate(`/ticket/${t.id}`, { state: { ticket: t } }) : setViewTicket(t))}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", cursor: "pointer", flexWrap: "wrap" }}
              >
                <span style={{ fontSize: 15, color: "#bbb", cursor: "grab" }}>⠿</span>
                <TicketTypeBadge type={t.type} />
                <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>
                  #{t.jobId}
                  {t.ticketNumber ? `-${t.ticketNumber}` : ""}
                </span>
                <span style={{ fontSize: 12, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160 }}>
                  {job?.customer || "Unknown"}
                </span>
                <span style={{ fontSize: 11, color: C.muted }}>{formatDate(t.date)}</span>
                <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 3, background: scfg.bg, color: scfg.color }}>{scfg.label}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: C.green, marginLeft: "auto" }}>
                  {"$"}
                  {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
            {isDropTarget && dragIdx < idx && <div style={{ height: 3, background: C.blue, borderRadius: 2, margin: "2px 0" }} />}
          </div>
        );
      })}

      {/* TicketDetail modal */}
      {viewTicket && (
        <TicketDetail
          ticket={viewTicket}
          onUpdate={(id, updates) => {
            handleUpdate(id, updates);
            setViewTicket((prev) => (prev ? { ...prev, ...updates } : null));
          }}
          onClose={() => setViewTicket(null)}
          onDelete={async (id) => {
            try {
              await fetch(`${API_URL}/tickets/${id}`, { method: "DELETE" });
            } catch (err) {
              console.error("Delete failed:", err);
            }
            setTickets((prev) => prev.filter((t) => t.id !== id));
            setViewTicket(null);
          }}
          jobs={jobs}
        />
      )}
    </div>
  );
}

export default AllTicketsPage;
