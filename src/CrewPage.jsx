import { useState, useMemo } from "react";
import { inputStyle } from "./SharedUI.jsx";
import { C } from "./config.js";

function CrewPage({ users, jobs }) {
  const [search, setSearch] = useState("");

  // Determine each user's current job assignment
  const crewData = users.filter(u => !["owner", "admin"].includes(u.role)).map(u => {
    const activeJobs = jobs.filter(j =>
      ["Scheduled", "Rigged Up", "Active"].includes(j.status) &&
      (j.crew || []).some(c => c.name === u.name)
    );
    const currentJob = activeJobs[0] || null;
    const status = currentJob ? "On Job" : "Available";
    const role = currentJob ? (currentJob.crew.find(c => c.name === u.name)?.role || u.role) : u.role;
    const daysOnJob = currentJob?.dateStarted
      ? Math.floor((Date.now() - new Date(currentJob.dateStarted).getTime()) / 86400000)
      : null;
    return { ...u, currentJob, status, displayRole: role, daysOnJob, activeJobs };
  });

  const filtered = search
    ? crewData.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || (c.email || "").toLowerCase().includes(search.toLowerCase()))
    : crewData;

  const statusColor = { "On Job": C.green, "Available": C.blue };
  const statusBg = { "On Job": "#e6f5ec", "Available": "#e8f0fb" };

  const roleLabel = (r) => {
    const map = { owner: "Owner", admin: "Admin", manager: "Manager", lead: "Lead", salesman: "Salesman", field: "Field" };
    return map[r] || r;
  };

  return (
    <div style={{ padding: "24px 28px" }}>
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Crew</h1>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 20 }}>
        {users.length} crew members · {crewData.filter(c => c.status === "On Job").length} on jobs · {crewData.filter(c => c.status === "Available").length} available
      </div>

      <div style={{ marginBottom: 16, maxWidth: 360 }}>
        <input style={inputStyle} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..." />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
        {filtered.map(c => (
          <div key={c.id} style={{
            background: C.cardBg, border: `1px solid ${C.border}`, borderLeft: `3px solid ${statusColor[c.status]}`,
            borderRadius: 6, padding: "16px 20px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{c.name}</div>
                <div style={{ fontSize: 12, color: C.muted }}>{roleLabel(c.role)}</div>
              </div>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 3,
                background: statusBg[c.status], color: statusColor[c.status],
                border: `1px solid ${statusColor[c.status]}33`, letterSpacing: "0.06em",
              }}>{c.status.toUpperCase()}</span>
            </div>

            {/* Contact */}
            <div style={{ marginBottom: 10 }}>
              {c.email && <div style={{ fontSize: 12, color: C.muted, marginBottom: 2 }}>{c.email}</div>}
              {c.phone && <div style={{ fontSize: 12, color: C.muted }}>{c.phone}</div>}
              {!c.email && !c.phone && <div style={{ fontSize: 11, color: C.muted, fontStyle: "italic" }}>No contact info</div>}
            </div>

            {/* Current assignment */}
            {c.currentJob ? (
              <div style={{ background: C.steel, borderRadius: 4, padding: "8px 12px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.08em", marginBottom: 4 }}>CURRENT ASSIGNMENT</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Job #{c.currentJob.id} — {c.currentJob.customer}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{c.currentJob.location}</div>
                {c.daysOnJob !== null && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Day {c.daysOnJob + 1} on job</div>}
                {c.activeJobs.length > 1 && <div style={{ fontSize: 10, color: C.orange, marginTop: 4, fontWeight: 700 }}>+ {c.activeJobs.length - 1} more job{c.activeJobs.length - 1 > 1 ? "s" : ""}</div>}
              </div>
            ) : (
              <div style={{ background: C.steel, borderRadius: 4, padding: "8px 12px" }}>
                <div style={{ fontSize: 12, color: C.muted, fontStyle: "italic" }}>No active assignment</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}


export default CrewPage;
