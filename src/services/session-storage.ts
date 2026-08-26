import { file, write } from "bun";
import type { StorageAdapter } from "grammy";

import { config } from "../config";
import type { SessionData } from "../context";

const sessionsPath = `${config.dataDir}/sessions.json`;

/**
 * Keeps half-filled /join forms on disk, so a restart or a redeploy does not
 * drop someone in the middle of the registration.
 *
 * Finished forms are not stored: an `idle` session carries no state worth keeping.
 */
export function createSessionStorage(): StorageAdapter<SessionData> {
  const sessions = new Map<string, SessionData>();
  let loading: Promise<void> | null = null;

  async function load(): Promise<void> {
    const stored = file(sessionsPath);
    if (!(await stored.exists())) return;

    try {
      const raw: unknown = await stored.json();
      if (raw && typeof raw === "object") {
        for (const [key, value] of Object.entries(raw as Record<string, SessionData>)) {
          sessions.set(key, value);
        }
      }
    } catch (error) {
      console.error("Could not read stored sessions, starting fresh:", error);
    }
  }

  /** One shared promise, so concurrent updates do not each read the file. */
  function ready(): Promise<void> {
    loading ??= load();
    return loading;
  }

  async function persist(): Promise<void> {
    await write(sessionsPath, JSON.stringify(Object.fromEntries(sessions)));
  }

  return {
    async read(key) {
      await ready();
      return sessions.get(key);
    },

    async write(key, value) {
      await ready();

      // Only an unfinished form is worth persisting.
      if (value.step === "idle") {
        if (!sessions.delete(key)) return;
      } else {
        sessions.set(key, value);
      }

      await persist();
    },

    async delete(key) {
      await ready();
      if (!sessions.delete(key)) return;

      await persist();
    },
  };
}
