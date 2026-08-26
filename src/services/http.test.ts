import { describe, expect, test } from "bun:test";

import { describeError, requestWebApp } from "./http";

const TEST_URL = "https://example.test/exec";

/**
 * Replaces global fetch for the duration of one call. Requests to other addresses are
 * passed through untouched: a delayed state push from another test must not be counted.
 */
async function withFetch<T>(stub: () => Promise<Response>, run: () => Promise<T>): Promise<T> {
  const previous = globalThis.fetch;

  globalThis.fetch = ((input: Parameters<typeof fetch>[0], init?: RequestInit) =>
    String(input).startsWith(TEST_URL) ? stub() : previous(input as never, init)) as unknown as typeof fetch;

  try {
    return await run();
  } finally {
    globalThis.fetch = previous;
  }
}

describe("describeError", () => {
  test("turns a timeout into a readable phrase", () => {
    const timeout = new Error("signal timed out");
    timeout.name = "TimeoutError";

    expect(describeError(timeout)).toBe("the request timed out");
  });

  test("keeps the message of an ordinary error", () => {
    expect(describeError(new Error("Web app answered 500"))).toBe("Web app answered 500");
  });

  test("survives a value that is not an error at all", () => {
    expect(describeError("boom")).toBe("boom");
  });
});

describe("requestWebApp", () => {
  test("retries once when the first attempt fails", async () => {
    let calls = 0;

    const response = await withFetch(
      () => {
        calls += 1;
        return calls === 1
          ? Promise.reject(new Error("network down"))
          : Promise.resolve(new Response("{}", { status: 200 }));
      },
      () => requestWebApp(TEST_URL),
    );

    expect(calls).toBe(2);
    expect(response.status).toBe(200);
  });

  test("gives up when the retry fails too", async () => {
    const failing = await withFetch(
      () => Promise.reject(new Error("still down")),
      () => requestWebApp(TEST_URL).catch((error: Error) => error.message),
    );

    expect(failing).toBe("still down");
  });
});
