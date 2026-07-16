import { useEffect } from "react";

// ─── useBodyScrollLock (v28.268) ─────────────────────────────────────────────
// THE home for modal scroll containment (Article XVII). Reggie's bug: open a
// ticket from a work order, scroll to the ticket's bottom, and the WO page
// behind keeps scrolling — the modal's scroll chained to the body because
// nothing ever locked it.
//
// Locking is reference-counted so stacked modals (JSA over a ticket, confirm
// over the JSA) don't unlock the body while an outer modal is still open.
// Pair this hook with `overscrollBehavior: "contain"` on the modal's
// scrollable box — the lock stops the body moving at all; contain stops the
// chain on the scroller itself (covers iOS momentum/touch cases).

let lockCount = 0;
let savedOverflow = "";

export default function useBodyScrollLock(active = true) {
  useEffect(() => {
    if (!active) return undefined;
    if (lockCount === 0) {
      savedOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      // v28.333 - while any modal is open, the page BEHIND it leaves the
      // selection surface: Ctrl+A / long-press-select grabs only the modal
      // (.fti-modal-selectable re-enables inside). Reggie 7/16: select-all
      // in a ticket copied the whole dashboard behind it.
      document.body.classList.add("fti-modal-open");
    }
    lockCount += 1;
    return () => {
      lockCount -= 1;
      if (lockCount === 0) {
        document.body.style.overflow = savedOverflow;
        document.body.classList.remove("fti-modal-open");
      }
    };
  }, [active]);
}
