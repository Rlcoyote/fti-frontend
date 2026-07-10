import { useState, useRef, useEffect } from "react";
import { startAuthentication } from "@simplewebauthn/browser";
import { C, API_URL } from "./config.js";
import { Btn, ModalWrap, inputStyle, labelStyle } from "./SharedUI.jsx";
import { useApp } from "./AppContext.jsx";
import { captureGps } from "./utils.js";

// ─── JSAPathBSignModal (v28.19) ─────────────────────────────────────────────
// Path B — PIN + photo + lead's biometric witness, the deferred path from
// v28.07. Used when crew is gathered around the lead's device (the 98% case
// at FTI per Reggie). Each crew member without their own biometric on hand
// types their 4-digit PIN on the lead's phone, the rear camera captures
// their face for forensic record, and the lead's own biometric anchors the
// signature cryptographically.
//
// Three sequential steps (per Reggie's choice 1a):
//   1. PIN   — target crew member enters their PIN (3-strike rule before
//              auto-fallback to Path C — choice 3a)
//   2. PHOTO — rear camera captures the signer's face (subject is the crew
//              member; operator is the lead)
//   3. WITNESS — the lead's WebAuthn assertion anchors the whole thing
//              (per-signature, not batched — choice 2a)
//
// On 3rd PIN failure: modal closes itself and signals the parent to open
// JSALeadOverrideModal for the same target — graceful fallback (choice 3a).
//
// On no-PIN-set: backend returns 409 PIN_NOT_SET, parent immediately falls
// back to Path C inline (choice 4b).
//
// Photos are sent as base64 JPEG (compressed to ~0.85 quality), stored as
// BYTEA on the backend in jsa_witness_photos (choice 5a). Backend caps at 5MB.

const PIN_LENGTH = 4;
const MAX_PIN_ATTEMPTS = 3;
const PHOTO_QUALITY = 0.85;
const PHOTO_MAX_SIDE = 1024; // downscale longest edge to 1024px

