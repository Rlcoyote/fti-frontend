// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
// v28.43 — single source of truth for theme colors.
//
// Architecture:
//   1. Two palettes (LIGHT, DARK) — hex strings keyed by token name.
//   2. `activeTheme` — module-level pointer to the live palette.
//   3. `C` — a Proxy that resolves every property read against the live
//      palette. NO captured state, NO mutable plain object.
//   4. `applyTheme(t)` — flips `activeTheme` and updates `<body>` so CSS-
//      only paths (calendar icons, scrollbars) follow the same theme.
//
// Why a Proxy and not a plain mutable object (the v28.25 design):
//   The v28.25 design used `Object.assign(C, palette)` to mutate a singleton
//   in place. That works for inline reads inside render functions (`C.steel`
//   evaluates fresh each render). It DOES NOT work for module-level static
//   consts like `export const inputStyle = { background: C.steel, ... }`
//   because those evaluate ONCE at module load and cache the string forever.
//   The Proxy makes every read dynamic, but module-level static consts STILL
//   need to be converted to getter-objects (see SharedUI.jsx) so they re-
//   evaluate on each spread/access. Together: zero static capture anywhere.
//
// Why a Proxy and not CSS variables:
//   ~73 places in the codebase use template-literal alpha-hex concatenation
//   like `${C.blue}44` (brand blue at 27% alpha). CSS variables can't do
//   this — `var(--c-blue)44` is invalid CSS, and `rgba(var(--c-blue-rgb),
//   .27)` requires a parallel rgb-triplet token map plus a 73-site refactor.
//   The Proxy gives JS-side dynamism with zero refactor of the existing
//   alpha-hex pattern. CSS vars remain a future option (palette comments
//   below name candidate var() equivalents) but aren't required for theme
//   correctness. Auditor read: "single source, dynamic per access, no
//   static capture, no string concatenation in CSS."

const LIGHT = {
  red: "#B01020", white: "#FFFFFF", blue: "#002868", darkBlue: "#002060",
  steel: "#f0f3f8", lightSteel: "#e4e9f2", muted: "#4a5570",
  border: "#d0d8e8", cardBg: "#ffffff", pageBg: "#f0f3f8",
  text: "#1a2340", green: "#1a7a3c", orange: "#b85c00", yellow: "#8a6500",
  overdue: "#B01020", overdueB: "#fdf0f0",
  priHigh: "#B01020", priHighB: "#fdecea",
  priLow: "#1a5fa8", priLowB: "#e8f0fb",
  // Header tokens (v28.26). Light-mode: dark-navy banner, white text.
  // Dark-mode: light-blue banner, dark-navy text.
  headerBg: "#002060", headerText: "#FFFFFF", headerMuted: "#a0aec8",
};

const DARK = {
  red: "#FF4458", white: "#FFFFFF", blue: "#5b9bf2", darkBlue: "#4a8be2",
  steel: "#1f2937", lightSteel: "#2d3748", muted: "#94a3b8",
  border: "#374151", cardBg: "#1f2937", pageBg: "#111827",
  text: "#e2e8f0", green: "#34d399", orange: "#fbbf24", yellow: "#facc15",
  overdue: "#FF4458", overdueB: "#3b1f24",
  priHigh: "#FF4458", priHighB: "#3b1f24",
  priLow: "#5b9bf2", priLowB: "#1a2a44",
  headerBg: "#4a8be2", headerText: "#0a1430", headerMuted: "#1a2340",
};

const PALETTES = { light: LIGHT, dark: DARK };

// activeTheme is the only mutable runtime state in this module. Every read
// of C.X resolves against PALETTES[activeTheme].
let activeTheme = "light";

// Proxy: every `C.X` read returns the live value from the active palette.
// No own properties exist on the proxy target; all access flows through
// the trap. This means there is nothing to "stale" — even module-load
// reads (in static consts elsewhere) get the value at the moment they
// fire, and subsequent reads (after a theme toggle) get the new value.
//
// The traps cover spread (`{...C}`) and Object.keys() so the Proxy can
// stand in for the old plain-object C anywhere in the codebase.
export const C = new Proxy(Object.create(null), {
  get(_target, prop) {
    return PALETTES[activeTheme][prop];
  },
  has(_target, prop) {
    return prop in PALETTES[activeTheme];
  },
  ownKeys() {
    return Object.keys(PALETTES[activeTheme]);
  },
  getOwnPropertyDescriptor(_target, prop) {
    if (!(prop in PALETTES[activeTheme])) return undefined;
    return {
      value: PALETTES[activeTheme][prop],
      enumerable: true,
      configurable: true,
      writable: false,
    };
  },
  set() {
    // Refuse mutation. C is a read-only view of the active palette.
    // To change colors, edit LIGHT/DARK above. To change theme, call
    // applyTheme(). This trap protects against accidental writes that
    // would diverge from the palettes.
    return false;
  },
});

const THEME_KEY = "fti_theme";

export function getTheme() {
  try { return localStorage.getItem(THEME_KEY) || "light"; }
  catch { return "light"; }
}

export function applyTheme(theme) {
  activeTheme = theme === "dark" ? "dark" : "light";
  const palette = PALETTES[activeTheme];
  // Body background sits outside React inline styles — set it directly so
  // overscroll, scrollbars, and any non-React-managed area follow the theme.
  // The data-theme attribute powers CSS-only paths (e.g. the
  // ::-webkit-calendar-picker-indicator filter in index.css).
  if (typeof document !== "undefined") {
    document.body.style.background = palette.pageBg;
    document.body.style.color = palette.text;
    document.body.dataset.theme = activeTheme;
  }
  try { localStorage.setItem(THEME_KEY, activeTheme); } catch {}
}

// Apply persisted theme synchronously on module load — runs before any
// component imports C, so first paint reflects the user's last-saved
// preference. Avoids a "light flash" before AppContext mounts.
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
