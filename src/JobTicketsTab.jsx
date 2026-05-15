import { useState } from "react";
import { C, API_URL } from "./config.js";
import { today, formatDate, calcTicketTotal, mapTicketFromApi, updateTicketApi, reviseTicketRequest } from "./utils.js";
import { Btn, TicketTypeBadge, TICKET_TYPES, PANEL_TEXT, PANEL_MUTED } from "./SharedUI.jsx";
import { RentalCountdown } from "./TicketDetail.jsx";
import TicketDetail from "./TicketDetail.jsx";
import AddTicketModal from "./AddTicketModal.jsx";
import { useApp } from "./AppContext.jsx";
import useIsMobile from "./useIsMobile.js";
import useJobTicketsView from "./useJobTicketsView.js";
import JobTicketsHeader from "./JobTicketsHeader.jsx";
import useTicketEmailRequest from "./useTicketEmailRequest.js";
import EmailSignatureRequestModal from "./EmailSignatureRequestModal.jsx";
import JobTicketsDeleteConfirm from "./JobTicketsDeleteConfirm.jsx";
import useAddTicket from "./useAddTicket.js";
import useTicketModalRouting from "./useTicketModalRouting.js";

function JobTicketsTab({ jobId, tickets, setTickets, jobs, onTicketDeleted }) {
  const { currentUser, showNotice } = useApp();
  const { showAdd, openAdd, closeAdd, handleAdd } = useAddTicket({ setTickets });
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const emailRequest = useTicketEmailRequest({ setTickets });
  const isMobile = useIsMobile();
  const { viewTicket, viewTicketMode, setViewTicket, setViewTicketMode, openTicket, closeViewTicket } = useTicketModalRouting({ tickets, isMobile });

  // v28.40 — WO surface shows only tickets in the lead's domain. Approved
  // tickets ship to Final Review; sentToQB / qbVerified / voided tickets
  // ship to Archive. Derivation extracted to useJobTicketsView in v28.83.
  const { jobTickets, movedToFinalReview } = useJobTicketsView(tickets, jobId);

  const handleUpdate = (id, updates) => updateTicketApi(id, updates, setTickets);

  // v28.87 — unified delete path. Used by both the detail-modal onDelete
  // and the row-level delete-confirm modal. Returns true on success so
  // the caller can close its own UI; surfaces a user-facing notice on
  // failure (was a silent console.error in the v28.85 detail-modal path).
  const handleDelete = async (id) => {
    try {
      const r = await fetch(`${API_URL}/tickets/${id}`, { method: "DELETE" });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        showNotice("Delete Failed", d.error || `Could not delete the ticket (HTTP ${r.status}).`, "error");
        return false;
      }
    } catch (err) {
      showNotice("Delete Failed", err.message, "error");
      return false;
    }
    const deleted = tickets.find((t) => t.id === id);
    if (deleted && onTicketDeleted) onTicketDeleted(deleted);
    setTickets((prev) => prev.filter((t) => t.id !== id));
    setViewTicket(null);
    return true;
  };

  return (
    <div style={{ padding: "16px 0" }}>
      <JobTicketsHeader ticketCount={jobTickets.length} approvedCount={movedToFinalReview} onAdd={openAdd} />

      {jobTickets.length === 0 && (
        <div style={{ textAlign: "center", padding: "24px 0", color: C.muted, fontSize: 13 }}>No tickets yet. Add one to get started.</div>
      )}

      {jobTickets.map((t) => {
        const tcfg = TICKET_TYPES[t.type] || { color: C.muted, label: t.type || "Unknown" };
        const total = calcTicketTotal(t);
        const job = jobs.find((j) => j.id === jobId);
        const custEmail = job?.pocEmail || job?.poc_email || null;
        const isSigned = ["signed", "sigNotReq", "emailed", "approved", "sentToQB", "qbVerified"].includes(t.status);
        const isApproved = t.status === "approved" || t.status === "sentToQB" || t.status === "qbVerified";
        const isEmailed = !!t.emailedAt;
        const hasPendingComment = !!t.hasPendingComment || !!t.has_pending_comment;
        const cycleEnded = !!t.cycleEnded || !!t.cycle_ended;
        // v28.41 — gate on jsaCompleted, not hasJSA. A draft JSA (saved but
        // not MARK COMPLETE'd) is no longer enough to unlock signing/email/
        // approve. The lead must finalize the JSA via MARK COMPLETE first.
        const needsJSA = !t.jsaCompleted && !t.voidedAt && t.type !== "Rental";
        // Three badge states: completed (green ✓), draft (amber pill), none (gray).
        const jsaBadge = t.jsaCompleted
          ? { bg: "#e6f5ec", color: C.green, border: C.green + "44", label: "✓ JSA" }
          : t.hasJSA
            ? { bg: "#fdf5d8", color: "#8a6500", border: "#e6c20044", label: "JSA — DRAFT" }
            : { bg: C.steel, color: C.muted, border: C.border, label: "JSA" };

        // Button styles
        const btnBase = {
          borderRadius: 4,
          padding: "4px 10px",
          fontSize: 10,
          fontWeight: 800,
          cursor: "pointer",
          letterSpacing: "0.04em",
          border: "none",
          whiteSpace: "nowrap",
        };
        const btnAction = { ...btnBase, background: "#fdf5d8", color: "#8a6500", border: "1px solid #e6c20044" };
        const btnDone = { ...btnBase, background: "#e6f5ec", color: C.green, border: `1px solid ${C.green}44`, cursor: "default" };
        const btnDisabled = { ...btnBase, background: C.steel, color: C.muted, border: `1px solid ${C.border}`, cursor: "not-allowed", opacity: 0.6 };
        const btnBlue = { ...btnBase, background: "#e8f0fb", color: C.blue, border: `1px solid ${C.blue}44` };

        const isSent = ["sentToQB", "qbVerified"].includes(t.status);

        const isActiveTicket = viewTicket?.id === t.id;

        // v28.53 — when the card bg is forced always-light (active ticket
        // highlight #e8f0fb or sent-to-QB faded #f5f5f5), bare text on the
        // card surface must use PANEL_TEXT/MUTED. Otherwise C.text/muted
        // theme-flips and goes invisible in dark mode on the always-light
        // surface — same bug class as the v28.44 pastel-panel sweep.
        const cardIsLight = isActiveTicket || isSent;
        const cardText = cardIsLight ? PANEL_TEXT : C.text;
        const cardMuted = cardIsLight ? PANEL_MUTED : C.muted;

        return (
          <div
            key={t.id}
            style={{
              background: isActiveTicket ? "#e8f0fb" : isSent ? "#f5f5f5" : C.cardBg,
              border: isActiveTicket ? `2px solid ${C.blue}` : `1px solid ${C.border}`,
              borderLeft: `3px solid ${isSent ? "#ccc" : tcfg.color}`,
              borderRadius: 5,
              marginBottom: 6,
              opacity: isSent && !isActiveTicket ? 0.6 : 1,
              boxShadow: isActiveTicket ? `0 2px 12px ${C.blue}33` : "none",
              transition: "all 0.15s ease",
            }}
          >
            {isMobile ? (
              // Mobile: stacked layout
              <div>
                <div
                  onClick={() => openTicket(t, "edit")}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 12px",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                      <TicketTypeBadge type={t.type} />
                      <span style={{ fontSize: 9, color: cardMuted, fontWeight: 600, whiteSpace: "nowrap" }}>
                        #{t.jobId}
                        {t.ticketNumber ? `-${t.ticketNumber}` : ""}
                      </span>
                    </div>
                    <div>
                      <div style={{ fontSize: 8, color: cardMuted, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Job Date</div>
                      <div style={{ fontSize: 11, color: cardText, fontWeight: 600 }}>{formatDate(t.date)}</div>
                      {t.createdBy && (
                        <>
                          <div style={{ fontSize: 8, color: cardMuted, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 5 }}>
                            Created by
                          </div>
                          <div style={{ fontSize: 10, color: cardText, fontWeight: 600 }}>{t.createdBy}</div>
                          {t.createdAt && (
                            <div style={{ fontSize: 9, color: "#a0aec8" }}>
                              {new Date(t.createdAt).toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "2-digit" })}
                              {" · "}
                              {new Date(t.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                            </div>
                          )}
                        </>
                      )}
                      {hasPendingComment && (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 3,
                            background: "#fdecea",
                            color: "#B01020",
                            borderRadius: 4,
                            padding: "1px 6px",
                            fontSize: 9,
                            fontWeight: 800,
                            letterSpacing: "0.04em",
                            border: "1px solid #B0102044",
                            marginTop: 4,
                          }}
                        >
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#B01020", display: "inline-block" }} />
                          COMMENT PENDING
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: cardText }}>
                    {"$"}
                    {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, padding: "0 12px 10px", flexWrap: "wrap" }}>
                  {t.voidedAt ? (
                    <span
                      style={{
                        background: "#fdecea",
                        color: C.red,
                        borderRadius: 4,
                        padding: "2px 8px",
                        fontSize: 10,
                        fontWeight: 800,
                        border: "1px solid #B0102044",
                      }}
                    >
                      VOIDED
                    </span>
                  ) : (
                    <>
                      {cycleEnded && (
                        <span
                          style={{
                            background: "#fdf5d8",
                            color: "#8a6500",
                            borderRadius: 4,
                            padding: "2px 8px",
                            fontSize: 10,
                            fontWeight: 800,
                            border: "1px solid #e6c20044",
                          }}
                        >
                          CYCLE ENDED
                        </span>
                      )}
                      <RentalCountdown ticket={t} />
                      {/* v28.52 — match btnBase padding/fontSize so the JSA badge
                    sits at the same vertical height as the action buttons
                    next to it. Pre-fix: padding "2px 6px" + fontSize 9 made
                    it visibly shorter than the other badges/buttons in the
                    row, which Reggie called out as making the row look
                    nonuniform. */}
                      <span
                        style={{
                          background: jsaBadge.bg,
                          color: jsaBadge.color,
                          borderRadius: 4,
                          padding: "4px 10px",
                          fontSize: 10,
                          fontWeight: 800,
                          letterSpacing: "0.04em",
                          border: `1px solid ${jsaBadge.border}`,
                        }}
                      >
                        {jsaBadge.label}
                      </span>
                      {/* Sig button — greyed out if no JSA */}
                      {!isSigned && t.status !== "qbVerified" && t.status !== "sentToQB" && (
                        <button
                          type="button"
                          style={needsJSA ? btnDisabled : btnAction}
                          disabled={needsJSA}
                          onClick={() => {
                            if (!needsJSA) openTicket(t, "sign");
                          }}
                          title={needsJSA ? "Complete JSA before proceeding" : ""}
                        >
                          {needsJSA ? "JSA REQ'D" : "SIG REQUEST"}
                        </button>
                      )}
                      {t.status === "signed" && <span style={btnDone}>✓ SIGNED</span>}
                      {t.status === "sigNotReq" && <span style={{ ...btnDone, color: C.blue }}>SIG NOT REQ</span>}
                      {(t.status === "approved" || t.status === "sentToQB" || t.status === "qbVerified") && <span style={btnDone}>✓ SIGNED</span>}
                      {/* Email — greyed out if no JSA */}
                      {!custEmail && <span style={btnDisabled}>NO EMAIL ON FILE</span>}
                      {custEmail && t.status !== "sentToQB" && t.status !== "qbVerified" && (
                        <button
                          type="button"
                          style={needsJSA ? btnDisabled : isEmailed ? { ...btnDone, cursor: "pointer" } : btnBlue}
                          disabled={needsJSA}
                          title={needsJSA ? "Complete JSA before emailing" : ""}
                          onClick={() => {
                            if (needsJSA) return;
                            emailRequest.openEmailRequest(t, custEmail);
                          }}
                        >
                          {isEmailed ? "Emailed / Resend" : "EMAIL TICKET"}
                        </button>
                      )}
                      {/* Approval — greyed out if no JSA */}
                      {isSigned && !isApproved && (
                        <button
                          type="button"
                          style={needsJSA ? btnDisabled : btnAction}
                          disabled={needsJSA}
                          title={needsJSA ? "Complete JSA before approving" : ""}
                          onClick={async () => {
                            if (!needsJSA)
                              await handleUpdate(t.id, { status: "approved", approvedBy: currentUser?.name, approvedAt: new Date().toISOString() });
                          }}
                        >
                          APPROVE
                        </button>
                      )}
                      {isApproved && t.status !== "sentToQB" && t.status !== "qbVerified" && <span style={btnDone}>✓ APPROVED</span>}
                      {(t.status === "sentToQB" || t.status === "qbVerified") && (
                        <span style={{ ...btnDone, background: C.green, color: C.white }}>✓ SENT TO ACCOUNTING</span>
                      )}
                    </>
                  )}
                  {/* Delete — only if not sent to QB */}
                  {!isSent && (
                    // v27.69: aria-label for accessibility (screen readers +
                    // assistive tech) but no `title=` — browser-native tooltip
                    // has 1.5s delay and is invisible on mobile. The trash icon
                    // plus red-on-hover color is the visible affordance.
                    <span
                      aria-label="Delete ticket"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmId(t.id);
                      }}
                      style={{ fontSize: 14, color: "#ccc", cursor: "pointer", padding: "2px 4px" }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = C.red;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "#ccc";
                      }}
                    >
                      🗑
                    </span>
                  )}
                </div>
              </div>
            ) : (
              // Desktop: horizontal layout
              <div
                style={{
                  padding: "10px 14px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                {/* Left: full region is clickable = open ticket (matches mobile parity, Article XI).
                Any interactive element added here in the future must call e.stopPropagation(). */}
                <div
                  onClick={() => openTicket(t, "edit")}
                  style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1, cursor: "pointer" }}
                  aria-label="Open ticket"
                >
                  {/* Ticket badge + # stacked */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, minWidth: 70 }}>
                    <TicketTypeBadge type={t.type} />
                    <span style={{ fontSize: 10, color: cardMuted, whiteSpace: "nowrap", fontWeight: 600 }}>
                      #{t.jobId}
                      {t.ticketNumber ? `-${t.ticketNumber}` : ""}
                    </span>
                  </div>
                  {/* Scheduled job date — separate from creation time so the bold date can't be confused with "when it was saved" */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 90 }}>
                    <span style={{ fontSize: 8, color: cardMuted, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                      Job Date
                    </span>
                    <span style={{ fontSize: 11, color: cardText, fontWeight: 600, whiteSpace: "nowrap" }}>{formatDate(t.date)}</span>
                  </div>
                  {/* Created by: name + full date/time of creation. Paired together so the timestamp is unambiguously the audit stamp, not the job date. */}
                  {t.createdBy && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 130 }}>
                      <span
                        style={{ fontSize: 8, color: cardMuted, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", whiteSpace: "nowrap" }}
                      >
                        Created by
                      </span>
                      <span style={{ fontSize: 11, color: cardText, fontWeight: 600, whiteSpace: "nowrap" }}>{t.createdBy}</span>
                      {t.createdAt && (
                        <span style={{ fontSize: 9, color: "#a0aec8", whiteSpace: "nowrap" }}>
                          {new Date(t.createdAt).toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "2-digit" })}
                          {" · "}
                          {new Date(t.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                  )}
                  {hasPendingComment && (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        background: "#fdecea",
                        color: "#B01020",
                        borderRadius: 4,
                        padding: "2px 8px",
                        fontSize: 10,
                        fontWeight: 800,
                        letterSpacing: "0.04em",
                        border: "1px solid #B0102044",
                      }}
                    >
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#B01020", display: "inline-block" }} />
                      COMMENT PENDING
                    </span>
                  )}
                  {t.voidedAt && (
                    <span
                      style={{
                        background: "#fdecea",
                        color: C.red,
                        borderRadius: 4,
                        padding: "2px 8px",
                        fontSize: 10,
                        fontWeight: 800,
                        letterSpacing: "0.04em",
                        border: "1px solid #B0102044",
                      }}
                    >
                      VOIDED
                    </span>
                  )}
                  {cycleEnded && !t.voidedAt && (
                    <span
                      style={{
                        background: "#fdf5d8",
                        color: "#8a6500",
                        borderRadius: 4,
                        padding: "2px 8px",
                        fontSize: 10,
                        fontWeight: 800,
                        letterSpacing: "0.04em",
                        border: "1px solid #e6c20044",
                      }}
                    >
                      CYCLE ENDED
                    </span>
                  )}
                  <RentalCountdown ticket={t} />
                </div>

                {/* Right: action buttons + total — JSA badge is here as part of the
                workflow progression (required before ticket closure) */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  <span
                    style={{
                      background: jsaBadge.bg,
                      color: jsaBadge.color,
                      borderRadius: 4,
                      padding: "4px 10px",
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: "0.04em",
                      border: `1px solid ${jsaBadge.border}`,
                    }}
                  >
                    {jsaBadge.label}
                  </span>

                  {t.voidedAt ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, color: cardMuted, fontStyle: "italic" }}>Voided</span>
                      {["owner", "admin"].includes(currentUser?.role) && (
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              await fetch(`${API_URL}/archive`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ entity_type: "ticket", entity_id: t.id, archived_by: currentUser.id, archive_reason: "voided" }),
                              });
                              setTickets((prev) => prev.filter((tk) => tk.id !== t.id));
                            } catch (err) {
                              console.error("Archive failed:", err);
                            }
                          }}
                          style={{
                            background: "transparent",
                            border: `1px solid ${C.blue}44`,
                            color: C.blue,
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "3px 10px",
                            borderRadius: 4,
                            cursor: "pointer",
                          }}
                        >
                          ARCHIVE
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      {/* Col 2: Signature — greyed out if no JSA */}
                      {!isSigned && t.status !== "qbVerified" && t.status !== "sentToQB" && (
                        <button
                          type="button"
                          style={needsJSA ? btnDisabled : btnAction}
                          disabled={needsJSA}
                          onClick={() => {
                            if (!needsJSA) openTicket(t, "sign");
                          }}
                          title={needsJSA ? "Complete JSA before proceeding" : ""}
                        >
                          SIGNATURE REQUEST
                        </button>
                      )}
                      {t.status === "signed" && <span style={btnDone}>✓ SIGNED</span>}
                      {t.status === "sigNotReq" && (
                        <span style={{ ...btnDone, background: "#e8f0fb", color: C.blue, border: `1px solid ${C.blue}44` }}>SIG NOT REQ</span>
                      )}
                      {(t.status === "approved" || t.status === "sentToQB" || t.status === "qbVerified") && <span style={btnDone}>✓ SIGNED</span>}

                      {/* Col 3: Email — greyed out if no JSA */}
                      {!custEmail && <span style={btnDisabled}>NO EMAIL ON FILE</span>}
                      {custEmail && t.status !== "sentToQB" && t.status !== "qbVerified" && (
                        <button
                          type="button"
                          style={needsJSA ? btnDisabled : isEmailed ? { ...btnDone, cursor: "pointer" } : btnBlue}
                          disabled={needsJSA}
                          title={needsJSA ? "Complete JSA before emailing" : ""}
                          onClick={() => {
                            if (needsJSA) return;
                            emailRequest.openEmailRequest(t, custEmail);
                          }}
                        >
                          {isEmailed ? "Emailed / Resend" : "EMAIL TICKET"}
                        </button>
                      )}
                      {custEmail && (t.status === "sentToQB" || t.status === "qbVerified") && (
                        <span style={isEmailed ? btnDone : btnDisabled}>{isEmailed ? "✓ CUSTOMER EMAILED" : "NO EMAIL ON FILE"}</span>
                      )}

                      {/* Col 4: Approval — greyed out if no JSA */}
                      {!isSigned && !isApproved && <span style={btnDisabled}>APPROVAL NEEDED</span>}
                      {isSigned && !isApproved && (
                        <button
                          type="button"
                          style={needsJSA ? btnDisabled : btnAction}
                          disabled={needsJSA}
                          title={needsJSA ? "Complete JSA before approving" : ""}
                          onClick={async () => {
                            if (!needsJSA)
                              await handleUpdate(t.id, { status: "approved", approvedBy: currentUser?.name, approvedAt: new Date().toISOString() });
                          }}
                        >
                          APPROVAL NEEDED
                        </button>
                      )}
                      {isApproved && t.status !== "sentToQB" && t.status !== "qbVerified" && <span style={btnDone}>✓ APPROVED</span>}
                      {(t.status === "sentToQB" || t.status === "qbVerified") && <span style={btnDone}>✓ APPROVED</span>}

                      {/* Col 5: Accounting status (send action moved to Final Review only) */}
                      {(t.status === "sentToQB" || t.status === "qbVerified") && (
                        <span style={{ ...btnDone, background: C.green, color: C.white, border: "none" }}>✓ SENT TO ACCOUNTING</span>
                      )}
                    </>
                  )}

                  {/* Total */}
                  <span style={{ fontSize: 13, fontWeight: 800, color: cardText, marginLeft: 6 }}>
                    {"$"}
                    {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  {/* Delete — only if not sent to QB */}
                  {!isSent && (
                    <span
                      aria-label="Delete ticket"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmId(t.id);
                      }}
                      style={{ fontSize: 14, color: "#ccc", cursor: "pointer", marginLeft: 4, padding: "2px 4px" }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = C.red;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "#ccc";
                      }}
                    >
                      🗑
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {showAdd && (
        <AddTicketModal
          jobId={jobId}
          job={jobs.find((j) => j.id === jobId)}
          onSave={handleAdd}
          onClose={closeAdd}
          jobWells={(jobs.find((j) => j.id === jobId)?.wells || []).map((w) => w.well_name || w)}
        />
      )}
      {viewTicket && (
        <TicketDetail
          key={viewTicket.id}
          ticket={viewTicket}
          jobs={jobs}
          tickets={tickets}
          openToSign={viewTicketMode === "sign"}
          onUpdate={(id, updates) => {
            handleUpdate(id, updates);
            setViewTicket((prev) => (prev ? { ...prev, ...updates } : null));
          }}
          onClose={closeViewTicket}
          onDelete={(id) => {
            handleDelete(id);
          }}
          onDuplicate={async (t, opts = {}) => {
            try {
              const targetJobId = opts.new_job_id || t.jobId;
              const r = await fetch(`${API_URL}/tickets/${t.id}/duplicate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  new_date: opts.new_date || (t.date ? t.date.slice(0, 10) : today()),
                  new_job_id: opts.new_job_id || undefined,
                  new_type: opts.new_type || undefined,
                  assigned_wells: opts.assigned_wells ?? t.assignedWells,
                  include_notes: opts.include_notes ?? true,
                  include_line_items: opts.include_line_items ?? true,
                  include_pin: opts.include_pin ?? true,
                  include_site_mgr: opts.include_site_mgr ?? true,
                  created_by: currentUser?.id || null,
                }),
              });
              if (!r.ok) {
                const d = await r.json();
                showNotice("Duplicate Failed", d.error || "Could not duplicate the ticket.", "error");
                return;
              }
              const saved = await r.json();
              // Reload tickets for the target job
              const tr = await fetch(`${API_URL}/tickets?job_id=${targetJobId}&include_voided=true`);
              if (tr.ok) {
                const data = await tr.json();
                const mapped = data.map(mapTicketFromApi);
                setTickets((prev) => {
                  // Remove old tickets for target job, add refreshed ones
                  const otherJobs = prev.filter((tk) => tk.jobId !== targetJobId);
                  // If duplicating to a different job, also keep source job tickets
                  if (targetJobId !== t.jobId) {
                    const sourceJobTickets = prev.filter((tk) => tk.jobId === t.jobId);
                    return [...otherJobs.filter((tk) => tk.jobId !== t.jobId), ...sourceJobTickets, ...mapped];
                  }
                  return [...otherJobs, ...mapped];
                });
                if (targetJobId === t.jobId) {
                  // Same job — open the new ticket inline
                  const newTicket = mapped.find((tk) => tk.id === saved.id);
                  if (newTicket) {
                    setViewTicketMode("edit");
                    setViewTicket({ ...newTicket, _duplicateReminder: true });
                  }
                } else {
                  // Different job — close modal, navigate to target job
                  setViewTicket(null);
                }
              }
            } catch (err) {
              showNotice("Duplicate Failed", err.message, "error");
            }
          }}
          onRevise={async (t, reason, opts = {}) => {
            const result = await reviseTicketRequest({
              ticket: t,
              reason,
              alsoCreateNew: !!opts.alsoCreateNew,
              setTickets,
              showNotice,
            });
            if (result.newTicket) {
              setViewTicketMode("edit");
              setViewTicket(result.newTicket);
            } else {
              setViewTicket(null);
            }
          }}
        />
      )}
      {/* Delete ticket confirmation — uses the unified handleDelete path */}
      <JobTicketsDeleteConfirm
        ticket={deleteConfirmId ? jobTickets.find((t) => t.id === deleteConfirmId) : null}
        onConfirm={async () => {
          const ok = await handleDelete(deleteConfirmId);
          if (ok) setDeleteConfirmId(null);
        }}
        onClose={() => setDeleteConfirmId(null)}
      />
      <EmailSignatureRequestModal emailRequest={emailRequest} />
    </div>
  );
}

export default JobTicketsTab;
