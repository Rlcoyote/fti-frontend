// Permission & role matrix — the frontend half of FTI's access model.
//
// v28.241 — split out of utils.js (Article XXIV). This block (ROLE_OPTIONS,
// ROLE_RANK, canModifyUser, PERMISSION_CATEGORIES, DEFAULT_PERMS,
// getRoleTemplates, makeCan) was the bottom ~290 lines of utils.js and is a
// self-contained concern with one job: decide what each role may do.
//
// MUST STAY IN SYNC with fti-backend/src/permissions.js (PERMISSION_KEYS +
// DEFAULT_PERMS). The backend is the enforcer (requirePermission); this file
// drives the UI's can() + the Permissions matrix. A key added here that the
// backend doesn't know about is a UI control with no teeth, and vice versa.
// The self-consistency guard in permissions.test.js catches the common drift
// (a PERMISSION_CATEGORIES key missing from an explicit role template).

// Role hierarchy for user management
export const ROLE_OPTIONS = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "dispatch", label: "Dispatch" },
  { value: "hse", label: "HSE" },
  { value: "lead", label: "Lead" },
  { value: "mechanic", label: "Mechanic" },
  { value: "salesman", label: "Salesman" },
  { value: "field", label: "Field" },
];
export const ROLE_RANK = { owner: 4, admin: 3, manager: 2, dispatch: 2, hse: 2, lead: 1, mechanic: 1, salesman: 1, field: 0 };
export const canModifyUser = (currentUserRole, targetUserRole) => {
  if (!currentUserRole || !targetUserRole) return false;
  // v27.87 — strict rank gate. v27.74's owner-same-rank exception was rolled
  // back: owners CANNOT modify other owner rows from the UI. All owner role
  // transitions (create/promote/demote/deactivate) go through
  // scripts/change-owner-role.js on the server. The backend enforces this
  // too (routes/users.js 403s any owner-role write), but keeping the
  // frontend gate strict means the UI doesn't offer paths that the server
  // is just going to reject. Owners editing their own non-role fields is
  // handled via the separate `isSelf` check in UsersPage.jsx.
  const myRank = ROLE_RANK[currentUserRole] ?? 0;
  const theirRank = ROLE_RANK[targetUserRole] ?? 0;
  return myRank > theirRank;
};

// Permission categories used by the Permissions modal. Grouped for display.
// Previously lived at the bottom of SettingsModal.jsx (pre-split leftover)
// but PermissionsModal.jsx never imported them, crashing its first render.
// Lifted into utils.js as the shared home for role/permission metadata.
export const PERMISSION_CATEGORIES = [
  { key: "view_jobs", label: "View Work Orders", group: "Work Orders & Tickets" },
  { key: "edit_jobs", label: "Create/Edit Work Orders", group: "Work Orders & Tickets" },
  { key: "delete_jobs", label: "Delete Work Orders", group: "Work Orders & Tickets" },
  { key: "edit_tickets", label: "Create/Edit Tickets", group: "Work Orders & Tickets" },
  { key: "sign_tickets", label: "Sign Tickets", group: "Ticket Workflow" },
  { key: "approve_tickets", label: "Approve Tickets", group: "Ticket Workflow" },
  { key: "send_to_qb", label: "Send to Accounting", group: "Ticket Workflow" },
  { key: "void_tickets", label: "Void Tickets", group: "Ticket Workflow" },
  { key: "manage_users", label: "Manage Users", group: "Admin & Settings" },
  { key: "view_inventory", label: "View Inventory", group: "Admin & Settings" },
  { key: "edit_inventory", label: "Edit Inventory", group: "Admin & Settings" },
  { key: "view_reports", label: "View Reports", group: "Admin & Settings" },
  { key: "view_archive", label: "View Archive", group: "Admin & Settings" },
  { key: "view_activity_log", label: "View Activity Log", group: "Admin & Settings" },
  { key: "view_contacts", label: "View Customer Contacts", group: "Admin & Settings" },
  { key: "edit_contacts", label: "Edit Customer Contacts", group: "Admin & Settings" },
  { key: "manage_settings", label: "Manage Settings", group: "Admin & Settings" },
  // v28.177 — GPS Phase 2 additions:
  { key: "view_gps_events", label: "View Live GPS Events", group: "GPS & Fleet" },
  { key: "manage_yards", label: "Manage Yards", group: "GPS & Fleet" },
  // v28.186 — DVIR Phase 2 additions (FMCSA Part 396):
  { key: "perform_inspections", label: "Perform Vehicle Inspections (DVIR)", group: "DVIR & Maintenance" },
  { key: "view_vehicle_defects", label: "View Vehicle Defects + Repair Queue", group: "DVIR & Maintenance" },
  { key: "perform_repairs", label: "Perform + Certify Repairs", group: "DVIR & Maintenance" },
  { key: "red_tag_vehicle", label: "Red-Tag Vehicle (Out-of-Service)", group: "DVIR & Maintenance" },
  { key: "manage_vehicles", label: "Manage Vehicles Master", group: "DVIR & Maintenance" },
  // v28.202 — Labor Time Tracking Phase 1 additions:
  { key: "view_all_hours", label: "View All Employee Hours", group: "Labor & Time" },
  { key: "approve_time_corrections", label: "Approve Time Corrections", group: "Labor & Time" },
];

