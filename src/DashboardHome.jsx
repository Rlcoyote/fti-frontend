import { C } from "./config.js";
import { Btn } from "./SharedUI.jsx";
import JobCard from "./JobCard.jsx";

function DashboardHome({
  jobs,
  activeJobs,
  sortedJobs,
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
  return (
    <div className="fti-dashboard-pad" style={{ padding: "32px 28px" }}>
      <div className="fti-dashboard-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Active Work Orders</h1>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
            {activeJobs.length} total · Updated just now
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Btn onClick={() => navigateToPage("/todos")} variant="ghost">
            ☐ Tasks {myActiveTodos.length > 0 ? `(${myActiveTodos.length})` : ""}
          </Btn>
          <Btn onClick={() => setShowNewJob(true)}>+ NEW WORK ORDER</Btn>
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
        <select value={sortMode} onChange={e => setSortMode(e.target.value)}
          style={{ border: `1px solid ${C.border}`, borderRadius: 4, padding: "5px 8px", fontSize: 11, color: C.text, background: C.cardBg, fontFamily: "'Arial', sans-serif", marginRight: 10, marginBottom: 6 }}>
          <option value="scheduled">Scheduled Date</option>
          <option value="ticket">Ticket #</option>
          <option value="customer">Customer (A → Z)</option>
        </select>
      </div>

      {sortedJobs.map(job => (
        <JobCard
          key={job.id} job={job}
          isExpanded={expandedId === job.id}
          onToggle={() => setExpandedId(expandedId === job.id ? null : job.id)}
          pendingTodos={pendingByJob[job.id] || 0}
          todos={todos} setTodos={setTodos}
          tickets={tickets} setTickets={setTickets}
          jobs={jobs} onNavigateJob={navigateToJob}
          onUpdateJob={handleUpdateJob}
          jsas={jsas} setJsas={setJsas}
          onDeleteJob={handleDeleteJob}
          onFlagCancel={handleFlagCancel}
          onCloseJob={handleCloseJob}
          onTicketDeleted={(ticket) => setDeletedTickets(prev => [...prev, ticket])}
        />
      ))}
    </div>
  );
}

export default DashboardHome;
