import { useState, useEffect, useCallback } from "react";
import { startRegistration } from "@simplewebauthn/browser";
import { C, API_URL } from "./config.js";
import { Btn, ModalWrap, inputStyle, labelStyle } from "./SharedUI.jsx";

// ─── WebAuthnSetupModal (v27.99) ────────────────────────────────────────────
// Self-service biometric device manager. Replaces TotpSetupModal as of v27.99.
// Opened from UsersPage on the user's own row ("MANAGE DEVICES" button).
//
// What it does:
//   1. Lists the user's currently registered devices (Touch ID / Face ID /
//      Windows Hello / hardware keys) with label, transports, last-used.
//   2. "Add this device" — runs the WebAuthn registration ceremony in-browser
//      using @simplewebauthn/browser; the OS prompts for biometric; the
//      resulting attestation is POSTed to /webauthn/register-additional.
//   3. "Remove" — DELETE /webauthn/credentials/:id with confirm, but the user
//      can't remove their last device (would brick their next login).
//
// Why no QR / no recovery codes:
//   WebAuthn replaces TOTP. Biometric never leaves the device. No shared
//   secret to copy out. No recovery codes — admin override (UsersPage admin
//   button → /webauthn/admin-disable) and CLI fallback handle worst-case.
//
// Device cap:
//   Backend caps at 5 (MAX_DEVICES_PER_USER). UI surfaces this — Add button
//   disables when limit is reached.

const MAX_DEVICES = 5;

function fmtDate(s) {
  if (!s) return "—";
  try {
    const d = new Date(s);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "—";
  }
}

