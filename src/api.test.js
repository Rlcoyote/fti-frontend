import { describe, it, expect, beforeEach, vi } from "vitest";
import { api, request, ApiError } from "./api.js";
import { API_URL } from "./config.js";

// Build a minimal Response-like stub. fetch() is mocked per-test so we control
// status/body and can assert on the (url, init) the client produced.
function res({ ok = true, status = 200, json, text } = {}) {
  return {
    ok,
    status,
    json: () => (json instanceof Error ? Promise.reject(json) : Promise.resolve(json)),
    text: () => Promise.resolve(text ?? (json !== undefined ? JSON.stringify(json) : "")),
  };
}

beforeEach(() => {
  globalThis.fetch = vi.fn();
});

describe("api — happy path", () => {
  it("GET returns parsed JSON and hits API_URL + path", async () => {
    globalThis.fetch.mockResolvedValue(res({ json: [{ id: 1 }] }));
    const out = await api.get("/customers");
    expect(out).toEqual([{ id: 1 }]);
    const [url, init] = globalThis.fetch.mock.calls[0];
    expect(url).toBe(`${API_URL}/customers`);
    expect(init.method).toBe("GET");
    expect(init.body).toBeUndefined();
  });

  it("POST stringifies a JSON body and sets Content-Type", async () => {
    globalThis.fetch.mockResolvedValue(res({ status: 201, json: { id: 9 } }));
    const out = await api.post("/customers", { name: "Acme" });
    expect(out).toEqual({ id: 9 });
    const [, init] = globalThis.fetch.mock.calls[0];
    expect(init.method).toBe("POST");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(init.body).toBe(JSON.stringify({ name: "Acme" }));
  });

  it("PUT and DELETE map to their methods", async () => {
    globalThis.fetch.mockResolvedValue(res({ json: { ok: true } }));
    await api.put("/tickets/5", { notes: "x" });
    await api.del("/tickets/5");
    expect(globalThis.fetch.mock.calls[0][1].method).toBe("PUT");
    expect(globalThis.fetch.mock.calls[1][1].method).toBe("DELETE");
  });

  it("returns null for 204 No Content", async () => {
    globalThis.fetch.mockResolvedValue(res({ status: 204 }));
    expect(await api.del("/tickets/5")).toBeNull();
  });

  it("returns null for an empty 200 body", async () => {
    globalThis.fetch.mockResolvedValue(res({ text: "" }));
    expect(await api.get("/ping")).toBeNull();
  });
});

describe("api — the whole point: non-ok THROWS", () => {
  it("throws ApiError with the server's error message + status", async () => {
    globalThis.fetch.mockResolvedValue(res({ ok: false, status: 400, json: { error: "Name required" } }));
    await expect(api.post("/customers", {})).rejects.toMatchObject({
      name: "ApiError",
      status: 400,
      message: "Name required",
      body: { error: "Name required" },
    });
    expect(await api.post("/customers", {}).catch((e) => e instanceof ApiError)).toBe(true);
  });

  it("falls back to a generic message when the error body has none", async () => {
    globalThis.fetch.mockResolvedValue(res({ ok: false, status: 500, json: new Error("not json") }));
    await expect(api.get("/boom")).rejects.toMatchObject({ status: 500, message: "Request failed (HTTP 500)" });
  });

  it("a 401 still throws here — the global wrapper owns the redirect, not this layer", async () => {
    globalThis.fetch.mockResolvedValue(res({ ok: false, status: 401, json: { error: "bad password" } }));
    await expect(api.post("/auth/login", {})).rejects.toMatchObject({ status: 401, message: "bad password" });
  });
});

describe("api — bodies", () => {
  it("passes FormData through without JSON stringify or Content-Type", async () => {
    globalThis.fetch.mockResolvedValue(res({ json: { ok: true } }));
    const fd = new FormData();
    fd.append("file", "x");
    await api.post("/vehicles/import", fd);
    const [, init] = globalThis.fetch.mock.calls[0];
    expect(init.body).toBe(fd);
    expect(init.headers).toBeUndefined(); // browser sets multipart boundary itself
  });

  it("uses an absolute URL as-is", async () => {
    globalThis.fetch.mockResolvedValue(res({ json: {} }));
    await request("https://other.example/thing", { method: "GET" });
    expect(globalThis.fetch.mock.calls[0][0]).toBe("https://other.example/thing");
  });
});
