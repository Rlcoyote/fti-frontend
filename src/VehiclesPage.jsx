import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { C, API_URL } from "./config.js";
import { Btn, FilterBtn, ModalWrap, inputStyle, labelStyle, ConfirmModal, NoticeModal } from "./SharedUI.jsx";
import { useApp } from "./AppContext.jsx";

// v28.174 — Vehicles master page. Companion to AssetsPage; the two together
// form the "Fleet & Assets" UX group (positioned adjacent in the top nav).
//
// Backend: /api/vehicles (CRUD) + /api/vehicles/import (multipart xlsx upload).
// Schema in migrations/008_dvir_foundation.sql — vehicle_number is GENERATED
// from the last 4 of VIN, never written from the UI.
//
// Permission posture (matches v28.173 backend gates):
//   - Page visible at can("view_inventory")
//   - Add / Edit / Retire / Import controls visible at can("manage_settings")

// ─── Display helpers ────────────────────────────────────────────────────────

// Build the human-readable Type string from the structured columns. Mirrors
// the section labels on the MASTER spreadsheet. Used in the Type filter
// dropdown and the row display.
const KIND_LABELS = {
  pickup: "Pickups",
  tractor: "Tractors",
  trailer: "Trailers",
  straight_truck: "Straight Trucks",
  other: "Other",
};
const HITCH_LABELS = {
  tongue_pull: "Tongue Pull",
  gooseneck: "Gooseneck",
  n_a: null,
};
const SUBTYPE_LABELS = {
  "3_4_ton": "3/4 Ton",
  "1_ton": "1 Ton",
  heavy_duty: "Heavy Duty",
  rig_up_truck: "Rig-Up Truck",
  rig_up_pole: "Rig-Up Pole",
  rig_up: "Rig-Up Equipment",
  sand_trap: "Sand Trap",
  travel: "Travel Trailers",
  utility: "Utility Trailers",
  separator: "Separators",
  pipe: "Pipe Trailers",
  flare_stack: "Flare Stacks",
  light_tower_water_tank: "Light Towers & Water Tanks",
  tester: "Tester Trailers",
  light_tower: "Light Towers",
};

function vehicleTypeDisplay(v) {
  const parts = [KIND_LABELS[v.vehicle_kind] || v.vehicle_kind || "Unclassified"];
  const h = HITCH_LABELS[v.hitch_type];
  if (h) parts.push(h);
  const s = SUBTYPE_LABELS[v.subtype];
  if (s) parts.push(s);
  return parts.join(" — ");
}

// Registration status from YYYY-MM string. Registrations expire on the LAST
// day of the month they're given (per the master spreadsheet convention), so
// comparison is at month-granularity.
function regStatus(regExpires) {
  if (!regExpires) return "unknown";
  const m = String(regExpires).match(/^(\d{4})-(\d{2})/);
  if (!m) return "unknown";
  const exp = parseInt(m[1], 10) * 12 + parseInt(m[2], 10);
  const today = new Date();
  const cur = today.getFullYear() * 12 + (today.getMonth() + 1);
  if (exp < cur) return "expired";
  if (exp === cur) return "due"; // current month — registration runs out at month-end
  if (exp === cur + 1) return "due_soon"; // next month — heads-up
  return "ok";
}

const REG_FILL = {
  expired: "#fdecea",
  due: "#fff2cc",
  due_soon: "#fff8e1",
  ok: "transparent",
  unknown: "transparent",
};
const REG_LABEL_COLOR = {
  expired: C.red,
  due: "#8a6500",
  due_soon: "#9a7400",
  ok: C.muted,
  unknown: C.muted,
};

const LIFECYCLE_COLORS = {
  active: { color: C.green, bg: "#e6f5ec", label: "ACTIVE" },
  retired: { color: C.muted, bg: "#eeeeee", label: "RETIRED" },
};

// ─── Page ───────────────────────────────────────────────────────────────────

