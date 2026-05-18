import { useState, useEffect } from "react";
import { C, API_URL } from "./config.js";
import { Btn, ConfirmModal, inputStyle } from "./SharedUI.jsx";
import { ROLE_OPTIONS } from "./utils.js";
import { useApp } from "./AppContext.jsx";
import EditPersonModal from "./EditPersonModal.jsx";
import PermissionsMatrixView from "./PermissionsMatrixView.jsx";
import WebAuthnSetupModal from "./WebAuthnSetupModal.jsx";
import PeopleResetPasswordModal from "./PeopleResetPasswordModal.jsx";
import PeopleChangePasswordModal from "./PeopleChangePasswordModal.jsx";
import usePeopleActions from "./usePeopleActions.js";
import PersonRowActions from "./PersonRowActions.jsx";
import PeopleRosterTable from "./PeopleRosterTable.jsx";

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
  const { currentUser, refreshUsers, roles, showNotice, can } = useApp();
  const isOwnerOrAdmin = can("manage_users");

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

  // Admin password reset modal (admin → other user) — open flag only; the
  // form + POST live in PeopleResetPasswordModal (v28.146).
  const [resetPwUser, setResetPwUser] = useState(null);

  // Self password change modal — open flag only; the form + POST live in
  // PeopleChangePasswordModal (v28.146).
  const [showChangePw, setShowChangePw] = useState(false);

  // WebAuthn (biometric) self-service modal
  const [showWebauthn, setShowWebauthn] = useState(false);

  // Inline transient toast for non-modal feedback (rare — most async actions
  // use the per-row feedback below).
  const [msg, setMsg] = useState("");

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
    } catch (err) {
      console.error("Fetch people failed:", err);
    }
    setLoading(false);
  };

  const fetchJobTitles = async () => {
    try {
      const r = await fetch(`${API_URL}/job-titles`);
      if (r.ok) setJobTitles(await r.json());
    } catch {
      /* non-blocking */
    }
  };

  useEffect(() => {
    fetchPeople();
  }, [includeInactive]);
  useEffect(() => {
    fetchJobTitles();
  }, []);

  // ─── Roster-row lifecycle actions + per-row feedback ─────────────────────
  // Extracted to usePeopleActions (v28.147). Called before the early return
  // below for the same hook-order reason the fetchers' useEffects are.
  const peopleActions = usePeopleActions(fetchPeople);

  if (!isOwnerOrAdmin) {
    return <div style={{ padding: 32, color: C.muted }}>You need owner or admin access to view this page.</div>;
  }

  // ─── Filter the roster locally ───────────────────────────────────────────
  const filtered = (() => {
    if (!search.trim()) return people;
    const q = search.trim().toLowerCase();
    return people.filter(
      (p) =>
        String(p.first_name || "")
          .toLowerCase()
          .includes(q) ||
        String(p.last_name || "")
          .toLowerCase()
          .includes(q) ||
        String(p.email || "")
          .toLowerCase()
          .includes(q) ||
        String(p.qb_employee_id || "")
          .toLowerCase()
          .includes(q) ||
        String(p.job_title || "")
          .toLowerCase()
          .includes(q) ||
        String(p.role || "")
          .toLowerCase()
          .includes(q),
    );
  })();

  const tabBtnStyle = (isActive) => ({
    background: isActive ? C.cardBg : "transparent",
    border: isActive ? `1px solid ${C.border}` : "1px solid transparent",
    borderBottom: isActive ? `1px solid ${C.cardBg}` : "1px solid transparent",
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    marginBottom: isActive ? -1 : 0,
    color: isActive ? C.blue : C.muted,
    padding: "8px 18px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    letterSpacing: "0.06em",
  });

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
          <Btn variant="blue" onClick={() => setEditing("new")}>
            + Add Person
          </Btn>
        )}
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 0, marginBottom: 16, borderBottom: `1px solid ${C.border}` }}>
        <button onClick={() => setActiveTab("roster")} style={tabBtnStyle(activeTab === "roster")}>
          ROSTER
        </button>
        <button onClick={() => setActiveTab("permissions")} style={tabBtnStyle(activeTab === "permissions")}>
          PERMISSIONS MATRIX
        </button>
      </div>

      {msg && (
        <div
          style={{
            padding: "8px 14px",
            marginBottom: 14,
            background: msg.toLowerCase().includes("fail") || msg.toLowerCase().includes("error") ? "#fdecea" : "#e6f5ec",
            color: msg.toLowerCase().includes("fail") || msg.toLowerCase().includes("error") ? C.red : C.green,
            borderRadius: 4,
            fontSize: 12,
            fontWeight: 700,
          }}
        >
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
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, QB ID, role, or title..."
            />
            <label style={{ fontSize: 12, color: C.muted, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              <input type="checkbox" checked={includeInactive} onChange={(e) => setIncludeInactive(e.target.checked)} style={{ accentColor: C.blue }} />
              Show inactive
            </label>
            <div style={{ marginLeft: "auto", fontSize: 12, color: C.muted }}>
              {filtered.length} of {people.length} shown
            </div>
          </div>

          <PeopleRosterTable
            loading={loading}
            filtered={filtered}
            people={people}
            isMobile={isMobile}
            renderActions={(p) => (
              <PersonRowActions
                person={p}
                currentUser={currentUser}
                actions={peopleActions}
                setEditing={setEditing}
                setResetPwUser={setResetPwUser}
                setShowChangePw={setShowChangePw}
                setShowWebauthn={setShowWebauthn}
                setConfirmAction={setConfirmAction}
              />
            )}
          />
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
          roleOptions={roles?.allowedForEmployee || ROLE_OPTIONS.filter((r) => r.value !== "owner").map((r) => r.value)}
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

      {/* ─── Admin reset password modal — extracted v28.146 ─── */}
      {resetPwUser && (
        <PeopleResetPasswordModal
          user={resetPwUser}
          requesterRole={currentUser.role}
          onClose={() => setResetPwUser(null)}
          onDone={(message) => {
            setResetPwUser(null);
            setMsg(message);
            setTimeout(() => setMsg(""), 4000);
          }}
        />
      )}

      {/* ─── Self change password modal — extracted v28.146 ─── */}
      {showChangePw && (
        <PeopleChangePasswordModal
          userId={currentUser.id}
          onClose={() => setShowChangePw(false)}
          onDone={() => {
            setShowChangePw(false);
            setMsg("Password changed.");
            setTimeout(() => setMsg(""), 3000);
          }}
        />
      )}

      {/* ─── WebAuthn (biometric) self-service modal ─── */}
      {showWebauthn && (
        <WebAuthnSetupModal userName={currentUser?.name || "your account"} onClose={() => setShowWebauthn(false)} onStateChange={() => refreshUsers()} />
      )}
    </div>
  );
}

export default PeoplePage;
