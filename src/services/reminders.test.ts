import { describe, expect, test } from "bun:test";

import { buildCronExpression } from "./reminders";

describe("buildCronExpression", () => {
  test("fires one hour before the lesson on Mon, Wed and Fri", () => {
    // LESSON_TIME defaults to 20:00.
    expect(buildCronExpression()).toBe("0 19 * * 1,3,5");
  });
});
