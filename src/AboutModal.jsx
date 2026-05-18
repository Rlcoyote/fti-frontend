import { C } from "./config.js";
import { Btn } from "./SharedUI.jsx";
import { APP_VERSION } from "./version.js";

// ─── AboutModal ─────────────────────────────────────────────────────────────
// The app's "About" surface — opened from the gear menu (desktop) and the
// nav drawer (mobile). Holds app identity + build version + the legal links
// (Privacy Policy, SMS Terms — both on the marketing site, www.flotest.com,
// which is also where the Twilio A2P campaign points). Deliberately one small
// surface so future items (support contact, what's-new) have an obvious home
// instead of scattering across the app.

const LINK_STYLE = { color: C.blue, textDecoration: "underline" };

function AboutModal({ onClose }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}
      onClick={onClose}
    >
      <div
        style={{
          background: C.cardBg,
          border: `1px solid ${C.border}`,
          borderTop: `4px solid ${C.red}`,
          borderRadius: 8,
          padding: 28,
          width: 360,
          maxWidth: "95vw",
          textAlign: "center",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            width: 52,
            height: 52,
            border: `2px solid ${C.red}`,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: C.blue,
            fontSize: 16,
            fontWeight: 900,
            color: C.white,
            margin: "0 auto 14px",
            boxShadow: `0 0 16px ${C.red}44`,
          }}
        >
          FTI
        </div>
        <div style={{ fontSize: 16, fontWeight: 800, color: C.text, letterSpacing: "0.08em" }}>FLO-TEST INC.</div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Operations Application</div>
        <div style={{ fontSize: 12, color: C.muted, fontWeight: 700, marginTop: 8 }}>{APP_VERSION}</div>

        <div style={{ borderTop: `1px solid ${C.border}`, margin: "18px 0 14px" }} />

        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
          <a href="https://www.flotest.com/privacy-policy/" target="_blank" rel="noopener noreferrer" style={LINK_STYLE}>
            Privacy Policy
          </a>
          {" · "}
          <a href="https://www.flotest.com/sms-terms/" target="_blank" rel="noopener noreferrer" style={LINK_STYLE}>
            SMS Terms
          </a>
        </div>

        <div style={{ marginTop: 20 }}>
          <Btn variant="ghost" onClick={onClose}>
            CLOSE
          </Btn>
        </div>
      </div>
    </div>
  );
}

export default AboutModal;
