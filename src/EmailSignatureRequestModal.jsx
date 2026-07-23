import { C } from "./config.js";
import { Btn, ModalWrap, Z_INDEX } from "./SharedUI.jsx";

// ─── EmailSignatureRequestModal (v28.86 — ship 5 of WorkOrderTicketsTab split) ───
// Pure-presentation modal for the "email signature request" flow. All
// state and async logic live in useTicketEmailRequest (v28.85); this
// component just renders the inputs and wires the buttons to the hook's
// returned methods.
//
// Single-prop contract — accepts the hook return shape directly. Saves
// per-prop boilerplate at the call site (one `emailRequest={emailRequest}`
// vs eight individual props), at the cost of one level of indirection
// inside the modal. Same pattern AddTicketModal eventually settled on.
//
// v28.86 also swaps the hardcoded zIndex: 200 to Z_INDEX.overlay — the
// inline modal had been drifting from the SharedUI.Z_INDEX policy since
// it was written before that constant existed.

export default function EmailSignatureRequestModal({ emailRequest }) {
  const { emailConfirm, emailConfirmTo, setEmailConfirmTo, emailConfirmCc, setEmailConfirmCc, closeEmailRequest, sendEmailRequest } = emailRequest;

  if (!emailConfirm) return null;

  return (
    <ModalWrap variant="dialog" z={Z_INDEX.overlay} width={460} accent={C.blue} onClose={closeEmailRequest}>
      <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 8 }}>
        {emailConfirm.emailedAt ? "Resend Signature Request?" : "Send Signature Request"}
      </div>
      {emailConfirm.emailedAt && (
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 12, lineHeight: 1.6 }}>
          Last sent:{" "}
          <strong>
            {new Date(emailConfirm.emailedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </strong>
        </div>
      )}
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: "0.06em" }}>TO</label>
        <input
          style={{
            width: "100%",
            padding: "10px 12px",
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            fontSize: 14,
            marginTop: 4,
            boxSizing: "border-box",
          }}
          value={emailConfirmTo}
          onChange={(e) => setEmailConfirmTo(e.target.value)}
          placeholder="recipient@company.com"
        />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: "0.06em" }}>CC (optional)</label>
        <input
          style={{
            width: "100%",
            padding: "10px 12px",
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            fontSize: 14,
            marginTop: 4,
            boxSizing: "border-box",
          }}
          value={emailConfirmCc}
          onChange={(e) => setEmailConfirmCc(e.target.value)}
          placeholder="cc@company.com"
        />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Btn variant="blue" onClick={sendEmailRequest}>
          SEND
        </Btn>
        <Btn variant="ghost" onClick={closeEmailRequest}>
          CANCEL
        </Btn>
      </div>
    </ModalWrap>
  );
}
