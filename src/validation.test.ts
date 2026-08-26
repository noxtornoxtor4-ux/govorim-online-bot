import { describe, expect, test } from "bun:test";

import { validateAge, validateContact, validateLocation, validateName } from "./validation";

describe("validateName", () => {
  test("accepts a normal name and collapses extra spaces", () => {
    expect(validateName("  Айпери   Асановна ")).toEqual({ ok: true, value: "Айпери Асановна" });
  });

  test.each(["", "A", "12345", "!!!", "x".repeat(65)])("rejects %p", (input) => {
    expect(validateName(input).ok).toBe(false);
  });
});

describe("validateAge", () => {
  test.each([
    ["10", 10],
    [" 7 ", 7],
    ["3", 3],
    ["25", 25],
  ])("accepts %p", (input, expected) => {
    expect(validateAge(input)).toEqual({ ok: true, value: expected });
  });

  test.each(["2", "26", "десять", "10.5", "", "-8"])("rejects %p", (input) => {
    expect(validateAge(input).ok).toBe(false);
  });
});

describe("validateLocation", () => {
  test("accepts a country with a settlement", () => {
    expect(validateLocation("Кыргызстан, село Кой-Таш")).toEqual({
      ok: true,
      value: "Кыргызстан, село Кой-Таш",
    });
  });

  test.each(["", "-", "123"])("rejects %p", (input) => {
    expect(validateLocation(input).ok).toBe(false);
  });
});

describe("validateContact", () => {
  test.each(["@aiperi", "+996 700 123 456", "+996700123456", "0700123456", "(996) 700-12-34"])(
    "accepts %p",
    (input) => {
      expect(validateContact(input).ok).toBe(true);
    },
  );

  test("adds the missing @ to a bare username", () => {
    expect(validateContact("aiperi")).toEqual({ ok: true, value: "@aiperi" });
  });

  test.each(["@ab", "12345", "1".repeat(16), "почта@mail.ru", ""])("rejects %p", (input) => {
    expect(validateContact(input).ok).toBe(false);
  });
});
