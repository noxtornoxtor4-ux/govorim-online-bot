import { InlineKeyboard, Keyboard } from "grammy";

export const MENU = new InlineKeyboard()
  .text("📝 Записаться", "join")
  .row()
  .text("📅 Расписание", "schedule");

export const CONTACT = new Keyboard().requestContact("📱 Отправить мой номер").resized().oneTime();

export const REMOVE_KEYBOARD = { reply_markup: { remove_keyboard: true } } as const;
