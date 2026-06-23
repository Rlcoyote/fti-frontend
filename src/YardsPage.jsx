import { useState, useEffect, useMemo, useCallback } from "react";
import { C, API_URL } from "./config.js";
import { Btn, FilterBtn, inputStyle, NoticeModal } from "./SharedUI.jsx";
import { useApp } from "./AppContext.jsx";
import YardsTable from "./YardsTable.jsx";
import { YardAddPicker, YardLinkModal, YardCreateModal } from "./YardAddModals.jsx";
import { YardEditModal, YardRetireConfirm } from "./YardEditModal.jsx";

// v28.179 — Yards admin page. Companion to VehiclesPage; together with
// AssetsPage these form the "Fleet & Assets" UX group (positioned adjacent
// in the top nav).
//
// Backend: /api/yards (CRUD) + /api/yards/gps-available (link-existing picker).
// Schema in migrations/010 — `yards` table.
//
// Permission posture (matches the v28.177 backend gates):
//   - Page visible at can("view_inventory")
//   - All write controls (Add / Edit / Retire / Link / Create) at
//     can("manage_yards")
//
// v28.236 — split per Article XXIV (+ Compression clause): table/cards →
// YardsTable; add flows → YardAddModals; edit/retire → YardEditModal; shared
// lifecycle badge → LifecycleBadge (deduped against the vehicle split).

