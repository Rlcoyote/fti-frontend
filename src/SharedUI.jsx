import { C, STATUS_CONFIG, STATUS_ORDER } from "./config.js";

// ─── MODAL Z-INDEX LAYERS (v27.67) ────────────────────────────────────────
// The app stacks modals intentionally: a confirmation-over-an-edit-modal
// needs to render above the edit modal. Before this there were ad-hoc values
// (100, 200, 300, 400) scattered across files with no rule — formalizing
// here so new modals pick the right layer deliberately.
//
// Use via Z_INDEX.<layer>. Never hardcode a number in a modal.
export const Z_INDEX = {
  // Base-level modals (edit forms, add flows). ModalWrap uses this.
  modal: 100,
  // Secondary modals that render OVER a base modal (confirmations from
  // within an edit flow, duplicate options opened from ticket detail).
  overlay: 200,
  // Tertiary (picker / child modal opened from an overlay).
  nested: 300,
  // Global, top-of-everything (NoticeModal, ConfirmModal from this file —
  // they always win regardless of what else is open).
  global: 400,
};

// ─── TICKET CONFIG ────────────────────────────────────────────────────────────
export const TICKET_TYPES = {
  "Rig Up":   { color: "#B01020", bg: "#fdecea", label: "RIG UP",   abbr: "RU" },
  "Rig Down": { color: "#000000", bg: "#e8e8e8", label: "RIG DOWN", abbr: "RD" },
  "Tester":   { color: "#1a7a3c", bg: "#e6f5ec", label: "TESTER",   abbr: "TST" },
  "Pumper":   { color: "#1a5fa8", bg: "#e8f0fb", label: "PUMPER",   abbr: "PMP" },
  "Rental":   { color: "#8a6500", bg: "#fdf5d8", label: "RENTAL",   abbr: "RNT" },
};

export const TICKET_STATUSES = {
  incomplete: { color: "#6b7a99", bg: "#f0f3f8", label: "INCOMPLETE" },
  draft:      { color: "#6b7a99", bg: "#f0f3f8", label: "DRAFT" },
  inField:    { color: "#8a6500", bg: "#fdf5d8", label: "IN FIELD" },
  emailed:    { color: "#7a3ca0", bg: "#f3eafa", label: "EMAIL FOR SIGNATURE" },
  signed:     { color: "#1a7a3c", bg: "#e6f5ec", label: "SIGNED" },
  sigNotReq:  { color: "#1a5fa8", bg: "#e8f0fb", label: "SIG NOT REQ" },
  approved:   { color: "#b85c00", bg: "#fdf0e6", label: "APPROVED" },
  sentToQB:   { color: "#7a3ca0", bg: "#f3eafa", label: "SENT TO ACCOUNTING" },
  qbVerified: { color: "#1a7a3c", bg: "#d4edda", label: "QB VERIFIED" },
  voided:     { color: "#B01020", bg: "#fdecea", label: "VOIDED" },
};

// ─── SHARED FORM STYLES ───────────────────────────────────────────────────────
export const inputStyle = {
  width: "100%", boxSizing: "border-box",
  background: C.steel, border: `1px solid ${C.border}`,
  color: C.text, padding: "8px 11px", borderRadius: 4,
  fontSize: 13, fontFamily: "'Arial', sans-serif", outline: "none",
};

export const labelStyle = {
  fontSize: 11, fontWeight: 700, color: C.muted,
  letterSpacing: "0.08em", marginBottom: 4, display: "block",
};

