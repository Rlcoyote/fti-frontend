import { C } from "./config.js";
import { Btn, ModalWrap, inputStyle, labelStyle } from "./SharedUI.jsx";

// ─── Yard edit + retire modals (extracted from YardsPage v28.236) ────────────

export function YardEditModal({ yard, e, setE, canManage, onSave, onClose, onRetire }) {
  const ro = !canManage;
  const upd = (k, transform) => (ev) => setE({ ...e, [k]: transform ? transform(ev.target.value) : ev.target.value });
  return (
    <ModalWrap title={`Edit Yard — ${yard.name}`} onClose={onClose} width={600}>
      <div style={{ display: "grid", gap: 10 }}>
        <div>
          <label style={labelStyle}>NAME</label>
          <input style={inputStyle} value={e.name} onChange={upd("name")} disabled={ro} />
        </div>
        <div>
          <label style={labelStyle}>ADDRESS</label>
          <input style={inputStyle} value={e.address} onChange={upd("address")} disabled={ro} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 60px 1fr", gap: 8 }}>
          <div>
            <label style={labelStyle}>CITY</label>
            <input style={inputStyle} value={e.city} onChange={upd("city")} disabled={ro} />
          </div>
          <div>
            <label style={labelStyle}>STATE</label>
            <input style={inputStyle} value={e.state} onChange={upd("state", (v) => v.toUpperCase().slice(0, 2))} disabled={ro} />
          </div>
          <div>
            <label style={labelStyle}>ZIP</label>
            <input style={inputStyle} value={e.zip} onChange={upd("zip")} disabled={ro} />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          <div>
            <label style={labelStyle}>LAT</label>
            <input style={inputStyle} type="number" step="0.0000001" value={e.lat} onChange={upd("lat")} disabled={ro} />
          </div>
          <div>
            <label style={labelStyle}>LNG</label>
            <input style={inputStyle} type="number" step="0.0000001" value={e.lng} onChange={upd("lng")} disabled={ro} />
          </div>
          <div>
            <label style={labelStyle}>RADIUS (ft)</label>
            <input style={inputStyle} type="number" value={e.radius_ft} onChange={upd("radius_ft")} disabled={ro} />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div>
            <label style={labelStyle}>LIFECYCLE</label>
            <select style={inputStyle} value={e.lifecycle_status} onChange={upd("lifecycle_status")} disabled={ro}>
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
                disabled={ro}
              />
              Default yard
            </label>
          </div>
        </div>
        {yard.gps_geofence_id && (
          <div style={{ fontSize: 11, color: C.muted, fontFamily: "monospace", padding: 8, background: C.steel, borderRadius: 4 }}>
            Linked GPS geofence ID: {yard.gps_geofence_id}
          </div>
        )}
        <div>
          <label style={labelStyle}>NOTES</label>
          <input style={inputStyle} value={e.notes} onChange={upd("notes")} disabled={ro} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        {canManage && <Btn onClick={onSave}>SAVE</Btn>}
        <Btn onClick={onClose} variant="ghost">
          CLOSE
        </Btn>
        {canManage && yard.lifecycle_status === "active" && (
          <button
            onClick={onRetire}
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
  );
}

export function YardRetireConfirm({ yard, deleteGeofence, setDeleteGeofence, onConfirm, onClose }) {
  return (
    <ModalWrap title={`Retire — ${yard.name}?`} onClose={onClose} width={460}>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>
        Retiring marks the yard inactive (hidden from the default list). Records and history are preserved; you can un-retire later from the Edit modal.
      </div>
      {yard.gps_geofence_id && (
        <label style={{ display: "block", fontSize: 12, color: C.text, padding: 10, background: C.steel, borderRadius: 4, marginBottom: 12 }}>
          <input type="checkbox" checked={deleteGeofence} onChange={(ev) => setDeleteGeofence(ev.target.checked)} style={{ marginRight: 6 }} />
          Also delete the GPS provider geofence ({yard.gps_geofence_id})
        </label>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={onConfirm}
          style={{ background: C.red, color: C.white, fontSize: 12, fontWeight: 700, padding: "8px 16px", borderRadius: 4, border: "none", cursor: "pointer" }}
        >
          RETIRE
        </button>
        <Btn onClick={onClose} variant="ghost">
          CANCEL
        </Btn>
      </div>
    </ModalWrap>
  );
}
