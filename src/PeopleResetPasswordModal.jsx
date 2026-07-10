import { useState } from "react";
import { C, API_URL } from "./config.js";
import { Btn, ModalWrap, inputStyle, labelStyle } from "./SharedUI.jsx";

// ─── PeopleResetPasswordModal (v28.146 — ship 1 of the PeoplePage split) ───
// Admin → other-user password reset, fired from a roster row's RESET PW
// button. PeoplePage owns only the open flag (resetPwUser); the form fields
// + validation + the POST live here — they're modal-local UI state.
//
// onDone(message) fires on a successful reset: the parent closes the modal
// and shows the page-level toast. onClose is the cancel / X path.

function PeopleResetPasswordModal({ user, requesterRole, onClose, onDone }) {
  const [val, setVal] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");

  const handleReset = async () => {
    if (!val || val.length < 6) {
      setMsg("Password must be at least 6 characters");
      return;
    }
    if (val !== confirm) {
      setMsg("Passwords don't match");
      return;
    }
    try {
      const r = await fetch(`${API_URL}/auth/admin-reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, password: val, requester_role: requesterRole }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => null);
        setMsg(d?.error || "Failed");
        return;
      }
      const targetName = `${user.first_name || user.name || ""} ${user.last_name || ""}`.trim();
      onDone(`Password reset for ${targetName}.`);
    } catch {
      setMsg("Error resetting password");
    }
  };

  return (
    <ModalWrap title={`Reset Password — ${user.first_name} ${user.last_name}`} onClose={onClose} width={380}>
      {/* Hidden username for password manager autofill behavior */}
      <input type="text" name="username" value={user.email} readOnly autoComplete="username" style={{ display: "none" }} />
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>NEW PASSWORD</label>
        <input
          type="password"
          autoComplete="new-password"
          style={inputStyle}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder="Min 6 characters"
        />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>CONFIRM PASSWORD</label>
        <input
          type="password"
          autoComplete="new-password"
          style={inputStyle}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleReset();
          }}
        />
      </div>
      {msg && (
        <div style={{ padding: "8px 12px", background: C.redB, color: C.red, fontSize: 12, fontWeight: 700, borderRadius: 4, marginBottom: 12 }}>{msg}</div>
      )}
      <div style={{ display: "flex", gap: 10 }}>
        <Btn variant="blue" onClick={handleReset}>
          SET PASSWORD
        </Btn>
        <Btn variant="ghost" onClick={onClose}>
          CANCEL
        </Btn>
      </div>
    </ModalWrap>
  );
}

export default PeopleResetPasswordModal;