function JSAPathBSignModal({ jsaId, target, onClose, onSigned, onFallbackToOverride }) {
  const { currentUser } = useApp();
  const [step, setStep] = useState("pin"); // "pin" | "photo" | "witness" | "submitting"
  const [pin, setPin] = useState("");
  const [pinAttempts, setPinAttempts] = useState(0);
  const [pinVerifying, setPinVerifying] = useState(false);
  const [photoDataUrl, setPhotoDataUrl] = useState("");
  const [cameraError, setCameraError] = useState("");
  const [error, setError] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const targetName = target?.user_name || "Crew Member";
  const leadName = currentUser?.name || "Crew Lead";
  const remainingAttempts = MAX_PIN_ATTEMPTS - pinAttempts;

  const attestationDisplay =
    `I, ${targetName}, attest under penalty of perjury that I personally entered my private PIN on ${leadName}'s device to acknowledge the JSA; that I have personally read and understood the JSA; that I am physically capable of performing the work; and that the photograph captured depicts me. ` +
    `I, ${leadName}, separately attest under penalty of perjury that I personally witnessed ${targetName} entering their PIN on my device, and that the captured photograph is a true likeness of ${targetName}.`;

  // Stop camera on unmount or when leaving the photo step
  useEffect(() => {
    return () => stopCamera();
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const startCamera = async () => {
    setCameraError("");
    try {
      // Rear camera by default (lead is operator, crew member is subject).
      // Falls back to any camera if rear isn't available.
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (err) {
      const name = err?.name || "";
      let msg = "Could not access the camera.";
      if (name === "NotAllowedError") msg = "Camera permission was denied. Tap RETRY after enabling camera access for this site.";
      else if (name === "NotFoundError") msg = "No camera found on this device.";
      else if (name === "NotReadableError") msg = "Camera is in use by another app. Close other apps and tap RETRY.";
      setCameraError(msg);
    }
  };

  // PIN verification (step 1)
  const submitPin = async () => {
    if (pin.length !== PIN_LENGTH) {
      setError(`PIN must be ${PIN_LENGTH} digits`);
      return;
    }
    setError("");
    setPinVerifying(true);
    try {
      const r = await fetch(`${API_URL}/jsas/${jsaId}/verify-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: target.user_id, pin }),
      });
      const data = await r.json().catch(() => ({}));

      // Backend signals PIN-not-set as 409 with code PIN_NOT_SET
      if (r.status === 409 && data?.code === "PIN_NOT_SET") {
        // Fall back to Path C inline (choice 4b)
        if (onFallbackToOverride) {
          onFallbackToOverride(target, "PIN not set on this user — falling back to lead override");
        }
        return;
      }
      if (!r.ok) {
        setError(data?.error || "Could not verify PIN");
        setPin("");
        return;
      }
      if (data.verified) {
        setPin(pin); // keep PIN in state for the final submit
        setStep("photo");
        // Kick off camera the moment we enter step 2
        setTimeout(() => startCamera(), 50);
        return;
      }
      // Bad PIN — increment, fall back on 3rd strike
      const newCount = pinAttempts + 1;
      setPinAttempts(newCount);
      setPin("");
      if (newCount >= MAX_PIN_ATTEMPTS) {
        if (onFallbackToOverride) {
          onFallbackToOverride(target, `Too many incorrect PIN attempts for ${targetName} — falling back to lead override`);
        }
        return;
      }
      setError(`Incorrect PIN. ${MAX_PIN_ATTEMPTS - newCount} attempt${MAX_PIN_ATTEMPTS - newCount === 1 ? "" : "s"} remaining before lead override.`);
    } catch {
      setError("Connection error verifying PIN");
    } finally {
      setPinVerifying(false);
    }
  };

  // Capture frame from <video> into <canvas>, downscale, encode as JPEG
  const capturePhoto = () => {
    setError("");
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) {
      setError("Camera not ready — wait a moment and try again.");
      return;
    }
    const vw = video.videoWidth,
      vh = video.videoHeight;
    if (!vw || !vh) {
      setError("Camera is still warming up — try again in a second.");
      return;
    }
    const scale = Math.min(1, PHOTO_MAX_SIDE / Math.max(vw, vh));
    const w = Math.round(vw * scale),
      h = Math.round(vh * scale);
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, w, h);
    const dataUrl = canvas.toDataURL("image/jpeg", PHOTO_QUALITY);
    setPhotoDataUrl(dataUrl);
    stopCamera();
  };

  const retakePhoto = () => {
    setPhotoDataUrl("");
    startCamera();
  };

  // Step 3 — lead bio + atomic submit
  const finalize = async () => {
    if (!acknowledged) {
      setError("Both signer and witness must acknowledge the attestation");
      return;
    }
    setStep("submitting");
    setError("");
    try {
      // 1. Auth options for the LEAD (currentUser)
      const optsRes = await fetch(`${API_URL}/jsas/${jsaId}/auth-options-self`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const optsData = await optsRes.json();
      if (!optsRes.ok) {
        setError(optsData?.error || "Could not start lead biometric");
        setStep("witness");
        return;
      }
      // 2. Lead biometric (fresh user-activation from CONFIRM tap)
      let assertion;
      try {
        assertion = await startAuthentication({ optionsJSON: optsData.authentication_options });
      } catch (browserErr) {
        const name = browserErr?.name || "";
        let msg = browserErr?.message || "Lead biometric cancelled";
        if (name === "NotAllowedError") msg = "Lead biometric did not complete. Tap CONFIRM again to retry.";
        setError(msg);
        setStep("witness");
        return;
      }
      // 3. Atomic submit
      const gps = await captureGps();
      const r = await fetch(`${API_URL}/jsas/${jsaId}/sign-pin-witnessed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: target.user_id,
          pin,
          photo_data_base64: photoDataUrl,
          photo_mime_type: "image/jpeg",
          lead_webauthn_response: assertion,
          gps_lat: gps.lat,
          gps_lng: gps.lng,
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(data?.error || "Submission failed");
        setStep("witness");
        return;
      }
      onSigned();
    } catch (err) {
      setError(err?.message || "Connection error during submit");
      setStep("witness");
    }
  };

  // ─── UI ───────────────────────────────────────────────────────────────────

  const stepBadge = (s, label, idx) => (
    <div
      style={{
        flex: 1,
        padding: "6px 10px",
        textAlign: "center",
        background: step === s ? C.blue : stepIndex(step) > idx ? C.greenB : C.steel,
        color: step === s ? C.white : stepIndex(step) > idx ? C.green : C.muted,
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: "0.06em",
        borderRight: idx < 2 ? `1px solid ${C.cardBg}` : "none",
      }}
    >
      {idx + 1}. {label}
    </div>
  );

  const stepIndex = (s) => ({ pin: 0, photo: 1, witness: 2, submitting: 2 })[s] ?? 0;

  return (
    <ModalWrap title={`PIN-Witnessed Sign — ${targetName}`} onClose={onClose} width={520}>
      {/* Step indicator */}
      <div style={{ display: "flex", marginBottom: 18, borderRadius: 4, overflow: "hidden", border: `1px solid ${C.border}` }}>
        {stepBadge("pin", "PIN", 0)}
        {stepBadge("photo", "PHOTO", 1)}
        {stepBadge("witness", "WITNESS", 2)}
      </div>

      {/* ── STEP 1: PIN ── */}
      {step === "pin" && (
        <>
          <div style={{ fontSize: 13, color: C.text, lineHeight: 1.5, marginBottom: 14 }}>
            Hand this device to <strong>{targetName}</strong>. They enter their {PIN_LENGTH}-digit PIN below to begin signing.
          </div>
          <label style={labelStyle}>{targetName.toUpperCase()}'S PIN</label>
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            autoFocus
            maxLength={PIN_LENGTH}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, PIN_LENGTH))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && pin.length === PIN_LENGTH && !pinVerifying) submitPin();
            }}
            placeholder={"•".repeat(PIN_LENGTH)}
            style={{ ...inputStyle, fontSize: 24, letterSpacing: "0.5em", textAlign: "center", marginBottom: 14 }}
          />
          {pinAttempts > 0 && remainingAttempts > 0 && (
            <div style={{ fontSize: 11, color: C.yellow, fontWeight: 600, marginBottom: 10 }}>
              {remainingAttempts} attempt{remainingAttempts === 1 ? "" : "s"} remaining before lead-override fallback.
            </div>
          )}
          {error && <div style={{ color: C.red, fontSize: 12, fontWeight: 700, marginBottom: 12 }}>{error}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={submitPin} disabled={pin.length !== PIN_LENGTH || pinVerifying}>
              {pinVerifying ? "VERIFYING..." : "NEXT"}
            </Btn>
            <Btn variant="ghost" onClick={onClose}>
              CANCEL
            </Btn>
          </div>
        </>
      )}

      {/* ── STEP 2: PHOTO ── */}
      {step === "photo" && (
        <>
          <div style={{ fontSize: 13, color: C.text, lineHeight: 1.5, marginBottom: 14 }}>
            Aim the camera at <strong>{targetName}</strong> and capture a photo for the forensic record. The photo is stored only with this JSA signature — not
            shared elsewhere.
          </div>
          <div
            style={{
              position: "relative",
              width: "100%",
              aspectRatio: "4 / 3",
              background: "#000",
              borderRadius: 4,
              overflow: "hidden",
              marginBottom: 12,
            }}
          >
            {!photoDataUrl ? (
              <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <img src={photoDataUrl} alt="captured" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            )}
          </div>
          <canvas ref={canvasRef} style={{ display: "none" }} />
          {cameraError && <div style={{ color: C.red, fontSize: 12, fontWeight: 700, marginBottom: 10 }}>{cameraError}</div>}
          {error && <div style={{ color: C.red, fontSize: 12, fontWeight: 700, marginBottom: 10 }}>{error}</div>}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {!photoDataUrl ? (
              <>
                <Btn onClick={capturePhoto} disabled={!!cameraError}>
                  CAPTURE
                </Btn>
                {cameraError && (
                  <Btn variant="ghost" onClick={startCamera}>
                    RETRY CAMERA
                  </Btn>
                )}
                <Btn
                  variant="ghost"
                  onClick={() => {
                    stopCamera();
                    setStep("pin");
                  }}
                >
                  BACK
                </Btn>
              </>
            ) : (
              <>
                <Btn onClick={() => setStep("witness")}>NEXT</Btn>
                <Btn variant="ghost" onClick={retakePhoto}>
                  RETAKE
                </Btn>
              </>
            )}
          </div>
        </>
      )}

      {/* ── STEP 3: WITNESS ── */}
      {(step === "witness" || step === "submitting") && (
        <>
          <div style={{ fontSize: 13, color: C.text, lineHeight: 1.5, marginBottom: 12 }}>
            Final step — your biometric (as crew lead) anchors this signature forensically. Read the attestation below, both parties acknowledge, then tap
            CONFIRM to trigger your Face ID / Touch ID prompt.
          </div>

          <div
            style={{
              background: C.steel,
              border: `1px solid ${C.border}`,
              borderRadius: 4,
              padding: 12,
              marginBottom: 14,
              fontSize: 11,
              color: C.text,
              lineHeight: 1.5,
            }}
          >
            <strong>Attestation (stored verbatim with the signature):</strong>
            <div style={{ marginTop: 8, fontStyle: "italic" }}>{attestationDisplay}</div>
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              marginBottom: 16,
              fontSize: 12,
              color: C.text,
              cursor: "pointer",
              lineHeight: 1.45,
            }}
          >
            <input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} style={{ marginTop: 2 }} />
            <span>
              <strong>{targetName}</strong> and <strong>{leadName}</strong> both acknowledge the attestation above. By tapping CONFIRM, this signature is
              submitted under penalty of perjury by both parties.
            </span>
          </label>

          {error && <div style={{ color: C.red, fontSize: 12, fontWeight: 700, marginBottom: 12 }}>{error}</div>}

          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={finalize} disabled={!acknowledged || step === "submitting"}>
              {step === "submitting" ? "WAITING FOR LEAD BIOMETRIC..." : "CONFIRM WITH LEAD BIOMETRIC"}
            </Btn>
            <Btn variant="ghost" onClick={() => setStep("photo")} disabled={step === "submitting"}>
              BACK
            </Btn>
          </div>
        </>
      )}
    </ModalWrap>
  );
}

export default JSAPathBSignModal;
