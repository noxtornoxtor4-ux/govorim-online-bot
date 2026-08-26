import { Composer } from "grammy";

import { step } from "../content";
import type { BotContext } from "../context";
import { acknowledge, initialSession } from "../context";
import { CONTACT, MENU, REMOVE_KEYBOARD } from "../keyboards";
import { describeError } from "../services/http";
import { appendApplication, isSheetsEnabled } from "../services/sheets";
import { recordApplication } from "../services/storage";
import { isWebAppEnabled, postApplication } from "../services/webapp";
import type { Application } from "../types";
import { validateAge, validateContact, validateLocation, validateName } from "../validation";

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
  await acknowledge(ctx);
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

  const answer = ctx.message.text;

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

async function askAge(ctx: BotContext, raw: string): Promise<void> {
  const name = validateName(raw);
  if (!name.ok) {
    await ctx.reply(name.error);
    return;
  }

  ctx.session.draft.name = name.value;
  ctx.session.step = "age";
  await ctx.reply(`${step(2)}\nСколько ученику лет?`);
}

async function askLocation(ctx: BotContext, raw: string): Promise<void> {
  const age = validateAge(raw);
  if (!age.ok) {
    await ctx.reply(age.error);
    return;
  }

  ctx.session.draft.age = age.value;
  ctx.session.step = "location";
  await ctx.reply(
    `${step(3)}\nИз какой страны и населённого пункта ученик?\nНапример: Кыргызстан, село Кой-Таш`,
  );
}

async function askContact(ctx: BotContext, raw: string): Promise<void> {
  const location = validateLocation(raw);
  if (!location.ok) {
    await ctx.reply(location.error);
    return;
  }

  ctx.session.draft.location = location.value;
  ctx.session.step = "contact";
  await ctx.reply(
    `${step(4)}\nКонтакт для связи: номер телефона или @username.\nМожно просто нажать кнопку ниже.`,
    { reply_markup: CONTACT },
  );
}

async function finish(ctx: BotContext, raw: string): Promise<void> {
  const contact = validateContact(raw);
  if (!contact.ok) {
    await ctx.reply(contact.error);
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
    contact: contact.value,
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
  // The local log is the source for /applications and the safety net if a sync fails.
  await recordApplication(application);

  // Both spreadsheet routes are optional; a failure of either must not lose the application.
  if (isWebAppEnabled) {
    try {
      await postApplication(application);
    } catch (error) {
      console.error(`Could not send the application to the Google Sheet: ${describeError(error)}`);
    }
  }

  if (isSheetsEnabled) {
    try {
      await appendApplication(application);
    } catch (error) {
      console.error("Could not append the application to Google Sheets:", error);
    }
  }
}
