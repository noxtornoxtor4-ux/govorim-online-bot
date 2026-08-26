import { Cron } from "croner";
import { type Bot, GrammyError } from "grammy";

import { config } from "../config";
import { reminderMessage } from "../content";
import type { BotContext } from "../context";
import { nextLesson } from "./lessons";
import { getSubscribers, removeSubscriber } from "./storage";

/** Telegram tolerates roughly 30 messages per second for broadcasts. */
const BATCH_SIZE = 25;
const BATCH_PAUSE_MS = 1000;

const REMINDER_LEAD_HOURS = 1;

/** Cron expression for one hour before each lesson, in the configured timezone. */
export function buildCronExpression(): string {
  const { hour, minute } = config.lessonTime;

  let reminderHour = hour - REMINDER_LEAD_HOURS;
  let days: readonly number[] = config.lessonDays;

  // An early lesson pushes the reminder into the previous evening — and previous day.
  if (reminderHour < 0) {
    reminderHour += 24;
    days = config.lessonDays.map((day) => (day + 6) % 7);
  }

  return `${minute} ${reminderHour} * * ${days.join(",")}`;
}

async function broadcast(bot: Bot<BotContext>): Promise<void> {
  const chatIds = getSubscribers();
  if (chatIds.length === 0) return;

  const text = reminderMessage(nextLesson());

  let delivered = 0;

  for (let offset = 0; offset < chatIds.length; offset += BATCH_SIZE) {
    const batch = chatIds.slice(offset, offset + BATCH_SIZE);

    const results = await Promise.all(
      batch.map(async (chatId) => {
        try {
          await bot.api.sendMessage(chatId, text);
          return true;
        } catch (error) {
          // 403 means the user blocked the bot — stop reminding them.
          if (error instanceof GrammyError && error.error_code === 403) {
            await removeSubscriber(chatId);
          } else {
            console.error(`Could not send a reminder to ${chatId}:`, error);
          }
          return false;
        }
      }),
    );

    delivered += results.filter(Boolean).length;

    if (offset + BATCH_SIZE < chatIds.length) {
      await Bun.sleep(BATCH_PAUSE_MS);
    }
  }

  console.log(`Reminder sent to ${delivered}/${chatIds.length} subscribers`);
}

export function scheduleReminders(bot: Bot<BotContext>): Cron {
  const expression = buildCronExpression();
  const job = new Cron(expression, { timezone: config.timezone }, () => broadcast(bot));

  console.log(
    `Reminders scheduled (${expression}, ${config.timezone}). Next: ${job.nextRun()?.toISOString() ?? "never"}`,
  );

  return job;
}
