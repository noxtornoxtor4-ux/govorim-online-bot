import { config } from "../config";
import type { Application } from "../types";

/**
 * Sends the application to a Google Apps Script web app, which appends it as a row
 * to a Google Sheet. Unlike the Sheets API this needs no Cloud project and no billing.
 */
export const isWebAppEnabled = config.sheetsWebApp !== null;

const TIMEOUT_MS = 10_000;

export async function postApplication(application: Application): Promise<void> {
  const webApp = config.sheetsWebApp;
  if (!webApp) return;

  const response = await fetch(webApp.url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...application, token: webApp.token }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Web app answered ${response.status}: ${await response.text()}`);
  }
}
