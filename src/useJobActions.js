import { api } from "./api.js";
import { mapTicketFromApi } from "./utils.js";
import { recordConsent } from "./smsConsent.js";

// ─── useJobActions (v28.05) ─────────────────────────────────────────────────
// Job/ticket CRUD handlers. Previously inlined in FTIDashboard.jsx as ~211
// lines of handlers. Extracting them here removes the largest logic block
// from the dashboard component.
//
// Not a true React hook (no state/effect of its own — every state piece
// comes from usePageData and AppContext) but follows the use-prefix convention
// because callers treat it like one. Returns a plain object of action
// callbacks.
//
// Each handler:
//   1. Hits the API endpoint
//   2. Writes an audit_log row when the operation should be tracked
//   3. Updates local state via the setters passed in
//
// Article XXV split intent: the dashboard component goes from "what state +
// what actions + what UI" to "what state (via usePageData) + what UI (with
// action callbacks injected)". useJobActions is the action layer.
export function useJobActions({
  // From usePageData
  jobs,
  setJobs,
  setTickets,
  deletedTickets,
  setDeletedTickets,
  refreshDeletedTickets,
  setExpandedId,
  // From AppContext
  currentUser,
  can,
  customers,
  userIdByName,
  // Local UI state
  setShowNewJob,
}) {
  // Helper to log audit events
  const logAudit = async (action, entityType, entityId, oldValue, newValue, notes) => {
    try {
      await api.post("/audit", {
        user_id: currentUser.id,
        user_name: currentUser.name,
        action,
        entity_type: entityType,
        entity_id: String(entityId),
        old_value: oldValue,
        new_value: newValue,
        notes,
      });
    } catch (err) {
      console.error("Audit log failed:", err);
    }
  };

  const handleCreateJob = async (newJob) => {
    const cust = customers.find((c) => c.name === newJob.customer);
    const payload = {
      customer_id: cust?.id || null,
      location: newJob.location,
      job_state: newJob.jobState || null,
      county: newJob.county || null,
      date_started: newJob.dateStarted,
      status: newJob.status,
      afe: newJob.afe || null,
      contact_first: newJob.contactFirst || null,
      contact_last: newJob.contactLast || null,
      poc_phone: newJob.phone || null,
      poc_email: newJob.email || null,
      approver: newJob.approver || null,
      approver_last: newJob.approverLast || null,
      approver_phone: newJob.approverPhone || null,
      approver_email: newJob.approverEmail || null,
      company_code: newJob.companyCode || null,
      cost_center: newJob.costCenter || null,
      po_number: newJob.po || null,
      salesman: newJob.salesman || null,
      google_pin: newJob.googlePin || null,
      pin_lat: newJob.pinLat || null,
      pin_lng: newJob.pinLng || null,
      // v28.181 — geofence radius (ft) around the primary pin. Default 300 if
      // not provided. Backend uses it to size the Samsara geofence on dispatch.
      location_radius_ft: newJob.locationRadiusFt || 300,
      created_by: currentUser?.id || null,
      notes: newJob.notes || null,
      // v28.181 — wells now carry per-well location override metadata.
      // newJob.wellOverrides[idx] is aligned with newJob.wells[idx]. Default
      // useSameLocation=true means the well inherits the WO's primary pin
      // (no per-well geofence created). When useSameLocation=false AND
      // pin_lat/pin_lng are provided, the BE creates a dedicated geofence
      // for that well.
      wells: newJob.wells.map((w, idx) => {
        const ov = (newJob.wellOverrides && newJob.wellOverrides[idx]) || { useSameLocation: true };
        const useSame = ov.useSameLocation !== false;
        return {
          well_name: w,
          afe_number: null,
          use_primary_location: useSame,
          pin_lat: !useSame && ov.pinLat !== "" && ov.pinLat != null ? Number(ov.pinLat) : null,
          pin_lng: !useSame && ov.pinLng !== "" && ov.pinLng != null ? Number(ov.pinLng) : null,
        };
      }),
      crew: [],
      equipment: newJob.equipment || [],
    };
    try {
      const saved = await api.post("/jobs", payload);
      const mappedJob = {
        ...newJob,
        id: saved.id,
        pocEmail: newJob.email || "",
        poc_email: newJob.email || "",
        pocPhone: newJob.phone || "",
        approverEmail: newJob.approverEmail || "",
        approverPhone: newJob.approverPhone || "",
        customer_name: cust?.name || newJob.customer,
        wells: (newJob.wells || []).map((w, i) => ({ well_name: w, sort_order: i })),
        createdBy: currentUser?.name || null,
        createdAt: new Date().toISOString(),
      };
      setJobs((prev) => [mappedJob, ...prev]);
      setShowNewJob(false);
      setExpandedId(saved.id);

      // v28.54 — record any SMS consent intents captured during the new-
      // WO flow. Posted AFTER the WO insert returns success so we never
      // record consent for a job that wasn't actually created. Failures
      // here are logged but don't break the WO save — consent capture
      // is best-effort at this stage.
      if (newJob.pocConsentIntent && newJob.phone) {
        try {
          await recordConsent({
            phone_number: newJob.phone,
            recipient_type: "customer_rep",
            consent_method: "verbal",
            context: `job_setup:${saved.id}`,
          });
        } catch (err) {
          console.warn("POC SMS consent record failed:", err);
        }
      }
      if (newJob.approverConsentIntent && newJob.approverPhone) {
        try {
          await recordConsent({
            phone_number: newJob.approverPhone,
            recipient_type: "customer_rep",
            consent_method: "verbal",
            context: `job_setup:${saved.id}:approver`,
          });
        } catch (err) {
          console.warn("Approver SMS consent record failed:", err);
        }
      }
    } catch (err) {
      console.error("Create job failed:", err);
    }
  };

  const handleDeleteJob = async (jobId) => {
    if (!can("delete_jobs")) return;
    const job = jobs.find((j) => j.id === jobId);
    try {
      await api.put(`/jobs/${jobId}`, { status: "Deleted" });
      await logAudit(
        "job_delete",
        "job",
        jobId,
        { status: job?.status, customer: job?.customer },
        { status: "Deleted" },
        `Work Order #${jobId} deleted by ${currentUser.name}`,
      );
      setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, status: "Deleted" } : j)));
      // Backend cascaded deleted_at + deleted_with_wo onto this WO's active tickets —
      // drop them from the active list and pull fresh deleted list.
      setTickets((prev) => prev.filter((t) => t.jobId !== jobId));
      await refreshDeletedTickets();
      setExpandedId(null);
    } catch (err) {
      console.error("Delete job failed:", err);
    }
  };

  const handleRestoreJob = async (jobId) => {
    try {
      await api.put(`/jobs/${jobId}`, { status: "Scheduled" });
      await logAudit("job_restore", "job", jobId, { status: "Deleted" }, { status: "Scheduled" }, `Work Order #${jobId} restored by ${currentUser.name}`);
      setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, status: "Scheduled" } : j)));
      // Backend cascade-restored tickets that were deleted_with_wo=true on this WO —
      // pull fresh active + deleted lists so UI matches DB.
      try {
        const data = await api.get(`/tickets?job_id=${jobId}&include_voided=true`);
        const mapped = (data || []).map(mapTicketFromApi);
        setTickets((prev) => [...prev.filter((t) => t.jobId !== jobId), ...mapped]);
      } catch (err) {
        console.error("Ticket refresh after restore failed:", err);
      }
      await refreshDeletedTickets();
    } catch (err) {
      console.error("Restore job failed:", err);
    }
  };

  const handleArchiveJob = async (jobId) => {
    if (!can("view_archive")) return;
    try {
      await api.post("/archive", { entity_type: "job", entity_id: jobId, archived_by: currentUser.id, archive_reason: "deleted" });
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
    } catch (err) {
      console.error("Archive job failed:", err);
    }
  };

  // v28.40 — close-out: lead/manager/admin/owner clicks MARK FOR COMPLETION
  // on a WO whose tickets are all in terminal states (sentToQB, qbVerified,
  // voided). Writes archive record with reason="job_closed", which sets
  // archived_at on the job and removes it from active queries. Distinct
  // from handleArchiveJob (which is called from DeletedJobsPage to permanently
  // archive deleted-but-not-yet-purged WOs with reason="deleted").
  const handleCloseJob = async (jobId) => {
    if (!can("view_archive")) return;
    const job = jobs.find((j) => j.id === jobId);
    try {
      await api.post("/archive", { entity_type: "job", entity_id: jobId, archived_by: currentUser.id, archive_reason: "job_closed" });
      await logAudit(
        "job_closed",
        "job",
        jobId,
        { status: job?.status, customer: job?.customer },
        { archive_reason: "job_closed" },
        `Work Order #${jobId} closed out by ${currentUser.name}`,
      );
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
    } catch (err) {
      console.error("Close job failed:", err);
    }
  };

  const handleRestoreTicket = async (ticketId) => {
    try {
      const result = (await api.post(`/tickets/${ticketId}/restore`)) || {};
      const restored = deletedTickets.find((t) => t.id === ticketId);
      setDeletedTickets((prev) => prev.filter((t) => t.id !== ticketId));
      if (restored) setTickets((prev) => [...prev, { ...restored, deletedAt: null, deletedWithWo: false }]);
      // Backend may have auto-restored a deleted parent WO to give the ticket a home.
      // Reflect that in jobs state + pull any of its cascaded siblings that also came back.
      if (result.job_restored && result.job_id) {
        setJobs((prev) => prev.map((j) => (j.id === result.job_id ? { ...j, status: "Scheduled" } : j)));
        await refreshDeletedTickets();
      }
    } catch (err) {
      console.error("Restore ticket failed:", err);
    }
  };

  const handleArchiveTicket = async (ticketId, reason = "deleted") => {
    if (!can("view_archive")) return;
    try {
      await api.post("/archive", { entity_type: "ticket", entity_id: ticketId, archived_by: currentUser.id, archive_reason: reason });
      setDeletedTickets((prev) => prev.filter((t) => t.id !== ticketId));
      setTickets((prev) => prev.filter((t) => t.id !== ticketId));
    } catch (err) {
      console.error("Archive ticket failed:", err);
    }
  };

  const handleFlagCancel = async (jobId) => {
    const job = jobs.find((j) => j.id === jobId);
    try {
      await api.put(`/jobs/${jobId}`, { status: "flaggedCancel" });
      await logAudit(
        "job_flag_cancel",
        "job",
        jobId,
        { status: job?.status },
        { status: "flaggedCancel" },
        `Work Order #${jobId} flagged for cancellation by ${currentUser.name}`,
      );
      setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, status: "flaggedCancel" } : j)));
    } catch (err) {
      console.error("Flag cancel failed:", err);
    }
  };

  const handleUpdateJob = async (id, updates) => {
    const oldJob = jobs.find((j) => j.id === id);
    try {
      const payload = {
        location: updates.location,
        status: updates.status,
        job_state: updates.job_state,
        county: updates.county,
        afe: updates.afe,
        contact_first: updates.contact_first,
        contact_last: updates.contact_last,
        poc_phone: updates.poc_phone,
        poc_email: updates.poc_email,
        approver: updates.approver,
        approver_last: updates.approver_last,
        approver_phone: updates.approver_phone,
        approver_email: updates.approver_email,
        company_code: updates.company_code,
        cost_center: updates.cost_center,
        po_number: updates.po_number,
        google_pin: updates.google_pin,
        pin_lat: updates.pin_lat,
        pin_lng: updates.pin_lng,
      };
      if (updates.customer) {
        payload.customer = updates.customer;
        const cust = customers.find((c) => c.name === updates.customer);
        if (cust) payload.customer_id = cust.id;
      }
      if (updates.wells) {
        payload.wells = updates.wells.map((w) => (typeof w === "string" ? { well_name: w } : w));
      }
      if (updates.crew) payload.crew = updates.crew.map((c) => ({ name: c.name, role: c.role, user_id: userIdByName[c.name] || null }));
      await api.put(`/jobs/${id}`, payload);
      await logAudit("job_edit", "job", id, { customer: oldJob?.customer, status: oldJob?.status }, updates, `Work Order #${id} edited by ${currentUser.name}`);

      // v28.54 — record SMS consents for any newly-captured phones. Posted
      // AFTER the WO update returns to keep "consent for a real job"
      // invariant. recordConsent is idempotent — if the phone already has
      // an active consent on file, it returns the existing row unchanged.
      if (updates.pocConsentIntent && updates.poc_phone) {
        try {
          await recordConsent({
            phone_number: updates.poc_phone,
            recipient_type: "customer_rep",
            consent_method: "verbal",
            context: `job_edit:${id}`,
          });
        } catch (err) {
          console.warn("POC SMS consent record failed:", err);
        }
      }
      if (updates.approverConsentIntent && updates.approver_phone) {
        try {
          await recordConsent({
            phone_number: updates.approver_phone,
            recipient_type: "customer_rep",
            consent_method: "verbal",
            context: `job_edit:${id}:approver`,
          });
        } catch (err) {
          console.warn("Approver SMS consent record failed:", err);
        }
      }
    } catch (err) {
      console.error("Job update failed:", err);
    }
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...updates } : j)));
  };

  return {
    logAudit,
    handleCreateJob,
    handleDeleteJob,
    handleRestoreJob,
    handleArchiveJob,
    handleCloseJob,
    handleRestoreTicket,
    handleArchiveTicket,
    handleFlagCancel,
    handleUpdateJob,
  };
}
