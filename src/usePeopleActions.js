import { useState } from "react";
import { api } from "./api.js";
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
// v28.245 — migrated to the shared api client. The old per-action
// `const data = await r.json(); if (!r.ok) setError(data.error || '…')` is
// exactly what ApiError carries: a non-ok response throws ApiError whose .body
// holds the server JSON, so `err.body?.error || '<friendly>'` reproduces the
// prior message (server error when present, friendly fallback otherwise) and
// the same catch also covers the network-error path it used to.
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
      await api.post(`/employees/${p.id}/send-pin-setup`);
      setRowMsg(p.id, "success", `✓ PIN setup link sent to ${p.phone || "phone"}`, 5000);
      fetchPeople();
    } catch (err) {
      setRowMsg(p.id, "error", err.body?.error || "Could not send PIN setup link.", 6000);
    }
  };

  const resetPin = async (p) => {
    setRowMsg(p.id, "pending", "Resetting PIN…");
    try {
      await api.post(`/employees/${p.id}/reset-pin`);
      setRowMsg(p.id, "success", `✓ PIN reset; new link sent to ${p.phone || "phone"}`, 5000);
      fetchPeople();
    } catch (err) {
      setRowMsg(p.id, "error", err.body?.error || "Could not reset PIN.", 6000);
    }
  };

  const deactivate = async (p) => {
    setRowMsg(p.id, "pending", "Deactivating…");
    try {
      await api.post(`/employees/${p.id}/deactivate`);
      setRowMsg(p.id, "success", `✓ ${p.first_name} ${p.last_name} deactivated`, 5000);
      fetchPeople();
      refreshUsers();
    } catch (err) {
      setRowMsg(p.id, "error", err.body?.error || "Could not deactivate.", 6000);
    }
  };

  const resendInvite = async (p) => {
    setRowMsg(p.id, "pending", "Sending invite…");
    try {
      await api.post("/auth/invite", { user_id: p.id });
      setRowMsg(p.id, "success", `✓ Invite sent to ${p.email}`, 5000);
    } catch (err) {
      setRowMsg(p.id, "error", err.body?.error || "Failed to resend invite", 8000);
    }
  };

  const wipeBio = async (p) => {
    setRowMsg(p.id, "pending", "Wiping biometric…");
    try {
      await api.post("/auth/webauthn/admin-disable", { user_id: p.id });
      setRowMsg(p.id, "success", `✓ Biometric wiped — ${p.first_name} ${p.last_name} re-registers next login`, 5000);
      refreshUsers();
    } catch (err) {
      setRowMsg(p.id, "error", err.body?.error || "Could not wipe biometric devices.", 6000);
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
      await api.post(`/users/${p.id}/force-logout`);
      setRowMsg(p.id, "success", `✓ ${p.first_name} ${p.last_name} signed out of all devices`, 5000);
    } catch (err) {
      setRowMsg(p.id, "error", err.body?.error || "Could not force sign-out.", 6000);
    }
  };

  return { rowFeedback, sendPinSetup, resetPin, deactivate, resendInvite, wipeBio, forceLogout };
}
