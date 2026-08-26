import { JWT } from "google-auth-library";

import { config } from "../config";
import type { Application } from "../types";

const HEADER = ["Дата заявки", "Имя", "Возраст", "Страна и город", "Контакт", "Telegram ID", "Telegram username"];

const sheetsConfig = config.sheets;

const client = sheetsConfig
  ? new JWT({
      email: sheetsConfig.clientEmail,
      key: sheetsConfig.privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    })
  : null;

export const isSheetsEnabled = client !== null;

function valuesUrl(range: string, suffix = ""): string {
  const id = sheetsConfig!.spreadsheetId;
  return `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${encodeURIComponent(range)}${suffix}`;
}

function toRow(application: Application): string[] {
  return [
    application.submittedAt,
    application.name,
    String(application.age),
    application.location,
    application.contact,
    String(application.telegramId),
    application.telegramUsername,
  ];
}

/** Writes the header row once, so a freshly created spreadsheet is readable. */
export async function ensureHeaderRow(): Promise<void> {
  if (!client || !sheetsConfig) return;

  const range = `${sheetsConfig.sheetName}!A1:G1`;
  const { data } = await client.request<{ values?: string[][] }>({ url: valuesUrl(range) });

  if (data.values?.length) return;

  await client.request({
    url: valuesUrl(range, "?valueInputOption=RAW"),
    method: "PUT",
    data: { values: [HEADER] },
  });
}

export async function appendApplication(application: Application): Promise<void> {
  if (!client || !sheetsConfig) {
    throw new Error("Google Sheets is not configured");
  }

  await client.request({
    url: valuesUrl(
      `${sheetsConfig.sheetName}!A:G`,
      ":append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS",
    ),
    method: "POST",
    data: { values: [toRow(application)] },
  });
}
