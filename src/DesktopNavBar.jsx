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
        fontSize: 16, color: "#a0aec8", cursor: "pointer", lineHeight: 1,
        userSelect: "none", padding: "2px 4px",
      }}
    >{isDark ? "☀" : "☾"}</span>
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
        padding: "10px 16px", fontSize: 13, fontWeight: 600, color: C.text, cursor: "pointer",
        ...(hasTopBorder ? { borderTop: `1px solid ${C.border}` } : {}),
      }}
      onMouseEnter={e => (e.currentTarget.style.background = C.steel)}
      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
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
  // Gear-menu local UI state
  showSettingsMenu,
  setShowSettingsMenu,
  // Modal-open setters (v28.17 — setShowPermissions removed; the
  // permissions matrix lives inside /people now, not a standalone modal).
  setShowSettings,
  setShowEmergencyContacts,
  setShowCompanyDocs,
  setShowLogoutConfirm,
  // Version label (e.g. "v28.05")
  version,
}) {
  return (
    <div className="fti-nav-bar" style={{
      background: C.darkBlue, borderBottom: `2px solid ${C.red}`,
      padding: "0 28px", display: "flex", alignItems: "center",
      justifyContent: "space-between", minHeight: 56,
    }}>
      {/* LOGO + BRAND */}
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
          <div style={{ fontSize: 10, fontWeight: 700, color: "#a0aec8", letterSpacing: "0.12em" }}>
            OPERATIONS DASHBOARD <span style={{ color: C.white, fontWeight: 800 }}>{version}</span>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE — nav + gear + sign-out */}
      <div className="fti-desktop-nav" style={{ display: "flex", gap: 20, alignItems: "center" }}>
        {navItems.map(item => {
          const active = PAGE_MAP[item] === page;
          const clickable = !!PAGE_MAP[item];
          return (
            <span
              key={item}
              onClick={() => { if (clickable) navigate(ROUTE_MAP[item]); }}
              style={{
                fontSize: 13, color: active ? C.white : clickable ? "#b0bdd4" : "#6b7a99",
                letterSpacing: "0.08em", cursor: clickable ? "pointer" : "default",
                borderBottom: active ? `2px solid ${C.red}` : "2px solid transparent",
                paddingBottom: 4, fontWeight: active ? 700 : 600,
                display: "flex", alignItems: "center",
              }}
            >
              {item}
              {item === "Action Items" && <NavBadge count={myActiveTodosCount} />}
              {item === "Inventory" && totalInventoryOut > 0 && <NavBadge count={totalInventoryOut} />}
              {item === "Deleted" && deletedTotalCount > 0 && <NavBadge count={deletedTotalCount} />}
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

          {(can("manage_users") || currentUser.role === "owner") && (
            <div style={{ position: "relative" }}>
              <span
                onClick={() => setShowSettingsMenu(v => !v)}
                style={{ fontSize: 18, color: showSettingsMenu ? C.white : "#a0aec8", cursor: "pointer", lineHeight: 1, userSelect: "none" }}
                title="Settings"
              >⚙</span>
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
                      <GearMenuItem label="People" onClick={() => { setShowSettingsMenu(false); navigate("/people"); }} />
                    )}
                    {can("manage_users") && (
                      <GearMenuItem label="Job Titles" hasTopBorder onClick={() => { setShowSettingsMenu(false); navigate("/job-titles"); }} />
                    )}
                    {/* v28.17 — Permissions gear item removed; matrix now lives as a tab inside /people. */}
                    {currentUser.role === "owner" && (
                      <GearMenuItem label="Yard Locations" hasTopBorder onClick={() => { setShowSettingsMenu(false); setShowSettings(true); }} />
                    )}
                    {currentUser.role === "owner" && (
                      <GearMenuItem label="Emergency Information" hasTopBorder onClick={() => { setShowSettingsMenu(false); setShowEmergencyContacts(true); }} />
                    )}
                    <GearMenuItem label="Contacts" hasTopBorder onClick={() => { setShowSettingsMenu(false); navigate("/contacts"); }} />
                    <GearMenuItem label="Field Resources" hasTopBorder onClick={() => { setShowSettingsMenu(false); setShowCompanyDocs(true); }} />
                    {can("view_activity_log") && (
                      <GearMenuItem label="Activity Log" hasTopBorder onClick={() => { setShowSettingsMenu(false); navigate("/activity"); }} />
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* SIGN OUT */}
          <span
            onClick={() => setShowLogoutConfirm(true)}
            style={{ fontSize: 11, color: "#a0aec8", cursor: "pointer", letterSpacing: "0.06em" }}
          >SIGN OUT</span>
          <div
            onClick={() => setShowLogoutConfirm(true)}
            style={{
              width: 30, height: 30, borderRadius: "50%", background: C.red,
              border: `2px solid #ffffff55`, display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 13, fontWeight: 800, cursor: "pointer", color: C.white,
            }}
          >{currentUser.name.charAt(0).toUpperCase()}</div>
        </div>
      </div>
    </div>
  );
}

export default DesktopNavBar;
