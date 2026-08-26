import { Bot, GrammyError, HttpError, session, type Transformer } from "grammy";

import { config } from "./config";
import type { BotContext } from "./context";
import { initialSession } from "./context";
import { admin } from "./handlers/admin";
import { commands } from "./handlers/commands";
import { join } from "./handlers/join";
import { subscribe } from "./handlers/subscribe";
import { createSessionStorage } from "./services/session-storage";

export const bot = new Bot<BotContext>(config.botToken);

/** Every message is written with HTML markup, so make it the default. */
const htmlByDefault: Transformer = (prev, method, payload, signal) => {
  const formattable = method === "sendMessage" || method === "editMessageText";

  if (formattable && !("parse_mode" in payload)) {
    return prev(method, { ...payload, parse_mode: "HTML" }, signal);
  }

  return prev(method, payload, signal);
};

bot.api.config.use(htmlByDefault);

bot.use(session({ initial: initialSession, storage: createSessionStorage() }));
bot.use(subscribe);
bot.use(admin);
bot.use(join);
bot.use(commands);

bot.catch(({ ctx, error }) => {
  const prefix = `Error while handling update ${ctx.update.update_id}:`;

  if (error instanceof GrammyError) {
    console.error(prefix, "request failed:", error.description);
  } else if (error instanceof HttpError) {
    console.error(prefix, "could not reach Telegram:", error);
  } else {
    console.error(prefix, error);
  }
});

export const botCommands = [
  { command: "join", description: "Записаться на курс" },
  { command: "schedule", description: "Расписание занятий" },
  { command: "cancel", description: "Отменить заполнение заявки" },
  { command: "help", description: "Справка" },
];
