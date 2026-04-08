import { useState, useMemo } from "react";
import { C, STATUS_CONFIG } from "./config.js";
import { formatDate, formatShortStamp, shortName, calcTicketTotal } from "./utils.js";
import { Btn, TicketDot, StatusBadge, TodoBadge, computeJobStatus } from "./SharedUI.jsx";
import { JobTodoTab } from "./TodoPage.jsx";
import JobTicketsTab from "./JobTicketsTab.jsx";
import EditJobModal from "./EditJobModal.jsx";
import FlowbackModal from "./FlowbackModal.jsx";

function JobCard({ job, isExpanded, onToggle, pendingTodos, todos, setTodos, tickets, setTickets, jobs, onNavigateJob, onUpdateJob, onDeleteJob, onFlagCancel, onTicketDeleted, jsas, setJsas, userNames, qbItems, userIdByName, currentUser, customers }) {
  const jobTickets = tickets.filter(t => t.jobId === job.id);
  const computedStatus = computeJobStatus(job, jobTickets);
  const cfg = STATUS_CONFIG[computedStatus] || STATUS_CONFIG["Scheduled"];
  const costPerWell = job.wells.length > 1 ? (job.estimatedCost / job.wells.length).toFixed(0) : null;
  const [activeTab, setActiveTab] = useState("tickets");
  const [showEditJob, setShowEditJob] = useState(false);
  const [showFlowback, setShowFlowback] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 900);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 900);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  const ticketTotal = jobTickets.reduce((s, t) => s + calcTicketTotal(t), 0);
  const hasJobPendingComment = jobTickets.some(t => t.hasPendingComment || t.has_pending_comment);

  // Derive dot states from actual tickets
  const dotState = (type) => {
    const t = jobTickets.filter(tk => tk.type === type);
    if (t.length === 0) return "none";
    if (t.some(tk => tk.status === "qbVerified")) return "signed";
    if (t.some(tk => tk.status === "sentToQB")) return "signed";
    if (t.some(tk => tk.status === "signed" || tk.status === "sigNotReq")) return "signed";
    if (t.some(tk => tk.status === "emailed")) return "inField";
    if (t.some(tk => tk.status === "inField")) return "inField";
    return "incomplete";
  };

  const isFlagged = job.status === "flaggedCancel";

  return (
    <div style={{
      background: isFlagged ? "#fdf0e6" : C.cardBg, border: `1px solid ${isFlagged ? "#b85c00" : C.border}`,
      borderLeft: `3px solid ${isFlagged ? "#b85c00" : cfg.color}`, borderRadius: 6, marginBottom: 8,
      boxShadow: isExpanded ? `0 4px 24px ${cfg.color}22` : "none",
      overflow: "hidden", maxWidth: "100%",
    }}>
      {isMobile ? (
        // Mobile: compact single row
        <div onClick={onToggle} style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 14px", cursor: "pointer", userSelect: "none",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: "0.1em" }}>JOB #{job.id}</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{job.customer}</div>
              <div style={{ fontSize: 11, color: C.muted }}>{job.location}</div>
              {job.createdBy && <div style={{ fontSize: 9, color: "#a0aec8", marginTop: 1 }}>{shortName(job.createdBy)} · {formatShortStamp(job.createdAt)}</div>}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
            <div style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}44`, borderRadius: 4, padding: "2px 8px", fontSize: 10, fontWeight: 800, letterSpacing: "0.06em" }}>{cfg.label}</div>
            {hasJobPendingComment && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 3, background: "#fdecea", color: "#B01020", borderRadius: 4, padding: "1px 6px", fontSize: 9, fontWeight: 800, letterSpacing: "0.04em", border: "1px solid #B0102044" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#B01020", display: "inline-block" }} />
                COMMENT
              </span>
            )}
            <div style={{ fontSize: 11, color: C.muted }}>{job.wells.length} {job.wells.length === 1 ? "well" : "wells"}</div>
          </div>
        </div>
      ) : (
        // Desktop: full grid
        <div onClick={onToggle} className="fti-job-card-header" style={{
          display: "grid", gridTemplateColumns: "80px 1fr 1fr 140px 160px 120px 90px",
          alignItems: "center", padding: "14px 18px",
          cursor: "pointer", gap: 12, userSelect: "none", overflow: "hidden",
        }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.1em" }}>JOB #</div>
          <div style={{ fontSize: 17, fontWeight: 800, color: C.text }}>{job.id}</div>
          {job.createdBy && <div style={{ fontSize: 9, color: "#a0aec8", marginTop: 2 }}>{shortName(job.createdBy)} · {formatShortStamp(job.createdAt)}</div>}
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.08em", marginBottom: 2 }}>CUSTOMER</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{job.customer}</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>{job.location}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.08em", marginBottom: 2 }}>WELLS</div>
          <div style={{ fontSize: 13, color: C.text }}>{job.wells.length} {job.wells.length === 1 ? "well" : "wells"}</div>
          <div style={{ fontSize: 11, color: C.muted }}>{job.wells[0]?.well_name || job.wells[0]}{job.wells.length > 1 ? ` +${job.wells.length - 1}` : ""}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.08em", marginBottom: 2 }}>SCHEDULED DATE</div>
          <div style={{ fontSize: 13, color: C.text }}>{formatDate(job.dateStarted)}</div>
          <div style={{ fontSize: 11, color: C.muted }}>{job.hoursLogged}h logged</div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.08em", marginBottom: 6 }}>TICKETS</div>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <TicketDot label="RU" state={dotState("Rig Up")} />
            <TicketDot label="TST" state={dotState("Tester")} />
            <TicketDot label="PMP" state={dotState("Pumper")} />
            <TicketDot label="RNT" state={dotState("Rental")} />
            <TicketDot label="RD" state={dotState("Rig Down")} />
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.08em", marginBottom: 4 }}>TASKS</div>
          <TodoBadge count={pendingTodos} />
          {!pendingTodos && <span style={{ fontSize: 11, color: C.muted }}>None pending</span>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          <StatusBadge status={computedStatus} />
          {computedStatus === "In Progress" && jobTickets.some(t => t.status === "incomplete") && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#fdf5d8", color: "#8a6500", borderRadius: 4, padding: "2px 8px", fontSize: 10, fontWeight: 800, letterSpacing: "0.04em", border: "1px solid #e6c20044" }}>
              {jobTickets.filter(t => t.status === "incomplete").length} INCOMPLETE
            </span>
          )}
          {hasJobPendingComment && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#fdecea", color: "#B01020", borderRadius: 4, padding: "2px 8px", fontSize: 10, fontWeight: 800, letterSpacing: "0.04em", border: "1px solid #B0102044" }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#B01020", display: "inline-block" }} />
              COMMENT
            </span>
          )}
          <span style={{ color: C.muted, fontSize: 12, display: "inline-block", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▾</span>
        </div>
      </div>
      )}{/* end desktop header */}

      {isExpanded && (
        <div style={{ borderTop: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, background: C.steel, padding: "0 18px" }}>
            {[["tickets", `TICKETS${jobTickets.length ? ` (${jobTickets.length})` : ""}`], ["details", "DETAILS"], ["todos", `ACTION ITEMS${pendingTodos ? ` (${pendingTodos})` : ""}`]].map(([tab, label]) => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                background: activeTab === tab ? C.cardBg : "transparent", border: "none",
                borderBottom: activeTab === tab ? `2px solid ${C.red}` : "2px solid transparent",
                borderTop: activeTab === tab ? `2px solid ${C.red}` : "2px solid transparent",
                borderLeft: activeTab === tab ? `1px solid ${C.border}` : "1px solid transparent",
                borderRight: activeTab === tab ? `1px solid ${C.border}` : "1px solid transparent",
                borderTopLeftRadius: activeTab === tab ? 4 : 0,
                borderTopRightRadius: activeTab === tab ? 4 : 0,
                marginBottom: activeTab === tab ? -1 : 0,
                color: activeTab === tab ? C.text : C.muted,
                padding: "10px 16px", fontSize: 12, fontWeight: 700,
                cursor: "pointer", letterSpacing: "0.06em",
              }}>{label}</button>
            ))}
          </div>

          {activeTab === "details" && (
            <div style={{
              padding: "18px 18px 20px", display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 24, background: "#f7f9fc",
            }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.1em", marginBottom: 8 }}>WELLS / AFE</div>
                {job.wells.map((well, i) => (
                  <div key={i} style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 12, color: C.text, fontWeight: 600 }}>{well.well_name || well}</div>
                    {i === 0 && job.afe && <div style={{ fontSize: 11, color: "#1a5fa8" }}>AFE: {job.afe}</div>}
                    {costPerWell && <div style={{ fontSize: 11, color: C.green }}>{'$'}{Number(costPerWell).toLocaleString()} / well</div>}
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.1em", marginBottom: 8 }}>CREW</div>
                {job.crew.map((c, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: C.text }}>{c.name}</span>
                    <span style={{ fontSize: 11, color: C.muted, fontStyle: "italic" }}>{c.role}</span>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.1em", marginBottom: 8 }}>EQUIPMENT</div>
                {job.equipment.map((eq, i) => (
                  <div key={i} style={{ fontSize: 12, color: C.text, marginBottom: 5, display: "flex", gap: 6 }}>
                    <span style={{ color: C.red, fontSize: 8, marginTop: 4 }}>◆</span>{eq}
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.1em", marginBottom: 8 }}>ACTIONS</div>
                {(() => {
                  const role = currentUser?.role || "field";
                  const canDelete = ["owner", "admin", "manager"].includes(role);
                  const actions = [
                    { label: "Add / View Field Tickets", action: () => setActiveTab("tickets") },
                    { label: "Flowback Data", action: () => setShowFlowback(true) },
                    { label: "Edit Job", action: () => setShowEditJob(true) },
                  ];
                  // Close Out — only if all tickets are sentToQB or qbVerified
                  const jTickets = tickets.filter(t => t.jobId === job.id);
                  const allSent = jTickets.length > 0 && jTickets.every(t => ["sentToQB", "qbVerified"].includes(t.status));
                  const hasIncomplete = jTickets.some(t => !["sentToQB", "qbVerified"].includes(t.status));
                  if (allSent && canDelete) {
                    actions.push({ label: "CLOSE OUT JOB", action: () => { onUpdateJob(job.id, { status: "Completed" }); }, success: true });
                  } else if (hasIncomplete && jTickets.length > 0 && canDelete) {
                    const pending = jTickets.filter(t => !["sentToQB", "qbVerified"].includes(t.status)).length;
                    actions.push({ label: `CLOSE OUT — ${pending} ticket${pending !== 1 ? "s" : ""} not sent`, action: null, warn: true });
                  }
                  if (canDelete) {
                    actions.push({ label: "DELETE JOB", action: () => setShowDeleteConfirm(true), danger: true });
                  } else if (job.status !== "flaggedCancel") {
                    actions.push({ label: "Flag: To Be Cancelled", action: () => setShowDeleteConfirm(true), warn: true });
                  }
                  return actions;
                })().map((btn, i) => (
                  <button key={i} onClick={(e) => { e.stopPropagation(); if (btn.action) btn.action(); }} style={{
                    display: "block", width: "100%", background: btn.danger ? "#fdecea" : btn.warn ? "#fdf5d8" : btn.success ? "#e6f5ec" : "transparent",
                    border: `1px solid ${btn.danger ? C.red : btn.warn ? "#8a6500" : btn.success ? C.green : C.border}`,
                    color: btn.danger ? C.red : btn.warn ? "#8a6500" : btn.success ? C.green : btn.action ? C.text : C.muted,
                    padding: "7px 12px", borderRadius: 4, fontSize: 12,
                    cursor: btn.action ? "pointer" : "default", textAlign: "left", marginBottom: 6,
                    fontFamily: "'Arial', sans-serif", opacity: btn.action ? 1 : 0.5,
                    fontWeight: btn.danger || btn.warn || btn.success ? 800 : 400,
                  }}
                    onMouseEnter={e => { if (btn.action) { e.target.style.borderColor = C.red; e.target.style.background = btn.danger ? "#f5c6cb" : "#fbeaec"; }}}
                    onMouseLeave={e => { e.target.style.borderColor = btn.danger ? C.red : btn.warn ? "#8a6500" : C.border; e.target.style.background = btn.danger ? "#fdecea" : btn.warn ? "#fdf5d8" : "transparent"; }}
                  >{btn.label}{!btn.action ? " (coming soon)" : ""}</button>
                ))}
              </div>
            </div>
          )}
            {job.notes && (
              <div style={{ padding: "0 18px 14px", background: "#f7f9fc" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.1em", marginBottom: 4 }}>NOTES</div>
                <div style={{ fontSize: 12, color: C.text, whiteSpace: "pre-wrap", background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 4, padding: "8px 12px" }}>{job.notes}</div>
              </div>
            )}

          {activeTab === "tickets" && (
            <div style={{ padding: "0 18px 18px", background: "#f7f9fc" }}>
              <JobTicketsTab jobId={job.id} tickets={tickets} setTickets={setTickets} jobs={jobs} qbItems={qbItems} currentUser={currentUser} customers={customers} onTicketDeleted={onTicketDeleted} />
            </div>
          )}

          {activeTab === "todos" && (
            <div style={{ padding: "0 18px 18px", background: "#f7f9fc" }}>
              <JobTodoTab jobId={job.id} todos={todos} setTodos={setTodos} jobs={jobs} userNames={userNames} userIdByName={userIdByName} />
            </div>
          )}
        </div>
      )}
      {showEditJob && <EditJobModal job={job} currentUser={currentUser} onSave={(updates) => { onUpdateJob(job.id, updates); setShowEditJob(false); }} onClose={() => setShowEditJob(false)} />}
      {showFlowback && <FlowbackModal job={job} onClose={() => setShowFlowback(false)} />}
      {showDeleteConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={() => setShowDeleteConfirm(false)}>
          <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderTop: `4px solid ${C.red}`, borderRadius: 8, padding: 28, width: 420, maxWidth: "90vw" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.red, marginBottom: 12 }}>
              {["owner", "admin", "manager"].includes(currentUser?.role) ? "Delete Job?" : "Flag for Cancellation?"}
            </div>
            <div style={{ fontSize: 13, color: C.text, marginBottom: 8 }}>
              <strong>Job #{job.id}</strong> — {job.customer}
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 20 }}>
              {["owner", "admin", "manager"].includes(currentUser?.role)
                ? "This job will be moved to the Deleted Jobs page. It can be restored later."
                : "This job will be flagged for review. A manager or admin will need to approve the cancellation."}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn onClick={() => {
                if (["owner", "admin", "manager"].includes(currentUser?.role)) {
                  onDeleteJob(job.id);
                } else {
                  onFlagCancel(job.id);
                }
                setShowDeleteConfirm(false);
              }}>{["owner", "admin", "manager"].includes(currentUser?.role) ? "YES, DELETE" : "YES, FLAG IT"}</Btn>
              <Btn onClick={() => setShowDeleteConfirm(false)} variant="ghost">CANCEL</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


export default JobCard;
