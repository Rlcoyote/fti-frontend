import { useEffect, useState } from "react";

// ─── useIsMobile (v28.82 — ship 1 of the WorkOrderTicketsTab split) ──────────────
// Single source of truth for the mobile-vs-desktop breakpoint check.
// Tracks viewport width and returns a boolean that flips on transitions
// across `breakpoint` (default 900px). Re-checks on resize.
//
// Why a hook (not a constant):
//   The repo has ~8 sites doing `useState(() => window.innerWidth <= 900)`
//   — captures once at mount, never updates on rotation or window-drag.
//   WorkOrderTicketsTab was the only file doing it correctly (with a resize
//   listener); v28.82 lifts that pattern out as a reusable hook. Other
//   call sites stay on the worse pattern for now and get swept in a
//   later cleanup pass (one ship, one piece per CAM Article XXIV).
//
// SSR-safe — guards window access for the initial state. Returns `false`
// (i.e. "not mobile") in non-browser environments. The FTI app is
// browser-only today but the hook should be safe to lift unchanged.
//
// Listener-efficient — only triggers a state update on actual transitions
// across the breakpoint. Resizing within a single side of the breakpoint
// (e.g. 1200 → 1100, both desktop) doesn't re-render.

export default function useIsMobile(breakpoint = 900) {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= breakpoint;
  });

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handler = () => {
      const next = window.innerWidth <= breakpoint;
      setIsMobile((prev) => (prev === next ? prev : next));
    };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [breakpoint]);

  return isMobile;
}
