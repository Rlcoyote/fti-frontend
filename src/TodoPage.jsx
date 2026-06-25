import { useState } from "react";
import { C, getCurrentUser } from "./config.js";
import { api } from "./api.js";
import { todoVisible } from "./utils.js";
import { Btn, FilterBtn } from "./SharedUI.jsx";
import { TodoForm, TodoRow } from "./TodoComponents.jsx";

function TodoPage({ todos, setTodos, jobs, onNavigateJob, userNames, userIdByName }) {
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("active");
  const [typeFilter, setTypeFilter] = useState("all");

  const myTodos = todos.filter(todoVisible);

  const filtered = myTodos.filter((t) => {
    if (filter === "active" && t.completed) return false;
    if (filter === "completed" && !t.completed) return false;
    if (typeFilter === "job" && !t.jobId) return false;
    if (typeFilter === "general" && t.jobId) return false;
    return true;
  });

  const handleSave = async (form) => {
    const payload = {
      title: form.title,
      description: form.description,
      job_id: form.jobId,
      priority: form.priority,
      due_date: form.dueDate,
      created_by: userIdByName[getCurrentUser()],
      assigned_to: userIdByName[form.assignedTo] || userIdByName[getCurrentUser()],
    };
    try {
      const saved = await api.post("/todos", payload);
      const newTodo = {
        id: saved.id,
        ...form,
        createdBy: getCurrentUser(),
        assignedTo: form.assignedTo,
        completed: false,
        completedBy: null,
        completedAt: null,
      };
      setTodos((prev) => [newTodo, ...prev]);
    } catch (err) {
      console.error("Todo create failed:", err);
    }
    setShowForm(false);
  };

  const toggleTodo = async (id) => {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;
    const nowComplete = !todo.completed;
    try {
      await api.put(`/todos/${id}`, { completed: nowComplete, completed_by: nowComplete ? userIdByName[getCurrentUser()] : null });
    } catch (err) {
      console.error("Todo toggle failed:", err);
    }
    setTodos((prev) =>
      prev.map((t) =>
        t.id !== id
          ? t
          : {
              ...t,
              completed: nowComplete,
              completedBy: nowComplete ? getCurrentUser() : null,
              completedAt: nowComplete ? new Date().toISOString() : null,
            },
      ),
    );
  };

  return (
    <div style={{ padding: "24px 28px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>To-Do / Tasks</h1>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
            {myTodos.filter((t) => !t.completed).length} active · {myTodos.filter((t) => t.completed).length} completed
          </div>
        </div>
        <Btn onClick={() => setShowForm((s) => !s)}>{showForm ? "CANCEL" : "+ NEW TASK"}</Btn>
      </div>

      {showForm && <TodoForm onSave={handleSave} onCancel={() => setShowForm(false)} jobs={jobs} userNames={userNames} />}

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
      {filtered.map((t) => (
        <TodoRow key={t.id} todo={t} onToggle={toggleTodo} onNavigateJob={onNavigateJob} jobs={jobs} />
      ))}
    </div>
  );
}

// ─── JOB TODO TAB ─────────────────────────────────────────────────────────────
function JobTodoTab({ jobId, todos, setTodos, jobs, userNames, userIdByName }) {
  const [showForm, setShowForm] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const jobTodos = todos.filter((t) => t.jobId === jobId && todoVisible(t));
  const visible = jobTodos.filter((t) => showCompleted || !t.completed);

  const handleSave = async (form) => {
    const payload = {
      title: form.title,
      description: form.description,
      job_id: form.jobId,
      priority: form.priority,
      due_date: form.dueDate,
      created_by: userIdByName[getCurrentUser()],
      assigned_to: userIdByName[form.assignedTo] || userIdByName[getCurrentUser()],
    };
    try {
      const saved = await api.post("/todos", payload);
      setTodos((prev) => [
        { id: saved.id, ...form, createdBy: getCurrentUser(), assignedTo: form.assignedTo, completed: false, completedBy: null, completedAt: null },
        ...prev,
      ]);
    } catch (err) {
      console.error("Todo create failed:", err);
    }
    setShowForm(false);
  };

  const toggleTodo = async (id) => {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;
    const nowComplete = !todo.completed;
    try {
      await api.put(`/todos/${id}`, { completed: nowComplete, completed_by: nowComplete ? userIdByName[getCurrentUser()] : null });
    } catch (err) {
      console.error("Todo toggle failed:", err);
    }
    setTodos((prev) =>
      prev.map((t) =>
        t.id !== id
          ? t
          : {
              ...t,
              completed: nowComplete,
              completedBy: nowComplete ? getCurrentUser() : null,
              completedAt: nowComplete ? new Date().toISOString() : null,
            },
      ),
    );
  };

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
          <Btn small onClick={() => setShowForm((s) => !s)}>
            {showForm ? "CANCEL" : "+ ADD TASK"}
          </Btn>
        </div>
      </div>

      {showForm && <TodoForm onSave={handleSave} onCancel={() => setShowForm(false)} defaultJobId={jobId} jobs={jobs} userNames={userNames} />}

      {visible.length === 0 && <div style={{ textAlign: "center", padding: "24px 0", color: C.muted, fontSize: 13 }}>No tasks for this job.</div>}
      {visible.map((t) => (
        <TodoRow key={t.id} todo={t} onToggle={toggleTodo} jobs={jobs} />
      ))}
    </div>
  );
}

export { TodoPage, JobTodoTab };
