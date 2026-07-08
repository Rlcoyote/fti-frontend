import { useState, useEffect } from "react";
import { C, API_URL } from "./config.js";
import { Btn, ConfirmModal, TICKET_TYPES, TICKET_STATUSES } from "./SharedUI.jsx";
import { useApp } from "./AppContext.jsx";
import { ticketSaveErrorMessage } from "./utils.js";

function FinalReviewPage({ jobs, tickets, setTickets }) {
  const { currentUser, showNotice } = useApp();
  const [expandedId, setExpandedId] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [showBatchConfirm, setShowBatchConfirm] = useState(false);
  const [accountingMenu, setAccountingMenu] = useState(null);

  const isSalesman = currentUser?.role === "salesman";

  // v28.40 — Final Review now shows ONLY approved tickets. Previously
  // included signed + sigNotReq, which duplicated those tickets across the
  // WO surface AND Final Review (CAM Article III Amendment 2 Q6 redundancy).
  // Workflow is now: lead signs/sigNotReqs (ticket stays on WO until lead
  // approves) → lead clicks APPROVE (ticket moves to Final Review for owner
  // to send to QB) → owner sends to accounting (ticket leaves Final Review
  // and lives in Archive after WO close).
  const reviewStatuses = ["approved"];
  const allReviewable = tickets.filter((t) => reviewStatuses.includes(t.status));
  const visibleTickets = isSalesman
    ? allReviewable.filter((t) => {
        const job = jobs.find((j) => j.id === t.jobId);
        return job?.salesman === currentUser?.name;
      })
    : allReviewable;

  const getJob = (t) => jobs.find((j) => j.id === t.jobId);
  const ticketTotal = (t) => (t.lineItems || []).reduce((s, li) => s + (li.rate || 0) * (li.qty || 0) * (li.days || 1), 0);
  const formatDate = (d) => (d ? new Date(d + "T00:00:00").toLocaleDateString("en-US") : "—");

  const handleApproveAndSend = async (ticketId) => {
    // v28.232 — fetch doesn't throw on 4xx/5xx; don't flash "sent to QB" on a
    // rejected accounting transition.
    try {
      const r = await fetch(`${API_URL}/tickets/${ticketId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "sentToQB", sentToQBAt: new Date().toISOString() }),
      });
      if (!r.ok) {
        showNotice("Couldn't send to QB", await ticketSaveErrorMessage(r), "error");
        setAccountingMenu(null);
        return;
      }
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? { ...t, status: "sentToQB", sentToQBAt: new Date().toISOString() } : t)));
    } catch (err) {
      console.error("Approve & send failed:", err);
      showNotice("Couldn't send to QB", "A network error occurred.", "error");
    }
    setAccountingMenu(null);
  };

  const handleMarkAsProcessed = async (ticketId) => {
    // v28.232 — gate on r.ok so a rejected "mark processed" doesn't show as done.
    try {
      const r = await fetch(`${API_URL}/tickets/${ticketId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "sentToQB", sentToQBAt: new Date().toISOString(), manuallyProcessed: true }),
      });
      if (!r.ok) {
        showNotice("Couldn't mark processed", await ticketSaveErrorMessage(r), "error");
        setAccountingMenu(null);
        return;
      }
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? { ...t, status: "sentToQB", sentToQBAt: new Date().toISOString() } : t)));
    } catch (err) {
      console.error("Mark processed failed:", err);
      showNotice("Couldn't mark processed", "A network error occurred.", "error");
    }
    setAccountingMenu(null);
  };

  const handleBatchApprove = async () => {
    const ids = [...selected];
    for (const id of ids) {
      await handleApproveAndSend(id);
    }
    setSelected(new Set());
    setShowBatchConfirm(false);
  };

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === visibleTickets.length) setSelected(new Set());
    else setSelected(new Set(visibleTickets.map((t) => t.id)));
  };

  const cardStyle = { background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 6 };

  const [winW2, setWinW2] = useState(window.innerWidth);
  useEffect(() => {
    const h = () => setWinW2(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  const frMobile = winW2 < 900;

  return (
    <div style={{ padding: frMobile ? "16px 12px" : "24px 28px" }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Final Review</h1>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
            {visibleTickets.length} ticket{visibleTickets.length !== 1 ? "s" : ""} awaiting final review
            {isSalesman && <span style={{ color: C.blue, fontWeight: 600, marginLeft: 8 }}>(Your jobs only)</span>}
          </div>
        </div>
        {selected.size > 0 && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{selected.size} selected</span>
            <button
              onClick={() => {
                if (selected.size >= 3) setShowBatchConfirm(true);
                else handleBatchApprove();
              }}
              style={{
                background: C.red,
                color: C.white,
                border: "none",
                borderRadius: 4,
                padding: "8px 16px",
                fontSize: 12,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              APPROVE & SEND ({selected.size})
            </button>
          </div>
        )}
      </div>

      {visibleTickets.length === 0 && (
        <div style={{ ...cardStyle, padding: 40, textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.muted }}>All caught up</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>No tickets awaiting review</div>
        </div>
      )}

      {/* ── DESKTOP: grid table ── */}
      {!frMobile && visibleTickets.length > 0 && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "36px 80px 1fr 120px 100px 100px 90px 120px",
              gap: 4,
              padding: "8px 12px",
              background: C.darkBlue,
              borderRadius: "6px 6px 0 0",
            }}
          >
            <div>
              <input
                type="checkbox"
                checked={selected.size === visibleTickets.length && visibleTickets.length > 0}
                onChange={selectAll}
                style={{ width: 15, height: 15, accentColor: C.blue }}
              />
            </div>
            {["TICKET #", "CUSTOMER", "TYPE", "DATE", "TOTAL", "STATUS", "ACTION"].map((h) => (
              <div key={h} style={{ fontSize: 9, fontWeight: 800, color: C.white, letterSpacing: "0.08em" }}>
                {h}
              </div>
            ))}
          </div>
          {visibleTickets.map((t) => {
            const job = getJob(t);
            const total = ticketTotal(t);
            const tcfg = TICKET_TYPES[t.type] || { color: C.muted, label: t.type };
            const scfg = TICKET_STATUSES[t.status] || { color: C.muted, bg: C.steel, label: t.status };
            const isExpanded = expandedId === t.id;
            return (
              <div key={t.id} style={{ borderBottom: `1px solid ${C.border}`, background: C.cardBg }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "36px 80px 1fr 120px 100px 100px 90px 120px",
                    gap: 4,
                    padding: "10px 12px",
                    alignItems: "center",
                    cursor: "pointer",
                  }}
                  onClick={() => setExpandedId(isExpanded ? null : t.id)}
                >
                  <div onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(t.id)}
                      onChange={() => toggleSelect(t.id)}
                      style={{ width: 15, height: 15, accentColor: C.blue }}
                    />
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>
                    #{t.jobId}
                    {t.ticketNumber ? `-${t.ticketNumber}` : ""}
                  </div>
                  <div style={{ fontSize: 12, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {job?.customer || "Unknown"}
                  </div>
                  <div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: tcfg.color }}>{tcfg.label || t.type}</span>
                  </div>
                  <div style={{ fontSize: 12, color: C.muted }}>{formatDate(t.date)}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: C.green }}>${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  <div>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 3, background: scfg.bg, color: scfg.color }}>
                      {scfg.label}
                    </span>
                  </div>
                  <div onClick={(e) => e.stopPropagation()} style={{ position: "relative" }}>
                    <button
                      onClick={() => setAccountingMenu(accountingMenu === t.id ? null : t.id)}
                      style={{
                        background: C.darkBlue,
                        color: C.white,
                        border: "none",
                        borderRadius: 4,
                        padding: "5px 10px",
                        fontSize: 10,
                        fontWeight: 800,
                        cursor: "pointer",
                        letterSpacing: "0.04em",
                      }}
                    >
                      ACCOUNTING ▾
                    </button>
                    {accountingMenu === t.id && (
                      <div
                        style={{
                          position: "absolute",
                          top: 30,
                          right: 0,
                          zIndex: 50,
                          background: C.cardBg,
                          border: `1px solid ${C.border}`,
                          borderRadius: 4,
                          boxShadow: "0 4px 16px #00000022",
                          minWidth: 220,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          onClick={() => handleApproveAndSend(t.id)}
                          style={{
                            padding: "10px 14px",
                            cursor: "pointer",
                            fontSize: 12,
                            fontWeight: 700,
                            color: C.text,
                            borderBottom: `1px solid ${C.border}`,
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = C.steel)}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          Send to Accounting
                        </div>
                        <div
                          onClick={() => handleMarkAsProcessed(t.id)}
                          style={{ padding: "10px 14px", cursor: "pointer", fontSize: 12, fontWeight: 700, color: C.muted }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = C.steel)}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          Mark as Already Processed
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {isExpanded && (
                  <div style={{ padding: "0 12px 14px 48px", borderTop: `1px solid ${C.border}22` }}>
                    <div style={{ display: "flex", gap: 20, flexWrap: "wrap", fontSize: 11, color: C.muted, marginBottom: 8, marginTop: 8 }}>
                      {job?.jobState && (
                        <span>
                          State: <strong style={{ color: C.text }}>{job.jobState}</strong>
                        </span>
                      )}
                      {job?.county && (
                        <span>
                          County: <strong style={{ color: C.text }}>{job.county}</strong>
                        </span>
                      )}
                      {job?.wells?.length > 0 && (
                        <span>
                          Wells: <strong style={{ color: C.text }}>{job.wells.map((w) => w.well_name || w).join(", ")}</strong>
                        </span>
                      )}
                      {t.assignedWells?.length > 0 && (
                        <span>
                          Assigned: <strong style={{ color: C.text }}>{t.assignedWells.join(", ")}</strong>
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, letterSpacing: "0.08em", marginBottom: 4 }}>LINE ITEMS</div>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, marginBottom: 8 }}>
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                          {["CODE", "DESCRIPTION", "RATE", "QTY", "U/M", "TOTAL"].map((h) => (
                            <th
                              key={h}
                              style={{
                                padding: "4px 6px",
                                fontSize: 9,
                                fontWeight: 800,
                                color: C.muted,
                                textAlign: h === "TOTAL" || h === "RATE" || h === "QTY" ? "right" : "left",
                              }}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(t.lineItems || []).map((li, idx) => (
                          <tr key={idx} style={{ borderBottom: `1px solid ${C.border}11` }}>
                            <td style={{ padding: "4px 6px", fontWeight: 700, color: C.blue }}>{li.qbCode || li.qb_code || "—"}</td>
                            <td style={{ padding: "4px 6px", color: C.text }}>{li.desc || li.description || "—"}</td>
                            <td style={{ padding: "4px 6px", textAlign: "right" }}>${li.rate}</td>
                            <td style={{ padding: "4px 6px", textAlign: "right" }}>{li.qty}</td>
                            <td style={{ padding: "4px 6px" }}>{li.um || li.unit_measure || "—"}</td>
                            <td style={{ padding: "4px 6px", textAlign: "right", fontWeight: 700 }}>
                              ${((li.rate || 0) * (li.qty || 0) * (li.days || 1)).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {t.notes && (
                      <div style={{ fontSize: 11, color: C.muted }}>
                        <span style={{ fontWeight: 700 }}>Notes: </span>
                        {t.notes}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}

      {/* ── MOBILE: card layout ── */}
      {frMobile && visibleTickets.length > 0 && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <input
              type="checkbox"
              checked={selected.size === visibleTickets.length && visibleTickets.length > 0}
              onChange={selectAll}
              style={{ width: 16, height: 16, accentColor: C.blue }}
            />
            <span style={{ fontSize: 11, fontWeight: 700, color: C.muted }}>Select All</span>
          </div>
          {visibleTickets.map((t) => {
            const job = getJob(t);
            const total = ticketTotal(t);
            const tcfg = TICKET_TYPES[t.type] || { color: C.muted, label: t.type };
            const scfg = TICKET_STATUSES[t.status] || { color: C.muted, bg: C.steel, label: t.status };
            const isExpanded = expandedId === t.id;
            return (
              <div key={t.id} style={{ ...cardStyle, marginBottom: 10, padding: 14 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <input
                    type="checkbox"
                    checked={selected.has(t.id)}
                    onChange={() => toggleSelect(t.id)}
                    style={{ width: 16, height: 16, accentColor: C.blue, marginTop: 2 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }} onClick={() => setExpandedId(isExpanded ? null : t.id)}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: C.text }}>
                        #{t.jobId}
                        {t.ticketNumber ? `-${t.ticketNumber}` : ""}
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: C.green }}>${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div style={{ fontSize: 12, color: C.text, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {job?.customer || "Unknown"}
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: tcfg.color }}>{tcfg.label || t.type}</span>
                      <span style={{ fontSize: 11, color: C.muted }}>{formatDate(t.date)}</span>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 3, background: scfg.bg, color: scfg.color }}>
                        {scfg.label}
                      </span>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 8, position: "relative" }}>
                  <button
                    onClick={() => setAccountingMenu(accountingMenu === t.id ? null : t.id)}
                    style={{
                      background: C.darkBlue,
                      color: C.white,
                      border: "none",
                      borderRadius: 4,
                      padding: "7px 14px",
                      fontSize: 11,
                      fontWeight: 800,
                      cursor: "pointer",
                      flex: 1,
                    }}
                  >
                    ACCOUNTING ▾
                  </button>
                  {accountingMenu === t.id && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: 36,
                        left: 0,
                        right: 0,
                        zIndex: 50,
                        background: C.cardBg,
                        border: `1px solid ${C.border}`,
                        borderRadius: 4,
                        boxShadow: "0 4px 16px #00000022",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        onClick={() => handleApproveAndSend(t.id)}
                        style={{ padding: "12px 14px", cursor: "pointer", fontSize: 13, fontWeight: 700, color: C.text, borderBottom: `1px solid ${C.border}` }}
                      >
                        Send to Accounting
                      </div>
                      <div
                        onClick={() => handleMarkAsProcessed(t.id)}
                        style={{ padding: "12px 14px", cursor: "pointer", fontSize: 13, fontWeight: 700, color: C.muted }}
                      >
                        Mark as Already Processed
                      </div>
                    </div>
                  )}
                </div>
                {isExpanded && (
                  <div style={{ marginTop: 10, borderTop: `1px solid ${C.border}22`, paddingTop: 10 }}>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 11, color: C.muted, marginBottom: 8 }}>
                      {job?.jobState && (
                        <span>
                          State: <strong style={{ color: C.text }}>{job.jobState}</strong>
                        </span>
                      )}
                      {job?.county && (
                        <span>
                          County: <strong style={{ color: C.text }}>{job.county}</strong>
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, letterSpacing: "0.08em", marginBottom: 4 }}>LINE ITEMS</div>
                    {(t.lineItems || []).map((li, idx) => (
                      <div
                        key={idx}
                        style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: `1px solid ${C.border}11`, fontSize: 11 }}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <span style={{ fontWeight: 700, color: C.blue }}>{li.qbCode || li.qb_code || "—"}</span>
                          <span style={{ color: C.muted, marginLeft: 6 }}>{li.desc || li.description || "—"}</span>
                        </div>
                        <span style={{ fontWeight: 700, whiteSpace: "nowrap", marginLeft: 8 }}>
                          ${((li.rate || 0) * (li.qty || 0) * (li.days || 1)).toFixed(2)}
                        </span>
                      </div>
                    ))}
                    {t.notes && (
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>
                        <span style={{ fontWeight: 700 }}>Notes: </span>
                        {t.notes}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Batch confirm dialog */}
      {showBatchConfirm && (
        // v28.288 (theme arc) — was a hand-rolled copy of ConfirmModal
        <ConfirmModal
          title="Confirm Batch Approval"
          message={
            <>
              You are about to approve and send <strong>{selected.size} tickets</strong> to accounting. This cannot be undone. Each ticket will be locked from
              further editing.
            </>
          }
          yesLabel={`YES, APPROVE & SEND ALL (${selected.size})`}
          onYes={handleBatchApprove}
          onCancel={() => setShowBatchConfirm(false)}
        />
      )}
    </div>
  );
}

export default FinalReviewPage;
