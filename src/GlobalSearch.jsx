import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { C, F, SP } from "./config.js";
import { useSearch } from "./useSearch.js";
import { SearchResults } from "./SearchResults.jsx";
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
  // v28.394 — querying moved to useSearch (one home; the desktop header
  // dropdown consumes the same hook). This overlay remains the MOBILE shell.
  const { q, setQ, groups, busy, searched, scope, hints } = useSearch();
  const boxRef = useRef(null);

  useEffect(() => {
    boxRef.current?.focus();
  }, []);

  const go = (item) => {
    // Navigate FIRST, close after: the back-contract cleanup checks whether
    // history still sits on its own entry before consuming it — navigating
    // first moves history to the destination, so closing can never bounce
    // the user back off the page they just searched their way to.
    navigate(item.route);
    onClose();
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
        <SearchResults groups={groups} busy={busy} searched={searched} q={q} scope={scope} hints={hints} onGo={go} />
      </div>
    </ModalWrap>
  );
}

export default GlobalSearch;