// Default permissions by role. Used as the fallback when a user's permissions
// column is empty or unset (new user, or migration gap).
export const DEFAULT_PERMS = {
  owner: Object.fromEntries(PERMISSION_CATEGORIES.map((p) => [p.key, true])),
  admin: Object.fromEntries(PERMISSION_CATEGORIES.map((p) => [p.key, true])),
  // v28.186 — DVIR grid ratified 2026-05-21 by Reggie:
  //   owner/admin: all 5 new keys ON.
  //   manager: view_vehicle_defects only.
  //   lead + field: perform_inspections only.
  //   salesman + dispatch: none.
  //   hse: view_vehicle_defects + red_tag_vehicle + manage_vehicles (plus
  //        view_jobs + view_reports + view_activity_log from the existing 17).
  //   mechanic: view_vehicle_defects + perform_repairs + red_tag_vehicle +
  //        manage_vehicles (all 17 existing keys OFF — tight boundary).
  manager: Object.fromEntries(
    PERMISSION_CATEGORIES.map((p) => [
      p.key,
      // Existing exclusions + the new DVIR keys manager does NOT get.
      ![
        "manage_users",
        "view_activity_log",
        "manage_settings",
        "edit_contacts",
        "perform_inspections",
        "perform_repairs",
        "red_tag_vehicle",
        "manage_vehicles",
      ].includes(p.key),
    ]),
  ),
  lead: {
    view_jobs: true,
    edit_jobs: true,
    edit_tickets: true,
    sign_tickets: true,
    view_inventory: true,
    view_reports: true,
    view_archive: false,
    view_activity_log: false,
    delete_jobs: false,
    approve_tickets: false,
    send_to_qb: false,
    void_tickets: false,
    manage_users: false,
    edit_inventory: false,
    view_contacts: false,
    edit_contacts: false,
    manage_settings: false,
    view_gps_events: false,
    manage_yards: false,
    perform_inspections: true,
    view_vehicle_defects: false,
    perform_repairs: false,
    red_tag_vehicle: false,
    manage_vehicles: false,
  },
  salesman: {
    view_jobs: true,
    edit_jobs: false,
    edit_tickets: false,
    sign_tickets: false,
    view_inventory: false,
    view_reports: false,
    view_archive: false,
    view_activity_log: false,
    delete_jobs: false,
    approve_tickets: false,
    send_to_qb: false,
    void_tickets: false,
    manage_users: false,
    edit_inventory: false,
    view_contacts: true,
    edit_contacts: false,
    manage_settings: false,
    view_gps_events: false,
    manage_yards: false,
    perform_inspections: false,
    view_vehicle_defects: false,
    perform_repairs: false,
    red_tag_vehicle: false,
    manage_vehicles: false,
  },
  field: {
    view_jobs: true,
    edit_tickets: true,
    sign_tickets: true,
    view_inventory: false,
    view_reports: false,
    view_archive: false,
    view_activity_log: false,
    edit_jobs: false,
    delete_jobs: false,
    approve_tickets: false,
    send_to_qb: false,
    void_tickets: false,
    manage_users: false,
    edit_inventory: false,
    view_contacts: false,
    edit_contacts: false,
    manage_settings: false,
    view_gps_events: false,
    manage_yards: false,
    perform_inspections: true,
    view_vehicle_defects: false,
    perform_repairs: false,
    red_tag_vehicle: false,
    manage_vehicles: false,
  },
  // hse — added v28.170 (allFalse placeholder); ratified grid in v28.186.
  // Cross-existing: view_jobs + view_reports + view_activity_log ON, other
  // 14 OFF. DVIR-side: view_vehicle_defects + red_tag_vehicle + manage_vehicles.
  hse: {
    view_jobs: true,
    edit_jobs: false,
    edit_tickets: false,
    sign_tickets: false,
    approve_tickets: false,
    send_to_qb: false,
    void_tickets: false,
    delete_jobs: false,
    manage_users: false,
    view_inventory: false,
    edit_inventory: false,
    view_reports: true,
    view_archive: false,
    view_activity_log: true,
    view_contacts: false,
    edit_contacts: false,
    manage_settings: false,
    view_gps_events: false,
    manage_yards: false,
    perform_inspections: false,
    view_vehicle_defects: true,
    perform_repairs: false,
    red_tag_vehicle: true,
    manage_vehicles: true,
  },
  // mechanic — added v28.170 (allFalse placeholder); ratified grid in v28.186.
  // Tight boundary: every one of the 17 existing keys OFF. Only DVIR-side:
  // view_vehicle_defects + perform_repairs + red_tag_vehicle + manage_vehicles.
  mechanic: {
    view_jobs: false,
    edit_jobs: false,
    edit_tickets: false,
    sign_tickets: false,
    approve_tickets: false,
    send_to_qb: false,
    void_tickets: false,
    delete_jobs: false,
    manage_users: false,
    view_inventory: false,
    edit_inventory: false,
    view_reports: false,
    view_archive: false,
    view_activity_log: false,
    view_contacts: false,
    edit_contacts: false,
    manage_settings: false,
    view_gps_events: false,
    manage_yards: false,
    perform_inspections: false,
    view_vehicle_defects: true,
    perform_repairs: true,
    red_tag_vehicle: true,
    manage_vehicles: true,
  },
  // dispatch — added v28.177. Operations / fleet dispatcher role. Defaults to
  // GPS-relevant permissions ON; DVIR keys OFF (dispatch isn't the inspection /
  // mechanic / red-tag chain). Mirror of fti-backend permissions.js.
  dispatch: {
    view_jobs: true,
    edit_jobs: true,
    edit_tickets: true,
    sign_tickets: false,
    approve_tickets: false,
    send_to_qb: false,
    void_tickets: false,
    delete_jobs: false,
    manage_users: false,
    view_inventory: true,
    edit_inventory: false,
    view_reports: true,
    view_archive: false,
    view_activity_log: true,
    view_contacts: true,
    edit_contacts: false,
    manage_settings: false,
    view_gps_events: true,
    manage_yards: true,
    perform_inspections: false,
    view_vehicle_defects: false,
    perform_repairs: false,
    red_tag_vehicle: false,
    manage_vehicles: false,
  },
};

