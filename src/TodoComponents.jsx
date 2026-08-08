import { useState, useEffect } from "react";
import { C, getCurrentUser } from "./config.js";
import { api } from "./api.js";
import { isOverdue, fmtStamp } from "./utils.js";
import { Btn, PriorityBadge, ModalWrap, ConfirmModal, inputStyle, labelStyle } from "./SharedUI.jsx";
import { useApp } from "./AppContext.jsx";
import { renderAuditDetails } from "./auditDetails.js";

// v28.429 — ISO (UTC) → the local "YYYY-MM-DDTHH:MM" a datetime-local wants.
function toLocalDateTimeInput(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return "";
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

// v28.437 (Reggie: "I was mid input of a new task, clicked the header...
// and it was gone") — a NEW task draft survives navigation: every keystroke
// mirrors to sessionStorage; coming back restores it; SAVE or CANCEL clears
// it. Edit mode doesn't draft (the saved task IS the draft).
const DRAFT_KEY = "fti_new_task_draft";
const readDraft = () => {
  try {
    return JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "null");
  } catch {
    return null;
  }
};

function TodoForm({ onSave, onCancel, defaultWorkOrderId = null, jobs, userNames = [], initial = null, onReactivate = null, onMarkDone = null }) {
  // v28.282 — `initial` puts the form in EDIT mode, prefilled from the task.
  const draft = !initial ? readDraft() : null;
  const [form, setForm] = useState(
    () =>
      draft || {
        title: initial?.title || "",
        description: initial?.description || "",
        workOrderId: initial ? initial.workOrderId : defaultWorkOrderId,
        assignedTo: initial?.assignedTo || getCurrentUser(),
        priority: initial?.priority || "normal",
        // v28.336 — REQUIRED = a must-do future action; TO-DO = convenience/supply
        // item (paper towels). Default TO-DO (ratified 2026-07-16).
        category: initial?.category || "todo",
        dueDate: (initial?.dueDate || "").slice(0, 10), // date input needs YYYY-MM-DD
        // v28.429 — when the assignment TEXT should fire. datetime-local wants
        // "YYYY-MM-DDTHH:MM" in the user's own clock; blank = text right now.
        notifyAt: initial?.notifyAt ? toLocalDateTimeInput(initial.notifyAt) : "",
      },
  );
  const set = (k, v) =>
    setForm((f) => {
      const next = { ...f, [k]: v };
      // NEW-task drafts mirror to sessionStorage on every change (v28.437).
      if (!initial) {
        try {
          sessionStorage.setItem(DRAFT_KEY, JSON.stringify(next));
        } catch {
          /* storage full/blocked — draft just won't survive */
        }
      }
      return next;
    });
  const clearDraft = () => {
    try {
      sessionStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
  };
  // v28.428 (Reggie: "The completion notes section should already be visible.
  // Then check 'done'.") — the reason comes BEFORE the checkmark. Visible
  // notes field on every open task's editor; MARK DONE stays disabled until
  // a reason is written. Replaces the check-first-then-modal order here.
  const [completionNotes, setCompletionNotes] = useState("");
  const [justDone, setJustDone] = useState(false); // v28.435 — "sometimes it just needs 'done'"

  const handleSave = () => {
    if (!form.title.trim()) return;
    clearDraft();
    onSave({ ...form, workOrderId: form.workOrderId ? Number(form.workOrderId) : null, dueDate: form.dueDate || null });
  };
  const handleCancel = () => {
    clearDraft();
    onCancel();
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
        <div>
          {/* v28.429 (Reggie, 12:39am: "I don't want them to get the text
              tonight") — schedule the assignment SMS. Blank = text now.
              A scheduled text sends even to yourself — that's the morning
              reminder. */}
          <label style={labelStyle} title="When the assignment text should send. Leave blank to text immediately.">
            TEXT ASSIGNEE AT
          </label>
          <input
            type="datetime-local"
            style={inputStyle}
            value={form.notifyAt}
            onChange={(e) => set("notifyAt", e.target.value)}
            title="Leave blank to text immediately. Set a time and the text waits — even a text to yourself (a morning reminder)."
          />
        </div>
      </div>
      {/* v28.445 — the assignment-text truth on the glass (Reggie: "how do I
          personally know if the user is going to get a text?") */}
      {initial?.id && <AssignSmsStamp stamp={initial.assignSms} />}
      {initial?.id && <TodoComments todoId={initial.id} />}
      {/* v28.445 — the task's own change log (Reggie: "who assigned this task
          to me or vice versa. Same audit trail as everything else"). */}
      {initial?.id && <TodoChangeLog todoId={initial.id} />}
      {onMarkDone && (
        <div style={{ marginTop: 12 }}>
          <label style={{ fontSize: 11, fontWeight: 800, color: C.muted, letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>
            COMPLETION NOTES — what closed this out
          </label>
          <textarea
            style={{ ...inputStyle, width: "100%", minHeight: 54, resize: "vertical", opacity: justDone ? 0.45 : 1 }}
            placeholder="Done because… (or check the box below)"
            value={completionNotes}
            disabled={justDone}
            onChange={(e) => setCompletionNotes(e.target.value)}
          />
          {/* v28.435 (Reggie: "Sometimes it just needs 'done'") — the
              low-friction attestation. Still an affirmative act, still a
              record — the requirement stands, the floor came down. */}
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, cursor: "pointer", fontSize: 12, color: C.text }}>
            <input type="checkbox" checked={justDone} onChange={(e) => setJustDone(e.target.checked)} />
            Just DONE — no notes needed
          </label>
        </div>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <Btn onClick={handleSave}>{initial ? "SAVE CHANGES" : "SAVE TASK"}</Btn>
        {onMarkDone && (
          <Btn
            variant="blue"
            disabled={!justDone && !completionNotes.trim()}
            title={justDone || completionNotes.trim() ? "Complete this task" : "Write the completion notes — or check 'Just DONE' below the notes box"}
            onClick={() => onMarkDone(justDone ? "Done." : completionNotes.trim())}
          >
            ✓ MARK DONE
          </Btn>
        )}
        <Btn onClick={handleCancel} variant="ghost">
          CANCEL
        </Btn>
      </div>
    </div>
  );
}

// ─── TODO ROW ─────────────────────────────────────────────────────────────────
function TodoRow({ todo, meName, onToggle, onEdit, onDelete, onNavigateJob, jobs }) {
  // v28.393: the DONE box must SAY what happens (completed ≠ deleted).
  // v28.431: that message now lives INSIDE the completion-notes modal — one
  // box carries the warning AND the notes (Reggie's ruling), which also
  // removed the modal-handoff race that ate the notes modal.
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
          // v28.431 — straight to the ONE completion modal (warning + notes
          // together, Reggie's ruling); the intermediate confirm is retired.
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
          {todo.createdAt && <span style={{ fontSize: 11, color: C.muted }}>Created {fmtStamp(todo.createdAt)}</span>}
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
          {todo.commentCount > 0 && (
            <span style={{ fontSize: 10, fontWeight: 700, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 3, padding: "2px 7px" }}>
              💬 {todo.commentCount}
              {todo.lastCommentName ? ` · ${todo.lastCommentName.split(" ")[0]} ${fmtStamp(todo.lastCommentAt)}` : ""}
            </span>
          )}
          {todo.needsResponseOpen && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.05em",
                color: C.orange,
                background: C.orangeB,
                border: `1px solid ${C.orange}55`,
                borderRadius: 3,
                padding: "2px 7px",
              }}
            >
              ⚑ RESPONSE NEEDED
            </span>
          )}
          {/* v28.445 — the answered state is as loud as the waiting state
              (Reggie: "How does the user know if a response is returned?").
              Same SQL that defines unanswered; no read-tracking. */}
          {!todo.needsResponseOpen && todo.responseAnsweredBy && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.05em",
                color: C.green,
                background: C.greenB,
                border: `1px solid ${C.green}55`,
                borderRadius: 3,
                padding: "2px 7px",
              }}
            >
              ⚑ ANSWERED · {todo.responseAnsweredBy.split(" ")[0]} {fmtStamp(todo.responseAnsweredAt)}
            </span>
          )}
          {!todo.completed && todo.notifyAt && !todo.notifySentAt && new Date(todo.notifyAt) > new Date() && (
            <span style={{ fontSize: 10, fontWeight: 700, color: C.blue, border: `1px solid ${C.blue}44`, borderRadius: 3, padding: "2px 7px" }}>
              📱 TEXTS {new Date(todo.notifyAt).toLocaleString([], { month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" })}
            </span>
          )}
        </div>
        {/* v28.336 — the closure record rides the row (spec §2.12) */}
        {/* v28.432 (Reggie: a closed task "states who created it. No date,
            time. and no indication of whether or not there's a time due") —
            the CLOSURE RECORD, structured like the archive/closed-WO card:
            labeled fields, full lifecycle, on-time honesty. */}
        {todo.completed && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "4px 18px",
              marginTop: 6,
              padding: "7px 10px",
              background: C.steel,
              border: `1px solid ${C.border}`,
              borderRadius: 4,
              fontSize: 11,
            }}
          >
            <span>
              <span style={{ color: C.muted, fontWeight: 700 }}>CREATED </span>
              {fmtStamp(todo.createdAt) || "—"} by {todo.createdBy || "—"}
            </span>
            <span>
              <span style={{ color: C.muted, fontWeight: 700 }}>DUE </span>
              {todo.dueDate ? String(todo.dueDate).slice(0, 10) : "no due date"}
            </span>
            <span>
              <span style={{ color: C.muted, fontWeight: 700 }}>COMPLETED </span>
              {fmtStamp(todo.completedAt) || "—"} by {todo.completedBy || "—"}
              {todo.dueDate && todo.completedAt && (
                <span
                  style={{
                    marginLeft: 6,
                    fontSize: 9,
                    fontWeight: 800,
                    letterSpacing: "0.05em",
                    padding: "1px 6px",
                    borderRadius: 3,
                    color: String(todo.completedAt).slice(0, 10) > String(todo.dueDate).slice(0, 10) ? C.overdue : C.green,
                    background: String(todo.completedAt).slice(0, 10) > String(todo.dueDate).slice(0, 10) ? C.overdueB : C.greenB,
                  }}
                >
                  {String(todo.completedAt).slice(0, 10) > String(todo.dueDate).slice(0, 10) ? "LATE" : "ON TIME"}
                </span>
              )}
            </span>
            {todo.completionNotes && (
              <span style={{ flexBasis: "100%" }}>
                <span style={{ color: C.muted, fontWeight: 700 }}>CLOSED OUT </span>
                {todo.completionNotes}
              </span>
            )}
          </div>
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
  const [justDone, setJustDone] = useState(false); // v28.435 — low-friction attestation
  return (
    <ModalWrap title="Close Out This Task" onClose={onCancel} width={440}>
      {/* v28.431 (Reggie's ruling: warning + notes in ONE box) — merging also
          killed the bug he found: the old warning modal closed while this one
          opened, and the back-button contract's cleanup raced the handoff —
          the notes modal died the same frame it was born ("I click 'Mark
          Done' and nothing happens"). One modal, no handoff, no race. */}
      <div style={{ fontSize: 13, color: C.text, marginBottom: 10, lineHeight: 1.5 }}>
        Marking <strong>{todo.title}</strong> DONE. What closed it out?
      </div>
      <div
        style={{
          fontSize: 12,
          color: C.muted,
          background: C.steel,
          border: `1px solid ${C.border}`,
          borderRadius: 4,
          padding: "7px 10px",
          marginBottom: 12,
          lineHeight: 1.45,
        }}
      >
        The task moves off the active list — it is <strong>NOT deleted</strong>. Find it anytime under COMPLETED (or SHOW COMPLETED on a Work Order), and reopen
        it from there.
      </div>
      <label style={labelStyle}>COMPLETION NOTES *</label>
      <textarea
        autoFocus
        style={{ ...inputStyle, resize: "vertical", minHeight: 72, marginBottom: 8, opacity: justDone ? 0.45 : 1 }}
        value={notes}
        disabled={justDone}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="e.g. Ordered from Odessa Supply, delivered to the Wickett yard 7/16"
      />
      <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, cursor: "pointer", fontSize: 12, color: C.text }}>
        <input type="checkbox" checked={justDone} onChange={(e) => setJustDone(e.target.checked)} />
        Just DONE — no notes needed
      </label>
      <div style={{ display: "flex", gap: 8 }}>
        <Btn
          onClick={async () => {
            if (!justDone && !notes.trim()) return;
            setBusy(true);
            await onComplete(justDone ? "Done." : notes.trim());
          }}
          disabled={(!justDone && !notes.trim()) || busy}
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

// ─── ASSIGN-SMS STAMP (v28.445) ─────────────────────────────────────────────
// What actually happened to the assignment text — sent, skipped (and WHY),
// scheduled, or failed. The v28.423 skip reasons finally reach the reader
// who needs them instead of living in Railway logs (Article XXXIII).
function AssignSmsStamp({ stamp }) {
  let s = stamp;
  if (typeof s === "string") {
    try {
      s = JSON.parse(s);
    } catch {
      return null;
    }
  }
  if (!s || !s.status) return null;
  const WHY = {
    sent: { icon: "📱", color: C.green, text: `Assignment text SENT to ${s.to_name || "assignee"}` },
    scheduled: { icon: "📱", color: C.blue, text: `Assignment text scheduled${s.scheduled_for ? ` for ${fmtStamp(s.scheduled_for)}` : ""}` },
    self_assignment: { icon: "—", color: C.muted, text: "No assignment text — self-assigned (you don't text yourself; scheduled reminders do)" },
    no_consent: { icon: "⚠", color: C.orange, text: `NOT texted: ${s.to_name || "assignee"} — no SMS consent (needs the YES reply)` },
    no_phone: { icon: "⚠", color: C.orange, text: `NOT texted: ${s.to_name || "assignee"} — no phone on file` },
    failed: { icon: "⚠", color: C.red, text: "Assignment text FAILED to send" },
  };
  const w = WHY[s.status] || { icon: "📱", color: C.muted, text: s.status };
  return (
    <div style={{ fontSize: 11, marginTop: 8, color: w.color, fontWeight: 600 }}>
      {w.icon} {w.text}
      {s.at && <span style={{ color: C.muted, fontWeight: 400 }}> · {fmtStamp(s.at)}</span>}
    </div>
  );
}

// ─── TASK CHANGE LOG (v28.445) — the meeting CHANGE-LOG pattern on tasks ────
// Who created it, who assigned it to whom (from → to, names not uuids), every
// edit, completion and reactivation. Rendered through auditDetails — the ONE
// audit-rendering home (v28.398).
const AUDIT_VERB = {
  todo_created: "created the task",
  todo_edited: "edited",
  todo_completed: "marked it DONE",
  todo_reactivated: "reactivated it",
  todo_comment: "commented",
};
function TodoChangeLog({ todoId }) {
  const { users } = useApp();
  const [rows, setRows] = useState(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!todoId || !open) return;
    api
      .get(`/todos/${todoId}/audit`)
      .then((r) => setRows(r || []))
      .catch(() => setRows([]));
  }, [todoId, open]);
  const resolve = (uuid) => (users || []).find((u) => u.id === uuid)?.name || null;
  return (
    <div style={{ marginTop: 14, borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 11, fontWeight: 800, color: C.muted, letterSpacing: "0.06em" }}
      >
        {open ? "▾" : "▸"} CHANGE LOG
      </button>
      {open && rows === null && <div style={{ fontSize: 12, color: C.muted, fontStyle: "italic", marginTop: 6 }}>Loading…</div>}
      {open && rows?.length === 0 && (
        <div style={{ fontSize: 12, color: C.muted, fontStyle: "italic", marginTop: 6 }}>No recorded changes (task predates the change log).</div>
      )}
      {open &&
        (rows || []).map((r, i) => (
          <div key={i} style={{ fontSize: 11, color: C.text, marginTop: 5 }}>
            <span style={{ color: C.muted }}>{fmtStamp(r.created_at)}</span> — <strong>{r.performed_by_name || "System"}</strong>{" "}
            {AUDIT_VERB[r.action] || r.action.replace(/^todo_/, "").replace(/_/g, " ")}
            {r.details && <span style={{ color: C.muted }}> {renderAuditDetails(r.details, resolve)}</span>}
          </div>
        ))}
    </div>
  );
}

