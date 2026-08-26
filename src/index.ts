import { bot, botCommands } from "./bot";
import { config } from "./config";
import { startHealthServer } from "./health";
import { scheduleReminders } from "./services/reminders";
import { ensureHeaderRow, isSheetsEnabled } from "./services/sheets";
import { loadSubscribers } from "./services/storage";

await loadSubscribers();

if (isSheetsEnabled) {
  await ensureHeaderRow();
} else {
  console.log(
    `Google Sheets is off. Applications are stored in ${config.dataDir}/applications.jsonl ` +
      "and available through /applications and /export.",
  );
}

const reminders = scheduleReminders(bot);
const health = startHealthServer();

const stop = () => {
  reminders.stop();
  void health?.stop();
  void bot.stop();
};

process.once("SIGINT", stop);
process.once("SIGTERM", stop);

await bot.api.setMyCommands(botCommands);

await bot.start({
  onStart: ({ username }) => console.log(`Bot @${username} started`),
});
