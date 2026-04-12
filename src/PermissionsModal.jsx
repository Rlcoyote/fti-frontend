import { useState, useEffect } from "react";
import { C, API_URL } from "./config.js";
import { canModifyUser, PERMISSION_CATEGORIES, DEFAULT_PERMS, ROLE_OPTIONS } from "./utils.js";
import { useApp } from "./AppContext.jsx";

// Check if a user's permissions match a standard role template exactly.
// Returns the matching role name, or "custom" if no match.
function detectEffectiveRole(permissions) {
  for (const [role, template] of Object.entries(DEFAULT_PERMS)) {
    const match = PERMISSION_CATEGORIES.every(p => !!(permissions?.[p.key]) === !!(template[p.key]));
    if (match) return role;
  }
  return "custom";
}

function PermissionsModal({ onClose }) {
  const { currentUser } = useApp();
  const [permUsers, setPermUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});

  useEffect(() => {
    fetch(`${API_URL}/permissions`).then(r => r.json()).then(data => {
      setPermUsers(data.map(u => ({
        ...u,
        permissions: Object.keys(u.permissions || {}).length > 0
          ? u.permissions
          : DEFAULT_PERMS[u.role] || DEFAULT_PERMS.field,
      })));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const savePerm = async (userId, perms) => {
    setSaving(prev => ({ ...prev, [userId]: true }));
    try {
      await fetch(`${API_URL}/permissions/${userId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: perms }),
      });
    } catch (err) { console.error("Save permissions failed:", err); }
    setSaving(prev => ({ ...prev, [userId]: false }));
  };

  const togglePerm = (userId, permKey) => {
    const user = permUsers.find(u => u.id === userId);
    if (!user || !canModifyUser(currentUser?.role, user.role)) return;
    const updated = { ...user.permissions, [permKey]: !user.permissions[permKey] };
    setPermUsers(prev => prev.map(u => u.id === userId ? { ...u, permissions: updated } : u));
    savePerm(userId, updated);
  };

  const applyRoleTemplate = (userId, role) => {
    const user = permUsers.find(u => u.id === userId);
    if (!user || !canModifyUser(currentUser?.role, user.role)) return;
    const template = DEFAULT_PERMS[role];
    if (!template) return;
    setPermUsers(prev => prev.map(u => u.id === userId ? { ...u, permissions: { ...template } } : u));
    savePerm(userId, { ...template });
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }} onClick={onClose}>
      <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderTop: `4px solid ${C.blue}`, borderRadius: 8, padding: 0, width: 960, maxWidth: "95vw", maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "20px 24px 12px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>User Permissions</div>
            <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, color: C.muted, cursor: "pointer" }}>✕</button>
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
            Select a role to apply standard permissions, or customize individual checkboxes. Owner permissions cannot be modified.
          </div>
        </div>
        <div style={{ overflowX: "auto", overflowY: "auto", flex: 1, padding: "0 0 16px" }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: C.muted }}>Loading...</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ position: "sticky", top: 0, background: C.cardBg, padding: "10px 12px", textAlign: "left", borderBottom: `2px solid ${C.border}`, fontWeight: 800, color: C.text, minWidth: 140, zIndex: 2 }}>User</th>
                  <th style={{ position: "sticky", top: 0, background: C.cardBg, padding: "10px 6px", borderBottom: `2px solid ${C.border}`, fontWeight: 700, color: C.muted, minWidth: 100, zIndex: 2 }}>Role Template</th>
                  {PERMISSION_CATEGORIES.map(p => (
                    <th key={p.key} style={{ position: "sticky", top: 0, background: C.cardBg, padding: "10px 4px", textAlign: "center", borderBottom: `2px solid ${C.border}`, fontWeight: 600, color: C.muted, minWidth: 55, fontSize: 10, lineHeight: 1.3, zIndex: 2 }}>
                      {p.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {permUsers.filter(u => u.is_active).map(u => {
                  const isOwner = u.role === "owner";
                  const canModify = canModifyUser(currentUser?.role, u.role);
                  const effectiveRole = detectEffectiveRole(u.permissions);
                  const isCustom = effectiveRole === "custom";
                  return (
                    <tr key={u.id} style={{ borderBottom: `1px solid ${C.border}`, background: isOwner ? "#f0f3f8" : "transparent" }}>
                      <td style={{ padding: "8px 12px", fontWeight: 700, color: C.text }}>
                        {u.name}
                        {saving[u.id] && <span style={{ fontSize: 9, color: C.blue, marginLeft: 6 }}>saving...</span>}
                      </td>
                      <td style={{ padding: "8px 6px" }}>
                        {canModify ? (
                          <select
                            value={isCustom ? "custom" : effectiveRole}
                            onChange={e => { if (e.target.value !== "custom") applyRoleTemplate(u.id, e.target.value); }}
                            style={{ border: `1px solid ${isCustom ? "#8a6500" : C.border}`, borderRadius: 4, padding: "3px 6px", fontSize: 10, fontWeight: 700, color: isCustom ? "#8a6500" : C.text, background: isCustom ? "#fdf5d8" : C.cardBg, letterSpacing: "0.04em", textTransform: "uppercase" }}
                          >
                            {ROLE_OPTIONS.filter(r => r.value !== "owner").map(r => (
                              <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                            {isCustom && <option value="custom">Custom</option>}
                          </select>
                        ) : (
                          <span style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                            {isCustom ? "CUSTOM" : effectiveRole}
                          </span>
                        )}
                      </td>
                      {PERMISSION_CATEGORIES.map(p => {
                        const checked = u.permissions?.[p.key] ?? false;
                        const disabled = !canModify;
                        return (
                          <td key={p.key} style={{ padding: "8px 4px", textAlign: "center" }}>
                            <input type="checkbox" checked={checked} disabled={disabled}
                              onChange={() => togglePerm(u.id, p.key)}
                              style={{ width: 16, height: 16, cursor: disabled ? "not-allowed" : "pointer", accentColor: C.blue }} />
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
      </div>
    </div>
  );
}


export default PermissionsModal;
