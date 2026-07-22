import { useState, useMemo, useEffect } from "react";
import { Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";
import { C, NOISE } from "./config.js";
import { APP_VERSION } from "./version.js";
import { useApp } from "./AppContext.jsx";
import BrandedSplash from "./BrandedSplash.jsx";
import { Btn, ConfirmModal } from "./SharedUI.jsx";
import { TodoPage } from "./TodoPage.jsx";
import DashboardHome from "./DashboardHome.jsx";
import NewJobModal from "./NewJobModal.jsx";
import InventoryPage from "./InventoryPage.jsx";
import LaborTimeRulesPage from "./LaborTimeRulesPage.jsx";
import TimeReviewPage from "./TimeReviewPage.jsx";
import MyHoursPage from "./MyHoursPage.jsx";
import ReportsPage from "./ReportsPage.jsx";
import AllTicketsPage from "./AllTicketsPage.jsx";
import FinalReviewPage from "./FinalReviewPage.jsx";
import CrewPage from "./CrewPage.jsx";
import JobHistoryPage from "./JobHistoryPage.jsx";
import DeletedJobsPage from "./DeletedJobsPage.jsx";
import ComplianceConsentPage from "./ComplianceConsentPage.jsx";
// v28.17 — PermissionsModal, UsersPage, EmployeesPage all consolidated
// into PeoplePage (one canonical surface for all person-management).
import PeoplePage from "./PeoplePage.jsx";
import EmergencyContactsModal from "./EmergencyContactsModal.jsx";
import CompanyLibraryModal from "./CompanyLibraryModal.jsx";
import AboutModal from "./AboutModal.jsx";
import JobTitlesPage from "./JobTitlesPage.jsx";
import ArchivePage from "./ArchivePage.jsx";
import AssetsPage from "./AssetsPage.jsx";
import VehiclesPage from "./VehiclesPage.jsx";
import YardsPage from "./YardsPage.jsx";
import LiveGpsEventsPage from "./LiveGpsEventsPage.jsx";
import DriverInspectionForm from "./DriverInspectionForm.jsx";
import InspectionsListPage from "./InspectionsListPage.jsx";
import RepairRequestForm from "./RepairRequestForm.jsx";
import SafetyPage from "./SafetyPage.jsx";
import SafetyMeetingsPage from "./SafetyMeetingsPage.jsx";
import OnboardingPage from "./OnboardingPage.jsx";
import ErrorLogPage from "./ErrorLogPage.jsx";
import ClockPage from "./ClockPage.jsx";
import TrainingPage from "./TrainingPage.jsx";
import { pageFromPath } from "./navMap.js";
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

function FTIDashboard() {
  const { currentUser, logout, customers, userNames, userIdByName, can } = useApp();
  const userRole = currentUser.role; // owner | admin | manager | lead | salesman | field
  const isManager = can("edit_jobs");
  const isField = userRole === "field";
  // v28.115 — Contacts is the customer directory: a sales/management surface.
  // Lead + field are execution roles (they get the per-job contact on the
  // ticket/WO), so they are gated out of the directory entirely. Frontend
  // gate only — the backend contacts-API gate is part of the permissions audit.
  const canViewContacts = can("view_contacts");

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
        box-shadow: 0 2px 14px rgba(0, 0, 0, 0.22);
      }
    `;
    document.head.appendChild(s);
  }, []);

  // ── URL-driven page string for nav highlighting ──
  const navigate = useNavigate();
  const location = useLocation();
  // v28.253 — derived from the ONE nav map (src/navMap.js). The old inline
  // if-chain was a third copy of the nav routing knowledge and had drifted
  // (missing /training + /my-hours -> active-tab highlight never fired there).
  const page = pageFromPath(location.pathname);
  // v28.368 — navigation breadcrumbs for THE ERROR LOG's story trail.
  useEffect(() => {
    import("./errorReporter.js").then(({ addBreadcrumb }) => addBreadcrumb("nav", location.pathname));
  }, [location.pathname]);
  const navigateToPage = (path) => navigate(path);

  // ── UI state ──
  // v28.17 — showPermissions removed; the permissions matrix is now a tab
  // inside PeoplePage instead of a standalone modal.
  // v28.180 — showSettings removed. Legacy SettingsModal (which held YARD
  // LOCATIONS + SMS CONSENT SCRIPTS) is retired: yards moved to top-level
  // /yards page (v28.179); SMS Consent Scripts moved to /compliance-consent.
  const [showEmergencyContacts, setShowEmergencyContacts] = useState(false);
  const [showFieldResources, setShowFieldResources] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  // v28.372 — default flipped scheduled → ticket (Reggie: newest WO on top).
  // WO ids come from nextval('job_id_seq') at creation, so WO# DESC IS
  // most-recently-created first.
  const [sortMode, setSortMode] = useState("ticket"); // "ticket" = WO# DESC; "scheduled" = scheduled date ASC, WO# DESC tiebreak; "customer" = customer A→Z, WO# DESC tiebreak
  const [showNewJob, setShowNewJob] = useState(false);

  // ── Page-level data (jobs, tickets, todos, inventory, deletedTickets, jsas) ──
  const {
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
    jobs,
    setJobs,
    setTickets,
    deletedTickets,
    setDeletedTickets,
    refreshDeletedTickets,
    setExpandedId,
    currentUser,
    can,
    customers,
    userIdByName,
    setShowNewJob,
  });

  // ── Derived state for dashboard list rendering + nav badges ──
  // v28.325 — shared board: badges count ALL active action items.
  const myActiveTodos = todos.filter((t) => !t.completed);

  // v28.188 — Final Review badge. A ticket lands on the Final Review page once
  // a lead approves it (status='approved'); it leaves once an owner sends it
  // to QB (status='sentToQB'). Mirrors FinalReviewPage's filter (reviewStatuses
  // = ['approved']) and its salesman-scoped visibility — salesmen only see
  // tickets on jobs they sold, so the badge count must match what they'd
  // actually see if they clicked through.
  const pendingFinalReviewCount = useMemo(() => {
    const approved = tickets.filter((t) => t.status === "approved");
    if (currentUser?.role === "salesman") {
      return approved.filter((t) => {
        const j = jobs.find((x) => x.id === t.jobId);
        return j?.salesman === currentUser.name;
      }).length;
    }
    return approved.length;
  }, [tickets, jobs, currentUser]);

  const pendingByJob = useMemo(() => {
    const map = {};
    todos
      .filter((t) => t.jobId && !t.completed)
      .forEach((t) => {
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
  const activeJobs = jobs.filter((j) => j.status !== "Deleted" && j.status !== "Completed");
  const deletedJobs = jobs.filter((j) => j.status === "Deleted");
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
  // v28.184 — Top nav cleanup: Vehicles, Yards, Assets moved OUT of the top
  // nav and INTO the gear menu (per Reggie 2026-05-21: "master and gated items
  // in the settings is fine for now"). The top nav was getting crowded again
  // and these three are admin/dispatch-cadence master data, not daily field
  // surfaces. The pages still exist at /vehicles, /yards, /assets — routes
  // unchanged. Gear menu access broadened in DesktopNavBar so non-admins with
  // view_inventory still reach them.
  const ALL_NAV_ITEMS = [
    "Clock",
    "My Hours",
    "All Tickets",
    "Work Order History",
    "Action Items",
    "Inventory",
    "Crew",
    "Safety",
    "Safety Meetings",
    "Training",
    "Final Review",
    "Reports",
    "Deleted",
    "Archive",
  ];
  const NAV_ITEMS = ALL_NAV_ITEMS.filter((i) => {
    if (i === "Inventory" && !can("view_inventory")) return false;
    if (i === "Work Order History" && !can("view_jobs")) return false;
    if (i === "Deleted" && !can("delete_jobs")) return false;
    if (i === "Archive" && !can("view_archive")) return false;
    if (i === "Final Review" && !can("approve_tickets")) return false;
    if (i === "Reports" && !can("view_reports")) return false;
    return true;
  });

  if (loading) return <BrandedSplash />;

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: C.pageBg,
        // v28.360 — DEPTH, not paint: grain (NOISE, repeats) + top-lit glow +
        // a faint low-corner cast so the field runs warm-to-cool instead of
        // solid. Layers cost nothing; blur stays banned.
        backgroundImage: `${NOISE}, radial-gradient(1200px 640px at 50% -180px, ${C.pageBgGlow}, transparent 72%), radial-gradient(1000px 780px at 108% 112%, ${C.pageBgCast}, transparent 64%), radial-gradient(160% 120% at 50% 30%, transparent 55%, rgba(0, 0, 0, 0.22) 100%)`,
        backgroundRepeat: "repeat, no-repeat, no-repeat, no-repeat",
        backgroundAttachment: "fixed",
        color: C.text,
        fontFamily: "'Arial', sans-serif",
      }}
    >
      {/* MOBILE HAMBURGER (floating button bottom-right) */}
      <div
        className="fti-hamburger"
        onClick={() => setDrawerOpen(true)}
        style={{
          position: "fixed",
          bottom: 24,
          right: 20,
          zIndex: 1000,
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: C.red,
          boxShadow: "0 4px 16px #00000044",
          cursor: "pointer",
          flexDirection: "column",
          gap: 5,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
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
        pendingFinalReviewCount={pendingFinalReviewCount}
        setShowEmergencyContacts={setShowEmergencyContacts}
        setShowFieldResources={setShowFieldResources}
        setShowAbout={setShowAbout}
        setShowLogoutConfirm={setShowLogoutConfirm}
        canViewContacts={canViewContacts}
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
        pendingFinalReviewCount={pendingFinalReviewCount}
        showSettingsMenu={showSettingsMenu}
        setShowSettingsMenu={setShowSettingsMenu}
        setShowEmergencyContacts={setShowEmergencyContacts}
        setShowFieldResources={setShowFieldResources}
        setShowAbout={setShowAbout}
        setShowLogoutConfirm={setShowLogoutConfirm}
        canViewContacts={canViewContacts}
        version={APP_VERSION}
      />

      {/* PAGES — routed */}
      <Routes>
        <Route
          path="/"
          element={
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
          }
        />
        <Route path="/all-tickets" element={<AllTicketsPage tickets={tickets} setTickets={setTickets} jobs={jobs} />} />
        <Route
          path="/todos"
          element={<TodoPage todos={todos} setTodos={setTodos} jobs={jobs} onNavigateJob={navigateToJob} userNames={userNames} userIdByName={userIdByName} />}
        />
        {can("view_jobs") && <Route path="/job-history" element={<JobHistoryPage jobs={jobs} onNavigateJob={navigateToJob} />} />}
        <Route path="/crew" element={<CrewPage jobs={jobs} />} />
        <Route path="/safety" element={<SafetyPage />} />
        {/* v28.335 — Safety Meetings: open to everyone (spec §8b.7). */}
        <Route path="/safety-meetings" element={<SafetyMeetingsPage />} />
        {/* v28.340 — Onboarding / New Hire Packet: every employee, self-serve. */}
        <Route path="/onboarding" element={<OnboardingPage />} />
        {["owner", "admin"].includes(userRole) && <Route path="/error-log" element={<ErrorLogPage />} />}
        <Route path="/clock" element={<ClockPage />} />
        <Route path="/training" element={<TrainingPage />} />
        <Route path="/my-hours" element={<MyHoursPage />} />
        {(userRole === "owner" || userRole === "admin") && <Route path="/labor-time-rules" element={<LaborTimeRulesPage />} />}
        {can("approve_time_corrections") && <Route path="/time-review" element={<TimeReviewPage />} />}
        <Route path="/ticket/:id" element={<TicketPage jobs={jobs} tickets={tickets} setTickets={setTickets} />} />
        {can("view_activity_log") && <Route path="/activity" element={<ActivityLogPage />} />}
        {canViewContacts && <Route path="/contacts" element={<ContactsPage />} />}
        {can("approve_tickets") && <Route path="/final-review" element={<FinalReviewPage jobs={jobs} tickets={tickets} setTickets={setTickets} />} />}
        {can("view_reports") && <Route path="/reports" element={<ReportsPage jobs={jobs} tickets={tickets} inventory={inventory} />} />}
        {can("view_inventory") && <Route path="/inventory" element={<InventoryPage inventory={inventory} setInventory={setInventory} jobs={jobs} />} />}
        {can("view_inventory") && <Route path="/assets" element={<AssetsPage jobs={jobs} />} />}
        {can("view_inventory") && <Route path="/vehicles" element={<VehiclesPage />} />}
        {can("view_inventory") && <Route path="/yards" element={<YardsPage />} />}
        {/* v28.185 — Live GPS Events real-time feed (gated view_gps_events). */}
        {can("view_gps_events") && <Route path="/gps-events" element={<LiveGpsEventsPage />} />}
        {/* v28.186 — DVIR Phase 2: driver inspection form + list. */}
        {can("perform_inspections") && <Route path="/inspection/new" element={<DriverInspectionForm />} />}
        {(can("perform_inspections") || can("view_vehicle_defects")) && <Route path="/inspections" element={<InspectionsListPage />} />}
        {/* v28.191 — Repair Request form. Anyone-in-yard can file. Same gate
            as the BE: perform_inspections OR view_vehicle_defects OR
            view_inventory OR manage_vehicles (salesman excluded). */}
        {(can("perform_inspections") || can("view_vehicle_defects") || can("view_inventory") || can("manage_vehicles")) && (
          <Route path="/repair-request" element={<RepairRequestForm />} />
        )}
        {can("manage_settings") && <Route path="/compliance-consent" element={<ComplianceConsentPage />} />}
        {can("delete_jobs") && (
          <Route
            path="/deleted"
            element={
              <DeletedJobsPage
                deletedJobs={deletedJobs}
                deletedTickets={deletedTickets}
                jobs={jobs}
                handleRestoreJob={handleRestoreJob}
                handleArchiveJob={handleArchiveJob}
                handleRestoreTicket={handleRestoreTicket}
                handleArchiveTicket={handleArchiveTicket}
              />
            }
          />
        )}
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
      {/* v28.180 — SettingsModal retired. Yard locations live on /yards;
          SMS consent scripts live on /compliance-consent. */}
      {showEmergencyContacts && <EmergencyContactsModal onClose={() => setShowEmergencyContacts(false)} />}
      {showFieldResources && <CompanyLibraryModal onClose={() => setShowFieldResources(false)} />}
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
      {/* v28.288 (theme arc) — was a hand-rolled copy of ConfirmModal */}
      {showLogoutConfirm && (
        <ConfirmModal
          title="Sign Out?"
          message="You will be signed out and returned to the login screen."
          yesLabel="SIGN OUT"
          onYes={logout}
          onCancel={() => setShowLogoutConfirm(false)}
        />
      )}
    </div>
  );
}

// ─── APP WRAPPER (auth routing) ────────────────────────────────────────────

export default FTIDashboard;
