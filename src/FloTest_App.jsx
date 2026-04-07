import { useState, useMemo, useEffect, useRef } from "react";

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const C = {
  red: "#B01020", white: "#FFFFFF", blue: "#002868", darkBlue: "#002060",
  steel: "#f0f3f8", lightSteel: "#e4e9f2", muted: "#4a5570",
  border: "#d0d8e8", cardBg: "#ffffff", pageBg: "#f0f3f8",
  text: "#1a2340", green: "#1a7a3c", orange: "#b85c00", yellow: "#8a6500",
  overdue: "#B01020", overdueB: "#fdf0f0",
  priHigh: "#B01020", priHighB: "#fdecea",
  priLow: "#1a5fa8", priLowB: "#e8f0fb",
};

const STATUS_CONFIG = {
  Scheduled:    { color: "#1a5fa8", bg: "#e8f0fb", label: "SCHEDULED" },
  "In Progress":{ color: "#1a7a3c", bg: "#e6f5ec", label: "IN PROGRESS" },
  Completed:    { color: "#6b7a99", bg: "#f0f3f8", label: "COMPLETED" },
};
const STATUS_ORDER = ["Scheduled", "In Progress", "Completed"];

const USERS_DEFAULT = [];
let CURRENT_USER = "";  // Set dynamically after login

// ─── LOGIN SCREEN ────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("login"); // login | forgot | reset
  const [msg, setMsg] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [resetToken, setResetToken] = useState(null);
  const [resetUid, setResetUid] = useState(null);

  // Check URL for reset token on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("reset");
    const uid = params.get("uid");
    if (token && uid) {
      setResetToken(token);
      setResetUid(uid);
      setMode("reset");
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password) { setError("Email and password required"); return; }
    setLoading(true); setError("");
    try {
      const r = await fetch(`${API_URL}/auth/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = await r.json();
      if (r.ok) { onLogin(data); } else { setError(data.error || "Login failed"); }
    } catch (err) { setError("Connection error — check internet"); }
    finally { setLoading(false); }
  };

  const handleForgot = async () => {
    if (!email.trim()) { setError("Enter your email first"); return; }
    setLoading(true); setError(""); setMsg("");
    try {
      const r = await fetch(`${API_URL}/auth/forgot-password`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await r.json();
      setMsg(data.message || "Check your email for a reset link.");
    } catch (err) { setError("Connection error"); }
    finally { setLoading(false); }
  };

  const handleReset = async () => {
    if (!newPw || !confirmPw) { setError("Both fields required"); return; }
    if (newPw !== confirmPw) { setError("Passwords don't match"); return; }
    if (newPw.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true); setError(""); setMsg("");
    try {
      const r = await fetch(`${API_URL}/auth/reset-password`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: resetUid, token: resetToken, password: newPw }),
      });
      const data = await r.json();
      if (r.ok) { setMsg(data.message); setMode("login"); setResetToken(null); setResetUid(null); }
      else { setError(data.error || "Reset failed"); }
    } catch (err) { setError("Connection error"); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", background: C.darkBlue, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: C.cardBg, borderRadius: 8, padding: 40, width: 380, maxWidth: "90vw", borderTop: `4px solid ${C.red}` }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, border: `3px solid ${C.red}`, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: C.blue, fontSize: 18, fontWeight: 900, color: C.white,
            margin: "0 auto 12px", boxShadow: `0 0 20px ${C.red}44`,
          }}>FTI</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.text, letterSpacing: "0.1em" }}>FLO-TEST INC.</div>
          <div style={{ fontSize: 11, color: C.muted, letterSpacing: "0.12em", marginTop: 4 }}>
            {mode === "login" ? "OPERATIONS DASHBOARD" : mode === "forgot" ? "PASSWORD RESET" : "SET NEW PASSWORD"}
          </div>
        </div>

        {mode === "login" && (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>EMAIL</label>
              <input style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@flotest.com" onKeyDown={e => e.key === "Enter" && handleLogin()} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>PASSWORD</label>
              <input style={inputStyle} type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••" onKeyDown={e => e.key === "Enter" && handleLogin()} />
            </div>
            <div style={{ textAlign: "right", marginBottom: 16 }}>
              <span onClick={() => { setMode("forgot"); setError(""); setMsg(""); }} style={{ fontSize: 11, color: C.blue, cursor: "pointer", fontWeight: 600 }}>Forgot password?</span>
            </div>
            {error && <div style={{ color: C.red, fontSize: 12, fontWeight: 700, marginBottom: 12, textAlign: "center" }}>{error}</div>}
            {msg && <div style={{ color: C.green, fontSize: 12, fontWeight: 700, marginBottom: 12, textAlign: "center" }}>{msg}</div>}
            <button onClick={handleLogin} disabled={loading} style={{
              width: "100%", padding: "12px 0", background: C.red, color: C.white, border: "none",
              borderRadius: 4, fontSize: 14, fontWeight: 700, cursor: loading ? "default" : "pointer",
              letterSpacing: "0.06em", opacity: loading ? 0.6 : 1,
            }}>{loading ? "SIGNING IN..." : "SIGN IN"}</button>
          </>
        )}

        {mode === "forgot" && (
          <>
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>EMAIL</label>
              <input style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@flotest.com" onKeyDown={e => e.key === "Enter" && handleForgot()} />
            </div>
            {error && <div style={{ color: C.red, fontSize: 12, fontWeight: 700, marginBottom: 12, textAlign: "center" }}>{error}</div>}
            {msg && <div style={{ color: C.green, fontSize: 12, fontWeight: 700, marginBottom: 12, textAlign: "center" }}>{msg}</div>}
            <button onClick={handleForgot} disabled={loading} style={{
              width: "100%", padding: "12px 0", background: C.red, color: C.white, border: "none",
              borderRadius: 4, fontSize: 14, fontWeight: 700, cursor: loading ? "default" : "pointer",
              letterSpacing: "0.06em", opacity: loading ? 0.6 : 1, marginBottom: 12,
            }}>{loading ? "SENDING..." : "SEND RESET LINK"}</button>
            <div style={{ textAlign: "center" }}>
              <span onClick={() => { setMode("login"); setError(""); setMsg(""); }} style={{ fontSize: 11, color: C.blue, cursor: "pointer", fontWeight: 600 }}>Back to login</span>
            </div>
          </>
        )}

        {mode === "reset" && (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>NEW PASSWORD</label>
              <input style={inputStyle} type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
                placeholder="Min 6 characters" />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>CONFIRM PASSWORD</label>
              <input style={inputStyle} type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                placeholder="Re-enter password" onKeyDown={e => e.key === "Enter" && handleReset()} />
            </div>
            {error && <div style={{ color: C.red, fontSize: 12, fontWeight: 700, marginBottom: 12, textAlign: "center" }}>{error}</div>}
            {msg && <div style={{ color: C.green, fontSize: 12, fontWeight: 700, marginBottom: 12, textAlign: "center" }}>{msg}</div>}
            <button onClick={handleReset} disabled={loading} style={{
              width: "100%", padding: "12px 0", background: C.red, color: C.white, border: "none",
              borderRadius: 4, fontSize: 14, fontWeight: 700, cursor: loading ? "default" : "pointer",
              letterSpacing: "0.06em", opacity: loading ? 0.6 : 1,
            }}>{loading ? "RESETTING..." : "SET NEW PASSWORD"}</button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── PUBLIC SIGNATURE PAGE (no login required) ───────────────────────────────
const API_URL_PUBLIC = "https://fti-app-production.up.railway.app/api";

// Signing speed sayings
const SIGN_SAYINGS = {
  fast: [ // Under 1 day
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
  average: [ // 1-3 days
    "Solid turnaround. You're the kind of person who actually returns rental equipment on time. 👍",
    "Not bad. You beat 73% of site managers. The other 27% are still looking for their reading glasses. 👓",
    "Three days? We've seen wellheads take longer to warm up. 🔥",
    "Respectable. Like a good drilling mud — not too fast, not too slow. 🎯",
    "You signed before we had to send the 'friendly reminder.' Our favorite kind of customer. ⭐",
    "That's faster than most people return a phone call in this basin. 📞",
    "Signed, sealed, delivered. Stevie Wonder would be proud. 🎵",
    "Not a land speed record, but we'll take it over a carrier pigeon. 🐦",
  ],
  slow: [ // 4-7 days
    "We were starting to think you went fishing. Glad you're back. 🎣",
    "That signature took longer than a BOP test, but hey — it passed. ✅",
    "Our accounts receivable department just did a happy dance. You don't want to see that. 💃",
    "Better late than never. That's also what we tell the wireline guys. 🤷",
    "Five days? Even the pumper made it to location faster than that. 🐌",
    "We almost sent a search party. And by search party, we mean Eli with a phone call. 📱",
    "You signed just in time. Our bookkeeper was sharpening her pencil. ✏️",
  ],
  reallySlow: [ // 7+ days
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
        <div style={{ fontSize: 14, color: colors.text, fontWeight: 600, lineHeight: 1.5, marginBottom: 10 }}>
          {saying}
        </div>
        <div style={{ fontSize: 13, color: "#1a2340", fontWeight: 600, marginBottom: 10 }}>
          {thanks}
        </div>
        <div style={{ fontSize: 11, color: "#4a5570", fontStyle: "italic", borderTop: "1px solid #d0d8e8", paddingTop: 8 }}>
          {quote}
        </div>
      </div>
    </div>
  );
}

function PublicSignPage({ token }) {
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
      .then(async r => {
        if (r.status === 410) { setError("This signature link has expired."); setLoading(false); return; }
        if (!r.ok) { setError("Invalid or expired link."); setLoading(false); return; }
        const data = await r.json();
        setTicket(data);
        setComments(data.comments || []);
        setIsSigned(data.isSigned || false);
        setLoading(false);
      })
      .catch(() => { setError("Unable to load ticket."); setLoading(false); });
  }, [token]);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    return { x: (touch.clientX - rect.left) * (canvasRef.current.width / rect.width), y: (touch.clientY - rect.top) * (canvasRef.current.height / rect.height) };
  };
  const startDraw = (e) => { e.preventDefault(); isDrawing.current = true; lastPoint.current = getPos(e); };
  const draw = (e) => {
    if (!isDrawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const p = getPos(e);
    ctx.beginPath(); ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(p.x, p.y); ctx.strokeStyle = "#1a2340"; ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.stroke();
    lastPoint.current = p;
  };
  const endDraw = () => { isDrawing.current = false; lastPoint.current = null; };
  const clearSig = () => { const ctx = canvasRef.current.getContext("2d"); ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height); };

  const isCanvasBlank = () => {
    const c = canvasRef.current, blank = document.createElement("canvas");
    blank.width = c.width; blank.height = c.height;
    return c.toDataURL() === blank.toDataURL();
  };

  const handleSign = async () => {
    if (!printedName.trim()) { alert("Please enter your printed name."); return; }
    if (isCanvasBlank()) { alert("Please provide your signature."); return; }
    setSubmitting(true);
    try {
      const sigImg = canvasRef.current.toDataURL("image/png");
      const r = await fetch(`${API_URL_PUBLIC}/signature/${token}/sign`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signed_by: printedName.trim(), signature_img: sigImg }),
      });
      if (!r.ok) { const d = await r.json(); alert(d.error || "Signature failed."); setSubmitting(false); return; }
      const result = await r.json();
      setDone(true); setIsSigned(true);
      setTicket(prev => ({
        ...prev, isSigned: true, signed_by: printedName.trim(),
        signed_at: new Date().toISOString(), signature_img: sigImg,
        emailed_at: result.emailed_at || prev.emailed_at,
      }));
    } catch { alert("Network error. Please try again."); setSubmitting(false); }
  };

  const handleComment = async () => {
    if (!commentName.trim() || !commentMsg.trim()) { alert("Please enter your name and comment."); return; }
    setSendingComment(true);
    try {
      const r = await fetch(`${API_URL_PUBLIC}/signature/${token}/comment`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author: commentName.trim(), message: commentMsg.trim() }),
      });
      if (!r.ok) { const d = await r.json(); alert(d.error || "Comment failed."); setSendingComment(false); return; }
      setComments(prev => [...prev, { author: commentName.trim(), author_type: "site_mgr", message: commentMsg.trim(), created_at: new Date().toISOString() }]);
      setCommentMsg("");
      setSendingComment(false);
    } catch { alert("Network error."); setSendingComment(false); }
  };

  let wells = [];
  if (ticket?.well_name) {
    try {
      const parsed = typeof ticket.well_name === "string" ? JSON.parse(ticket.well_name) : ticket.well_name;
      if (Array.isArray(parsed)) wells = parsed.map(w => w.well_name).filter(Boolean);
    } catch { wells = [ticket.well_name]; }
  }

  const grandTotal = (ticket?.lineItems || []).reduce((sum, li) =>
    sum + (parseFloat(li.rate) || 0) * (parseFloat(li.qty) || 0) * (parseFloat(li.days) || 1), 0);

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
    textarea: { width: "100%", padding: "10px 12px", border: "1px solid #d0d8e8", borderRadius: 6, fontSize: 14, marginTop: 4, minHeight: 80, resize: "vertical", boxSizing: "border-box" },
    btn: { background: "#B01020", color: "#fff", border: "none", borderRadius: 6, padding: "12px 32px", fontSize: 16, fontWeight: 700, cursor: "pointer" },
    btnSm: { background: "#1a5fa8", color: "#fff", border: "none", borderRadius: 6, padding: "8px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  };

  if (loading) return <div style={S.page}><div style={{ ...S.card, padding: 40, textAlign: "center" }}>Loading ticket...</div></div>;
  if (error) return (
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
            <h2 style={{ color: "#B01020", margin: "8px 0" }}>Ticket #{ticket.job_num}{ticket.ticket_number ? `-${ticket.ticket_number}` : ""} has been voided</h2>
            <p style={{ color: "#4a5570", fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
              This ticket is no longer valid. {repNum ? `It has been replaced by ticket #${repNum}.` : "A replacement ticket will be sent separately."}
            </p>
            {repLink && (
              <a href={repLink} style={{ display: "inline-block", background: "#002868", color: "#fff", padding: "12px 28px", borderRadius: 6, textDecoration: "none", fontWeight: 700, fontSize: 15 }}>
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
            #{ticket.job_num}{ticket.ticket_number ? `-${ticket.ticket_number}` : ""} — {signedNow ? "Signed" : "Signature Requested"}
          </div>
        </div>
        <div style={S.body}>
          <div style={S.row}><span style={S.label}>Ticket #</span><span>{ticket.job_num}{ticket.ticket_number ? `-${ticket.ticket_number}` : ""}</span></div>
          <div style={S.row}><span style={S.label}>Customer</span><span>{ticket.customer}</span></div>
          <div style={S.row}><span style={S.label}>Type</span><span>{(ticket.type || "").toUpperCase()}</span></div>
          <div style={S.row}><span style={S.label}>Date</span><span>{ticket.date ? new Date(ticket.date).toLocaleDateString("en-US") : ""}</span></div>
          {wells.length > 0 && <div style={S.row}><span style={S.label}>Well(s)</span><span>{wells.join(", ")}</span></div>}
          <div style={S.row}><span style={S.label}>Location</span><span>{ticket.location_county}, {ticket.location_state}</span></div>
          {ticket.notes && <div style={S.row}><span style={S.label}>Notes</span><span>{ticket.notes}</span></div>}

          <table style={S.table}>
            <thead><tr>
              <th style={S.th}>Description</th>
              <th style={{ ...S.th, textAlign: "right" }}>Rate</th>
              <th style={{ ...S.th, textAlign: "center" }}>Qty</th>
              <th style={{ ...S.th, textAlign: "center" }}>Days</th>
              <th style={{ ...S.th, textAlign: "right" }}>Total</th>
            </tr></thead>
            <tbody>{(ticket.lineItems || []).map((li, i) => {
              const t = (parseFloat(li.rate) || 0) * (parseFloat(li.qty) || 0) * (parseFloat(li.days) || 1);
              return (<tr key={i}>
                <td style={S.td}>{li.description}</td><td style={S.tdR}>${parseFloat(li.rate || 0).toFixed(2)}</td>
                <td style={S.tdC}>{li.qty}</td><td style={S.tdC}>{li.days || 1}</td><td style={S.tdR}>${t.toFixed(2)}</td>
              </tr>);
            })}</tbody>
            <tfoot><tr>
              <td colSpan={4} style={{ ...S.td, textAlign: "right", fontWeight: 700, borderTop: "2px solid #d0d8e8" }}>Grand Total</td>
              <td style={{ ...S.tdR, fontWeight: 700, borderTop: "2px solid #d0d8e8" }}>${grandTotal.toFixed(2)}</td>
            </tr></tfoot>
          </table>

          {/* Signature Section */}
          <div style={{ marginTop: 28, borderTop: "2px solid #d0d8e8", paddingTop: 20 }}>
            {signedNow ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#1a7a3c" }}>✓ Ticket Signed</div>
                  <button type="button" className="no-print" onClick={() => window.print()}
                    style={{ background: "#002868", color: "#fff", border: "none", borderRadius: 6, padding: "8px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    PRINT
                  </button>
                </div>
                <div style={S.row}><span style={S.label}>Signed By</span><span>{ticket.signed_by}</span></div>
                <div style={S.row}><span style={S.label}>Signed At</span><span>{ticket.signed_at ? new Date(ticket.signed_at).toLocaleString("en-US") : ""}</span></div>
                {ticket.signature_img && <img src={ticket.signature_img} alt="Signature" style={{ border: "1px solid #d0d8e8", borderRadius: 6, maxWidth: "100%", height: 100, objectFit: "contain", background: "#fafbfc" }} />}
                <SigningTracker emailedAt={ticket.emailed_at} signedAt={ticket.signed_at} />
              </>
            ) : (
              <>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Sign Below</div>
                {ticket.emailed_at && (
                  <div style={{ fontSize: 11, color: "#4a5570", marginBottom: 10, display: "flex", gap: 8, alignItems: "center" }}>
                    <span>Sent: {new Date(ticket.emailed_at).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                  </div>
                )}
                <div style={{ fontSize: 12, color: "#4a5570", marginBottom: 10 }}>Print your name, then sign in the box below.</div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontWeight: 600, fontSize: 13 }}>Printed Name</label>
                  <input style={S.input} value={printedName} onChange={e => setPrintedName(e.target.value)} placeholder="Your full name" />
                </div>
                <div style={{ border: "1px solid #d0d8e8", borderRadius: 6, background: "#fafbfc", position: "relative" }}>
                  <canvas ref={canvasRef} width={650} height={160}
                    style={{ width: "100%", height: 160, touchAction: "none", cursor: "crosshair" }}
                    onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
                    onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
                  <button type="button" onClick={clearSig}
                    style={{ position: "absolute", top: 6, right: 6, background: "#e4e9f2", border: "none", borderRadius: 4, padding: "4px 10px", fontSize: 12, cursor: "pointer" }}>Clear</button>
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
                  <div style={{ fontSize: 12, color: "#4a5570", marginBottom: 4 }}><strong>{who}</strong> · {time}</div>
                  <div style={{ fontSize: 14, whiteSpace: "pre-wrap" }}>{c.message}</div>
                </div>
              );
            })}
            <div style={{ marginTop: 12 }}>
              <label style={{ fontWeight: 600, fontSize: 13 }}>Your Name</label>
              <input style={S.input} value={commentName} onChange={e => setCommentName(e.target.value)} placeholder="Your name" />
            </div>
            <div style={{ marginTop: 8 }}>
              <label style={{ fontWeight: 600, fontSize: 13 }}>Comment</label>
              <textarea style={S.textarea} value={commentMsg} onChange={e => setCommentMsg(e.target.value)} placeholder="Questions, clarifications, or notes..." />
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

// ─── TICKET CONFIG ────────────────────────────────────────────────────────────
const TICKET_TYPES = {
  "Rig Up":   { color: "#B01020", bg: "#fdecea", label: "RIG UP",   abbr: "RU" },
  "Rig Down": { color: "#1a2340", bg: "#e8eaf0", label: "RIG DOWN", abbr: "RD" },
  "Tester":   { color: "#1a7a3c", bg: "#e6f5ec", label: "TESTER",   abbr: "TST" },
  "Pumper":   { color: "#1a5fa8", bg: "#e8f0fb", label: "PUMPER",   abbr: "PMP" },
  "Rental":   { color: "#8a6500", bg: "#fdf5d8", label: "RENTAL",   abbr: "RNT" },
};

const TICKET_STATUSES = {
  incomplete: { color: "#6b7a99", bg: "#f0f3f8", label: "INCOMPLETE" },
  inField:    { color: "#8a6500", bg: "#fdf5d8", label: "IN FIELD" },
  emailed:    { color: "#7a3ca0", bg: "#f3eafa", label: "EMAIL FOR SIGNATURE" },
  signed:     { color: "#1a7a3c", bg: "#e6f5ec", label: "SIGNED" },
  sigNotReq:  { color: "#1a5fa8", bg: "#e8f0fb", label: "SIG NOT REQ" },
  approved:   { color: "#b85c00", bg: "#fdf0e6", label: "APPROVED" },
  sentToQB:   { color: "#7a3ca0", bg: "#f3eafa", label: "SENT TO ACCOUNTING" },
  qbVerified: { color: "#1a7a3c", bg: "#d4edda", label: "QB VERIFIED" },
};

const today = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD local time
const formatDate = (d) => d ? String(d).slice(0, 10) : "—";
const mapTicketFromApi = (t) => ({
  id: t.id, jobId: t.job_id, type: t.type, status: t.status, date: t.date,
  signedBy: t.signed_by, signedAt: t.signed_at, signatureImage: t.signature_img,
  sigNotReqReason: t.sig_not_req_reason, sigNotReqNote: t.sig_not_req_note,
  notes: t.notes, emailedAt: t.emailed_at || null, emailTo: t.email_to || null,
  hasPendingComment: t.has_pending_comment || false, missingPieces: t.missing_pieces,
  locked: t.locked, ticketNumber: t.ticket_number || null,
  startDate: t.start_date || null, endDate: t.end_date || null,
  cycleDays: t.cycle_days || 28, isRecurring: t.is_recurring || false,
  voidedAt: t.voided_at || null, replacedBy: t.replaced_by || null,
  revisionOf: t.revision_of || null, cycleEnded: t.cycle_ended || false,
  hasJSA: t.has_jsa || false, assignedWells: t.assigned_wells || [],
  googlePin: t.google_pin || null, pinLat: t.pin_lat || null, pinLng: t.pin_lng || null,
  lvYard: t.lv_yard || "", arrivalTime: t.arrival_time || "",
  dueOnLoc: t.due_on_loc || "", jobStartTime: t.job_start_time || "",
  jobEndTime: t.job_end_time || "", retYard: t.ret_yard || "",
  timeZone: t.time_zone || "",
  mileageBegin: t.mileage_begin ?? null, mileageEnd: t.mileage_end ?? null,
  createdBy: t.created_by_name || null, createdAt: t.created_at || null,
  siteMgrFirst: t.site_mgr_first || "", siteMgrLast: t.site_mgr_last || "",
  siteMgrPhone: t.site_mgr_phone || "", siteMgrEmail: t.site_mgr_email || "",
  lineItems: (t.lineItems || t.line_items || []).map(li => ({
    qbCode: li.qb_code, desc: li.description, rate: Number(li.rate),
    qty: Number(li.qty), um: li.unit_measure, days: Number(li.days) || 1,
  })),
});
const formatShortStamp = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt)) return "";
  return dt.toLocaleString("en-US", { month: "numeric", day: "numeric", year: "2-digit", hour: "numeric", minute: "2-digit" });
};
const shortName = (name) => {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0];
};
const isOverdue = (t) => !t.completed && t.dueDate && t.dueDate < today();
const todoVisible = (t) => t.createdBy === CURRENT_USER || t.assignedTo === CURRENT_USER;
const calcLineTotal = (li) => li.rate * li.qty * (li.days || 1);
const calcTicketTotal = (t) => t.lineItems.reduce((s, li) => s + calcLineTotal(li), 0);

// Shared helper: maps camelCase ticket updates to snake_case backend payload
const buildTicketPayload = (updates) => {
  const p = {};
  if (updates.status) p.status = updates.status;
  if (updates.signedBy) p.signed_by = updates.signedBy;
  if (updates.signedAt) p.signed_at = updates.signedAt;
  if (updates.signatureImage) p.signature_img = updates.signatureImage;
  if (updates.sigNotReqReason) p.sig_not_req_reason = updates.sigNotReqReason;
  if (updates.sigNotReqNote) p.sig_not_req_note = updates.sigNotReqNote;
  if (updates.approvedBy) p.approved_by = updates.approvedBy;
  if (updates.approvedAt) p.approved_at = updates.approvedAt;
  if (updates.emailedAt) p.emailed_at = updates.emailedAt;
  if (updates.emailTo) p.email_to = updates.emailTo;
  if (updates.notes !== undefined) p.notes = updates.notes;
  if (updates.date) p.date = updates.date;
  if (updates.startDate !== undefined) p.start_date = updates.startDate;
  if (updates.endDate !== undefined) p.end_date = updates.endDate;
  if (updates.cycleDays !== undefined) p.cycle_days = updates.cycleDays;
  if (updates.isRecurring !== undefined) p.is_recurring = updates.isRecurring;
  if (updates.lvYard !== undefined) p.lv_yard = updates.lvYard;
  if (updates.arrivalTime !== undefined) p.arrival_time = updates.arrivalTime;
  if (updates.dueOnLoc !== undefined) p.due_on_loc = updates.dueOnLoc;
  if (updates.jobStartTime !== undefined) p.job_start_time = updates.jobStartTime;
  if (updates.jobEndTime !== undefined) p.job_end_time = updates.jobEndTime;
  if (updates.retYard !== undefined) p.ret_yard = updates.retYard;
  if (updates.timeZone !== undefined) p.time_zone = updates.timeZone;
  if (updates.mileageBegin !== undefined) p.mileage_begin = updates.mileageBegin;
  if (updates.mileageEnd !== undefined) p.mileage_end = updates.mileageEnd;
  if (updates.googlePin !== undefined) p.google_pin = updates.googlePin;
  if (updates.pinLat !== undefined) p.pin_lat = updates.pinLat;
  if (updates.pinLng !== undefined) p.pin_lng = updates.pinLng;
  if (updates.siteMgrFirst !== undefined) p.site_mgr_first = updates.siteMgrFirst;
  if (updates.siteMgrLast !== undefined) p.site_mgr_last = updates.siteMgrLast;
  if (updates.siteMgrPhone !== undefined) p.site_mgr_phone = updates.siteMgrPhone;
  if (updates.siteMgrEmail !== undefined) p.site_mgr_email = updates.siteMgrEmail;
  if (updates.lineItems) {
    p.lineItems = updates.lineItems.map(li => ({
      qb_code: li.qbCode, description: li.desc, rate: li.rate, qty: li.qty, unit_measure: li.um, days: li.days || 1,
    }));
  }
  return p;
};

// Rental cycle countdown helper
function RentalCountdown({ ticket }) {
  const endDate = ticket.endDate || ticket.end_date;
  if (!endDate || endDate === "" || ticket.type !== "Rental") return null;
  if (ticket.cycleEnded || ticket.cycle_ended || ticket.voidedAt || ticket.voided_at) return null;
  const end = new Date(endDate + "T23:59:59");
  if (isNaN(end.getTime())) return null;
  const now = new Date();
  const diffMs = end - now;
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (daysLeft < 0 || isNaN(daysLeft)) return null;
  const color = daysLeft <= 1 ? "#B01020" : daysLeft <= 7 ? "#8a6500" : "#1a7a3c";
  const bg = daysLeft <= 1 ? "#fdecea" : daysLeft <= 7 ? "#fdf5d8" : "#e6f5ec";
  const border = daysLeft <= 1 ? "#B0102044" : daysLeft <= 7 ? "#e6c20044" : "#1a7a3c44";
  const label = daysLeft === 0 ? "Last day" : daysLeft === 1 ? "1 day left" : `${daysLeft} days left`;
  return (
    <span style={{ background: bg, color, borderRadius: 4, padding: "2px 8px", fontSize: 10, fontWeight: 800, letterSpacing: "0.04em", border: `1px solid ${border}`, whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}

// ─── PHOTO UTILITIES ──────────────────────────────────────────────────────────
async function compressPhoto(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Resize to max 1200px
        const MAX = 1200;
        const THUMB = 200;
        let w = img.width, h = img.height;
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
          else { w = Math.round(w * MAX / h); h = MAX; }
        }
        // Full image
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        const imageData = canvas.toDataURL("image/jpeg", 0.8);
        // Thumbnail
        let tw = THUMB, th = THUMB;
        if (img.width > img.height) { th = Math.round(THUMB * img.height / img.width); }
        else { tw = Math.round(THUMB * img.width / img.height); }
        const tc = document.createElement("canvas");
        tc.width = tw; tc.height = th;
        tc.getContext("2d").drawImage(img, 0, 0, tw, th);
        const thumbnail = tc.toDataURL("image/jpeg", 0.7);
        resolve({ imageData, thumbnail, filename: file.name.replace(/\.heic$/i, ".jpg") });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// ─── PHOTO STRIP COMPONENT ───────────────────────────────────────────────────
function PhotoStrip({ ticketId, isLocked }) {
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!ticketId) return;
    fetch(`${API_URL}/tickets/${ticketId}/photos`)
      .then(r => r.ok ? r.json() : [])
      .then(setPhotos)
      .catch(() => {});
  }, [ticketId]);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (photos.length + files.length > 10) { alert(`Maximum 10 photos. Currently ${photos.length}.`); return; }
    setUploading(true);
    try {
      const compressed = await Promise.all(files.map(f => compressPhoto(f)));
      const r = await fetch(`${API_URL}/tickets/${ticketId}/photos`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photos: compressed.map(p => ({ filename: p.filename, image_data: p.imageData, thumbnail: p.thumbnail })) }),
      });
      if (r.ok) {
        const saved = await r.json();
        setPhotos(prev => [...prev, ...saved]);
      }
    } catch (err) { console.error("Photo upload failed:", err); }
    setUploading(false);
    e.target.value = "";
  };

  const handleDelete = async (photoId) => {
    try {
      await fetch(`${API_URL}/tickets/photos/${photoId}`, { method: "DELETE" });
      setPhotos(prev => prev.filter(p => p.id !== photoId));
    } catch (err) { console.error("Photo delete failed:", err); }
  };

  const viewFull = async (photoId) => {
    try {
      const r = await fetch(`${API_URL}/tickets/photos/${photoId}`);
      if (!r.ok) return;
      const data = await r.json();
      const win = window.open("", "_blank");
      win.document.write(`<html><head><title>${data.filename}</title></head><body style="margin:0;background:#111;display:flex;align-items:center;justify-content:center;min-height:100vh"><img src="${data.image_data}" style="max-width:100%;max-height:100vh;object-fit:contain" /></body></html>`);
      win.document.close();
    } catch (err) { console.error("View photo failed:", err); }
  };

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: C.muted, letterSpacing: "0.08em" }}>PHOTOS ({photos.length}/10)</div>
        {!isLocked && photos.length < 10 && (
          <label style={{ background: C.blue, color: "#fff", borderRadius: 4, padding: "4px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
            {uploading ? "UPLOADING..." : "+ ADD PHOTO"}
            <input type="file" accept="image/*,.heic" multiple hidden onChange={handleUpload} disabled={uploading} />
          </label>
        )}
      </div>
      {photos.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {photos.map(p => (
            <div key={p.id} style={{ position: "relative", borderRadius: 6, overflow: "hidden", border: `1px solid ${C.border}`, background: "#f8f9fa" }}>
              <img src={p.thumbnail} alt={p.filename}
                onClick={() => viewFull(p.id)}
                style={{ width: 80, height: 80, objectFit: "cover", cursor: "pointer", display: "block" }} />
              {!isLocked && (
                <button onClick={() => handleDelete(p.id)}
                  style={{ position: "absolute", top: 2, right: 2, background: "#00000088", color: "#fff", border: "none", borderRadius: "50%", width: 18, height: 18, fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>✕</button>
              )}
              <div style={{ fontSize: 9, color: C.muted, padding: "2px 4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 80 }}>{p.filename}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── PUBLIC PHOTO STRIP (read-only, for sign page) ───────────────────────────
function PublicPhotoStrip({ ticketId }) {
  const [photos, setPhotos] = useState([]);
  useEffect(() => {
    if (!ticketId) return;
    fetch(`${API_URL}/tickets/${ticketId}/photos`)
      .then(r => r.ok ? r.json() : [])
      .then(setPhotos)
      .catch(() => {});
  }, [ticketId]);

  const viewFull = async (photoId) => {
    try {
      const r = await fetch(`${API_URL}/tickets/photos/${photoId}`);
      if (!r.ok) return;
      const data = await r.json();
      const win = window.open("", "_blank");
      win.document.write(`<html><head><title>${data.filename}</title></head><body style="margin:0;background:#111;display:flex;align-items:center;justify-content:center;min-height:100vh"><img src="${data.image_data}" style="max-width:100%;max-height:100vh;object-fit:contain" /></body></html>`);
      win.document.close();
    } catch (err) { console.error("View photo failed:", err); }
  };

  if (photos.length === 0) return null;
  return (
    <div style={{ marginTop: 20, borderTop: "2px solid #d0d8e8", paddingTop: 16 }}>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>Photos ({photos.length})</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {photos.map(p => (
          <img key={p.id} src={p.thumbnail} alt={p.filename}
            onClick={() => viewFull(p.id)}
            style={{ width: 80, height: 80, objectFit: "cover", cursor: "pointer", borderRadius: 6, border: "1px solid #d0d8e8" }} />
        ))}
      </div>
    </div>
  );
}

// ─── SHARED UI ────────────────────────────────────────────────────────────────
const inputStyle = {
  width: "100%", boxSizing: "border-box",
  background: C.steel, border: `1px solid ${C.border}`,
  color: C.text, padding: "8px 11px", borderRadius: 4,
  fontSize: 13, fontFamily: "'Arial', sans-serif", outline: "none",
};

const labelStyle = {
  fontSize: 11, fontWeight: 700, color: C.muted,
  letterSpacing: "0.08em", marginBottom: 4, display: "block",
};

function Btn({ onClick, children, variant = "primary", small }) {
  const styles = {
    primary: { background: C.red, color: C.white, border: "none" },
    ghost:   { background: "transparent", color: C.muted, border: `1px solid ${C.border}` },
    blue:    { background: C.blue, color: C.white, border: "none" },
  };
  return (
    <button type="button" onClick={onClick} style={{
      ...styles[variant],
      padding: small ? "5px 12px" : "9px 18px",
      borderRadius: 4, fontSize: small ? 12 : 13,
      fontWeight: 700, cursor: "pointer", fontFamily: "'Arial', sans-serif",
      letterSpacing: "0.04em",
    }}>{children}</button>
  );
}

function FilterBtn({ active, onClick, children }) {
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

function PriorityBadge({ priority }) {
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

function TodoBadge({ count }) {
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

function NavBadge({ count }) {
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

// ─── TIME PICKER (hour : minute AM/PM) ───────────────────────────────────────
function TimePicker({ value, onChange, startHour = 6, startPeriod = "AM" }) {
  // Parse existing value like "8:20 AM" into parts
  const parse = (v) => {
    if (!v) return { hr: "", min: "00", period: startPeriod };
    const m = String(v).match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!m) return { hr: "", min: "00", period: startPeriod };
    return { hr: String(parseInt(m[1])), min: m[2], period: m[3].toUpperCase() };
  };
  const { hr, min, period } = parse(value);

  const assemble = (h, m, p) => {
    if (!h) { onChange(""); return; }
    onChange(`${h}:${m} ${p}`);
  };

  // Build hour options starting from startHour
  const hours = [];
  const startH24 = startPeriod === "PM" && startHour !== 12 ? startHour + 12 : startHour === 12 && startPeriod === "AM" ? 0 : startHour;
  for (let i = 0; i < 12; i++) {
    const h24 = (startH24 + i) % 24;
    const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
    hours.push(h12);
  }
  // Dedupe while preserving order
  const seen = new Set();
  const uniqueHours = hours.filter(h => { if (seen.has(h)) return false; seen.add(h); return true; });

  const minutes = ["00", "10", "20", "30", "40", "50"];
  const selBase = { border: `1px solid ${C.border}`, borderRadius: 4, padding: "3px 4px", fontSize: 12, color: C.text, background: C.cardBg };

  return (
    <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
      <select value={hr} onChange={e => assemble(e.target.value, min, period)} style={{ ...selBase, width: 48 }}>
        <option value="">—</option>
        {uniqueHours.map(h => <option key={h} value={String(h)}>{h}</option>)}
      </select>
      <span style={{ fontSize: 13, fontWeight: 600, color: C.muted }}>:</span>
      <select value={min} onChange={e => assemble(hr, e.target.value, period)} style={{ ...selBase, width: 48 }}>
        {minutes.map(m => <option key={m} value={m}>{m}</option>)}
      </select>
      <span onClick={() => assemble(hr, min, period === "AM" ? "PM" : "AM")} style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 32, height: 28, fontSize: 10, fontWeight: 800, letterSpacing: "0.04em",
        color: period === "AM" ? C.blue : C.red,
        background: period === "AM" ? "#e8f0fb" : "#fdecea",
        border: `1px solid ${period === "AM" ? C.blue + "44" : C.red + "44"}`,
        borderRadius: 4, cursor: "pointer", userSelect: "none",
      }}>{period}</span>
    </div>
  );
}

// ─── TODO FORM ────────────────────────────────────────────────────────────────
function TodoForm({ onSave, onCancel, defaultJobId = null, jobs, userNames = [] }) {
  const [form, setForm] = useState({
    title: "", description: "", jobId: defaultJobId,
    assignedTo: CURRENT_USER, priority: "normal", dueDate: "",
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!form.title.trim()) return;
    onSave({ ...form, jobId: form.jobId ? Number(form.jobId) : null, dueDate: form.dueDate || null });
  };

  return (
    <div style={{ background: C.steel, border: `1px solid ${C.border}`, borderRadius: 6, padding: 16, marginBottom: 12 }}>
      <div style={{ marginBottom: 10 }}>
        <label style={labelStyle}>TITLE *</label>
        <input style={inputStyle} value={form.title} onChange={e => set("title", e.target.value)} placeholder="Task title..." />
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={labelStyle}>DESCRIPTION</label>
        <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 56 }} value={form.description} onChange={e => set("description", e.target.value)} placeholder="Optional details..." />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>LINK TO JOB</label>
          <select style={inputStyle} value={form.jobId ?? ""} onChange={e => set("jobId", e.target.value || null)}>
            <option value="">— General Task —</option>
            {jobs.map(j => <option key={j.id} value={j.id}>#{j.id} {j.customer}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>ASSIGN TO</label>
          <select style={inputStyle} value={form.assignedTo} onChange={e => set("assignedTo", e.target.value)}>
            {userNames.map(u => <option key={u}>{u}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>PRIORITY</label>
          <select style={inputStyle} value={form.priority} onChange={e => set("priority", e.target.value)}>
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>DUE DATE</label>
          <input type="date" style={inputStyle} value={form.dueDate} onChange={e => set("dueDate", e.target.value)} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Btn onClick={handleSave}>SAVE TASK</Btn>
        <Btn onClick={onCancel} variant="ghost">CANCEL</Btn>
      </div>
    </div>
  );
}

// ─── TODO ROW ─────────────────────────────────────────────────────────────────
function TodoRow({ todo, onToggle, onNavigateJob, jobs }) {
  const overdue = isOverdue(todo);
  const job = jobs.find(j => j.id === todo.jobId);

  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 12,
      padding: "10px 14px",
      background: overdue ? C.overdueB : C.cardBg,
      border: `1px solid ${overdue ? C.overdue + "44" : C.border}`,
      borderLeft: `3px solid ${overdue ? C.overdue : todo.priority === "high" ? C.priHigh : todo.priority === "low" ? C.priLow : C.border}`,
      borderRadius: 5, marginBottom: 6,
      opacity: todo.completed ? 0.6 : 1,
    }}>
      <div onClick={() => onToggle(todo.id)} style={{
        width: 18, height: 18, borderRadius: 3, flexShrink: 0, marginTop: 1,
        border: `2px solid ${todo.completed ? C.green : C.muted}`,
        background: todo.completed ? C.green : "transparent",
        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {todo.completed && <span style={{ color: C.white, fontSize: 11, fontWeight: 900 }}>✓</span>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{
            fontSize: 13, fontWeight: 700, color: C.text,
            textDecoration: todo.completed ? "line-through" : "none",
          }}>{todo.title}</span>
          <PriorityBadge priority={todo.priority} />
          {overdue && <span style={{ fontSize: 10, fontWeight: 700, color: C.overdue, background: C.overdueB, border: `1px solid ${C.overdue}44`, padding: "2px 7px", borderRadius: 3, letterSpacing: "0.06em" }}>OVERDUE</span>}
        </div>
        {todo.description && <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{todo.description}</div>}
        <div style={{ display: "flex", gap: 12, marginTop: 4, flexWrap: "wrap" }}>
          {job && (
            <span onClick={() => onNavigateJob && onNavigateJob(job.id)} style={{
              fontSize: 11, color: C.blue, fontWeight: 700, cursor: onNavigateJob ? "pointer" : "default",
              textDecoration: onNavigateJob ? "underline" : "none",
            }}>#{job.id} {job.customer}</span>
          )}
          {!job && <span style={{ fontSize: 11, color: C.muted }}>General Task</span>}
          {todo.dueDate && <span style={{ fontSize: 11, color: overdue ? C.overdue : C.muted }}>Due: {todo.dueDate}</span>}
          <span style={{ fontSize: 11, color: C.muted }}>→ {todo.assignedTo}</span>
          {todo.completed && todo.completedBy && (
            <span style={{ fontSize: 11, color: C.green }}>✓ {todo.completedBy} · {todo.completedAt?.slice(0, 10)}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── TODO PAGE ────────────────────────────────────────────────────────────────
function TodoPage({ todos, setTodos, jobs, onNavigateJob, userNames, userIdByName }) {
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("active");
  const [typeFilter, setTypeFilter] = useState("all");

  const myTodos = todos.filter(todoVisible);

  const filtered = myTodos.filter(t => {
    if (filter === "active" && t.completed) return false;
    if (filter === "completed" && !t.completed) return false;
    if (typeFilter === "job" && !t.jobId) return false;
    if (typeFilter === "general" && t.jobId) return false;
    return true;
  });

  const handleSave = async (form) => {
    const payload = {
      title: form.title, description: form.description, job_id: form.jobId,
      priority: form.priority, due_date: form.dueDate,
      created_by: userIdByName[CURRENT_USER], assigned_to: userIdByName[form.assignedTo] || userIdByName[CURRENT_USER],
    };
    try {
      const r = await fetch(`${API_URL}/todos`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (r.ok) {
        const saved = await r.json();
        const newTodo = { id: saved.id, ...form, createdBy: CURRENT_USER, assignedTo: form.assignedTo, completed: false, completedBy: null, completedAt: null };
        setTodos(prev => [newTodo, ...prev]);
      }
    } catch (err) { console.error("Todo create failed:", err); }
    setShowForm(false);
  };

  const toggleTodo = async (id) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    const nowComplete = !todo.completed;
    try {
      await fetch(`${API_URL}/todos/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: nowComplete, completed_by: nowComplete ? userIdByName[CURRENT_USER] : null }),
      });
    } catch (err) { console.error("Todo toggle failed:", err); }
    setTodos(prev => prev.map(t => t.id !== id ? t : {
      ...t, completed: nowComplete,
      completedBy: nowComplete ? CURRENT_USER : null,
      completedAt: nowComplete ? new Date().toISOString() : null,
    }));
  };

  return (
    <div style={{ padding: "24px 28px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>To-Do / Tasks</h1>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
            {myTodos.filter(t => !t.completed).length} active · {myTodos.filter(t => t.completed).length} completed
          </div>
        </div>
        <Btn onClick={() => setShowForm(s => !s)}>{showForm ? "CANCEL" : "+ NEW TASK"}</Btn>
      </div>

      {showForm && <TodoForm onSave={handleSave} onCancel={() => setShowForm(false)} jobs={jobs} userNames={userNames} />}

      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginRight: 4, alignSelf: "center" }}>STATUS:</span>
        {[["active", "ACTIVE"], ["completed", "COMPLETED"]].map(([v, l]) => (
          <FilterBtn key={v} active={filter === v} onClick={() => setFilter(v)}>{l}</FilterBtn>
        ))}
        <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginLeft: 12, marginRight: 4, alignSelf: "center" }}>TYPE:</span>
        {[["all", "ALL"], ["job", "JOB-LINKED"], ["general", "GENERAL"]].map(([v, l]) => (
          <FilterBtn key={v} active={typeFilter === v} onClick={() => setTypeFilter(v)}>{l}</FilterBtn>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 0", color: C.muted, fontSize: 14 }}>No tasks here.</div>
      )}
      {filtered.map(t => (
        <TodoRow key={t.id} todo={t} onToggle={toggleTodo} onNavigateJob={onNavigateJob} jobs={jobs} />
      ))}
    </div>
  );
}

// ─── JOB TODO TAB ─────────────────────────────────────────────────────────────
function JobTodoTab({ jobId, todos, setTodos, jobs, userNames, userIdByName }) {
  const [showForm, setShowForm] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const jobTodos = todos.filter(t => t.jobId === jobId && todoVisible(t));
  const visible = jobTodos.filter(t => showCompleted || !t.completed);

  const handleSave = async (form) => {
    const payload = {
      title: form.title, description: form.description, job_id: form.jobId,
      priority: form.priority, due_date: form.dueDate,
      created_by: userIdByName[CURRENT_USER], assigned_to: userIdByName[form.assignedTo] || userIdByName[CURRENT_USER],
    };
    try {
      const r = await fetch(`${API_URL}/todos`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (r.ok) {
        const saved = await r.json();
        setTodos(prev => [{ id: saved.id, ...form, createdBy: CURRENT_USER, assignedTo: form.assignedTo, completed: false, completedBy: null, completedAt: null }, ...prev]);
      }
    } catch (err) { console.error("Todo create failed:", err); }
    setShowForm(false);
  };

  const toggleTodo = async (id) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    const nowComplete = !todo.completed;
    try {
      await fetch(`${API_URL}/todos/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: nowComplete, completed_by: nowComplete ? userIdByName[CURRENT_USER] : null }),
      });
    } catch (err) { console.error("Todo toggle failed:", err); }
    setTodos(prev => prev.map(t => t.id !== id ? t : {
      ...t, completed: nowComplete,
      completedBy: nowComplete ? CURRENT_USER : null,
      completedAt: nowComplete ? new Date().toISOString() : null,
    }));
  };

  return (
    <div style={{ padding: "16px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.muted }}>
          {jobTodos.filter(t => !t.completed).length} active task{jobTodos.filter(t => !t.completed).length !== 1 ? "s" : ""}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowCompleted(s => !s)} style={{
            background: "transparent", border: `1px solid ${C.border}`,
            color: C.muted, padding: "4px 10px", borderRadius: 4,
            fontSize: 11, fontWeight: 700, cursor: "pointer",
          }}>{showCompleted ? "HIDE COMPLETED" : "SHOW COMPLETED"}</button>
          <Btn small onClick={() => setShowForm(s => !s)}>{showForm ? "CANCEL" : "+ ADD TASK"}</Btn>
        </div>
      </div>

      {showForm && <TodoForm onSave={handleSave} onCancel={() => setShowForm(false)} defaultJobId={jobId} jobs={jobs} userNames={userNames} />}

      {visible.length === 0 && (
        <div style={{ textAlign: "center", padding: "24px 0", color: C.muted, fontSize: 13 }}>No tasks for this job.</div>
      )}
      {visible.map(t => <TodoRow key={t.id} todo={t} onToggle={toggleTodo} jobs={jobs} />)}
    </div>
  );
}

// ─── TICKET DOT ───────────────────────────────────────────────────────────────
function TicketDot({ label, state }) {
  const colors = { signed: C.green, inField: "#1a5fa8", draft: C.yellow, none: "#d0d8e8" };
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <div style={{ width: 10, height: 10, borderRadius: "50%", background: colors[state] || colors.none }} />
      <span style={{ fontSize: 8, color: C.muted, fontWeight: 700 }}>{label}</span>
    </div>
  );
}

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────
// Compute job status dynamically based on schedule date and ticket states
function computeJobStatus(job, jobTickets = []) {
  // If manually set to Completed, keep it
  if (job.status === "Completed") return "Completed";
  // In Progress = at least one ticket with a date of today or earlier
  const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in local time
  const hasCurrentTicket = jobTickets.some(t => {
    const td = (t.date || t.ticket_date || "").slice(0, 10);
    return td && td <= today;
  });
  if (hasCurrentTicket) return "In Progress";
  return "Scheduled";
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG["Scheduled"];
  return (
    <span style={{
      display: "inline-block", padding: "3px 10px", borderRadius: 3,
      fontSize: 11, fontWeight: 800, letterSpacing: "0.1em",
      color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}33`,
    }}>{cfg.label}</span>
  );
}

// ─── PIPELINE SUMMARY ─────────────────────────────────────────────────────────
function PipelineSummary({ jobs, tickets }) {
  return (
    <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
      {STATUS_ORDER.map(status => {
        const count = jobs.filter(j => computeJobStatus(j, (tickets || []).filter(t => t.jobId === j.id)) === status).length;
        const cfg = STATUS_CONFIG[status];
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

// ─── JOB CARD ─────────────────────────────────────────────────────────────────
function JobCard({ job, isExpanded, onToggle, pendingTodos, todos, setTodos, tickets, setTickets, jobs, onNavigateJob, onUpdateJob, onDeleteJob, onFlagCancel, onTicketDeleted, jsas, setJsas, userNames, qbItems, userIdByName, currentUser, customers }) {
  const jobTickets = tickets.filter(t => t.jobId === job.id);
  const computedStatus = computeJobStatus(job, jobTickets);
  const cfg = STATUS_CONFIG[computedStatus] || STATUS_CONFIG["Scheduled"];
  const costPerWell = job.wells.length > 1 ? (job.estimatedCost / job.wells.length).toFixed(0) : null;
  const [activeTab, setActiveTab] = useState("tickets");
  const [showEditJob, setShowEditJob] = useState(false);
  const [showFlowback, setShowFlowback] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 900);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 900);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  const ticketTotal = jobTickets.reduce((s, t) => s + calcTicketTotal(t), 0);
  const hasJobPendingComment = jobTickets.some(t => t.hasPendingComment || t.has_pending_comment);

  // Derive dot states from actual tickets
  const dotState = (type) => {
    const t = jobTickets.filter(tk => tk.type === type);
    if (t.length === 0) return "none";
    if (t.some(tk => tk.status === "qbVerified")) return "signed";
    if (t.some(tk => tk.status === "sentToQB")) return "signed";
    if (t.some(tk => tk.status === "signed" || tk.status === "sigNotReq")) return "signed";
    if (t.some(tk => tk.status === "emailed")) return "inField";
    if (t.some(tk => tk.status === "inField")) return "inField";
    return "incomplete";
  };

  const isFlagged = job.status === "flaggedCancel";

  return (
    <div style={{
      background: isFlagged ? "#fdf0e6" : C.cardBg, border: `1px solid ${isFlagged ? "#b85c00" : C.border}`,
      borderLeft: `3px solid ${isFlagged ? "#b85c00" : cfg.color}`, borderRadius: 6, marginBottom: 8,
      boxShadow: isExpanded ? `0 4px 24px ${cfg.color}22` : "none",
      overflow: "hidden", maxWidth: "100%",
    }}>
      {isMobile ? (
        // Mobile: compact single row
        <div onClick={onToggle} style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 14px", cursor: "pointer", userSelect: "none",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: "0.1em" }}>JOB #{job.id}</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{job.customer}</div>
              <div style={{ fontSize: 11, color: C.muted }}>{job.location}</div>
              {job.createdBy && <div style={{ fontSize: 9, color: "#a0aec8", marginTop: 1 }}>{shortName(job.createdBy)} · {formatShortStamp(job.createdAt)}</div>}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
            <div style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}44`, borderRadius: 4, padding: "2px 8px", fontSize: 10, fontWeight: 800, letterSpacing: "0.06em" }}>{cfg.label}</div>
            {hasJobPendingComment && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 3, background: "#fdecea", color: "#B01020", borderRadius: 4, padding: "1px 6px", fontSize: 9, fontWeight: 800, letterSpacing: "0.04em", border: "1px solid #B0102044" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#B01020", display: "inline-block" }} />
                COMMENT
              </span>
            )}
            <div style={{ fontSize: 11, color: C.muted }}>{job.wells.length} {job.wells.length === 1 ? "well" : "wells"}</div>
          </div>
        </div>
      ) : (
        // Desktop: full grid
        <div onClick={onToggle} className="fti-job-card-header" style={{
          display: "grid", gridTemplateColumns: "80px 1fr 1fr 140px 160px 120px 90px",
          alignItems: "center", padding: "14px 18px",
          cursor: "pointer", gap: 12, userSelect: "none", overflow: "hidden",
        }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.1em" }}>JOB #</div>
          <div style={{ fontSize: 17, fontWeight: 800, color: C.text }}>{job.id}</div>
          {job.createdBy && <div style={{ fontSize: 9, color: "#a0aec8", marginTop: 2 }}>{shortName(job.createdBy)} · {formatShortStamp(job.createdAt)}</div>}
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.08em", marginBottom: 2 }}>CUSTOMER</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{job.customer}</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>{job.location}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.08em", marginBottom: 2 }}>WELLS</div>
          <div style={{ fontSize: 13, color: C.text }}>{job.wells.length} {job.wells.length === 1 ? "well" : "wells"}</div>
          <div style={{ fontSize: 11, color: C.muted }}>{job.wells[0]?.well_name || job.wells[0]}{job.wells.length > 1 ? ` +${job.wells.length - 1}` : ""}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.08em", marginBottom: 2 }}>SCHEDULED DATE</div>
          <div style={{ fontSize: 13, color: C.text }}>{formatDate(job.dateStarted)}</div>
          <div style={{ fontSize: 11, color: C.muted }}>{job.hoursLogged}h logged</div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.08em", marginBottom: 6 }}>TICKETS</div>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <TicketDot label="RU" state={dotState("Rig Up")} />
            <TicketDot label="TST" state={dotState("Tester")} />
            <TicketDot label="PMP" state={dotState("Pumper")} />
            <TicketDot label="RNT" state={dotState("Rental")} />
            <TicketDot label="RD" state={dotState("Rig Down")} />
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.08em", marginBottom: 4 }}>TASKS</div>
          <TodoBadge count={pendingTodos} />
          {!pendingTodos && <span style={{ fontSize: 11, color: C.muted }}>None pending</span>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          <StatusBadge status={computedStatus} />
          {computedStatus === "In Progress" && jobTickets.some(t => t.status === "incomplete") && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#fdf5d8", color: "#8a6500", borderRadius: 4, padding: "2px 8px", fontSize: 10, fontWeight: 800, letterSpacing: "0.04em", border: "1px solid #e6c20044" }}>
              {jobTickets.filter(t => t.status === "incomplete").length} INCOMPLETE
            </span>
          )}
          {hasJobPendingComment && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#fdecea", color: "#B01020", borderRadius: 4, padding: "2px 8px", fontSize: 10, fontWeight: 800, letterSpacing: "0.04em", border: "1px solid #B0102044" }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#B01020", display: "inline-block" }} />
              COMMENT
            </span>
          )}
          <span style={{ color: C.muted, fontSize: 12, display: "inline-block", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▾</span>
        </div>
      </div>
      )}{/* end desktop header */}

      {isExpanded && (
        <div style={{ borderTop: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, background: C.steel, padding: "0 18px" }}>
            {[["tickets", `TICKETS${jobTickets.length ? ` (${jobTickets.length})` : ""}`], ["details", "DETAILS"], ["todos", `ACTION ITEMS${pendingTodos ? ` (${pendingTodos})` : ""}`]].map(([tab, label]) => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                background: activeTab === tab ? C.cardBg : "transparent", border: "none",
                borderBottom: activeTab === tab ? `2px solid ${C.red}` : "2px solid transparent",
                borderTop: activeTab === tab ? `2px solid ${C.red}` : "2px solid transparent",
                borderLeft: activeTab === tab ? `1px solid ${C.border}` : "1px solid transparent",
                borderRight: activeTab === tab ? `1px solid ${C.border}` : "1px solid transparent",
                borderTopLeftRadius: activeTab === tab ? 4 : 0,
                borderTopRightRadius: activeTab === tab ? 4 : 0,
                marginBottom: activeTab === tab ? -1 : 0,
                color: activeTab === tab ? C.text : C.muted,
                padding: "10px 16px", fontSize: 12, fontWeight: 700,
                cursor: "pointer", letterSpacing: "0.06em",
              }}>{label}</button>
            ))}
          </div>

          {activeTab === "details" && (
            <div style={{
              padding: "18px 18px 20px", display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 24, background: "#f7f9fc",
            }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.1em", marginBottom: 8 }}>WELLS / AFE</div>
                {job.wells.map((well, i) => (
                  <div key={i} style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 12, color: C.text, fontWeight: 600 }}>{well.well_name || well}</div>
                    {i === 0 && job.afe && <div style={{ fontSize: 11, color: "#1a5fa8" }}>AFE: {job.afe}</div>}
                    {costPerWell && <div style={{ fontSize: 11, color: C.green }}>{'$'}{Number(costPerWell).toLocaleString()} / well</div>}
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.1em", marginBottom: 8 }}>CREW</div>
                {job.crew.map((c, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: C.text }}>{c.name}</span>
                    <span style={{ fontSize: 11, color: C.muted, fontStyle: "italic" }}>{c.role}</span>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.1em", marginBottom: 8 }}>EQUIPMENT</div>
                {job.equipment.map((eq, i) => (
                  <div key={i} style={{ fontSize: 12, color: C.text, marginBottom: 5, display: "flex", gap: 6 }}>
                    <span style={{ color: C.red, fontSize: 8, marginTop: 4 }}>◆</span>{eq}
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.1em", marginBottom: 8 }}>ACTIONS</div>
                {(() => {
                  const role = currentUser?.role || "field";
                  const canDelete = ["owner", "admin", "manager"].includes(role);
                  const actions = [
                    { label: "Add / View Field Tickets", action: () => setActiveTab("tickets") },
                    { label: "Flowback Data", action: () => setShowFlowback(true) },
                    { label: "Edit Job", action: () => setShowEditJob(true) },
                  ];
                  // Close Out — only if all tickets are sentToQB or qbVerified
                  const jTickets = tickets.filter(t => t.jobId === job.id);
                  const allSent = jTickets.length > 0 && jTickets.every(t => ["sentToQB", "qbVerified"].includes(t.status));
                  const hasIncomplete = jTickets.some(t => !["sentToQB", "qbVerified"].includes(t.status));
                  if (allSent && canDelete) {
                    actions.push({ label: "CLOSE OUT JOB", action: () => { onUpdateJob(job.id, { status: "Completed" }); }, success: true });
                  } else if (hasIncomplete && jTickets.length > 0 && canDelete) {
                    const pending = jTickets.filter(t => !["sentToQB", "qbVerified"].includes(t.status)).length;
                    actions.push({ label: `CLOSE OUT — ${pending} ticket${pending !== 1 ? "s" : ""} not sent`, action: null, warn: true });
                  }
                  if (canDelete) {
                    actions.push({ label: "DELETE JOB", action: () => setShowDeleteConfirm(true), danger: true });
                  } else if (job.status !== "flaggedCancel") {
                    actions.push({ label: "Flag: To Be Cancelled", action: () => setShowDeleteConfirm(true), warn: true });
                  }
                  return actions;
                })().map((btn, i) => (
                  <button key={i} onClick={(e) => { e.stopPropagation(); if (btn.action) btn.action(); }} style={{
                    display: "block", width: "100%", background: btn.danger ? "#fdecea" : btn.warn ? "#fdf5d8" : btn.success ? "#e6f5ec" : "transparent",
                    border: `1px solid ${btn.danger ? C.red : btn.warn ? "#8a6500" : btn.success ? C.green : C.border}`,
                    color: btn.danger ? C.red : btn.warn ? "#8a6500" : btn.success ? C.green : btn.action ? C.text : C.muted,
                    padding: "7px 12px", borderRadius: 4, fontSize: 12,
                    cursor: btn.action ? "pointer" : "default", textAlign: "left", marginBottom: 6,
                    fontFamily: "'Arial', sans-serif", opacity: btn.action ? 1 : 0.5,
                    fontWeight: btn.danger || btn.warn || btn.success ? 800 : 400,
                  }}
                    onMouseEnter={e => { if (btn.action) { e.target.style.borderColor = C.red; e.target.style.background = btn.danger ? "#f5c6cb" : "#fbeaec"; }}}
                    onMouseLeave={e => { e.target.style.borderColor = btn.danger ? C.red : btn.warn ? "#8a6500" : C.border; e.target.style.background = btn.danger ? "#fdecea" : btn.warn ? "#fdf5d8" : "transparent"; }}
                  >{btn.label}{!btn.action ? " (coming soon)" : ""}</button>
                ))}
              </div>
            </div>
          )}
            {job.notes && (
              <div style={{ padding: "0 18px 14px", background: "#f7f9fc" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.1em", marginBottom: 4 }}>NOTES</div>
                <div style={{ fontSize: 12, color: C.text, whiteSpace: "pre-wrap", background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 4, padding: "8px 12px" }}>{job.notes}</div>
              </div>
            )}

          {activeTab === "tickets" && (
            <div style={{ padding: "0 18px 18px", background: "#f7f9fc" }}>
              <JobTicketsTab jobId={job.id} tickets={tickets} setTickets={setTickets} jobs={jobs} qbItems={qbItems} currentUser={currentUser} customers={customers} onTicketDeleted={onTicketDeleted} />
            </div>
          )}

          {activeTab === "todos" && (
            <div style={{ padding: "0 18px 18px", background: "#f7f9fc" }}>
              <JobTodoTab jobId={job.id} todos={todos} setTodos={setTodos} jobs={jobs} userNames={userNames} userIdByName={userIdByName} />
            </div>
          )}
        </div>
      )}
      {showEditJob && <EditJobModal job={job} onSave={(updates) => { onUpdateJob(job.id, updates); setShowEditJob(false); }} onClose={() => setShowEditJob(false)} />}
      {showFlowback && <FlowbackModal job={job} onClose={() => setShowFlowback(false)} />}
      {showDeleteConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={() => setShowDeleteConfirm(false)}>
          <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderTop: `4px solid ${C.red}`, borderRadius: 8, padding: 28, width: 420, maxWidth: "90vw" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.red, marginBottom: 12 }}>
              {["owner", "admin", "manager"].includes(currentUser?.role) ? "Delete Job?" : "Flag for Cancellation?"}
            </div>
            <div style={{ fontSize: 13, color: C.text, marginBottom: 8 }}>
              <strong>Job #{job.id}</strong> — {job.customer}
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 20 }}>
              {["owner", "admin", "manager"].includes(currentUser?.role)
                ? "This job will be moved to the Deleted Jobs page. It can be restored later."
                : "This job will be flagged for review. A manager or admin will need to approve the cancellation."}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn onClick={() => {
                if (["owner", "admin", "manager"].includes(currentUser?.role)) {
                  onDeleteJob(job.id);
                } else {
                  onFlagCancel(job.id);
                }
                setShowDeleteConfirm(false);
              }}>{["owner", "admin", "manager"].includes(currentUser?.role) ? "YES, DELETE" : "YES, FLAG IT"}</Btn>
              <Btn onClick={() => setShowDeleteConfirm(false)} variant="ghost">CANCEL</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── EDIT JOB MODAL ───────────────────────────────────────────────────────────
function EditJobModal({ job, onSave, onClose }) {
  const [customer, setCustomer] = useState(job.customer || "");
  const [jobState, setJobState] = useState(job.jobState || "");
  const [county, setCounty] = useState(job.county || "");
  const [showCountyDrop, setShowCountyDrop] = useState(false);
  const [wellList, setWellList] = useState(() => {
    if (!job.wells || job.wells.length === 0) return [""];
    return job.wells.map(w => w.well_name || w);
  });
  const [afe, setAfe] = useState(job.afe || "");
  const [contactFirst, setContactFirst] = useState(job.contactFirst || job.contact_first || "");
  const [contactLast, setContactLast] = useState(job.contactLast || job.contact_last || "");
  const [pocPhone, setPocPhone] = useState(job.pocPhone || job.poc_phone || "");
  const [pocEmail, setPocEmail] = useState(job.pocEmail || job.poc_email || "");
  const [approver, setApprover] = useState(job.approver || job.approver_first || "");
  const [approverLast, setApproverLast] = useState(job.approverLast || job.approver_last || "");
  const [approverPhone, setApproverPhone] = useState(job.approverPhone || job.approver_phone || "");
  const [approverEmail, setApproverEmail] = useState(job.approverEmail || job.approver_email || "");
  const [companyCode, setCompanyCode] = useState(job.companyCode || job.company_code || "");
  const [costCenter, setCostCenter] = useState(job.costCenter || job.cost_center || "");
  const [po, setPo] = useState(job.po || job.po_number || "");
  const [status, setStatus] = useState(job.status || "Scheduled");
  const [editGooglePin, setEditGooglePin] = useState(job.googlePin || job.google_pin || "");
  const [editPinLat, setEditPinLat] = useState(job.pinLat || job.pin_lat || null);
  const [editPinLng, setEditPinLng] = useState(job.pinLng || job.pin_lng || null);
  const [editPinResolving, setEditPinResolving] = useState(false);
  const [editPinError, setEditPinError] = useState("");
  const [jobNotes, setJobNotes] = useState(job.notes || "");
  const [showUnsaved, setShowUnsaved] = useState(false);

  // Dirty state detection
  const origRef = useRef({
    customer: job.customer || "", jobState: job.jobState || "", county: job.county || "",
    wells: (!job.wells || job.wells.length === 0) ? [""] : job.wells.map(w => w.well_name || w),
    afe: job.afe || "", contactFirst: job.contactFirst || job.contact_first || "",
    contactLast: job.contactLast || job.contact_last || "",
    pocPhone: job.pocPhone || job.poc_phone || "", pocEmail: job.pocEmail || job.poc_email || "",
    approver: job.approver || job.approver_first || "", approverLast: job.approverLast || job.approver_last || "",
    approverPhone: job.approverPhone || job.approver_phone || "", approverEmail: job.approverEmail || job.approver_email || "",
    companyCode: job.companyCode || job.company_code || "", costCenter: job.costCenter || job.cost_center || "",
    po: job.po || job.po_number || "", status: job.status || "Scheduled",
    googlePin: job.googlePin || job.google_pin || "",
  });
  const isDirty = () => {
    const o = origRef.current;
    return customer !== o.customer || jobState !== o.jobState || county !== o.county ||
      JSON.stringify(wellList) !== JSON.stringify(o.wells) || afe !== o.afe ||
      contactFirst !== o.contactFirst || contactLast !== o.contactLast ||
      pocPhone !== o.pocPhone || pocEmail !== o.pocEmail ||
      approver !== o.approver || approverLast !== o.approverLast ||
      approverPhone !== o.approverPhone || approverEmail !== o.approverEmail ||
      companyCode !== o.companyCode || costCenter !== o.costCenter || po !== o.po ||
      status !== o.status || editGooglePin !== o.googlePin;
  };
  const handleClose = () => { if (isDirty()) { setShowUnsaved(true); } else { onClose(); } };

  const VALID_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"];
  const TX_COUNTIES = ["Andrews","Archer","Armstrong","Bailey","Baylor","Borden","Brewster","Briscoe","Brooks","Brown","Callahan","Carson","Castro","Childress","Clay","Cochran","Coke","Coleman","Collingsworth","Comanche","Concho","Cottle","Crane","Crockett","Crosby","Culberson","Dallam","Dawson","Deaf Smith","Dickens","Dimmit","Donley","Eastland","Ector","Edwards","El Paso","Fisher","Floyd","Foard","Gaines","Garza","Glasscock","Gray","Hale","Hall","Hansford","Hardeman","Hartley","Haskell","Hemphill","Howard","Hudspeth","Hutchinson","Irion","Jeff Davis","Jones","Kent","Kimble","King","Kinney","Knox","Lamb","Lampasas","Lipscomb","Llano","Loving","Lubbock","Lynn","Martin","Mason","Maverick","McCulloch","McMullen","Menard","Midland","Mills","Mitchell","Montague","Moore","Motley","Nolan","Ochiltree","Oldham","Palo Pinto","Parmer","Pecos","Potter","Presidio","Randall","Reagan","Real","Reeves","Roberts","Runnels","San Saba","Schleicher","Scurry","Shackelford","Sherman","Stephens","Sterling","Stonewall","Sutton","Swisher","Taylor","Terrell","Terry","Throckmorton","Tom Green","Upton","Uvalde","Val Verde","Ward","Wheeler","Winkler","Yoakum","Young","Zavala"];
  const NM_COUNTIES = ["Chaves","Cibola","Curry","De Baca","Dona Ana","Eddy","Grant","Guadalupe","Harding","Hidalgo","Lea","Lincoln","Los Alamos","Luna","McKinley","Mora","Otero","Quay","Rio Arriba","Roosevelt","San Juan","San Miguel","Sandoval","Santa Fe","Sierra","Socorro","Taos","Torrance","Union","Valencia"];
  const ALL_COUNTIES = [...TX_COUNTIES, ...NM_COUNTIES].sort();
  const filteredCounties = county.length > 0 ? ALL_COUNTIES.filter(c => c.toLowerCase().startsWith(county.toLowerCase())) : [];

  const formatPhone = (val) => { const d = val.replace(/\D/g,"").slice(0,10); if(d.length<=3) return d; if(d.length<=6) return `${d.slice(0,3)}-${d.slice(3)}`; return `${d.slice(0,3)}-${d.slice(3,6)}-${d.slice(6)}`; };
  const formatState = (val) => val.replace(/[^a-zA-Z]/g,"").slice(0,2).toUpperCase();

  const addWell = () => { if (wellList.length < 10) setWellList(prev => [...prev, ""]); };
  const updateWell = (idx, val) => setWellList(prev => prev.map((w, i) => i === idx ? val : w));
  const removeWell = (idx) => setWellList(prev => prev.filter((_, i) => i !== idx));

  const sectionHead = (label) => (
    <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, letterSpacing: "0.08em", marginBottom: 8, marginTop: 4 }}>{label}</div>
  );

  return (
    <ModalWrap title={`Edit Job #${job.id}`} onClose={handleClose} width={600}>
      {showUnsaved && (
        <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }} onClick={() => setShowUnsaved(false)}>
          <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderTop: `4px solid ${C.red}`, borderRadius: 8, padding: 28, width: 400, maxWidth: "90vw" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 10 }}>Unsaved Changes</div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>This job card has unsaved changes. Are you sure you want to close?</div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn onClick={onClose}>YES, DISCARD</Btn>
              <Btn variant="ghost" onClick={() => setShowUnsaved(false)}>KEEP EDITING</Btn>
            </div>
          </div>
        </div>
      )}

      {/* Customer + Status */}
      <div style={{ marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>CUSTOMER</label>
          <input style={inputStyle} value={customer} onChange={e => setCustomer(e.target.value)} />
        </div>
      </div>

      {/* Location */}
      {sectionHead("LOCATION")}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>STATE</label>
          <input style={inputStyle} value={jobState} onChange={e => setJobState(formatState(e.target.value))} placeholder="TX" maxLength={2} />
        </div>
        <div style={{ position: "relative" }}>
          <label style={labelStyle}>COUNTY</label>
          <input style={inputStyle} value={county}
            onChange={e => { setCounty(e.target.value); setShowCountyDrop(true); }}
            onFocus={() => setShowCountyDrop(true)}
            onBlur={() => setTimeout(() => setShowCountyDrop(false), 150)}
            placeholder="Start typing..." />
          {showCountyDrop && filteredCounties.length > 0 && (
            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 20, background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 4, maxHeight: 160, overflowY: "auto", marginTop: 2 }}>
              {filteredCounties.map(c => (
                <div key={c} onMouseDown={() => { setCounty(c); setShowCountyDrop(false); }} style={{ padding: "6px 12px", cursor: "pointer", fontSize: 12 }}
                  onMouseEnter={e => e.currentTarget.style.background = C.steel}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >{c}</div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Wells */}
      {sectionHead("WELL NAME / LOCATION")}
      {wellList.map((w, idx) => (
        <div key={idx} style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, minWidth: 18 }}>{idx + 1}.</div>
          <input style={{ ...inputStyle, flex: 1 }} value={w} onChange={e => updateWell(idx, e.target.value)} placeholder="Well or CTB name..." />
          {wellList.length > 1 && (
            <button type="button" onClick={() => removeWell(idx)} style={{ background: "transparent", border: "none", color: C.red, cursor: "pointer", fontSize: 16, fontWeight: 700 }}>×</button>
          )}
        </div>
      ))}
      {wellList.length < 10 && (
        <button type="button" onClick={addWell} style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 3, padding: "3px 10px", fontSize: 11, fontWeight: 700, color: C.text, cursor: "pointer", marginBottom: 12 }}>+ ADD WELL</button>
      )}
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>AFE</label>
        <input style={{ ...inputStyle, maxWidth: 220 }} value={afe} onChange={e => setAfe(e.target.value)} placeholder="AFE number if applicable" />
      </div>

      {/* Point of Contact */}
      {sectionHead("POINT OF CONTACT")}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
        <div><label style={labelStyle}>FIRST</label><input style={inputStyle} value={contactFirst} onChange={e => setContactFirst(e.target.value)} /></div>
        <div><label style={labelStyle}>LAST</label><input style={inputStyle} value={contactLast} onChange={e => setContactLast(e.target.value)} /></div>
        <div><label style={labelStyle}>PHONE</label><input style={inputStyle} value={pocPhone} onChange={e => setPocPhone(formatPhone(e.target.value))} placeholder="555-555-5555" /></div>
        <div><label style={labelStyle}>EMAIL</label><input style={inputStyle} value={pocEmail} onChange={e => setPocEmail(e.target.value)} placeholder="email@co.com" /></div>
      </div>

      {/* Approver */}
      {sectionHead("APPROVER")}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
        <div><label style={labelStyle}>FIRST</label><input style={inputStyle} value={approver} onChange={e => setApprover(e.target.value)} /></div>
        <div><label style={labelStyle}>LAST</label><input style={inputStyle} value={approverLast} onChange={e => setApproverLast(e.target.value)} /></div>
        <div><label style={labelStyle}>PHONE</label><input style={inputStyle} value={approverPhone} onChange={e => setApproverPhone(formatPhone(e.target.value))} placeholder="555-555-5555" /></div>
        <div><label style={labelStyle}>EMAIL</label><input style={inputStyle} value={approverEmail} onChange={e => setApproverEmail(e.target.value)} placeholder="email@co.com" /></div>
      </div>

      {/* Billing */}
      {sectionHead("BILLING")}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
        <div><label style={labelStyle}>COMPANY CODE</label><input style={inputStyle} value={companyCode} onChange={e => setCompanyCode(e.target.value)} /></div>
        <div><label style={labelStyle}>COST CENTER</label><input style={inputStyle} value={costCenter} onChange={e => setCostCenter(e.target.value)} /></div>
        <div><label style={labelStyle}>PO NUMBER</label><input style={inputStyle} value={po} onChange={e => setPo(e.target.value)} /></div>
      </div>

      {/* Google Pin */}
      {sectionHead("GOOGLE PIN")}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>Google Maps links only. Resolving will auto-fill State and County.</div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 6 }}>
          <input style={{ ...inputStyle, flex: 1, fontFamily: "monospace", fontSize: 11 }}
            value={editGooglePin}
            onChange={e => { setEditGooglePin(e.target.value); setEditPinLat(null); setEditPinLng(null); setEditPinError(""); }}
            placeholder="Paste Google Maps link..." />
          <button type="button"
            onClick={async () => {
              if (!editGooglePin.trim()) return;
              setEditPinResolving(true); setEditPinError("");
              try {
                const r = await fetch(`${API_URL}/jobs/resolve-map-pin`, {
                  method: "POST", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ url: editGooglePin.trim() }),
                });
                if (!r.ok) { setEditPinError("Could not resolve pin."); setEditPinResolving(false); return; }
                const { lat, lng } = await r.json();
                setEditPinLat(lat); setEditPinLng(lng);
                // Geocode to state/county
                const geoR = await fetch(`${API_URL}/jobs/geocode`, {
                  method: "POST", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ lat, lng }),
                });
                if (geoR.ok) {
                  const { state, county: geoCounty } = await geoR.json();
                  if (state) setJobState(state);
                  if (geoCounty) setCounty(geoCounty);
                }
              } catch { setEditPinError("Network error."); }
              setEditPinResolving(false);
            }}
            disabled={!editGooglePin.trim() || editPinResolving}
            style={{ background: editGooglePin.trim() ? C.blue : C.steel, color: editGooglePin.trim() ? C.white : C.muted, border: "none", borderRadius: 4, padding: "8px 14px", fontSize: 11, fontWeight: 700, cursor: editGooglePin.trim() ? "pointer" : "default", whiteSpace: "nowrap", flexShrink: 0 }}>
            {editPinResolving ? "Resolving..." : "RESOLVE"}
          </button>
          {editGooglePin && (
            <button type="button" onClick={() => navigator.clipboard.writeText(editGooglePin)}
              style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 4, padding: "8px 10px", fontSize: 11, fontWeight: 700, color: C.muted, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
              COPY
            </button>
          )}
        </div>
        {editPinError && <div style={{ fontSize: 11, color: C.red, fontWeight: 700 }}>⚠ {editPinError}</div>}
        {editPinLat && editPinLng && (
          <div style={{ fontSize: 11, color: C.green, fontFamily: "monospace" }}>
            ✓ {parseFloat(editPinLat).toFixed(6)}, {parseFloat(editPinLng).toFixed(6)}
          </div>
        )}
        {!editPinLat && editGooglePin && (
          <div style={{ fontSize: 11, color: C.muted, fontStyle: "italic" }}>Resolve to update coordinates</div>
        )}
      </div>

      {/* Notes */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: C.muted, letterSpacing: "0.08em", marginBottom: 4 }}>NOTES</div>
        <textarea
          style={{ width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 12, color: C.text, background: C.cardBg, minHeight: 60, resize: "vertical", boxSizing: "border-box", fontFamily: "'Arial', sans-serif" }}
          value={jobNotes}
          onChange={e => setJobNotes(e.target.value)}
          placeholder="Internal notes — visible on job card only, not on field tickets"
        />
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <Btn onClick={() => {
          if (jobState && !VALID_STATES.includes(jobState)) return;
          const cleanWells = wellList.map(w => w.trim()).filter(Boolean);
          onSave({
            customer, status,
            job_state: jobState, county,
            location: [county, jobState].filter(Boolean).join(", ") || job.location,
            wells: cleanWells.length > 0 ? cleanWells.map(w => ({ well_name: w })) : [{ well_name: "TBD" }],
            afe: afe || null,
            contact_first: contactFirst, contact_last: contactLast,
            poc_phone: pocPhone, poc_email: pocEmail,
            approver: approver, approver_last: approverLast,
            approver_phone: approverPhone, approver_email: approverEmail,
            company_code: companyCode, cost_center: costCenter, po_number: po,
            google_pin: editGooglePin || null,
            pin_lat: editPinLat || null,
            pin_lng: editPinLng || null,
            notes: jobNotes || null,
          });
        }}>SAVE</Btn>
        <Btn onClick={onClose} variant="ghost">CANCEL</Btn>
      </div>
    </ModalWrap>
  );
}

// ─── NEW JOB MODAL ────────────────────────────────────────────────────────────
function NewJobModal({ onClose, onCreateJob, customers, users = [] }) {
  const [custSearch, setCustSearch] = useState("");
  const [showCustDrop, setShowCustDrop] = useState(false);
  const [selectedCust, setSelectedCust] = useState(null);
  const [jobState, setJobState] = useState("");
  const [county, setCounty] = useState("");
  const [showCountyDrop, setShowCountyDrop] = useState(false);
  const [wellList, setWellList] = useState([""]);
  const [wellTBD, setWellTBD] = useState(false);
  const [jobNotes, setJobNotes] = useState("");
  const [afe, setAfe] = useState("");
  const [schedDate, setSchedDate] = useState("");
  const [salesman, setSalesman] = useState("");
  const [contactFirst, setContactFirst] = useState("");
  const [contactLast, setContactLast] = useState("");
  const [approver, setApprover] = useState("");
  const [approverLast, setApproverLast] = useState("");
  const [approverPhone, setApproverPhone] = useState("");
  const [approverEmail, setApproverEmail] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [companyCode, setCompanyCode] = useState("");
  const [costCenter, setCostCenter] = useState("");
  const [po, setPo] = useState("");
  const [googlePin, setGooglePin] = useState("");
  const [pinLat, setPinLat] = useState(null);
  const [pinLng, setPinLng] = useState(null);
  const [pinResolving, setPinResolving] = useState(false);
  const [pinError, setPinError] = useState("");
  const [stateLockedByPin, setStateLockedByPin] = useState(false);
  const [countyLockedByPin, setCountyLockedByPin] = useState(false);
  const [errors, setErrors] = useState({});
  const [showUnsaved, setShowUnsaved] = useState(false);

  // Salesman users list
  const salesmen = users.filter(u => u.role === "salesman");

  const isDirty = custSearch || contactFirst || contactLast || phone || email ||
    approver || approverLast || approverPhone || approverEmail ||
    companyCode || costCenter || po || jobState || county ||
    wellList.some(w => w.trim()) || afe || schedDate || salesman || googlePin;

  const formatPhone = (val) => {
    const digits = val.replace(/\D/g, "").slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0,3)}-${digits.slice(3)}`;
    return `${digits.slice(0,3)}-${digits.slice(3,6)}-${digits.slice(6)}`;
  };
  const formatState = (val) => val.replace(/[^a-zA-Z]/g, "").slice(0, 2).toUpperCase();

  const TX_COUNTIES = ["Andrews","Archer","Armstrong","Bailey","Baylor","Borden","Brewster","Briscoe","Brooks","Brown","Callahan","Carson","Castro","Childress","Clay","Cochran","Coke","Coleman","Collingsworth","Comanche","Concho","Cottle","Crane","Crockett","Crosby","Culberson","Dallam","Dawson","Deaf Smith","Dickens","Dimmit","Donley","Eastland","Ector","Edwards","El Paso","Fisher","Floyd","Foard","Gaines","Garza","Glasscock","Gray","Hale","Hall","Hansford","Hardeman","Hartley","Haskell","Hemphill","Howard","Hudspeth","Hutchinson","Irion","Jeff Davis","Jones","Kent","Kimble","King","Kinney","Knox","Lamb","Lampasas","Lipscomb","Llano","Loving","Lubbock","Lynn","Martin","Mason","Maverick","McCulloch","McMullen","Menard","Midland","Mills","Mitchell","Montague","Moore","Motley","Nolan","Ochiltree","Oldham","Palo Pinto","Parmer","Pecos","Potter","Presidio","Randall","Reagan","Real","Reeves","Roberts","Runnels","San Saba","Schleicher","Scurry","Shackelford","Sherman","Stephens","Sterling","Stonewall","Sutton","Swisher","Taylor","Terrell","Terry","Throckmorton","Tom Green","Upton","Uvalde","Val Verde","Ward","Wheeler","Winkler","Yoakum","Young","Zavala"];
  const NM_COUNTIES = ["Chaves","Cibola","Curry","De Baca","Dona Ana","Eddy","Grant","Guadalupe","Harding","Hidalgo","Lea","Lincoln","Los Alamos","Luna","McKinley","Mora","Otero","Quay","Rio Arriba","Roosevelt","San Juan","San Miguel","Sandoval","Santa Fe","Sierra","Socorro","Taos","Torrance","Union","Valencia"];
  const ALL_COUNTIES = [...TX_COUNTIES, ...NM_COUNTIES].sort();
  const filteredCounties = county.length > 0 ? ALL_COUNTIES.filter(c => c.toLowerCase().startsWith(county.toLowerCase())) : [];
  const filteredCust = custSearch.length > 0 ? customers.filter(c => c.name.toLowerCase().includes(custSearch.toLowerCase())) : customers;

  const selectCustomer = (cust) => {
    setSelectedCust(cust); setCustSearch(cust.name); setShowCustDrop(false);
    setErrors(prev => ({ ...prev, customer: null }));
  };

  const addWell = () => { if (wellList.length < 10) setWellList(prev => [...prev, ""]); };
  const updateWell = (idx, val) => setWellList(prev => prev.map((w, i) => i === idx ? val : w));
  const removeWell = (idx) => setWellList(prev => prev.filter((_, i) => i !== idx));
  const handleClose = () => { if (isDirty) { setShowUnsaved(true); } else { onClose(); } };

  // Resolve Google pin → lat/lng → geocode → state/county
  const resolvePin = async (pinUrl) => {
    if (!pinUrl.trim()) return;
    setPinResolving(true); setPinError("");
    try {
      // Step 1: resolve short URL to coordinates via existing backend resolver
      const resolveR = await fetch(`${API_URL}/jobs/resolve-map-pin`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: pinUrl.trim() }),
      });
      if (!resolveR.ok) { setPinError("Could not resolve pin link. Check the URL and try again."); setPinResolving(false); return; }
      const { lat, lng } = await resolveR.json();
      if (!lat || !lng) { setPinError("No coordinates found in this link."); setPinResolving(false); return; }
      setPinLat(lat); setPinLng(lng);
      // Step 2: geocode coordinates → state + county
      const geoR = await fetch(`${API_URL}/jobs/geocode`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lng }),
      });
      if (geoR.ok) {
        const { state, county: geoCounty } = await geoR.json();
        if (state) { setJobState(state); setStateLockedByPin(true); }
        if (geoCounty) { setCounty(geoCounty); setCountyLockedByPin(true); }
      }
    } catch { setPinError("Network error resolving pin. Try again."); }
    setPinResolving(false);
  };

  const handlePinChange = (val) => {
    setGooglePin(val);
    setPinLat(null); setPinLng(null);
    setPinError("");
    setStateLockedByPin(false); setCountyLockedByPin(false);
  };

  const VALID_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"];

  const validateAndCreate = () => {
    const errs = {};
    if (!custSearch.trim()) errs.customer = "Customer is required";
    if (!wellTBD && !wellList.some(w => w.trim())) errs.wells = "At least one well name is required";
    if (!jobState.trim()) errs.jobState = "State is required";
    if (!county.trim()) errs.county = "County is required";
    if (!contactFirst.trim()) errs.contactFirst = "Point of Contact first name is required";
    if (!contactLast.trim()) errs.contactLast = "Point of Contact last name is required";
    if (!phone.trim()) errs.phone = "Point of Contact phone is required";
    if (!salesman) errs.salesman = "Salesman selection is required";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Invalid email format";
    if (approverEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(approverEmail)) errs.approverEmail = "Invalid email format";
    if (jobState && !VALID_STATES.includes(jobState.toUpperCase())) errs.jobState = "Invalid state code";
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      const firstKey = Object.keys(errs)[0];
      const el = document.querySelector(`[data-error="${firstKey}"]`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setErrors({});
    const cleanWells = wellTBD ? ["TBD"] : wellList.map(w => w.trim()).filter(Boolean);
    onCreateJob({
      id: null,
      customer: custSearch.trim(),
      location: [county, jobState].filter(Boolean).join(", ") || "TBD",
      jobState, county,
      wells: cleanWells.length > 0 ? cleanWells : ["TBD"],
      afe: afe || null,
      dateStarted: schedDate || today(),
      status: "Scheduled",
      salesman: salesman || null,
      crew: [],
      equipment: [],
      hoursLogged: 0, estimatedCost: 0, jsaComplete: false,
      contactFirst, contactLast, email, phone,
      approver, approverLast, approverPhone, approverEmail,
      companyCode, costCenter, po,
      googlePin: googlePin || null,
      pinLat: pinLat || null,
      pinLng: pinLng || null,
      notes: jobNotes || null,
    });
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "#00000088",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
    }} onClick={handleClose}>
      <div style={{
        background: C.cardBg, border: `1px solid ${C.border}`,
        borderTop: `3px solid ${C.red}`, borderRadius: 8,
        padding: 28, width: 640, maxWidth: "95vw", maxHeight: "85vh", overflowY: "auto",
        margin: "20px 0",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>NEW JOB CARD</div>

        {/* Scheduled Date + Salesman — TOP */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label style={labelStyle}>SCHEDULED DATE</label>
            <input type="date" style={inputStyle} value={schedDate} onChange={e => setSchedDate(e.target.value)} />
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label style={labelStyle}>SALESMAN *</label>
            <select style={{ ...inputStyle, borderColor: errors.salesman ? C.red : C.border }} value={salesman} onChange={e => { setSalesman(e.target.value); setErrors(prev => ({...prev, salesman: null})); }}>
              <option value="">— Select —</option>
              <option value="No Salesman Assigned">No Salesman Assigned</option>
              {salesmen.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
            </select>
            {errors.salesman && <div data-error="salesman" style={{ fontSize: 11, color: C.red, marginTop: 3, fontWeight: 700 }}>⚠ {errors.salesman}</div>}
          </div>
        </div>

        {/* Customer */}
        <div style={{ marginBottom: 14, position: "relative" }}>
          <label style={labelStyle}>CUSTOMER *</label>
          <input
            style={{ ...inputStyle, borderColor: errors.customer ? C.red : selectedCust ? C.green : C.border }}
            value={custSearch}
            onChange={e => { setCustSearch(e.target.value); setShowCustDrop(true); setSelectedCust(null); setErrors(prev => ({ ...prev, customer: null })); }}
            onFocus={() => setShowCustDrop(true)}
            placeholder="Type to search or browse..."
          />
          {errors.customer && <div data-error="customer" style={{ fontSize: 11, color: C.red, marginTop: 3, fontWeight: 700 }}>⚠ {errors.customer}</div>}
          {showCustDrop && (
            <div style={{
              position: "absolute", top: "100%", left: 0, right: 0, zIndex: 10,
              background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 6,
              boxShadow: "0 8px 32px #00000022", maxHeight: 220, overflowY: "auto", marginTop: 2,
            }}>
              {filteredCust.map(c => (
                <div key={c.name} onClick={() => selectCustomer(c)} style={{
                  padding: "8px 12px", cursor: "pointer", fontSize: 12,
                  display: "flex", justifyContent: "space-between",
                }}
                  onMouseEnter={e => e.currentTarget.style.background = C.steel}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <span style={{ fontWeight: 700, color: C.text }}>{c.name}</span>
                  <span style={{ color: C.muted, fontSize: 11 }}>{[c.city, c.state].filter(Boolean).join(", ")}</span>
                </div>
              ))}
              {filteredCust.length === 0 && <div style={{ padding: 10, color: C.muted, fontSize: 12, textAlign: "center" }}>No matches</div>}
            </div>
          )}
        </div>

        {/* Contact info */}
        <div style={{ background: C.steel, border: `1px solid ${C.border}`, borderRadius: 6, padding: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: C.muted, letterSpacing: "0.08em", marginBottom: 10 }}>CONTACT INFORMATION</div>

          {/* Site Manager */}
          <div style={{ fontSize: 10, fontWeight: 800, color: C.blue, letterSpacing: "0.1em", marginBottom: 6 }}>POINT OF CONTACT</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>FIRST NAME *</label>
              <input style={{ ...inputStyle, borderColor: errors.contactFirst ? C.red : C.border }} value={contactFirst} onChange={e => { setContactFirst(e.target.value); setErrors(prev => ({...prev, contactFirst: null})); }} placeholder="First" />
              {errors.contactFirst && <div data-error="contactFirst" style={{ fontSize: 11, color: C.red, marginTop: 3, fontWeight: 700 }}>⚠ {errors.contactFirst}</div>}
            </div>
            <div>
              <label style={labelStyle}>LAST NAME *</label>
              <input style={{ ...inputStyle, borderColor: errors.contactLast ? C.red : C.border }} value={contactLast} onChange={e => { setContactLast(e.target.value); setErrors(prev => ({...prev, contactLast: null})); }} placeholder="Last" />
              {errors.contactLast && <div data-error="contactLast" style={{ fontSize: 11, color: C.red, marginTop: 3, fontWeight: 700 }}>⚠ {errors.contactLast}</div>}
            </div>
            <div>
              <label style={labelStyle}>PHONE *</label>
              <input style={{ ...inputStyle, borderColor: errors.phone ? C.red : C.border }} value={phone} onChange={e => { setPhone(formatPhone(e.target.value)); setErrors(prev => ({...prev, phone: null})); }} placeholder="555-555-5555" />
              {errors.phone && <div data-error="phone" style={{ fontSize: 11, color: C.red, marginTop: 3, fontWeight: 700 }}>⚠ {errors.phone}</div>}
            </div>
            <div>
              <label style={labelStyle}>EMAIL</label>
              <input style={{ ...inputStyle, borderColor: errors.email ? C.red : C.border }} value={email} onChange={e => { setEmail(e.target.value); setErrors(prev => ({...prev, email: null})); }} placeholder="sitemanager@company.com" />
              {errors.email && <div data-error="email" style={{ fontSize: 11, color: C.red, marginTop: 3 }}>{errors.email}</div>}
            </div>
          </div>

          {/* Approver */}
          <div style={{ fontSize: 10, fontWeight: 800, color: C.blue, letterSpacing: "0.1em", marginBottom: 6 }}>APPROVER</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
            <div>
              <label style={labelStyle}>FIRST NAME</label>
              <input style={inputStyle} value={approver} onChange={e => setApprover(e.target.value)} placeholder="First" />
            </div>
            <div>
              <label style={labelStyle}>LAST NAME</label>
              <input style={inputStyle} value={approverLast} onChange={e => setApproverLast(e.target.value)} placeholder="Last" />
            </div>
            <div>
              <label style={labelStyle}>PHONE</label>
              <input style={inputStyle} value={approverPhone} onChange={e => setApproverPhone(formatPhone(e.target.value))} placeholder="555-555-5555" />
            </div>
            <div>
              <label style={labelStyle}>EMAIL</label>
              <input style={{ ...inputStyle, borderColor: errors.approverEmail ? C.red : C.border }} value={approverEmail} onChange={e => { setApproverEmail(e.target.value); setErrors(prev => ({...prev, approverEmail: null})); }} placeholder="approver@company.com" />
              {errors.approverEmail && <div data-error="approverEmail" style={{ fontSize: 11, color: C.red, marginTop: 3 }}>{errors.approverEmail}</div>}
            </div>
          </div>
        </div>

        {/* Billing codes */}
        <div style={{ background: C.steel, border: `1px solid ${C.border}`, borderRadius: 6, padding: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: C.muted, letterSpacing: "0.08em", marginBottom: 10 }}>BILLING INFORMATION</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <div>
              <label style={labelStyle}>COMPANY CODE</label>
              <input style={inputStyle} value={companyCode} onChange={e => setCompanyCode(e.target.value)} placeholder="e.g. 0064" />
            </div>
            <div>
              <label style={labelStyle}>COST CENTER</label>
              <input style={inputStyle} value={costCenter} onChange={e => setCostCenter(e.target.value)} placeholder="Cost center" />
            </div>
            <div>
              <label style={labelStyle}>PO NUMBER</label>
              <input style={inputStyle} value={po} onChange={e => setPo(e.target.value)} placeholder="Optional" />
            </div>
          </div>
        </div>

        {/* Location */}
        <div style={{ background: C.steel, border: `1px solid ${C.border}`, borderRadius: 6, padding: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: C.muted, letterSpacing: "0.08em", marginBottom: 10 }}>LOCATION</div>

          {/* Google Pin — first */}
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>GOOGLE PIN <span style={{ fontSize: 10, color: C.muted, fontWeight: 400, letterSpacing: 0 }}>— Google Maps links only</span></label>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <input
                style={{ ...inputStyle, flex: 1, fontFamily: "monospace", fontSize: 11 }}
                value={googlePin}
                onChange={e => handlePinChange(e.target.value)}
                placeholder="Paste Google Maps link..."
              />
              <button type="button" onClick={() => resolvePin(googlePin)} disabled={!googlePin.trim() || pinResolving}
                style={{
                  background: googlePin.trim() ? C.blue : C.steel, color: googlePin.trim() ? C.white : C.muted,
                  border: "none", borderRadius: 4, padding: "8px 14px", fontSize: 11, fontWeight: 700,
                  cursor: googlePin.trim() ? "pointer" : "default", whiteSpace: "nowrap", flexShrink: 0,
                }}>{pinResolving ? "Resolving..." : "RESOLVE"}</button>
            </div>
            {pinError && <div style={{ fontSize: 11, color: C.red, marginTop: 4, fontWeight: 700 }}>⚠ {pinError}</div>}
            {pinLat && pinLng && (
              <div style={{ marginTop: 6, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: C.green }}>✓ PIN RESOLVED</span>
                <span style={{ fontSize: 11, color: C.muted, fontFamily: "monospace" }}>{parseFloat(pinLat).toFixed(6)}, {parseFloat(pinLng).toFixed(6)}</span>
                <button type="button" onClick={() => { navigator.clipboard.writeText(googlePin || `${pinLat},${pinLng}`); }}
                  style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 3, padding: "2px 8px", fontSize: 10, fontWeight: 700, color: C.muted, cursor: "pointer" }}>
                  COPY PIN
                </button>
              </div>
            )}
          </div>

          {/* State / County — derived from pin, manually editable with warning */}
          {(stateLockedByPin || countyLockedByPin) && (
            <div style={{ fontSize: 11, color: C.blue, background: "#e8f0fb", border: `1px solid ${C.blue}22`, borderRadius: 4, padding: "6px 10px", marginBottom: 8 }}>
              State and County are auto-filled from the pin. Editing them manually will break the pin association.
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <label style={labelStyle}>STATE *</label>
                {stateLockedByPin && (
                  <button type="button" onClick={() => setStateLockedByPin(false)}
                    style={{ background: "transparent", border: "none", fontSize: 10, color: C.muted, cursor: "pointer", padding: 0 }}>unlock</button>
                )}
              </div>
              <input style={{ ...inputStyle, borderColor: errors.jobState ? C.red : stateLockedByPin ? C.blue : C.border }}
                value={jobState} onChange={e => !stateLockedByPin && setJobState(formatState(e.target.value))}
                readOnly={stateLockedByPin} placeholder="TX" maxLength={2} />
              {errors.jobState && <div data-error="jobState" style={{ fontSize: 10, color: C.red, marginTop: 2 }}>{errors.jobState}</div>}
            </div>
            <div style={{ position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <label style={labelStyle}>COUNTY *</label>
                {countyLockedByPin && (
                  <button type="button" onClick={() => setCountyLockedByPin(false)}
                    style={{ background: "transparent", border: "none", fontSize: 10, color: C.muted, cursor: "pointer", padding: 0 }}>unlock</button>
                )}
              </div>
              <input style={{ ...inputStyle, borderColor: errors.county ? C.red : countyLockedByPin ? C.blue : C.border }}
                value={county}
                onChange={e => { if (!countyLockedByPin) { setCounty(e.target.value); setShowCountyDrop(true); setErrors(prev => ({...prev, county: null})); } }}
                onFocus={() => !countyLockedByPin && setShowCountyDrop(true)}
                onBlur={() => setTimeout(() => setShowCountyDrop(false), 150)}
                placeholder="Start typing..."
                readOnly={countyLockedByPin}
              />
              {errors.county && <div data-error="county" style={{ fontSize: 11, color: C.red, marginTop: 3, fontWeight: 700 }}>⚠ {errors.county}</div>}
              {showCountyDrop && filteredCounties.length > 0 && !countyLockedByPin && (
                <div style={{
                  position: "absolute", top: "100%", left: 0, right: 0, zIndex: 20,
                  background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 4,
                  boxShadow: "0 4px 16px #00000022", maxHeight: 180, overflowY: "auto", marginTop: 2,
                }}>
                  {filteredCounties.map(c => (
                    <div key={c} onMouseDown={() => { setCounty(c); setShowCountyDrop(false); }}
                      style={{ padding: "6px 12px", cursor: "pointer", fontSize: 12 }}
                      onMouseEnter={e => e.currentTarget.style.background = C.steel}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >{c}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Wells */}
        <div style={{ background: C.steel, border: `1px solid ${C.border}`, borderRadius: 6, padding: 14, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: C.muted, letterSpacing: "0.08em" }}>WELL NAME / LOCATION *</div>
              <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontSize: 11, fontWeight: 700, color: wellTBD ? C.blue : C.muted }}>
                <input type="checkbox" checked={wellTBD} onChange={e => { setWellTBD(e.target.checked); if (e.target.checked) setErrors(prev => ({ ...prev, wells: null })); }} style={{ width: 14, height: 14, accentColor: C.blue }} />
                TBD
              </label>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {wellList.length > 1 && (
                <span style={{ fontSize: 11, color: C.muted }}>{wellList.filter(w => w.trim()).length} of {wellList.length} named</span>
              )}
              {wellList.length < 10 && (
                <button type="button" onClick={addWell} style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 3, padding: "2px 8px", fontSize: 11, fontWeight: 700, color: C.text, cursor: "pointer" }}>+ ADD WELL</button>
              )}
            </div>
          </div>
          {wellTBD ? (
            <div style={{ padding: "10px 0", fontSize: 12, color: C.muted, fontStyle: "italic" }}>Well name will be set to TBD — update via Edit Job when known.</div>
          ) : (
          <>
          {wellList.map((w, idx) => (
            <div key={idx} style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, minWidth: 20, textAlign: "right" }}>{idx + 1}.</div>
              <input
                style={{ ...inputStyle, flex: 1 }}
                value={w}
                onChange={e => updateWell(idx, e.target.value)}
                placeholder="Well name or CTB name..."
              />
              {wellList.length > 1 && (
                <button type="button" onClick={() => removeWell(idx)} style={{ background: "transparent", border: "none", color: C.red, cursor: "pointer", fontSize: 16, fontWeight: 700, padding: "0 4px" }}>×</button>
              )}
            </div>
          ))}
          </>
          )}
          {errors.wells && <div data-error="wells" style={{ fontSize: 11, color: C.red, marginTop: 3, fontWeight: 700 }}>⚠ {errors.wells}</div>}
          <div style={{ marginTop: 10 }}>
            <label style={labelStyle}>AFE</label>
            <input style={{ ...inputStyle, maxWidth: 240 }} value={afe} onChange={e => setAfe(e.target.value)} placeholder="AFE number if applicable" />
          </div>
        </div>

        {/* Notes */}
        <div style={{ background: C.steel, border: `1px solid ${C.border}`, borderRadius: 6, padding: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: C.muted, letterSpacing: "0.08em", marginBottom: 6 }}>NOTES</div>
          <textarea
            style={{ ...inputStyle, minHeight: 60, resize: "vertical", width: "100%", boxSizing: "border-box" }}
            value={jobNotes}
            onChange={e => setJobNotes(e.target.value)}
            placeholder="Internal notes — visible on job card only, not on field tickets"
          />
        </div>

        {/* Scheduling */}

        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <Btn onClick={validateAndCreate}>CREATE JOB CARD</Btn>
          <Btn onClick={handleClose} variant="ghost">CANCEL</Btn>
        </div>

        {/* Unsaved changes confirmation */}
        {showUnsaved && (
          <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }} onClick={() => setShowUnsaved(false)}>
            <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderTop: `4px solid ${C.red}`, borderRadius: 8, padding: 24, width: 380, maxWidth: "90vw" }} onClick={e => e.stopPropagation()}>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 10 }}>Unsaved Changes</div>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>You have unsaved information. Are you sure you want to close without creating this job?</div>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn onClick={onClose}>YES, DISCARD</Btn>
                <Btn variant="ghost" onClick={() => setShowUnsaved(false)}>KEEP EDITING</Btn>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


// ─── JSA MODAL ────────────────────────────────────────────────────────────────
function JSAModal({ job, ticket, onClose, onSave, existingJSA }) {
  const jsa = existingJSA;
  const ticketNum = ticket ? `${job.id}${ticket.ticketNumber ? `-${ticket.ticketNumber}` : ""}` : job.id;
  const wellsList = ticket?.assignedWells?.length > 0
    ? ticket.assignedWells
    : (job.wells || []).map(w => typeof w === "string" ? w : w.well_name || w);
  const [date, setDate] = useState(jsa?.date || ticket?.date?.slice(0, 10) || today());
  const [operator, setOperator] = useState(jsa?.operator || job.customer);
  const [wellName, setWellName] = useState(jsa?.wellName || jsa?.well_name || wellsList[0] || "");
  const [time, setTime] = useState(jsa?.time || "");
  const [designatedDriver, setDesignatedDriver] = useState(jsa?.designatedDriver || "");
  const [lat, setLat] = useState(jsa?.lat || jsa?.latitude || "");
  const [lng, setLng] = useState(jsa?.lng || jsa?.longitude || "");
  const [mapLink, setMapLink] = useState(() => {
    const la = jsa?.lat || jsa?.latitude;
    const ln = jsa?.lng || jsa?.longitude;
    return (la && ln) ? `${la}, ${ln}` : "";
  });
  const [mapResolving, setMapResolving] = useState(false);
  const [weather, setWeather] = useState(jsa?.weather || []);
  const [ppe, setPpe] = useState(jsa?.ppe || { frClothing: false, toolsTrained: false, confinedSpace: false });
  const [signatures, setSignatures] = useState(jsa?.signatures || [""]);
  const [presenterReview, setPresenterReview] = useState(jsa?.presenterReview ||
    "STOP WORK AUTHORITY. Slips Trips Falls. Keep Walkways Clear. Confined Spaces & Pinch Points. Hands Visible at all times. Eye Safety. 100% Tie Off Policy. Location of Emergency First Aid Kit and how to find the nearest hospital. Importance of a good attitude. Good Communication is key!"
  );
  const [additionalSteps, setAdditionalSteps] = useState(jsa?.additionalSteps || [{ step: "", hazard: "", procedure: "" }]);

  const weatherOpts = ["clear", "cloudy", "calm", "rain", "mud", "hot", "windy", "freezing", "ice", "snow"];

  const PRE_FILLED_STEPS = [
    { step: "Driving to/from or in and around location", hazard: "Driving too fast. Backing without a spotter. Being unaware of surroundings. Using a cell phone while operating a vehicle.", procedure: "Communicate with those around you using signals/lights/horn. Do not use cell phone while driving. Eliminate distractions." },
    { step: "SDS", hazard: "Chemical Exposure", procedure: "SDS electronically or physically available on site." },
    { step: "Worksite & PPE inspection of all equipment", hazard: "Slips, trips, falls, pinch points, enclosed areas, poor lighting, H2S. Defective, absent, or dirty PPE.", procedure: "Repair, replace or clean necessary items. Remove debris. Identify PPE needed & safe handling procedures." },
    { step: "Receive authorization to begin work", hazard: "Onsite Operations Supervisor not aware of work being performed or permits not completed.", procedure: "Receive authorization from the person in charge. Complete all applicable Permits to Work." },
    { step: "Conduct Safety Meeting with all onsite workers", hazard: "Jobsite workers not knowing what activity is about to take place. Hazardous conditions not observed by personnel.", procedure: "Review with all personnel & sign off on safety meeting sheet. Allow others to voice concerns, comments, questions." },
    { step: "Begin job slowly. Watch for personnel not paying attention.", hazard: "Quick movements can result in poor awareness of surrounding personnel and can easily cause unintentional reactions.", procedure: "Work slow and steady. If situations require quick movements, alert everyone before moving." },
  ];

  const toggleWeather = (w) => setWeather(prev => prev.includes(w) ? prev.filter(x => x !== w) : [...prev, w]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={onClose}>
      <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderTop: `4px solid ${C.text}`, borderRadius: 8, padding: 0, width: 900, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: "16px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "0.06em" }}>FLO-TEST, INC. — JSA</div>
            <div style={{ fontSize: 11, color: C.muted }}>#{ticketNum} — Tailgate Safety Meeting · {job.customer}{ticket ? ` · ${ticket.type}` : ""}</div>
          </div>
          <div style={{ fontSize: 11, color: C.muted }}>AIRLIFE: 800-627-2376</div>
        </div>

        <div style={{ padding: "16px 24px" }}>
          {/* Top fields */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
            <div><label style={labelStyle}>DATE</label><input type="date" style={inputStyle} value={date} onChange={e => setDate(e.target.value)} /></div>
            <div><label style={labelStyle}>TIME</label><input style={inputStyle} value={time} onChange={e => setTime(e.target.value)} placeholder="07:00" /></div>
            <div><label style={labelStyle}>OPERATOR</label><input style={inputStyle} value={operator} onChange={e => setOperator(e.target.value)} /></div>
            <div><label style={labelStyle}>WELL NAME & #</label><input style={inputStyle} value={wellName} onChange={e => setWellName(e.target.value)} /></div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            <div><label style={labelStyle}>DESIGNATED DRIVER</label><input style={inputStyle} value={designatedDriver} onChange={e => setDesignatedDriver(e.target.value)} /></div>
            <div>
              <label style={labelStyle}>LOCATION PIN (Paste Google Maps link or coordinates)</label>
              <input style={inputStyle} value={mapLink} onChange={e => {
                const val = e.target.value;
                setMapLink(val);
                // Try local parsing first
                let matched = false;
                const patterns = [
                  /[?&@]q?=?([-\d.]+)[,\s]+([-\d.]+)/,
                  /@([-\d.]+),([-\d.]+)/,
                  /\/([-]?\d{1,3}\.\d+),([-]?\d{1,3}\.\d+)/,
                ];
                for (const p of patterns) {
                  const m = val.match(p);
                  if (m) { setLat(m[1]); setLng(m[2]); matched = true; break; }
                }
                const rawMatch = val.trim().match(/^([-]?\d{1,3}\.\d+)[,\s]+([-]?\d{1,3}\.\d+)$/);
                if (!matched && rawMatch) { setLat(rawMatch[1]); setLng(rawMatch[2]); matched = true; }
                // If it's a URL but no coords found, call backend resolver
                if (!matched && (val.includes("maps.app.goo.gl") || val.includes("goo.gl/maps") || val.includes("google.com/maps"))) {
                  setMapResolving(true);
                  fetch(`${API_URL}/jobs/resolve-map-pin`, {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ url: val }),
                  })
                    .then(r => r.json())
                    .then(data => {
                      if (data.lat && data.lng) { setLat(data.lat); setLng(data.lng); }
                      setMapResolving(false);
                    })
                    .catch(() => setMapResolving(false));
                }
              }} placeholder="Paste Google Maps link or lat, lon" />
              {mapResolving && <div style={{ fontSize: 11, color: C.blue, marginTop: 4, fontWeight: 600 }}>Resolving location...</div>}
              {!mapResolving && lat && lng && (
                <div style={{ marginTop: 6, display: "flex", gap: 12, alignItems: "center", fontSize: 11 }}>
                  <span style={{ color: C.green, fontWeight: 700 }}>✓ Lat: {lat} &nbsp; Lon: {lng}</span>
                  <a href={`https://www.google.com/maps?q=${lat},${lng}`} target="_blank" rel="noopener noreferrer"
                    style={{ color: C.blue, fontWeight: 600, textDecoration: "none" }}>
                    View on Google Maps ↗
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Crew Signatures */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>CREW SIGNATURES (By signing, each person acknowledges STOP WORK AUTHORITY)</label>
            {signatures.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                <input style={{ ...inputStyle, flex: 1 }} value={s} onChange={e => { const ns = [...signatures]; ns[i] = e.target.value; setSignatures(ns); }} placeholder={`Crew member ${i + 1}`} />
                {signatures.length > 1 && <button onClick={() => setSignatures(prev => prev.filter((_, j) => j !== i))} style={{ background: "transparent", border: "none", color: C.red, cursor: "pointer", fontSize: 16 }}>×</button>}
              </div>
            ))}
            <Btn small variant="ghost" onClick={() => setSignatures(prev => [...prev, ""])}>+ ADD SIGNATURE</Btn>
          </div>

          {/* Presenter Review */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>PRESENTER REVIEW</label>
            <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 60, fontSize: 11 }} value={presenterReview} onChange={e => setPresenterReview(e.target.value)} />
          </div>

          {/* PPE & Weather */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>PPE CHECK</label>
              {[["frClothing", "FR Clothing, H2S Monitor, Hard Hat, Safety Glasses, Steel Toed Footwear"], ["toolsTrained", "Trained in use of tools / equipment"], ["confinedSpace", "Confined space permit completed?"]].map(([k, lbl]) => (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, cursor: "pointer" }} onClick={() => setPpe(p => ({ ...p, [k]: !p[k] }))}>
                  <div style={{ width: 16, height: 16, borderRadius: 3, border: `2px solid ${ppe[k] ? C.green : C.muted}`, background: ppe[k] ? C.green : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {ppe[k] && <span style={{ color: C.white, fontSize: 10, fontWeight: 900 }}>✓</span>}
                  </div>
                  <span style={{ fontSize: 11, color: C.text }}>{lbl}</span>
                </div>
              ))}
            </div>
            <div>
              <label style={labelStyle}>WEATHER CONDITIONS</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {weatherOpts.map(w => (
                  <button key={w} onClick={() => toggleWeather(w)} style={{
                    background: weather.includes(w) ? C.blue : "transparent",
                    color: weather.includes(w) ? C.white : C.muted,
                    border: `1px solid ${weather.includes(w) ? C.blue : C.border}`,
                    borderRadius: 4, padding: "3px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer",
                  }}>{w}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Pre-filled Job Steps */}
          <label style={labelStyle}>BASIC JOB STEPS / POTENTIAL HAZARDS / SAFE PROCEDURES</label>
          <div style={{ border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden", marginBottom: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 1fr 1fr", background: C.darkBlue, padding: "8px 10px" }}>
              {["#", "Basic Job Step", "Potential Hazards", "Recommended Safe Procedures"].map(h => (
                <div key={h} style={{ fontSize: 9, fontWeight: 800, color: C.white, letterSpacing: "0.08em" }}>{h}</div>
              ))}
            </div>
            {PRE_FILLED_STEPS.map((s, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "40px 1fr 1fr 1fr", padding: "6px 10px", borderBottom: `1px solid ${C.border}22`, background: i % 2 === 0 ? C.cardBg : C.steel }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted }}>{i + 1}</div>
                <div style={{ fontSize: 10, color: C.text, paddingRight: 8 }}>{s.step}</div>
                <div style={{ fontSize: 10, color: C.text, paddingRight: 8 }}>{s.hazard}</div>
                <div style={{ fontSize: 10, color: C.text }}>{s.procedure}</div>
              </div>
            ))}
            {/* Additional blank steps */}
            {additionalSteps.map((s, i) => (
              <div key={`a${i}`} style={{ display: "grid", gridTemplateColumns: "40px 1fr 1fr 1fr", padding: "4px 10px", borderBottom: `1px solid ${C.border}22`, gap: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted }}>{PRE_FILLED_STEPS.length + i + 1}</div>
                <input style={{ ...inputStyle, padding: "3px 6px", fontSize: 10 }} value={s.step} onChange={e => { const ns = [...additionalSteps]; ns[i].step = e.target.value; setAdditionalSteps(ns); }} />
                <input style={{ ...inputStyle, padding: "3px 6px", fontSize: 10 }} value={s.hazard} onChange={e => { const ns = [...additionalSteps]; ns[i].hazard = e.target.value; setAdditionalSteps(ns); }} />
                <input style={{ ...inputStyle, padding: "3px 6px", fontSize: 10 }} value={s.procedure} onChange={e => { const ns = [...additionalSteps]; ns[i].procedure = e.target.value; setAdditionalSteps(ns); }} />
              </div>
            ))}
          </div>
          <Btn small variant="ghost" onClick={() => setAdditionalSteps(prev => [...prev, { step: "", hazard: "", procedure: "" }])}>+ ADD STEP</Btn>
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 24px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 8 }}>
          <Btn onClick={() => {
            onSave({
              jobId: job.id, ticketId: ticket?.id || null, date, time, operator, wellName, designatedDriver,
              lat, lng, weather, ppe, signatures: signatures.filter(Boolean),
              presenterReview, additionalSteps: additionalSteps.filter(s => s.step || s.hazard || s.procedure),
              savedAt: new Date().toISOString(),
            });
            onClose();
          }}>SAVE JSA</Btn>
          <Btn onClick={onClose} variant="ghost">CLOSE</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── FLOWBACK DATA MODAL ──────────────────────────────────────────────────────
const API_URL = "https://fti-app-production.up.railway.app/api";

function FlowbackModal({ job, onClose }) {
  const [dayNum, setDayNum] = useState(1);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const HOURS = ["07:00","08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00","21:00","22:00","23:00","00:00","01:00","02:00","03:00","04:00","05:00","06:00"];
  const COLS = ["Choke", "FL PSI", "Tbg PSI", "Csg PSI", "Temp", "H2O/Hr", "OIL/Hr", "Gas/Hr", "Remarks"];

  const emptyRow = () => ({ choke: "", flPsi: "", tbgPsi: "", csgPsi: "", temp: "", h2oHr: "", oilHr: "", gasHr: "", remarks: "" });
  const [rows, setRows] = useState(HOURS.map(() => emptyRow()));
  const [allDays, setAllDays] = useState({});

  const loadDay = (day) => {
    if (allDays[day]) { setRows(allDays[day]); return; }
    fetch(`${API_URL}/flowback/${job.id}/${day}`)
      .then(r => r.json())
      .then(data => {
        if (data && Array.isArray(data) && data.length > 0) {
          const loaded = HOURS.map(hr => {
            const match = data.find(d => d.hour === hr);
            if (match) {
              return {
                choke: match.choke || "", flPsi: match.fl_psi != null ? String(match.fl_psi) : "",
                tbgPsi: match.tbg_psi != null ? String(match.tbg_psi) : "", csgPsi: match.csg_psi != null ? String(match.csg_psi) : "",
                temp: match.temp != null ? String(match.temp) : "", h2oHr: match.h2o_hr != null ? String(match.h2o_hr) : "",
                oilHr: match.oil_hr != null ? String(match.oil_hr) : "", gasHr: match.gas_hr != null ? String(match.gas_hr) : "",
                remarks: match.remarks || "",
              };
            }
            return emptyRow();
          });
          setRows(loaded);
          setAllDays(prev => ({ ...prev, [day]: loaded }));
        } else {
          setRows(HOURS.map(() => emptyRow()));
        }
      })
      .catch(() => setRows(HOURS.map(() => emptyRow())));
  };

  useState(() => { loadDay(1); });
  const changeDay = (newDay) => {
    setAllDays(prev => ({ ...prev, [dayNum]: rows }));
    setDayNum(newDay);
    loadDay(newDay);
  };

  const updateRow = (idx, field, val) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r));
    setSaveMsg("");
  };

  const saveDay = () => {
    setSaving(true); setSaveMsg("");
    const payload = {
      rows: HOURS.map((hr, idx) => ({
        hour: hr, choke: rows[idx].choke || null, fl_psi: rows[idx].flPsi || null,
        tbg_psi: rows[idx].tbgPsi || null, csg_psi: rows[idx].csgPsi || null,
        temp: rows[idx].temp || null, h2o_hr: rows[idx].h2oHr || null,
        oil_hr: rows[idx].oilHr || null, gas_hr: rows[idx].gasHr || null,
        remarks: rows[idx].remarks || null,
      }))
    };
    fetch(`${API_URL}/flowback/${job.id}/${dayNum}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(r => r.json())
      .then(data => {
        if (data.saved) { setSaveMsg("Saved"); setAllDays(prev => ({ ...prev, [dayNum]: rows })); }
        else { setSaveMsg("Error saving"); }
      })
      .catch(() => setSaveMsg("Error — check connection"))
      .finally(() => setSaving(false));
  };

  const fields = ["choke", "flPsi", "tbgPsi", "csgPsi", "temp", "h2oHr", "oilHr", "gasHr", "remarks"];
  const totalH2O = rows.reduce((s, r) => s + (Number(r.h2oHr) || 0), 0);
  const totalOil = rows.reduce((s, r) => s + (Number(r.oilHr) || 0), 0);
  const totalGas = rows.reduce((s, r) => s + (Number(r.gasHr) || 0), 0);

  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={onClose}>
      <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderTop: `4px solid ${C.blue}`, borderRadius: 8, padding: 0, width: 960, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: "16px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>Flowback Data — Day {dayNum}</div>
            <div style={{ fontSize: 11, color: C.muted }}>Job #{job.id} — {job.customer} · {job.wells[0]}</div>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.muted }}>DAY:</span>
            <button onClick={() => changeDay(Math.max(1, dayNum - 1))} style={{ background: C.steel, border: `1px solid ${C.border}`, borderRadius: 4, padding: "4px 10px", cursor: "pointer", fontWeight: 700 }}>◀</button>
            <span style={{ fontSize: 16, fontWeight: 800, minWidth: 30, textAlign: "center" }}>{dayNum}</span>
            <button onClick={() => changeDay(Math.min(31, dayNum + 1))} style={{ background: C.steel, border: `1px solid ${C.border}`, borderRadius: 4, padding: "4px 10px", cursor: "pointer", fontWeight: 700 }}>▶</button>
          </div>
        </div>

        {/* Summary */}
        <div style={{ display: "flex", gap: 16, padding: "10px 24px", background: C.steel, borderBottom: `1px solid ${C.border}` }}>
          <div><span style={{ fontSize: 10, fontWeight: 700, color: C.muted }}>H2O TODAY: </span><span style={{ fontSize: 13, fontWeight: 800, color: C.blue }}>{totalH2O}</span><span style={{ fontSize: 9, fontWeight: 700, color: C.muted, marginLeft: 3 }}>bbls</span></div>
          <div><span style={{ fontSize: 10, fontWeight: 700, color: C.muted }}>OIL TODAY: </span><span style={{ fontSize: 13, fontWeight: 800, color: C.green }}>{totalOil}</span><span style={{ fontSize: 9, fontWeight: 700, color: C.muted, marginLeft: 3 }}>bbls</span></div>
          <div><span style={{ fontSize: 10, fontWeight: 700, color: C.muted }}>GAS TODAY: </span><span style={{ fontSize: 13, fontWeight: 800, color: C.orange }}>{totalGas}</span><span style={{ fontSize: 9, fontWeight: 700, color: C.muted, marginLeft: 3 }}>MCF</span></div>
          <div><span style={{ fontSize: 10, fontWeight: 700, color: C.muted }}>TOTAL FLUID: </span><span style={{ fontSize: 13, fontWeight: 800 }}>{totalH2O + totalOil}</span><span style={{ fontSize: 9, fontWeight: 700, color: C.muted, marginLeft: 3 }}>bbls</span></div>
          {(totalH2O + totalOil) > 0 && <div><span style={{ fontSize: 10, fontWeight: 700, color: C.muted }}>OIL CUT: </span><span style={{ fontSize: 13, fontWeight: 800, color: C.red }}>{((totalOil / (totalH2O + totalOil)) * 100).toFixed(1)}%</span></div>}
        </div>

        {/* Data table */}
        <div style={{ padding: "0 24px 16px", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, fontFamily: "'Arial', sans-serif", marginTop: 8 }}>
            <thead>
              <tr style={{ background: C.darkBlue }}>
                <th style={{ padding: "6px 8px", color: C.white, fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", borderBottom: `2px solid ${C.red}`, textAlign: "left" }}>TIME</th>
                {COLS.map(c => (
                  <th key={c} style={{ padding: "6px 6px", color: C.white, fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", borderBottom: `2px solid ${C.red}`, textAlign: "left" }}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HOURS.map((hr, idx) => (
                <tr key={hr} style={{ background: idx % 2 === 0 ? C.cardBg : C.steel, borderBottom: `1px solid ${C.border}22` }}>
                  <td style={{ padding: "3px 8px", fontWeight: 700, color: C.muted, fontSize: 11, whiteSpace: "nowrap" }}>{hr}</td>
                  {fields.map(f => (
                    <td key={f} style={{ padding: "2px 2px" }}>
                      <input
                        style={{ ...inputStyle, padding: "3px 4px", fontSize: 11, textAlign: f === "remarks" ? "left" : "right", width: f === "remarks" ? 120 : 55 }}
                        value={rows[idx][f]}
                        onChange={e => updateRow(idx, f, e.target.value)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 24px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 8, alignItems: "center" }}>
          <Btn onClick={saveDay}>{saving ? "SAVING..." : `SAVE DAY ${dayNum}`}</Btn>
          <Btn onClick={onClose} variant="ghost">CLOSE</Btn>
          {saveMsg && <span style={{ fontSize: 12, fontWeight: 700, color: saveMsg === "Saved" ? C.green : C.red, marginLeft: 8 }}>{saveMsg === "Saved" ? "✓ " : "✗ "}{saveMsg}</span>}
        </div>
      </div>
    </div>
  );
}

// ─── TICKET BADGE ─────────────────────────────────────────────────────────────
function TicketTypeBadge({ type }) {
  const cfg = TICKET_TYPES[type];
  return (
    <span style={{
      display: "inline-block", padding: "3px 10px", borderRadius: 3,
      fontSize: 10, fontWeight: 800, letterSpacing: "0.1em",
      color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}33`,
    }}>{cfg.label}</span>
  );
}

function TicketStatusBadge({ status }) {
  const cfg = TICKET_STATUSES[status];
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 3,
      fontSize: 9, fontWeight: 800, letterSpacing: "0.1em",
      color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}33`,
    }}>{cfg.label}</span>
  );
}

// ─── TICKET LINE ITEM EDITOR ──────────────────────────────────────────────────
function LineItemEditor({ lineItems, setLineItems, ticketType, qbItems = [], onSigWipe }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const isRental = ticketType === "Rental";

  const filteredQB = searchTerm.length > 0 ? qbItems.filter(q =>
    q.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.desc.toLowerCase().includes(searchTerm.toLowerCase())
  ) : qbItems;

  const addItem = (qb) => {
    setLineItems(prev => [...prev, { qbCode: qb.code, desc: qb.desc, rate: qb.price, qty: 1, um: qb.um, ...(isRental ? { days: 1 } : {}) }]);
    setSearchTerm("");
    setShowSearch(false);
    onSigWipe?.();
  };

  const addBlank = () => {
    setLineItems(prev => [...prev, { qbCode: "", desc: "", rate: 0, qty: 1, um: "DAY", ...(isRental ? { days: 1 } : {}) }]);
    onSigWipe?.();
  };

  const updateItem = (idx, field, value) => {
    setLineItems(prev => prev.map((li, i) => i === idx ? { ...li, [field]: value } : li));
    if (["qbCode", "desc", "rate", "qty", "days", "um"].includes(field)) onSigWipe?.();
  };

  const removeItem = (idx) => {
    setLineItems(prev => prev.filter((_, i) => i !== idx));
    onSigWipe?.();
  };

  const total = lineItems.reduce((s, li) => s + calcLineTotal(li), 0);

  const cols = isRental
    ? "40px 90px 1fr 65px 55px 60px 55px 85px 36px"
    : "40px 100px 1fr 70px 70px 70px 90px 36px";
  const headers = isRental
    ? ["#", "CODE", "DESCRIPTION", "RATE", "QTY", "U/M", "DAYS", "TOTAL", ""]
    : ["#", "CODE", "DESCRIPTION", "RATE", "QTY", "U/M", "TOTAL", ""];

  return (
    <div>
      {/* Header */}
      <div style={{
        display: "grid", gridTemplateColumns: cols,
        gap: 4, padding: "6px 0", borderBottom: `1px solid ${C.border}`, marginBottom: 4,
      }}>
        {headers.map(h => (
          <div key={h} style={{ fontSize: 9, fontWeight: 800, color: C.muted, letterSpacing: "0.1em" }}>{h}</div>
        ))}
      </div>
      {/* Rows */}
      {lineItems.map((li, idx) => (
        <div key={idx} style={{
          display: "grid", gridTemplateColumns: cols,
          gap: 4, padding: "4px 0", borderBottom: `1px solid ${C.border}22`, alignItems: "center",
        }}>
          <div style={{ fontSize: 11, color: C.muted, textAlign: "center" }}>{idx + 1}</div>
          <input style={{ ...inputStyle, padding: "4px 6px", fontSize: 11 }} value={li.qbCode}
            onChange={e => updateItem(idx, "qbCode", e.target.value)} />
          <input style={{ ...inputStyle, padding: "4px 6px", fontSize: 11 }} value={li.desc}
            onChange={e => updateItem(idx, "desc", e.target.value)} />
          <input type="number" style={{ ...inputStyle, padding: "4px 6px", fontSize: 11, textAlign: "right" }}
            value={li.rate} onChange={e => updateItem(idx, "rate", Number(e.target.value))} />
          <input type="number" style={{ ...inputStyle, padding: "4px 6px", fontSize: 11, textAlign: "right" }}
            value={li.qty} onChange={e => updateItem(idx, "qty", Number(e.target.value))} />
          <select style={{ ...inputStyle, padding: "4px 4px", fontSize: 10 }} value={li.um}
            onChange={e => updateItem(idx, "um", e.target.value)}>
            {["HR", "DAY", "EA", "GAL", "MILE"].map(u => <option key={u}>{u}</option>)}
          </select>
          {isRental && (
            <input type="number" style={{ ...inputStyle, padding: "4px 6px", fontSize: 11, textAlign: "right" }}
              value={li.days || 1} onChange={e => updateItem(idx, "days", Number(e.target.value))} />
          )}
          <div style={{ fontSize: 12, fontWeight: 700, textAlign: "right", color: C.text }}>
            {'$'}{calcLineTotal(li).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <button onClick={() => removeItem(idx)} style={{
            background: "transparent", border: "none", color: C.red, cursor: "pointer",
            fontSize: 14, fontWeight: 700, padding: 0,
          }}>×</button>
        </div>
      ))}
      {/* Total */}
      <div style={{
        display: "grid", gridTemplateColumns: cols,
        gap: 4, padding: "8px 0", borderTop: `2px solid ${C.border}`, marginTop: 4,
      }}>
        {headers.slice(0, -2).map((_, i) => <div key={i} />)}
        <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, textAlign: "right", letterSpacing: "0.1em" }}>TOTAL</div>
        <div style={{ fontSize: 13, fontWeight: 800, color: C.text, textAlign: "right" }}>
          {'$'}{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div />
      </div>
      {/* Add buttons */}
      <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center", position: "relative" }}>
        <Btn small onClick={() => setShowSearch(s => !s)}>+ FROM RATE SHEET</Btn>
        <Btn small variant="ghost" onClick={addBlank}>+ BLANK LINE</Btn>
        {showSearch && (
          <div style={{
            position: "fixed", inset: 0, background: "#00000066", zIndex: 200,
            display: "flex", alignItems: "center", justifyContent: "center",
          }} onClick={() => { setShowSearch(false); setSearchTerm(""); }}>
            <div style={{
              background: C.cardBg, border: `1px solid ${C.border}`, borderTop: `3px solid ${C.blue}`,
              borderRadius: 8, width: 520, maxWidth: "95vw", maxHeight: "80vh",
              display: "flex", flexDirection: "column", boxShadow: "0 12px 48px #00000033",
            }} onClick={e => e.stopPropagation()}>
              <div style={{ padding: "16px 16px 0 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: C.text, letterSpacing: "0.06em" }}>RATE SHEET</div>
                  <button onClick={() => { setShowSearch(false); setSearchTerm(""); }}
                    style={{ background: "transparent", border: "none", fontSize: 20, color: C.muted, cursor: "pointer", fontWeight: 700, padding: "0 4px" }}>×</button>
                </div>
                <input autoFocus style={{ ...inputStyle, marginBottom: 8, fontSize: 13, padding: "10px 12px" }}
                  placeholder="Type to filter or scroll to browse..."
                  value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                <div style={{ fontSize: 10, color: C.muted, marginBottom: 6, fontWeight: 600 }}>{filteredQB.length} item{filteredQB.length !== 1 ? "s" : ""}</div>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 16px 16px" }}>
                {filteredQB.map(q => (
                  <div key={q.code} onClick={() => addItem(q)} style={{
                    padding: "10px 10px", cursor: "pointer", borderRadius: 4,
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    fontSize: 13, borderBottom: `1px solid ${C.border}22`,
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = C.steel}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <div>
                      <span style={{ fontWeight: 700, color: C.blue, marginRight: 10 }}>{q.code}</span>
                      <span style={{ color: C.text }}>{q.desc}</span>
                    </div>
                    <span style={{ color: C.muted, fontSize: 12, whiteSpace: "nowrap", marginLeft: 12 }}>{'$'}{q.price}/{q.um}</span>
                  </div>
                ))}
                {searchTerm && filteredQB.length === 0 && (
                  <div style={{ padding: "20px", color: C.muted, fontSize: 13, textAlign: "center" }}>No matches</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SIGNATURE PAD ────────────────────────────────────────────────────────────
function SignaturePad({ onSign, onCancel }) {
  const canvasRef = useRef(null);
  const [signerName, setSignerName] = useState("");
  const [hasDrawn, setHasDrawn] = useState(false);
  const isDrawing = useRef(false);

  const getXY = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const src = e.touches ? e.touches[0] : e;
    return {
      x: (src.clientX - rect.left) * scaleX,
      y: (src.clientY - rect.top) * scaleY,
    };
  };

  const onDown = (e) => {
    e.preventDefault();
    isDrawing.current = true;
    setHasDrawn(true);
    const { x, y } = getXY(e);
    const ctx = canvasRef.current.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const onMove = (e) => {
    e.preventDefault();
    if (!isDrawing.current) return;
    const { x, y } = getXY(e);
    const ctx = canvasRef.current.getContext("2d");
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = C.darkBlue;
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const onUp = (e) => {
    e.preventDefault();
    isDrawing.current = false;
  };

  const clear = () => {
    setHasDrawn(false);
    const canvas = canvasRef.current;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
  };

  const submit = () => {
    if (!hasDrawn || !signerName.trim()) return;
    // Capture image BEFORE any state/prop changes
    const imageData = canvasRef.current.toDataURL("image/png");
    onSign({ name: signerName.trim(), date: new Date().toISOString(), imageData });
  };

  return (
    <div style={{ background: C.steel, border: `1px solid ${C.border}`, borderRadius: 6, padding: 16, marginTop: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 10 }}>CUSTOMER SIGNATURE</div>
      <div style={{ marginBottom: 10 }}>
        <label style={labelStyle}>PRINTED NAME *</label>
        <input style={{ ...inputStyle, width: 280 }} value={signerName} onChange={e => setSignerName(e.target.value)} placeholder="Customer name..." />
      </div>
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>Sign below:</div>
      <div style={{ background: C.white, border: `2px solid ${hasDrawn ? C.green : C.border}`, borderRadius: 4, touchAction: "none", lineHeight: 0 }}>
        <canvas
          ref={canvasRef}
          width={600} height={150}
          style={{ display: "block", width: "100%", height: "auto" }}
          onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
          onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
        />
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <Btn variant="blue" onClick={submit}>SUBMIT SIGNATURE</Btn>
        <Btn variant="ghost" small onClick={clear}>CLEAR</Btn>
        <Btn variant="ghost" small onClick={onCancel}>CANCEL</Btn>
      </div>
      {(!hasDrawn || !signerName.trim()) && (
        <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>* Name and signature required</div>
      )}
    </div>
  );
}

// ─── TICKET DETAIL VIEW ───────────────────────────────────────────────────────
function TicketDetail({ ticket, onUpdate, onClose, onDelete, onDuplicate, onRevise, jobs, qbItems, currentUser, openToSign = false }) {
  // All state initialized from ticket prop on mount only
  const [lineItems, setLineItems] = useState(() => [...(ticket.lineItems || [])]);
  const [ticketDate, setTicketDate] = useState(() => ticket.date ? ticket.date.slice(0, 10) : "");
  const [notes, setNotes] = useState(() => ticket.notes || "");
  const [rentalStartDate, setRentalStartDate] = useState(() => (ticket.startDate || ticket.start_date || "").slice(0, 10));
  const [rentalEndDate, setRentalEndDate] = useState(() => (ticket.endDate || ticket.end_date || "").slice(0, 10));
  const [rentalCycleDays, setRentalCycleDays] = useState(() => ticket.cycleDays || ticket.cycle_days || 28);
  const [rentalRecurring, setRentalRecurring] = useState(() => !!(ticket.isRecurring || ticket.is_recurring));
  const [status, setStatus] = useState(() => ticket.status);
  const [missingPieces, setMissingPieces] = useState(() => ticket.missingPieces ?? null);
  const [sigNotReqReason, setSigNotReqReason] = useState(() => ticket.sigNotReqReason || null);
  const [sigNotReqNote, setSigNotReqNote] = useState(() => ticket.sigNotReqNote || "");
  // Time & mileage fields (all ticket types except JSA and Rental)
  const [lvYard, setLvYard] = useState(() => ticket.lvYard || ticket.lv_yard || "");
  const [arrivalTime, setArrivalTime] = useState(() => ticket.arrivalTime || ticket.arrival_time || "");
  const [dueOnLoc, setDueOnLoc] = useState(() => ticket.dueOnLoc || ticket.due_on_loc || "");
  const [jobStartTime, setJobStartTime] = useState(() => ticket.jobStartTime || ticket.job_start_time || "");
  const [jobEndTime, setJobEndTime] = useState(() => ticket.jobEndTime || ticket.job_end_time || "");
  const [retYard, setRetYard] = useState(() => ticket.retYard || ticket.ret_yard || "");
  const [timeZone, setTimeZone] = useState(() => ticket.timeZone || ticket.time_zone || "");
  const [mileageBegin, setMileageBegin] = useState(() => ticket.mileageBegin ?? ticket.mileage_begin ?? "");
  const [mileageEnd, setMileageEnd] = useState(() => ticket.mileageEnd ?? ticket.mileage_end ?? "");
  // Ticket-level pin
  const [ticketPin, setTicketPin] = useState(() => ticket.googlePin || ticket.google_pin || "");
  const [ticketPinLat, setTicketPinLat] = useState(() => ticket.pinLat || ticket.pin_lat || null);
  const [ticketPinLng, setTicketPinLng] = useState(() => ticket.pinLng || ticket.pin_lng || null);
  const [ticketPinResolving, setTicketPinResolving] = useState(false);
  const [ticketPinError, setTicketPinError] = useState("");
  const [driveInfo, setDriveInfo] = useState(null);
  const [driveLoading, setDriveLoading] = useState(false);
  // Site Manager fields (ticket-level)
  const [siteMgrFirst, setSiteMgrFirst] = useState(() => ticket.siteMgrFirst || "");
  const [siteMgrLast, setSiteMgrLast] = useState(() => ticket.siteMgrLast || "");
  const [siteMgrPhone, setSiteMgrPhone] = useState(() => ticket.siteMgrPhone || "");
  const [siteMgrEmail, setSiteMgrEmail] = useState(() => ticket.siteMgrEmail || "");
  const [showDupModal, setShowDupModal] = useState(false);
  const [emailTo, setEmailTo] = useState(() => {
    if (ticket.emailTo) return ticket.emailTo.split(",").map(e => e.trim()).filter(Boolean);
    const job = jobs?.find(j => j.id === ticket.jobId);
    const pocAddr = job?.pocEmail || job?.poc_email || "";
    return pocAddr ? [pocAddr] : [""];
  });
  const [emailCc, setEmailCc] = useState(() => ticket.emailCc || "");
  const [signedBy, setSignedBy] = useState(() => ticket.signedBy || null);
  const [signedAt, setSignedAt] = useState(() => ticket.signedAt || null);
  const [signatureImage, setSignatureImage] = useState(() => ticket.signatureImage || null);
  const [sigWiped, setSigWiped] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Track original values for dirty detection
  const normalizeLI = (items) => (items || []).map(li => `${li.qbCode||li.qb_code}|${li.desc||li.description}|${li.rate}|${li.qty}|${li.um||li.unit_measure}|${li.days||1}`).join("~");
  const origRef = useRef({
    lineItems: normalizeLI(ticket.lineItems),
    notes: ticket.notes || "",
    date: ticket.date ? ticket.date.slice(0, 10) : "",
    lvYard: ticket.lvYard || ticket.lv_yard || "",
    arrivalTime: ticket.arrivalTime || ticket.arrival_time || "",
    dueOnLoc: ticket.dueOnLoc || ticket.due_on_loc || "",
    jobStartTime: ticket.jobStartTime || ticket.job_start_time || "",
    jobEndTime: ticket.jobEndTime || ticket.job_end_time || "",
    retYard: ticket.retYard || ticket.ret_yard || "",
    timeZone: ticket.timeZone || ticket.time_zone || "",
    mileageBegin: String(ticket.mileageBegin ?? ticket.mileage_begin ?? ""),
    mileageEnd: String(ticket.mileageEnd ?? ticket.mileage_end ?? ""),
    ticketPin: ticket.googlePin || ticket.google_pin || "",
  });
  const isDirty = () => {
    if (sigWiped || isEditing) return true;
    if (notes !== origRef.current.notes) return true;
    if (ticketDate !== origRef.current.date) return true;
    if (normalizeLI(lineItems) !== origRef.current.lineItems) return true;
    if (lvYard !== origRef.current.lvYard) return true;
    if (arrivalTime !== origRef.current.arrivalTime) return true;
    if (dueOnLoc !== origRef.current.dueOnLoc) return true;
    if (jobStartTime !== origRef.current.jobStartTime) return true;
    if (jobEndTime !== origRef.current.jobEndTime) return true;
    if (retYard !== origRef.current.retYard) return true;
    if (timeZone !== origRef.current.timeZone) return true;
    if (String(mileageBegin) !== origRef.current.mileageBegin) return true;
    if (String(mileageEnd) !== origRef.current.mileageEnd) return true;
    if (ticketPin !== origRef.current.ticketPin) return true;
    return false;
  };
  const [showSigPad, setShowSigPad] = useState(() => openToSign && !["sentToQB", "qbVerified", "signed", "sigNotReq", "approved"].includes(ticket.status));
  const [showSigOptions, setShowSigOptions] = useState(false);
  const [showQBConfirm, setShowQBConfirm] = useState(false);
  const [showUnsavedClose, setShowUnsavedClose] = useState(false);
  const [tdComments, setTdComments] = useState([]);
  const [tdReply, setTdReply] = useState("");
  const [tdSending, setTdSending] = useState(false);
  const [tdLoading, setTdLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showVoidConfirm, setShowVoidConfirm] = useState(false);
  const [showJSA, setShowJSA] = useState(false);
  const [existingJSA, setExistingJSA] = useState(null);
  const [jsaLoaded, setJsaLoaded] = useState(false);

  // Load JSA for this ticket
  useEffect(() => {
    if (!ticket.id) return;
    fetch(`${API_URL}/jsas/ticket/${ticket.id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setExistingJSA({
            ...data,
            wellName: data.well_name,
            designatedDriver: data.designated_driver,
            lat: data.latitude,
            lng: data.longitude,
            ppe: { frClothing: data.ppe_fr_clothing, toolsTrained: data.ppe_tools_trained, confinedSpace: data.ppe_confined_space },
            signatures: (data.signatures || []).map(s => s.name || s),
            additionalSteps: (data.additional_steps || []).map(s => ({ step: s.step, hazard: s.hazard, procedure: s.procedure })),
          });
        }
        setJsaLoaded(true);
      })
      .catch(() => setJsaLoaded(true));
  }, [ticket.id]);

  // Load comments when ticket opens + poll every 30s
  // Auto-fetch drive distance from yard if pin coords available
  useEffect(() => {
    const lat = ticketPinLat || job?.pinLat || job?.pin_lat;
    const lng = ticketPinLng || job?.pinLng || job?.pin_lng;
    if (!lat || !lng) return;
    setDriveLoading(true);
    fetch(`${API_URL}/jobs/drive-distance`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ destLat: lat, destLng: lng }),
    })
      .then(r => r.ok ? r.json() : { error: "Could not calculate" })
      .then(d => setDriveInfo(d))
      .catch(() => setDriveInfo({ error: "Network error" }))
      .finally(() => setDriveLoading(false));
  }, [ticket.id]);

  useEffect(() => {
    if (!ticket.id) return;
    const loadComments = () => {
      fetch(`${API_URL}/signature/comments/${ticket.id}`)
        .then(r => r.ok ? r.json() : [])
        .then(data => { setTdComments(data); setTdLoading(false); })
        .catch(() => setTdLoading(false));
    };
    const checkSignatureStatus = () => {
      // Only poll if ticket is emailed and unsigned
      if (status !== "emailed" || signedBy) return;
      fetch(`${API_URL}/tickets?job_id=${ticket.jobId}`)
        .then(r => r.ok ? r.json() : [])
        .then(data => {
          const updated = data.find(t => t.id === ticket.id);
          if (updated && updated.signature_img && !signedBy) {
            setSignedBy(updated.signed_by);
            setSignedAt(updated.signed_at);
            setSignatureImage(updated.signature_img);
            setStatus("signed");
            if (onUpdate) onUpdate(ticket.id, { signedBy: updated.signed_by, signedAt: updated.signed_at, signatureImage: updated.signature_img, status: "signed" });
          }
        })
        .catch(() => {});
    };
    setTdLoading(true);
    loadComments();
    // Clear pending flag when ticket is opened
    if (ticket.hasPendingComment || ticket.has_pending_comment) {
      fetch(`${API_URL}/tickets/${ticket.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ has_pending_comment: false }),
      }).catch(() => {});
      if (onUpdate) onUpdate(ticket.id, { hasPendingComment: false, has_pending_comment: false });
    }
    const interval = setInterval(() => { loadComments(); checkSignatureStatus(); }, 30000);
    return () => clearInterval(interval);
  }, [ticket.id]);

  const handleClose = () => {
    if (isFullyLocked || ticket.voidedAt) { onClose(); return; }
    if (isDirty()) { setShowUnsavedClose(true); return; }
    onClose();
  };

  const job = jobs.find(j => j.id === ticket.jobId);
  const tcfg = TICKET_TYPES[ticket.type];
  const total = lineItems.reduce((s, li) => s + calcLineTotal(li), 0);
  const isLocked = !isEditing && ["signed", "sigNotReq", "approved", "sentToQB", "qbVerified"].includes(status);
  const isFullyLocked = status === "qbVerified" || status === "sentToQB";
  const editable = !isFullyLocked && !ticket.voidedAt;
  const canApprove = ["owner", "admin", "manager", "lead"].includes(currentUser?.role);

  const save = (overrides = {}) => {
    const updates = {
      lineItems, notes, status, missingPieces, date: ticketDate,
      sigNotReqReason, sigNotReqNote, emailTo: emailTo.filter(e => e.trim()).join(", "), emailCc,
      signedBy, signedAt, signatureImage,
      siteMgrFirst, siteMgrLast, siteMgrPhone, siteMgrEmail,
      ...(ticket.type === "Rental" ? { startDate: rentalStartDate, endDate: rentalEndDate, cycleDays: parseInt(rentalCycleDays) || 28, isRecurring: rentalRecurring } : {}),
      ...(!["Rental", "JSA"].includes(ticket.type) ? {
        lvYard, arrivalTime, dueOnLoc, jobStartTime, jobEndTime, retYard, timeZone,
        mileageBegin: mileageBegin !== "" ? parseFloat(mileageBegin) : null,
        mileageEnd: mileageEnd !== "" ? parseFloat(mileageEnd) : null,
        googlePin: ticketPin || null,
        pinLat: ticketPinLat || null,
        pinLng: ticketPinLng || null,
      } : {}),
      ...overrides,
    };
    onUpdate(ticket.id, updates);
  };

  // Date change wipes signature (same as line item changes)
  const handleDateChange = (newDate) => {
    setTicketDate(newDate);
    if (signedBy && newDate !== (ticket.date || "").slice(0, 10)) {
      handleSigWipe();
    }
  };

  const handleSigWipe = () => {
    if (!signedBy && !signatureImage) return; // Nothing to wipe
    setSigWiped(true);
    setSignedBy(null);
    setSignedAt(null);
    setSignatureImage(null);
    // If ticket was approved, revert approval
    if (["approved", "sentToQB"].includes(status)) {
      setStatus("inField");
    }
  };

  const handleSign = ({ name, date, imageData }) => {
    // Update local state
    setSignedBy(name);
    setSignedAt(date);
    setSignatureImage(imageData);
    setStatus("signed");
    setSigWiped(false);
    setShowSigPad(false);
    setIsEditing(false);
    // Save to DB
    save({ signedBy: name, signedAt: date, signatureImage: imageData, status: "signed", sigNotReqReason: null, sigNotReqNote: "" });
  };

  const handleCancel = () => {
    setLineItems([...(ticket.lineItems || [])]);
    setNotes(ticket.notes || "");
    setStatus(ticket.status);
    setSignedBy(ticket.signedBy || null);
    setSignedAt(ticket.signedAt || null);
    setSignatureImage(ticket.signatureImage || null);
    setSigWiped(false);
    setIsEditing(false);
    setShowSigPad(false);
    setShowSigOptions(false);
    onClose();
  };

  const handleSave = () => {
    if (sigWiped) {
      save({ signedBy: null, signedAt: null, signatureImage: null, status: "inField" });
      setStatus("inField");
    } else {
      save();
    }
    setIsEditing(false);
    setSigWiped(false);
    onClose();
  };

  const handleSigNotRequired = () => {
    if (!sigNotReqReason) return;
    if (signedBy) return; // Don't allow if already signed
    setStatus("sigNotReq");
    setShowSigOptions(false);
    save({ status: "sigNotReq", sigNotReqReason, sigNotReqNote, signedBy: null, signedAt: null, signatureImage: null });
  };

  const handleApprove = () => {
    setStatus("approved");
    save({ status: "approved", approvedBy: currentUser?.name, approvedAt: new Date().toISOString() });
  };

  const handleSendToQB = () => {
    setStatus("sentToQB");
    save({ status: "sentToQB", sentToQBAt: new Date().toISOString() });
  };

  const handleEmailTicket = async () => {
    if (!emailTo.some(e => e.trim())) return;
    const emailToStr = emailTo.filter(e => e.trim()).join(", ");
    try {
      // Save emailTo first
      await save({ emailTo: emailToStr, emailCc });
      const r = await fetch(`${API_URL}/signature/send/${ticket.id}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ performed_by: CURRENT_USER }),
      });
      if (!r.ok) { const d = await r.json(); alert(d.error || "Email failed"); return; }
      setStatus("emailed");
      save({ status: "emailed", emailTo: emailToStr, emailCc, emailedAt: new Date().toISOString() });
    } catch (err) { alert("Email send failed: " + err.message); }
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
      onClick={handleClose}
    >
      <div
        style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderTop: `4px solid ${tcfg.color}`, borderRadius: 8, width: 820, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <TicketTypeBadge type={ticket.type} />
                <TicketStatusBadge status={status} />
                <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>#{ticket.jobId}{ticket.ticketNumber ? `-${ticket.ticketNumber}` : ""} — {ticket.type}</span>
                {isLocked && <span style={{ fontSize: 10, fontWeight: 700, color: isFullyLocked ? C.green : C.orange, background: isFullyLocked ? "#d4edda" : "#fdf5d8", padding: "2px 8px", borderRadius: 3 }}>{isFullyLocked ? "QB VERIFIED" : "LOCKED"}</span>}
                {ticket.createdBy && <span style={{ fontSize: 9, color: "#a0aec8", marginLeft: "auto" }}>{shortName(ticket.createdBy)} · {formatShortStamp(ticket.createdAt)}</span>}
              </div>
              <div style={{ fontSize: 12, color: C.muted, display: "flex", alignItems: "center", gap: 10 }}>
                <span>{job?.customer || "Unknown"} · {isLocked
                  ? formatDate(ticketDate)
                  : <input type="date" value={ticketDate} onChange={e => handleDateChange(e.target.value)}
                      style={{ border: `1px solid ${C.border}`, borderRadius: 4, padding: "2px 6px", fontSize: 12, color: C.text, background: C.cardBg }} />
                }</span>
                {ticket.type !== "Rental" && (
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: "0.06em" }}>DUE ON LOC:</span>
                    {editable
                      ? <TimePicker value={dueOnLoc} onChange={setDueOnLoc} startHour={6} startPeriod="AM" />
                      : <span style={{ fontWeight: 600 }}>{dueOnLoc || "—"}</span>
                    }
                  </span>
                )}
              </div>
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: C.text }}>{'$'}{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
        </div>

        {/* Job / Customer Info — read only */}
        {job && (
          <div style={{ background: C.steel, borderBottom: `1px solid ${C.border}`, padding: "12px 24px" }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, letterSpacing: "0.08em", marginBottom: 8 }}>JOB INFO — <span style={{ color: C.muted, fontWeight: 400 }}>To update, go to Active Jobs → Details → Edit Job</span></div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 24px", fontSize: 12 }}>
              <span><span style={{ color: C.muted }}>Customer: </span><strong>{job.customer}</strong></span>
              {job.jobState && <span><span style={{ color: C.muted }}>State: </span><strong>{job.jobState}</strong></span>}
              {job.county && <span><span style={{ color: C.muted }}>County: </span><strong>{job.county}</strong></span>}
              {job.wells?.length > 0 && (
                <span>
                  <span style={{ color: C.muted }}>Wells: </span>
                  <strong>
                    {ticket.assignedWells?.length > 0
                      ? ticket.assignedWells.join(", ")
                      : job.wells.map(w => w.well_name || w).join(", ")}
                  </strong>
                  {ticket.assignedWells?.length > 0 && ticket.assignedWells.length < job.wells.length && (
                    <span style={{ color: C.muted, fontSize: 10 }}> ({ticket.assignedWells.length} of {job.wells.length})</span>
                  )}
                </span>
              )}
              {job.afe && <span><span style={{ color: C.muted }}>AFE: </span><strong>{job.afe}</strong></span>}
              {job.companyCode && <span><span style={{ color: C.muted }}>Co. Code: </span><strong>{job.companyCode}</strong></span>}
              {job.costCenter && <span><span style={{ color: C.muted }}>Cost Center: </span><strong>{job.costCenter}</strong></span>}
              {job.po && <span><span style={{ color: C.muted }}>PO: </span><strong>{job.po}</strong></span>}
              {(job.contactFirst || job.contactLast) && <span><span style={{ color: C.muted }}>Point of Contact: </span><strong>{[job.contactFirst, job.contactLast].filter(Boolean).join(" ")}</strong></span>}
            </div>
          </div>
        )}

        {/* Site Manager — ticket level */}
        <div style={{ background: C.cardBg, borderBottom: `1px solid ${C.border}`, padding: "12px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, letterSpacing: "0.08em" }}>SITE MANAGER</div>
            {editable && job && (job.contactFirst || job.contactLast) && (
              <span onClick={() => {
                setSiteMgrFirst(job.contactFirst || "");
                setSiteMgrLast(job.contactLast || "");
                setSiteMgrPhone(job.pocPhone || job.poc_phone || "");
                setSiteMgrEmail(job.pocEmail || job.poc_email || "");
              }} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: C.blue, fontWeight: 700, cursor: "pointer", padding: "3px 10px", border: `1px solid ${C.blue}44`, borderRadius: 4, background: "transparent" }}>
                <span style={{ fontSize: 13 }}>📋</span> Copy Point of Contact Info
              </span>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
            <div>
              <label style={labelStyle}>FIRST NAME</label>
              {editable
                ? <input style={inputStyle} value={siteMgrFirst} onChange={e => setSiteMgrFirst(e.target.value)} placeholder="First" />
                : <div style={{ fontSize: 12, color: C.text, fontWeight: 600, padding: "3px 0" }}>{siteMgrFirst || "—"}</div>
              }
            </div>
            <div>
              <label style={labelStyle}>LAST NAME</label>
              {editable
                ? <input style={inputStyle} value={siteMgrLast} onChange={e => setSiteMgrLast(e.target.value)} placeholder="Last" />
                : <div style={{ fontSize: 12, color: C.text, fontWeight: 600, padding: "3px 0" }}>{siteMgrLast || "—"}</div>
              }
            </div>
            <div>
              <label style={labelStyle}>PHONE</label>
              {editable
                ? <input style={inputStyle} value={siteMgrPhone} onChange={e => setSiteMgrPhone(e.target.value)} placeholder="555-555-5555" />
                : <div style={{ fontSize: 12, color: C.text, fontWeight: 600, padding: "3px 0" }}>{siteMgrPhone || "—"}</div>
              }
            </div>
            <div>
              <label style={labelStyle}>EMAIL</label>
              {editable
                ? <input style={inputStyle} value={siteMgrEmail} onChange={e => setSiteMgrEmail(e.target.value)} placeholder="email@company.com" />
                : <div style={{ fontSize: 12, color: C.text, fontWeight: 600, padding: "3px 0" }}>{siteMgrEmail || "—"}</div>
              }
            </div>
          </div>
        </div>

        {/* Time & Mileage band — below job info, all types except Rental */}
        {!["Rental"].includes(ticket.type) && (() => {
          const ALL_TIMES = Array.from({ length: 48 }, (_, i) => {
            const h24 = Math.floor(i / 2), m = i % 2 === 0 ? "00" : "30";
            const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
            const period = h24 < 12 ? "AM" : "PM";
            return `${h12}:${m} ${period}`;
          });
          const timeOpts = (startIdx) => [""].concat(ALL_TIMES.slice(startIdx).concat(ALL_TIMES.slice(0, startIdx)));
          const parseT = (s) => {
            if (!s) return null;
            const match = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
            if (!match) return null;
            let h = parseInt(match[1]), min = parseInt(match[2]);
            const p = match[3].toUpperCase();
            if (p === "PM" && h !== 12) h += 12;
            if (p === "AM" && h === 12) h = 0;
            return h * 60 + min;
          };
          const fmtDiff = (a, b) => {
            if (a === null || b === null) return null;
            let d = b - a; if (d < 0) d += 1440;
            return `${Math.floor(d / 60)}h ${d % 60}m`;
          };
          const tLv = parseT(lvYard), tArr = parseT(arrivalTime), tJe = parseT(jobEndTime), tRy = parseT(retYard);
          const overall = fmtDiff(tLv, tRy);
          const onLoc = fmtDiff(tArr, tJe);
          let driveTime = null;
          if (tLv !== null && tArr !== null && tJe !== null && tRy !== null) {
            let d1 = tArr - tLv; if (d1 < 0) d1 += 1440;
            let d2 = tRy - tJe; if (d2 < 0) d2 += 1440;
            const tot = d1 + d2;
            driveTime = `${Math.floor(tot / 60)}h ${tot % 60}m`;
          }
          const totalMiles = (mileageBegin !== "" && mileageEnd !== "" && mileageBegin != null && mileageEnd != null)
            ? Math.max(0, parseFloat(mileageEnd) - parseFloat(mileageBegin)) : null;
          const selStyle = { border: `1px solid ${C.border}`, borderRadius: 4, padding: "3px 6px", fontSize: 12, color: C.text, background: C.cardBg, width: 98 };
          const roStyle = { fontSize: 12, color: C.text, fontWeight: 600, padding: "3px 0" };
          const lblStyle = { fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: "0.06em", marginBottom: 3 };
          const totalStyle = { fontSize: 12, fontWeight: 700, color: C.text };
          const totalSubStyle = { fontSize: 10, color: C.muted, marginTop: 1 };
          return (
            <div style={{ background: C.steel, borderBottom: `1px solid ${C.border}`, padding: "10px 24px" }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, letterSpacing: "0.08em", marginBottom: 8 }}>TIME &amp; MILEAGE</div>
              {/* Time fields */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 12px", alignItems: "flex-end", marginBottom: 8 }}>
                {[
                  { label: "LV YARD", val: lvYard, set: setLvYard, startHour: 6, startPeriod: "AM" },
                  { label: "ARRIVAL", val: arrivalTime, set: setArrivalTime, startHour: 6, startPeriod: "AM" },
                  { label: "JOB START", val: jobStartTime, set: setJobStartTime, startHour: 6, startPeriod: "AM" },
                  { label: "JOB END", val: jobEndTime, set: setJobEndTime, startHour: 12, startPeriod: "PM" },
                  { label: "RET YARD", val: retYard, set: setRetYard, startHour: 12, startPeriod: "PM" },
                ].map(({ label, val, set, startHour, startPeriod }) => (
                  <div key={label}>
                    <div style={lblStyle}>{label}</div>
                    {editable
                      ? <TimePicker value={val} onChange={set} startHour={startHour} startPeriod={startPeriod} />
                      : <div style={roStyle}>{val || "—"}</div>}
                  </div>
                ))}
                <div>
                  <div style={lblStyle}>TIME ZONE</div>
                  {editable
                    ? <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
                        {["TX", "NM"].map(tz => (
                          <span key={tz} onClick={() => setTimeZone(tz)} style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", fontSize: 12, fontWeight: 700, color: timeZone === tz ? C.red : C.muted }}>
                            <span style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${timeZone === tz ? C.red : C.border}`, background: timeZone === tz ? C.red : "transparent", display: "inline-block" }} />
                            {tz}
                          </span>
                        ))}
                      </div>
                    : <div style={roStyle}>{timeZone || "—"}</div>}
                </div>
              </div>
              {/* Totals */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 20px", borderTop: `1px solid ${C.border}`, paddingTop: 7, marginBottom: 8 }}>
                {[
                  { label: "OVERALL TIME", val: overall, sub: "LV Yard → Ret Yard" },
                  { label: "TIME ON LOC", val: onLoc, sub: "Arrival → Job End" },
                  { label: "DRIVE TIME", val: driveTime, sub: "LV Yard→Arrival + Job End→Ret Yard" },
                ].map(({ label, val, sub }) => (
                  <div key={label} style={{ marginRight: 8 }}>
                    <div style={lblStyle}>{label}</div>
                    <div style={totalStyle}>{val || "—"}</div>
                    <div style={totalSubStyle}>{sub}</div>
                  </div>
                ))}
              </div>
              {/* Mileage */}
              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 7, display: "flex", flexWrap: "wrap", gap: "6px 12px", alignItems: "flex-end" }}>
                {[
                  { label: "MILEAGE — BEGINNING", val: mileageBegin, set: setMileageBegin },
                  { label: "MILEAGE — END", val: mileageEnd, set: setMileageEnd },
                ].map(({ label, val, set }) => (
                  <div key={label}>
                    <div style={lblStyle}>{label}</div>
                    {editable
                      ? <input type="number" value={val} onChange={e => set(e.target.value)} min={0} placeholder="0"
                          style={{ border: `1px solid ${C.border}`, borderRadius: 4, padding: "3px 8px", fontSize: 12, color: C.text, background: C.cardBg, width: 98 }} />
                      : <div style={roStyle}>{val !== "" && val != null ? val : "—"}</div>}
                  </div>
                ))}
                <div>
                  <div style={lblStyle}>TOTAL MILES</div>
                  <div style={totalStyle}>{totalMiles !== null ? `${totalMiles.toLocaleString()} mi` : "—"}</div>
                </div>
              </div>

              {/* GPS Reference — Recommended Leave Time & Expected Distance */}
              {(driveInfo && !driveInfo.error) && (() => {
                // Calculate recommended leave time = Due on Loc minus drive duration
                let recLeave = null;
                if (dueOnLoc && driveInfo.durationSeconds) {
                  const dueMatch = dueOnLoc.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
                  if (dueMatch) {
                    let h = parseInt(dueMatch[1]), min = parseInt(dueMatch[2]);
                    const p = dueMatch[3].toUpperCase();
                    if (p === "PM" && h !== 12) h += 12;
                    if (p === "AM" && h === 12) h = 0;
                    const dueMinutes = h * 60 + min;
                    const driveMinutes = Math.ceil(driveInfo.durationSeconds / 60);
                    let leaveMin = dueMinutes - driveMinutes;
                    if (leaveMin < 0) leaveMin += 1440;
                    const lh = Math.floor(leaveMin / 60);
                    const lm = leaveMin % 60;
                    const lh12 = lh === 0 ? 12 : lh > 12 ? lh - 12 : lh;
                    const lp = lh < 12 ? "AM" : "PM";
                    recLeave = `${lh12}:${String(lm).padStart(2, "0")} ${lp}`;
                  }
                }
                return (
                  <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 8, marginTop: 4, display: "flex", flexWrap: "wrap", gap: "6px 24px" }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: C.blue, letterSpacing: "0.06em", marginBottom: 3 }}>RECOMMENDED TIME TO LEAVE YARD</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: recLeave ? C.text : C.muted }}>{recLeave || (dueOnLoc ? "Calculating..." : "Set Due on Loc first")}</div>
                      {recLeave && <div style={{ fontSize: 10, color: C.muted }}>Due on Loc ({dueOnLoc}) − Drive Time ({driveInfo.duration})</div>}
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: C.blue, letterSpacing: "0.06em", marginBottom: 3 }}>EXPECTED DISTANCE</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{driveInfo.distance}</div>
                      <div style={{ fontSize: 10, color: C.muted }}>From yard · Est. {driveInfo.duration}</div>
                    </div>
                  </div>
                );
              })()}

              {/* Pin section */}
              {(() => {
                const jobPin = job?.googlePin || job?.google_pin || "";
                const pinMismatch = jobPin && ticketPin && ticketPin.trim() !== jobPin.trim();
                const resolveTicketPin = async (url) => {
                  if (!url.trim()) return;
                  setTicketPinResolving(true); setTicketPinError("");
                  try {
                    const r = await fetch(`${API_URL}/jobs/resolve-map-pin`, {
                      method: "POST", headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ url: url.trim() }),
                    });
                    if (!r.ok) { setTicketPinError("Could not resolve pin."); setTicketPinResolving(false); return; }
                    const { lat, lng } = await r.json();
                    setTicketPinLat(lat); setTicketPinLng(lng);
                  } catch { setTicketPinError("Network error."); }
                  setTicketPinResolving(false);
                };
                return (
                  <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 7, marginTop: 2 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                      <div style={lblStyle}>GOOGLE PIN</div>
                      {pinMismatch && (
                        <span style={{ fontSize: 10, fontWeight: 800, color: "#8a6500", background: "#fdf5d8", border: "1px solid #e6c20044", borderRadius: 3, padding: "2px 8px", letterSpacing: "0.04em" }}>
                          ALT PIN — differs from Master Job Card
                        </span>
                      )}
                      {jobPin && !ticketPin && (
                        <span style={{ fontSize: 10, color: C.muted }}>MJC: {jobPin.length > 40 ? jobPin.slice(0, 40) + "…" : jobPin}</span>
                      )}
                    </div>
                    {editable ? (
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input
                          style={{ ...inputStyle, flex: 1, fontFamily: "monospace", fontSize: 11 }}
                          value={ticketPin}
                          onChange={e => { setTicketPin(e.target.value); setTicketPinLat(null); setTicketPinLng(null); setTicketPinError(""); }}
                          placeholder={jobPin ? "Override MJC pin or leave blank to use MJC pin" : "Paste Google Maps link..."}
                        />
                        {ticketPin && (
                          <button type="button" onClick={() => resolveTicketPin(ticketPin)} disabled={ticketPinResolving}
                            style={{ background: C.blue, color: C.white, border: "none", borderRadius: 4, padding: "6px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
                            {ticketPinResolving ? "..." : "RESOLVE"}
                          </button>
                        )}
                      </div>
                    ) : (
                      <div style={roStyle}>{ticketPin || (jobPin ? `Using MJC pin` : "—")}</div>
                    )}
                    {ticketPinError && <div style={{ fontSize: 11, color: C.red, marginTop: 3 }}>⚠ {ticketPinError}</div>}
                    {(ticketPinLat || ticketPinLng) && (
                      <div style={{ fontSize: 11, color: C.muted, fontFamily: "monospace", marginTop: 4 }}>
                        {parseFloat(ticketPinLat).toFixed(6)}, {parseFloat(ticketPinLng).toFixed(6)}
                      </div>
                    )}
                    {/* Drive distance from yard */}
                    {(ticketPinLat && ticketPinLng) && (
                      <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10 }}>
                        {!driveInfo && !driveLoading && (
                          <button type="button" onClick={async () => {
                            setDriveLoading(true);
                            try {
                              const r = await fetch(`${API_URL}/jobs/drive-distance`, {
                                method: "POST", headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ destLat: ticketPinLat, destLng: ticketPinLng }),
                              });
                              if (r.ok) { const d = await r.json(); setDriveInfo(d); }
                              else setDriveInfo({ error: "Could not calculate — check yard location in Settings" });
                            } catch { setDriveInfo({ error: "Network error" }); }
                            setDriveLoading(false);
                          }} style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 3, padding: "3px 10px", fontSize: 10, fontWeight: 700, color: C.text, cursor: "pointer" }}>
                            CALC DRIVE
                          </button>
                        )}
                        {driveLoading && <span style={{ fontSize: 11, color: C.muted }}>Calculating...</span>}
                        {driveInfo && !driveInfo.error && (
                          <div style={{ display: "flex", gap: 16 }}>
                            <div>
                              <div style={lblStyle}>DRIVE DISTANCE</div>
                              <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{driveInfo.distance}</div>
                            </div>
                            <div>
                              <div style={lblStyle}>EST. DRIVE TIME</div>
                              <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{driveInfo.duration}</div>
                            </div>
                          </div>
                        )}
                        {driveInfo?.error && <div style={{ fontSize: 11, color: C.red }}>⚠ {driveInfo.error}</div>}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          );
        })()}

        {/* Rental cycle info */}
        {ticket.type === "Rental" && (rentalStartDate || ticket.startDate || ticket.start_date) && (
          <div style={{ background: "#f8f4e8", borderBottom: `1px solid ${C.border}`, padding: "10px 24px" }}>
            {isFullyLocked || ticket.voidedAt ? (
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center", fontSize: 12, color: C.text }}>
                <span><span style={{ color: C.muted }}>Start: </span><strong>{formatDate(rentalStartDate)}</strong></span>
                <span><span style={{ color: C.muted }}>End: </span><strong>{formatDate(rentalEndDate)}</strong></span>
                <span><span style={{ color: C.muted }}>Cycle: </span><strong>{rentalCycleDays} days</strong></span>
                <span style={{ color: rentalRecurring ? C.green : C.muted, fontWeight: 700 }}>
                  {rentalRecurring ? "● Recurring" : "○ Not recurring"}
                </span>
                {(ticket.cycleEnded || ticket.cycle_ended) && (
                  <span style={{ background: "#fdf5d8", color: "#8a6500", borderRadius: 4, padding: "2px 8px", fontSize: 10, fontWeight: 800, border: "1px solid #e6c20044" }}>CYCLE ENDED</span>
                )}
                <RentalCountdown ticket={{ ...ticket, endDate: rentalEndDate, isRecurring: rentalRecurring }} />
              </div>
            ) : (
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", fontSize: 12, color: C.text }}>
                <div>
                  <span style={{ color: C.muted, fontWeight: 600, fontSize: 10, letterSpacing: "0.06em" }}>START </span>
                  <input type="date" value={rentalStartDate} onChange={e => setRentalStartDate(e.target.value)}
                    style={{ border: `1px solid ${C.border}`, borderRadius: 4, padding: "2px 6px", fontSize: 12, color: C.text, background: C.cardBg }} />
                </div>
                <div>
                  <span style={{ color: C.muted, fontWeight: 600, fontSize: 10, letterSpacing: "0.06em" }}>END </span>
                  <input type="date" value={rentalEndDate} onChange={e => setRentalEndDate(e.target.value)}
                    style={{ border: `1px solid ${C.border}`, borderRadius: 4, padding: "2px 6px", fontSize: 12, color: C.text, background: C.cardBg }} />
                </div>
                <div>
                  <span style={{ color: C.muted, fontWeight: 600, fontSize: 10, letterSpacing: "0.06em" }}>CYCLE </span>
                  <input type="number" value={rentalCycleDays} onChange={e => setRentalCycleDays(e.target.value)} min={1}
                    style={{ border: `1px solid ${C.border}`, borderRadius: 4, padding: "2px 6px", fontSize: 12, color: C.text, background: C.cardBg, width: 50 }} />
                  <span style={{ fontSize: 11, color: C.muted }}> days</span>
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                  <input type="checkbox" checked={rentalRecurring} onChange={e => setRentalRecurring(e.target.checked)} style={{ width: 14, height: 14 }} />
                  <span style={{ color: rentalRecurring ? C.green : C.muted }}>{rentalRecurring ? "● Recurring" : "○ Not recurring"}</span>
                </label>
                <RentalCountdown ticket={{ ...ticket, endDate: rentalEndDate, isRecurring: rentalRecurring }} />
              </div>
            )}
          </div>
        )}

        {/* Body */}
        <div style={{ padding: "16px 24px" }}>

          {/* Voided banner */}
          {ticket.voidedAt && (
            <div style={{ background: "#fdecea", border: `1px solid ${C.red}44`, borderRadius: 4, padding: "10px 14px", marginBottom: 12, fontSize: 13, fontWeight: 700, color: C.red }}>
              VOIDED{ticket._replacedByLabel ? ` — Replaced by #${ticket._replacedByLabel}` : ""}
            </div>
          )}

          {/* Revision banner */}
          {ticket.revisionOf && (
            <div style={{ background: "#e8f0fb", border: `1px solid ${C.blue}44`, borderRadius: 4, padding: "10px 14px", marginBottom: 12, fontSize: 13, fontWeight: 700, color: C.blue }}>
              Revision of #{ticket._revisionOfLabel || "previous ticket"}
            </div>
          )}

          {/* Duplicate reminder */}
          {ticket._duplicateReminder && (
            <div style={{ background: "#e8f0fb", border: `1px solid ${C.blue}44`, borderRadius: 4, padding: "8px 12px", marginBottom: 12, fontSize: 12, fontWeight: 700, color: C.blue }}>
              This ticket was duplicated. Please update the date and review before saving.
            </div>
          )}

          {/* Awaiting signature banner */}
          {status === "emailed" && !signedBy && (
            <div style={{ background: "#f3eafa", border: "1px solid #7a3ca044", borderRadius: 4, padding: "10px 14px", marginBottom: 12, fontSize: 13, fontWeight: 700, color: "#7a3ca0", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#7a3ca0", animation: "pulse 2s infinite" }} />
              Emailed for signature — awaiting response
              {ticket.emailedAt && <span style={{ fontWeight: 400, fontSize: 12, marginLeft: "auto" }}>Sent {new Date(ticket.emailedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>}
            </div>
          )}

          {/* Edit warning */}
          {isEditing && !sigWiped && signedBy && (
            <div style={{ background: "#fdf5d8", border: "1px solid #e6c200", borderRadius: 4, padding: "8px 12px", marginBottom: 12, fontSize: 12, fontWeight: 700, color: "#8a6500" }}>
              ⚠ Editing signed ticket — changing line items, rate, or qty will require a new signature.
            </div>
          )}
          {sigWiped && (
            <div style={{ background: "#fdecea", border: `1px solid ${C.red}44`, borderRadius: 4, padding: "8px 12px", marginBottom: 12, fontSize: 12, fontWeight: 700, color: C.red }}>
              ⚠ Line items changed — signature cleared. Customer must re-sign before saving.
            </div>
          )}

          {/* Missing pieces (RD only) */}
          {ticket.type === "Rig Down" && (
            <div style={{ background: "#fdf5d8", border: "1px solid #e6c200", borderRadius: 6, padding: 12, marginBottom: 16 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.yellow }}>Check quantities against R/U — any pieces missing? </span>
              {!isLocked ? (
                <>
                  <span onClick={() => setMissingPieces(false)} style={{ cursor: "pointer", fontWeight: 700, color: missingPieces === false ? C.green : C.muted, marginLeft: 8 }}>NO</span>
                  <span style={{ color: C.muted, margin: "0 6px" }}>|</span>
                  <span onClick={() => setMissingPieces(true)} style={{ cursor: "pointer", fontWeight: 700, color: missingPieces === true ? C.red : C.muted }}>YES</span>
                </>
              ) : (
                <span style={{ fontWeight: 700, color: missingPieces ? C.red : C.green, marginLeft: 8 }}>{missingPieces ? "YES" : "NO"}</span>
              )}
            </div>
          )}

          {/* Status selector (unlocked only) */}
          {!isLocked && status !== "emailed" && (
            <div style={{ display: "flex", gap: 6, marginBottom: 16, alignItems: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginRight: 4 }}>STATUS:</span>
              {[["incomplete", "INCOMPLETE"], ["inField", "IN FIELD"]].map(([key, lbl]) => (
                <FilterBtn key={key} active={status === key} onClick={() => setStatus(key)}>{lbl}</FilterBtn>
              ))}
            </div>
          )}

          {/* Line items */}
          <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: "0.08em", marginBottom: 8 }}>LINE ITEMS</div>
          {!isLocked ? (
            <LineItemEditor lineItems={lineItems} setLineItems={setLineItems} ticketType={ticket.type} qbItems={qbItems} onSigWipe={handleSigWipe} />
          ) : (
            <ReadOnlyLineItems lineItems={lineItems} ticketType={ticket.type} total={total} />
          )}

          {/* Notes */}
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: "0.08em", marginBottom: 6 }}>NOTES</div>
            {!isFullyLocked ? (
              <textarea style={{ ...inputStyle, width: "100%", minHeight: 60, resize: "vertical", boxSizing: "border-box" }}
                value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes..." />
            ) : (
              <div style={{ fontSize: 12, color: C.text, padding: "8px 0" }}>{notes || "—"}</div>
            )}
          </div>

          {/* Photos */}
          <PhotoStrip ticketId={ticket.id} isLocked={isFullyLocked || !!ticket.voidedAt} />

          {/* JSA */}
          <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 10 }}>
            <button type="button" onClick={() => setShowJSA(true)}
              style={{ background: existingJSA ? C.green : C.blue, color: "#fff", border: "none", borderRadius: 4, padding: "6px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
              {existingJSA ? "VIEW / EDIT JSA" : "CREATE JSA"}
            </button>
            {existingJSA && <span style={{ fontSize: 11, color: C.green, fontWeight: 700 }}>✓ JSA on file</span>}
            {jsaLoaded && !existingJSA && <span style={{ fontSize: 11, color: "#8a6500", fontWeight: 600 }}>No JSA yet</span>}
          </div>

          {/* Signature display */}
          {["signed", "approved", "sentToQB", "qbVerified"].includes(status) && signedBy && (
            <div style={{ background: "#e6f5ec", border: `1px solid ${C.green}44`, borderRadius: 6, padding: 14, marginTop: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: C.green, marginBottom: 6 }}>✓ SIGNED &nbsp; {signedBy} &nbsp; <span style={{ fontWeight: 400, color: C.muted }}>{signedAt ? formatDate(signedAt) : ""}</span></div>
              {signatureImage && <img src={signatureImage} alt="Signature" style={{ maxWidth: 300, height: 80, display: "block", border: `1px solid ${C.border}`, borderRadius: 4, background: C.white }} />}
            </div>
          )}

          {/* Sig not required display */}
          {status === "sigNotReq" && (
            <div style={{ background: "#e8f0fb", border: `1px solid ${C.blue}44`, borderRadius: 6, padding: 14, marginTop: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: C.blue }}>SIGNATURE NOT REQUIRED</div>
              <div style={{ fontSize: 11, color: C.text, marginTop: 4 }}>{sigNotReqReason}</div>
              {sigNotReqNote && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{sigNotReqNote}</div>}
            </div>
          )}

          {/* Sig not required options */}
          {showSigOptions && (
            <div style={{ background: C.steel, border: `1px solid ${C.border}`, borderRadius: 6, padding: 16, marginTop: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 10 }}>REASON SIGNATURE NOT REQUIRED</div>
              {[["not_required", "Customer does not require field signature"], ["other", "Other"]].map(([val, lbl]) => (
                <div key={val} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, cursor: "pointer" }} onClick={() => setSigNotReqReason(sigNotReqReason === val ? null : val)}>
                  <div style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${sigNotReqReason === val ? C.blue : C.border}`, background: sigNotReqReason === val ? C.blue : "transparent" }} />
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{lbl}</span>
                </div>
              ))}
              {sigNotReqReason === "other" && (
                <input style={inputStyle} value={sigNotReqNote} onChange={e => setSigNotReqNote(e.target.value)} placeholder="Reason..." />
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <Btn onClick={handleSigNotRequired}>CONFIRM</Btn>
                <Btn variant="ghost" onClick={() => setShowSigOptions(false)}>CANCEL</Btn>
              </div>
            </div>
          )}

          {/* Sig pad — always rendered when showSigPad is true */}
          {showSigPad && (
            <SignaturePad onSign={handleSign} onCancel={() => setShowSigPad(false)} />
          )}

          {/* ── Comment Thread ── */}
          <div style={{ marginTop: 20, borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>Site Manager Comments</span>
              {(ticket.hasPendingComment || ticket.has_pending_comment) && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#fdecea", color: "#B01020", borderRadius: 4, padding: "2px 8px", fontSize: 10, fontWeight: 800, letterSpacing: "0.04em", border: "1px solid #B0102044" }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#B01020", display: "inline-block" }} />
                  COMMENT PENDING
                </span>
              )}
            </div>
            {tdLoading && <div style={{ fontSize: 12, color: C.muted }}>Loading comments...</div>}
            {!tdLoading && tdComments.length === 0 && <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>No comments yet.</div>}
            {tdComments.map((c, i) => {
              const who = c.author_type === "fti" ? `Flo-Test (${c.author})` : `${c.author} (Site)`;
              const bg = c.author_type === "fti" ? "#e8f0fb" : "#fef9e7";
              const time = new Date(c.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
              return (
                <div key={i} style={{ background: bg, borderRadius: 6, padding: "8px 12px", marginBottom: 6 }}>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 3 }}><strong>{who}</strong> · {time}</div>
                  <div style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{c.message}</div>
                </div>
              );
            })}
            <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "flex-end" }}>
              <textarea
                style={{ flex: 1, padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, minHeight: 50, resize: "vertical", boxSizing: "border-box" }}
                value={tdReply} onChange={e => setTdReply(e.target.value)}
                placeholder="Reply to site manager..."
              />
              <button type="button"
                style={{ background: C.blue, color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: tdSending ? 0.6 : 1, whiteSpace: "nowrap", height: 36 }}
                disabled={tdSending || !tdReply.trim()}
                onClick={async () => {
                  if (!tdReply.trim()) return;
                  setTdSending(true);
                  try {
                    const r = await fetch(`${API_URL}/signature/reply/${ticket.id}`, {
                      method: "POST", headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ author: currentUser?.name || "FTI", message: tdReply.trim() }),
                    });
                    if (!r.ok) { const d = await r.json(); alert(d.error || "Reply failed"); setTdSending(false); return; }
                    setTdComments(prev => [...prev, { author: currentUser?.name || "FTI", author_type: "fti", message: tdReply.trim(), created_at: new Date().toISOString() }]);
                    setTdReply("");
                    // Clear pending flag locally
                    if (onUpdate) onUpdate(ticket.id, { hasPendingComment: false, has_pending_comment: false });
                  } catch (err) { alert("Reply failed: " + err.message); }
                  setTdSending(false);
                }}>
                {tdSending ? "Sending..." : "Reply & Email"}
              </button>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div style={{ padding: "16px 24px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>

          {/* QB Verified — fully locked */}
          {status === "qbVerified" && (
            <span style={{ fontSize: 12, fontWeight: 800, color: C.green, background: "#d4edda", padding: "6px 14px", borderRadius: 4 }}>✓ QB VERIFIED</span>
          )}

          {status === "sentToQB" && (
            <span style={{ fontSize: 12, fontWeight: 700, color: C.muted, background: C.steel, border: `1px solid ${C.border}`, padding: "6px 14px", borderRadius: 4 }}>AWAITING QB VERIFICATION</span>
          )}

          {/* Approved — send to QB */}
          {status === "approved" && !isEditing && (
            <Btn variant="blue" onClick={() => setShowQBConfirm(true)}>SEND TO ACCOUNTING</Btn>
          )}

          {/* Signed/SigNotReq — approve */}
          {(status === "signed" || status === "sigNotReq") && !isEditing && (
            canApprove
              ? <Btn variant="blue" onClick={handleApprove}>APPROVE TICKET</Btn>
              : <span style={{ fontSize: 12, fontWeight: 700, color: C.muted, padding: "6px 0" }}>Awaiting approval</span>
          )}

          {/* Editable — save/sign buttons */}
          {!isLocked && !showSigPad && !showSigOptions && (
            <>
              <Btn onClick={handleSave}>SAVE & CLOSE</Btn>
              {!sigWiped && <Btn variant="blue" onClick={() => setShowSigPad(true)}>COLLECT SIGNATURE</Btn>}
              {!sigWiped && !signedBy && <Btn variant="ghost" onClick={() => setShowSigOptions(true)}>SIG NOT REQUIRED</Btn>}
            </>
          )}

          {/* Edit button for locked but NOT signed tickets (e.g., sigNotReq) */}
          {isLocked && !isFullyLocked && !signedBy && status !== "sentToQB" && status !== "voided" && !isEditing && (
            <Btn variant="ghost" onClick={() => setIsEditing(true)}>EDIT TICKET</Btn>
          )}

          {/* Void button for signed tickets only */}
          {signedBy && !isFullyLocked && status !== "voided" && !isEditing && onRevise && (
            <Btn variant="ghost" onClick={() => setShowVoidConfirm(true)}>VOID TICKET</Btn>
          )}

          {/* Voided — no actions */}
          {status === "voided" && (
            <span style={{ fontSize: 12, fontWeight: 800, color: C.red, background: "#fdecea", padding: "6px 14px", borderRadius: 4 }}>VOIDED</span>
          )}

          {/* Always show close/cancel */}
          {!isFullyLocked && !isEditing && !sigWiped && <Btn variant="ghost" onClick={handleClose}>CLOSE</Btn>}
          {!isFullyLocked && (isEditing || sigWiped) && <Btn variant="ghost" onClick={handleCancel}>CANCEL</Btn>}
          {isFullyLocked && <Btn variant="ghost" onClick={onClose}>CLOSE</Btn>}

          {/* Spacer to push delete/duplicate to the right */}
          <div style={{ flex: 1 }} />

          {/* Duplicate */}
          {onDuplicate && !isFullyLocked && (
            <Btn variant="ghost" onClick={() => setShowDupModal(true)}>DUPLICATE</Btn>
          )}

          {/* Delete — not on locked/QB tickets */}
          {onDelete && !isFullyLocked && (
            <button type="button" onClick={() => setShowDeleteConfirm(true)}
              style={{ background: "transparent", border: "none", color: C.red, fontSize: 11, fontWeight: 700, cursor: "pointer", padding: "6px 10px", letterSpacing: "0.04em", opacity: 0.7 }}>
              DELETE
            </button>
          )}

        </div>

        {/* Unsaved changes confirmation */}
        {showUnsavedClose && (
          <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }} onClick={() => setShowUnsavedClose(false)}>
            <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderTop: `4px solid ${C.red}`, borderRadius: 8, padding: 28, width: 400, maxWidth: "90vw" }} onClick={e => e.stopPropagation()}>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 10 }}>Unsaved Changes</div>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>You have unsaved changes on this ticket. Are you sure you want to close without saving?</div>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn onClick={onClose}>YES, DISCARD</Btn>
                <Btn variant="ghost" onClick={() => setShowUnsavedClose(false)}>KEEP EDITING</Btn>
              </div>
            </div>
          </div>
        )}

        {/* Send to Accounting confirmation */}
        {showQBConfirm && (
          <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }} onClick={() => setShowQBConfirm(false)}>
            <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderTop: `4px solid ${C.blue}`, borderRadius: 8, padding: 28, width: 420, maxWidth: "90vw" }} onClick={e => e.stopPropagation()}>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 12 }}>Send to Accounting?</div>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 24, lineHeight: 1.6 }}>
                Once submitted, this ticket will be permanently locked. No further edits, signatures, or deletions will be permitted.
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn variant="blue" onClick={() => { setShowQBConfirm(false); handleSendToQB(); }}>CONFIRM — SEND TO ACCOUNTING</Btn>
                <Btn variant="ghost" onClick={() => setShowQBConfirm(false)}>CANCEL</Btn>
              </div>
            </div>
          </div>
        )}

        {/* Delete confirmation */}
        {showDeleteConfirm && (
          <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }} onClick={() => setShowDeleteConfirm(false)}>
            <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderTop: `4px solid ${C.red}`, borderRadius: 8, padding: 28, width: 420, maxWidth: "90vw" }} onClick={e => e.stopPropagation()}>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 10 }}>Delete Ticket?</div>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 20, lineHeight: 1.6 }}>
                This will remove ticket <strong>#{ticket.jobId}{ticket.ticketNumber ? `-${ticket.ticketNumber}` : ""}</strong> ({ticket.type}). The ticket can be recovered by an admin.
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn onClick={async () => {
                  try {
                    const r = await fetch(`${API_URL}/tickets/${ticket.id}`, { method: "DELETE" });
                    if (!r.ok) { const d = await r.json(); alert(d.error || "Delete failed"); return; }
                    if (onDelete) onDelete(ticket.id);
                  } catch (err) { alert("Delete failed: " + err.message); }
                  setShowDeleteConfirm(false);
                }}>YES, DELETE</Btn>
                <Btn variant="ghost" onClick={() => setShowDeleteConfirm(false)}>CANCEL</Btn>
              </div>
            </div>
          </div>
        )}

        {/* Void confirmation */}
        {showVoidConfirm && (
          <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }} onClick={() => setShowVoidConfirm(false)}>
            <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderTop: `4px solid ${C.red}`, borderRadius: 8, padding: 28, width: 460, maxWidth: "90vw" }} onClick={e => e.stopPropagation()}>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.red, marginBottom: 10 }}>Void This Ticket?</div>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 12, lineHeight: 1.7 }}>
                Ticket <strong>#{ticket.jobId}{ticket.ticketNumber ? `-${ticket.ticketNumber}` : ""}</strong> is signed and permanent. Proceeding will:
              </div>
              <div style={{ fontSize: 13, color: C.text, marginBottom: 20, lineHeight: 1.8, paddingLeft: 16 }}>
                <div>1. Void this ticket permanently (cannot be reversed)</div>
                <div>2. Preserve the existing signature for audit records</div>
                <div>3. Generate a new draft ticket with the same line items</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn onClick={() => {
                  setShowVoidConfirm(false);
                  if (onRevise) onRevise(ticket);
                }}>YES, VOID & CREATE NEW</Btn>
                <Btn variant="ghost" onClick={() => setShowVoidConfirm(false)}>CANCEL</Btn>
              </div>
            </div>
          </div>
        )}

        {/* JSA Modal */}
        {showJSA && job && (
          <JSAModal
            job={job}
            ticket={ticket}
            existingJSA={existingJSA}
            onClose={() => setShowJSA(false)}
            onSave={async (jsaData) => {
              try {
                const endpoint = ticket.id
                  ? `${API_URL}/jsas/ticket/${ticket.id}`
                  : `${API_URL}/jsas/${job.id}`;
                await fetch(endpoint, {
                  method: "PUT", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    job_id: job.id,
                    date: jsaData.date, time: jsaData.time, operator: jsaData.operator,
                    well_name: jsaData.wellName, designated_driver: jsaData.designatedDriver,
                    latitude: jsaData.lat, longitude: jsaData.lng, weather: jsaData.weather,
                    ppe_fr_clothing: jsaData.ppe?.frClothing || false,
                    ppe_tools_trained: jsaData.ppe?.toolsTrained || false,
                    ppe_confined_space: jsaData.ppe?.confinedSpace || false,
                    presenter_review: jsaData.presenterReview,
                    signatures: jsaData.signatures,
                    additional_steps: jsaData.additionalSteps,
                  }),
                });
                setExistingJSA(jsaData);
              } catch (err) { console.error("JSA save failed:", err); }
            }}
          />
        )}

        {/* Duplicate Options Modal */}
        {showDupModal && (() => {
          const TYPES = ["Rig Up", "Tester", "Pumper", "Rental", "Rig Down"];
          const DupModal = () => {
            const [dupType, setDupType] = useState(ticket.type);
            const [dupDate, setDupDate] = useState(today());
            const [dupJobId, setDupJobId] = useState(ticket.jobId);
            const [incLineItems, setIncLineItems] = useState(true);
            const [incNotes, setIncNotes] = useState(false);
            const [incPin, setIncPin] = useState(true);
            const [incWells, setIncWells] = useState(true);
            const [submitting, setSubmitting] = useState(false);
            const targetJob = jobs?.find(j => j.id === dupJobId);
            const activeJobs = (jobs || []).filter(j => j.status !== "Deleted");
            const chk = { width: 16, height: 16, cursor: "pointer", accentColor: C.blue };
            const lbl = { fontSize: 13, cursor: "pointer", userSelect: "none" };
            return (
              <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300 }} onClick={() => setShowDupModal(false)}>
                <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderTop: `4px solid ${C.blue}`, borderRadius: 8, padding: 28, width: 500, maxWidth: "95vw", maxHeight: "85vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 4 }}>Duplicate Ticket</div>
                  <div style={{ fontSize: 12, color: C.muted, marginBottom: 20 }}>
                    #{ticket.jobId}{ticket.ticketNumber ? `-${ticket.ticketNumber}` : ""} — {ticket.type}
                  </div>

                  {/* Type */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.08em", marginBottom: 4 }}>TICKET TYPE</div>
                    <select value={dupType} onChange={e => setDupType(e.target.value)} style={{ width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 13 }}>
                      {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  {/* Date */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.08em", marginBottom: 4 }}>TICKET DATE</div>
                    <input type="date" value={dupDate} onChange={e => setDupDate(e.target.value)} style={{ width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 13, boxSizing: "border-box" }} />
                  </div>

                  {/* Target Job */}
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.08em", marginBottom: 4 }}>ASSIGN TO JOB</div>
                    <select value={dupJobId} onChange={e => setDupJobId(Number(e.target.value))} style={{ width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 13 }}>
                      {activeJobs.map(j => <option key={j.id} value={j.id}>#{j.id} — {j.customer} ({j.location})</option>)}
                    </select>
                    {dupJobId !== ticket.jobId && targetJob && (
                      <div style={{ fontSize: 11, color: C.blue, marginTop: 4 }}>Customer: {targetJob.customer}</div>
                    )}
                  </div>

                  {/* Carry Over Options */}
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.08em", marginBottom: 8 }}>CARRY OVER</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20, padding: "12px 14px", background: C.steel, borderRadius: 6 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 10, ...lbl }}>
                      <input type="checkbox" checked={incLineItems} onChange={e => setIncLineItems(e.target.checked)} style={chk} />
                      Line Items ({ticket.lineItems?.length || 0} items)
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 10, ...lbl }}>
                      <input type="checkbox" checked={incNotes} onChange={e => setIncNotes(e.target.checked)} style={chk} />
                      Notes
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 10, ...lbl }}>
                      <input type="checkbox" checked={incPin} onChange={e => setIncPin(e.target.checked)} style={chk} />
                      Google Pin
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 10, ...lbl }}>
                      <input type="checkbox" checked={incWells} onChange={e => setIncWells(e.target.checked)} style={chk} />
                      Assigned Wells
                    </label>
                  </div>

                  <div style={{ display: "flex", gap: 10 }}>
                    <Btn variant="blue" onClick={async () => {
                      setSubmitting(true);
                      await onDuplicate(ticket, {
                        new_date: dupDate,
                        new_job_id: dupJobId !== ticket.jobId ? dupJobId : undefined,
                        new_type: dupType !== ticket.type ? dupType : undefined,
                        assigned_wells: incWells ? ticket.assignedWells : [],
                        include_notes: incNotes,
                        include_line_items: incLineItems,
                        include_pin: incPin,
                      });
                      setShowDupModal(false);
                      setSubmitting(false);
                    }} disabled={submitting}>{submitting ? "DUPLICATING..." : "DUPLICATE"}</Btn>
                    <Btn variant="ghost" onClick={() => setShowDupModal(false)}>CANCEL</Btn>
                  </div>
                </div>
              </div>
            );
          };
          return <DupModal />;
        })()}

      </div>
    </div>
  );
}

// ─── READ-ONLY LINE ITEMS (for signed tickets) ───────────────────────────────
function ReadOnlyLineItems({ lineItems, ticketType, total }) {
  const isRental = ticketType === "Rental";
  const cols = isRental
    ? "40px 90px 1fr 65px 55px 60px 55px 85px"
    : "40px 100px 1fr 70px 70px 70px 90px";
  const headers = isRental
    ? ["#", "CODE", "DESCRIPTION", "RATE", "QTY", "U/M", "DAYS", "TOTAL"]
    : ["#", "CODE", "DESCRIPTION", "RATE", "QTY", "U/M", "TOTAL"];

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: cols, gap: 4, padding: "6px 0", borderBottom: `1px solid ${C.border}`, marginBottom: 4 }}>
        {headers.map(h => (
          <div key={h} style={{ fontSize: 9, fontWeight: 800, color: C.muted, letterSpacing: "0.1em" }}>{h}</div>
        ))}
      </div>
      {lineItems.map((li, idx) => (
        <div key={idx} style={{
          display: "grid", gridTemplateColumns: cols,
          gap: 4, padding: "5px 0", borderBottom: `1px solid ${C.border}22`,
        }}>
          <div style={{ fontSize: 11, color: C.muted, textAlign: "center" }}>{idx + 1}</div>
          <div style={{ fontSize: 11, color: C.blue, fontWeight: 600 }}>{li.qbCode}</div>
          <div style={{ fontSize: 11, color: C.text }}>{li.desc}</div>
          <div style={{ fontSize: 11, textAlign: "right" }}>{'$'}{li.rate}</div>
          <div style={{ fontSize: 11, textAlign: "right" }}>{li.qty}</div>
          <div style={{ fontSize: 10, color: C.muted }}>{li.um}</div>
          {isRental && <div style={{ fontSize: 11, textAlign: "right" }}>{li.days || 1}</div>}
          <div style={{ fontSize: 11, fontWeight: 700, textAlign: "right" }}>
            {'$'}{calcLineTotal(li).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      ))}
      <div style={{ display: "grid", gridTemplateColumns: cols, gap: 4, padding: "8px 0", borderTop: `2px solid ${C.border}`, marginTop: 4 }}>
        {headers.slice(0, -1).map((_, i) => <div key={i} />)}
        <div style={{ fontSize: 13, fontWeight: 800, color: C.text, textAlign: "right" }}>
          {'$'}{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>
    </div>
  );
}

// ─── ADD TICKET MODAL ─────────────────────────────────────────────────────────
function AddTicketModal({ jobId, job, onSave, onClose, qbItems, jobWells = [], existingTickets = [] }) {
  const [type, setType] = useState(null);
  const [assignedWells, setAssignedWells] = useState([]);
  const [wellsConfirmed, setWellsConfirmed] = useState(false);
  const [lineItems, setLineItems] = useState([]);
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(today());
  const [startDate, setStartDate] = useState(today());
  const [cycleDays, setCycleDays] = useState(28);
  const [isRecurring, setIsRecurring] = useState(true);
  const [showUnsaved, setShowUnsaved] = useState(false);
  // Time & mileage
  const [lvYard, setLvYard] = useState("");
  const [arrivalTime, setArrivalTime] = useState("");
  const [dueOnLoc, setDueOnLoc] = useState("");
  const [jobStartTime, setJobStartTime] = useState("");
  const [jobEndTime, setJobEndTime] = useState("");
  const [retYard, setRetYard] = useState("");
  const [timeZone, setTimeZone] = useState("");
  const [mileageBegin, setMileageBegin] = useState("");
  const [mileageEnd, setMileageEnd] = useState("");
  // Google Pin
  const jobGooglePin = job?.googlePin || job?.google_pin || "";
  const [ticketPin, setTicketPin] = useState(jobGooglePin);
  // Site Manager
  const [smFirst, setSmFirst] = useState("");
  const [smLast, setSmLast] = useState("");
  const [smPhone, setSmPhone] = useState("");
  const [smEmail, setSmEmail] = useState("");
  const [ticketPinLat, setTicketPinLat] = useState(job?.pinLat || job?.pin_lat || null);
  const [ticketPinLng, setTicketPinLng] = useState(job?.pinLng || job?.pin_lng || null);
  const [ticketPinResolving, setTicketPinResolving] = useState(false);
  const [ticketPinError, setTicketPinError] = useState("");
  const [driveInfo, setDriveInfo] = useState(null);
  const [driveLoading, setDriveLoading] = useState(false);
  const pinMismatch = jobGooglePin && ticketPin && ticketPin.trim() !== jobGooglePin.trim();

  // Auto-fetch drive distance when coords become available
  useEffect(() => {
    const lat = ticketPinLat;
    const lng = ticketPinLng;
    if (!lat || !lng) { setDriveInfo(null); return; }
    setDriveLoading(true);
    fetch(`${API_URL}/jobs/drive-distance`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ destLat: lat, destLng: lng }),
    })
      .then(r => r.ok ? r.json() : { error: "Could not calculate" })
      .then(d => setDriveInfo(d))
      .catch(() => setDriveInfo({ error: "Network error" }))
      .finally(() => setDriveLoading(false));
  }, [ticketPinLat, ticketPinLng]);

  const ALL_TIMES = Array.from({ length: 48 }, (_, i) => {
    const h24 = Math.floor(i / 2), m = i % 2 === 0 ? "00" : "30";
    const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
    return `${h12}:${m} ${h24 < 12 ? "AM" : "PM"}`;
  });
  const timeOpts = (startIdx) => [""].concat(ALL_TIMES.slice(startIdx).concat(ALL_TIMES.slice(0, startIdx)));

  const endDate = useMemo(() => {
    if (!startDate || !cycleDays) return "";
    const d = new Date(startDate + "T00:00:00");
    d.setDate(d.getDate() + (cycleDays - 1));
    return d.toLocaleDateString("en-CA");
  }, [startDate, cycleDays]);

  const isDirty = type || lineItems.length > 0 || notes;
  const handleClose = () => { if (isDirty) { setShowUnsaved(true); } else { onClose(); } };

  const handleSelectType = (t) => {
    setType(t);
    setAssignedWells([...jobWells]);
    if (jobWells.length <= 1) setWellsConfirmed(true);
    else setWellsConfirmed(false);
    if (t === "Rig Down") {
      const ruTicket = existingTickets.find(tk => tk.type === "Rig Up" && tk.jobId === jobId);
      if (ruTicket && ruTicket.lineItems?.length) {
        setLineItems([...ruTicket.lineItems]);
        if (ruTicket.assignedWells?.length) setAssignedWells([...ruTicket.assignedWells]);
        if (ruTicket.notes) setNotes(ruTicket.notes);
      }
    }
    if (t === "Rental") { setStartDate(today()); setCycleDays(28); setIsRecurring(true); }
  };

  const toggleWell = (well) => {
    setAssignedWells(prev => prev.includes(well) ? prev.filter(w => w !== well) : [...prev, well]);
  };
  const selectAllWells = () => setAssignedWells([...jobWells]);

  const handleSave = () => {
    if (!type) return;
    const isRental = type === "Rental";
    const jobGooglePin = job?.googlePin || job?.google_pin || null;
    const jobPinLat = job?.pinLat || job?.pin_lat || null;
    const jobPinLng = job?.pinLng || job?.pin_lng || null;
    onSave({
      jobId, type, status: "incomplete", date: isRental ? startDate : date,
      signedBy: null, signedAt: null,
      lineItems, notes,
      assignedWells: assignedWells ?? jobWells,
      siteMgrFirst: smFirst, siteMgrLast: smLast, siteMgrPhone: smPhone, siteMgrEmail: smEmail,
      ...(type === "Rig Down" ? { missingPieces: null } : {}),
      ...(isRental ? { startDate, endDate, cycleDays: parseInt(cycleDays) || 28, isRecurring } : {}),
      ...(!isRental ? {
        lvYard, arrivalTime, dueOnLoc, jobStartTime, jobEndTime, retYard, timeZone,
        mileageBegin: mileageBegin !== "" ? parseFloat(mileageBegin) : null,
        mileageEnd: mileageEnd !== "" ? parseFloat(mileageEnd) : null,
        googlePin: ticketPin.trim() || jobGooglePin,
        pinLat: ticketPinLat || jobPinLat,
        pinLng: ticketPinLng || jobPinLng,
      } : {}),
    });
  };

  const selStyle = { border: `1px solid ${C.border}`, borderRadius: 4, padding: "3px 6px", fontSize: 12, color: C.text, background: C.cardBg, width: 98 };
  const lblSm = { fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: "0.06em", marginBottom: 3 };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "#00000088",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
    }} onClick={handleClose}>
      <div style={{
        background: C.cardBg, border: `1px solid ${C.border}`,
        borderTop: `3px solid ${C.red}`, borderRadius: 8,
        width: type ? 820 : 480, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto",
      }} onClick={e => e.stopPropagation()}>
        {showUnsaved && (
          <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }} onClick={() => setShowUnsaved(false)}>
            <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderTop: `4px solid ${C.red}`, borderRadius: 8, padding: 28, width: 400, maxWidth: "90vw" }} onClick={e => e.stopPropagation()}>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 10 }}>Unsaved Changes</div>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>This ticket has not been saved. Are you sure you want to close?</div>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn onClick={onClose}>YES, DISCARD</Btn>
                <Btn variant="ghost" onClick={() => setShowUnsaved(false)}>KEEP EDITING</Btn>
              </div>
            </div>
          </div>
        )}

        {/* Job info banner — always visible once type selected */}
        {type && job && (
          <div style={{ background: C.steel, borderBottom: `1px solid ${C.border}`, padding: "10px 20px" }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, letterSpacing: "0.08em", marginBottom: 6 }}>JOB INFO</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 20px", fontSize: 12 }}>
              <span><span style={{ color: C.muted }}>Customer: </span><strong>{job.customer}</strong></span>
              {job.jobState && <span><span style={{ color: C.muted }}>State: </span><strong>{job.jobState}</strong></span>}
              {job.county && <span><span style={{ color: C.muted }}>County: </span><strong>{job.county}</strong></span>}
              {job.wells?.length > 0 && <span><span style={{ color: C.muted }}>Wells: </span><strong>{job.wells.map(w => w.well_name || w).join(", ")}</strong></span>}
              {(job.contactFirst || job.contactLast) && <span><span style={{ color: C.muted }}>Point of Contact: </span><strong>{[job.contactFirst, job.contactLast].filter(Boolean).join(" ")}</strong></span>}
            </div>
          </div>
        )}

        <div style={{ padding: 24 }}>
          {!type ? (
            <>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Add Ticket — Select Type</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {Object.entries(TICKET_TYPES).map(([key, cfg]) => (
                  <button key={key} onClick={() => handleSelectType(key)} style={{
                    background: C.cardBg, border: `2px solid ${cfg.color}33`,
                    borderLeft: `4px solid ${cfg.color}`, borderRadius: 6,
                    padding: "16px 18px", cursor: "pointer", textAlign: "left",
                  }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = cfg.color}
                    onMouseLeave={e => e.currentTarget.style.borderColor = cfg.color + "33"}
                  >
                    <div style={{ fontSize: 14, fontWeight: 800, color: cfg.color, letterSpacing: "0.06em" }}>{cfg.label}</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
                      {key === "Rig Up" && "Crew mobilization, equipment, Day 1 rental"}
                      {key === "Rig Down" && "Teardown, equipment return, DLR check"}
                      {key === "Tester" && "Flo-back testing, hourly logging"}
                      {key === "Pumper" && "Field specialist, daily operations"}
                      {key === "Rental" && "Ongoing equipment rental (Day 2+)"}
                    </div>
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 16 }}>
                <Btn onClick={handleClose} variant="ghost">CANCEL</Btn>
              </div>
            </>
          ) : type && !wellsConfirmed && jobWells.length > 1 ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <TicketTypeBadge type={type} />
                <span style={{ fontSize: 16, fontWeight: 700 }}>Assign Wells — New {type} Ticket</span>
                <button onClick={() => { setType(null); setWellsConfirmed(false); }} style={{
                  background: "transparent", border: `1px solid ${C.border}`, borderRadius: 4,
                  padding: "3px 10px", fontSize: 11, fontWeight: 700, color: C.muted, cursor: "pointer", marginLeft: "auto",
                }}>← CHANGE TYPE</button>
              </div>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 14 }}>Select which wells apply to this ticket.</div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <label style={{ fontSize: 11, fontWeight: 800, color: C.muted, letterSpacing: "0.08em" }}>WELLS ON THIS JOB</label>
                  <button type="button" onClick={selectAllWells} style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 3, padding: "2px 10px", fontSize: 11, fontWeight: 700, color: C.text, cursor: "pointer" }}>SELECT ALL</button>
                </div>
                {jobWells.map((well, idx) => {
                  const checked = assignedWells.includes(well);
                  return (
                    <div key={idx} onClick={() => toggleWell(well)} style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", marginBottom: 6,
                      background: checked ? "#e8f0fb" : C.steel, border: `1px solid ${checked ? C.blue + "44" : C.border}`,
                      borderRadius: 5, cursor: "pointer",
                    }}>
                      <div style={{ width: 18, height: 18, borderRadius: 3, border: `2px solid ${checked ? C.blue : C.border}`, background: checked ? C.blue : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {checked && <span style={{ color: C.white, fontSize: 12, fontWeight: 900, lineHeight: 1 }}>✓</span>}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: checked ? 700 : 400, color: C.text }}>{well}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn onClick={() => { if (assignedWells.length === 0) return; setWellsConfirmed(true); }}>
                  {assignedWells.length === 0 ? "SELECT AT LEAST ONE WELL" : `CONFIRM — ${assignedWells.length} WELL${assignedWells.length !== 1 ? "S" : ""}`}
                </Btn>
                <Btn variant="ghost" onClick={handleClose}>CANCEL</Btn>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <TicketTypeBadge type={type} />
                <span style={{ fontSize: 16, fontWeight: 700 }}>New {type} Ticket</span>
                <button onClick={() => { setType(null); setWellsConfirmed(false); }} style={{
                  background: "transparent", border: `1px solid ${C.border}`, borderRadius: 4,
                  padding: "3px 10px", fontSize: 11, fontWeight: 700, color: C.muted, cursor: "pointer", marginLeft: "auto",
                }}>← CHANGE TYPE</button>
              </div>

              <div style={{ marginBottom: 14 }}>
                {type === "Rental" ? (
                  <>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
                      <div><label style={labelStyle}>START DATE</label><input type="date" style={{ ...inputStyle, width: 160 }} value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
                      <div><label style={labelStyle}>CYCLE (DAYS)</label><input type="number" style={{ ...inputStyle, width: 80 }} value={cycleDays} onChange={e => setCycleDays(e.target.value)} min={1} /></div>
                      <div><label style={labelStyle}>END DATE</label><input type="date" style={{ ...inputStyle, width: 160, background: "#f0f3f8" }} value={endDate} readOnly /></div>
                    </div>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: C.text, cursor: "pointer" }}>
                      <input type="checkbox" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} style={{ width: 16, height: 16 }} />
                      Recurring (auto-create next cycle ticket)
                    </label>
                  </>
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", alignItems: "flex-end" }}>
                    <div>
                      <label style={labelStyle}>DATE</label>
                      <input type="date" style={{ ...inputStyle, width: 180 }} value={date} onChange={e => setDate(e.target.value)} />
                    </div>
                    <div>
                      <label style={labelStyle}>DUE ON LOCATION</label>
                      <TimePicker value={dueOnLoc} onChange={setDueOnLoc} startHour={6} startPeriod="AM" />
                    </div>
                  </div>
                )}
              </div>

              {/* Site Manager */}
              <div style={{ background: C.steel, border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 14px", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, letterSpacing: "0.08em" }}>SITE MANAGER</div>
                  {job && (job.contactFirst || job.contactLast) && (
                    <span onClick={() => {
                      setSmFirst(job.contactFirst || "");
                      setSmLast(job.contactLast || "");
                      setSmPhone(job.pocPhone || job.poc_phone || "");
                      setSmEmail(job.pocEmail || job.poc_email || "");
                    }} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: C.blue, fontWeight: 700, cursor: "pointer", padding: "3px 10px", border: `1px solid ${C.blue}44`, borderRadius: 4, background: "transparent" }}>
                      <span style={{ fontSize: 13 }}>📋</span> Copy Point of Contact Info
                    </span>
                  )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div><label style={labelStyle}>FIRST NAME</label><input style={inputStyle} value={smFirst} onChange={e => setSmFirst(e.target.value)} placeholder="First" /></div>
                  <div><label style={labelStyle}>LAST NAME</label><input style={inputStyle} value={smLast} onChange={e => setSmLast(e.target.value)} placeholder="Last" /></div>
                  <div><label style={labelStyle}>PHONE</label><input style={inputStyle} value={smPhone} onChange={e => setSmPhone(e.target.value)} placeholder="555-555-5555" /></div>
                  <div><label style={labelStyle}>EMAIL</label><input style={inputStyle} value={smEmail} onChange={e => setSmEmail(e.target.value)} placeholder="email@company.com" /></div>
                </div>
              </div>

              {/* Google Pin — before Time & Mileage so drive info populates first */}
              {type !== "Rental" && (
                <div style={{ background: C.steel, border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 14px", marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, letterSpacing: "0.08em" }}>GOOGLE PIN</div>
                    {pinMismatch && (
                      <span style={{ fontSize: 10, fontWeight: 800, color: "#8a6500", background: "#fdf5d8", border: "1px solid #e6c20044", borderRadius: 3, padding: "2px 8px", letterSpacing: "0.04em" }}>
                        ALT PIN — differs from Master Job Card
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input style={{ ...inputStyle, flex: 1, fontFamily: "monospace", fontSize: 11, padding: "6px 8px" }}
                      placeholder={jobGooglePin ? "Override MJC pin or leave blank to use MJC pin" : "Paste Google Maps link..."}
                      value={ticketPin} onChange={e => { setTicketPin(e.target.value); setTicketPinLat(null); setTicketPinLng(null); setTicketPinError(""); }} />
                    {ticketPin && (
                      <button type="button" onClick={async () => {
                        if (!ticketPin.trim()) return;
                        setTicketPinResolving(true); setTicketPinError("");
                        try {
                          const r = await fetch(`${API_URL}/jobs/resolve-map-pin`, {
                            method: "POST", headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ url: ticketPin.trim() }),
                          });
                          if (!r.ok) { setTicketPinError("Could not resolve pin."); setTicketPinResolving(false); return; }
                          const { lat, lng } = await r.json();
                          setTicketPinLat(lat); setTicketPinLng(lng);
                        } catch { setTicketPinError("Network error."); }
                        setTicketPinResolving(false);
                      }} disabled={ticketPinResolving}
                        style={{ background: C.blue, color: C.white, border: "none", borderRadius: 4, padding: "6px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
                        {ticketPinResolving ? "..." : "RESOLVE"}
                      </button>
                    )}
                  </div>
                  {ticketPinError && <div style={{ fontSize: 11, color: C.red, marginTop: 4, fontWeight: 700 }}>⚠ {ticketPinError}</div>}
                  {ticketPinLat && ticketPinLng && (
                    <div style={{ fontSize: 11, color: C.green, fontWeight: 700, fontFamily: "monospace", marginTop: 4 }}>✓ {parseFloat(ticketPinLat).toFixed(6)}, {parseFloat(ticketPinLng).toFixed(6)}</div>
                  )}
                </div>
              )}

              {/* GPS Reference — Recommended Leave Time & Expected Distance */}
              {type !== "Rental" && (driveLoading || (driveInfo && !driveInfo.error)) && (() => {
                if (driveLoading) return (
                  <div style={{ background: C.steel, border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 14px", marginBottom: 14 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, letterSpacing: "0.08em" }}>GPS REFERENCE</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Calculating drive distance...</div>
                  </div>
                );
                let recLeave = null;
                if (dueOnLoc && driveInfo.durationSeconds) {
                  const dueMatch = dueOnLoc.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
                  if (dueMatch) {
                    let h = parseInt(dueMatch[1]), min = parseInt(dueMatch[2]);
                    const p = dueMatch[3].toUpperCase();
                    if (p === "PM" && h !== 12) h += 12;
                    if (p === "AM" && h === 12) h = 0;
                    const dueMinutes = h * 60 + min;
                    const driveMinutes = Math.ceil(driveInfo.durationSeconds / 60);
                    let leaveMin = dueMinutes - driveMinutes;
                    if (leaveMin < 0) leaveMin += 1440;
                    const lh = Math.floor(leaveMin / 60);
                    const lm = leaveMin % 60;
                    const lh12 = lh === 0 ? 12 : lh > 12 ? lh - 12 : lh;
                    const lp = lh < 12 ? "AM" : "PM";
                    recLeave = `${lh12}:${String(lm).padStart(2, "0")} ${lp}`;
                  }
                }
                return (
                  <div style={{ background: C.steel, border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 14px", marginBottom: 14 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, letterSpacing: "0.08em", marginBottom: 8 }}>GPS REFERENCE</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 24px" }}>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: C.blue, letterSpacing: "0.06em", marginBottom: 3 }}>RECOMMENDED TIME TO LEAVE YARD</div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: recLeave ? C.text : C.muted }}>{recLeave || (dueOnLoc ? "Calculating..." : "Set Due on Loc first")}</div>
                        {recLeave && <div style={{ fontSize: 10, color: C.muted }}>Due on Loc ({dueOnLoc}) − Drive Time ({driveInfo.duration})</div>}
                      </div>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: C.blue, letterSpacing: "0.06em", marginBottom: 3 }}>EXPECTED DISTANCE</div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{driveInfo.distance}</div>
                        <div style={{ fontSize: 10, color: C.muted }}>From yard · Est. {driveInfo.duration}</div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Time & Mileage — non-Rental only */}
              {type !== "Rental" && (
                <div style={{ background: C.steel, border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 14px", marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, letterSpacing: "0.08em", marginBottom: 8 }}>TIME &amp; MILEAGE</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 12px", alignItems: "flex-end", marginBottom: 8 }}>
                    {[
                      { label: "LV YARD", val: lvYard, set: setLvYard, startHour: 6, startPeriod: "AM" },
                      { label: "ARRIVAL", val: arrivalTime, set: setArrivalTime, startHour: 6, startPeriod: "AM" },
                      { label: "JOB START", val: jobStartTime, set: setJobStartTime, startHour: 6, startPeriod: "AM" },
                      { label: "JOB END", val: jobEndTime, set: setJobEndTime, startHour: 12, startPeriod: "PM" },
                      { label: "RET YARD", val: retYard, set: setRetYard, startHour: 12, startPeriod: "PM" },
                    ].map(({ label, val, set, startHour, startPeriod }) => (
                      <div key={label}>
                        <div style={lblSm}>{label}</div>
                        <TimePicker value={val} onChange={set} startHour={startHour} startPeriod={startPeriod} />
                      </div>
                    ))}
                    <div>
                      <div style={lblSm}>TIME ZONE</div>
                      <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
                        {["TX", "NM"].map(tz => (
                          <span key={tz} onClick={() => setTimeZone(tz)} style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", fontSize: 12, fontWeight: 700, color: timeZone === tz ? C.red : C.muted }}>
                            <span style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${timeZone === tz ? C.red : C.border}`, background: timeZone === tz ? C.red : "transparent", display: "inline-block" }} />
                            {tz}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 8, display: "flex", gap: "8px 14px", flexWrap: "wrap", alignItems: "flex-end" }}>
                    {[
                      { label: "MILEAGE — BEGINNING", val: mileageBegin, set: setMileageBegin },
                      { label: "MILEAGE — END", val: mileageEnd, set: setMileageEnd },
                    ].map(({ label, val, set }) => (
                      <div key={label}>
                        <div style={lblSm}>{label}</div>
                        <input type="number" value={val} onChange={e => set(e.target.value)} min={0} placeholder="0"
                          style={{ border: `1px solid ${C.border}`, borderRadius: 4, padding: "3px 8px", fontSize: 12, color: C.text, background: C.cardBg, width: 98 }} />
                      </div>
                    ))}
                    {mileageBegin !== "" && mileageEnd !== "" && (
                      <div>
                        <div style={lblSm}>TOTAL MILES</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{Math.max(0, parseFloat(mileageEnd) - parseFloat(mileageBegin)).toLocaleString()} mi</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: "0.08em", marginBottom: 8 }}>LINE ITEMS</div>
              <LineItemEditor lineItems={lineItems} setLineItems={setLineItems} ticketType={type} qbItems={qbItems} />
              <div style={{ marginTop: 16, marginBottom: 16 }}>
                <label style={labelStyle}>NOTES</label>
                <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 56 }} value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn onClick={handleSave}>CREATE TICKET</Btn>
                <Btn onClick={handleClose} variant="ghost">CANCEL</Btn>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── TICKETS TAB (inside JobCard expanded) ────────────────────────────────────
function JobTicketsTab({ jobId, tickets, setTickets, jobs, qbItems, currentUser, customers, onTicketDeleted }) {
  const [showAdd, setShowAdd] = useState(false);
  const [viewTicket, setViewTicket] = useState(null);
  const [viewTicketMode, setViewTicketMode] = useState("edit");
  const [qbConfirmId, setQbConfirmId] = useState(null);
  const [emailConfirm, setEmailConfirm] = useState(null); // { ticketId, email, emailedAt, cc }
  const [emailConfirmTo, setEmailConfirmTo] = useState("");
  const [emailConfirmCc, setEmailConfirmCc] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 900);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 900);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const openTicket = (t, mode = "edit") => {
    setViewTicketMode(mode);
    // Compute revision display labels
    const enriched = { ...t };
    if (t.replacedBy) {
      const replacement = tickets.find(tk => tk.id === t.replacedBy);
      enriched._replacedByLabel = replacement ? `${t.jobId}-${replacement.ticketNumber}` : null;
    }
    if (t.revisionOf) {
      const original = tickets.find(tk => tk.id === t.revisionOf);
      enriched._revisionOfLabel = original ? `${t.jobId}-${original.ticketNumber}` : null;
    }
    setViewTicket(enriched);
  };

  const jobTickets = tickets.filter(t => t.jobId === jobId);
  const byType = {};
  jobTickets.forEach(t => { byType[t.type] = [...(byType[t.type] || []), t]; });

  const handleAdd = async (ticketData) => {
    const payload = {
      job_id: ticketData.jobId, type: ticketData.type, status: ticketData.status || "incomplete",
      date: ticketData.date, notes: ticketData.notes,
      created_by: currentUser?.id || null,
      assigned_wells: ticketData.assignedWells || [],
      start_date: ticketData.startDate || null,
      end_date: ticketData.endDate || null,
      cycle_days: ticketData.cycleDays || 28,
      is_recurring: ticketData.isRecurring || false,
      lv_yard: ticketData.lvYard || null,
      arrival_time: ticketData.arrivalTime || null,
      due_on_loc: ticketData.dueOnLoc || null,
      job_start_time: ticketData.jobStartTime || null,
      job_end_time: ticketData.jobEndTime || null,
      ret_yard: ticketData.retYard || null,
      time_zone: ticketData.timeZone || null,
      mileage_begin: ticketData.mileageBegin !== undefined ? ticketData.mileageBegin : null,
      mileage_end: ticketData.mileageEnd !== undefined ? ticketData.mileageEnd : null,
      google_pin: ticketData.googlePin || null,
      pin_lat: ticketData.pinLat || null,
      pin_lng: ticketData.pinLng || null,
      site_mgr_first: ticketData.siteMgrFirst || null,
      site_mgr_last: ticketData.siteMgrLast || null,
      site_mgr_phone: ticketData.siteMgrPhone || null,
      site_mgr_email: ticketData.siteMgrEmail || null,
      lineItems: (ticketData.lineItems || []).map(li => ({
        qb_code: li.qbCode, description: li.desc, rate: li.rate, qty: li.qty, unit_measure: li.um, days: li.days || 1,
      })),
    };
    try {
      const r = await fetch(`${API_URL}/tickets`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (r.ok) {
        const saved = await r.json();
        setTickets(prev => [...prev, { ...ticketData, id: saved.id, ticketNumber: saved.ticket_number, createdBy: currentUser?.name || null, createdAt: new Date().toISOString() }]);
      }
    } catch (err) { console.error("Ticket create failed:", err); }
    setShowAdd(false);
  };

  const handleUpdate = async (id, updates) => {
    const payload = buildTicketPayload(updates);
    try {
      await fetch(`${API_URL}/tickets/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    } catch (err) { console.error("Ticket update failed:", err); }
    setTickets(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const handleDelete = (id) => {
    const deleted = tickets.find(t => t.id === id);
    if (deleted && onTicketDeleted) onTicketDeleted(deleted);
    setTickets(prev => prev.filter(t => t.id !== id));
    setViewTicket(null);
  };

  return (
    <div style={{ padding: "16px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.muted }}>
          {jobTickets.length} ticket{jobTickets.length !== 1 ? "s" : ""}
        </div>
        <Btn small onClick={() => setShowAdd(true)}>+ ADD TICKET</Btn>
      </div>

      {jobTickets.length === 0 && (
        <div style={{ textAlign: "center", padding: "24px 0", color: C.muted, fontSize: 13 }}>No tickets yet. Add one to get started.</div>
      )}

      {jobTickets.map(t => {
        const tcfg = TICKET_TYPES[t.type];
        const total = calcTicketTotal(t);
        const job = jobs.find(j => j.id === jobId);
        const custEmail = job?.pocEmail || job?.poc_email || null;
        const isSigned = ["signed", "sigNotReq", "emailed", "approved", "sentToQB", "qbVerified"].includes(t.status);
        const isApproved = t.status === "approved" || t.status === "sentToQB" || t.status === "qbVerified";
        const isEmailed = !!t.emailedAt;
        const hasPendingComment = !!t.hasPendingComment || !!t.has_pending_comment;
        const cycleEnded = !!t.cycleEnded || !!t.cycle_ended;
        const canSendToQB = isSigned && isApproved;

        // Button styles
        const btnBase = { borderRadius: 4, padding: "4px 10px", fontSize: 10, fontWeight: 800, cursor: "pointer", letterSpacing: "0.04em", border: "none", whiteSpace: "nowrap" };
        const btnAction = { ...btnBase, background: "#fdf5d8", color: "#8a6500", border: "1px solid #e6c20044" };
        const btnDone = { ...btnBase, background: "#e6f5ec", color: C.green, border: `1px solid ${C.green}44`, cursor: "default" };
        const btnDisabled = { ...btnBase, background: C.steel, color: C.muted, border: `1px solid ${C.border}`, cursor: "not-allowed", opacity: 0.6 };
        const btnBlue = { ...btnBase, background: "#e8f0fb", color: C.blue, border: `1px solid ${C.blue}44` };

        const isSent = ["sentToQB", "qbVerified"].includes(t.status);

        return (
          <div key={t.id} style={{
            background: isSent ? "#f5f5f5" : C.cardBg, border: `1px solid ${C.border}`,
            borderLeft: `3px solid ${isSent ? "#ccc" : tcfg.color}`, borderRadius: 5, marginBottom: 6,
            opacity: isSent ? 0.6 : 1,
          }}>
          {isMobile ? (
            // Mobile: stacked layout
            <div>
              <div onClick={() => openTicket(t, "edit")} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 12px", cursor: "pointer",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <TicketTypeBadge type={t.type} />
                  <div>
                    <div style={{ fontSize: 11, color: C.muted }}>#{t.jobId}{t.ticketNumber ? `-${t.ticketNumber}` : ""} · {formatDate(t.date)}</div>
                    {hasPendingComment && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 3, background: "#fdecea", color: "#B01020", borderRadius: 4, padding: "1px 6px", fontSize: 9, fontWeight: 800, letterSpacing: "0.04em", border: "1px solid #B0102044", marginTop: 3 }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#B01020", display: "inline-block" }} />
                        COMMENT PENDING
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>
                  {'$'}{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, padding: "0 12px 10px", flexWrap: "wrap" }}>
                {t.voidedAt ? (
                  <span style={{ background: "#fdecea", color: C.red, borderRadius: 4, padding: "2px 8px", fontSize: 10, fontWeight: 800, border: "1px solid #B0102044" }}>VOIDED</span>
                ) : (<>
                {cycleEnded && (
                  <span style={{ background: "#fdf5d8", color: "#8a6500", borderRadius: 4, padding: "2px 8px", fontSize: 10, fontWeight: 800, border: "1px solid #e6c20044" }}>CYCLE ENDED</span>
                )}
                <RentalCountdown ticket={t} />
                {t.hasJSA && <span style={{ background: "#e6f5ec", color: C.green, borderRadius: 4, padding: "2px 6px", fontSize: 9, fontWeight: 800, border: `1px solid ${C.green}44` }}>✓ JSA</span>}
                {/* Sig button */}
                {!isSigned && t.status !== "qbVerified" && t.status !== "sentToQB" && <button type="button" style={btnAction} onClick={() => openTicket(t, "sign")}>SIG REQUEST</button>}
                {t.status === "signed" && <span style={btnDone}>✓ SIGNED</span>}
                {t.status === "sigNotReq" && <span style={{ ...btnDone, color: C.blue }}>SIG NOT REQ</span>}
                {(t.status === "approved" || t.status === "sentToQB" || t.status === "qbVerified") && <span style={btnDone}>✓ SIGNED</span>}
                {/* Email */}
                {!custEmail && <span style={btnDisabled}>NO EMAIL ON FILE</span>}
                {custEmail && t.status !== "sentToQB" && t.status !== "qbVerified" && (
                  <button type="button"
                    style={isEmailed ? { ...btnDone, cursor: "pointer" } : btnBlue}
                    onClick={() => {
                      setEmailConfirm({ ticketId: t.id, email: t.emailTo || custEmail, emailedAt: t.emailedAt || null });
                      setEmailConfirmTo(t.emailTo || custEmail);
                      setEmailConfirmCc("");
                    }}>
                    {isEmailed ? "Emailed / Resend" : "EMAIL TICKET"}
                  </button>
                )}
                {/* Approval */}
                {isSigned && !isApproved && <button type="button" style={btnAction} onClick={async () => { await handleUpdate(t.id, { status: "approved", approvedBy: currentUser?.name, approvedAt: new Date().toISOString() }); }}>APPROVE</button>}
                {isApproved && t.status !== "sentToQB" && t.status !== "qbVerified" && <span style={btnDone}>✓ APPROVED</span>}
                {/* Send to Accounting */}
                {t.status !== "sentToQB" && t.status !== "qbVerified" && (
                  <button type="button" style={canSendToQB ? { ...btnBase, background: C.blue, color: C.white, border: "none" } : btnDisabled}
                    disabled={!canSendToQB} onClick={() => { if (canSendToQB) setQbConfirmId(t.id); }}>SEND TO ACCOUNTING</button>
                )}
                {(t.status === "sentToQB" || t.status === "qbVerified") && <span style={{ ...btnDone, background: C.green, color: C.white }}>✓ SENT TO ACCOUNTING</span>}
                </>)}
                {/* Delete — only if not sent to QB */}
                {!isSent && (
                  <span
                    title="Delete ticket"
                    onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(t.id); }}
                    style={{ fontSize: 14, color: "#ccc", cursor: "pointer", padding: "2px 4px" }}
                    onMouseEnter={e => { e.currentTarget.style.color = C.red; }}
                    onMouseLeave={e => { e.currentTarget.style.color = "#ccc"; }}
                  >🗑</span>
                )}
              </div>
            </div>
          ) : (
            // Desktop: horizontal layout
            <div style={{
              padding: "10px 14px",
              display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8,
            }}>
            {/* Left: type badge (clickable = open ticket) + info */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <div
                onClick={() => openTicket(t, "edit")}
                style={{ cursor: "pointer" }}
                title="Open ticket"
              >
                <TicketTypeBadge type={t.type} />
              </div>
              <span style={{ fontSize: 11, color: C.muted, whiteSpace: "nowrap" }}>#{t.jobId}{t.ticketNumber ? `-${t.ticketNumber}` : ""} · {formatDate(t.date)}</span>
              <span style={{ fontSize: 11, color: C.muted }}>{t.lineItems.length} items</span>
              {hasPendingComment && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#fdecea", color: "#B01020", borderRadius: 4, padding: "2px 8px", fontSize: 10, fontWeight: 800, letterSpacing: "0.04em", border: "1px solid #B0102044" }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#B01020", display: "inline-block" }} />
                  COMMENT PENDING
                </span>
              )}
              {t.voidedAt && (
                <span style={{ background: "#fdecea", color: C.red, borderRadius: 4, padding: "2px 8px", fontSize: 10, fontWeight: 800, letterSpacing: "0.04em", border: "1px solid #B0102044" }}>VOIDED</span>
              )}
              {cycleEnded && !t.voidedAt && (
                <span style={{ background: "#fdf5d8", color: "#8a6500", borderRadius: 4, padding: "2px 8px", fontSize: 10, fontWeight: 800, letterSpacing: "0.04em", border: "1px solid #e6c20044" }}>CYCLE ENDED</span>
              )}
              <RentalCountdown ticket={t} />
              {t.hasJSA && <span style={{ background: "#e6f5ec", color: C.green, borderRadius: 4, padding: "2px 6px", fontSize: 9, fontWeight: 800, letterSpacing: "0.04em", border: `1px solid ${C.green}44` }}>✓ JSA</span>}
            </div>

            {/* Right: action buttons + total */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>

            {t.voidedAt ? (
              <span style={{ fontSize: 12, color: C.muted, fontStyle: "italic" }}>Voided</span>
            ) : (<>
              {/* Col 2: Signature */}
              {!isSigned && t.status !== "qbVerified" && t.status !== "sentToQB" && (
                <button type="button" style={btnAction} onClick={() => openTicket(t, "sign")}>SIGNATURE REQUEST</button>
              )}
              {t.status === "signed" && (
                <span style={btnDone}>✓ SIGNED</span>
              )}
              {t.status === "sigNotReq" && (
                <span style={{ ...btnDone, background: "#e8f0fb", color: C.blue, border: `1px solid ${C.blue}44` }}>SIG NOT REQ</span>
              )}
              {(t.status === "approved" || t.status === "sentToQB" || t.status === "qbVerified") && (
                <span style={btnDone}>✓ SIGNED</span>
              )}

              {/* Col 3: Email */}
              {!custEmail && (
                <span style={btnDisabled}>NO EMAIL ON FILE</span>
              )}
              {custEmail && t.status !== "sentToQB" && t.status !== "qbVerified" && (
                <button type="button"
                  style={isEmailed ? { ...btnDone, cursor: "pointer" } : btnBlue}
                  onClick={() => {
                    setEmailConfirm({ ticketId: t.id, email: t.emailTo || custEmail, emailedAt: t.emailedAt || null });
                    setEmailConfirmTo(t.emailTo || custEmail);
                    setEmailConfirmCc("");
                  }}>
                  {isEmailed ? "Emailed / Resend" : "EMAIL TICKET"}
                </button>
              )}
              {custEmail && (t.status === "sentToQB" || t.status === "qbVerified") && (
                <span style={isEmailed ? btnDone : btnDisabled}>{isEmailed ? "✓ CUSTOMER EMAILED" : "NO EMAIL ON FILE"}</span>
              )}

              {/* Col 4: Approval */}
              {!isSigned && !isApproved && (
                <span style={btnDisabled}>APPROVAL NEEDED</span>
              )}
              {isSigned && !isApproved && (
                <button type="button" style={btnAction} onClick={async () => {
                  await handleUpdate(t.id, { status: "approved", approvedBy: currentUser?.name, approvedAt: new Date().toISOString() });
                }}>APPROVAL NEEDED</button>
              )}
              {isApproved && t.status !== "sentToQB" && t.status !== "qbVerified" && (
                <span style={btnDone}>✓ APPROVED</span>
              )}
              {(t.status === "sentToQB" || t.status === "qbVerified") && (
                <span style={btnDone}>✓ APPROVED</span>
              )}

              {/* Col 5: Send to Accounting */}
              {t.status !== "sentToQB" && t.status !== "qbVerified" && (
                <button type="button" style={canSendToQB ? { ...btnBase, background: C.blue, color: C.white, border: "none" } : btnDisabled}
                  disabled={!canSendToQB}
                  onClick={() => { if (canSendToQB) setQbConfirmId(t.id); }}>SEND TO ACCOUNTING</button>
              )}
              {(t.status === "sentToQB" || t.status === "qbVerified") && (
                <span style={{ ...btnDone, background: C.green, color: C.white, border: "none" }}>✓ SENT TO ACCOUNTING</span>
              )}
            </>)}

              {/* Total */}
              <span style={{ fontSize: 13, fontWeight: 800, color: C.text, marginLeft: 6 }}>
                {'$'}{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              {/* Delete — only if not sent to QB */}
              {!isSent && (
                <span
                  title="Delete ticket"
                  onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(t.id); }}
                  style={{ fontSize: 14, color: "#ccc", cursor: "pointer", marginLeft: 4, padding: "2px 4px" }}
                  onMouseEnter={e => { e.currentTarget.style.color = C.red; }}
                  onMouseLeave={e => { e.currentTarget.style.color = "#ccc"; }}
                >🗑</span>
              )}
            </div>
          </div>
          )}
          </div>
        );
      })}

      {showAdd && <AddTicketModal jobId={jobId} job={jobs.find(j => j.id === jobId)} onSave={handleAdd} onClose={() => setShowAdd(false)} qbItems={qbItems} jobWells={(jobs.find(j => j.id === jobId)?.wells || []).map(w => w.well_name || w)} existingTickets={tickets} />}
      {viewTicket && (
        <TicketDetail
          ticket={viewTicket} jobs={jobs} qbItems={qbItems} currentUser={currentUser}
          openToSign={viewTicketMode === "sign"}
          onUpdate={(id, updates) => { handleUpdate(id, updates); setViewTicket(prev => prev ? { ...prev, ...updates } : null); }}
          onClose={() => setViewTicket(null)}
          onDelete={(id) => { handleDelete(id); }}
          onDuplicate={async (t, opts = {}) => {
            try {
              const targetJobId = opts.new_job_id || t.jobId;
              const r = await fetch(`${API_URL}/tickets/${t.id}/duplicate`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  new_date: opts.new_date || (t.date ? t.date.slice(0, 10) : today()),
                  new_job_id: opts.new_job_id || undefined,
                  new_type: opts.new_type || undefined,
                  assigned_wells: opts.assigned_wells ?? t.assignedWells,
                  include_notes: opts.include_notes ?? true,
                  include_line_items: opts.include_line_items ?? true,
                  include_pin: opts.include_pin ?? true,
                  created_by: currentUser?.id || null,
                }),
              });
              if (!r.ok) { const d = await r.json(); alert(d.error || "Duplicate failed"); return; }
              const saved = await r.json();
              // Reload tickets for the target job
              const tr = await fetch(`${API_URL}/tickets?job_id=${targetJobId}`);
              if (tr.ok) {
                const data = await tr.json();
                const mapped = data.map(mapTicketFromApi);
                setTickets(prev => {
                  // Remove old tickets for target job, add refreshed ones
                  const otherJobs = prev.filter(tk => tk.jobId !== targetJobId);
                  // If duplicating to a different job, also keep source job tickets
                  if (targetJobId !== t.jobId) {
                    const sourceJobTickets = prev.filter(tk => tk.jobId === t.jobId);
                    return [...otherJobs.filter(tk => tk.jobId !== t.jobId), ...sourceJobTickets, ...mapped];
                  }
                  return [...otherJobs, ...mapped];
                });
                // Open the new ticket
                const newTicket = mapped.find(tk => tk.id === saved.id);
                if (newTicket) {
                  setViewTicketMode("edit");
                  setViewTicket({ ...newTicket, _duplicateReminder: true });
                }
              }
            } catch (err) { alert("Duplicate failed: " + err.message); }
          }}
          onRevise={async (t) => {
            try {
              const r = await fetch(`${API_URL}/tickets/${t.id}/revise`, {
                method: "POST", headers: { "Content-Type": "application/json" },
              });
              if (!r.ok) { const d = await r.json(); alert(d.error || "Revise failed"); return; }
              const saved = await r.json();
              // Send void notification email for the old ticket
              try {
                await fetch(`${API_URL}/signature/void-notify/${t.id}`, {
                  method: "POST", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ new_ticket_number: saved.ticket_number, new_ticket_id: saved.id }),
                });
              } catch (e) { console.error("Void notify failed:", e); }
              // Reload all tickets for this job (includes voided + new)
              const tr = await fetch(`${API_URL}/tickets?job_id=${t.jobId}&include_voided=true`);
              if (tr.ok) {
                const data = await tr.json();
                const mapped = data.map(mapTicketFromApi);
                setTickets(prev => {
                  const otherJobs = prev.filter(tk => tk.jobId !== t.jobId);
                  return [...otherJobs, ...mapped];
                });
                // Open the new revision ticket
                const newTicket = mapped.find(tk => tk.id === saved.id);
                if (newTicket) {
                  setViewTicketMode("edit");
                  setViewTicket(newTicket);
                }
              }
            } catch (err) { alert("Revise failed: " + err.message); }
          }}
        />
      )}
      {/* Delete ticket confirmation */}
      {deleteConfirmId && (() => {
        const delTicket = jobTickets.find(t => t.id === deleteConfirmId);
        return (
          <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }} onClick={() => setDeleteConfirmId(null)}>
            <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderTop: `4px solid ${C.red}`, borderRadius: 8, padding: 28, width: 420, maxWidth: "90vw" }} onClick={e => e.stopPropagation()}>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 12 }}>Delete Ticket?</div>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>
                This will permanently delete ticket #{delTicket?.jobId}{delTicket?.ticketNumber ? `-${delTicket.ticketNumber}` : ""} ({delTicket?.type}). This cannot be undone.
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <Btn variant="red" onClick={async () => {
                  try {
                    const r = await fetch(`${API_URL}/tickets/${deleteConfirmId}`, { method: "DELETE" });
                    if (r.ok) {
                      setTickets(prev => prev.filter(tk => tk.id !== deleteConfirmId));
                      setDeleteConfirmId(null);
                    } else {
                      const d = await r.json();
                      alert(d.error || "Delete failed");
                    }
                  } catch (err) { alert("Delete failed: " + err.message); }
                }}>DELETE</Btn>
                <Btn variant="ghost" onClick={() => setDeleteConfirmId(null)}>CANCEL</Btn>
              </div>
            </div>
          </div>
        );
      })()}
      {qbConfirmId && (
        <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }} onClick={() => setQbConfirmId(null)}>
          <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderTop: `4px solid ${C.blue}`, borderRadius: 8, padding: 28, width: 420, maxWidth: "90vw" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 12 }}>Send to Accounting?</div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 24, lineHeight: 1.6 }}>
              Once submitted, this ticket will be permanently locked. No further edits, signatures, or deletions will be permitted.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn variant="blue" onClick={async () => {
                await handleUpdate(qbConfirmId, { status: "sentToQB", sentToQBAt: new Date().toISOString() });
                setQbConfirmId(null);
              }}>CONFIRM — SEND TO ACCOUNTING</Btn>
              <Btn variant="ghost" onClick={() => setQbConfirmId(null)}>CANCEL</Btn>
            </div>
          </div>
        </div>
      )}
      {emailConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }} onClick={() => setEmailConfirm(null)}>
          <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderTop: `4px solid ${C.blue}`, borderRadius: 8, padding: 28, width: 460, maxWidth: "90vw" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 8 }}>
              {emailConfirm.emailedAt ? "Resend Signature Request?" : "Send Signature Request"}
            </div>
            {emailConfirm.emailedAt && (
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 12, lineHeight: 1.6 }}>
                Last sent: <strong>{new Date(emailConfirm.emailedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}</strong>
              </div>
            )}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: "0.06em" }}>TO</label>
              <input
                style={{ width: "100%", padding: "10px 12px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 14, marginTop: 4, boxSizing: "border-box" }}
                value={emailConfirmTo} onChange={e => setEmailConfirmTo(e.target.value)}
                placeholder="recipient@company.com"
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: "0.06em" }}>CC (optional)</label>
              <input
                style={{ width: "100%", padding: "10px 12px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 14, marginTop: 4, boxSizing: "border-box" }}
                value={emailConfirmCc} onChange={e => setEmailConfirmCc(e.target.value)}
                placeholder="cc@company.com"
              />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn variant="blue" onClick={async () => {
                const email = emailConfirmTo.trim();
                if (!email) { alert("Enter a recipient email."); return; }
                try {
                  await handleUpdate(emailConfirm.ticketId, { emailTo: email });
                  const r = await fetch(`${API_URL}/signature/send/${emailConfirm.ticketId}`, {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ performed_by: currentUser?.name }),
                  });
                  if (!r.ok) { const d = await r.json(); alert(d.error || "Email failed"); return; }
                  setTickets(prev => prev.map(tk => tk.id === emailConfirm.ticketId ? { ...tk, status: "emailed", emailTo: email, emailedAt: new Date().toISOString() } : tk));
                  setEmailConfirm(null);
                } catch (err) { alert("Email send failed: " + err.message); }
              }}>SEND</Btn>
              <Btn variant="ghost" onClick={() => setEmailConfirm(null)}>CANCEL</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── INVENTORY PAGE ───────────────────────────────────────────────────────────
function InventoryPage({ inventory, setInventory, jobs }) {
  const [sizeFilter, setSizeFilter] = useState("All");
  const [catFilter, setCatFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [showCheckOut, setShowCheckOut] = useState(null);
  const [showCheckIn, setShowCheckIn] = useState(null);
  const [showEdit, setShowEdit] = useState(null);
  const [showAdd, setShowAdd] = useState(false);

  const sizes = ['All', '2"', '3"', '4"'];
  const categories = ["All", "Fitting", "Pup Joint", "Valve", "Cross Over"];

  const filtered = inventory.filter(item => {
    if (sizeFilter !== "All" && item.size !== sizeFilter) return false;
    if (catFilter !== "All" && item.category !== catFilter) return false;
    if (search && !item.item.toLowerCase().includes(search.toLowerCase()) && !item.itemNum.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const summaryBySize = useMemo(() => {
    const m = {};
    inventory.forEach(i => {
      if (!m[i.size]) m[i.size] = { owned: 0, inYard: 0, out: 0, items: 0 };
      m[i.size].owned += i.qtyOwned;
      m[i.size].inYard += i.inYard;
      m[i.size].out += (i.qtyOwned - i.inYard);
      m[i.size].items += 1;
    });
    return m;
  }, [inventory]);

  const totalOwned = inventory.reduce((s, i) => s + i.qtyOwned, 0);
  const totalInYard = inventory.reduce((s, i) => s + i.inYard, 0);
  const totalOut = totalOwned - totalInYard;

  const handleCheckOut = async (id, qty, customer, fieldTicket) => {
    const item = inventory.find(i => i.id === id);
    if (!item) return;
    const newInYard = Math.max(0, item.inYard - qty);
    try {
      await fetch(`${API_URL}/inventory/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ in_yard: newInYard, customer, field_ticket: fieldTicket }) });
    } catch (err) { console.error("Inventory checkout failed:", err); }
    setInventory(prev => prev.map(i => i.id !== id ? i : { ...i, inYard: newInYard, customer, fieldTicket }));
    setShowCheckOut(null);
  };

  const handleCheckIn = async (id, qty) => {
    const item = inventory.find(i => i.id === id);
    if (!item) return;
    const maxReturn = item.qtyOwned - item.inYard;
    const newInYard = item.inYard + Math.min(qty, maxReturn);
    const allBack = newInYard >= item.qtyOwned;
    try {
      await fetch(`${API_URL}/inventory/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ in_yard: newInYard, customer: allBack ? null : item.customer, field_ticket: allBack ? null : item.fieldTicket }) });
    } catch (err) { console.error("Inventory checkin failed:", err); }
    setInventory(prev => prev.map(i => {
      if (i.id !== id) return i;
      return { ...i, inYard: newInYard, customer: allBack ? null : i.customer, fieldTicket: allBack ? null : i.fieldTicket };
    }));
    setShowCheckIn(null);
  };

  const handleEdit = async (id, updates) => {
    try {
      await fetch(`${API_URL}/inventory/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ in_yard: updates.inYard, qty_owned: updates.qtyOwned, customer: updates.customer, field_ticket: updates.fieldTicket, notes: updates.notes }) });
    } catch (err) { console.error("Inventory edit failed:", err); }
    setInventory(prev => prev.map(item => item.id !== id ? item : { ...item, ...updates }));
    setShowEdit(null);
  };

  const handleAdd = (newItem) => {
    setInventory(prev => [...prev, { ...newItem, id: Math.max(...prev.map(i => i.id)) + 1 }]);
    setShowAdd(false);
  };

  const handleDelete = (id) => {
    setInventory(prev => prev.filter(i => i.id !== id));
    setShowEdit(null);
  };

  return (
    <div style={{ padding: "24px 28px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Iron Inventory</h1>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
            {inventory.length} items · {totalOwned.toLocaleString()} owned · {totalInYard.toLocaleString()} in yard · {totalOut.toLocaleString()} out
          </div>
        </div>
        <Btn onClick={() => setShowAdd(true)}>+ ADD ITEM</Btn>
      </div>

      {/* Summary Cards */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {['2"', '3"', '4"'].map(size => {
          const s = summaryBySize[size] || { owned: 0, inYard: 0, out: 0, items: 0 };
          const pctOut = s.owned > 0 ? ((s.out / s.owned) * 100).toFixed(0) : 0;
          return (
            <div key={size} onClick={() => setSizeFilter(sizeFilter === size ? "All" : size)} style={{
              flex: 1, background: C.cardBg, border: `1px solid ${sizeFilter === size ? C.blue : C.border}`,
              borderTop: `2px solid ${sizeFilter === size ? C.blue : C.red}`, borderRadius: 6, padding: "12px 14px",
              cursor: "pointer", transition: "border-color 0.15s",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: C.text }}>{size}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted }}>{s.items} items</div>
              </div>
              <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
                <div>
                  <div style={{ fontSize: 11, color: C.muted, fontWeight: 700 }}>OWNED</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>{s.owned.toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: C.muted, fontWeight: 700 }}>IN YARD</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: C.green }}>{s.inYard.toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: C.muted, fontWeight: 700 }}>OUT</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: s.out > 0 ? C.orange : C.muted }}>{s.out.toLocaleString()}</div>
                </div>
              </div>
              {s.out > 0 && (
                <div style={{ marginTop: 8, height: 4, background: C.lightSteel, borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${100 - pctOut}%`, background: C.green, borderRadius: 2 }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginRight: 4 }}>SIZE:</span>
        {sizes.map(s => (
          <FilterBtn key={s} active={sizeFilter === s} onClick={() => setSizeFilter(s)}>{s === "All" ? "ALL" : s}</FilterBtn>
        ))}
        <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginLeft: 12, marginRight: 4 }}>TYPE:</span>
        {categories.map(c => (
          <FilterBtn key={c} active={catFilter === c} onClick={() => setCatFilter(c)}>{c.toUpperCase()}</FilterBtn>
        ))}
        <div style={{ marginLeft: "auto" }}>
          <input
            style={{ ...inputStyle, width: 220, background: C.cardBg }}
            placeholder="Search item or item #..."
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 6, overflow: "auto", maxHeight: "calc(100vh - 340px)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "'Arial', sans-serif" }}>
          <thead>
            <tr style={{ background: C.darkBlue, position: "sticky", top: 0, zIndex: 2 }}>
              {["#", "SIZE", "CATEGORY", "ITEM", "ITEM #", "OWNED", "IN YARD", "OUT", "CUSTOMER / LOCATION", "FT #", "ACTIONS"].map(h => (
                <th key={h} style={{
                  padding: "10px 10px", textAlign: "left", fontSize: 10, fontWeight: 800,
                  color: C.white, letterSpacing: "0.1em", borderBottom: `2px solid ${C.red}`,
                  background: C.darkBlue,
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((item, idx) => {
              const out = item.qtyOwned - item.inYard;
              const isLow = item.qtyOwned > 0 && item.inYard > 0 && item.inYard < 4;
              const isEmpty = item.qtyOwned > 0 && item.inYard === 0;
              return (
                <tr key={item.id} style={{
                  background: isEmpty ? "#fdf0f0" : isLow ? "#fdf8e8" : idx % 2 === 0 ? C.cardBg : C.steel,
                  borderBottom: `1px solid ${C.border}`,
                }}>
                  <td style={{ padding: "8px 10px", color: C.muted, fontSize: 11, fontWeight: 600, textAlign: "center", minWidth: 32 }}>{idx + 1}</td>
                  <td style={{ padding: "8px 10px", fontWeight: 700 }}>{item.size}</td>
                  <td style={{ padding: "8px 10px", color: C.muted }}>{item.category}</td>
                  <td style={{ padding: "8px 10px", fontWeight: 700 }}>{item.item}</td>
                  <td style={{ padding: "8px 10px", color: C.blue, fontWeight: 600, fontSize: 11 }}>{item.itemNum}</td>
                  <td style={{ padding: "8px 10px", fontWeight: 700, textAlign: "center" }}>{item.qtyOwned}</td>
                  <td style={{ padding: "8px 10px", fontWeight: 800, textAlign: "center", color: isEmpty ? C.red : isLow ? C.orange : C.green }}>{item.inYard}</td>
                  <td style={{ padding: "8px 10px", fontWeight: 700, textAlign: "center", color: out > 0 ? C.orange : C.muted }}>{out}</td>
                  <td style={{ padding: "8px 10px", fontSize: 11, color: item.customer ? C.text : C.muted }}>{item.customer || "—"}</td>
                  <td style={{ padding: "8px 10px", fontSize: 11, color: item.fieldTicket ? C.blue : C.muted }}>{item.fieldTicket || "—"}</td>
                  <td style={{ padding: "6px 6px", whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", gap: 4 }}>
                      {item.inYard > 0 && (
                        <button onClick={() => setShowCheckOut(item)} title="Check Out" style={{
                          background: C.red, color: C.white, border: "none", borderRadius: 3,
                          padding: "4px 8px", fontSize: 10, fontWeight: 700, cursor: "pointer",
                        }}>OUT</button>
                      )}
                      {out > 0 && (
                        <button onClick={() => setShowCheckIn(item)} title="Check In" style={{
                          background: C.green, color: C.white, border: "none", borderRadius: 3,
                          padding: "4px 8px", fontSize: 10, fontWeight: 700, cursor: "pointer",
                        }}>IN</button>
                      )}
                      <button onClick={() => setShowEdit(item)} title="Edit" style={{
                        background: "transparent", color: C.muted, border: `1px solid ${C.border}`, borderRadius: 3,
                        padding: "4px 8px", fontSize: 10, fontWeight: 700, cursor: "pointer",
                      }}>EDIT</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 0", color: C.muted, fontSize: 14 }}>No items match filters.</div>
        )}
      </div>

      {/* CHECK OUT MODAL */}
      {showCheckOut && (
        <CheckOutModal item={showCheckOut} jobs={jobs} onCheckOut={handleCheckOut} onClose={() => setShowCheckOut(null)} />
      )}
      {/* CHECK IN MODAL */}
      {showCheckIn && (
        <CheckInModal item={showCheckIn} onCheckIn={handleCheckIn} onClose={() => setShowCheckIn(null)} />
      )}
      {/* EDIT MODAL */}
      {showEdit && (
        <EditItemModal item={showEdit} onSave={handleEdit} onDelete={handleDelete} onClose={() => setShowEdit(null)} />
      )}
      {/* ADD MODAL */}
      {showAdd && (
        <AddItemModal onSave={handleAdd} onClose={() => setShowAdd(false)} />
      )}
    </div>
  );
}

// ─── MODALS ───────────────────────────────────────────────────────────────────
function ModalWrap({ title, onClose, children, width = 440 }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "#00000088",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
    }} onClick={onClose}>
      <div style={{
        background: C.cardBg, border: `1px solid ${C.border}`,
        borderTop: `3px solid ${C.red}`, borderRadius: 8,
        padding: 24, width, maxWidth: "92vw", maxHeight: "85vh", overflowY: "auto",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 18 }}>{title}</div>
        {children}
      </div>
    </div>
  );
}

function CheckOutModal({ item, jobs, onCheckOut, onClose }) {
  const [qty, setQty] = useState(1);
  const [customer, setCustomer] = useState("");
  const [ft, setFt] = useState("");
  const [jobLink, setJobLink] = useState("");

  const activeJobs = jobs.filter(j => j.status !== "Invoiced");

  const handleJobSelect = (jobId) => {
    setJobLink(jobId);
    if (jobId) {
      const job = jobs.find(j => j.id === Number(jobId));
      if (job) setCustomer(`${job.customer} — ${job.location}`);
    }
  };

  return (
    <ModalWrap title={`Check Out — ${item.size} ${item.item}`} onClose={onClose}>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>
        Available: <strong style={{ color: C.green }}>{item.inYard}</strong> in yard
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>LINK TO JOB</label>
        <select style={inputStyle} value={jobLink} onChange={e => handleJobSelect(e.target.value)}>
          <option value="">— No Job / Manual Entry —</option>
          {activeJobs.map(j => <option key={j.id} value={j.id}>#{j.id} {j.customer}</option>)}
        </select>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: 10, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>QTY</label>
          <input type="number" min={1} max={item.inYard} style={inputStyle} value={qty} onChange={e => setQty(Math.min(Number(e.target.value), item.inYard))} />
        </div>
        <div>
          <label style={labelStyle}>CUSTOMER / LOCATION</label>
          <input style={inputStyle} value={customer} onChange={e => setCustomer(e.target.value)} placeholder="Customer or location..." />
        </div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>FIELD TICKET #</label>
        <input style={inputStyle} value={ft} onChange={e => setFt(e.target.value)} placeholder="Optional" />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Btn onClick={() => { if (qty > 0 && qty <= item.inYard) onCheckOut(item.id, qty, customer || null, ft || null); }}>CHECK OUT {qty}</Btn>
        <Btn onClick={onClose} variant="ghost">CANCEL</Btn>
      </div>
    </ModalWrap>
  );
}

function CheckInModal({ item, onCheckIn, onClose }) {
  const out = item.qtyOwned - item.inYard;
  const [qty, setQty] = useState(out);

  return (
    <ModalWrap title={`Check In — ${item.size} ${item.item}`} onClose={onClose} width={360}>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>
        Currently out: <strong style={{ color: C.orange }}>{out}</strong>
        {item.customer && <span> — {item.customer}</span>}
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>QTY RETURNING</label>
        <input type="number" min={1} max={out} style={inputStyle} value={qty} onChange={e => setQty(Math.min(Number(e.target.value), out))} />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Btn variant="blue" onClick={() => { if (qty > 0 && qty <= out) onCheckIn(item.id, qty); }}>CHECK IN {qty}</Btn>
        <Btn onClick={onClose} variant="ghost">CANCEL</Btn>
      </div>
    </ModalWrap>
  );
}

function EditItemModal({ item, onSave, onDelete, onClose }) {
  const [form, setForm] = useState({
    size: item.size, category: item.category, item: item.item,
    psi: item.psi || "", itemNum: item.itemNum, serial: item.serial || "",
    qtyOwned: item.qtyOwned, inYard: item.inYard, notes: item.notes || "",
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <ModalWrap title={`Edit — ${item.size} ${item.item}`} onClose={onClose} width={520}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>SIZE</label>
          <select style={inputStyle} value={form.size} onChange={e => set("size", e.target.value)}>
            {['2"', '3"', '4"'].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>CATEGORY</label>
          <select style={inputStyle} value={form.category} onChange={e => set("category", e.target.value)}>
            {["Fitting", "Pup Joint", "Valve", "Cross Over"].map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>PSI</label>
          <input style={inputStyle} value={form.psi} onChange={e => set("psi", e.target.value)} placeholder="Optional" />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>ITEM NAME</label>
          <input style={inputStyle} value={form.item} onChange={e => set("item", e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>ITEM #</label>
          <input style={inputStyle} value={form.itemNum} onChange={e => set("itemNum", e.target.value)} />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>SERIAL #</label>
          <input style={inputStyle} value={form.serial} onChange={e => set("serial", e.target.value)} placeholder="If any" />
        </div>
        <div>
          <label style={labelStyle}>QTY OWNED</label>
          <input type="number" min={0} style={inputStyle} value={form.qtyOwned} onChange={e => set("qtyOwned", Number(e.target.value))} />
        </div>
        <div>
          <label style={labelStyle}>IN YARD</label>
          <input type="number" min={0} max={form.qtyOwned} style={inputStyle} value={form.inYard} onChange={e => set("inYard", Math.min(Number(e.target.value), form.qtyOwned))} />
        </div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>NOTES</label>
        <input style={inputStyle} value={form.notes} onChange={e => set("notes", e.target.value)} />
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn onClick={() => onSave(item.id, { ...form, psi: form.psi || null, serial: form.serial || null, notes: form.notes || null })}>SAVE</Btn>
          <Btn onClick={onClose} variant="ghost">CANCEL</Btn>
        </div>
        <button onClick={() => onDelete(item.id)} style={{
          background: "transparent", color: C.red, border: `1px solid ${C.red}44`,
          borderRadius: 4, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer",
        }}>DELETE</button>
      </div>
    </ModalWrap>
  );
}

function AddItemModal({ onSave, onClose }) {
  const [form, setForm] = useState({
    size: '2"', category: "Fitting", item: "", psi: null,
    itemNum: "", serial: null, qtyOwned: 0, inYard: 0,
    customer: null, fieldTicket: null, notes: null,
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <ModalWrap title="Add New Inventory Item" onClose={onClose} width={520}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>SIZE *</label>
          <select style={inputStyle} value={form.size} onChange={e => set("size", e.target.value)}>
            {['2"', '3"', '4"'].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>CATEGORY *</label>
          <select style={inputStyle} value={form.category} onChange={e => set("category", e.target.value)}>
            {["Fitting", "Pup Joint", "Valve", "Cross Over"].map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>PSI</label>
          <input style={inputStyle} value={form.psi || ""} onChange={e => set("psi", e.target.value || null)} placeholder="Optional" />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>ITEM NAME *</label>
          <input style={inputStyle} value={form.item} onChange={e => set("item", e.target.value)} placeholder='e.g. Cushion 90' />
        </div>
        <div>
          <label style={labelStyle}>ITEM #</label>
          <input style={inputStyle} value={form.itemNum} onChange={e => set("itemNum", e.target.value)} placeholder='e.g. 2C90-###' />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>QTY OWNED</label>
          <input type="number" min={0} style={inputStyle} value={form.qtyOwned} onChange={e => { const v = Number(e.target.value); set("qtyOwned", v); set("inYard", v); }} />
        </div>
        <div>
          <label style={labelStyle}>IN YARD</label>
          <input type="number" min={0} max={form.qtyOwned} style={inputStyle} value={form.inYard} onChange={e => set("inYard", Math.min(Number(e.target.value), form.qtyOwned))} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Btn onClick={() => { if (form.item.trim()) onSave(form); }}>ADD ITEM</Btn>
        <Btn onClick={onClose} variant="ghost">CANCEL</Btn>
      </div>
    </ModalWrap>
  );
}
// ─── REPORTS PAGE ────────────────────────────────────────────────────────────
function ReportsPage({ jobs, tickets, inventory, currentUser, users }) {
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const [dateFrom, setDateFrom] = useState(monthStart);
  const [dateTo, setDateTo] = useState("");
  const [tab, setTab] = useState("revenue");
  const [winW, setWinW] = useState(window.innerWidth);
  useEffect(() => { const h = () => setWinW(window.innerWidth); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, []);
  const rptGrid = winW < 900 ? "1fr" : "1fr 1fr";

  const isSalesman = currentUser?.role === "salesman";

  // Filter jobs for salesman — only jobs where they are the salesman
  const visibleJobs = isSalesman
    ? jobs.filter(j => j.salesman === currentUser?.name && j.status !== "Deleted")
    : jobs.filter(j => j.status !== "Deleted");
  const visibleJobIds = new Set(visibleJobs.map(j => j.id));

  // Filter tickets by date range and visibility
  const filteredTickets = tickets.filter(t => {
    if (!visibleJobIds.has(t.jobId)) return false;
    if (dateFrom && t.date && t.date < dateFrom) return false;
    if (dateTo && t.date && t.date > dateTo) return false;
    return true;
  });

  // Helper: parse time string to minutes since midnight
  const parseTime = (s) => {
    if (!s) return null;
    const m = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!m) return null;
    let h = parseInt(m[1]), min = parseInt(m[2]);
    const p = m[3].toUpperCase();
    if (p === "PM" && h !== 12) h += 12;
    if (p === "AM" && h === 12) h = 0;
    return h * 60 + min;
  };
  const diffMinutes = (start, end) => {
    const s = parseTime(start), e = parseTime(end);
    if (s === null || e === null) return null;
    let d = e - s;
    if (d < 0) d += 1440; // overnight
    return d;
  };
  const fmtHrs = (mins) => {
    if (mins === null || mins === undefined) return "—";
    const h = Math.floor(mins / 60), m = mins % 60;
    return `${h}h ${m}m`;
  };
  const fmtMoney = (n) => "$" + (n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const calcLineTotal = (li) => (li.rate || 0) * (li.qty || 0) * (li.days || 1);
  const ticketTotal = (t) => (t.lineItems || []).reduce((s, li) => s + calcLineTotal(li), 0);
  const getField = (t, camel, snake) => t[camel] || t[snake] || "";

  // ─── Shared data ───
  const totalRevenue = filteredTickets.reduce((s, t) => s + ticketTotal(t), 0);

  const cardStyle = { background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 6, padding: "20px 24px", marginBottom: 16 };
  const headerStyle = { fontSize: 13, fontWeight: 800, color: C.text, letterSpacing: "0.06em", marginBottom: 12, borderBottom: `2px solid ${C.red}`, paddingBottom: 8 };
  const rowStyle = { display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.border}22`, fontSize: 13 };
  const tabs = [
    { key: "revenue", label: "Revenue" },
    { key: "operations", label: "Operations" },
    { key: "crew", label: "Crew & Hours" },
    { key: "efficiency", label: "Efficiency" },
    { key: "inventory", label: "Inventory" },
  ];

  // ─── REVENUE TAB ───
  const renderRevenue = () => {
    // By customer
    const revByCustomer = {};
    filteredTickets.forEach(t => {
      const job = visibleJobs.find(j => j.id === t.jobId);
      const cust = job?.customer || "Unknown";
      revByCustomer[cust] = (revByCustomer[cust] || 0) + ticketTotal(t);
    });
    const revCustSorted = Object.entries(revByCustomer).sort((a, b) => b[1] - a[1]);

    // By salesman
    const revBySalesman = {};
    filteredTickets.forEach(t => {
      const job = visibleJobs.find(j => j.id === t.jobId);
      const sm = job?.salesman || "Unassigned";
      revBySalesman[sm] = (revBySalesman[sm] || 0) + ticketTotal(t);
    });
    const revSmSorted = Object.entries(revBySalesman).sort((a, b) => b[1] - a[1]);

    // By state/county
    const revByRegion = {};
    filteredTickets.forEach(t => {
      const job = visibleJobs.find(j => j.id === t.jobId);
      const region = [job?.jobState || job?.job_state, job?.county].filter(Boolean).join(" — ") || "Unknown";
      revByRegion[region] = (revByRegion[region] || 0) + ticketTotal(t);
    });
    const revRegionSorted = Object.entries(revByRegion).sort((a, b) => b[1] - a[1]);

    // By ticket type
    const revByType = {};
    filteredTickets.forEach(t => {
      revByType[t.type] = (revByType[t.type] || 0) + ticketTotal(t);
    });
    const revTypeSorted = Object.entries(revByType).sort((a, b) => b[1] - a[1]);

    // By month
    const revByMonth = {};
    filteredTickets.forEach(t => {
      const mo = t.date ? t.date.slice(0, 7) : "Unknown";
      revByMonth[mo] = (revByMonth[mo] || 0) + ticketTotal(t);
    });
    const revMonthSorted = Object.entries(revByMonth).sort((a, b) => a[0].localeCompare(b[0]));

    // Customer concentration
    const topCustPct = revCustSorted.length > 0 && totalRevenue > 0
      ? ((revCustSorted[0][1] / totalRevenue) * 100).toFixed(1) : 0;

    // Average ticket value
    const avgTicket = filteredTickets.length > 0 ? totalRevenue / filteredTickets.length : 0;

    return (
      <div style={{ display: "grid", gridTemplateColumns: rptGrid, gap: 16 }}>
        {/* Summary Cards */}
        <div style={{ ...cardStyle, gridColumn: "1 / -1", display: "flex", gap: 32, flexWrap: "wrap" }}>
          <div><div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: "0.08em" }}>TOTAL REVENUE</div><div style={{ fontSize: 24, fontWeight: 800, color: C.green }}>{fmtMoney(totalRevenue)}</div></div>
          <div><div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: "0.08em" }}>TICKETS</div><div style={{ fontSize: 24, fontWeight: 800, color: C.text }}>{filteredTickets.length}</div></div>
          <div><div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: "0.08em" }}>AVG TICKET VALUE</div><div style={{ fontSize: 24, fontWeight: 800, color: C.blue }}>{fmtMoney(avgTicket)}</div></div>
          <div><div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: "0.08em" }}>TOP CUSTOMER %</div><div style={{ fontSize: 24, fontWeight: 800, color: parseFloat(topCustPct) > 50 ? C.red : C.text }}>{topCustPct}%</div></div>
        </div>

        {/* By Customer */}
        <div style={cardStyle}>
          <div style={headerStyle}>BY CUSTOMER</div>
          {revCustSorted.map(([c, r]) => (
            <div key={c} style={rowStyle}><span style={{ fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0, flex: 1, marginRight: 8 }}>{c}</span><span style={{ fontWeight: 800, color: C.green, whiteSpace: "nowrap" }}>{fmtMoney(r)}</span></div>
          ))}
          {revCustSorted.length === 0 && <div style={{ fontSize: 12, color: C.muted }}>No data</div>}
        </div>

        {/* By Salesman */}
        <div style={cardStyle}>
          <div style={headerStyle}>BY SALESMAN</div>
          {revSmSorted.map(([s, r]) => (
            <div key={s} style={rowStyle}><span style={{ fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0, flex: 1, marginRight: 8 }}>{s}</span><span style={{ fontWeight: 800, color: C.green, whiteSpace: "nowrap" }}>{fmtMoney(r)}</span></div>
          ))}
          {revSmSorted.length === 0 && <div style={{ fontSize: 12, color: C.muted }}>No data</div>}
        </div>

        {/* By Region */}
        <div style={cardStyle}>
          <div style={headerStyle}>BY STATE / COUNTY</div>
          {revRegionSorted.map(([r, v]) => (
            <div key={r} style={rowStyle}><span style={{ fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0, flex: 1, marginRight: 8 }}>{r}</span><span style={{ fontWeight: 800, color: C.green, whiteSpace: "nowrap" }}>{fmtMoney(v)}</span></div>
          ))}
          {revRegionSorted.length === 0 && <div style={{ fontSize: 12, color: C.muted }}>No data</div>}
        </div>

        {/* By Ticket Type */}
        <div style={cardStyle}>
          <div style={headerStyle}>BY TICKET TYPE</div>
          {revTypeSorted.map(([t, r]) => {
            const cfg = TICKET_TYPES[t] || { color: C.muted, label: t };
            return (
              <div key={t} style={rowStyle}><span style={{ fontWeight: 700, color: cfg.color }}>{cfg.label || t}</span><span style={{ fontWeight: 800, color: C.green }}>{fmtMoney(r)}</span></div>
            );
          })}
        </div>

        {/* Monthly Trend */}
        <div style={{ ...cardStyle, gridColumn: "1 / -1" }}>
          <div style={headerStyle}>MONTHLY TREND</div>
          <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 120 }}>
            {revMonthSorted.map(([mo, r]) => {
              const maxRev = Math.max(...revMonthSorted.map(([, v]) => v), 1);
              const pct = (r / maxRev) * 100;
              return (
                <div key={mo} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.green }}>{fmtMoney(r)}</div>
                  <div style={{ width: "100%", maxWidth: 60, background: C.blue, borderRadius: "3px 3px 0 0", height: `${Math.max(pct, 3)}%`, minHeight: 4 }} />
                  <div style={{ fontSize: 9, color: C.muted, fontWeight: 600 }}>{mo}</div>
                </div>
              );
            })}
          </div>
          {revMonthSorted.length === 0 && <div style={{ fontSize: 12, color: C.muted }}>No data</div>}
        </div>
      </div>
    );
  };

  // ─── OPERATIONS TAB ───
  const renderOperations = () => {
    // Jobs by status
    const jobsByStatus = {};
    STATUS_ORDER.forEach(s => { jobsByStatus[s] = visibleJobs.filter(j => j.status === s).length; });
    const flagged = visibleJobs.filter(j => j.status === "flaggedCancel").length;

    // Tickets by type & status
    const ticketsByType = {};
    filteredTickets.forEach(t => {
      if (!ticketsByType[t.type]) ticketsByType[t.type] = {};
      ticketsByType[t.type][t.status] = (ticketsByType[t.type][t.status] || 0) + 1;
    });

    // Aging: signed but not sent to QB
    const agingTickets = filteredTickets.filter(t => ["signed", "sigNotReq", "approved"].includes(t.status));
    const agingByAge = agingTickets.map(t => {
      const job = visibleJobs.find(j => j.id === t.jobId);
      const daysSigned = t.signedAt ? Math.floor((Date.now() - new Date(t.signedAt).getTime()) / 86400000) : null;
      const daysCreated = t.date ? Math.floor((Date.now() - new Date(t.date).getTime()) / 86400000) : null;
      return { ...t, customer: job?.customer || "Unknown", age: daysSigned ?? daysCreated ?? 0 };
    }).sort((a, b) => b.age - a.age);

    return (
      <div style={{ display: "grid", gridTemplateColumns: rptGrid, gap: 16 }}>
        {/* Jobs by Status */}
        <div style={cardStyle}>
          <div style={headerStyle}>JOBS BY STATUS</div>
          {STATUS_ORDER.map(s => {
            const cfg = STATUS_CONFIG[s];
            const count = jobsByStatus[s] || 0;
            if (count === 0) return null;
            return (
              <div key={s} style={rowStyle}>
                <span style={{ color: C.text }}>{cfg.label}</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: cfg.color }}>{count}</span>
              </div>
            );
          })}
          {flagged > 0 && (
            <div style={rowStyle}>
              <span style={{ color: "#b85c00" }}>FLAGGED FOR CANCEL</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: "#b85c00" }}>{flagged}</span>
            </div>
          )}
        </div>

        {/* Tickets by Type */}
        <div style={cardStyle}>
          <div style={headerStyle}>TICKETS BY TYPE &amp; STATUS</div>
          {Object.entries(ticketsByType).map(([type, statuses]) => {
            const cfg = TICKET_TYPES[type] || { color: C.muted, label: type };
            const total = Object.values(statuses).reduce((s, v) => s + v, 0);
            return (
              <div key={type} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: cfg.color }}>{cfg.label || type}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{total}</span>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {Object.entries(statuses).map(([status, count]) => {
                    const scfg = TICKET_STATUSES[status] || { color: C.muted, bg: C.steel, label: status };
                    return <span key={status} style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 3, background: scfg.bg, color: scfg.color }}>{scfg.label} ({count})</span>;
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Outstanding / Aging */}
        <div style={{ ...cardStyle, gridColumn: "1 / -1" }}>
          <div style={headerStyle}>OUTSTANDING — SIGNED BUT NOT SENT TO ACCOUNTING ({agingByAge.length})</div>
          {agingByAge.length === 0 && <div style={{ fontSize: 12, color: C.muted }}>All caught up</div>}
          {agingByAge.slice(0, 20).map(t => (
            <div key={t.id} style={{ ...rowStyle, alignItems: "center" }}>
              <span style={{ fontWeight: 600 }}>#{t.ticketNumber || t.id}</span>
              <span style={{ color: C.muted }}>{t.customer}</span>
              <span style={{ color: C.muted }}>{t.type}</span>
              <span style={{ fontWeight: 700, color: t.age > 14 ? C.red : t.age > 7 ? "#b85c00" : C.text }}>{t.age} days</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ─── CREW & HOURS TAB ───
  const renderCrew = () => {
    // Build crew hours from tickets
    const crewHours = {};
    const activeUsers = (users || []).filter(u => u.is_active !== false);

    filteredTickets.forEach(t => {
      const job = visibleJobs.find(j => j.id === t.jobId);
      if (!job?.crew) return;
      const lv = getField(t, "lvYard", "lv_yard");
      const ret = getField(t, "retYard", "ret_yard");
      const arr = getField(t, "arrivalTime", "arrival_time");
      const jEnd = getField(t, "jobEndTime", "job_end_time");
      const overall = diffMinutes(lv, ret);
      const onLoc = diffMinutes(arr, jEnd);
      const mBegin = parseFloat(t.mileageBegin ?? t.mileage_begin) || 0;
      const mEnd = parseFloat(t.mileageEnd ?? t.mileage_end) || 0;
      const miles = mEnd > mBegin ? mEnd - mBegin : 0;

      job.crew.forEach(c => {
        if (!crewHours[c.name]) crewHours[c.name] = { totalMins: 0, onLocMins: 0, miles: 0, tickets: 0, days: new Set() };
        if (overall !== null) crewHours[c.name].totalMins += overall;
        if (onLoc !== null) crewHours[c.name].onLocMins += onLoc;
        crewHours[c.name].miles += miles;
        crewHours[c.name].tickets += 1;
        if (t.date) crewHours[c.name].days.add(t.date);
      });
    });

    const crewSorted = Object.entries(crewHours).sort((a, b) => b[1].totalMins - a[1].totalMins);

    // Utilization: days worked / business days in range
    const startD = dateFrom ? new Date(dateFrom + "T00:00:00") : new Date(now.getFullYear(), now.getMonth(), 1);
    const endD = dateTo ? new Date(dateTo + "T00:00:00") : now;
    let bizDays = 0;
    for (let d = new Date(startD); d <= endD; d.setDate(d.getDate() + 1)) {
      const dow = d.getDay();
      if (dow !== 0 && dow !== 6) bizDays++;
    }
    if (bizDays === 0) bizDays = 1;

    return (
      <div>
        <div style={{ ...cardStyle, overflowX: "auto" }}>
          <div style={headerStyle}>CREW HOURS &amp; MILEAGE</div>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 12 }}>Based on ticket time fields (LV Yard → Ret Yard). Business days in range: {bizDays}</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: C.darkBlue }}>
                {["CREW MEMBER", "TICKETS", "TOTAL HOURS", "ON LOCATION", "DRIVE TIME", "MILES", "DAYS WORKED", "UTILIZATION"].map(h => (
                  <th key={h} style={{ padding: "8px 10px", fontSize: 10, fontWeight: 800, color: C.white, letterSpacing: "0.06em", textAlign: "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {crewSorted.map(([name, d]) => {
                const driveMins = d.totalMins - d.onLocMins;
                const daysWorked = d.days.size;
                const util = ((daysWorked / bizDays) * 100).toFixed(0);
                return (
                  <tr key={name} style={{ borderBottom: `1px solid ${C.border}22` }}>
                    <td style={{ padding: "8px 10px", fontWeight: 700, color: C.text }}>{name}</td>
                    <td style={{ padding: "8px 10px", color: C.muted }}>{d.tickets}</td>
                    <td style={{ padding: "8px 10px", fontWeight: 700, color: C.text }}>{fmtHrs(d.totalMins)}</td>
                    <td style={{ padding: "8px 10px", color: C.blue }}>{fmtHrs(d.onLocMins)}</td>
                    <td style={{ padding: "8px 10px", color: C.muted }}>{fmtHrs(driveMins > 0 ? driveMins : null)}</td>
                    <td style={{ padding: "8px 10px", color: C.text }}>{d.miles > 0 ? `${d.miles.toFixed(0)} mi` : "—"}</td>
                    <td style={{ padding: "8px 10px", color: C.text }}>{daysWorked}</td>
                    <td style={{ padding: "8px 10px", fontWeight: 700, color: parseInt(util) > 80 ? C.green : parseInt(util) < 40 ? C.red : C.text }}>{util}%</td>
                  </tr>
                );
              })}
              {crewSorted.length === 0 && (
                <tr><td colSpan={8} style={{ padding: 16, textAlign: "center", color: C.muted }}>No time data recorded for this period</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ─── EFFICIENCY TAB ───
  const renderEfficiency = () => {
    // On-time arrival: Arrival vs Due On Loc
    let onTimeCount = 0, lateCount = 0, earlyCount = 0, noDataCount = 0;
    const lateTix = [];
    filteredTickets.forEach(t => {
      const arr = parseTime(getField(t, "arrivalTime", "arrival_time"));
      const due = parseTime(getField(t, "dueOnLoc", "due_on_loc"));
      if (arr === null || due === null) { noDataCount++; return; }
      const diff = arr - due;
      if (diff <= 0) { earlyCount++; }
      else if (diff <= 15) { onTimeCount++; }
      else {
        lateCount++;
        const job = visibleJobs.find(j => j.id === t.jobId);
        lateTix.push({ ticket: t.ticketNumber || t.id, customer: job?.customer || "Unknown", late: diff, date: t.date });
      }
    });
    const totalWithData = onTimeCount + earlyCount + lateCount;
    const onTimePct = totalWithData > 0 ? (((onTimeCount + earlyCount) / totalWithData) * 100).toFixed(1) : "—";

    // Average times by ticket type
    const avgByType = {};
    filteredTickets.forEach(t => {
      const overall = diffMinutes(getField(t, "lvYard", "lv_yard"), getField(t, "retYard", "ret_yard"));
      const onLoc = diffMinutes(getField(t, "arrivalTime", "arrival_time"), getField(t, "jobEndTime", "job_end_time"));
      if (!avgByType[t.type]) avgByType[t.type] = { overallTotal: 0, onLocTotal: 0, count: 0 };
      if (overall !== null) { avgByType[t.type].overallTotal += overall; avgByType[t.type].count++; }
      if (onLoc !== null) { avgByType[t.type].onLocTotal += onLoc; }
    });

    return (
      <div style={{ display: "grid", gridTemplateColumns: rptGrid, gap: 16 }}>
        {/* On-Time Arrival */}
        <div style={cardStyle}>
          <div style={headerStyle}>ON-TIME ARRIVAL</div>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 12 }}>Arrival vs Due On Location. Within 15 min = on time.</div>
          <div style={{ display: "flex", gap: 24, marginBottom: 16, flexWrap: "wrap" }}>
            <div><div style={{ fontSize: 10, fontWeight: 700, color: C.muted }}>ON TIME</div><div style={{ fontSize: 28, fontWeight: 800, color: parseFloat(onTimePct) >= 90 ? C.green : parseFloat(onTimePct) >= 70 ? "#b85c00" : C.red }}>{onTimePct}%</div></div>
            <div><div style={{ fontSize: 10, fontWeight: 700, color: C.muted }}>EARLY/ON TIME</div><div style={{ fontSize: 20, fontWeight: 800, color: C.green }}>{earlyCount + onTimeCount}</div></div>
            <div><div style={{ fontSize: 10, fontWeight: 700, color: C.muted }}>LATE</div><div style={{ fontSize: 20, fontWeight: 800, color: C.red }}>{lateCount}</div></div>
            <div><div style={{ fontSize: 10, fontWeight: 700, color: C.muted }}>NO DATA</div><div style={{ fontSize: 20, fontWeight: 800, color: C.muted }}>{noDataCount}</div></div>
          </div>
          {lateTix.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, marginBottom: 6 }}>LATE ARRIVALS</div>
              {lateTix.slice(0, 10).map(l => (
                <div key={l.ticket} style={{ ...rowStyle, fontSize: 11 }}>
                  <span>#{l.ticket}</span><span style={{ color: C.muted }}>{l.customer}</span>
                  <span style={{ color: C.muted }}>{l.date}</span>
                  <span style={{ fontWeight: 700, color: C.red }}>+{l.late} min</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Average Times by Type */}
        <div style={cardStyle}>
          <div style={headerStyle}>AVERAGE TIMES BY TICKET TYPE</div>
          {Object.entries(avgByType).map(([type, d]) => {
            const cfg = TICKET_TYPES[type] || { color: C.muted, label: type };
            const avgOverall = d.count > 0 ? Math.round(d.overallTotal / d.count) : null;
            const avgOnLoc = d.count > 0 ? Math.round(d.onLocTotal / d.count) : null;
            return (
              <div key={type} style={{ marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${C.border}22` }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: cfg.color, marginBottom: 4 }}>{cfg.label || type} ({d.count} tickets)</div>
                <div style={{ display: "flex", gap: 20, fontSize: 11 }}>
                  <span><span style={{ color: C.muted }}>Avg Total: </span><strong>{fmtHrs(avgOverall)}</strong></span>
                  <span><span style={{ color: C.muted }}>Avg On Loc: </span><strong style={{ color: C.blue }}>{fmtHrs(avgOnLoc)}</strong></span>
                </div>
              </div>
            );
          })}
          {Object.keys(avgByType).length === 0 && <div style={{ fontSize: 12, color: C.muted }}>No time data</div>}
        </div>
      </div>
    );
  };

  // ─── INVENTORY TAB ───
  const renderInventory = () => {
    const invOut = inventory.filter(i => i.inYard < i.qtyOwned).sort((a, b) => (b.qtyOwned - b.inYard) - (a.qtyOwned - a.inYard));
    const totalOut = invOut.reduce((s, i) => s + (i.qtyOwned - i.inYard), 0);
    const lowStock = inventory.filter(i => i.inYard < 4 && i.inYard > 0);

    return (
      <div style={{ display: "grid", gridTemplateColumns: rptGrid, gap: 16 }}>
        <div style={cardStyle}>
          <div style={headerStyle}>IN FIELD ({totalOut} items out)</div>
          {invOut.length === 0 && <div style={{ fontSize: 12, color: C.muted }}>All inventory in yard</div>}
          {invOut.map(i => {
            const out = i.qtyOwned - i.inYard;
            return (
              <div key={i.id} style={rowStyle}>
                <span style={{ fontSize: 12, color: C.text }}>{i.size} {i.item}</span>
                <div style={{ display: "flex", gap: 12 }}>
                  <span style={{ fontSize: 11, color: C.muted }}>{i.customer || "—"}</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: C.red }}>{out} out</span>
                </div>
              </div>
            );
          })}
        </div>
        <div style={cardStyle}>
          <div style={headerStyle}>LOW STOCK WARNING ({lowStock.length})</div>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>Items with fewer than 4 in yard</div>
          {lowStock.length === 0 && <div style={{ fontSize: 12, color: C.muted }}>No low stock items</div>}
          {lowStock.map(i => (
            <div key={i.id} style={{ ...rowStyle, background: "#fdf5d8", borderRadius: 3, padding: "6px 8px", marginBottom: 2 }}>
              <span style={{ fontSize: 12, color: C.text }}>{i.size} {i.item}</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: "#8a6500" }}>{i.inYard} in yard</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: "16px 16px 24px", maxWidth: 1200 }}>
      {/* Header — stacks on mobile */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Reports</h1>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
            {visibleJobs.length} jobs · {filteredTickets.length} tickets · {fmtMoney(totalRevenue)} revenue
            {isSalesman && <span style={{ color: C.blue, fontWeight: 600, marginLeft: 8 }}>(Filtered to your jobs)</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div>
            <label style={labelStyle}>FROM</label>
            <input type="date" style={{ ...inputStyle, width: 140 }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>TO</label>
            <input type="date" style={{ ...inputStyle, width: 140 }} value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(""); setDateTo(""); }}
              style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.muted, padding: "8px 12px", borderRadius: 4, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>CLEAR</button>
          )}
        </div>
      </div>

      {/* Tabs — horizontally scrollable on mobile */}
      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", marginBottom: 20, borderBottom: `2px solid ${C.border}` }}>
        <div style={{ display: "flex", gap: 0, minWidth: "max-content" }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{
                background: "transparent", border: "none", borderBottom: tab === t.key ? `3px solid ${C.red}` : "3px solid transparent",
                padding: "10px 14px", fontSize: 11, fontWeight: 800, letterSpacing: "0.06em",
                color: tab === t.key ? C.text : C.muted, cursor: "pointer", whiteSpace: "nowrap",
              }}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {tab === "revenue" && renderRevenue()}
      {tab === "operations" && renderOperations()}
      {tab === "crew" && renderCrew()}
      {tab === "efficiency" && renderEfficiency()}
      {tab === "inventory" && renderInventory()}
    </div>
  );
}


// ─── ALL TICKETS PAGE ────────────────────────────────────────────────────────
function AllTicketsPage({ tickets, setTickets, jobs, qbItems, currentUser, customers }) {
  const [viewTicket, setViewTicket] = useState(null);
  const [filterType, setFilterType] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterCustomer, setFilterCustomer] = useState("All");
  const [dragOrder, setDragOrder] = useState(null); // null = default date order
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);

  // Exclude deleted/voided
  const activeTickets = tickets.filter(t => !t.voidedAt && t.status !== "voided");

  // Apply filters
  const filtered = activeTickets.filter(t => {
    if (filterType !== "All" && t.type !== filterType) return false;
    if (filterStatus !== "All") {
      const scfg = TICKET_STATUSES[t.status];
      if (scfg?.label !== filterStatus && t.status !== filterStatus) return false;
    }
    if (filterCustomer !== "All") {
      const job = jobs.find(j => j.id === t.jobId);
      if ((job?.customer || "Unknown") !== filterCustomer) return false;
    }
    return true;
  });

  // Sort: if drag reorder active, use that; otherwise by date desc
  const sorted = dragOrder
    ? dragOrder.filter(id => filtered.some(t => t.id === id)).map(id => filtered.find(t => t.id === id)).filter(Boolean)
    : [...filtered].sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  // If filters change and we have a drag order, we keep it but it only shows filtered items
  const resetOrder = () => setDragOrder(null);

  // Simple drag-to-reorder
  const handleDragStart = (idx) => {
    if (!dragOrder) setDragOrder(sorted.map(t => t.id));
    setDragIdx(idx);
  };
  const handleDragOver = (e, idx) => { e.preventDefault(); setDragOverIdx(idx); };
  const handleDragEnd = () => { setDragIdx(null); setDragOverIdx(null); };
  const handleDrop = (idx) => {
    if (dragIdx === null) return;
    const order = dragOrder || sorted.map(t => t.id);
    const newOrder = [...order];
    const [moved] = newOrder.splice(dragIdx, 1);
    newOrder.splice(idx, 0, moved);
    setDragOrder(newOrder);
    setDragIdx(null);
    setDragOverIdx(null);
  };

  // Unique customer list for filter
  const customerSet = new Set(activeTickets.map(t => {
    const job = jobs.find(j => j.id === t.jobId);
    return job?.customer || "Unknown";
  }));
  const customerList = ["All", ...Array.from(customerSet).sort()];

  // Status labels for filter
  const statusLabels = ["All", ...Object.values(TICKET_STATUSES).map(s => s.label).filter((v, i, a) => a.indexOf(v) === i)];

  const typeKeys = ["All", ...Object.keys(TICKET_TYPES)];

  const handleUpdate = async (id, updates) => {
    const payload = buildTicketPayload(updates);
    try {
      await fetch(`${API_URL}/tickets/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    } catch (err) { console.error("Ticket update failed:", err); }
    setTickets(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const selStyle = { border: `1px solid ${C.border}`, borderRadius: 4, padding: "5px 8px", fontSize: 11, color: C.text, background: C.cardBg };

  return (
    <div style={{ padding: "16px 16px 24px" }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>All Tickets</h1>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{sorted.length} ticket{sorted.length !== 1 ? "s" : ""}</div>
        </div>
        {dragOrder && (
          <button onClick={resetOrder} style={{ background: C.blue, color: C.white, border: "none", borderRadius: 4, padding: "7px 14px", fontSize: 11, fontWeight: 800, cursor: "pointer" }}>RESET TO DATE ORDER</button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} style={selStyle}>
          {typeKeys.map(k => <option key={k} value={k}>{k === "All" ? "All Types" : (TICKET_TYPES[k]?.label || k)}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selStyle}>
          {statusLabels.map(s => <option key={s} value={s}>{s === "All" ? "All Statuses" : s}</option>)}
        </select>
        <select value={filterCustomer} onChange={e => setFilterCustomer(e.target.value)} style={selStyle}>
          {customerList.map(c => <option key={c} value={c}>{c === "All" ? "All Customers" : c}</option>)}
        </select>
      </div>

      {/* Ticket rows */}
      {sorted.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 0", color: C.muted, fontSize: 14 }}>No tickets match your filters.</div>
      )}
      {sorted.map((t, idx) => {
        const job = jobs.find(j => j.id === t.jobId);
        const tcfg = TICKET_TYPES[t.type] || { color: C.muted, label: t.type };
        const scfg = TICKET_STATUSES[t.status] || { color: C.muted, bg: C.steel, label: t.status };
        const total = (t.lineItems || []).reduce((s, li) => s + ((li.rate || 0) * (li.qty || 0) * (li.days || 1)), 0);
        const isDragging = dragIdx === idx;
        const isDropTarget = dragOverIdx === idx && dragIdx !== null && dragIdx !== idx;
        return (
          <div key={t.id}>
            {isDropTarget && dragIdx > idx && (
              <div style={{ height: 3, background: C.blue, borderRadius: 2, margin: "2px 0" }} />
            )}
            <div
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
              onDrop={() => handleDrop(idx)}
              style={{
                background: isDragging ? "#e8f0fb" : C.cardBg,
                border: `1px solid ${isDragging ? C.blue : C.border}`,
                borderLeft: `3px solid ${tcfg.color}`, borderRadius: 5, marginBottom: 6,
                cursor: "grab", opacity: isDragging ? 0.5 : 1,
                transition: "transform 0.15s ease, opacity 0.15s ease",
                transform: isDropTarget ? "translateY(4px)" : "none",
              }}>
              <div onClick={() => setViewTicket(t)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", cursor: "pointer", flexWrap: "wrap" }}>
                <span style={{ fontSize: 15, color: "#bbb", cursor: "grab" }}>⠿</span>
                <TicketTypeBadge type={t.type} />
                <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>#{t.jobId}{t.ticketNumber ? `-${t.ticketNumber}` : ""}</span>
                <span style={{ fontSize: 12, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160 }}>{job?.customer || "Unknown"}</span>
                <span style={{ fontSize: 11, color: C.muted }}>{formatDate(t.date)}</span>
                <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 3, background: scfg.bg, color: scfg.color }}>{scfg.label}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: C.green, marginLeft: "auto" }}>{'$'}{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
            {isDropTarget && dragIdx < idx && (
              <div style={{ height: 3, background: C.blue, borderRadius: 2, margin: "2px 0" }} />
            )}
          </div>
        );
      })}

      {/* TicketDetail modal */}
      {viewTicket && (
        <TicketDetail
          ticket={viewTicket}
          onUpdate={(id, updates) => { handleUpdate(id, updates); setViewTicket(prev => prev ? { ...prev, ...updates } : null); }}
          onClose={() => setViewTicket(null)}
          onDelete={(id) => { setTickets(prev => prev.filter(t => t.id !== id)); setViewTicket(null); }}
          jobs={jobs} qbItems={qbItems} currentUser={currentUser}
        />
      )}
    </div>
  );
}


// ─── FINAL REVIEW PAGE ──────────────────────────────────────────────────────
function FinalReviewPage({ jobs, tickets, setTickets, currentUser, qbItems }) {
  const [expandedId, setExpandedId] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [showBatchConfirm, setShowBatchConfirm] = useState(false);
  const [accountingMenu, setAccountingMenu] = useState(null);

  const isSalesman = currentUser?.role === "salesman";

  // Tickets eligible for final review: signed, sigNotReq, approved
  const reviewStatuses = ["signed", "sigNotReq", "approved"];
  const allReviewable = tickets.filter(t => reviewStatuses.includes(t.status));
  const visibleTickets = isSalesman
    ? allReviewable.filter(t => {
        const job = jobs.find(j => j.id === t.jobId);
        return job?.salesman === currentUser?.name;
      })
    : allReviewable;

  const getJob = (t) => jobs.find(j => j.id === t.jobId);
  const ticketTotal = (t) => (t.lineItems || []).reduce((s, li) => s + ((li.rate || 0) * (li.qty || 0) * (li.days || 1)), 0);
  const formatDate = (d) => d ? new Date(d + "T00:00:00").toLocaleDateString("en-US") : "—";

  const handleApproveAndSend = async (ticketId) => {
    try {
      await fetch(`${API_URL}/tickets/${ticketId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "sentToQB", sentToQBAt: new Date().toISOString() }),
      });
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: "sentToQB", sentToQBAt: new Date().toISOString() } : t));
    } catch (err) { console.error("Approve & send failed:", err); }
    setAccountingMenu(null);
  };

  const handleMarkAsProcessed = async (ticketId) => {
    try {
      await fetch(`${API_URL}/tickets/${ticketId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "sentToQB", sentToQBAt: new Date().toISOString(), manuallyProcessed: true }),
      });
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: "sentToQB", sentToQBAt: new Date().toISOString() } : t));
    } catch (err) { console.error("Mark processed failed:", err); }
    setAccountingMenu(null);
  };

  const handleBatchApprove = async () => {
    const ids = [...selected];
    for (const id of ids) {
      await handleApproveAndSend(id);
    }
    setSelected(new Set());
    setShowBatchConfirm(false);
  };

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === visibleTickets.length) setSelected(new Set());
    else setSelected(new Set(visibleTickets.map(t => t.id)));
  };

  const cardStyle = { background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 6 };

  const [winW2, setWinW2] = useState(window.innerWidth);
  useEffect(() => { const h = () => setWinW2(window.innerWidth); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, []);
  const frMobile = winW2 < 900;

  return (
    <div style={{ padding: frMobile ? "16px 12px" : "24px 28px" }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Final Review</h1>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
            {visibleTickets.length} ticket{visibleTickets.length !== 1 ? "s" : ""} awaiting final review
            {isSalesman && <span style={{ color: C.blue, fontWeight: 600, marginLeft: 8 }}>(Your jobs only)</span>}
          </div>
        </div>
        {selected.size > 0 && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{selected.size} selected</span>
            <button onClick={() => {
              if (selected.size >= 3) setShowBatchConfirm(true);
              else handleBatchApprove();
            }} style={{
              background: C.red, color: C.white, border: "none", borderRadius: 4,
              padding: "8px 16px", fontSize: 12, fontWeight: 800, cursor: "pointer",
            }}>APPROVE & SEND ({selected.size})</button>
          </div>
        )}
      </div>

      {visibleTickets.length === 0 && (
        <div style={{ ...cardStyle, padding: 40, textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.muted }}>All caught up</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>No tickets awaiting review</div>
        </div>
      )}

      {/* ── DESKTOP: grid table ── */}
      {!frMobile && visibleTickets.length > 0 && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "36px 80px 1fr 120px 100px 100px 90px 120px", gap: 4, padding: "8px 12px", background: C.darkBlue, borderRadius: "6px 6px 0 0" }}>
            <div><input type="checkbox" checked={selected.size === visibleTickets.length && visibleTickets.length > 0} onChange={selectAll} style={{ width: 15, height: 15, accentColor: C.blue }} /></div>
            {["TICKET #", "CUSTOMER", "TYPE", "DATE", "TOTAL", "STATUS", "ACTION"].map(h => (
              <div key={h} style={{ fontSize: 9, fontWeight: 800, color: C.white, letterSpacing: "0.08em" }}>{h}</div>
            ))}
          </div>
          {visibleTickets.map(t => {
            const job = getJob(t);
            const total = ticketTotal(t);
            const tcfg = TICKET_TYPES[t.type] || { color: C.muted, label: t.type };
            const scfg = TICKET_STATUSES[t.status] || { color: C.muted, bg: C.steel, label: t.status };
            const isExpanded = expandedId === t.id;
            return (
              <div key={t.id} style={{ borderBottom: `1px solid ${C.border}`, background: C.cardBg }}>
                <div style={{ display: "grid", gridTemplateColumns: "36px 80px 1fr 120px 100px 100px 90px 120px", gap: 4, padding: "10px 12px", alignItems: "center", cursor: "pointer" }} onClick={() => setExpandedId(isExpanded ? null : t.id)}>
                  <div onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.has(t.id)} onChange={() => toggleSelect(t.id)} style={{ width: 15, height: 15, accentColor: C.blue }} />
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>#{t.jobId}{t.ticketNumber ? `-${t.ticketNumber}` : ""}</div>
                  <div style={{ fontSize: 12, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{job?.customer || "Unknown"}</div>
                  <div><span style={{ fontSize: 10, fontWeight: 700, color: tcfg.color }}>{tcfg.label || t.type}</span></div>
                  <div style={{ fontSize: 12, color: C.muted }}>{formatDate(t.date)}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: C.green }}>${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  <div><span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 3, background: scfg.bg, color: scfg.color }}>{scfg.label}</span></div>
                  <div onClick={e => e.stopPropagation()} style={{ position: "relative" }}>
                    <button onClick={() => setAccountingMenu(accountingMenu === t.id ? null : t.id)} style={{
                      background: C.darkBlue, color: C.white, border: "none", borderRadius: 4,
                      padding: "5px 10px", fontSize: 10, fontWeight: 800, cursor: "pointer", letterSpacing: "0.04em",
                    }}>ACCOUNTING ▾</button>
                    {accountingMenu === t.id && (
                      <div style={{ position: "absolute", top: 30, right: 0, zIndex: 50, background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 4, boxShadow: "0 4px 16px #00000022", minWidth: 220, overflow: "hidden" }}>
                        <div onClick={() => handleApproveAndSend(t.id)} style={{ padding: "10px 14px", cursor: "pointer", fontSize: 12, fontWeight: 700, color: C.text, borderBottom: `1px solid ${C.border}` }}
                          onMouseEnter={e => e.currentTarget.style.background = C.steel} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                          Send to Accounting
                        </div>
                        <div onClick={() => handleMarkAsProcessed(t.id)} style={{ padding: "10px 14px", cursor: "pointer", fontSize: 12, fontWeight: 700, color: C.muted }}
                          onMouseEnter={e => e.currentTarget.style.background = C.steel} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                          Mark as Already Processed
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {isExpanded && (
                  <div style={{ padding: "0 12px 14px 48px", borderTop: `1px solid ${C.border}22` }}>
                    <div style={{ display: "flex", gap: 20, flexWrap: "wrap", fontSize: 11, color: C.muted, marginBottom: 8, marginTop: 8 }}>
                      {job?.jobState && <span>State: <strong style={{ color: C.text }}>{job.jobState}</strong></span>}
                      {job?.county && <span>County: <strong style={{ color: C.text }}>{job.county}</strong></span>}
                      {job?.wells?.length > 0 && <span>Wells: <strong style={{ color: C.text }}>{job.wells.map(w => w.well_name || w).join(", ")}</strong></span>}
                      {t.assignedWells?.length > 0 && <span>Assigned: <strong style={{ color: C.text }}>{t.assignedWells.join(", ")}</strong></span>}
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, letterSpacing: "0.08em", marginBottom: 4 }}>LINE ITEMS</div>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, marginBottom: 8 }}>
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                          {["CODE", "DESCRIPTION", "RATE", "QTY", "U/M", "TOTAL"].map(h => (
                            <th key={h} style={{ padding: "4px 6px", fontSize: 9, fontWeight: 800, color: C.muted, textAlign: h === "TOTAL" || h === "RATE" || h === "QTY" ? "right" : "left" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(t.lineItems || []).map((li, idx) => (
                          <tr key={idx} style={{ borderBottom: `1px solid ${C.border}11` }}>
                            <td style={{ padding: "4px 6px", fontWeight: 700, color: C.blue }}>{li.qbCode || li.qb_code || "—"}</td>
                            <td style={{ padding: "4px 6px", color: C.text }}>{li.desc || li.description || "—"}</td>
                            <td style={{ padding: "4px 6px", textAlign: "right" }}>${li.rate}</td>
                            <td style={{ padding: "4px 6px", textAlign: "right" }}>{li.qty}</td>
                            <td style={{ padding: "4px 6px" }}>{li.um || li.unit_measure || "—"}</td>
                            <td style={{ padding: "4px 6px", textAlign: "right", fontWeight: 700 }}>${((li.rate || 0) * (li.qty || 0) * (li.days || 1)).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {t.notes && <div style={{ fontSize: 11, color: C.muted }}><span style={{ fontWeight: 700 }}>Notes: </span>{t.notes}</div>}
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}

      {/* ── MOBILE: card layout ── */}
      {frMobile && visibleTickets.length > 0 && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <input type="checkbox" checked={selected.size === visibleTickets.length && visibleTickets.length > 0} onChange={selectAll} style={{ width: 16, height: 16, accentColor: C.blue }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: C.muted }}>Select All</span>
          </div>
          {visibleTickets.map(t => {
            const job = getJob(t);
            const total = ticketTotal(t);
            const tcfg = TICKET_TYPES[t.type] || { color: C.muted, label: t.type };
            const scfg = TICKET_STATUSES[t.status] || { color: C.muted, bg: C.steel, label: t.status };
            const isExpanded = expandedId === t.id;
            return (
              <div key={t.id} style={{ ...cardStyle, marginBottom: 10, padding: 14 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <input type="checkbox" checked={selected.has(t.id)} onChange={() => toggleSelect(t.id)} style={{ width: 16, height: 16, accentColor: C.blue, marginTop: 2 }} />
                  <div style={{ flex: 1, minWidth: 0 }} onClick={() => setExpandedId(isExpanded ? null : t.id)}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: C.text }}>#{t.jobId}{t.ticketNumber ? `-${t.ticketNumber}` : ""}</span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: C.green }}>${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div style={{ fontSize: 12, color: C.text, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{job?.customer || "Unknown"}</div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: tcfg.color }}>{tcfg.label || t.type}</span>
                      <span style={{ fontSize: 11, color: C.muted }}>{formatDate(t.date)}</span>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 3, background: scfg.bg, color: scfg.color }}>{scfg.label}</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 8, position: "relative" }}>
                  <button onClick={() => setAccountingMenu(accountingMenu === t.id ? null : t.id)} style={{
                    background: C.darkBlue, color: C.white, border: "none", borderRadius: 4,
                    padding: "7px 14px", fontSize: 11, fontWeight: 800, cursor: "pointer", flex: 1,
                  }}>ACCOUNTING ▾</button>
                  {accountingMenu === t.id && (
                    <div style={{ position: "absolute", bottom: 36, left: 0, right: 0, zIndex: 50, background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 4, boxShadow: "0 4px 16px #00000022", overflow: "hidden" }}>
                      <div onClick={() => handleApproveAndSend(t.id)} style={{ padding: "12px 14px", cursor: "pointer", fontSize: 13, fontWeight: 700, color: C.text, borderBottom: `1px solid ${C.border}` }}>
                        Send to Accounting
                      </div>
                      <div onClick={() => handleMarkAsProcessed(t.id)} style={{ padding: "12px 14px", cursor: "pointer", fontSize: 13, fontWeight: 700, color: C.muted }}>
                        Mark as Already Processed
                      </div>
                    </div>
                  )}
                </div>
                {isExpanded && (
                  <div style={{ marginTop: 10, borderTop: `1px solid ${C.border}22`, paddingTop: 10 }}>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 11, color: C.muted, marginBottom: 8 }}>
                      {job?.jobState && <span>State: <strong style={{ color: C.text }}>{job.jobState}</strong></span>}
                      {job?.county && <span>County: <strong style={{ color: C.text }}>{job.county}</strong></span>}
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, letterSpacing: "0.08em", marginBottom: 4 }}>LINE ITEMS</div>
                    {(t.lineItems || []).map((li, idx) => (
                      <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: `1px solid ${C.border}11`, fontSize: 11 }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <span style={{ fontWeight: 700, color: C.blue }}>{li.qbCode || li.qb_code || "—"}</span>
                          <span style={{ color: C.muted, marginLeft: 6 }}>{li.desc || li.description || "—"}</span>
                        </div>
                        <span style={{ fontWeight: 700, whiteSpace: "nowrap", marginLeft: 8 }}>${((li.rate || 0) * (li.qty || 0) * (li.days || 1)).toFixed(2)}</span>
                      </div>
                    ))}
                    {t.notes && <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}><span style={{ fontWeight: 700 }}>Notes: </span>{t.notes}</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Batch confirm dialog */}
      {showBatchConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }} onClick={() => setShowBatchConfirm(false)}>
          <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderTop: `4px solid ${C.red}`, borderRadius: 8, padding: 28, width: 440, maxWidth: "90vw" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 10 }}>Confirm Batch Approval</div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 20, lineHeight: 1.6 }}>
              You are about to approve and send <strong>{selected.size} tickets</strong> to accounting. This cannot be undone. Each ticket will be locked from further editing.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn onClick={handleBatchApprove}>YES, APPROVE & SEND ALL ({selected.size})</Btn>
              <Btn variant="ghost" onClick={() => setShowBatchConfirm(false)}>CANCEL</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ─── CREW PAGE ───────────────────────────────────────────────────────────────
function CrewPage({ users, jobs }) {
  const [search, setSearch] = useState("");

  // Determine each user's current job assignment
  const crewData = users.filter(u => !["owner", "admin"].includes(u.role)).map(u => {
    const activeJobs = jobs.filter(j =>
      ["Scheduled", "Rigged Up", "Active"].includes(j.status) &&
      (j.crew || []).some(c => c.name === u.name)
    );
    const currentJob = activeJobs[0] || null;
    const status = currentJob ? "On Job" : "Available";
    const role = currentJob ? (currentJob.crew.find(c => c.name === u.name)?.role || u.role) : u.role;
    const daysOnJob = currentJob?.dateStarted
      ? Math.floor((Date.now() - new Date(currentJob.dateStarted).getTime()) / 86400000)
      : null;
    return { ...u, currentJob, status, displayRole: role, daysOnJob, activeJobs };
  });

  const filtered = search
    ? crewData.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || (c.email || "").toLowerCase().includes(search.toLowerCase()))
    : crewData;

  const statusColor = { "On Job": C.green, "Available": C.blue };
  const statusBg = { "On Job": "#e6f5ec", "Available": "#e8f0fb" };

  const roleLabel = (r) => {
    const map = { owner: "Owner", admin: "Admin", manager: "Manager", lead: "Lead", salesman: "Salesman", field: "Field" };
    return map[r] || r;
  };

  return (
    <div style={{ padding: "24px 28px" }}>
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Crew</h1>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 20 }}>
        {users.length} crew members · {crewData.filter(c => c.status === "On Job").length} on jobs · {crewData.filter(c => c.status === "Available").length} available
      </div>

      <div style={{ marginBottom: 16, maxWidth: 360 }}>
        <input style={inputStyle} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..." />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
        {filtered.map(c => (
          <div key={c.id} style={{
            background: C.cardBg, border: `1px solid ${C.border}`, borderLeft: `3px solid ${statusColor[c.status]}`,
            borderRadius: 6, padding: "16px 20px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{c.name}</div>
                <div style={{ fontSize: 12, color: C.muted }}>{roleLabel(c.role)}</div>
              </div>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 3,
                background: statusBg[c.status], color: statusColor[c.status],
                border: `1px solid ${statusColor[c.status]}33`, letterSpacing: "0.06em",
              }}>{c.status.toUpperCase()}</span>
            </div>

            {/* Contact */}
            <div style={{ marginBottom: 10 }}>
              {c.email && <div style={{ fontSize: 12, color: C.muted, marginBottom: 2 }}>{c.email}</div>}
              {c.phone && <div style={{ fontSize: 12, color: C.muted }}>{c.phone}</div>}
              {!c.email && !c.phone && <div style={{ fontSize: 11, color: C.muted, fontStyle: "italic" }}>No contact info</div>}
            </div>

            {/* Current assignment */}
            {c.currentJob ? (
              <div style={{ background: C.steel, borderRadius: 4, padding: "8px 12px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.08em", marginBottom: 4 }}>CURRENT ASSIGNMENT</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Job #{c.currentJob.id} — {c.currentJob.customer}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{c.currentJob.location}</div>
                {c.daysOnJob !== null && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Day {c.daysOnJob + 1} on job</div>}
                {c.activeJobs.length > 1 && <div style={{ fontSize: 10, color: C.orange, marginTop: 4, fontWeight: 700 }}>+ {c.activeJobs.length - 1} more job{c.activeJobs.length - 1 > 1 ? "s" : ""}</div>}
              </div>
            ) : (
              <div style={{ background: C.steel, borderRadius: 4, padding: "8px 12px" }}>
                <div style={{ fontSize: 12, color: C.muted, fontStyle: "italic" }}>No active assignment</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── JOB HISTORY PAGE ────────────────────────────────────────────────────────
function JobHistoryPage({ jobs, onNavigateJob }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const allJobs = jobs.filter(j => j.status !== "Deleted");

  const filtered = allJobs.filter(j => {
    if (statusFilter !== "All" && j.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      const match = String(j.id).includes(s) ||
        (j.customer || "").toLowerCase().includes(s) ||
        (j.location || "").toLowerCase().includes(s) ||
        (j.wells || []).some(w => w.toLowerCase().includes(s));
      if (!match) return false;
    }
    if (dateFrom && j.dateStarted && j.dateStarted < dateFrom) return false;
    if (dateTo && j.dateStarted && j.dateStarted > dateTo) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => (b.dateStarted || "").localeCompare(a.dateStarted || ""));

  return (
    <div style={{ padding: "24px 28px" }}>
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Job History</h1>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 20 }}>{allJobs.length} total jobs · {filtered.length} shown</div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <label style={labelStyle}>SEARCH</label>
          <input style={inputStyle} value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Job #, customer, well, location..." />
        </div>
        <div>
          <label style={labelStyle}>STATUS</label>
          <select style={{ ...inputStyle, width: 160 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="All">All Statuses</option>
            {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
            <option value="flaggedCancel">FLAGGED</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>FROM</label>
          <input type="date" style={{ ...inputStyle, width: 150 }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>TO</label>
          <input type="date" style={{ ...inputStyle, width: 150 }} value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
        {(search || statusFilter !== "All" || dateFrom || dateTo) && (
          <button onClick={() => { setSearch(""); setStatusFilter("All"); setDateFrom(""); setDateTo(""); }}
            style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.muted, padding: "8px 14px", borderRadius: 4, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>CLEAR</button>
        )}
      </div>

      {/* Results table */}
      <div style={{ border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr 120px 100px 90px", background: C.darkBlue, padding: "10px 16px" }}>
          {["JOB #", "CUSTOMER", "LOCATION", "DATE", "WELLS", "STATUS"].map(h => (
            <div key={h} style={{ fontSize: 10, fontWeight: 800, color: C.white, letterSpacing: "0.1em" }}>{h}</div>
          ))}
        </div>
        {sorted.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 0", color: C.muted, fontSize: 13 }}>No jobs match your search.</div>
        )}
        {sorted.map((j, i) => {
          const cfg = STATUS_CONFIG[j.status] || { color: C.muted, bg: C.steel, label: j.status?.toUpperCase() || "—" };
          return (
            <div key={j.id} onClick={() => onNavigateJob(j.id)}
              style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr 120px 100px 90px", padding: "10px 16px",
                borderBottom: `1px solid ${C.border}22`, background: i % 2 === 0 ? C.cardBg : C.steel,
                cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.background = "#e8f0fb"}
              onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? C.cardBg : C.steel}>
              <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{j.id}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{j.customer}</div>
              <div style={{ fontSize: 12, color: C.muted }}>{j.location}</div>
              <div style={{ fontSize: 12, color: C.muted }}>{formatDate(j.dateStarted) || "—"}</div>
              <div style={{ fontSize: 12, color: C.muted }}>{j.wells?.length || 0} well{(j.wells?.length || 0) !== 1 ? "s" : ""}</div>
              <div><span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 3, background: cfg.bg, color: cfg.color, letterSpacing: "0.06em" }}>{cfg.label}</span></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── USERS MANAGEMENT PAGE ───────────────────────────────────────────────────
const ROLE_OPTIONS = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "lead", label: "Lead" },
  { value: "salesman", label: "Salesman" },
  { value: "field", label: "Field" },
];

// Role hierarchy: owner > admin > manager > lead/salesman/field
// Owner modifies everyone. Admin modifies manager and below. Manager modifies lead/salesman/field.
// No one modifies their own role/permissions. Everyone can self-edit name/email/password.
const ROLE_RANK = { owner: 4, admin: 3, manager: 2, lead: 1, salesman: 1, field: 0 };
const canModifyUser = (currentUserRole, targetUserRole) => {
  if (!currentUserRole || !targetUserRole) return false;
  const myRank = ROLE_RANK[currentUserRole] ?? 0;
  const theirRank = ROLE_RANK[targetUserRole] ?? 0;
  return myRank > theirRank;
};

function DeletedJobsPage({ deletedJobs, deletedTickets = [], jobs, currentUser, handleRestoreJob, handlePermanentDelete, handleRestoreTicket, handlePermanentDeleteTicket }) {
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const canPermDelete = ["owner", "admin"].includes(currentUser.role);
  const totalDeleted = deletedJobs.length + deletedTickets.length;
  return (
    <div style={{ padding: "24px 28px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Deleted Items</h1>
      </div>
      {totalDeleted === 0 && (
        <div style={{ textAlign: "center", padding: "60px 0", color: C.muted, fontSize: 14 }}>Nothing in the trash.</div>
      )}

      {/* ── DELETED JOBS ── */}
      {deletedJobs.length > 0 && (
        <>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.text, marginBottom: 8, marginTop: 16 }}>DELETED JOBS ({deletedJobs.length})</div>
          {deletedJobs.map(job => (
            <div key={job.id} style={{
              background: "#fdf0f0", border: `1px solid ${C.red}33`, borderLeft: `3px solid ${C.red}`,
              borderRadius: 6, padding: "16px 20px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10,
            }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>Job #{job.id}</div>
                <div style={{ fontSize: 13, color: C.muted }}>{job.customer} — {job.location}</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{job.wells?.map(w => w.well_name || w).join(", ")}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn small onClick={() => handleRestoreJob(job.id)} variant="blue">RESTORE</Btn>
                {canPermDelete && (
                  <Btn small onClick={() => handlePermanentDelete(job.id)}>PERMANENTLY DELETE</Btn>
                )}
              </div>
            </div>
          ))}
        </>
      )}

      {/* ── DELETED TICKETS ── */}
      {deletedTickets.length > 0 && (
        <>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.text, marginBottom: 8, marginTop: 24 }}>DELETED TICKETS ({deletedTickets.length})</div>
          {deletedTickets.map(t => {
            const job = jobs.find(j => j.id === t.jobId);
            const tcfg = TICKET_TYPES[t.type] || { color: C.muted, label: t.type };
            return (
              <div key={t.id} style={{
                background: "#fdf0f0", border: `1px solid ${C.red}33`, borderLeft: `3px solid ${tcfg.color}`,
                borderRadius: 6, padding: "16px 20px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10,
              }}>
                <div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: C.text }}>Ticket #{t.jobId}{t.ticketNumber ? `-${t.ticketNumber}` : ""}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: tcfg.color }}>{tcfg.label || t.type}</span>
                  </div>
                  <div style={{ fontSize: 13, color: C.muted }}>{job?.customer || "Unknown"} — {formatDate(t.date)}</div>
                  {t.lineItems?.length > 0 && (
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{t.lineItems.length} line item{t.lineItems.length !== 1 ? "s" : ""} — ${t.lineItems.reduce((s, li) => s + ((li.rate || 0) * (li.qty || 0) * (li.days || 1)), 0).toFixed(2)}</div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn small onClick={() => handleRestoreTicket(t.id)} variant="blue">RESTORE</Btn>
                  {canPermDelete && (
                    <Btn small onClick={() => handlePermanentDeleteTicket(t.id)}>PERMANENTLY DELETE</Btn>
                  )}
                </div>
              </div>
            );
          })}
        </>
      )}

      {showDeleteAllConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }} onClick={() => setShowDeleteAllConfirm(false)}>
          <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderTop: `4px solid ${C.red}`, borderRadius: 8, padding: 28, width: 420, maxWidth: "90vw" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 12 }}>Delete All Deleted Jobs?</div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 24, lineHeight: 1.6 }}>
              This will permanently delete all {deletedJobs.length} job{deletedJobs.length !== 1 ? "s" : ""} and their associated tickets, data, and records. This cannot be undone.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn onClick={async () => { for (const job of deletedJobs) { await handlePermanentDelete(job.id); } setShowDeleteAllConfirm(false); }}>CONFIRM — DELETE ALL</Btn>
              <Btn variant="ghost" onClick={() => setShowDeleteAllConfirm(false)}>CANCEL</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SETTINGS MODAL ───────────────────────────────────────────────────────────
function SettingsModal({ onClose, currentUser }) {
  const [yardAddress, setYardAddress] = useState("");
  const [yardLat, setYardLat] = useState("");
  const [yardLng, setYardLng] = useState("");
  const [geocoding, setGeocoding] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const isOwner = currentUser?.role === "owner";

  useEffect(() => {
    fetch(`${API_URL}/settings`)
      .then(r => r.ok ? r.json() : {})
      .then(data => {
        setYardAddress(data.yard_address || "");
        setYardLat(data.yard_lat || "");
        setYardLng(data.yard_lng || "");
      })
      .catch(() => {});
  }, []);

  const handleGeocode = async () => {
    if (!yardAddress.trim()) return;
    setGeocoding(true); setError("");
    try {
      const isUrl = yardAddress.trim().startsWith('http');
      if (isUrl) {
        // It's a Google Maps link — resolve via pin resolver
        const r = await fetch(`${API_URL}/jobs/resolve-map-pin`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: yardAddress.trim() }),
        });
        if (!r.ok) { setError("Could not resolve Google Maps link."); setGeocoding(false); return; }
        const { lat, lng } = await r.json();
        setYardLat(lat); setYardLng(lng);
      } else {
        // It's a street address — geocode it
        const r = await fetch(`${API_URL}/jobs/geocode-address`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: yardAddress.trim() }),
        });
        if (!r.ok) { setError("Could not geocode address."); setGeocoding(false); return; }
        const { lat, lng } = await r.json();
        setYardLat(lat); setYardLng(lng);
      }
    } catch { setError("Network error. Try again."); }
    setGeocoding(false);
  };

  const handleSave = async () => {
    try {
      await fetch(`${API_URL}/settings`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ yard_address: yardAddress, yard_lat: yardLat, yard_lng: yardLng }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { setError("Failed to save settings."); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}
      onClick={onClose}>
      <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderTop: `4px solid ${C.red}`, borderRadius: 8, padding: 28, width: 520, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>SETTINGS</div>

        {/* Yard Location */}
        <div style={{ background: C.steel, border: `1px solid ${C.border}`, borderRadius: 6, padding: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: C.muted, letterSpacing: "0.08em", marginBottom: 4 }}>YARD LOCATION</div>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 10 }}>
            Used to calculate drive distance and time to job locations. Owner-only.
          </div>
          <label style={labelStyle}>ADDRESS OR GOOGLE MAPS LINK</label>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <input style={{ ...inputStyle, flex: 1 }} value={yardAddress}
              onChange={e => { setYardAddress(e.target.value); setYardLat(""); setYardLng(""); }}
              placeholder="123 Main St, Odessa, TX  or  https://maps.app.goo.gl/..."
              readOnly={!isOwner} />
            {isOwner && (
              <button type="button" onClick={handleGeocode} disabled={!yardAddress.trim() || geocoding}
                style={{ background: C.blue, color: C.white, border: "none", borderRadius: 4, padding: "8px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                {geocoding ? "..." : "GEOCODE"}
              </button>
            )}
          </div>
          {yardLat && yardLng && (
            <div style={{ fontSize: 11, color: C.green, fontFamily: "monospace" }}>
              ✓ {parseFloat(yardLat).toFixed(6)}, {parseFloat(yardLng).toFixed(6)}
            </div>
          )}
          {error && <div style={{ fontSize: 11, color: C.red, marginTop: 4 }}>⚠ {error}</div>}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          {isOwner && <Btn onClick={handleSave}>{saved ? "SAVED ✓" : "SAVE SETTINGS"}</Btn>}
          <Btn onClick={onClose} variant="ghost">CLOSE</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── PERMISSIONS MODAL ────────────────────────────────────────────────────────
const PERMISSION_CATEGORIES = [
  { key: "view_jobs", label: "View Jobs", group: "Jobs & Tickets" },
  { key: "edit_jobs", label: "Create/Edit Jobs", group: "Jobs & Tickets" },
  { key: "delete_jobs", label: "Delete Jobs", group: "Jobs & Tickets" },
  { key: "edit_tickets", label: "Create/Edit Tickets", group: "Jobs & Tickets" },
  { key: "sign_tickets", label: "Sign Tickets", group: "Ticket Workflow" },
  { key: "approve_tickets", label: "Approve Tickets", group: "Ticket Workflow" },
  { key: "send_to_qb", label: "Send to Accounting", group: "Ticket Workflow" },
  { key: "void_tickets", label: "Void Tickets", group: "Ticket Workflow" },
  { key: "manage_users", label: "Manage Users", group: "Admin & Inventory" },
  { key: "view_inventory", label: "View Inventory", group: "Admin & Inventory" },
  { key: "edit_inventory", label: "Edit Inventory", group: "Admin & Inventory" },
];

const DEFAULT_PERMS = {
  owner: Object.fromEntries(PERMISSION_CATEGORIES.map(p => [p.key, true])),
  admin: Object.fromEntries(PERMISSION_CATEGORIES.map(p => [p.key, true])),
  manager: Object.fromEntries(PERMISSION_CATEGORIES.map(p => [p.key, p.key !== "manage_users"])),
  lead: { view_jobs: true, edit_jobs: true, edit_tickets: true, sign_tickets: true, view_inventory: true, delete_jobs: false, approve_tickets: false, send_to_qb: false, void_tickets: false, manage_users: false, edit_inventory: false },
  salesman: { view_jobs: true, edit_jobs: false, edit_tickets: false, sign_tickets: false, view_inventory: false, delete_jobs: false, approve_tickets: false, send_to_qb: false, void_tickets: false, manage_users: false, edit_inventory: false },
  field: { view_jobs: true, edit_tickets: true, sign_tickets: true, view_inventory: true, edit_jobs: false, delete_jobs: false, approve_tickets: false, send_to_qb: false, void_tickets: false, manage_users: false, edit_inventory: false },
};

function PermissionsModal({ onClose, currentUser }) {
  const [permUsers, setPermUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});

  useEffect(() => {
    fetch(`${API_URL}/permissions`).then(r => r.json()).then(data => {
      setPermUsers(data.map(u => ({
        ...u,
        permissions: Object.keys(u.permissions || {}).length > 0
          ? u.permissions
          : DEFAULT_PERMS[u.role] || DEFAULT_PERMS.field,
      })));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const togglePerm = async (userId, permKey) => {
    const user = permUsers.find(u => u.id === userId);
    if (!user) return;
    // Role hierarchy: can only modify users below your rank
    if (!canModifyUser(currentUser?.role, user.role)) return;

    const updated = { ...user.permissions, [permKey]: !user.permissions[permKey] };
    setPermUsers(prev => prev.map(u => u.id === userId ? { ...u, permissions: updated } : u));

    setSaving(prev => ({ ...prev, [userId]: true }));
    try {
      await fetch(`${API_URL}/permissions/${userId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: updated }),
      });
    } catch (err) { console.error("Save permissions failed:", err); }
    setSaving(prev => ({ ...prev, [userId]: false }));
  };

  const groups = [...new Set(PERMISSION_CATEGORIES.map(p => p.group))];

  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }} onClick={onClose}>
      <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderTop: `4px solid ${C.blue}`, borderRadius: 8, padding: 0, width: 900, maxWidth: "95vw", maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "20px 24px 12px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>User Permissions</div>
            <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, color: C.muted, cursor: "pointer" }}>✕</button>
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Owner permissions cannot be modified. Changes save automatically.</div>
        </div>
        <div style={{ overflowX: "auto", overflowY: "auto", flex: 1, padding: "0 0 16px" }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: C.muted }}>Loading...</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ position: "sticky", top: 0, background: C.cardBg, padding: "10px 12px", textAlign: "left", borderBottom: `2px solid ${C.border}`, fontWeight: 800, color: C.text, minWidth: 140, zIndex: 2 }}>User</th>
                  <th style={{ position: "sticky", top: 0, background: C.cardBg, padding: "10px 6px", borderBottom: `2px solid ${C.border}`, fontWeight: 700, color: C.muted, minWidth: 60, zIndex: 2 }}>Role</th>
                  {PERMISSION_CATEGORIES.map(p => (
                    <th key={p.key} style={{ position: "sticky", top: 0, background: C.cardBg, padding: "10px 4px", textAlign: "center", borderBottom: `2px solid ${C.border}`, fontWeight: 600, color: C.muted, minWidth: 55, fontSize: 10, lineHeight: 1.3, zIndex: 2 }}>
                      {p.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {permUsers.filter(u => u.is_active).map(u => {
                  const isOwner = u.role === "owner";
                  const canModify = canModifyUser(currentUser?.role, u.role);
                  return (
                    <tr key={u.id} style={{ borderBottom: `1px solid ${C.border}`, background: isOwner ? "#f0f3f8" : "transparent" }}>
                      <td style={{ padding: "8px 12px", fontWeight: 700, color: C.text }}>{u.name}</td>
                      <td style={{ padding: "8px 6px", color: C.muted, fontSize: 10, textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.06em" }}>{u.role}</td>
                      {PERMISSION_CATEGORIES.map(p => {
                        const checked = u.permissions?.[p.key] ?? false;
                        const disabled = !canModify;
                        return (
                          <td key={p.key} style={{ padding: "8px 4px", textAlign: "center" }}>
                            <input type="checkbox" checked={checked} disabled={disabled}
                              onChange={() => togglePerm(u.id, p.key)}
                              style={{ width: 16, height: 16, cursor: disabled ? "not-allowed" : "pointer", accentColor: C.blue }} />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function UsersPage({ users, setUsers, currentUser, isAdmin }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("field");
  const [newPassword, setNewPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState("");
  const [usrW, setUsrW] = useState(window.innerWidth);
  useEffect(() => { const h = () => setUsrW(window.innerWidth); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, []);
  const usrMob = usrW < 900;

  const roleBg = r => r === "owner" ? "#fdecea" : r === "admin" ? "#e8f0fb" : r === "manager" ? "#e6f5ec" : r === "lead" ? "#fdf5d8" : r === "salesman" ? "#f3eafa" : "#f0f3f8";
  const roleColor = r => r === "owner" ? C.red : r === "admin" ? C.blue : r === "manager" ? C.green : r === "lead" ? "#8a6500" : r === "salesman" ? "#7a3ca0" : C.muted;

  const handleAddUser = async () => {
    if (!newName.trim() || !newEmail.trim() || !newPassword) { setMsg("All fields required"); return; }
    if (newPassword.length < 6) { setMsg("Password must be at least 6 characters"); return; }
    try {
      const r = await fetch(`${API_URL}/users`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), email: newEmail.trim().toLowerCase(), role: newRole }),
      });
      if (!r.ok) {
        const errData = await r.json().catch(() => null);
        const errMsg = errData?.error || "Failed to create user";
        if (errMsg.toLowerCase().includes("email") || errMsg.toLowerCase().includes("duplicate") || errMsg.toLowerCase().includes("unique")) {
          setMsg("A user with this email address already exists.");
        } else {
          setMsg(errMsg);
        }
        return;
      }
      const created = await r.json();
      await fetch(`${API_URL}/auth/set-password`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: created.id, password: newPassword }),
      });
      setUsers(prev => [...prev, { ...created, is_active: true }]);
      setNewName(""); setNewEmail(""); setNewRole("field"); setNewPassword(""); setShowAdd(false); setMsg("");
    } catch { setMsg("Error creating user"); }
  };

  const startEdit = (u) => {
    setEditId(u.id); setEditName(u.name); setEditEmail(u.email); setEditRole(u.role);
    setShowAdd(false);
  };

  const handleSaveEdit = async () => {
    if (!editName.trim() || !editEmail.trim()) { setMsg("Name and email required"); return; }
    try {
      const r = await fetch(`${API_URL}/users/${editId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), email: editEmail.trim().toLowerCase(), role: editRole }),
      });
      if (!r.ok) { setMsg("Failed to save"); return; }
      setUsers(prev => prev.map(u => u.id === editId ? { ...u, name: editName.trim(), email: editEmail.trim().toLowerCase(), role: editRole } : u));
      setEditId(null); setMsg("Saved.");
      setTimeout(() => setMsg(""), 3000);
    } catch { setMsg("Error saving user"); }
  };

  const handleDeactivate = async (userId) => {
    const user = users.find(u => u.id === userId);
    if (!canModifyUser(currentUser?.role, user?.role)) return;
    try {
      await fetch(`${API_URL}/users/${userId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: false }),
      });
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch { console.error("Deactivate failed"); }
  };

  const handleResetPassword = async (userId) => {
    try {
      await fetch(`${API_URL}/auth/set-password`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, password: "fti2026" }),
      });
      setMsg("Password reset to default.");
      setTimeout(() => setMsg(""), 3000);
    } catch { setMsg("Reset failed"); }
  };

  return (
    <div style={{ padding: usrMob ? "16px 12px" : "24px 28px" }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>User Management</h1>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{users.length} active user{users.length !== 1 ? "s" : ""}</div>
        </div>
        <Btn onClick={() => { setShowAdd(s => !s); setEditId(null); }}>{showAdd ? "CANCEL" : "+ ADD USER"}</Btn>
      </div>

      {msg && <div style={{ padding: "8px 14px", background: msg.includes("fail") || msg.includes("Error") || msg.includes("required") ? "#fdecea" : "#e6f5ec", borderRadius: 4, fontSize: 12, fontWeight: 700, color: msg.includes("fail") || msg.includes("Error") || msg.includes("required") ? C.red : C.green, marginBottom: 16 }}>{msg}</div>}

      {showAdd && (
        <div style={{ background: C.steel, border: `1px solid ${C.border}`, borderRadius: 6, padding: 16, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: usrMob ? "1fr" : "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
            <div><label style={labelStyle}>NAME *</label><input style={inputStyle} value={newName} onChange={e => setNewName(e.target.value)} placeholder="Full name" /></div>
            <div><label style={labelStyle}>EMAIL *</label><input style={inputStyle} value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="email@flotest.com" /></div>
            <div><label style={labelStyle}>ROLE</label>
              <select style={inputStyle} value={newRole} onChange={e => setNewRole(e.target.value)}>
                {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div><label style={labelStyle}>PASSWORD *</label><input style={inputStyle} type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min 6 chars" /></div>
          </div>
          <Btn onClick={handleAddUser}>CREATE USER</Btn>
        </div>
      )}

      {/* ── DESKTOP: grid table ── */}
      {!usrMob && (
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 120px 160px", background: C.darkBlue, padding: "10px 16px" }}>
            {["NAME", "EMAIL", "ROLE", "ACTIONS"].map(h => (
              <div key={h} style={{ fontSize: 10, fontWeight: 800, color: C.white, letterSpacing: "0.1em" }}>{h}</div>
            ))}
          </div>
          {users.map((u, i) => {
            const canModify = canModifyUser(currentUser?.role, u.role);
            const isSelf = currentUser?.id === u.id;
            const isEditing = editId === u.id;
            return (
              <div key={u.id} style={{ borderBottom: `1px solid ${C.border}22`, background: i % 2 === 0 ? C.cardBg : C.steel }}>
                {isEditing ? (
                  <div style={{ padding: "12px 16px", display: "grid", gridTemplateColumns: "1fr 1fr 120px 160px", gap: 8, alignItems: "center" }}>
                    <input style={{ ...inputStyle, fontSize: 12, padding: "4px 8px" }} value={editName} onChange={e => setEditName(e.target.value)} />
                    <input style={{ ...inputStyle, fontSize: 12, padding: "4px 8px" }} value={editEmail} onChange={e => setEditEmail(e.target.value)} />
                    <select style={{ ...inputStyle, fontSize: 12, padding: "4px 8px" }} value={editRole} onChange={e => setEditRole(e.target.value)} disabled={!canModify}>
                      {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={handleSaveEdit} style={{ background: C.green, border: "none", color: C.white, fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 3, cursor: "pointer" }}>SAVE</button>
                      <button onClick={() => setEditId(null)} style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.muted, fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 3, cursor: "pointer" }}>CANCEL</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 120px 160px", padding: "10px 16px", alignItems: "center" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{u.name}</div>
                    <div style={{ fontSize: 12, color: C.muted }}>{u.email}</div>
                    <div><span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 3, background: roleBg(u.role), color: roleColor(u.role), letterSpacing: "0.06em" }}>{ROLE_OPTIONS.find(r => r.value === u.role)?.label || u.role}</span></div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {(canModify || isSelf) && <button onClick={() => startEdit(u)} style={{ background: "transparent", border: `1px solid ${C.blue}44`, color: C.blue, fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 3, cursor: "pointer" }}>EDIT</button>}
                      {canModify && <button onClick={() => handleDeactivate(u.id)} style={{ background: "transparent", border: `1px solid ${C.red}33`, color: C.red, fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 3, cursor: "pointer" }}>REMOVE</button>}
                      {canModify && <button onClick={() => handleResetPassword(u.id)} style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.muted, fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 3, cursor: "pointer" }}>RESET PW</button>}
                      {!canModify && !isSelf && <span style={{ fontSize: 10, color: C.muted, fontStyle: "italic" }}>Protected</span>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── MOBILE: card layout ── */}
      {usrMob && users.map((u, i) => {
        const canModify = canModifyUser(currentUser?.role, u.role);
        const isSelf = currentUser?.id === u.id;
        const isEditing = editId === u.id;
        return (
          <div key={u.id} style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 6, padding: 14, marginBottom: 10 }}>
            {isEditing ? (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8, marginBottom: 10 }}>
                  <div><label style={labelStyle}>NAME</label><input style={{ ...inputStyle, fontSize: 12, padding: "6px 8px" }} value={editName} onChange={e => setEditName(e.target.value)} /></div>
                  <div><label style={labelStyle}>EMAIL</label><input style={{ ...inputStyle, fontSize: 12, padding: "6px 8px" }} value={editEmail} onChange={e => setEditEmail(e.target.value)} /></div>
                  <div><label style={labelStyle}>ROLE</label>
                    <select style={{ ...inputStyle, fontSize: 12, padding: "6px 8px" }} value={editRole} onChange={e => setEditRole(e.target.value)} disabled={!canModify}>
                      {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={handleSaveEdit} style={{ background: C.green, border: "none", color: C.white, fontSize: 11, fontWeight: 700, padding: "7px 14px", borderRadius: 4, cursor: "pointer", flex: 1 }}>SAVE</button>
                  <button onClick={() => setEditId(null)} style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.muted, fontSize: 11, fontWeight: 700, padding: "7px 14px", borderRadius: 4, cursor: "pointer", flex: 1 }}>CANCEL</button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{u.name}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 3, background: roleBg(u.role), color: roleColor(u.role), letterSpacing: "0.06em" }}>{ROLE_OPTIONS.find(r => r.value === u.role)?.label || u.role}</span>
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>{u.email}</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {(canModify || isSelf) && <button onClick={() => startEdit(u)} style={{ background: "transparent", border: `1px solid ${C.blue}44`, color: C.blue, fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 4, cursor: "pointer" }}>EDIT</button>}
                  {canModify && <button onClick={() => handleDeactivate(u.id)} style={{ background: "transparent", border: `1px solid ${C.red}33`, color: C.red, fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 4, cursor: "pointer" }}>REMOVE</button>}
                  {canModify && <button onClick={() => handleResetPassword(u.id)} style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.muted, fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 4, cursor: "pointer" }}>RESET PW</button>}
                  {!canModify && !isSelf && <span style={{ fontSize: 11, color: C.muted, fontStyle: "italic" }}>Protected</span>}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
function FTIDashboard({ currentUser, onLogout }) {
  CURRENT_USER = currentUser.name;
  const userRole = currentUser.role; // owner | admin | manager | lead | salesman | field
  const isAdmin = ["owner", "admin"].includes(userRole);
  const isManager = ["owner", "admin", "manager", "lead"].includes(userRole);
  const isField = userRole === "field";

  useEffect(() => {
    const id = "fti-mobile-css";
    if (document.getElementById(id)) return;
    const s = document.createElement("style");
    s.id = id;
    s.textContent = `
      @media (max-width: 900px) {
        .fti-desktop-nav { display: none !important; }
        .fti-hamburger { display: flex !important; }
        .fti-dashboard-pad { padding: 16px 12px !important; }
        .fti-dashboard-header { flex-direction: column !important; align-items: flex-start !important; gap: 10px !important; }
        .fti-filter-row { overflow-x: auto !important; flex-wrap: nowrap !important; padding-bottom: 4px !important; -webkit-overflow-scrolling: touch; }
        .fti-job-card-header { grid-template-columns: 80px 1fr auto !important; padding: 10px 12px !important; gap: 8px !important; }
        .fti-job-card-header > div:nth-child(3),
        .fti-job-card-header > div:nth-child(4),
        .fti-job-card-header > div:nth-child(5),
        .fti-job-card-header > div:nth-child(6) { display: none !important; }
      }
      @media (min-width: 901px) {
        .fti-hamburger { display: none !important; }
      }
      .fti-nav-bar {
        padding-top: max(8px, env(safe-area-inset-top));
      }
    `;
    document.head.appendChild(s);
  }, []);
  
  const [page, setPage] = useState("dashboard");
  const [showPermissions, setShowPermissions] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [filterStatus, setFilterStatus] = useState("All");
  const [showNewJob, setShowNewJob] = useState(false);
  const [loading, setLoading] = useState(true);

  // All state — starts empty, loads from API
  const [todos, setTodos] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [deletedTickets, setDeletedTickets] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [jsas, setJsas] = useState([]);
  const [users, setUsers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [qbItems, setQbItems] = useState([]);

  // Load all data from API on mount
  useEffect(() => {
    const load = async () => {
      try {
        const [jobsR, ticketsR, todosR, invR, usersR, custR, qbR, delTicketsR] = await Promise.all([
          fetch(`${API_URL}/jobs`).then(r => r.json()),
          fetch(`${API_URL}/tickets`).then(r => r.json()),
          fetch(`${API_URL}/todos`).then(r => r.json()),
          fetch(`${API_URL}/inventory`).then(r => r.json()),
          fetch(`${API_URL}/users`).then(r => r.json()),
          fetch(`${API_URL}/customers`).then(r => r.json()),
          fetch(`${API_URL}/qb-items`).then(r => r.json()),
          fetch(`${API_URL}/tickets?include_deleted=true`).then(r => r.json()),
        ]);
        // Transform jobs from API format to app format
        const jobsMapped = (jobsR || []).map(j => ({
          id: j.id,
          customer: j.customer_name,
          customerId: j.customer_id,
          location: j.location || "",
          wells: (j.wells || []).map(w => ({ well_name: w.well_name || w })),
          afe: j.afe || null,
          jobState: j.job_state || "",
          county: j.county || "",
          dateStarted: j.date_started,
          status: j.status,
          crew: (j.crew || []).map(c => ({ name: c.name, role: c.role })),
          equipment: (j.equipment || []).map(e => e.description),
          hoursLogged: Number(j.hours_logged) || 0,
          estimatedCost: Number(j.estimated_cost) || 0,
          jsaComplete: j.jsa_complete,
          notes: j.notes,
          contactFirst: j.contact_first || "",
          contactLast: j.contact_last || "",
          pocPhone: j.poc_phone || "",
          pocEmail: j.poc_email || "",
          approver: j.approver_first || "",
          approverLast: j.approver_last || "",
          approverPhone: j.approver_phone || "",
          approverEmail: j.approver_email || "",
          companyCode: j.company_code || "",
          costCenter: j.cost_center || "",
          po: j.po_number || "",
          salesman: j.salesman || "",
          googlePin: j.google_pin || "",
          pinLat: j.pin_lat || null,
          pinLng: j.pin_lng || null,
          createdBy: j.created_by_name || null,
          createdAt: j.created_at || null,
        }));
        // Transform tickets
        const ticketsMapped = (ticketsR || []).map(mapTicketFromApi);
        // Transform todos
        const todosMapped = (todosR || []).map(t => ({
          id: t.id,
          title: t.title,
          description: t.description,
          jobId: t.job_id,
          priority: t.priority,
          dueDate: t.due_date,
          createdBy: t.created_by_name || t.created_by,
          assignedTo: t.assigned_to_name || t.assigned_to,
          createdById: t.created_by,
          assignedToId: t.assigned_to,
          completed: t.completed,
          completedBy: t.completed_by_name || t.completed_by,
          completedAt: t.completed_at,
        }));
        // Transform inventory
        const invMapped = (invR || []).map(i => ({
          id: i.id,
          size: i.size,
          category: i.category,
          item: i.item,
          psi: i.psi,
          itemNum: i.item_number,
          serial: i.serial_number,
          qtyOwned: i.qty_owned,
          inYard: i.in_yard,
          customer: i.customer,
          fieldTicket: i.field_ticket,
          notes: i.notes,
        }));
        // Transform QB items
        const qbMapped = (qbR || []).map(q => ({
          code: q.code,
          desc: q.description,
          um: q.unit_measure,
          price: Number(q.price),
        }));

        setJobs(jobsMapped);
        setTickets(ticketsMapped);
        setDeletedTickets((delTicketsR || []).map(mapTicketFromApi));
        setTodos(todosMapped);
        setInventory(invMapped);
        setUsers(usersR || []);
        setCustomers(custR || []);
        setQbItems(qbMapped);

        // Trigger rental cycle check on load
        fetch(`${API_URL}/tickets/check-cycles`, { method: "POST" }).catch(() => {});
      } catch (err) {
        console.error("Failed to load data:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Derived user names for dropdowns
  const userNames = users.map(u => u.name);
  const userIdByName = {};
  users.forEach(u => { userIdByName[u.name] = u.id; });

  const myActiveTodos = todos.filter(t => todoVisible(t) && !t.completed);

  const pendingByJob = useMemo(() => {
    const map = {};
    todos.filter(t => t.jobId && !t.completed && todoVisible(t)).forEach(t => {
      map[t.jobId] = (map[t.jobId] || 0) + 1;
    });
    return map;
  }, [todos]);

  const navigateToJob = (jobId) => {
    setPage("dashboard");
    setExpandedId(jobId);
  };

  const handleCreateJob = async (newJob) => {
    const cust = customers.find(c => c.name === newJob.customer);
    const payload = {
      customer_id: cust?.id || null,
      location: newJob.location,
      job_state: newJob.jobState || null,
      county: newJob.county || null,
      date_started: newJob.dateStarted,
      status: newJob.status,
      afe: newJob.afe || null,
      contact_first: newJob.contactFirst || null,
      contact_last: newJob.contactLast || null,
      poc_phone: newJob.phone || null,
      poc_email: newJob.email || null,
      approver: newJob.approver || null,
      approver_last: newJob.approverLast || null,
      approver_phone: newJob.approverPhone || null,
      approver_email: newJob.approverEmail || null,
      company_code: newJob.companyCode || null,
      cost_center: newJob.costCenter || null,
      po_number: newJob.po || null,
      salesman: newJob.salesman || null,
      google_pin: newJob.googlePin || null,
      pin_lat: newJob.pinLat || null,
      pin_lng: newJob.pinLng || null,
      created_by: currentUser?.id || null,
      notes: newJob.notes || null,
      wells: newJob.wells.map(w => ({ well_name: w, afe_number: null })),
      crew: [],
      equipment: newJob.equipment || [],
    };
    try {
      const r = await fetch(`${API_URL}/jobs`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (r.ok) {
        const saved = await r.json();
        const mappedJob = {
          ...newJob,
          id: saved.id,
          pocEmail: newJob.email || "",
          poc_email: newJob.email || "",
          pocPhone: newJob.phone || "",
          approverEmail: newJob.approverEmail || "",
          approverPhone: newJob.approverPhone || "",
          customer_name: cust?.name || newJob.customer,
          wells: (newJob.wells || []).map((w, i) => ({ well_name: w, sort_order: i })),
          createdBy: currentUser?.name || null,
          createdAt: new Date().toISOString(),
        };
        setJobs(prev => [mappedJob, ...prev]);
        setShowNewJob(false);
        setExpandedId(saved.id);
      }
    } catch (err) { console.error("Create job failed:", err); }
  };

  // Helper to log audit events
  const logAudit = async (action, entityType, entityId, oldValue, newValue, notes) => {
    try {
      await fetch(`${API_URL}/audit`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: currentUser.id, user_name: currentUser.name, action, entity_type: entityType, entity_id: String(entityId), old_value: oldValue, new_value: newValue, notes }),
      });
    } catch (err) { console.error("Audit log failed:", err); }
  };

  const handleDeleteJob = async (jobId) => {
    if (!["owner", "admin", "manager"].includes(currentUser.role)) return;
    const job = jobs.find(j => j.id === jobId);
    try {
      await fetch(`${API_URL}/jobs/${jobId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Deleted" }),
      });
      await logAudit("job_delete", "job", jobId, { status: job?.status, customer: job?.customer }, { status: "Deleted" }, `Job #${jobId} deleted by ${currentUser.name}`);
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: "Deleted" } : j));
      setExpandedId(null);
    } catch (err) { console.error("Delete job failed:", err); }
  };

  const handleRestoreJob = async (jobId) => {
    try {
      await fetch(`${API_URL}/jobs/${jobId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Scheduled" }),
      });
      await logAudit("job_restore", "job", jobId, { status: "Deleted" }, { status: "Scheduled" }, `Job #${jobId} restored by ${currentUser.name}`);
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: "Scheduled" } : j));
    } catch (err) { console.error("Restore job failed:", err); }
  };

  const handlePermanentDelete = async (jobId) => {
    if (!["owner", "admin"].includes(currentUser.role)) return;
    try {
      await fetch(`${API_URL}/jobs/${jobId}`, { method: "DELETE" });
      await logAudit("job_permanent_delete", "job", jobId, { status: "Deleted" }, null, `Job #${jobId} permanently deleted by ${currentUser.name}`);
      setJobs(prev => prev.filter(j => j.id !== jobId));
    } catch (err) { console.error("Permanent delete failed:", err); }
  };

  const handleRestoreTicket = async (ticketId) => {
    try {
      await fetch(`${API_URL}/tickets/${ticketId}/restore`, { method: "POST" });
      const restored = deletedTickets.find(t => t.id === ticketId);
      setDeletedTickets(prev => prev.filter(t => t.id !== ticketId));
      if (restored) setTickets(prev => [...prev, restored]);
    } catch (err) { console.error("Restore ticket failed:", err); }
  };

  const handlePermanentDeleteTicket = async (ticketId) => {
    if (!["owner", "admin"].includes(currentUser.role)) return;
    try {
      await fetch(`${API_URL}/tickets/${ticketId}/hard`, { method: "DELETE" });
      setDeletedTickets(prev => prev.filter(t => t.id !== ticketId));
    } catch (err) { console.error("Permanent delete ticket failed:", err); }
  };

  const handleFlagCancel = async (jobId) => {
    const job = jobs.find(j => j.id === jobId);
    try {
      await fetch(`${API_URL}/jobs/${jobId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "flaggedCancel" }),
      });
      await logAudit("job_flag_cancel", "job", jobId, { status: job?.status }, { status: "flaggedCancel" }, `Job #${jobId} flagged for cancellation by ${currentUser.name}`);
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: "flaggedCancel" } : j));
    } catch (err) { console.error("Flag cancel failed:", err); }
  };

  const activeJobs = jobs.filter(j => j.status !== "Deleted");
  const deletedJobs = jobs.filter(j => j.status === "Deleted");
  const jobWithComputedStatus = activeJobs.map(j => ({ ...j, _computedStatus: computeJobStatus(j, tickets.filter(t => t.jobId === j.id)) }));
  const filteredJobs = filterStatus === "All" ? jobWithComputedStatus : jobWithComputedStatus.filter(j => j._computedStatus === filterStatus);
  const sortedJobs = [...filteredJobs].sort((a, b) => STATUS_ORDER.indexOf(a._computedStatus) - STATUS_ORDER.indexOf(b._computedStatus));

  const totalOut = inventory.reduce((s, i) => s + (i.qtyOwned - i.inYard), 0);

  const ALL_NAV_ITEMS = ["All Tickets", "Job History", "Action Items", "Inventory", "Crew", "Final Review", "Reports", "Deleted", "Users"];
  const NAV_ITEMS = ALL_NAV_ITEMS.filter(i => {
    if (i === "Inventory" && isField) return false;
    if (i === "Users" && !isManager) return false;
    if (i === "Job History" && isField) return false;
    if (i === "Deleted" && !["owner", "admin", "manager"].includes(currentUser.role)) return false;
    if (i === "Final Review" && !["owner", "admin", "manager"].includes(currentUser.role) && !currentUser?.permissions?.approve_tickets) return false;
    return true;
  });

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: C.pageBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: C.blue, marginBottom: 8 }}>FLO-TEST INC.</div>
          <div style={{ fontSize: 13, color: C.muted }}>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: C.pageBg, color: C.text, fontFamily: "'Arial', sans-serif" }}>
      {/* MOBILE HAMBURGER */}
      <div className="fti-hamburger" onClick={() => setDrawerOpen(true)} style={{
        position: "fixed", bottom: 24, right: 20, zIndex: 1000,
        width: 52, height: 52, borderRadius: "50%", background: C.red,
        boxShadow: "0 4px 16px #00000044", cursor: "pointer",
        flexDirection: "column", gap: 5, alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ width: 22, height: 2, background: C.white, borderRadius: 2 }} />
        <div style={{ width: 22, height: 2, background: C.white, borderRadius: 2 }} />
        <div style={{ width: 22, height: 2, background: C.white, borderRadius: 2 }} />
      </div>

      {/* MOBILE DRAWER BACKDROP */}
      {drawerOpen && <div onClick={() => setDrawerOpen(false)} style={{ position: "fixed", inset: 0, background: "#00000066", zIndex: 1001 }} />}

      {/* MOBILE DRAWER */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 1002,
        background: C.darkBlue, borderTop: `3px solid ${C.red}`,
        borderRadius: "16px 16px 0 0",
        transform: drawerOpen ? "translateY(0)" : "translateY(100%)",
        transition: "transform 0.3s ease",
        padding: "20px 0 40px", maxHeight: "80vh", overflowY: "auto",
      }}>
        <div style={{ width: 40, height: 4, background: "#ffffff33", borderRadius: 2, margin: "0 auto 20px" }} />
        <div style={{ padding: "0 20px 16px", borderBottom: `1px solid #ffffff22`, marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: C.red, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: C.white }}>
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.white }}>{currentUser.name}</div>
              <div style={{ fontSize: 11, color: "#a0aec8", textTransform: "uppercase", letterSpacing: "0.08em" }}>{currentUser.role}</div>
            </div>
          </div>
        </div>
        <div onClick={() => { setPage("dashboard"); setDrawerOpen(false); }} style={{
          display: "flex", alignItems: "center", gap: 14, padding: "14px 24px",
          background: page === "dashboard" ? "#ffffff11" : "transparent",
          borderLeft: page === "dashboard" ? `3px solid ${C.red}` : "3px solid transparent",
          cursor: "pointer",
        }}>
          <span style={{ fontSize: 18, width: 24, textAlign: "center" }}>⌂</span>
          <span style={{ fontSize: 15, fontWeight: page === "dashboard" ? 700 : 400, color: page === "dashboard" ? C.white : "#b0bdd4" }}>Dashboard</span>
        </div>
        {NAV_ITEMS.map(item => {
          const pageMap = { Dashboard: "dashboard", "All Tickets": "allTickets", "Job History": "jobHistory", "Action Items": "todos", Inventory: "inventory", Crew: "crew", "Final Review": "finalReview", Reports: "reports", Deleted: "deleted", Users: "users" };
          const navIcons = { Dashboard: "⌂", "All Tickets": "🎫", "Job History": "📋", "Action Items": "✓", Inventory: "📦", Crew: "👷", "Final Review": "✅", Reports: "📊", Deleted: "🗑", Users: "👤" };
          if (item === "Users" && !isManager) return null;
          if (item === "Job History" && isField) return null;
          if (item === "Deleted" && !["owner", "admin", "manager"].includes(currentUser.role)) return null;
          const active = pageMap[item] === page;
          return (
            <div key={item} onClick={() => { setPage(pageMap[item]); setDrawerOpen(false); }} style={{
              display: "flex", alignItems: "center", gap: 14, padding: "14px 24px",
              background: active ? "#ffffff11" : "transparent",
              borderLeft: active ? `3px solid ${C.red}` : "3px solid transparent",
              cursor: "pointer",
            }}>
              <span style={{ fontSize: 18, width: 24, textAlign: "center" }}>{navIcons[item]}</span>
              <span style={{ fontSize: 15, fontWeight: active ? 700 : 400, color: active ? C.white : "#b0bdd4" }}>
                {item}
                {item === "Action Items" && myActiveTodos.length > 0 && <span style={{ marginLeft: 8, background: C.red, color: C.white, borderRadius: 10, padding: "1px 7px", fontSize: 11, fontWeight: 800 }}>{myActiveTodos.length}</span>}
                {item === "Deleted" && (deletedJobs.length + deletedTickets.length) > 0 && <span style={{ marginLeft: 8, background: "#ffffff33", color: C.white, borderRadius: 10, padding: "1px 7px", fontSize: 11 }}>{deletedJobs.length + deletedTickets.length}</span>}
              </span>
            </div>
          );
        })}
        {["owner", "admin", "manager"].includes(currentUser.role) && (
          <div onClick={() => { setDrawerOpen(false); setShowPermissions(true); }} style={{
            display: "flex", alignItems: "center", gap: 14, padding: "14px 24px", cursor: "pointer",
          }}>
            <span style={{ fontSize: 18, width: 24, textAlign: "center" }}>⚙</span>
            <span style={{ fontSize: 15, color: "#a0aec8", fontWeight: 700 }}>Permissions</span>
          </div>
        )}
        {currentUser.role === "owner" && (
          <div onClick={() => { setDrawerOpen(false); setShowSettings(true); }} style={{
            display: "flex", alignItems: "center", gap: 14, padding: "14px 24px", cursor: "pointer",
          }}>
            <span style={{ fontSize: 18, width: 24, textAlign: "center" }}>⚙</span>
            <span style={{ fontSize: 15, color: "#a0aec8", fontWeight: 700 }}>Settings</span>
          </div>
        )}
        <div onClick={() => { setDrawerOpen(false); onLogout(); }} style={{
          display: "flex", alignItems: "center", gap: 14, padding: "14px 24px",
          borderTop: `1px solid #ffffff22`, marginTop: 8, cursor: "pointer",
        }}>
          <span style={{ fontSize: 18, width: 24, textAlign: "center" }}>⏻</span>
          <span style={{ fontSize: 15, color: C.red, fontWeight: 700 }}>Sign Out</span>
        </div>
      </div>

      {/* NAV — desktop */}
      <div className="fti-nav-bar" style={{
        background: C.darkBlue, borderBottom: `2px solid ${C.red}`,
        padding: "0 28px", display: "flex", alignItems: "center",
        justifyContent: "space-between", minHeight: 56,
      }}>
        <div
          onClick={() => setPage("dashboard")}
          onMouseEnter={e => { e.currentTarget.style.opacity = "0.85"; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
          style={{ display: "flex", alignItems: "center", gap: 16, cursor: "pointer", transition: "opacity 0.15s", userSelect: "none" }}
          title="Go to Dashboard"
        >
          <div style={{
            width: 36, height: 36, border: `2px solid ${C.red}`, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: C.blue, fontSize: 13, fontWeight: 900, color: C.white,
            boxShadow: `0 0 12px ${C.red}44`,
          }}>FTI</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.12em", color: C.white }}>FLO-TEST INC.</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#a0aec8", letterSpacing: "0.12em" }}>OPERATIONS DASHBOARD <span style={{ color: C.red }}>v26.74</span></div>
          </div>
        </div>
        <div className="fti-desktop-nav" style={{ display: "flex", gap: 20, alignItems: "center" }}>
          {NAV_ITEMS.map(item => {
            const pageMap = { Dashboard: "dashboard", "All Tickets": "allTickets", "Job History": "jobHistory", "Action Items": "todos", Inventory: "inventory", Crew: "crew", "Final Review": "finalReview", Reports: "reports", Deleted: "deleted", Users: "users" };
            const active = pageMap[item] === page;
            const clickable = !!pageMap[item];
            return (
              <span key={item} onClick={() => { if (clickable) setPage(pageMap[item]); }} style={{
                fontSize: 13, color: active ? C.white : clickable ? "#b0bdd4" : "#6b7a99",
                letterSpacing: "0.08em", cursor: clickable ? "pointer" : "default",
                borderBottom: active ? `2px solid ${C.red}` : "2px solid transparent",
                paddingBottom: 4, fontWeight: active ? 700 : 600,
                display: "flex", alignItems: "center",
              }}>
                {item}
                {item === "Action Items" && <NavBadge count={myActiveTodos.length} />}
                {item === "Inventory" && totalOut > 0 && <NavBadge count={totalOut} />}
                {item === "Deleted" && (deletedJobs.length + deletedTickets.length) > 0 && <NavBadge count={deletedJobs.length + deletedTickets.length} />}
              </span>
            );
          })}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {["owner", "admin", "manager"].includes(currentUser.role) && (
              <div style={{ position: "relative" }}>
                <span onClick={() => setShowSettingsMenu(v => !v)}
                  style={{ fontSize: 18, color: showSettingsMenu ? C.white : "#a0aec8", cursor: "pointer", lineHeight: 1, userSelect: "none" }}
                  title="Settings">⚙</span>
                {showSettingsMenu && (
                  <div style={{
                    position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 300,
                    background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 6,
                    boxShadow: "0 4px 16px #00000033", minWidth: 160, overflow: "hidden",
                  }} onClick={() => setShowSettingsMenu(false)}>
                    <div onClick={() => setShowPermissions(true)}
                      style={{ padding: "10px 16px", fontSize: 13, fontWeight: 600, color: C.text, cursor: "pointer" }}
                      onMouseEnter={e => e.currentTarget.style.background = C.steel}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      Permissions
                    </div>
                    {currentUser.role === "owner" && (
                      <div onClick={() => setShowSettings(true)}
                        style={{ padding: "10px 16px", fontSize: 13, fontWeight: 600, color: C.text, cursor: "pointer", borderTop: `1px solid ${C.border}` }}
                        onMouseEnter={e => e.currentTarget.style.background = C.steel}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        Settings
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            <span onClick={onLogout} style={{ fontSize: 11, color: "#a0aec8", cursor: "pointer", letterSpacing: "0.06em" }}>SIGN OUT</span>
            <div onClick={onLogout} style={{
              width: 30, height: 30, borderRadius: "50%", background: C.red,
              border: `2px solid #ffffff55`, display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 13, fontWeight: 800, cursor: "pointer", color: C.white,
            }}>{currentUser.name.charAt(0).toUpperCase()}</div>
          </div>
        </div>
      </div>

      {/* PAGES */}
      {page === "allTickets" && (
        <AllTicketsPage tickets={tickets} setTickets={setTickets} jobs={jobs} qbItems={qbItems} currentUser={currentUser} customers={customers} />
      )}

      {page === "todos" && (
        <TodoPage todos={todos} setTodos={setTodos} jobs={jobs} onNavigateJob={navigateToJob} userNames={userNames} userIdByName={userIdByName} />
      )}

      {page === "jobHistory" && !isField && (
        <JobHistoryPage jobs={jobs} onNavigateJob={navigateToJob} />
      )}

      {page === "crew" && (
        <CrewPage users={users} jobs={jobs} />
      )}

      {page === "finalReview" && (
        <FinalReviewPage jobs={jobs} tickets={tickets} setTickets={setTickets} currentUser={currentUser} qbItems={qbItems} />
      )}

      {page === "reports" && (
        <ReportsPage jobs={jobs} tickets={tickets} inventory={inventory} currentUser={currentUser} users={users} />
      )}

      {page === "inventory" && !isField && (
        <InventoryPage inventory={inventory} setInventory={setInventory} jobs={jobs} />
      )}

      {page === "deleted" && ["owner", "admin", "manager"].includes(currentUser.role) && (
        <DeletedJobsPage deletedJobs={deletedJobs} deletedTickets={deletedTickets} jobs={jobs} currentUser={currentUser} handleRestoreJob={handleRestoreJob} handlePermanentDelete={handlePermanentDelete} handleRestoreTicket={handleRestoreTicket} handlePermanentDeleteTicket={handlePermanentDeleteTicket} />
      )}

      {page === "users" && isManager && (
        <UsersPage users={users} setUsers={setUsers} currentUser={currentUser} isAdmin={isAdmin} />
      )}

      {page === "dashboard" && (
        <div className="fti-dashboard-pad" style={{ padding: "32px 28px" }}>
          <div className="fti-dashboard-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Active Jobs</h1>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                {activeJobs.length} total · {activeJobs.filter(j => computeJobStatus(j, tickets.filter(t => t.jobId === j.id)) === "In Progress").length} active · Updated just now
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Btn onClick={() => setPage("todos")} variant="ghost">
                ☐ Tasks {myActiveTodos.length > 0 ? `(${myActiveTodos.length})` : ""}
              </Btn>
              <Btn onClick={() => setShowNewJob(true)}>+ Job Card</Btn>
            </div>
          </div>

          <PipelineSummary jobs={jobs} tickets={tickets} />

          <div className="fti-filter-row" style={{ display: "flex", gap: 0, marginBottom: 16, alignItems: "center", borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginRight: 10 }}>FILTER:</span>
            {["All", ...STATUS_ORDER].map(s => {
              const active = filterStatus === s;
              const cfg = s === "All" ? null : STATUS_CONFIG[s];
              return (
                <button key={s} onClick={() => setFilterStatus(s)} style={{
                  background: active ? C.cardBg : "transparent",
                  border: active ? `1px solid ${C.border}` : "1px solid transparent",
                  borderBottom: active ? `1px solid ${C.cardBg}` : "1px solid transparent",
                  borderTopLeftRadius: 4, borderTopRightRadius: 4,
                  borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
                  marginBottom: active ? -1 : 0,
                  color: active ? (s === "All" ? C.blue : cfg?.color) : C.muted,
                  padding: "8px 14px", fontSize: 11,
                  fontWeight: 700, cursor: "pointer", fontFamily: "'Arial', sans-serif",
                }}>{s === "All" ? "ALL" : cfg.label}</button>
              );
            })}
          </div>

          {sortedJobs.map(job => (
            <JobCard
              key={job.id} job={job}
              isExpanded={expandedId === job.id}
              onToggle={() => setExpandedId(expandedId === job.id ? null : job.id)}
              pendingTodos={pendingByJob[job.id] || 0}
              todos={todos} setTodos={setTodos}
              tickets={tickets} setTickets={setTickets}
              jobs={jobs} onNavigateJob={navigateToJob}
              onUpdateJob={async (id, updates) => {
                const oldJob = jobs.find(j => j.id === id);
                try {
                  const payload = {
                    location: updates.location,
                    status: updates.status,
                    job_state: updates.job_state,
                    county: updates.county,
                    afe: updates.afe,
                    contact_first: updates.contact_first,
                    contact_last: updates.contact_last,
                    poc_phone: updates.poc_phone,
                    poc_email: updates.poc_email,
                    approver: updates.approver,
                    approver_last: updates.approver_last,
                    approver_phone: updates.approver_phone,
                    approver_email: updates.approver_email,
                    company_code: updates.company_code,
                    cost_center: updates.cost_center,
                    po_number: updates.po_number,
                    google_pin: updates.google_pin,
                    pin_lat: updates.pin_lat,
                    pin_lng: updates.pin_lng,
                  };
                  if (updates.customer) {
                    payload.customer = updates.customer;
                    const cust = customers.find(c => c.name === updates.customer);
                    if (cust) payload.customer_id = cust.id;
                  }
                  if (updates.wells) {
                    payload.wells = updates.wells.map(w =>
                      typeof w === "string" ? { well_name: w } : w
                    );
                  }
                  if (updates.crew) payload.crew = updates.crew.map(c => ({ name: c.name, role: c.role, user_id: userIdByName[c.name] || null }));
                  await fetch(`${API_URL}/jobs/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
                  await logAudit("job_edit", "job", id, { customer: oldJob?.customer, status: oldJob?.status }, updates, `Job #${id} edited by ${currentUser.name}`);
                } catch (err) { console.error("Job update failed:", err); }
                setJobs(prev => prev.map(j => j.id === id ? { ...j, ...updates } : j));
              }}
              jsas={jsas} setJsas={setJsas}
              userNames={userNames}
              qbItems={qbItems}
              userIdByName={userIdByName}
              currentUser={currentUser}
              customers={customers}
              onDeleteJob={handleDeleteJob}
              onFlagCancel={handleFlagCancel}
              onTicketDeleted={(ticket) => setDeletedTickets(prev => [...prev, ticket])}
            />
          ))}
        </div>
      )}

      {/* NEW JOB MODAL */}
      {showNewJob && (
        <NewJobModal onClose={() => setShowNewJob(false)} onCreateJob={handleCreateJob} customers={customers} users={users} />
      )}
      {showPermissions && (
        <PermissionsModal onClose={() => setShowPermissions(false)} currentUser={currentUser} />
      )}
      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} currentUser={currentUser} />
      )}
    </div>
  );
}

// ─── APP WRAPPER (auth routing) ────────────────────────────────────────────

function AppWrapper() {
  const [currentUser, setCurrentUser] = useState(null);

  // Public signature page — intercept /sign/:token before login
  const signMatch = window.location.pathname.match(/^\/sign\/(.+)$/);
  if (signMatch) return <PublicSignPage token={signMatch[1]} />;

  // Check for saved session
  useEffect(() => {
    const saved = sessionStorage.getItem("fti_user");
    if (saved) {
      try {
        const user = JSON.parse(saved);
        CURRENT_USER = user.name;
        setCurrentUser(user);
      } catch (e) { sessionStorage.removeItem("fti_user"); }
    }
  }, []);

  const handleLogin = (user) => {
    CURRENT_USER = user.name;
    setCurrentUser(user);
    sessionStorage.setItem("fti_user", JSON.stringify(user));
  };

  const handleLogout = () => {
    CURRENT_USER = "";
    setCurrentUser(null);
    sessionStorage.removeItem("fti_user");
  };

  if (!currentUser) return <LoginScreen onLogin={handleLogin} />;
  return <FTIDashboard currentUser={currentUser} onLogout={handleLogout} />;
}

export { AppWrapper as default };

