import { useEffect, useRef } from "react";

// ─── useBackClose (v28.390) — THE universal back-button contract ─────────────
// Reggie 2026-07-22: "opening one of these items and clicking the back button
// doesn't take you back to this screen — is there a universal space that
// governs actions like this?" There wasn't. This is it now.
//
// Any sub-view or modal that visually "goes somewhere" registers here: opening
// pushes ONE history entry, and the device/browser BACK button closes that
// view instead of leaving the page. Wired into ModalWrap (every standard modal
// app-wide) and the in-page sub-views (Onboarding packet doc, office roster
// employee). New surfaces get this by using ModalWrap or calling the hook —
// never by hand-rolling popstate again. (AddTicketModal predates this with its
// own mobile-only handler; it folds in when that modal moves to ModalWrap.)
//
// Stack discipline: with nested views open, one BACK closes only the top-most
// (each pop handled by the most recent registrant, matching what the eye sees).

const stack = [];
let seq = 0;
// v28.444 — synthetic pops in flight. A cleanup's history.back() fires a
// popstate identical to a user BACK press; without this marker the NEXT modal
// down the stack answers it and closes (or, with a dirty-guard, REOPENS the
// guard the user just dismissed — the KEEP-EDITING blink bug). Counted, not
// boolean: nested modals can unmount in the same tick.
let syntheticPops = 0;

export default function useBackClose(isOpen, onClose) {
  const idRef = useRef(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!isOpen) return;
    const id = `fti-bc-${++seq}`;
    idRef.current = id;
    stack.push(id);
    let poppedByButton = false;
    window.history.pushState({ ftiBackClose: id }, "");
    const onPop = () => {
      // A pop we caused ourselves (entry consumption below) is not a user
      // BACK press — swallow it, exactly once (v28.444).
      if (syntheticPops > 0) {
        syntheticPops--;
        return;
      }
      // Only the top of the stack answers a BACK press.
      if (stack[stack.length - 1] !== id) return;
      poppedByButton = true;
      stack.pop();
      onCloseRef.current?.();
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      const idx = stack.indexOf(id);
      if (idx !== -1) stack.splice(idx, 1);
      // Closed via X/CANCEL/save instead of BACK: consume the entry we pushed
      // so the next BACK press doesn't need two clicks — but ONLY if our entry
      // is still the current one. If the app has ALREADY navigated (e.g. a
      // search result click pushed a new route), history.back() here would
      // undo THAT navigation — the v28.390 bug: search results closed the
      // modal and instantly bounced back off the destination page.
      if (!poppedByButton && window.history.state?.ftiBackClose === id) {
        syntheticPops++;
        window.history.back();
      }
    };
    // Deliberate deps: open/close lifecycle only; onClose rides the ref.
  }, [isOpen]);
}
