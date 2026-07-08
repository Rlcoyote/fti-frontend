import { useState } from "react";
import { C, getCurrentUser } from "./config.js";
import { isOverdue } from "./utils.js";
import { Btn, PriorityBadge, inputStyle, labelStyle } from "./SharedUI.jsx";

function TodoForm({ onSave, onCancel, defaultJobId = null, jobs, userNames = [], initial = null, onReactivate = null }) {
  // v28.282 — `initial` puts the form in EDIT mode, prefilled from the task.
  const [form, setForm] = useState({
    title: initial?.title || "",
    description: initial?.description || "",
    jobId: initial ? initial.jobId : defaultJobId,
    assignedTo: initial?.assignedTo || getCurrentUser(),
    priority: initial?.priority || "normal",
    dueDate: (initial?.dueDate || "").slice(0, 10), // date input needs YYYY-MM-DD
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!form.title.trim()) return;
    onSave({ ...form, jobId: form.jobId ? Number(form.jobId) : null, dueDate: form.dueDate || null });
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
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>LINK TO WORK ORDER</label>
          <select style={inputStyle} value={form.jobId ?? ""} onChange={(e) => set("jobId", e.target.value || null)}>
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
function TodoRow({ todo, onToggle, onEdit, onDelete, onNavigateJob, jobs }) {
  const overdue = isOverdue(todo);
  const job = jobs.find((j) => j.id === todo.jobId);

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
          onToggle(todo.id);
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
          {todo.dueDate && <span style={{ fontSize: 11, color: overdue ? C.overdue : C.muted }}>Due: {todo.dueDate}</span>}
          <span style={{ fontSize: 11, color: C.muted }}>→ {todo.assignedTo}</span>
          {todo.completed && todo.completedBy && (
            <span style={{ fontSize: 11, color: C.green }}>
              ✓ {todo.completedBy} · {todo.completedAt?.slice(0, 10)}
            </span>
          )}
        </div>
      </div>
      {/* v28.284 — completed rows carry the way back, spelled out */}
      {todo.completed && (
        <button
          title="Put this task back on the active list"
          onClick={(e) => {
            e.stopPropagation();
            onToggle(todo.id);
          }}
          style={{
            background: "transparent",
            border: `1px solid ${C.green}55`,
            color: C.green,
            padding: "3px 9px",
            borderRadius: 4,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.06em",
            cursor: "pointer",
            flexShrink: 0,
            marginTop: 1,
          }}
        >
          REACTIVATE
        </button>
      )}
      {/* v28.283 — EDIT button retired: the whole row opens the editor. DELETE stays explicit. */}
      {onDelete && (
        <button
          title="Delete this task"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(todo);
          }}
          style={{
            background: "transparent",
            border: `1px solid ${C.red}55`,
            color: C.red,
            padding: "3px 9px",
            borderRadius: 4,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.06em",
            cursor: "pointer",
            flexShrink: 0,
            marginTop: 1,
          }}
        >
          DELETE
        </button>
      )}
    </div>
  );
}

export { TodoForm, TodoRow };
