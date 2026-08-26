import { config } from "../config";

/**
 * Mirrors subscribers and admins into the Google Sheet, so the bot can run on a host
 * without a persistent disk. Local files stay the primary store; this is the copy
 * that survives a redeploy.
 */
export interface RemoteState {
  subscribers: number[];
  admins: number[];
}

const TIMEOUT_MS = 10_000;

function numbers(value: unknown): number[] {
  return Array.isArray(value) ? value.filter((id): id is number => typeof id === "number") : [];
}

export async function loadRemoteState(): Promise<RemoteState | null> {
  const webApp = config.sheetsWebApp;
  if (!webApp) return null;

  const url = `${webApp.url}?token=${encodeURIComponent(webApp.token)}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });

  if (!response.ok) {
    throw new Error(`Web app answered ${response.status}`);
  }

  const body = (await response.json()) as { ok?: boolean; subscribers?: unknown; admins?: unknown };
  if (!body.ok) {
    throw new Error("Web app refused the request — check SHEETS_WEBAPP_TOKEN");
  }

  return { subscribers: numbers(body.subscribers), admins: numbers(body.admins) };
}

export async function saveRemoteState(state: RemoteState): Promise<void> {
  const webApp = config.sheetsWebApp;
  if (!webApp) return;

  const response = await fetch(webApp.url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "state", token: webApp.token, ...state }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Web app answered ${response.status}`);
  }
}
