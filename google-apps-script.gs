/**
 * Скрипт для Google Таблицы: принимает заявки от бота, добавляет их строками
 * и хранит состояние бота (подписчиков и админов), чтобы он мог работать
 * на хостинге без постоянного диска.
 *
 * Как подключить:
 *   1. Создай Google Таблицу.
 *   2. Расширения → Apps Script.
 *   3. Удали всё из редактора и вставь этот файл целиком.
 *   4. Замени значение TOKEN ниже на свой пароль (любые буквы и цифры).
 *   5. Развернуть → Новое развёртывание → тип «Веб-приложение».
 *        Выполнять от имени: Я
 *        У кого есть доступ: Все
 *   6. Скопируй выданный URL и положи его в переменные бота:
 *        SHEETS_WEBAPP_URL=<этот URL>
 *        SHEETS_WEBAPP_TOKEN=<тот же TOKEN>
 */

// Замени на свой пароль. Должен совпадать с SHEETS_WEBAPP_TOKEN у бота.
var TOKEN = 'change-me';

var HEADER = ['Дата заявки', 'Имя', 'Возраст', 'Страна и город', 'Контакт', 'Telegram'];
var STATE_SHEET = 'Состояние';

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    if (TOKEN && data.token !== TOKEN) {
      return json({ ok: false, error: 'forbidden' });
    }

    if (data.type === 'state') {
      saveState(data.subscribers || [], data.admins || []);
      return json({ ok: true });
    }

    appendApplication(data);
    return json({ ok: true });
  } catch (error) {
    return json({ ok: false, error: String(error) });
  }
}

function doGet(e) {
  try {
    if (TOKEN && e.parameter.token !== TOKEN) {
      return json({ ok: false, error: 'forbidden' });
    }

    return json({ ok: true, subscribers: readState('subscribers'), admins: readState('admins') });
  } catch (error) {
    return json({ ok: false, error: String(error) });
  }
}

function appendApplication(data) {
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
}

/** Отдельный лист со служебными данными: по строке на каждый список. */
function stateSheet() {
  var book = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = book.getSheetByName(STATE_SHEET);

  if (!sheet) {
    sheet = book.insertSheet(STATE_SHEET);
    sheet.appendRow(['subscribers', '[]']);
    sheet.appendRow(['admins', '[]']);
  }

  return sheet;
}

function saveState(subscribers, admins) {
  var sheet = stateSheet();
  sheet.getRange('A1:B2').setValues([
    ['subscribers', JSON.stringify(subscribers)],
    ['admins', JSON.stringify(admins)]
  ]);
}

function readState(key) {
  var rows = stateSheet().getRange('A1:B2').getValues();

  for (var i = 0; i < rows.length; i++) {
    if (rows[i][0] === key) {
      try {
        return JSON.parse(rows[i][1] || '[]');
      } catch (error) {
        return [];
      }
    }
  }

  return [];
}

function json(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
