import { useMemo, useState } from "react";
import { C, F, SP, R } from "./config.js";
import { useApp } from "./AppContext.jsx";
import { Btn, inputStyle } from "./SharedUI.jsx";
import { TUTORIAL_MODULES, countLessons } from "./tutorialContent.js";

// ─── TutorialPage (v28.419) ──────────────────────────────────────────────────
// THE tutorial surface. Renders tutorialContent.js (the one content home)
// filtered to what THIS user can actually reach: permission-gated modules use
// can(), role-gated use currentUser.role — a field hand never reads about
// screens they can't open, and a white-label tenant's users only see their
// own world. Search filters across module/lesson/step text. The DASHBOARD
// TOUR button fires the window event FTIDashboard listens for (the tour's
// anchors live on the dashboard, so the dashboard owns the tour overlay).

export const DASHBOARD_TOUR_EVENT = "fti:dashboard-tour";

function TutorialPage() {
  const { can, currentUser } = useApp();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState({}); // moduleKey -> bool (default first open)

  const role = currentUser?.role;
  const visible = useMemo(
    () =>
      TUTORIAL_MODULES.filter((m) => {
        if (!m.gate) return true;
        if (m.gate.perm) return can(m.gate.perm);
        if (m.gate.roles) return m.gate.roles.includes(role);
        return true;
      }),
    [can, role],
  );

  const needle = q.trim().toLowerCase();
  const matches = (m) => {
    if (!needle) return true;
    const hay = [m.title, m.blurb, ...m.lessons.flatMap((l) => [l.title, l.tip || "", ...l.steps])].join(" ").toLowerCase();
    return hay.includes(needle);
  };
  const shown = visible.filter(matches);

  const isOpen = (m, i) => (open[m.key] !== undefined ? open[m.key] : needle ? true : i === 0);

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: SP.lg }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: SP.md, flexWrap: "wrap", marginBottom: SP.md }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.text }}>Tutorial</h1>
          <div style={{ fontSize: F.small, color: C.muted, marginTop: 4 }}>
            {visible.length} modules · {countLessons(visible)} lessons for your role
          </div>
        </div>
        <Btn onClick={() => window.dispatchEvent(new CustomEvent(DASHBOARD_TOUR_EVENT))}>▶ TAKE THE DASHBOARD TOUR</Btn>
      </div>

      <input
        style={{ ...inputStyle, width: "100%", marginBottom: SP.md, padding: "10px 12px", fontSize: F.body }}
        placeholder="Search the tutorial… (try: split day, rig down, JSA, approve)"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      {shown.length === 0 && (
        <div style={{ fontSize: F.body, color: C.muted, fontStyle: "italic", padding: SP.lg, textAlign: "center" }}>
          Nothing matches "{q}" — try a different word, or clear the search.
        </div>
      )}

      {shown.map((m, i) => {
        const opened = isOpen(m, i);
        return (
          <div key={m.key} style={{ border: `1px solid ${C.border}`, borderRadius: R.lg, marginBottom: SP.sm, overflow: "hidden", background: C.cardBg }}>
            <div
              onClick={() => setOpen((p) => ({ ...p, [m.key]: !opened }))}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", cursor: "pointer", background: opened ? C.steel : C.cardBg }}
            >
              <span style={{ fontSize: 18 }}>{m.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: F.body, fontWeight: 800, color: C.text, letterSpacing: "0.05em" }}>{m.title}</div>
                <div style={{ fontSize: F.small, color: C.muted, marginTop: 2 }}>{m.blurb}</div>
              </div>
              <span style={{ fontSize: 12, color: C.muted, transform: opened ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}>▶</span>
            </div>
            {opened && (
              <div style={{ padding: "4px 16px 14px" }}>
                {m.lessons.map((l, li) => (
                  <div key={li} style={{ marginTop: SP.md }}>
                    <div style={{ fontSize: F.body, fontWeight: 800, color: C.text, marginBottom: 6 }}>
                      {li + 1}. {l.title}
                    </div>
                    <ol style={{ margin: 0, paddingLeft: 22 }}>
                      {l.steps.map((s, si) => (
                        <li key={si} style={{ fontSize: F.body, color: C.text, lineHeight: 1.5, marginBottom: 5 }}>
                          {s}
                        </li>
                      ))}
                    </ol>
                    {l.tip && (
                      <div
                        style={{
                          marginTop: 8,
                          padding: "8px 12px",
                          borderLeft: `3px solid ${C.blue}`,
                          background: `${C.blue}11`,
                          borderRadius: R.sm,
                          fontSize: F.small,
                          color: C.text,
                        }}
                      >
                        <strong style={{ color: C.blue }}>WORTH KNOWING:</strong> {l.tip}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default TutorialPage;
