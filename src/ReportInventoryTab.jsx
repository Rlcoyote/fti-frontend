import { C } from "./config.js";
import { cardStyle, headerStyle, rowStyle } from "./reportHelpers.js";

// ─── Inventory tab (extracted from ReportsPage v28.237) ──────────────────────

export default function ReportInventoryTab({ inventory, rptGrid }) {
  const invOut = inventory.filter((i) => i.inYard < i.qtyOwned).sort((a, b) => b.qtyOwned - b.inYard - (a.qtyOwned - a.inYard));
  const totalOut = invOut.reduce((s, i) => s + (i.qtyOwned - i.inYard), 0);
  const lowStock = inventory.filter((i) => i.inYard < 4 && i.inYard > 0);

  return (
    <div style={{ display: "grid", gridTemplateColumns: rptGrid, gap: 16 }}>
      <div style={cardStyle}>
        <div style={headerStyle}>IN FIELD ({totalOut} items out)</div>
        {invOut.length === 0 && <div style={{ fontSize: 12, color: C.muted }}>All inventory in yard</div>}
        {invOut.map((i) => (
          <div key={i.id} style={rowStyle}>
            <span style={{ fontSize: 12, color: C.text }}>
              {i.size} {i.item}
            </span>
            <div style={{ display: "flex", gap: 12 }}>
              <span style={{ fontSize: 11, color: C.muted }}>{i.customer || "—"}</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: C.red }}>{i.qtyOwned - i.inYard} out</span>
            </div>
          </div>
        ))}
      </div>
      <div style={cardStyle}>
        <div style={headerStyle}>LOW STOCK WARNING ({lowStock.length})</div>
        <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>Items with fewer than 4 in yard</div>
        {lowStock.length === 0 && <div style={{ fontSize: 12, color: C.muted }}>No low stock items</div>}
        {lowStock.map((i) => (
          <div key={i.id} style={{ ...rowStyle, background: C.yellowB, borderRadius: 3, padding: "6px 8px", marginBottom: 2 }}>
            <span style={{ fontSize: 12, color: C.text }}>
              {i.size} {i.item}
            </span>
            <span style={{ fontSize: 12, fontWeight: 800, color: C.yellow }}>{i.inYard} in yard</span>
          </div>
        ))}
      </div>
    </div>
  );
}
