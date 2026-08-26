import { describe, expect, test } from "bun:test";

import { config } from "../config";
import { loadRemoteState } from "./remote-state";

/** Replaces global fetch only for the duration of one call, whatever other files do. */
async function withResponse<T>(body: unknown, run: () => Promise<T>): Promise<T> {
  const previous = globalThis.fetch;
  const stub = () => Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
  globalThis.fetch = stub as unknown as typeof fetch;

  try {
    return await run();
  } finally {
    globalThis.fetch = previous;
  }
}

describe("loadRemoteState", () => {
  test("stays inactive while the web app is not configured", async () => {
    if (config.sheetsWebApp) return;

    expect(await loadRemoteState()).toBeNull();
  });

  test("keeps only numeric ids from the sheet", async () => {
    if (!config.sheetsWebApp) return;

    const state = await withResponse({ ok: true, subscribers: [1, "два", null, 3], admins: [7] }, () =>
      loadRemoteState(),
    );

    expect(state).toEqual({ subscribers: [1, 3], admins: [7] });
  });

  test("reports a refused request instead of returning empty lists", async () => {
    if (!config.sheetsWebApp) return;

    const message = await withResponse({ ok: false, error: "forbidden" }, () =>
      loadRemoteState().catch((error: Error) => error.message),
    );

    expect(message).toContain("refused");
  });
});
