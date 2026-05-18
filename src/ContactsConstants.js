// ─── ContactsConstants (v28.150 — ship 1 of the ContactsPage split) ───────
// The contact category / title vocabulary + the role-tag display labels,
// shared by ContactsPage and the child components split out of it (the
// edit modal, the merge modal, the table). Pulled into their own module
// so those children import the vocabulary directly instead of from the
// page. Verbatim from the v28.78 ContactsPage rebuild — no value changes.

// Category enum drives the dropdown and the picker filters. Site Manager,
// Company Man, DSM, etc. all map to "site_rep" per v28.72 canonical
// (operator-specific terminology lives in the title / title_other fields,
// not in the category field).
export const CATEGORY_OPTIONS = [
  { value: "poc", label: "Point of Contact" },
  { value: "site_rep", label: "Site Rep (Site Mgr / Co Man / DSM)" },
  { value: "approver", label: "Approver" },
  { value: "other", label: "Other" },
];

// Title enum — the controlled vocabulary that drives display + metrics.
// Operator-specific terms (Night DSM, Co Man, Customer Liaison) go in
// title_other when title = "Other".
export const TITLE_OPTIONS = ["Site Manager", "Field Superintendent", "Superintendent", "Operations Manager", "Engineer", "Other"];

// Display labels for both canonical and legacy role_tag values. Old rows
// pre-v28.72 may still carry site_manager / company_man until they get
// edited once (which canonicalizes them).
export const ROLE_LABELS = {
  poc: "POC",
  site_rep: "SITE REP",
  site_manager: "SITE MGR (LEGACY)",
  company_man: "CO MAN (LEGACY)",
  approver: "APPROVER",
  other: "OTHER",
};

export function categoryLabel(c) {
  return ROLE_LABELS[c?.category || c?.role_tag] || c?.category || c?.role_tag || "—";
}
