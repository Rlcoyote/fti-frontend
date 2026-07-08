import { useState, useEffect } from "react";
import { C, API_URL } from "./config.js";
import { PANEL_MUTED } from "./SharedUI.jsx";
import { useApp } from "./AppContext.jsx";

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
        let w = img.width,
          h = img.height;
        if (w > MAX || h > MAX) {
          if (w > h) {
            h = Math.round((h * MAX) / w);
            w = MAX;
          } else {
            w = Math.round((w * MAX) / h);
            h = MAX;
          }
        }
        // Full image
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        const imageData = canvas.toDataURL("image/jpeg", 0.8);
        // Thumbnail
        let tw = THUMB,
          th = THUMB;
        if (img.width > img.height) {
          th = Math.round((THUMB * img.height) / img.width);
        } else {
          tw = Math.round((THUMB * img.width) / img.height);
        }
        const tc = document.createElement("canvas");
        tc.width = tw;
        tc.height = th;
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
  const { showNotice } = useApp();
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!ticketId) return;
    fetch(`${API_URL}/tickets/${ticketId}/photos`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setPhotos)
      .catch(() => {});
  }, [ticketId]);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (photos.length + files.length > 10) {
      showNotice("Photo Limit Reached", `Maximum 10 photos per ticket. You currently have ${photos.length}.`, "error");
      return;
    }
    setUploading(true);
    try {
      const compressed = await Promise.all(files.map((f) => compressPhoto(f)));
      const r = await fetch(`${API_URL}/tickets/${ticketId}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photos: compressed.map((p) => ({ filename: p.filename, image_data: p.imageData, thumbnail: p.thumbnail })) }),
      });
      if (r.ok) {
        const saved = await r.json();
        setPhotos((prev) => [...prev, ...saved]);
      }
    } catch (err) {
      console.error("Photo upload failed:", err);
    }
    setUploading(false);
    e.target.value = "";
  };

  const handleDelete = async (photoId) => {
    try {
      await fetch(`${API_URL}/tickets/photos/${photoId}`, { method: "DELETE" });
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    } catch (err) {
      console.error("Photo delete failed:", err);
    }
  };

  const viewFull = async (photoId) => {
    try {
      const r = await fetch(`${API_URL}/tickets/photos/${photoId}`);
      if (!r.ok) return;
      const data = await r.json();
      const win = window.open("", "_blank");
      win.document.write(
        `<html><head><title>${data.filename}</title></head><body style="margin:0;background:#111;display:flex;align-items:center;justify-content:center;min-height:100vh"><img src="${data.image_data}" style="max-width:100%;max-height:100vh;object-fit:contain" /></body></html>`,
      );
      win.document.close();
    } catch (err) {
      console.error("View photo failed:", err);
    }
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
          {photos.map((p) => (
            <div key={p.id} style={{ position: "relative", borderRadius: 6, overflow: "hidden", border: `1px solid ${C.border}`, background: "#f8f9fa" }}>
              <img
                src={p.thumbnail}
                alt={p.filename}
                onClick={() => viewFull(p.id)}
                style={{ width: 80, height: 80, objectFit: "cover", cursor: "pointer", display: "block" }}
              />
              {!isLocked && (
                <button
                  onClick={() => handleDelete(p.id)}
                  style={{
                    position: "absolute",
                    top: 2,
                    right: 2,
                    background: C.scrim,
                    color: "#fff",
                    border: "none",
                    borderRadius: "50%",
                    width: 18,
                    height: 18,
                    fontSize: 11,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              )}
              <div
                style={{
                  fontSize: 9,
                  color: PANEL_MUTED,
                  padding: "2px 4px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: 80,
                }}
              >
                {p.filename}
              </div>
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
      .then((r) => (r.ok ? r.json() : []))
      .then(setPhotos)
      .catch(() => {});
  }, [ticketId]);

  const viewFull = async (photoId) => {
    try {
      const r = await fetch(`${API_URL}/tickets/photos/${photoId}`);
      if (!r.ok) return;
      const data = await r.json();
      const win = window.open("", "_blank");
      win.document.write(
        `<html><head><title>${data.filename}</title></head><body style="margin:0;background:#111;display:flex;align-items:center;justify-content:center;min-height:100vh"><img src="${data.image_data}" style="max-width:100%;max-height:100vh;object-fit:contain" /></body></html>`,
      );
      win.document.close();
    } catch (err) {
      console.error("View photo failed:", err);
    }
  };

  if (photos.length === 0) return null;
  return (
    <div style={{ marginTop: 20, borderTop: "2px solid #d0d8e8", paddingTop: 16 }}>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>Photos ({photos.length})</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {photos.map((p) => (
          <img
            key={p.id}
            src={p.thumbnail}
            alt={p.filename}
            onClick={() => viewFull(p.id)}
            style={{ width: 80, height: 80, objectFit: "cover", cursor: "pointer", borderRadius: 6, border: "1px solid #d0d8e8" }}
          />
        ))}
      </div>
    </div>
  );
}

export { PhotoStrip, PublicPhotoStrip };
