import { afterEach, describe, expect, test } from "bun:test";
import { rm } from "node:fs/promises";

import { config } from "../config";
import type { SessionData } from "../context";
import { createSessionStorage } from "./session-storage";

const halfFilled: SessionData = { step: "age", draft: { name: "Айпери" } };
const finished: SessionData = { step: "idle", draft: {} };

afterEach(() => rm(config.dataDir, { recursive: true, force: true }));

describe("session storage", () => {
  test("returns undefined for an unknown chat", async () => {
    expect(await createSessionStorage().read("nobody")).toBeUndefined();
  });

  test("survives a restart with the form half filled", async () => {
    await createSessionStorage().write("42", halfFilled);

    // A fresh instance stands in for the process being restarted.
    expect(await createSessionStorage().read("42")).toEqual(halfFilled);
  });

  test("drops the session once the form is finished", async () => {
    const storage = createSessionStorage();
    await storage.write("42", halfFilled);
    await storage.write("42", finished);

    expect(await createSessionStorage().read("42")).toBeUndefined();
  });

  test("keeps chats independent", async () => {
    const storage = createSessionStorage();
    await storage.write("1", halfFilled);
    await storage.write("2", { step: "contact", draft: { name: "Данияр", age: 12 } });

    await storage.delete("1");

    const restored = createSessionStorage();
    expect(await restored.read("1")).toBeUndefined();
    expect((await restored.read("2"))?.draft.name).toBe("Данияр");
  });
});
