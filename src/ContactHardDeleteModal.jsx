import { useState } from "react";
import { C } from "./config.js";
import { Btn, ModalWrap, Z_INDEX, inputStyle, labelStyle } from "./SharedUI.jsx";

// ─── ContactHardDeleteModal (v28.152 — ship 3 of the ContactsPage split) ──
// The owner-only permanent-delete confirm. The required reason is
// modal-local; ContactsPage owns the target (a merged contact row) and
// runs the hard-delete in onConfirm(reason). The PERMANENTLY DELETE
// button stays disabled until a reason is entered.

function ContactHardDeleteModal({ contact, onConfirm, onClose }) {
  // v28.287 (theme arc) — renders through the one shell.
  const [reason, setReason] = useState("");

  return (
    <ModalWrap variant="dialog" z={Z_INDEX.overlay} width={480} accent={C.red} onClose={onClose}>
      <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 10 }}>Permanently delete {contact.name}?</div>
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 14, lineHeight: 1.6 }}>
        This is irreversible. The contact row is removed from the database. The audit log retains the deletion record forever — including the reason below. Use
        "Mark inactive" if you might need to restore later.
      </div>
      <div style={{ marginBottom: 18 }}>
        <label style={labelStyle}>REASON (required)</label>
        <textarea
          style={{ ...inputStyle, minHeight: 60, resize: "vertical" }}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Why is this contact being permanently deleted?"
          autoFocus
        />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          className="fti-btn"
          onClick={() => onConfirm(reason)}
          disabled={!reason.trim()}
          style={{
            background: reason.trim() ? C.red : C.steel,
            color: reason.trim() ? C.white : C.muted,
            border: "none",
            borderRadius: 4,
            padding: "8px 16px",
            fontSize: 12,
            fontWeight: 800,
            cursor: reason.trim() ? "pointer" : "not-allowed",
            letterSpacing: "0.06em",
          }}
        >
          PERMANENTLY DELETE
        </button>
        <Btn variant="ghost" onClick={onClose}>
          CANCEL
        </Btn>
      </div>
    </ModalWrap>
  );
}

export default ContactHardDeleteModal;
