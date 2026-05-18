import { useState } from "react";
import { API_URL } from "./config.js";
import { Btn, ModalWrap, inputStyle, labelStyle } from "./SharedUI.jsx";
import { CATEGORY_OPTIONS, TITLE_OPTIONS } from "./ContactsConstants.js";

// ─── ContactEditModal (v28.151 — ship 2 of the ContactsPage split) ────────
// The EDIT CONTACT form modal. ContactsPage owns only the open target
// (editContact — one underlying contact record); the form fields, the
// legacy-category canonicalization on entry, and the PUT all live here —
// they're modal-local.
//
// onSaved fires after a successful PUT (the parent refetches, closes, and
// toasts). onError routes a failed PUT to the parent's page-level toast,
// matching the pre-split behavior — the modal stays open on failure.
//
// The form writes only canonical category values; legacy site_manager /
// company_man rows are mapped to site_rep when the modal opens so the
// dropdown shows a valid option.

function ContactEditModal({ contact, onClose, onSaved, onError }) {
  const parts = (contact.name || "").split(" ");
  const rawCat = contact.category || contact.role_tag || "poc";
  const initialCategory = ["site_manager", "company_man"].includes(rawCat) ? "site_rep" : rawCat;

  const [first, setFirst] = useState(parts[0] || "");
  const [last, setLast] = useState(parts.slice(1).join(" ") || "");
  const [phoneWork, setPhoneWork] = useState(contact.phone_work || contact.phone || "");
  const [phonePersonal, setPhonePersonal] = useState(contact.phone_personal || "");
  const [email, setEmail] = useState(contact.email || "");
  const [category, setCategory] = useState(initialCategory);
  const [title, setTitle] = useState(contact.title || "");
  const [titleOther, setTitleOther] = useState(contact.title_other || "");
  const [notes, setNotes] = useState(contact.notes || "");

  const handleSave = async () => {
    if (!first.trim()) return;
    const fullName = [first.trim(), last.trim()].filter(Boolean).join(" ");
    try {
      const r = await fetch(`${API_URL}/customers/contacts/${contact.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fullName,
          phone_work: phoneWork || null,
          phone_personal: phonePersonal || null,
          email: email || null,
          category,
          title: title || null,
          title_other: title === "Other" ? titleOther || null : null,
          notes: notes || null,
        }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        onError(`Update failed: ${j.error || r.statusText}`);
        return;
      }
      onSaved();
    } catch (err) {
      onError(`Update failed: ${err.message}`);
    }
  };

  return (
    <ModalWrap title="EDIT CONTACT" onClose={onClose} width={480}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <div>
          <label style={labelStyle}>FIRST NAME</label>
          <input style={inputStyle} value={first} onChange={(e) => setFirst(e.target.value)} autoFocus />
        </div>
        <div>
          <label style={labelStyle}>LAST NAME</label>
          <input style={inputStyle} value={last} onChange={(e) => setLast(e.target.value)} />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <div>
          <label style={labelStyle}>WORK PHONE</label>
          <input style={inputStyle} value={phoneWork} onChange={(e) => setPhoneWork(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>PERSONAL PHONE</label>
          <input style={inputStyle} value={phonePersonal} onChange={(e) => setPhonePersonal(e.target.value)} />
        </div>
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={labelStyle}>EMAIL</label>
        <input style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <div>
          <label style={labelStyle}>CATEGORY</label>
          <select style={inputStyle} value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>TITLE</label>
          <select style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)}>
            <option value="">— None —</option>
            {TITLE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>
      {title === "Other" && (
        <div style={{ marginBottom: 10 }}>
          <label style={labelStyle}>TITLE (SPECIFY)</label>
          <input style={inputStyle} value={titleOther} onChange={(e) => setTitleOther(e.target.value)} placeholder="e.g., Night DSM, Customer Liaison" />
        </div>
      )}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>NOTES</label>
        <textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Btn onClick={handleSave}>SAVE</Btn>
        <Btn variant="ghost" onClick={onClose}>
          CANCEL
        </Btn>
      </div>
    </ModalWrap>
  );
}

export default ContactEditModal;
