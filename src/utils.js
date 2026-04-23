import { API_URL, getCurrentUser } from "./config.js";

export const today = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD local time

export const formatDate = (d) => d ? String(d).slice(0, 10) : "—";

// v27.66: the backend keeps adding ticket columns and this mapper has to stay
// in sync. MAPPED_KEYS is the canonical list of snake_case columns we expect;
// dev-only drift detection walks through the first response and console.warns
// about any keys the backend returned that this mapper silently drops.
// Catches "new column added, frontend forgot to map it" scenarios without
// forcing a runtime assertion in production.
const TICKET_MAPPED_KEYS = new Set([
  'id', 'job_id', 'type', 'status', 'date',
  'signed_by', 'signed_at', 'signature_img', 'sig_not_req_reason', 'sig_not_req_note',
  'notes', 'emailed_at', 'email_to', 'has_pending_comment', 'missing_pieces',
  'locked', 'ticket_number', 'start_date', 'end_date', 'cycle_days', 'is_recurring',
  'voided_at', 'replaced_by', 'revision_of', 'cycle_ended',
  'deleted_at', 'deleted_with_wo', 'job_status',
  'has_jsa', 'assigned_wells', 'google_pin', 'pin_lat', 'pin_lng',
  'lv_yard', 'arrival_time', 'due_on_loc', 'job_start_time', 'job_end_time', 'ret_yard',
  'time_zone', 'mileage_begin', 'mileage_end',
  'created_by_name', 'created_at', 'site_mgr_first', 'site_mgr_last', 'site_mgr_phone', 'site_mgr_email',
  'archived_at', 'yard_location_index',
  // Join aliases that aren't exposed on the mapped object but are returned
  // by the API and we knowingly ignore:
  'job_num', 'created_by', 'updated_at',
  // Line items are nested — handled separately
  'lineItems', 'line_items',
]);
let __ticketDriftWarned = false;
function __checkTicketDrift(t) {
  if (__ticketDriftWarned || typeof t !== 'object' || !t) return;
  const unknown = Object.keys(t).filter(k => !TICKET_MAPPED_KEYS.has(k));
  if (unknown.length > 0) {
    __ticketDriftWarned = true;
    // eslint-disable-next-line no-console
    console.warn('[mapTicketFromApi] Backend returned keys not in the mapper — update TICKET_MAPPED_KEYS / mapTicketFromApi:', unknown);
  }
}

export const mapTicketFromApi = (t) => {
  __checkTicketDrift(t);
  return {
  id: t.id, jobId: t.job_id, type: t.type, status: t.status, date: t.date,
  signedBy: t.signed_by, signedAt: t.signed_at, signatureImage: t.signature_img,
  sigNotReqReason: t.sig_not_req_reason, sigNotReqNote: t.sig_not_req_note,
  notes: t.notes, emailedAt: t.emailed_at || null, emailTo: t.email_to || null,
  hasPendingComment: t.has_pending_comment || false, missingPieces: t.missing_pieces,
  locked: t.locked, ticketNumber: t.ticket_number || null,
  startDate: t.start_date || null, endDate: t.end_date || null,
  cycleDays: t.cycle_days || 28, isRecurring: t.is_recurring || false,
  voidedAt: t.voided_at || null, replacedBy: t.replaced_by || null,
  revisionOf: t.revision_of || null, cycleEnded: t.cycle_ended || false,
  deletedAt: t.deleted_at || null, deletedWithWo: t.deleted_with_wo || false,
  jobStatus: t.job_status || null,
  hasJSA: t.has_jsa || false, assignedWells: t.assigned_wells || [],
  googlePin: t.google_pin || null, pinLat: t.pin_lat || null, pinLng: t.pin_lng || null,
  lvYard: t.lv_yard || "", arrivalTime: t.arrival_time || "",
  dueOnLoc: t.due_on_loc || "", jobStartTime: t.job_start_time || "",
  jobEndTime: t.job_end_time || "", retYard: t.ret_yard || "",
  timeZone: t.time_zone || "",
  mileageBegin: t.mileage_begin ?? null, mileageEnd: t.mileage_end ?? null,
  createdBy: t.created_by_name || null, createdAt: t.created_at || null,
  siteMgrFirst: t.site_mgr_first || "", siteMgrLast: t.site_mgr_last || "",
  siteMgrPhone: t.site_mgr_phone || "", siteMgrEmail: t.site_mgr_email || "",
  archivedAt: t.archived_at || null,
  yardLocationIndex: t.yard_location_index || 1,
  lineItems: (t.lineItems || t.line_items || []).map(li => ({
    qbCode: li.qb_code, desc: li.description, rate: Number(li.rate),
    qty: Number(li.qty), um: li.unit_measure, days: Number(li.days) || 1,
  })),
  };
};

