import { useState, useMemo, useEffect } from "react";

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const C = {
  red: "#B01020", white: "#FFFFFF", blue: "#002868", darkBlue: "#002060",
  steel: "#f0f3f8", lightSteel: "#e4e9f2", muted: "#4a5570",
  border: "#d0d8e8", cardBg: "#ffffff", pageBg: "#f0f3f8",
  text: "#1a2340", green: "#1a7a3c", orange: "#b85c00", yellow: "#8a6500",
  overdue: "#B01020", overdueB: "#fdf0f0",
  priHigh: "#B01020", priHighB: "#fdecea",
  priLow: "#1a5fa8", priLowB: "#e8f0fb",
};

const STATUS_CONFIG = {
  Scheduled:    { color: "#1a5fa8", bg: "#e8f0fb", label: "SCHEDULED" },
  "Rigged Up":  { color: "#8a6500", bg: "#fdf5d8", label: "RIGGED UP" },
  Active:       { color: "#1a7a3c", bg: "#e6f5ec", label: "ACTIVE" },
  "Rigged Down":{ color: "#b85c00", bg: "#fdf0e6", label: "RIGGED DOWN" },
  Invoiced:     { color: "#6b7a99", bg: "#f0f3f8", label: "INVOICED" },
};
const STATUS_ORDER = ["Scheduled", "Rigged Up", "Active", "Rigged Down", "Invoiced"];

const USERS_DEFAULT = [];
let CURRENT_USER = "";  // Set dynamically after login

