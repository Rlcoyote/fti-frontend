import { useEffect } from "react";
import useIsMobile from "./useIsMobile.js";

// ─── useNewJobMobileBack (v28.96 — ship 3 of NewJobModal split) ────────────
// Wires the device back-button (popstate) to the NewJobModal's onClose
// when running on a mobile viewport. Pushes a sentinel history entry on
// mount; if the user hits BACK before saving, the sentinel pops and we
// call onClose — same behavior as if they'd tapped the X.
//
// Reads viewport via useIsMobile so the hook is self-contained — caller
// doesn't have to thread isMobile down.
//
// Twin of the same pattern inside AddTicketModal. The user said "one
// battle at a time" about merging twin modals — a future shared
// `useModalMobileBack` could unify these, but today they stay separate
// so the NewJob-specific sentinel ({newJobOpen:true}) and the
// AddTicket-specific sentinel stay distinguishable in browser history.

export default function useNewJobMobileBack(onClose) {
  const isMobile = useIsMobile();
  useEffect(() => {
    if (!isMobile) return undefined;
    window.history.pushState({ newJobOpen: true }, "");
    const handlePop = () => {
      onClose();
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, [isMobile, onClose]);
}
