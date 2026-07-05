import { API_URL, getCurrentUser } from "./config.js";

export const today = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD local time

export const formatDate = (d) => (d ? String(d).slice(0, 10) : "—");

// v27.66: the backend keeps adding ticket columns and this mapper has to stay
// in sync. MAPPED_KEYS is the canonical list of snake_case columns we expect;
// dev-only drift detection walks through the first response and console.warns
// about any keys the backend returned that this mapper silently drops.
// Catches "new column added, frontend forgot to map it" scenarios without
// forcing a runtime assertion in production.
const TICKET_MAPPED_KEYS = new Set([
  "id",
  "job_id",
  "type",
  "status",
  "date",
  "signed_by",
  "signed_at",
  "signature_img",
  "sig_not_req_reason",
  "sig_not_req_note",
  "notes",
  "emailed_at",
  "email_to",
  "has_pending_comment",
  "missing_pieces",
  "locked",
  "ticket_number",
  "start_date",
  "end_date",
  "cycle_days",
  "is_recurring",
  "voided_at",
  "replaced_by",
  "revision_of",
  "cycle_ended",
  "deleted_at",
  "deleted_with_wo",
  "job_status",
  "has_jsa",
  "jsa_completed",
  "assigned_wells",
  "google_pin",
  "pin_lat",
  "pin_lng",
  "lv_yard",
  "arrival_time",
  "due_on_loc",
  "job_start_time",
  "job_end_time",
  "ret_yard",
  "time_zone",
  "mileage_begin",
  "mileage_end",
  "created_by_name",
  "created_at",
  "site_mgr_first",
  "site_mgr_last",
  "site_mgr_phone",
  "site_mgr_email",
  "archived_at",
  "yard_location_index",
  // Join aliases that aren't exposed on the mapped object but are returned
  // by the API and we knowingly ignore:
  "job_num",
  "created_by",
  "updated_at",
  // Line items are nested — handled separately
  "lineItems",
  "line_items",
]);
let __ticketDriftWarned = false;
function __checkTicketDrift(t) {
  if (__ticketDriftWarned || typeof t !== "object" || !t) return;
  const unknown = Object.keys(t).filter((k) => !TICKET_MAPPED_KEYS.has(k));
  if (unknown.length > 0) {
    __ticketDriftWarned = true;

    console.warn("[mapTicketFromApi] Backend returned keys not in the mapper — update TICKET_MAPPED_KEYS / mapTicketFromApi:", unknown);
  }
}

export const mapTicketFromApi = (t) => {
  __checkTicketDrift(t);
  return {
    id: t.id,
    jobId: t.job_id,
    type: t.type,
    status: t.status,
    date: t.date,
    signedBy: t.signed_by,
    signedAt: t.signed_at,
    signatureImage: t.signature_img,
    sigNotReqReason: t.sig_not_req_reason,
    sigNotReqNote: t.sig_not_req_note,
    notes: t.notes,
    emailedAt: t.emailed_at || null,
    emailTo: t.email_to || null,
    hasPendingComment: t.has_pending_comment || false,
    missingPieces: t.missing_pieces,
    locked: t.locked,
    ticketNumber: t.ticket_number || null,
    startDate: t.start_date || null,
    endDate: t.end_date || null,
    weekStart: t.week_start || null, // v28.267 — log-family Mon anchor
    cycleDays: t.cycle_days || 28,
    isRecurring: t.is_recurring || false,
    voidedAt: t.voided_at || null,
    replacedBy: t.replaced_by || null,
    revisionOf: t.revision_of || null,
    cycleEnded: t.cycle_ended || false,
    deletedAt: t.deleted_at || null,
    deletedWithWo: t.deleted_with_wo || false,
    jobStatus: t.job_status || null,
    hasJSA: t.has_jsa || false,
    jsaCompleted: t.jsa_completed || false,
    assignedWells: t.assigned_wells || [],
    googlePin: t.google_pin || null,
    pinLat: t.pin_lat || null,
    pinLng: t.pin_lng || null,
    lvYard: t.lv_yard || "",
    arrivalTime: t.arrival_time || "",
    dueOnLoc: t.due_on_loc || "",
    jobStartTime: t.job_start_time || "",
    jobEndTime: t.job_end_time || "",
    retYard: t.ret_yard || "",
    timeZone: t.time_zone || "",
    mileageBegin: t.mileage_begin ?? null,
    mileageEnd: t.mileage_end ?? null,
    createdBy: t.created_by_name || null,
    createdAt: t.created_at || null,
    siteMgrFirst: t.site_mgr_first || "",
    siteMgrLast: t.site_mgr_last || "",
    siteMgrPhone: t.site_mgr_phone || "",
    siteMgrEmail: t.site_mgr_email || "",
    archivedAt: t.archived_at || null,
    yardLocationIndex: t.yard_location_index || 1,
    lineItems: (t.lineItems || t.line_items || []).map((li) => ({
      qbCode: li.qb_code,
      desc: li.description,
      rate: Number(li.rate),
      qty: Number(li.qty),
      um: li.unit_measure,
      days: Number(li.days) || 1,
    })),
  };
};

// Parse the yards[] array from an app_settings row. The `yards` column is a
// JSON string; fall back to the legacy single-yard columns when it's absent
// or empty. Always returns at least one yard.
const BLANK_YARD = { name: "", address: "", lat: "", lng: "" };

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