// ─── LOGIN SCREEN ────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) { setError("Email and password required"); return; }
    setLoading(true); setError("");
    try {
      const r = await fetch(`${API_URL}/auth/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = await r.json();
      if (r.ok) {
        onLogin(data);
      } else {
        setError(data.error || "Login failed");
      }
    } catch (err) {
      setError("Connection error — check internet");
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", background: C.darkBlue, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: C.cardBg, borderRadius: 8, padding: 40, width: 380, maxWidth: "90vw", borderTop: `4px solid ${C.red}` }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, border: `3px solid ${C.red}`, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: C.blue, fontSize: 18, fontWeight: 900, color: C.white,
            margin: "0 auto 12px", boxShadow: `0 0 20px ${C.red}44`,
          }}>FTI</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.text, letterSpacing: "0.1em" }}>FLO-TEST INC.</div>
          <div style={{ fontSize: 11, color: C.muted, letterSpacing: "0.12em", marginTop: 4 }}>OPERATIONS DASHBOARD</div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>EMAIL</label>
          <input style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="you@flotest.com" onKeyDown={e => e.key === "Enter" && handleLogin()} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>PASSWORD</label>
          <input style={inputStyle} type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="••••••" onKeyDown={e => e.key === "Enter" && handleLogin()} />
        </div>
        {error && <div style={{ color: C.red, fontSize: 12, fontWeight: 700, marginBottom: 12, textAlign: "center" }}>{error}</div>}
        <button onClick={handleLogin} disabled={loading} style={{
          width: "100%", padding: "12px 0", background: C.red, color: C.white, border: "none",
          borderRadius: 4, fontSize: 14, fontWeight: 700, cursor: loading ? "default" : "pointer",
          letterSpacing: "0.06em", opacity: loading ? 0.6 : 1,
        }}>{loading ? "SIGNING IN..." : "SIGN IN"}</button>
      </div>
    </div>
  );
}

// ─── APP WRAPPER (handles auth state) ────────────────────────────────────────
function AppWrapper() {
  const [currentUser, setCurrentUser] = useState(null);

  // Check for saved session
  useEffect(() => {
    const saved = sessionStorage.getItem("fti_user");
    if (saved) {
      try {
        const user = JSON.parse(saved);
        CURRENT_USER = user.name;
        setCurrentUser(user);
      } catch (e) { sessionStorage.removeItem("fti_user"); }
    }
  }, []);

  const handleLogin = (user) => {
    CURRENT_USER = user.name;
    setCurrentUser(user);
    sessionStorage.setItem("fti_user", JSON.stringify(user));
  };

  const handleLogout = () => {
    CURRENT_USER = "";
    setCurrentUser(null);
    sessionStorage.removeItem("fti_user");
  };

  if (!currentUser) return <LoginScreen onLogin={handleLogin} />;
  return <FTIDashboard currentUser={currentUser} onLogout={handleLogout} />;
}

export { AppWrapper as default };

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const INITIAL_JOBS = [
  { id: 300001, customer: "Pioneer Natural Resources", location: "Permian Basin — Midland, TX",
    wells: ["Wolfcamp A #1H", "Wolfcamp A #2H", "Wolfcamp B #1H"],
    afe: ["AFE-2024-0441", null, "AFE-2024-0443"], dateStarted: "2026-03-01", status: "Active",
    crew: [{ name: "Josh Trevino", role: "Supervisor" }, { name: "Mike Garza", role: "Rig Up" }, { name: "Danny Reyes", role: "Helper" }],
    equipment: ["2\" HP Iron Package", "3\" Sand Separator 10K", "Flare Stack 20'", "Plug Catcher"],
    hoursLogged: 184, estimatedCost: 24850,
    ticketStatus: { ru: "signed", tester: "active", rd: null }, jsaComplete: true },
  { id: 300002, customer: "Devon Energy", location: "Delaware Basin — Pecos, TX",
    wells: ["Bone Spring #4H"], afe: [null], dateStarted: "2026-03-05", status: "Rigged Up",
    crew: [{ name: "Eli Springer", role: "Supervisor" }, { name: "Carlos Mendez", role: "Rig Up" }],
    equipment: ["2\" HP Iron Package", "Sand Separator 5K", "Choke Assembly"],
    hoursLogged: 16, estimatedCost: 4200,
    ticketStatus: { ru: "pending", tester: null, rd: null }, jsaComplete: true },
  { id: 300003, customer: "Chevron USA", location: "Midland Basin — Andrews, TX",
    wells: ["Spraberry #7H", "Spraberry #8H"], afe: ["AFE-2024-0512", "AFE-2024-0513"],
    dateStarted: "2026-03-08", status: "Scheduled",
    crew: [{ name: "Josh Trevino", role: "Supervisor" }, { name: "TBD", role: "Helper" }],
    equipment: ["3\" Iron Package", "Separator 1440 PSI"],
    hoursLogged: 0, estimatedCost: 0,
    ticketStatus: { ru: null, tester: null, rd: null }, jsaComplete: false },
  { id: 300000, customer: "Occidental Petroleum", location: "Permian Basin — Odessa, TX",
    wells: ["Delaware #2H", "Delaware #3H", "Delaware #4H", "Delaware #5H"],
    afe: ["AFE-2024-0388", "AFE-2024-0389", "AFE-2024-0390", "AFE-2024-0391"],
    dateStarted: "2026-02-10", status: "Invoiced",
    crew: [{ name: "Eli Springer", role: "Supervisor" }, { name: "Mike Garza", role: "Rig Up" }, { name: "Danny Reyes", role: "Helper" }, { name: "Carlos Mendez", role: "Helper" }],
    equipment: ["2\" & 3\" Iron Package", "Sand Separator 10K", "Manifold 5V", "Flare Stack >20'", "Chart Recorder"],
    hoursLogged: 312, estimatedCost: 41600,
    ticketStatus: { ru: "signed", tester: "signed", rd: "signed" }, jsaComplete: true },
];

const INITIAL_TODOS = [
  { id: 1, title: "Confirm AFE number from Devon rep", description: "Devon #4H still missing AFE — call Mark before EOD", jobId: 300002, priority: "high", dueDate: "2026-03-09", createdBy: "Eli Springer", assignedTo: "Eli Springer", completed: false, completedBy: null, completedAt: null },
  { id: 2, title: "Order replacement choke seat", description: "3/4\" tungsten seat needed before next rig-up", jobId: 300001, priority: "high", dueDate: "2026-03-10", createdBy: "Josh Trevino", assignedTo: "Eli Springer", completed: false, completedBy: null, completedAt: null },
  { id: 3, title: "Schedule pre-job safety meeting", description: "", jobId: 300003, priority: "normal", dueDate: "2026-03-07", createdBy: "Eli Springer", assignedTo: "Josh Trevino", completed: false, completedBy: null, completedAt: null },
  { id: 4, title: "Submit invoice to Occidental", description: "All tickets signed — ready to invoice", jobId: 300000, priority: "high", dueDate: "2026-03-08", createdBy: "Eli Springer", assignedTo: "Eli Springer", completed: false, completedBy: null, completedAt: null },
  { id: 5, title: "Pick up replacement H2S monitors", description: "Two units need new sensors", jobId: null, priority: "normal", dueDate: "2026-03-12", createdBy: "Eli Springer", assignedTo: "Mike Garza", completed: false, completedBy: null, completedAt: null },
  { id: 6, title: "Call insurance agent re: new truck", description: "", jobId: null, priority: "low", dueDate: null, createdBy: "Eli Springer", assignedTo: "Eli Springer", completed: true, completedBy: "Eli Springer", completedAt: "2026-03-08T14:22:00" },
  { id: 7, title: "Review updated rate sheet with Josh", description: "", jobId: null, priority: "low", dueDate: "2026-03-15", createdBy: "Eli Springer", assignedTo: "Eli Springer", completed: false, completedBy: null, completedAt: null },
];

// ─── INVENTORY DATA (mirrors 2026_FloTest_Iron_Inventory.xlsx) ───────────────
const INITIAL_INVENTORY = [
  { id: 1,  size: '2"', category: "Fitting",    item: "Cushion 90",           psi: null, itemNum: "2C90-###",  serial: null, qtyOwned: 256, inYard: 256, customer: null, fieldTicket: null, notes: null },
  { id: 2,  size: '2"', category: "Pup Joint",  item: '2" x 6"',             psi: null, itemNum: "26IN-###",  serial: null, qtyOwned: 85,  inYard: 85,  customer: null, fieldTicket: null, notes: null },
  { id: 3,  size: '2"', category: "Pup Joint",  item: '2" x 9"',             psi: null, itemNum: "29IN-###",  serial: null, qtyOwned: 48,  inYard: 48,  customer: null, fieldTicket: null, notes: null },
  { id: 4,  size: '2"', category: "Pup Joint",  item: "2\" x 1'",            psi: null, itemNum: "21-###",    serial: null, qtyOwned: 167, inYard: 167, customer: null, fieldTicket: null, notes: null },
  { id: 5,  size: '2"', category: "Pup Joint",  item: "2\" x 2'",            psi: null, itemNum: "22-###",    serial: null, qtyOwned: 116, inYard: 116, customer: null, fieldTicket: null, notes: null },
  { id: 6,  size: '2"', category: "Pup Joint",  item: "2\" x 3'",            psi: null, itemNum: "23-###",    serial: null, qtyOwned: 65,  inYard: 65,  customer: null, fieldTicket: null, notes: null },
  { id: 7,  size: '2"', category: "Pup Joint",  item: "2\" x 4'",            psi: null, itemNum: "24-###",    serial: null, qtyOwned: 120, inYard: 120, customer: null, fieldTicket: null, notes: null },
  { id: 8,  size: '2"', category: "Pup Joint",  item: "2\" x 6'",            psi: null, itemNum: "26-###",    serial: null, qtyOwned: 105, inYard: 105, customer: null, fieldTicket: null, notes: null },
  { id: 9,  size: '2"', category: "Pup Joint",  item: "2\" x 8'",            psi: null, itemNum: "28-###",    serial: null, qtyOwned: 36,  inYard: 36,  customer: null, fieldTicket: null, notes: null },
  { id: 10, size: '2"', category: "Pup Joint",  item: "2\" x 10'",           psi: null, itemNum: "210-###",   serial: null, qtyOwned: 295, inYard: 295, customer: null, fieldTicket: null, notes: null },
  { id: 11, size: '2"', category: "Pup Joint",  item: "2\" x 20'",           psi: null, itemNum: "220-###",   serial: null, qtyOwned: 214, inYard: 214, customer: null, fieldTicket: null, notes: null },
  { id: 12, size: '2"', category: "Fitting",    item: "Upstream Tee",         psi: null, itemNum: "2TWW-###",  serial: null, qtyOwned: 23,  inYard: 23,  customer: null, fieldTicket: null, notes: null },
  { id: 13, size: '2"', category: "Fitting",    item: "Downstream Tee",       psi: null, itemNum: "2WTT-###",  serial: null, qtyOwned: 92,  inYard: 92,  customer: null, fieldTicket: null, notes: null },
  { id: 14, size: '2"', category: "Fitting",    item: "Upstream Cross",       psi: null, itemNum: "2TWWW-###", serial: null, qtyOwned: 27,  inYard: 27,  customer: null, fieldTicket: null, notes: null },
  { id: 15, size: '2"', category: "Fitting",    item: "Downstream Cross",     psi: null, itemNum: "2WTTT-###", serial: null, qtyOwned: 7,   inYard: 7,   customer: null, fieldTicket: null, notes: null },
  { id: 16, size: '2"', category: "Fitting",    item: "Dbl Wing",             psi: null, itemNum: "2DW-###",   serial: null, qtyOwned: 25,  inYard: 25,  customer: null, fieldTicket: null, notes: null },
  { id: 17, size: '2"', category: "Fitting",    item: "Dbl Thread",           psi: null, itemNum: "2DT-###",   serial: null, qtyOwned: 31,  inYard: 31,  customer: null, fieldTicket: null, notes: null },
  { id: 18, size: '2"', category: "Valve",      item: "Plug Valve",           psi: null, itemNum: "2PV-###",   serial: null, qtyOwned: 129, inYard: 129, customer: null, fieldTicket: null, notes: null },
  { id: 19, size: '2"', category: "Valve",      item: "Positive Choke",       psi: null, itemNum: "2PC-###",   serial: null, qtyOwned: 25,  inYard: 25,  customer: null, fieldTicket: null, notes: null },
  { id: 20, size: '2"', category: "Valve",      item: "Adjustable Choke",     psi: null, itemNum: "2AC-###",   serial: null, qtyOwned: 29,  inYard: 29,  customer: null, fieldTicket: null, notes: null },
  { id: 21, size: '2"', category: "Fitting",    item: "Male Cap",             psi: null, itemNum: "2MC-###",   serial: null, qtyOwned: 23,  inYard: 23,  customer: null, fieldTicket: null, notes: null },
  { id: 22, size: '2"', category: "Fitting",    item: "Female Cap",           psi: null, itemNum: "2FC-###",   serial: null, qtyOwned: 17,  inYard: 17,  customer: null, fieldTicket: null, notes: null },
  { id: 23, size: '2"', category: "Fitting",    item: '3" x 2" Cross Over',   psi: null, itemNum: "32CO-###",  serial: null, qtyOwned: 112, inYard: 112, customer: null, fieldTicket: null, notes: null },
  { id: 24, size: '2"', category: "Fitting",    item: "Pop Off",              psi: null, itemNum: "2PO-###",   serial: null, qtyOwned: 13,  inYard: 13,  customer: null, fieldTicket: null, notes: null },
  { id: 25, size: '3"', category: "Fitting",    item: "Cushion 90",           psi: null, itemNum: "3C90-###",  serial: null, qtyOwned: 68,  inYard: 68,  customer: null, fieldTicket: null, notes: null },
  { id: 26, size: '3"', category: "Pup Joint",  item: '3" x 6"',             psi: null, itemNum: "36IN-###",  serial: null, qtyOwned: 30,  inYard: 30,  customer: null, fieldTicket: null, notes: null },
  { id: 27, size: '3"', category: "Pup Joint",  item: "3\" x 1'",            psi: null, itemNum: "31-###",    serial: null, qtyOwned: 49,  inYard: 49,  customer: null, fieldTicket: null, notes: null },
  { id: 28, size: '3"', category: "Pup Joint",  item: "3\" x 2'",            psi: null, itemNum: "32-###",    serial: null, qtyOwned: 46,  inYard: 46,  customer: null, fieldTicket: null, notes: null },
  { id: 29, size: '3"', category: "Pup Joint",  item: "3\" x 3'",            psi: null, itemNum: "33-###",    serial: null, qtyOwned: 39,  inYard: 39,  customer: null, fieldTicket: null, notes: null },
  { id: 30, size: '3"', category: "Pup Joint",  item: "3\" x 4'",            psi: null, itemNum: "34-###",    serial: null, qtyOwned: 43,  inYard: 43,  customer: null, fieldTicket: null, notes: null },
  { id: 31, size: '3"', category: "Pup Joint",  item: "3\" x 6'",            psi: null, itemNum: "36-###",    serial: null, qtyOwned: 39,  inYard: 39,  customer: null, fieldTicket: null, notes: null },
  { id: 32, size: '3"', category: "Pup Joint",  item: "3\" x 8'",            psi: null, itemNum: "38-###",    serial: null, qtyOwned: 0,   inYard: 0,   customer: null, fieldTicket: null, notes: null },
  { id: 33, size: '3"', category: "Pup Joint",  item: "3\" x 10'",           psi: null, itemNum: "310-###",   serial: null, qtyOwned: 54,  inYard: 54,  customer: null, fieldTicket: null, notes: null },
  { id: 34, size: '3"', category: "Pup Joint",  item: "3\" x 20'",           psi: null, itemNum: "320-###",   serial: null, qtyOwned: 13,  inYard: 13,  customer: null, fieldTicket: null, notes: null },
  { id: 35, size: '3"', category: "Fitting",    item: "Upstream Tee",         psi: null, itemNum: "3TWW-###",  serial: null, qtyOwned: 21,  inYard: 21,  customer: null, fieldTicket: null, notes: null },
  { id: 36, size: '3"', category: "Fitting",    item: "Downstream Tee",       psi: null, itemNum: "3WTT-###",  serial: null, qtyOwned: 27,  inYard: 27,  customer: null, fieldTicket: null, notes: null },
  { id: 37, size: '3"', category: "Fitting",    item: "Upstream Cross",       psi: null, itemNum: "3TWWW-###", serial: null, qtyOwned: 5,   inYard: 5,   customer: null, fieldTicket: null, notes: null },
  { id: 38, size: '3"', category: "Fitting",    item: "Downstream Cross",     psi: null, itemNum: "3WTTT-###", serial: null, qtyOwned: 5,   inYard: 5,   customer: null, fieldTicket: null, notes: null },
  { id: 39, size: '3"', category: "Fitting",    item: "Dbl Wing",             psi: null, itemNum: "3DW-###",   serial: null, qtyOwned: 28,  inYard: 28,  customer: null, fieldTicket: null, notes: null },
  { id: 40, size: '3"', category: "Fitting",    item: "Dbl Thread",           psi: null, itemNum: "3DT-###",   serial: null, qtyOwned: 12,  inYard: 12,  customer: null, fieldTicket: null, notes: null },
  { id: 41, size: '3"', category: "Valve",      item: "Plug Valve",           psi: null, itemNum: "3PV-###",   serial: null, qtyOwned: 53,  inYard: 53,  customer: null, fieldTicket: null, notes: null },
  { id: 42, size: '3"', category: "Valve",      item: "Positive Choke",       psi: null, itemNum: "3PC-###",   serial: null, qtyOwned: 9,   inYard: 9,   customer: null, fieldTicket: null, notes: null },
  { id: 43, size: '3"', category: "Valve",      item: "Adjustable Choke",     psi: null, itemNum: "3AC-###",   serial: null, qtyOwned: 9,   inYard: 9,   customer: null, fieldTicket: null, notes: null },
  { id: 44, size: '3"', category: "Fitting",    item: "Male Cap",             psi: null, itemNum: "3MC-###",   serial: null, qtyOwned: 19,  inYard: 19,  customer: null, fieldTicket: null, notes: null },
  { id: 45, size: '3"', category: "Fitting",    item: "Female Cap",           psi: null, itemNum: "3FC-###",   serial: null, qtyOwned: 25,  inYard: 25,  customer: null, fieldTicket: null, notes: null },
  { id: 46, size: '3"', category: "Cross Over", item: '4" x 3" Cross Over',   psi: null, itemNum: "43CO-###",  serial: null, qtyOwned: 16,  inYard: 16,  customer: null, fieldTicket: null, notes: null },
  { id: 47, size: '4"', category: "Pup Joint",  item: '4" x 6"',             psi: null, itemNum: "46IN-###",  serial: null, qtyOwned: 97,  inYard: 97,  customer: null, fieldTicket: null, notes: null },
  { id: 48, size: '4"', category: "Pup Joint",  item: "4\" x 6'",            psi: null, itemNum: "46-###",    serial: null, qtyOwned: 4,   inYard: 4,   customer: null, fieldTicket: null, notes: null },
  { id: 49, size: '4"', category: "Fitting",    item: "Upstream Tee",         psi: null, itemNum: "4TWW-###",  serial: null, qtyOwned: 2,   inYard: 2,   customer: null, fieldTicket: null, notes: null },
  { id: 50, size: '4"', category: "Fitting",    item: "Downstream Tee",       psi: null, itemNum: "4WTT-###",  serial: null, qtyOwned: 4,   inYard: 4,   customer: null, fieldTicket: null, notes: null },
  { id: 51, size: '4"', category: "Fitting",    item: "Male Cap",             psi: null, itemNum: "4MC-###",   serial: null, qtyOwned: 18,  inYard: 18,  customer: null, fieldTicket: null, notes: null },
  { id: 52, size: '4"', category: "Fitting",    item: "Female Cap",           psi: null, itemNum: "4FC-###",   serial: null, qtyOwned: 56,  inYard: 56,  customer: null, fieldTicket: null, notes: null },
  { id: 53, size: '4"', category: "Cross Over", item: '4" x 2" Cross Over',   psi: null, itemNum: "42CO-###",  serial: null, qtyOwned: 27,  inYard: 27,  customer: null, fieldTicket: null, notes: null },
  { id: 54, size: '4"', category: "Fitting",    item: '4" x 3" Tee',          psi: null, itemNum: "4TBD-###",  serial: null, qtyOwned: 4,   inYard: 4,   customer: null, fieldTicket: null, notes: null },
  { id: 55, size: '4"', category: "Fitting",    item: '4" x 2" Tee',          psi: null, itemNum: "4TBD-###",  serial: null, qtyOwned: 0,   inYard: 0,   customer: null, fieldTicket: null, notes: null },
];

// ─── QB RATE SHEET (from FT__Item_List_260310.xlsx) ──────────────────────────
const QB_ITEMS = [
  { code: "1502 Iron - 2", desc: '2" - 1502 Iron', um: "DAY", price: 75 },
  { code: "1502 Iron - 3", desc: '3" - 1502 Iron', um: "DAY", price: 135 },
  { code: "1502 Seal", desc: "1502 Seal", um: "EA", price: 11 },
  { code: "1502TEE2IN", desc: "1502 HP Tee Connection", um: "DAY", price: 25 },
  { code: "BALLCATCH10", desc: '3" Ball Catcher 10k', um: "DAY", price: 225 },
  { code: "BALLCATCH5", desc: '3" Ball Catcher 5k', um: "DAY", price: 150 },
  { code: "BB", desc: "Black Beard Frac Support Package", um: "DAY", price: 350 },
  { code: "BBI", desc: "Black Beard Iron Package", um: "DAY", price: 175 },
  { code: "BBR", desc: "Black Beard Rig Up Rate", um: "HR", price: 750 },
  { code: "BHDT", desc: "Back Hoe / DumpTruck", um: "HR", price: 125 },
  { code: "BLMI", desc: "BLM Iron", um: "DAY", price: 75 },
  { code: "Bolt Cutters", desc: "Bolt Cutters", um: "DAY", price: 50 },
  { code: "CHART", desc: "Meter - Chart Recorder", um: "DAY", price: 25 },
  { code: "CHKADJ", desc: 'Choke Assembly: 3/4" - 1" Adjustable', um: "DAY", price: 40 },
  { code: "CHKSEAT", desc: 'Choke Seat: 3/4" - 1" Tungsten / Ceramic', um: "DAY", price: 15 },
  { code: "CONPMP", desc: "Field Specialist: Contract Pumper", um: "HR", price: 68 },
  { code: "CR55", desc: "Crane 55 Ton", um: "HR", price: 204 },
  { code: "Crane 225", desc: "Crane 225", um: "HR", price: 330 },
  { code: "DELRET", desc: "Deliver / Retrieve Equipment", um: "HR", price: 55 },
  { code: "DIESEL", desc: "Diesel / Gal. - Fuel Replacement", um: "GAL", price: 5 },
  { code: "FBTNKDAY", desc: "Flowback Tank / Day", um: "DAY", price: 125 },
  { code: "FBTNKMIN", desc: "Flowback Tank - 5 Day Minimum", um: "EA", price: 500 },
  { code: "FLADD", desc: '2" - Additional Flowline < 50\'', um: "DAY", price: 50 },
  { code: "FLHP200", desc: '2" Flowline HP & Misc. Connections < 200\'', um: "DAY", price: 150 },
  { code: "FLLP200", desc: '2" Flowline LP & Misc. Connections < 200\'', um: "DAY", price: 100 },
  { code: "FLNG10K", desc: "Flange 10K / Day", um: "DAY", price: 35 },
  { code: "FLNG5K", desc: "Flange 5K / Day", um: "DAY", price: 15 },
  { code: "FLRLNADD", desc: "Additional Flare Line < 150'", um: "DAY", price: 100 },
  { code: "FM", desc: "Supervisor / Foreman", um: "HR", price: 75 },
  { code: "FORKL", desc: "Forklift Rental", um: "DAY", price: 135 },
  { code: "FS>20", desc: "Flare Stack >20' & Flare Line", um: "DAY", price: 125 },
  { code: "FS20", desc: "Flare Stack 20' & Flare Line", um: "DAY", price: 95 },
  { code: "FT1", desc: "Flo Test Well - 1 Man", um: "HR", price: 70 },
  { code: "FT2", desc: "Flo Test Well - 2 Man", um: "HR", price: 120 },
  { code: "FTASST", desc: "Flo Test Well - Assist (2nd Man)", um: "HR", price: 45 },
  { code: "FU", desc: "Fuel Charge", um: "DAY", price: 78 },
  { code: "GEN20KW", desc: "Generator 20KW", um: "DAY", price: 135 },
  { code: "GEN8KW", desc: "Generator 8KW", um: "DAY", price: 100 },
  { code: "HD", desc: "Daily Housing", um: "DAY", price: 125 },
  { code: "HO", desc: 'Hoses 3"', um: "DAY", price: 15 },
  { code: "HOTSHOT", desc: "Hot Shot / Trucking", um: "HR", price: 115 },
  { code: "HT", desc: "Haul Tractor", um: "HR", price: 140 },
  { code: "HV", desc: "Hydrovac Unit - <= 8hrs", um: "DAY", price: 2000 },
  { code: "LHTR", desc: "Line Heater - 6k PSI", um: "DAY", price: 300 },
  { code: "LI", desc: "Long Iron", um: "DAY", price: 150 },
  { code: "LT", desc: "Light Tower", um: "DAY", price: 45 },
  { code: "MAN2V", desc: 'Manifold - 2 x 2" Plug Valve - 15K PSI', um: "DAY", price: 200 },
  { code: "MAN5V", desc: 'Manifold - 5 x 2" Plug Valve Wrap Around - 15K PSI', um: "DAY", price: 210 },
  { code: "MAN9V", desc: 'Manifold - 9 x 2" Plug Valve Wrap Around - 15K PSI', um: "DAY", price: 550 },
  { code: "MB", desc: "Man Basket: Crane", um: "DAY", price: 165 },
  { code: "MIGTRK", desc: "Mileage Charge - Tractor / Gin Truck", um: "MILE", price: 3 },
  { code: "MITRK", desc: "Mileage Charge - Truck Only", um: "MILE", price: 1.8 },
  { code: "MITRKTRL", desc: "Mileage Charge - Truck & Bumper Pull Trailer", um: "MILE", price: 2 },
  { code: "MITRLLB", desc: "Lowboy Trailer", um: "DAY", price: 375 },
  { code: "MOBDEL", desc: "Equipment Delivery", um: "DAY", price: 825 },
  { code: "MP", desc: "Monthly Package - Flowline HP with Sand Trap", um: "DAY", price: 75 },
  { code: "MUFF", desc: "Gas Muffler", um: "DAY", price: 50 },
  { code: "Op", desc: "Operator", um: "HR", price: 65 },
  { code: "ORIF", desc: "Orifice Plate", um: "DAY", price: 30 },
  { code: "Plug Catcher", desc: "Plug Catcher", um: "DAY", price: 100 },
  { code: "PP", desc: "Power Pack - Light Tower/Generator/Water/Propane/Trash", um: "DAY", price: 140 },
  { code: "PROPANE", desc: "Propane / Gal. - Fuel Replacement", um: "GAL", price: 5 },
  { code: "PV1IN", desc: 'Plug Valve 1" - 1502', um: "DAY", price: 25 },
  { code: "PV2IN", desc: 'Plug Valve 2" - 1502', um: "DAY", price: 50 },
  { code: "R", desc: "Roustabout", um: "HR", price: 125 },
  { code: "RD2", desc: "Rig Down - 2 Men", um: "HR", price: 130 },
  { code: "RD3", desc: "Rig Down - 3 Men", um: "HR", price: 125 },
  { code: "RD4", desc: "Rig Down - 4 Men", um: "HR", price: 145 },
  { code: "REST", desc: "Restraints", um: "DAY", price: 40 },
  { code: "RU2", desc: "Rig Up - Iron - 2 Men", um: "HR", price: 85 },
  { code: "RU3", desc: "Rig Up - 3 Men", um: "HR", price: 125 },
  { code: "RU4", desc: "Rig Up - 4 Men", um: "HR", price: 154 },
  { code: "RURD", desc: "Rig Up/Rig Down", um: "HR", price: 60 },
  { code: "SCBA", desc: "SCBA / H2S Monitoring", um: "DAY", price: 35 },
  { code: "SEP125", desc: "Separator - 125 PSI", um: "DAY", price: 125 },
  { code: "SEP1440", desc: "Separator - 1440 PSI", um: "DAY", price: 140 },
  { code: "SEP250", desc: "Separator - 250 PSI", um: "DAY", price: 212.5 },
  { code: "SEP500", desc: "Separator - 500 PSI", um: "DAY", price: 600 },
  { code: "SEP750", desc: "Separator - 750 PSI", um: "DAY", price: 250 },
  { code: "SEPSTBY", desc: "Separator Standby Time", um: "DAY", price: 150 },
  { code: "SS10KDAY", desc: "Sand Separator 10k", um: "DAY", price: 800 },
  { code: "SS10KDAYMANPKG", desc: "Sand Sep 10K Daily Pkg (w/ Manifold)", um: "DAY", price: 575 },
  { code: "SS10KMOPKG", desc: "Sand Sep 10K Monthly Pkg (No Manifold)", um: "DAY", price: 375 },
  { code: "SS5K", desc: "Sand Separator 5K", um: "DAY", price: 600 },
  { code: "SS5KDAYPKG", desc: "Sand Sep 5K Daily Pkg", um: "DAY", price: 800 },
  { code: "SS5KMOPKG", desc: "Sand Sep 5K Monthly Pkg", um: "DAY", price: 275 },
  { code: "ST5k", desc: "Sand Trap 5k", um: "DAY", price: 510 },
  { code: "SP10", desc: "Stack Pack: 10K", um: "DAY", price: 400 },
  { code: "SP15", desc: "Stack Pack: 15K", um: "DAY", price: 500 },
  { code: "SP6K", desc: "Stack Pack - 6k", um: "DAY", price: 400 },
  { code: "Standby", desc: "Standby for Crew", um: "HR", price: 125 },
  { code: "TRVLTR", desc: "Travel Trailer", um: "DAY", price: 100 },
  { code: "TT", desc: "Tool Truck", um: "HR", price: 45 },
  { code: "TWS", desc: "Truck Fee", um: "HR", price: 19 },
  { code: "XH", desc: "Extra Hand", um: "HR", price: 60 },
  { code: "WW", desc: "Well Watch", um: "DAY", price: 70 },
  { code: "MWS", desc: "Mileage - Water Specialist", um: "MILE", price: 1.5 },
  { code: "SITEVISIT", desc: "Site Visit to Evaluate Equipment", um: "HR", price: 45 },
];

// ─── CUSTOMER LIST (from FT__Customer_List_260310.xlsx) ──────────────────────
const CUSTOMERS = [
  { name: "4-Star Tank Rental", contact: "Jake Ethridge", phone: "432-208-3583", email: "4startankrental@att.net", city: "Kermit", state: "TX", zip: "79745", address: "PO Box 471" },
  { name: "9 Band/Atlas", contact: null, phone: null, email: "ap@atlasoperating.com", city: null, state: null, zip: null, address: null },
  { name: "Blackbeard Operating", contact: "Michael Randle", phone: "806-420-9070", email: "ap@blackbeardoperating.com", city: "Midland", state: "TX", zip: "79701", address: "200 N Loraine, Ste 300" },
  { name: "Blue Sky Services", contact: null, phone: null, email: null, city: "Odessa", state: "TX", zip: "79768", address: "P.O. Box 13742" },
  { name: "Certarus", contact: null, phone: null, email: "ap@certarus.com", city: null, state: null, zip: null, address: null },
  { name: "Chevron - Pyote 0064", contact: "James McClain", phone: null, email: null, city: null, state: null, zip: null, address: "UWTN 0064" },
  { name: "Chevron - Reeves 9411", contact: null, phone: null, email: null, city: null, state: null, zip: "9411", address: null },
  { name: "Chevron - WT Pump/Transfer NM Eddy 0064", contact: null, phone: null, email: null, city: "UWTN", state: null, zip: "0064", address: null },
  { name: "Chevron - WT Pump/Transfer NM Lea 0064", contact: null, phone: null, email: null, city: "NM Lea", state: null, zip: "0064", address: null },
  { name: "Chevron - WT Pump/Transfer TX 0064", contact: null, phone: null, email: null, city: "UWTN", state: null, zip: "0064", address: null },
  { name: "CHEVRON 0064", contact: null, phone: null, email: "accounts@flo-test.com", city: "MCBU", state: null, zip: "0064", address: null },
  { name: "CHEVRON 9201", contact: null, phone: null, email: null, city: "UPMC", state: null, zip: "9201", address: null },
  { name: "CHEVRON 9446", contact: null, phone: null, email: null, city: null, state: null, zip: "9446", address: null },
  { name: "CHEVRON 9542", contact: null, phone: null, email: null, city: null, state: null, zip: "9542", address: null },
  { name: "Circle S Energy", contact: "Justin Meyer", phone: null, email: "jmeyer@circlesenergy.com", city: null, state: null, zip: null, address: null },
  { name: "Four Corners Petroleum", contact: "Greg Foster", phone: null, email: "accounts@flotest.com", city: null, state: null, zip: null, address: null },
  { name: "MANZANO LLC (Not Taxed)", contact: "Tom Becker", phone: null, email: "vicki@manzanoenergy.com", city: "Roswell", state: "NM", zip: "88202-2107", address: "PO Box 2107" },
  { name: "MANZANO LLC (Taxed)", contact: "Tom Becker", phone: "575-623-1996", email: "vicki@manzanoenergy.com", city: "Roswell", state: "NM", zip: "88202-1737", address: "PO Box 1737" },
  { name: "Moonlite Oil and Gas Co", contact: "Mason Wilkinson", phone: "432-257-9708", email: "masonmjw2017@gmail.com", city: "Imperial", state: "TX", zip: "79743", address: "PO Box 353" },
  { name: "Sundown Energy / Eland Energy", contact: "James", phone: null, email: "ElandAP@elandenergy.com", city: "Dallas", state: "TX", zip: "75248", address: "16400 Dallas Parkway, Suite 100" },
  { name: "UTOCO LTD.", contact: "Doyle Snow", phone: "432-631-5447", email: "natalie@doylesnow.com", city: null, state: null, zip: null, address: null },
];
const TICKET_TYPES = {
  "Rig Up":   { color: "#B01020", bg: "#fdecea", label: "RIG UP",   abbr: "RU" },
  "Rig Down": { color: "#1a2340", bg: "#e8eaf0", label: "RIG DOWN", abbr: "RD" },
  "Tester":   { color: "#1a7a3c", bg: "#e6f5ec", label: "TESTER",   abbr: "TST" },
  "Pumper":   { color: "#1a5fa8", bg: "#e8f0fb", label: "PUMPER",   abbr: "PMP" },
  "Rental":   { color: "#8a6500", bg: "#fdf5d8", label: "RENTAL",   abbr: "RNT" },
};

const TICKET_STATUSES = {
  draft:      { color: "#6b7a99", bg: "#f0f3f8", label: "DRAFT" },
  inField:    { color: "#8a6500", bg: "#fdf5d8", label: "IN FIELD" },
  emailed:    { color: "#7a3ca0", bg: "#f3eafa", label: "AWAITING SIG" },
  signed:     { color: "#1a7a3c", bg: "#e6f5ec", label: "SIGNED" },
  sigNotReq:  { color: "#1a5fa8", bg: "#e8f0fb", label: "SIG NOT REQ" },
  sentToQB:   { color: "#b85c00", bg: "#fdf0e6", label: "SENT TO QB" },
  qbVerified: { color: "#1a7a3c", bg: "#d4edda", label: "QB VERIFIED" },
};

// ─── INITIAL TICKETS (mock — tied to jobs) ───────────────────────────────────
const INITIAL_TICKETS = [
  { id: 1, jobId: 300001, type: "Rig Up", status: "signed", date: "2026-03-01", signedBy: "Josh Trevino", signedAt: "2026-03-01",
    lineItems: [
      { qbCode: "RU3", desc: "Rig Up - 3 Men", rate: 125, qty: 6, um: "HR" },
      { qbCode: "FLHP200", desc: '2" Flowline HP < 200\'', rate: 150, qty: 3, um: "DAY" },
      { qbCode: "MAN5V", desc: "Manifold - 5V Wrap Around", rate: 210, qty: 3, um: "DAY" },
      { qbCode: "SS10KDAYMANPKG", desc: "Sand Sep 10K Daily Pkg", rate: 575, qty: 1, um: "DAY" },
      { qbCode: "FS>20", desc: "Flare Stack >20'", rate: 125, qty: 3, um: "DAY" },
      { qbCode: "MITRKTRL", desc: "Mileage - Truck & Trailer", rate: 2, qty: 180, um: "MILE" },
    ],
    notes: "3 wells, full package. Day 1 rental included." },
  { id: 2, jobId: 300001, type: "Tester", status: "inField", date: "2026-03-01", signedBy: null, signedAt: null,
    lineItems: [
      { qbCode: "FT2", desc: "Flo Test - 2 Man", rate: 120, qty: 184, um: "HR" },
      { qbCode: "LT", desc: "Light Tower", rate: 45, qty: 10, um: "DAY" },
      { qbCode: "DIESEL", desc: "Diesel", rate: 5, qty: 120, um: "GAL" },
      { qbCode: "TRVLTR", desc: "Travel Trailer", rate: 100, qty: 10, um: "DAY" },
    ],
    notes: "Ongoing — logging daily." },
  { id: 3, jobId: 300002, type: "Rig Up", status: "draft", date: "2026-03-05", signedBy: null, signedAt: null,
    lineItems: [
      { qbCode: "RU2", desc: "Rig Up - 2 Men", rate: 85, qty: 4, um: "HR" },
      { qbCode: "FLLP200", desc: '2" Flowline LP < 200\'', rate: 100, qty: 1, um: "DAY" },
      { qbCode: "CHKADJ", desc: "Adjustable Choke", rate: 40, qty: 1, um: "DAY" },
    ],
    notes: "" },
  { id: 4, jobId: 300000, type: "Rig Up", status: "signed", date: "2026-02-10", signedBy: "Eli Springer", signedAt: "2026-02-10",
    lineItems: [
      { qbCode: "RU4", desc: "Rig Up - 4 Men", rate: 154, qty: 8, um: "HR" },
      { qbCode: "FLHP200", desc: '2" Flowline HP < 200\'', rate: 150, qty: 30, um: "DAY" },
      { qbCode: "MAN5V", desc: "Manifold - 5V", rate: 210, qty: 30, um: "DAY" },
      { qbCode: "FS>20", desc: "Flare Stack >20'", rate: 125, qty: 30, um: "DAY" },
      { qbCode: "SS10KDAYMANPKG", desc: "Sand Sep 10K Pkg", rate: 575, qty: 30, um: "DAY" },
    ],
    notes: "4 wells, 30-day job." },
  { id: 5, jobId: 300000, type: "Tester", status: "signed", date: "2026-02-10", signedBy: "Eli Springer", signedAt: "2026-03-08",
    lineItems: [
      { qbCode: "FT2", desc: "Flo Test - 2 Man", rate: 120, qty: 312, um: "HR" },
      { qbCode: "LT", desc: "Light Tower", rate: 45, qty: 30, um: "DAY" },
      { qbCode: "DIESEL", desc: "Diesel", rate: 5, qty: 400, um: "GAL" },
    ],
    notes: "" },
  { id: 6, jobId: 300000, type: "Rig Down", status: "signed", date: "2026-03-08", signedBy: "Eli Springer", signedAt: "2026-03-08",
    lineItems: [
      { qbCode: "RD4", desc: "Rig Down - 4 Men", rate: 145, qty: 6, um: "HR" },
      { qbCode: "MITRKTRL", desc: "Mileage - Truck & Trailer", rate: 2, qty: 180, um: "MILE" },
    ],
    notes: "All iron accounted for. No DLR.", missingPieces: false },
];

const today = () => new Date().toISOString().slice(0, 10);
const isOverdue = (t) => !t.completed && t.dueDate && t.dueDate < today();
const todoVisible = (t) => t.createdBy === CURRENT_USER || t.assignedTo === CURRENT_USER;
const calcLineTotal = (li) => li.rate * li.qty * (li.days || 1);
const calcTicketTotal = (t) => t.lineItems.reduce((s, li) => s + calcLineTotal(li), 0);

// ─── SHARED UI ────────────────────────────────────────────────────────────────
const inputStyle = {
  width: "100%", boxSizing: "border-box",
  background: C.steel, border: `1px solid ${C.border}`,
  color: C.text, padding: "8px 11px", borderRadius: 4,
  fontSize: 13, fontFamily: "'Arial', sans-serif", outline: "none",
};

const labelStyle = {
  fontSize: 11, fontWeight: 700, color: C.muted,
  letterSpacing: "0.08em", marginBottom: 4, display: "block",
};

function Btn({ onClick, children, variant = "primary", small }) {
  const styles = {
    primary: { background: C.red, color: C.white, border: "none" },
    ghost:   { background: "transparent", color: C.muted, border: `1px solid ${C.border}` },
    blue:    { background: C.blue, color: C.white, border: "none" },
  };
  return (
    <button onClick={onClick} style={{
      ...styles[variant],
      padding: small ? "5px 12px" : "9px 18px",
      borderRadius: 4, fontSize: small ? 12 : 13,
      fontWeight: 700, cursor: "pointer", fontFamily: "'Arial', sans-serif",
      letterSpacing: "0.04em",
    }}>{children}</button>
  );
}

function FilterBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      background: active ? C.blue : "transparent",
      border: `1px solid ${active ? C.blue : C.border}`,
      color: active ? C.white : C.muted,
      padding: "5px 12px", borderRadius: 4, fontSize: 11,
      fontWeight: 700, cursor: "pointer", fontFamily: "'Arial', sans-serif",
    }}>{children}</button>
  );
}

function PriorityBadge({ priority }) {
  if (priority === "normal") return null;
  const hi = priority === "high";
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 3,
      background: hi ? C.priHighB : C.priLowB,
      color: hi ? C.priHigh : C.priLow,
      border: `1px solid ${hi ? C.priHigh : C.priLow}33`,
      letterSpacing: "0.06em",
    }}>{hi ? "HIGH" : "LOW"}</span>
  );
}

function TodoBadge({ count }) {
  if (!count) return null;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: 11, fontWeight: 700, color: C.blue,
      background: C.priLowB, border: `1px solid ${C.priLow}33`,
      padding: "2px 8px", borderRadius: 3,
    }}>☐ {count} To-Do{count !== 1 ? "s" : ""}</span>
  );
}

function NavBadge({ count }) {
  if (!count) return null;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      minWidth: 18, height: 18, borderRadius: 9,
      background: C.red, color: C.white,
      fontSize: 10, fontWeight: 800, padding: "0 5px",
      marginLeft: 5,
    }}>{count}</span>
  );
}

// ─── TODO FORM ────────────────────────────────────────────────────────────────
function TodoForm({ onSave, onCancel, defaultJobId = null, jobs, userNames = [] }) {
  const [form, setForm] = useState({
    title: "", description: "", jobId: defaultJobId,
    assignedTo: CURRENT_USER, priority: "normal", dueDate: "",
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!form.title.trim()) return;
    onSave({ ...form, jobId: form.jobId ? Number(form.jobId) : null, dueDate: form.dueDate || null });
  };

  return (
    <div style={{ background: C.steel, border: `1px solid ${C.border}`, borderRadius: 6, padding: 16, marginBottom: 12 }}>
      <div style={{ marginBottom: 10 }}>
        <label style={labelStyle}>TITLE *</label>
        <input style={inputStyle} value={form.title} onChange={e => set("title", e.target.value)} placeholder="Task title..." />
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={labelStyle}>DESCRIPTION</label>
        <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 56 }} value={form.description} onChange={e => set("description", e.target.value)} placeholder="Optional details..." />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>LINK TO JOB</label>
          <select style={inputStyle} value={form.jobId ?? ""} onChange={e => set("jobId", e.target.value || null)}>
            <option value="">— General Task —</option>
            {jobs.map(j => <option key={j.id} value={j.id}>#{j.id} {j.customer}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>ASSIGN TO</label>
          <select style={inputStyle} value={form.assignedTo} onChange={e => set("assignedTo", e.target.value)}>
            {userNames.map(u => <option key={u}>{u}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>PRIORITY</label>
          <select style={inputStyle} value={form.priority} onChange={e => set("priority", e.target.value)}>
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>DUE DATE</label>
          <input type="date" style={inputStyle} value={form.dueDate} onChange={e => set("dueDate", e.target.value)} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Btn onClick={handleSave}>SAVE TASK</Btn>
        <Btn onClick={onCancel} variant="ghost">CANCEL</Btn>
      </div>
    </div>
  );
}

// ─── TODO ROW ─────────────────────────────────────────────────────────────────
function TodoRow({ todo, onToggle, onNavigateJob, jobs }) {
  const overdue = isOverdue(todo);
  const job = jobs.find(j => j.id === todo.jobId);

  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 12,
      padding: "10px 14px",
      background: overdue ? C.overdueB : C.cardBg,
      border: `1px solid ${overdue ? C.overdue + "44" : C.border}`,
      borderLeft: `3px solid ${overdue ? C.overdue : todo.priority === "high" ? C.priHigh : todo.priority === "low" ? C.priLow : C.border}`,
      borderRadius: 5, marginBottom: 6,
      opacity: todo.completed ? 0.6 : 1,
    }}>
      <div onClick={() => onToggle(todo.id)} style={{
        width: 18, height: 18, borderRadius: 3, flexShrink: 0, marginTop: 1,
        border: `2px solid ${todo.completed ? C.green : C.muted}`,
        background: todo.completed ? C.green : "transparent",
        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {todo.completed && <span style={{ color: C.white, fontSize: 11, fontWeight: 900 }}>✓</span>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{
            fontSize: 13, fontWeight: 700, color: C.text,
            textDecoration: todo.completed ? "line-through" : "none",
          }}>{todo.title}</span>
          <PriorityBadge priority={todo.priority} />
          {overdue && <span style={{ fontSize: 10, fontWeight: 700, color: C.overdue, background: C.overdueB, border: `1px solid ${C.overdue}44`, padding: "2px 7px", borderRadius: 3, letterSpacing: "0.06em" }}>OVERDUE</span>}
        </div>
        {todo.description && <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{todo.description}</div>}
        <div style={{ display: "flex", gap: 12, marginTop: 4, flexWrap: "wrap" }}>
          {job && (
            <span onClick={() => onNavigateJob && onNavigateJob(job.id)} style={{
              fontSize: 11, color: C.blue, fontWeight: 700, cursor: onNavigateJob ? "pointer" : "default",
              textDecoration: onNavigateJob ? "underline" : "none",
            }}>#{job.id} {job.customer}</span>
          )}
          {!job && <span style={{ fontSize: 11, color: C.muted }}>General Task</span>}
          {todo.dueDate && <span style={{ fontSize: 11, color: overdue ? C.overdue : C.muted }}>Due: {todo.dueDate}</span>}
          <span style={{ fontSize: 11, color: C.muted }}>→ {todo.assignedTo}</span>
          {todo.completed && todo.completedBy && (
            <span style={{ fontSize: 11, color: C.green }}>✓ {todo.completedBy} · {todo.completedAt?.slice(0, 10)}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── TODO PAGE ────────────────────────────────────────────────────────────────
function TodoPage({ todos, setTodos, jobs, onNavigateJob, userNames, userIdByName }) {
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("active");
  const [typeFilter, setTypeFilter] = useState("all");

  const myTodos = todos.filter(todoVisible);

  const filtered = myTodos.filter(t => {
    if (filter === "active" && t.completed) return false;
    if (filter === "completed" && !t.completed) return false;
    if (typeFilter === "job" && !t.jobId) return false;
    if (typeFilter === "general" && t.jobId) return false;
    return true;
  });

  const handleSave = async (form) => {
    const payload = {
      title: form.title, description: form.description, job_id: form.jobId,
      priority: form.priority, due_date: form.dueDate,
      created_by: userIdByName[CURRENT_USER], assigned_to: userIdByName[form.assignedTo] || userIdByName[CURRENT_USER],
    };
    try {
      const r = await fetch(`${API_URL}/todos`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (r.ok) {
        const saved = await r.json();
        const newTodo = { id: saved.id, ...form, createdBy: CURRENT_USER, assignedTo: form.assignedTo, completed: false, completedBy: null, completedAt: null };
        setTodos(prev => [newTodo, ...prev]);
      }
    } catch (err) { console.error("Todo create failed:", err); }
    setShowForm(false);
  };

  const toggleTodo = async (id) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    const nowComplete = !todo.completed;
    try {
      await fetch(`${API_URL}/todos/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: nowComplete, completed_by: nowComplete ? userIdByName[CURRENT_USER] : null }),
      });
    } catch (err) { console.error("Todo toggle failed:", err); }
    setTodos(prev => prev.map(t => t.id !== id ? t : {
      ...t, completed: nowComplete,
      completedBy: nowComplete ? CURRENT_USER : null,
      completedAt: nowComplete ? new Date().toISOString() : null,
    }));
  };

  return (
    <div style={{ padding: "24px 28px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>To-Do / Tasks</h1>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
            {myTodos.filter(t => !t.completed).length} active · {myTodos.filter(t => t.completed).length} completed
          </div>
        </div>
        <Btn onClick={() => setShowForm(s => !s)}>{showForm ? "CANCEL" : "+ NEW TASK"}</Btn>
      </div>

      {showForm && <TodoForm onSave={handleSave} onCancel={() => setShowForm(false)} jobs={jobs} userNames={userNames} />}

      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginRight: 4, alignSelf: "center" }}>STATUS:</span>
        {[["active", "ACTIVE"], ["completed", "COMPLETED"]].map(([v, l]) => (
          <FilterBtn key={v} active={filter === v} onClick={() => setFilter(v)}>{l}</FilterBtn>
        ))}
        <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginLeft: 12, marginRight: 4, alignSelf: "center" }}>TYPE:</span>
        {[["all", "ALL"], ["job", "JOB-LINKED"], ["general", "GENERAL"]].map(([v, l]) => (
          <FilterBtn key={v} active={typeFilter === v} onClick={() => setTypeFilter(v)}>{l}</FilterBtn>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 0", color: C.muted, fontSize: 14 }}>No tasks here.</div>
      )}
      {filtered.map(t => (
        <TodoRow key={t.id} todo={t} onToggle={toggleTodo} onNavigateJob={onNavigateJob} jobs={jobs} />
      ))}
    </div>
  );
}

