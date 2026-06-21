import { useEffect, useState } from "react";
import { C, API_URL } from "./config.js";
import { useApp } from "./AppContext.jsx";

// ─── TicketCommentThread (v27.75) ───────────────────────────────────────────
// Extracted from TicketDetail.jsx. Self-contained comment thread for site-
// manager ⇄ FTI correspondence on a ticket.
//
// Owns its state (list + input + sending + loading) and its polling loop
// (30s refresh while mounted). Calls onPendingCleared(ticketId) when the
// user posts a reply so the parent can update its cached hasPendingComment
// flag without a full ticket refetch.
//
// Props:
//   ticket — the ticket this thread belongs to (uses id + hasPendingComment)
//   onPendingCleared(ticketId) — optional callback. Fires when the site-
//     manager "COMMENT PENDING" flag should be cleared (after FTI replies).
//
// Comments rendered in two styles: site-manager (yellow) and FTI (blue).

function TicketCommentThread({ ticket, onPendingCleared }) {
  const { currentUser, showNotice } = useApp();
  const [comments, setComments] = useState([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ticket?.id) return;
    let cancelled = false;
    const loadComments = () => {
      fetch(`${API_URL}/signature/comments/${ticket.id}`)
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => {
          if (!cancelled) {
            setComments(data);
            setLoading(false);
          }
        })
        .catch(() => {
          if (!cancelled) setLoading(false);
        });
    };
    setLoading(true);
    loadComments();
    // Ticket was opened — clear any pending-comment flag on the backend.
    if (ticket.hasPendingComment || ticket.has_pending_comment) {
      // v28.230 — only clear the flag in the UI if the backend actually
      // cleared it; otherwise the unread dot lies. Background call → no
      // user-facing error, just don't lie on failure.
      fetch(`${API_URL}/tickets/${ticket.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ has_pending_comment: false }),
      })
        .then((r) => {
          if (r.ok && onPendingCleared) onPendingCleared(ticket.id);
        })
        .catch(() => {});
    }
    const interval = setInterval(loadComments, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket?.id]);

  const sendReply = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      const r = await fetch(`${API_URL}/signature/reply/${ticket.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author: currentUser?.name || "FTI", message: reply.trim() }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        showNotice("Reply Failed", d.error || "Could not post reply.", "error");
        setSending(false);
        return;
      }
      setComments((prev) => [
        ...prev,
        {
          author: currentUser?.name || "FTI",
          author_type: "fti",
          message: reply.trim(),
          created_at: new Date().toISOString(),
        },
      ]);
      setReply("");
      if (onPendingCleared) onPendingCleared(ticket.id);
    } catch (err) {
      showNotice("Reply Failed", err.message, "error");
    }
    setSending(false);
  };

  return (
    <div style={{ marginTop: 20, borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>Site Manager Comments</span>
        {(ticket.hasPendingComment || ticket.has_pending_comment) && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              background: "#fdecea",
              color: "#B01020",
              borderRadius: 4,
              padding: "2px 8px",
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: "0.04em",
              border: "1px solid #B0102044",
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#B01020", display: "inline-block" }} />
            COMMENT PENDING
          </span>
        )}
      </div>
      {loading && <div style={{ fontSize: 12, color: C.muted }}>Loading comments...</div>}
      {!loading && comments.length === 0 && <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>No comments yet.</div>}
      {comments.map((c, i) => {
        const who = c.author_type === "fti" ? `Flo-Test (${c.author})` : `${c.author} (Site)`;
        const bg = c.author_type === "fti" ? "#e8f0fb" : "#fef9e7";
        const time = new Date(c.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
        return (
          <div key={i} style={{ background: bg, borderRadius: 6, padding: "8px 12px", marginBottom: 6 }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 3 }}>
              <strong>{who}</strong> · {time}
            </div>
            <div style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{c.message}</div>
          </div>
        );
      })}
      <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "flex-end" }}>
        <textarea
          style={{
            flex: 1,
            padding: "8px 10px",
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            fontSize: 13,
            minHeight: 50,
            resize: "vertical",
            boxSizing: "border-box",
          }}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Reply to site manager..."
        />
        <button
          type="button"
          style={{
            background: C.blue,
            color: "#fff",
            border: "none",
            borderRadius: 6,
            padding: "8px 16px",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            opacity: sending ? 0.6 : 1,
            whiteSpace: "nowrap",
            height: 36,
          }}
          disabled={sending || !reply.trim()}
          onClick={sendReply}
        >
          {sending ? "Sending..." : "Reply & Email"}
        </button>
      </div>
    </div>
  );
}

export default TicketCommentThread;
