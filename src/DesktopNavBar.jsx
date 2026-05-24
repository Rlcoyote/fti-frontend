import { C } from "./config.js";
import { NavBadge } from "./SharedUI.jsx";
import { useApp } from "./AppContext.jsx";

// v28.25 — theme toggle icon shown in the top-right of the desktop nav.
// Sun = "go to light" (visible in dark mode); Moon = "go to dark"
// (visible in light mode). Lives outside the gear menu so non-admin
// field users can flip themes too — eye fatigue isn't a permission.
function ThemeToggleIcon() {
  const { theme, toggleTheme } = useApp();
  const isDark = theme === "dark";
  return (
    <span
      onClick={toggleTheme}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      style={{
        fontSize: 16,
        color: C.headerMuted,
        cursor: "pointer",
        lineHeight: 1,
        userSelect: "none",
        padding: "2px 4px",
      }}
    >
      {isDark ? "☀" : "☾"}
    </span>
  );
}

// ─── DesktopNavBar (v28.05) ─────────────────────────────────────────────────
// Top navigation bar used at viewport widths ≥ 900px. Contains:
//   - The FTI logo + brand text + version banner (clicks navigate to /)
//   - The horizontal nav strip (NAV_ITEMS, page-active highlight, badge counts)
//   - The settings gear dropdown menu (Employees, Job Titles, Permissions,
//     Yard Locations, Emergency Information, Contacts, Field Resources,
//     Activity Log) — visible to admin/manager and owner-only items hidden
//     for non-owners
//   - The Sign Out button + user-initial avatar
//
// Previously inlined in FTIDashboard.jsx as ~133 lines. Extracting it removes
// the second-largest JSX block from the dashboard component.
//
// Article XXV split intent: the desktop nav is a self-contained surface with
// a clear contract (page string in, navigate/setShow* callbacks out). Caller
// also passes badge counts so this component doesn't need to know about
// active todos, total inventory out, or deleted item counts.

const PAGE_MAP = {
  Dashboard: "dashboard",
  "All Tickets": "allTickets",
  "Work Order History": "jobHistory",
  "Action Items": "todos",
  Inventory: "inventory",
  Assets: "assets",
  Vehicles: "vehicles",
  Yards: "yards",
  Crew: "crew",
  Safety: "safety",
  "Final Review": "finalReview",
  Reports: "reports",
  Deleted: "deleted",
  Archive: "archive",
  // v28.19 — Users top-nav slot removed. People management is admin-cadence
  // work and now lives in the gear menu only ("People" → /people).
};

const ROUTE_MAP = {
  Dashboard: "/",
  "All Tickets": "/all-tickets",
  "Work Order History": "/job-history",
  "Action Items": "/todos",
  Inventory: "/inventory",
  Assets: "/assets",
  Vehicles: "/vehicles",
  Yards: "/yards",
  Crew: "/crew",
  Safety: "/safety",
  "Final Review": "/final-review",
  Reports: "/reports",
  Deleted: "/deleted",
  Archive: "/archive",
};

// Inline helper to render a single dropdown menu item with consistent style
// + hover background. Cuts down JSX repetition in the gear menu.
function GearMenuItem({ label, onClick, hasTopBorder }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: "10px 16px",
        fontSize: 13,
        fontWeight: 600,
        color: C.text,
        cursor: "pointer",
        ...(hasTopBorder ? { borderTop: `1px solid ${C.border}` } : {}),
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = C.steel)}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {label}
    </div>
  );
}

