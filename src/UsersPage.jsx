import { useState, useEffect } from "react";
import { C, API_URL } from "./config.js";
import { ROLE_OPTIONS, canModifyUser } from "./utils.js";
import { Btn, ModalWrap, inputStyle, labelStyle } from "./SharedUI.jsx";

function UsersPage({ users, setUsers, currentUser, isAdmin }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("field");
  const [msg, setMsg] = useState("");
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState("");
  const [resetPwUser, setResetPwUser] = useState(null);
  const [resetPwVal, setResetPwVal] = useState("");
  const [resetPwConfirm, setResetPwConfirm] = useState("");
  const [resetPwMsg, setResetPwMsg] = useState("");
  const [showChangePw, setShowChangePw] = useState(false);
  const [changePwCurrent, setChangePwCurrent] = useState("");
  const [changePwNew, setChangePwNew] = useState("");
  const [changePwConfirm, setChangePwConfirm] = useState("");
  const [changePwMsg, setChangePwMsg] = useState("");
  const [usrW, setUsrW] = useState(window.innerWidth);
  useEffect(() => { const h = () => setUsrW(window.innerWidth); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, []);
  const usrMob = usrW < 900;

  const roleBg = r => r === "owner" ? "#fdecea" : r === "admin" ? "#e8f0fb" : r === "manager" ? "#e6f5ec" : r === "lead" ? "#fdf5d8" : r === "salesman" ? "#f3eafa" : "#f0f3f8";
  const roleColor = r => r === "owner" ? C.red : r === "admin" ? C.blue : r === "manager" ? C.green : r === "lead" ? "#8a6500" : r === "salesman" ? "#7a3ca0" : C.muted;
  const isOwner = currentUser?.role === "owner";

  // Create user + send invite (no password required)
  const handleAddUser = async () => {
    if (!newName.trim() || !newEmail.trim()) { setMsg("Name and email required"); return; }
    try {
      const r = await fetch(`${API_URL}/users`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), email: newEmail.trim().toLowerCase(), role: newRole }),
      });
      if (!r.ok) {
        const errData = await r.json().catch(() => null);
        const errMsg = errData?.error || "Failed to create user";
        if (errMsg.toLowerCase().includes("email") || errMsg.toLowerCase().includes("duplicate") || errMsg.toLowerCase().includes("unique")) {
          setMsg("A user with this email address already exists.");
        } else {
          setMsg(errMsg);
        }
        return;
      }
      const created = await r.json();
      // Send invite email
      await fetch(`${API_URL}/auth/invite`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: created.id }),
      });
      setUsers(prev => [...prev, { ...created, is_active: true }]);
      setNewName(""); setNewEmail(""); setNewRole("field"); setShowAdd(false);
      setMsg("User created — invite email sent.");
      setTimeout(() => setMsg(""), 5000);
    } catch { setMsg("Error creating user"); }
  };

  const handleResendInvite = async (userId) => {
    try {
      await fetch(`${API_URL}/auth/invite`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      setMsg("Invite re-sent.");
      setTimeout(() => setMsg(""), 3000);
    } catch { setMsg("Failed to resend invite"); }
  };

  const startEdit = (u) => {
    setEditId(u.id); setEditName(u.name); setEditEmail(u.email); setEditRole(u.role);
    setShowAdd(false);
  };

  const handleSaveEdit = async () => {
    if (!editName.trim() || !editEmail.trim()) { setMsg("Name and email required"); return; }
    try {
      const r = await fetch(`${API_URL}/users/${editId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), email: editEmail.trim().toLowerCase(), role: editRole }),
      });
      if (!r.ok) { setMsg("Failed to save"); return; }
      setUsers(prev => prev.map(u => u.id === editId ? { ...u, name: editName.trim(), email: editEmail.trim().toLowerCase(), role: editRole } : u));
      setEditId(null); setMsg("Saved.");
      setTimeout(() => setMsg(""), 3000);
    } catch { setMsg("Error saving user"); }
  };

  const handleDeactivate = async (userId) => {
    const user = users.find(u => u.id === userId);
    if (!canModifyUser(currentUser?.role, user?.role)) return;
    try {
      await fetch(`${API_URL}/users/${userId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: false }),
      });
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch { console.error("Deactivate failed"); }
  };

  // Owner-level password reset modal
  const handleAdminResetPassword = async () => {
    if (!resetPwVal || resetPwVal.length < 6) { setResetPwMsg("Password must be at least 6 characters"); return; }
    if (resetPwVal !== resetPwConfirm) { setResetPwMsg("Passwords don't match"); return; }
    try {
      const r = await fetch(`${API_URL}/auth/admin-reset-password`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: resetPwUser.id, password: resetPwVal, requester_role: currentUser.role }),
      });
      if (!r.ok) { const d = await r.json().catch(() => null); setResetPwMsg(d?.error || "Failed"); return; }
      setResetPwUser(null); setResetPwVal(""); setResetPwConfirm(""); setResetPwMsg("");
      setMsg(`Password reset for ${resetPwUser.name}.`);
      setTimeout(() => setMsg(""), 3000);
    } catch { setResetPwMsg("Error resetting password"); }
  };

  const handleChangePw = async () => {
    if (!changePwCurrent) { setChangePwMsg("Enter your current password"); return; }
    if (!changePwNew || changePwNew.length < 6) { setChangePwMsg("New password must be at least 6 characters"); return; }
    if (changePwNew !== changePwConfirm) { setChangePwMsg("Passwords don't match"); return; }
    try {
      const r = await fetch(`${API_URL}/auth/change-password`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: currentUser.id, current_password: changePwCurrent, new_password: changePwNew }),
      });
      const d = await r.json();
      if (!r.ok) { setChangePwMsg(d?.error || "Failed"); return; }
      setShowChangePw(false); setChangePwCurrent(""); setChangePwNew(""); setChangePwConfirm(""); setChangePwMsg("");
      setMsg("Password changed.");
      setTimeout(() => setMsg(""), 3000);
    } catch { setChangePwMsg("Error changing password"); }
  };

  const actionBtnStyle = { background: "transparent", border: `1px solid ${C.border}`, color: C.muted, fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 3, cursor: "pointer" };
  const actionBtnStyleMob = { ...actionBtnStyle, fontSize: 11, padding: "5px 12px", borderRadius: 4 };

  return (
    <div style={{ padding: usrMob ? "16px 12px" : "24px 28px" }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>User Management</h1>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{users.length} active user{users.length !== 1 ? "s" : ""}</div>
        </div>
        <Btn onClick={() => { setShowAdd(s => !s); setEditId(null); }}>{showAdd ? "CANCEL" : "+ ADD USER"}</Btn>
      </div>

      {msg && <div style={{ padding: "8px 14px", background: msg.includes("fail") || msg.includes("Error") || msg.includes("required") || msg.includes("exists") ? "#fdecea" : "#e6f5ec", borderRadius: 4, fontSize: 12, fontWeight: 700, color: msg.includes("fail") || msg.includes("Error") || msg.includes("required") || msg.includes("exists") ? C.red : C.green, marginBottom: 16 }}>{msg}</div>}

      {showAdd && (
        <div style={{ background: C.steel, border: `1px solid ${C.border}`, borderRadius: 6, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 10 }}>An invite email will be sent — the user sets their own password.</div>
          <div style={{ display: "grid", gridTemplateColumns: usrMob ? "1fr" : "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
            <div><label style={labelStyle}>NAME *</label><input style={inputStyle} value={newName} onChange={e => setNewName(e.target.value)} placeholder="Full name" /></div>
            <div><label style={labelStyle}>EMAIL *</label><input style={inputStyle} value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="email@flotest.com" /></div>
            <div><label style={labelStyle}>ROLE</label>
              <select style={inputStyle} value={newRole} onChange={e => setNewRole(e.target.value)}>
                {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>
          <Btn onClick={handleAddUser}>CREATE &amp; SEND INVITE</Btn>
        </div>
      )}

      {/* ── DESKTOP: grid table ── */}
      {!usrMob && (
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 120px 220px", background: C.darkBlue, padding: "10px 16px" }}>
            {["NAME", "EMAIL", "ROLE", "ACTIONS"].map(h => (
              <div key={h} style={{ fontSize: 10, fontWeight: 800, color: C.white, letterSpacing: "0.1em" }}>{h}</div>
            ))}
          </div>
          {users.map((u, i) => {
            const canModify = canModifyUser(currentUser?.role, u.role);
            const isSelf = currentUser?.id === u.id;
            const isEditing = editId === u.id;
            return (
              <div key={u.id} style={{ borderBottom: `1px solid ${C.border}22`, background: i % 2 === 0 ? C.cardBg : C.steel }}>
                {isEditing ? (
                  <div style={{ padding: "12px 16px", display: "grid", gridTemplateColumns: "1fr 1fr 120px 220px", gap: 8, alignItems: "center" }}>
                    <input style={{ ...inputStyle, fontSize: 12, padding: "4px 8px" }} value={editName} onChange={e => setEditName(e.target.value)} />
                    <input style={{ ...inputStyle, fontSize: 12, padding: "4px 8px" }} value={editEmail} onChange={e => setEditEmail(e.target.value)} />
                    <select style={{ ...inputStyle, fontSize: 12, padding: "4px 8px" }} value={editRole} onChange={e => setEditRole(e.target.value)} disabled={!canModify}>
                      {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={handleSaveEdit} style={{ background: C.green, border: "none", color: C.white, fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 3, cursor: "pointer" }}>SAVE</button>
                      <button onClick={() => setEditId(null)} style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.muted, fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 3, cursor: "pointer" }}>CANCEL</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 120px 220px", padding: "10px 16px", alignItems: "center" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{u.name}</div>
                    <div style={{ fontSize: 12, color: C.muted }}>{u.email}</div>
                    <div><span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 3, background: roleBg(u.role), color: roleColor(u.role), letterSpacing: "0.06em" }}>{ROLE_OPTIONS.find(r => r.value === u.role)?.label || u.role}</span></div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {(canModify || isSelf) && <button onClick={() => startEdit(u)} style={{ ...actionBtnStyle, border: `1px solid ${C.blue}44`, color: C.blue }}>EDIT</button>}
                      {canModify && !isSelf && <button onClick={() => handleDeactivate(u.id)} style={{ ...actionBtnStyle, border: `1px solid ${C.red}33`, color: C.red }}>REMOVE</button>}
                      {canModify && !isSelf && <button onClick={() => { setResetPwUser(u); setResetPwVal(""); setResetPwConfirm(""); setResetPwMsg(""); }} style={actionBtnStyle}>RESET PW</button>}
                      {isSelf && <button onClick={() => { setShowChangePw(true); setChangePwCurrent(""); setChangePwNew(""); setChangePwConfirm(""); setChangePwMsg(""); }} style={actionBtnStyle}>CHANGE PW</button>}
                      {canModify && !isSelf && <button onClick={() => handleResendInvite(u.id)} style={actionBtnStyle}>RESEND INVITE</button>}
                      {!canModify && !isSelf && <span style={{ fontSize: 10, color: C.muted, fontStyle: "italic" }}>Protected</span>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── MOBILE: card layout ── */}
      {usrMob && users.map((u, i) => {
        const canModify = canModifyUser(currentUser?.role, u.role);
        const isSelf = currentUser?.id === u.id;
        const isEditing = editId === u.id;
        return (
          <div key={u.id} style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 6, padding: 14, marginBottom: 10 }}>
            {isEditing ? (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8, marginBottom: 10 }}>
                  <div><label style={labelStyle}>NAME</label><input style={{ ...inputStyle, fontSize: 12, padding: "6px 8px" }} value={editName} onChange={e => setEditName(e.target.value)} /></div>
                  <div><label style={labelStyle}>EMAIL</label><input style={{ ...inputStyle, fontSize: 12, padding: "6px 8px" }} value={editEmail} onChange={e => setEditEmail(e.target.value)} /></div>
                  <div><label style={labelStyle}>ROLE</label>
                    <select style={{ ...inputStyle, fontSize: 12, padding: "6px 8px" }} value={editRole} onChange={e => setEditRole(e.target.value)} disabled={!canModify}>
                      {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={handleSaveEdit} style={{ background: C.green, border: "none", color: C.white, fontSize: 11, fontWeight: 700, padding: "7px 14px", borderRadius: 4, cursor: "pointer", flex: 1 }}>SAVE</button>
                  <button onClick={() => setEditId(null)} style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.muted, fontSize: 11, fontWeight: 700, padding: "7px 14px", borderRadius: 4, cursor: "pointer", flex: 1 }}>CANCEL</button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{u.name}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 3, background: roleBg(u.role), color: roleColor(u.role), letterSpacing: "0.06em" }}>{ROLE_OPTIONS.find(r => r.value === u.role)?.label || u.role}</span>
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>{u.email}</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {(canModify || isSelf) && <button onClick={() => startEdit(u)} style={{ ...actionBtnStyleMob, border: `1px solid ${C.blue}44`, color: C.blue }}>EDIT</button>}
                  {canModify && !isSelf && <button onClick={() => handleDeactivate(u.id)} style={{ ...actionBtnStyleMob, border: `1px solid ${C.red}33`, color: C.red }}>REMOVE</button>}
                  {canModify && !isSelf && <button onClick={() => { setResetPwUser(u); setResetPwVal(""); setResetPwConfirm(""); setResetPwMsg(""); }} style={actionBtnStyleMob}>RESET PW</button>}
                  {isSelf && <button onClick={() => { setShowChangePw(true); setChangePwCurrent(""); setChangePwNew(""); setChangePwConfirm(""); setChangePwMsg(""); }} style={actionBtnStyleMob}>CHANGE PW</button>}
                  {canModify && !isSelf && <button onClick={() => handleResendInvite(u.id)} style={actionBtnStyleMob}>RESEND INVITE</button>}
                  {!canModify && !isSelf && <span style={{ fontSize: 11, color: C.muted, fontStyle: "italic" }}>Protected</span>}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* ── RESET PASSWORD MODAL (owner/admin for others) ── */}
      {resetPwUser && (
        <ModalWrap title={`Reset Password — ${resetPwUser.name}`} onClose={() => setResetPwUser(null)} width={380}>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>NEW PASSWORD</label>
            <input style={inputStyle} type="password" value={resetPwVal} onChange={e => setResetPwVal(e.target.value)} placeholder="Min 6 characters" />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>CONFIRM PASSWORD</label>
            <input style={inputStyle} type="password" value={resetPwConfirm} onChange={e => setResetPwConfirm(e.target.value)} placeholder="Re-enter password"
              onKeyDown={e => e.key === "Enter" && handleAdminResetPassword()} />
          </div>
          {resetPwMsg && <div style={{ color: C.red, fontSize: 12, fontWeight: 700, marginBottom: 12 }}>{resetPwMsg}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={handleAdminResetPassword}>SET PASSWORD</Btn>
            <Btn onClick={() => setResetPwUser(null)} variant="ghost">CANCEL</Btn>
          </div>
        </ModalWrap>
      )}

      {/* ── CHANGE OWN PASSWORD MODAL ── */}
      {showChangePw && (
        <ModalWrap title="Change Your Password" onClose={() => setShowChangePw(false)} width={380}>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>CURRENT PASSWORD</label>
            <input style={inputStyle} type="password" value={changePwCurrent} onChange={e => setChangePwCurrent(e.target.value)} placeholder="Enter current password" />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>NEW PASSWORD</label>
            <input style={inputStyle} type="password" value={changePwNew} onChange={e => setChangePwNew(e.target.value)} placeholder="Min 6 characters" />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>CONFIRM NEW PASSWORD</label>
            <input style={inputStyle} type="password" value={changePwConfirm} onChange={e => setChangePwConfirm(e.target.value)} placeholder="Re-enter new password"
              onKeyDown={e => e.key === "Enter" && handleChangePw()} />
          </div>
          {changePwMsg && <div style={{ color: C.red, fontSize: 12, fontWeight: 700, marginBottom: 12 }}>{changePwMsg}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={handleChangePw}>CHANGE PASSWORD</Btn>
            <Btn onClick={() => setShowChangePw(false)} variant="ghost">CANCEL</Btn>
          </div>
        </ModalWrap>
      )}
    </div>
  );
}

export default UsersPage;