// v28.189 — approval-time data-completeness check. Reggie 2026-05-24: a
// ticket should NOT be approvable until at least the workday bracket (leave
// yard + return yard) is recorded. The check accepts EITHER the legacy
// manual fields (lvYard / retYard varchar(10) like "07:30") OR the v28.183
// GPS-tracked equivalents (yardLeftAt / yardReturnedAt timestamptz) — a GPS
// pull may have populated the new columns without touching the legacy ones.
// Returns { ok: true } on pass, { ok: false, error: '...' } with a
// human-readable explanation on fail. Wire into every approve site.
export const validateTicketForApproval = (t) => {
  if (!t) return { ok: false, error: "Ticket data missing" };
  const hasLeaveYard = !!(t.lvYard || t.yardLeftAt || t.yard_left_at);
  const hasReturnYard = !!(t.retYard || t.yardReturnedAt || t.yard_returned_at);
  if (!hasLeaveYard && !hasReturnYard) {
    return { ok: false, error: "Time entry is required before approval. Set Leave Yard and Return to Yard." };
  }
  if (!hasLeaveYard) {
    return { ok: false, error: "Leave Yard time is required before approval." };
  }
  if (!hasReturnYard) {
    return { ok: false, error: "Return to Yard time is required before approval." };
  }
  return { ok: true };
};

// v28.188 — single source of truth for US phone formatting. Lifted from
// useNewJobForm.js (was inline formatPhoneImpl) so AddTicketSiteManager and
// any future caller share the same XXX-XXX-XXXX masking. Accepts whatever the
// user types; strips non-digits and re-inserts hyphens as the field fills.
export const formatPhone = (val) => {
  const digits = String(val || "")
    .replace(/\D/g, "")
    .slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
};

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
  if (updates.type !== undefined) p.type = updates.type; // v28.262 — family-guarded switch (BE v28.260)
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
    p.lineItems = updates.lineItems.map((li) => ({
      qb_code: li.qbCode,
      description: li.desc,
      rate: li.rate,
      qty: li.qty,
      unit_measure: li.um,
      days: li.days || 1,
    }));
  }
  return p;
};

// Shared helper: pull a human-readable message out of a failed ticket-save
// response. The backend returns { error, errors[] } (errors[] from the
// time-sanity gate); fall back to the HTTP status.
export const ticketSaveErrorMessage = async (r) => {
  try {
    const d = await r.json();
    if (Array.isArray(d.errors) && d.errors.length) return d.errors.join(" ");
    if (d.error) return d.error;
  } catch {
    /* non-JSON body */
  }
  return `Could not save the ticket (HTTP ${r.status}).`;
};

// Shared helper: sends ticket update to backend and updates local state.
// v28.228 — now respects the response: ONLY updates local state on success,
// and reports failures via the optional onError(message) callback. Previously
// it ignored r.ok and optimistically updated regardless, so a rejected save
// (time gate, future-date, lock, perms) looked saved until a refresh reverted
// it. Returns { ok, error }.
export const updateTicketApi = async (id, updates, setTickets, onError) => {
  const payload = buildTicketPayload(updates);
  try {
    const r = await fetch(`${API_URL}/tickets/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      const msg = await ticketSaveErrorMessage(r);
      if (onError) onError(msg);
      return { ok: false, error: msg };
    }
    // v28.270 — the server owns week_start (recomputed when a log ticket's
    // date moves, v28.269); merge its answer so the weekly grid re-anchors
    // without a page refresh.
    const body = await r.json().catch(() => null);
    if (body && body.week_start !== undefined) updates = { ...updates, weekStart: body.week_start };
  } catch (err) {
    console.error("Ticket update failed:", err);
    if (onError) onError("A network error occurred while saving the ticket.");
    return { ok: false, error: "network" };
  }
  setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  return { ok: true };
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
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_ticket_number: saved.ticket_number, new_ticket_id: saved.id }),
      });
      if (!nr.ok) console.error("Void notify non-2xx:", nr.status);
    } catch (_e) {
      showNotice?.("Notification Email Failed", "The ticket was voided successfully, but the notification email failed to send.", "error");
    }
    // Refetch the WO's tickets (including voided) so local state matches server.
    const tr = await fetch(`${API_URL}/tickets?job_id=${ticket.jobId}&include_voided=true`);
    if (!tr.ok) {
      showNotice?.(
        "Voided — Refresh Needed",
        "The ticket was voided, but the list could not be refreshed automatically. Close and reopen the tab to see the current state.",
        "error",
      );
      return { success: true, refreshed: false };
    }
    const data = await tr.json();
    const mapped = data.map(mapTicketFromApi);
    if (setTickets) {
      setTickets((prev) => {
        const otherJobs = prev.filter((tk) => tk.jobId !== ticket.jobId);
        return [...otherJobs, ...mapped];
      });
    }
    const newTicket = alsoCreateNew && saved.id != null ? mapped.find((tk) => tk.id === saved.id) || null : null;
    if (alsoCreateNew && saved.id != null && !newTicket) {
      showNotice?.(
        "Voided — New Revision Created",
        `Ticket was voided and revision #${saved.ticket_number} was created, but could not be opened automatically. Find it in the ticket list.`,
        "ok",
      );
    }
    return { success: true, refreshed: true, newTicket, ticketNumber: saved.ticket_number };
  } catch (err) {
    showNotice?.("Revise Failed", err.message, "error");
    return { success: false };
  }
};
