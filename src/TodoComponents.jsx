import { useState } from "react";
import { C, getCurrentUser } from "./config.js";
import { isOverdue } from "./utils.js";
import { Btn, PriorityBadge, ModalWrap, ConfirmModal, inputStyle, labelStyle } from "./SharedUI.jsx";

function TodoForm({ onSave, onCancel, defaultWorkOrderId = null, jobs, userNames = [], initial = null, onReactivate = null }) {
  // v28.282 — `initial` puts the form in EDIT mode, prefilled from the task.
  const [form, setForm] = useState({
    title: initial?.title || "",
    description: initial?.description || "",
    workOrderId: initial ? initial.workOrderId : defaultWorkOrderId,
    assignedTo: initial?.assignedTo || getCurrentUser(),
    priority: initial?.priority || "normal",
    // v28.336 — REQUIRED = a must-do future action; TO-DO = convenience/supply
    // item (paper towels). Default TO-DO (ratified 2026-07-16).
    category: initial?.category || "todo",
    dueDate: (initial?.dueDate || "").slice(0, 10), // date input needs YYYY-MM-DD
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!form.title.trim()) return;
    onSave({ ...form, workOrderId: form.workOrderId ? Number(form.workOrderId) : null, dueDate: form.dueDate || null });
  };

  return (
    <div style={{ background: C.steel, border: `1px solid ${C.border}`, borderRadius: 6, padding: 16, marginBottom: 12 }}>
      {/* v28.284 — a completed task opened for edit says so, and offers the way back */}
      {initial?.completed && onReactivate && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            background: `${C.green}18`,
            border: `1px solid ${C.green}55`,
            borderRadius: 5,
            padding: "8px 12px",
            marginBottom: 12,
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 700, color: C.green }}>✓ This task is marked COMPLETED.</span>
          <Btn small onClick={onReactivate}>
            REACTIVATE TASK
          </Btn>
        </div>
      )}
      <div style={{ marginBottom: 10 }}>
        <label style={labelStyle}>TITLE *</label>
        <input style={inputStyle} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Task title..." />
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={labelStyle}>DESCRIPTION</label>
        <textarea
          style={{ ...inputStyle, resize: "vertical", minHeight: 56 }}
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Optional details..."
        />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>CATEGORY</label>
          <select style={inputStyle} value={form.category} onChange={(e) => set("category", e.target.value)}>
            <option value="todo">To-Do</option>
            <option value="required">Required</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>LINK TO WORK ORDER</label>
          <select style={inputStyle} value={form.workOrderId ?? ""} onChange={(e) => set("workOrderId", e.target.value || null)}>
            <option value="">— General Task —</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                #{j.id} {j.customer}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>ASSIGN TO</label>
          <select style={inputStyle} value={form.assignedTo} onChange={(e) => set("assignedTo", e.target.value)}>
            {userNames.map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>PRIORITY</label>
          <select style={inputStyle} value={form.priority} onChange={(e) => set("priority", e.target.value)}>
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>DUE DATE</label>
          <input type="date" style={inputStyle} value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Btn onClick={handleSave}>{initial ? "SAVE CHANGES" : "SAVE TASK"}</Btn>
        <Btn onClick={onCancel} variant="ghost">
          CANCEL
        </Btn>
      </div>
    </div>
  );
}

