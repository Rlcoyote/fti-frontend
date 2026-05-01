import { C } from "./config.js";
import { useApp } from "./AppContext.jsx";

// v28.25 — theme toggle row for the mobile drawer. Mirrors the desktop
// icon in DesktopNavBar but rendered as a full-width drawer item with
// label text since the drawer pattern uses tappable rows. Visible to
// every user role (eye fatigue isn't a permission).
function ThemeDrawerItem() {
  const { theme, toggleTheme } = useApp();
  const isDark = theme === "dark";
  return (
    <div onClick={toggleTheme} style={{
      display: "flex", alignItems: "center", gap: 14, padding: "14px 24px",
      cursor: "pointer",
    }}>
      <span style={{ fontSize: 18, width: 24, textAlign: "center" }}>{isDark ? "☀" : "☾"}</span>
      <span style={{ fontSize: 15, color: "#b0bdd4", fontWeight: 400 }}>
        {isDark ? "Light Mode" : "Dark Mode"}
      </span>
    </div>
  );
}

// ─── MobileNavDrawer (v28.05) ───────────────────────────────────────────────
// Bottom-sheet navigation drawer used at viewport widths < 900px. Slides up
// from the bottom edge with a backdrop. Lists Dashboard + every NAV_ITEM the
// current user can access, plus the under-the-gear admin items (Permissions,
// Yard Locations, Emergency Information, Contacts, Field Resources, Activity
// Log) and a Sign Out at the bottom.
//
// Previously inlined in FTIDashboard.jsx as ~120 lines including the drawer
// shell + every drawer item. Extracting it here removes substantial JSX
// from the dashboard component without changing any behavior or styling.
//
// Article XXV split intent: a full self-contained UI region with one clear
// boundary (drawerOpen state in / nav callbacks out) is the right thing to
// extract. Caller passes in: open state + setter, current page string, the
// curated NAV_ITEMS list, the navigate function, the handful of count
// badges (myActiveTodos.length, deletedJobs.length + deletedTickets.length),
// and the modal-open setters for the gear items.

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
  // v28.19 — Users drawer entry removed. People management lives in the gear
  // menu only (admin-cadence, not daily-use surface).
};

const NAV_ICONS = {
  Dashboard: "⌂",
  "All Tickets": "🎫",
  "Work Order History": "📋",
  "Action Items": "✓",
  Inventory: "📦",
  Assets: "🚛",
  Crew: "👷",
  Safety: "🛡",
  "Final Review": "✅",
  Reports: "📊",
  Deleted: "🗑",
  Archive: "📁",
};

function DrawerItem({ icon, label, active, onClick, badge, badgeColor }) {
  return (
    <div onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 14, padding: "14px 24px",
      background: active ? "#ffffff11" : "transparent",
      borderLeft: active ? `3px solid ${C.red}` : "3px solid transparent",
      cursor: "pointer",
    }}>
      <span style={{ fontSize: 18, width: 24, textAlign: "center" }}>{icon}</span>
      <span style={{ fontSize: 15, fontWeight: active ? 700 : 400, color: active ? C.white : "#b0bdd4" }}>
        {label}
        {badge != null && badge > 0 && (
          <span style={{
            marginLeft: 8,
            background: badgeColor || C.red, color: C.white,
            borderRadius: 10, padding: "1px 7px", fontSize: 11, fontWeight: 800,
          }}>
            {badge}
          </span>
        )}
      </span>
    </div>
  );
}

