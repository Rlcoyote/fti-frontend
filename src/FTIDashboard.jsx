import { useState, useMemo, useEffect } from "react";
import { Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";
import { C } from "./config.js";
import { useApp } from "./AppContext.jsx";
import BrandedSplash from "./BrandedSplash.jsx";
import { todoVisible, DEFAULT_PERMS } from "./utils.js";
import { Btn } from "./SharedUI.jsx";
import { TodoPage } from "./TodoPage.jsx";
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
// v28.17 — PermissionsModal, UsersPage, EmployeesPage all consolidated
// into PeoplePage (one canonical surface for all person-management).
import PeoplePage from "./PeoplePage.jsx";
import EmergencyContactsModal from "./EmergencyContactsModal.jsx";
import CompanyDocumentsModal from "./CompanyDocumentsModal.jsx";
import JobTitlesPage from "./JobTitlesPage.jsx";
import ArchivePage from "./ArchivePage.jsx";
import AssetsPage from "./AssetsPage.jsx";
import SafetyPage from "./SafetyPage.jsx";
import ActivityLogPage from "./ActivityLogPage.jsx";
import ContactsPage from "./ContactsPage.jsx";
import TicketPage from "./TicketPage.jsx";
import MobileNavDrawer from "./MobileNavDrawer.jsx";
import DesktopNavBar from "./DesktopNavBar.jsx";
import { usePageData } from "./usePageData.js";
import { useJobActions } from "./useJobActions.js";

// ─── FTIDashboard (v28.05) ──────────────────────────────────────────────────
// Top-level shell post-login. Owns:
//   - Permission resolution (role → defaults + DB-stored permissions overlay)
//   - Mobile vs desktop CSS (one-time injection on mount)
//   - URL-derived `page` string used by both nav bars to highlight active item
//   - Modal-open booleans (Permissions, Settings, EmergencyContacts, etc.)
//   - Dashboard sort + filter state
//   - The route table that maps URL path → page component
//
// Delegates:
//   - Page-level data state (jobs, tickets, todos, inventory, etc.) → usePageData()
//   - Job/ticket CRUD handlers → useJobActions()
//   - Mobile bottom-sheet navigation → <MobileNavDrawer>
//   - Top desktop navigation + gear menu + sign-out → <DesktopNavBar>
//
// v28.04 split landed here: 830 → ~290 lines (-65%). The dashboard now reads
// as a coordination layer over the four delegates above. Add a new page,
// modal, or filter — change one of these surfaces, not all of them.

const VERSION = "v28.51";

function FTIDashboard() {
  const { currentUser, logout, customers, userNames, userIdByName } = useApp();
  const userRole = currentUser.role; // owner | admin | manager | lead | salesman | field
  const isAdmin = ["owner", "admin"].includes(userRole);
  const isManager = ["owner", "admin", "manager", "lead"].includes(userRole);
  const isField = userRole === "field";
  // Permission-based access — reads from user's permissions, falls back to role defaults.
  // Owner ALWAYS gets everything regardless of what's in the DB.
  // When DB permissions exist, merge on top of role defaults so new keys get defaults.
  const perms = userRole === "owner"
    ? DEFAULT_PERMS.owner
    : { ...(DEFAULT_PERMS[userRole] || {}), ...(currentUser.permissions || {}) };
  const can = (key) => !!(perms[key]);

  // ── One-time mobile CSS injection ──
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

  // ── URL-driven page string for nav highlighting ──
  const navigate = useNavigate();
  const location = useLocation();
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
    if (p.startsWith("/people")) return "people";
    if (p.startsWith("/users")) return "people";       // v28.17 alias for legacy bookmarks
    if (p.startsWith("/employees")) return "people";   // v28.17 alias for legacy bookmarks
    return "dashboard";
  })();
  const navigateToPage = (path) => navigate(path);

  // ── UI state ──
  // v28.17 — showPermissions removed; the permissions matrix is now a tab
  // inside PeoplePage instead of a standalone modal.
  const [showSettings, setShowSettings] = useState(false);
  const [showEmergencyContacts, setShowEmergencyContacts] = useState(false);
  const [showCompanyDocs, setShowCompanyDocs] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [sortMode, setSortMode] = useState("scheduled"); // "scheduled" = scheduled date ASC, WO# DESC tiebreak; "ticket" = WO# DESC; "customer" = customer A→Z, WO# DESC tiebreak
  const [showNewJob, setShowNewJob] = useState(false);

  // ── Page-level data (jobs, tickets, todos, inventory, deletedTickets, jsas) ──
  const {
    jobs, setJobs,
    tickets, setTickets,
    deletedTickets, setDeletedTickets,
    todos, setTodos,
    inventory, setInventory,
    jsas, setJsas,
    loading,
    refreshDeletedTickets,
  } = usePageData();

  // ── Job/ticket CRUD action callbacks ──
  const {
    handleCreateJob,
    handleDeleteJob,
    handleRestoreJob,
    handleArchiveJob,
    handleCloseJob,
    handleRestoreTicket,
    handleArchiveTicket,
    handleFlagCancel,
    handleUpdateJob,
  } = useJobActions({
    jobs, setJobs,
    setTickets,
    deletedTickets, setDeletedTickets,
    refreshDeletedTickets,
    setExpandedId,
    currentUser,
    customers,
    userIdByName,
    setShowNewJob,
  });

  // ── Derived state for dashboard list rendering + nav badges ──
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

  // v28.40 — Active dashboard now excludes Completed (closed-out) WOs in
  // addition to Deleted. Closed WOs live in /archive (handleCloseJob writes
  // archive_reason="job_closed" and removes from local state). The 3-tier
  // SCHEDULED/IN PROGRESS/COMPLETED filter on the dashboard is gone — see
  // CAM Article III Amendment 2 evaluation in the v28.40 commit.
  const activeJobs = jobs.filter(j => j.status !== "Deleted" && j.status !== "Completed");
  const deletedJobs = jobs.filter(j => j.status === "Deleted");
  const sortedJobs = [...activeJobs].sort((a, b) => {
    if (sortMode === "ticket") {
      return (b.id || 0) - (a.id || 0);
    }
    if (sortMode === "customer") {
      const cust = (a.customer || "").localeCompare(b.customer || "");
      if (cust !== 0) return cust;
      return (b.id || 0) - (a.id || 0);
    }
    // "scheduled" (default): soonest scheduled date first; unscheduled jobs sink to the bottom; WO# DESC on ties.
    const aDate = a.dateStarted || "9999-99-99";
    const bDate = b.dateStarted || "9999-99-99";
    const dateDiff = aDate.localeCompare(bDate);
    if (dateDiff !== 0) return dateDiff;
    return (b.id || 0) - (a.id || 0);
  });

  const totalOut = inventory.reduce((s, i) => s + (i.qtyOwned - i.inYard), 0);

  // v28.19 — "Users" removed from the top nav. People management is
  // admin-cadence work and lives in the gear menu only ("People" → /people).
  const ALL_NAV_ITEMS = ["All Tickets", "Work Order History", "Action Items", "Inventory", "Assets", "Crew", "Safety", "Final Review", "Reports", "Deleted", "Archive"];
  const NAV_ITEMS = ALL_NAV_ITEMS.filter(i => {
    if (i === "Inventory" && !can("view_inventory")) return false;
    if (i === "Assets" && !can("view_inventory")) return false;
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
      {/* MOBILE HAMBURGER (floating button bottom-right) */}
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

      {/* MOBILE BOTTOM-SHEET DRAWER */}
      <MobileNavDrawer
        drawerOpen={drawerOpen}
        setDrawerOpen={setDrawerOpen}
        page={page}
        navigate={navigate}
        navItems={NAV_ITEMS}
        currentUser={currentUser}
        isManager={isManager}
        isField={isField}
        can={can}
        myActiveTodosCount={myActiveTodos.length}
        deletedTotalCount={deletedJobs.length + deletedTickets.length}
        setShowSettings={setShowSettings}
        setShowEmergencyContacts={setShowEmergencyContacts}
        setShowCompanyDocs={setShowCompanyDocs}
        setShowLogoutConfirm={setShowLogoutConfirm}
      />

      {/* DESKTOP NAV BAR */}
      <DesktopNavBar
        page={page}
        navigate={navigate}
        navItems={NAV_ITEMS}
        currentUser={currentUser}
        can={can}
        myActiveTodosCount={myActiveTodos.length}
        totalInventoryOut={totalOut}
        deletedTotalCount={deletedJobs.length + deletedTickets.length}
        showSettingsMenu={showSettingsMenu}
        setShowSettingsMenu={setShowSettingsMenu}
        setShowSettings={setShowSettings}
        setShowEmergencyContacts={setShowEmergencyContacts}
        setShowCompanyDocs={setShowCompanyDocs}
        setShowLogoutConfirm={setShowLogoutConfirm}
        version={VERSION}
      />

      {/* PAGES — routed */}
      <Routes>
        <Route path="/" element={
          <DashboardHome
            jobs={jobs}
            activeJobs={activeJobs}
            sortedJobs={sortedJobs}
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
            handleCloseJob={handleCloseJob}
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
        {/* v28.17 — One canonical /people route. /users and /employees
            redirect for legacy bookmark compatibility. */}
        {can("manage_users") && <Route path="/people" element={<PeoplePage />} />}
        {can("manage_users") && <Route path="/users" element={<Navigate to="/people" replace />} />}
        {can("manage_users") && <Route path="/employees" element={<Navigate to="/people" replace />} />}
        {can("manage_users") && <Route path="/job-titles" element={<JobTitlesPage />} />}
        {/* Catch-all — redirect to dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* MODALS */}
      {showNewJob && <NewJobModal onClose={() => setShowNewJob(false)} onCreateJob={handleCreateJob} />}
      {/* v28.17 — PermissionsModal removed; matrix lives inside /people. */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showEmergencyContacts && <EmergencyContactsModal onClose={() => setShowEmergencyContacts(false)} />}
      {showCompanyDocs && <CompanyDocumentsModal onClose={() => setShowCompanyDocs(false)} />}
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
