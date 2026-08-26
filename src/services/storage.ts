import { file, write } from "bun";

import { config } from "../config";
import type { Application } from "../types";

const subscribersPath = `${config.dataDir}/subscribers.json`;
const applicationsPath = `${config.dataDir}/applications.jsonl`;

/**
 * Chat ids of everyone who ever wrote to the bot — the audience for lesson reminders.
 * Kept in memory and mirrored to disk so restarts do not lose the list.
 */
let subscribers = new Set<number>();

export async function loadSubscribers(): Promise<void> {
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
}

export async function removeSubscriber(chatId: number): Promise<void> {
  if (!subscribers.delete(chatId)) return;

  await persistSubscribers();
}

export function getSubscribers(): number[] {
  return [...subscribers];
}

/** Every application is appended here — the source for /applications and a backup for Sheets. */
export async function recordApplication(application: Application): Promise<void> {
  const existing = file(applicationsPath);
  const previous = (await existing.exists()) ? await existing.text() : "";

  await write(applicationsPath, previous + JSON.stringify(application) + "\n");
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
