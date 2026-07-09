import { useState, useRef, useEffect } from "react";
import { C } from "./config.js";
import { inputStyle, labelStyle, TINT } from "./SharedUI.jsx";

// ─── TicketSiteManager (v28.81 — category-filtered picker) ──────────────────
// Was: extracted from TicketDetail.jsx in v27.76, with an anonymous "Copy
// POC Info" shortcut and a `role_tag`-filtered dropdown. v28.81 brings it
// in line with AddTicketSiteManager (v28.80) for the new customer_contacts
// schema:
//
//   - Filter: category IN ['poc', 'site_rep'] plus legacy role_tag
//     fallbacks ('site_manager', 'company_man'). The legacy fallbacks
//     become dead paths after v28.81b drops the legacy columns; they're
//     kept here as a one-version safety net.
//   - Option labels show name + title + phone + category badge so the
//     user sees WHO they're picking, not a blind id.
//   - "✓ Existing contact selected" badge when picked; clears on any
//     manual field edit. Implemented via a wrapped onChange that
//     distinguishes pick-flow updates from input-flow updates.
//   - Copy POC button dropped — redundant with the dropdown, and the
//     dropdown is more honest about whose data is being copied. Pickup
//     of the customer's POC now happens through the saved-contact list
//     (v28.79 saves the NewJobModal POC to customer_contacts at job
//     creation, so it's always present in the dropdown).
//
// Stays a controlled component — parent owns first/last/phone/email
// state (so it can roll into the ticket save payload). knownContacts
// continues to come from useTicketState's existing fetch (NOT
// re-fetched here) to avoid duplicate network calls inside a live
// ticket edit.
//
// Props:
//   editable — boolean. When false, renders values as plain text.
//   values — { first, last, phone, email }
//   onChange(partial) — called with any subset of keys that changed
//   job — parent WO (unused after Copy POC removal, kept in signature for
//         caller compatibility and possible future need)
//   knownContacts — list of saved customer contacts (for dropdown)

const SM_CATEGORIES = ["poc", "site_rep", "site_manager", "company_man"];
const isSmCategory = (cat) => SM_CATEGORIES.includes(cat);

function TicketSiteManager({ editable, values, onChange, job: _job, knownContacts = [] }) {
  const { first = "", last = "", phone = "", email = "" } = values || {};
  const [pickedContactId, setPickedContactId] = useState("");
  // Use a ref to distinguish onChange calls we trigger from a pick (don't
  // clear the badge) vs onChange calls from a manual field edit (clear it).
  const pickInFlightRef = useRef(false);

  const pickerOptions = knownContacts.filter((c) => {
    if (c.is_active === false) return false;
    const cat = c.category || c.role_tag;
    return isSmCategory(cat);
  });

  // Clear the picked-id badge whenever the parent-owned values drift away
  // from the picked contact. The parent might mutate these via auto-save,
  // sibling fields, etc — treat any change we didn't trigger as "no longer
  // pristine from the contact."
  useEffect(() => {
    if (pickInFlightRef.current) {
      pickInFlightRef.current = false;
      return;
    }
    if (pickedContactId) setPickedContactId("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [first, last, phone, email]);

  const pickedContact = pickedContactId ? pickerOptions.find((o) => String(o.id) === pickedContactId) : null;

  const pickFromDropdown = (contactId) => {
    if (!contactId) return;
    const c = pickerOptions.find((o) => String(o.id) === contactId);
    if (!c) return;
    const parts = (c.name || "").split(" ");
    pickInFlightRef.current = true;
    onChange({
      first: parts[0] || "",
      last: parts.slice(1).join(" ") || "",
      phone: c.phone_work || c.phone || "",
      email: c.email || "",
    });
    setPickedContactId(contactId);
  };

  return (
    <div style={{ background: C.cardBg, borderBottom: `1px solid ${C.border}`, padding: "12px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, letterSpacing: "0.08em" }}>SITE MANAGER</div>
        {pickedContact && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11,
              color: C.green,
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: 3,
              background: TINT.greenBg,
              border: `1px solid ${C.green}44`,
            }}
          >
            ✓ Existing contact selected
          </span>
        )}
      </div>

      {editable && pickerOptions.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <label style={labelStyle}>EXISTING SITE MANAGER FOR THIS CUSTOMER</label>
          <select style={{ ...inputStyle, maxWidth: 420 }} value={pickedContactId} onChange={(e) => pickFromDropdown(e.target.value)}>
            <option value="">— Choose existing contact or type manually below —</option>
            {pickerOptions.map((c) => {
              const cat = c.category || c.role_tag;
              const titlePart = c.title ? ` · ${c.title === "Other" && c.title_other ? c.title_other : c.title}` : "";
              const phoneDisplay = c.phone_work || c.phone;
              const phonePart = phoneDisplay ? ` · ${phoneDisplay}` : "";
              const categoryPart = cat === "poc" ? " (POC)" : "";
              const legacyTag = ["site_manager", "company_man"].includes(cat) ? " (legacy)" : "";
              return (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {titlePart}
                  {phonePart}
                  {categoryPart}
                  {legacyTag}
                </option>
              );
            })}
          </select>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
        <Field label="FIRST NAME" value={first} editable={editable} onChange={(v) => onChange({ first: v })} placeholder="First" />
        <Field label="LAST NAME" value={last} editable={editable} onChange={(v) => onChange({ last: v })} placeholder="Last" />
        <Field label="PHONE" value={phone} editable={editable} onChange={(v) => onChange({ phone: v })} placeholder="555-555-5555" />
        <Field label="EMAIL" value={email} editable={editable} onChange={(v) => onChange({ email: v })} placeholder="email@company.com" />
      </div>
    </div>
  );
}

function Field({ label, value, editable, onChange, placeholder }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {editable ? (
        <input style={inputStyle} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      ) : (
        <div style={{ fontSize: 12, color: C.text, fontWeight: 600, padding: "3px 0" }}>{value || "—"}</div>
      )}
    </div>
  );
}

export default TicketSiteManager;
