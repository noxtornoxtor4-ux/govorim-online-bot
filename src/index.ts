import { bot, botCommands } from "./bot";
import { config } from "./config";
import { startHealthServer } from "./health";
import { scheduleReminders } from "./services/reminders";
import { ensureHeaderRow, isSheetsEnabled } from "./services/sheets";
import { loadAdmins, loadSubscribers, restoreFromRemote } from "./services/storage";
import { isWebAppEnabled } from "./services/webapp";

await loadSubscribers();
await loadAdmins();
// A host without a persistent disk starts empty; the sheet holds the surviving copy.
await restoreFromRemote();

if (isSheetsEnabled) {
  await ensureHeaderRow();
}

if (isWebAppEnabled) {
  console.log("Applications are also sent to the Google Sheet web app.");
}

if (!isSheetsEnabled && !isWebAppEnabled) {
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
