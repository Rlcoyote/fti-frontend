import { useState, useEffect, useRef } from "react";
import { C, API_URL_PUBLIC } from "./config.js";
import { PublicPhotoStrip } from "./PhotoStrip.jsx";
import { useApp } from "./AppContext.jsx";

// ─── PUBLIC SIGNATURE PAGE (no login required) ───────────────────────────────
//
// COLOR DOCTRINE (v28.299, color pass): this page keeps its own RAW HEXES on
// purpose. It is a CUSTOMER-FACING artifact — always light, self-contained,
// deliberately decoupled from the internal theme system (C / TINT / PANEL_*).
// A signer never has a theme; and an internal palette or TINT change must
// NEVER silently restyle a page customers sign like a legal document. If the
// company rebrands, restyle this page as its own conscious act.

// Signing speed sayings
const SIGN_SAYINGS = {
  fast: [
    // Under 1 day
    "You signed faster than a roughneck finds the coffee pot at 5 AM. ☕",
    "That was quicker than a tool pusher dodging a safety meeting. 🏃",
    "You just signed that faster than a company man changes his mind. 🎯",
    "If signing tickets was an Olympic sport, you'd be on the podium. 🥇",
    "Signed before the ink dried on the email. We see you. 👀",
    "Faster than a frac crew finds the lunch truck. 🌮",
    "That signature hit faster than a water hammer on a 2-inch line. 💥",
    "You signed so fast, our servers thought it was a glitch. ⚡",
    "Speed like that deserves a hard hat sticker. 🎖️",
    "If our iron came back as fast as your signatures, we'd never be short. 🏆",
  ],
  average: [
    // 1-3 days
    "Solid turnaround. You're the kind of person who actually returns rental equipment on time. 👍",
    "Not bad. You beat 73% of site managers. The other 27% are still looking for their reading glasses. 👓",
    "Three days? We've seen wellheads take longer to warm up. 🔥",
    "Respectable. Like a good drilling mud — not too fast, not too slow. 🎯",
    "You signed before we had to send the 'friendly reminder.' Our favorite kind of customer. ⭐",
    "That's faster than most people return a phone call in this basin. 📞",
    "Signed, sealed, delivered. Stevie Wonder would be proud. 🎵",
    "Not a land speed record, but we'll take it over a carrier pigeon. 🐦",
  ],
  slow: [
    // 4-7 days
    "We were starting to think you went fishing. Glad you're back. 🎣",
    "That signature took longer than a BOP test, but hey — it passed. ✅",
    "Our accounts receivable department just did a happy dance. You don't want to see that. 💃",
    "Better late than never. That's also what we tell the wireline guys. 🤷",
    "Five days? Even the pumper made it to location faster than that. 🐌",
    "We almost sent a search party. And by search party, we mean Eli with a phone call. 📱",
    "You signed just in time. Our bookkeeper was sharpening her pencil. ✏️",
  ],
  reallySlow: [
    // 7+ days
    "We were about to put your signature on a milk carton. 🥛",
    "Somewhere, a bookkeeper just unclenched. 😮‍💨",
    "If this ticket aged any longer, we could've sold it as vintage. 🍷",
    "The iron on this job has been picked up, cleaned, and redeployed. Twice. 🔄",
    "Legend has it, this ticket was emailed during a different geological era. 🦕",
    "Our office plant grew two inches waiting for this signature. 🌱",
    "You know what's faster than your signature? Continental drift. 🌍",
    "We were one day away from sending it by carrier pigeon. 🕊️",
    "Signed! And the crowd goes mild! 👏",
  ],
};

const SIGN_QUOTES = [
  "Whatever you do, work at it with all your heart. — Colossians 3:23",
  "The hand of the diligent will rule. — Proverbs 12:24",
  "Integrity is doing the right thing, even when no one is watching. — C.S. Lewis",
  "A good name is more desirable than great riches. — Proverbs 22:1",
  "Well done is better than well said. — Benjamin Franklin",
  "Commit your work to the Lord, and your plans will be established. — Proverbs 16:3",
  "The only way to do great work is to love what you do. — Steve Jobs",
  "Excellence is not a skill. It is an attitude. — Ralph Marston",
];

