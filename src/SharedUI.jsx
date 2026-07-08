import { C, F, SP, R } from "./config.js";
import useBodyScrollLock from "./useBodyScrollLock.js";
import useIsMobile from "./useIsMobile.js";

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
  // v28.271 — desc lives here (ONE home): the ADD TICKET type menu and the
  // in-modal fallback grid both read it.
  "Rig Up": { color: "#B01020", bg: "#fdecea", label: "RIG UP", abbr: "RU", desc: "Crew mobilization, equipment, Day 1 rental" },
  "Rig Down": { color: "#000000", bg: "#e8e8e8", label: "RIG DOWN", abbr: "RD", desc: "Teardown, equipment return, DLR check" },
  Tester: { color: "#1a7a3c", bg: "#e6f5ec", label: "TESTER", abbr: "TST", desc: "Flo-back testing, weekly hours + well log" },
  Pumper: { color: "#1a5fa8", bg: "#e8f0fb", label: "PUMPER", abbr: "PMP", desc: "Field specialist, weekly hours + well log" },
  Rental: { color: "#8a6500", bg: "#fdf5d8", label: "RENTAL", abbr: "RNT", desc: "Ongoing equipment rental (Day 2+)" },
};

// v28.40 — inField removed. Functionally identical to incomplete (both meant
// "this ticket needs a signature"). The only path to inField was the
// sig-wipe-edit on a previously-signed ticket; that path now lands the
// ticket back at incomplete. inField rows in old data are mapped to
// incomplete on read (see useTicketState normalizer).
// draft is also retained but has no current setter — kept to avoid breaking
// any historical row that may have it.
export const TICKET_STATUSES = {
  incomplete: { color: "#6b7a99", bg: "#f0f3f8", label: "INCOMPLETE" },
  draft: { color: "#6b7a99", bg: "#f0f3f8", label: "DRAFT" },
  emailed: { color: "#7a3ca0", bg: "#f3eafa", label: "EMAIL FOR SIGNATURE" },
  signed: { color: "#1a7a3c", bg: "#e6f5ec", label: "SIGNED" },
  sigNotReq: { color: "#1a5fa8", bg: "#e8f0fb", label: "SIG NOT REQ" },
  approved: { color: "#b85c00", bg: "#fdf0e6", label: "APPROVED" },
  sentToQB: { color: "#7a3ca0", bg: "#f3eafa", label: "SENT TO ACCOUNTING" },
  qbVerified: { color: "#1a7a3c", bg: "#d4edda", label: "QB VERIFIED" },
  voided: { color: "#B01020", bg: "#fdecea", label: "VOIDED" },
};

// ─── ALWAYS-LIGHT PANEL TEXT TOKENS ───────────────────────────────────────────
// v28.44 introduced these for pastel ticket-type panels. v28.53 broadened
// the rule: these tokens apply to ANY always-light surface, not just the
// per-type tinted ones.
//
// THE RULE (auditor-grade):
//
//   Most surfaces in the app theme-flip via C.text / C.muted (light text in
//   dark mode, dark text in light mode). That works because both the
//   surface color AND the text color flip together.
//
//   ANY ALWAYS-LIGHT SURFACE — text on it must use PANEL_TEXT / PANEL_MUTED /
//   PANEL_FAINT. These tokens are always-dark and read correctly against any
//   light surface regardless of theme. C.text on an always-light surface
//   goes invisible in dark mode (light-on-light) — that's the bug class.
//
//   Always-light surfaces in this app include (non-exhaustive):
//     - PASTEL TICKET-TYPE PANELS (TICKET_TYPES[type].bg — RIG UP pink,
//       RIG DOWN gray, TESTER green, PUMPER blue, RENTAL yellow)
//     - CARD-BODY SURFACES that are hex-coded light (#f7f9fc dashboard
//       expansion area; #f5f5f5 sent-to-QB ticket card; #e8f0fb active
//       ticket highlight; #f0f3f8 readonly form fields; #f8f9fa photo
//       tile backdrop)
//     - HOSPITAL / LEAD-ROW / OTHER STATUS SURFACES that intentionally
//       stay light per design (#fdf0f0, #fdf5d8 lead, etc.)
//
//   WHEN TO USE WHICH:
//     PANEL_TEXT  — primary text on an always-light surface
//     PANEL_MUTED — secondary text (labels, subtext, captions)
//     PANEL_FAINT — tertiary stamps (timestamps, "X of Y" markers)
//     C.text      — anywhere theme-aware (cards, modals, dashboards)
//     C.muted     — same, theme-aware
//
//   Using C.text on an always-light surface is a bug. Using PANEL_TEXT on
//   a theme-aware surface locks text dark regardless of theme — also a bug.
//   The distinction is "does this surface stay light in dark mode?" — if
//   yes, PANEL_*. If it flips with the theme, C.text/C.muted.
//
// History: introduced v28.39 as locals in TicketHeaderRow.jsx. Promoted to
// SharedUI v28.44 (LineItemEditor, ReadOnlyLineItems, TicketDetail,
// AddTicketModal sweep). Broadened v28.53 (JobCard details panel,
// JobTicketsTab active/sent cards, AddTicketModal readonly end-date,
// PhotoStrip filename caption) after the original "pastel-only" wording
// proved too narrow — the same bug landed on sibling always-light surfaces
// the v28.44 sweep didn't cover.
export const PANEL_TEXT = "#1a2340"; // dark navy — primary on pastel
export const PANEL_MUTED = "#4a5570"; // slate — secondary on pastel
export const PANEL_FAINT = "#6b7a99"; // lighter slate — tertiary on pastel

