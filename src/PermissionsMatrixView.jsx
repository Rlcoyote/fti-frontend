import { useState, useEffect, useMemo } from "react";
import { C, API_URL } from "./config.js";
import { canModifyUser, PERMISSION_CATEGORIES, DEFAULT_PERMS, ROLE_OPTIONS, getRoleTemplates } from "./utils.js";
import { useApp } from "./AppContext.jsx";

// ─── PermissionsMatrixView (v28.17, extracted from PermissionsModal v27.x) ─
// Inline matrix view for role templates + per-user permission overrides.
// Used by PeoplePage as the "Permissions" tab. The previous incarnation
// (PermissionsModal.jsx) wrapped this content in a modal shell + was
// reachable from the gear menu — both surfaces gone in v28.17, this view
// embedded directly in the consolidated People page.
//
// All behavior preserved:
//   - Owner row read-only (immutable, server-enforced)
//   - canModifyUser rank gate on every checkbox + role-template apply
//   - Sticky-left "Role" / "User" columns (v28.14 retrofit)
//   - "Custom" effective-role detection when permissions don't match any template
//   - Server saves on every checkbox toggle (silent — no toast spam)
//   - Role template editor collapsible, saves manually via SAVE TEMPLATES

// True when a user's effective permissions diverge from their role's
// default template — i.e. someone hand-toggled checkboxes for them.
function isCustomized(permissions, template) {
  if (!template) return false;
  return PERMISSION_CATEGORIES.some((p) => !!permissions?.[p.key] !== !!template[p.key]);
}

