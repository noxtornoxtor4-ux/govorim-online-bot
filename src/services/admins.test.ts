import { afterEach, describe, expect, test } from "bun:test";
import { rm } from "node:fs/promises";

import { config } from "../config";
import { countAdmins, grantAdmin, isAdmin, loadAdmins } from "./storage";

afterEach(async () => {
  await rm(config.dataDir, { recursive: true, force: true });
  // loadAdmins resets in-memory state, keeping the tests independent.
  await loadAdmins();
});

describe("admin grants", () => {
  test("a stranger is not an admin", () => {
    expect(isAdmin(999_999)).toBe(false);
  });

  test("grants access and keeps it after a restart", async () => {
    expect(await grantAdmin(555)).toBe(true);
    expect(isAdmin(555)).toBe(true);

    await loadAdmins();
    expect(isAdmin(555)).toBe(true);
  });

  test("granting twice reports that nothing changed", async () => {
    await grantAdmin(777);

    expect(await grantAdmin(777)).toBe(false);
  });

  test("counts every admin once", async () => {
    const before = countAdmins();

    await grantAdmin(1001);
    await grantAdmin(1002);
    await grantAdmin(1001);

    expect(countAdmins()).toBe(before + 2);
  });

  test("ADMIN_IDS from the environment count as admins", () => {
    for (const id of config.adminIds) {
      expect(isAdmin(id)).toBe(true);
    }
  });
});
