import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useQueryPrefill } from "./useQueryPrefill.js";
import { C, API_URL } from "./config.js";
import { Btn, FilterBtn, ModalWrap, inputStyle, ConfirmModal, NoticeModal } from "./SharedUI.jsx";
import { useApp } from "./AppContext.jsx";
import { vehicleTypeDisplay, regStatus } from "./vehicleDisplay.js";
import VehiclesTable from "./VehiclesTable.jsx";
import { AddVehicleForm, EditVehicleForm } from "./VehicleForms.jsx";
import { ImportResultModal, GpsSyncResultModal } from "./VehicleResultModals.jsx";

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
//
// v28.235 — split per Article XXIV: display helpers → vehicleDisplay.js;
// table/cards → VehiclesTable; forms → VehicleForms; result modals →
// VehicleResultModals. This file is the orchestrator.

// ─── Page ───────────────────────────────────────────────────────────────────

function VehiclesPage() {
  const { can, users } = useApp();
  const canManage = can && can("manage_settings");

  // Fetched data
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  useQueryPrefill("q", setSearch); // v28.394 — search results arrive pre-filtered
  const [filterType, setFilterType] = useState("all"); // matches a vehicleTypeDisplay() string
  const [filterStatus, setFilterStatus] = useState("active"); // active | retired | all
  const [filterGps, setFilterGps] = useState("any"); // any | linked | unlinked

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
    gps_vehicle_id: "",
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
      if (filterGps === "linked") params.set("gps", "true");
      if (filterGps === "unlinked") params.set("gps", "false");
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
  }, [filterStatus, filterGps]);

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
        [v.vehicle_number, v.vin, v.license_plate, v.make, v.model, v.current_driver_name, v.gps_vehicle_id, v.notes]
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
          gps_vehicle_id: n.gps_vehicle_id || null,
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
        gps_vehicle_id: "",
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
      gps_vehicle_id: v.gps_vehicle_id || "",
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
          gps_vehicle_id: e.gps_vehicle_id || null,
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

  const handleGpsSync = async () => {
    setSyncing(true);
    try {
      const r = await fetch(`${API_URL}/gps/sync`, { method: "POST" });
      const data = await r.json();
      if (!r.ok) {
        setNotice({ title: "GPS sync failed", message: data.error || `HTTP ${r.status}`, variant: "error" });
      } else {
        setSyncResult(data);
        await refresh();
      }
    } catch (err) {
      setNotice({ title: "GPS sync failed", message: err.message, variant: "error" });
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
    gps_linked: vehicles.filter((v) => v.gps_vehicle_id).length,
  };

  return (
    <div style={{ padding: isMob ? "16px 12px" : "24px 28px" }}>
      {/* Header */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Vehicles</h1>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
            {counts.total} total · {counts.expired} reg expired · {counts.due} reg due · {counts.gps_linked} on GPS
          </div>
        </div>
        {canManage && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Btn onClick={handleGpsSync} variant="ghost" disabled={syncing || importing}>
              {syncing ? "SYNCING…" : "SYNC FROM GPS"}
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
        <FilterBtn active={filterGps === "any"} onClick={() => setFilterGps("any")}>
          Any GPS
        </FilterBtn>
        <FilterBtn active={filterGps === "linked"} onClick={() => setFilterGps("linked")}>
          On GPS
        </FilterBtn>
        <FilterBtn active={filterGps === "unlinked"} onClick={() => setFilterGps("unlinked")}>
          No GPS
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
      ) : (
        <VehiclesTable vehicles={filtered} isMob={isMob} onRowClick={openEdit} />
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
                className="fti-btn"
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
      {importResult && <ImportResultModal result={importResult} onClose={() => setImportResult(null)} />}

      {/* GPS sync results */}
      {syncResult && <GpsSyncResultModal result={syncResult} onClose={() => setSyncResult(null)} />}

      {notice && <NoticeModal title={notice.title} message={notice.message} variant={notice.variant} onClose={() => setNotice(null)} />}
    </div>
  );
}

export default VehiclesPage;