function MobileNavDrawer({
  drawerOpen,
  setDrawerOpen,
  page,
  navigate,
  navItems,
  currentUser,
  isManager,
  isField,
  can,
  myActiveTodosCount,
  deletedTotalCount,
  // v28.17 — setShowPermissions removed; the permissions matrix is a tab
  // inside /people now, not a standalone modal.
  setShowSettings,
  setShowEmergencyContacts,
  setShowCompanyDocs,
  setShowLogoutConfirm,
}) {
  return (
    <>
      {/* BACKDROP */}
      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          style={{ position: "fixed", inset: 0, background: "#00000066", zIndex: 1001 }}
        />
      )}

      {/* DRAWER */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 1002,
        background: C.darkBlue, borderTop: `3px solid ${C.red}`,
        borderRadius: "16px 16px 0 0",
        transform: drawerOpen ? "translateY(0)" : "translateY(100%)",
        transition: "transform 0.3s ease",
        padding: "20px 0 40px", maxHeight: "80vh", overflowY: "auto",
      }}>
        <div style={{ width: 40, height: 4, background: "#ffffff33", borderRadius: 2, margin: "0 auto 20px" }} />

        {/* USER HEADER */}
        <div style={{ padding: "0 20px 16px", borderBottom: `1px solid #ffffff22`, marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: "50%", background: C.red,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, fontWeight: 800, color: C.white,
            }}>
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.white }}>{currentUser.name}</div>
              <div style={{
                fontSize: 11, color: "#a0aec8",
                textTransform: "uppercase", letterSpacing: "0.08em",
              }}>{currentUser.role}</div>
            </div>
          </div>
        </div>

        {/* DASHBOARD ALWAYS FIRST */}
        <DrawerItem
          icon="⌂"
          label="Dashboard"
          active={page === "dashboard"}
          onClick={() => { navigate("/"); setDrawerOpen(false); }}
        />

        {/* NAV ITEMS */}
        {navItems.map(item => {
          if (item === "Work Order History" && isField) return null;
          if (item === "Deleted" && !["owner", "admin", "manager"].includes(currentUser.role)) return null;
          const active = PAGE_MAP[item] === page;
          let badge, badgeColor;
          if (item === "Action Items") { badge = myActiveTodosCount; badgeColor = C.red; }
          if (item === "Deleted") { badge = deletedTotalCount; badgeColor = "#ffffff33"; }
          return (
            <DrawerItem
              key={item}
              icon={NAV_ICONS[item]}
              label={item}
              active={active}
              onClick={() => { navigate(ROUTE_MAP[item]); setDrawerOpen(false); }}
              badge={badge}
              badgeColor={badgeColor}
            />
          );
        })}

        {/* GEAR ITEMS — admin / owner only */}
        {/* v28.17 — Permissions item removed; permissions matrix lives as a tab inside /people. */}
        {currentUser.role === "owner" && (
          <DrawerItem icon="⚙" label="Yard Locations" onClick={() => { setDrawerOpen(false); setShowSettings(true); }} />
        )}
        {currentUser.role === "owner" && (
          <DrawerItem icon="🚨" label="Emergency Information" onClick={() => { setDrawerOpen(false); setShowEmergencyContacts(true); }} />
        )}
        <DrawerItem icon="👤" label="Contacts" onClick={() => { setDrawerOpen(false); navigate("/contacts"); }} />
        <DrawerItem icon="📁" label="Field Resources" onClick={() => { setDrawerOpen(false); setShowCompanyDocs(true); }} />
        {can("view_activity_log") && (
          <DrawerItem icon="📋" label="Activity Log" onClick={() => { setDrawerOpen(false); navigate("/activity"); }} />
        )}

        {/* THEME TOGGLE (v28.25) */}
        <ThemeDrawerItem />

        {/* SIGN OUT */}
        <div onClick={() => { setDrawerOpen(false); setShowLogoutConfirm(true); }} style={{
          display: "flex", alignItems: "center", gap: 14, padding: "14px 24px",
          borderTop: `1px solid #ffffff22`, marginTop: 8, cursor: "pointer",
        }}>
          <span style={{ fontSize: 18, width: 24, textAlign: "center" }}>⏻</span>
          <span style={{ fontSize: 15, color: C.red, fontWeight: 700 }}>Sign Out</span>
        </div>
      </div>
    </>
  );
}

export default MobileNavDrawer;
