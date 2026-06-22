import { C } from "./config.js";
import { Btn, inputStyle, labelStyle } from "./SharedUI.jsx";

// ─── Vehicle add/edit forms (extracted from VehiclesPage v28.235) ────────────

function Field({ label, children }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

export function AddVehicleForm({ n, setN, users, onAdd, onCancel, isMob }) {
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
        <Field label="GPS ID">
          <input style={inputStyle} value={n.gps_vehicle_id} onChange={upd("gps_vehicle_id")} />
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

export function EditVehicleForm({ e, setE, users, canManage }) {
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
        <Field label="GPS ID">
          <input style={inputStyle} value={e.gps_vehicle_id} onChange={upd("gps_vehicle_id")} disabled={ro} />
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
