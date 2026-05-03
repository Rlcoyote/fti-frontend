// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
// v28.25 — dark mode support via runtime palette swap.
//
// Why this shape: ~73 places in the codebase use `${C.blue}44` style alpha-hex
// concatenation (a brand color at e.g. 0x44 = 27% alpha). That works only if
// C.blue is a hex string. CSS variables (`var(--c-blue)`) would break those
// patterns since `var(--c-blue)44` is invalid CSS. Refactoring 73 call sites
// is a separate, larger ship.
//
// Pragmatic alternative: keep C as a plain JS object holding hex strings, but
// reassign its property values at runtime when theme toggles. Existing imports
// of C still work — they hold a reference to the same object — and on the
// next render they read fresh hex values. AppContext owns the theme state
// and triggers a re-render via context value bump.
//
// Tradeoff: components that aggressively memoize (useMemo without theme as a
// dep) won't re-derive on toggle. The FTI codebase doesn't memoize hot paths,
// so in practice the cascade re-render from AppProvider is sufficient.

const LIGHT = {
  red: "#B01020", white: "#FFFFFF", blue: "#002868", darkBlue: "#002060",
  steel: "#f0f3f8", lightSteel: "#e4e9f2", muted: "#4a5570",
  border: "#d0d8e8", cardBg: "#ffffff", pageBg: "#f0f3f8",
  text: "#1a2340", green: "#1a7a3c", orange: "#b85c00", yellow: "#8a6500",
  overdue: "#B01020", overdueB: "#fdf0f0",
  priHigh: "#B01020", priHighB: "#fdecea",
  priLow: "#1a5fa8", priLowB: "#e8f0fb",
  // v28.26 — header tokens for the top nav bar. In light mode the banner
  // is dark-navy with white text; in dark mode the banner is light-blue
  // with dark-navy text (per Reggie's call: "make the top banner print
  // Dark blue against the light blue"). Decoupled from the rest of the
  // palette so the header can carry brand-distinct contrast in each mode.
  headerBg: "#002060", headerText: "#FFFFFF", headerMuted: "#a0aec8",
};

// Dark palette — hand-picked so brand red/blue stay recognizable on dark
// backgrounds. Backgrounds are dark navy-grounded (matches the FTI brand
// header bar) rather than pure black/gray. Text is off-white for legibility.
// Alpha overlays (the 73 ${C.X}NN patterns across the codebase) compose
// against these values automatically — e.g. `${C.blue}44` becomes the
// lighter dark-mode blue at 27% alpha, which still reads as a soft blue
// tint on the dark background.
const DARK = {
  red: "#FF4458", white: "#FFFFFF", blue: "#5b9bf2", darkBlue: "#4a8be2",
  steel: "#1f2937", lightSteel: "#2d3748", muted: "#94a3b8",
  border: "#374151", cardBg: "#1f2937", pageBg: "#111827",
  text: "#e2e8f0", green: "#34d399", orange: "#fbbf24", yellow: "#facc15",
  overdue: "#FF4458", overdueB: "#3b1f24",
  priHigh: "#FF4458", priHighB: "#3b1f24",
  priLow: "#5b9bf2", priLowB: "#1a2a44",
  // Light-blue banner with dark-navy text — Reggie's spec for dark mode.
  // headerBg matches the dark-mode darkBlue accent so existing icons
  // composed against the banner (FTI circle, sign-out badge) still read
  // correctly. headerText is very dark navy so white logo / version text
  // becomes high-contrast dark text against the light blue band.
  headerBg: "#4a8be2", headerText: "#0a1430", headerMuted: "#1a2340",
};

// Mutable singleton — imports hold a reference to this object. On theme
// toggle we Object.assign() the new palette into it so existing references
// see updated values on next render.
export const C = { ...LIGHT };

const THEME_KEY = "fti_theme";

export function getTheme() {
  try { return localStorage.getItem(THEME_KEY) || "light"; }
  catch { return "light"; }
}

export function applyTheme(theme) {
  const palette = theme === "dark" ? DARK : LIGHT;
  Object.assign(C, palette);
  // Body background falls outside React inline styles — set it directly so
  // the area outside .pageBg cards (overscroll, scrollbars) goes dark too.
  if (typeof document !== "undefined") {
    document.body.style.background = palette.pageBg;
    document.body.style.color = palette.text;
    document.body.dataset.theme = theme;
  }
  try { localStorage.setItem(THEME_KEY, theme); } catch {}
}

// Apply persisted theme synchronously on module load — runs before any
// component imports C, so first paint already reflects the user's
// last-saved preference. Avoids a "light flash" before AppContext mounts.
applyTheme(getTheme());

// v28.40 — WO status taxonomy collapsed. The 3-tier (SCHEDULED / IN PROGRESS /
// COMPLETED) failed CAM Article III Amendment 2 — IN PROGRESS was a date-based
// heuristic that didn't reflect actual work state, SCHEDULED was redundant
// with "no tickets touched yet" (derivable), and the whole taxonomy was
// information the ticket dots already conveyed. Replaced with binary
// active-vs-archived: a WO is active until the lead clicks MARK FOR
// COMPLETION, then it's archived (lives in /archive). No badge on active
// WOs — the ticket pips are the state.

// Canonical ticket lifecycle order. Drives the sort in JobTicketsTab + the
// "needs lead action" filter on the WO surface (incomplete + signed +
// sigNotReq stay in the WO; approved+ ship to Final Review/Archive).
// inField was merged into incomplete in v28.40 — see TICKET_STATUSES.
export const TICKET_STATUS_ORDER = [
  "incomplete",
  "emailed",
  "signed",
  "sigNotReq",
  "approved",
  "sentToQB",
  "qbVerified",
  "voided",
];

// Tickets that belong on the WO surface (lead's domain — needs action).
export const WO_TICKET_STATUSES = ["incomplete", "emailed", "signed", "sigNotReq"];
// Tickets that belong in Final Review (owner's domain — ready for accounting).
export const FINAL_REVIEW_TICKET_STATUSES = ["approved"];
// Terminal states — tickets in these states leave both surfaces.
export const TERMINAL_TICKET_STATUSES = ["sentToQB", "qbVerified", "voided"];

export const API_URL = "https://fti-app-production.up.railway.app/api";
export const API_URL_PUBLIC = "https://fti-app-production.up.railway.app/api";

// CURRENT_USER — mutable singleton, replaced during file split per session notes
let _currentUser = "";
export const getCurrentUser = () => _currentUser;
export const setCurrentUser = (name) => { _currentUser = name; };
