import { useState, useEffect } from "react";
import { C, API_URL } from "./config.js";
import { Btn, inputStyle, labelStyle } from "./SharedUI.jsx";
import { useApp } from "./AppContext.jsx";

function CompanyDocumentsModal({ onClose }) {
  const { currentUser } = useApp();
  const isAdmin = ["owner", "admin"].includes(currentUser?.role);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const [viewDoc, setViewDoc] = useState(null);

  const fetchDocs = async () => {
    try {
      const r = await fetch(`${API_URL}/safety/documents`);
      if (r.ok) setDocs(await r.json());
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchDocs(); }, []);

  const handleUpload = async () => {
    if (!file || !name.trim()) { setMsg("Name and file are required."); return; }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const r = await fetch(`${API_URL}/safety/documents`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            description: desc.trim() || null,
            file_type: file.type || "application/octet-stream",
            file_data: e.target.result,
            file_size: file.size,
            uploaded_by: currentUser?.id || null,
          }),
        });
        if (r.ok) {
          await fetchDocs();
          setShowUpload(false); setName(""); setDesc(""); setFile(null);
          setMsg("Document uploaded.");
          setTimeout(() => setMsg(""), 3000);
        } else { setMsg("Upload failed."); }
      } catch { setMsg("Upload failed."); }
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleDelete = async (id) => {
    try {
      await fetch(`${API_URL}/safety/documents/${id}`, { method: "DELETE" });
      await fetchDocs();
      if (viewDoc?.id === id) setViewDoc(null);
    } catch { setMsg("Delete failed."); }
  };

  const openDoc = async (doc) => {
    try {
      const r = await fetch(`${API_URL}/safety/documents/${doc.id}`);
      if (r.ok) {
        const full = await r.json();
        setViewDoc(full);
      }
    } catch { setMsg("Could not load document."); }
  };

  const fileIcon = (type) => {
    if (!type) return "📄";
    if (type.includes("pdf")) return "📕";
    if (type.includes("image")) return "🖼";
    if (type.includes("sheet") || type.includes("excel") || type.includes("xlsx")) return "📊";
    if (type.includes("word") || type.includes("doc")) return "📝";
    return "📄";
  };

  const formatSize = (bytes) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }} onClick={onClose}>
      <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderTop: `4px solid ${C.blue}`, borderRadius: 8, padding: 28, width: 600, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>FIELD RESOURCES</div>
            <div style={{ fontSize: 11, color: C.muted }}>Tank charts, bucket counts, SOPs, equipment specs — reference files your crew uses in the field</div>
          </div>
          {isAdmin && !showUpload && <Btn small onClick={() => setShowUpload(true)}>+ UPLOAD</Btn>}
        </div>

        {msg && <div style={{ fontSize: 12, fontWeight: 700, color: msg.includes("fail") ? C.red : C.green, marginBottom: 10 }}>{msg}</div>}

        {showUpload && (
          <div style={{ background: C.steel, border: `1px solid ${C.border}`, borderRadius: 6, padding: 14, marginBottom: 16 }}>
            <div style={{ marginBottom: 8 }}>
              <label style={labelStyle}>DOCUMENT NAME *</label>
              <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="Tank Volume Chart, Bucket Count Sheet, etc." />
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={labelStyle}>DESCRIPTION</label>
              <input style={inputStyle} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Optional description" />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>FILE (PDF, Image, Excel, Word)</label>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.doc,.docx" onChange={e => {
                const f = e.target.files[0];
                setFile(f);
                if (f && !name.trim()) {
                  // Auto-fill name from filename (strip extension)
                  const n = f.name.replace(/\.[^/.]+$/, "");
                  setName(n);
                }
              }} style={{ fontSize: 11 }} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn small disabled={uploading} onClick={handleUpload}>{uploading ? "UPLOADING..." : "UPLOAD"}</Btn>
              <Btn small variant="ghost" onClick={() => { setShowUpload(false); setName(""); setDesc(""); setFile(null); }}>CANCEL</Btn>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: 20, color: C.muted }}>Loading...</div>
        ) : docs.length === 0 ? (
          <div style={{ textAlign: "center", padding: 30, color: C.muted, fontSize: 13 }}>No documents uploaded yet.</div>
        ) : (
          docs.map(doc => (
            <div key={doc.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `1px solid ${C.border}22`, cursor: "pointer" }}
              onClick={() => openDoc(doc)}
              onMouseEnter={e => e.currentTarget.style.background = C.steel}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <span style={{ fontSize: 24 }}>{fileIcon(doc.file_type)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{doc.name}</div>
                {doc.description && <div style={{ fontSize: 11, color: C.muted }}>{doc.description}</div>}
                <div style={{ fontSize: 10, color: C.muted }}>{formatSize(doc.file_size)} · {new Date(doc.created_at).toLocaleDateString()}</div>
              </div>
              {isAdmin && (
                <button onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }}
                  style={{ background: "transparent", border: "none", color: "#ccc", cursor: "pointer", fontSize: 14 }}
                  onMouseEnter={e => { e.currentTarget.style.color = C.red; }}
                  onMouseLeave={e => { e.currentTarget.style.color = "#ccc"; }}>🗑</button>
              )}
            </div>
          ))
        )}

        {viewDoc && (
          <div style={{ marginTop: 16, background: C.steel, border: `1px solid ${C.border}`, borderRadius: 6, padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{viewDoc.name}</div>
              <button onClick={() => setViewDoc(null)} style={{ background: "transparent", border: "none", fontSize: 16, color: C.muted, cursor: "pointer" }}>×</button>
            </div>
            {viewDoc.file_data && viewDoc.file_type?.includes("image") && (
              <img src={viewDoc.file_data} alt={viewDoc.name} style={{ maxWidth: "100%", borderRadius: 4 }} />
            )}
            {viewDoc.file_data && viewDoc.file_type?.includes("pdf") && (
              <div style={{ fontSize: 12, color: C.muted }}>
                <a href={viewDoc.file_data} download={viewDoc.name + ".pdf"} style={{ color: C.blue, fontWeight: 700 }}>Download PDF</a>
              </div>
            )}
            {viewDoc.file_data && !viewDoc.file_type?.includes("image") && !viewDoc.file_type?.includes("pdf") && (
              <div style={{ fontSize: 12, color: C.muted }}>
                <a href={viewDoc.file_data} download={viewDoc.name} style={{ color: C.blue, fontWeight: 700 }}>Download File</a>
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
          <Btn variant="ghost" onClick={onClose}>CLOSE</Btn>
        </div>
      </div>
    </div>
  );
}

export default CompanyDocumentsModal;