// ─── SHARED BUTTONS ───────────────────────────────────────────────────────────
export function Btn({ onClick, children, variant = "primary", small, disabled, style: extraStyle, title }) {
  const styles = {
    primary: { background: C.red, color: C.white, border: "none" },
    ghost:   { background: "transparent", color: C.muted, border: `1px solid ${C.border}` },
    blue:    { background: C.blue, color: C.white, border: "none" },
  };
  return (
    <button type="button" onClick={disabled ? undefined : onClick} disabled={disabled} title={title} style={{
      ...styles[variant],
      padding: small ? "5px 12px" : "9px 18px",
      borderRadius: 4, fontSize: small ? 12 : 13,
      fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", fontFamily: "'Arial', sans-serif",
      letterSpacing: "0.04em", transition: "opacity 0.12s, transform 0.1s",
      opacity: disabled ? 0.4 : 1,
      ...extraStyle,
    }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.opacity = "0.85"; }}
      onMouseLeave={e => { if (!disabled) e.currentTarget.style.opacity = disabled ? "0.4" : "1"; }}
      onMouseDown={e => { if (!disabled) e.currentTarget.style.transform = "scale(0.97)"; }}
      onMouseUp={e => { if (!disabled) e.currentTarget.style.transform = "scale(1)"; }}
    >{children}</button>
  );
}

export function FilterBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      background: active ? C.blue : "transparent",
      border: `1px solid ${active ? C.blue : C.border}`,
      color: active ? C.white : C.muted,
      padding: "5px 12px", borderRadius: 4, fontSize: 11,
      fontWeight: 700, cursor: "pointer", fontFamily: "'Arial', sans-serif",
    }}>{children}</button>
  );
}

// ─── BADGES ───────────────────────────────────────────────────────────────────
export function PriorityBadge({ priority }) {
  if (priority === "normal") return null;
  const hi = priority === "high";
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 3,
      background: hi ? C.priHighB : C.priLowB,
      color: hi ? C.priHigh : C.priLow,
      border: `1px solid ${hi ? C.priHigh : C.priLow}33`,
      letterSpacing: "0.06em",
    }}>{hi ? "HIGH" : "LOW"}</span>
  );
}

export function TodoBadge({ count }) {
  if (!count) return null;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: 11, fontWeight: 700, color: C.blue,
      background: C.priLowB, border: `1px solid ${C.priLow}33`,
      padding: "2px 8px", borderRadius: 3,
    }}>☐ {count} To-Do{count !== 1 ? "s" : ""}</span>
  );
}

export function NavBadge({ count }) {
  if (!count) return null;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      minWidth: 18, height: 18, borderRadius: 9,
      background: C.red, color: C.white,
      fontSize: 10, fontWeight: 800, padding: "0 5px",
      marginLeft: 5,
    }}>{count}</span>
  );
}

// ─── TICKET DOTS & STATUS ─────────────────────────────────────────────────────
export function TicketDot({ label, state }) {
  const colors = { signed: C.green, inField: "#1a5fa8", incomplete: "#8a6500", draft: "#8a6500", none: "#d0d8e8" };
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <div style={{ width: 10, height: 10, borderRadius: "50%", background: colors[state] || colors.none }} />
      <span style={{ fontSize: 8, color: C.muted, fontWeight: 700 }}>{label}</span>
    </div>
  );
}

export function computeJobStatus(job, jobTickets = []) {
  if (job.status === "Completed") return "Completed";
  const todayStr = new Date().toLocaleDateString("en-CA");
  const hasCurrentTicket = jobTickets.some(t => {
    const td = (t.date || t.ticket_date || "").slice(0, 10);
    return td && td <= todayStr;
  });
  if (hasCurrentTicket) return "In Progress";
  return "Scheduled";
}

