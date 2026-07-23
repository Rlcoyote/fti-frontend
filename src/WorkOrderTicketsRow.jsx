import { C } from "./config.js";
import { typeCaps } from "./ticketFamilies.js";
import { formatDate, calcTicketTotal } from "./utils.js";
import { TicketTypeBadge, TICKET_TYPES } from "./SharedUI.jsx";
import { RentalCountdown } from "./TicketRentalCycle.jsx";
import { useApp } from "./AppContext.jsx";

// ─── WorkOrderTicketsRow (v28.90 — ship 9 of WorkOrderTicketsTab split, the big one) ───
// A single ticket card on the Tickets tab. Renders the mobile (vertical
// stack) or desktop (horizontal flex) layout depending on the parent's
// isMobile flag. Both branches share status flags, JSA badge, button
// styles, and action wiring — they're kept inside one component so the
// flag derivation doesn't duplicate.
//
// Pure render except for the void-archive callback (passed in). Parent
// owns: opening the ticket, approving, archiving voided tickets,
// requesting an email send, and requesting a delete.
//
// Props:
//   ticket          — the ticket row
//   job             — the parent WO (resolved ONCE in the parent,
//                     passed in — used here only as a stable reference
//                     in case a future feature wants it)
//   custEmail       — customer POC email or null. Computed once in
//                     the parent.
//   isMobile        — viewport flag (from useIsMobile)
//   isActiveTicket  — viewTicket?.id === ticket.id (current desktop
//                     selection highlight)
//   currentUser     — for role-gated controls (only owner/admin sees
//                     the ARCHIVE button on voided rows)
//   actions         — single callback bag from the parent:
//     open(mode)             — open the ticket ("edit" | "sign")
//     approve()              — flip status to approved
//     archiveVoided()        — fire-and-forget archive of a voided
//                              ticket (owner/admin only)
//     requestEmail()         — open the email-signature-request modal
//     requestDelete()        — open the delete-confirm modal
//
// Theme handling (preserved from v28.53):
//   When the card bg is forced always-light (active highlight or
//   sent-to-QB faded), bare text uses C.text/C.muted so it
//   stays visible in dark mode. Without that swap, C.text theme-flips
//   to white on a white card and disappears.
//
// Click-propagation policy (v27.69, Article XI):
//   The big left region of each branch is clickable = open. Any
//   interactive control inside that region (delete trash, archive
//   button) MUST call e.stopPropagation() or it'll open the ticket
//   on click. Both existing offenders comply; future additions must
//   too.

const BTN_BASE = {
  borderRadius: 6,
  fontFamily: "'Arial', sans-serif",
  padding: "4px 10px",
  fontSize: 10,
  fontWeight: 800,
  cursor: "pointer",
  letterSpacing: "0.04em",
  border: "none",
  whiteSpace: "nowrap",
};