function PermissionsMatrixView() {
  const { currentUser, settings, refreshSettings } = useApp();
  // v28.139 (permissions audit Phase 5.5) — root of trust. Gates the
  // role-template editor itself. Intentionally a hardcoded owner/admin
  // check, NOT a can() matrix key: the matrix cannot govern who edits the
  // matrix without becoming circular / an escalation path. Mirrors the
  // backend PUT /api/settings role_templates guard. Documented — keep.
  const isOwnerOrAdmin = ["owner", "admin"].includes(currentUser?.role);
  const EDITABLE_ROLES = useMemo(() => ROLE_OPTIONS.filter((r) => r.value !== "owner"), []);
  const [permUsers, setPermUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  // v28.180 — Role Templates expand state persists in localStorage so a user's
  // last preference (open / closed) sticks across navigations. Default OPEN so
  // first-time visitors see the editor without having to discover it. Old
  // default was closed; the unhinted "▼" arrow didn't read as "click to
  // reveal the per-role permission editor" to most users.
  const [showTemplates, setShowTemplates] = useState(() => {
    try {
      const saved = localStorage.getItem("fti_perm_role_templates_open");
      if (saved === "false") return false;
      return true;
    } catch {
      return true;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("fti_perm_role_templates_open", String(showTemplates));
    } catch {
      /* ignore */
    }
  }, [showTemplates]);
  const [templateSaving, setTemplateSaving] = useState(false);

  const templates = useMemo(() => getRoleTemplates(settings), [settings]);

  const [editTemplates, setEditTemplates] = useState({});
  useEffect(() => {
    const copy = {};
    for (const role of EDITABLE_ROLES.map((r) => r.value)) {
      copy[role] = { ...(templates[role] || DEFAULT_PERMS[role] || {}) };
    }
    setEditTemplates(copy);
  }, [templates, EDITABLE_ROLES]);

  useEffect(() => {
    fetch(`${API_URL}/permissions`)
      .then((r) => r.json())
      .then((data) => {
        setPermUsers(
          data.map((u) => ({
            ...u,
            permissions: Object.keys(u.permissions || {}).length > 0 ? u.permissions : templates[u.role] || DEFAULT_PERMS.field,
          })),
        );
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [templates]);

  const savePerm = async (userId, perms) => {
    setSaving((prev) => ({ ...prev, [userId]: true }));
    try {
      await fetch(`${API_URL}/permissions/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: perms }),
      });
    } catch (err) {
      console.error("Save permissions failed:", err);
    }
    setSaving((prev) => ({ ...prev, [userId]: false }));
  };

  const togglePerm = (userId, permKey) => {
    const user = permUsers.find((u) => u.id === userId);
    if (!user || !canModifyUser(currentUser?.role, user.role)) return;
    const updated = { ...user.permissions, [permKey]: !user.permissions[permKey] };
    setPermUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, permissions: updated } : u)));
    savePerm(userId, updated);
  };

  // v28.172 — the per-user Role dropdown sets the user's ACTUAL role
  // (PUT /users/:id, which bumps token_version) and resets their
  // permissions to that role's template. Previously it only wrote the
  // permissions JSON and the displayed role was reverse-detected — which
  // broke whenever two role templates were identical (e.g. admin == manager).
  // The role is now read from users.role, never guessed.
  const changeUserRole = async (userId, newRole) => {
    const user = permUsers.find((u) => u.id === userId);
    if (!user || !canModifyUser(currentUser?.role, user.role)) return;
    const template = templates[newRole];
    if (!template) return;
    setSaving((prev) => ({ ...prev, [userId]: true }));
    try {
      const r = await fetch(`${API_URL}/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (!r.ok) {
        const data = await r.json().catch(() => null);
        console.error("Change role failed:", data?.error || r.status);
        setSaving((prev) => ({ ...prev, [userId]: false }));
        return;
      }
      await fetch(`${API_URL}/permissions/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: { ...template } }),
      });
      setPermUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole, permissions: { ...template } } : u)));
    } catch (err) {
      console.error("Change role failed:", err);
    }
    setSaving((prev) => ({ ...prev, [userId]: false }));
  };

  const toggleTemplatePerm = (role, permKey) => {
    setEditTemplates((prev) => ({
      ...prev,
      [role]: { ...prev[role], [permKey]: !prev[role]?.[permKey] },
    }));
  };

  const saveTemplates = async () => {
    setTemplateSaving(true);
    try {
      await fetch(`${API_URL}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role_templates: JSON.stringify(editTemplates) }),
      });
      await refreshSettings();
    } catch (err) {
      console.error("Save templates failed:", err);
    }
    setTemplateSaving(false);
  };

  const templatesDirty = useMemo(() => {
    for (const role of EDITABLE_ROLES.map((r) => r.value)) {
      for (const p of PERMISSION_CATEGORIES) {
        if (!!editTemplates[role]?.[p.key] !== !!templates[role]?.[p.key]) return true;
      }
    }
    return false;
  }, [editTemplates, templates, EDITABLE_ROLES]);

  const thStyle = {
    position: "sticky",
    top: 0,
    background: C.cardBg,
    padding: "10px 4px",
    textAlign: "center",
    borderBottom: `2px solid ${C.border}`,
    fontWeight: 600,
    color: C.muted,
    minWidth: 55,
    fontSize: 10,
    lineHeight: 1.3,
    zIndex: 2,
  };
  const stickyLeftHeader = { position: "sticky", left: 0, zIndex: 3, background: C.cardBg, boxShadow: `2px 0 0 ${C.border}` };
  const stickyLeftCell = { position: "sticky", left: 0, zIndex: 1, background: C.cardBg, boxShadow: `2px 0 0 ${C.border}` };

  const roleBg = (r) =>
    r === "owner" ? "#fdecea" : r === "admin" ? "#e8f0fb" : r === "manager" ? "#e6f5ec" : r === "lead" ? "#fdf5d8" : r === "salesman" ? "#f3eafa" : "#f0f3f8";

  return (
    <div style={{ overflowX: "auto", overflowY: "auto", padding: "0 0 16px" }}>
      <div style={{ fontSize: 11, color: C.muted, padding: "0 4px 12px" }}>
        Set a user's role to apply that role's standard permissions, then customize individual checkboxes if needed. Owner permissions cannot be modified.
      </div>

      {/* ── Role Template Editor (Owner/Admin only) ── */}
      {isOwnerOrAdmin && (
        <div style={{ borderBottom: `2px solid ${C.border}`, padding: "12px 0", marginBottom: 12 }}>
          {/* v28.180 — UX fix: the chevron alone was unintuitive (people didn't
              realize clicking it revealed the per-role permission editor).
              Adopted an explicit "Hide / Show defaults" label, larger target,
              and a visible button-style affordance. State persists in
              localStorage so the user's last preference holds across navs. */}
          <button
            type="button"
            onClick={() => setShowTemplates(!showTemplates)}
            style={{
              padding: "8px 12px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: showTemplates ? C.steel : "transparent",
              border: `1px solid ${showTemplates ? C.border : "transparent"}`,
              borderRadius: 4,
              width: "100%",
              textAlign: "left",
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 800, color: C.blue, letterSpacing: "0.06em" }}>ROLE TEMPLATES</span>
            <span style={{ fontSize: 11, color: C.muted, transform: showTemplates ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>▼</span>
            <span style={{ fontSize: 11, color: C.text, fontStyle: "italic", marginLeft: 4 }}>
              {showTemplates ? "Click to hide per-role permission defaults" : "Click to show per-role permission defaults"}
            </span>
          </button>
          {showTemplates && (
            <div style={{ padding: "12px 0 0", overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, ...stickyLeftHeader, textAlign: "left", padding: "10px 12px", minWidth: 100, fontWeight: 800, color: C.text }}>
                      Role
                    </th>
                    {PERMISSION_CATEGORIES.map((p) => (
                      <th key={p.key} style={thStyle}>
                        {p.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {EDITABLE_ROLES.map((r) => (
                    <tr key={r.value} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td
                        style={{
                          ...stickyLeftCell,
                          padding: "8px 12px",
                          fontWeight: 700,
                          color: C.text,
                          textTransform: "uppercase",
                          fontSize: 11,
                          letterSpacing: "0.04em",
                        }}
                      >
                        {r.label}
                      </td>
                      {PERMISSION_CATEGORIES.map((p) => (
                        <td key={p.key} style={{ padding: "8px 4px", textAlign: "center" }}>
                          <input
                            type="checkbox"
                            checked={!!editTemplates[r.value]?.[p.key]}
                            onChange={() => toggleTemplatePerm(r.value, p.key)}
                            style={{ width: 16, height: 16, cursor: "pointer", accentColor: C.blue }}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ padding: "10px 4px", display: "flex", gap: 10, alignItems: "center" }}>
                <button
                  onClick={saveTemplates}
                  disabled={!templatesDirty || templateSaving}
                  style={{
                    background: templatesDirty ? C.blue : C.steel,
                    color: templatesDirty ? C.white : C.muted,
                    border: "none",
                    borderRadius: 4,
                    padding: "6px 16px",
                    fontSize: 11,
                    fontWeight: 800,
                    cursor: templatesDirty ? "pointer" : "not-allowed",
                  }}
                >
                  {templateSaving ? "SAVING..." : "SAVE TEMPLATES"}
                </button>
                {!templatesDirty && <span style={{ fontSize: 10, color: C.muted }}>No unsaved changes</span>}
                {templatesDirty && <span style={{ fontSize: 10, color: "#8a6500", fontWeight: 600 }}>Unsaved changes</span>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── User Permissions Grid ── */}
      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: C.muted }}>Loading...</div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, ...stickyLeftHeader, textAlign: "left", padding: "10px 12px", minWidth: 140, fontWeight: 800, color: C.text }}>User</th>
              <th style={{ ...thStyle, minWidth: 100, fontWeight: 700 }}>Role</th>
              {PERMISSION_CATEGORIES.map((p) => (
                <th key={p.key} style={thStyle}>
                  {p.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {permUsers
              .filter((u) => u.is_active)
              .map((u) => {
                const isOwner = u.role === "owner";
                const canModify = canModifyUser(currentUser?.role, u.role);
                const customized = isCustomized(u.permissions, templates[u.role]);
                const stickyBg = isOwner ? "#f0f3f8" : C.cardBg;
                return (
                  <tr key={u.id} style={{ borderBottom: `1px solid ${C.border}`, background: isOwner ? "#f0f3f8" : "transparent" }}>
                    <td style={{ ...stickyLeftCell, background: stickyBg, padding: "8px 12px", fontWeight: 700, color: C.text }}>
                      {u.name}
                      {saving[u.id] && <span style={{ fontSize: 9, color: C.blue, marginLeft: 6 }}>saving...</span>}
                    </td>
                    <td style={{ padding: "8px 6px" }}>
                      {canModify ? (
                        <select
                          value={u.role}
                          onChange={(e) => changeUserRole(u.id, e.target.value)}
                          style={{
                            border: `1px solid ${C.border}`,
                            borderRadius: 4,
                            padding: "3px 6px",
                            fontSize: 10,
                            fontWeight: 700,
                            color: C.text,
                            background: C.cardBg,
                            letterSpacing: "0.04em",
                            textTransform: "uppercase",
                          }}
                        >
                          {EDITABLE_ROLES.map((r) => (
                            <option key={r.value} value={r.value}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: C.muted,
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                            padding: "2px 8px",
                            borderRadius: 3,
                            background: roleBg(u.role),
                          }}
                        >
                          {u.role}
                        </span>
                      )}
                      {customized && <div style={{ fontSize: 9, color: "#8a6500", fontWeight: 700, marginTop: 3, letterSpacing: "0.04em" }}>● CUSTOMIZED</div>}
                    </td>
                    {PERMISSION_CATEGORIES.map((p) => {
                      const checked = u.permissions?.[p.key] ?? false;
                      const disabled = !canModify;
                      return (
                        <td key={p.key} style={{ padding: "8px 4px", textAlign: "center" }}>
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={disabled}
                            onChange={() => togglePerm(u.id, p.key)}
                            style={{ width: 16, height: 16, cursor: disabled ? "not-allowed" : "pointer", accentColor: C.blue }}
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default PermissionsMatrixView;
