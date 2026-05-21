import { useState, useEffect, useMemo, useCallback } from "react";
import { C, API_URL } from "./config.js";
import { Btn, FilterBtn, ModalWrap, inputStyle, labelStyle, NoticeModal } from "./SharedUI.jsx";
import { useApp } from "./AppContext.jsx";

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

const LIFECYCLE_COLORS = {
  active: { color: C.green, bg: "#e6f5ec", label: "ACTIVE" },
  retired: { color: C.muted, bg: "#eeeeee", label: "RETIRED" },
};

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
      ) : !isMob ? (
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden" }}>
          <div
            style={{ display: "grid", gridTemplateColumns: "1.6fr 1.8fr 80px 100px 1.4fr 100px 90px", background: C.darkBlue, padding: "10px 16px", gap: 8 }}
          >
            {["NAME", "ADDRESS", "RADIUS", "DEFAULT", "GPS GEOFENCE", "STATUS", ""].map((h) => (
              <div key={h} style={{ fontSize: 10, fontWeight: 800, color: C.white, letterSpacing: "0.08em" }}>
                {h}
              </div>
            ))}
          </div>
          {filtered.map((y, i) => (
            <div
              key={y.id}
              onClick={() => openEdit(y)}
              style={{
                display: "grid",
                gridTemplateColumns: "1.6fr 1.8fr 80px 100px 1.4fr 100px 90px",
                padding: "10px 16px",
                gap: 8,
                alignItems: "center",
                borderBottom: `1px solid ${C.border}22`,
                background: i % 2 === 0 ? C.cardBg : C.steel,
                cursor: "pointer",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{y.name}</div>
              <div style={{ fontSize: 11, color: C.muted }}>{[y.address, y.city, y.state, y.zip].filter(Boolean).join(", ") || "—"}</div>
              <div style={{ fontSize: 11, color: C.text, fontFamily: "monospace" }}>{y.radius_ft ? `${y.radius_ft} ft` : "—"}</div>
              <div style={{ fontSize: 11 }}>
                {y.is_default ? <span style={{ color: C.blue, fontWeight: 700 }}>★ DEFAULT</span> : <span style={{ color: C.muted }}>—</span>}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: y.gps_geofence_id ? C.text : C.muted,
                  fontFamily: "monospace",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {y.gps_geofence_id || "no GPS link"}
              </div>
              <div>{lifecycleBadge(y.lifecycle_status)}</div>
              <div style={{ fontSize: 10, color: C.muted, textAlign: "right" }}>edit ›</div>
            </div>
          ))}
        </div>
      ) : (
        <div>
          {filtered.map((y) => (
            <div
              key={y.id}
              onClick={() => openEdit(y)}
              style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 6, padding: 14, marginBottom: 10, cursor: "pointer" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
                  {y.is_default && <span style={{ color: C.blue, marginRight: 6 }}>★</span>}
                  {y.name}
                </span>
                {lifecycleBadge(y.lifecycle_status)}
              </div>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>{[y.address, y.city, y.state, y.zip].filter(Boolean).join(", ") || "—"}</div>
              <div style={{ fontSize: 11, color: C.muted }}>
                {y.radius_ft ? `${y.radius_ft} ft radius` : "no radius"} · {y.gps_geofence_id ? `GPS: ${y.gps_geofence_id}` : "no GPS link"}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add picker: choose Link vs Create */}
      {showAddPicker && (
        <ModalWrap title="Add a Yard" onClose={() => setShowAddPicker(false)} width={480}>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 14 }}>Choose how to add the yard:</div>
          <div style={{ display: "grid", gap: 10 }}>
            <button
              onClick={openLink}
              style={{ textAlign: "left", padding: 14, background: C.steel, border: `1px solid ${C.border}`, borderRadius: 6, cursor: "pointer" }}
            >
              <div style={{ fontWeight: 700, fontSize: 13, color: C.text, marginBottom: 4 }}>Link an Existing Geofence</div>
              <div style={{ fontSize: 11, color: C.muted }}>
                Use a geofence you've already created in the GPS provider's dashboard (e.g., "FT - Wickett Yard"). FTI stores the linkage; the geofence shape
                lives on the provider's side. Recommended when the yard already exists in the GPS account.
              </div>
            </button>
            <button
              onClick={() => {
                setShowAddPicker(false);
                setShowCreate(true);
              }}
              style={{ textAlign: "left", padding: 14, background: C.steel, border: `1px solid ${C.border}`, borderRadius: 6, cursor: "pointer" }}
            >
              <div style={{ fontWeight: 700, fontSize: 13, color: C.text, marginBottom: 4 }}>Create a New Yard</div>
              <div style={{ fontSize: 11, color: C.muted }}>
                Enter the yard's name, address, coordinates, and radius. FTI creates a new circular geofence in the GPS provider for you. Use this when the yard
                isn't in the GPS account yet.
              </div>
            </button>
          </div>
        </ModalWrap>
      )}

      {/* Link Existing Modal */}
      {showLink && (
        <ModalWrap title="Link Existing GPS Geofence" onClose={() => setShowLink(false)} width={600}>
          {linkLoading ? (
            <div style={{ padding: 30, textAlign: "center", color: C.muted, fontSize: 13 }}>Loading GPS geofences…</div>
          ) : (
            <>
              {linkResult && (
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 12, padding: 10, background: C.steel, borderRadius: 4 }}>
                  {linkResult.provider_total} total geofences on the GPS provider · {linkResult.already_linked_count} already linked ·{" "}
                  {linkResult.available_count} available to link
                </div>
              )}
              {availableGeofences.length === 0 ? (
                <div style={{ padding: 30, textAlign: "center", color: C.muted, fontSize: 13 }}>
                  No unlinked geofences available. Create one in the GPS provider's dashboard first, then come back here.
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>Pick a geofence to link:</div>
                  <div style={{ maxHeight: 280, overflow: "auto", border: `1px solid ${C.border}`, borderRadius: 4, marginBottom: 12 }}>
                    {availableGeofences.map((g) => {
                      const selected = pickedGeofence?.id === g.id;
                      return (
                        <div
                          key={g.id}
                          onClick={() => {
                            setPickedGeofence(g);
                            setLinkYardName(g.name || "");
                          }}
                          style={{ padding: 10, cursor: "pointer", background: selected ? "#e6f5ec" : "transparent", borderBottom: `1px solid ${C.border}22` }}
                        >
                          <div style={{ fontSize: 13, fontWeight: selected ? 700 : 500, color: C.text }}>{g.name || "(unnamed)"}</div>
                          {g.formattedAddress && <div style={{ fontSize: 11, color: C.muted }}>{g.formattedAddress}</div>}
                          <div style={{ fontSize: 10, color: C.muted, fontFamily: "monospace" }}>{g.id}</div>
                        </div>
                      );
                    })}
                  </div>
                  {pickedGeofence && (
                    <div style={{ display: "grid", gap: 10, marginBottom: 12 }}>
                      <div>
                        <label style={labelStyle}>YARD NAME (display in FTI)</label>
                        <input
                          style={inputStyle}
                          value={linkYardName}
                          onChange={(ev) => setLinkYardName(ev.target.value)}
                          placeholder={pickedGeofence.name || ""}
                        />
                      </div>
                      <label style={{ fontSize: 12, color: C.text }}>
                        <input type="checkbox" checked={linkIsDefault} onChange={(ev) => setLinkIsDefault(ev.target.checked)} style={{ marginRight: 6 }} />
                        Set as default yard (replaces current default if any)
                      </label>
                    </div>
                  )}
                </>
              )}
            </>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <Btn onClick={handleLinkSubmit} disabled={!pickedGeofence}>
              LINK
            </Btn>
            <Btn onClick={() => setShowLink(false)} variant="ghost">
              CANCEL
            </Btn>
          </div>
        </ModalWrap>
      )}

      {/* Create New Modal */}
      {showCreate && (
        <ModalWrap title="Create a New Yard" onClose={() => setShowCreate(false)} width={560}>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 12 }}>
            Enter the yard's details. FTI pushes a circular geofence to the GPS provider on save.
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            <div>
              <label style={labelStyle}>NAME *</label>
              <input style={inputStyle} value={cn.name} onChange={(ev) => setCn({ ...cn, name: ev.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>ADDRESS</label>
              <input style={inputStyle} value={cn.address} onChange={(ev) => setCn({ ...cn, address: ev.target.value })} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 60px 1fr", gap: 8 }}>
              <div>
                <label style={labelStyle}>CITY</label>
                <input style={inputStyle} value={cn.city} onChange={(ev) => setCn({ ...cn, city: ev.target.value })} />
              </div>
              <div>
                <label style={labelStyle}>STATE</label>
                <input
                  style={inputStyle}
                  value={cn.state}
                  onChange={(ev) => setCn({ ...cn, state: ev.target.value.toUpperCase().slice(0, 2) })}
                  placeholder="TX"
                />
              </div>
              <div>
                <label style={labelStyle}>ZIP</label>
                <input style={inputStyle} value={cn.zip} onChange={(ev) => setCn({ ...cn, zip: ev.target.value })} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <div>
                <label style={labelStyle}>LAT *</label>
                <input style={inputStyle} type="number" step="0.0000001" value={cn.lat} onChange={(ev) => setCn({ ...cn, lat: ev.target.value })} />
              </div>
              <div>
                <label style={labelStyle}>LNG *</label>
                <input style={inputStyle} type="number" step="0.0000001" value={cn.lng} onChange={(ev) => setCn({ ...cn, lng: ev.target.value })} />
              </div>
              <div>
                <label style={labelStyle}>RADIUS (ft)</label>
                <input style={inputStyle} type="number" value={cn.radius_ft} onChange={(ev) => setCn({ ...cn, radius_ft: ev.target.value })} />
              </div>
            </div>
            <label style={{ fontSize: 12, color: C.text }}>
              <input type="checkbox" checked={cn.is_default} onChange={(ev) => setCn({ ...cn, is_default: ev.target.checked })} style={{ marginRight: 6 }} />
              Set as default yard
            </label>
            <div>
              <label style={labelStyle}>NOTES</label>
              <input style={inputStyle} value={cn.notes} onChange={(ev) => setCn({ ...cn, notes: ev.target.value })} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <Btn onClick={handleCreateSubmit}>CREATE</Btn>
            <Btn onClick={() => setShowCreate(false)} variant="ghost">
              CANCEL
            </Btn>
          </div>
        </ModalWrap>
      )}

      {/* Edit Modal */}
      {editYard && (
        <ModalWrap title={`Edit Yard — ${editYard.name}`} onClose={() => setEditYard(null)} width={600}>
          <div style={{ display: "grid", gap: 10 }}>
            <div>
              <label style={labelStyle}>NAME</label>
              <input style={inputStyle} value={e.name} onChange={(ev) => setE({ ...e, name: ev.target.value })} disabled={!canManage} />
            </div>
            <div>
              <label style={labelStyle}>ADDRESS</label>
              <input style={inputStyle} value={e.address} onChange={(ev) => setE({ ...e, address: ev.target.value })} disabled={!canManage} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 60px 1fr", gap: 8 }}>
              <div>
                <label style={labelStyle}>CITY</label>
                <input style={inputStyle} value={e.city} onChange={(ev) => setE({ ...e, city: ev.target.value })} disabled={!canManage} />
              </div>
              <div>
                <label style={labelStyle}>STATE</label>
                <input
                  style={inputStyle}
                  value={e.state}
                  onChange={(ev) => setE({ ...e, state: ev.target.value.toUpperCase().slice(0, 2) })}
                  disabled={!canManage}
                />
              </div>
              <div>
                <label style={labelStyle}>ZIP</label>
                <input style={inputStyle} value={e.zip} onChange={(ev) => setE({ ...e, zip: ev.target.value })} disabled={!canManage} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <div>
                <label style={labelStyle}>LAT</label>
                <input
                  style={inputStyle}
                  type="number"
                  step="0.0000001"
                  value={e.lat}
                  onChange={(ev) => setE({ ...e, lat: ev.target.value })}
                  disabled={!canManage}
                />
              </div>
              <div>
                <label style={labelStyle}>LNG</label>
                <input
                  style={inputStyle}
                  type="number"
                  step="0.0000001"
                  value={e.lng}
                  onChange={(ev) => setE({ ...e, lng: ev.target.value })}
                  disabled={!canManage}
                />
              </div>
              <div>
                <label style={labelStyle}>RADIUS (ft)</label>
                <input
                  style={inputStyle}
                  type="number"
                  value={e.radius_ft}
                  onChange={(ev) => setE({ ...e, radius_ft: ev.target.value })}
                  disabled={!canManage}
                />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div>
                <label style={labelStyle}>LIFECYCLE</label>
                <select
                  style={inputStyle}
                  value={e.lifecycle_status}
                  onChange={(ev) => setE({ ...e, lifecycle_status: ev.target.value })}
                  disabled={!canManage}
                >
                  <option value="active">Active</option>
                  <option value="retired">Retired</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>DEFAULT?</label>
                <label style={{ display: "block", fontSize: 12, color: C.text, padding: "6px 0" }}>
                  <input
                    type="checkbox"
                    checked={e.is_default}
                    onChange={(ev) => setE({ ...e, is_default: ev.target.checked })}
                    style={{ marginRight: 6 }}
                    disabled={!canManage}
                  />
                  Default yard
                </label>
              </div>
            </div>
            {editYard.gps_geofence_id && (
              <div style={{ fontSize: 11, color: C.muted, fontFamily: "monospace", padding: 8, background: C.steel, borderRadius: 4 }}>
                Linked GPS geofence ID: {editYard.gps_geofence_id}
              </div>
            )}
            <div>
              <label style={labelStyle}>NOTES</label>
              <input style={inputStyle} value={e.notes} onChange={(ev) => setE({ ...e, notes: ev.target.value })} disabled={!canManage} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            {canManage && <Btn onClick={handleSaveEdit}>SAVE</Btn>}
            <Btn onClick={() => setEditYard(null)} variant="ghost">
              CLOSE
            </Btn>
            {canManage && editYard.lifecycle_status === "active" && (
              <button
                onClick={() => {
                  setRetireDeleteGeofence(false);
                  setRetireConfirm(editYard);
                }}
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

      {/* Retire confirm */}
      {retireConfirm && (
        <ModalWrap title={`Retire — ${retireConfirm.name}?`} onClose={() => setRetireConfirm(null)} width={460}>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>
            Retiring marks the yard inactive (hidden from the default list). Records and history are preserved; you can un-retire later from the Edit modal.
          </div>
          {retireConfirm.gps_geofence_id && (
            <label style={{ display: "block", fontSize: 12, color: C.text, padding: 10, background: C.steel, borderRadius: 4, marginBottom: 12 }}>
              <input type="checkbox" checked={retireDeleteGeofence} onChange={(ev) => setRetireDeleteGeofence(ev.target.checked)} style={{ marginRight: 6 }} />
              Also delete the GPS provider geofence ({retireConfirm.gps_geofence_id})
            </label>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => {
                const id = retireConfirm.id;
                const del = retireDeleteGeofence;
                setRetireConfirm(null);
                handleRetire(id, del);
              }}
              style={{
                background: C.red,
                color: C.white,
                fontSize: 12,
                fontWeight: 700,
                padding: "8px 16px",
                borderRadius: 4,
                border: "none",
                cursor: "pointer",
              }}
            >
              RETIRE
            </button>
            <Btn onClick={() => setRetireConfirm(null)} variant="ghost">
              CANCEL
            </Btn>
          </div>
        </ModalWrap>
      )}

      {notice && <NoticeModal title={notice.title} message={notice.message} variant={notice.variant} onClose={() => setNotice(null)} />}
    </div>
  );
}

export default YardsPage;
