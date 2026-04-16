import { useState, useMemo, useEffect } from "react";
import { Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";
import { C, API_URL, STATUS_CONFIG, STATUS_ORDER } from "./config.js";
import { useApp } from "./AppContext.jsx";
import BrandedSplash from "./BrandedSplash.jsx";
import { mapTicketFromApi, todoVisible, DEFAULT_PERMS } from "./utils.js";
import { Btn, NavBadge, PipelineSummary, computeJobStatus } from "./SharedUI.jsx";
import { TodoPage } from "./TodoPage.jsx";
import JobCard from "./JobCard.jsx";
import DashboardHome from "./DashboardHome.jsx";
import NewJobModal from "./NewJobModal.jsx";
import InventoryPage from "./InventoryPage.jsx";
import ReportsPage from "./ReportsPage.jsx";
import AllTicketsPage from "./AllTicketsPage.jsx";
import FinalReviewPage from "./FinalReviewPage.jsx";
import CrewPage from "./CrewPage.jsx";
import JobHistoryPage from "./JobHistoryPage.jsx";
import DeletedJobsPage from "./DeletedJobsPage.jsx";
import SettingsModal from "./SettingsModal.jsx";
import PermissionsModal from "./PermissionsModal.jsx";
import EmergencyContactsModal from "./EmergencyContactsModal.jsx";
import CompanyDocumentsModal from "./CompanyDocumentsModal.jsx";
import UsersPage from "./UsersPage.jsx";
import ArchivePage from "./ArchivePage.jsx";
import AssetsPage from "./AssetsPage.jsx";
import SafetyPage from "./SafetyPage.jsx";
import ActivityLogPage from "./ActivityLogPage.jsx";
import ContactsPage from "./ContactsPage.jsx";
import TicketPage from "./TicketPage.jsx";

function FTIDashboard() {
  const { currentUser, logout, customers, userNames, userIdByName, settings, refreshSettings } = useApp();
  const userRole = currentUser.role; // owner | admin | manager | lead | salesman | field
  const isAdmin = ["owner", "admin"].includes(userRole);
  const isManager = ["owner", "admin", "manager", "lead"].includes(userRole);
  const isField = userRole === "field";
  // Permission-based access — reads from user's permissions, falls back to role defaults
  // Owner ALWAYS gets everything regardless of what's in the DB.
  // When DB permissions exist, merge on top of role defaults so new keys get defaults.
  const perms = userRole === "owner"
    ? DEFAULT_PERMS.owner
    : { ...(DEFAULT_PERMS[userRole] || {}), ...(currentUser.permissions || {}) };
  const can = (key) => !!(perms[key]);

  useEffect(() => {
    const id = "fti-mobile-css";
    if (document.getElementById(id)) return;
    const s = document.createElement("style");
    s.id = id;
    s.textContent = `
      @media (max-width: 900px) {
        .fti-desktop-nav { display: none !important; }
        .fti-hamburger { display: flex !important; }
        .fti-dashboard-pad { padding: 16px 12px !important; }
        .fti-dashboard-header { flex-direction: column !important; align-items: flex-start !important; gap: 10px !important; }
        .fti-filter-row { overflow-x: auto !important; flex-wrap: nowrap !important; padding-bottom: 4px !important; -webkit-overflow-scrolling: touch; }
        .fti-job-card-header { grid-template-columns: 80px 1fr auto !important; padding: 10px 12px !important; gap: 8px !important; }
        .fti-job-card-header > div:nth-child(3),
        .fti-job-card-header > div:nth-child(4),
        .fti-job-card-header > div:nth-child(5),
        .fti-job-card-header > div:nth-child(6) { display: none !important; }
      }
      @media (min-width: 901px) {
        .fti-hamburger { display: none !important; }
      }
      .fti-nav-bar {
        padding-top: max(8px, env(safe-area-inset-top));
      }
    `;
    document.head.appendChild(s);
  }, []);
  
  const navigate = useNavigate();
  const location = useLocation();
  // Derive current page from URL path for nav highlighting
  const page = (() => {
    const p = location.pathname;
    if (p === "/" || p === "") return "dashboard";
    if (p.startsWith("/all-tickets")) return "allTickets";
    if (p.startsWith("/job-history")) return "jobHistory";
    if (p.startsWith("/todos")) return "todos";
    if (p.startsWith("/inventory")) return "inventory";
    if (p.startsWith("/assets")) return "assets";
    if (p.startsWith("/crew")) return "crew";
    if (p.startsWith("/safety")) return "safety";
    if (p.startsWith("/activity")) return "activity";
    if (p.startsWith("/contacts")) return "contacts";
    if (p.startsWith("/final-review")) return "finalReview";
    if (p.startsWith("/reports")) return "reports";
    if (p.startsWith("/deleted")) return "deleted";
    if (p.startsWith("/archive")) return "archive";
    if (p.startsWith("/users")) return "users";
    return "dashboard";
  })();
  // Helper: navigate to a named page (used by nav clicks)
  const navigateToPage = (path) => navigate(path);
  const [showPermissions, setShowPermissions] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showEmergencyContacts, setShowEmergencyContacts] = useState(false);
  const [showCompanyDocs, setShowCompanyDocs] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [filterStatus, setFilterStatus] = useState("All");
  const [sortMode, setSortMode] = useState("default"); // "default" = status group + date desc; "customer" = A→Z by customer
  const [showNewJob, setShowNewJob] = useState(false);
  const [loading, setLoading] = useState(true);

  // Page-level state — starts empty, loads from API on mount.
  // App-wide state (users, customers, qbItems, assets, settings) lives in AppContext.
  const [todos, setTodos] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [deletedTickets, setDeletedTickets] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [jsas, setJsas] = useState([]);

  // Load page-level data from API on mount. App-wide data is loaded by AppContext.
  useEffect(() => {
    const load = async () => {
      try {
        const [jobsR, ticketsR, todosR, invR, delTicketsR] = await Promise.all([
          fetch(`${API_URL}/jobs`).then(r => r.json()),
          fetch(`${API_URL}/tickets?include_voided=true`).then(r => r.json()),
          fetch(`${API_URL}/todos`).then(r => r.json()),
          fetch(`${API_URL}/inventory`).then(r => r.json()),
          fetch(`${API_URL}/tickets?include_deleted=true`).then(r => r.json()),
        ]);
        // Transform jobs from API format to app format
        const jobsMapped = (jobsR || []).map(j => ({
          id: j.id,
          customer: j.customer_name,
          customerId: j.customer_id,
          location: j.location || "",
          wells: (j.wells || []).map(w => ({ well_name: w.well_name || w })),
          afe: j.afe || null,
          jobState: j.job_state || "",
          county: j.county || "",
          dateStarted: j.date_started,
          status: j.status,
          crew: (j.crew || []).map(c => ({ name: c.name, role: c.role })),
          equipment: (j.equipment || []).map(e => e.description),
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
        const activeJobIds = new Set(jobsMapped.filter(j => j.status !== "Deleted").map(j => j.id));
        const ticketsMapped = (ticketsR || []).map(mapTicketFromApi)
          .filter(t => !t.archivedAt)
          .filter(t => activeJobIds.has(t.jobId));
        // Transform todos
        const todosMapped = (todosR || []).map(t => ({
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
        const invMapped = (invR || []).map(i => ({
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

  const myActiveTodos = todos.filter(t => todoVisible(t) && !t.completed);

  const pendingByJob = useMemo(() => {
    const map = {};
    todos.filter(t => t.jobId && !t.completed && todoVisible(t)).forEach(t => {
      map[t.jobId] = (map[t.jobId] || 0) + 1;
    });
    return map;
  }, [todos]);

  const navigateToJob = (jobId) => {
    navigate("/");
    setExpandedId(jobId);
  };

  const handleCreateJob = async (newJob) => {
    const cust = customers.find(c => c.name === newJob.customer);
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
      created_by: currentUser?.id || null,
      notes: newJob.notes || null,
      wells: newJob.wells.map(w => ({ well_name: w, afe_number: null })),
      crew: [],
      equipment: newJob.equipment || [],
    };
    try {
      const r = await fetch(`${API_URL}/jobs`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (r.ok) {
        const saved = await r.json();
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
        setJobs(prev => [mappedJob, ...prev]);
        setShowNewJob(false);
        setExpandedId(saved.id);
      }
    } catch (err) { console.error("Create job failed:", err); }
  };

  // Helper to log audit events
  const logAudit = async (action, entityType, entityId, oldValue, newValue, notes) => {
    try {
      await fetch(`${API_URL}/audit`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: currentUser.id, user_name: currentUser.name, action, entity_type: entityType, entity_id: String(entityId), old_value: oldValue, new_value: newValue, notes }),
      });
    } catch (err) { console.error("Audit log failed:", err); }
  };

  const handleDeleteJob = async (jobId) => {
    if (!["owner", "admin", "manager"].includes(currentUser.role)) return;
    const job = jobs.find(j => j.id === jobId);
    try {
      await fetch(`${API_URL}/jobs/${jobId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Deleted" }),
      });
      await logAudit("job_delete", "job", jobId, { status: job?.status, customer: job?.customer }, { status: "Deleted" }, `Work Order #${jobId} deleted by ${currentUser.name}`);
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: "Deleted" } : j));
      setExpandedId(null);
    } catch (err) { console.error("Delete job failed:", err); }
  };

  const handleRestoreJob = async (jobId) => {
    try {
      await fetch(`${API_URL}/jobs/${jobId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Scheduled" }),
      });
      await logAudit("job_restore", "job", jobId, { status: "Deleted" }, { status: "Scheduled" }, `Work Order #${jobId} restored by ${currentUser.name}`);
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: "Scheduled" } : j));
    } catch (err) { console.error("Restore job failed:", err); }
  };

  const handleArchiveJob = async (jobId) => {
    if (!["owner", "admin"].includes(currentUser.role)) return;
    try {
      await fetch(`${API_URL}/archive`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity_type: "job", entity_id: jobId, archived_by: currentUser.id, archive_reason: "deleted" }),
      });
      setJobs(prev => prev.filter(j => j.id !== jobId));
    } catch (err) { console.error("Archive job failed:", err); }
  };

  const handleRestoreTicket = async (ticketId) => {
    try {
      await fetch(`${API_URL}/tickets/${ticketId}/restore`, { method: "POST" });
      const restored = deletedTickets.find(t => t.id === ticketId);
      setDeletedTickets(prev => prev.filter(t => t.id !== ticketId));
      if (restored) setTickets(prev => [...prev, restored]);
    } catch (err) { console.error("Restore ticket failed:", err); }
  };

  const handleArchiveTicket = async (ticketId, reason = "deleted") => {
    if (!["owner", "admin"].includes(currentUser.role)) return;
    try {
      await fetch(`${API_URL}/archive`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity_type: "ticket", entity_id: ticketId, archived_by: currentUser.id, archive_reason: reason }),
      });
      setDeletedTickets(prev => prev.filter(t => t.id !== ticketId));
      setTickets(prev => prev.filter(t => t.id !== ticketId));
    } catch (err) { console.error("Archive ticket failed:", err); }
  };

  const handleFlagCancel = async (jobId) => {
    const job = jobs.find(j => j.id === jobId);
    try {
      await fetch(`${API_URL}/jobs/${jobId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "flaggedCancel" }),
      });
      await logAudit("job_flag_cancel", "job", jobId, { status: job?.status }, { status: "flaggedCancel" }, `Work Order #${jobId} flagged for cancellation by ${currentUser.name}`);
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: "flaggedCancel" } : j));
    } catch (err) { console.error("Flag cancel failed:", err); }
  };

  const handleUpdateJob = async (id, updates) => {
    const oldJob = jobs.find(j => j.id === id);
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
        const cust = customers.find(c => c.name === updates.customer);
        if (cust) payload.customer_id = cust.id;
      }
      if (updates.wells) {
        payload.wells = updates.wells.map(w =>
          typeof w === "string" ? { well_name: w } : w
        );
      }
      if (updates.crew) payload.crew = updates.crew.map(c => ({ name: c.name, role: c.role, user_id: userIdByName[c.name] || null }));
      await fetch(`${API_URL}/jobs/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      await logAudit("job_edit", "job", id, { customer: oldJob?.customer, status: oldJob?.status }, updates, `Work Order #${id} edited by ${currentUser.name}`);
    } catch (err) { console.error("Job update failed:", err); }
    setJobs(prev => prev.map(j => j.id === id ? { ...j, ...updates } : j));
  };

  const activeJobs = jobs.filter(j => j.status !== "Deleted");
  const deletedJobs = jobs.filter(j => j.status === "Deleted");
  const jobWithComputedStatus = activeJobs.map(j => ({ ...j, _computedStatus: computeJobStatus(j, tickets.filter(t => t.jobId === j.id)) }));
  const filteredJobs = filterStatus === "All" ? jobWithComputedStatus : jobWithComputedStatus.filter(j => j._computedStatus === filterStatus);
  const sortedJobs = [...filteredJobs].sort((a, b) => {
    if (sortMode === "customer") {
      // Sort purely by customer name A→Z (cross-status), tiebreak on WO ID desc (newest WO# first within customer).
      const cust = (a.customer || "").localeCompare(b.customer || "");
      if (cust !== 0) return cust;
      return (b.id || 0) - (a.id || 0);
    }
    // Default: status group (Scheduled → In Progress → Completed) then scheduled date desc.
    const statusDiff = STATUS_ORDER.indexOf(a._computedStatus) - STATUS_ORDER.indexOf(b._computedStatus);
    if (statusDiff !== 0) return statusDiff;
    return (b.dateStarted || "").localeCompare(a.dateStarted || "");
  });

  const totalOut = inventory.reduce((s, i) => s + (i.qtyOwned - i.inYard), 0);

  const ALL_NAV_ITEMS = ["All Tickets", "Work Order History", "Action Items", "Inventory", "Assets", "Crew", "Safety", "Final Review", "Reports", "Deleted", "Archive", "Users"];
  const NAV_ITEMS = ALL_NAV_ITEMS.filter(i => {
    if (i === "Inventory" && !can("view_inventory")) return false;
    if (i === "Assets" && !can("view_inventory")) return false;
    if (i === "Users" && !can("manage_users")) return false;
    if (i === "Work Order History" && !can("view_jobs")) return false;
    if (i === "Deleted" && !can("delete_jobs")) return false;
    if (i === "Archive" && !can("view_archive")) return false;
    if (i === "Final Review" && !can("approve_tickets")) return false;
    if (i === "Reports" && !can("view_reports")) return false;
    return true;
  });

  if (loading) return <BrandedSplash />;

  return (
    <div style={{ minHeight: "100vh", background: C.pageBg, color: C.text, fontFamily: "'Arial', sans-serif" }}>
      {/* MOBILE HAMBURGER */}
      <div className="fti-hamburger" onClick={() => setDrawerOpen(true)} style={{
        position: "fixed", bottom: 24, right: 20, zIndex: 1000,
        width: 52, height: 52, borderRadius: "50%", background: C.red,
        boxShadow: "0 4px 16px #00000044", cursor: "pointer",
        flexDirection: "column", gap: 5, alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ width: 22, height: 2, background: C.white, borderRadius: 2 }} />
        <div style={{ width: 22, height: 2, background: C.white, borderRadius: 2 }} />
        <div style={{ width: 22, height: 2, background: C.white, borderRadius: 2 }} />
      </div>

      {/* MOBILE DRAWER BACKDROP */}
      {drawerOpen && <div onClick={() => setDrawerOpen(false)} style={{ position: "fixed", inset: 0, background: "#00000066", zIndex: 1001 }} />}

      {/* MOBILE DRAWER */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 1002,
        background: C.darkBlue, borderTop: `3px solid ${C.red}`,
        borderRadius: "16px 16px 0 0",
        transform: drawerOpen ? "translateY(0)" : "translateY(100%)",
        transition: "transform 0.3s ease",
        padding: "20px 0 40px", maxHeight: "80vh", overflowY: "auto",
      }}>
        <div style={{ width: 40, height: 4, background: "#ffffff33", borderRadius: 2, margin: "0 auto 20px" }} />
        <div style={{ padding: "0 20px 16px", borderBottom: `1px solid #ffffff22`, marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: C.red, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: C.white }}>
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.white }}>{currentUser.name}</div>
              <div style={{ fontSize: 11, color: "#a0aec8", textTransform: "uppercase", letterSpacing: "0.08em" }}>{currentUser.role}</div>
            </div>
          </div>
        </div>
        <div onClick={() => { navigate("/"); setDrawerOpen(false); }} style={{
          display: "flex", alignItems: "center", gap: 14, padding: "14px 24px",
          background: page === "dashboard" ? "#ffffff11" : "transparent",
          borderLeft: page === "dashboard" ? `3px solid ${C.red}` : "3px solid transparent",
          cursor: "pointer",
        }}>
          <span style={{ fontSize: 18, width: 24, textAlign: "center" }}>⌂</span>
          <span style={{ fontSize: 15, fontWeight: page === "dashboard" ? 700 : 400, color: page === "dashboard" ? C.white : "#b0bdd4" }}>Dashboard</span>
        </div>
        {NAV_ITEMS.map(item => {
          const pageMap = { Dashboard: "dashboard", "All Tickets": "allTickets", "Work Order History": "jobHistory", "Action Items": "todos", Inventory: "inventory", Assets: "assets", Crew: "crew", Safety: "safety", "Final Review": "finalReview", Reports: "reports", Deleted: "deleted", Archive: "archive", Users: "users" };
          const routeMap = { Dashboard: "/", "All Tickets": "/all-tickets", "Work Order History": "/job-history", "Action Items": "/todos", Inventory: "/inventory", Assets: "/assets", Crew: "/crew", Safety: "/safety", "Final Review": "/final-review", Reports: "/reports", Deleted: "/deleted", Archive: "/archive", Users: "/users" };
          const navIcons = { Dashboard: "⌂", "All Tickets": "🎫", "Work Order History": "📋", "Action Items": "✓", Inventory: "📦", Assets: "🚛", Crew: "👷", Safety: "🛡", "Final Review": "✅", Reports: "📊", Deleted: "🗑", Archive: "📁", Users: "👤" };
          if (item === "Users" && !isManager) return null;
          if (item === "Work Order History" && isField) return null;
          if (item === "Deleted" && !["owner", "admin", "manager"].includes(currentUser.role)) return null;
          const active = pageMap[item] === page;
          return (
            <div key={item} onClick={() => { navigate(routeMap[item]); setDrawerOpen(false); }} style={{
              display: "flex", alignItems: "center", gap: 14, padding: "14px 24px",
              background: active ? "#ffffff11" : "transparent",
              borderLeft: active ? `3px solid ${C.red}` : "3px solid transparent",
              cursor: "pointer",
            }}>
              <span style={{ fontSize: 18, width: 24, textAlign: "center" }}>{navIcons[item]}</span>
              <span style={{ fontSize: 15, fontWeight: active ? 700 : 400, color: active ? C.white : "#b0bdd4" }}>
                {item}
                {item === "Action Items" && myActiveTodos.length > 0 && <span style={{ marginLeft: 8, background: C.red, color: C.white, borderRadius: 10, padding: "1px 7px", fontSize: 11, fontWeight: 800 }}>{myActiveTodos.length}</span>}
                {item === "Deleted" && (deletedJobs.length + deletedTickets.length) > 0 && <span style={{ marginLeft: 8, background: "#ffffff33", color: C.white, borderRadius: 10, padding: "1px 7px", fontSize: 11 }}>{deletedJobs.length + deletedTickets.length}</span>}
              </span>
            </div>
          );
        })}
        {can("manage_users") && (
          <div onClick={() => { setDrawerOpen(false); setShowPermissions(true); }} style={{
            display: "flex", alignItems: "center", gap: 14, padding: "14px 24px", cursor: "pointer",
          }}>
            <span style={{ fontSize: 18, width: 24, textAlign: "center" }}>⚙</span>
            <span style={{ fontSize: 15, color: "#a0aec8", fontWeight: 700 }}>Permissions</span>
          </div>
        )}
        {currentUser.role === "owner" && (
          <div onClick={() => { setDrawerOpen(false); setShowSettings(true); }} style={{
            display: "flex", alignItems: "center", gap: 14, padding: "14px 24px", cursor: "pointer",
          }}>
            <span style={{ fontSize: 18, width: 24, textAlign: "center" }}>⚙</span>
            <span style={{ fontSize: 15, color: "#a0aec8", fontWeight: 700 }}>Yard Locations</span>
          </div>
        )}
        {currentUser.role === "owner" && (
          <div onClick={() => { setDrawerOpen(false); setShowEmergencyContacts(true); }} style={{
            display: "flex", alignItems: "center", gap: 14, padding: "14px 24px", cursor: "pointer",
          }}>
            <span style={{ fontSize: 18, width: 24, textAlign: "center" }}>🚨</span>
            <span style={{ fontSize: 15, color: "#a0aec8", fontWeight: 700 }}>Emergency Information</span>
          </div>
        )}
        <div onClick={() => { setDrawerOpen(false); navigate("/contacts"); }} style={{
          display: "flex", alignItems: "center", gap: 14, padding: "14px 24px", cursor: "pointer",
        }}>
          <span style={{ fontSize: 18, width: 24, textAlign: "center" }}>👤</span>
          <span style={{ fontSize: 15, color: "#a0aec8", fontWeight: 700 }}>Contacts</span>
        </div>
        <div onClick={() => { setDrawerOpen(false); setShowCompanyDocs(true); }} style={{
          display: "flex", alignItems: "center", gap: 14, padding: "14px 24px", cursor: "pointer",
        }}>
          <span style={{ fontSize: 18, width: 24, textAlign: "center" }}>📁</span>
          <span style={{ fontSize: 15, color: "#a0aec8", fontWeight: 700 }}>Field Resources</span>
        </div>
        {can("view_activity_log") && (
          <div onClick={() => { setDrawerOpen(false); navigate("/activity"); }} style={{
            display: "flex", alignItems: "center", gap: 14, padding: "14px 24px", cursor: "pointer",
          }}>
            <span style={{ fontSize: 18, width: 24, textAlign: "center" }}>📋</span>
            <span style={{ fontSize: 15, color: "#a0aec8", fontWeight: 700 }}>Activity Log</span>
          </div>
        )}
        <div onClick={() => { setDrawerOpen(false); setShowLogoutConfirm(true); }} style={{
          display: "flex", alignItems: "center", gap: 14, padding: "14px 24px",
          borderTop: `1px solid #ffffff22`, marginTop: 8, cursor: "pointer",
        }}>
          <span style={{ fontSize: 18, width: 24, textAlign: "center" }}>⏻</span>
          <span style={{ fontSize: 15, color: C.red, fontWeight: 700 }}>Sign Out</span>
        </div>
      </div>

      {/* NAV — desktop */}
      <div className="fti-nav-bar" style={{
        background: C.darkBlue, borderBottom: `2px solid ${C.red}`,
        padding: "0 28px", display: "flex", alignItems: "center",
        justifyContent: "space-between", minHeight: 56,
      }}>
        <div
          onClick={() => navigate("/")}
          onMouseEnter={e => { e.currentTarget.style.opacity = "0.85"; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
          style={{ display: "flex", alignItems: "center", gap: 16, cursor: "pointer", transition: "opacity 0.15s", userSelect: "none" }}
          title="Go to Dashboard"
        >
          <div style={{
            width: 36, height: 36, border: `2px solid ${C.red}`, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: C.blue, fontSize: 13, fontWeight: 900, color: C.white,
            boxShadow: `0 0 12px ${C.red}44`,
          }}>FTI</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.12em", color: C.white }}>FLO-TEST INC.</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#a0aec8", letterSpacing: "0.12em" }}>OPERATIONS DASHBOARD <span style={{ color: C.red }}>v27.47</span></div>
          </div>
        </div>
        <div className="fti-desktop-nav" style={{ display: "flex", gap: 20, alignItems: "center" }}>
          {NAV_ITEMS.map(item => {
            const pageMap = { Dashboard: "dashboard", "All Tickets": "allTickets", "Work Order History": "jobHistory", "Action Items": "todos", Inventory: "inventory", Assets: "assets", Crew: "crew", Safety: "safety", "Final Review": "finalReview", Reports: "reports", Deleted: "deleted", Archive: "archive", Users: "users" };
            const routeMap = { Dashboard: "/", "All Tickets": "/all-tickets", "Work Order History": "/job-history", "Action Items": "/todos", Inventory: "/inventory", Assets: "/assets", Crew: "/crew", Safety: "/safety", "Final Review": "/final-review", Reports: "/reports", Deleted: "/deleted", Archive: "/archive", Users: "/users" };
            const active = pageMap[item] === page;
            const clickable = !!pageMap[item];
            return (
              <span key={item} onClick={() => { if (clickable) navigate(routeMap[item]); }} style={{
                fontSize: 13, color: active ? C.white : clickable ? "#b0bdd4" : "#6b7a99",
                letterSpacing: "0.08em", cursor: clickable ? "pointer" : "default",
                borderBottom: active ? `2px solid ${C.red}` : "2px solid transparent",
                paddingBottom: 4, fontWeight: active ? 700 : 600,
                display: "flex", alignItems: "center",
              }}>
                {item}
                {item === "Action Items" && <NavBadge count={myActiveTodos.length} />}
                {item === "Inventory" && totalOut > 0 && <NavBadge count={totalOut} />}
                {item === "Deleted" && (deletedJobs.length + deletedTickets.length) > 0 && <NavBadge count={deletedJobs.length + deletedTickets.length} />}
              </span>
            );
          })}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {(can("manage_users") || currentUser.role === "owner") && (
              <div style={{ position: "relative" }}>
                <span onClick={() => setShowSettingsMenu(v => !v)}
                  style={{ fontSize: 18, color: showSettingsMenu ? C.white : "#a0aec8", cursor: "pointer", lineHeight: 1, userSelect: "none" }}
                  title="Settings">⚙</span>
                {showSettingsMenu && (
                  <>
                    {/* Click-outside backdrop */}
                    <div style={{ position: "fixed", inset: 0, zIndex: 299 }} onClick={() => setShowSettingsMenu(false)} />
                    <div style={{
                      position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 300,
                      background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 6,
                      boxShadow: "0 4px 16px #00000033", minWidth: 160, overflow: "hidden",
                    }}>
                      {can("manage_users") && (
                        <div onClick={() => { setShowSettingsMenu(false); setShowPermissions(true); }}
                          style={{ padding: "10px 16px", fontSize: 13, fontWeight: 600, color: C.text, cursor: "pointer" }}
                          onMouseEnter={e => e.currentTarget.style.background = C.steel}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                          Permissions
                        </div>
                      )}
                      {currentUser.role === "owner" && (
                        <div onClick={() => { setShowSettingsMenu(false); setShowSettings(true); }}
                          style={{ padding: "10px 16px", fontSize: 13, fontWeight: 600, color: C.text, cursor: "pointer", borderTop: `1px solid ${C.border}` }}
                          onMouseEnter={e => e.currentTarget.style.background = C.steel}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                          Yard Locations
                        </div>
                      )}
                      {currentUser.role === "owner" && (
                        <div onClick={() => { setShowSettingsMenu(false); setShowEmergencyContacts(true); }}
                          style={{ padding: "10px 16px", fontSize: 13, fontWeight: 600, color: C.text, cursor: "pointer", borderTop: `1px solid ${C.border}` }}
                          onMouseEnter={e => e.currentTarget.style.background = C.steel}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                          Emergency Information
                        </div>
                      )}
                      <div onClick={() => { setShowSettingsMenu(false); navigate("/contacts"); }}
                        style={{ padding: "10px 16px", fontSize: 13, fontWeight: 600, color: C.text, cursor: "pointer", borderTop: `1px solid ${C.border}` }}
                        onMouseEnter={e => e.currentTarget.style.background = C.steel}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        Contacts
                      </div>
                      <div onClick={() => { setShowSettingsMenu(false); setShowCompanyDocs(true); }}
                        style={{ padding: "10px 16px", fontSize: 13, fontWeight: 600, color: C.text, cursor: "pointer", borderTop: `1px solid ${C.border}` }}
                        onMouseEnter={e => e.currentTarget.style.background = C.steel}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        Field Resources
                      </div>
                      {can("view_activity_log") && (
                        <div onClick={() => { setShowSettingsMenu(false); navigate("/activity"); }}
                          style={{ padding: "10px 16px", fontSize: 13, fontWeight: 600, color: C.text, cursor: "pointer", borderTop: `1px solid ${C.border}` }}
                          onMouseEnter={e => e.currentTarget.style.background = C.steel}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                          Activity Log
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
            <span onClick={() => setShowLogoutConfirm(true)} style={{ fontSize: 11, color: "#a0aec8", cursor: "pointer", letterSpacing: "0.06em" }}>SIGN OUT</span>
            <div onClick={() => setShowLogoutConfirm(true)} style={{
              width: 30, height: 30, borderRadius: "50%", background: C.red,
              border: `2px solid #ffffff55`, display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 13, fontWeight: 800, cursor: "pointer", color: C.white,
            }}>{currentUser.name.charAt(0).toUpperCase()}</div>
          </div>
        </div>
      </div>

      {/* PAGES — routed */}
      <Routes>
        <Route path="/" element={
          <DashboardHome
            jobs={jobs}
            activeJobs={activeJobs}
            sortedJobs={sortedJobs}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            sortMode={sortMode}
            setSortMode={setSortMode}
            myActiveTodos={myActiveTodos}
            tickets={tickets}
            setTickets={setTickets}
            todos={todos}
            setTodos={setTodos}
            expandedId={expandedId}
            setExpandedId={setExpandedId}
            pendingByJob={pendingByJob}
            navigateToJob={navigateToJob}
            navigateToPage={navigateToPage}
            setShowNewJob={setShowNewJob}
            handleUpdateJob={handleUpdateJob}
            handleDeleteJob={handleDeleteJob}
            handleFlagCancel={handleFlagCancel}
            setDeletedTickets={setDeletedTickets}
            jsas={jsas}
            setJsas={setJsas}
          />
        } />
        <Route path="/all-tickets" element={<AllTicketsPage tickets={tickets} setTickets={setTickets} jobs={jobs} />} />
        <Route path="/todos" element={<TodoPage todos={todos} setTodos={setTodos} jobs={jobs} onNavigateJob={navigateToJob} userNames={userNames} userIdByName={userIdByName} />} />
        {can("view_jobs") && <Route path="/job-history" element={<JobHistoryPage jobs={jobs} onNavigateJob={navigateToJob} />} />}
        <Route path="/crew" element={<CrewPage jobs={jobs} />} />
        <Route path="/safety" element={<SafetyPage />} />
        <Route path="/ticket/:id" element={<TicketPage jobs={jobs} tickets={tickets} setTickets={setTickets} />} />
        {can("view_activity_log") && <Route path="/activity" element={<ActivityLogPage />} />}
        <Route path="/contacts" element={<ContactsPage />} />
        {can("approve_tickets") && <Route path="/final-review" element={<FinalReviewPage jobs={jobs} tickets={tickets} setTickets={setTickets} />} />}
        {can("view_reports") && <Route path="/reports" element={<ReportsPage jobs={jobs} tickets={tickets} inventory={inventory} />} />}
        {can("view_inventory") && <Route path="/inventory" element={<InventoryPage inventory={inventory} setInventory={setInventory} jobs={jobs} />} />}
        {can("view_inventory") && <Route path="/assets" element={<AssetsPage jobs={jobs} />} />}
        {can("delete_jobs") && <Route path="/deleted" element={<DeletedJobsPage deletedJobs={deletedJobs} deletedTickets={deletedTickets} jobs={jobs} handleRestoreJob={handleRestoreJob} handleArchiveJob={handleArchiveJob} handleRestoreTicket={handleRestoreTicket} handleArchiveTicket={handleArchiveTicket} />} />}
        {can("view_archive") && <Route path="/archive" element={<ArchivePage />} />}
        {can("manage_users") && <Route path="/users" element={<UsersPage isAdmin={isAdmin} />} />}
        {/* Catch-all — redirect to dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* NEW WORK ORDER MODAL */}
      {showNewJob && (
        <NewJobModal onClose={() => setShowNewJob(false)} onCreateJob={handleCreateJob} />
      )}
      {showPermissions && (
        <PermissionsModal onClose={() => setShowPermissions(false)} />
      )}
      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
      {showEmergencyContacts && (
        <EmergencyContactsModal onClose={() => setShowEmergencyContacts(false)} />
      )}
      {showCompanyDocs && (
        <CompanyDocumentsModal onClose={() => setShowCompanyDocs(false)} />
      )}
      {showLogoutConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300 }} onClick={() => setShowLogoutConfirm(false)}>
          <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderTop: `4px solid ${C.red}`, borderRadius: 8, padding: 28, width: 380, maxWidth: "90vw" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 10 }}>Sign Out?</div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 24, lineHeight: 1.6 }}>
              You will be signed out and returned to the login screen.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn onClick={logout}>SIGN OUT</Btn>
              <Btn variant="ghost" onClick={() => setShowLogoutConfirm(false)}>CANCEL</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── APP WRAPPER (auth routing) ────────────────────────────────────────────

export default FTIDashboard;
