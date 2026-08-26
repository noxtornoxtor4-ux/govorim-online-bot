import { Composer } from "grammy";

import { FALLBACK, HELP, scheduleMessage, WELCOME } from "../content";
import type { BotContext } from "../context";
import { acknowledge } from "../context";
import { MENU } from "../keyboards";
import { nextLesson } from "../services/lessons";

export const commands = new Composer<BotContext>();

commands.command("start", (ctx) => ctx.reply(WELCOME, { reply_markup: MENU }));
commands.command("help", (ctx) => ctx.reply(HELP));
commands.command("schedule", (ctx) => ctx.reply(scheduleMessage(nextLesson())));

commands.callbackQuery("schedule", async (ctx) => {
  await acknowledge(ctx);
  await ctx.reply(scheduleMessage(nextLesson()));
});

/** Anything that is neither a command nor part of the /join form. */
commands.on("message", (ctx) => ctx.reply(FALLBACK, { reply_markup: MENU }));