// ─── SHARED FORM STYLES ───────────────────────────────────────────────────────
// v28.43 — getter-object pattern. The previous design captured `C.steel`,
// `C.border`, `C.text`, `C.muted` as STRINGS at module load — meaning the
// styles never theme-flipped without a hard refresh. Now each theme-bound
// property is a getter that reads C live; the object spread `{...inputStyle,
// width: 180}` (used at most call sites) fires the getters at spread time
// and captures the CURRENT theme's values per render. Direct usage
// `style={inputStyle}` also works because React reads each property when
// it applies the style. Zero call-site changes; static-capture class of
// bug eliminated. CAM Article XXIV — making the bug structurally
// impossible instead of patching each contrast leak.
export const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 11px",
  borderRadius: 4,
  fontSize: 13,
  fontFamily: "'Arial', sans-serif",
  outline: "none",
  get background() {
    return C.steel;
  },
  get border() {
    return `1px solid ${C.border}`;
  },
  get color() {
    return C.text;
  },
};

export const labelStyle = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.08em",
  marginBottom: 4,
  display: "block",
  get color() {
    return C.muted;
  },
};

// ─── SHARED BUTTONS ───────────────────────────────────────────────────────────
export function Btn({ onClick, children, variant = "primary", small, disabled, style: extraStyle, title }) {
  const styles = {
    primary: { background: C.red, color: C.white, border: "none" },
    ghost: { background: "transparent", color: C.muted, border: `1px solid ${C.border}` },
    blue: { background: C.blue, color: C.white, border: "none" },
    // v27.98 — danger variant for destructive confirmations (disable 2FA, etc.)
    danger: { background: "#8b1010", color: C.white, border: "none" },
  };
  // v28.266 — interaction states moved to .fti-btn (index.css): hover lift +
  // glow, press settle, keyboard focus ring, reduced-motion honored. The old
  // JS opacity-dim hover is gone — CSS pseudo-classes are the structural home
  // (inline styles can't express them; the listeners were the workaround).
  return (
    <button
      type="button"
      className="fti-btn"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={title}
      style={{
        ...styles[variant],
        padding: small ? "5px 12px" : "9px 18px",
        borderRadius: 6,
        fontSize: small ? 12 : 13,
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "'Arial', sans-serif",
        letterSpacing: "0.04em",
        opacity: disabled ? 0.4 : 1,
        ...extraStyle,
      }}
      onMouseDown={(e) => {
        if (!disabled) e.currentTarget.style.transform = "scale(0.97)";
      }}
      onMouseUp={(e) => {
        if (!disabled) e.currentTarget.style.transform = "scale(1)";
      }}
    >
      {children}
    </button>
  );
}

export function FilterBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? C.blue : "transparent",
        border: `1px solid ${active ? C.blue : C.border}`,
        color: active ? C.white : C.muted,
        padding: "5px 12px",
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 700,
        cursor: "pointer",
        fontFamily: "'Arial', sans-serif",
      }}
    >
      {children}
    </button>
  );
}

