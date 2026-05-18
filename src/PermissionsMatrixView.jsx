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

function detectEffectiveRole(permissions, templates) {
  for (const [role, template] of Object.entries(templates)) {
    const match = PERMISSION_CATEGORIES.every((p) => !!permissions?.[p.key] === !!template[p.key]);
    if (match) return role;
  }
  return "custom";
}

function PermissionsMatrixView() {
  const { currentUser, settings, refreshSettings } = useApp();
  const isOwnerOrAdmin = ["owner", "admin"].includes(currentUser?.role);
  const EDITABLE_ROLES = useMemo(() => ROLE_OPTIONS.filter((r) => r.value !== "owner"), []);
  const [permUsers, setPermUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [showTemplates, setShowTemplates] = useState(false);
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

  const applyRoleTemplate = (userId, role) => {
    const user = permUsers.find((u) => u.id === userId);
    if (!user || !canModifyUser(currentUser?.role, user.role)) return;
    const template = templates[role];
    if (!template) return;
    setPermUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, permissions: { ...template } } : u)));
    savePerm(userId, { ...template });
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
        Select a role template to apply standard permissions, or customize individual checkboxes. Owner permissions cannot be modified.
      </div>

      {/* ── Role Template Editor (Owner/Admin only) ── */}
      {isOwnerOrAdmin && (
        <div style={{ borderBottom: `2px solid ${C.border}`, padding: "12px 0", marginBottom: 12 }}>
          <div onClick={() => setShowTemplates(!showTemplates)} style={{ padding: "0 4px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: C.blue, letterSpacing: "0.06em" }}>ROLE TEMPLATES</span>
            <span style={{ fontSize: 10, color: C.muted, transform: showTemplates ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>▼</span>
            <span style={{ fontSize: 10, color: C.muted, fontStyle: "italic", marginLeft: 4 }}>Define default permissions for each role</span>
          </div>
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
              <th style={{ ...thStyle, minWidth: 100, fontWeight: 700 }}>Role Template</th>
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
                const effectiveRole = detectEffectiveRole(u.permissions, templates);
                const isCustom = effectiveRole === "custom";
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
                          value={isCustom ? "custom" : effectiveRole}
                          onChange={(e) => {
                            if (e.target.value !== "custom") applyRoleTemplate(u.id, e.target.value);
                          }}
                          style={{
                            border: `1px solid ${isCustom ? "#8a6500" : C.border}`,
                            borderRadius: 4,
                            padding: "3px 6px",
                            fontSize: 10,
                            fontWeight: 700,
                            color: isCustom ? "#8a6500" : C.text,
                            background: isCustom ? "#fdf5d8" : C.cardBg,
                            letterSpacing: "0.04em",
                            textTransform: "uppercase",
                          }}
                        >
                          {EDITABLE_ROLES.map((r) => (
                            <option key={r.value} value={r.value}>
                              {r.label}
                            </option>
                          ))}
                          {isCustom && <option value="custom">Custom</option>}
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
                          {isCustom ? "CUSTOM" : effectiveRole}
                        </span>
                      )}
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
