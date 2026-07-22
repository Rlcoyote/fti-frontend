import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { C, E, F, SP, R } from "./config.js";
import { api } from "./api.js";
import { ModalWrap, Z_INDEX, inputStyle } from "./SharedUI.jsx";

// ─── GlobalSearch (v28.390) ──────────────────────────────────────────────────
// Reggie 2026-07-22: "We need a complete and comprehensive search ability
// built into the app." One box, everything: Work Orders, tickets (300178-1
// works), people, contacts, documents, action items, vehicles, assets,
// inventory. Results come permission-scoped from GET /api/search — the server
// only returns what this user is allowed to see. Selecting a result navigates
// to its home (WOs expand on the dashboard via ?wo=; documents open the
// COMPANY LIBRARY via ?library=1).

function GlobalSearch({ onClose }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [groups, setGroups] = useState([]);
  const [busy, setBusy] = useState(false);
  const [searched, setSearched] = useState(false);
  const boxRef = useRef(null);
  const timer = useRef(null);

  useEffect(() => {
    boxRef.current?.focus();
  }, []);

  // Debounced live search — 250ms after the last keystroke.
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const term = q.trim();
    if (term.length < 2) {
      setGroups([]);
      setSearched(false);
      return;
    }
    timer.current = setTimeout(async () => {
      setBusy(true);
      try {
        const r = await api.get(`/search?q=${encodeURIComponent(term)}`);
        setGroups(r.results || []);
        setSearched(true);
      } catch {
        setGroups([]);
        setSearched(true);
      }
      setBusy(false);
    }, 250);
    return () => clearTimeout(timer.current);
  }, [q]);

  const go = (item) => {
    onClose();
    navigate(item.route);
  };

  return (
    <ModalWrap variant="dialog" z={Z_INDEX.overlay} width={640} accent={C.blue} onClose={onClose}>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>SEARCH</div>
      <input
        ref={boxRef}
        style={{ ...inputStyle, fontSize: 15, padding: "12px 14px" }}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="WO #, ticket # (300178-1), name, customer, document, vehicle…"
      />
      <div style={{ marginTop: SP.lg, maxHeight: "55vh", overflowY: "auto" }}>
        {busy && <div style={{ fontSize: F.meta, color: C.muted, padding: SP.md }}>Searching…</div>}
        {!busy && searched && groups.length === 0 && <div style={{ fontSize: F.body, color: C.muted, padding: SP.md }}>Nothing found for “{q.trim()}”.</div>}
        {groups.map((g) => (
          <div key={g.group} style={{ marginBottom: SP.lg }}>
            <div style={{ fontSize: F.badge, fontWeight: 800, color: C.muted, letterSpacing: "0.08em", padding: `${SP.xs}px 0` }}>{g.group}</div>
            {g.items.map((item, i) => (
              <div
                key={i}
                onClick={() => go(item)}
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
            ))}
          </div>
        ))}
      </div>
    </ModalWrap>
  );
}

export default GlobalSearch;
