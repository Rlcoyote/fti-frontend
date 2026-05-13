import { useState, useRef } from "react";
import { C } from "./config.js";
import { Btn, inputStyle, labelStyle } from "./SharedUI.jsx";

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
        <input style={{ ...inputStyle, width: 280 }} value={signerName} onChange={(e) => setSignerName(e.target.value)} placeholder="Customer name..." />
      </div>
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>Sign below:</div>
      <div style={{ background: C.white, border: `2px solid ${hasDrawn ? C.green : C.border}`, borderRadius: 4, touchAction: "none", lineHeight: 0 }}>
        <canvas
          ref={canvasRef}
          width={600}
          height={150}
          style={{ display: "block", width: "100%", height: "auto" }}
          onMouseDown={onDown}
          onMouseMove={onMove}
          onMouseUp={onUp}
          onMouseLeave={onUp}
          onTouchStart={onDown}
          onTouchMove={onMove}
          onTouchEnd={onUp}
        />
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <Btn variant="blue" onClick={submit}>
          SUBMIT SIGNATURE
        </Btn>
        <Btn variant="ghost" small onClick={clear}>
          CLEAR
        </Btn>
        <Btn variant="ghost" small onClick={onCancel}>
          CANCEL
        </Btn>
      </div>
      {(!hasDrawn || !signerName.trim()) && <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>* Name and signature required</div>}
    </div>
  );
}

export default SignaturePad;
