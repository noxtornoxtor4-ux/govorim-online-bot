import type { Context, SessionFlavor } from "grammy";
import { GrammyError } from "grammy";

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

/**
 * Confirms a button press, tolerating a query that Telegram already expired.
 * Queries queued while the bot was down arrive stale, and the confirmation is
 * only cosmetic — losing it must not stop the actual action.
 */
export async function acknowledge(ctx: BotContext): Promise<void> {
  try {
    await ctx.answerCallbackQuery();
  } catch (error) {
    if (error instanceof GrammyError && error.description.includes("query is too old")) {
      return;
    }

    throw error;
  }
}
