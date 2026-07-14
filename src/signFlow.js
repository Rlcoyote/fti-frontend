// ─── Sign-flow latch (v28.321) ───────────────────────────────────────────────
// TRUE iff this page load arrived on a JSA sign link. Evaluated ONCE at
// module load — before React exists, before LoginScreen strips the query,
// before any remount. Two consumers, both structural (Article XVII):
//   - App.jsx routes the sign flow over any session state
//   - AppContext skips the boot-splash child swap (the swap UNMOUNTS the
//     tree mid-flow, killing the landing state after the one-time URL params
//     were already consumed — the "logged-in phone, panel flashes, then
//     login form / dashboard" field failure, caught by e2e/signlink.spec.js)
export const JSA_SIGN_FLOW = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("jsa_sign");
