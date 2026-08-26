import { describe, expect, test } from "bun:test";

import { buildCsv } from "./csv";
import type { Application } from "../types";

const application: Application = {
  name: 'Айпери "Ай"',
  age: 10,
  location: "Кыргызстан, Бишкек",
  contact: "+996700123456",
  telegramId: 1,
  telegramUsername: "@aiperi",
  submittedAt: "2026-08-26T10:00:00.000Z",
};

describe("buildCsv", () => {
  const text = buildCsv([application], "Asia/Bishkek").toString("utf-8");

  test("starts with a BOM so Excel reads Cyrillic correctly", () => {
    expect(text.startsWith("\uFEFF")).toBe(true);
  });

  test("keeps Cyrillic intact", () => {
    expect(text).toContain("Кыргызстан, Бишкек");
  });

  test("escapes quotes inside a cell instead of breaking the row", () => {
    expect(text).toContain('"Айпери ""Ай"""');
    expect(text.split("\r\n")).toHaveLength(2);
  });

  test("renders the date in the configured timezone", () => {
    // 10:00 UTC is 16:00 in Bishkek.
    expect(text).toContain("16:00");
  });
});