function YardsPage() {
  const { can } = useApp();
  const canManage = can && can("manage_yards");

  const [yards, setYards] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterStatus, setFilterStatus] = useState("active"); // active | retired | all
  const [search, setSearch] = useState("");

  // Modals
  const [editYard, setEditYard] = useState(null);
  const [retireConfirm, setRetireConfirm] = useState(null);
  const [showAddPicker, setShowAddPicker] = useState(false); // chooses Link vs Create
  const [showLink, setShowLink] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [notice, setNotice] = useState(null);

  // Add — Link Existing state
  const [availableGeofences, setAvailableGeofences] = useState([]);
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkResult, setLinkResult] = useState(null); // {available_count, already_linked_count, provider_total}
  const [pickedGeofence, setPickedGeofence] = useState(null);
  const [linkYardName, setLinkYardName] = useState("");
  const [linkIsDefault, setLinkIsDefault] = useState(false);

  // Add — Create New state
  const [cn, setCn] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    lat: "",
    lng: "",
    radius_ft: 500,
    is_default: false,
    notes: "",
  });

  // Edit state
  const [e, setE] = useState({});
  const [retireDeleteGeofence, setRetireDeleteGeofence] = useState(false);

  // Mobile breakpoint
  const [pgW, setPgW] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  useEffect(() => {
    const h = () => setPgW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  const isMob = pgW < 900;

  // ── Fetch ──

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== "all") params.set("status", filterStatus);
      const r = await fetch(`${API_URL}/yards?${params.toString()}`);
      if (!r.ok) {
        setNotice({ title: "Load failed", message: `Could not load yards (HTTP ${r.status}).`, variant: "error" });
        setYards([]);
      } else {
        setYards(await r.json());
      }
    } catch (err) {
      setNotice({ title: "Load failed", message: err.message || "Network error", variant: "error" });
    }
    setLoading(false);
  }, [filterStatus]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ── Search / filter ──
  const filtered = useMemo(() => {
    if (!search.trim()) return yards;
    const s = search.toLowerCase();
    return yards.filter((y) =>
      [y.name, y.address, y.city, y.state, y.zip, y.notes, y.gps_geofence_id].filter(Boolean).some((f) => String(f).toLowerCase().includes(s)),
    );
  }, [yards, search]);

  // ── Open the Link Existing flow (fetch unlinked Samsara geofences) ──

  const openLink = async () => {
    setShowAddPicker(false);
    setShowLink(true);
    setLinkLoading(true);
    setPickedGeofence(null);
    setLinkYardName("");
    setLinkIsDefault(false);
    try {
      const r = await fetch(`${API_URL}/yards/gps-available`);
      const data = await r.json();
      if (!r.ok) {
        setNotice({ title: "Could not load GPS geofences", message: data.error || `HTTP ${r.status}`, variant: "error" });
        setAvailableGeofences([]);
        setLinkResult(null);
      } else {
        setAvailableGeofences(data.available || []);
        setLinkResult({
          provider_total: data.provider_total || 0,
          already_linked_count: data.already_linked_count || 0,
          available_count: (data.available || []).length,
        });
      }
    } catch (err) {
      setNotice({ title: "Could not load GPS geofences", message: err.message, variant: "error" });
    }
    setLinkLoading(false);
  };

  // ── Mutations ──

  const handleLinkSubmit = async () => {
    if (!pickedGeofence) {
      setNotice({ title: "Pick a geofence first", message: "Select one of the GPS provider's geofences to link.", variant: "warn" });
      return;
    }
    try {
      const r = await fetch(`${API_URL}/yards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: linkYardName.trim() || pickedGeofence.name,
          gps_geofence_id: pickedGeofence.id,
          is_default: linkIsDefault,
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        setNotice({ title: "Link failed", message: data.error || `HTTP ${r.status}`, variant: "error" });
        return;
      }
      await refresh();
      setShowLink(false);
      setNotice({ title: "Yard linked", message: `${data.name} is now active.`, variant: "ok" });
    } catch (err) {
      setNotice({ title: "Link failed", message: err.message, variant: "error" });
    }
  };

  const handleCreateSubmit = async () => {
    if (!cn.name.trim()) {
      setNotice({ title: "Name required", message: "", variant: "warn" });
      return;
    }
    if (!cn.lat || !cn.lng) {
      setNotice({ title: "Coordinates required", message: "Lat and lng are required when creating a new yard.", variant: "warn" });
      return;
    }
    try {
      const r = await fetch(`${API_URL}/yards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cn.name.trim(),
          address: cn.address || null,
          city: cn.city || null,
          state: cn.state || null,
          zip: cn.zip || null,
          lat: Number(cn.lat),
          lng: Number(cn.lng),
          radius_ft: Number(cn.radius_ft) || 500,
          is_default: cn.is_default,
          notes: cn.notes || null,
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        setNotice({ title: "Create failed", message: data.error || `HTTP ${r.status}`, variant: "error" });
        return;
      }
      await refresh();
      setShowCreate(false);
      setCn({ name: "", address: "", city: "", state: "", zip: "", lat: "", lng: "", radius_ft: 500, is_default: false, notes: "" });
      setNotice({ title: "Yard created", message: `${data.name} created and geofence pushed to the GPS provider.`, variant: "ok" });
    } catch (err) {
      setNotice({ title: "Create failed", message: err.message, variant: "error" });
    }
  };

  const openEdit = (y) => {
    setEditYard(y);
    setE({
      name: y.name || "",
      address: y.address || "",
      city: y.city || "",
      state: y.state || "",
      zip: y.zip || "",
      lat: y.lat || "",
      lng: y.lng || "",
      radius_ft: y.radius_ft || 500,
      is_default: !!y.is_default,
      lifecycle_status: y.lifecycle_status || "active",
      notes: y.notes || "",
    });
  };

  const handleSaveEdit = async () => {
    try {
      const r = await fetch(`${API_URL}/yards/${editYard.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: e.name || null,
          address: e.address || null,
          city: e.city || null,
          state: e.state || null,
          zip: e.zip || null,
          lat: e.lat === "" ? null : Number(e.lat),
          lng: e.lng === "" ? null : Number(e.lng),
          radius_ft: e.radius_ft === "" ? null : Number(e.radius_ft),
          is_default: e.is_default,
          lifecycle_status: e.lifecycle_status,
          notes: e.notes || null,
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        setNotice({ title: "Save failed", message: data.error || `HTTP ${r.status}`, variant: "error" });
        return;
      }
      await refresh();
      setEditYard(null);
      setNotice({ title: "Yard saved", message: "", variant: "ok" });
    } catch (err) {
      setNotice({ title: "Save failed", message: err.message, variant: "error" });
    }
  };

  const handleRetire = async (id, deleteGeofence) => {
    try {
      const r = await fetch(`${API_URL}/yards/${id}?delete_geofence=${deleteGeofence ? "true" : "false"}`, { method: "DELETE" });
      const data = await r.json();
      if (!r.ok) {
        setNotice({ title: "Retire failed", message: data.error || `HTTP ${r.status}`, variant: "error" });
        return;
      }
      await refresh();
      setEditYard(null);
      setNotice({
        title: "Yard retired",
        message: data.geofence_deleted ? "Provider geofence was also deleted." : "Provider geofence kept (re-link possible).",
        variant: "ok",
      });
    } catch (err) {
      setNotice({ title: "Retire failed", message: err.message, variant: "error" });
    }
  };

  // ── Render ──

  const counts = {
    total: yards.length,
    active: yards.filter((y) => y.lifecycle_status === "active").length,
    retired: yards.filter((y) => y.lifecycle_status === "retired").length,
    linked: yards.filter((y) => y.gps_geofence_id).length,
  };

  return (
    <div style={{ padding: isMob ? "16px 12px" : "24px 28px" }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Yards</h1>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
            {counts.active} active · {counts.retired} retired · {counts.linked} GPS-linked
          </div>
        </div>
        {canManage && <Btn onClick={() => setShowAddPicker(true)}>+ ADD YARD</Btn>}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
        <FilterBtn active={filterStatus === "active"} onClick={() => setFilterStatus("active")}>
          Active
        </FilterBtn>
        <FilterBtn active={filterStatus === "retired"} onClick={() => setFilterStatus("retired")}>
          Retired
        </FilterBtn>
        <FilterBtn active={filterStatus === "all"} onClick={() => setFilterStatus("all")}>
          All
        </FilterBtn>
        <input
          style={{ ...inputStyle, width: 240, padding: "5px 10px", fontSize: 12 }}
          placeholder="Search name / address / GPS ID…"
          value={search}
          onChange={(ev) => setSearch(ev.target.value)}
        />
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: C.muted, fontSize: 13 }}>Loading yards…</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: C.muted, fontSize: 13 }}>
          {yards.length === 0 ? "No yards yet. Click + ADD YARD to link or create one." : "No yards match this filter."}
        </div>
      ) : (
        <YardsTable yards={filtered} isMob={isMob} onRowClick={openEdit} />
      )}

      {/* Add picker: choose Link vs Create */}
      {showAddPicker && (
        <YardAddPicker
          onLink={openLink}
          onCreate={() => {
            setShowAddPicker(false);
            setShowCreate(true);
          }}
          onClose={() => setShowAddPicker(false)}
        />
      )}

      {/* Link Existing Modal */}
      {showLink && (
        <YardLinkModal
          loading={linkLoading}
          result={linkResult}
          geofences={availableGeofences}
          picked={pickedGeofence}
          setPicked={setPickedGeofence}
          yardName={linkYardName}
          setYardName={setLinkYardName}
          isDefault={linkIsDefault}
          setIsDefault={setLinkIsDefault}
          onSubmit={handleLinkSubmit}
          onClose={() => setShowLink(false)}
        />
      )}

      {/* Create New Modal */}
      {showCreate && <YardCreateModal cn={cn} setCn={setCn} onSubmit={handleCreateSubmit} onClose={() => setShowCreate(false)} />}

      {/* Edit Modal */}
      {editYard && (
        <YardEditModal
          yard={editYard}
          e={e}
          setE={setE}
          canManage={canManage}
          onSave={handleSaveEdit}
          onClose={() => setEditYard(null)}
          onRetire={() => {
            setRetireDeleteGeofence(false);
            setRetireConfirm(editYard);
          }}
        />
      )}

      {/* Retire confirm */}
      {retireConfirm && (
        <YardRetireConfirm
          yard={retireConfirm}
          deleteGeofence={retireDeleteGeofence}
          setDeleteGeofence={setRetireDeleteGeofence}
          onConfirm={() => {
            const id = retireConfirm.id;
            const del = retireDeleteGeofence;
            setRetireConfirm(null);
            handleRetire(id, del);
          }}
          onClose={() => setRetireConfirm(null)}
        />
      )}

      {notice && <NoticeModal title={notice.title} message={notice.message} variant={notice.variant} onClose={() => setNotice(null)} />}
    </div>
  );
}

export default YardsPage;