// Parse the yards[] array from an app_settings row. The `yards` column is a
// JSON string; fall back to the legacy single-yard columns when it's absent
// or empty. Always returns at least one yard.
const BLANK_YARD = { name: "", address: "", lat: "", lng: "" };
export const parseYards = (settings) => {
  if (!settings) return [{ ...BLANK_YARD }];
  let arr = [];
  if (settings.yards) {
    try { arr = JSON.parse(settings.yards); } catch { arr = []; }
  }
  if (!Array.isArray(arr) || arr.length === 0) {
    arr = [{
      name: "Yard #1",
      address: settings.yard_address || "",
      lat: settings.yard_lat || "",
      lng: settings.yard_lng || "",
    }];
  }
  return arr;
};

export const formatShortStamp = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt)) return "";
  return dt.toLocaleString("en-US", { month: "numeric", day: "numeric", year: "2-digit", hour: "numeric", minute: "2-digit" });
};

export const shortName = (name) => {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0];
};

export const isOverdue = (t) => !t.completed && t.dueDate && t.dueDate < today();

export const todoVisible = (t) => t.createdBy === getCurrentUser() || t.assignedTo === getCurrentUser();

export const calcLineTotal = (li) => li.rate * li.qty * (li.days || 1);

export const calcTicketTotal = (t) => t.lineItems.reduce((s, li) => s + calcLineTotal(li), 0);

// Shared helper: maps camelCase ticket updates to snake_case backend payload
export const buildTicketPayload = (updates) => {
  const p = {};
  if (updates.status) p.status = updates.status;
  if (updates.signedBy) p.signed_by = updates.signedBy;
  if (updates.signedAt) p.signed_at = updates.signedAt;
  if (updates.signatureImage) p.signature_img = updates.signatureImage;
  if (updates.sigNotReqReason) p.sig_not_req_reason = updates.sigNotReqReason;
  if (updates.sigNotReqNote) p.sig_not_req_note = updates.sigNotReqNote;
  if (updates.approvedBy) p.approved_by = updates.approvedBy;
  if (updates.approvedAt) p.approved_at = updates.approvedAt;
  if (updates.emailedAt) p.emailed_at = updates.emailedAt;
  if (updates.emailTo) p.email_to = updates.emailTo;
  if (updates.notes !== undefined) p.notes = updates.notes;
  if (updates.date) p.date = updates.date;
  if (updates.startDate !== undefined) p.start_date = updates.startDate;
  if (updates.endDate !== undefined) p.end_date = updates.endDate;
  if (updates.cycleDays !== undefined) p.cycle_days = updates.cycleDays;
  if (updates.isRecurring !== undefined) p.is_recurring = updates.isRecurring;
  if (updates.lvYard !== undefined) p.lv_yard = updates.lvYard;
  if (updates.arrivalTime !== undefined) p.arrival_time = updates.arrivalTime;
  if (updates.dueOnLoc !== undefined) p.due_on_loc = updates.dueOnLoc;
  if (updates.jobStartTime !== undefined) p.job_start_time = updates.jobStartTime;
  if (updates.jobEndTime !== undefined) p.job_end_time = updates.jobEndTime;
  if (updates.retYard !== undefined) p.ret_yard = updates.retYard;
  if (updates.timeZone !== undefined) p.time_zone = updates.timeZone;
  if (updates.mileageBegin !== undefined) p.mileage_begin = updates.mileageBegin;
  if (updates.mileageEnd !== undefined) p.mileage_end = updates.mileageEnd;
  if (updates.googlePin !== undefined) p.google_pin = updates.googlePin;
  if (updates.pinLat !== undefined) p.pin_lat = updates.pinLat;
  if (updates.pinLng !== undefined) p.pin_lng = updates.pinLng;
  if (updates.siteMgrFirst !== undefined) p.site_mgr_first = updates.siteMgrFirst;
  if (updates.siteMgrLast !== undefined) p.site_mgr_last = updates.siteMgrLast;
  if (updates.siteMgrPhone !== undefined) p.site_mgr_phone = updates.siteMgrPhone;
  if (updates.siteMgrEmail !== undefined) p.site_mgr_email = updates.siteMgrEmail;
  if (updates.yardLocationIndex !== undefined) p.yard_location_index = updates.yardLocationIndex;
  if (updates.lineItems) {
    p.lineItems = updates.lineItems.map(li => ({
      qb_code: li.qbCode, description: li.desc, rate: li.rate, qty: li.qty, unit_measure: li.um, days: li.days || 1,
    }));
  }
  return p;
};

