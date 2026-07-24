import { useRef, useEffect, useState } from "react";
import { C, API_URL } from "./config.js";
import { Btn } from "./SharedUI.jsx";
import WorkOrderCard from "./WorkOrderCard.jsx";
import { DASHBOARD_TOUR_EVENT } from "./TutorialPage.jsx";
import { useApp } from "./AppContext.jsx";

function DashboardHome({
  jobs,
  activeWorkOrders,
  sortedWorkOrders,
  sortMode,
  setSortMode,
  myActiveTodos,
  tickets,
  setTickets,
  todos,
  setTodos,
  expandedId,
  setExpandedId,
  pendingByJob,
  navigateToJob,
  navigateToPage,
  setShowNewJob,
  handleUpdateJob,
  handleDeleteJob,
  handleFlagCancel,
  handleCloseJob,
  setDeletedTickets,
  jsas,
  setJsas,
}) {
  // v28.419 — tutorial first-run nudge (per device)
  const [tutNudge, setTutNudge] = useState(() => !localStorage.getItem("fti_tut_seen"));
  const dismissTutNudge = () => {
    localStorage.setItem("fti_tut_seen", "1");
    setTutNudge(false);
  };
  // v28.394 — a search result ("/?wo=") lands ON the record: when the
  // expanded WO changes, scroll its card into view instead of leaving the
  // user at the top of the list ("it doesn't jump to that location").
  const expandedCardRef = useRef(null);
  useEffect(() => {
    if (expandedId && expandedCardRef.current) {
      expandedCardRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [expandedId]);

  const { currentUser } = useApp();
  // v28.47 — Tier 2: log WO_viewed events when a user expands a WO. Once
  // per WO per session — re-expanding the same WO repeatedly is noise we
  // don't want filling the activity log. The set lives in a ref so it
  // survives re-renders but resets on full reload (new session).
  const woViewedRef = useRef(new Set());
  const handleWoToggle = (workOrderId) => {
    const isExpanding = expandedId !== workOrderId;
    setExpandedId(expandedId === workOrderId ? null : workOrderId);
    if (isExpanding && currentUser && !woViewedRef.current.has(workOrderId)) {
      woViewedRef.current.add(workOrderId);
      const job = sortedWorkOrders.find((j) => j.id === workOrderId);
      fetch(`${API_URL}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: currentUser.id,
          user_name: currentUser.name,
          action: "wo_viewed",
          entity_type: "job",
          entity_id: String(workOrderId),
          details: { customer: job?.customer || null, location: job?.location || null },
        }),
      }).catch(() => {});
    }
  };
  return (
    <div className="fti-dashboard-pad" style={{ padding: "32px 28px" }}>
      {/* v28.419 — first-run nudge: once per device (localStorage), any
          action dismisses it. Points at the tour + the Tutorial page. */}
      {tutNudge && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            padding: "10px 14px",
            marginBottom: 14,
            borderRadius: 8,
            border: `1px solid ${C.blue}44`,
            background: `${C.blue}11`,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>👋 New here? Sixty seconds and you'll know your way around.</span>
          <span style={{ display: "inline-flex", gap: 8, marginLeft: "auto" }}>
            <Btn
              small
              onClick={() => {
                dismissTutNudge();
                window.dispatchEvent(new CustomEvent(DASHBOARD_TOUR_EVENT));
              }}
            >
              ▶ TAKE THE TOUR
            </Btn>
            <Btn
              small
              variant="ghost"
              onClick={() => {
                dismissTutNudge();
                navigateToPage("/tutorial");
              }}
            >
              READ THE TUTORIAL
            </Btn>
            <span onClick={dismissTutNudge} style={{ fontSize: 14, color: C.muted, cursor: "pointer", fontWeight: 700, padding: "0 4px" }}>
              ✕
            </span>
          </span>
        </div>
      )}
      <div className="fti-dashboard-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Active Work Orders</h1>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{activeWorkOrders.length} total · Updated just now</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <span data-tut="tasks" style={{ display: "inline-flex" }}>
            <Btn onClick={() => navigateToPage("/todos")} variant="ghost">
              ☐ My Tasks {myActiveTodos.length > 0 ? `(${myActiveTodos.length})` : ""}
            </Btn>
          </span>
          <span data-tut="new-wo" style={{ display: "inline-flex" }}>
            <Btn onClick={() => setShowNewJob(true)}>+ NEW WORK ORDER</Btn>
          </span>
        </div>
      </div>

      {/* v28.40 — PipelineSummary + 3-tier status filter pills removed.
          The 3-tier (SCHEDULED / IN PROGRESS / COMPLETED) failed CAM Article
          III Amendment 2 — IN PROGRESS was a date-based heuristic, SCHEDULED
          was redundant with "no tickets touched yet," and the badges were
          information the ticket dots already conveyed. Active dashboard now
          shows only non-archived/non-deleted/non-completed WOs by definition;
          completed WOs live in /archive. */}
      <div className="fti-filter-row" style={{ display: "flex", gap: 0, marginBottom: 16, alignItems: "center", borderBottom: `1px solid ${C.border}` }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginRight: 10 }}>SORT:</span>
        <select
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value)}
          style={{
            border: `1px solid ${C.border}`,
            borderRadius: 4,
            padding: "5px 8px",
            fontSize: 11,
            color: C.text,
            background: C.cardBg,
            fontFamily: "'Arial', sans-serif",
            marginRight: 10,
            marginBottom: 6,
          }}
        >
          <option value="scheduled">Scheduled Date</option>
          <option value="ticket">Ticket #</option>
          <option value="customer">Customer (A → Z)</option>
        </select>
      </div>

      {sortedWorkOrders.map((job, tutIdx) => (
        <div key={"wrap" + job.id} data-tut={tutIdx === 0 ? "wo-card" : undefined} ref={expandedId === job.id ? expandedCardRef : null}>
          <WorkOrderCard
            key={job.id}
            job={job}
            isExpanded={expandedId === job.id}
            onToggle={() => handleWoToggle(job.id)}
            pendingTodos={pendingByJob[job.id] || 0}
            todos={todos}
            setTodos={setTodos}
            tickets={tickets}
            setTickets={setTickets}
            jobs={jobs}
            onNavigateJob={navigateToJob}
            onUpdateJob={handleUpdateJob}
            jsas={jsas}
            setJsas={setJsas}
            onDeleteJob={handleDeleteJob}
            onFlagCancel={handleFlagCancel}
            onCloseJob={handleCloseJob}
            onTicketDeleted={(ticket) => setDeletedTickets((prev) => [...prev, ticket])}
          />
        </div>
      ))}
    </div>
  );
}

export default DashboardHome;
