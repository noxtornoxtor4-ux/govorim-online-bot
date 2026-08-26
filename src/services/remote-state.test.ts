import { afterEach, describe, expect, test } from "bun:test";

import { config } from "../config";
import { loadRemoteState } from "./remote-state";

const originalFetch = globalThis.fetch;

function respondWith(body: unknown, status = 200): void {
  const stub = () => Promise.resolve(new Response(JSON.stringify(body), { status }));

  globalThis.fetch = stub as unknown as typeof fetch;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("loadRemoteState", () => {
  test("stays inactive while the web app is not configured", async () => {
    if (config.sheetsWebApp) return;

    expect(await loadRemoteState()).toBeNull();
  });

  test("keeps only numeric ids from the sheet", async () => {
    if (!config.sheetsWebApp) return;

    respondWith({ ok: true, subscribers: [1, "два", null, 3], admins: [7] });

    expect(await loadRemoteState()).toEqual({ subscribers: [1, 3], admins: [7] });
  });

  test("reports a refused request instead of returning empty lists", async () => {
    if (!config.sheetsWebApp) return;

    respondWith({ ok: false, error: "forbidden" });

    expect(loadRemoteState()).rejects.toThrow("refused");
  });
});