// ─── JOB TODO TAB ─────────────────────────────────────────────────────────────
function JobTodoTab({ jobId, todos, setTodos, jobs, userNames, userIdByName }) {
  const [showForm, setShowForm] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const jobTodos = todos.filter(t => t.jobId === jobId && todoVisible(t));
  const visible = jobTodos.filter(t => showCompleted || !t.completed);

  const handleSave = async (form) => {
    const payload = {
      title: form.title, description: form.description, job_id: form.jobId,
      priority: form.priority, due_date: form.dueDate,
      created_by: userIdByName[CURRENT_USER], assigned_to: userIdByName[form.assignedTo] || userIdByName[CURRENT_USER],
    };
    try {
      const r = await fetch(`${API_URL}/todos`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (r.ok) {
        const saved = await r.json();
        setTodos(prev => [{ id: saved.id, ...form, createdBy: CURRENT_USER, assignedTo: form.assignedTo, completed: false, completedBy: null, completedAt: null }, ...prev]);
      }
    } catch (err) { console.error("Todo create failed:", err); }
    setShowForm(false);
  };

  const toggleTodo = async (id) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    const nowComplete = !todo.completed;
    try {
      await fetch(`${API_URL}/todos/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: nowComplete, completed_by: nowComplete ? userIdByName[CURRENT_USER] : null }),
      });
    } catch (err) { console.error("Todo toggle failed:", err); }
    setTodos(prev => prev.map(t => t.id !== id ? t : {
      ...t, completed: nowComplete,
      completedBy: nowComplete ? CURRENT_USER : null,
      completedAt: nowComplete ? new Date().toISOString() : null,
    }));
  };

  return (
    <div style={{ padding: "16px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.muted }}>
          {jobTodos.filter(t => !t.completed).length} active task{jobTodos.filter(t => !t.completed).length !== 1 ? "s" : ""}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowCompleted(s => !s)} style={{
            background: "transparent", border: `1px solid ${C.border}`,
            color: C.muted, padding: "4px 10px", borderRadius: 4,
            fontSize: 11, fontWeight: 700, cursor: "pointer",
          }}>{showCompleted ? "HIDE COMPLETED" : "SHOW COMPLETED"}</button>
          <Btn small onClick={() => setShowForm(s => !s)}>{showForm ? "CANCEL" : "+ ADD TASK"}</Btn>
        </div>
      </div>

      {showForm && <TodoForm onSave={handleSave} onCancel={() => setShowForm(false)} defaultJobId={jobId} jobs={jobs} userNames={userNames} />}

      {visible.length === 0 && (
        <div style={{ textAlign: "center", padding: "24px 0", color: C.muted, fontSize: 13 }}>No tasks for this job.</div>
      )}
      {visible.map(t => <TodoRow key={t.id} todo={t} onToggle={toggleTodo} jobs={jobs} />)}
    </div>
  );
}

// ─── TICKET DOT ───────────────────────────────────────────────────────────────
function TicketDot({ label, state }) {
  const colors = { signed: C.green, inField: "#1a5fa8", draft: C.yellow, none: "#d0d8e8" };
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <div style={{ width: 10, height: 10, borderRadius: "50%", background: colors[state] || colors.none }} />
      <span style={{ fontSize: 8, color: C.muted, fontWeight: 700 }}>{label}</span>
    </div>
  );
}

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span style={{
      display: "inline-block", padding: "3px 10px", borderRadius: 3,
      fontSize: 11, fontWeight: 800, letterSpacing: "0.1em",
      color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}33`,
    }}>{cfg.label}</span>
  );
}

// ─── PIPELINE SUMMARY ─────────────────────────────────────────────────────────
function PipelineSummary({ jobs }) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
      {STATUS_ORDER.map(status => {
        const count = jobs.filter(j => j.status === status).length;
        const cfg = STATUS_CONFIG[status];
        return (
          <div key={status} style={{
            flex: 1, background: C.cardBg, border: `1px solid ${C.border}`,
            borderTop: `2px solid ${cfg.color}`, borderRadius: 6, padding: "12px 14px",
          }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: cfg.color }}>{count}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.08em" }}>{cfg.label}</div>
          </div>
        );
      })}
    </div>
  );
}

