// ─── navMap.js — the ONE home for nav-label → page-key → route (v28.253) ────
// Before this file, three surfaces each held their own copy of this knowledge:
// DesktopNavBar (PAGE_MAP + ROUTE_MAP), MobileNavDrawer (PAGE_MAP + ROUTE_MAP),
// and FTIDashboard (a hand-maintained URL→page if-chain). They drifted exactly
// the way Article XVII / Anti-Pattern Candidate 7 predicts: /training and
// /my-hours were missing from the FTIDashboard chain (so the active-tab
// highlight silently never fired on those pages — the v28.253 bug Reggie
// caught), and the mobile drawer's PAGE_MAP was missing "My Hours" entirely.
//
// Now: one NAV table row per label. PAGE_MAP and ROUTE_MAP are DERIVED, so
// they cannot disagree. pageFromPath() derives the active page key from the
// URL for both nav bars. Adding a page = one row here (+ EXTRA_PAGE_ROUTES if
// it has non-nav sub-routes). Icons stay in MobileNavDrawer — presentation,
// not routing knowledge.

const NAV = [
  // [label, pageKey, path]
  ["Dashboard", "dashboard", "/"],
  ["All Tickets", "allTickets", "/all-tickets"],
  ["Work Order History", "workOrderHistory", "/job-history"],
  ["Action Items", "todos", "/todos"],
  ["Inventory", "inventory", "/inventory"],
  ["Assets", "assets", "/assets"],
  ["Vehicles", "vehicles", "/vehicles"],
  ["Yards", "yards", "/yards"],
  ["Clock", "clock", "/clock"],
  ["My Hours", "myHours", "/my-hours"],
  ["Crew", "crew", "/crew"],
  ["Safety", "safety", "/safety"],
  ["Safety Meetings", "safetyMeetings", "/safety-meetings"],
  ["Training", "training", "/training"],
  ["Final Review", "finalReview", "/final-review"],
  ["Reports", "reports", "/reports"],
  ["Deleted", "deleted", "/deleted"],
  ["Archive", "archive", "/archive"],
];

export const PAGE_MAP = Object.fromEntries(NAV.map(([label, page]) => [label, page]));
export const ROUTE_MAP = Object.fromEntries(NAV.map(([label, , path]) => [label, path]));

// Pages that live outside the top-nav strip but still carry a page identity
// (gear-menu pages, sub-flows, legacy aliases). Longest prefix wins.
const EXTRA_PAGE_ROUTES = [
  ["/gps-events", "gpsEvents"],
  ["/inspection/new", "inspectionNew"],
  ["/inspections", "inspections"],
  ["/repair-request", "repairRequest"],
  ["/compliance-consent", "compliance"],
  ["/onboarding", "onboarding"], // v28.340 — New Hire Packet self-serve
  ["/error-log", "errorLog"], // v28.368 — THE ERROR LOG viewer (owner/admin)
  ["/activity", "activity"],
  ["/contacts", "contacts"],
  ["/people", "people"],
  ["/users", "people"], // v28.17 alias for legacy bookmarks
  ["/employees", "people"], // v28.17 alias for legacy bookmarks
];

// All prefix routes (nav minus "/", plus extras), longest first so
// /inspection/new wins over /inspections and any future nesting stays safe.
const PREFIX_ROUTES = [
  ...NAV.filter(([, , path]) => path !== "/").map(([, page, path]) => [path, page]),
  ...EXTRA_PAGE_ROUTES.map(([path, page]) => [path, page]),
].sort((a, b) => b[0].length - a[0].length);

export function pageFromPath(pathname) {
  const p = pathname || "/";
  if (p === "/" || p === "") return "dashboard";
  const hit = PREFIX_ROUTES.find(([path]) => p.startsWith(path));
  return hit ? hit[1] : "dashboard";
}

// ─── v28.365 — NAV GROUPS (header consolidation, ratified pattern: the parent
// is an UMBRELLA word, never a duplicate of a child — Reggie: "you wouldn't
// want it to say 'clock' and then hover and see clock again"). displayAs
// renames a child INSIDE its group when the flat label would collide with or
// blur the umbrella (Safety → Certifications under SAFETY).
export const NAV_GROUPS = [
  { label: "TIME", items: ["Clock", "My Hours"] },
  { label: "SAFETY", items: ["Safety", "Safety Meetings", "Training"] },
  { label: "HISTORY", items: ["Work Order History", "Deleted", "Archive"] },
];
export const NAV_DISPLAY = { Safety: "Certifications", "Work Order History": "Work Orders" };
