// ─── Shared API client (v28.244) ────────────────────────────────────────────
// One front door for every call to the FTI backend. It exists to kill a whole
// bug class: `fetch()` does NOT throw on 4xx/5xx, so ~200 hand-written call
// sites each had to remember `if (!res.ok)` — and the ones that forgot treated
// a failed request as success (the v28.221 driveInfo bug, the v28.232 sweep,
// the JSA-save-without-ok). Here that check lives in ONE place: a non-ok
// response throws ApiError, so a caller literally cannot fall through on
// failure — `await api.get(...)` either returns data or throws.
//
// What this layer does NOT do (and must not duplicate): auth-token injection
// and the 401 session-expiry bounce. Those are handled globally by the
// window.fetch wrapper installed in AppContext.jsx (v27.65 / v28.220). This
// client calls fetch() — i.e. the wrapped fetch — so that behavior still
// applies untouched. Keep the two layers separate.
//
// Usage:
//   const customers = await api.get("/customers");           // throws on !ok
//   const created   = await api.post("/customers", { name }); // JSON body
//   await api.put(`/tickets/${id}`, payload);
//   await api.del(`/tickets/${id}`);
//   api.post("/audit", row).catch(() => {});                  // fire-and-forget
//
// Paths are relative to API_URL ("/customers"); an absolute http(s) URL is used
// as-is. Pass a FormData body and it's sent as multipart (no JSON stringify).

import { API_URL } from "./config.js";
import { addBreadcrumb, reportError } from "./errorReporter.js";

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body; // parsed JSON error body when the server sent one, else {}
  }
}

// Core request. Returns parsed JSON (or null for an empty/204 response).
// Throws ApiError on a non-ok status; lets a genuine network error reject as-is.
export async function request(path, { method = "GET", body, headers, ...rest } = {}) {
  const url = /^https?:\/\//.test(path) ? path : `${API_URL}${path}`;
  const init = { method, ...rest };

  if (body !== undefined && body !== null) {
    if (body instanceof FormData) {
      init.body = body; // browser sets multipart Content-Type + boundary
      if (headers) init.headers = headers;
    } else {
      init.headers = { "Content-Type": "application/json", ...(headers || {}) };
      init.body = JSON.stringify(body);
    }
  } else if (headers) {
    init.headers = headers;
  }

  let res;
  try {
    res = await fetch(url, init);
  } catch (netErr) {
    // v28.368 — a request that never reached the server is a reportable event.
    addBreadcrumb("api", `${method} ${path} NETWORK-FAIL`);
    reportError({ message: `Network failure: ${method} ${path}`, severity: "api", context: { path, method } });
    throw netErr;
  }
  addBreadcrumb("api", `${method} ${path} ${res.status}`);
  if (res.status >= 500) {
    reportError({ message: `API ${res.status}: ${method} ${path}`, severity: "api", context: { path, method, status: res.status } });
  }

  if (!res.ok) {
    // Pull a structured error message when the server sent one; never throw
    // while parsing the error itself.
    const errBody = await res.json().catch(() => ({}));
    throw new ApiError(errBody.error || errBody.message || `Request failed (HTTP ${res.status})`, res.status, errBody);
  }

  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export const api = {
  get: (path, opts) => request(path, { ...opts, method: "GET" }),
  post: (path, body, opts) => request(path, { ...opts, method: "POST", body }),
  put: (path, body, opts) => request(path, { ...opts, method: "PUT", body }),
  patch: (path, body, opts) => request(path, { ...opts, method: "PATCH", body }),
  del: (path, body, opts) => request(path, { ...opts, method: "DELETE", body }),
};