// Returns role templates from app_settings if customized, otherwise falls back to DEFAULT_PERMS.
// Owner is ALWAYS hardcoded — all permissions true, not editable by anyone.
export function getRoleTemplates(settings) {
  const base = { ...DEFAULT_PERMS };
  if (settings?.role_templates) {
    try {
      const custom = typeof settings.role_templates === "string" ? JSON.parse(settings.role_templates) : settings.role_templates;
      for (const role of Object.keys(custom)) {
        if (role === "owner") continue; // owner is immutable
        base[role] = custom[role];
      }
    } catch {
      /* parse error — fall back to defaults */
    }
  }
  // Owner is always all-true
  base.owner = Object.fromEntries(PERMISSION_CATEGORIES.map((p) => [p.key, true]));
  return base;
}

// Resolves a user into a permission checker — the single source of can() for
// the app, consumed by AppContext. Mirrors the backend requirePermission:
// owner is all-true, no role is all-false, every other role is its
// DEFAULT_PERMS template overlaid with the user's stored per-user permissions.
export function makeCan(user) {
  const role = user?.role;
  if (!role) return () => false;
  if (role === "owner") return () => true;
  const perms = { ...(DEFAULT_PERMS[role] || {}), ...(user.permissions || {}) };
  return (key) => !!perms[key];
}
