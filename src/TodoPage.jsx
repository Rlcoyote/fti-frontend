import { useState } from "react";
import { C } from "./config.js";
import { todoVisible } from "./utils.js";
import { Btn, FilterBtn, ConfirmModal, NoticeModal } from "./SharedUI.jsx";
import { TodoForm, TodoRow } from "./TodoComponents.jsx";
import { makeTodoActions } from "./todoActions.js";

function TodoPage({ todos, setTodos, jobs, onNavigateJob, userNames, userIdByName }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null); // the todo being edited (v28.282)
  const [confirmDelete, setConfirmDelete] = useState(null); // the todo pending deletion
  const [notice, setNotice] = useState(null);
  const [filter, setFilter] = useState("active");
  const [typeFilter, setTypeFilter] = useState("all");

  const { createTodo, updateTodo, toggleTodo, deleteTodo } = makeTodoActions({ todos, setTodos, userIdByName, onError: setNotice });

  const myTodos = todos.filter(todoVisible);

  const filtered = myTodos.filter((t) => {
    if (filter === "active" && t.completed) return false;
    if (filter === "completed" && !t.completed) return false;
    if (typeFilter === "job" && !t.jobId) return false;
    if (typeFilter === "general" && t.jobId) return false;
    return true;
  });

  return (
    <div style={{ padding: "24px 28px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>To-Do / Tasks</h1>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
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

      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginRight: 4, alignSelf: "center" }}>STATUS:</span>
        {[
          ["active", "ACTIVE"],
          ["completed", "COMPLETED"],
        ].map(([v, l]) => (
          <FilterBtn key={v} active={filter === v} onClick={() => setFilter(v)}>
            {l}
          </FilterBtn>
        ))}
        <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginLeft: 12, marginRight: 4, alignSelf: "center" }}>TYPE:</span>
        {[
          ["all", "ALL"],
          ["job", "JOB-LINKED"],
          ["general", "GENERAL"],
        ].map(([v, l]) => (
          <FilterBtn key={v} active={typeFilter === v} onClick={() => setTypeFilter(v)}>
            {l}
          </FilterBtn>
        ))}
      </div>

      {filtered.length === 0 && <div style={{ textAlign: "center", padding: "40px 0", color: C.muted, fontSize: 14 }}>No tasks here.</div>}
      {filtered.map((t) =>
        editing?.id === t.id ? (
          // v28.282 — edit in place: the form opens where the row was
          <TodoForm
            key={t.id}
            initial={editing}
            onSave={async (form) => {
              await updateTodo(editing.id, form);
              setEditing(null);
            }}
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
      {notice && <NoticeModal title="Task error" message={notice} variant="error" onClose={() => setNotice(null)} />}
    </div>
  );
}

// ─── JOB TODO TAB ─────────────────────────────────────────────────────────────
function JobTodoTab({ jobId, todos, setTodos, jobs, userNames, userIdByName }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [notice, setNotice] = useState(null);
  const [showCompleted, setShowCompleted] = useState(false);

  const { createTodo, updateTodo, toggleTodo, deleteTodo } = makeTodoActions({ todos, setTodos, userIdByName, onError: setNotice });

  const jobTodos = todos.filter((t) => t.jobId === jobId && todoVisible(t));
  const visible = jobTodos.filter((t) => showCompleted || !t.completed);

  return (
    <div style={{ padding: "16px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.muted }}>
          {jobTodos.filter((t) => !t.completed).length} active task{jobTodos.filter((t) => !t.completed).length !== 1 ? "s" : ""}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
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
          defaultJobId={jobId}
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
      {notice && <NoticeModal title="Task error" message={notice} variant="error" onClose={() => setNotice(null)} />}
    </div>
  );
}

export { TodoPage, JobTodoTab };
