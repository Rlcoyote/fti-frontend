import { useState, useEffect } from "react";
import useBodyScrollLock from "./useBodyScrollLock.js";
import { C, API_URL } from "./config.js";
import { Btn, Z_INDEX, PANEL_TEXT, PANEL_MUTED, ModalWrap, TINT } from "./SharedUI.jsx";

// ─── CopyCrewModal (v28.09) ────────────────────────────────────────────────
// Copy crew (with lead designation preserved) from a sibling Rig Up ticket
// onto the current ticket. Mirrors TicketDuplicateModal's progressive-
// disclosure pattern: defaults to the newest non-voided Rig Up; "(change)"
// link reveals the source picker only when multiple Rig Ups exist (avoids
// adding clicks for the common single-RU case).
//
// Props:
//   jobId               — current ticket's job, for sibling-RU lookup
//   excludeTicketId     — current ticket's own id (excluded from sources)
//   existingCrewUserIds — Set of user_ids already on destination crew; the
//                         preview filters these out so the user sees what
//                         will ACTUALLY be added, not duplicates
//   onClose             — dismiss
//   onCopy(members)     — parent commits the array (each: { user_id,
//                         user_name, is_lead })

function CopyCrewModal({ jobId, excludeTicketId, existingCrewUserIds, onClose, onCopy }) {
  useBodyScrollLock(true); // v28.274 sweep — modal locks the page behind it
  const [rigUps, setRigUps] = useState([]); // [{ id, ticketNumber, date, voided, customerName, ... }]
  const [sourceId, setSourceId] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [sourceCrew, setSourceCrew] = useState([]);
  const [loadingRigUps, setLoadingRigUps] = useState(true);
  const [loadingCrew, setLoadingCrew] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Step 1: load all eligible Rig Up tickets on this job (newest first).
  useEffect(() => {
    if (!jobId) return;
    setLoadingRigUps(true);
    setError("");
    fetch(`${API_URL}/tickets?job_id=${jobId}&include_voided=true`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const eligible = (data || [])
          .filter((tk) => tk.type === "Rig Up" && !tk.voided_at)
          .filter((tk) => tk.id !== excludeTicketId)
          .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
        setRigUps(eligible);
        setSourceId(eligible[0]?.id || null);
      })
      .catch(() => setError("Could not load Rig Up tickets on this job."))
      .finally(() => setLoadingRigUps(false));
  }, [jobId, excludeTicketId]);

  // Step 2: load the chosen source's crew.
  useEffect(() => {
    if (!sourceId) {
      setSourceCrew([]);
      return;
    }
    setLoadingCrew(true);
    setError("");
    fetch(`${API_URL}/tickets/${sourceId}/crew`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setSourceCrew(data || []))
      .catch(() => setError("Could not load source crew."))
      .finally(() => setLoadingCrew(false));
  }, [sourceId]);

  const source = rigUps.find((t) => t.id === sourceId);
  const skipped = sourceCrew.filter((c) => existingCrewUserIds?.has(c.user_id));
  const willCopy = sourceCrew.filter((c) => !existingCrewUserIds?.has(c.user_id));

  const handleSubmit = async () => {
    if (willCopy.length === 0) {
      onClose();
      return;
    }
    setSubmitting(true);
    try {
      await onCopy(
        willCopy.map((c) => ({
          user_id: c.user_id,
          user_name: c.user_name,
          user_role: c.user_role || null,
          is_lead: !!c.is_lead,
        })),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalWrap variant="dialog" z={Z_INDEX.nested} width={500} accent={C.blue} onClose={onClose}>
      <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 14 }}>Copy Crew from Rig Up</div>

      {loadingRigUps && <div style={{ fontSize: 12, color: C.muted, fontStyle: "italic" }}>Loading Rig Up tickets...</div>}

      {!loadingRigUps && rigUps.length === 0 && (
        <div
          style={{
            fontSize: 12,
            color: C.muted,
            fontStyle: "italic",
            padding: "10px 12px",
            background: C.steel,
            border: `1px solid ${C.border}`,
            borderRadius: 4,
          }}
        >
          No Rig Up tickets exist on this Work Order yet.
        </div>
      )}

      {!loadingRigUps && rigUps.length > 0 && source && (
        <>
          {/* Source — progressive disclosure (mirrors TicketDuplicateModal). */}
          <div style={{ marginBottom: 16, padding: "10px 12px", background: C.steel, borderRadius: 6 }}>
            {!pickerOpen ? (
              <div style={{ fontSize: 12, display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 700, color: C.muted, letterSpacing: "0.08em" }}>COPYING FROM:</span>
                <span style={{ color: C.text, fontWeight: 600 }}>
                  Rig Up #{source.jobId}
                  {source.ticketNumber ? `-${source.ticketNumber}` : ""}
                </span>
                {source.date && <span style={{ color: C.muted }}>· {String(source.date).slice(0, 10)}</span>}
                {rigUps.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setPickerOpen(true)}
                    style={{
                      marginLeft: "auto",
                      background: "transparent",
                      border: "none",
                      color: C.blue,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      padding: 0,
                      textDecoration: "underline",
                    }}
                  >
                    (change)
                  </button>
                )}
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.08em", marginBottom: 4 }}>COPYING FROM</div>
                <select
                  value={sourceId}
                  onChange={(e) => setSourceId(Number(e.target.value))}
                  style={{ width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 13 }}
                >
                  {rigUps.map((t) => (
                    <option key={t.id} value={t.id}>
                      Rig Up #{t.jobId}
                      {t.ticketNumber ? `-${t.ticketNumber}` : ""} · {String(t.date || "").slice(0, 10)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setPickerOpen(false)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: C.blue,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    padding: "8px 0 0",
                    textDecoration: "underline",
                  }}
                >
                  done
                </button>
              </div>
            )}
          </div>

          {/* Source crew preview */}
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.08em", marginBottom: 6 }}>
            CREW ON SOURCE TICKET ({sourceCrew.length})
          </div>
          {loadingCrew && <div style={{ fontSize: 12, color: C.muted, fontStyle: "italic" }}>Loading crew...</div>}
          {!loadingCrew && sourceCrew.length === 0 && (
            <div
              style={{
                fontSize: 12,
                color: C.muted,
                fontStyle: "italic",
                padding: "10px 12px",
                background: C.steel,
                border: `1px solid ${C.border}`,
                borderRadius: 4,
                marginBottom: 16,
              }}
            >
              Source Rig Up has no crew assigned. Pick a different source or add crew directly.
            </div>
          )}
          {!loadingCrew && sourceCrew.length > 0 && (
            <div style={{ border: `1px solid ${C.border}`, borderRadius: 4, overflow: "hidden", marginBottom: 16 }}>
              {sourceCrew.map((c, i) => {
                const dup = existingCrewUserIds?.has(c.user_id);
                return (
                  <div
                    key={c.user_id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      borderTop: i === 0 ? "none" : `1px solid ${C.border}`,
                      background: c.is_lead ? TINT.yellowBg : C.cardBg,
                      opacity: dup ? 0.5 : 1,
                    }}
                  >
                    <div>
                      {/* v28.52 — lead row sits on the always-light yellow
                            #fdf5d8 bg (set above). C.text/C.muted theme-flip
                            light in dark mode → invisible on yellow. Force
                            PANEL_TEXT/MUTED on lead rows so the name + role
                            stay readable in both themes. Non-lead rows use
                            C.cardBg (theme-aware) — keep theme colors there. */}
                      <span style={{ fontSize: 13, fontWeight: 600, color: c.is_lead ? PANEL_TEXT : C.text }}>{c.user_name}</span>
                      {c.is_lead && (
                        <span
                          style={{
                            marginLeft: 8,
                            fontSize: 9,
                            fontWeight: 800,
                            color: TINT.yellowText,
                            background: "#ffffffaa",
                            border: `1px solid ${TINT.yellowText}44`,
                            padding: "1px 6px",
                            borderRadius: 3,
                            letterSpacing: "0.08em",
                          }}
                        >
                          LEAD
                        </span>
                      )}
                      {c.user_role && <span style={{ marginLeft: 6, fontSize: 11, color: c.is_lead ? PANEL_MUTED : C.muted }}>· {c.user_role}</span>}
                    </div>
                    {dup && <span style={{ fontSize: 10, color: C.muted, fontStyle: "italic" }}>already on crew · skipped</span>}
                  </div>
                );
              })}
            </div>
          )}

          {skipped.length > 0 && (
            <div
              style={{
                marginBottom: 14,
                padding: "8px 10px",
                background: C.yellowB,
                border: `1px solid ${C.yellow}44`,
                borderRadius: 4,
                fontSize: 11,
                color: C.yellow,
                fontWeight: 700,
              }}
            >
              {skipped.length} crew member{skipped.length !== 1 ? "s" : ""} already on this ticket — will be skipped.
            </div>
          )}
        </>
      )}

      {error && <div style={{ color: C.red, fontSize: 12, fontWeight: 700, marginBottom: 14 }}>{error}</div>}

      <div style={{ display: "flex", gap: 10 }}>
        <Btn variant="blue" onClick={handleSubmit} disabled={submitting || loadingCrew || willCopy.length === 0}>
          {submitting ? "COPYING..." : `COPY ${willCopy.length} MEMBER${willCopy.length !== 1 ? "S" : ""}`}
        </Btn>
        <Btn variant="ghost" onClick={onClose} disabled={submitting}>
          CANCEL
        </Btn>
      </div>
    </ModalWrap>
  );
}

export default CopyCrewModal;
