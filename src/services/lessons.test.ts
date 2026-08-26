import { describe, expect, test } from "bun:test";

import { config } from "../config";
import { lessonTypeFor, nextLesson } from "./lessons";

describe("lessonTypeFor", () => {
  test("opens the course with grammar and then alternates", () => {
    expect([1, 2, 3, 4].map(lessonTypeFor)).toEqual(["grammar", "speaking", "grammar", "speaking"]);
  });
});

describe("nextLesson", () => {
  test("picks the next Monday, Wednesday or Friday", () => {
    // Thursday 27 August 2026 → the next lesson is Friday.
    const lesson = nextLesson(new Date("2026-08-27T06:00:00Z"));

    expect(lesson).not.toBeNull();
    expect(config.lessonDays).toContain(lesson?.at.getUTCDay() ?? -1);
  });

  test("returns a lesson later than the moment asked about", () => {
    const now = new Date("2026-08-26T06:00:00Z");

    expect(nextLesson(now)?.at.getTime()).toBeGreaterThan(now.getTime());
  });

  test("leaves the number unknown while COURSE_START is not set", () => {
    if (config.courseStart) return;

    expect(nextLesson(new Date("2026-08-27T06:00:00Z"))?.number).toBeNull();
  });
});
