import { getCurrentUser } from "./config.js";
import { api } from "./api.js";

// v28.282 — one home for todo CRUD. TodoPage and JobTodoTab carried identical
// copies of create/toggle before; edit + delete land here ONCE instead of
// twice. `onError` surfaces failures (NoticeModal) — no silent fails.
// v28.336 — completion requires notes (Safety Meeting spec §2.12, enforced
// server-side): toggleTodo now only REACTIVATES; marking done routes through
// onCompleteRequest (the page opens the notes modal) → completeTodo(id, notes).
export function makeTodoActions({ todos, setTodos, userIdByName, onError, onCompleteRequest }) {
  const fail = (label, err) => {
    console.error(`Todo ${label} failed:`, err);
    onError?.(`Could not ${label} the task. Check your connection and try again.`);
  };

  const createTodo = async (form) => {
    const payload = {
      title: form.title,
      description: form.description,
      job_id: form.workOrderId,
      priority: form.priority,
      due_date: form.dueDate,
      category: form.category || "todo",
      created_by: userIdByName[getCurrentUser()],
      assigned_to: userIdByName[form.assignedTo] || userIdByName[getCurrentUser()],
    };
    try {
      const saved = await api.post("/todos", payload);
      // v28.424 — carry the IDs the MINE scope filters on: the optimistic
      // append lacked assignedToId/createdById, so a fresh task was invisible
      // in MY TASKS until a full reload re-fetched the mapped row (Reggie
      // caught it minutes after v28.422 went live).
      setTodos((prev) => [
        {
          id: saved.id,
          ...form,
          createdBy: getCurrentUser(),
          createdById: payload.created_by,
          assignedTo: form.assignedTo,
          assignedToId: payload.assigned_to,
          completed: false,
          completedBy: null,
          completedAt: null,
        },
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
      job_id: form.workOrderId,
      priority: form.priority,
      due_date: form.dueDate,
      category: form.category || "todo",
      assigned_to: userIdByName[form.assignedTo] || userIdByName[getCurrentUser()],
    };
    try {
      await api.put(`/todos/${id}`, payload);
      // v28.424 — same ID-carry on edit: a reassignment must update the ID
      // the scope filter reads, not just the display name.
      setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, ...form, assignedToId: payload.assigned_to } : t)));
      return true;
    } catch (err) {
      fail("update", err);
      return false;
    }
  };

  const toggleTodo = async (id) => {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;
    if (!todo.completed) {
      // Completing needs notes — hand off to the page's modal.
      onCompleteRequest?.(todo);
      return;
    }
    // Reactivate — clears the completion record (notes included, server-side).
    try {
      await api.put(`/todos/${id}`, { completed: false, completed_by: null });
    } catch (err) {
      fail("update", err);
      return;
    }
    setTodos((prev) => prev.map((t) => (t.id !== id ? t : { ...t, completed: false, completedBy: null, completedAt: null, completionNotes: null })));
  };

  const completeTodo = async (id, notes) => {
    try {
      await api.put(`/todos/${id}`, { completed: true, completed_by: userIdByName[getCurrentUser()], completion_notes: notes });
    } catch (err) {
      fail("complete", err);
      return false;
    }
    setTodos((prev) =>
      prev.map((t) =>
        t.id !== id ? t : { ...t, completed: true, completedBy: getCurrentUser(), completedAt: new Date().toISOString(), completionNotes: notes },
      ),
    );
    return true;
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

  return { createTodo, updateTodo, toggleTodo, completeTodo, deleteTodo };
}
