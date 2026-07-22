import { useEffect, useState } from "react";
import { C } from "./config.js";
import { api } from "./api.js";
import { Btn, inputStyle, labelStyle, ConfirmModal, ModalWrap, Z_INDEX } from "./SharedUI.jsx";
import { useApp } from "./AppContext.jsx";

// ─── Job Titles admin (v27.57; v28.14 — drag-to-reorder) ───────────────────
// Owner/admin-only. User-editable list that drives the Job Title dropdown
// on the Employees form. Built as its own page so white-labeled installs
// can curate their own titles without code changes.
//
// v28.14 — replaced the manual numeric Sort column with drag-to-reorder.
// The previous numeric field accepted duplicates, producing indeterminate
// ordering. By moving sort to a drag UI:
//   - The user never types a sort number → no conflicts possible
//   - The system maintains contiguous sequential sort_order values internally
//   - Per CAM (Reggie's "structural impossibility over disciplined avoidance"
//     principle), the duplicate-sort bug class is gone — not policed, but
//     literally unreachable by the UI
//
// Deactivating a title does NOT touch existing employees' stored job_title —
// their string is preserved in users.job_title for historical accuracy. The
// title just disappears from the Employees dropdown going forward.

function JobTitlesPage() {
  const { can, showNotice } = useApp();
  const [titles, setTitles] = useState([]);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | "new" | titleObject
  const [confirmAction, setConfirmAction] = useState(null);
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [reordering, setReordering] = useState(false);

  const canEdit = can("manage_settings");

  const fetchTitles = async () => {
    setLoading(true);
    try {
      setTitles((await api.get(`/job-titles${includeInactive ? "?include_inactive=true" : ""}`)) || []);
    } catch (err) {
      console.error("Fetch job titles failed:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTitles();
    // Deliberate deps (audit pass 6): fetch on mount + on the one flag it
    // reads; the per-render fetcher is current at every trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeInactive]);

  const deactivate = async (title) => {
    try {
      await api.post(`/job-titles/${title.id}/deactivate`);
      showNotice("Title deactivated", `"${title.name}" will no longer appear in the Employees dropdown. Existing employees keep their stored title unchanged.`);
      fetchTitles();
    } catch (err) {
      showNotice("Deactivate failed", err.body?.error || err.message || "Could not deactivate.", "error");
    }
  };

  // Drag handlers — HTML5 native drag-and-drop. Owner/admin only (canEdit
  // gates rendering of draggable=true). A dragged row's id sits in
  // draggedId; the row currently hovered sits in dragOverId for visual
  // feedback. On drop we splice the array, send the new ordering to the
  // backend, and refresh from the response.
  const onDragStart = (id) => (e) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
    // Some browsers require setData to enable drag-image rendering.
    try {
      e.dataTransfer.setData("text/plain", String(id));
    } catch {
      /* not blocking */
    }
  };
  const onDragOver = (id) => (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (draggedId !== null && draggedId !== id) setDragOverId(id);
  };
  const onDragLeave = () => setDragOverId(null);
  const onDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };
  const onDrop = (targetId) => async (e) => {
    e.preventDefault();
    const sourceId = draggedId;
    setDraggedId(null);
    setDragOverId(null);
    if (!sourceId || sourceId === targetId) return;

    // Compute the new local ordering. Splice the source out, insert it
    // before the drop target. The backend receives sequential sort_order
    // values matching this order — internal numbers, never user-visible.
    const fromIdx = titles.findIndex((t) => t.id === sourceId);
    const toIdx = titles.findIndex((t) => t.id === targetId);
    if (fromIdx < 0 || toIdx < 0) return;
    const next = [...titles];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    setTitles(next);

    // Persist. Sequential 0-based indices — clean, contiguous, no gaps.
    setReordering(true);
    try {
      const items = next.map((t, i) => ({ id: t.id, sort_order: i }));
      await api.put("/job-titles/reorder", { items });
      // No refetch needed on success — the local order matches what we
      // just sent. Skipping the round-trip keeps the UI snappy.
    } catch (err) {
      showNotice("Reorder failed", err.body?.error || err.message || "Could not save the new order.", "error");
      fetchTitles();
    } finally {
      setReordering(false);
    }
  };

  if (!canEdit) {
    return <div style={{ padding: 32, color: C.muted }}>You need owner or admin access to view this page.</div>;
  }

  return (
    <div style={{ padding: "24px 28px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Job Titles</h1>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
            Drives the Job Title dropdown on the Employees form. Drag rows to reorder. Deactivating a title preserves all historical employee data — it just
            removes the option going forward.
          </div>
        </div>
        <Btn variant="blue" onClick={() => setEditing("new")}>
          + Add Title
        </Btn>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        <label style={{ fontSize: 12, color: C.muted, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          <input type="checkbox" checked={includeInactive} onChange={(e) => setIncludeInactive(e.target.checked)} style={{ accentColor: C.blue }} />
          Show inactive
        </label>
        <div style={{ marginLeft: "auto", fontSize: 12, color: C.muted }}>
          {titles.length} shown{reordering ? " · saving order…" : ""}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: C.muted }}>Loading…</div>
      ) : titles.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: C.muted }}>No titles yet.</div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${C.border}`, textAlign: "left" }}>
              <th style={{ ...thStyle, width: 36 }} aria-label="Drag handle"></th>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Status</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {titles.map((t) => {
              const isDragging = draggedId === t.id;
              const isDropTarget = dragOverId === t.id && draggedId !== null && draggedId !== t.id;
              return (
                <tr
                  key={t.id}
                  draggable={canEdit && t.is_active}
                  onDragStart={onDragStart(t.id)}
                  onDragOver={onDragOver(t.id)}
                  onDragLeave={onDragLeave}
                  onDragEnd={onDragEnd}
                  onDrop={onDrop(t.id)}
                  style={{
                    borderBottom: `1px solid ${C.border}`,
                    background: !t.is_active ? C.steel : isDropTarget ? C.blueB : "transparent",
                    opacity: isDragging ? 0.4 : 1,
                    cursor: canEdit && t.is_active ? "grab" : "default",
                    transition: "background 80ms ease",
                  }}
                >
                  <td style={{ ...tdStyle, width: 36, color: C.muted, fontSize: 18, textAlign: "center", userSelect: "none" }}>
                    {canEdit && t.is_active ? "≡" : ""}
                  </td>
                  <td style={tdStyle}>
                    <strong>{t.name}</strong>
                  </td>
                  <td style={tdStyle}>
                    {t.is_active ? (
                      <span style={{ color: C.green, fontSize: 11, fontWeight: 700 }}>ACTIVE</span>
                    ) : (
                      <span style={{ color: C.muted, fontSize: 11 }}>INACTIVE</span>
                    )}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      {t.is_active && (
                        <Btn small variant="ghost" onClick={() => setEditing(t)}>
                          Edit
                        </Btn>
                      )}
                      {t.is_active && (
                        <Btn
                          small
                          onClick={() =>
                            setConfirmAction({
                              title: "Deactivate Title?",
                              message: `"${t.name}" will be removed from the Employees dropdown. Existing employees with this title stored on their profile are NOT affected — only the dropdown is.`,
                              yesLabel: "Deactivate",
                              onYes: () => deactivate(t),
                            })
                          }
                        >
                          Deactivate
                        </Btn>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {editing && (
        <TitleModal
          mode={editing === "new" ? "new" : "edit"}
          initial={editing === "new" ? {} : editing}
          onClose={() => setEditing(null)}
          onSaved={(title, message) => {
            setEditing(null);
            showNotice(title, message);
            fetchTitles();
          }}
        />
      )}

      {confirmAction && (
        <ConfirmModal
          title={confirmAction.title}
          message={confirmAction.message}
          yesLabel={confirmAction.yesLabel}
          onYes={async () => {
            const a = confirmAction;
            setConfirmAction(null);
            await a.onYes();
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {/* NoticeModal is mounted globally in AppContext — no local render needed */}
    </div>
  );
}

// v28.43 — getter pattern so color follows theme without a refresh.
const thStyle = {
  padding: "10px 8px",
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  get color() {
    return C.muted;
  },
};
const tdStyle = { padding: "10px 8px", verticalAlign: "middle" };

// v28.14 — modal simplified to a single Name field. The Sort Order field
// is gone; ordering is handled by drag-and-drop on the list page. New
// rows append to the end of the list (highest sort_order); the user can
// drag them into position afterward.
function TitleModal({ mode, initial, onClose, onSaved }) {
  const [name, setName] = useState(initial.name || "");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const submit = async () => {
    if (!name.trim()) {
      setFormError("Name is required.");
      return;
    }
    setFormError("");
    setSubmitting(true);
    try {
      const payload = { name: name.trim() };
      const data = mode === "new" ? await api.post("/job-titles", payload) : await api.put(`/job-titles/${initial.id}`, payload);
      onSaved(
        mode === "new" ? "Title added" : "Title updated",
        `"${data.name}" ${mode === "new" ? "has been added to the Employees dropdown" : "has been updated"}.`,
      );
    } catch (err) {
      setFormError(err.body?.error || "Save failed: " + err.message);
      setSubmitting(false);
    }
  };

  return (
    // v28.288 (theme arc) — renders through the one shell.
    <ModalWrap variant="dialog" z={Z_INDEX.nested} width={440} accent={C.blue}>
      <div style={{ fontSize: 17, fontWeight: 800, color: C.text, marginBottom: 18 }}>{mode === "new" ? "Add Job Title" : `Edit "${initial.name}"`}</div>
      <div style={{ display: "grid", gap: 14 }}>
        <div>
          <div style={labelStyle}>Name *</div>
          <input
            autoFocus
            style={inputStyle}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Flowback Supervisor"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !submitting) submit();
            }}
          />
        </div>
      </div>

      {formError && (
        <div style={{ marginTop: 16, padding: "10px 14px", background: C.redB, color: C.red, borderRadius: 6, fontSize: 13, fontWeight: 700 }}>{formError}</div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
        <Btn variant="blue" onClick={submit} disabled={submitting}>
          {submitting ? "Saving…" : mode === "new" ? "Add Title" : "Save Changes"}
        </Btn>
        <Btn variant="ghost" onClick={onClose}>
          Cancel
        </Btn>
      </div>
    </ModalWrap>
  );
}

export default JobTitlesPage;
