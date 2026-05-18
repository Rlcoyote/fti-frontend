import { C } from "./config.js";
import { APP_VERSION } from "./version.js";

// ─── LoginCardHeader (v28.158 — ship 1 of the LoginScreen split) ──────────
// The login card's title block: the FTI badge, the FLO-TEST INC. wordmark,
// the mode-dependent subtitle + app version, and the Privacy / SMS legal
// links. Presentational — LoginScreen computes which subtitle applies
// (login vs forgot vs reset vs a biometric step) and passes it in.

function LoginCardHeader({ subtitle }) {
  return (
    <div style={{ textAlign: "center", marginBottom: 32 }}>
      <div
        style={{
          width: 56,
          height: 56,
          border: `3px solid ${C.red}`,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: C.blue,
          fontSize: 18,
          fontWeight: 900,
          color: C.white,
          margin: "0 auto 12px",
          boxShadow: `0 0 20px ${C.red}44`,
        }}
      >
        FTI
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, color: C.text, letterSpacing: "0.1em" }}>FLO-TEST INC.</div>
      <div style={{ fontSize: 11, color: C.muted, letterSpacing: "0.12em", marginTop: 4 }}>
        {subtitle} <span style={{ color: C.muted, fontWeight: 700 }}>{APP_VERSION}</span>
      </div>
      <div style={{ fontSize: 10, color: C.muted, letterSpacing: "0.04em", marginTop: 6 }}>
        <a href="https://www.flotest.com/privacy-policy/" target="_blank" rel="noopener noreferrer" style={{ color: C.blue, textDecoration: "underline" }}>
          Privacy Policy
        </a>
        {" · "}
        <a href="https://www.flotest.com/sms-terms/" target="_blank" rel="noopener noreferrer" style={{ color: C.blue, textDecoration: "underline" }}>
          SMS Terms
        </a>
      </div>
    </div>
  );
}

export default LoginCardHeader;
