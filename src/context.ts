import type { Context, SessionFlavor } from "grammy";

import type { Application } from "./types";

/** Steps of the /join form; `idle` means no registration is in progress. */
export type JoinStep = "idle" | "name" | "age" | "location" | "contact";

export interface SessionData {
  step: JoinStep;
  draft: Partial<Application>;
}

export function initialSession(): SessionData {
  return { step: "idle", draft: {} };
}

export type BotContext = Context & SessionFlavor<SessionData>;