const SIGN_THANKS = [
  "All jokes aside, we genuinely appreciate your business — a lot.",
  "Thank you. We really need the work!",
  "Thanks a lot! For real, we sincerely appreciate you.",
  "Your partnership keeps our crews working and our families fed. Thank you.",
  "We don't take your business for granted. Not even a little.",
  "Seriously though — thank you for trusting us with the job.",
  "You keep us busy and we keep you flowing. That's a good deal.",
  "We appreciate you more than a fresh pot of coffee at 5 AM.",
  "From all of us at Flo-Test — thank you for your continued trust.",
  "Your business means the world to us. We mean that.",
  "Thanks for making our job possible. We won't let you down.",
  "We're grateful for the opportunity. Every single time.",
  "Behind every signed ticket is a crew that's thankful for the work. That's us.",
  "You could've called anyone. You called us. That means something.",
  "Thank you for keeping us in the field. It's where we belong.",
  "We don't just appreciate your business — we respect it.",
  "One more signed ticket, one more reason to be grateful. Thank you.",
  "Real talk: we appreciate you choosing Flo-Test. Every time.",
];

function SigningTracker({ emailedAt, signedAt }) {
  if (!emailedAt || !signedAt) return null;
  const sent = new Date(emailedAt);
  const signed = new Date(signedAt);
  const diffMs = signed - sent;
  if (diffMs < 0) return null;

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  let tier = "fast";
  if (days >= 7) tier = "reallySlow";
  else if (days >= 4) tier = "slow";
  else if (days >= 1) tier = "average";

  const sayings = SIGN_SAYINGS[tier];
  const sayingIndex = Math.abs((sent.getTime() + signed.getTime()) % sayings.length);
  const saying = sayings[sayingIndex];

  const quoteIndex = Math.abs(sent.getTime() % SIGN_QUOTES.length);
  const quote = SIGN_QUOTES[quoteIndex];

  const thanksIndex = Math.abs(signed.getTime() % SIGN_THANKS.length);
  const thanks = SIGN_THANKS[thanksIndex];

  const tierColors = {
    fast: { bg: "#e6f5ec", border: "#1a7a3c44", text: "#1a7a3c" },
    average: { bg: "#e8f0fb", border: "#00286844", text: "#002868" },
    slow: { bg: "#fdf5d8", border: "#e6c20044", text: "#8a6500" },
    reallySlow: { bg: "#fdecea", border: "#B0102044", text: "#B01020" },
  };
  const colors = tierColors[tier];

  const timeStr = days > 0 ? `${days}d ${hours}h ${minutes}m` : hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  return (
    <div style={{ marginTop: 16, borderRadius: 8, overflow: "hidden" }}>
      <div style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 8, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: colors.text, letterSpacing: "0.04em" }}>SIGNING TIME</span>
          <span style={{ fontSize: 16, fontWeight: 800, color: colors.text }}>{timeStr}</span>
        </div>
        <div style={{ fontSize: 14, color: colors.text, fontWeight: 600, lineHeight: 1.5, marginBottom: 10 }}>{saying}</div>
        <div style={{ fontSize: 13, color: "#1a2340", fontWeight: 600, marginBottom: 10 }}>{thanks}</div>
        <div style={{ fontSize: 11, color: "#4a5570", fontStyle: "italic", borderTop: "1px solid #d0d8e8", paddingTop: 8 }}>{quote}</div>
      </div>
    </div>
  );
}

