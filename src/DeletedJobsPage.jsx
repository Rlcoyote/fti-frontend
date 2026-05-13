import { useMemo, useState } from "react";
import { C } from "./config.js";
import { formatDate } from "./utils.js";
import { Btn, TICKET_TYPES } from "./SharedUI.jsx";
import { useApp } from "./AppContext.jsx";

// ─── Deleted Items page ──────────────────────────────────────────────────────
// Grouped-by-WO display. Each group's header shows whether the WO itself is
// fully deleted or only has individually-deleted tickets under it.
//
// Restore rules (v27.54):
// • Restore WO → backend cascade-restores every ticket tagged `deleted_with_wo`.
//   Tickets individually deleted BEFORE the WO was deleted stay in the trash.
// • Restore single ticket under a deleted WO → backend auto-restores the WO too
//   (silently) so the ticket has a home. Sibling cascaded-deleted tickets stay
//   in the trash — only the one the user asked for comes back.
// • Restore single ticket under an active WO → straightforward un-delete.
//
// Archive rules are unchanged: Archive moves items out of the trash into the
// Archive page (non-restorable). Role-gated to owner/admin.

function DeletedJobsPage({ deletedJobs, deletedTickets = [], jobs, handleRestoreJob, handleArchiveJob, handleRestoreTicket, handleArchiveTicket }) {
  const { currentUser } = useApp();
  const [selectMode, setSelectMode] = useState(false);
  const [selectedJobs, setSelectedJobs] = useState(() => new Set());
  const [selectedTickets, setSelectedTickets] = useState(() => new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);

  const canArchive = ["owner", "admin"].includes(currentUser.role);

  // Build groups keyed by jobId. A group exists whenever a WO is fully deleted
  // OR has at least one deleted ticket under it (or both).
  const groups = useMemo(() => {
    const byJob = new Map();
    const getOrCreate = (jobId) => {
      if (!byJob.has(jobId)) {
        byJob.set(jobId, { jobId, jobRecord: null, woDeleted: false, cascaded: [], individual: [] });
      }
      return byJob.get(jobId);
    };
    for (const t of deletedTickets) {
      const g = getOrCreate(t.jobId);
      (t.deletedWithWo ? g.cascaded : g.individual).push(t);
    }
    for (const j of deletedJobs) {
      const g = getOrCreate(j.id);
      g.woDeleted = true;
      g.jobRecord = j;
    }
    // Fill in active-WO records for groups that don't have one yet.
    for (const g of byJob.values()) {
      if (!g.jobRecord) g.jobRecord = jobs.find((j) => j.id === g.jobId) || null;
    }
    // Sort: fully-deleted WOs first, then active; within each, by jobId desc.
    return Array.from(byJob.values()).sort((a, b) => {
      if (a.woDeleted !== b.woDeleted) return a.woDeleted ? -1 : 1;
      return (b.jobId || 0) - (a.jobId || 0);
    });
  }, [deletedJobs, deletedTickets, jobs]);

  const totalTickets = deletedTickets.length;
  const totalWOs = groups.length;
  const fullyDeletedWOs = groups.filter((g) => g.woDeleted).length;
  const selectedCount = selectedJobs.size + selectedTickets.size;

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedJobs(new Set());
    setSelectedTickets(new Set());
  };

  const toggleJob = (id) => {
    setSelectedJobs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleTicket = (id) => {
    setSelectedTickets((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const archiveSelected = async () => {
    for (const jid of [...selectedJobs]) {
      await handleArchiveJob(jid);
    }
    for (const tid of [...selectedTickets]) {
      await handleArchiveTicket(tid);
    }
    setConfirmOpen(false);
    exitSelectMode();
  };

  const ticketLineTotal = (t) => (t.lineItems || []).reduce((s, li) => s + (li.rate || 0) * (li.qty || 0) * (li.days || 1), 0);

  const checkboxStyle = { width: 17, height: 17, accentColor: C.blue, cursor: "pointer", flexShrink: 0 };

  const ticketRow = (t, flavor) => {
    const tcfg = TICKET_TYPES[t.type] || { color: C.muted, label: t.type };
    const leftBorder = flavor === "cascaded" ? `3px solid ${C.red}99` : `3px solid ${tcfg.color}`;
    return (
      <div
        key={t.id}
        style={{
          background: C.cardBg,
          border: `1px solid ${C.border}`,
          borderLeft: leftBorder,
          borderRadius: 4,
          padding: "10px 14px",
          marginBottom: 6,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        {selectMode && <input type="checkbox" checked={selectedTickets.has(t.id)} onChange={() => toggleTicket(t.id)} style={checkboxStyle} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
              #{t.jobId}
              {t.ticketNumber ? `-${t.ticketNumber}` : ""}
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.06em",
                color: tcfg.color,
                background: tcfg.bg || "#fff",
                border: `1px solid ${tcfg.color}44`,
                borderRadius: 3,
                padding: "2px 7px",
              }}
            >
              {tcfg.label || t.type}
            </span>
            <span style={{ fontSize: 12, color: C.muted }}>{formatDate(t.date)}</span>
            {t.lineItems?.length > 0 && (
              <span style={{ fontSize: 11, color: C.muted }}>
                · {t.lineItems.length} item{t.lineItems.length !== 1 ? "s" : ""} · ${ticketLineTotal(t).toFixed(2)}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <Btn small variant="blue" onClick={() => handleRestoreTicket(t.id)}>
            Restore
          </Btn>
          {canArchive && (
            <Btn small onClick={() => handleArchiveTicket(t.id)}>
              Archive
            </Btn>
          )}
        </div>
      </div>
    );
  };

  const groupBlock = (g) => {
    const job = g.jobRecord;
    const cascadedCount = g.cascaded.length;
    const individualCount = g.individual.length;
    const cust = job?.customer || "Unknown customer";
    const loc = job?.location || "";

    return (
      <div
        key={g.jobId}
        style={{
          background: g.woDeleted ? C.priHighB : C.lightSteel,
          border: `1px solid ${g.woDeleted ? C.red + "44" : C.border}`,
          borderRadius: 8,
          padding: "14px 18px",
          marginBottom: 14,
        }}
      >
        {/* Group header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
          {selectMode && g.woDeleted && <input type="checkbox" checked={selectedJobs.has(g.jobId)} onChange={() => toggleJob(g.jobId)} style={checkboxStyle} />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>
              Work Order #{g.jobId}
              {g.woDeleted ? (
                <span
                  style={{
                    marginLeft: 8,
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    color: C.red,
                    background: "#fdecea",
                    border: `1px solid ${C.red}44`,
                    borderRadius: 3,
                    padding: "2px 7px",
                  }}
                >
                  WO DELETED
                </span>
              ) : (
                <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: C.muted }}>WO is active</span>
              )}
            </div>
            <div style={{ fontSize: 13, color: C.muted }}>
              {cust}
              {loc ? ` — ${loc}` : ""}
            </div>
          </div>
          {g.woDeleted && (
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              <Btn small variant="blue" onClick={() => handleRestoreJob(g.jobId)}>
                Restore WO{cascadedCount > 0 ? ` + ${cascadedCount} Ticket${cascadedCount !== 1 ? "s" : ""}` : ""}
              </Btn>
              {canArchive && (
                <Btn small onClick={() => handleArchiveJob(g.jobId)}>
                  Archive WO
                </Btn>
              )}
            </div>
          )}
        </div>

        {/* Cascaded tickets — deleted WITH the WO */}
        {cascadedCount > 0 && (
          <div style={{ marginBottom: individualCount > 0 ? 12 : 0 }}>
            {g.woDeleted && (
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", color: C.muted, marginBottom: 6 }}>
                DELETED WITH THE WO ({cascadedCount})
              </div>
            )}
            {g.cascaded.map((t) => ticketRow(t, "cascaded"))}
          </div>
        )}

        {/* Individually-deleted tickets */}
        {individualCount > 0 && (
          <div>
            {g.woDeleted && (
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", color: C.muted, marginBottom: 6 }}>
                INDIVIDUALLY DELETED ({individualCount})
              </div>
            )}
            {g.individual.map((t) => ticketRow(t, "individual"))}
          </div>
        )}

        {/* Fully-deleted WO with no tickets — rare but possible */}
        {cascadedCount === 0 && individualCount === 0 && (
          <div style={{ fontSize: 12, color: C.muted, fontStyle: "italic" }}>This WO had no tickets at the time of deletion.</div>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: "24px 28px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 8 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Deleted Items</h1>
        {canArchive && (totalTickets > 0 || fullyDeletedWOs > 0) && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {!selectMode ? (
              <Btn variant="ghost" onClick={() => setSelectMode(true)}>
                Select
              </Btn>
            ) : (
              <>
                <button
                  type="button"
                  disabled={selectedCount === 0}
                  onClick={() => setConfirmOpen(true)}
                  style={{
                    background: selectedCount === 0 ? C.steel : C.red,
                    color: selectedCount === 0 ? C.muted : C.white,
                    border: "none",
                    borderRadius: 4,
                    padding: "8px 16px",
                    fontSize: 12,
                    fontWeight: 800,
                    letterSpacing: "0.04em",
                    cursor: selectedCount === 0 ? "not-allowed" : "pointer",
                    opacity: selectedCount === 0 ? 0.6 : 1,
                  }}
                >
                  Archive ({selectedCount})
                </button>
                <Btn variant="ghost" small onClick={exitSelectMode}>
                  Cancel
                </Btn>
              </>
            )}
          </div>
        )}
      </div>

      {/* Summary */}
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 18 }}>
        {totalTickets === 0 && fullyDeletedWOs === 0
          ? "Nothing in the trash."
          : `${totalTickets} ticket${totalTickets !== 1 ? "s" : ""} across ${totalWOs} WO${totalWOs !== 1 ? "s" : ""}${fullyDeletedWOs > 0 ? ` (${fullyDeletedWOs} WO${fullyDeletedWOs !== 1 ? "s" : ""} fully deleted)` : ""}.`}
      </div>

      {groups.map(groupBlock)}

      {/* Confirm batch archive */}
      {confirmOpen && (
        <div
          style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}
          onClick={() => setConfirmOpen(false)}
        >
          <div
            style={{
              background: C.cardBg,
              border: `1px solid ${C.border}`,
              borderTop: `4px solid ${C.red}`,
              borderRadius: 8,
              padding: 28,
              width: 460,
              maxWidth: "90vw",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 12 }}>
              Archive {selectedCount} Selected Item{selectedCount !== 1 ? "s" : ""}?
            </div>
            <ul style={{ fontSize: 13, color: C.text, marginTop: 0, marginBottom: 16, paddingLeft: 20, lineHeight: 1.6 }}>
              {selectedJobs.size > 0 && (
                <li>
                  <strong>{selectedJobs.size}</strong> work order{selectedJobs.size !== 1 ? "s" : ""}
                </li>
              )}
              {selectedTickets.size > 0 && (
                <li>
                  <strong>{selectedTickets.size}</strong> ticket{selectedTickets.size !== 1 ? "s" : ""}
                </li>
              )}
            </ul>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 20, lineHeight: 1.6 }}>
              Archived items move to the Archive page and cannot be restored.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn onClick={archiveSelected}>Confirm — Archive {selectedCount}</Btn>
              <Btn variant="ghost" onClick={() => setConfirmOpen(false)}>
                Cancel
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DeletedJobsPage;
