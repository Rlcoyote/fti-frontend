import { useState } from "react";
import { C } from "./config.js";
import { Btn, inputStyle, labelStyle } from "./SharedUI.jsx";
import { categoryLabel } from "./ContactsConstants.js";

// ─── ContactMergeModal (v28.152 — ship 3 of the ContactsPage split) ───────
// The admin/owner merge confirm, shown when exactly two same-customer
// contacts are selected. The keeper choice + optional reason are
// modal-local; the keeper defaults to the first of the pair. ContactsPage
// owns the pair and runs the merge in onConfirm(keeperId, reason).

function ContactMergeModal({ pair, onConfirm, onClose }) {
  const [keeperId, setKeeperId] = useState(pair.a.id);
  const [reason, setReason] = useState("");

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}
      onClick={onClose}
    >
      <div
        style={{
          background: C.cardBg,
          border: `1px solid ${C.border}`,
          borderTop: `4px solid ${C.blue}`,
          borderRadius: 8,
          padding: 28,
          width: 540,
          maxWidth: "90vw",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 10 }}>Merge contacts</div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 16, lineHeight: 1.6 }}>
          Pick which contact is the keeper. Non-empty fields from the other will be carried over where the keeper is empty. The keeper's name and category are
          preserved. The non-keeper is marked inactive.
        </div>
        {[pair.a, pair.b].map((c) => (
          <label
            key={c.id}
            style={{
              display: "block",
              border: `2px solid ${keeperId === c.id ? C.blue : C.border}`,
              borderRadius: 6,
              padding: 12,
              marginBottom: 10,
              cursor: "pointer",
              background: keeperId === c.id ? "#e8f0fb" : C.cardBg,
            }}
          >
            <input type="radio" name="keeper" checked={keeperId === c.id} onChange={() => setKeeperId(c.id)} style={{ marginRight: 10, accentColor: C.blue }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
              {c.name} <span style={{ fontSize: 11, fontWeight: 500, color: C.muted }}>({categoryLabel(c)})</span>
            </span>
            <div style={{ fontSize: 12, color: C.muted, marginLeft: 24, marginTop: 4 }}>
              {c.phone_work || c.phone || "no phone"} · {c.email || "no email"} · {c.title || "no title"}
            </div>
          </label>
        ))}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>REASON (optional)</label>
          <input style={inputStyle} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g., Duplicate from typo at job setup" />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn onClick={() => onConfirm(keeperId, reason)}>CONFIRM MERGE</Btn>
          <Btn variant="ghost" onClick={onClose}>
            CANCEL
          </Btn>
        </div>
      </div>
    </div>
  );
}

export default ContactMergeModal;
