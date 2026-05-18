import { useState } from "react";
import { C, API_URL } from "./config.js";
import { Btn, ModalWrap, inputStyle, labelStyle } from "./SharedUI.jsx";

// ─── PeopleChangePasswordModal (v28.146 — ship 1 of the PeoplePage split) ──
// Self-service password change, fired from the current user's own roster
// row (CHANGE PW). PeoplePage owns only the open flag (showChangePw); the
// form fields + validation + the POST are modal-local and live here.
//
// onDone() fires on success: the parent closes the modal and shows the
// page-level toast. onClose is the cancel / X path.

function PeopleChangePasswordModal({ userId, onClose, onDone }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");

  const handleChange = async () => {
    if (!current) {
      setMsg("Enter your current password");
      return;
    }
    if (!next || next.length < 6) {
      setMsg("New password must be at least 6 characters");
      return;
    }
    if (next !== confirm) {
      setMsg("Passwords don't match");
      return;
    }
    try {
      const r = await fetch(`${API_URL}/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, current_password: current, new_password: next }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMsg(d?.error || "Failed");
        return;
      }
      onDone();
    } catch {
      setMsg("Connection error");
    }
  };

  return (
    <ModalWrap title="Change Your Password" onClose={onClose} width={380}>
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>CURRENT PASSWORD</label>
        <input type="password" autoComplete="current-password" style={inputStyle} value={current} onChange={(e) => setCurrent(e.target.value)} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>NEW PASSWORD</label>
        <input
          type="password"
          autoComplete="new-password"
          style={inputStyle}
          value={next}
          onChange={(e) => setNext(e.target.value)}
          placeholder="Min 6 characters"
        />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>CONFIRM NEW PASSWORD</label>
        <input
          type="password"
          autoComplete="new-password"
          style={inputStyle}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleChange();
          }}
        />
      </div>
      {msg && (
        <div style={{ padding: "8px 12px", background: "#fdecea", color: C.red, fontSize: 12, fontWeight: 700, borderRadius: 4, marginBottom: 12 }}>{msg}</div>
      )}
      <div style={{ display: "flex", gap: 10 }}>
        <Btn variant="blue" onClick={handleChange}>
          CHANGE PASSWORD
        </Btn>
        <Btn variant="ghost" onClick={onClose}>
          CANCEL
        </Btn>
      </div>
    </ModalWrap>
  );
}

export default PeopleChangePasswordModal;