// Shared helper: sends ticket update to backend and updates local state
export const updateTicketApi = async (id, updates, setTickets) => {
  const payload = buildTicketPayload(updates);
  try {
    await fetch(`${API_URL}/tickets/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  } catch (err) { console.error("Ticket update failed:", err); }
  setTickets(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
};

// Shared helper: POST /tickets/:id/revise + refetch + map the new ticket.
// v27.63: extracted from JobTicketsTab.jsx (desktop modal) and TicketPage.jsx
// (mobile route) which had ~35 lines of near-identical logic each.
// Returns { success, refreshed, newTicket, ticketNumber }. Callers decide
// how to "open" the new ticket (modal setState vs router navigate) based on
// the returned newTicket.
export const reviseTicketRequest = async ({ ticket, reason, alsoCreateNew = false, setTickets, showNotice }) => {
  try {
    const r = await fetch(`${API_URL}/tickets/${ticket.id}/revise`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voided_reason: reason || null, also_create_new: !!alsoCreateNew }),
    });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      showNotice?.("Revise Failed", d.error || "Could not revise the ticket.", "error");
      return { success: false };
    }
    const saved = await r.json();
    // Fire-and-forget void-notification email (non-blocking on error).
    try {
      const nr = await fetch(`${API_URL}/signature/void-notify/${ticket.id}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_ticket_number: saved.ticket_number, new_ticket_id: saved.id }),
      });
      if (!nr.ok) console.error("Void notify non-2xx:", nr.status);
    } catch (e) {
      showNotice?.("Notification Email Failed", "The ticket was voided successfully, but the notification email failed to send.", "error");
    }
    // Refetch the WO's tickets (including voided) so local state matches server.
    const tr = await fetch(`${API_URL}/tickets?job_id=${ticket.jobId}&include_voided=true`);
    if (!tr.ok) {
      showNotice?.("Voided — Refresh Needed", "The ticket was voided, but the list could not be refreshed automatically. Close and reopen the tab to see the current state.", "error");
      return { success: true, refreshed: false };
    }
    const data = await tr.json();
    const mapped = data.map(mapTicketFromApi);
    if (setTickets) {
      setTickets(prev => {
        const otherJobs = prev.filter(tk => tk.jobId !== ticket.jobId);
        return [...otherJobs, ...mapped];
      });
    }
    const newTicket = alsoCreateNew && saved.id != null ? (mapped.find(tk => tk.id === saved.id) || null) : null;
    if (alsoCreateNew && saved.id != null && !newTicket) {
      showNotice?.("Voided — New Revision Created", `Ticket was voided and revision #${saved.ticket_number} was created, but could not be opened automatically. Find it in the ticket list.`, "ok");
    }
    return { success: true, refreshed: true, newTicket, ticketNumber: saved.ticket_number };
  } catch (err) {
    showNotice?.("Revise Failed", err.message, "error");
    return { success: false };
  }
};

// Role hierarchy for user management
export const ROLE_OPTIONS = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "lead", label: "Lead" },
  { value: "salesman", label: "Salesman" },
  { value: "field", label: "Field" },
];
export const ROLE_RANK = { owner: 4, admin: 3, manager: 2, lead: 1, salesman: 1, field: 0 };
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
];

// Default permissions by role. Used as the fallback when a user's permissions
// column is empty or unset (new user, or migration gap).
export const DEFAULT_PERMS = {
  owner: Object.fromEntries(PERMISSION_CATEGORIES.map(p => [p.key, true])),
  admin: Object.fromEntries(PERMISSION_CATEGORIES.map(p => [p.key, true])),
  manager: Object.fromEntries(PERMISSION_CATEGORIES.map(p => [p.key, !["manage_users", "view_activity_log"].includes(p.key)])),
  lead: { view_jobs: true, edit_jobs: true, edit_tickets: true, sign_tickets: true, view_inventory: true, view_reports: true, view_archive: false, view_activity_log: false, delete_jobs: false, approve_tickets: false, send_to_qb: false, void_tickets: false, manage_users: false, edit_inventory: false },
  salesman: { view_jobs: true, edit_jobs: false, edit_tickets: false, sign_tickets: false, view_inventory: false, view_reports: false, view_archive: false, view_activity_log: false, delete_jobs: false, approve_tickets: false, send_to_qb: false, void_tickets: false, manage_users: false, edit_inventory: false },
  field: { view_jobs: true, edit_tickets: true, sign_tickets: true, view_inventory: false, view_reports: false, view_archive: false, view_activity_log: false, edit_jobs: false, delete_jobs: false, approve_tickets: false, send_to_qb: false, void_tickets: false, manage_users: false, edit_inventory: false },
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
    } catch { /* parse error — fall back to defaults */ }
  }
  // Owner is always all-true
  base.owner = Object.fromEntries(PERMISSION_CATEGORIES.map(p => [p.key, true]));
  return base;
}
