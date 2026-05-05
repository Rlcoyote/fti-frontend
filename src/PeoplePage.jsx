import { useState, useEffect } from "react";
import { C, API_URL } from "./config.js";
import { Btn, ModalWrap, ConfirmModal, inputStyle, labelStyle } from "./SharedUI.jsx";
import { canModifyUser, ROLE_OPTIONS } from "./utils.js";
import { useApp } from "./AppContext.jsx";
import EditPersonModal from "./EditPersonModal.jsx";
import PermissionsMatrixView from "./PermissionsMatrixView.jsx";
import WebAuthnSetupModal from "./WebAuthnSetupModal.jsx";

// ─── PeoplePage (v28.17 — consolidation of UsersPage + EmployeesPage +
// ─── PermissionsModal) ─────────────────────────────────────────────────────
// One canonical surface for all "manage a person" operations. Replaces:
//   - /users (UsersPage.jsx) — auth/access actions
//   - /employees (EmployeesPage.jsx) — HR/profile fields
//   - PermissionsModal — matrix view
//
// Why one page instead of three:
//   - Three pages = three role-edit code paths = three places for drift
//   - Hardcoded role checks were scattered; permissions list grew piecemeal
//   - White-label customers shouldn't have to learn three surfaces for what
//     is conceptually one thing — managing people
//
// CAM links:
//   - Reggie's pending amendment (structural impossibility): three CRUD
//     surfaces collapsed to one means the surfaces literally cannot
//     diverge — there's only one place to edit a given field
//   - Article XXIV (consistency across the codebase) — shared visual
//     vocabulary applies to people management end-to-end
//
// Layout:
//   - Top: "People" title + "+ Add Person" button
//   - Tab bar: Roster / Permissions Matrix
//   - Roster: filter row (search + show-inactive), then table (desktop) or
//     cards (mobile <900px). Each row carries its lifecycle action buttons.
//   - Permissions Matrix: embedded <PermissionsMatrixView/> (extracted from
//     the v28.x PermissionsModal)
//
// Edit modal: <EditPersonModal/> handles Profile + Access fields. Auth
// lifecycle actions (Reset PW, Wipe Bio, Send/Reset PIN, Manage Devices)
// live as ROW buttons here, NOT inside the edit modal — that keeps the
// field-edit experience focused on data entry.

