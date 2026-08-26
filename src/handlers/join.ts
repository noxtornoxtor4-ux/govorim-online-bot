import { Composer } from "grammy";

import { step } from "../content";
import type { BotContext } from "../context";
import { initialSession } from "../context";
import { CONTACT, MENU, REMOVE_KEYBOARD } from "../keyboards";
import { appendApplication, isSheetsEnabled } from "../services/sheets";
import { recordApplication } from "../services/storage";
import type { Application } from "../types";

const MIN_AGE = 3;
const MAX_AGE = 25;

const PHONE_PATTERN = /^\+?[\d\s()-]{7,20}$/;
const USERNAME_PATTERN = /^@[A-Za-z0-9_]{4,32}$/;

/** Answers are echoed back inside HTML messages, so they must be escaped. */
function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export const join = new Composer<BotContext>();

async function startJoin(ctx: BotContext): Promise<void> {
  if (ctx.session.step !== "idle") {
    await ctx.reply("Ты уже заполняешь заявку. Продолжим — или напиши /cancel, чтобы начать заново.");
    return;
  }

  ctx.session = initialSession();
  ctx.session.step = "name";
  await ctx.reply(`${step(1)}\nКак зовут ученика?`, REMOVE_KEYBOARD);
}

join.command("join", startJoin);

join.callbackQuery("join", async (ctx) => {
  await ctx.answerCallbackQuery();
  await startJoin(ctx);
});

join.command("cancel", async (ctx) => {
  if (ctx.session.step === "idle") {
    await ctx.reply("Сейчас нечего отменять. Записаться можно командой /join.");
    return;
  }

  ctx.session = initialSession();
  await ctx.reply("Заявка отменена. Если передумаешь — /join", REMOVE_KEYBOARD);
});

/** Phone number shared through the Telegram contact button. */
join.on("message:contact", async (ctx, next) => {
  if (ctx.session.step !== "contact") return next();

  await finish(ctx, ctx.message.contact.phone_number);
});

join.on("message:text", async (ctx, next) => {
  const { step: current } = ctx.session;
  // Other commands must reach their own handlers even mid-form.
  if (current === "idle" || ctx.message.text.startsWith("/")) return next();

  const answer = ctx.message.text.trim();

  switch (current) {
    case "name":
      return askAge(ctx, answer);
    case "age":
      return askLocation(ctx, answer);
    case "location":
      return askContact(ctx, answer);
    case "contact":
      return finish(ctx, answer);
  }
});

async function askAge(ctx: BotContext, name: string): Promise<void> {
  if (name.length < 2 || name.length > 64) {
    await ctx.reply("Кажется, это не имя. Напиши имя ученика — от 2 до 64 символов.");
    return;
  }

  ctx.session.draft.name = name;
  ctx.session.step = "age";
  await ctx.reply(`${step(2)}\nСколько ученику лет?`);
}

async function askLocation(ctx: BotContext, raw: string): Promise<void> {
  const age = Number.parseInt(raw, 10);

  if (Number.isNaN(age) || age < MIN_AGE || age > MAX_AGE) {
    await ctx.reply(`Напиши возраст числом, от ${MIN_AGE} до ${MAX_AGE}. Например: 10`);
    return;
  }

  ctx.session.draft.age = age;
  ctx.session.step = "location";
  await ctx.reply(`${step(3)}\nИз какой страны и населённого пункта ученик?\nНапример: Кыргызстан, село Кой-Таш`);
}

async function askContact(ctx: BotContext, location: string): Promise<void> {
  if (location.length < 2 || location.length > 128) {
    await ctx.reply("Напиши страну и населённый пункт. Например: Казахстан, Алматы");
    return;
  }

  ctx.session.draft.location = location;
  ctx.session.step = "contact";
  await ctx.reply(
    `${step(4)}\nКонтакт для связи: номер телефона или @username.\nМожно просто нажать кнопку ниже.`,
    { reply_markup: CONTACT },
  );
}

async function finish(ctx: BotContext, contact: string): Promise<void> {
  if (!PHONE_PATTERN.test(contact) && !USERNAME_PATTERN.test(contact)) {
    await ctx.reply("Не похоже на контакт. Пришли номер телефона или @username — либо нажми кнопку ниже.");
    return;
  }

  const { name, age, location } = ctx.session.draft;
  const from = ctx.from;

  if (!name || age === undefined || !location || !from) {
    ctx.session = initialSession();
    await ctx.reply("Что-то пошло не так, давай начнём заново: /join", REMOVE_KEYBOARD);
    return;
  }

  const application: Application = {
    name,
    age,
    location,
    contact,
    telegramId: from.id,
    telegramUsername: from.username ? `@${from.username}` : "",
    submittedAt: new Date().toISOString(),
  };

  // Reset before the write so a slow spreadsheet cannot cause a double submission.
  ctx.session = initialSession();
  await save(application);

  await ctx.reply("✅ <b>Заявка принята!</b>", REMOVE_KEYBOARD);
  await ctx.reply(
    [
      `<b>Имя:</b> ${escapeHtml(application.name)}`,
      `<b>Возраст:</b> ${application.age}`,
      `<b>Откуда:</b> ${escapeHtml(application.location)}`,
      `<b>Контакт:</b> ${escapeHtml(application.contact)}`,
      "",
      "Мы свяжемся с тобой перед началом курса.",
    ].join("\n"),
    { reply_markup: MENU },
  );
}

async function save(application: Application): Promise<void> {
  // The local log is the source for /applications and the safety net if Sheets fails.
  await recordApplication(application);

  if (!isSheetsEnabled) return;

  try {
    await appendApplication(application);
  } catch (error) {
    console.error("Could not append the application to Google Sheets:", error);
  }
}
