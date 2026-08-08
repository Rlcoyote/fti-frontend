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

// v28.444 — rows carry STRIP membership + the permission gate. Before this,
// FTIDashboard held its own ALL_NAV_ITEMS copy of "what's in the top strip"
// and Operator Certs (added here in v28.441) silently never rendered — the
// exact Entry 7 drift this file exists to kill, one shelf lower. Now: a page
// is in the strip iff its row says so (strip = render order; gaps of 10 for
// future inserts), gated by `perm` if present. No second list anywhere.
const NAV = [
  // { label, page, path, strip?, perm? }
  { label: "Dashboard", page: "dashboard", path: "/" },
  { label: "All Tickets", page: "allTickets", path: "/all-tickets", strip: 30 },
  { label: "Work Order History", page: "workOrderHistory", path: "/job-history", strip: 40, perm: "view_jobs" },
  { label: "Action Items", page: "todos", path: "/todos", strip: 50 },
  { label: "Inventory", page: "inventory", path: "/inventory", strip: 60, perm: "view_inventory" },
  { label: "Assets", page: "assets", path: "/assets" },
  { label: "Vehicles", page: "vehicles", path: "/vehicles" },
  { label: "Yards", page: "yards", path: "/yards" },
  { label: "Clock", page: "clock", path: "/clock", strip: 10 },
  { label: "My Hours", page: "myHours", path: "/my-hours", strip: 20 },
  { label: "Crew", page: "crew", path: "/crew", strip: 70 },
  { label: "Safety", page: "safety", path: "/safety", strip: 80 },
  { label: "Safety Meetings", page: "safetyMeetings", path: "/safety-meetings", strip: 90 },
  { label: "Training", page: "training", path: "/training", strip: 100 },
  { label: "Operator Certs", page: "competency", path: "/competency", strip: 105 }, // v28.441 — equipment operator certification program (test + practical)
  { label: "Tutorial", page: "tutorial", path: "/tutorial", strip: 110 }, // v28.419 — THE tutorial (everyone)
  { label: "Final Review", page: "finalReview", path: "/final-review", strip: 120, perm: "approve_tickets" },
  { label: "Reports", page: "reports", path: "/reports", strip: 130, perm: "view_reports" },
  { label: "Deleted", page: "deleted", path: "/deleted", strip: 140, perm: "delete_jobs" },
  { label: "Archive", page: "archive", path: "/archive", strip: 150, perm: "view_archive" },
];

export const PAGE_MAP = Object.fromEntries(NAV.map(({ label, page }) => [label, page]));
export const ROUTE_MAP = Object.fromEntries(NAV.map(({ label, path }) => [label, path]));

// The top-strip labels the signed-in user can see, in render order. THE one
// derivation both nav bars consume (via FTIDashboard) — v28.444.
export function stripNavItems(can) {
  return NAV.filter((r) => r.strip && (!r.perm || can(r.perm)))
    .sort((a, b) => a.strip - b.strip)
    .map((r) => r.label);
}

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
  ...NAV.filter(({ path }) => path !== "/").map(({ page, path }) => [path, page]),
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
  { label: "SAFETY", items: ["Safety", "Safety Meetings", "Training", "Operator Certs"] },
  { label: "HISTORY", items: ["Work Order History", "Deleted", "Archive"] },
];
// v28.444 — Training displays as TRAINING again (the v28.441 "Competency"
// rename sat beside "Operator Certs" reading as two near-synonyms; Reggie:
// "We need 'training'"). Awareness courses = Training; the equipment
// certification program = Operator Certs.
export const NAV_DISPLAY = { Safety: "Certifications", "Work Order History": "Work Orders" };
