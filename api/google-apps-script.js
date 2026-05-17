/**
 * Google Apps Script — Webhook для MedHub
 *
 * КАК УСТАНОВИТЬ:
 * 1. Открой Google Таблицу MedHub: Leads
 * 2. Расширения → Apps Script
 * 3. Вставь этот код, сохрани
 * 4. Запустить → Опубликовать как веб-приложение
 *    - Выполнять как: Я (свой аккаунт)
 *    - Кто имеет доступ: Все
 * 5. Скопируй URL и добавь в переменные окружения:
 *    APPS_SCRIPT_WEBHOOK=https://script.google.com/macros/s/ВАШ_ID/exec
 */

// ID таблицы берётся из URL: .../spreadsheets/d/ЭТО_ID/...
const SPREADSHEET_ID = '1O95X2c76n2kuIQWUMsyYKj7zGWYqng6AzhHyVOHuvMA';
const SHEET_NAME = 'Лиды';

/**
 * Обработка POST-запроса от сервера MedHub
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const row = data.row;

    if (!row || !Array.isArray(row)) {
      return ContentService
        .createTextOutput(JSON.stringify({ error: 'Invalid row data' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(SHEET_NAME);

    // Создаём лист если нет
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      // Заголовки
      sheet.appendRow([
        'Дата', 'ФИО', 'Телефон', 'Email',
        'Организация', 'Товар', 'Комментарий',
        'Язык', 'Источник', 'Статус'
      ]);
      // Форматирование заголовков
      const header = sheet.getRange(1, 1, 1, 10);
      header.setFontWeight('bold');
      header.setBackground('#1a3a5c');
      header.setFontColor('#ffffff');
      sheet.setFrozenRows(1);
    }

    sheet.appendRow(row);

    // Автоматическое форматирование новой строки
    const lastRow = sheet.getLastRow();
    const statusCell = sheet.getRange(lastRow, 10); // Статус
    statusCell.setBackground('#fff3cd'); // жёлтый = новая заявка

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, row: lastRow }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    console.error('MedHub Sheets error:', err);
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Обработка GET (для проверки работоспособности)
 */
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({
      status: 'ok',
      service: 'MedHub Google Sheets Webhook',
      sheet: SHEET_NAME,
      timestamp: new Date().toISOString()
    }))
    .setMimeType(ContentService.MimeType.JSON);
}
