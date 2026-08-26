import { afterAll, describe, expect, test } from "bun:test";
import { rm } from "node:fs/promises";

import { config } from "../config";
import { readApplications, recordApplication } from "./storage";
import type { Application } from "../types";

const sample = (name: string): Application => ({
  name,
  age: 10,
  location: "Кыргызстан, Бишкек",
  contact: "@student",
  telegramId: 1,
  telegramUsername: "@student",
  submittedAt: "2026-08-26T10:00:00.000Z",
});

afterAll(() => rm(config.dataDir, { recursive: true, force: true }));

describe("applications log", () => {
  test("keeps every application in submission order", async () => {
    await recordApplication(sample("Айпери"));
    await recordApplication(sample("Данияр"));

    const stored = await readApplications();

    expect(stored.map((a) => a.name)).toEqual(["Айпери", "Данияр"]);
    expect(stored[0]?.location).toBe("Кыргызстан, Бишкек");
  });
});