function VehiclesPage() {
  const { can, users } = useApp();
  const canManage = can && can("manage_settings");

  // Fetched data
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all"); // matches a vehicleTypeDisplay() string
  const [filterStatus, setFilterStatus] = useState("active"); // active | retired | all
  const [filterSamsara, setFilterSamsara] = useState("any"); // any | linked | unlinked

  // Edit / retire / import / add
  const [editV, setEditV] = useState(null);
  const [retireConfirm, setRetireConfirm] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importing, setImporting] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState(null);
  const fileInputRef = useRef(null);

  // Add form state
  const [n, setN] = useState({
    year: "",
    make: "",
    model: "",
    color: "",
    vin: "",
    license_plate: "",
    registration_expires: "",
    vehicle_kind: "pickup",
    hitch_type: "",
    subtype: "",
    current_driver_id: "",
    samsara_vehicle_id: "",
    odometer: "",
    odometer_date: "",
    notes: "",
  });

  // Edit form state (populated when editV is set)
  const [e, setE] = useState({});

  // Viewport (mobile breakpoint)
  const [pgW, setPgW] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  useEffect(() => {
    const h = () => setPgW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  const isMob = pgW < 900;

  // Fetch
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== "all") params.set("status", filterStatus);
      if (filterSamsara === "linked") params.set("samsara", "true");
      if (filterSamsara === "unlinked") params.set("samsara", "false");
      const r = await fetch(`${API_URL}/vehicles?${params.toString()}`);
      if (!r.ok) {
        setNotice({ title: "Load failed", message: `Could not load vehicles (HTTP ${r.status}).`, variant: "error" });
        setVehicles([]);
      } else {
        setVehicles(await r.json());
      }
    } catch (err) {
      setNotice({ title: "Load failed", message: err.message || "Network error", variant: "error" });
    }
    setLoading(false);
  }, [filterStatus, filterSamsara]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Distinct types for the Type filter dropdown — sorted alphabetically
  const allTypes = useMemo(() => {
    const set = new Set(vehicles.map(vehicleTypeDisplay));
    return Array.from(set).sort();
  }, [vehicles]);

  // Filtered list
  const filtered = useMemo(() => {
    let list = vehicles;
    if (filterType !== "all") {
      list = list.filter((v) => vehicleTypeDisplay(v) === filterType);
    }
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter((v) =>
        [v.vehicle_number, v.vin, v.license_plate, v.make, v.model, v.current_driver_name, v.samsara_vehicle_id, v.notes]
          .filter(Boolean)
          .some((f) => String(f).toLowerCase().includes(s)),
      );
    }
    return list;
  }, [vehicles, filterType, search]);

  // ── Mutations ──

  const handleAdd = async () => {
    try {
      const r = await fetch(`${API_URL}/vehicles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: n.year ? parseInt(n.year, 10) : null,
          make: n.make || null,
          model: n.model || null,
          color: n.color || null,
          vin: n.vin || null,
          license_plate: n.license_plate || null,
          registration_expires: n.registration_expires || null,
          vehicle_kind: n.vehicle_kind,
          hitch_type: n.hitch_type || null,
          subtype: n.subtype || null,
          current_driver_id: n.current_driver_id || null,
          samsara_vehicle_id: n.samsara_vehicle_id || null,
          odometer: n.odometer ? parseInt(n.odometer, 10) : null,
          odometer_date: n.odometer_date || null,
          notes: n.notes || null,
        }),
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        setNotice({ title: "Add failed", message: data.error || `HTTP ${r.status}`, variant: "error" });
        return;
      }
      await refresh();
      setN({
        year: "",
        make: "",
        model: "",
        color: "",
        vin: "",
        license_plate: "",
        registration_expires: "",
        vehicle_kind: "pickup",
        hitch_type: "",
        subtype: "",
        current_driver_id: "",
        samsara_vehicle_id: "",
        odometer: "",
        odometer_date: "",
        notes: "",
      });
      setShowAdd(false);
      setNotice({ title: "Vehicle added", message: "", variant: "ok" });
    } catch (err) {
      setNotice({ title: "Add failed", message: err.message, variant: "error" });
    }
  };

  const openEdit = (v) => {
    setEditV(v);
    setE({
      year: v.year || "",
      make: v.make || "",
      model: v.model || "",
      color: v.color || "",
      vin: v.vin || "",
      license_plate: v.license_plate || "",
      registration_expires: v.registration_expires || "",
      vehicle_kind: v.vehicle_kind || "pickup",
      hitch_type: v.hitch_type || "",
      subtype: v.subtype || "",
      current_driver_id: v.current_driver_id || "",
      samsara_vehicle_id: v.samsara_vehicle_id || "",
      odometer: v.odometer || "",
      odometer_date: v.odometer_date ? String(v.odometer_date).slice(0, 10) : "",
      lifecycle_status: v.lifecycle_status || "active",
      notes: v.notes || "",
    });
  };

  const handleSaveEdit = async () => {
    try {
      const r = await fetch(`${API_URL}/vehicles/${editV.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: e.year === "" ? null : parseInt(e.year, 10),
          make: e.make || null,
          model: e.model || null,
          color: e.color || null,
          vin: e.vin || null,
          license_plate: e.license_plate || null,
          registration_expires: e.registration_expires || null,
          vehicle_kind: e.vehicle_kind || null,
          hitch_type: e.hitch_type || null,
          subtype: e.subtype || null,
          current_driver_id: e.current_driver_id || null,
          samsara_vehicle_id: e.samsara_vehicle_id || null,
          odometer: e.odometer === "" ? null : parseInt(e.odometer, 10),
          odometer_date: e.odometer_date || null,
          lifecycle_status: e.lifecycle_status || null,
          notes: e.notes || null,
        }),
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        setNotice({ title: "Save failed", message: data.error || `HTTP ${r.status}`, variant: "error" });
        return;
      }
      await refresh();
      setEditV(null);
      setNotice({ title: "Vehicle saved", message: "", variant: "ok" });
    } catch (err) {
      setNotice({ title: "Save failed", message: err.message, variant: "error" });
    }
  };

  const handleRetire = async (id) => {
    try {
      const r = await fetch(`${API_URL}/vehicles/${id}`, { method: "DELETE" });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        setNotice({ title: "Retire failed", message: data.error || `HTTP ${r.status}`, variant: "error" });
        return;
      }
      await refresh();
      setEditV(null);
      setNotice({ title: "Vehicle retired", message: "", variant: "ok" });
    } catch (err) {
      setNotice({ title: "Retire failed", message: err.message, variant: "error" });
    }
  };

  const handleSamsaraSync = async () => {
    setSyncing(true);
    try {
      const r = await fetch(`${API_URL}/samsara/sync`, { method: "POST" });
      const data = await r.json();
      if (!r.ok) {
        setNotice({ title: "Samsara sync failed", message: data.error || `HTTP ${r.status}`, variant: "error" });
      } else {
        setSyncResult(data);
        await refresh();
      }
    } catch (err) {
      setNotice({ title: "Samsara sync failed", message: err.message, variant: "error" });
    }
    setSyncing(false);
  };

  const handleImportFile = async (file) => {
    if (!file) return;
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch(`${API_URL}/vehicles/import`, { method: "POST", body: fd });
      const data = await r.json();
      if (!r.ok) {
        setNotice({ title: "Import failed", message: data.error || `HTTP ${r.status}`, variant: "error" });
      } else {
        setImportResult(data);
        await refresh();
      }
    } catch (err) {
      setNotice({ title: "Import failed", message: err.message, variant: "error" });
    }
    setImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Render ──

  const counts = {
    total: vehicles.length,
    expired: vehicles.filter((v) => regStatus(v.registration_expires) === "expired").length,
    due: vehicles.filter((v) => ["due", "due_soon"].includes(regStatus(v.registration_expires))).length,
    samsara_linked: vehicles.filter((v) => v.samsara_vehicle_id).length,
  };

  const lifecycleBadge = (s) => {
    const cfg = LIFECYCLE_COLORS[s] || LIFECYCLE_COLORS.active;
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

  return (
    <div style={{ padding: isMob ? "16px 12px" : "24px 28px" }}>
      {/* Header */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Vehicles</h1>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
            {counts.total} total · {counts.expired} reg expired · {counts.due} reg due · {counts.samsara_linked} on Samsara
          </div>
        </div>
        {canManage && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Btn onClick={handleSamsaraSync} variant="ghost" disabled={syncing || importing}>
              {syncing ? "SYNCING…" : "SYNC FROM SAMSARA"}
            </Btn>
            <Btn onClick={() => fileInputRef.current?.click()} variant="ghost" disabled={importing || syncing}>
              {importing ? "IMPORTING…" : "IMPORT FROM SPREADSHEET"}
            </Btn>
            <input ref={fileInputRef} type="file" accept=".xlsx" style={{ display: "none" }} onChange={(ev) => handleImportFile(ev.target.files?.[0])} />
            <Btn onClick={() => setShowAdd((s) => !s)}>{showAdd ? "CANCEL" : "+ ADD VEHICLE"}</Btn>
          </div>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
        <select style={{ ...inputStyle, width: 280, padding: "5px 10px", fontSize: 12 }} value={filterType} onChange={(ev) => setFilterType(ev.target.value)}>
          <option value="all">All types ({vehicles.length})</option>
          {allTypes.map((t) => (
            <option key={t} value={t}>
              {t} ({vehicles.filter((v) => vehicleTypeDisplay(v) === t).length})
            </option>
          ))}
        </select>
        <FilterBtn active={filterStatus === "active"} onClick={() => setFilterStatus("active")}>
          Active
        </FilterBtn>
        <FilterBtn active={filterStatus === "retired"} onClick={() => setFilterStatus("retired")}>
          Retired
        </FilterBtn>
        <FilterBtn active={filterStatus === "all"} onClick={() => setFilterStatus("all")}>
          All
        </FilterBtn>
        <FilterBtn active={filterSamsara === "any"} onClick={() => setFilterSamsara("any")}>
          Any Samsara
        </FilterBtn>
        <FilterBtn active={filterSamsara === "linked"} onClick={() => setFilterSamsara("linked")}>
          On Samsara
        </FilterBtn>
        <FilterBtn active={filterSamsara === "unlinked"} onClick={() => setFilterSamsara("unlinked")}>
          No Samsara
        </FilterBtn>
        <input
          style={{ ...inputStyle, width: 220, padding: "5px 10px", fontSize: 12 }}
          placeholder="Search # / VIN / plate / driver…"
          value={search}
          onChange={(ev) => setSearch(ev.target.value)}
        />
      </div>

      {/* Add form */}
      {showAdd && canManage && <AddVehicleForm n={n} setN={setN} users={users} onAdd={handleAdd} onCancel={() => setShowAdd(false)} isMob={isMob} />}

      {/* Table (desktop) / cards (mobile) */}
      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: C.muted, fontSize: 13 }}>Loading vehicles…</div>
      ) : !isMob ? (
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "70px 1fr 1.4fr 90px 140px 1.2fr 90px 110px 100px 100px",
              background: C.darkBlue,
              padding: "10px 16px",
              gap: 8,
            }}
          >
            {["#", "TYPE", "YEAR / MAKE / MODEL", "PLATE", "VIN", "DRIVER", "ODO", "REG EXP", "SAMSARA", "STATUS"].map((h) => (
              <div key={h} style={{ fontSize: 10, fontWeight: 800, color: C.white, letterSpacing: "0.08em" }}>
                {h}
              </div>
            ))}
          </div>
          {filtered.map((v, i) => {
            const rs = regStatus(v.registration_expires);
            return (
              <div
                key={v.id}
                onClick={() => openEdit(v)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "70px 1fr 1.4fr 90px 140px 1.2fr 90px 110px 100px 100px",
                  padding: "10px 16px",
                  gap: 8,
                  alignItems: "center",
                  borderBottom: `1px solid ${C.border}22`,
                  background: i % 2 === 0 ? C.cardBg : C.steel,
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 800, color: C.text, fontFamily: "monospace" }}>{v.vehicle_number || "—"}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{vehicleTypeDisplay(v)}</div>
                <div style={{ fontSize: 12, color: C.text }}>
                  {[v.year, v.make, v.model].filter(Boolean).join(" ") || "—"}
                  {v.color ? <span style={{ color: C.muted, marginLeft: 6 }}>· {v.color}</span> : null}
                </div>
                <div style={{ fontSize: 11, color: C.muted, fontFamily: "monospace" }}>{v.license_plate || "—"}</div>
                <div style={{ fontSize: 10, color: C.muted, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {v.vin || "—"}
                </div>
                <div style={{ fontSize: 11, color: v.current_driver_name ? C.text : C.muted }}>{v.current_driver_name || "—"}</div>
                <div style={{ fontSize: 11, color: C.text, fontFamily: "monospace" }}>{v.odometer != null ? v.odometer.toLocaleString() : "—"}</div>
                <div
                  style={{
                    fontSize: 11,
                    color: REG_LABEL_COLOR[rs],
                    fontWeight: rs === "expired" || rs === "due" ? 700 : 500,
                    padding: "3px 6px",
                    borderRadius: 3,
                    background: REG_FILL[rs],
                    textAlign: "center",
                  }}
                >
                  {v.registration_expires || "—"}
                </div>
                <div style={{ fontSize: 10, color: v.samsara_vehicle_id ? C.text : C.muted, fontFamily: "monospace" }}>{v.samsara_vehicle_id || "—"}</div>
                <div>{lifecycleBadge(v.lifecycle_status)}</div>
              </div>
            );
          })}
          {filtered.length === 0 && <div style={{ padding: 20, textAlign: "center", color: C.muted, fontSize: 13 }}>No vehicles match.</div>}
        </div>
      ) : (
        <div>
          {filtered.map((v) => {
            const rs = regStatus(v.registration_expires);
            return (
              <div
                key={v.id}
                onClick={() => openEdit(v)}
                style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 6, padding: 14, marginBottom: 10, cursor: "pointer" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div>
                    <span style={{ fontSize: 16, fontWeight: 800, fontFamily: "monospace", marginRight: 8 }}>{v.vehicle_number || "—"}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{[v.year, v.make, v.model].filter(Boolean).join(" ") || "—"}</span>
                  </div>
                  {lifecycleBadge(v.lifecycle_status)}
                </div>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{vehicleTypeDisplay(v)}</div>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>
                  {[
                    v.license_plate ? `Plate ${v.license_plate}` : null,
                    v.current_driver_name ? `Driver ${v.current_driver_name}` : null,
                    v.odometer != null ? `${v.odometer.toLocaleString()} mi` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </div>
                {v.registration_expires && (
                  <div
                    style={{
                      display: "inline-block",
                      fontSize: 10,
                      color: REG_LABEL_COLOR[rs],
                      fontWeight: rs === "expired" || rs === "due" ? 700 : 500,
                      padding: "2px 8px",
                      borderRadius: 3,
                      background: REG_FILL[rs],
                      marginRight: 8,
                    }}
                  >
                    Reg: {v.registration_expires}
                  </div>
                )}
                {v.samsara_vehicle_id && (
                  <div style={{ display: "inline-block", fontSize: 10, color: C.muted, fontFamily: "monospace" }}>Samsara: {v.samsara_vehicle_id}</div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && <div style={{ padding: 20, textAlign: "center", color: C.muted, fontSize: 13 }}>No vehicles match.</div>}
        </div>
      )}

      {/* Edit Modal */}
      {editV && (
        <ModalWrap
          title={`Edit Vehicle — ${editV.vehicle_number || editV.year + " " + editV.make + " " + editV.model}`}
          onClose={() => setEditV(null)}
          width={620}
        >
          <EditVehicleForm e={e} setE={setE} users={users} canManage={canManage} />
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            {canManage && <Btn onClick={handleSaveEdit}>SAVE</Btn>}
            <Btn onClick={() => setEditV(null)} variant="ghost">
              CLOSE
            </Btn>
            {canManage && editV.lifecycle_status === "active" && (
              <button
                onClick={() => setRetireConfirm(editV)}
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
                RETIRE
              </button>
            )}
          </div>
        </ModalWrap>
      )}

      {retireConfirm && (
        <ConfirmModal
          title="Retire vehicle?"
          message={`${retireConfirm.year || ""} ${retireConfirm.make || ""} ${retireConfirm.model || ""} (#${retireConfirm.vehicle_number || "—"}) will be marked retired and hidden from the active list. Records and history are preserved; you can un-retire by editing the lifecycle field.`}
          yesLabel="Retire"
          onYes={() => {
            const id = retireConfirm.id;
            setRetireConfirm(null);
            handleRetire(id);
          }}
          onCancel={() => setRetireConfirm(null)}
        />
      )}

      {/* Import results */}
      {importResult && (
        <ModalWrap title="Import complete" onClose={() => setImportResult(null)} width={560}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
            <Stat label="Processed" value={importResult.processed || 0} />
            <Stat label="Inserted" value={importResult.inserted || 0} tone="ok" />
            <Stat label="Skipped" value={importResult.skipped || 0} tone="warn" />
            <Stat label="Errors" value={(importResult.errors || []).filter((x) => x.level === "error").length} tone="error" />
          </div>
          {importResult.inserted_numbers?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, letterSpacing: "0.1em", marginBottom: 6 }}>VEHICLE # INSERTED</div>
              <div style={{ fontSize: 11, fontFamily: "monospace", color: C.text, lineHeight: 1.6 }}>{importResult.inserted_numbers.join(", ")}</div>
            </div>
          )}
          {importResult.errors?.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, letterSpacing: "0.1em", marginBottom: 6 }}>NOTES</div>
              <div style={{ maxHeight: 200, overflow: "auto", border: `1px solid ${C.border}`, borderRadius: 4, padding: 8, background: C.steel }}>
                {importResult.errors.map((err, i) => (
                  <div key={i} style={{ fontSize: 11, color: err.level === "error" ? C.red : err.level === "warn" ? "#8a6500" : C.muted, marginBottom: 4 }}>
                    Row {err.row}: {err.message}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={{ marginTop: 14 }}>
            <Btn onClick={() => setImportResult(null)}>CLOSE</Btn>
          </div>
        </ModalWrap>
      )}

      {/* Samsara sync results */}
      {syncResult && (
        <ModalWrap title="Samsara sync complete" onClose={() => setSyncResult(null)} width={620}>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>
            Samsara fleet: {syncResult.samsara_total} · FTI active fleet: {syncResult.our_total}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
            <Stat label="Linked now" value={syncResult.linked_now || 0} tone="ok" />
            <Stat label="Already linked" value={syncResult.already_linked || 0} />
            <Stat label="No match" value={syncResult.vin_no_match || 0} tone="warn" />
            <Stat label="Errors" value={(syncResult.errors || []).filter((x) => x.level === "error").length} tone="error" />
          </div>
          {(syncResult.no_vin_ours > 0 || syncResult.no_vin_samsara > 0 || syncResult.mismatch > 0) && (
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 12, padding: 10, background: C.steel, borderRadius: 4 }}>
              {syncResult.no_vin_ours > 0 && <div>· {syncResult.no_vin_ours} FTI vehicle(s) have no VIN — cannot match by VIN</div>}
              {syncResult.no_vin_samsara > 0 && <div>· {syncResult.no_vin_samsara} Samsara vehicle(s) have no VIN — skipped</div>}
              {syncResult.mismatch > 0 && <div>· {syncResult.mismatch} VIN(s) currently linked to a Samsara ID that Samsara no longer reports — see notes</div>}
            </div>
          )}
          {syncResult.errors?.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, letterSpacing: "0.1em", marginBottom: 6 }}>NOTES</div>
              <div style={{ maxHeight: 200, overflow: "auto", border: `1px solid ${C.border}`, borderRadius: 4, padding: 8, background: C.steel }}>
                {syncResult.errors.map((err, i) => (
                  <div key={i} style={{ fontSize: 11, color: err.level === "error" ? C.red : err.level === "warn" ? "#8a6500" : C.muted, marginBottom: 4 }}>
                    {err.vehicle_number ? `#${err.vehicle_number}` : `Vehicle ${err.vehicle_id}`} (VIN {err.vin}): {err.message}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={{ marginTop: 14 }}>
            <Btn onClick={() => setSyncResult(null)}>CLOSE</Btn>
          </div>
        </ModalWrap>
      )}

      {notice && <NoticeModal title={notice.title} message={notice.message} variant={notice.variant} onClose={() => setNotice(null)} />}
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function Stat({ label, value, tone }) {
  const colors = {
    ok: { fg: C.green, bg: "#e6f5ec" },
    warn: { fg: "#8a6500", bg: "#fff2cc" },
    error: { fg: C.red, bg: "#fdecea" },
  };
  const c = colors[tone] || { fg: C.text, bg: C.steel };
  return (
    <div style={{ padding: 12, background: c.bg, borderRadius: 4, textAlign: "center", border: `1px solid ${c.fg}22` }}>
      <div style={{ fontSize: 24, fontWeight: 800, color: c.fg }}>{value}</div>
      <div style={{ fontSize: 9, fontWeight: 800, color: c.fg, letterSpacing: "0.1em", marginTop: 2 }}>{label.toUpperCase()}</div>
    </div>
  );
}

function AddVehicleForm({ n, setN, users, onAdd, onCancel, isMob }) {
  const upd = (k) => (ev) => setN({ ...n, [k]: ev.target.value });
  return (
    <div style={{ background: C.steel, border: `1px solid ${C.border}`, borderRadius: 6, padding: 16, marginBottom: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: isMob ? "1fr 1fr" : "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
        <Field label="YEAR">
          <input type="number" style={inputStyle} value={n.year} onChange={upd("year")} />
        </Field>
        <Field label="MAKE">
          <input style={inputStyle} value={n.make} onChange={upd("make")} />
        </Field>
        <Field label="MODEL">
          <input style={inputStyle} value={n.model} onChange={upd("model")} />
        </Field>
        <Field label="COLOR">
          <input style={inputStyle} value={n.color} onChange={upd("color")} />
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: isMob ? "1fr 1fr" : "1.5fr 1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
        <Field label="VIN">
          <input style={inputStyle} value={n.vin} onChange={upd("vin")} placeholder="17 chars (last 4 = Vehicle #)" />
        </Field>
        <Field label="PLATE">
          <input style={inputStyle} value={n.license_plate} onChange={upd("license_plate")} />
        </Field>
        <Field label="REG EXPIRES">
          <input style={inputStyle} value={n.registration_expires} onChange={upd("registration_expires")} placeholder="YYYY-MM" />
        </Field>
        <Field label="SAMSARA ID">
          <input style={inputStyle} value={n.samsara_vehicle_id} onChange={upd("samsara_vehicle_id")} />
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: isMob ? "1fr 1fr" : "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
        <Field label="KIND">
          <select style={inputStyle} value={n.vehicle_kind} onChange={upd("vehicle_kind")}>
            <option value="pickup">Pickup</option>
            <option value="tractor">Tractor</option>
            <option value="trailer">Trailer</option>
            <option value="straight_truck">Straight Truck</option>
            <option value="other">Other</option>
          </select>
        </Field>
        <Field label="HITCH (if trailer)">
          <select style={inputStyle} value={n.hitch_type} onChange={upd("hitch_type")}>
            <option value="">—</option>
            <option value="tongue_pull">Tongue Pull</option>
            <option value="gooseneck">Gooseneck</option>
            <option value="n_a">N/A</option>
          </select>
        </Field>
        <Field label="SUB-TYPE">
          <input style={inputStyle} value={n.subtype} onChange={upd("subtype")} placeholder="sand_trap, rig_up_truck, ..." />
        </Field>
        <Field label="DRIVER">
          <select style={inputStyle} value={n.current_driver_id} onChange={upd("current_driver_id")}>
            <option value="">—</option>
            {(users || [])
              .filter((u) => u.is_active)
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
          </select>
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: isMob ? "1fr 1fr" : "1fr 1fr 2fr", gap: 10, marginBottom: 12 }}>
        <Field label="ODOMETER">
          <input type="number" style={inputStyle} value={n.odometer} onChange={upd("odometer")} />
        </Field>
        <Field label="ODO DATE">
          <input type="date" style={inputStyle} value={n.odometer_date} onChange={upd("odometer_date")} />
        </Field>
        <Field label="NOTES">
          <input style={inputStyle} value={n.notes} onChange={upd("notes")} />
        </Field>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Btn onClick={onAdd}>ADD VEHICLE</Btn>
        <Btn onClick={onCancel} variant="ghost">
          CANCEL
        </Btn>
      </div>
    </div>
  );
}

function EditVehicleForm({ e, setE, users, canManage }) {
  const upd = (k) => (ev) => setE({ ...e, [k]: ev.target.value });
  const ro = !canManage;
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
        <Field label="YEAR">
          <input type="number" style={inputStyle} value={e.year} onChange={upd("year")} disabled={ro} />
        </Field>
        <Field label="MAKE">
          <input style={inputStyle} value={e.make} onChange={upd("make")} disabled={ro} />
        </Field>
        <Field label="MODEL">
          <input style={inputStyle} value={e.model} onChange={upd("model")} disabled={ro} />
        </Field>
        <Field label="COLOR">
          <input style={inputStyle} value={e.color} onChange={upd("color")} disabled={ro} />
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", gap: 10 }}>
        <Field label="VIN (Vehicle # = last 4)">
          <input style={inputStyle} value={e.vin} onChange={upd("vin")} disabled={ro} />
        </Field>
        <Field label="PLATE">
          <input style={inputStyle} value={e.license_plate} onChange={upd("license_plate")} disabled={ro} />
        </Field>
        <Field label="REG EXPIRES (YYYY-MM)">
          <input style={inputStyle} value={e.registration_expires} onChange={upd("registration_expires")} disabled={ro} />
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
        <Field label="KIND">
          <select style={inputStyle} value={e.vehicle_kind} onChange={upd("vehicle_kind")} disabled={ro}>
            <option value="pickup">Pickup</option>
            <option value="tractor">Tractor</option>
            <option value="trailer">Trailer</option>
            <option value="straight_truck">Straight Truck</option>
            <option value="other">Other</option>
          </select>
        </Field>
        <Field label="HITCH">
          <select style={inputStyle} value={e.hitch_type} onChange={upd("hitch_type")} disabled={ro}>
            <option value="">—</option>
            <option value="tongue_pull">Tongue Pull</option>
            <option value="gooseneck">Gooseneck</option>
            <option value="n_a">N/A</option>
          </select>
        </Field>
        <Field label="SUB-TYPE">
          <input style={inputStyle} value={e.subtype} onChange={upd("subtype")} disabled={ro} />
        </Field>
        <Field label="LIFECYCLE">
          <select style={inputStyle} value={e.lifecycle_status} onChange={upd("lifecycle_status")} disabled={ro}>
            <option value="active">Active</option>
            <option value="retired">Retired</option>
          </select>
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <Field label="ODOMETER">
          <input type="number" style={inputStyle} value={e.odometer} onChange={upd("odometer")} disabled={ro} />
        </Field>
        <Field label="ODO DATE">
          <input type="date" style={inputStyle} value={e.odometer_date} onChange={upd("odometer_date")} disabled={ro} />
        </Field>
        <Field label="SAMSARA ID">
          <input style={inputStyle} value={e.samsara_vehicle_id} onChange={upd("samsara_vehicle_id")} disabled={ro} />
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
        <Field label="DRIVER">
          <select style={inputStyle} value={e.current_driver_id || ""} onChange={upd("current_driver_id")} disabled={ro}>
            <option value="">—</option>
            {(users || [])
              .filter((u) => u.is_active)
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
          </select>
        </Field>
        <Field label="NOTES">
          <input style={inputStyle} value={e.notes} onChange={upd("notes")} disabled={ro} />
        </Field>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

export default VehiclesPage;
