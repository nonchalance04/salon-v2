import assert from "node:assert/strict";
import { test } from "node:test";
import { api, ApiError } from "../src/lib/api.ts";

test("API requests preserve JSON, credentials, empty responses, and session notifications", async () => {
  const originalFetch = globalThis.fetch;
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const events: string[] = [];
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { dispatchEvent: (event: Event) => events.push(event.type) },
  });

  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(url, "/api/configuration/profile");
      assert.equal(options?.credentials, "include");
      assert.equal(options?.method, "PUT");
      assert.equal(options?.body, '{"name":"Salon"}');
      assert.deepEqual(options?.headers, { "Content-Type": "application/json", "X-Test": "value" });
      return Response.json({ saved: true });
    };
    assert.deepEqual(await api("/configuration/profile", {
      method: "PUT", body: '{"name":"Salon"}', headers: { "X-Test": "value" },
    }), { saved: true });

    globalThis.fetch = async () => new Response(null, { status: 204 });
    assert.equal(await api("/configuration/closures/id", { method: "DELETE" }), undefined);

    for (const path of ["/auth/login", "/auth/me", "/appointments/otp/session", "/reports/dashboard"]) {
      globalThis.fetch = async () => Response.json({ error: { message: "Sign in again", details: { retry: true } } }, { status: 401 });
      await assert.rejects(api(path), error => {
        assert.ok(error instanceof ApiError);
        assert.equal(error.status, 401);
        assert.equal(error.message, "Sign in again");
        assert.deepEqual(error.details, { retry: true });
        return true;
      });
    }
    assert.deepEqual(events, ["session-expired"]);

    events.length = 0;
    globalThis.fetch = async () => Response.json({ error: { code: "GUEST_SESSION_EXPIRED" } }, { status: 401 });
    await assert.rejects(api("/appointments/otp/session"), ApiError);
    await assert.rejects(api("/appointments/lookup"), ApiError);
    assert.deepEqual(events, ["guest-session-expired"]);

    events.length = 0;
    globalThis.fetch = async () => new Response("unavailable", { status: 503 });
    await assert.rejects(api("/services"), { message: "The request could not be completed.", status: 503 });
    assert.deepEqual(events, []);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
