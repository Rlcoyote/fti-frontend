import { useState, useRef } from "react";
import { API_URL } from "./config.js";
import { useApp } from "./AppContext.jsx";

// ─── useAddTicket (v28.88 — ship 7 of WorkOrderTicketsTab split) ─────────────────
// The add-ticket flow consolidated into one hook. Owns the open/close
// state and the I/O-heavy save handler (POST new vs PUT auto-saved-for-JSA,
// optimistic merge into setTickets, then bulk-POST any crew selection).
//
// Returns:
//   showAdd     — boolean. Whether the AddTicketModal is open.
//   openAdd()   — open the modal
//   closeAdd()  — close the modal (without saving)
//   handleAdd(ticketData)
//               — async. Maps the modal's camelCase form payload to the
//                 backend's snake_case schema, runs the POST or PUT,
//                 merges the result into setTickets, fires the crew
//                 bulk-POST if any crew was selected pre-create, and
//                 upserts a manually-entered site manager as a customer
//                 contact (v28.109). Closes the modal on success; leaves
//                 it open + shows a notice
//                 on any failure so the user can retry without losing
//                 form state.
//
// Two-path behavior (POST vs PUT) preserved exactly from v28.85:
//   - ticketData.id present → ticket was auto-saved earlier (typically
//     by the JSA flow needing a real ticket id to attach to). PUT to
//     update; merge into setTickets either replacing the existing row
//     or appending if it's not in state yet.
//   - ticketData.id absent → fresh create. POST, take the new id and
//     ticket_number from the response, prepend to setTickets, then
//     bulk-POST any crew the user pre-selected.
//
// Error handling: any failure (HTTP non-2xx or thrown) surfaces a
// showNotice toast and leaves the modal open. The "your data is still
// in the form" wording is preserved — that's a deliberate UX choice
// that tells the user they can retry without retyping.
//
// Crew bulk-POST uses sequential await inside a for…of loop on purpose:
// failures get individually logged with the crew member's name; Promise.all
// would lose that per-member visibility. eslint disabled in line.

