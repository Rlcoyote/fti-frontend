import { C } from "./config.js";
import { canModifyUser } from "./permissions.js";

// ─── PersonRowActions (v28.148 — ship 3 of the PeoplePage split) ───────────
// The per-person lifecycle buttons for a PeoplePage roster row — EDIT, SEND
// PIN SETUP / RESET PIN, RESET PW, RESEND INVITE, WIPE BIO, FORCE SIGN OUT,
// CHANGE PW, MANAGE DEVICES, DEACTIVATE — plus the inline feedback pill.
// Rendered identically by both the desktop table and the mobile cards.
//
// Which buttons appear is driven by is_active, pin_set, isSelf, and
// canModifyUser (admin can't touch an owner, etc.). v28.46: while a row's
// async action is pending, every async button on that row disables, so a
// fast-clicking auditor can't fire 15 invite emails in a row.
//
// actions is the whole usePeopleActions return (rowFeedback + the six
// async handlers). The four set* props open PeoplePage-owned modals;
// setConfirmAction routes the destructive actions through ConfirmModal.

function PersonRowActions({ person: p, currentUser, actions, setEditing, setResetPwUser, setShowChangePw, setShowWebauthn, setConfirmAction }) {
  const { rowFeedback, sendPinSetup, resetPin, deactivate, resendInvite, wipeBio, forceLogout } = actions;

  const actionBtnStyle = {
    background: "transparent",
    border: `1px solid ${C.border}`,
    color: C.muted,
    fontSize: 10,
    fontWeight: 700,
    padding: "3px 8px",
    borderRadius: 3,
    cursor: "pointer",
    letterSpacing: "0.04em",
  };
  // v28.46 — disabled style for buttons while their row's async action is pending.
  const disabledBtnStyle = { ...actionBtnStyle, opacity: 0.4, cursor: "not-allowed", color: C.muted, border: `1px solid ${C.border}` };

  const isSelf = p.id === currentUser?.id;
  const canModify = canModifyUser(currentUser?.role, p.role);
  const buttons = [];
  // v28.46 — every async-action button on this row disables when ANY
  // async is pending for this user, so a fast-clicking auditor can't
  // fire 15 invite emails in a row. The pending state clears as soon
  // as the success/error pill replaces it, freeing the buttons again.
  const fb = rowFeedback[p.id];
  const isPending = fb?.kind === "pending";
  const asyncBtn = (extra) => (isPending ? disabledBtnStyle : { ...actionBtnStyle, ...extra });

  if (p.is_active) {
    buttons.push(
      <button key="edit" onClick={() => setEditing(p)} style={{ ...actionBtnStyle, border: `1px solid ${C.blue}44`, color: C.blue }}>
        EDIT
      </button>,
    );
    if (p.pin_set === false) {
      buttons.push(
        <button
          key="send-pin"
          disabled={isPending}
          onClick={() => {
            if (!isPending) sendPinSetup(p);
          }}
          style={asyncBtn({ border: `1px solid ${C.blue}44`, color: isPending ? C.muted : C.blue })}
        >
          {isPending && fb.msg.startsWith("Sending PIN") ? "SENDING…" : "SEND PIN SETUP"}
        </button>,
      );
    } else if (p.pin_set === true) {
      buttons.push(
        <button
          key="reset-pin"
          disabled={isPending}
          onClick={() => {
            if (!isPending)
              setConfirmAction({
                kind: "reset-pin",
                title: "Reset PIN?",
                message: `${p.first_name} ${p.last_name}'s current PIN will be cleared. A new setup text will be sent to ${p.phone || "their phone"}. The link expires in 7 days and can only be used once.`,
                yesLabel: "Reset PIN",
                onYes: () => resetPin(p),
              });
          }}
          style={asyncBtn({})}
        >
          {isPending && fb.msg.startsWith("Resetting PIN") ? "RESETTING…" : "RESET PIN"}
        </button>,
      );
    }
    if (canModify && !isSelf) {
      buttons.push(
        <button key="reset-pw" onClick={() => setResetPwUser(p)} style={actionBtnStyle}>
          RESET PW
        </button>,
      );
      buttons.push(
        <button
          key="resend"
          disabled={isPending}
          onClick={() => {
            if (!isPending) resendInvite(p);
          }}
          style={asyncBtn({})}
        >
          {isPending && fb.msg.startsWith("Sending invite") ? "SENDING…" : "RESEND INVITE"}
        </button>,
      );
      buttons.push(
        <button
          key="wipe-bio"
          disabled={isPending}
          onClick={() => {
            if (!isPending)
              setConfirmAction({
                kind: "wipe-bio",
                title: "Wipe biometric devices?",
                message: `Wipe ALL registered biometric devices for ${p.first_name} ${p.last_name}? They'll re-register a device on next login (after entering their password). All current sessions will be invalidated.`,
                yesLabel: "Wipe Bio",
                onYes: () => wipeBio(p),
              });
          }}
          style={isPending ? disabledBtnStyle : { ...actionBtnStyle, border: `1px solid ${C.red}33`, color: C.red }}
        >
          {isPending && fb.msg.startsWith("Wiping biometric") ? "WIPING…" : "WIPE BIO"}
        </button>,
      );
      // v28.49 — FORCE SIGN OUT. Ends every active session for the
      // target without wiping biometric. Owner/admin only; admin
      // cannot force-logout an owner (backend enforces too).
      buttons.push(
        <button
          key="force-logout"
          disabled={isPending}
          onClick={() => {
            if (!isPending)
              setConfirmAction({
                kind: "force-logout",
                title: "Force sign-out of all devices?",
                message: `Sign ${p.first_name} ${p.last_name} out of every device they're currently logged into? Their biometric credentials are preserved — they can sign back in normally. Use this for terminated employees, suspected stolen tokens, or to clear stale concurrent sessions.`,
                yesLabel: "Force Sign Out",
                onYes: () => forceLogout(p),
              });
          }}
          style={isPending ? disabledBtnStyle : { ...actionBtnStyle, border: `1px solid ${C.orange}44`, color: C.orange }}
        >
          {isPending && fb.msg.startsWith("Forcing sign-out") ? "SIGNING OUT…" : "FORCE SIGN OUT"}
        </button>,
      );
    }
    if (isSelf) {
      buttons.push(
        <button key="change-pw" onClick={() => setShowChangePw(true)} style={actionBtnStyle}>
          CHANGE PW
        </button>,
      );
      buttons.push(
        <button key="manage-devices" onClick={() => setShowWebauthn(true)} style={{ ...actionBtnStyle, border: `1px solid ${C.blue}44`, color: C.blue }}>
          MANAGE DEVICES
        </button>,
      );
    }
    if (canModify && !isSelf) {
      buttons.push(
        <button
          key="deactivate"
          disabled={isPending}
          onClick={() => {
            if (!isPending)
              setConfirmAction({
                kind: "deactivate",
                title: "Deactivate this person?",
                message: `${p.first_name} ${p.last_name} will be removed from the active roster. Their PIN link becomes invalid; their email can be reused for a new person; the crew picker will exclude them; historical data on tickets and JSAs is preserved.`,
                yesLabel: "Deactivate",
                onYes: () => deactivate(p),
              });
          }}
          style={isPending ? disabledBtnStyle : { ...actionBtnStyle, border: `1px solid ${C.red}33`, color: C.red }}
        >
          {isPending && fb.msg.startsWith("Deactivating") ? "DEACTIVATING…" : "DEACTIVATE"}
        </button>,
      );
    }
    if (!canModify && !isSelf) {
      buttons.push(
        <span key="protected" style={{ fontSize: 10, color: C.muted, fontStyle: "italic" }}>
          Protected
        </span>,
      );
    }
    // v28.46 — inline per-row feedback pill. Renders right next to the
    // buttons so the user sees confirmation at the spot they clicked,
    // even if they're 45 rows down a long list. Color encodes kind:
    //   pending → blue tint with hourglass
    //   success → green tint with ✓
    //   error   → red tint with ✗ (longer TTL + tooltip with full text)
    if (fb) {
      const palette =
        fb.kind === "success"
          ? { bg: "#e6f5ec", color: C.green, border: C.green + "44" }
          : fb.kind === "error"
            ? { bg: "#fdecea", color: C.red, border: C.red + "44" }
            : { bg: "#e8f0fb", color: C.blue, border: C.blue + "44" };
      buttons.push(
        <span
          key="row-feedback"
          title={fb.msg}
          style={{
            fontSize: 10,
            fontWeight: 700,
            padding: "3px 8px",
            borderRadius: 3,
            background: palette.bg,
            color: palette.color,
            border: `1px solid ${palette.border}`,
            whiteSpace: "nowrap",
            maxWidth: 320,
            overflow: "hidden",
            textOverflow: "ellipsis",
            letterSpacing: "0.04em",
          }}
        >
          {fb.kind === "pending" && "⌛ "}
          {fb.msg}
        </span>,
      );
    }
  }

  return <>{buttons}</>;
}

export default PersonRowActions;
