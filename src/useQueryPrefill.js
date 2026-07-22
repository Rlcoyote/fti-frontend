import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// ─── useQueryPrefill (v28.394) — search results land ON the record ───────────
// Reggie: a search hit "takes you to the page, but not the particular exact
// spot." Global-search results now carry ?q=<label>; the destination page
// feeds it straight into its own filter box, so the list arrives already
// narrowed to what was searched. The param is consumed (replaced away) so
// refresh and BACK don't replay it.
export function useQueryPrefill(param, apply) {
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    const v = new URLSearchParams(location.search).get(param);
    if (v) {
      apply(v);
      navigate(location.pathname, { replace: true });
    }
    // Deliberate deps: fires per URL change; apply/navigate are stable enough
    // and re-running on their identity would replay consumed params.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);
}
