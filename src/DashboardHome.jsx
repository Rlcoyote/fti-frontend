import { C, STATUS_CONFIG, STATUS_ORDER } from "./config.js";
import { Btn, PipelineSummary, computeJobStatus } from "./SharedUI.jsx";
import JobCard from "./JobCard.jsx";

function DashboardHome({
  jobs,
  activeJobs,
  sortedJobs,
  filterStatus,
  setFilterStatus,
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
            {activeJobs.length} total · {activeJobs.filter(j => computeJobStatus(j, tickets.filter(t => t.jobId === j.id)) === "In Progress").length} active · Updated just now
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Btn onClick={() => navigateToPage("/todos")} variant="ghost">
            ☐ Tasks {myActiveTodos.length > 0 ? `(${myActiveTodos.length})` : ""}
          </Btn>
          <Btn onClick={() => setShowNewJob(true)}>+ NEW WORK ORDER</Btn>
        </div>
      </div>

      <PipelineSummary jobs={jobs} tickets={tickets} />

      <div className="fti-filter-row" style={{ display: "flex", gap: 0, marginBottom: 16, alignItems: "center", borderBottom: `1px solid ${C.border}` }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginRight: 10 }}>FILTER:</span>
        {/* Sort is the first filter control — it's a filter on ordering, which applies before status selection. */}
        <select value={sortMode} onChange={e => setSortMode(e.target.value)}
          style={{ border: `1px solid ${C.border}`, borderRadius: 4, padding: "5px 8px", fontSize: 11, color: C.text, background: C.cardBg, fontFamily: "'Arial', sans-serif", marginRight: 10, marginBottom: 6 }}>
          <option value="default">Sort: Status + Date</option>
          <option value="customer">Sort: Customer (A → Z)</option>
        </select>
        {["All", ...STATUS_ORDER].map(s => {
          const active = filterStatus === s;
          const cfg = s === "All" ? null : STATUS_CONFIG[s];
          return (
            <button key={s} onClick={() => setFilterStatus(s)} style={{
              background: active ? C.cardBg : "transparent",
              border: active ? `1px solid ${C.border}` : "1px solid transparent",
              borderBottom: active ? `1px solid ${C.cardBg}` : "1px solid transparent",
              borderTopLeftRadius: 4, borderTopRightRadius: 4,
              borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
              marginBottom: active ? -1 : 0,
              color: active ? (s === "All" ? C.blue : cfg?.color) : C.muted,
              padding: "8px 14px", fontSize: 11,
              fontWeight: 700, cursor: "pointer", fontFamily: "'Arial', sans-serif",
            }}>{s === "All" ? "ALL" : cfg.label}</button>
          );
        })}
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
          onTicketDeleted={(ticket) => setDeletedTickets(prev => [...prev, ticket])}
        />
      ))}
    </div>
  );
}

export default DashboardHome;
