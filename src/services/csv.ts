import type { Application } from "../types";

const HEADER = ["Дата заявки", "Имя", "Возраст", "Страна и город", "Контакт", "Telegram username"];

/** Excel in ru-locale splits on semicolons, not commas. */
const DELIMITER = ";";

/** Without a BOM Excel opens the file as ANSI and mangles Cyrillic. */
const BOM = "\uFEFF";

function escapeCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function toRow(application: Application, timezone: string): string[] {
  return [
    new Date(application.submittedAt).toLocaleString("ru-RU", { timeZone: timezone }),
    application.name,
    String(application.age),
    application.location,
    application.contact,
    application.telegramUsername,
  ];
}

export function buildCsv(applications: Application[], timezone: string): Buffer {
  const rows = [HEADER, ...applications.map((application) => toRow(application, timezone))];
  const text = rows.map((row) => row.map(escapeCell).join(DELIMITER)).join("\r\n");

  return Buffer.from(BOM + text, "utf-8");
}
