import { useState, useEffect, useCallback } from "react";
import { API_URL } from "./config.js";

// ─── useTicketDvir (v28.190) ─────────────────────────────────────────────────
// Mirrors useTicketJSA's shape but for the DVIR (Driver Vehicle Inspection
// Report) gate. Loads "does this ticket's primary vehicle have a passing
// pre-trip today, and is it free of an active red-tag?" from
// /api/inspections/current.
//
// A DVIR is a vehicle + driver + date record (not ticket-bound). One pre-trip
// per vehicle per day covers every ticket that vehicle serves. The gate fails
// if EITHER there's no passing pre-trip OR there's an active (uncleared)
// red-tag on the vehicle.
//
// Returns:
//   dvir          — the inspection row (or null) if a pre-trip exists for the day
//   hasPassingPreTrip — true iff inspection_type='pre_trip' AND result='pass'
//   activeRedTag  — most-recent uncleared red_tags row for the vehicle (or null)
//   ok            — true iff hasPassingPreTrip AND !activeRedTag (the green light)
//   loaded        — true once the lookup completed (success or error)
//   refresh()     — call to re-pull (e.g., after the user submits a DVIR and
//                   navigates back; the parent can fire this to flip the bar
//                   from red to green without a page reload)
//
// Dependencies:
//   ticket — needs .gpsVehicleId (the primary vehicle) and .date (yyyy-mm-dd).
//            If gpsVehicleId is missing, returns loaded=true with ok=false
//            and a reason ('no_vehicle') so the bar can render "Pick a vehicle
//            on this ticket first."

export default function useTicketDvir(ticket) {
  const [dvir, setDvir] = useState(null);
  const [hasPassingPreTrip, setHasPassingPreTrip] = useState(false);
  const [activeRedTag, setActiveRedTag] = useState(null);
  const [ok, setOk] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [reason, setReason] = useState(null); // 'no_vehicle' | 'no_dvir' | 'failed_dvir' | 'red_tagged' | null

  const vehicleId = ticket?.gpsVehicleId || ticket?.gps_vehicle_id || null;
  const date = (ticket?.date || "").slice(0, 10);

  const load = useCallback(async () => {
    if (!vehicleId) {
      setDvir(null);
      setHasPassingPreTrip(false);
      setActiveRedTag(null);
      setOk(false);
      setReason("no_vehicle");
      setLoaded(true);
      return;
    }
    try {
      const url = `${API_URL}/inspections/current?vehicleId=${encodeURIComponent(vehicleId)}${date ? `&date=${encodeURIComponent(date)}` : ""}`;
      const r = await fetch(url);
      if (!r.ok) {
        setLoaded(true);
        return;
      }
      const body = await r.json();
      setDvir(body.inspection || null);
      setHasPassingPreTrip(!!body.hasPassingPreTrip);
      setActiveRedTag(body.activeRedTag || null);
      setOk(!!body.ok);
      // Reason ladder — most specific block first.
      if (body.activeRedTag) setReason("red_tagged");
      else if (!body.inspection) setReason("no_dvir");
      else if (body.inspection.result !== "pass") setReason("failed_dvir");
      else setReason(null);
    } catch (err) {
      console.error("useTicketDvir load failed:", err);
    } finally {
      setLoaded(true);
    }
  }, [vehicleId, date]);

  useEffect(() => {
    setLoaded(false);
    load();
  }, [load]);

  return { dvir, hasPassingPreTrip, activeRedTag, ok, loaded, reason, refresh: load };
}
