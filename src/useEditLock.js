import { useState, useEffect, useRef } from "react";
import { API_URL } from "./config.js";

function useEditLock(type, id, currentUser, onAutoSave) {
  const [lockState, setLockState] = useState({ isLocked: false, lockedBy: null, lockedByName: null, lockedAt: null, requestedByName: null, hasLock: true });
  const lockAcquired = useRef(true);
  const inactivityTimer = useRef(null);
  const pollTimer = useRef(null);
  const TIMEOUT = 5 * 60 * 1000; // 5 min
  const POLL_INTERVAL = 5000; // 5 sec

  const resetInactivity = () => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    if (!lockAcquired.current) return;
    inactivityTimer.current = setTimeout(() => {
      // Auto-save and release
      if (onAutoSave) onAutoSave();
      releaseLock();
    }, TIMEOUT);
  };

  const acquireLock = async () => {
    if (!id || !currentUser?.id) return;
    try {
      const r = await fetch(`${API_URL}/edit-lock/${type}/${id}/lock`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: currentUser.id, user_name: currentUser.name }),
      });
      const data = await r.json();
      if (data.locked) {
        lockAcquired.current = true;
        setLockState({ isLocked: false, lockedBy: null, lockedByName: null, lockedAt: null, requestedByName: null, hasLock: true });
        resetInactivity();
      } else {
        lockAcquired.current = false;
        setLockState({ isLocked: true, lockedBy: data.locked_by, lockedByName: data.locked_by_name || "Another user", lockedAt: data.locked_at || null, requestedByName: null, hasLock: false });
      }
    } catch {
      // Fail-open: if lock endpoint unreachable, allow editing
      lockAcquired.current = true;
      setLockState(prev => ({ ...prev, hasLock: true }));
    }
  };

  const releaseLock = async () => {
    if (!id || !currentUser?.id) return;
    lockAcquired.current = false;
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    try {
      await fetch(`${API_URL}/edit-lock/${type}/${id}/unlock`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: currentUser.id }),
      });
    } catch {}
    setLockState(prev => ({ ...prev, hasLock: false }));
  };

  const requestEdit = async () => {
    if (!id || !currentUser?.id) return;
    try {
      await fetch(`${API_URL}/edit-lock/${type}/${id}/request-edit`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: currentUser.id }),
      });
    } catch {}
  };

  // Owner/admin override for phantom/stale locks. Clears the lock server-side regardless of
  // who holds it, then reacquires for the current user. Refuses silently if role doesn't qualify.
  const forceUnlock = async () => {
    if (!id || !currentUser?.id) return;
    if (!["owner", "admin"].includes(currentUser?.role)) return;
    try {
      await fetch(`${API_URL}/edit-lock/${type}/${id}/force-unlock`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requester_role: currentUser.role,
          requester_id: currentUser.id,
          requester_name: currentUser.name,
        }),
      });
      // Immediately reacquire for ourselves so the UI flips to editable state.
      await acquireLock();
    } catch {}
  };

  const dismissRequest = async () => {
    if (!id || !currentUser?.id) return;
    try {
      await fetch(`${API_URL}/edit-lock/${type}/${id}/dismiss-request`, {
        method: "POST", headers: { "Content-Type": "application/json" },
      });
    } catch {}
    setLockState(prev => ({ ...prev, requestedByName: null }));
  };

  const pollStatus = async () => {
    if (!id) return;
    try {
      const r = await fetch(`${API_URL}/edit-lock/${type}/${id}/status`);
      const data = await r.json();
      if (lockAcquired.current) {
        // I have the lock — check if someone requested
        setLockState(prev => ({ ...prev, requestedByName: data.requested_by_name || null }));
      } else {
        // I don't have the lock — check if it's been released
        if (!data.is_locked) {
          // Lock released — try to acquire
          acquireLock();
        } else {
          setLockState({ isLocked: true, lockedBy: data.locked_by, lockedByName: data.locked_by_name || "Another user", lockedAt: data.locked_at || null, requestedByName: null, hasLock: false });
        }
      }
    } catch {}
  };

  useEffect(() => {
    acquireLock();
    pollTimer.current = setInterval(pollStatus, POLL_INTERVAL);
    // Activity listeners for inactivity reset
    const activity = () => resetInactivity();
    window.addEventListener("click", activity);
    window.addEventListener("keydown", activity);
    window.addEventListener("touchstart", activity);
    return () => {
      releaseLock();
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      if (pollTimer.current) clearInterval(pollTimer.current);
      window.removeEventListener("click", activity);
      window.removeEventListener("keydown", activity);
      window.removeEventListener("touchstart", activity);
    };
  }, [id]);

  return { ...lockState, releaseLock, requestEdit, dismissRequest, forceUnlock, resetInactivity };
}


export default useEditLock;
