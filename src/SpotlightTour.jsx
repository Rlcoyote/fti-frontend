import { useEffect, useState, useCallback } from "react";
import { C, F, R } from "./config.js";
import { Btn, Z_INDEX } from "./SharedUI.jsx";

// ─── SpotlightTour (v28.419) ─────────────────────────────────────────────────
// Hand-rolled guided tour — no library. Steps target elements by their
// [data-tut] attribute; the spotlight is one absolutely-positioned ring whose
// giant box-shadow dims everything else (one element, no four-panel math).
// A step whose anchor isn't on screen (permission-hidden, mobile layout)
// SKIPS itself — the tour never strands on a missing element. Position
// re-derives on resize/scroll.
//
// steps: [{ tut: "search", title, body }] — tut matches data-tut="...".

function findRect(tut) {
  const el = document.querySelector(`[data-tut="${tut}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return r;
}

function SpotlightTour({ steps, onClose }) {
  const [idx, setIdx] = useState(0);
  const [rect, setRect] = useState(null);

  // Resolve the current step; skip forward past missing anchors (then
  // backward; close if nothing anchors at all).
  const resolve = useCallback(
    (from, dir = 1) => {
      let i = from;
      while (i >= 0 && i < steps.length) {
        const r = findRect(steps[i].tut);
        if (r) return { i, r };
        i += dir;
      }
      return null;
    },
    [steps],
  );

  useEffect(() => {
    const hit = resolve(idx, 1) || resolve(idx - 1, -1);
    if (!hit) {
      onClose();
      return;
    }
    if (hit.i !== idx) {
      setIdx(hit.i);
      return;
    }
    const el = document.querySelector(`[data-tut="${steps[idx].tut}"]`);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    const update = () => setRect(findRect(steps[idx].tut));
    update();
    // Track layout: the smooth scroll settles over ~300ms, and the user can
    // resize/scroll mid-tour.
    const t = setTimeout(update, 350);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [idx, steps, resolve, onClose]);

  if (!rect) return null;
  const step = steps[idx];
  const pad = 6;
  const below = rect.bottom + 180 < window.innerHeight; // card fits below?
  const cardTop = below ? rect.bottom + pad + 10 : undefined;
  const cardBottom = below ? undefined : window.innerHeight - rect.top + pad + 10;
  const cardLeft = Math.max(12, Math.min(rect.left, window.innerWidth - 332));

  const next = () => {
    const hit = resolve(idx + 1, 1);
    if (hit) setIdx(hit.i);
    else onClose();
  };
  const back = () => {
    const hit = resolve(idx - 1, -1);
    if (hit) setIdx(hit.i);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: Z_INDEX.nested + 1 }} onClick={onClose}>
      {/* the spotlight ring — its shadow IS the dimmer */}
      <div
        style={{
          position: "fixed",
          top: rect.top - pad,
          left: rect.left - pad,
          width: rect.width + pad * 2,
          height: rect.height + pad * 2,
          borderRadius: 10,
          border: `2px solid ${C.blue}`,
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.62)",
          pointerEvents: "none",
          transition: "all 0.25s ease",
        }}
      />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "fixed",
          top: cardTop,
          bottom: cardBottom,
          left: cardLeft,
          width: 320,
          background: C.cardBg,
          border: `1px solid ${C.border}`,
          borderRadius: R.lg,
          padding: 16,
          boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
        }}
      >
        <div style={{ fontSize: F.small, fontWeight: 800, color: C.muted, letterSpacing: "0.08em", marginBottom: 4 }}>
          {idx + 1} OF {steps.length}
        </div>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 6 }}>{step.title}</div>
        <div style={{ fontSize: F.body, color: C.text, lineHeight: 1.5, marginBottom: 12 }}>{step.body}</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {idx > 0 && (
            <Btn variant="ghost" small onClick={back}>
              BACK
            </Btn>
          )}
          <Btn small onClick={next}>
            {idx + 1 >= steps.length ? "DONE" : "NEXT"}
          </Btn>
          <span onClick={onClose} style={{ marginLeft: "auto", fontSize: F.small, color: C.muted, cursor: "pointer", fontWeight: 700 }}>
            skip tour
          </span>
        </div>
      </div>
    </div>
  );
}

export default SpotlightTour;
