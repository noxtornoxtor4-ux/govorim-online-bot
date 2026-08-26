import { Composer } from "grammy";

import { FALLBACK, HELP, SCHEDULE, WELCOME } from "../content";
import type { BotContext } from "../context";
import { MENU } from "../keyboards";

export const commands = new Composer<BotContext>();

commands.command("start", (ctx) => ctx.reply(WELCOME, { reply_markup: MENU }));
commands.command("help", (ctx) => ctx.reply(HELP));
commands.command("schedule", (ctx) => ctx.reply(SCHEDULE));

commands.callbackQuery("schedule", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply(SCHEDULE);
});

/** Anything that is neither a command nor part of the /join form. */
commands.on("message", (ctx) => ctx.reply(FALLBACK, { reply_markup: MENU }));