// ─── COMMENT THREAD (v28.435) ────────────────────────────────────────────────
// The argument in the middle of a task, kept ON the task. Permanent entries
// (no edit/delete — it's the resolution trail). NEEDS RESPONSE flags the
// task orange until the creator or assignee replies (ruled: people "need to
// be forced into a workflow they would normally completely skip"). Posting
// texts the conversation circle server-side.
function TodoComments({ todoId }) {
  const [comments, setComments] = useState(null);
  const [draft, setDraft] = useState("");
  const [needsResponse, setNeedsResponse] = useState(false);
  const [posting, setPosting] = useState(false);
  const [err, setErr] = useState("");

  const load = () => {
    api
      .get(`/todos/${todoId}/comments`)
      .then((rows) => setComments(rows || []))
      .catch(() => setComments([]));
  };
  useEffect(() => {
    if (todoId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todoId]);

  const post = async () => {
    if (!draft.trim() || posting) return;
    setPosting(true);
    setErr("");
    try {
      await api.post(`/todos/${todoId}/comments`, { body: draft.trim(), needs_response: needsResponse });
      setDraft("");
      setNeedsResponse(false);
      load();
      // v28.445 — the circle texts fan out AFTER the post returns; re-load
      // shortly so the who-got-texted stamps appear without a manual refresh.
      setTimeout(load, 3000);
    } catch (e) {
      setErr(e.message || "Could not post the comment.");
    } finally {
      setPosting(false);
    }
  };

  // v28.445 — the sender sees what the machine did (Reggie: "how do I
  // personally know if the user is going to get a text?"). Outcomes are
  // stamped on the comment row by the fan-out; null = pre-stamp comment.
  const SKIP_WHY = { no_consent: "no SMS consent (needs the YES reply)", no_phone: "no phone on file", failed: "send failed" };
  const renderOutcomes = (raw) => {
    let list = raw;
    if (typeof raw === "string") {
      try {
        list = JSON.parse(raw);
      } catch {
        return null;
      }
    }
    if (!Array.isArray(list)) return null;
    if (!list.length) return <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>📱 No one else on this task to text.</div>;
    const sent = list.filter((o) => o.status === "sent").map((o) => o.name);
    const skipped = list.filter((o) => o.status !== "sent");
    return (
      <div style={{ fontSize: 10, marginTop: 4 }}>
        {sent.length > 0 && <span style={{ color: C.muted }}>📱 Texted {sent.join(", ")}</span>}
        {skipped.map((o) => (
          <span key={o.name} style={{ color: C.orange, fontWeight: 700, marginLeft: sent.length ? 8 : 0 }}>
            ⚠ Not texted: {o.name} — {SKIP_WHY[o.status] || o.status}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div style={{ marginTop: 14, borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: C.muted, letterSpacing: "0.06em", marginBottom: 6 }}>
        COMMENTS {comments ? `(${comments.length})` : ""}
      </div>
      {comments === null && <div style={{ fontSize: 12, color: C.muted, fontStyle: "italic" }}>Loading…</div>}
      {comments?.length === 0 && <div style={{ fontSize: 12, color: C.muted, fontStyle: "italic", marginBottom: 8 }}>No comments yet.</div>}
      {(comments || []).map((c) => (
        <div key={c.id} style={{ marginBottom: 8, padding: "7px 10px", background: C.steel, borderRadius: 4, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>
            <strong style={{ color: C.text }}>{c.user_name}</strong> · {fmtStamp(c.created_at)}
            {c.via === "sms" && <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, color: C.blue }}>· BY TEXT</span>}
            {c.needs_response && (
              <span style={{ marginLeft: 8, fontSize: 9, fontWeight: 800, color: C.orange, letterSpacing: "0.05em" }}>⚑ RESPONSE NEEDED</span>
            )}
          </div>
          <div style={{ fontSize: 13, color: C.text, whiteSpace: "pre-wrap" }}>{c.body}</div>
          {renderOutcomes(c.sms_outcomes)}
        </div>
      ))}
      <textarea
        style={{ ...inputStyle, width: "100%", minHeight: 48, resize: "vertical" }}
        placeholder="Question, concern, or what got missed…"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6, flexWrap: "wrap" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, color: C.text }}>
          <input type="checkbox" checked={needsResponse} onChange={(e) => setNeedsResponse(e.target.checked)} />⚑ Needs a response
        </label>
        <Btn small disabled={!draft.trim() || posting} onClick={post}>
          {posting ? "POSTING…" : "POST COMMENT"}
        </Btn>
        {err && <span style={{ fontSize: 12, color: C.red, fontWeight: 700 }}>{err}</span>}
      </div>
      <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>
        Posting texts the creator, assignee, and everyone who has commented — and they can REPLY straight to the text; it lands right here.
      </div>
    </div>
  );
}

export { TodoForm, TodoRow, CompletionNotesModal, TodoComments };