export function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG["Scheduled"];
  return (
    <span style={{
      display: "inline-block", padding: "3px 10px", borderRadius: 3,
      fontSize: 11, fontWeight: 800, letterSpacing: "0.1em",
      color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}33`,
    }}>{cfg.label}</span>
  );
}

export function PipelineSummary({ jobs, tickets }) {
  return (
    <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
      {STATUS_ORDER.map(status => {
        const count = jobs.filter(j => computeJobStatus(j, (tickets || []).filter(t => t.jobId === j.id)) === status).length;
        const cfg = STATUS_CONFIG[status] || { color: C.muted, label: status };
        return (
          <div key={status} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: cfg.color }}>{count}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.06em" }}>{cfg.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── TICKET TYPE & STATUS BADGES ──────────────────────────────────────────────
export function TicketTypeBadge({ type }) {
  const cfg = TICKET_TYPES[type] || { color: C.muted, bg: C.steel, label: type || "—" };
  return (
    <span style={{
      display: "inline-block", padding: "3px 10px", borderRadius: 3,
      fontSize: 10, fontWeight: 800, letterSpacing: "0.1em",
      color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}33`,
    }}>{cfg.label}</span>
  );
}

export function TicketStatusBadge({ status }) {
  const cfg = TICKET_STATUSES[status] || { color: C.muted, bg: C.steel, label: status || "—" };
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 3,
      fontSize: 9, fontWeight: 800, letterSpacing: "0.1em",
      color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}33`,
    }}>{cfg.label}</span>
  );
}

// ─── MODAL WRAPPER ────────────────────────────────────────────────────────────
// On mobile (≤900px): renders as full-screen page with native scroll.
// On desktop: centered modal overlay with max-height scroll.
export function ModalWrap({ title, onClose, children, width = 440 }) {
  const isMob = window.innerWidth <= 900;
  return (
    <div style={isMob
      ? { position: "fixed", inset: 0, background: C.cardBg, zIndex: 100, overflowY: "auto", WebkitOverflowScrolling: "touch" }
      : { position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }
    } onClick={isMob ? undefined : onClose}>
      <div style={isMob
        ? { background: C.cardBg, borderTop: `3px solid ${C.red}`, padding: 24, minHeight: "100%" }
        : { background: C.cardBg, border: `1px solid ${C.border}`, borderTop: `3px solid ${C.red}`, borderRadius: 8, padding: 24, width, maxWidth: "92vw", maxHeight: "85vh", overflowY: "auto" }
      } onClick={isMob ? undefined : e => e.stopPropagation()}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 18 }}>{title}</div>
        {children}
      </div>
    </div>
  );
}

// ─── CONFIRM MODAL ─────────────────────────────────────────────────────────
// Use in place of window.confirm() — styled to match the app, supports a
// custom primary-button label (e.g. "Delete", "Deactivate"). The primary
// action uses the red Btn; cancel is a ghost Btn.
export function ConfirmModal({ title, message, yesLabel = "Confirm", onYes, onCancel }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: Z_INDEX.global }}>
      <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderTop: `4px solid ${C.red}`, borderRadius: 8, padding: 28, width: 460, maxWidth: "90vw" }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 12 }}>{title}</div>
        <div style={{ fontSize: 13, color: C.text, marginBottom: 22, lineHeight: 1.6 }}>{message}</div>
        <div style={{ display: "flex", gap: 10 }}>
          <Btn onClick={onYes}>{yesLabel}</Btn>
          <Btn variant="ghost" onClick={onCancel}>Cancel</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── NOTICE MODAL ──────────────────────────────────────────────────────────
// Use in place of ephemeral toast notifications — the user must explicitly
// dismiss with OK, so they don't miss the message. `variant` picks the accent
// color (green = success, red = error).
export function NoticeModal({ title, message, variant = "ok", onClose }) {
  const accent = variant === "error" ? C.red : C.green;
  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: Z_INDEX.global }}>
      <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderTop: `4px solid ${accent}`, borderRadius: 8, padding: 28, width: 460, maxWidth: "90vw" }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: accent, marginBottom: 12 }}>{title}</div>
        <div style={{ fontSize: 13, color: C.text, marginBottom: 22, lineHeight: 1.6 }}>{message}</div>
        <div style={{ display: "flex", gap: 10 }}>
          <Btn variant="blue" onClick={onClose}>OK</Btn>
        </div>
      </div>
    </div>
  );
}
