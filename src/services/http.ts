/**
 * A cold Google Apps Script deployment can take well over ten seconds to answer,
 * so requests to it get a generous timeout and one retry.
 */
export const WEBAPP_TIMEOUT_MS = 30_000;

const RETRY_DELAY_MS = 2000;

export async function requestWebApp(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await attempt(url, init);
  } catch (error) {
    console.warn(`Retrying the Google Sheet request: ${describeError(error)}`);
    await Bun.sleep(RETRY_DELAY_MS);

    return attempt(url, init);
  }
}

async function attempt(url: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(WEBAPP_TIMEOUT_MS) });

  if (!response.ok) {
    throw new Error(`Web app answered ${response.status}`);
  }

  return response;
}

/** Error objects such as DOMException print as a wall of constants; take the message. */
export function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.name === "TimeoutError" ? "the request timed out" : error.message;
  }

  return String(error);
}
