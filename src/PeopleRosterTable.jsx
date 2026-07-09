import { C } from "./config.js";

// ─── PeopleRosterTable (v28.149 — ship 4 of the PeoplePage split) ──────────
// The roster body for PeoplePage: the loading + empty states, the mobile
// card list (<900px), and the desktop table. Purely presentational —
// PeoplePage keeps the filter row (it owns search + includeInactive) and
// passes the already-filtered list down.
//
// renderActions is a render prop: PeoplePage hands in (p) => the row's
// <PersonRowActions/>, so this file never needs to know about the modals,
// the action hook, or the current user — it just lays out rows.
//
// formatPhoneDisplay, the role color helpers, and the table cell styles
// are display-only and live here with the markup they serve.

const formatPhoneDisplay = (raw) => {
  const d = String(raw || "").replace(/\D/g, "");
  if (d.length !== 10) return raw || "—";
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
};

const roleBg = (r) =>
  r === "owner" ? C.redB : r === "admin" ? C.blueB : r === "manager" ? C.greenB : r === "lead" ? C.yellowB : r === "salesman" ? C.purpleB : C.steel;
const roleColor = (r) =>
  r === "owner" ? C.red : r === "admin" ? C.blue : r === "manager" ? C.green : r === "lead" ? C.yellow : r === "salesman" ? C.purple : C.muted;

// v28.43 — getter pattern so color follows theme without a refresh.
const thStyle = {
  padding: "10px 8px",
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  get color() {
    return C.muted;
  },
};
const tdStyle = { padding: "10px 8px", verticalAlign: "middle" };

function PeopleRosterTable({ loading, filtered, people, isMobile, renderActions }) {
  if (loading) {
    return <div style={{ padding: 40, textAlign: "center", color: C.muted }}>Loading…</div>;
  }
  if (filtered.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: C.muted }}>
        {people.length === 0 ? "No one on the roster yet." : "No matches for your search."}
      </div>
    );
  }

  if (isMobile) {
    // ── Mobile: cards ──
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map((p) => (
          <div
            key={p.id}
            style={{
              background: p.is_active ? C.cardBg : C.steel,
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              padding: 12,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
                  {p.first_name} {p.last_name}
                </div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                  {p.email} · {formatPhoneDisplay(p.phone)}
                </div>
              </div>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 3,
                  background: roleBg(p.role),
                  color: roleColor(p.role),
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                {p.role}
              </span>
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>
              {p.job_title || "—"} · QB {p.qb_employee_id || "—"} · PIN {p.pin_set ? <span style={{ color: C.green, fontWeight: 700 }}>SET</span> : "not set"}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{renderActions(p)}</div>
          </div>
        ))}
      </div>
    );
  }

  // ── Desktop: table ──
  return (
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
          {filtered.map((p) => (
            <tr key={p.id} style={{ borderBottom: `1px solid ${C.border}`, background: p.is_active ? "transparent" : C.steel }}>
              <td style={tdStyle}>
                <strong>
                  {p.first_name} {p.last_name}
                </strong>
              </td>
              <td style={tdStyle}>{p.email}</td>
              <td style={tdStyle}>{formatPhoneDisplay(p.phone)}</td>
              <td style={tdStyle}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 3,
                    background: roleBg(p.role),
                    color: roleColor(p.role),
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  {p.role}
                </span>
              </td>
              <td style={tdStyle}>{p.job_title || <span style={{ color: C.muted }}>—</span>}</td>
              <td style={tdStyle}>{p.qb_employee_id || <span style={{ color: C.muted }}>—</span>}</td>
              <td style={tdStyle}>
                {p.pin_set ? (
                  <span style={{ color: C.green, fontWeight: 700, fontSize: 11 }}>SET</span>
                ) : (
                  <span style={{ color: C.muted, fontSize: 11 }}>not set</span>
                )}
              </td>
              <td style={tdStyle}>
                {p.is_active ? (
                  <span style={{ color: C.green, fontSize: 11, fontWeight: 700 }}>ACTIVE</span>
                ) : (
                  <span style={{ color: C.muted, fontSize: 11 }}>INACTIVE</span>
                )}
              </td>
              <td style={{ ...tdStyle, textAlign: "right" }}>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>{renderActions(p)}</div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default PeopleRosterTable;
