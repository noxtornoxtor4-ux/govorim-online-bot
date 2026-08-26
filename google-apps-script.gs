/**
 * Скрипт для Google Таблицы: принимает заявки от бота и добавляет их строками.
 *
 * Как подключить:
 *   1. Создай Google Таблицу.
 *   2. Расширения → Apps Script.
 *   3. Удали всё из редактора и вставь этот файл целиком.
 *   4. Замени значение TOKEN ниже на свой пароль (любые буквы и цифры).
 *   5. Развернуть → Новое развёртывание → тип «Веб-приложение».
 *        Выполнять от имени: Я
 *        У кого есть доступ: Все
 *   6. Скопируй выданный URL и положи его в .env бота:
 *        SHEETS_WEBAPP_URL=<этот URL>
 *        SHEETS_WEBAPP_TOKEN=<тот же TOKEN>
 */

// Замени на свой пароль. Должен совпадать с SHEETS_WEBAPP_TOKEN в .env бота.
var TOKEN = 'change-me';

var HEADER = ['Дата заявки', 'Имя', 'Возраст', 'Страна и город', 'Контакт', 'Telegram'];

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    if (TOKEN && data.token !== TOKEN) {
      return json({ ok: false, error: 'forbidden' });
    }

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADER);
      sheet.getRange(1, 1, 1, HEADER.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }

    sheet.appendRow([
      new Date(data.submittedAt),
      data.name,
      data.age,
      data.location,
      data.contact,
      data.telegramUsername
    ]);

    return json({ ok: true });
  } catch (error) {
    return json({ ok: false, error: String(error) });
  }
}

function json(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