function DesktopNavBar({
  page,
  navigate,
  navItems,
  currentUser,
  can,
  // Badge counts
  myActiveTodosCount,
  totalInventoryOut,
  deletedTotalCount,
  pendingFinalReviewCount, // v28.188 — Final Review badge
  // Gear-menu local UI state
  showSettingsMenu,
  setShowSettingsMenu,
  // Modal-open setters (v28.17 — setShowPermissions removed; the
  // permissions matrix lives inside /people now, not a standalone modal).
  // v28.180 — setShowSettings removed; SettingsModal retired. Yard Locations
  // → /yards top-level page; SMS Consent Scripts → /compliance-consent.
  setShowEmergencyContacts,
  setShowCompanyDocs,
  setShowAbout,
  setShowLogoutConfirm,
  canViewContacts,
  // Version label (e.g. "v28.05")
  version,
}) {
  return (
    <div
      className="fti-nav-bar"
      style={{
        background: C.headerBg,
        borderBottom: `2px solid ${C.red}`,
        padding: "0 28px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        minHeight: 56,
        // v28.27 — sticky top nav. Header stays visible when the page scrolls.
        // zIndex: 50 sits above page content but below modals (which use 100+
        // throughout the app), so opening a JSA / EditPerson / Confirm modal
        // still covers the nav as expected.
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      {/* LOGO + BRAND */}
      <div
        onClick={() => navigate("/")}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = "0.85";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = "1";
        }}
        style={{ display: "flex", alignItems: "center", gap: 16, cursor: "pointer", transition: "opacity 0.15s", userSelect: "none" }}
        title="Go to Dashboard"
      >
        <div
          style={{
            width: 36,
            height: 36,
            border: `2px solid ${C.red}`,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: C.blue,
            fontSize: 13,
            fontWeight: 900,
            color: C.white,
            boxShadow: `0 0 12px ${C.red}44`,
          }}
        >
          FTI
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.12em", color: C.headerText }}>FLO-TEST INC.</div>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.headerMuted, letterSpacing: "0.12em" }}>
            OPERATIONS DASHBOARD <span style={{ color: C.headerText, fontWeight: 800 }}>{version}</span>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE — nav + gear + sign-out */}
      <div className="fti-desktop-nav" style={{ display: "flex", gap: 20, alignItems: "center" }}>
        {navItems.map((item) => {
          const active = PAGE_MAP[item] === page;
          const clickable = !!PAGE_MAP[item];
          return (
            <span
              key={item}
              onClick={() => {
                if (clickable) navigate(ROUTE_MAP[item]);
              }}
              style={{
                fontSize: 13,
                color: active ? C.headerText : clickable ? C.headerMuted : "#6b7a99",
                letterSpacing: "0.08em",
                cursor: clickable ? "pointer" : "default",
                borderBottom: active ? `2px solid ${C.red}` : "2px solid transparent",
                paddingBottom: 4,
                fontWeight: active ? 700 : 600,
                display: "flex",
                alignItems: "center",
              }}
            >
              {item}
              {item === "Action Items" && <NavBadge count={myActiveTodosCount} />}
              {item === "Inventory" && totalInventoryOut > 0 && <NavBadge count={totalInventoryOut} />}
              {item === "Deleted" && deletedTotalCount > 0 && <NavBadge count={deletedTotalCount} />}
              {/* v28.188 — Final Review badge. Count = approved tickets waiting
                  to be sent to QB. Origin: 2026-05-22, Reggie reported the
                  ticket landed in Final Review but the nav gave no signal. */}
              {item === "Final Review" && pendingFinalReviewCount > 0 && <NavBadge count={pendingFinalReviewCount} />}
            </span>
          );
        })}

        {/* GEAR DROPDOWN + THEME TOGGLE */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Theme toggle (v28.25) — visible to all users. The icon shown is
              the destination, not the current state: sun = "click for light",
              moon = "click for dark." Title attribute spells it out so there's
              no ambiguity. */}
          <ThemeToggleIcon />

          {/* v28.184 — Gear visibility broadened. Was: manage_users || owner.
              Now: manage_users || view_inventory || owner. Required because
              Vehicles / Yards / Assets moved INTO the gear menu this version;
              non-admin users with view_inventory still need access. Each item
              inside still has its own per-permission gate, so non-admins see
              only what they're allowed to see (master-data items + the always-
              on items like Field Resources and About). */}
          {(can("manage_users") ||
            can("view_inventory") ||
            can("view_gps_events") ||
            can("perform_inspections") ||
            can("view_vehicle_defects") ||
            currentUser.role === "owner") && (
            <div style={{ position: "relative" }}>
              <span
                onClick={() => setShowSettingsMenu((v) => !v)}
                style={{ fontSize: 18, color: showSettingsMenu ? C.headerText : C.headerMuted, cursor: "pointer", lineHeight: 1, userSelect: "none" }}
                title="Settings"
              >
                ⚙
              </span>
              {showSettingsMenu && (
                <>
                  {/* Click-outside backdrop */}
                  <div style={{ position: "fixed", inset: 0, zIndex: 299 }} onClick={() => setShowSettingsMenu(false)} />
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 8px)",
                      right: 0,
                      zIndex: 300,
                      background: C.cardBg,
                      border: `1px solid ${C.border}`,
                      borderRadius: 6,
                      boxShadow: "0 4px 16px #00000033",
                      minWidth: 160,
                      overflow: "hidden",
                    }}
                  >
                    {can("manage_users") && (
                      <GearMenuItem
                        label="People & Permissions"
                        onClick={() => {
                          setShowSettingsMenu(false);
                          navigate("/people");
                        }}
                      />
                    )}
                    {can("manage_users") && (
                      <GearMenuItem
                        label="Job Titles"
                        hasTopBorder
                        onClick={() => {
                          setShowSettingsMenu(false);
                          navigate("/job-titles");
                        }}
                      />
                    )}
                    {/* v28.17 — Permissions gear item removed; matrix now lives as a tab inside /people.
                        v28.180 — Yard Locations gear item removed; yards have their own top-level
                                  /yards page now. Compliance & Consent (below) is the new home
                                  for SMS consent scripts + future regulatory settings.
                        v28.184 — Master data block (Vehicles / Yards / Assets) moved into the gear
                                  menu from the top nav. Top-bordered as their own group between the
                                  People/Roles items above and the Compliance/Reference items below.
                                  Gated on view_inventory (matches the page-level route gate). */}
                    {can("view_inventory") && (
                      <GearMenuItem
                        label="Vehicles"
                        hasTopBorder
                        onClick={() => {
                          setShowSettingsMenu(false);
                          navigate("/vehicles");
                        }}
                      />
                    )}
                    {can("view_inventory") && (
                      <GearMenuItem
                        label="Yards"
                        onClick={() => {
                          setShowSettingsMenu(false);
                          navigate("/yards");
                        }}
                      />
                    )}
                    {can("view_inventory") && (
                      <GearMenuItem
                        label="Assets"
                        onClick={() => {
                          setShowSettingsMenu(false);
                          navigate("/assets");
                        }}
                      />
                    )}
                    {/* v28.185 — Live GPS Events entry. Separate gate
                        (view_gps_events) so it shows for dispatch / manager /
                        owner / admin but not for field/lead by default. Sits
                        next to the master-data block since it's GPS-flavored. */}
                    {can("view_gps_events") && (
                      <GearMenuItem
                        label="Live GPS Events"
                        onClick={() => {
                          setShowSettingsMenu(false);
                          navigate("/gps-events");
                        }}
                      />
                    )}
                    {/* v28.186 — DVIR entries. NEW INSPECTION shows for anyone who
                        can perform_inspections (driver, lead, field). INSPECTIONS
                        list shows for performers (their own) OR full-view holders
                        (admins/mechanics/hse). Top-bordered as their own group. */}
                    {can("perform_inspections") && (
                      <GearMenuItem
                        label="New Inspection (DVIR)"
                        hasTopBorder
                        onClick={() => {
                          setShowSettingsMenu(false);
                          navigate("/inspection/new");
                        }}
                      />
                    )}
                    {(can("perform_inspections") || can("view_vehicle_defects")) && (
                      <GearMenuItem
                        label="Inspections"
                        onClick={() => {
                          setShowSettingsMenu(false);
                          navigate("/inspections");
                        }}
                      />
                    )}
                    {can("manage_settings") && (
                      <GearMenuItem
                        label="Compliance & Consent"
                        hasTopBorder
                        onClick={() => {
                          setShowSettingsMenu(false);
                          navigate("/compliance-consent");
                        }}
                      />
                    )}
                    {currentUser.role === "owner" && (
                      <GearMenuItem
                        label="Emergency Information"
                        hasTopBorder
                        onClick={() => {
                          setShowSettingsMenu(false);
                          setShowEmergencyContacts(true);
                        }}
                      />
                    )}
                    {canViewContacts && (
                      <GearMenuItem
                        label="Contacts"
                        hasTopBorder
                        onClick={() => {
                          setShowSettingsMenu(false);
                          navigate("/contacts");
                        }}
                      />
                    )}
                    <GearMenuItem
                      label="Field Resources"
                      hasTopBorder
                      onClick={() => {
                        setShowSettingsMenu(false);
                        setShowCompanyDocs(true);
                      }}
                    />
                    {can("view_activity_log") && (
                      <GearMenuItem
                        label="Activity Log"
                        hasTopBorder
                        onClick={() => {
                          setShowSettingsMenu(false);
                          navigate("/activity");
                        }}
                      />
                    )}
                    <GearMenuItem
                      label="About"
                      hasTopBorder
                      onClick={() => {
                        setShowSettingsMenu(false);
                        setShowAbout(true);
                      }}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* SIGN OUT */}
          <span onClick={() => setShowLogoutConfirm(true)} style={{ fontSize: 11, color: C.headerMuted, cursor: "pointer", letterSpacing: "0.06em" }}>
            SIGN OUT
          </span>
          <div
            onClick={() => setShowLogoutConfirm(true)}
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              background: C.red,
              border: `2px solid #ffffff55`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 800,
              cursor: "pointer",
              color: C.white,
            }}
          >
            {currentUser.name.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DesktopNavBar;
