import { useState, useEffect } from "react";
import { API_URL } from "./config.js";
import { mapTicketFromApi } from "./utils.js";

// ─── usePageData (v28.05) ───────────────────────────────────────────────────
// Page-level data loader for the FTIDashboard. Handles the initial Promise.all
// fetch of jobs / tickets / todos / inventory / deletedTickets on mount,
// plus the row-shape transforms that reshape API payloads into the format the
// rest of the app expects.
//
// App-wide data (users, customers, qbItems, assets, settings, roles) is loaded
// by AppContext — that's intentional separation. This hook owns only the
// dashboard-page-specific datasets.
//
// Returns the state values, the setters (so action handlers can mutate
// optimistically), and `loading` + `refreshDeletedTickets`. JSAs state is also
// returned but starts empty — the dashboard tracks JSA loading separately
// from this initial fetch.
//
// Article XXV split intent: the 98-line load useEffect + transforms previously
// lived inline in FTIDashboard.jsx. Extracting it removes a major source of
// noise from the dashboard component without changing any data shapes.
export function usePageData() {
  const [todos, setTodos] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [deletedTickets, setDeletedTickets] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [jsas, setJsas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [jobsR, ticketsR, todosR, invR, delTicketsR] = await Promise.all([
          fetch(`${API_URL}/jobs`).then((r) => r.json()),
          fetch(`${API_URL}/tickets?include_voided=true`).then((r) => r.json()),
          fetch(`${API_URL}/todos`).then((r) => r.json()),
          // r.ok-guarded: GET /api/inventory is permission-gated (view_inventory,
          // backend Pass 2b). A 403 here must NOT throw — without the guard the
          // 403 body parses as JSON and the inventory transform .map() throws,
          // aborting this whole Promise.all load and blanking the dashboard for
          // field/salesman. Fall back to [] — they simply have no inventory.
          fetch(`${API_URL}/inventory`).then((r) => (r.ok ? r.json() : [])),
          fetch(`${API_URL}/tickets?include_deleted=true`).then((r) => r.json()),
        ]);
        // Transform jobs from API format to app format
        const jobsMapped = (jobsR || []).map((j) => ({
          id: j.id,
          customer: j.customer_name,
          customerId: j.customer_id,
          location: j.location || "",
          wells: (j.wells || []).map((w) => ({ well_name: w.well_name || w })),
          afe: j.afe || null,
          jobState: j.job_state || "",
          county: j.county || "",
          dateStarted: j.date_started,
          status: j.status,
          crew: (j.crew || []).map((c) => ({ name: c.name, role: c.role })),
          equipment: (j.equipment || []).map((e) => e.description),
          hoursLogged: Number(j.hours_logged) || 0,
          estimatedCost: Number(j.estimated_cost) || 0,
          jsaComplete: j.jsa_complete,
          notes: j.notes,
          contactFirst: j.contact_first || "",
          contactLast: j.contact_last || "",
          pocPhone: j.poc_phone || "",
          pocEmail: j.poc_email || "",
          approver: j.approver || "",
          approverLast: j.approver_last || "",
          approverPhone: j.approver_phone || "",
          approverEmail: j.approver_email || "",
          companyCode: j.company_code || "",
          costCenter: j.cost_center || "",
          po: j.po_number || "",
          salesman: j.salesman || "",
          googlePin: j.google_pin || "",
          pinLat: j.pin_lat || null,
          pinLng: j.pin_lng || null,
          createdBy: j.created_by_name || null,
          createdAt: j.created_at || null,
        }));
        // Transform tickets — only include tickets whose parent work order is active
        const activeJobIds = new Set(jobsMapped.filter((j) => j.status !== "Deleted").map((j) => j.id));
        const ticketsMapped = (ticketsR || [])
          .map(mapTicketFromApi)
          .filter((t) => !t.archivedAt)
          .filter((t) => activeJobIds.has(t.jobId));
        // Transform todos
        const todosMapped = (todosR || []).map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          jobId: t.job_id,
          priority: t.priority,
          dueDate: t.due_date,
          createdBy: t.created_by_name || t.created_by,
          assignedTo: t.assigned_to_name || t.assigned_to,
          createdById: t.created_by,
          assignedToId: t.assigned_to,
          completed: t.completed,
          completedBy: t.completed_by_name || t.completed_by,
          completedAt: t.completed_at,
        }));
        // Transform inventory
        const invMapped = (invR || []).map((i) => ({
          id: i.id,
          size: i.size,
          category: i.category,
          item: i.item,
          psi: i.psi,
          itemNum: i.item_number,
          serial: i.serial_number,
          qtyOwned: i.qty_owned,
          inYard: i.in_yard,
          customer: i.customer,
          fieldTicket: i.field_ticket,
          notes: i.notes,
        }));
        setJobs(jobsMapped);
        setTickets(ticketsMapped);
        setDeletedTickets((delTicketsR || []).map(mapTicketFromApi));
        setTodos(todosMapped);
        setInventory(invMapped);

        // Trigger rental cycle check on load
        fetch(`${API_URL}/tickets/check-cycles`, { method: "POST" }).catch(() => {});
      } catch (err) {
        console.error("Failed to load data:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Refresh deleted tickets from the backend after a cascade op. The active
  // tickets state is already correct for the dashboard — deleted_at != null
  // tickets are filtered out by the backend's GET /tickets default.
  const refreshDeletedTickets = async () => {
    try {
      const r = await fetch(`${API_URL}/tickets?include_deleted=true`);
      if (r.ok) {
        const data = await r.json();
        setDeletedTickets(data.map(mapTicketFromApi));
      }
    } catch (err) {
      console.error("Deleted tickets refresh failed:", err);
    }
  };

  return {
    jobs,
    setJobs,
    tickets,
    setTickets,
    deletedTickets,
    setDeletedTickets,
    todos,
    setTodos,
    inventory,
    setInventory,
    jsas,
    setJsas,
    loading,
    refreshDeletedTickets,
  };
}