// v28.283 — a JOINED filter group: one bordered pill with the buttons as
// segments, so mutually-exclusive choices (ACTIVE | COMPLETED) read as one
// switch instead of scattered look-alike buttons.
export function SegmentedBtns({ value, onChange, options }) {
  return (
    <div style={{ display: "inline-flex", border: `1px solid ${C.border}`, borderRadius: 5, overflow: "hidden" }}>
      {options.map(([v, label], i) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          style={{
            background: value === v ? C.blue : "transparent",
            border: "none",
            borderLeft: i > 0 ? `1px solid ${C.border}` : "none",
            color: value === v ? C.white : C.muted,
            padding: "6px 14px",
            fontSize: 11,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "'Arial', sans-serif",
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ─── BADGES ───────────────────────────────────────────────────────────────────
export function PriorityBadge({ priority }) {
  if (priority === "normal") return null;
  const hi = priority === "high";
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        padding: "2px 7px",
        borderRadius: 3,
        background: hi ? C.priHighB : C.priLowB,
        color: hi ? C.priHigh : C.priLow,
        border: `1px solid ${hi ? C.priHigh : C.priLow}33`,
        letterSpacing: "0.06em",
      }}
    >
      {hi ? "HIGH" : "LOW"}
    </span>
  );
}

export function TodoBadge({ count }) {
  if (!count) return null;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 11,
        fontWeight: 700,
        color: C.blue,
        background: C.priLowB,
        border: `1px solid ${C.priLow}33`,
        padding: "2px 8px",
        borderRadius: 3,
      }}
    >
      ☐ {count} To-Do{count !== 1 ? "s" : ""}
    </span>
  );
}

export function NavBadge({ count }) {
  if (!count) return null;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        background: C.red,
        color: C.white,
        fontSize: 10,
        fontWeight: 800,
        padding: "0 5px",
        marginLeft: 5,
      }}
    >
      {count}
    </span>
  );
}

// ─── TICKET DOTS ──────────────────────────────────────────────────────────────
// v28.40 — `inField` state removed (merged into incomplete). The dot palette
// keeps three meaningful states: signed (work done), incomplete (needs work),
// none (no ticket of this type yet).
export function TicketDot({ label, state }) {
  const colors = { signed: C.green, incomplete: "#8a6500", draft: "#8a6500", none: "#d0d8e8" };
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <div style={{ width: 10, height: 10, borderRadius: "50%", background: colors[state] || colors.none }} />
      <span style={{ fontSize: 8, color: C.muted, fontWeight: 700 }}>{label}</span>
    </div>
  );
}

// v28.40 — `computeJobStatus`, `StatusBadge`, `PipelineSummary` removed.
// The 3-tier WO status (SCHEDULED / IN PROGRESS / COMPLETED) failed CAM
// Article III Amendment 2 — the date-based "In Progress" rule didn't
// reflect actual work, the badges were redundant with ticket dots, and
// SCHEDULED was derivable from "no tickets touched yet." Replaced with
// binary active/archived: a WO is active until the lead clicks MARK FOR
// COMPLETION on the WO header (then it's archived via POST /api/archive).
// No badge on active WOs — the ticket pips are the state.

// ─── TICKET TYPE & STATUS BADGES ──────────────────────────────────────────────
// v28.28 — fixed minWidth + centered label so RIG UP / RIG DOWN / TESTER /
// PUMPER / RENTAL all render at the same visual width. Without this, "RIG UP"
// (6 chars) renders narrower than "RIG DOWN" (8 chars) which pushes every
// downstream column on the ticket row out of vertical alignment from row to
// row. minWidth (not width) so longer labels never truncate; the badge
// grows beyond 78px if a future TICKET_TYPES entry needs it.
export function TicketTypeBadge({ type }) {
  const cfg = TICKET_TYPES[type] || { color: C.muted, bg: C.steel, label: type || "—" };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: 3,
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: "0.1em",
        color: cfg.color,
        background: cfg.bg,
        border: `1px solid ${cfg.color}33`,
        minWidth: 78,
        textAlign: "center",
        boxSizing: "border-box",
      }}
    >
      {cfg.label}
    </span>
  );
}

