import React from "react";
import { C } from "./config.js";

// ─── ErrorBoundary (v28.323) ─────────────────────────────────────────────────
// The app had NO error boundary: any render crash anywhere white-screened
// the ENTIRE app (found via the E2E arc — a bad required-signers shape took
// the whole tree down from one component). A field hand must never see a
// blank page (Article XIV): they get a plain card naming the problem and a
// RELOAD button. The crash class stays visible — the error text renders so
// a crew can read it off the screen — but it can no longer take the app.

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.pageBg, padding: 20 }}>
        <div
          style={{
            background: C.cardBg,
            border: `1px solid ${C.border}`,
            borderTop: `4px solid ${C.red}`,
            borderRadius: 8,
            padding: 28,
            maxWidth: 420,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 8 }}>Something went wrong</div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>
            The app hit an unexpected error. Reload to keep working — nothing you saved is lost.
          </div>
          <div style={{ fontSize: 10, color: C.muted, marginBottom: 16, wordBreak: "break-word" }}>{String(this.state.error?.message || this.state.error)}</div>
          <button
            className="fti-btn"
            onClick={() => window.location.reload()}
            style={{
              background: C.red,
              color: C.white,
              border: "none",
              borderRadius: 4,
              padding: "10px 28px",
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: "0.06em",
              cursor: "pointer",
            }}
          >
            RELOAD
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
