import { C } from "./config.js";
import { Btn, ModalWrap, inputStyle, labelStyle } from "./SharedUI.jsx";

// ─── Yard "add" flow modals (extracted from YardsPage v28.236) ───────────────
// Add-picker (Link vs Create) → Link Existing geofence → Create New yard.

export function YardAddPicker({ onLink, onCreate, onClose }) {
  const card = { textAlign: "left", padding: 14, background: C.steel, border: `1px solid ${C.border}`, borderRadius: 6, cursor: "pointer" };
  const title = { fontWeight: 700, fontSize: 13, color: C.text, marginBottom: 4 };
  const sub = { fontSize: 11, color: C.muted };
  return (
    <ModalWrap title="Add a Yard" onClose={onClose} width={480}>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 14 }}>Choose how to add the yard:</div>
      <div style={{ display: "grid", gap: 10 }}>
        <button className="fti-btn" onClick={onLink} style={card}>
          <div style={title}>Link an Existing Geofence</div>
          <div style={sub}>
            Use a geofence you've already created in the GPS provider's dashboard (e.g., "FT - Wickett Yard"). FTI stores the linkage; the geofence shape lives
            on the provider's side. Recommended when the yard already exists in the GPS account.
          </div>
        </button>
        <button className="fti-btn" onClick={onCreate} style={card}>
          <div style={title}>Create a New Yard</div>
          <div style={sub}>
            Enter the yard's name, address, coordinates, and radius. FTI creates a new circular geofence in the GPS provider for you. Use this when the yard
            isn't in the GPS account yet.
          </div>
        </button>
      </div>
    </ModalWrap>
  );
}

export function YardLinkModal({ loading, result, geofences, picked, setPicked, yardName, setYardName, isDefault, setIsDefault, onSubmit, onClose }) {
  return (
    <ModalWrap title="Link Existing GPS Geofence" onClose={onClose} width={600}>
      {loading ? (
        <div style={{ padding: 30, textAlign: "center", color: C.muted, fontSize: 13 }}>Loading GPS geofences…</div>
      ) : (
        <>
          {result && (
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 12, padding: 10, background: C.steel, borderRadius: 4 }}>
              {result.provider_total} total geofences on the GPS provider · {result.already_linked_count} already linked · {result.available_count} available to
              link
            </div>
          )}
          {geofences.length === 0 ? (
            <div style={{ padding: 30, textAlign: "center", color: C.muted, fontSize: 13 }}>
              No unlinked geofences available. Create one in the GPS provider's dashboard first, then come back here.
            </div>
          ) : (
            <>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>Pick a geofence to link:</div>
              <div style={{ maxHeight: 280, overflow: "auto", border: `1px solid ${C.border}`, borderRadius: 4, marginBottom: 12 }}>
                {geofences.map((g) => {
                  const selected = picked?.id === g.id;
                  return (
                    <div
                      key={g.id}
                      onClick={() => {
                        setPicked(g);
                        setYardName(g.name || "");
                      }}
                      style={{ padding: 10, cursor: "pointer", background: selected ? C.greenB : "transparent", borderBottom: `1px solid ${C.border}22` }}
                    >
                      <div style={{ fontSize: 13, fontWeight: selected ? 700 : 500, color: C.text }}>{g.name || "(unnamed)"}</div>
                      {g.formattedAddress && <div style={{ fontSize: 11, color: C.muted }}>{g.formattedAddress}</div>}
                      <div style={{ fontSize: 10, color: C.muted, fontFamily: "monospace" }}>{g.id}</div>
                    </div>
                  );
                })}
              </div>
              {picked && (
                <div style={{ display: "grid", gap: 10, marginBottom: 12 }}>
                  <div>
                    <label style={labelStyle}>YARD NAME (display in FTI)</label>
                    <input style={inputStyle} value={yardName} onChange={(ev) => setYardName(ev.target.value)} placeholder={picked.name || ""} />
                  </div>
                  <label style={{ fontSize: 12, color: C.text }}>
                    <input type="checkbox" checked={isDefault} onChange={(ev) => setIsDefault(ev.target.checked)} style={{ marginRight: 6 }} />
                    Set as default yard (replaces current default if any)
                  </label>
                </div>
              )}
            </>
          )}
        </>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <Btn onClick={onSubmit} disabled={!picked}>
          LINK
        </Btn>
        <Btn onClick={onClose} variant="ghost">
          CANCEL
        </Btn>
      </div>
    </ModalWrap>
  );
}

export function YardCreateModal({ cn, setCn, onSubmit, onClose }) {
  const upd = (k, transform) => (ev) => setCn({ ...cn, [k]: transform ? transform(ev.target.value) : ev.target.value });
  return (
    <ModalWrap title="Create a New Yard" onClose={onClose} width={560}>
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 12 }}>
        Enter the yard's details. FTI pushes a circular geofence to the GPS provider on save.
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        <div>
          <label style={labelStyle}>NAME *</label>
          <input style={inputStyle} value={cn.name} onChange={upd("name")} />
        </div>
        <div>
          <label style={labelStyle}>ADDRESS</label>
          <input style={inputStyle} value={cn.address} onChange={upd("address")} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 60px 1fr", gap: 8 }}>
          <div>
            <label style={labelStyle}>CITY</label>
            <input style={inputStyle} value={cn.city} onChange={upd("city")} />
          </div>
          <div>
            <label style={labelStyle}>STATE</label>
            <input style={inputStyle} value={cn.state} onChange={upd("state", (v) => v.toUpperCase().slice(0, 2))} placeholder="TX" />
          </div>
          <div>
            <label style={labelStyle}>ZIP</label>
            <input style={inputStyle} value={cn.zip} onChange={upd("zip")} />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          <div>
            <label style={labelStyle}>LAT *</label>
            <input style={inputStyle} type="number" step="0.0000001" value={cn.lat} onChange={upd("lat")} />
          </div>
          <div>
            <label style={labelStyle}>LNG *</label>
            <input style={inputStyle} type="number" step="0.0000001" value={cn.lng} onChange={upd("lng")} />
          </div>
          <div>
            <label style={labelStyle}>RADIUS (ft)</label>
            <input style={inputStyle} type="number" value={cn.radius_ft} onChange={upd("radius_ft")} />
          </div>
        </div>
        <label style={{ fontSize: 12, color: C.text }}>
          <input type="checkbox" checked={cn.is_default} onChange={(ev) => setCn({ ...cn, is_default: ev.target.checked })} style={{ marginRight: 6 }} />
          Set as default yard
        </label>
        <div>
          <label style={labelStyle}>NOTES</label>
          <input style={inputStyle} value={cn.notes} onChange={upd("notes")} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <Btn onClick={onSubmit}>CREATE</Btn>
        <Btn onClick={onClose} variant="ghost">
          CANCEL
        </Btn>
      </div>
    </ModalWrap>
  );
}
