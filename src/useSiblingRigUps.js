import { useState, useEffect } from "react";
import { API_URL } from "./config.js";

// ─── useSiblingRigUps (audit 260721, C3) ─────────────────────────────────────
// The ONE home for "load this job's eligible sibling Rig Ups, newest first" —
// previously byte-identical effects in CopyLineItemsModal and CopyCrewModal
// (Entry 7: one rule, one home; the two copies had already begun to drift on
// default-source selection).
//   preferWithItems: default source = newest RU that actually HAS line items
//   (the line-items copy wants that; crew copy takes newest overall).
// Returns setError too — consumers reuse the same banner for their own
// second-stage loads (e.g. the crew fetch).
export function useSiblingRigUps(workOrderId, excludeTicketId, { preferWithItems = false } = {}) {
  const [rigUps, setRigUps] = useState([]);
  const [sourceId, setSourceId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!workOrderId) return;
    setLoading(true);
    setError("");
    fetch(`${API_URL}/tickets?job_id=${workOrderId}&include_voided=true`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const eligible = (data || [])
          .filter((tk) => tk.type === "Rig Up" && !tk.voided_at)
          .filter((tk) => tk.id !== excludeTicketId)
          .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
        setRigUps(eligible);
        const preferred = preferWithItems ? eligible.find((tk) => (tk.lineItems || tk.line_items || []).length > 0) : null;
        setSourceId((preferred || eligible[0])?.id || null);
      })
      .catch(() => setError("Could not load Rig Up tickets on this job."))
      .finally(() => setLoading(false));
    // Deliberate deps: preferWithItems is a per-consumer constant.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workOrderId, excludeTicketId]);

  return { rigUps, sourceId, setSourceId, loading, error, setError };
}
