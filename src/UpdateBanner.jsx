import { useEffect, useState } from "react";
import { C } from "./config.js";
import { APP_COMMIT } from "./version.js";
import { Z_INDEX } from "./SharedUI.jsx";

// ─── UpdateBanner (v28.305) ──────────────────────────────────────────────────
// Version-skew guard. Field phones keep the bundle they loaded this morning
// while we ship all day — a stale client against a moved API is how the
// 2026-07-10 JSA sign-link confusion started. This polls /version.json
// (same file the deploy gate reads) every 5 minutes and on tab-refocus;
// when the served commit differs from the RUNNING bundle's baked-in commit,
// a banner drops from the top: one tap reloads onto the new version.
//
// Poll-only, zero dependencies, fails silent (no signal → no banner — the
// app keeps working on whatever it has).

const POLL_MS = 5 * 60 * 1000;

export default function UpdateBanner() {
  const [stale, setStale] = useState(false);

  useEffect(() => {
    if (!APP_COMMIT || APP_COMMIT === "unknown") return undefined;
    let alive = true;
    const check = async () => {
      try {
        const r = await fetch(`/version.json?ts=${Date.now()}`, { cache: "no-store" });
        if (!r.ok) return;
        const d = await r.json();
        if (alive && d.commit && d.commit !== APP_COMMIT) setStale(true);
      } catch {
        /* offline / no signal — stay quiet */
      }
    };
    check();
    const iv = setInterval(check, POLL_MS);
    const onVis = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      alive = false;
      clearInterval(iv);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  if (!stale) return null;
  return (
    <div
      onClick={() => window.location.reload()}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: Z_INDEX.global + 1,
        background: C.blue,
        color: C.white,
        padding: "10px 14px",
        textAlign: "center",
        fontSize: 13,
        fontWeight: 800,
        letterSpacing: "0.04em",
        cursor: "pointer",
        boxShadow: "0 2px 12px #00000044",
      }}
    >
      A NEW VERSION OF THE APP IS READY — TAP HERE TO UPDATE
    </div>
  );
}