export default function useAddTicket({ setTickets }) {
  const { currentUser, showNotice } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  // Double-submit guard. A ref, not state: a second rapid call must see the
  // flag SYNCHRONOUSLY — before React re-renders — so it can bail before
  // firing a second POST. This is the airtight stop for the duplicate-ticket
  // bug; the modal's disabled button is the visible-feedback layer on top.
  const submittingRef = useRef(false);

  // v28.271 — the ADD TICKET type menu preselects; the modal opens typed.
  const [initialType, setInitialType] = useState(null);
  const openAdd = (type) => {
    setInitialType(typeof type === "string" ? type : null);
    setShowAdd(true);
  };
  const closeAdd = () => setShowAdd(false);

  const handleAdd = async (ticketData, opts = {}) => {
    // Ignore a re-entrant call (fast double-click) while a save is in flight.
    if (submittingRef.current) return;
    submittingRef.current = true;
    // v28.243 — return the saved ticket so the JSA soft-save path can capture
    // the new id, and honor opts.keepOpen to skip the close-on-success (the
    // soft-save creates the ticket but leaves the modal open for the JSA).
    // Normal saves pass no opts → behaves exactly as before (closes, return
    // value ignored).
    let savedTicket;
    const payload = {
      job_id: ticketData.workOrderId,
      type: ticketData.type,
      status: ticketData.status || "incomplete",
      date: ticketData.date,
      notes: ticketData.notes,
      created_by: currentUser?.id || null,
      assigned_wells: ticketData.assignedWells || [],
      start_date: ticketData.startDate || null,
      end_date: ticketData.endDate || null,
      cycle_days: ticketData.cycleDays || 28,
      is_recurring: ticketData.isRecurring || false,
      lv_yard: ticketData.lvYard || null,
      arrival_time: ticketData.arrivalTime || null,
      due_on_loc: ticketData.dueOnLoc || null,
      job_start_time: ticketData.jobStartTime || null,
      job_end_time: ticketData.jobEndTime || null,
      ret_yard: ticketData.retYard || null,
      time_zone: ticketData.timeZone || null,
      mileage_begin: ticketData.mileageBegin !== undefined ? ticketData.mileageBegin : null,
      mileage_end: ticketData.mileageEnd !== undefined ? ticketData.mileageEnd : null,
      google_pin: ticketData.googlePin || null,
      pin_lat: ticketData.pinLat || null,
      pin_lng: ticketData.pinLng || null,
      site_mgr_first: ticketData.siteMgrFirst || null,
      site_mgr_last: ticketData.siteMgrLast || null,
      site_mgr_phone: ticketData.siteMgrPhone || null,
      site_mgr_email: ticketData.siteMgrEmail || null,
      yard_location_index: ticketData.yardLocationIndex || 1,
      // v28.183 — GPS vehicle picker on ticket-create. Null = no vehicle
      // assigned (PULL FROM GPS unavailable on the ticket until set).
      gps_vehicle_id: ticketData.gpsVehicleId || null,
      trailer_id: ticketData.trailerId || null,
      equipment: (ticketData.equipment || [])
        .filter((r) => r.item && String(r.item).trim())
        .map((r) => ({ inventory_id: r.inventory_id || null, item: r.item, size: r.size || null, qty: r.qty || 1, note: r.note || null })),
      lineItems: (ticketData.lineItems || []).map((li) => ({
        qb_code: li.qbCode,
        description: li.desc,
        rate: li.rate,
        qty: li.qty,
        unit_measure: li.um,
        days: li.days || 1,
      })),
    };
    try {
      if (ticketData.id) {
        // Ticket was auto-saved (for JSA) — update instead of create
        const r = await fetch(`${API_URL}/tickets/${ticketData.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!r.ok) {
          // Server rejected the update — don't close the modal silently, surface the failure.
          const errBody = await r.text().catch(() => "");
          showNotice("Save Failed", `Ticket was not saved (HTTP ${r.status}). ${errBody.slice(0, 200)}`, "error");
          return;
        }
        setTickets((prev) => {
          const exists = prev.some((t) => t.id === ticketData.id);
          if (exists) return prev.map((t) => (t.id === ticketData.id ? { ...ticketData, createdBy: currentUser?.name || null, createdAt: t.createdAt } : t));
          return [...prev, { ...ticketData, createdBy: currentUser?.name || null, createdAt: new Date().toISOString() }];
        });
        savedTicket = { ...ticketData };
      } else {
        const r = await fetch(`${API_URL}/tickets`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (!r.ok) {
          // Surface the failure instead of closing the modal with silent data loss.
          const errBody = await r.text().catch(() => "");
          showNotice("Save Failed", `Ticket was not saved (HTTP ${r.status}). Your data is still in the form. ${errBody.slice(0, 200)}`, "error");
          return;
        }
        const saved = await r.json();
        const newTicket = {
          ...ticketData,
          id: saved.id,
          ticketNumber: saved.ticket_number,
          weekStart: saved.week_start || null, // v28.270 — no-refresh week anchor
          createdBy: currentUser?.name || null,
          createdAt: new Date().toISOString(),
        };
        setTickets((prev) => [...prev, newTicket]);
        savedTicket = newTicket;
        // v28.07.5 / v28.09 — bulk-POST any selected crew to /tickets/:id/crew.
        // AddTicketModal sets ticketData.crewSelection when the user added
        // crew before clicking CREATE TICKET (rather than via autoSaveForJSA
        // which already commits).
        if (Array.isArray(ticketData.crewSelection) && ticketData.crewSelection.length > 0) {
          for (const c of ticketData.crewSelection) {
            try {
              // eslint-disable-next-line no-await-in-loop
              await fetch(`${API_URL}/tickets/${saved.id}/crew`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: c.user_id, is_lead: !!c.is_lead }),
              });
            } catch (crewErr) {
              console.warn("Crew selection member failed:", c.user_name, crewErr);
            }
          }
        }
      }

      // v28.109 — persist a manually-entered site manager as a customer
      // contact so it surfaces in the AddTicketSiteManager dropdown for
      // this customer next time. The ticket-edit path (TicketDetail's
      // saveSiteMgrAsContact) has always done this; the create path never
      // did, so a customer's first site manager was never learned.
      // Fire-and-forget + backend-deduped, exactly like the edit path.
      const smName = [ticketData.siteMgrFirst, ticketData.siteMgrLast].filter(Boolean).join(" ").trim();
      if (smName && ticketData.customerId) {
        fetch(`${API_URL}/customers/${ticketData.customerId}/contacts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: smName,
            phone_work: ticketData.siteMgrPhone || null,
            email: ticketData.siteMgrEmail || null,
            category: "site_rep",
            title: "Site Manager",
          }),
        }).catch(() => {});
      }
    } catch (err) {
      console.error("Ticket save failed:", err);
      showNotice("Save Failed", `Network or server error. Your data is still in the form. ${err.message || err}`, "error");
      return;
    } finally {
      // Release the guard on every exit path — success, HTTP error, or throw —
      // so a legitimate retry after a failure is never blocked.
      submittingRef.current = false;
    }
    // Soft-save (opts.keepOpen) leaves the modal open so the JSA can be filled
    // in against the just-created ticket; normal saves close as before.
    if (!opts.keepOpen) setShowAdd(false);
    return savedTicket;
  };

  return { showAdd, openAdd, closeAdd, handleAdd, initialType };
}
