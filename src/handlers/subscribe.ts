import { Composer } from "grammy";

import type { BotContext } from "../context";
import { addSubscriber } from "../services/storage";

/**
 * Everyone who writes to the bot is subscribed to lesson reminders,
 * as required by the brief.
 */
export const subscribe = new Composer<BotContext>();

subscribe.use(async (ctx, next) => {
  if (ctx.chat?.type === "private") {
    await addSubscriber(ctx.chat.id);
  }

  await next();
});