function PublicSignPage({ token }) {
  const { showNotice } = useApp();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [printedName, setPrintedName] = useState("");
  const [commentName, setCommentName] = useState("");
  const [commentMsg, setCommentMsg] = useState("");
  const [comments, setComments] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);
  const [done, setDone] = useState(false);
  const [isSigned, setIsSigned] = useState(false);
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const lastPoint = useRef(null);

  useEffect(() => {
    fetch(`${API_URL_PUBLIC}/signature/${token}`)
      .then(async (r) => {
        if (r.status === 410) {
          setError("This signature link has expired.");
          setLoading(false);
          return;
        }
        if (!r.ok) {
          setError("Invalid or expired link.");
          setLoading(false);
          return;
        }
        const data = await r.json();
        setTicket(data);
        setComments(data.comments || []);
        setIsSigned(data.isSigned || false);
        setLoading(false);
      })
      .catch(() => {
        setError("Unable to load ticket.");
        setLoading(false);
      });
  }, [token]);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    return {
      x: (touch.clientX - rect.left) * (canvasRef.current.width / rect.width),
      y: (touch.clientY - rect.top) * (canvasRef.current.height / rect.height),
    };
  };
  const startDraw = (e) => {
    e.preventDefault();
    isDrawing.current = true;
    lastPoint.current = getPos(e);
  };
  const draw = (e) => {
    if (!isDrawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const p = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.strokeStyle = "#1a2340";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.stroke();
    lastPoint.current = p;
  };
  const endDraw = () => {
    isDrawing.current = false;
    lastPoint.current = null;
  };
  const clearSig = () => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  const isCanvasBlank = () => {
    const c = canvasRef.current,
      blank = document.createElement("canvas");
    blank.width = c.width;
    blank.height = c.height;
    return c.toDataURL() === blank.toDataURL();
  };

  const handleSign = async () => {
    if (!printedName.trim()) {
      showNotice("Printed Name Required", "Please enter your printed name before signing.", "error");
      return;
    }
    if (isCanvasBlank()) {
      showNotice("Signature Required", "Please draw your signature in the box before submitting.", "error");
      return;
    }
    setSubmitting(true);
    try {
      const sigImg = canvasRef.current.toDataURL("image/png");
      const r = await fetch(`${API_URL_PUBLIC}/signature/${token}/sign`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signed_by: printedName.trim(), signature_img: sigImg }),
      });
      if (!r.ok) {
        const d = await r.json();
        showNotice("Signature Failed", d.error || "Could not submit your signature.", "error");
        setSubmitting(false);
        return;
      }
      const result = await r.json();
      setDone(true);
      setIsSigned(true);
      setTicket((prev) => ({
        ...prev,
        isSigned: true,
        signed_by: printedName.trim(),
        signed_at: new Date().toISOString(),
        signature_img: sigImg,
        emailed_at: result.emailed_at || prev.emailed_at,
      }));
    } catch {
      showNotice("Network Error", "Please check your connection and try again.", "error");
      setSubmitting(false);
    }
  };

  const handleComment = async () => {
    if (!commentName.trim() || !commentMsg.trim()) {
      showNotice("Comment Incomplete", "Please enter both your name and a comment before sending.", "error");
      return;
    }
    setSendingComment(true);
    try {
      const r = await fetch(`${API_URL_PUBLIC}/signature/${token}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author: commentName.trim(), message: commentMsg.trim() }),
      });
      if (!r.ok) {
        const d = await r.json();
        showNotice("Comment Failed", d.error || "Could not post your comment.", "error");
        setSendingComment(false);
        return;
      }
      setComments((prev) => [
        ...prev,
        { author: commentName.trim(), author_type: "site_mgr", message: commentMsg.trim(), created_at: new Date().toISOString() },
      ]);
      setCommentMsg("");
      setSendingComment(false);
    } catch {
      showNotice("Network Error", "Please check your connection and try again.", "error");
      setSendingComment(false);
    }
  };

  let wells = [];
  if (ticket?.well_name) {
    try {
      const parsed = typeof ticket.well_name === "string" ? JSON.parse(ticket.well_name) : ticket.well_name;
      if (Array.isArray(parsed)) wells = parsed.map((w) => w.well_name).filter(Boolean);
    } catch {
      wells = [ticket.well_name];
    }
  }

  const grandTotal = (ticket?.lineItems || []).reduce(
    (sum, li) => sum + (parseFloat(li.rate) || 0) * (parseFloat(li.qty) || 0) * (parseFloat(li.days) || 1),
    0,
  );

  const S = {
    page: { minHeight: "100vh", background: "#f0f3f8", fontFamily: "system-ui, sans-serif", padding: "24px 16px", color: "#1a2340" },
    card: { maxWidth: 700, margin: "0 auto", background: "#fff", borderRadius: 8, border: "1px solid #d0d8e8", overflow: "hidden" },
    header: { background: "#B01020", padding: "16px 24px", color: "#fff" },
    body: { padding: "24px" },
    row: { display: "flex", gap: 16, marginBottom: 8, fontSize: 14 },
    label: { fontWeight: 700, minWidth: 120 },
    table: { width: "100%", borderCollapse: "collapse", fontSize: 13, marginTop: 16 },
    th: { padding: "8px 10px", background: "#f0f3f8", borderBottom: "2px solid #d0d8e8", textAlign: "left", fontWeight: 700 },
    td: { padding: "8px 10px", borderBottom: "1px solid #e4e9f2" },
    tdR: { padding: "8px 10px", borderBottom: "1px solid #e4e9f2", textAlign: "right" },
    tdC: { padding: "8px 10px", borderBottom: "1px solid #e4e9f2", textAlign: "center" },
    input: { width: "100%", padding: "10px 12px", border: "1px solid #d0d8e8", borderRadius: 6, fontSize: 15, marginTop: 4, boxSizing: "border-box" },
    textarea: {
      width: "100%",
      padding: "10px 12px",
      border: "1px solid #d0d8e8",
      borderRadius: 6,
      fontSize: 14,
      marginTop: 4,
      minHeight: 80,
      resize: "vertical",
      boxSizing: "border-box",
    },
    btn: { background: "#B01020", color: "#fff", border: "none", borderRadius: 6, padding: "12px 32px", fontSize: 16, fontWeight: 700, cursor: "pointer" },
    btnSm: { background: "#1a5fa8", color: "#fff", border: "none", borderRadius: 6, padding: "8px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  };

  if (loading)
    return (
      <div style={S.page}>
        <div style={{ ...S.card, padding: 40, textAlign: "center" }}>Loading ticket...</div>
      </div>
    );
  if (error)
    return (
      <div style={S.page}>
        <div style={S.card}>
          <div style={{ ...S.header, background: "#8a6500" }}>
            <h2 style={{ margin: 0, fontSize: 20, color: "#fff" }}>Flo-Test Inc.</h2>
          </div>
          <div style={{ padding: 32, textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>⏰</div>
            <h2 style={{ color: "#8a6500", margin: "8px 0" }}>{error}</h2>
            <p style={{ color: "#4a5570", fontSize: 14, lineHeight: 1.6 }}>
              {error.includes("expired")
                ? "This signature link is no longer valid. Please contact Flo-Test Inc. to request a new link."
                : "The link you followed is invalid. Please check your email for the correct link or contact Flo-Test Inc."}
            </p>
          </div>
        </div>
      </div>
    );

  // Voided ticket — show notice with link to replacement
  if (ticket.isVoided) {
    const repNum = ticket.replacementInfo ? `${ticket.job_num}-${ticket.replacementInfo.ticketNumber}` : null;
    const repLink = ticket.replacementInfo?.signToken ? `/sign/${ticket.replacementInfo.signToken}` : null;
    return (
      <div style={S.page}>
        <div style={S.card}>
          <div style={{ ...S.header, background: "#B01020" }}>
            <h2 style={{ margin: 0, fontSize: 20, color: "#fff" }}>Flo-Test Inc. — Ticket Voided</h2>
          </div>
          <div style={{ padding: 32, textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>✕</div>
            <h2 style={{ color: "#B01020", margin: "8px 0" }}>
              Ticket #{ticket.job_num}
              {ticket.ticket_number ? `-${ticket.ticket_number}` : ""} has been voided
            </h2>
            <p style={{ color: "#4a5570", fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
              This ticket is no longer valid. {repNum ? `It has been replaced by ticket #${repNum}.` : "A replacement ticket will be sent separately."}
            </p>
            {repLink && (
              <a
                href={repLink}
                style={{
                  display: "inline-block",
                  background: "#002868",
                  color: "#fff",
                  padding: "12px 28px",
                  borderRadius: 6,
                  textDecoration: "none",
                  fontWeight: 700,
                  fontSize: 15,
                }}
              >
                View Replacement Ticket #{repNum}
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  const signedNow = done || isSigned;

  return (
    <div style={S.page}>
      <style>{`@media print { .no-print { display: none !important; } @page { size: letter; margin: 0.5in; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }`}</style>
      <div style={S.card}>
        <div style={S.header}>
          <h2 style={{ margin: 0, fontSize: 20 }}>Flo-Test Inc. — Field Ticket</h2>
          <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>
            #{ticket.job_num}
            {ticket.ticket_number ? `-${ticket.ticket_number}` : ""} — {signedNow ? "Signed" : "Signature Requested"}
          </div>
        </div>
        <div style={S.body}>
          <div style={S.row}>
            <span style={S.label}>Ticket #</span>
            <span>
              {ticket.job_num}
              {ticket.ticket_number ? `-${ticket.ticket_number}` : ""}
            </span>
          </div>
          <div style={S.row}>
            <span style={S.label}>Customer</span>
            <span>{ticket.customer}</span>
          </div>
          <div style={S.row}>
            <span style={S.label}>Type</span>
            <span>{(ticket.type || "").toUpperCase()}</span>
          </div>
          <div style={S.row}>
            <span style={S.label}>Date</span>
            <span>{ticket.date ? new Date(ticket.date).toLocaleDateString("en-US") : ""}</span>
          </div>
          {wells.length > 0 && (
            <div style={S.row}>
              <span style={S.label}>Well(s)</span>
              <span>{wells.join(", ")}</span>
            </div>
          )}
          <div style={S.row}>
            <span style={S.label}>Location</span>
            <span>
              {ticket.location_county}, {ticket.location_state}
            </span>
          </div>
          {ticket.notes && (
            <div style={S.row}>
              <span style={S.label}>Notes</span>
              <span>{ticket.notes}</span>
            </div>
          )}

          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Description</th>
                <th style={{ ...S.th, textAlign: "right" }}>Rate</th>
                <th style={{ ...S.th, textAlign: "center" }}>Qty</th>
                <th style={{ ...S.th, textAlign: "center" }}>Days</th>
                <th style={{ ...S.th, textAlign: "right" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {(ticket.lineItems || []).map((li, i) => {
                const t = (parseFloat(li.rate) || 0) * (parseFloat(li.qty) || 0) * (parseFloat(li.days) || 1);
                return (
                  <tr key={i}>
                    <td style={S.td}>{li.description}</td>
                    <td style={S.tdR}>${parseFloat(li.rate || 0).toFixed(2)}</td>
                    <td style={S.tdC}>{li.qty}</td>
                    <td style={S.tdC}>{li.days || 1}</td>
                    <td style={S.tdR}>${t.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} style={{ ...S.td, textAlign: "right", fontWeight: 700, borderTop: "2px solid #d0d8e8" }}>
                  Grand Total
                </td>
                <td style={{ ...S.tdR, fontWeight: 700, borderTop: "2px solid #d0d8e8" }}>${grandTotal.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>

          {/* Signature Section */}
          <div style={{ marginTop: 28, borderTop: "2px solid #d0d8e8", paddingTop: 20 }}>
            {signedNow ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#1a7a3c" }}>✓ Ticket Signed</div>
                  <button
                    type="button"
                    className="no-print"
                    onClick={() => window.print()}
                    style={{
                      background: "#002868",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      padding: "8px 20px",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    PRINT
                  </button>
                </div>
                <div style={S.row}>
                  <span style={S.label}>Signed By</span>
                  <span>{ticket.signed_by}</span>
                </div>
                <div style={S.row}>
                  <span style={S.label}>Signed At</span>
                  <span>{ticket.signed_at ? new Date(ticket.signed_at).toLocaleString("en-US") : ""}</span>
                </div>
                {ticket.signature_img && (
                  <img
                    src={ticket.signature_img}
                    alt="Signature"
                    style={{ border: "1px solid #d0d8e8", borderRadius: 6, maxWidth: "100%", height: 100, objectFit: "contain", background: "#fafbfc" }}
                  />
                )}
                <SigningTracker emailedAt={ticket.emailed_at} signedAt={ticket.signed_at} />
              </>
            ) : (
              <>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Sign Below</div>
                {ticket.emailed_at && (
                  <div style={{ fontSize: 11, color: "#4a5570", marginBottom: 10, display: "flex", gap: 8, alignItems: "center" }}>
                    <span>
                      Sent:{" "}
                      {new Date(ticket.emailed_at).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                )}
                <div style={{ fontSize: 12, color: "#4a5570", marginBottom: 10 }}>Print your name, then sign in the box below.</div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontWeight: 600, fontSize: 13 }}>Printed Name</label>
                  <input style={S.input} value={printedName} onChange={(e) => setPrintedName(e.target.value)} placeholder="Your full name" />
                </div>
                <div style={{ border: "1px solid #d0d8e8", borderRadius: 6, background: "#fafbfc", position: "relative" }}>
                  <canvas
                    ref={canvasRef}
                    width={650}
                    height={160}
                    style={{ width: "100%", height: 160, touchAction: "none", cursor: "crosshair" }}
                    onMouseDown={startDraw}
                    onMouseMove={draw}
                    onMouseUp={endDraw}
                    onMouseLeave={endDraw}
                    onTouchStart={startDraw}
                    onTouchMove={draw}
                    onTouchEnd={endDraw}
                  />
                  <button
                    type="button"
                    onClick={clearSig}
                    style={{
                      position: "absolute",
                      top: 6,
                      right: 6,
                      background: "#e4e9f2",
                      border: "none",
                      borderRadius: 4,
                      padding: "4px 10px",
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    Clear
                  </button>
                </div>
                <div style={{ marginTop: 16, textAlign: "center" }}>
                  <button style={{ ...S.btn, opacity: submitting ? 0.6 : 1 }} onClick={handleSign} disabled={submitting}>
                    {submitting ? "Submitting..." : "Submit Signature"}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Photos */}
          {ticket.id && <PublicPhotoStrip ticketId={ticket.id} />}

          {/* Comment Thread */}
          <div className="no-print" style={{ marginTop: 28, borderTop: "2px solid #d0d8e8", paddingTop: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Comments</div>
            {comments.length === 0 && <div style={{ fontSize: 13, color: "#4a5570", marginBottom: 12 }}>No comments yet.</div>}
            {comments.map((c, i) => {
              const who = c.author_type === "fti" ? `Flo-Test (${c.author})` : `${c.author} (Site)`;
              const bg = c.author_type === "fti" ? "#e8f0fb" : "#fef9e7";
              const time = new Date(c.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
              return (
                <div key={i} style={{ background: bg, borderRadius: 6, padding: "10px 14px", marginBottom: 8 }}>
                  <div style={{ fontSize: 12, color: "#4a5570", marginBottom: 4 }}>
                    <strong>{who}</strong> · {time}
                  </div>
                  <div style={{ fontSize: 14, whiteSpace: "pre-wrap" }}>{c.message}</div>
                </div>
              );
            })}
            <div style={{ marginTop: 12 }}>
              <label style={{ fontWeight: 600, fontSize: 13 }}>Your Name</label>
              <input style={S.input} value={commentName} onChange={(e) => setCommentName(e.target.value)} placeholder="Your name" />
            </div>
            <div style={{ marginTop: 8 }}>
              <label style={{ fontWeight: 600, fontSize: 13 }}>Comment</label>
              <textarea
                style={S.textarea}
                value={commentMsg}
                onChange={(e) => setCommentMsg(e.target.value)}
                placeholder="Questions, clarifications, or notes..."
              />
            </div>
            <div style={{ marginTop: 10 }}>
              <button style={{ ...S.btnSm, opacity: sendingComment ? 0.6 : 1 }} onClick={handleComment} disabled={sendingComment}>
                {sendingComment ? "Sending..." : "Send Comment"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PublicSignPage;
