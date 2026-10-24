/**
 * Backend for LeadKit tools: saves every lead to a Google Sheet
 * and sends it to the owner's Telegram. Free, no server needed.
 *
 * SETUP (10 minutes per client)
 * 1. In Telegram, open @BotFather → /newbot → copy the bot token.
 * 2. The owner writes any message to the new bot, then open
 *    https://api.telegram.org/bot<TOKEN>/getUpdates and copy "chat":{"id":...}
 *    (for a group: add the bot to the group, write a message there, same link).
 * 3. Create a Google Sheet → Extensions → Apps Script → paste this file.
 * 4. Project Settings → Script properties → add:
 *      TG_TOKEN   = the bot token
 *      TG_CHAT_ID = the chat id
 * 5. Deploy → New deployment → Web app.
 *      Execute as: Me.  Who has access: Anyone.
 *    Copy the /exec URL.
 * 6. On the client's site, before lead.js:
 *      <script>window.LEADKIT_ENDPOINT = "https://script.google.com/macros/s/…/exec";</script>
 * 7. Send a test lead and check both the Sheet and Telegram.
 *
 * The bot token stays inside Apps Script; it is never exposed on the website.
 */

const SHEET_NAME = 'Заявки';

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    const data = JSON.parse(e.postData.contents || '{}');
    const fields = data.fields || {};
    saveRow_(data.tool || 'Сайт', fields, data.page || '');
    notify_(data.text || formatText_(data.tool, fields));
    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function saveRow_(tool, fields, page) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  const keys = Object.keys(fields);
  // Header row grows automatically when a tool sends a new field.
  let header = sheet.getLastRow() ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0] : [];
  if (!header.length) {
    header = ['Дата', 'Інструмент', 'Статус', 'Сторінка'];
    sheet.appendRow(header);
    sheet.setFrozenRows(1);
  }
  keys.forEach(k => {
    if (header.indexOf(k) === -1) {
      header.push(k);
      sheet.getRange(1, header.length).setValue(k);
    }
  });
  const row = header.map(h => {
    if (h === 'Дата') return new Date();
    if (h === 'Інструмент') return tool;
    if (h === 'Статус') return 'Нова';
    if (h === 'Сторінка') return page;
    return fields[h] != null ? fields[h] : '';
  });
  sheet.appendRow(row);
}

function notify_(text) {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty('TG_TOKEN');
  const chatId = props.getProperty('TG_CHAT_ID');
  if (!token || !chatId) return;
  UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ chat_id: chatId, text: text.slice(0, 4000) }),
    muteHttpExceptions: true
  });
}

function formatText_(tool, fields) {
  return '🔔 Нова заявка · ' + (tool || 'Сайт') + '\n' +
    Object.keys(fields).map(k => k + ': ' + fields[k]).join('\n');
}

/** Run once from the editor to test the Telegram connection. */
function testTelegram() {
  notify_('✅ Тест: бот заявок підключено');
}