function PeoplePage() {
  const { currentUser, refreshUsers, roles, showNotice } = useApp();
  const isOwnerOrAdmin = ["owner", "admin"].includes(currentUser?.role);

  // Top-level navigation state
  const [activeTab, setActiveTab] = useState("roster"); // "roster" | "permissions"

  // Responsive layout — same breakpoint as legacy UsersPage (<900 → cards)
  const [winW, setWinW] = useState(window.innerWidth);
  useEffect(() => {
    const h = () => setWinW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  const isMobile = winW < 900;

  // Roster data + filters
  const [people, setPeople] = useState([]);
  const [jobTitles, setJobTitles] = useState([]);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Edit modal — null | "new" | personObject
  const [editing, setEditing] = useState(null);

  // Confirmation modal — null | { kind, title, message, yesLabel, onYes }
  const [confirmAction, setConfirmAction] = useState(null);

  // Admin password reset modal (admin → other user)
  const [resetPwUser, setResetPwUser] = useState(null);
  const [resetPwVal, setResetPwVal] = useState("");
  const [resetPwConfirm, setResetPwConfirm] = useState("");
  const [resetPwMsg, setResetPwMsg] = useState("");

  // Self password change modal
  const [showChangePw, setShowChangePw] = useState(false);
  const [changePwCurrent, setChangePwCurrent] = useState("");
  const [changePwNew, setChangePwNew] = useState("");
  const [changePwConfirm, setChangePwConfirm] = useState("");
  const [changePwMsg, setChangePwMsg] = useState("");

  // WebAuthn (biometric) self-service modal
  const [showWebauthn, setShowWebauthn] = useState(false);

  // Inline transient toast for non-modal feedback (rare — most async actions
  // use the per-row feedback below).
  const [msg, setMsg] = useState("");

  // v28.46 — per-row feedback for async action buttons (RESEND INVITE,
  // SEND PIN SETUP, RESET PIN, WIPE BIO, DEACTIVATE).
  //
  // The pre-fix bug: RESEND INVITE wrote to a top-of-page toast (`msg`),
  // invisible to a user 45 rows down. Worse, the button gave no in-flight
  // signal — so a user who didn't see the toast clicked again. And again.
  // (One auditor received 15 invite emails this way.)
  //
  // Structural fix per CAM Article X (Dummy Proof) + the pending
  // structural-impossibility amendment: feedback lives on the same row as
  // the button that fired it, AND the button disables while in flight so
  // double-clicks become physically impossible.
  //
  // State shape: { [userId]: { kind: "pending"|"success"|"error", msg: "..." } }
  const [rowFeedback, setRowFeedback] = useState({});

  // Set or clear feedback for a row. `kind` drives the pill color; "pending"
  // never auto-clears (only a subsequent success/error replaces it). "success"
  // and "error" auto-clear after `ttlMs`. The clear is guarded against newer
  // messages clobbering older ones.
  const setRowMsg = (userId, kind, message, ttlMs = 4000) => {
    setRowFeedback(prev => ({ ...prev, [userId]: { kind, msg: message } }));
    if (kind !== "pending" && ttlMs > 0) {
      setTimeout(() => {
        setRowFeedback(prev => {
          const cur = prev[userId];
          if (!cur || cur.msg !== message) return prev; // newer msg — leave it
          const next = { ...prev };
          delete next[userId];
          return next;
        });
      }, ttlMs);
    }
  };

  // v28.17 fix — fetchers + their useEffects must come BEFORE the
  // permission early-return below. Hooks must run in the same order on
  // every render; if a non-owner first sees the early return and then
  // becomes an owner, the second render would call MORE hooks than the
  // first → React crashes with "Rendered more hooks than during the
  // previous render." Mirror the JobTitlesPage pattern (useEffect first,
  // gate later).
  const fetchPeople = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/employees${includeInactive ? "?include_inactive=true" : ""}`);
      if (r.ok) setPeople(await r.json());
    } catch (err) { console.error("Fetch people failed:", err); }
    setLoading(false);
  };

  const fetchJobTitles = async () => {
    try {
      const r = await fetch(`${API_URL}/job-titles`);
      if (r.ok) setJobTitles(await r.json());
    } catch { /* non-blocking */ }
  };

  useEffect(() => { fetchPeople(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [includeInactive]);
  useEffect(() => { fetchJobTitles(); }, []);

  if (!isOwnerOrAdmin) {
    return <div style={{ padding: 32, color: C.muted }}>You need owner or admin access to view this page.</div>;
  }

  // ─── Lifecycle actions (each fires API + refreshes list / toasts) ────────

  // v28.46 — every async action below sets row-pending before the request and
  // success/error after, so the user sees feedback right where they clicked.
  // Pending state also disables every action button on the row (see
  // rowButtons), making the auditor-got-15-invites scenario structurally
  // impossible.

  const sendPinSetup = async (p) => {
    setRowMsg(p.id, "pending", "Sending PIN setup…");
    try {
      const r = await fetch(`${API_URL}/employees/${p.id}/send-pin-setup`, { method: "POST" });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setRowMsg(p.id, "error", data.error || "Could not send PIN setup link.", 6000);
        return;
      }
      setRowMsg(p.id, "success", `✓ PIN setup link sent to ${p.phone || "phone"}`, 5000);
      fetchPeople();
    } catch (err) { setRowMsg(p.id, "error", err.message || "Send failed", 6000); }
  };

  const resetPin = async (p) => {
    setRowMsg(p.id, "pending", "Resetting PIN…");
    try {
      const r = await fetch(`${API_URL}/employees/${p.id}/reset-pin`, { method: "POST" });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setRowMsg(p.id, "error", data.error || "Could not reset PIN.", 6000);
        return;
      }
      setRowMsg(p.id, "success", `✓ PIN reset; new link sent to ${p.phone || "phone"}`, 5000);
      fetchPeople();
    } catch (err) { setRowMsg(p.id, "error", err.message || "Reset failed", 6000); }
  };

  const deactivate = async (p) => {
    setRowMsg(p.id, "pending", "Deactivating…");
    try {
      const r = await fetch(`${API_URL}/employees/${p.id}/deactivate`, { method: "POST" });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setRowMsg(p.id, "error", data.error || "Could not deactivate.", 6000);
        return;
      }
      setRowMsg(p.id, "success", `✓ ${p.first_name} ${p.last_name} deactivated`, 5000);
      fetchPeople();
      refreshUsers();
    } catch (err) { setRowMsg(p.id, "error", err.message || "Deactivate failed", 6000); }
  };

  const resendInvite = async (p) => {
    setRowMsg(p.id, "pending", "Sending invite…");
    try {
      const r = await fetch(`${API_URL}/auth/invite`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: p.id }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setRowMsg(p.id, "error", data.error || "Failed to resend invite", 8000);
        return;
      }
      setRowMsg(p.id, "success", `✓ Invite sent to ${p.email}`, 5000);
    } catch (err) {
      setRowMsg(p.id, "error", err?.message || "Connection error", 6000);
    }
  };

  const wipeBio = async (p) => {
    setRowMsg(p.id, "pending", "Wiping biometric…");
    try {
      const r = await fetch(`${API_URL}/auth/webauthn/admin-disable`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: p.id }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setRowMsg(p.id, "error", data.error || "Could not wipe biometric devices.", 6000);
        return;
      }
      setRowMsg(p.id, "success", `✓ Biometric wiped — ${p.first_name} ${p.last_name} re-registers next login`, 5000);
      refreshUsers();
    } catch (err) { setRowMsg(p.id, "error", err?.message || "Connection error", 6000); }
  };

  // v28.49 — force every active session for the target user to end. Bumps
  // their token_version on the backend, invalidating ALL outstanding JWTs.
  // Distinct from WIPE BIO: the user keeps their biometric credentials and
  // can sign back in normally. This is the lighter-touch tool for the
  // "kick this user off all devices NOW" use case.
  const forceLogout = async (p) => {
    setRowMsg(p.id, "pending", "Forcing sign-out…");
    try {
      const r = await fetch(`${API_URL}/users/${p.id}/force-logout`, {
        method: "POST", headers: { "Content-Type": "application/json" },
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setRowMsg(p.id, "error", data.error || "Could not force sign-out.", 6000);
        return;
      }
      setRowMsg(p.id, "success", `✓ ${p.first_name} ${p.last_name} signed out of all devices`, 5000);
    } catch (err) { setRowMsg(p.id, "error", err?.message || "Connection error", 6000); }
  };

  const handleAdminResetPassword = async () => {
    if (!resetPwVal || resetPwVal.length < 6) { setResetPwMsg("Password must be at least 6 characters"); return; }
    if (resetPwVal !== resetPwConfirm) { setResetPwMsg("Passwords don't match"); return; }
    try {
      const r = await fetch(`${API_URL}/auth/admin-reset-password`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: resetPwUser.id, password: resetPwVal, requester_role: currentUser.role }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => null);
        setResetPwMsg(d?.error || "Failed");
        return;
      }
      const targetName = `${resetPwUser.first_name || resetPwUser.name || ""} ${resetPwUser.last_name || ""}`.trim();
      setResetPwUser(null);
      setResetPwVal(""); setResetPwConfirm(""); setResetPwMsg("");
      setMsg(`Password reset for ${targetName}.`);
      setTimeout(() => setMsg(""), 4000);
    } catch { setResetPwMsg("Error resetting password"); }
  };

  const handleChangePw = async () => {
    if (!changePwCurrent) { setChangePwMsg("Enter your current password"); return; }
    if (!changePwNew || changePwNew.length < 6) { setChangePwMsg("New password must be at least 6 characters"); return; }
    if (changePwNew !== changePwConfirm) { setChangePwMsg("Passwords don't match"); return; }
    try {
      const r = await fetch(`${API_URL}/auth/change-password`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: currentUser.id, current_password: changePwCurrent, new_password: changePwNew }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setChangePwMsg(d?.error || "Failed"); return; }
      setShowChangePw(false);
      setChangePwCurrent(""); setChangePwNew(""); setChangePwConfirm(""); setChangePwMsg("");
      setMsg("Password changed.");
      setTimeout(() => setMsg(""), 3000);
    } catch { setChangePwMsg("Connection error"); }
  };

  // ─── Filter the roster locally ───────────────────────────────────────────
  const filtered = (() => {
    if (!search.trim()) return people;
    const q = search.trim().toLowerCase();
    return people.filter(p =>
      String(p.first_name || "").toLowerCase().includes(q) ||
      String(p.last_name || "").toLowerCase().includes(q) ||
      String(p.email || "").toLowerCase().includes(q) ||
      String(p.qb_employee_id || "").toLowerCase().includes(q) ||
      String(p.job_title || "").toLowerCase().includes(q) ||
      String(p.role || "").toLowerCase().includes(q)
    );
  })();

  const formatPhoneDisplay = (raw) => {
    const d = String(raw || "").replace(/\D/g, "");
    if (d.length !== 10) return raw || "—";
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  };

  const roleBg = r => r === "owner" ? "#fdecea" : r === "admin" ? "#e8f0fb" : r === "manager" ? "#e6f5ec" : r === "lead" ? "#fdf5d8" : r === "salesman" ? "#f3eafa" : "#f0f3f8";
  const roleColor = r => r === "owner" ? C.red : r === "admin" ? C.blue : r === "manager" ? C.green : r === "lead" ? "#8a6500" : r === "salesman" ? "#7a3ca0" : C.muted;

  const tabBtnStyle = (isActive) => ({
    background: isActive ? C.cardBg : "transparent",
    border: isActive ? `1px solid ${C.border}` : "1px solid transparent",
    borderBottom: isActive ? `1px solid ${C.cardBg}` : "1px solid transparent",
    borderTopLeftRadius: 4, borderTopRightRadius: 4,
    marginBottom: isActive ? -1 : 0,
    color: isActive ? C.blue : C.muted,
    padding: "8px 18px", fontSize: 12,
    fontWeight: 700, cursor: "pointer", letterSpacing: "0.06em",
  });

  const actionBtnStyle = { background: "transparent", border: `1px solid ${C.border}`, color: C.muted, fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 3, cursor: "pointer", letterSpacing: "0.04em" };
  // v28.46 — disabled style for buttons while their row's async action is pending.
  const disabledBtnStyle = { ...actionBtnStyle, opacity: 0.4, cursor: "not-allowed", color: C.muted, border: `1px solid ${C.border}` };

  // ─── Per-person row buttons (shared between table + cards) ───────────────
  const rowButtons = (p) => {
    const isSelf = p.id === currentUser?.id;
    const canModify = canModifyUser(currentUser?.role, p.role);
    const buttons = [];
    // v28.46 — every async-action button on this row disables when ANY
    // async is pending for this user, so a fast-clicking auditor can't
    // fire 15 invite emails in a row. The pending state clears as soon
    // as the success/error pill replaces it, freeing the buttons again.
    const fb = rowFeedback[p.id];
    const isPending = fb?.kind === "pending";
    const asyncBtn = (extra) => isPending ? disabledBtnStyle : { ...actionBtnStyle, ...extra };

    if (p.is_active) {
      buttons.push(
        <button key="edit" onClick={() => setEditing(p)} style={{ ...actionBtnStyle, border: `1px solid ${C.blue}44`, color: C.blue }}>
          EDIT
        </button>
      );
      if (p.pin_set === false) {
        buttons.push(
          <button key="send-pin" disabled={isPending} onClick={() => { if (!isPending) sendPinSetup(p); }} style={asyncBtn({ border: `1px solid ${C.blue}44`, color: isPending ? C.muted : C.blue })}>
            {isPending && fb.msg.startsWith("Sending PIN") ? "SENDING…" : "SEND PIN SETUP"}
          </button>
        );
      } else if (p.pin_set === true) {
        buttons.push(
          <button key="reset-pin" disabled={isPending} onClick={() => { if (!isPending) setConfirmAction({
            kind: "reset-pin",
            title: "Reset PIN?",
            message: `${p.first_name} ${p.last_name}'s current PIN will be cleared. A new setup text will be sent to ${p.phone || "their phone"}. The link expires in 7 days and can only be used once.`,
            yesLabel: "Reset PIN",
            onYes: () => resetPin(p),
          }); }} style={asyncBtn({})}>
            {isPending && fb.msg.startsWith("Resetting PIN") ? "RESETTING…" : "RESET PIN"}
          </button>
        );
      }
      if (canModify && !isSelf) {
        buttons.push(
          <button key="reset-pw" onClick={() => { setResetPwUser(p); setResetPwVal(""); setResetPwConfirm(""); setResetPwMsg(""); }} style={actionBtnStyle}>
            RESET PW
          </button>
        );
        buttons.push(
          <button key="resend" disabled={isPending} onClick={() => { if (!isPending) resendInvite(p); }} style={asyncBtn({})}>
            {isPending && fb.msg.startsWith("Sending invite") ? "SENDING…" : "RESEND INVITE"}
          </button>
        );
        buttons.push(
          <button key="wipe-bio" disabled={isPending} onClick={() => { if (!isPending) setConfirmAction({
            kind: "wipe-bio",
            title: "Wipe biometric devices?",
            message: `Wipe ALL registered biometric devices for ${p.first_name} ${p.last_name}? They'll re-register a device on next login (after entering their password). All current sessions will be invalidated.`,
            yesLabel: "Wipe Bio",
            onYes: () => wipeBio(p),
          }); }} style={isPending ? disabledBtnStyle : { ...actionBtnStyle, border: `1px solid ${C.red}33`, color: C.red }}>
            {isPending && fb.msg.startsWith("Wiping biometric") ? "WIPING…" : "WIPE BIO"}
          </button>
        );
        // v28.49 — FORCE SIGN OUT. Ends every active session for the
        // target without wiping biometric. Owner/admin only; admin
        // cannot force-logout an owner (backend enforces too).
        buttons.push(
          <button key="force-logout" disabled={isPending} onClick={() => { if (!isPending) setConfirmAction({
            kind: "force-logout",
            title: "Force sign-out of all devices?",
            message: `Sign ${p.first_name} ${p.last_name} out of every device they're currently logged into? Their biometric credentials are preserved — they can sign back in normally. Use this for terminated employees, suspected stolen tokens, or to clear stale concurrent sessions.`,
            yesLabel: "Force Sign Out",
            onYes: () => forceLogout(p),
          }); }} style={isPending ? disabledBtnStyle : { ...actionBtnStyle, border: `1px solid ${C.orange}44`, color: C.orange }}>
            {isPending && fb.msg.startsWith("Forcing sign-out") ? "SIGNING OUT…" : "FORCE SIGN OUT"}
          </button>
        );
      }
      if (isSelf) {
        buttons.push(
          <button key="change-pw" onClick={() => { setShowChangePw(true); setChangePwCurrent(""); setChangePwNew(""); setChangePwConfirm(""); setChangePwMsg(""); }} style={actionBtnStyle}>
            CHANGE PW
          </button>
        );
        buttons.push(
          <button key="manage-devices" onClick={() => setShowWebauthn(true)} style={{ ...actionBtnStyle, border: `1px solid ${C.blue}44`, color: C.blue }}>
            MANAGE DEVICES
          </button>
        );
      }
      if (canModify && !isSelf) {
        buttons.push(
          <button key="deactivate" disabled={isPending} onClick={() => { if (!isPending) setConfirmAction({
            kind: "deactivate",
            title: "Deactivate this person?",
            message: `${p.first_name} ${p.last_name} will be removed from the active roster. Their PIN link becomes invalid; their email can be reused for a new person; the crew picker will exclude them; historical data on tickets and JSAs is preserved.`,
            yesLabel: "Deactivate",
            onYes: () => deactivate(p),
          }); }} style={isPending ? disabledBtnStyle : { ...actionBtnStyle, border: `1px solid ${C.red}33`, color: C.red }}>
            {isPending && fb.msg.startsWith("Deactivating") ? "DEACTIVATING…" : "DEACTIVATE"}
          </button>
        );
      }
      if (!canModify && !isSelf) {
        buttons.push(
          <span key="protected" style={{ fontSize: 10, color: C.muted, fontStyle: "italic" }}>Protected</span>
        );
      }
      // v28.46 — inline per-row feedback pill. Renders right next to the
      // buttons so the user sees confirmation at the spot they clicked,
      // even if they're 45 rows down a long list. Color encodes kind:
      //   pending → blue tint with hourglass
      //   success → green tint with ✓
      //   error   → red tint with ✗ (longer TTL + tooltip with full text)
      if (fb) {
        const palette =
          fb.kind === "success" ? { bg: "#e6f5ec", color: C.green, border: C.green + "44" } :
          fb.kind === "error"   ? { bg: "#fdecea", color: C.red,   border: C.red + "44" } :
                                  { bg: "#e8f0fb", color: C.blue,  border: C.blue + "44" };
        buttons.push(
          <span key="row-feedback" title={fb.msg} style={{
            fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 3,
            background: palette.bg, color: palette.color,
            border: `1px solid ${palette.border}`, whiteSpace: "nowrap",
            maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis",
            letterSpacing: "0.04em",
          }}>
            {fb.kind === "pending" && "⌛ "}
            {fb.msg}
          </span>
        );
      }
    }

    return buttons;
  };

  return (
    <div style={{ padding: isMobile ? "16px 12px" : "24px 28px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>People</h1>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
            One place to manage profile details, access, and permissions for everyone in the company.
          </div>
        </div>
        {activeTab === "roster" && (
          <Btn variant="blue" onClick={() => setEditing("new")}>+ Add Person</Btn>
        )}
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 0, marginBottom: 16, borderBottom: `1px solid ${C.border}` }}>
        <button onClick={() => setActiveTab("roster")} style={tabBtnStyle(activeTab === "roster")}>ROSTER</button>
        <button onClick={() => setActiveTab("permissions")} style={tabBtnStyle(activeTab === "permissions")}>PERMISSIONS MATRIX</button>
      </div>

      {msg && (
        <div style={{
          padding: "8px 14px", marginBottom: 14,
          background: msg.toLowerCase().includes("fail") || msg.toLowerCase().includes("error") ? "#fdecea" : "#e6f5ec",
          color: msg.toLowerCase().includes("fail") || msg.toLowerCase().includes("error") ? C.red : C.green,
          borderRadius: 4, fontSize: 12, fontWeight: 700,
        }}>
          {msg}
        </div>
      )}

      {/* ─── ROSTER TAB ─── */}
      {activeTab === "roster" && (
        <>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
            <input
              style={{ ...inputStyle, maxWidth: 360 }}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name, email, QB ID, role, or title..."
            />
            <label style={{ fontSize: 12, color: C.muted, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              <input type="checkbox" checked={includeInactive} onChange={e => setIncludeInactive(e.target.checked)} style={{ accentColor: C.blue }} />
              Show inactive
            </label>
            <div style={{ marginLeft: "auto", fontSize: 12, color: C.muted }}>
              {filtered.length} of {people.length} shown
            </div>
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: C.muted }}>Loading…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: C.muted }}>
              {people.length === 0 ? "No one on the roster yet." : "No matches for your search."}
            </div>
          ) : isMobile ? (
            // ── Mobile: cards ──
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filtered.map(p => (
                <div key={p.id} style={{
                  background: p.is_active ? C.cardBg : "#f6f6f8",
                  border: `1px solid ${C.border}`, borderRadius: 6,
                  padding: 12,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
                        {p.first_name} {p.last_name}
                      </div>
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                        {p.email} · {formatPhoneDisplay(p.phone)}
                      </div>
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 3, background: roleBg(p.role), color: roleColor(p.role), letterSpacing: "0.06em", textTransform: "uppercase" }}>
                      {p.role}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>
                    {p.job_title || "—"} · QB {p.qb_employee_id || "—"} · PIN {p.pin_set ? <span style={{ color: C.green, fontWeight: 700 }}>SET</span> : "not set"}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {rowButtons(p)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // ── Desktop: table ──
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${C.border}`, textAlign: "left" }}>
                    <th style={thStyle}>Name</th>
                    <th style={thStyle}>Email</th>
                    <th style={thStyle}>Phone</th>
                    <th style={thStyle}>Role</th>
                    <th style={thStyle}>Title</th>
                    <th style={thStyle}>QB ID</th>
                    <th style={thStyle}>PIN</th>
                    <th style={thStyle}>Status</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => (
                    <tr key={p.id} style={{ borderBottom: `1px solid ${C.border}`, background: p.is_active ? "transparent" : "#f6f6f8" }}>
                      <td style={tdStyle}><strong>{p.first_name} {p.last_name}</strong></td>
                      <td style={tdStyle}>{p.email}</td>
                      <td style={tdStyle}>{formatPhoneDisplay(p.phone)}</td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 3, background: roleBg(p.role), color: roleColor(p.role), letterSpacing: "0.06em", textTransform: "uppercase" }}>
                          {p.role}
                        </span>
                      </td>
                      <td style={tdStyle}>{p.job_title || <span style={{ color: C.muted }}>—</span>}</td>
                      <td style={tdStyle}>{p.qb_employee_id || <span style={{ color: C.muted }}>—</span>}</td>
                      <td style={tdStyle}>
                        {p.pin_set
                          ? <span style={{ color: C.green, fontWeight: 700, fontSize: 11 }}>SET</span>
                          : <span style={{ color: C.muted, fontSize: 11 }}>not set</span>}
                      </td>
                      <td style={tdStyle}>
                        {p.is_active
                          ? <span style={{ color: C.green, fontSize: 11, fontWeight: 700 }}>ACTIVE</span>
                          : <span style={{ color: C.muted, fontSize: 11 }}>INACTIVE</span>}
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                          {rowButtons(p)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ─── PERMISSIONS MATRIX TAB ─── */}
      {activeTab === "permissions" && <PermissionsMatrixView />}

      {/* ─── Edit / Add modal ─── */}
      {editing && (
        <EditPersonModal
          mode={editing === "new" ? "new" : "edit"}
          initial={editing === "new" ? {} : editing}
          jobTitles={jobTitles}
          roleOptions={roles?.allowedForEmployee || ROLE_OPTIONS.filter(r => r.value !== "owner").map(r => r.value)}
          onClose={() => setEditing(null)}
          onSaved={(title, message) => {
            setEditing(null);
            showNotice(title, message);
            fetchPeople();
            refreshUsers();
          }}
        />
      )}

      {/* ─── Confirm modal (deactivate / reset-pin / wipe-bio) ─── */}
      {confirmAction && (
        <ConfirmModal
          title={confirmAction.title}
          message={confirmAction.message}
          yesLabel={confirmAction.yesLabel}
          onYes={async () => {
            const a = confirmAction;
            setConfirmAction(null);
            await a.onYes();
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {/* ─── Admin reset password modal ─── */}
      {resetPwUser && (
        <ModalWrap
          title={`Reset Password — ${resetPwUser.first_name} ${resetPwUser.last_name}`}
          onClose={() => setResetPwUser(null)}
          width={380}
        >
          {/* Hidden username for password manager autofill behavior */}
          <input type="text" name="username" value={resetPwUser.email} readOnly autoComplete="username"
            style={{ display: "none" }} />
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>NEW PASSWORD</label>
            <input type="password" autoComplete="new-password" style={inputStyle} value={resetPwVal}
              onChange={e => setResetPwVal(e.target.value)} placeholder="Min 6 characters" />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>CONFIRM PASSWORD</label>
            <input type="password" autoComplete="new-password" style={inputStyle} value={resetPwConfirm}
              onChange={e => setResetPwConfirm(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleAdminResetPassword(); }} />
          </div>
          {resetPwMsg && (
            <div style={{ padding: "8px 12px", background: "#fdecea", color: C.red, fontSize: 12, fontWeight: 700, borderRadius: 4, marginBottom: 12 }}>
              {resetPwMsg}
            </div>
          )}
          <div style={{ display: "flex", gap: 10 }}>
            <Btn variant="blue" onClick={handleAdminResetPassword}>SET PASSWORD</Btn>
            <Btn variant="ghost" onClick={() => setResetPwUser(null)}>CANCEL</Btn>
          </div>
        </ModalWrap>
      )}

      {/* ─── Self change password modal ─── */}
      {showChangePw && (
        <ModalWrap title="Change Your Password" onClose={() => setShowChangePw(false)} width={380}>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>CURRENT PASSWORD</label>
            <input type="password" autoComplete="current-password" style={inputStyle} value={changePwCurrent}
              onChange={e => setChangePwCurrent(e.target.value)} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>NEW PASSWORD</label>
            <input type="password" autoComplete="new-password" style={inputStyle} value={changePwNew}
              onChange={e => setChangePwNew(e.target.value)} placeholder="Min 6 characters" />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>CONFIRM NEW PASSWORD</label>
            <input type="password" autoComplete="new-password" style={inputStyle} value={changePwConfirm}
              onChange={e => setChangePwConfirm(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleChangePw(); }} />
          </div>
          {changePwMsg && (
            <div style={{ padding: "8px 12px", background: "#fdecea", color: C.red, fontSize: 12, fontWeight: 700, borderRadius: 4, marginBottom: 12 }}>
              {changePwMsg}
            </div>
          )}
          <div style={{ display: "flex", gap: 10 }}>
            <Btn variant="blue" onClick={handleChangePw}>CHANGE PASSWORD</Btn>
            <Btn variant="ghost" onClick={() => setShowChangePw(false)}>CANCEL</Btn>
          </div>
        </ModalWrap>
      )}

      {/* ─── WebAuthn (biometric) self-service modal ─── */}
      {showWebauthn && (
        <WebAuthnSetupModal
          userName={currentUser?.name || "your account"}
          onClose={() => setShowWebauthn(false)}
          onStateChange={() => refreshUsers()}
        />
      )}
    </div>
  );
}

// v28.43 — getter pattern so color follows theme without a refresh.
const thStyle = {
  padding: "10px 8px", fontSize: 11, fontWeight: 800,
  letterSpacing: "0.06em", textTransform: "uppercase",
  get color() { return C.muted; },
};
const tdStyle = { padding: "10px 8px", verticalAlign: "middle" };

export default PeoplePage;
