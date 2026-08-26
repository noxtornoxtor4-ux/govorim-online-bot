import { config, lessonTimeLabel } from "./config";
import { describeLessonType, type Lesson, TOTAL_LESSONS } from "./services/lessons";

export const TOTAL_STEPS = 4;

/** Small progress hint shown above every question of the /join form. */
export function step(current: number): string {
  return `<i>Шаг ${current} из ${TOTAL_STEPS}</i>`;
}

export const WELCOME = [
  "<b>Говорим / Сүйлөйбүз</b>",
  "<i>Образовательная программа «Язык дружбы»</i>",
  "",
  "Мы бесплатно учим детей русскому языку с нуля — онлайн, три раза в неделю.",
  "Уроки чередуются: один — грамматика и новые слова, следующий — полностью разговорный.",
  "",
  "Нажми кнопку ниже, чтобы записаться.",
].join("\n");

export const HELP = [
  "<b>Что я умею</b>",
  "",
  "/join — записаться на курс",
  "/schedule — расписание занятий",
  "/cancel — отменить заполнение заявки",
  "/help — эта справка",
  "",
  "За час до каждого занятия я пришлю напоминание.",
].join("\n");

export const SCHEDULE = [
  "📅 <b>Расписание занятий</b>",
  "",
  `Понедельник, среда, пятница — в <b>${lessonTimeLabel}</b>`,
  "Одно занятие — 40 минут",
  "Курс длится 2 месяца, это около 24 занятий",
  "",
  "В каждую тему добавляем несколько жестов русского жестового языка.",
  "",
  "За час до занятия я пришлю напоминание.",
].join("\n");

export const REMINDER = [
  "⏰ <b>Занятие через час!</b>",
  "",
  `Начало в ${lessonTimeLabel}, длительность — 40 минут.`,
  "Не забудь домашнее задание. До встречи!",
].join("\n");

export const FALLBACK = "Не понял. Записаться — /join, расписание — /schedule, все команды — /help";

function formatLessonDate(at: Date): string {
  return at.toLocaleString("ru-RU", {
    timeZone: config.timezone,
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Describes the upcoming lesson, as far as the configuration allows. */
function describeNextLesson(lesson: Lesson | null): string[] {
  if (!lesson) return [];

  const lines = ["", `<b>Ближайшее занятие</b>`, formatLessonDate(lesson.at)];

  if (lesson.number !== null && lesson.type !== null) {
    lines.push(`Занятие ${lesson.number} из ${TOTAL_LESSONS} · ${describeLessonType(lesson.type)}`);
  }

  return lines;
}

export function scheduleMessage(lesson: Lesson | null): string {
  return [SCHEDULE, ...describeNextLesson(lesson)].join("\n");
}

export function reminderMessage(lesson: Lesson | null): string {
  const type = lesson?.type != null ? ["", `Сегодня: <b>${describeLessonType(lesson.type)}</b>`] : [];

  return [REMINDER, ...type].join("\n");
}
