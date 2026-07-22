import { useState, useMemo, useEffect } from "react";
import { useQueryPrefill } from "./useQueryPrefill.js";
import { C } from "./config.js";
import { api } from "./api.js";
import { Btn, FilterBtn, ModalWrap, inputStyle, labelStyle, ConfirmModal } from "./SharedUI.jsx";
import { useApp } from "./AppContext.jsx";

const ASSET_TYPES = ["Truck", "Trailer", "Separator", "Tank", "Generator", "Pump Unit", "Other"];
// Getters, not values (SharedUI idiom) — a module-level map with eager C reads
// freezes the load-time theme into the status chips.
const STATUS_COLORS = {
  available: {
    label: "AVAILABLE",
    get color() {
      return C.green;
    },
    get bg() {
      return C.greenB;
    },
  },
  deployed: {
    label: "DEPLOYED",
    get color() {
      return C.yellow;
    },
    get bg() {
      return C.yellowB;
    },
  },
  maintenance: {
    label: "MAINTENANCE",
    get color() {
      return C.red;
    },
    get bg() {
      return C.redB;
    },
  },
};

function AssetsPage({ jobs }) {
  const { assets, refreshAssets } = useApp();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  useQueryPrefill("q", setSearch); // v28.394 — search results arrive pre-filtered
  const [showAdd, setShowAdd] = useState(false);
  const [editAsset, setEditAsset] = useState(null);
  const [assignAsset, setAssignAsset] = useState(null);
  const [deleteConfirmAsset, setDeleteConfirmAsset] = useState(null);
  const [msg, setMsg] = useState("");

  // Add form state
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [newSerial, setNewSerial] = useState("");
  const [newNotes, setNewNotes] = useState("");

  // Edit form state
  const [eName, setEName] = useState("");
  const [eType, setEType] = useState("");
  const [eUnit, setEUnit] = useState("");
  const [eSerial, setESerial] = useState("");
  const [eNotes, setENotes] = useState("");
  const [eStatus, setEStatus] = useState("");

  // Assign form state
  const [assignJobId, setAssignJobId] = useState("");

  const [pgW, setPgW] = useState(window.innerWidth);
  useEffect(() => {
    const h = () => setPgW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  const isMob = pgW < 900;

  const filtered = useMemo(() => {
    let list = [...(assets || [])];
    if (filter !== "all") list = list.filter((a) => a.status === filter);
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(
        (a) =>
          (a.name || "").toLowerCase().includes(s) ||
          (a.type || "").toLowerCase().includes(s) ||
          (a.unit_number || "").toLowerCase().includes(s) ||
          (a.serial_vin || "").toLowerCase().includes(s),
      );
    }
    return list;
  }, [assets, filter, search]);

  const activeJobs = useMemo(() => (jobs || []).filter((j) => j.status !== "Completed"), [jobs]);

  const handleAdd = async () => {
    if (!newName.trim()) {
      setMsg("Name required");
      return;
    }
    try {
      await api.post("/assets", {
        name: newName.trim(),
        type: newType || null,
        unit_number: newUnit.trim() || null,
        serial_vin: newSerial.trim() || null,
        notes: newNotes.trim() || null,
      });
      await refreshAssets();
      setNewName("");
      setNewType("");
      setNewUnit("");
      setNewSerial("");
      setNewNotes("");
      setShowAdd(false);
      setMsg("Asset added.");
      setTimeout(() => setMsg(""), 3000);
    } catch {
      setMsg("Create failed");
    }
  };

  const handleSaveEdit = async () => {
    if (!eName.trim()) {
      setMsg("Name required");
      return;
    }
    try {
      await api.put(`/assets/${editAsset.id}`, {
        name: eName.trim(),
        type: eType || null,
        unit_number: eUnit.trim() || null,
        serial_vin: eSerial.trim() || null,
        notes: eNotes.trim() || null,
        status: eStatus,
      });
      await refreshAssets();
      setEditAsset(null);
      setMsg("Saved.");
      setTimeout(() => setMsg(""), 3000);
    } catch {
      setMsg("Save failed");
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.del(`/assets/${id}`);
      await refreshAssets();
      setEditAsset(null);
    } catch {
      setMsg("Delete failed");
    }
  };

  const handleAssign = async () => {
    if (!assignJobId) {
      setMsg("Select a job");
      return;
    }
    try {
      await api.post(`/assets/${assignAsset.id}/assign`, { job_id: parseInt(assignJobId) });
      await refreshAssets();
      setAssignAsset(null);
      setAssignJobId("");
      setMsg("Asset deployed.");
      setTimeout(() => setMsg(""), 3000);
    } catch {
      setMsg("Assign failed");
    }
  };

  const handleUnassign = async (id) => {
    try {
      await api.post(`/assets/${id}/unassign`);
      await refreshAssets();
      setMsg("Asset returned.");
      setTimeout(() => setMsg(""), 3000);
    } catch {
      setMsg("Unassign failed");
    }
  };

  const openEdit = (a) => {
    setEditAsset(a);
    setEName(a.name);
    setEType(a.type || "");
    setEUnit(a.unit_number || "");
    setESerial(a.serial_vin || "");
    setENotes(a.notes || "");
    setEStatus(a.status);
  };

  const statusBadge = (s) => {
    const cfg = STATUS_COLORS[s] || STATUS_COLORS.available;
    return (
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          padding: "2px 8px",
          borderRadius: 3,
          background: cfg.bg,
          color: cfg.color,
          letterSpacing: "0.06em",
          border: `1px solid ${cfg.color}33`,
        }}
      >
        {cfg.label}
      </span>
    );
  };

  const counts = useMemo(
    () => ({
      all: (assets || []).length,
      available: (assets || []).filter((a) => a.status === "available").length,
      deployed: (assets || []).filter((a) => a.status === "deployed").length,
      maintenance: (assets || []).filter((a) => a.status === "maintenance").length,
    }),
    [assets],
  );

  return (
    <div style={{ padding: isMob ? "16px 12px" : "24px 28px" }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Assets</h1>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
            {counts.available} available · {counts.deployed} deployed · {counts.maintenance} maintenance
          </div>
        </div>
        <Btn onClick={() => setShowAdd((s) => !s)}>{showAdd ? "CANCEL" : "+ ADD ASSET"}</Btn>
      </div>

      {msg && (
        <div
          style={{
            padding: "8px 14px",
            background: msg.includes("fail") || msg.includes("Error") || msg.includes("required") ? C.redB : C.greenB,
            borderRadius: 4,
            fontSize: 12,
            fontWeight: 700,
            color: msg.includes("fail") || msg.includes("Error") || msg.includes("required") ? C.red : C.green,
            marginBottom: 12,
          }}
        >
          {msg}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
        {[
          ["all", `All (${counts.all})`],
          ["available", `Available (${counts.available})`],
          ["deployed", `Deployed (${counts.deployed})`],
          ["maintenance", `Maintenance (${counts.maintenance})`],
        ].map(([k, label]) => (
          <FilterBtn key={k} active={filter === k} onClick={() => setFilter(k)}>
            {label}
          </FilterBtn>
        ))}
        <input
          style={{ ...inputStyle, width: 200, padding: "5px 10px", fontSize: 12 }}
          placeholder="Search assets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Add Asset Form */}
      {showAdd && (
        <div style={{ background: C.steel, border: `1px solid ${C.border}`, borderRadius: 6, padding: 16, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: isMob ? "1fr" : "1fr 1fr 1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>NAME *</label>
              <input style={inputStyle} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Truck #12" />
            </div>
            <div>
              <label style={labelStyle}>TYPE</label>
              <select style={inputStyle} value={newType} onChange={(e) => setNewType(e.target.value)}>
                <option value="">Select...</option>
                {ASSET_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>UNIT #</label>
              <input style={inputStyle} value={newUnit} onChange={(e) => setNewUnit(e.target.value)} placeholder="Unit number" />
            </div>
            <div>
              <label style={labelStyle}>SERIAL / VIN</label>
              <input style={inputStyle} value={newSerial} onChange={(e) => setNewSerial(e.target.value)} placeholder="Optional" />
            </div>
            <div>
              <label style={labelStyle}>NOTES</label>
              <input style={inputStyle} value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <Btn onClick={handleAdd}>ADD ASSET</Btn>
        </div>
      )}

      {/* Asset List */}
      {!isMob && (
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 100px 140px 120px 1fr 180px", background: C.navy, padding: "10px 16px" }}>
            {["NAME", "TYPE", "UNIT #", "SERIAL / VIN", "STATUS", "ASSIGNED TO", "ACTIONS"].map((h) => (
              <div key={h} style={{ fontSize: 10, fontWeight: 800, color: C.white, letterSpacing: "0.1em" }}>
                {h}
              </div>
            ))}
          </div>
          {filtered.map((a, i) => {
            const job = jobs.find((j) => j.id === a.assigned_job_id);
            return (
              <div
                key={a.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 100px 100px 140px 120px 1fr 180px",
                  padding: "10px 16px",
                  alignItems: "center",
                  borderBottom: `1px solid ${C.border}22`,
                  background: i % 2 === 0 ? C.cardBg : C.steel,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{a.name}</div>
                <div style={{ fontSize: 12, color: C.muted }}>{a.type || "—"}</div>
                <div style={{ fontSize: 12, color: C.muted, fontFamily: "monospace" }}>{a.unit_number || "—"}</div>
                <div style={{ fontSize: 11, color: C.muted, fontFamily: "monospace" }}>{a.serial_vin || "—"}</div>
                <div>{statusBadge(a.status)}</div>
                <div style={{ fontSize: 12, color: job ? C.text : C.muted }}>{job ? `#${job.id} — ${job.customer}` : "—"}</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button
                    className="fti-btn"
                    onClick={() => openEdit(a)}
                    style={{
                      background: "transparent",
                      border: `1px solid ${C.blue}44`,
                      color: C.blue,
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "3px 8px",
                      borderRadius: 3,
                      cursor: "pointer",
                    }}
                  >
                    EDIT
                  </button>
                  {a.status === "available" && (
                    <button
                      className="fti-btn"
                      onClick={() => {
                        setAssignAsset(a);
                        setAssignJobId("");
                      }}
                      style={{
                        background: "transparent",
                        border: `1px solid ${C.green}44`,
                        color: C.green,
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "3px 8px",
                        borderRadius: 3,
                        cursor: "pointer",
                      }}
                    >
                      DEPLOY
                    </button>
                  )}
                  {a.status === "deployed" && (
                    <button
                      className="fti-btn"
                      onClick={() => handleUnassign(a.id)}
                      style={{
                        background: "transparent",
                        border: `1px solid ${C.orange}44`,
                        color: C.orange,
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "3px 8px",
                        borderRadius: 3,
                        cursor: "pointer",
                      }}
                    >
                      RETURN
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && <div style={{ padding: 20, textAlign: "center", color: C.muted, fontSize: 13 }}>No assets found</div>}
        </div>
      )}

      {/* Mobile */}
      {isMob &&
        filtered.map((a) => {
          const job = jobs.find((j) => j.id === a.assigned_job_id);
          return (
            <div key={a.id} style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 6, padding: 14, marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{a.name}</span>
                {statusBadge(a.status)}
              </div>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>
                {[a.type, a.unit_number ? `Unit: ${a.unit_number}` : null].filter(Boolean).join(" · ") || "—"}
              </div>
              {job && (
                <div style={{ fontSize: 12, color: C.text, marginBottom: 6 }}>
                  Work Order #{job.id} — {job.customer}
                </div>
              )}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  className="fti-btn"
                  onClick={() => openEdit(a)}
                  style={{
                    background: "transparent",
                    border: `1px solid ${C.blue}44`,
                    color: C.blue,
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "5px 12px",
                    borderRadius: 4,
                    cursor: "pointer",
                  }}
                >
                  EDIT
                </button>
                {a.status === "available" && (
                  <button
                    className="fti-btn"
                    onClick={() => {
                      setAssignAsset(a);
                      setAssignJobId("");
                    }}
                    style={{
                      background: "transparent",
                      border: `1px solid ${C.green}44`,
                      color: C.green,
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "5px 12px",
                      borderRadius: 4,
                      cursor: "pointer",
                    }}
                  >
                    DEPLOY
                  </button>
                )}
                {a.status === "deployed" && (
                  <button
                    className="fti-btn"
                    onClick={() => handleUnassign(a.id)}
                    style={{
                      background: "transparent",
                      border: `1px solid ${C.orange}44`,
                      color: C.orange,
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "5px 12px",
                      borderRadius: 4,
                      cursor: "pointer",
                    }}
                  >
                    RETURN
                  </button>
                )}
              </div>
            </div>
          );
        })}
      {isMob && filtered.length === 0 && <div style={{ padding: 20, textAlign: "center", color: C.muted, fontSize: 13 }}>No assets found</div>}

      {/* Edit Modal */}
      {editAsset && (
        <ModalWrap title={`Edit Asset — ${editAsset.name}`} onClose={() => setEditAsset(null)} width={440}>
          <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>NAME *</label>
              <input style={inputStyle} value={eName} onChange={(e) => setEName(e.target.value)} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={labelStyle}>TYPE</label>
                <select style={inputStyle} value={eType} onChange={(e) => setEType(e.target.value)}>
                  <option value="">Select...</option>
                  {ASSET_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>STATUS</label>
                <select style={inputStyle} value={eStatus} onChange={(e) => setEStatus(e.target.value)}>
                  <option value="available">Available</option>
                  <option value="deployed">Deployed</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={labelStyle}>UNIT #</label>
                <input style={inputStyle} value={eUnit} onChange={(e) => setEUnit(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>SERIAL / VIN</label>
                <input style={inputStyle} value={eSerial} onChange={(e) => setESerial(e.target.value)} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>NOTES</label>
              <input style={inputStyle} value={eNotes} onChange={(e) => setENotes(e.target.value)} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={handleSaveEdit}>SAVE</Btn>
            <Btn onClick={() => setEditAsset(null)} variant="ghost">
              CANCEL
            </Btn>
            <button
              className="fti-btn"
              onClick={() => setDeleteConfirmAsset(editAsset)}
              style={{
                marginLeft: "auto",
                background: "transparent",
                border: `1px solid ${C.red}33`,
                color: C.red,
                fontSize: 12,
                fontWeight: 700,
                padding: "6px 14px",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              DELETE
            </button>
          </div>
        </ModalWrap>
      )}

      {/* Assign/Deploy Modal */}
      {assignAsset && (
        <ModalWrap title={`Deploy — ${assignAsset.name}`} onClose={() => setAssignAsset(null)} width={380}>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>ASSIGN TO WORK ORDER</label>
            <select style={inputStyle} value={assignJobId} onChange={(e) => setAssignJobId(e.target.value)}>
              <option value="">Select job...</option>
              {activeJobs.map((j) => (
                <option key={j.id} value={j.id}>
                  #{j.id} — {j.customer} ({j.wells?.map((w) => w.well_name || w).join(", ")})
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={handleAssign}>DEPLOY</Btn>
            <Btn onClick={() => setAssignAsset(null)} variant="ghost">
              CANCEL
            </Btn>
          </div>
        </ModalWrap>
      )}

      {deleteConfirmAsset && (
        <ConfirmModal
          title="Delete Asset?"
          message={`${deleteConfirmAsset.name || "This asset"} will be permanently deleted. This cannot be undone.`}
          yesLabel="Delete"
          onYes={() => {
            const id = deleteConfirmAsset.id;
            setDeleteConfirmAsset(null);
            handleDelete(id);
          }}
          onCancel={() => setDeleteConfirmAsset(null)}
        />
      )}
    </div>
  );
}

export default AssetsPage;
