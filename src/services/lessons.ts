import { Cron } from "croner";

import { config } from "../config";

export const TOTAL_LESSONS = 24;

/** The programme alternates: grammar and new words, then a fully conversational lesson. */
export type LessonType = "grammar" | "speaking";

export interface Lesson {
  at: Date;
  /** 1-based position in the course, or null when COURSE_START is not set. */
  number: number | null;
  type: LessonType | null;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function lessonCron(): Cron {
  const { hour, minute } = config.lessonTime;

  return new Cron(`${minute} ${hour} * * ${config.lessonDays.join(",")}`, {
    timezone: config.timezone,
    paused: true,
  });
}

/** Counts lesson days from the first day of the course up to and including `date`. */
function countLessons(from: Date, to: Date): number {
  const start = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const end = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());

  if (end < start) return 0;

  let count = 0;

  for (let day = start; day <= end; day += MS_PER_DAY) {
    if (config.lessonDays.includes(new Date(day).getUTCDay())) count += 1;
  }

  return count;
}

export function lessonTypeFor(number: number): LessonType {
  // The course opens with grammar, then every second lesson is conversational.
  return number % 2 === 1 ? "grammar" : "speaking";
}

export function nextLesson(now: Date = new Date()): Lesson | null {
  const at = lessonCron().nextRun(now);
  if (!at) return null;

  const courseStart = config.courseStart;
  if (!courseStart) return { at, number: null, type: null };

  const number = countLessons(courseStart, at);
  if (number < 1 || number > TOTAL_LESSONS) return { at, number: null, type: null };

  return { at, number, type: lessonTypeFor(number) };
}

export function describeLessonType(type: LessonType): string {
  return type === "grammar" ? "грамматика и новые слова" : "разговорный урок";
}
