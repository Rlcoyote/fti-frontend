import { useState } from "react";
import useIsMobile from "./useIsMobile.js";
import { C, TERMINAL_TICKET_STATUSES, WO_TICKET_STATUSES, FINAL_REVIEW_TICKET_STATUSES } from "./config.js";
import { formatDate, formatShortStamp, shortName, calcTicketTotal } from "./utils.js";
import { Btn, TicketDot, TodoBadge, ConfirmModal, PANEL_TEXT, PANEL_MUTED, TINT } from "./SharedUI.jsx";
import { JobTodoTab } from "./TodoPage.jsx";
import JobTicketsTab from "./JobTicketsTab.jsx";
import EditJobModal from "./EditJobModal.jsx";
import { useApp } from "./AppContext.jsx";

function JobCard({
  job,
  isExpanded,
  onToggle,
  pendingTodos,
  todos,
  setTodos,
  tickets,
  setTickets,
  jobs,
  onNavigateJob: _onNavigateJob,
  onUpdateJob,
  onDeleteJob,
  onFlagCancel,
  onCloseJob,
  onTicketDeleted,
  jsas: _jsas,
  setJsas: _setJsas,
}) {
  const { assets, userNames, userIdByName, can } = useApp();
  const jobTickets = tickets.filter((t) => t.jobId === job.id);
  const [activeTab, setActiveTab] = useState("tickets");
  const [showEditJob, setShowEditJob] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const isMobile = useIsMobile();
  // Billable total excludes voided tickets. Used for per-well display in the WELLS section below.
  const ticketTotal = jobTickets.filter((t) => t.status !== "voided").reduce((s, t) => s + calcTicketTotal(t), 0);
  const perWellAmount = ticketTotal / (job.wells.length || 1);
  const hasJobPendingComment = jobTickets.some((t) => t.hasPendingComment || t.has_pending_comment);

  // v28.40 — completion gate. The button in the top-right slot shows one of
  // four states based on what's left to do across this WO's tickets:
  //   ADD TICKETS         (0 tickets — nothing to close)
  //   TICKETS PENDING     (≥1 ticket still in lead's domain: incomplete/signed/sigNotReq/emailed)
  //   PENDING ACCOUNTING  (all out of lead's domain but Final Review hasn't sent to QB yet)
  //   MARK FOR COMPLETION (all tickets terminal — sentToQB / qbVerified / voided)
  // Only the last state is clickable. Click → confirm modal → archive.
  const canManage = can("view_archive");
  const inLeadDomain = jobTickets.filter((t) => WO_TICKET_STATUSES.includes(t.status));
  const inFinalReview = jobTickets.filter((t) => FINAL_REVIEW_TICKET_STATUSES.includes(t.status));
  const inTerminal = jobTickets.filter((t) => TERMINAL_TICKET_STATUSES.includes(t.status));
  let completion;
  if (jobTickets.length === 0) {
    completion = { label: "ADD TICKETS", color: C.muted, bg: C.steel, ready: false };
  } else if (inLeadDomain.length > 0) {
    completion = { label: `${inLeadDomain.length} TICKET${inLeadDomain.length !== 1 ? "S" : ""} PENDING`, color: C.yellow, bg: C.yellowB, ready: false };
  } else if (inFinalReview.length > 0) {
    completion = { label: "PENDING ACCOUNTING", color: C.blue, bg: C.blueB, ready: false };
  } else if (inTerminal.length === jobTickets.length) {
    completion = { label: "MARK FOR COMPLETION", color: C.green, bg: C.greenB, ready: true };
  } else {
    completion = { label: "PENDING", color: C.muted, bg: C.steel, ready: false };
  }

  // Derive dot states from actual tickets. v28.40 — `inField` removed; legacy
  // rows with that value (if any survived the merge) fall through to incomplete.
  // v28.41 — `approved` was missing from the "work-done" cases, so an approved
  // ticket showed gold (incomplete) on the dashboard pip even though the lead
  // had finished it. Added below.
  const dotState = (type) => {
    const t = jobTickets.filter((tk) => tk.type === type);
    if (t.length === 0) return "none";
    if (t.some((tk) => tk.status === "qbVerified")) return "signed";
    if (t.some((tk) => tk.status === "sentToQB")) return "signed";
    if (t.some((tk) => tk.status === "approved")) return "signed";
    if (t.some((tk) => tk.status === "signed" || tk.status === "sigNotReq")) return "signed";
    if (t.some((tk) => tk.status === "emailed")) return "incomplete";
    return "incomplete";
  };

  const isFlagged = job.status === "flaggedCancel";
  // v28.40 — left border accent: brand red for active WOs, orange when flagged.
  // Old code used the computed status color; with the 3-tier taxonomy gone,
  // the accent now communicates flagged/normal only.
  const accentColor = isFlagged ? C.orange : C.red;

  return (
    <div
      style={{
        background: isFlagged ? C.orangeB : C.cardBg,
        border: `1px solid ${isFlagged ? C.orange : C.border}`,
        borderLeft: `3px solid ${accentColor}`,
        borderRadius: 6,
        marginBottom: 8,
        boxShadow: isExpanded ? `0 4px 24px ${accentColor}22` : "none",
        overflow: "hidden",
        maxWidth: "100%",
      }}
    >
      {isMobile ? (
        // Mobile: compact single row
        <div
          onClick={onToggle}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 14px",
            cursor: "pointer",
            userSelect: "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: "0.1em" }}>WORK ORDER #{job.id}</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{job.customer}</div>
              <div style={{ fontSize: 11, color: C.muted }}>{job.location}</div>
              {job.createdBy && (
                <div style={{ fontSize: 9, color: C.faint, marginTop: 1 }}>
                  {shortName(job.createdBy)} · {formatShortStamp(job.createdAt)}
                </div>
              )}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
            <button
              type="button"
              disabled={!completion.ready || !canManage}
              onClick={(e) => {
                e.stopPropagation();
                if (completion.ready && canManage) setShowCompleteConfirm(true);
              }}
              style={{
                background: completion.bg,
                color: completion.color,
                border: `1px solid ${completion.color}44`,
                borderRadius: 4,
                padding: "2px 8px",
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.06em",
                cursor: completion.ready && canManage ? "pointer" : "default",
                opacity: completion.ready && canManage ? 1 : 0.85,
                fontFamily: "'Arial', sans-serif",
              }}
            >
              {completion.label}
            </button>
            {hasJobPendingComment && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                  background: C.redB,
                  color: C.red,
                  borderRadius: 4,
                  padding: "1px 6px",
                  fontSize: 9,
                  fontWeight: 800,
                  letterSpacing: "0.04em",
                  border: `1px solid ${C.red}44`,
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.red, display: "inline-block" }} />
                COMMENT
              </span>
            )}
            <div style={{ fontSize: 11, color: C.muted }}>
              {job.wells.length} {job.wells.length === 1 ? "well" : "wells"}
            </div>
          </div>
        </div>
      ) : (
        // Desktop: full grid
        <div
          onClick={onToggle}
          className="fti-job-card-header"
          style={{
            display: "grid",
            gridTemplateColumns: "80px 1fr 1fr 140px 160px 120px 90px",
            alignItems: "center",
            padding: "14px 18px",
            cursor: "pointer",
            gap: 12,
            userSelect: "none",
            overflow: "hidden",
          }}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.1em" }}>WORK ORDER #</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: C.text }}>{job.id}</div>
            {job.createdBy && (
              <div style={{ fontSize: 9, color: C.faint, marginTop: 2 }}>
                {shortName(job.createdBy)} · {formatShortStamp(job.createdAt)}
              </div>
            )}
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.08em", marginBottom: 2 }}>CUSTOMER</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{job.customer}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>{job.location}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.08em", marginBottom: 2 }}>WELLS</div>
            <div style={{ fontSize: 13, color: C.text }}>
              {job.wells.length} {job.wells.length === 1 ? "well" : "wells"}
            </div>
            <div style={{ fontSize: 11, color: C.muted }}>
              {job.wells[0]?.well_name || job.wells[0]}
              {job.wells.length > 1 ? ` +${job.wells.length - 1}` : ""}
            </div>
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
            <button
              type="button"
              disabled={!completion.ready || !canManage}
              onClick={(e) => {
                e.stopPropagation();
                if (completion.ready && canManage) setShowCompleteConfirm(true);
              }}
              style={{
                background: completion.bg,
                color: completion.color,
                border: `1px solid ${completion.color}44`,
                borderRadius: 4,
                padding: "3px 10px",
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.1em",
                cursor: completion.ready && canManage ? "pointer" : "default",
                opacity: completion.ready && canManage ? 1 : 0.85,
                fontFamily: "'Arial', sans-serif",
              }}
            >
              {completion.label}
            </button>
            {hasJobPendingComment && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  background: C.redB,
                  color: C.red,
                  borderRadius: 4,
                  padding: "2px 8px",
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: "0.04em",
                  border: `1px solid ${C.red}44`,
                }}
              >
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: C.red, display: "inline-block" }} />
                COMMENT
              </span>
            )}
            <span
              style={{
                color: C.muted,
                fontSize: 12,
                display: "inline-block",
                transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s",
              }}
            >
              ▾
            </span>
          </div>
        </div>
      )}
      {/* end desktop header */}

      {isExpanded && (
        <div style={{ borderTop: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", justifyContent: "center", borderBottom: `1px solid ${C.border}`, background: C.steel, padding: "0 18px" }}>
            {[
              ["tickets", `TICKETS${jobTickets.length ? ` (${jobTickets.length})` : ""}`],
              ["details", "DETAILS"],
              ["todos", `ACTION ITEMS${pendingTodos ? ` (${pendingTodos})` : ""}`],
            ].map(([tab, label]) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  background: activeTab === tab ? C.cardBg : "transparent",
                  border: "none",
                  borderBottom: activeTab === tab ? `2px solid ${C.red}` : "2px solid transparent",
                  borderTop: activeTab === tab ? `2px solid ${C.red}` : "2px solid transparent",
                  borderLeft: activeTab === tab ? `1px solid ${C.border}` : "1px solid transparent",
                  borderRight: activeTab === tab ? `1px solid ${C.border}` : "1px solid transparent",
                  borderTopLeftRadius: activeTab === tab ? 4 : 0,
                  borderTopRightRadius: activeTab === tab ? 4 : 0,
                  marginBottom: activeTab === tab ? -1 : 0,
                  color: activeTab === tab ? C.text : C.muted,
                  padding: "10px 16px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  letterSpacing: "0.06em",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {activeTab === "details" && (
            <div
              style={{
                padding: "18px 18px 20px",
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr 1fr",
                gap: 24,
                background: TINT.expandBg,
              }}
            >
              <div>
                {/* WO DETAILS — synopsis from the WO creation form. Fields hidden when empty. Order follows WO creation form. */}
                {(() => {
                  const pocFirst = job.contactFirst || job.contact_first;
                  const pocLast = job.contactLast || job.contact_last;
                  const pocName = [pocFirst, pocLast].filter(Boolean).join(" ");
                  const pocPhone = job.pocPhone || job.poc_phone;
                  const pocEmail = job.pocEmail || job.poc_email;
                  const companyCode = job.companyCode || job.company_code;
                  const costCenter = job.costCenter || job.cost_center;
                  const po = job.po || job.po_number;
                  const afe = job.afe;
                  const hasAny = pocName || pocPhone || pocEmail || companyCode || costCenter || po || afe;
                  if (!hasAny) return null;
                  const kvRowStyle = { marginBottom: 6, display: "flex", gap: 6, flexWrap: "wrap" };
                  const keyStyle = { fontSize: 11, color: PANEL_MUTED };
                  const valStyle = { fontSize: 11, color: PANEL_TEXT, fontWeight: 600 };
                  return (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: PANEL_MUTED, letterSpacing: "0.1em", marginBottom: 8 }}>WO DETAILS</div>
                      {pocName && (
                        <div style={{ marginBottom: 8 }}>
                          <div style={{ fontSize: 10, color: PANEL_MUTED, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>
                            Point of Contact
                          </div>
                          <div style={{ fontSize: 12, color: PANEL_TEXT, fontWeight: 600 }}>{pocName}</div>
                          {pocPhone && <div style={{ fontSize: 11, color: PANEL_TEXT }}>{pocPhone}</div>}
                          {pocEmail && <div style={{ fontSize: 11, color: PANEL_TEXT }}>{pocEmail}</div>}
                        </div>
                      )}
                      {companyCode && (
                        <div style={kvRowStyle}>
                          <span style={keyStyle}>Company Code:</span>
                          <span style={valStyle}>{companyCode}</span>
                        </div>
                      )}
                      {costCenter && (
                        <div style={kvRowStyle}>
                          <span style={keyStyle}>Cost Center:</span>
                          <span style={valStyle}>{costCenter}</span>
                        </div>
                      )}
                      {po && (
                        <div style={kvRowStyle}>
                          <span style={keyStyle}>PO:</span>
                          <span style={valStyle}>{po}</span>
                        </div>
                      )}
                      {afe && (
                        <div style={kvRowStyle}>
                          <span style={keyStyle}>AFE:</span>
                          <span style={{ fontSize: 11, color: TINT.blueText, fontWeight: 700 }}>{afe}</span>
                        </div>
                      )}
                    </div>
                  );
                })()}
                {/* WELLS — even split of all non-voided ticket totals across assigned wells. */}
                <div style={{ fontSize: 11, fontWeight: 700, color: PANEL_MUTED, letterSpacing: "0.1em", marginBottom: 8 }}>WELLS</div>
                {job.wells.map((well, i) => (
                  <div key={i} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 12, color: PANEL_TEXT, fontWeight: 600 }}>{well.well_name || well}</div>
                    <div style={{ fontSize: 11, color: C.green, fontWeight: 700 }}>
                      ${perWellAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: PANEL_MUTED, letterSpacing: "0.1em", marginBottom: 8 }}>CREW</div>
                {job.crew.map((c, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: PANEL_TEXT }}>{c.name}</span>
                    <span style={{ fontSize: 11, color: PANEL_MUTED, fontStyle: "italic" }}>{c.role}</span>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: PANEL_MUTED, letterSpacing: "0.1em", marginBottom: 8 }}>ASSETS</div>
                {(assets || [])
                  .filter((a) => a.assigned_job_id === job.id)
                  .map((a) => (
                    <div key={a.id} style={{ fontSize: 12, color: PANEL_TEXT, marginBottom: 5, display: "flex", gap: 6 }}>
                      <span style={{ color: TINT.yellowText, fontSize: 8, marginTop: 4 }}>◆</span>
                      <span>
                        {a.name}
                        {a.unit_number ? ` (${a.unit_number})` : ""}
                      </span>
                    </div>
                  ))}
                {(assets || []).filter((a) => a.assigned_job_id === job.id).length === 0 && (
                  <div style={{ fontSize: 11, color: PANEL_MUTED, fontStyle: "italic" }}>None deployed</div>
                )}
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: PANEL_MUTED, letterSpacing: "0.1em", marginBottom: 8 }}>ACTIONS</div>
                {(() => {
                  const canDelete = can("delete_jobs");
                  const actions = [
                    { label: "Add / View Field Tickets", action: () => setActiveTab("tickets") },
                    { label: "Edit Work Order", action: () => setShowEditJob(true) },
                  ];
                  // v28.40 — CLOSE OUT WORK ORDER moved to the MARK FOR
                  // COMPLETION button in the WO header. Removed from this
                  // ACTIONS list to avoid two paths to the same destination
                  // (Article III Amendment 2 Q6 — redundancy).
                  if (canDelete) {
                    actions.push({ label: "DELETE WORK ORDER", action: () => setShowDeleteConfirm(true), danger: true });
                  } else if (job.status !== "flaggedCancel") {
                    actions.push({ label: "Flag: To Be Cancelled", action: () => setShowDeleteConfirm(true), warn: true });
                  }
                  return actions;
                })().map((btn, i) => (
                  <button
                    key={i}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (btn.action) btn.action();
                    }}
                    style={{
                      display: "block",
                      width: "100%",
                      background: btn.danger ? TINT.redBg : btn.warn ? TINT.yellowBg : btn.success ? TINT.greenBg : "transparent",
                      border: `1px solid ${btn.danger ? TINT.redText : btn.warn ? TINT.yellowText : btn.success ? TINT.greenText : C.border}`,
                      color: btn.danger ? TINT.redText : btn.warn ? TINT.yellowText : btn.success ? TINT.greenText : btn.action ? PANEL_TEXT : PANEL_MUTED,
                      padding: "7px 12px",
                      borderRadius: 4,
                      fontSize: 12,
                      cursor: btn.action ? "pointer" : "default",
                      textAlign: "left",
                      marginBottom: 6,
                      fontFamily: "'Arial', sans-serif",
                      opacity: btn.action ? 1 : 0.5,
                      fontWeight: btn.danger || btn.warn || btn.success ? 800 : 400,
                    }}
                    onMouseEnter={(e) => {
                      if (btn.action) {
                        e.target.style.borderColor = C.red;
                        e.target.style.background = btn.danger ? TINT.redHover : TINT.redHoverSoft;
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.borderColor = btn.danger ? TINT.redText : btn.warn ? TINT.yellowText : C.border;
                      e.target.style.background = btn.danger ? TINT.redBg : btn.warn ? TINT.yellowBg : "transparent";
                    }}
                  >
                    {btn.label}
                    {!btn.action ? " (coming soon)" : ""}
                  </button>
                ))}
              </div>
            </div>
          )}
          {job.notes && (
            <div style={{ padding: "0 18px 14px", background: TINT.expandBg }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: PANEL_MUTED, letterSpacing: "0.1em", marginBottom: 4 }}>NOTES</div>
              <div
                style={{
                  fontSize: 12,
                  color: C.text,
                  whiteSpace: "pre-wrap",
                  background: C.cardBg,
                  border: `1px solid ${C.border}`,
                  borderRadius: 4,
                  padding: "8px 12px",
                }}
              >
                {job.notes}
              </div>
            </div>
          )}

          {activeTab === "tickets" && (
            <div style={{ padding: "0 18px 18px", background: TINT.expandBg }}>
              <JobTicketsTab jobId={job.id} tickets={tickets} setTickets={setTickets} jobs={jobs} onTicketDeleted={onTicketDeleted} />
            </div>
          )}

          {activeTab === "todos" && (
            <div style={{ padding: "0 18px 18px", background: TINT.expandBg }}>
              <JobTodoTab jobId={job.id} todos={todos} setTodos={setTodos} jobs={jobs} userNames={userNames} userIdByName={userIdByName} />
            </div>
          )}
        </div>
      )}
      {showEditJob && (
        <EditJobModal
          job={job}
          onSave={(updates) => {
            onUpdateJob(job.id, updates);
            setShowEditJob(false);
          }}
          onClose={() => setShowEditJob(false)}
        />
      )}
      {showCompleteConfirm && (
        <ConfirmModal
          title={`Mark Work Order #${job.id} complete?`}
          message={`All tickets are sent to accounting or voided — the lead's work here is done. The Work Order will move to Archive. This can be undone from Archive if needed.`}
          yesLabel="Mark Complete"
          onYes={() => {
            if (onCloseJob) onCloseJob(job.id);
            setShowCompleteConfirm(false);
          }}
          onCancel={() => setShowCompleteConfirm(false)}
        />
      )}
      {/* v28.288 (theme arc) — was a hand-rolled copy of ConfirmModal */}
      {showDeleteConfirm && (
        <ConfirmModal
          title={can("delete_jobs") ? "Delete Work Order?" : "Flag for Cancellation?"}
          message={
            <>
              <div style={{ marginBottom: 8 }}>
                <strong>Work Order #{job.id}</strong> — {job.customer}
              </div>
              <span style={{ fontSize: 12, color: C.muted }}>
                {can("delete_jobs")
                  ? "This work order will be moved to the Deleted Items page. It can be restored later."
                  : "This work order will be flagged for review. A manager or admin will need to approve the cancellation."}
              </span>
            </>
          }
          yesLabel={can("delete_jobs") ? "YES, DELETE" : "YES, FLAG IT"}
          onYes={() => {
            if (can("delete_jobs")) {
              onDeleteJob(job.id);
            } else {
              onFlagCancel(job.id);
            }
            setShowDeleteConfirm(false);
          }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}

export default JobCard;
