import { useState } from "react";
import { C } from "./config.js";
import { useApp } from "./AppContext.jsx";
import { Btn, SegmentedBtns, ConfirmModal, NoticeModal } from "./SharedUI.jsx";
import { TodoForm, TodoRow, CompletionNotesModal } from "./TodoComponents.jsx";
import { makeTodoActions } from "./todoActions.js";

function TodoPage({ todos, setTodos, jobs, onNavigateJob, userNames, userIdByName }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null); // the todo being edited (v28.282)
  const [confirmDelete, setConfirmDelete] = useState(null); // the todo pending deletion
  const [notice, setNotice] = useState(null);
  const [filter, setFilter] = useState("active");
  const [typeFilter, setTypeFilter] = useState("all");
  const [completing, setCompleting] = useState(null); // v28.336 — the todo awaiting completion notes

  const { createTodo, updateTodo, toggleTodo, completeTodo, deleteTodo } = makeTodoActions({
    todos,
    setTodos,
    userIdByName,
    onError: setNotice,
    onCompleteRequest: setCompleting,
  });

  // v28.422 — dummy-proofed scopes (Reggie 260723, replacing the v28.325
  // all-lumped board): MINE is the DEFAULT (assigned to me, or created by me
  // — my work first); ALL is one tap away for everyone (transparency — a
  // field-created task for another field user is never invisible, just no
  // longer camouflaged); BY PERSON is the manager audit rollup, gated
  // audit_action_items.
  const { currentUser, can } = useApp();
  const [scope, setScope] = useState("mine");
  const canAudit = can("audit_action_items");
  const isMine = (t) => t.assignedToId === currentUser?.id || t.createdById === currentUser?.id;
  const myTodos = scope === "mine" ? todos.filter(isMine) : todos;

  const filtered = myTodos.filter((t) => {
    if (filter === "active" && t.completed) return false;
    if (filter === "completed" && !t.completed) return false;
    if (typeFilter === "job" && !t.workOrderId) return false;
    if (typeFilter === "general" && t.workOrderId) return false;
    return true;
  });

  // BY PERSON rollup: one bucket per assignee, open/overdue/completed-7-days.
  const todayStr = new Date().toLocaleDateString("en-CA");
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const byPerson = {};
  if (scope === "byPerson") {
    for (const t of todos) {
      const key = t.assignedTo || "Unassigned";
      const b = (byPerson[key] = byPerson[key] || { open: [], overdue: 0, doneWeek: [] });
      if (!t.completed) {
        b.open.push(t);
        if (t.dueDate && String(t.dueDate).slice(0, 10) < todayStr) b.overdue += 1;
      } else if (t.completedAt && t.completedAt >= weekAgo) {
        b.doneWeek.push(t);
      }
    }
  }

  return (
    <div style={{ padding: "24px 28px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Action Items</h1>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
            {scope === "mine" ? "Your tasks — " : scope === "byPerson" ? "Every person's standing — " : "The whole board — "}
            {myTodos.filter((t) => !t.completed).length} active · {myTodos.filter((t) => t.completed).length} completed
          </div>
        </div>
        <Btn
          onClick={() => {
            setEditing(null);
            setShowForm((s) => !s);
          }}
        >
          {showForm ? "CANCEL" : "+ NEW TASK"}
        </Btn>
      </div>

      {showForm && (
        <TodoForm
          onSave={async (form) => {
            await createTodo(form);
            setShowForm(false);
          }}
          onCancel={() => setShowForm(false)}
          jobs={jobs}
          userNames={userNames}
        />
      )}

      {/* v28.283 — filters joined into segmented groups: each set reads as ONE switch */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginRight: 4 }}>SHOW:</span>
        <SegmentedBtns value={scope} onChange={setScope} options={[["mine", "MINE"], ["all", "ALL"], ...(canAudit ? [["byPerson", "BY PERSON"]] : [])]} />
        <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginLeft: 12, marginRight: 4 }}>STATUS:</span>
        <SegmentedBtns
          value={filter}
          onChange={setFilter}
          options={[
            ["active", "ACTIVE"],
            ["completed", "COMPLETED"],
          ]}
        />
        <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginLeft: 12, marginRight: 4 }}>TYPE:</span>
        <SegmentedBtns
          value={typeFilter}
          onChange={setTypeFilter}
          options={[
            ["all", "ALL"],
            ["job", "JOB-LINKED"],
            ["general", "GENERAL"],
          ]}
        />
      </div>

      {scope === "byPerson" &&
        Object.entries(byPerson)
          .sort((a, b) => b[1].open.length - a[1].open.length)
          .map(([name, b]) => (
            <div key={name} style={{ border: `1px solid ${b.overdue ? C.overdue + "66" : C.border}`, borderRadius: 8, marginBottom: 10, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: C.steel, flexWrap: "wrap" }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{name}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.muted }}>{b.open.length} open</span>
                {b.overdue > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 800, color: C.overdue, background: C.overdueB, borderRadius: 3, padding: "2px 8px" }}>
                    {b.overdue} OVERDUE
                  </span>
                )}
                <span style={{ fontSize: 11, color: C.green, fontWeight: 700, marginLeft: "auto" }}>✓ {b.doneWeek.length} done this week</span>
              </div>
              {[...b.open, ...b.doneWeek].map((t) => (
                <TodoRow
                  key={t.id}
                  todo={t}
                  meName={currentUser?.name}
                  onToggle={toggleTodo}
                  onEdit={(todo) => {
                    setShowForm(false);
                    setEditing(todo);
                  }}
                  onDelete={setConfirmDelete}
                  onNavigateJob={onNavigateJob}
                  jobs={jobs}
                />
              ))}
              {b.open.length === 0 && b.doneWeek.length === 0 && (
                <div style={{ padding: "10px 14px", fontSize: 12, color: C.muted, fontStyle: "italic" }}>Nothing open, nothing recent.</div>
              )}
            </div>
          ))}
      {scope !== "byPerson" && filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 0", color: C.muted, fontSize: 14 }}>
          {scope === "mine" ? "Nothing on your plate. Flip to ALL to see the whole board." : "No tasks here."}
        </div>
      )}
      {scope !== "byPerson" &&
        filtered.map((t) =>
          editing?.id === t.id ? (
            // v28.282 — edit in place: the form opens where the row was
            <TodoForm
              key={t.id}
              initial={editing}
              onSave={async (form) => {
                await updateTodo(editing.id, form);
                setEditing(null);
              }}
              onReactivate={
                editing.completed
                  ? async () => {
                      await toggleTodo(editing.id);
                      setEditing(null);
                    }
                  : null
              }
              onCancel={() => setEditing(null)}
              jobs={jobs}
              userNames={userNames}
            />
          ) : (
            <TodoRow
              key={t.id}
              todo={t}
              meName={currentUser?.name}
              onToggle={toggleTodo}
              onEdit={(todo) => {
                setShowForm(false);
                setEditing(todo);
              }}
              onDelete={setConfirmDelete}
              onNavigateJob={onNavigateJob}
              jobs={jobs}
            />
          ),
        )}

      {confirmDelete && (
        <ConfirmModal
          title="Delete this task?"
          message={`"${confirmDelete.title}" will be permanently deleted. It will NOT be kept under Completed. To keep the record instead, cancel and check its DONE box.`}
          yesLabel="DELETE TASK"
          onYes={async () => {
            await deleteTodo(confirmDelete.id);
            setConfirmDelete(null);
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
      {completing && (
        <CompletionNotesModal
          todo={completing}
          onComplete={async (notes) => {
            await completeTodo(completing.id, notes);
            setCompleting(null);
          }}
          onCancel={() => setCompleting(null)}
        />
      )}
      {notice && <NoticeModal title="Task error" message={notice} variant="error" onClose={() => setNotice(null)} />}
    </div>
  );
}

// ─── JOB TODO TAB ─────────────────────────────────────────────────────────────
function JobTodoTab({ workOrderId, todos, setTodos, jobs, userNames, userIdByName }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [notice, setNotice] = useState(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [completing, setCompleting] = useState(null); // v28.336 — the todo awaiting completion notes

  const { createTodo, updateTodo, toggleTodo, completeTodo, deleteTodo } = makeTodoActions({
    todos,
    setTodos,
    userIdByName,
    onError: setNotice,
    onCompleteRequest: setCompleting,
  });

  const workOrderTodos = todos.filter((t) => t.workOrderId === workOrderId);
  const visible = workOrderTodos.filter((t) => showCompleted || !t.completed);

  return (
    <div style={{ padding: "16px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.muted }}>
          {workOrderTodos.filter((t) => !t.completed).length} active task{workOrderTodos.filter((t) => !t.completed).length !== 1 ? "s" : ""}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="fti-btn"
            onClick={() => setShowCompleted((s) => !s)}
            style={{
              background: "transparent",
              border: `1px solid ${C.border}`,
              color: C.muted,
              padding: "4px 10px",
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {showCompleted ? "HIDE COMPLETED" : "SHOW COMPLETED"}
          </button>
          <Btn
            small
            onClick={() => {
              setEditing(null);
              setShowForm((s) => !s);
            }}
          >
            {showForm ? "CANCEL" : "+ ADD TASK"}
          </Btn>
        </div>
      </div>

      {showForm && (
        <TodoForm
          onSave={async (form) => {
            await createTodo(form);
            setShowForm(false);
          }}
          onCancel={() => setShowForm(false)}
          defaultWorkOrderId={workOrderId}
          jobs={jobs}
          userNames={userNames}
        />
      )}

      {visible.length === 0 && <div style={{ textAlign: "center", padding: "24px 0", color: C.muted, fontSize: 13 }}>No tasks for this job.</div>}
      {visible.map((t) =>
        editing?.id === t.id ? (
          <TodoForm
            key={t.id}
            initial={editing}
            onSave={async (form) => {
              await updateTodo(editing.id, form);
              setEditing(null);
            }}
            onReactivate={
              editing.completed
                ? async () => {
                    await toggleTodo(editing.id);
                    setEditing(null);
                  }
                : null
            }
            onCancel={() => setEditing(null)}
            jobs={jobs}
            userNames={userNames}
          />
        ) : (
          <TodoRow
            key={t.id}
            todo={t}
            onToggle={toggleTodo}
            onEdit={(todo) => {
              setShowForm(false);
              setEditing(todo);
            }}
            onDelete={setConfirmDelete}
            jobs={jobs}
          />
        ),
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Delete this task?"
          message={`"${confirmDelete.title}" will be permanently deleted. It will NOT be kept under Completed. To keep the record instead, cancel and check its DONE box.`}
          yesLabel="DELETE TASK"
          onYes={async () => {
            await deleteTodo(confirmDelete.id);
            setConfirmDelete(null);
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
      {completing && (
        <CompletionNotesModal
          todo={completing}
          onComplete={async (notes) => {
            await completeTodo(completing.id, notes);
            setCompleting(null);
          }}
          onCancel={() => setCompleting(null)}
        />
      )}
      {notice && <NoticeModal title="Task error" message={notice} variant="error" onClose={() => setNotice(null)} />}
    </div>
  );
}

export { TodoPage, JobTodoTab };