function WebAuthnSetupModal({ userName, onClose, onStateChange }) {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [adding, setAdding] = useState(false);
  const [showLabelInput, setShowLabelInput] = useState(false);
  const [pendingLabel, setPendingLabel] = useState("");
  const [removingId, setRemovingId] = useState(null);

  const fetchDevices = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const r = await fetch(`${API_URL}/auth/webauthn/credentials`);
      if (!r.ok) {
        const data = await r.json().catch(() => null);
        setError(data?.error || `Could not load devices (${r.status})`);
        setDevices([]);
        return;
      }
      const data = await r.json();
      setDevices(Array.isArray(data) ? data : []);
    } catch {
      setError("Connection error");
      setDevices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDevices(); }, [fetchDevices]);

  const beginAddDevice = () => {
    if (devices.length >= MAX_DEVICES) {
      setError(`You've reached the limit of ${MAX_DEVICES} devices. Remove one first.`);
      return;
    }
    setError(""); setInfo("");
    // Suggest a sensible default label based on user agent.
    const ua = (navigator.userAgent || "").toLowerCase();
    let suggested = "This device";
    if (/iphone/.test(ua)) suggested = "iPhone";
    else if (/ipad/.test(ua)) suggested = "iPad";
    else if (/android/.test(ua)) suggested = "Android phone";
    else if (/mac/.test(ua)) suggested = "MacBook";
    else if (/windows/.test(ua)) suggested = "Windows PC";
    setPendingLabel(suggested);
    setShowLabelInput(true);
  };

  const confirmAddDevice = async () => {
    const label = (pendingLabel || "").trim() || "Unnamed device";
    setAdding(true); setError(""); setInfo("");
    try {
      // 1. Get registration options from server.
      const optsRes = await fetch(`${API_URL}/auth/webauthn/register-options`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const optsData = await optsRes.json();
      if (!optsRes.ok) {
        setError(optsData.error || "Could not start registration");
        return;
      }

      // 2. Browser ceremony — OS shows biometric prompt.
      let attResp;
      try {
        attResp = await startRegistration({ optionsJSON: optsData.registration_options });
      } catch (browserErr) {
        // User cancelled, no biometric on device, etc.
        const msg = browserErr?.name === "InvalidStateError"
          ? "This device is already registered."
          : browserErr?.message || "Biometric registration cancelled or failed";
        setError(msg);
        return;
      }

      // 3. Send attestation to server.
      const verifyRes = await fetch(`${API_URL}/auth/webauthn/register-additional`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: attResp, device_label: label }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        setError(verifyData.error || "Registration verification failed");
        return;
      }

      setInfo(`Device "${label}" registered.`);
      setShowLabelInput(false);
      setPendingLabel("");
      await fetchDevices();
      if (onStateChange) onStateChange();
    } catch {
      setError("Connection error");
    } finally {
      setAdding(false);
    }
  };

  const removeDevice = async (id) => {
    if (devices.length <= 1) {
      setError("You can't remove your last device — you'd be locked out on next login. Add another device first.");
      return;
    }
    setRemovingId(id); setError(""); setInfo("");
    try {
      const r = await fetch(`${API_URL}/auth/webauthn/credentials/${id}`, { method: "DELETE" });
      if (!r.ok) {
        const data = await r.json().catch(() => null);
        setError(data?.error || "Could not remove device");
        return;
      }
      setInfo("Device removed.");
      await fetchDevices();
      if (onStateChange) onStateChange();
    } catch {
      setError("Connection error");
    } finally {
      setRemovingId(null);
    }
  };

  const atCap = devices.length >= MAX_DEVICES;

  return (
    <ModalWrap title="Manage Biometric Devices" onClose={onClose} width={500}>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 14, lineHeight: 1.5 }}>
        Touch ID, Face ID, Windows Hello, or hardware security key — each device you register
        can sign you in to <strong>{userName}</strong> after you enter your password. Up to {MAX_DEVICES} devices.
      </div>

      {/* ── Existing devices ── */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ ...labelStyle, marginBottom: 6 }}>REGISTERED DEVICES ({devices.length}/{MAX_DEVICES})</div>
        {loading ? (
          <div style={{ fontSize: 12, color: C.muted, padding: "12px 0" }}>Loading...</div>
        ) : devices.length === 0 ? (
          <div style={{
            fontSize: 12, color: C.muted, padding: "12px 14px",
            background: C.steel, border: `1px solid ${C.border}`, borderRadius: 4,
            fontStyle: "italic",
          }}>
            No devices registered yet. Add one below — your phone, laptop, or a hardware key.
          </div>
        ) : (
          <div style={{ border: `1px solid ${C.border}`, borderRadius: 4, overflow: "hidden" }}>
            {devices.map((d, i) => (
              <div key={d.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 14px",
                borderTop: i === 0 ? "none" : `1px solid ${C.border}`,
                background: C.cardBg,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{d.device_label}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>
                    Added {fmtDate(d.created_at)}
                    {d.last_used_at ? ` · Last used ${fmtDate(d.last_used_at)}` : " · Never used"}
                    {d.transports ? ` · ${d.transports}` : ""}
                  </div>
                </div>
                <button
                  onClick={() => removeDevice(d.id)}
                  disabled={removingId === d.id || devices.length <= 1}
                  title={devices.length <= 1 ? "Can't remove your last device" : "Remove this device"}
                  style={{
                    background: "transparent", border: `1px solid ${C.red}33`,
                    color: devices.length <= 1 ? C.muted : C.red,
                    fontSize: 10, fontWeight: 700, padding: "4px 10px",
                    borderRadius: 3, cursor: devices.length <= 1 ? "not-allowed" : "pointer",
                    letterSpacing: "0.06em",
                    opacity: removingId === d.id ? 0.5 : 1,
                  }}
                >
                  {removingId === d.id ? "REMOVING..." : "REMOVE"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Add device ── */}
      {!showLabelInput && (
        <div style={{ marginBottom: 12 }}>
          <Btn onClick={beginAddDevice} disabled={atCap}>
            {atCap ? `LIMIT REACHED (${MAX_DEVICES})` : "+ ADD THIS DEVICE"}
          </Btn>
        </div>
      )}

      {showLabelInput && (
        <div style={{
          padding: 14, background: C.steel,
          border: `1px solid ${C.border}`, borderRadius: 4, marginBottom: 12,
        }}>
          <div style={{ fontSize: 12, color: C.text, marginBottom: 10 }}>
            Give this device a name so you'll recognize it later (e.g., "Reggie's iPhone").
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>DEVICE NAME</label>
            <input
              style={inputStyle}
              value={pendingLabel}
              onChange={e => setPendingLabel(e.target.value.slice(0, 60))}
              autoFocus
              maxLength={60}
              placeholder="iPhone, MacBook, YubiKey..."
              onKeyDown={e => e.key === "Enter" && !adding && confirmAddDevice()}
            />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={confirmAddDevice} disabled={adding}>
              {adding ? "WAITING FOR BIOMETRIC..." : "REGISTER THIS DEVICE"}
            </Btn>
            <Btn onClick={() => { setShowLabelInput(false); setPendingLabel(""); setError(""); }} variant="ghost">
              CANCEL
            </Btn>
          </div>
        </div>
      )}

      {error && (
        <div style={{ color: C.red, fontSize: 12, fontWeight: 700, marginBottom: 10 }}>
          {error}
        </div>
      )}
      {info && (
        <div style={{ color: C.green, fontSize: 12, fontWeight: 700, marginBottom: 10 }}>
          {info}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
        <Btn onClick={onClose} variant="ghost">CLOSE</Btn>
      </div>
    </ModalWrap>
  );
}

export default WebAuthnSetupModal;
