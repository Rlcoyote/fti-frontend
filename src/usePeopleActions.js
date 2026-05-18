import { useState } from "react";
import { API_URL } from "./config.js";
import { useApp } from "./AppContext.jsx";

// ─── usePeopleActions (v28.147 — ship 2 of the PeoplePage split) ───────────
// The roster-row lifecycle actions for PeoplePage: SEND PIN SETUP, RESET
// PIN, DEACTIVATE, RESEND INVITE, WIPE BIO, FORCE SIGN OUT — plus the
// per-row feedback state (rowFeedback) those actions write to.
//
// Why a hook: every action is the same shape — set the row pending, fire
// the API, replace with a success/error pill. That pattern + the state it
// drives is one unit, and pulling it out of PeoplePage keeps the page a
// layout component.
//
// v28.46 design (preserved verbatim): feedback lives on the same row as
// the button that fired it, and the pending pill disables every action
// button on that row (see PeoplePage's rowButtons), so a fast-clicking
// auditor can't fire 15 invite emails in a row.
//
// fetchPeople is passed in — three actions refetch the roster on success.
// refreshUsers comes from AppContext (deactivate + wipeBio touch the
// app-wide user list).

export default function usePeopleActions(fetchPeople) {
  const { refreshUsers } = useApp();

  // State shape: { [userId]: { kind: "pending"|"success"|"error", msg: "..." } }
  const [rowFeedback, setRowFeedback] = useState({});

  // Set or clear feedback for a row. `kind` drives the pill color; "pending"
  // never auto-clears (only a subsequent success/error replaces it). "success"
  // and "error" auto-clear after `ttlMs`. The clear is guarded against newer
  // messages clobbering older ones.
  const setRowMsg = (userId, kind, message, ttlMs = 4000) => {
    setRowFeedback((prev) => ({ ...prev, [userId]: { kind, msg: message } }));
    if (kind !== "pending" && ttlMs > 0) {
      setTimeout(() => {
        setRowFeedback((prev) => {
          const cur = prev[userId];
          if (!cur || cur.msg !== message) return prev; // newer msg — leave it
          const next = { ...prev };
          delete next[userId];
          return next;
        });
      }, ttlMs);
    }
  };

  const sendPinSetup = async (p) => {
    setRowMsg(p.id, "pending", "Sending PIN setup…");
    try {
      const r = await fetch(`${API_URL}/employees/${p.id}/send-pin-setup`, { method: "POST" });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setRowMsg(p.id, "error", data.error || "Could not send PIN setup link.", 6000);
        return;
      }
      setRowMsg(p.id, "success", `✓ PIN setup link sent to ${p.phone || "phone"}`, 5000);
      fetchPeople();
    } catch (err) {
      setRowMsg(p.id, "error", err.message || "Send failed", 6000);
    }
  };

  const resetPin = async (p) => {
    setRowMsg(p.id, "pending", "Resetting PIN…");
    try {
      const r = await fetch(`${API_URL}/employees/${p.id}/reset-pin`, { method: "POST" });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setRowMsg(p.id, "error", data.error || "Could not reset PIN.", 6000);
        return;
      }
      setRowMsg(p.id, "success", `✓ PIN reset; new link sent to ${p.phone || "phone"}`, 5000);
      fetchPeople();
    } catch (err) {
      setRowMsg(p.id, "error", err.message || "Reset failed", 6000);
    }
  };

  const deactivate = async (p) => {
    setRowMsg(p.id, "pending", "Deactivating…");
    try {
      const r = await fetch(`${API_URL}/employees/${p.id}/deactivate`, { method: "POST" });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setRowMsg(p.id, "error", data.error || "Could not deactivate.", 6000);
        return;
      }
      setRowMsg(p.id, "success", `✓ ${p.first_name} ${p.last_name} deactivated`, 5000);
      fetchPeople();
      refreshUsers();
    } catch (err) {
      setRowMsg(p.id, "error", err.message || "Deactivate failed", 6000);
    }
  };

  const resendInvite = async (p) => {
    setRowMsg(p.id, "pending", "Sending invite…");
    try {
      const r = await fetch(`${API_URL}/auth/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: p.id }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setRowMsg(p.id, "error", data.error || "Failed to resend invite", 8000);
        return;
      }
      setRowMsg(p.id, "success", `✓ Invite sent to ${p.email}`, 5000);
    } catch (err) {
      setRowMsg(p.id, "error", err?.message || "Connection error", 6000);
    }
  };

  const wipeBio = async (p) => {
    setRowMsg(p.id, "pending", "Wiping biometric…");
    try {
      const r = await fetch(`${API_URL}/auth/webauthn/admin-disable`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: p.id }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setRowMsg(p.id, "error", data.error || "Could not wipe biometric devices.", 6000);
        return;
      }
      setRowMsg(p.id, "success", `✓ Biometric wiped — ${p.first_name} ${p.last_name} re-registers next login`, 5000);
      refreshUsers();
    } catch (err) {
      setRowMsg(p.id, "error", err?.message || "Connection error", 6000);
    }
  };

  // v28.49 — force every active session for the target user to end. Bumps
  // their token_version on the backend, invalidating ALL outstanding JWTs.
  // Distinct from WIPE BIO: the user keeps their biometric credentials and
  // can sign back in normally. This is the lighter-touch tool for the
  // "kick this user off all devices NOW" use case.
  const forceLogout = async (p) => {
    setRowMsg(p.id, "pending", "Forcing sign-out…");
    try {
      const r = await fetch(`${API_URL}/users/${p.id}/force-logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setRowMsg(p.id, "error", data.error || "Could not force sign-out.", 6000);
        return;
      }
      setRowMsg(p.id, "success", `✓ ${p.first_name} ${p.last_name} signed out of all devices`, 5000);
    } catch (err) {
      setRowMsg(p.id, "error", err?.message || "Connection error", 6000);
    }
  };

  return { rowFeedback, sendPinSetup, resetPin, deactivate, resendInvite, wipeBio, forceLogout };
}
