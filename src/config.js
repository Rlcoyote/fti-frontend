// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
export const C = {
  red: "#B01020", white: "#FFFFFF", blue: "#002868", darkBlue: "#002060",
  steel: "#f0f3f8", lightSteel: "#e4e9f2", muted: "#4a5570",
  border: "#d0d8e8", cardBg: "#ffffff", pageBg: "#f0f3f8",
  text: "#1a2340", green: "#1a7a3c", orange: "#b85c00", yellow: "#8a6500",
  overdue: "#B01020", overdueB: "#fdf0f0",
  priHigh: "#B01020", priHighB: "#fdecea",
  priLow: "#1a5fa8", priLowB: "#e8f0fb",
};

export const STATUS_CONFIG = {
  Scheduled:    { color: "#1a5fa8", bg: "#e8f0fb", label: "SCHEDULED" },
  "In Progress":{ color: "#1a7a3c", bg: "#e6f5ec", label: "IN PROGRESS" },
  Completed:    { color: "#6b7a99", bg: "#f0f3f8", label: "COMPLETED" },
};
export const STATUS_ORDER = ["Scheduled", "In Progress", "Completed"];

export const API_URL = "https://fti-app-production.up.railway.app/api";
export const API_URL_PUBLIC = "https://fti-app-production.up.railway.app/api";

// CURRENT_USER — mutable singleton, replaced during file split per session notes
let _currentUser = "";
export const getCurrentUser = () => _currentUser;
export const setCurrentUser = (name) => { _currentUser = name; };
