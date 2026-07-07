import { getCurrentUser } from "./config.js";
import { api } from "./api.js";

// v28.282 — one home for todo CRUD. TodoPage and JobTodoTab carried identical
// copies of create/toggle before; edit + delete land here ONCE instead of
// twice. `onError` surfaces failures (NoticeModal) — no silent fails.
export function makeTodoActions({ todos, setTodos, userIdByName, onError }) {
  const fail = (label, err) => {
    console.error(`Todo ${label} failed:`, err);
    onError?.(`Could not ${label} the task. Check your connection and try again.`);
  };

  const createTodo = async (form) => {
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
      return true;
    } catch (err) {
      fail("create", err);
      return false;
    }
  };

  const updateTodo = async (id, form) => {
    const payload = {
      title: form.title,
      description: form.description,
      job_id: form.jobId,
      priority: form.priority,
      due_date: form.dueDate,
      assigned_to: userIdByName[form.assignedTo] || userIdByName[getCurrentUser()],
    };
    try {
      await api.put(`/todos/${id}`, payload);
      setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, ...form } : t)));
      return true;
    } catch (err) {
      fail("update", err);
      return false;
    }
  };

  const toggleTodo = async (id) => {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;
    const nowComplete = !todo.completed;
    try {
      await api.put(`/todos/${id}`, { completed: nowComplete, completed_by: nowComplete ? userIdByName[getCurrentUser()] : null });
    } catch (err) {
      fail("update", err);
      return;
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

  const deleteTodo = async (id) => {
    try {
      await api.del(`/todos/${id}`);
      setTodos((prev) => prev.filter((t) => t.id !== id));
      return true;
    } catch (err) {
      fail("delete", err);
      return false;
    }
  };

  return { createTodo, updateTodo, toggleTodo, deleteTodo };
}
