/**
 * API-эндпоинт: POST /api/submit-inquiry
 *
 * Деплоится как:
 * - Cloudflare Worker (wrangler deploy)
 * - Vercel Serverless Function (файл в /api/)
 * - Node.js Express route
 *
 * При получении заявки одновременно:
 * 1. Сохраняет в Supabase (таблица inquiries)
 * 2. Отправляет сообщение в Telegram-группу
 * 3. Добавляет строку в Google Sheets
 */

// ══════════════════════════════════════════════
// КОНФИГУРАЦИЯ (переменные окружения)
// В Cloudflare: wrangler secret put TELEGRAM_TOKEN
// В Vercel: Settings → Environment Variables
// ══════════════════════════════════════════════
const CONFIG = {
  // Telegram
  TG_TOKEN: process.env.TG_BOT_TOKEN || '8919458968:AAFyWBC7rbQ_gKmEF9VAwG27mKxxjhQQg98',
  TG_CHAT_ID: process.env.TG_CHAT_ID || '-5268360165',

  // Google Sheets
  SHEETS_ID: process.env.GOOGLE_SHEETS_ID || '1O95X2c76n2kuIQWUMsyYKj7zGWYqng6AzhHyVOHuvMA',
  SHEETS_RANGE: 'Лиды!A:J',               // Лист "Лиды", столбцы A–J

  // Supabase (опционально на MVP)
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_KEY: process.env.SUPABASE_ANON_KEY || '',
};

/* ──────────────────────────────────────────────
   Валидация входящих данных
   ────────────────────────────────────────────── */
function validatePayload(data) {
  const errors = [];
  if (!data.name || data.name.length < 2) errors.push('Некорректное имя');
  if (!data.phone || data.phone.length < 7) errors.push('Некорректный телефон');
  if (!data.email || !data.email.includes('@')) errors.push('Некорректный email');
  return errors;
}

/* ──────────────────────────────────────────────
   Форматирование сообщения для Telegram
   ────────────────────────────────────────────── */
function formatTelegramMessage(data) {
  const time = new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });
  const product = data.product ? `\n📦 *Товар:* ${escapeMarkdown(data.product)}` : '';
  const company = data.company ? `\n🏢 *Организация:* ${escapeMarkdown(data.company)}` : '';
  const message = data.message ? `\n💬 *Комментарий:* ${escapeMarkdown(data.message)}` : '';
  const lang = data.lang ? `\n🌐 *Язык:* ${data.lang.toUpperCase()}` : '';

  return `🔔 *Новая заявка с MedHub*

👤 *ФИО:* ${escapeMarkdown(data.name)}
📱 *Телефон:* ${escapeMarkdown(data.phone)}
📧 *Email:* ${escapeMarkdown(data.email)}${company}${product}${message}${lang}

🕐 *Время:* ${time} МСК
🔗 *Источник:* ${escapeMarkdown(data.source_url || 'medhub.ru')}`;
}

function escapeMarkdown(text) {
  // Экранирование спецсимволов Telegram MarkdownV2
  return String(text).replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
}

/* ──────────────────────────────────────────────
   Отправка в Telegram
   ────────────────────────────────────────────── */
async function sendTelegram(data) {
  const text = formatTelegramMessage(data);
  const url = `https://api.telegram.org/bot${CONFIG.TG_TOKEN}/sendMessage`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: CONFIG.TG_CHAT_ID,
      text,
      parse_mode: 'MarkdownV2',
      // Inline-кнопки под сообщением
      reply_markup: JSON.stringify({
        inline_keyboard: [[
          { text: '📞 Позвонить', url: `tel:${data.phone}` },
          { text: '✉️ Email', url: `mailto:${data.email}` },
        ]]
      })
    }),
  });

  const json = await res.json();
  if (!json.ok) {
    console.error('Telegram error:', json);
    throw new Error(`Telegram: ${json.description}`);
  }
  return json;
}

/* ──────────────────────────────────────────────
   Запись в Google Sheets
   Используем Google Sheets API v4 через OAuth2 Service Account
   или через Apps Script Webhook (проще для MVP)
   ────────────────────────────────────────────── */
async function appendToSheets(data) {
  // MVP-вариант: Google Apps Script Webhook
  // Создай Apps Script: Tools → Script Editor, опубликуй как Web App
  // Получишь URL вида: https://script.google.com/macros/s/.../exec
  const WEBHOOK_URL = process.env.APPS_SCRIPT_WEBHOOK || '';

  if (!WEBHOOK_URL) {
    console.warn('Google Sheets webhook не настроен, пропускаем');
    return;
  }

  const row = [
    new Date().toLocaleString('ru-RU'),  // A: Дата
    data.name,                            // B: ФИО
    data.phone,                           // C: Телефон
    data.email,                           // D: Email
    data.company || '',                   // E: Организация
    data.product || '',                   // F: Товар
    data.message || '',                   // G: Комментарий
    data.lang || 'ru',                    // H: Язык
    data.source_url || '',               // I: Источник
    'new',                               // J: Статус
  ];

  const res = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ row }),
  });

  if (!res.ok) throw new Error('Sheets webhook error: ' + res.status);
}

/* ──────────────────────────────────────────────
   Сохранение в Supabase (опционально)
   ────────────────────────────────────────────── */
async function saveToSupabase(data) {
  if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_KEY) return;

  const res = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/inquiries`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': CONFIG.SUPABASE_KEY,
      'Authorization': `Bearer ${CONFIG.SUPABASE_KEY}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({
      name: data.name,
      phone: data.phone,
      email: data.email,
      company: data.company,
      message: data.message,
      product_requested: data.product,
      lang: data.lang,
      source_url: data.source_url,
      status: 'new',
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error('Supabase error: ' + err);
  }
}

/* ──────────────────────────────────────────────
   ОСНОВНОЙ ОБРАБОТЧИК
   ────────────────────────────────────────────── */

// === Vercel / Node.js формат ===
module.exports = async function handler(req, res) {
  // CORS для локальной разработки
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let data;
  try {
    data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  // Валидация
  const errors = validatePayload(data);
  if (errors.length > 0) {
    return res.status(422).json({ error: 'Validation failed', details: errors });
  }

  // Параллельная отправка во все каналы
  const results = await Promise.allSettled([
    sendTelegram(data),
    appendToSheets(data),
    saveToSupabase(data),
  ]);

  // Логируем ошибки отдельных каналов, но не фейлим запрос
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      const names = ['Telegram', 'Sheets', 'Supabase'];
      console.error(`${names[i]} failed:`, r.reason);
    }
  });

  // Успех если хотя бы один канал сработал
  const anySuccess = results.some(r => r.status === 'fulfilled');
  if (!anySuccess) {
    return res.status(500).json({ error: 'All channels failed' });
  }

  return res.status(200).json({ ok: true, message: 'Заявка принята' });
};

// === Cloudflare Worker формат (альтернативный экспорт) ===
// export default {
//   async fetch(request, env) {
//     CONFIG.TG_TOKEN = env.TG_BOT_TOKEN;
//     CONFIG.TG_CHAT_ID = env.TG_CHAT_ID;
//     ... аналогичная логика ...
//   }
// }
