import { useState, useEffect, useMemo } from "react";
import { C, API_URL } from "./config.js";
import { Btn, inputStyle, labelStyle, ModalWrap } from "./SharedUI.jsx";
import { useApp } from "./AppContext.jsx";

const CERT_TYPES = ["H2S", "Forklift", "Manlift", "Confined Space", "First Aid / CPR", "Fall Protection", "Hazmat", "CDL", "Site Specific", "Other"];

function SafetyPage() {
  const { users, currentUser } = useApp();
  const isAdmin = ["owner", "admin"].includes(currentUser?.role);
  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterUser, setFilterUser] = useState("All");
  const [filterType, setFilterType] = useState("All");
  const [showAdd, setShowAdd] = useState(false);
  const [editCert, setEditCert] = useState(null);

  // Add/Edit form state
  const [formUserId, setFormUserId] = useState("");
  const [formType, setFormType] = useState("");
  const [formName, setFormName] = useState("");
  const [formIssuer, setFormIssuer] = useState("");
  const [formIssueDate, setFormIssueDate] = useState("");
  const [formExpDate, setFormExpDate] = useState("");
  const [formCertNum, setFormCertNum] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [msg, setMsg] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [importPreview, setImportPreview] = useState(null);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);

  const [winW, setWinW] = useState(window.innerWidth);
  useEffect(() => { const h = () => setWinW(window.innerWidth); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, []);
  const isMob = winW < 900;

  const fetchCerts = async () => {
    try {
      const r = await fetch(`${API_URL}/safety/certs`);
      if (r.ok) setCerts(await r.json());
    } catch (err) { console.error("Fetch certs failed:", err); }
    setLoading(false);
  };

  useEffect(() => { fetchCerts(); }, []);

  const filtered = useMemo(() => {
    let list = [...certs];
    if (filterUser !== "All") list = list.filter(c => c.user_id === filterUser);
    if (filterType !== "All") list = list.filter(c => c.cert_type === filterType);
    return list;
  }, [certs, filterUser, filterType]);

  const expiringSoon = useMemo(() => {
    const now = new Date();
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return certs.filter(c => c.expiration_date && new Date(c.expiration_date) <= thirtyDays && new Date(c.expiration_date) >= now);
  }, [certs]);

  const expired = useMemo(() => {
    const now = new Date();
    return certs.filter(c => c.expiration_date && new Date(c.expiration_date) < now);
  }, [certs]);

  const resetForm = () => {
    setFormUserId(""); setFormType(""); setFormName(""); setFormIssuer("");
    setFormIssueDate(""); setFormExpDate(""); setFormCertNum(""); setFormNotes("");
  };

  const openAdd = () => { resetForm(); setEditCert(null); setShowAdd(true); };

  const openEdit = (c) => {
    setFormUserId(c.user_id); setFormType(c.cert_type); setFormName(c.cert_name);
    setFormIssuer(c.issuer || ""); setFormIssueDate((c.issue_date || "").slice(0, 10));
    setFormExpDate((c.expiration_date || "").slice(0, 10)); setFormCertNum(c.cert_number || "");
    setFormNotes(c.notes || ""); setEditCert(c); setShowAdd(true);
  };

  const handleSave = async () => {
    if (!formUserId || !formType || !formName) { setMsg("Employee, type, and name are required."); return; }
    const payload = {
      user_id: formUserId, cert_type: formType, cert_name: formName,
      issuer: formIssuer || null, issue_date: formIssueDate || null,
      expiration_date: formExpDate || null, cert_number: formCertNum || null, notes: formNotes || null,
    };
    try {
      const url = editCert ? `${API_URL}/safety/certs/${editCert.id}` : `${API_URL}/safety/certs`;
      const r = await fetch(url, {
        method: editCert ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) { setMsg("Save failed."); return; }
      await fetchCerts();
      setShowAdd(false); resetForm(); setEditCert(null);
      setMsg(editCert ? "Updated." : "Certification added.");
      setTimeout(() => setMsg(""), 3000);
    } catch { setMsg("Error saving."); }
  };

  const handleDelete = async (id) => {
    try {
      await fetch(`${API_URL}/safety/certs/${id}`, { method: "DELETE" });
      await fetchCerts();
    } catch { setMsg("Delete failed."); }
  };

  const certStatus = (c) => {
    if (!c.expiration_date) return { label: "NO EXPIRY", color: C.blue, bg: "#e8f0fb" };
    const exp = new Date(c.expiration_date);
    const now = new Date();
    const days = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
    if (days < 0) return { label: "EXPIRED", color: C.red, bg: "#fdecea" };
    if (days <= 30) return { label: `${days}d LEFT`, color: "#8a6500", bg: "#fdf5d8" };
    return { label: "CURRENT", color: C.green, bg: "#e6f5ec" };
  };

  const activeUsers = (users || []).filter(u => u.is_active !== false);
  const uniqueTypes = [...new Set(certs.map(c => c.cert_type))].sort();

  return (
    <div style={{ padding: isMob ? "16px 12px" : "24px 28px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Safety</h1>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
            {certs.length} certification{certs.length !== 1 ? "s" : ""} on file
            {expiringSoon.length > 0 && <span style={{ color: "#8a6500", fontWeight: 700, marginLeft: 12 }}>⚠ {expiringSoon.length} expiring within 30 days</span>}
            {expired.length > 0 && <span style={{ color: C.red, fontWeight: 700, marginLeft: 12 }}>✕ {expired.length} expired</span>}
          </div>
        </div>
        {isAdmin && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Btn onClick={openAdd}>+ ADD CERTIFICATION</Btn>
            <Btn variant="ghost" onClick={() => setShowImport(true)}>IMPORT FROM EXCEL</Btn>
            <a href="/Safety_Cert_Import_Template.xlsx" download style={{ textDecoration: "none" }}>
              <Btn variant="ghost">DOWNLOAD TEMPLATE</Btn>
            </a>
          </div>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div>
          <label style={labelStyle}>EMPLOYEE</label>
          <select style={{ ...inputStyle, width: 200 }} value={filterUser} onChange={e => setFilterUser(e.target.value)}>
            <option value="All">All Employees</option>
            {activeUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>CERTIFICATION TYPE</label>
          <select style={{ ...inputStyle, width: 180 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="All">All Types</option>
            {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {msg && <div style={{ fontSize: 12, fontWeight: 700, color: msg.includes("fail") || msg.includes("Error") ? C.red : C.green, marginBottom: 12 }}>{msg}</div>}

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: C.muted }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: C.muted, fontSize: 14 }}>
          {certs.length === 0 ? "No certifications on file yet. Add one to get started." : "No certifications match your filters."}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          {!isMob && (
            <div style={{ border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <div style={{ minWidth: 800 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 1fr 120px 120px 80px 80px", background: C.darkBlue, padding: "10px 14px" }}>
                    {["EMPLOYEE", "TYPE", "CERTIFICATION", "ISSUED", "EXPIRES", "STATUS", ""].map(h => (
                      <div key={h} style={{ fontSize: 9, fontWeight: 800, color: C.white, letterSpacing: "0.08em" }}>{h}</div>
                    ))}
                  </div>
                  {filtered.map((c, i) => {
                    const st = certStatus(c);
                    return (
                      <div key={c.id} style={{ display: "grid", gridTemplateColumns: "1fr 120px 1fr 120px 120px 80px 80px", padding: "10px 14px", borderBottom: `1px solid ${C.border}22`, background: i % 2 === 0 ? C.cardBg : C.steel, cursor: isAdmin ? "pointer" : "default" }}
                        onClick={() => isAdmin && openEdit(c)}
                        onMouseEnter={e => { if (isAdmin) e.currentTarget.style.background = "#e8f0fb"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = i % 2 === 0 ? C.cardBg : C.steel; }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{c.user_name}</div>
                        <div style={{ fontSize: 11, color: C.muted, fontWeight: 700 }}>{c.cert_type}</div>
                        <div style={{ fontSize: 12, color: C.text }}>{c.cert_name}{c.cert_number ? ` (#${c.cert_number})` : ""}</div>
                        <div style={{ fontSize: 12, color: C.muted }}>{c.issue_date ? new Date(c.issue_date).toLocaleDateString() : "—"}</div>
                        <div style={{ fontSize: 12, color: C.muted }}>{c.expiration_date ? new Date(c.expiration_date).toLocaleDateString() : "—"}</div>
                        <div><span style={{ fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 3, background: st.bg, color: st.color, letterSpacing: "0.04em" }}>{st.label}</span></div>
                        <div>
                          {isAdmin && (
                            <button onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }} style={{ background: "transparent", border: "none", color: "#ccc", cursor: "pointer", fontSize: 14 }}
                              onMouseEnter={e => { e.currentTarget.style.color = C.red; }}
                              onMouseLeave={e => { e.currentTarget.style.color = "#ccc"; }}>🗑</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Mobile cards */}
          {isMob && filtered.map(c => {
            const st = certStatus(c);
            return (
              <div key={c.id} onClick={() => isAdmin && openEdit(c)} style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderLeft: `3px solid ${st.color}`, borderRadius: 6, padding: 14, marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{c.user_name}</span>
                  <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 3, background: st.bg, color: st.color }}>{st.label}</span>
                </div>
                <div style={{ fontSize: 12, color: C.text, marginBottom: 4 }}>{c.cert_type} — {c.cert_name}</div>
                {c.expiration_date && <div style={{ fontSize: 11, color: C.muted }}>Expires: {new Date(c.expiration_date).toLocaleDateString()}</div>}
              </div>
            );
          })}
        </>
      )}

      {/* Add/Edit modal */}
      {showAdd && (
        <ModalWrap title={editCert ? "EDIT CERTIFICATION" : "ADD CERTIFICATION"} onClose={() => { setShowAdd(false); resetForm(); setEditCert(null); }} width={520}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>EMPLOYEE *</label>
              <select style={inputStyle} value={formUserId} onChange={e => setFormUserId(e.target.value)}>
                <option value="">Select employee...</option>
                {activeUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>CERTIFICATION TYPE *</label>
              <select style={inputStyle} value={formType} onChange={e => { setFormType(e.target.value); if (!formName) setFormName(e.target.value); }}>
                <option value="">Select type...</option>
                {CERT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>CERTIFICATION NAME *</label>
            <input style={inputStyle} value={formName} onChange={e => setFormName(e.target.value)} placeholder="H2S Alive, OSHA 30-Hour, etc." />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>ISSUER / PROVIDER</label>
              <input style={inputStyle} value={formIssuer} onChange={e => setFormIssuer(e.target.value)} placeholder="SafeLand, OSHA, etc." />
            </div>
            <div>
              <label style={labelStyle}>CERTIFICATE NUMBER</label>
              <input style={inputStyle} value={formCertNum} onChange={e => setFormCertNum(e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>ISSUE DATE</label>
              <input type="date" style={inputStyle} value={formIssueDate} onChange={e => setFormIssueDate(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>EXPIRATION DATE</label>
              <input type="date" style={inputStyle} value={formExpDate} onChange={e => setFormExpDate(e.target.value)} />
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>NOTES</label>
            <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 56 }} value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="Optional notes..." />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={handleSave}>{editCert ? "SAVE CHANGES" : "ADD CERTIFICATION"}</Btn>
            <Btn variant="ghost" onClick={() => { setShowAdd(false); resetForm(); setEditCert(null); }}>CANCEL</Btn>
          </div>
        </ModalWrap>
      )}

      {/* Import from Excel modal */}
      {showImport && (
        <ModalWrap title="IMPORT CERTIFICATIONS FROM EXCEL" onClose={() => { setShowImport(false); setImportPreview(null); setImportFile(null); }} width={580}>
          {!importPreview ? (
            <>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 16, lineHeight: 1.6 }}>
                Upload an Excel file using the standard template. Employee names must exactly match
                users in the system. Download the template first if you don't have it.
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>SELECT EXCEL FILE (.xlsx)</label>
                <input type="file" accept=".xlsx,.xls" onChange={e => setImportFile(e.target.files[0])}
                  style={{ fontSize: 13, color: C.text }} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn disabled={!importFile || importing} onClick={async () => {
                  if (!importFile) return;
                  setImporting(true);
                  try {
                    const formData = new FormData();
                    formData.append("file", importFile);
                    const r = await fetch(`${API_URL}/safety/import?dry_run=true`, { method: "POST", body: formData });
                    if (r.ok) { setImportPreview(await r.json()); }
                    else { const d = await r.json(); setMsg(d.error || "Upload failed."); }
                  } catch { setMsg("Upload failed."); }
                  setImporting(false);
                }}>{importing ? "ANALYZING..." : "PREVIEW IMPORT"}</Btn>
                <a href="/Safety_Cert_Import_Template.xlsx" download style={{ textDecoration: "none" }}>
                  <Btn variant="ghost">DOWNLOAD TEMPLATE</Btn>
                </a>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 13, color: C.text, marginBottom: 12, lineHeight: 1.6 }}>
                <strong>{importPreview.valid}</strong> certifications ready to import.
                {importPreview.errors > 0 && (
                  <span style={{ color: C.red, marginLeft: 8 }}>
                    <strong>{importPreview.errors}</strong> row{importPreview.errors !== 1 ? "s" : ""} with errors (will be skipped).
                  </span>
                )}
              </div>

              {importPreview.error_details?.length > 0 && (
                <div style={{ background: "#fdf0f0", border: `1px solid ${C.red}33`, borderRadius: 6, padding: 12, marginBottom: 12, maxHeight: 150, overflowY: "auto" }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: C.red, marginBottom: 6 }}>ERRORS</div>
                  {importPreview.error_details.map((e, i) => (
                    <div key={i} style={{ fontSize: 11, color: C.text, marginBottom: 4 }}>
                      Row {e.row}: {e.error}
                    </div>
                  ))}
                </div>
              )}

              {importPreview.sample?.length > 0 && (
                <div style={{ background: C.steel, border: `1px solid ${C.border}`, borderRadius: 6, padding: 12, marginBottom: 16, maxHeight: 200, overflowY: "auto" }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, marginBottom: 6 }}>PREVIEW (first {importPreview.sample.length})</div>
                  {importPreview.sample.map((s, i) => (
                    <div key={i} style={{ fontSize: 11, color: C.text, marginBottom: 4, borderBottom: `1px solid ${C.border}22`, paddingBottom: 4 }}>
                      <strong>{s.employee_name}</strong> — {s.cert_type}: {s.cert_name}
                      {s.expiration_date && <span style={{ color: C.muted, marginLeft: 8 }}>exp {s.expiration_date}</span>}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", gap: 8 }}>
                <Btn disabled={importPreview.valid === 0 || importing} onClick={async () => {
                  setImporting(true);
                  try {
                    const formData = new FormData();
                    formData.append("file", importFile);
                    const r = await fetch(`${API_URL}/safety/import`, { method: "POST", body: formData });
                    if (r.ok) {
                      const d = await r.json();
                      await fetchCerts();
                      setShowImport(false); setImportPreview(null); setImportFile(null);
                      setMsg(`Imported ${d.imported} certification${d.imported !== 1 ? "s" : ""}.`);
                      setTimeout(() => setMsg(""), 5000);
                    } else { setMsg("Import failed."); }
                  } catch { setMsg("Import failed."); }
                  setImporting(false);
                }}>{importing ? "IMPORTING..." : `IMPORT ${importPreview.valid} CERTIFICATIONS`}</Btn>
                <Btn variant="ghost" onClick={() => { setImportPreview(null); setImportFile(null); }}>BACK</Btn>
              </div>
            </>
          )}
        </ModalWrap>
      )}
    </div>
  );
}

export default SafetyPage;
