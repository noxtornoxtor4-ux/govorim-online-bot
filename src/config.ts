function required(name: string): string {
  const value = Bun.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string, fallback: string): string {
  return Bun.env[name]?.trim() || fallback;
}

/** Google Sheets is optional: without it the bot still works and stores applications locally. */
function readSheetsConfig() {
  const spreadsheetId = Bun.env.GOOGLE_SHEET_ID?.trim();
  const clientEmail = Bun.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  // Private keys are stored in .env as a single line with escaped newlines.
  const privateKey = Bun.env.GOOGLE_PRIVATE_KEY?.trim().replace(/\n/g, "\n");

  if (!spreadsheetId || !clientEmail || !privateKey) return null;

  return {
    spreadsheetId,
    clientEmail,
    privateKey,
    sheetName: optional("GOOGLE_SHEET_NAME", "Заявки"),
  };
}

/** Telegram ids allowed to read the list of applications. */
function readAdminIds(): number[] {
  return (Bun.env.ADMIN_IDS ?? "")
    .split(",")
    .map((id) => Number(id.trim()))
    .filter((id) => Number.isInteger(id) && id > 0);
}

/** Google Apps Script web app that appends applications to a Google Sheet. */
function readWebAppConfig() {
  const url = Bun.env.SHEETS_WEBAPP_URL?.trim();
  if (!url) return null;

  return { url, token: Bun.env.SHEETS_WEBAPP_TOKEN?.trim() ?? "" };
}

function readLessonTime(): { hour: number; minute: number } {
  const raw = optional("LESSON_TIME", "20:00");
  const match = /^(\d{1,2}):(\d{2})$/.exec(raw);
  const hour = Number(match?.[1]);
  const minute = Number(match?.[2]);

  if (!match || hour > 23 || minute > 59) {
    throw new Error(`Invalid LESSON_TIME: ${raw}. Expected HH:MM, e.g. 20:00`);
  }

  return { hour, minute };
}

export const config = {
  botToken: required("BOT_TOKEN"),
  sheets: readSheetsConfig(),
  sheetsWebApp: readWebAppConfig(),
  dataDir: optional("DATA_DIR", "./data"),
  adminIds: readAdminIds(),
  adminCode: Bun.env.ADMIN_CODE?.trim() || null,
  timezone: optional("TIMEZONE", "Asia/Bishkek"),
  lessonTime: readLessonTime(),
  /** Lesson days as cron weekdays: Mon, Wed, Fri. */
  lessonDays: [1, 3, 5],
} as const;

export const lessonTimeLabel = `${String(config.lessonTime.hour).padStart(2, "0")}:${String(
  config.lessonTime.minute,
).padStart(2, "0")}`;