// ─── TODO ROW ─────────────────────────────────────────────────────────────────
function TodoRow({ todo, meName, onToggle, onEdit, onDelete, onNavigateJob, jobs }) {
  // v28.393 (field report via the board, 260722): the DONE box completed the
  // task instantly and the row vanished from the default view — read as
  // "deleted my task without warning." Completing now confirms and says
  // exactly what happens. Un-marking stays one click (it's the undo).
  const [confirmComplete, setConfirmComplete] = useState(false);
  const overdue = isOverdue(todo);
  const job = jobs.find((j) => j.id === todo.workOrderId);

  return (
    <div
      onClick={() => onEdit && onEdit(todo)}
      title={onEdit ? "Click to open and edit this task" : undefined}
      style={{
        cursor: onEdit ? "pointer" : "default",
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: "10px 14px",
        background: overdue ? C.overdueB : C.cardBg,
        border: `1px solid ${overdue ? C.overdue + "44" : C.border}`,
        borderLeft: `3px solid ${overdue ? C.overdue : todo.priority === "high" ? C.priHigh : todo.priority === "low" ? C.priLow : C.border}`,
        borderRadius: 5,
        marginBottom: 6,
        opacity: todo.completed ? 0.6 : 1,
      }}
    >
      <div
        onClick={(e) => {
          e.stopPropagation(); // the box completes; it must not open the editor
          if (todo.completed) onToggle(todo.id);
          else setConfirmComplete(true);
        }}
        title={todo.completed ? "Mark as not done" : "Mark task done"}
        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, flexShrink: 0, cursor: "pointer" }}
      >
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: 3,
            marginTop: 1,
            border: `2px solid ${todo.completed ? C.green : C.muted}`,
            background: todo.completed ? C.green : "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {todo.completed && <span style={{ color: C.white, fontSize: 11, fontWeight: 900 }}>✓</span>}
        </div>
        <span style={{ fontSize: 8, fontWeight: 700, color: todo.completed ? C.green : C.muted, letterSpacing: "0.08em" }}>DONE</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: C.text,
              textDecoration: todo.completed ? "line-through" : "none",
            }}
          >
            {todo.title}
          </span>
          {/* v28.336 — REQUIRED items read as requirements; TO-DO stays quiet */}
          {todo.category === "required" && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: C.red,
                border: `1px solid ${C.red}55`,
                padding: "2px 7px",
                borderRadius: 3,
                letterSpacing: "0.06em",
              }}
            >
              REQUIRED
            </span>
          )}
          <PriorityBadge priority={todo.priority} />
          {overdue && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: C.overdue,
                background: C.overdueB,
                border: `1px solid ${C.overdue}44`,
                padding: "2px 7px",
                borderRadius: 3,
                letterSpacing: "0.06em",
              }}
            >
              OVERDUE
            </span>
          )}
        </div>
        {todo.description && <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{todo.description}</div>}
        <div style={{ display: "flex", gap: 12, marginTop: 4, flexWrap: "wrap" }}>
          {job && (
            <span
              onClick={(e) => {
                if (!onNavigateJob) return;
                e.stopPropagation();
                onNavigateJob(job.id);
              }}
              style={{
                fontSize: 11,
                color: C.blue,
                fontWeight: 700,
                cursor: onNavigateJob ? "pointer" : "default",
                textDecoration: onNavigateJob ? "underline" : "none",
              }}
            >
              #{job.id} {job.customer}
            </span>
          )}
          {!job && <span style={{ fontSize: 11, color: C.muted }}>General Task</span>}
          {todo.dueDate && <span style={{ fontSize: 11, color: overdue ? C.overdue : C.muted, fontWeight: overdue ? 800 : 400 }}>Due: {todo.dueDate}</span>}
          {/* v28.422 — assignment on the FACE of the card (Reggie: "do not
              really specify until you click into the task itself"): FOR chip
              loud, highlighted when it's YOURS; BY names the creator. */}
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: "0.05em",
              color: todo.assignedTo === meName ? C.blue : C.text,
              background: todo.assignedTo === meName ? `${C.blue}18` : C.steel,
              border: `1px solid ${todo.assignedTo === meName ? C.blue + "55" : C.border}`,
              borderRadius: 3,
              padding: "2px 8px",
            }}
          >
            FOR {todo.assignedTo === meName ? "YOU" : todo.assignedTo}
          </span>
          <span style={{ fontSize: 11, color: C.muted }}>by {todo.createdBy}</span>
          {todo.completed && todo.completedBy && (
            <span style={{ fontSize: 11, color: C.green }}>
              ✓ {todo.completedBy} · {todo.completedAt?.slice(0, 10)}
            </span>
          )}
        </div>
        {/* v28.336 — the closure record rides the row (spec §2.12) */}
        {todo.completed && todo.completionNotes && (
          <div style={{ fontSize: 11, color: C.muted, marginTop: 3, fontStyle: "italic" }}>Closed: {todo.completionNotes}</div>
        )}
      </div>
      {/* v28.284 — completed rows carry the way back, spelled out */}
      {todo.completed && (
        <Btn
          small
          variant="ghost"
          title="Put this task back on the active list"
          onClick={(e) => {
            e.stopPropagation();
            onToggle(todo.id);
          }}
          style={{ color: C.green, borderColor: `${C.green}55`, flexShrink: 0, marginTop: 1 }}
        >
          REACTIVATE
        </Btn>
      )}
      {/* v28.283 — EDIT button retired: the whole row opens the editor. DELETE stays explicit. */}
      {/* v28.393 — EDIT button restored (retired v28.283 for row-click-opens-
          editor; the field couldn't FIND it: "the task needs to be editable.
          It is not."). Row click still works; the button makes it visible. */}
      {onEdit && (
        <Btn
          small
          variant="ghost"
          title="Open and edit this task"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(todo);
          }}
          style={{ flexShrink: 0, marginTop: 1 }}
        >
          EDIT
        </Btn>
      )}
      {onDelete && (
        <Btn
          small
          variant="ghost"
          title="Delete this task"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(todo);
          }}
          style={{ color: C.red, borderColor: `${C.red}55`, flexShrink: 0, marginTop: 1 }}
        >
          DELETE
        </Btn>
      )}
      {confirmComplete && (
        <ConfirmModal
          title="Mark Task Done?"
          message={`"${todo.title}" will be marked COMPLETED and move off the active list — it is NOT deleted. Find it anytime with SHOW COMPLETED, and reopen it from there.`}
          yesLabel="MARK DONE"
          accent={C.green}
          onYes={() => {
            setConfirmComplete(false);
            onToggle(todo.id);
          }}
          onCancel={() => setConfirmComplete(false)}
        />
      )}
    </div>
  );
}

// ─── COMPLETION NOTES MODAL ──────────────────────────────────────────────────
// v28.336 — DONE requires completion notes, board-wide (Safety Meeting spec
// §2.12 — Reggie: "This gives closure"). The server enforces it; this modal is
// how the notes get written. Used by TodoPage and JobTodoTab.
function CompletionNotesModal({ todo, onComplete, onCancel }) {
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <ModalWrap title="Close Out This Task" onClose={onCancel} width={440}>
      <div style={{ fontSize: 13, color: C.text, marginBottom: 12, lineHeight: 1.5 }}>
        Marking <strong>{todo.title}</strong> DONE. What closed it out?
      </div>
      <label style={labelStyle}>COMPLETION NOTES *</label>
      <textarea
        autoFocus
        style={{ ...inputStyle, resize: "vertical", minHeight: 72, marginBottom: 14 }}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="e.g. Ordered from Odessa Supply, delivered to the Wickett yard 7/16"
      />
      <div style={{ display: "flex", gap: 8 }}>
        <Btn
          onClick={async () => {
            if (!notes.trim()) return;
            setBusy(true);
            await onComplete(notes.trim());
          }}
          disabled={!notes.trim() || busy}
        >
          {busy ? "SAVING…" : "MARK DONE"}
        </Btn>
        <Btn variant="ghost" onClick={onCancel}>
          CANCEL
        </Btn>
      </div>
    </ModalWrap>
  );
}

export { TodoForm, TodoRow, CompletionNotesModal };
