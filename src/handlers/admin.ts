import { Composer, InputFile } from "grammy";

import { config } from "../config";
import type { BotContext } from "../context";
import { buildCsv } from "../services/csv";
import { countAdmins, getSubscribers, grantAdmin, isAdmin, readApplications } from "../services/storage";

/** How many of the newest applications one /applications message shows. */
const PAGE_SIZE = 10;

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("ru-RU", {
    timeZone: config.timezone,
    dateStyle: "short",
    timeStyle: "short",
  });
}

export const admin = new Composer<BotContext>();

/** Everyone may look up their own id — that is how admins are added to ADMIN_IDS. */
admin.command("id", (ctx) =>
  ctx.reply(
    [
      `Твой Telegram ID: <code>${ctx.from?.id}</code>`,
      "",
      "Чтобы получить доступ к заявкам, пришли этот номер администратору бота.",
    ].join("\n"),
  ),
);

/** Turns the sender into an admin when they know the code from ADMIN_CODE. */
admin.command("admin", async (ctx) => {
  const supplied = ctx.match.trim();

  if (!config.adminCode || !supplied || supplied !== config.adminCode) {
    // Silence keeps outsiders from discovering that the command exists.
    return;
  }

  const granted = ctx.from ? await grantAdmin(ctx.from.id) : false;

  await ctx.reply(
    granted
      ? [
          "✅ Готово, теперь ты администратор.",
          "",
          "/applications — заявки",
          "/export — выгрузка файлом",
          "/stats — статистика",
        ].join("\n")
      : "Ты уже администратор. /applications, /export, /stats",
  );
});

const adminOnly = admin.filter((ctx) => ctx.from !== undefined && isAdmin(ctx.from.id));

adminOnly.command("applications", async (ctx) => {
  const applications = await readApplications();

  if (applications.length === 0) {
    await ctx.reply("Заявок пока нет.");
    return;
  }

  const latest = applications.slice(-PAGE_SIZE).reverse();

  const lines = latest.map((application, index) =>
    [
      `<b>${index + 1}. ${escapeHtml(application.name)}</b>, ${application.age} лет`,
      `${escapeHtml(application.location)}`,
      `Контакт: ${escapeHtml(application.contact)}`,
      `<i>${formatDate(application.submittedAt)}</i>`,
    ].join("\n"),
  );

  const header =
    applications.length > PAGE_SIZE
      ? `<b>Всего заявок: ${applications.length}</b>\nПоказываю последние ${PAGE_SIZE}:`
      : `<b>Всего заявок: ${applications.length}</b>`;

  await ctx.reply([header, "", lines.join("\n\n")].join("\n"));
});

adminOnly.command("stats", async (ctx) => {
  const applications = await readApplications();

  await ctx.reply(
    [
      "<b>Статистика</b>",
      "",
      `Заявок: ${applications.length}`,
      `Подписано на напоминания: ${getSubscribers().length}`,
      `Администраторов: ${countAdmins()}`,
    ].join("\n"),
  );
});

adminOnly.command("export", async (ctx) => {
  const applications = await readApplications();

  if (applications.length === 0) {
    await ctx.reply("Заявок пока нет — выгружать нечего.");
    return;
  }

  const csv = buildCsv(applications, config.timezone);

  await ctx.replyWithDocument(new InputFile(csv, "applications.csv"), {
    caption: `Заявок в файле: ${applications.length}`,
  });
});
