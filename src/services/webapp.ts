import { config } from "../config";
import type { Application } from "../types";
import { requestWebApp } from "./http";

/**
 * Sends the application to a Google Apps Script web app, which appends it as a row
 * to a Google Sheet. Unlike the Sheets API this needs no Cloud project and no billing.
 */
export const isWebAppEnabled = config.sheetsWebApp !== null;

export async function postApplication(application: Application): Promise<void> {
  const webApp = config.sheetsWebApp;
  if (!webApp) return;

  await requestWebApp(webApp.url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...application, token: webApp.token }),
  });
}
