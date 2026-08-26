import { file, write } from "bun";

import { config } from "../config";
import type { Application } from "../types";
import { loadRemoteState, saveRemoteState } from "./remote-state";

const subscribersPath = `${config.dataDir}/subscribers.json`;
const applicationsPath = `${config.dataDir}/applications.jsonl`;

/**
 * Chat ids of everyone who ever wrote to the bot — the audience for lesson reminders.
 * Kept in memory and mirrored to disk so restarts do not lose the list.
 */
let subscribers = new Set<number>();

export async function loadSubscribers(): Promise<void> {
  subscribers = new Set();

  const stored = file(subscribersPath);
  if (!(await stored.exists())) return;

  try {
    const ids: unknown = await stored.json();
    if (Array.isArray(ids)) {
      subscribers = new Set(ids.filter((id): id is number => typeof id === "number"));
    }
  } catch (error) {
    console.error("Could not read subscribers file, starting with an empty list:", error);
  }
}

async function persistSubscribers(): Promise<void> {
  await write(subscribersPath, JSON.stringify([...subscribers], null, 2));
}

export async function addSubscriber(chatId: number): Promise<void> {
  if (subscribers.has(chatId)) return;

  subscribers.add(chatId);
  await persistSubscribers();
  scheduleRemotePush();
}

export async function removeSubscriber(chatId: number): Promise<void> {
  if (!subscribers.delete(chatId)) return;

  await persistSubscribers();
  scheduleRemotePush();
}

export function getSubscribers(): number[] {
  return [...subscribers];
}

/** Every application is appended here — the source for /applications and a backup for Sheets. */
export async function recordApplication(application: Application): Promise<void> {
  const existing = file(applicationsPath);
  const previous = (await existing.exists()) ? await existing.text() : "";

  await write(applicationsPath, `${previous}${JSON.stringify(application)}\n`);
}

export async function readApplications(): Promise<Application[]> {
  const stored = file(applicationsPath);
  if (!(await stored.exists())) return [];

  const lines = (await stored.text()).split("\n").filter((line) => line.trim() !== "");

  return lines.flatMap((line) => {
    try {
      return [JSON.parse(line) as Application];
    } catch {
      // A truncated last line must not hide every other application.
      console.error("Skipping a malformed application record");
      return [];
    }
  });
}

const adminsPath = `${config.dataDir}/admins.json`;

/** Admins added at runtime with /admin <код>, on top of the ones from ADMIN_IDS. */
let grantedAdmins = new Set<number>();

export async function loadAdmins(): Promise<void> {
  grantedAdmins = new Set();

  const stored = file(adminsPath);
  if (!(await stored.exists())) return;

  try {
    const ids: unknown = await stored.json();
    if (Array.isArray(ids)) {
      grantedAdmins = new Set(ids.filter((id): id is number => typeof id === "number"));
    }
  } catch (error) {
    console.error("Could not read the admins file, keeping only ADMIN_IDS:", error);
  }
}

export function isAdmin(telegramId: number): boolean {
  return config.adminIds.includes(telegramId) || grantedAdmins.has(telegramId);
}

/** Returns false when the person was already an admin. */
export async function grantAdmin(telegramId: number): Promise<boolean> {
  if (isAdmin(telegramId)) return false;

  grantedAdmins.add(telegramId);
  await write(adminsPath, JSON.stringify([...grantedAdmins], null, 2));
  scheduleRemotePush();

  return true;
}

export function countAdmins(): number {
  return new Set([...config.adminIds, ...grantedAdmins]).size;
}

/**
 * Pushes the current lists to the Google Sheet. Coalesced, because a burst of
 * messages would otherwise cause a burst of requests.
 */
let pendingPush: ReturnType<typeof setTimeout> | null = null;

const PUSH_DELAY_MS = 2000;

function scheduleRemotePush(): void {
  if (!config.sheetsWebApp || pendingPush) return;

  pendingPush = setTimeout(() => {
    pendingPush = null;

    saveRemoteState({ subscribers: [...subscribers], admins: [...grantedAdmins] }).catch((error) => {
      console.error("Could not mirror the state to the Google Sheet:", error);
    });
  }, PUSH_DELAY_MS);
}

/**
 * Restores the lists from the Google Sheet after a redeploy wiped the disk.
 * Remote entries are merged in, never used to delete local ones.
 */
export async function restoreFromRemote(): Promise<void> {
  if (!config.sheetsWebApp) return;

  try {
    const state = await loadRemoteState();
    if (!state) return;

    const before = subscribers.size + grantedAdmins.size;

    for (const id of state.subscribers) subscribers.add(id);
    for (const id of state.admins) grantedAdmins.add(id);

    const restored = subscribers.size + grantedAdmins.size - before;

    if (restored > 0) {
      await persistSubscribers();
      await write(adminsPath, JSON.stringify([...grantedAdmins], null, 2));
      console.log(`Restored ${restored} entries from the Google Sheet.`);
    }
  } catch (error) {
    console.error("Could not read the state from the Google Sheet:", error);
  }
}
