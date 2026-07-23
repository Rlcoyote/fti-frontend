import { useState, useEffect, useRef } from "react";
import { api } from "./api.js";

// ─── useSearch (v28.394) — the ONE home for global-search querying ───────────
// Debounced live query against GET /api/search (permission-scoped server-
// side). Consumed by the header dropdown (desktop) and the search overlay
// (mobile) — same results, two shells (Entry 7).
export function useSearch() {
  const [q, setQ] = useState("");
  const [groups, setGroups] = useState([]);
  const [busy, setBusy] = useState(false);
  const [searched, setSearched] = useState(false);
  const [scope, setScope] = useState([]);
  const [hints, setHints] = useState([]);
  const timer = useRef(null);

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
        setScope(r.scope || []);
        setHints(r.hints || []);
        setSearched(true);
      } catch {
        setGroups([]);
        setSearched(true);
      }
      setBusy(false);
    }, 250);
    return () => clearTimeout(timer.current);
  }, [q]);

  return { q, setQ, groups, busy, searched, scope, hints };
}