// ─── JOB CARD ─────────────────────────────────────────────────────────────────
function JobCard({ job, isExpanded, onToggle, pendingTodos, todos, setTodos, tickets, setTickets, jobs, onNavigateJob, onUpdateJob, onDeleteJob, onFlagCancel, jsas, setJsas, userNames, qbItems, userIdByName, currentUser }) {
  const cfg = STATUS_CONFIG[job.status];
  const costPerWell = job.wells.length > 1 ? (job.estimatedCost / job.wells.length).toFixed(0) : null;
  const [activeTab, setActiveTab] = useState("details");
  const [showEditJob, setShowEditJob] = useState(false);
  const [showJSA, setShowJSA] = useState(false);
  const [showFlowback, setShowFlowback] = useState(false);
  const jobTickets = tickets.filter(t => t.jobId === job.id);
  const ticketTotal = jobTickets.reduce((s, t) => s + calcTicketTotal(t), 0);

  // Derive dot states from actual tickets
  const dotState = (type) => {
    const t = jobTickets.filter(tk => tk.type === type);
    if (t.length === 0) return "none";
    if (t.some(tk => tk.status === "qbVerified")) return "signed";
    if (t.some(tk => tk.status === "sentToQB")) return "signed";
    if (t.some(tk => tk.status === "signed" || tk.status === "sigNotReq")) return "signed";
    if (t.some(tk => tk.status === "emailed")) return "inField";
    if (t.some(tk => tk.status === "inField")) return "inField";
    return "draft";
  };

  const isFlagged = job.status === "flaggedCancel";

  return (
    <div style={{
      background: isFlagged ? "#fdf0e6" : C.cardBg, border: `1px solid ${isFlagged ? "#b85c00" : C.border}`,
      borderLeft: `3px solid ${isFlagged ? "#b85c00" : cfg.color}`, borderRadius: 6, marginBottom: 8,
      boxShadow: isExpanded ? `0 4px 24px ${cfg.color}22` : "none",
      overflow: "hidden",
    }}>
      <div onClick={onToggle} style={{
        display: "grid", gridTemplateColumns: "80px 1fr 1fr 140px 160px 120px 90px",
        alignItems: "center", padding: "14px 18px",
        cursor: "pointer", gap: 12, userSelect: "none",
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.1em" }}>JOB #</div>
          <div style={{ fontSize: 17, fontWeight: 800, color: C.text }}>{job.id}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.08em", marginBottom: 2 }}>CUSTOMER</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{job.customer}</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>{job.location}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.08em", marginBottom: 2 }}>WELLS</div>
          <div style={{ fontSize: 13, color: C.text }}>{job.wells.length} {job.wells.length === 1 ? "well" : "wells"}</div>
          <div style={{ fontSize: 11, color: C.muted }}>{job.wells[0]}{job.wells.length > 1 ? ` +${job.wells.length - 1}` : ""}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.08em", marginBottom: 2 }}>DATE STARTED</div>
          <div style={{ fontSize: 13, color: C.text }}>{job.dateStarted}</div>
          <div style={{ fontSize: 11, color: C.muted }}>{job.hoursLogged}h logged</div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.08em", marginBottom: 6 }}>TICKETS</div>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <TicketDot label="RU" state={dotState("Rig Up")} />
            <TicketDot label="TST" state={dotState("Tester")} />
            <TicketDot label="PMP" state={dotState("Pumper")} />
            <TicketDot label="RNT" state={dotState("Rental")} />
            <TicketDot label="RD" state={dotState("Rig Down")} />
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.08em", marginBottom: 4 }}>TASKS</div>
          <TodoBadge count={pendingTodos} />
          {!pendingTodos && <span style={{ fontSize: 11, color: C.muted }}>None pending</span>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          <StatusBadge status={job.status} />
          <span style={{ color: C.muted, fontSize: 12, display: "inline-block", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▾</span>
        </div>
      </div>

      {isExpanded && (
        <div style={{ borderTop: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, background: C.steel, padding: "0 18px" }}>
            {[["details", "DETAILS"], ["tickets", `TICKETS${jobTickets.length ? ` (${jobTickets.length})` : ""}`], ["todos", `TO-DOS${pendingTodos ? ` (${pendingTodos})` : ""}`]].map(([tab, label]) => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                background: "transparent", border: "none",
                borderBottom: activeTab === tab ? `2px solid ${C.red}` : "2px solid transparent",
                color: activeTab === tab ? C.text : C.muted,
                padding: "10px 16px", fontSize: 12, fontWeight: 700,
                cursor: "pointer", letterSpacing: "0.06em",
              }}>{label}</button>
            ))}
          </div>

          {activeTab === "details" && (
            <div style={{
              padding: "18px 18px 20px", display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 24, background: "#f7f9fc",
            }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.1em", marginBottom: 8 }}>WELLS / AFE</div>
                {job.wells.map((well, i) => (
                  <div key={i} style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 12, color: C.text, fontWeight: 600 }}>{well}</div>
                    <div style={{ fontSize: 11, color: job.afe[i] ? "#1a5fa8" : C.muted }}>{job.afe[i] || "AFE pending"}</div>
                    {costPerWell && <div style={{ fontSize: 11, color: C.green }}>${Number(costPerWell).toLocaleString()} / well</div>}
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.1em", marginBottom: 8 }}>CREW</div>
                {job.crew.map((c, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: C.text }}>{c.name}</span>
                    <span style={{ fontSize: 11, color: C.muted, fontStyle: "italic" }}>{c.role}</span>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.1em", marginBottom: 8 }}>EQUIPMENT</div>
                {job.equipment.map((eq, i) => (
                  <div key={i} style={{ fontSize: 12, color: C.text, marginBottom: 5, display: "flex", gap: 6 }}>
                    <span style={{ color: C.red, fontSize: 8, marginTop: 4 }}>◆</span>{eq}
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.1em", marginBottom: 8 }}>ACTIONS</div>
                {(() => {
                  const role = currentUser?.role || "field";
                  const canDelete = ["owner", "admin", "ops_mgr"].includes(role);
                  const actions = [
                    { label: "View Field Tickets", action: () => setActiveTab("tickets") },
                    { label: jsas.find(j => j.jobId === job.id) ? "Open JSA ✓" : "Open JSA", action: () => setShowJSA(true) },
                    { label: "Flowback Data", action: () => setShowFlowback(true) },
                    { label: "Edit Job", action: () => setShowEditJob(true) },
                    { label: "Export to QB", action: null },
                  ];
                  if (canDelete) {
                    actions.push({ label: "DELETE JOB", action: () => onDeleteJob(job.id), danger: true });
                  } else if (job.status !== "flaggedCancel") {
                    actions.push({ label: "Flag: To Be Cancelled", action: () => onFlagCancel(job.id), warn: true });
                  }
                  return actions;
                })().map((btn, i) => (
                  <button key={i} onClick={(e) => { e.stopPropagation(); if (btn.action) btn.action(); }} style={{
                    display: "block", width: "100%", background: btn.danger ? "#fdecea" : btn.warn ? "#fdf5d8" : "transparent",
                    border: `1px solid ${btn.danger ? C.red : btn.warn ? "#8a6500" : C.border}`,
                    color: btn.danger ? C.red : btn.warn ? "#8a6500" : btn.action ? C.text : C.muted,
                    padding: "7px 12px", borderRadius: 4, fontSize: 12,
                    cursor: btn.action ? "pointer" : "default", textAlign: "left", marginBottom: 6,
                    fontFamily: "'Arial', sans-serif", opacity: btn.action ? 1 : 0.5,
                    fontWeight: btn.danger || btn.warn ? 800 : 400,
                  }}
                    onMouseEnter={e => { if (btn.action) { e.target.style.borderColor = C.red; e.target.style.background = btn.danger ? "#f5c6cb" : "#fbeaec"; }}}
                    onMouseLeave={e => { e.target.style.borderColor = btn.danger ? C.red : btn.warn ? "#8a6500" : C.border; e.target.style.background = btn.danger ? "#fdecea" : btn.warn ? "#fdf5d8" : "transparent"; }}
                  >{btn.label}{!btn.action ? " (coming soon)" : ""}</button>
                ))}
              </div>
            </div>
          )}

          {activeTab === "tickets" && (
            <div style={{ padding: "0 18px 18px", background: "#f7f9fc" }}>
              <JobTicketsTab jobId={job.id} tickets={tickets} setTickets={setTickets} jobs={jobs} qbItems={qbItems} />
            </div>
          )}

          {activeTab === "todos" && (
            <div style={{ padding: "0 18px 18px", background: "#f7f9fc" }}>
              <JobTodoTab jobId={job.id} todos={todos} setTodos={setTodos} jobs={jobs} userNames={userNames} userIdByName={userIdByName} />
            </div>
          )}
        </div>
      )}
      {showEditJob && <EditJobModal job={job} onSave={(updates) => { onUpdateJob(job.id, updates); setShowEditJob(false); }} onClose={() => setShowEditJob(false)} />}
      {showJSA && <JSAModal job={job} existingJSA={jsas.find(j => j.jobId === job.id) || null} onSave={async (jsaData) => {
        try {
          await fetch(`${API_URL}/jsas/${job.id}`, {
            method: "PUT", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              date: jsaData.date, time: jsaData.time, operator: jsaData.operator,
              well_name: jsaData.wellName, designated_driver: jsaData.designatedDriver,
              latitude: jsaData.lat, longitude: jsaData.lng, weather: jsaData.weather,
              ppe_fr_clothing: jsaData.ppe?.frClothing, ppe_tools_trained: jsaData.ppe?.toolsTrained,
              ppe_confined_space: jsaData.ppe?.confinedSpace, presenter_review: jsaData.presenterReview,
              signatures: jsaData.signatures, additional_steps: jsaData.additionalSteps,
            }),
          });
        } catch (err) { console.error("JSA save failed:", err); }
        setJsas(prev => {
          const existing = prev.findIndex(j => j.jobId === job.id);
          if (existing >= 0) return prev.map((j, i) => i === existing ? jsaData : j);
          return [...prev, jsaData];
        });
      }} onClose={() => setShowJSA(false)} />}
      {showFlowback && <FlowbackModal job={job} onClose={() => setShowFlowback(false)} />}
    </div>
  );
}

// ─── EDIT JOB MODAL ───────────────────────────────────────────────────────────
function EditJobModal({ job, onSave, onClose }) {
  const [customer, setCustomer] = useState(job.customer);
  const [location, setLocation] = useState(job.location);
  const [wells, setWells] = useState(job.wells.join(", "));
  const [afe, setAfe] = useState((job.afe || []).filter(Boolean).join(", "));
  const [status, setStatus] = useState(job.status);
  const [crewList, setCrewList] = useState([...job.crew]);

  const addCrew = () => setCrewList(prev => [...prev, { name: "", role: "" }]);
  const updateCrew = (idx, field, val) => setCrewList(prev => prev.map((c, i) => i === idx ? { ...c, [field]: val } : c));
  const removeCrew = (idx) => setCrewList(prev => prev.filter((_, i) => i !== idx));

  return (
    <ModalWrap title={`Edit Job #${job.id}`} onClose={onClose} width={560}>
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>CUSTOMER</label>
        <input style={inputStyle} value={customer} onChange={e => setCustomer(e.target.value)} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>LOCATION</label>
        <input style={inputStyle} value={location} onChange={e => setLocation(e.target.value)} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>WELLS (comma-separated)</label>
          <input style={inputStyle} value={wells} onChange={e => setWells(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>AFE # (comma-separated)</label>
          <input style={inputStyle} value={afe} onChange={e => setAfe(e.target.value)} />
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>STATUS</label>
        <div style={{ display: "flex", gap: 6 }}>
          {STATUS_ORDER.map(s => (
            <FilterBtn key={s} active={status === s} onClick={() => setStatus(s)}>{STATUS_CONFIG[s].label}</FilterBtn>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>CREW</label>
        {crewList.map((c, i) => (
          <div key={i} style={{ display: "flex", gap: 6, marginBottom: 4 }}>
            <input style={{ ...inputStyle, flex: 1 }} value={c.name} placeholder="Name" onChange={e => updateCrew(i, "name", e.target.value)} />
            <select style={{ ...inputStyle, width: 130 }} value={c.role} onChange={e => updateCrew(i, "role", e.target.value)}>
              <option value="">Role...</option>
              {["Supervisor", "Rig Up", "Helper", "Tester", "Pumper"].map(r => <option key={r}>{r}</option>)}
            </select>
            <button onClick={() => removeCrew(i)} style={{ background: "transparent", border: "none", color: C.red, cursor: "pointer", fontSize: 16, fontWeight: 700 }}>×</button>
          </div>
        ))}
        <Btn small variant="ghost" onClick={addCrew}>+ ADD CREW</Btn>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <Btn onClick={() => {
          const wellList = wells.split(",").map(w => w.trim()).filter(Boolean);
          const afeList = afe ? afe.split(",").map(a => a.trim()) : wellList.map(() => null);
          onSave({ customer, location, wells: wellList.length > 0 ? wellList : ["TBD"], afe: afeList, status, crew: crewList.filter(c => c.name) });
        }}>SAVE</Btn>
        <Btn onClick={onClose} variant="ghost">CANCEL</Btn>
      </div>
    </ModalWrap>
  );
}

// ─── JSA MODAL ────────────────────────────────────────────────────────────────
function JSAModal({ job, onClose, onSave, existingJSA }) {
  const jsa = existingJSA;
  const [date, setDate] = useState(jsa?.date || today());
  const [operator, setOperator] = useState(jsa?.operator || job.customer);
  const [wellName, setWellName] = useState(jsa?.wellName || job.wells[0] || "");
  const [time, setTime] = useState(jsa?.time || "");
  const [designatedDriver, setDesignatedDriver] = useState(jsa?.designatedDriver || "");
  const [lat, setLat] = useState(jsa?.lat || "");
  const [lng, setLng] = useState(jsa?.lng || "");
  const [weather, setWeather] = useState(jsa?.weather || []);
  const [ppe, setPpe] = useState(jsa?.ppe || { frClothing: false, toolsTrained: false, confinedSpace: false });
  const [signatures, setSignatures] = useState(jsa?.signatures || [""]);
  const [presenterReview, setPresenterReview] = useState(jsa?.presenterReview ||
    "STOP WORK AUTHORITY. Slips Trips Falls. Keep Walkways Clear. Confined Spaces & Pinch Points. Hands Visible at all times. Eye Safety. 100% Tie Off Policy. Location of Emergency First Aid Kit and how to find the nearest hospital. Importance of a good attitude. Good Communication is key!"
  );
  const [additionalSteps, setAdditionalSteps] = useState(jsa?.additionalSteps || [{ step: "", hazard: "", procedure: "" }]);

  const weatherOpts = ["clear", "cloudy", "calm", "rain", "mud", "hot", "windy", "freezing", "ice", "snow"];

  const PRE_FILLED_STEPS = [
    { step: "Driving to/from or in and around location", hazard: "Driving too fast. Backing without a spotter. Being unaware of surroundings. Using a cell phone while operating a vehicle.", procedure: "Communicate with those around you using signals/lights/horn. Do not use cell phone while driving. Eliminate distractions." },
    { step: "SDS", hazard: "Chemical Exposure", procedure: "SDS electronically or physically available on site." },
    { step: "Worksite & PPE inspection of all equipment", hazard: "Slips, trips, falls, pinch points, enclosed areas, poor lighting, H2S. Defective, absent, or dirty PPE.", procedure: "Repair, replace or clean necessary items. Remove debris. Identify PPE needed & safe handling procedures." },
    { step: "Receive authorization to begin work", hazard: "Onsite Operations Supervisor not aware of work being performed or permits not completed.", procedure: "Receive authorization from the person in charge. Complete all applicable Permits to Work." },
    { step: "Conduct Safety Meeting with all onsite workers", hazard: "Jobsite workers not knowing what activity is about to take place. Hazardous conditions not observed by personnel.", procedure: "Review with all personnel & sign off on safety meeting sheet. Allow others to voice concerns, comments, questions." },
    { step: "Begin job slowly. Watch for personnel not paying attention.", hazard: "Quick movements can result in poor awareness of surrounding personnel and can easily cause unintentional reactions.", procedure: "Work slow and steady. If situations require quick movements, alert everyone before moving." },
  ];

  const toggleWeather = (w) => setWeather(prev => prev.includes(w) ? prev.filter(x => x !== w) : [...prev, w]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={onClose}>
      <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderTop: `4px solid ${C.text}`, borderRadius: 8, padding: 0, width: 900, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: "16px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "0.06em" }}>FLO-TEST, INC. — JSA</div>
            <div style={{ fontSize: 11, color: C.muted }}>#{job.id} — Tailgate Safety Meeting · {job.customer}</div>
          </div>
          <div style={{ fontSize: 11, color: C.muted }}>AIRLIFE: 800-627-2376</div>
        </div>

        <div style={{ padding: "16px 24px" }}>
          {/* Top fields */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
            <div><label style={labelStyle}>DATE</label><input type="date" style={inputStyle} value={date} onChange={e => setDate(e.target.value)} /></div>
            <div><label style={labelStyle}>TIME</label><input style={inputStyle} value={time} onChange={e => setTime(e.target.value)} placeholder="07:00" /></div>
            <div><label style={labelStyle}>OPERATOR</label><input style={inputStyle} value={operator} onChange={e => setOperator(e.target.value)} /></div>
            <div><label style={labelStyle}>WELL NAME & #</label><input style={inputStyle} value={wellName} onChange={e => setWellName(e.target.value)} /></div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
            <div><label style={labelStyle}>DESIGNATED DRIVER</label><input style={inputStyle} value={designatedDriver} onChange={e => setDesignatedDriver(e.target.value)} /></div>
            <div><label style={labelStyle}>LATITUDE</label><input style={inputStyle} value={lat} onChange={e => setLat(e.target.value)} /></div>
            <div><label style={labelStyle}>LONGITUDE</label><input style={inputStyle} value={lng} onChange={e => setLng(e.target.value)} /></div>
          </div>

          {/* Crew Signatures */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>CREW SIGNATURES (By signing, each person acknowledges STOP WORK AUTHORITY)</label>
            {signatures.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                <input style={{ ...inputStyle, flex: 1 }} value={s} onChange={e => { const ns = [...signatures]; ns[i] = e.target.value; setSignatures(ns); }} placeholder={`Crew member ${i + 1}`} />
                {signatures.length > 1 && <button onClick={() => setSignatures(prev => prev.filter((_, j) => j !== i))} style={{ background: "transparent", border: "none", color: C.red, cursor: "pointer", fontSize: 16 }}>×</button>}
              </div>
            ))}
            <Btn small variant="ghost" onClick={() => setSignatures(prev => [...prev, ""])}>+ ADD SIGNATURE</Btn>
          </div>

          {/* Presenter Review */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>PRESENTER REVIEW</label>
            <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 60, fontSize: 11 }} value={presenterReview} onChange={e => setPresenterReview(e.target.value)} />
          </div>

          {/* PPE & Weather */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>PPE CHECK</label>
              {[["frClothing", "FR Clothing, H2S Monitor, Hard Hat, Safety Glasses, Steel Toed Footwear"], ["toolsTrained", "Trained in use of tools / equipment"], ["confinedSpace", "Confined space permit completed?"]].map(([k, lbl]) => (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, cursor: "pointer" }} onClick={() => setPpe(p => ({ ...p, [k]: !p[k] }))}>
                  <div style={{ width: 16, height: 16, borderRadius: 3, border: `2px solid ${ppe[k] ? C.green : C.muted}`, background: ppe[k] ? C.green : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {ppe[k] && <span style={{ color: C.white, fontSize: 10, fontWeight: 900 }}>✓</span>}
                  </div>
                  <span style={{ fontSize: 11, color: C.text }}>{lbl}</span>
                </div>
              ))}
            </div>
            <div>
              <label style={labelStyle}>WEATHER CONDITIONS</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {weatherOpts.map(w => (
                  <button key={w} onClick={() => toggleWeather(w)} style={{
                    background: weather.includes(w) ? C.blue : "transparent",
                    color: weather.includes(w) ? C.white : C.muted,
                    border: `1px solid ${weather.includes(w) ? C.blue : C.border}`,
                    borderRadius: 4, padding: "3px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer",
                  }}>{w}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Pre-filled Job Steps */}
          <label style={labelStyle}>BASIC JOB STEPS / POTENTIAL HAZARDS / SAFE PROCEDURES</label>
          <div style={{ border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden", marginBottom: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 1fr 1fr", background: C.darkBlue, padding: "8px 10px" }}>
              {["#", "Basic Job Step", "Potential Hazards", "Recommended Safe Procedures"].map(h => (
                <div key={h} style={{ fontSize: 9, fontWeight: 800, color: C.white, letterSpacing: "0.08em" }}>{h}</div>
              ))}
            </div>
            {PRE_FILLED_STEPS.map((s, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "40px 1fr 1fr 1fr", padding: "6px 10px", borderBottom: `1px solid ${C.border}22`, background: i % 2 === 0 ? C.cardBg : C.steel }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted }}>{i + 1}</div>
                <div style={{ fontSize: 10, color: C.text, paddingRight: 8 }}>{s.step}</div>
                <div style={{ fontSize: 10, color: C.text, paddingRight: 8 }}>{s.hazard}</div>
                <div style={{ fontSize: 10, color: C.text }}>{s.procedure}</div>
              </div>
            ))}
            {/* Additional blank steps */}
            {additionalSteps.map((s, i) => (
              <div key={`a${i}`} style={{ display: "grid", gridTemplateColumns: "40px 1fr 1fr 1fr", padding: "4px 10px", borderBottom: `1px solid ${C.border}22`, gap: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted }}>{PRE_FILLED_STEPS.length + i + 1}</div>
                <input style={{ ...inputStyle, padding: "3px 6px", fontSize: 10 }} value={s.step} onChange={e => { const ns = [...additionalSteps]; ns[i].step = e.target.value; setAdditionalSteps(ns); }} />
                <input style={{ ...inputStyle, padding: "3px 6px", fontSize: 10 }} value={s.hazard} onChange={e => { const ns = [...additionalSteps]; ns[i].hazard = e.target.value; setAdditionalSteps(ns); }} />
                <input style={{ ...inputStyle, padding: "3px 6px", fontSize: 10 }} value={s.procedure} onChange={e => { const ns = [...additionalSteps]; ns[i].procedure = e.target.value; setAdditionalSteps(ns); }} />
              </div>
            ))}
          </div>
          <Btn small variant="ghost" onClick={() => setAdditionalSteps(prev => [...prev, { step: "", hazard: "", procedure: "" }])}>+ ADD STEP</Btn>
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 24px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 8 }}>
          <Btn onClick={() => {
            onSave({
              jobId: job.id, date, time, operator, wellName, designatedDriver,
              lat, lng, weather, ppe, signatures: signatures.filter(Boolean),
              presenterReview, additionalSteps: additionalSteps.filter(s => s.step || s.hazard || s.procedure),
              savedAt: new Date().toISOString(),
            });
            onClose();
          }}>SAVE JSA</Btn>
          <Btn onClick={onClose} variant="ghost">CLOSE</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── FLOWBACK DATA MODAL ──────────────────────────────────────────────────────
const API_URL = "https://fti-app-production.up.railway.app/api";

function FlowbackModal({ job, onClose }) {
  const [dayNum, setDayNum] = useState(1);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const HOURS = ["07:00","08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00","21:00","22:00","23:00","00:00","01:00","02:00","03:00","04:00","05:00","06:00"];
  const COLS = ["Choke", "FL PSI", "Tbg PSI", "Csg PSI", "Temp", "H2O/Hr", "OIL/Hr", "Gas/Hr", "Remarks"];

  const emptyRow = () => ({ choke: "", flPsi: "", tbgPsi: "", csgPsi: "", temp: "", h2oHr: "", oilHr: "", gasHr: "", remarks: "" });
  const [rows, setRows] = useState(HOURS.map(() => emptyRow()));
  const [allDays, setAllDays] = useState({});

  const loadDay = (day) => {
    if (allDays[day]) { setRows(allDays[day]); return; }
    fetch(`${API_URL}/flowback/${job.id}/${day}`)
      .then(r => r.json())
      .then(data => {
        if (data && Array.isArray(data) && data.length > 0) {
          const loaded = HOURS.map(hr => {
            const match = data.find(d => d.hour === hr);
            if (match) {
              return {
                choke: match.choke || "", flPsi: match.fl_psi != null ? String(match.fl_psi) : "",
                tbgPsi: match.tbg_psi != null ? String(match.tbg_psi) : "", csgPsi: match.csg_psi != null ? String(match.csg_psi) : "",
                temp: match.temp != null ? String(match.temp) : "", h2oHr: match.h2o_hr != null ? String(match.h2o_hr) : "",
                oilHr: match.oil_hr != null ? String(match.oil_hr) : "", gasHr: match.gas_hr != null ? String(match.gas_hr) : "",
                remarks: match.remarks || "",
              };
            }
            return emptyRow();
          });
          setRows(loaded);
          setAllDays(prev => ({ ...prev, [day]: loaded }));
        } else {
          setRows(HOURS.map(() => emptyRow()));
        }
      })
      .catch(() => setRows(HOURS.map(() => emptyRow())));
  };

  useState(() => { loadDay(1); });
  const changeDay = (newDay) => {
    setAllDays(prev => ({ ...prev, [dayNum]: rows }));
    setDayNum(newDay);
    loadDay(newDay);
  };

  const updateRow = (idx, field, val) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r));
    setSaveMsg("");
  };

  const saveDay = () => {
    setSaving(true); setSaveMsg("");
    const payload = {
      rows: HOURS.map((hr, idx) => ({
        hour: hr, choke: rows[idx].choke || null, fl_psi: rows[idx].flPsi || null,
        tbg_psi: rows[idx].tbgPsi || null, csg_psi: rows[idx].csgPsi || null,
        temp: rows[idx].temp || null, h2o_hr: rows[idx].h2oHr || null,
        oil_hr: rows[idx].oilHr || null, gas_hr: rows[idx].gasHr || null,
        remarks: rows[idx].remarks || null,
      }))
    };
    fetch(`${API_URL}/flowback/${job.id}/${dayNum}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(r => r.json())
      .then(data => {
        if (data.saved) { setSaveMsg("Saved"); setAllDays(prev => ({ ...prev, [dayNum]: rows })); }
        else { setSaveMsg("Error saving"); }
      })
      .catch(() => setSaveMsg("Error — check connection"))
      .finally(() => setSaving(false));
  };

  const fields = ["choke", "flPsi", "tbgPsi", "csgPsi", "temp", "h2oHr", "oilHr", "gasHr", "remarks"];
  const totalH2O = rows.reduce((s, r) => s + (Number(r.h2oHr) || 0), 0);
  const totalOil = rows.reduce((s, r) => s + (Number(r.oilHr) || 0), 0);
  const totalGas = rows.reduce((s, r) => s + (Number(r.gasHr) || 0), 0);

  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={onClose}>
      <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderTop: `4px solid ${C.blue}`, borderRadius: 8, padding: 0, width: 960, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: "16px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>Flowback Data — Day {dayNum}</div>
            <div style={{ fontSize: 11, color: C.muted }}>Job #{job.id} — {job.customer} · {job.wells[0]}</div>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.muted }}>DAY:</span>
            <button onClick={() => changeDay(Math.max(1, dayNum - 1))} style={{ background: C.steel, border: `1px solid ${C.border}`, borderRadius: 4, padding: "4px 10px", cursor: "pointer", fontWeight: 700 }}>◀</button>
            <span style={{ fontSize: 16, fontWeight: 800, minWidth: 30, textAlign: "center" }}>{dayNum}</span>
            <button onClick={() => changeDay(Math.min(31, dayNum + 1))} style={{ background: C.steel, border: `1px solid ${C.border}`, borderRadius: 4, padding: "4px 10px", cursor: "pointer", fontWeight: 700 }}>▶</button>
          </div>
        </div>

        {/* Summary */}
        <div style={{ display: "flex", gap: 16, padding: "10px 24px", background: C.steel, borderBottom: `1px solid ${C.border}` }}>
          <div><span style={{ fontSize: 10, fontWeight: 700, color: C.muted }}>H2O TODAY: </span><span style={{ fontSize: 13, fontWeight: 800, color: C.blue }}>{totalH2O}</span><span style={{ fontSize: 9, fontWeight: 700, color: C.muted, marginLeft: 3 }}>bbls</span></div>
          <div><span style={{ fontSize: 10, fontWeight: 700, color: C.muted }}>OIL TODAY: </span><span style={{ fontSize: 13, fontWeight: 800, color: C.green }}>{totalOil}</span><span style={{ fontSize: 9, fontWeight: 700, color: C.muted, marginLeft: 3 }}>bbls</span></div>
          <div><span style={{ fontSize: 10, fontWeight: 700, color: C.muted }}>GAS TODAY: </span><span style={{ fontSize: 13, fontWeight: 800, color: C.orange }}>{totalGas}</span><span style={{ fontSize: 9, fontWeight: 700, color: C.muted, marginLeft: 3 }}>MCF</span></div>
          <div><span style={{ fontSize: 10, fontWeight: 700, color: C.muted }}>TOTAL FLUID: </span><span style={{ fontSize: 13, fontWeight: 800 }}>{totalH2O + totalOil}</span><span style={{ fontSize: 9, fontWeight: 700, color: C.muted, marginLeft: 3 }}>bbls</span></div>
          {(totalH2O + totalOil) > 0 && <div><span style={{ fontSize: 10, fontWeight: 700, color: C.muted }}>OIL CUT: </span><span style={{ fontSize: 13, fontWeight: 800, color: C.red }}>{((totalOil / (totalH2O + totalOil)) * 100).toFixed(1)}%</span></div>}
        </div>

        {/* Data table */}
        <div style={{ padding: "0 24px 16px", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, fontFamily: "'Arial', sans-serif", marginTop: 8 }}>
            <thead>
              <tr style={{ background: C.darkBlue }}>
                <th style={{ padding: "6px 8px", color: C.white, fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", borderBottom: `2px solid ${C.red}`, textAlign: "left" }}>TIME</th>
                {COLS.map(c => (
                  <th key={c} style={{ padding: "6px 6px", color: C.white, fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", borderBottom: `2px solid ${C.red}`, textAlign: "left" }}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HOURS.map((hr, idx) => (
                <tr key={hr} style={{ background: idx % 2 === 0 ? C.cardBg : C.steel, borderBottom: `1px solid ${C.border}22` }}>
                  <td style={{ padding: "3px 8px", fontWeight: 700, color: C.muted, fontSize: 11, whiteSpace: "nowrap" }}>{hr}</td>
                  {fields.map(f => (
                    <td key={f} style={{ padding: "2px 2px" }}>
                      <input
                        style={{ ...inputStyle, padding: "3px 4px", fontSize: 11, textAlign: f === "remarks" ? "left" : "right", width: f === "remarks" ? 120 : 55 }}
                        value={rows[idx][f]}
                        onChange={e => updateRow(idx, f, e.target.value)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 24px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 8, alignItems: "center" }}>
          <Btn onClick={saveDay}>{saving ? "SAVING..." : `SAVE DAY ${dayNum}`}</Btn>
          <Btn onClick={onClose} variant="ghost">CLOSE</Btn>
          {saveMsg && <span style={{ fontSize: 12, fontWeight: 700, color: saveMsg === "Saved" ? C.green : C.red, marginLeft: 8 }}>{saveMsg === "Saved" ? "✓ " : "✗ "}{saveMsg}</span>}
        </div>
      </div>
    </div>
  );
}

// ─── TICKET BADGE ─────────────────────────────────────────────────────────────
function TicketTypeBadge({ type }) {
  const cfg = TICKET_TYPES[type];
  return (
    <span style={{
      display: "inline-block", padding: "3px 10px", borderRadius: 3,
      fontSize: 10, fontWeight: 800, letterSpacing: "0.1em",
      color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}33`,
    }}>{cfg.label}</span>
  );
}

function TicketStatusBadge({ status }) {
  const cfg = TICKET_STATUSES[status];
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 3,
      fontSize: 9, fontWeight: 800, letterSpacing: "0.1em",
      color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}33`,
    }}>{cfg.label}</span>
  );
}

// ─── TICKET LINE ITEM EDITOR ──────────────────────────────────────────────────
function LineItemEditor({ lineItems, setLineItems, ticketType, qbItems = [] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const isRental = ticketType === "Rental";

  const filteredQB = searchTerm.length > 0 ? qbItems.filter(q =>
    q.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.desc.toLowerCase().includes(searchTerm.toLowerCase())
  ) : qbItems;

  const addItem = (qb) => {
    setLineItems(prev => [...prev, { qbCode: qb.code, desc: qb.desc, rate: qb.price, qty: 1, um: qb.um, ...(isRental ? { days: 1 } : {}) }]);
    setSearchTerm("");
    setShowSearch(false);
  };

  const addBlank = () => {
    setLineItems(prev => [...prev, { qbCode: "", desc: "", rate: 0, qty: 1, um: "DAY", ...(isRental ? { days: 1 } : {}) }]);
  };

  const updateItem = (idx, field, value) => {
    setLineItems(prev => prev.map((li, i) => i === idx ? { ...li, [field]: value } : li));
  };

  const removeItem = (idx) => {
    setLineItems(prev => prev.filter((_, i) => i !== idx));
  };

  const total = lineItems.reduce((s, li) => s + calcLineTotal(li), 0);

  const cols = isRental
    ? "40px 90px 1fr 65px 55px 60px 55px 85px 36px"
    : "40px 100px 1fr 70px 70px 70px 90px 36px";
  const headers = isRental
    ? ["#", "CODE", "DESCRIPTION", "RATE", "QTY", "U/M", "DAYS", "TOTAL", ""]
    : ["#", "CODE", "DESCRIPTION", "RATE", "QTY", "U/M", "TOTAL", ""];

  return (
    <div>
      {/* Header */}
      <div style={{
        display: "grid", gridTemplateColumns: cols,
        gap: 4, padding: "6px 0", borderBottom: `1px solid ${C.border}`, marginBottom: 4,
      }}>
        {headers.map(h => (
          <div key={h} style={{ fontSize: 9, fontWeight: 800, color: C.muted, letterSpacing: "0.1em" }}>{h}</div>
        ))}
      </div>
      {/* Rows */}
      {lineItems.map((li, idx) => (
        <div key={idx} style={{
          display: "grid", gridTemplateColumns: cols,
          gap: 4, padding: "4px 0", borderBottom: `1px solid ${C.border}22`, alignItems: "center",
        }}>
          <div style={{ fontSize: 11, color: C.muted, textAlign: "center" }}>{idx + 1}</div>
          <input style={{ ...inputStyle, padding: "4px 6px", fontSize: 11 }} value={li.qbCode}
            onChange={e => updateItem(idx, "qbCode", e.target.value)} />
          <input style={{ ...inputStyle, padding: "4px 6px", fontSize: 11 }} value={li.desc}
            onChange={e => updateItem(idx, "desc", e.target.value)} />
          <input type="number" style={{ ...inputStyle, padding: "4px 6px", fontSize: 11, textAlign: "right" }}
            value={li.rate} onChange={e => updateItem(idx, "rate", Number(e.target.value))} />
          <input type="number" style={{ ...inputStyle, padding: "4px 6px", fontSize: 11, textAlign: "right" }}
            value={li.qty} onChange={e => updateItem(idx, "qty", Number(e.target.value))} />
          <select style={{ ...inputStyle, padding: "4px 4px", fontSize: 10 }} value={li.um}
            onChange={e => updateItem(idx, "um", e.target.value)}>
            {["HR", "DAY", "EA", "GAL", "MILE"].map(u => <option key={u}>{u}</option>)}
          </select>
          {isRental && (
            <input type="number" style={{ ...inputStyle, padding: "4px 6px", fontSize: 11, textAlign: "right" }}
              value={li.days || 1} onChange={e => updateItem(idx, "days", Number(e.target.value))} />
          )}
          <div style={{ fontSize: 12, fontWeight: 700, textAlign: "right", color: C.text }}>
            ${calcLineTotal(li).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <button onClick={() => removeItem(idx)} style={{
            background: "transparent", border: "none", color: C.red, cursor: "pointer",
            fontSize: 14, fontWeight: 700, padding: 0,
          }}>×</button>
        </div>
      ))}
      {/* Total */}
      <div style={{
        display: "grid", gridTemplateColumns: cols,
        gap: 4, padding: "8px 0", borderTop: `2px solid ${C.border}`, marginTop: 4,
      }}>
        {headers.slice(0, -2).map((_, i) => <div key={i} />)}
        <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, textAlign: "right", letterSpacing: "0.1em" }}>TOTAL</div>
        <div style={{ fontSize: 13, fontWeight: 800, color: C.text, textAlign: "right" }}>
          ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div />
      </div>
      {/* Add buttons */}
      <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center", position: "relative" }}>
        <Btn small onClick={() => setShowSearch(s => !s)}>+ FROM RATE SHEET</Btn>
        <Btn small variant="ghost" onClick={addBlank}>+ BLANK LINE</Btn>
        {showSearch && (
          <div style={{
            position: "absolute", top: 32, left: 0, zIndex: 10, width: 420,
            background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 6,
            boxShadow: "0 8px 32px #00000022", padding: 8,
          }}>
            <input autoFocus style={{ ...inputStyle, marginBottom: 6 }} placeholder="Type to filter or scroll to browse..."
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            <div style={{ maxHeight: 280, overflowY: "auto" }}>
            {filteredQB.map(q => (
              <div key={q.code} onClick={() => addItem(q)} style={{
                padding: "6px 8px", cursor: "pointer", borderRadius: 4,
                display: "flex", justifyContent: "space-between", alignItems: "center",
                fontSize: 12,
              }}
                onMouseEnter={e => e.currentTarget.style.background = C.steel}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <div>
                  <span style={{ fontWeight: 700, color: C.blue, marginRight: 8 }}>{q.code}</span>
                  <span style={{ color: C.text }}>{q.desc}</span>
                </div>
                <span style={{ color: C.muted, fontSize: 11 }}>${q.price}/{q.um}</span>
              </div>
            ))}
            {searchTerm && filteredQB.length === 0 && (
              <div style={{ padding: "8px", color: C.muted, fontSize: 12, textAlign: "center" }}>No matches</div>
            )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SIGNATURE PAD ────────────────────────────────────────────────────────────
function SignaturePad({ onSign, onCancel }) {
  const canvasRef = useState(null);
  const [drawing, setDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [paths, setPaths] = useState([]);
  const [currentPath, setCurrentPath] = useState([]);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDraw = (e) => {
    e.preventDefault();
    const canvas = e.currentTarget;
    setDrawing(true);
    setHasDrawn(true);
    const pos = getPos(e, canvas);
    setCurrentPath([pos]);
  };

  const draw = (e) => {
    if (!drawing) return;
    e.preventDefault();
    const canvas = e.currentTarget;
    const pos = getPos(e, canvas);
    setCurrentPath(prev => [...prev, pos]);
    // Draw on canvas
    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = C.darkBlue;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (currentPath.length > 0) {
      const last = currentPath[currentPath.length - 1];
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
  };

  const endDraw = (e) => {
    e.preventDefault();
    if (currentPath.length > 0) {
      setPaths(prev => [...prev, currentPath]);
    }
    setCurrentPath([]);
    setDrawing(false);
  };

  const clearSig = () => {
    setPaths([]);
    setCurrentPath([]);
    setHasDrawn(false);
    // Clear canvas
    const canvases = document.querySelectorAll("canvas");
    canvases.forEach(c => {
      if (c.width === 460) {
        const ctx = c.getContext("2d");
        ctx.clearRect(0, 0, c.width, c.height);
      }
    });
  };

  const handleSign = () => {
    if (!hasDrawn || !signerName.trim()) return;
    const canvases = document.querySelectorAll("canvas");
    let sigData = null;
    canvases.forEach(c => {
      if (c.width === 460) sigData = c.toDataURL("image/png");
    });
    onSign({ name: signerName.trim(), date: new Date().toISOString(), signatureImage: sigData });
  };

  return (
    <div style={{
      background: C.steel, border: `1px solid ${C.border}`, borderRadius: 6,
      padding: 16, marginTop: 16,
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 10 }}>CUSTOMER SIGNATURE</div>
      <div style={{ marginBottom: 10 }}>
        <label style={labelStyle}>PRINTED NAME *</label>
        <input style={{ ...inputStyle, width: 280 }} value={signerName} onChange={e => setSignerName(e.target.value)} placeholder="Customer name..." />
      </div>
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>Sign below:</div>
      <div style={{
        background: C.white, border: `2px solid ${hasDrawn ? C.green : C.border}`,
        borderRadius: 4, cursor: "crosshair", touchAction: "none",
      }}>
        <canvas
          width={460} height={120}
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}
          style={{ display: "block", width: 460, height: 120 }}
        />
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <Btn onClick={handleSign} variant="blue">SUBMIT SIGNATURE</Btn>
        <Btn onClick={clearSig} variant="ghost" small>CLEAR</Btn>
        <Btn onClick={onCancel} variant="ghost" small>CANCEL</Btn>
      </div>
    </div>
  );
}

// ─── SIGNATURE DISPLAY ────────────────────────────────────────────────────────
function SignatureDisplay({ signedBy, signedAt, signatureImage }) {
  return (
    <div style={{
      background: "#e6f5ec", border: `1px solid ${C.green}44`, borderRadius: 6,
      padding: 14, marginTop: 16,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: C.green }}>✓ SIGNED</span>
        <span style={{ fontSize: 12, color: C.text, fontWeight: 700 }}>{signedBy}</span>
        <span style={{ fontSize: 11, color: C.muted }}>{signedAt?.slice(0, 10)} {signedAt?.slice(11, 16)}</span>
      </div>
      {signatureImage && (
        <div style={{
          background: C.white, border: `1px solid ${C.border}`, borderRadius: 4,
          padding: 4, display: "inline-block",
        }}>
          <img src={signatureImage} alt="Signature" style={{ height: 60, display: "block" }} />
        </div>
      )}
    </div>
  );
}

// ─── TICKET DETAIL VIEW ───────────────────────────────────────────────────────
function TicketDetail({ ticket, onUpdate, onClose, jobs, qbItems }) {
  const isLocked = ticket.status === "signed" || ticket.status === "sigNotReq" || ticket.status === "sentToQB" || ticket.status === "qbVerified";
  const isFullyLocked = ticket.status === "qbVerified";
  const canSendToQB = ticket.status === "signed" || ticket.status === "sigNotReq";

  const [lineItems, setLineItems] = useState([...ticket.lineItems]);
  const [notes, setNotes] = useState(ticket.notes || "");
  const [status, setStatus] = useState(ticket.status);
  const [missingPieces, setMissingPieces] = useState(ticket.missingPieces ?? null);
  const [showSigPad, setShowSigPad] = useState(false);
  const [showSigOptions, setShowSigOptions] = useState(false);
  const [sigNotReqReason, setSigNotReqReason] = useState(ticket.sigNotReqReason || null);
  const [sigNotReqNote, setSigNotReqNote] = useState(ticket.sigNotReqNote || "");
  const [emailTo, setEmailTo] = useState(ticket.emailTo || "");
  const [emailCc, setEmailCc] = useState(ticket.emailCc || "");

  const job = jobs.find(j => j.id === ticket.jobId);
  const tcfg = TICKET_TYPES[ticket.type];
  const total = lineItems.reduce((s, li) => s + calcLineTotal(li), 0);

  const handleSave = () => {
    onUpdate(ticket.id, { lineItems, notes, status, missingPieces, sigNotReqReason, sigNotReqNote, emailTo, emailCc });
    onClose();
  };

  const handleSign = ({ name, date, signatureImage }) => {
    onUpdate(ticket.id, {
      lineItems, notes, status: "signed", missingPieces,
      signedBy: name, signedAt: date, signatureImage,
      sigNotReqReason: null, sigNotReqNote: "",
    });
    onClose();
  };

  const handleSigNotRequired = () => {
    if (!sigNotReqReason) return;
    onUpdate(ticket.id, {
      lineItems, notes, status: "sigNotReq", missingPieces,
      sigNotReqReason, sigNotReqNote,
      signedBy: null, signedAt: null, signatureImage: null,
    });
    onClose();
  };

  const handleEmailTicket = () => {
    if (!emailTo) return;
    onUpdate(ticket.id, {
      lineItems, notes, status: "emailed", missingPieces,
      emailTo, emailCc, emailedAt: new Date().toISOString(),
    });
    onClose();
  };

  const handleSendToQB = () => {
    // Placeholder — just changes status
    onUpdate(ticket.id, { status: "sentToQB", sentToQBAt: new Date().toISOString() });
    onClose();
  };

  const handleUnlock = () => {
    onUpdate(ticket.id, { ...ticket, status: "inField", signedBy: null, signedAt: null, signatureImage: null, sigNotReqReason: null, sigNotReqNote: "" });
    onClose();
  };

  const statusLabel = TICKET_STATUSES[isLocked ? ticket.status : status]?.label || status;

  return (
    <div style={{
      position: "fixed", inset: 0, background: "#00000088",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
    }} onClick={onClose}>
      <div style={{
        background: C.cardBg, border: `1px solid ${C.border}`,
        borderTop: `4px solid ${tcfg.color}`, borderRadius: 8,
        padding: 0, width: 820, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto",
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <TicketTypeBadge type={ticket.type} />
                <TicketStatusBadge status={isLocked ? ticket.status : status} />
                <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>#{ticket.jobId} — {ticket.type}</span>
                {isLocked && <span style={{ fontSize: 10, fontWeight: 700, color: isFullyLocked ? C.green : C.orange, background: isFullyLocked ? "#d4edda" : "#fdf5d8", padding: "2px 8px", borderRadius: 3 }}>{isFullyLocked ? "QB VERIFIED" : "LOCKED"}</span>}
              </div>
              <div style={{ fontSize: 12, color: C.muted }}>
                {job?.customer || "Unknown"} · {ticket.date}
              </div>
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: C.text }}>
              ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "16px 24px" }}>
          {/* Status control — only for draft/inField */}
          {!isLocked && status !== "emailed" && (
            <div style={{ display: "flex", gap: 6, marginBottom: 16, alignItems: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginRight: 4 }}>STATUS:</span>
              {[["draft", "DRAFT"], ["inField", "IN FIELD"]].map(([key, lbl]) => (
                <FilterBtn key={key} active={status === key} onClick={() => setStatus(key)}>{lbl}</FilterBtn>
              ))}
            </div>
          )}

          {/* Emailed status display */}
          {ticket.status === "emailed" && !isLocked && (
            <div style={{ background: "#f3eafa", border: "1px solid #7a3ca044", borderRadius: 6, padding: "10px 14px", marginBottom: 16 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#7a3ca0" }}>TICKET EMAILED — AWAITING SIGNATURE</span>
              {ticket.emailTo && <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Sent to: {ticket.emailTo}{ticket.emailCc ? ` · CC: ${ticket.emailCc}` : ""}</div>}
              {ticket.emailedAt && <div style={{ fontSize: 11, color: C.muted }}>Sent: {ticket.emailedAt.slice(0, 10)}</div>}
            </div>
          )}

          {/* RD-specific: missing pieces check */}
          {ticket.type === "Rig Down" && (
            <div style={{
              background: "#fdf8e8", border: `1px solid ${C.yellow}44`, borderRadius: 6,
              padding: "10px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12,
              opacity: isLocked ? 0.7 : 1,
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>
                Check quantities against R/U — any pieces missing?
              </span>
              {!isLocked ? (
                <>
                  <FilterBtn active={missingPieces === false} onClick={() => setMissingPieces(false)}>NO</FilterBtn>
                  <FilterBtn active={missingPieces === true} onClick={() => setMissingPieces(true)}>YES</FilterBtn>
                </>
              ) : (
                <span style={{ fontSize: 12, fontWeight: 800, color: missingPieces ? C.red : C.green }}>
                  {missingPieces === true ? "YES" : missingPieces === false ? "NO" : "—"}
                </span>
              )}
            </div>
          )}

          {/* Line Items */}
          <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: "0.08em", marginBottom: 8 }}>LINE ITEMS</div>
          {!isLocked && status !== "emailed" ? (
            <LineItemEditor lineItems={lineItems} setLineItems={setLineItems} ticketType={ticket.type} qbItems={qbItems} />
          ) : (
            <ReadOnlyLineItems lineItems={lineItems} ticketType={ticket.type} total={total} />
          )}

          {/* Notes */}
          <div style={{ marginTop: 16 }}>
            <label style={labelStyle}>NOTES</label>
            {!isLocked && status !== "emailed" ? (
              <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 56 }} value={notes} onChange={e => setNotes(e.target.value)} />
            ) : (
              <div style={{ fontSize: 12, color: C.text, padding: "8px 0" }}>{notes || "—"}</div>
            )}
          </div>

          {/* Signature display (when signed) */}
          {ticket.status === "signed" && ticket.signedBy && (
            <SignatureDisplay signedBy={ticket.signedBy} signedAt={ticket.signedAt} signatureImage={ticket.signatureImage} />
          )}

          {/* Sig Not Required display */}
          {ticket.status === "sigNotReq" && (
            <div style={{ background: "#e8f0fb", border: `1px solid ${C.blue}44`, borderRadius: 6, padding: 14, marginTop: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: C.blue }}>SIGNATURE NOT REQUIRED</div>
              <div style={{ fontSize: 11, color: C.text, marginTop: 4 }}>{ticket.sigNotReqReason}</div>
              {ticket.sigNotReqNote && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{ticket.sigNotReqNote}</div>}
            </div>
          )}

          {/* Signature options panel */}
          {!isLocked && status !== "emailed" && showSigOptions && !showSigPad && (
            <div style={{ background: C.steel, border: `1px solid ${C.border}`, borderRadius: 6, padding: 16, marginTop: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 12 }}>SIGNATURE OPTIONS</div>

              {/* Option 1: Customer not available — email */}
              <div style={{ marginBottom: 12, padding: 12, background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div onClick={() => setSigNotReqReason(sigNotReqReason === "not_available" ? null : "not_available")} style={{
                    width: 16, height: 16, borderRadius: 3, border: `2px solid ${sigNotReqReason === "not_available" ? C.blue : C.muted}`,
                    background: sigNotReqReason === "not_available" ? C.blue : "transparent", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>{sigNotReqReason === "not_available" && <span style={{ color: C.white, fontSize: 10, fontWeight: 900 }}>✓</span>}</div>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>Customer requires signature but is not available</span>
                </div>
                {sigNotReqReason === "not_available" && (
                  <div style={{ marginLeft: 24 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                      <div><label style={labelStyle}>COMPANY MAN EMAIL *</label><input style={inputStyle} value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="compman@operator.com" /></div>
                      <div><label style={labelStyle}>CC (OFFICE)</label><input style={inputStyle} value={emailCc} onChange={e => setEmailCc(e.target.value)} placeholder="accounts@flo-test.com" /></div>
                    </div>
                    <Btn small variant="blue" onClick={handleEmailTicket}>EMAIL TICKET (placeholder)</Btn>
                  </div>
                )}
              </div>

              {/* Option 2: Customer doesn't require */}
              <div style={{ marginBottom: 12, padding: 12, background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div onClick={() => setSigNotReqReason(sigNotReqReason === "not_required" ? null : "not_required")} style={{
                    width: 16, height: 16, borderRadius: 3, border: `2px solid ${sigNotReqReason === "not_required" ? C.blue : C.muted}`,
                    background: sigNotReqReason === "not_required" ? C.blue : "transparent", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>{sigNotReqReason === "not_required" && <span style={{ color: C.white, fontSize: 10, fontWeight: 900 }}>✓</span>}</div>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>Customer does not require field signature</span>
                </div>
              </div>

              {/* Option 3: Other */}
              <div style={{ marginBottom: 12, padding: 12, background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div onClick={() => setSigNotReqReason(sigNotReqReason === "other" ? null : "other")} style={{
                    width: 16, height: 16, borderRadius: 3, border: `2px solid ${sigNotReqReason === "other" ? C.blue : C.muted}`,
                    background: sigNotReqReason === "other" ? C.blue : "transparent", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>{sigNotReqReason === "other" && <span style={{ color: C.white, fontSize: 10, fontWeight: 900 }}>✓</span>}</div>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>Other (specify)</span>
                </div>
                {sigNotReqReason === "other" && (
                  <div style={{ marginLeft: 24 }}>
                    <input style={inputStyle} value={sigNotReqNote} onChange={e => setSigNotReqNote(e.target.value)} placeholder="Reason..." />
                  </div>
                )}
              </div>

              {(sigNotReqReason === "not_required" || sigNotReqReason === "other") && (
                <Btn small onClick={handleSigNotRequired}>CONFIRM — SIGNATURE NOT REQUIRED</Btn>
              )}
            </div>
          )}

          {/* Signature pad */}
          {!isLocked && status !== "emailed" && showSigPad && (
            <SignaturePad onSign={handleSign} onCancel={() => setShowSigPad(false)} />
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 24px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {/* Editable states: draft, inField */}
          {!isLocked && status !== "emailed" && (
            <>
              <Btn onClick={handleSave}>SAVE TICKET</Btn>
              {!showSigPad && !showSigOptions && <Btn onClick={() => setShowSigPad(true)} variant="blue">COLLECT SIGNATURE</Btn>}
              {!showSigPad && !showSigOptions && <Btn onClick={() => setShowSigOptions(true)} variant="ghost">SIGNATURE NOT REQUIRED</Btn>}
              <Btn onClick={onClose} variant="ghost">CANCEL</Btn>
            </>
          )}
          {/* Emailed — waiting */}
          {status === "emailed" && !isLocked && (
            <>
              <Btn onClick={() => setShowSigPad(true)} variant="blue">COLLECT SIGNATURE NOW</Btn>
              <Btn onClick={onClose} variant="ghost">CLOSE</Btn>
            </>
          )}
          {/* Signed or SigNotReq — can send to QB or edit */}
          {(ticket.status === "signed" || ticket.status === "sigNotReq") && (
            <>
              <Btn onClick={handleSendToQB} variant="ghost" style={{ opacity: 0.4, cursor: "not-allowed" }}>
                SEND TO QB (coming soon)
              </Btn>
              {!isFullyLocked && <Btn onClick={handleUnlock} variant="ghost">EDIT TICKET (requires re-signature)</Btn>}
              <Btn onClick={onClose} variant="ghost">CLOSE</Btn>
            </>
          )}
          {/* Sent to QB */}
          {ticket.status === "sentToQB" && (
            <>
              <button style={{
                background: C.steel, border: `1px solid ${C.border}`, borderRadius: 4,
                padding: "9px 18px", fontSize: 13, fontWeight: 700, color: C.muted,
                cursor: "not-allowed", opacity: 0.5,
              }}>AWAITING QB VERIFICATION</button>
              <Btn onClick={onClose} variant="ghost">CLOSE</Btn>
            </>
          )}
          {/* QB Verified — fully locked */}
          {isFullyLocked && (
            <>
              <span style={{ fontSize: 12, fontWeight: 800, color: C.green, background: "#d4edda", padding: "6px 14px", borderRadius: 4 }}>✓ QB VERIFIED</span>
              <Btn onClick={onClose} variant="ghost">CLOSE</Btn>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── READ-ONLY LINE ITEMS (for signed tickets) ───────────────────────────────
function ReadOnlyLineItems({ lineItems, ticketType, total }) {
  const isRental = ticketType === "Rental";
  const cols = isRental
    ? "40px 90px 1fr 65px 55px 60px 55px 85px"
    : "40px 100px 1fr 70px 70px 70px 90px";
  const headers = isRental
    ? ["#", "CODE", "DESCRIPTION", "RATE", "QTY", "U/M", "DAYS", "TOTAL"]
    : ["#", "CODE", "DESCRIPTION", "RATE", "QTY", "U/M", "TOTAL"];

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: cols, gap: 4, padding: "6px 0", borderBottom: `1px solid ${C.border}`, marginBottom: 4 }}>
        {headers.map(h => (
          <div key={h} style={{ fontSize: 9, fontWeight: 800, color: C.muted, letterSpacing: "0.1em" }}>{h}</div>
        ))}
      </div>
      {lineItems.map((li, idx) => (
        <div key={idx} style={{
          display: "grid", gridTemplateColumns: cols,
          gap: 4, padding: "5px 0", borderBottom: `1px solid ${C.border}22`,
        }}>
          <div style={{ fontSize: 11, color: C.muted, textAlign: "center" }}>{idx + 1}</div>
          <div style={{ fontSize: 11, color: C.blue, fontWeight: 600 }}>{li.qbCode}</div>
          <div style={{ fontSize: 11, color: C.text }}>{li.desc}</div>
          <div style={{ fontSize: 11, textAlign: "right" }}>${li.rate}</div>
          <div style={{ fontSize: 11, textAlign: "right" }}>{li.qty}</div>
          <div style={{ fontSize: 10, color: C.muted }}>{li.um}</div>
          {isRental && <div style={{ fontSize: 11, textAlign: "right" }}>{li.days || 1}</div>}
          <div style={{ fontSize: 11, fontWeight: 700, textAlign: "right" }}>
            ${calcLineTotal(li).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      ))}
      <div style={{ display: "grid", gridTemplateColumns: cols, gap: 4, padding: "8px 0", borderTop: `2px solid ${C.border}`, marginTop: 4 }}>
        {headers.slice(0, -1).map((_, i) => <div key={i} />)}
        <div style={{ fontSize: 13, fontWeight: 800, color: C.text, textAlign: "right" }}>
          ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>
    </div>
  );
}

// ─── ADD TICKET MODAL ─────────────────────────────────────────────────────────
function AddTicketModal({ jobId, onSave, onClose, qbItems }) {
  const [type, setType] = useState(null);
  const [lineItems, setLineItems] = useState([]);
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(today());

  const handleSave = () => {
    if (!type) return;
    onSave({
      jobId, type, status: "draft", date,
      signedBy: null, signedAt: null,
      lineItems, notes,
      ...(type === "Rig Down" ? { missingPieces: null } : {}),
    });
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "#00000088",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
    }} onClick={onClose}>
      <div style={{
        background: C.cardBg, border: `1px solid ${C.border}`,
        borderTop: `3px solid ${C.red}`, borderRadius: 8,
        padding: 24, width: type ? 820 : 480, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto",
      }} onClick={e => e.stopPropagation()}>
        {!type ? (
          <>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Add Ticket — Select Type</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {Object.entries(TICKET_TYPES).map(([key, cfg]) => (
                <button key={key} onClick={() => setType(key)} style={{
                  background: C.cardBg, border: `2px solid ${cfg.color}33`,
                  borderLeft: `4px solid ${cfg.color}`, borderRadius: 6,
                  padding: "16px 18px", cursor: "pointer", textAlign: "left",
                }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = cfg.color}
                  onMouseLeave={e => e.currentTarget.style.borderColor = cfg.color + "33"}
                >
                  <div style={{ fontSize: 14, fontWeight: 800, color: cfg.color, letterSpacing: "0.06em" }}>{cfg.label}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
                    {key === "Rig Up" && "Crew mobilization, equipment, Day 1 rental"}
                    {key === "Rig Down" && "Teardown, equipment return, DLR check"}
                    {key === "Tester" && "Flo-back testing, hourly logging"}
                    {key === "Pumper" && "Field specialist, daily operations"}
                    {key === "Rental" && "Ongoing equipment rental (Day 2+)"}
                  </div>
                </button>
              ))}
            </div>
            <div style={{ marginTop: 16 }}>
              <Btn onClick={onClose} variant="ghost">CANCEL</Btn>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <TicketTypeBadge type={type} />
              <span style={{ fontSize: 16, fontWeight: 700 }}>New {type} Ticket</span>
              <button onClick={() => setType(null)} style={{
                background: "transparent", border: `1px solid ${C.border}`, borderRadius: 4,
                padding: "3px 10px", fontSize: 11, fontWeight: 700, color: C.muted, cursor: "pointer", marginLeft: "auto",
              }}>← CHANGE TYPE</button>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>DATE</label>
              <input type="date" style={{ ...inputStyle, width: 180 }} value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: "0.08em", marginBottom: 8 }}>LINE ITEMS</div>
            <LineItemEditor lineItems={lineItems} setLineItems={setLineItems} ticketType={type} qbItems={qbItems} />
            <div style={{ marginTop: 16, marginBottom: 16 }}>
              <label style={labelStyle}>NOTES</label>
              <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 56 }} value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn onClick={handleSave}>CREATE TICKET</Btn>
              <Btn onClick={onClose} variant="ghost">CANCEL</Btn>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── TICKETS TAB (inside JobCard expanded) ────────────────────────────────────
function JobTicketsTab({ jobId, tickets, setTickets, jobs, qbItems }) {
  const [showAdd, setShowAdd] = useState(false);
  const [viewTicket, setViewTicket] = useState(null);

  const jobTickets = tickets.filter(t => t.jobId === jobId);
  const byType = {};
  jobTickets.forEach(t => { byType[t.type] = [...(byType[t.type] || []), t]; });

  const handleAdd = async (ticketData) => {
    const payload = {
      job_id: ticketData.jobId, type: ticketData.type, status: ticketData.status || "draft",
      date: ticketData.date, notes: ticketData.notes,
      lineItems: (ticketData.lineItems || []).map(li => ({
        qb_code: li.qbCode, description: li.desc, rate: li.rate, qty: li.qty, unit_measure: li.um, days: li.days || 1,
      })),
    };
    try {
      const r = await fetch(`${API_URL}/tickets`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (r.ok) {
        const saved = await r.json();
        setTickets(prev => [...prev, { ...ticketData, id: saved.id }]);
      }
    } catch (err) { console.error("Ticket create failed:", err); }
    setShowAdd(false);
  };

  const handleUpdate = async (id, updates) => {
    const payload = {};
    if (updates.status) payload.status = updates.status;
    if (updates.signedBy) payload.signed_by = updates.signedBy;
    if (updates.signedAt) payload.signed_at = updates.signedAt;
    if (updates.signatureImg) payload.signature_img = updates.signatureImg;
    if (updates.sigNotReqReason) payload.sig_not_req_reason = updates.sigNotReqReason;
    if (updates.sigNotReqNote) payload.sig_not_req_note = updates.sigNotReqNote;
    if (updates.notes !== undefined) payload.notes = updates.notes;
    if (updates.lineItems) {
      payload.lineItems = updates.lineItems.map(li => ({
        qb_code: li.qbCode, description: li.desc, rate: li.rate, qty: li.qty, unit_measure: li.um, days: li.days || 1,
      }));
    }
    try {
      await fetch(`${API_URL}/tickets/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    } catch (err) { console.error("Ticket update failed:", err); }
    setTickets(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const handleDelete = (id) => {
    setTickets(prev => prev.filter(t => t.id !== id));
    setViewTicket(null);
  };

  return (
    <div style={{ padding: "16px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.muted }}>
          {jobTickets.length} ticket{jobTickets.length !== 1 ? "s" : ""}
        </div>
        <Btn small onClick={() => setShowAdd(true)}>+ ADD TICKET</Btn>
      </div>

      {jobTickets.length === 0 && (
        <div style={{ textAlign: "center", padding: "24px 0", color: C.muted, fontSize: 13 }}>No tickets yet. Add one to get started.</div>
      )}

      {jobTickets.map(t => {
        const tcfg = TICKET_TYPES[t.type];
        const total = calcTicketTotal(t);
        return (
          <div key={t.id} onClick={() => setViewTicket(t)} style={{
            background: C.cardBg, border: `1px solid ${C.border}`,
            borderLeft: `3px solid ${tcfg.color}`, borderRadius: 5, marginBottom: 6,
            padding: "10px 14px", cursor: "pointer",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = `0 2px 12px ${tcfg.color}22`}
            onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <TicketTypeBadge type={t.type} />
              <TicketStatusBadge status={t.status} />
              <span style={{ fontSize: 12, color: C.muted }}>#{t.jobId} · {t.date}</span>
              <span style={{ fontSize: 11, color: C.muted }}>{t.lineItems.length} items</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>
              ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        );
      })}

      {showAdd && <AddTicketModal jobId={jobId} onSave={handleAdd} onClose={() => setShowAdd(false)} qbItems={qbItems} />}
      {viewTicket && (
        <TicketDetail
          ticket={viewTicket} jobs={jobs} qbItems={qbItems}
          onUpdate={(id, updates) => { handleUpdate(id, updates); setViewTicket(null); }}
          onClose={() => setViewTicket(null)}
        />
      )}
    </div>
  );
}

// ─── INVENTORY PAGE ───────────────────────────────────────────────────────────
function InventoryPage({ inventory, setInventory, jobs }) {
  const [sizeFilter, setSizeFilter] = useState("All");
  const [catFilter, setCatFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [showCheckOut, setShowCheckOut] = useState(null);
  const [showCheckIn, setShowCheckIn] = useState(null);
  const [showEdit, setShowEdit] = useState(null);
  const [showAdd, setShowAdd] = useState(false);

  const sizes = ['All', '2"', '3"', '4"'];
  const categories = ["All", "Fitting", "Pup Joint", "Valve", "Cross Over"];

  const filtered = inventory.filter(item => {
    if (sizeFilter !== "All" && item.size !== sizeFilter) return false;
    if (catFilter !== "All" && item.category !== catFilter) return false;
    if (search && !item.item.toLowerCase().includes(search.toLowerCase()) && !item.itemNum.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const summaryBySize = useMemo(() => {
    const m = {};
    inventory.forEach(i => {
      if (!m[i.size]) m[i.size] = { owned: 0, inYard: 0, out: 0, items: 0 };
      m[i.size].owned += i.qtyOwned;
      m[i.size].inYard += i.inYard;
      m[i.size].out += (i.qtyOwned - i.inYard);
      m[i.size].items += 1;
    });
    return m;
  }, [inventory]);

  const totalOwned = inventory.reduce((s, i) => s + i.qtyOwned, 0);
  const totalInYard = inventory.reduce((s, i) => s + i.inYard, 0);
  const totalOut = totalOwned - totalInYard;

  const handleCheckOut = async (id, qty, customer, fieldTicket) => {
    const item = inventory.find(i => i.id === id);
    if (!item) return;
    const newInYard = Math.max(0, item.inYard - qty);
    try {
      await fetch(`${API_URL}/inventory/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ in_yard: newInYard, customer, field_ticket: fieldTicket }) });
    } catch (err) { console.error("Inventory checkout failed:", err); }
    setInventory(prev => prev.map(i => i.id !== id ? i : { ...i, inYard: newInYard, customer, fieldTicket }));
    setShowCheckOut(null);
  };

  const handleCheckIn = async (id, qty) => {
    const item = inventory.find(i => i.id === id);
    if (!item) return;
    const maxReturn = item.qtyOwned - item.inYard;
    const newInYard = item.inYard + Math.min(qty, maxReturn);
    const allBack = newInYard >= item.qtyOwned;
    try {
      await fetch(`${API_URL}/inventory/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ in_yard: newInYard, customer: allBack ? null : item.customer, field_ticket: allBack ? null : item.fieldTicket }) });
    } catch (err) { console.error("Inventory checkin failed:", err); }
    setInventory(prev => prev.map(i => {
      if (i.id !== id) return i;
      return { ...i, inYard: newInYard, customer: allBack ? null : i.customer, fieldTicket: allBack ? null : i.fieldTicket };
    }));
    setShowCheckIn(null);
  };

  const handleEdit = async (id, updates) => {
    try {
      await fetch(`${API_URL}/inventory/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ in_yard: updates.inYard, qty_owned: updates.qtyOwned, customer: updates.customer, field_ticket: updates.fieldTicket, notes: updates.notes }) });
    } catch (err) { console.error("Inventory edit failed:", err); }
    setInventory(prev => prev.map(item => item.id !== id ? item : { ...item, ...updates }));
    setShowEdit(null);
  };

  const handleAdd = (newItem) => {
    setInventory(prev => [...prev, { ...newItem, id: Math.max(...prev.map(i => i.id)) + 1 }]);
    setShowAdd(false);
  };

  const handleDelete = (id) => {
    setInventory(prev => prev.filter(i => i.id !== id));
    setShowEdit(null);
  };

  return (
    <div style={{ padding: "24px 28px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Iron Inventory</h1>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
            {inventory.length} items · {totalOwned.toLocaleString()} owned · {totalInYard.toLocaleString()} in yard · {totalOut.toLocaleString()} out
          </div>
        </div>
        <Btn onClick={() => setShowAdd(true)}>+ ADD ITEM</Btn>
      </div>

      {/* Summary Cards */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {['2"', '3"', '4"'].map(size => {
          const s = summaryBySize[size] || { owned: 0, inYard: 0, out: 0, items: 0 };
          const pctOut = s.owned > 0 ? ((s.out / s.owned) * 100).toFixed(0) : 0;
          return (
            <div key={size} onClick={() => setSizeFilter(sizeFilter === size ? "All" : size)} style={{
              flex: 1, background: C.cardBg, border: `1px solid ${sizeFilter === size ? C.blue : C.border}`,
              borderTop: `2px solid ${sizeFilter === size ? C.blue : C.red}`, borderRadius: 6, padding: "12px 14px",
              cursor: "pointer", transition: "border-color 0.15s",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: C.text }}>{size}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted }}>{s.items} items</div>
              </div>
              <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
                <div>
                  <div style={{ fontSize: 11, color: C.muted, fontWeight: 700 }}>OWNED</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>{s.owned.toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: C.muted, fontWeight: 700 }}>IN YARD</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: C.green }}>{s.inYard.toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: C.muted, fontWeight: 700 }}>OUT</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: s.out > 0 ? C.orange : C.muted }}>{s.out.toLocaleString()}</div>
                </div>
              </div>
              {s.out > 0 && (
                <div style={{ marginTop: 8, height: 4, background: C.lightSteel, borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${100 - pctOut}%`, background: C.green, borderRadius: 2 }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginRight: 4 }}>SIZE:</span>
        {sizes.map(s => (
          <FilterBtn key={s} active={sizeFilter === s} onClick={() => setSizeFilter(s)}>{s === "All" ? "ALL" : s}</FilterBtn>
        ))}
        <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginLeft: 12, marginRight: 4 }}>TYPE:</span>
        {categories.map(c => (
          <FilterBtn key={c} active={catFilter === c} onClick={() => setCatFilter(c)}>{c.toUpperCase()}</FilterBtn>
        ))}
        <div style={{ marginLeft: "auto" }}>
          <input
            style={{ ...inputStyle, width: 220, background: C.cardBg }}
            placeholder="Search item or item #..."
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 6, overflow: "auto", maxHeight: "calc(100vh - 340px)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "'Arial', sans-serif" }}>
          <thead>
            <tr style={{ background: C.darkBlue, position: "sticky", top: 0, zIndex: 2 }}>
              {["#", "SIZE", "CATEGORY", "ITEM", "ITEM #", "OWNED", "IN YARD", "OUT", "CUSTOMER / LOCATION", "FT #", "ACTIONS"].map(h => (
                <th key={h} style={{
                  padding: "10px 10px", textAlign: "left", fontSize: 10, fontWeight: 800,
                  color: C.white, letterSpacing: "0.1em", borderBottom: `2px solid ${C.red}`,
                  background: C.darkBlue,
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((item, idx) => {
              const out = item.qtyOwned - item.inYard;
              const isLow = item.qtyOwned > 0 && item.inYard > 0 && item.inYard < 4;
              const isEmpty = item.qtyOwned > 0 && item.inYard === 0;
              return (
                <tr key={item.id} style={{
                  background: isEmpty ? "#fdf0f0" : isLow ? "#fdf8e8" : idx % 2 === 0 ? C.cardBg : C.steel,
                  borderBottom: `1px solid ${C.border}`,
                }}>
                  <td style={{ padding: "8px 10px", color: C.muted, fontSize: 11, fontWeight: 600, textAlign: "center", minWidth: 32 }}>{idx + 1}</td>
                  <td style={{ padding: "8px 10px", fontWeight: 700 }}>{item.size}</td>
                  <td style={{ padding: "8px 10px", color: C.muted }}>{item.category}</td>
                  <td style={{ padding: "8px 10px", fontWeight: 700 }}>{item.item}</td>
                  <td style={{ padding: "8px 10px", color: C.blue, fontWeight: 600, fontSize: 11 }}>{item.itemNum}</td>
                  <td style={{ padding: "8px 10px", fontWeight: 700, textAlign: "center" }}>{item.qtyOwned}</td>
                  <td style={{ padding: "8px 10px", fontWeight: 800, textAlign: "center", color: isEmpty ? C.red : isLow ? C.orange : C.green }}>{item.inYard}</td>
                  <td style={{ padding: "8px 10px", fontWeight: 700, textAlign: "center", color: out > 0 ? C.orange : C.muted }}>{out}</td>
                  <td style={{ padding: "8px 10px", fontSize: 11, color: item.customer ? C.text : C.muted }}>{item.customer || "—"}</td>
                  <td style={{ padding: "8px 10px", fontSize: 11, color: item.fieldTicket ? C.blue : C.muted }}>{item.fieldTicket || "—"}</td>
                  <td style={{ padding: "6px 6px", whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", gap: 4 }}>
                      {item.inYard > 0 && (
                        <button onClick={() => setShowCheckOut(item)} title="Check Out" style={{
                          background: C.red, color: C.white, border: "none", borderRadius: 3,
                          padding: "4px 8px", fontSize: 10, fontWeight: 700, cursor: "pointer",
                        }}>OUT</button>
                      )}
                      {out > 0 && (
                        <button onClick={() => setShowCheckIn(item)} title="Check In" style={{
                          background: C.green, color: C.white, border: "none", borderRadius: 3,
                          padding: "4px 8px", fontSize: 10, fontWeight: 700, cursor: "pointer",
                        }}>IN</button>
                      )}
                      <button onClick={() => setShowEdit(item)} title="Edit" style={{
                        background: "transparent", color: C.muted, border: `1px solid ${C.border}`, borderRadius: 3,
                        padding: "4px 8px", fontSize: 10, fontWeight: 700, cursor: "pointer",
                      }}>EDIT</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 0", color: C.muted, fontSize: 14 }}>No items match filters.</div>
        )}
      </div>

      {/* CHECK OUT MODAL */}
      {showCheckOut && (
        <CheckOutModal item={showCheckOut} jobs={jobs} onCheckOut={handleCheckOut} onClose={() => setShowCheckOut(null)} />
      )}
      {/* CHECK IN MODAL */}
      {showCheckIn && (
        <CheckInModal item={showCheckIn} onCheckIn={handleCheckIn} onClose={() => setShowCheckIn(null)} />
      )}
      {/* EDIT MODAL */}
      {showEdit && (
        <EditItemModal item={showEdit} onSave={handleEdit} onDelete={handleDelete} onClose={() => setShowEdit(null)} />
      )}
      {/* ADD MODAL */}
      {showAdd && (
        <AddItemModal onSave={handleAdd} onClose={() => setShowAdd(false)} />
      )}
    </div>
  );
}

// ─── MODALS ───────────────────────────────────────────────────────────────────
function ModalWrap({ title, onClose, children, width = 440 }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "#00000088",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
    }} onClick={onClose}>
      <div style={{
        background: C.cardBg, border: `1px solid ${C.border}`,
        borderTop: `3px solid ${C.red}`, borderRadius: 8,
        padding: 24, width, maxWidth: "92vw", maxHeight: "85vh", overflowY: "auto",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 18 }}>{title}</div>
        {children}
      </div>
    </div>
  );
}

function CheckOutModal({ item, jobs, onCheckOut, onClose }) {
  const [qty, setQty] = useState(1);
  const [customer, setCustomer] = useState("");
  const [ft, setFt] = useState("");
  const [jobLink, setJobLink] = useState("");

  const activeJobs = jobs.filter(j => j.status !== "Invoiced");

  const handleJobSelect = (jobId) => {
    setJobLink(jobId);
    if (jobId) {
      const job = jobs.find(j => j.id === Number(jobId));
      if (job) setCustomer(`${job.customer} — ${job.location}`);
    }
  };

  return (
    <ModalWrap title={`Check Out — ${item.size} ${item.item}`} onClose={onClose}>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>
        Available: <strong style={{ color: C.green }}>{item.inYard}</strong> in yard
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>LINK TO JOB</label>
        <select style={inputStyle} value={jobLink} onChange={e => handleJobSelect(e.target.value)}>
          <option value="">— No Job / Manual Entry —</option>
          {activeJobs.map(j => <option key={j.id} value={j.id}>#{j.id} {j.customer}</option>)}
        </select>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: 10, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>QTY</label>
          <input type="number" min={1} max={item.inYard} style={inputStyle} value={qty} onChange={e => setQty(Math.min(Number(e.target.value), item.inYard))} />
        </div>
        <div>
          <label style={labelStyle}>CUSTOMER / LOCATION</label>
          <input style={inputStyle} value={customer} onChange={e => setCustomer(e.target.value)} placeholder="Customer or location..." />
        </div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>FIELD TICKET #</label>
        <input style={inputStyle} value={ft} onChange={e => setFt(e.target.value)} placeholder="Optional" />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Btn onClick={() => { if (qty > 0 && qty <= item.inYard) onCheckOut(item.id, qty, customer || null, ft || null); }}>CHECK OUT {qty}</Btn>
        <Btn onClick={onClose} variant="ghost">CANCEL</Btn>
      </div>
    </ModalWrap>
  );
}

function CheckInModal({ item, onCheckIn, onClose }) {
  const out = item.qtyOwned - item.inYard;
  const [qty, setQty] = useState(out);

  return (
    <ModalWrap title={`Check In — ${item.size} ${item.item}`} onClose={onClose} width={360}>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>
        Currently out: <strong style={{ color: C.orange }}>{out}</strong>
        {item.customer && <span> — {item.customer}</span>}
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>QTY RETURNING</label>
        <input type="number" min={1} max={out} style={inputStyle} value={qty} onChange={e => setQty(Math.min(Number(e.target.value), out))} />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Btn variant="blue" onClick={() => { if (qty > 0 && qty <= out) onCheckIn(item.id, qty); }}>CHECK IN {qty}</Btn>
        <Btn onClick={onClose} variant="ghost">CANCEL</Btn>
      </div>
    </ModalWrap>
  );
}

function EditItemModal({ item, onSave, onDelete, onClose }) {
  const [form, setForm] = useState({
    size: item.size, category: item.category, item: item.item,
    psi: item.psi || "", itemNum: item.itemNum, serial: item.serial || "",
    qtyOwned: item.qtyOwned, inYard: item.inYard, notes: item.notes || "",
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <ModalWrap title={`Edit — ${item.size} ${item.item}`} onClose={onClose} width={520}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>SIZE</label>
          <select style={inputStyle} value={form.size} onChange={e => set("size", e.target.value)}>
            {['2"', '3"', '4"'].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>CATEGORY</label>
          <select style={inputStyle} value={form.category} onChange={e => set("category", e.target.value)}>
            {["Fitting", "Pup Joint", "Valve", "Cross Over"].map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>PSI</label>
          <input style={inputStyle} value={form.psi} onChange={e => set("psi", e.target.value)} placeholder="Optional" />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>ITEM NAME</label>
          <input style={inputStyle} value={form.item} onChange={e => set("item", e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>ITEM #</label>
          <input style={inputStyle} value={form.itemNum} onChange={e => set("itemNum", e.target.value)} />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>SERIAL #</label>
          <input style={inputStyle} value={form.serial} onChange={e => set("serial", e.target.value)} placeholder="If any" />
        </div>
        <div>
          <label style={labelStyle}>QTY OWNED</label>
          <input type="number" min={0} style={inputStyle} value={form.qtyOwned} onChange={e => set("qtyOwned", Number(e.target.value))} />
        </div>
        <div>
          <label style={labelStyle}>IN YARD</label>
          <input type="number" min={0} max={form.qtyOwned} style={inputStyle} value={form.inYard} onChange={e => set("inYard", Math.min(Number(e.target.value), form.qtyOwned))} />
        </div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>NOTES</label>
        <input style={inputStyle} value={form.notes} onChange={e => set("notes", e.target.value)} />
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn onClick={() => onSave(item.id, { ...form, psi: form.psi || null, serial: form.serial || null, notes: form.notes || null })}>SAVE</Btn>
          <Btn onClick={onClose} variant="ghost">CANCEL</Btn>
        </div>
        <button onClick={() => onDelete(item.id)} style={{
          background: "transparent", color: C.red, border: `1px solid ${C.red}44`,
          borderRadius: 4, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer",
        }}>DELETE</button>
      </div>
    </ModalWrap>
  );
}

function AddItemModal({ onSave, onClose }) {
  const [form, setForm] = useState({
    size: '2"', category: "Fitting", item: "", psi: null,
    itemNum: "", serial: null, qtyOwned: 0, inYard: 0,
    customer: null, fieldTicket: null, notes: null,
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <ModalWrap title="Add New Inventory Item" onClose={onClose} width={520}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>SIZE *</label>
          <select style={inputStyle} value={form.size} onChange={e => set("size", e.target.value)}>
            {['2"', '3"', '4"'].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>CATEGORY *</label>
          <select style={inputStyle} value={form.category} onChange={e => set("category", e.target.value)}>
            {["Fitting", "Pup Joint", "Valve", "Cross Over"].map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>PSI</label>
          <input style={inputStyle} value={form.psi || ""} onChange={e => set("psi", e.target.value || null)} placeholder="Optional" />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>ITEM NAME *</label>
          <input style={inputStyle} value={form.item} onChange={e => set("item", e.target.value)} placeholder='e.g. Cushion 90' />
        </div>
        <div>
          <label style={labelStyle}>ITEM #</label>
          <input style={inputStyle} value={form.itemNum} onChange={e => set("itemNum", e.target.value)} placeholder='e.g. 2C90-###' />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>QTY OWNED</label>
          <input type="number" min={0} style={inputStyle} value={form.qtyOwned} onChange={e => { const v = Number(e.target.value); set("qtyOwned", v); set("inYard", v); }} />
        </div>
        <div>
          <label style={labelStyle}>IN YARD</label>
          <input type="number" min={0} max={form.qtyOwned} style={inputStyle} value={form.inYard} onChange={e => set("inYard", Math.min(Number(e.target.value), form.qtyOwned))} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Btn onClick={() => { if (form.item.trim()) onSave(form); }}>ADD ITEM</Btn>
        <Btn onClick={onClose} variant="ghost">CANCEL</Btn>
      </div>
    </ModalWrap>
  );
}

// ─── NEW JOB MODAL ────────────────────────────────────────────────────────────
function NewJobModal({ onClose, onCreateJob, nextJobId, customers, userNames }) {
  const [custSearch, setCustSearch] = useState("");
  const [showCustDrop, setShowCustDrop] = useState(false);
  const [selectedCust, setSelectedCust] = useState(null);
  const [location, setLocation] = useState("");
  const [wells, setWells] = useState("");
  const [afe, setAfe] = useState("");
  const [schedDate, setSchedDate] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const filteredCust = custSearch.length > 0
    ? customers.filter(c => c.name.toLowerCase().includes(custSearch.toLowerCase()))
    : customers;

  const selectCustomer = (cust) => {
    setSelectedCust(cust);
    setCustSearch(cust.name);
    setShowCustDrop(false);
    setContact(cust.contact || "");
    setEmail(cust.email || "");
    setPhone(cust.phone || "");
    const loc = [cust.city, cust.state].filter(Boolean).join(", ");
    if (loc) setLocation(loc);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "#00000088",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
    }} onClick={onClose}>
      <div style={{
        background: C.cardBg, border: `1px solid ${C.border}`,
        borderTop: `3px solid ${C.red}`, borderRadius: 8,
        padding: 28, width: 540, maxWidth: "92vw", maxHeight: "90vh", overflowY: "auto",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>NEW JOB — #{nextJobId}</div>

        {/* Customer search */}
        <div style={{ marginBottom: 14, position: "relative" }}>
          <label style={labelStyle}>CUSTOMER *</label>
          <input
            style={{ ...inputStyle, borderColor: selectedCust ? C.green : C.border }}
            value={custSearch}
            onChange={e => { setCustSearch(e.target.value); setShowCustDrop(true); setSelectedCust(null); }}
            onFocus={() => setShowCustDrop(true)}
            placeholder="Type to search or browse..."
          />
          {showCustDrop && (
            <div style={{
              position: "absolute", top: "100%", left: 0, right: 0, zIndex: 10,
              background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 6,
              boxShadow: "0 8px 32px #00000022", maxHeight: 220, overflowY: "auto", marginTop: 2,
            }}>
              {filteredCust.map(c => (
                <div key={c.name} onClick={() => selectCustomer(c)} style={{
                  padding: "8px 12px", cursor: "pointer", fontSize: 12,
                  display: "flex", justifyContent: "space-between",
                }}
                  onMouseEnter={e => e.currentTarget.style.background = C.steel}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <span style={{ fontWeight: 700, color: C.text }}>{c.name}</span>
                  <span style={{ color: C.muted, fontSize: 11 }}>
                    {[c.city, c.state].filter(Boolean).join(", ") || ""}
                  </span>
                </div>
              ))}
              {filteredCust.length === 0 && (
                <div style={{ padding: 10, color: C.muted, fontSize: 12, textAlign: "center" }}>No matches</div>
              )}
            </div>
          )}
        </div>

        {/* Auto-populated contact row */}
        {selectedCust && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>CONTACT</label>
              <input style={inputStyle} value={contact} onChange={e => setContact(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>EMAIL</label>
              <input style={inputStyle} value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>PHONE</label>
              <input style={inputStyle} value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>LOCATION</label>
          <input style={inputStyle} value={location} onChange={e => setLocation(e.target.value)} placeholder="City, State or Basin — Area" />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>WELL NAME(S)</label>
          <input style={inputStyle} value={wells} onChange={e => setWells(e.target.value)} placeholder="Well #1H, Well #2H..." />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>AFE #</label>
            <input style={inputStyle} value={afe} onChange={e => setAfe(e.target.value)} placeholder="If available" />
          </div>
          <div>
            <label style={labelStyle}>SCHEDULED DATE</label>
            <input type="date" style={inputStyle} value={schedDate} onChange={e => setSchedDate(e.target.value)} />
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>ASSIGNED TO</label>
          <select style={inputStyle} value={assignedTo} onChange={e => setAssignedTo(e.target.value)}>
            <option value="">— Select —</option>
            {userNames.map(u => <option key={u}>{u}</option>)}
          </select>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <Btn onClick={() => {
            if (!custSearch.trim()) return;
            const wellList = wells.split(",").map(w => w.trim()).filter(Boolean);
            const afeList = afe ? afe.split(",").map(a => a.trim()) : wellList.map(() => null);
            onCreateJob({
              id: nextJobId,
              customer: custSearch.trim(),
              location: location || "TBD",
              wells: wellList.length > 0 ? wellList : ["TBD"],
              afe: afeList,
              dateStarted: schedDate || today(),
              status: "Scheduled",
              crew: assignedTo ? [{ name: assignedTo, role: "Supervisor" }] : [],
              equipment: [],
              hoursLogged: 0,
              estimatedCost: 0,
              ticketStatus: { ru: null, tester: null, rd: null },
              jsaComplete: false,
              contact: contact || null,
              email: email || null,
              phone: phone || null,
            });
          }}>CREATE JOB</Btn>
          <Btn onClick={onClose} variant="ghost">CANCEL</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
function FTIDashboard({ currentUser, onLogout }) {
  CURRENT_USER = currentUser.name;
  const userRole = currentUser.role; // owner | admin | ops_mgr | supervisor | partner | field
  const isAdmin = ["owner", "admin"].includes(userRole);
  const isManager = ["owner", "admin", "ops_mgr", "supervisor"].includes(userRole);
  
  const [page, setPage] = useState("dashboard");
  const [expandedId, setExpandedId] = useState(null);
  const [filterStatus, setFilterStatus] = useState("All");
  const [showNewJob, setShowNewJob] = useState(false);
  const [loading, setLoading] = useState(true);

  // All state — starts empty, loads from API
  const [todos, setTodos] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [jsas, setJsas] = useState([]);
  const [users, setUsers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [qbItems, setQbItems] = useState([]);

  // Load all data from API on mount
  useEffect(() => {
    const load = async () => {
      try {
        const [jobsR, ticketsR, todosR, invR, usersR, custR, qbR] = await Promise.all([
          fetch(`${API_URL}/jobs`).then(r => r.json()),
          fetch(`${API_URL}/tickets`).then(r => r.json()),
          fetch(`${API_URL}/todos`).then(r => r.json()),
          fetch(`${API_URL}/inventory`).then(r => r.json()),
          fetch(`${API_URL}/users`).then(r => r.json()),
          fetch(`${API_URL}/customers`).then(r => r.json()),
          fetch(`${API_URL}/qb-items`).then(r => r.json()),
        ]);
        // Transform jobs from API format to app format
        const jobsMapped = (jobsR || []).map(j => ({
          id: j.id,
          customer: j.customer_name,
          customerId: j.customer_id,
          location: j.location || "",
          wells: (j.wells || []).map(w => w.well_name),
          afe: (j.wells || []).map(w => w.afe_number),
          dateStarted: j.date_started,
          status: j.status,
          crew: (j.crew || []).map(c => ({ name: c.name, role: c.role })),
          equipment: (j.equipment || []).map(e => e.description),
          hoursLogged: Number(j.hours_logged) || 0,
          estimatedCost: Number(j.estimated_cost) || 0,
          jsaComplete: j.jsa_complete,
          notes: j.notes,
        }));
        // Transform tickets
        const ticketsMapped = (ticketsR || []).map(t => ({
          id: t.id,
          jobId: t.job_id,
          type: t.type,
          status: t.status,
          date: t.date,
          signedBy: t.signed_by,
          signedAt: t.signed_at,
          signatureImg: t.signature_img,
          sigNotReqReason: t.sig_not_req_reason,
          sigNotReqNote: t.sig_not_req_note,
          notes: t.notes,
          missingPieces: t.missing_pieces,
          locked: t.locked,
          lineItems: (t.lineItems || t.line_items || []).map(li => ({
            qbCode: li.qb_code,
            desc: li.description,
            rate: Number(li.rate),
            qty: Number(li.qty),
            um: li.unit_measure,
            days: Number(li.days) || 1,
          })),
        }));
        // Transform todos
        const todosMapped = (todosR || []).map(t => ({
          id: t.id,
          title: t.title,
          description: t.description,
          jobId: t.job_id,
          priority: t.priority,
          dueDate: t.due_date,
          createdBy: t.created_by_name || t.created_by,
          assignedTo: t.assigned_to_name || t.assigned_to,
          createdById: t.created_by,
          assignedToId: t.assigned_to,
          completed: t.completed,
          completedBy: t.completed_by_name || t.completed_by,
          completedAt: t.completed_at,
        }));
        // Transform inventory
        const invMapped = (invR || []).map(i => ({
          id: i.id,
          size: i.size,
          category: i.category,
          item: i.item,
          psi: i.psi,
          itemNum: i.item_number,
          serial: i.serial_number,
          qtyOwned: i.qty_owned,
          inYard: i.in_yard,
          customer: i.customer,
          fieldTicket: i.field_ticket,
          notes: i.notes,
        }));
        // Transform QB items
        const qbMapped = (qbR || []).map(q => ({
          code: q.code,
          desc: q.description,
          um: q.unit_measure,
          price: Number(q.price),
        }));

        setJobs(jobsMapped);
        setTickets(ticketsMapped);
        setTodos(todosMapped);
        setInventory(invMapped);
        setUsers(usersR || []);
        setCustomers(custR || []);
        setQbItems(qbMapped);
      } catch (err) {
        console.error("Failed to load data:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Derived user names for dropdowns
  const userNames = users.map(u => u.name);
  const userIdByName = {};
  users.forEach(u => { userIdByName[u.name] = u.id; });

  const myActiveTodos = todos.filter(t => todoVisible(t) && !t.completed);

  const pendingByJob = useMemo(() => {
    const map = {};
    todos.filter(t => t.jobId && !t.completed && todoVisible(t)).forEach(t => {
      map[t.jobId] = (map[t.jobId] || 0) + 1;
    });
    return map;
  }, [todos]);

  const navigateToJob = (jobId) => {
    setPage("dashboard");
    setExpandedId(jobId);
  };

  const nextJobId = useMemo(() => {
    if (jobs.length === 0) return 300001;
    return Math.max(...jobs.map(j => j.id)) + 1;
  }, [jobs]);

  const handleCreateJob = async (newJob) => {
    // Find customer ID
    const cust = customers.find(c => c.name === newJob.customer);
    const payload = {
      id: newJob.id,
      customer_id: cust?.id || null,
      location: newJob.location,
      date_started: newJob.dateStarted,
      status: newJob.status,
      wells: newJob.wells.map((w, i) => ({ well_name: w, afe_number: newJob.afe[i] || null })),
      crew: newJob.crew.map(c => ({ name: c.name, role: c.role, user_id: userIdByName[c.name] || null })),
      equipment: newJob.equipment || [],
    };
    try {
      const r = await fetch(`${API_URL}/jobs`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (r.ok) {
        setJobs(prev => [newJob, ...prev]);
        setShowNewJob(false);
        setExpandedId(newJob.id);
      }
    } catch (err) { console.error("Create job failed:", err); }
  };

  // Helper to log audit events
  const logAudit = async (action, entityType, entityId, oldValue, newValue, notes) => {
    try {
      await fetch(`${API_URL}/audit`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: currentUser.id, user_name: currentUser.name, action, entity_type: entityType, entity_id: String(entityId), old_value: oldValue, new_value: newValue, notes }),
      });
    } catch (err) { console.error("Audit log failed:", err); }
  };

  const handleDeleteJob = async (jobId) => {
    if (!["owner", "admin", "ops_mgr"].includes(currentUser.role)) return;
    const job = jobs.find(j => j.id === jobId);
    try {
      await fetch(`${API_URL}/jobs/${jobId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Deleted" }),
      });
      await logAudit("job_delete", "job", jobId, { status: job?.status, customer: job?.customer }, { status: "Deleted" }, `Job #${jobId} deleted by ${currentUser.name}`);
      setJobs(prev => prev.filter(j => j.id !== jobId));
      setExpandedId(null);
    } catch (err) { console.error("Delete job failed:", err); }
  };

  const handleFlagCancel = async (jobId) => {
    const job = jobs.find(j => j.id === jobId);
    try {
      await fetch(`${API_URL}/jobs/${jobId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "flaggedCancel" }),
      });
      await logAudit("job_flag_cancel", "job", jobId, { status: job?.status }, { status: "flaggedCancel" }, `Job #${jobId} flagged for cancellation by ${currentUser.name}`);
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: "flaggedCancel" } : j));
    } catch (err) { console.error("Flag cancel failed:", err); }
  };

  const filteredJobs = filterStatus === "All" ? jobs : jobs.filter(j => j.status === filterStatus);
  const sortedJobs = [...filteredJobs].sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status));

  const totalOut = inventory.reduce((s, i) => s + (i.qtyOwned - i.inYard), 0);

  const NAV_ITEMS = ["Dashboard", "Jobs", "To-Dos", "Inventory", "Crew", "Reports"];

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: C.pageBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: C.blue, marginBottom: 8 }}>FLO-TEST INC.</div>
          <div style={{ fontSize: 13, color: C.muted }}>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", minWidth: 1200, background: C.pageBg, color: C.text, fontFamily: "'Arial', sans-serif" }}>
      {/* NAV */}
      <div style={{
        background: C.darkBlue, borderBottom: `2px solid ${C.red}`,
        padding: "0 28px", display: "flex", alignItems: "center",
        justifyContent: "space-between", height: 56,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            width: 36, height: 36, border: `2px solid ${C.red}`, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: C.blue, fontSize: 13, fontWeight: 900, color: C.white,
            boxShadow: `0 0 12px ${C.red}44`,
          }}>FTI</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.12em", color: C.white }}>FLO-TEST INC.</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#a0aec8", letterSpacing: "0.12em" }}>OPERATIONS DASHBOARD</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
          {NAV_ITEMS.map(item => {
            const pageMap = { Dashboard: "dashboard", "To-Dos": "todos", Inventory: "inventory" };
            const active = pageMap[item] === page;
            const clickable = !!pageMap[item];
            return (
              <span key={item} onClick={() => { if (clickable) setPage(pageMap[item]); }} style={{
                fontSize: 13, color: active ? C.white : clickable ? "#b0bdd4" : "#6b7a99",
                letterSpacing: "0.08em", cursor: clickable ? "pointer" : "default",
                borderBottom: active ? `2px solid ${C.red}` : "2px solid transparent",
                paddingBottom: 4, fontWeight: active ? 700 : 600,
                display: "flex", alignItems: "center",
              }}>
                {item}
                {item === "To-Dos" && <NavBadge count={myActiveTodos.length} />}
                {item === "Inventory" && totalOut > 0 && <NavBadge count={totalOut} />}
              </span>
            );
          })}
          <div style={{ position: "relative" }}>
            <div onClick={onLogout} title={`${currentUser.name} — Click to sign out`} style={{
              width: 30, height: 30, borderRadius: "50%", background: C.red,
              border: `2px solid #ffffff55`, display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 13, fontWeight: 800, cursor: "pointer", color: C.white,
            }}>{currentUser.name.charAt(0).toUpperCase()}</div>
          </div>
        </div>
      </div>

      {/* PAGES */}
      {page === "todos" && (
        <TodoPage todos={todos} setTodos={setTodos} jobs={jobs} onNavigateJob={navigateToJob} userNames={userNames} userIdByName={userIdByName} />
      )}

      {page === "inventory" && (
        <InventoryPage inventory={inventory} setInventory={setInventory} jobs={jobs} />
      )}

      {page === "dashboard" && (
        <div style={{ padding: "24px 28px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Active Jobs</h1>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                {jobs.length} total · {jobs.filter(j => j.status === "Active").length} active · Updated just now
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Btn onClick={() => setPage("todos")} variant="ghost">
                ☐ Tasks {myActiveTodos.length > 0 ? `(${myActiveTodos.length})` : ""}
              </Btn>
              <Btn onClick={() => setShowNewJob(true)}>+ NEW JOB</Btn>
            </div>
          </div>

          <PipelineSummary jobs={jobs} />

          <div style={{ display: "flex", gap: 6, marginBottom: 16, alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginRight: 4 }}>FILTER:</span>
            {["All", ...STATUS_ORDER].map(s => (
              <button key={s} onClick={() => setFilterStatus(s)} style={{
                background: filterStatus === s ? (s === "All" ? C.blue : STATUS_CONFIG[s]?.bg) : "transparent",
                border: `1px solid ${filterStatus === s ? (s === "All" ? C.blue : STATUS_CONFIG[s]?.color) : C.border}`,
                color: filterStatus === s ? (s === "All" ? C.white : STATUS_CONFIG[s]?.color) : C.muted,
                padding: "5px 12px", borderRadius: 4, fontSize: 11,
                fontWeight: 700, cursor: "pointer", fontFamily: "'Arial', sans-serif",
              }}>{s === "All" ? "ALL" : STATUS_CONFIG[s].label}</button>
            ))}
          </div>

          {sortedJobs.map(job => (
            <JobCard
              key={job.id} job={job}
              isExpanded={expandedId === job.id}
              onToggle={() => setExpandedId(expandedId === job.id ? null : job.id)}
              pendingTodos={pendingByJob[job.id] || 0}
              todos={todos} setTodos={setTodos}
              tickets={tickets} setTickets={setTickets}
              jobs={jobs} onNavigateJob={navigateToJob}
              onUpdateJob={async (id, updates) => {
                const oldJob = jobs.find(j => j.id === id);
                try {
                  const payload = { location: updates.location, status: updates.status };
                  if (updates.wells) payload.wells = updates.wells.map((w, i) => ({ well_name: w, afe_number: updates.afe?.[i] || null }));
                  if (updates.crew) payload.crew = updates.crew.map(c => ({ name: c.name, role: c.role, user_id: userIdByName[c.name] || null }));
                  if (updates.customer) {
                    const cust = customers.find(c => c.name === updates.customer);
                    if (cust) payload.customer_id = cust.id;
                  }
                  await fetch(`${API_URL}/jobs/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
                  await logAudit("job_edit", "job", id, { customer: oldJob?.customer, status: oldJob?.status, location: oldJob?.location }, updates, `Job #${id} edited by ${currentUser.name}`);
                } catch (err) { console.error("Job update failed:", err); }
                setJobs(prev => prev.map(j => j.id === id ? { ...j, ...updates } : j));
              }}
              jsas={jsas} setJsas={setJsas}
              userNames={userNames}
              qbItems={qbItems}
              userIdByName={userIdByName}
              currentUser={currentUser}
              onDeleteJob={handleDeleteJob}
              onFlagCancel={handleFlagCancel}
            />
          ))}
        </div>
      )}

      {/* NEW JOB MODAL */}
      {showNewJob && (
        <NewJobModal onClose={() => setShowNewJob(false)} onCreateJob={handleCreateJob} nextJobId={nextJobId} customers={customers} userNames={userNames} />
      )}
    </div>
  );
}
