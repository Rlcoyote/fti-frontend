import { useEffect } from "react";
import { C } from "./config.js";

// Injects the heartbeat keyframes once per session. Matches the pattern
// FTIDashboard uses for its mobile CSS — single <style> appended to head.
function useHeartbeatCss() {
  useEffect(() => {
    const id = "fti-branded-splash-css";
    if (document.getElementById(id)) return;
    const s = document.createElement("style");
    s.id = id;
    s.textContent = `
      @keyframes fti-splash-heartbeat {
        0%   { opacity: 0.3; transform: scaleX(0.85); }
        50%  { opacity: 1;   transform: scaleX(1); }
        100% { opacity: 0.3; transform: scaleX(0.85); }
      }
    `;
    document.head.appendChild(s);
  }, []);
}

export default function BrandedSplash({ tagline = "OPERATIONS DASHBOARD" }) {
  useHeartbeatCss();
  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.navy,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Arial', sans-serif",
      }}
    >
      <div style={{ textAlign: "center" }}>
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
            margin: "0 auto 14px",
            boxShadow: `0 0 20px ${C.red}44`,
          }}
        >
          FTI
        </div>
        <div
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: C.white,
            letterSpacing: "0.12em",
            marginBottom: 6,
          }}
        >
          FLO-TEST INC.
        </div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "#a0aec8",
            letterSpacing: "0.14em",
            marginBottom: 18,
          }}
        >
          {tagline}
        </div>
        <div
          style={{
            width: 120,
            height: 2,
            background: C.red,
            margin: "0 auto",
            borderRadius: 1,
            transformOrigin: "center",
            animation: "fti-splash-heartbeat 1.5s ease-in-out infinite",
          }}
        />
      </div>
    </div>
  );
}
