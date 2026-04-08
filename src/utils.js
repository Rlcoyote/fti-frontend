import { API_URL, getCurrentUser } from "./config.js";

export const today = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD local time

export const formatDate = (d) => d ? String(d).slice(0, 10) : "—";

export const mapTicketFromApi = (t) => ({
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
  lineItems: (t.lineItems || t.line_items || []).map(li => ({
    qbCode: li.qb_code, desc: li.description, rate: Number(li.rate),
    qty: Number(li.qty), um: li.unit_measure, days: Number(li.days) || 1,
  })),
});

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
  const myRank = ROLE_RANK[currentUserRole] ?? 0;
  const theirRank = ROLE_RANK[targetUserRole] ?? 0;
  return myRank > theirRank;
};
