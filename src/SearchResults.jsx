import { useState } from "react";
import { C, E, F, SP, R } from "./config.js";
import { api } from "./api.js";
import { useApp } from "./AppContext.jsx";
import { PhoneText } from "./SharedUI.jsx";

// ─── SearchResults (v28.396) — the ONE result list both search shells render ─
// (Entry 7: header dropdown + mobile overlay consumed slightly-drifted copies.)
// Person rows expand an inline DIRECTORY CARD (phone/email — Reggie: a new
// hire "needs Eli's phone number"); manage_users holders also get OPEN IN
// PEOPLE. The scope footer states EXACTLY what this caller's search covered.
export function SearchResults({ groups, busy, searched, q, scope, hints, onGo }) {
  const { can } = useApp();
  const [openPerson, setOpenPerson] = useState(null); // person_id
  const [card, setCard] = useState(null);

  const openDirectory = async (item) => {
    if (openPerson === item.person_id) {
      setOpenPerson(null);
      return;
    }
    setOpenPerson(item.person_id);
    setCard(null);
    try {
      setCard(await api.get(`/users/directory/${item.person_id}`));
    } catch {
      setCard({ error: true });
    }
  };

  return (
    <>
      {busy && <div style={{ fontSize: F.meta, color: C.muted, padding: SP.md }}>Searching…</div>}
      {!busy && searched && groups.length === 0 && <div style={{ fontSize: F.body, color: C.muted, padding: SP.md }}>Nothing found for “{q.trim()}”.</div>}
      {groups.map((g) => (
        <div key={g.group} style={{ marginBottom: SP.lg }}>
          <div style={{ fontSize: F.badge, fontWeight: 800, color: C.muted, letterSpacing: "0.08em", padding: `${SP.xs}px 0` }}>{g.group}</div>
          {g.items.map((item, i) => (
            <div key={i}>
              <div
                onClick={() => (item.person_id ? openDirectory(item) : onGo(item))}
                style={{
                  padding: `${SP.md}px ${SP.lg}px`,
                  background: C.cardBg,
                  border: `1px solid ${C.border}`,
                  borderRadius: R.card,
                  marginBottom: 4,
                  cursor: "pointer",
                  boxShadow: E.raised,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = C.steel)}
                onMouseLeave={(e) => (e.currentTarget.style.background = C.cardBg)}
              >
                <div style={{ fontSize: F.body, fontWeight: 700, color: C.text }}>{item.label}</div>
                {item.sub && <div style={{ fontSize: F.label, color: C.muted }}>{item.sub}</div>}
              </div>
              {item.person_id && openPerson === item.person_id && (
                <div
                  style={{
                    margin: "0 0 6px 14px",
                    padding: `${SP.md}px ${SP.lg}px`,
                    background: C.steel,
                    border: `1px solid ${C.border}`,
                    borderRadius: R.card,
                  }}
                >
                  {!card && <div style={{ fontSize: F.meta, color: C.muted }}>Loading…</div>}
                  {card?.error && <div style={{ fontSize: F.meta, color: C.red }}>Could not load directory info.</div>}
                  {card && !card.error && (
                    <>
                      <div style={{ fontSize: F.body, fontWeight: 800, color: C.text }}>{card.name}</div>
                      <div style={{ fontSize: F.label, color: C.muted, marginBottom: SP.sm }}>{[card.job_title, card.role].filter(Boolean).join(" · ")}</div>
                      {card.phone && (
                        <div style={{ fontSize: F.body, marginBottom: 2 }}>
                          <a href={`tel:${card.phone}`} style={{ color: C.blue, fontWeight: 700, textDecoration: "none" }}>
                            📞 <PhoneText value={card.phone} />
                          </a>
                        </div>
                      )}
                      {card.email && (
                        <div style={{ fontSize: F.body, marginBottom: 2 }}>
                          <a href={`mailto:${card.email}`} style={{ color: C.blue, fontWeight: 700, textDecoration: "none" }}>
                            ✉ {card.email}
                          </a>
                        </div>
                      )}
                      {can("manage_users") && (
                        <div onClick={() => onGo(item)} style={{ fontSize: F.label, fontWeight: 800, color: C.blue, cursor: "pointer", marginTop: SP.sm }}>
                          OPEN IN PEOPLE →
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
      {searched && (scope || []).length > 0 && (
        <div style={{ fontSize: F.badge, color: C.muted, borderTop: `1px solid ${C.border}33`, paddingTop: SP.sm, marginTop: SP.sm, lineHeight: 1.6 }}>
          SEARCHED FOR YOUR ROLE: {scope.join(" · ")}. Search only navigates — editing follows each page's own permissions.
          {(hints || []).length > 0 && <div style={{ marginTop: 2 }}>NOT SEARCHED HERE — {hints.join(" · ")}.</div>}
        </div>
      )}
    </>
  );
}