export default function WorkOrderTicketsRow({ ticket: t, custEmail, isMobile, isActiveTicket, actions }) {
  const { can } = useApp();
  const tcfg = TICKET_TYPES[t.type] || { color: C.muted, label: t.type || "Unknown" };
  const total = calcTicketTotal(t);
  const isSigned = ["signed", "sigNotReq", "emailed", "approved", "sentToQB", "qbVerified"].includes(t.status);
  const isApproved = t.status === "approved" || t.status === "sentToQB" || t.status === "qbVerified";
  const isEmailed = !!t.emailedAt;
  const hasPendingComment = !!t.hasPendingComment || !!t.has_pending_comment;
  const cycleEnded = !!t.cycleEnded || !!t.cycle_ended;
  // v28.41 — gate on jsaCompleted, not hasJSA. A draft JSA (saved but not
  // MARK COMPLETE'd) is no longer enough to unlock signing/email/approve.
  const needsJSA = !t.jsaCompleted && !t.voidedAt && !typeCaps(t.type).jsaOptional; // v28.274 — one home for the rule
  // Three badge states: completed (green ✓), draft (amber pill), none (gray).
  const jsaBadge = t.jsaCompleted
    ? { bg: C.greenB, color: C.green, border: C.green + "44", label: "✓ JSA" }
    : t.hasJSA
      ? { bg: C.yellowB, color: C.yellow, border: C.yellow + "44", label: "JSA — DRAFT" }
      : { bg: C.steel, color: C.muted, border: C.border, label: "JSA" };

  const btnAction = { ...BTN_BASE, background: C.yellowB, color: C.yellow, border: `1px solid ${C.yellow}44` };
  const btnDone = { ...BTN_BASE, background: C.greenB, color: C.green, border: `1px solid ${C.green}44`, cursor: "default" };
  const btnDisabled = { ...BTN_BASE, background: C.steel, color: C.muted, border: `1px solid ${C.border}`, cursor: "not-allowed", opacity: 0.6 };
  const btnBlue = { ...BTN_BASE, background: C.blueB, color: C.blue, border: `1px solid ${C.blue}44` };

  const isSent = ["sentToQB", "qbVerified"].includes(t.status);
  // v28.357 — the cardIsLight always-light regime is retired (LOOK SWEEP):
  // active/sent rows now highlight with THEME pairs, so the row follows the
  // charcoal like everything else. Type identity stays on the badge.
  const cardText = C.text;
  const cardMuted = C.muted;

  return (
    <div
      style={{
        background: isActiveTicket ? C.blueB : isSent ? C.steel : C.cardBg,
        border: isActiveTicket ? `2px solid ${C.blue}` : `1px solid ${C.border}`,
        borderLeft: `3px solid ${isSent ? C.border : tcfg.color}`,
        borderRadius: 5,
        marginBottom: 6,
        opacity: isSent && !isActiveTicket ? 0.6 : 1,
        boxShadow: isActiveTicket ? `0 2px 12px ${C.blue}33` : "none",
        transition: "all 0.15s ease",
      }}
    >
      {isMobile ? (
        // Mobile: stacked layout
        <div>
          <div
            onClick={() => actions.open("edit")}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 12px",
              cursor: "pointer",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <TicketTypeBadge type={t.type} />
                <span style={{ fontSize: 9, color: cardMuted, fontWeight: 600, whiteSpace: "nowrap" }}>
                  #{t.workOrderId}
                  {t.ticketNumber ? `-${t.ticketNumber}` : ""}
                </span>
              </div>
              <div>
                <div style={{ fontSize: 8, color: cardMuted, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Job Date</div>
                <div style={{ fontSize: 11, color: cardText, fontWeight: 600 }}>{formatDate(t.date)}</div>
                {t.createdBy && (
                  <>
                    <div style={{ fontSize: 8, color: cardMuted, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 5 }}>
                      Created by
                    </div>
                    <div style={{ fontSize: 10, color: cardText, fontWeight: 600 }}>{t.createdBy}</div>
                    {t.createdAt && (
                      <div style={{ fontSize: 9, color: C.faint }}>
                        {new Date(t.createdAt).toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "2-digit" })}
                        {" · "}
                        {new Date(t.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                      </div>
                    )}
                  </>
                )}
                {hasPendingComment && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 3,
                      background: C.redB,
                      color: C.red,
                      borderRadius: 4,
                      padding: "1px 6px",
                      fontSize: 9,
                      fontWeight: 800,
                      letterSpacing: "0.04em",
                      border: `1px solid ${C.red}44`,
                      marginTop: 4,
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.red, display: "inline-block" }} />
                    COMMENT PENDING
                  </span>
                )}
              </div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, color: cardText }}>
              {"$"}
              {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, padding: "0 12px 10px", flexWrap: "wrap" }}>
            {t.voidedAt ? (
              <span
                style={{
                  background: C.redB,
                  color: C.red,
                  borderRadius: 4,
                  padding: "2px 8px",
                  fontSize: 10,
                  fontWeight: 800,
                  border: `1px solid ${C.red}44`,
                }}
              >
                VOIDED
              </span>
            ) : (
              <>
                {cycleEnded && (
                  <span
                    style={{
                      background: C.yellowB,
                      color: C.yellow,
                      borderRadius: 4,
                      padding: "2px 8px",
                      fontSize: 10,
                      fontWeight: 800,
                      border: `1px solid ${C.yellow}44`,
                    }}
                  >
                    CYCLE ENDED
                  </span>
                )}
                <RentalCountdown ticket={t} />
                {/* v28.52 — match BTN_BASE padding/fontSize so the JSA badge sits
                    at the same vertical height as the action buttons next to it. */}
                <span
                  style={{
                    background: jsaBadge.bg,
                    color: jsaBadge.color,
                    borderRadius: 4,
                    padding: "4px 10px",
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: "0.04em",
                    border: `1px solid ${jsaBadge.border}`,
                  }}
                >
                  {jsaBadge.label}
                </span>
                {/* Sig button — greyed out if no JSA */}
                {!isSigned && t.status !== "qbVerified" && t.status !== "sentToQB" && (
                  <button
                    type="button"
                    className="fti-btn"
                    style={needsJSA ? btnDisabled : btnAction}
                    disabled={needsJSA}
                    onClick={() => {
                      if (!needsJSA) actions.open("sign");
                    }}
                    title={needsJSA ? "Complete JSA before proceeding" : ""}
                  >
                    {needsJSA ? "JSA REQ'D" : "SIG REQUEST"}
                  </button>
                )}
                {t.status === "signed" && <span style={btnDone}>✓ SIGNED</span>}
                {t.status === "sigNotReq" && <span style={{ ...btnDone, color: C.blue }}>SIG NOT REQ</span>}
                {(t.status === "approved" || t.status === "sentToQB" || t.status === "qbVerified") && <span style={btnDone}>✓ SIGNED</span>}
                {/* Email — greyed out if no JSA */}
                {!custEmail && <span style={btnDisabled}>NO EMAIL ON FILE</span>}
                {custEmail && t.status !== "sentToQB" && t.status !== "qbVerified" && (
                  <button
                    type="button"
                    className="fti-btn"
                    style={needsJSA ? btnDisabled : isEmailed ? { ...btnDone, cursor: "pointer" } : btnBlue}
                    disabled={needsJSA}
                    title={needsJSA ? "Complete JSA before emailing" : ""}
                    onClick={() => {
                      if (needsJSA) return;
                      actions.requestEmail();
                    }}
                  >
                    {isEmailed ? "Emailed / Resend" : "EMAIL TICKET"}
                  </button>
                )}
                {/* Approval — greyed out if no JSA */}
                {isSigned && !isApproved && (
                  <button
                    type="button"
                    className="fti-btn"
                    style={needsJSA ? btnDisabled : btnAction}
                    disabled={needsJSA}
                    title={needsJSA ? "Complete JSA before approving" : ""}
                    onClick={() => {
                      if (!needsJSA) actions.approve();
                    }}
                  >
                    APPROVE
                  </button>
                )}
                {isApproved && t.status !== "sentToQB" && t.status !== "qbVerified" && <span style={btnDone}>✓ APPROVED</span>}
                {(t.status === "sentToQB" || t.status === "qbVerified") && (
                  <span style={{ ...btnDone, background: C.green, color: C.white }}>✓ SENT TO ACCOUNTING</span>
                )}
              </>
            )}
            {/* Delete — only if not sent to QB */}
            {!isSent && (
              // v27.69: aria-label for accessibility; no native title= because
              // the browser tooltip has a 1.5s delay and is invisible on
              // mobile. Trash icon + red-on-hover is the visible affordance.
              <span
                aria-label="Delete ticket"
                onClick={(e) => {
                  e.stopPropagation();
                  actions.requestDelete();
                }}
                style={{ fontSize: 14, color: "#ccc", cursor: "pointer", padding: "2px 4px" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = C.red;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "#ccc";
                }}
              >
                🗑
              </span>
            )}
          </div>
        </div>
      ) : (
        // Desktop: horizontal layout
        <div
          style={{
            padding: "10px 14px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
          }}
        >
          {/* Left: full region is clickable = open ticket (matches mobile parity, Article XI).
              Any interactive element added here in the future must call e.stopPropagation(). */}
          <div
            onClick={() => actions.open("edit")}
            style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1, cursor: "pointer" }}
            aria-label="Open ticket"
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, minWidth: 70 }}>
              <TicketTypeBadge type={t.type} />
              <span style={{ fontSize: 10, color: cardMuted, whiteSpace: "nowrap", fontWeight: 600 }}>
                #{t.workOrderId}
                {t.ticketNumber ? `-${t.ticketNumber}` : ""}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 90 }}>
              <span style={{ fontSize: 8, color: cardMuted, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                Job Date
              </span>
              <span style={{ fontSize: 11, color: cardText, fontWeight: 600, whiteSpace: "nowrap" }}>{formatDate(t.date)}</span>
            </div>
            {t.createdBy && (
              <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 130 }}>
                <span style={{ fontSize: 8, color: cardMuted, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                  Created by
                </span>
                <span style={{ fontSize: 11, color: cardText, fontWeight: 600, whiteSpace: "nowrap" }}>{t.createdBy}</span>
                {t.createdAt && (
                  <span style={{ fontSize: 9, color: C.faint, whiteSpace: "nowrap" }}>
                    {new Date(t.createdAt).toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "2-digit" })}
                    {" · "}
                    {new Date(t.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  </span>
                )}
              </div>
            )}
            {hasPendingComment && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  background: C.redB,
                  color: C.red,
                  borderRadius: 4,
                  padding: "2px 8px",
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: "0.04em",
                  border: `1px solid ${C.red}44`,
                }}
              >
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: C.red, display: "inline-block" }} />
                COMMENT PENDING
              </span>
            )}
            {t.voidedAt && (
              <span
                style={{
                  background: C.redB,
                  color: C.red,
                  borderRadius: 4,
                  padding: "2px 8px",
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: "0.04em",
                  border: `1px solid ${C.red}44`,
                }}
              >
                VOIDED
              </span>
            )}
            {cycleEnded && !t.voidedAt && (
              <span
                style={{
                  background: C.yellowB,
                  color: C.yellow,
                  borderRadius: 4,
                  padding: "2px 8px",
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: "0.04em",
                  border: `1px solid ${C.yellow}44`,
                }}
              >
                CYCLE ENDED
              </span>
            )}
            <RentalCountdown ticket={t} />
          </div>

          {/* Right: action buttons + total — JSA badge is here as part of the
              workflow progression (required before ticket closure) */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <span
              style={{
                background: jsaBadge.bg,
                color: jsaBadge.color,
                borderRadius: 4,
                padding: "4px 10px",
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.04em",
                border: `1px solid ${jsaBadge.border}`,
              }}
            >
              {jsaBadge.label}
            </span>

            {t.voidedAt ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: cardMuted, fontStyle: "italic" }}>Voided</span>
                {can("view_archive") && (
                  <button
                    type="button"
                    className="fti-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      actions.archiveVoided();
                    }}
                    style={{
                      background: "transparent",
                      border: `1px solid ${C.blue}44`,
                      color: C.blue,
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "3px 10px",
                      borderRadius: 4,
                      cursor: "pointer",
                    }}
                  >
                    ARCHIVE
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Col 2: Signature — greyed out if no JSA */}
                {!isSigned && t.status !== "qbVerified" && t.status !== "sentToQB" && (
                  <button
                    type="button"
                    className="fti-btn"
                    style={needsJSA ? btnDisabled : btnAction}
                    disabled={needsJSA}
                    onClick={() => {
                      if (!needsJSA) actions.open("sign");
                    }}
                    title={needsJSA ? "Complete JSA before proceeding" : ""}
                  >
                    SIGNATURE REQUEST
                  </button>
                )}
                {t.status === "signed" && <span style={btnDone}>✓ SIGNED</span>}
                {t.status === "sigNotReq" && (
                  <span style={{ ...btnDone, background: C.blueB, color: C.blue, border: `1px solid ${C.blue}44` }}>SIG NOT REQ</span>
                )}
                {(t.status === "approved" || t.status === "sentToQB" || t.status === "qbVerified") && <span style={btnDone}>✓ SIGNED</span>}

                {/* Col 3: Email — greyed out if no JSA */}
                {!custEmail && <span style={btnDisabled}>NO EMAIL ON FILE</span>}
                {custEmail && t.status !== "sentToQB" && t.status !== "qbVerified" && (
                  <button
                    type="button"
                    className="fti-btn"
                    style={needsJSA ? btnDisabled : isEmailed ? { ...btnDone, cursor: "pointer" } : btnBlue}
                    disabled={needsJSA}
                    title={needsJSA ? "Complete JSA before emailing" : ""}
                    onClick={() => {
                      if (needsJSA) return;
                      actions.requestEmail();
                    }}
                  >
                    {isEmailed ? "Emailed / Resend" : "EMAIL TICKET"}
                  </button>
                )}
                {custEmail && (t.status === "sentToQB" || t.status === "qbVerified") && (
                  <span style={isEmailed ? btnDone : btnDisabled}>{isEmailed ? "✓ CUSTOMER EMAILED" : "NO EMAIL ON FILE"}</span>
                )}

                {/* Col 4: Approval — greyed out if no JSA */}
                {!isSigned && !isApproved && <span style={btnDisabled}>APPROVAL NEEDED</span>}
                {isSigned && !isApproved && (
                  <button
                    type="button"
                    className="fti-btn"
                    style={needsJSA ? btnDisabled : btnAction}
                    disabled={needsJSA}
                    title={needsJSA ? "Complete JSA before approving" : ""}
                    onClick={() => {
                      if (!needsJSA) actions.approve();
                    }}
                  >
                    APPROVAL NEEDED
                  </button>
                )}
                {isApproved && t.status !== "sentToQB" && t.status !== "qbVerified" && <span style={btnDone}>✓ APPROVED</span>}
                {(t.status === "sentToQB" || t.status === "qbVerified") && <span style={btnDone}>✓ APPROVED</span>}

                {/* Col 5: Accounting status (send action moved to Final Review only) */}
                {(t.status === "sentToQB" || t.status === "qbVerified") && (
                  <span style={{ ...btnDone, background: C.green, color: C.white, border: "none" }}>✓ SENT TO ACCOUNTING</span>
                )}
              </>
            )}

            {/* Total */}
            <span style={{ fontSize: 13, fontWeight: 800, color: cardText, marginLeft: 6 }}>
              {"$"}
              {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            {/* Delete — only if not sent to QB */}
            {!isSent && (
              <span
                aria-label="Delete ticket"
                onClick={(e) => {
                  e.stopPropagation();
                  actions.requestDelete();
                }}
                style={{ fontSize: 14, color: "#ccc", cursor: "pointer", marginLeft: 4, padding: "2px 4px" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = C.red;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "#ccc";
                }}
              >
                🗑
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
