import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { C, API_URL } from "./config.js";
import { today, formatDate, calcTicketTotal, mapTicketFromApi, updateTicketApi } from "./utils.js";
import { Btn, TicketTypeBadge, TICKET_TYPES } from "./SharedUI.jsx";
import { RentalCountdown } from "./TicketDetail.jsx";
import TicketDetail from "./TicketDetail.jsx";
import AddTicketModal from "./AddTicketModal.jsx";
import { useApp } from "./AppContext.jsx";

function JobTicketsTab({ jobId, tickets, setTickets, jobs, onTicketDeleted }) {
  const { currentUser } = useApp();
  const navigate = useNavigate();
  const [isMobileNav] = useState(() => window.innerWidth <= 900);
  const [showAdd, setShowAdd] = useState(false);
  const [viewTicket, setViewTicket] = useState(null);
  const [viewTicketMode, setViewTicketMode] = useState("edit");
  const [qbConfirmId, setQbConfirmId] = useState(null);
  const [emailConfirm, setEmailConfirm] = useState(null); // { ticketId, email, emailedAt, cc }
  const [emailConfirmTo, setEmailConfirmTo] = useState("");
  const [emailConfirmCc, setEmailConfirmCc] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 900);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 900);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const openTicket = (t, mode = "edit") => {
    // Compute revision display labels
    const enriched = { ...t };
    if (t.replacedBy) {
      const replacement = tickets.find(tk => tk.id === t.replacedBy);
      enriched._replacedByLabel = replacement ? `${t.jobId}-${replacement.ticketNumber}` : null;
    }
    if (t.revisionOf) {
      const original = tickets.find(tk => tk.id === t.revisionOf);
      enriched._revisionOfLabel = original ? `${t.jobId}-${original.ticketNumber}` : null;
    }
    // Mobile: navigate to /ticket/:id as a real page
    if (isMobileNav) {
      navigate(`/ticket/${t.id}`, { state: { ticket: enriched, openToSign: mode === "sign" } });
      return;
    }
    // Desktop: open as modal overlay
    setViewTicketMode(mode);
    setViewTicket(enriched);
  };

  const jobTickets = tickets.filter(t => t.jobId === jobId);
  const byType = {};
  jobTickets.forEach(t => { byType[t.type] = [...(byType[t.type] || []), t]; });

  const handleAdd = async (ticketData) => {
    const payload = {
      job_id: ticketData.jobId, type: ticketData.type, status: ticketData.status || "incomplete",
      date: ticketData.date, notes: ticketData.notes,
      created_by: currentUser?.id || null,
      assigned_wells: ticketData.assignedWells || [],
      start_date: ticketData.startDate || null,
      end_date: ticketData.endDate || null,
      cycle_days: ticketData.cycleDays || 28,
      is_recurring: ticketData.isRecurring || false,
      lv_yard: ticketData.lvYard || null,
      arrival_time: ticketData.arrivalTime || null,
      due_on_loc: ticketData.dueOnLoc || null,
      job_start_time: ticketData.jobStartTime || null,
      job_end_time: ticketData.jobEndTime || null,
      ret_yard: ticketData.retYard || null,
      time_zone: ticketData.timeZone || null,
      mileage_begin: ticketData.mileageBegin !== undefined ? ticketData.mileageBegin : null,
      mileage_end: ticketData.mileageEnd !== undefined ? ticketData.mileageEnd : null,
      google_pin: ticketData.googlePin || null,
      pin_lat: ticketData.pinLat || null,
      pin_lng: ticketData.pinLng || null,
      site_mgr_first: ticketData.siteMgrFirst || null,
      site_mgr_last: ticketData.siteMgrLast || null,
      site_mgr_phone: ticketData.siteMgrPhone || null,
      site_mgr_email: ticketData.siteMgrEmail || null,
      yard_location_index: ticketData.yardLocationIndex || 1,
      lineItems: (ticketData.lineItems || []).map(li => ({
        qb_code: li.qbCode, description: li.desc, rate: li.rate, qty: li.qty, unit_measure: li.um, days: li.days || 1,
      })),
    };
    try {
      const r = await fetch(`${API_URL}/tickets`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (r.ok) {
        const saved = await r.json();
        setTickets(prev => [...prev, { ...ticketData, id: saved.id, ticketNumber: saved.ticket_number, createdBy: currentUser?.name || null, createdAt: new Date().toISOString() }]);
      }
    } catch (err) { console.error("Ticket create failed:", err); }
    setShowAdd(false);
  };

  const handleUpdate = (id, updates) => updateTicketApi(id, updates, setTickets);

  const handleDelete = async (id) => {
    try {
      const r = await fetch(`${API_URL}/tickets/${id}`, { method: "DELETE" });
      if (!r.ok) { console.error("Delete ticket failed:", await r.text()); return; }
    } catch (err) { console.error("Delete ticket failed:", err); return; }
    const deleted = tickets.find(t => t.id === id);
    if (deleted && onTicketDeleted) onTicketDeleted(deleted);
    setTickets(prev => prev.filter(t => t.id !== id));
    setViewTicket(null);
  };

  return (
    <div style={{ padding: "16px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.muted }}>
          {jobTickets.length} ticket{jobTickets.length !== 1 ? "s" : ""}
        </div>
        <Btn small onClick={() => setShowAdd(true)}>+ ADD TICKET</Btn>
      </div>

      {jobTickets.length === 0 && (
        <div style={{ textAlign: "center", padding: "24px 0", color: C.muted, fontSize: 13 }}>No tickets yet. Add one to get started.</div>
      )}

      {jobTickets.map(t => {
        const tcfg = TICKET_TYPES[t.type] || { color: C.muted, label: t.type || "Unknown" };
        const total = calcTicketTotal(t);
        const job = jobs.find(j => j.id === jobId);
        const custEmail = job?.pocEmail || job?.poc_email || null;
        const isSigned = ["signed", "sigNotReq", "emailed", "approved", "sentToQB", "qbVerified"].includes(t.status);
        const isApproved = t.status === "approved" || t.status === "sentToQB" || t.status === "qbVerified";
        const isEmailed = !!t.emailedAt;
        const hasPendingComment = !!t.hasPendingComment || !!t.has_pending_comment;
        const cycleEnded = !!t.cycleEnded || !!t.cycle_ended;
        const canSendToQB = isSigned && isApproved;

        // Button styles
        const btnBase = { borderRadius: 4, padding: "4px 10px", fontSize: 10, fontWeight: 800, cursor: "pointer", letterSpacing: "0.04em", border: "none", whiteSpace: "nowrap" };
        const btnAction = { ...btnBase, background: "#fdf5d8", color: "#8a6500", border: "1px solid #e6c20044" };
        const btnDone = { ...btnBase, background: "#e6f5ec", color: C.green, border: `1px solid ${C.green}44`, cursor: "default" };
        const btnDisabled = { ...btnBase, background: C.steel, color: C.muted, border: `1px solid ${C.border}`, cursor: "not-allowed", opacity: 0.6 };
        const btnBlue = { ...btnBase, background: "#e8f0fb", color: C.blue, border: `1px solid ${C.blue}44` };

        const isSent = ["sentToQB", "qbVerified"].includes(t.status);

        const isActiveTicket = viewTicket?.id === t.id;

        return (
          <div key={t.id} style={{
            background: isActiveTicket ? "#e8f0fb" : isSent ? "#f5f5f5" : C.cardBg,
            border: isActiveTicket ? `2px solid ${C.blue}` : `1px solid ${C.border}`,
            borderLeft: `3px solid ${isSent ? "#ccc" : tcfg.color}`,
            borderRadius: 5, marginBottom: 6,
            opacity: isSent && !isActiveTicket ? 0.6 : 1,
            boxShadow: isActiveTicket ? `0 2px 12px ${C.blue}33` : "none",
            transition: "all 0.15s ease",
          }}>
          {isMobile ? (
            // Mobile: stacked layout
            <div>
              <div onClick={() => openTicket(t, "edit")} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 12px", cursor: "pointer",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <TicketTypeBadge type={t.type} />
                  <div>
                    <div style={{ fontSize: 11, color: C.muted }}>#{t.jobId}{t.ticketNumber ? `-${t.ticketNumber}` : ""} · {formatDate(t.date)}</div>
                    {hasPendingComment && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 3, background: "#fdecea", color: "#B01020", borderRadius: 4, padding: "1px 6px", fontSize: 9, fontWeight: 800, letterSpacing: "0.04em", border: "1px solid #B0102044", marginTop: 3 }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#B01020", display: "inline-block" }} />
                        COMMENT PENDING
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>
                  {'$'}{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, padding: "0 12px 10px", flexWrap: "wrap" }}>
                {t.voidedAt ? (
                  <span style={{ background: "#fdecea", color: C.red, borderRadius: 4, padding: "2px 8px", fontSize: 10, fontWeight: 800, border: "1px solid #B0102044" }}>VOIDED</span>
                ) : (<>
                {cycleEnded && (
                  <span style={{ background: "#fdf5d8", color: "#8a6500", borderRadius: 4, padding: "2px 8px", fontSize: 10, fontWeight: 800, border: "1px solid #e6c20044" }}>CYCLE ENDED</span>
                )}
                <RentalCountdown ticket={t} />
                <span style={{ background: t.hasJSA ? "#e6f5ec" : C.steel, color: t.hasJSA ? C.green : C.muted, borderRadius: 4, padding: "2px 6px", fontSize: 9, fontWeight: 800, border: `1px solid ${t.hasJSA ? C.green + '44' : C.border}` }}>{t.hasJSA ? "✓ JSA" : "JSA"}</span>
                {/* Sig button */}
                {!isSigned && t.status !== "qbVerified" && t.status !== "sentToQB" && <button type="button" style={btnAction} onClick={() => openTicket(t, "sign")}>SIG REQUEST</button>}
                {t.status === "signed" && <span style={btnDone}>✓ SIGNED</span>}
                {t.status === "sigNotReq" && <span style={{ ...btnDone, color: C.blue }}>SIG NOT REQ</span>}
                {(t.status === "approved" || t.status === "sentToQB" || t.status === "qbVerified") && <span style={btnDone}>✓ SIGNED</span>}
                {/* Email */}
                {!custEmail && <span style={btnDisabled}>NO EMAIL ON FILE</span>}
                {custEmail && t.status !== "sentToQB" && t.status !== "qbVerified" && (
                  <button type="button"
                    style={isEmailed ? { ...btnDone, cursor: "pointer" } : btnBlue}
                    onClick={() => {
                      setEmailConfirm({ ticketId: t.id, email: t.emailTo || custEmail, emailedAt: t.emailedAt || null });
                      setEmailConfirmTo(t.emailTo || custEmail);
                      setEmailConfirmCc("");
                    }}>
                    {isEmailed ? "Emailed / Resend" : "EMAIL TICKET"}
                  </button>
                )}
                {/* Approval */}
                {isSigned && !isApproved && <button type="button" style={btnAction} onClick={async () => { await handleUpdate(t.id, { status: "approved", approvedBy: currentUser?.name, approvedAt: new Date().toISOString() }); }}>APPROVE</button>}
                {isApproved && t.status !== "sentToQB" && t.status !== "qbVerified" && <span style={btnDone}>✓ APPROVED</span>}
                {/* Send to Accounting */}
                {t.status !== "sentToQB" && t.status !== "qbVerified" && (
                  <button type="button" style={canSendToQB ? { ...btnBase, background: C.blue, color: C.white, border: "none" } : btnDisabled}
                    disabled={!canSendToQB} onClick={() => { if (canSendToQB) setQbConfirmId(t.id); }}>SEND TO ACCOUNTING</button>
                )}
                {(t.status === "sentToQB" || t.status === "qbVerified") && <span style={{ ...btnDone, background: C.green, color: C.white }}>✓ SENT TO ACCOUNTING</span>}
                </>)}
                {/* Delete — only if not sent to QB */}
                {!isSent && (
                  <span
                    title="Delete ticket"
                    onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(t.id); }}
                    style={{ fontSize: 14, color: "#ccc", cursor: "pointer", padding: "2px 4px" }}
                    onMouseEnter={e => { e.currentTarget.style.color = C.red; }}
                    onMouseLeave={e => { e.currentTarget.style.color = "#ccc"; }}
                  >🗑</span>
                )}
              </div>
            </div>
          ) : (
            // Desktop: horizontal layout
            <div style={{
              padding: "10px 14px",
              display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8,
            }}>
            {/* Left: full region is clickable = open ticket (matches mobile parity, Article XI).
                Any interactive element added here in the future must call e.stopPropagation(). */}
            <div
              onClick={() => openTicket(t, "edit")}
              style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1, cursor: "pointer" }}
              title="Open ticket"
            >
              <TicketTypeBadge type={t.type} />
              <span style={{ fontSize: 11, color: C.muted, whiteSpace: "nowrap" }}>#{t.jobId}{t.ticketNumber ? `-${t.ticketNumber}` : ""} · {formatDate(t.date)}</span>
              <span style={{ fontSize: 11, color: C.muted }}>{t.lineItems.length} items</span>
              {hasPendingComment && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#fdecea", color: "#B01020", borderRadius: 4, padding: "2px 8px", fontSize: 10, fontWeight: 800, letterSpacing: "0.04em", border: "1px solid #B0102044" }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#B01020", display: "inline-block" }} />
                  COMMENT PENDING
                </span>
              )}
              {t.voidedAt && (
                <span style={{ background: "#fdecea", color: C.red, borderRadius: 4, padding: "2px 8px", fontSize: 10, fontWeight: 800, letterSpacing: "0.04em", border: "1px solid #B0102044" }}>VOIDED</span>
              )}
              {cycleEnded && !t.voidedAt && (
                <span style={{ background: "#fdf5d8", color: "#8a6500", borderRadius: 4, padding: "2px 8px", fontSize: 10, fontWeight: 800, letterSpacing: "0.04em", border: "1px solid #e6c20044" }}>CYCLE ENDED</span>
              )}
              <RentalCountdown ticket={t} />
            </div>

            {/* Right: action buttons + total — JSA badge is here as part of the
                workflow progression (required before ticket closure) */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <span style={{ background: t.hasJSA ? "#e6f5ec" : C.steel, color: t.hasJSA ? C.green : C.muted, borderRadius: 4, padding: "2px 6px", fontSize: 9, fontWeight: 800, letterSpacing: "0.04em", border: `1px solid ${t.hasJSA ? C.green + '44' : C.border}` }}>{t.hasJSA ? "✓ JSA" : "JSA"}</span>

            {t.voidedAt ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: C.muted, fontStyle: "italic" }}>Voided</span>
                {["owner", "admin"].includes(currentUser?.role) && (
                  <button type="button" onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      await fetch(`${API_URL}/archive`, {
                        method: "POST", headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ entity_type: "ticket", entity_id: t.id, archived_by: currentUser.id, archive_reason: "voided" }),
                      });
                      setTickets(prev => prev.filter(tk => tk.id !== t.id));
                    } catch (err) { console.error("Archive failed:", err); }
                  }} style={{ background: "transparent", border: `1px solid ${C.blue}44`, color: C.blue, fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 4, cursor: "pointer" }}>ARCHIVE</button>
                )}
              </div>
            ) : (<>
              {/* Col 2: Signature */}
              {!isSigned && t.status !== "qbVerified" && t.status !== "sentToQB" && (
                <button type="button" style={btnAction} onClick={() => openTicket(t, "sign")}>SIGNATURE REQUEST</button>
              )}
              {t.status === "signed" && (
                <span style={btnDone}>✓ SIGNED</span>
              )}
              {t.status === "sigNotReq" && (
                <span style={{ ...btnDone, background: "#e8f0fb", color: C.blue, border: `1px solid ${C.blue}44` }}>SIG NOT REQ</span>
              )}
              {(t.status === "approved" || t.status === "sentToQB" || t.status === "qbVerified") && (
                <span style={btnDone}>✓ SIGNED</span>
              )}

              {/* Col 3: Email */}
              {!custEmail && (
                <span style={btnDisabled}>NO EMAIL ON FILE</span>
              )}
              {custEmail && t.status !== "sentToQB" && t.status !== "qbVerified" && (
                <button type="button"
                  style={isEmailed ? { ...btnDone, cursor: "pointer" } : btnBlue}
                  onClick={() => {
                    setEmailConfirm({ ticketId: t.id, email: t.emailTo || custEmail, emailedAt: t.emailedAt || null });
                    setEmailConfirmTo(t.emailTo || custEmail);
                    setEmailConfirmCc("");
                  }}>
                  {isEmailed ? "Emailed / Resend" : "EMAIL TICKET"}
                </button>
              )}
              {custEmail && (t.status === "sentToQB" || t.status === "qbVerified") && (
                <span style={isEmailed ? btnDone : btnDisabled}>{isEmailed ? "✓ CUSTOMER EMAILED" : "NO EMAIL ON FILE"}</span>
              )}

              {/* Col 4: Approval */}
              {!isSigned && !isApproved && (
                <span style={btnDisabled}>APPROVAL NEEDED</span>
              )}
              {isSigned && !isApproved && (
                <button type="button" style={btnAction} onClick={async () => {
                  await handleUpdate(t.id, { status: "approved", approvedBy: currentUser?.name, approvedAt: new Date().toISOString() });
                }}>APPROVAL NEEDED</button>
              )}
              {isApproved && t.status !== "sentToQB" && t.status !== "qbVerified" && (
                <span style={btnDone}>✓ APPROVED</span>
              )}
              {(t.status === "sentToQB" || t.status === "qbVerified") && (
                <span style={btnDone}>✓ APPROVED</span>
              )}

              {/* Col 5: Send to Accounting */}
              {t.status !== "sentToQB" && t.status !== "qbVerified" && (
                <button type="button" style={canSendToQB ? { ...btnBase, background: C.blue, color: C.white, border: "none" } : btnDisabled}
                  disabled={!canSendToQB}
                  onClick={() => { if (canSendToQB) setQbConfirmId(t.id); }}>SEND TO ACCOUNTING</button>
              )}
              {(t.status === "sentToQB" || t.status === "qbVerified") && (
                <span style={{ ...btnDone, background: C.green, color: C.white, border: "none" }}>✓ SENT TO ACCOUNTING</span>
              )}
            </>)}

              {/* Total */}
              <span style={{ fontSize: 13, fontWeight: 800, color: C.text, marginLeft: 6 }}>
                {'$'}{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              {/* Delete — only if not sent to QB */}
              {!isSent && (
                <span
                  title="Delete ticket"
                  onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(t.id); }}
                  style={{ fontSize: 14, color: "#ccc", cursor: "pointer", marginLeft: 4, padding: "2px 4px" }}
                  onMouseEnter={e => { e.currentTarget.style.color = C.red; }}
                  onMouseLeave={e => { e.currentTarget.style.color = "#ccc"; }}
                >🗑</span>
              )}
            </div>
          </div>
          )}
          </div>
        );
      })}

      {showAdd && <AddTicketModal jobId={jobId} job={jobs.find(j => j.id === jobId)} onSave={handleAdd} onClose={() => setShowAdd(false)} jobWells={(jobs.find(j => j.id === jobId)?.wells || []).map(w => w.well_name || w)} />}
      {viewTicket && (
        <TicketDetail
          ticket={viewTicket} jobs={jobs}
          openToSign={viewTicketMode === "sign"}
          onUpdate={(id, updates) => { handleUpdate(id, updates); setViewTicket(prev => prev ? { ...prev, ...updates } : null); }}
          onClose={() => setViewTicket(null)}
          onDelete={(id) => { handleDelete(id); }}
          onDuplicate={async (t, opts = {}) => {
            try {
              const targetJobId = opts.new_job_id || t.jobId;
              const r = await fetch(`${API_URL}/tickets/${t.id}/duplicate`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  new_date: opts.new_date || (t.date ? t.date.slice(0, 10) : today()),
                  new_job_id: opts.new_job_id || undefined,
                  new_type: opts.new_type || undefined,
                  assigned_wells: opts.assigned_wells ?? t.assignedWells,
                  include_notes: opts.include_notes ?? true,
                  include_line_items: opts.include_line_items ?? true,
                  include_pin: opts.include_pin ?? true,
                  created_by: currentUser?.id || null,
                }),
              });
              if (!r.ok) { const d = await r.json(); alert(d.error || "Duplicate failed"); return; }
              const saved = await r.json();
              // Reload tickets for the target job
              const tr = await fetch(`${API_URL}/tickets?job_id=${targetJobId}&include_voided=true`);
              if (tr.ok) {
                const data = await tr.json();
                const mapped = data.map(mapTicketFromApi);
                setTickets(prev => {
                  // Remove old tickets for target job, add refreshed ones
                  const otherJobs = prev.filter(tk => tk.jobId !== targetJobId);
                  // If duplicating to a different job, also keep source job tickets
                  if (targetJobId !== t.jobId) {
                    const sourceJobTickets = prev.filter(tk => tk.jobId === t.jobId);
                    return [...otherJobs.filter(tk => tk.jobId !== t.jobId), ...sourceJobTickets, ...mapped];
                  }
                  return [...otherJobs, ...mapped];
                });
                if (targetJobId === t.jobId) {
                  // Same job — open the new ticket inline
                  const newTicket = mapped.find(tk => tk.id === saved.id);
                  if (newTicket) {
                    setViewTicket(null);
                    setTimeout(() => {
                      setViewTicketMode("edit");
                      setViewTicket({ ...newTicket, _duplicateReminder: true });
                    }, 50);
                  }
                } else {
                  // Different job — close modal, navigate to target job
                  setViewTicket(null);
                }
              }
            } catch (err) { alert("Duplicate failed: " + err.message); }
          }}
          onRevise={async (t) => {
            try {
              const r = await fetch(`${API_URL}/tickets/${t.id}/revise`, {
                method: "POST", headers: { "Content-Type": "application/json" },
              });
              if (!r.ok) { const d = await r.json(); alert(d.error || "Revise failed"); return; }
              const saved = await r.json();
              // Send void notification email for the old ticket
              try {
                await fetch(`${API_URL}/signature/void-notify/${t.id}`, {
                  method: "POST", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ new_ticket_number: saved.ticket_number, new_ticket_id: saved.id }),
                });
              } catch (e) { console.error("Void notify failed:", e); }
              // Reload all tickets for this job (includes voided + new)
              const tr = await fetch(`${API_URL}/tickets?job_id=${t.jobId}&include_voided=true`);
              if (tr.ok) {
                const data = await tr.json();
                const mapped = data.map(mapTicketFromApi);
                setTickets(prev => {
                  const otherJobs = prev.filter(tk => tk.jobId !== t.jobId);
                  return [...otherJobs, ...mapped];
                });
              // Open the new revision ticket — close first to force remount
                const newTicket = mapped.find(tk => tk.id === saved.id);
                if (newTicket) {
                  setViewTicket(null);
                  setTimeout(() => {
                    setViewTicketMode("edit");
                    setViewTicket(newTicket);
                  }, 50);
                }
              }
            } catch (err) { alert("Revise failed: " + err.message); }
          }}
        />
      )}
      {/* Delete ticket confirmation */}
      {deleteConfirmId && (() => {
        const delTicket = jobTickets.find(t => t.id === deleteConfirmId);
        return (
          <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }} onClick={() => setDeleteConfirmId(null)}>
            <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderTop: `4px solid ${C.red}`, borderRadius: 8, padding: 28, width: 420, maxWidth: "90vw" }} onClick={e => e.stopPropagation()}>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 12 }}>Delete Ticket?</div>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>
                This will permanently delete ticket #{delTicket?.jobId}{delTicket?.ticketNumber ? `-${delTicket.ticketNumber}` : ""} ({delTicket?.type}). This cannot be undone.
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <Btn variant="red" onClick={async () => {
                  try {
                    const r = await fetch(`${API_URL}/tickets/${deleteConfirmId}`, { method: "DELETE" });
                    if (r.ok) {
                      setTickets(prev => prev.filter(tk => tk.id !== deleteConfirmId));
                      setDeleteConfirmId(null);
                    } else {
                      const d = await r.json();
                      alert(d.error || "Delete failed");
                    }
                  } catch (err) { alert("Delete failed: " + err.message); }
                }}>DELETE</Btn>
                <Btn variant="ghost" onClick={() => setDeleteConfirmId(null)}>CANCEL</Btn>
              </div>
            </div>
          </div>
        );
      })()}
      {qbConfirmId && (
        <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }} onClick={() => setQbConfirmId(null)}>
          <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderTop: `4px solid ${C.blue}`, borderRadius: 8, padding: 28, width: 420, maxWidth: "90vw" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 12 }}>Send to Accounting?</div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 24, lineHeight: 1.6 }}>
              Once submitted, this ticket will be permanently locked. No further edits, signatures, or deletions will be permitted.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn variant="blue" onClick={async () => {
                await handleUpdate(qbConfirmId, { status: "sentToQB", sentToQBAt: new Date().toISOString() });
                setQbConfirmId(null);
              }}>CONFIRM — SEND TO ACCOUNTING</Btn>
              <Btn variant="ghost" onClick={() => setQbConfirmId(null)}>CANCEL</Btn>
            </div>
          </div>
        </div>
      )}
      {emailConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }} onClick={() => setEmailConfirm(null)}>
          <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderTop: `4px solid ${C.blue}`, borderRadius: 8, padding: 28, width: 460, maxWidth: "90vw" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 8 }}>
              {emailConfirm.emailedAt ? "Resend Signature Request?" : "Send Signature Request"}
            </div>
            {emailConfirm.emailedAt && (
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 12, lineHeight: 1.6 }}>
                Last sent: <strong>{new Date(emailConfirm.emailedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}</strong>
              </div>
            )}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: "0.06em" }}>TO</label>
              <input
                style={{ width: "100%", padding: "10px 12px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 14, marginTop: 4, boxSizing: "border-box" }}
                value={emailConfirmTo} onChange={e => setEmailConfirmTo(e.target.value)}
                placeholder="recipient@company.com"
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: "0.06em" }}>CC (optional)</label>
              <input
                style={{ width: "100%", padding: "10px 12px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 14, marginTop: 4, boxSizing: "border-box" }}
                value={emailConfirmCc} onChange={e => setEmailConfirmCc(e.target.value)}
                placeholder="cc@company.com"
              />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn variant="blue" onClick={async () => {
                const email = emailConfirmTo.trim();
                if (!email) { alert("Enter a recipient email."); return; }
                try {
                  await handleUpdate(emailConfirm.ticketId, { emailTo: email });
                  const r = await fetch(`${API_URL}/signature/send/${emailConfirm.ticketId}`, {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ performed_by: currentUser?.name }),
                  });
                  if (!r.ok) { const d = await r.json(); alert(d.error || "Email failed"); return; }
                  setTickets(prev => prev.map(tk => tk.id === emailConfirm.ticketId ? { ...tk, status: "emailed", emailTo: email, emailedAt: new Date().toISOString() } : tk));
                  setEmailConfirm(null);
                } catch (err) { alert("Email send failed: " + err.message); }
              }}>SEND</Btn>
              <Btn variant="ghost" onClick={() => setEmailConfirm(null)}>CANCEL</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


export default JobTicketsTab;