export function TicketStatusBadge({ status }) {
  const cfg = TICKET_STATUSES[status] || { color: C.muted, bg: C.steel, label: status || "—" };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 3,
        fontSize: 9,
        fontWeight: 800,
        letterSpacing: "0.1em",
        color: cfg.color,
        background: cfg.bg,
        border: `1px solid ${cfg.color}33`,
      }}
    >
      {cfg.label}
    </span>
  );
}

// ─── MODAL WRAPPER ────────────────────────────────────────────────────────────
// v28.286 (theme arc) — THE one modal shell. Every modal in the app renders
// through this component; site-wide modal aesthetics change HERE and nowhere
// else. Two presentations:
//
//   variant="sheet" (default) — edit forms / add flows. On mobile (≤900px)
//     a full-screen page with native scroll; on desktop a centered overlay
//     with max-height scroll. Desktop overlay click closes (onClose).
//   variant="dialog" — confirms / notices / small pickers. Centered on EVERY
//     screen size, heavier 4px accent, no overlay-click dismiss (a stray
//     click must never answer a destructive question).
//
// `accent` colors the top border (default C.red; ticket modals pass their
// type color). `z` stacks per the Z_INDEX tiers above. Page scroll behind
// the modal is always locked (the v28.274 sweep missed this wrapper).
export function ModalWrap({ title, onClose, children, width = 440, accent = C.red, z = Z_INDEX.modal, variant = "sheet" }) {
  const isMob = useIsMobile();
  useBodyScrollLock(true);
  const dialog = variant === "dialog";
  const asSheet = !dialog && isMob;
  return (
    <div
      style={
        asSheet
          ? { position: "fixed", inset: 0, background: C.cardBg, zIndex: z, overflowY: "auto", WebkitOverflowScrolling: "touch" }
          : { position: "fixed", inset: 0, background: C.scrim, display: "flex", alignItems: "center", justifyContent: "center", zIndex: z }
      }
      onClick={asSheet || dialog ? undefined : onClose}
    >
      <div
        style={
          asSheet
            ? { background: C.cardBg, borderTop: `3px solid ${accent}`, padding: SP.card, minHeight: "100%" }
            : {
                background: C.cardBg,
                border: `1px solid ${C.border}`,
                borderTop: dialog ? `4px solid ${accent}` : `3px solid ${accent}`,
                borderRadius: R.card,
                padding: dialog ? SP.page : SP.card,
                width,
                maxWidth: dialog ? "90vw" : "92vw",
                maxHeight: "85vh",
                overflowY: "auto",
              }
        }
        onClick={asSheet || dialog ? undefined : (e) => e.stopPropagation()}
      >
        {title !== undefined && <div style={{ fontSize: F.lg, fontWeight: 700, marginBottom: 18 }}>{title}</div>}
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
  // v28.286 — renders through the one shell (dialog variant, global tier).
  return (
    <ModalWrap variant="dialog" z={Z_INDEX.global} width={460} accent={C.red}>
      <div style={{ fontSize: F.xl, fontWeight: 800, color: C.text, marginBottom: 12 }}>{title}</div>
      <div style={{ fontSize: F.body, color: C.text, marginBottom: 22, lineHeight: 1.6 }}>{message}</div>
      <div style={{ display: "flex", gap: SP.lg }}>
        <Btn onClick={onYes}>{yesLabel}</Btn>
        <Btn variant="ghost" onClick={onCancel}>
          Cancel
        </Btn>
      </div>
    </ModalWrap>
  );
}

// ─── NOTICE MODAL ──────────────────────────────────────────────────────────
// Use in place of ephemeral toast notifications — the user must explicitly
// dismiss with OK, so they don't miss the message. `variant` picks the accent
// color (green = success, red = error).
export function NoticeModal({ title, message, variant = "ok", onClose }) {
  // v28.286 — renders through the one shell (dialog variant, global tier).
  const accent = variant === "error" ? C.red : C.green;
  return (
    <ModalWrap variant="dialog" z={Z_INDEX.global} width={460} accent={accent}>
      <div style={{ fontSize: F.xl, fontWeight: 800, color: accent, marginBottom: 12 }}>{title}</div>
      <div style={{ fontSize: F.body, color: C.text, marginBottom: 22, lineHeight: 1.6 }}>{message}</div>
      <div style={{ display: "flex", gap: SP.lg }}>
        <Btn variant="blue" onClick={onClose}>
          OK
        </Btn>
      </div>
    </ModalWrap>
  );
}
