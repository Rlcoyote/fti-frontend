import { useState } from "react";
import { C, API_URL } from "./config.js";
import { Btn, Z_INDEX, inputStyle, labelStyle } from "./SharedUI.jsx";

// ─── NewJobCustomerPicker (v28.103 — ship 10 of NewJobModal split) ─────────
// Customer search + dropdown + "Add New Customer" inline sub-modal. On
// pick, fetches that customer's contacts and writes them to the
// parent's knownContacts (which NewJobContactsPanel reads to populate
// its POC + Approver pickers).
//
// Local state (owned by this component, parent doesn't need to see):
//   showCustDrop   — autocomplete open/close
//   showAddCust    — add-new sub-modal open/close
//   newCustName    — sub-modal's name input value
//   newCustMsg     — sub-modal's inline error/success message
//
// Parent state (passed in):
//   custSearch + setCustSearch  — the search input value (in dirty
//                                 check + validateAndCreate)
//   selectedCust + setSelectedCust — selected customer object (in
//                                 saveContactsForCustomer for the
//                                 customer_id; selectedCust?.id)
//   setKnownContacts            — written when a customer is picked;
//                                 NewJobContactsPanel reads it
//   customers / refreshCustomers — both from useApp() in the parent;
//                                 passed in so this component is
//                                 self-contained against the context
//
// Validation:
//   error           — errors.customer string from parent
//   clearError      — () => parent clears errors.customer
//   `data-error="customer"` attribute preserved for scroll-to-error

export default function NewJobCustomerPicker({
  customers,
  refreshCustomers,
  custSearch,
  setCustSearch,
  selectedCust,
  setSelectedCust,
  setKnownContacts,
  error,
  clearError,
}) {
  const [showCustDrop, setShowCustDrop] = useState(false);
  const [showAddCust, setShowAddCust] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustMsg, setNewCustMsg] = useState("");

  const filteredCust = custSearch.length > 0 ? customers.filter((c) => c.name.toLowerCase().includes(custSearch.toLowerCase())) : customers;

  const selectCustomer = (cust) => {
    setSelectedCust(cust);
    setCustSearch(cust.name);
    setShowCustDrop(false);
    if (clearError) clearError();
    // Fetch known contacts for this customer
    fetch(`${API_URL}/customers/${cust.id}/contacts`)
      .then((r) => (r.ok ? r.json() : []))
      .then((contacts) => setKnownContacts(contacts))
      .catch(() => setKnownContacts([]));
  };

  const submitNewCustomer = async () => {
    if (!newCustName.trim()) {
      setNewCustMsg("Name is required.");
      return;
    }
    try {
      const r = await fetch(`${API_URL}/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCustName.trim() }),
      });
      if (r.ok) {
        const created = await r.json();
        await refreshCustomers();
        selectCustomer(created);
        setShowAddCust(false);
        setNewCustName("");
        setNewCustMsg("");
      } else {
        const d = await r.json().catch(() => null);
        setNewCustMsg(d?.error || "Failed to create customer.");
      }
    } catch {
      setNewCustMsg("Error creating customer.");
    }
  };

  return (
    <div style={{ marginBottom: 14, position: "relative" }}>
      <label style={labelStyle}>CUSTOMER *</label>
      <input
        style={{ ...inputStyle, borderColor: error ? C.red : selectedCust ? C.green : C.border }}
        value={custSearch}
        onChange={(e) => {
          setCustSearch(e.target.value);
          setShowCustDrop(true);
          setSelectedCust(null);
          if (clearError) clearError();
        }}
        onFocus={() => setShowCustDrop(true)}
        placeholder="Type to search or browse..."
      />
      {error && (
        <div data-error="customer" style={{ fontSize: 11, color: C.red, marginTop: 3, fontWeight: 700 }}>
          ⚠ {error}
        </div>
      )}
      {showCustDrop && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 10,
            background: C.cardBg,
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            boxShadow: "0 8px 32px #00000022",
            maxHeight: 220,
            overflowY: "auto",
            marginTop: 2,
          }}
        >
          {filteredCust.map((c) => (
            <div
              key={c.name}
              onClick={() => selectCustomer(c)}
              style={{
                padding: "8px 12px",
                cursor: "pointer",
                fontSize: 12,
                display: "flex",
                justifyContent: "space-between",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = C.steel)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span style={{ fontWeight: 700, color: C.text }}>{c.name}</span>
              <span style={{ color: C.muted, fontSize: 11 }}>{[c.city, c.state].filter(Boolean).join(", ")}</span>
            </div>
          ))}
          {filteredCust.length === 0 && custSearch.trim() && <div style={{ padding: 10, color: C.muted, fontSize: 12, textAlign: "center" }}>No matches</div>}
          <div
            onClick={() => {
              setShowCustDrop(false);
              setNewCustName(custSearch.trim());
              setShowAddCust(true);
            }}
            style={{
              padding: "10px 12px",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 700,
              color: C.blue,
              borderTop: `1px solid ${C.border}`,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#e8f0fb")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            + Add New Customer
          </div>
        </div>
      )}
      {showAddCust && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: C.scrim,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: Z_INDEX.overlay,
          }}
          onClick={() => setShowAddCust(false)}
        >
          <div
            style={{
              background: C.cardBg,
              border: `1px solid ${C.border}`,
              borderTop: `4px solid ${C.blue}`,
              borderRadius: 8,
              padding: 24,
              width: 420,
              maxWidth: "90vw",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 12 }}>ADD NEW CUSTOMER</div>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 16 }}>This customer will be created in FTI and flagged for QuickBooks sync.</div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>CUSTOMER NAME *</label>
              <input style={inputStyle} value={newCustName} onChange={(e) => setNewCustName(e.target.value)} placeholder="Company name" autoFocus />
            </div>
            {newCustMsg && (
              <div style={{ fontSize: 11, color: newCustMsg.includes("fail") ? C.red : C.green, marginBottom: 8, fontWeight: 700 }}>{newCustMsg}</div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <Btn onClick={submitNewCustomer}>CREATE CUSTOMER</Btn>
              <Btn
                variant="ghost"
                onClick={() => {
                  setShowAddCust(false);
                  setNewCustMsg("");
                }}
              >
                CANCEL
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
