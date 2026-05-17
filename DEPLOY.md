# MedHub — Конфигурация и инструкция по деплою

## Структура файлов

```
medhub/
├── index.html                  ← Главная страница каталога
├── products_aesculap.json      ← База товаров (36 позиций Aesculap)
├── admin/
│   ├── login.html              ← Страница входа в админку
│   └── dashboard.html          ← Панель управления
├── api/
│   ├── submit-inquiry.js       ← Serverless: заявки → TG + Sheets
│   └── google-apps-script.js   ← Вставить в Google Apps Script
└── _headers                    ← Cloudflare: безопасность + кеш
```

## ДЕПЛОЙ НА CLOUDFLARE PAGES (рекомендуется)

### Шаг 1: GitHub
```bash
git init
git add .
git commit -m "MedHub MVP v1.0"
git remote add origin https://github.com/ТВОЙAKkount/medhub.git
git push -u origin main
```

### Шаг 2: Cloudflare Pages
1. Войди на dash.cloudflare.com
2. Pages → Create a project → Connect to Git
3. Выбери репозиторий medhub
4. Build settings:
   - Framework: None
   - Build command: (пусто)
   - Build output directory: /
5. Нажми Save and Deploy

### Шаг 3: Переменные окружения (Cloudflare → Settings → Environment)
```
TG_BOT_TOKEN    = 8919458968:AAFyWBC7rbQ_gKmEF9VAwG27mKxxjhQQg98
TG_CHAT_ID      = -5268360165
GOOGLE_SHEETS_ID = 1O95X2c76n2kuIQWUMsyYKj7zGWYqng6AzhHyVOHuvMA
APPS_SCRIPT_WEBHOOK = (после настройки Apps Script)
```

### Шаг 4: Cloudflare Worker для API
```bash
npm install -g wrangler
wrangler login
wrangler deploy api/submit-inquiry.js --name medhub-api
```

Или используй Cloudflare Pages Functions (автоматически из папки /functions/).

## GOOGLE APPS SCRIPT (для Sheets)

1. Открой таблицу: https://docs.google.com/spreadsheets/d/1O95X2c76n2kuIQWUMsyYKj7zGWYqng6AzhHyVOHuvMA
2. Расширения → Apps Script
3. Вставь содержимое файла api/google-apps-script.js
4. Сохрани (Ctrl+S)
5. Запустить → Протестировать → doGet (проверь что работает)
6. Развернуть → Новое развертывание:
   - Тип: Веб-приложение
   - Выполнять как: Я
   - Кто имеет доступ: Все
7. Нажми Развернуть, скопируй URL
8. Добавь URL в переменные окружения как APPS_SCRIPT_WEBHOOK

## ДАННЫЕ ДЛЯ ВХОДА В АДМИНКУ

URL: /admin/login.html
Логин: admin
Пароль: MedHub2026!

(Смена пароля — в разделе Настройки или через консоль браузера)

## TELEGRAM ИНТЕГРАЦИЯ

Бот: 8919458968:AAFyWBC7rbQ_gKmEF9VAwG27mKxxjhQQg98
Чат: -5268360165

Бот должен быть добавлен в групповой чат как администратор!
Команды для проверки: отправь /start в чат с ботом.

## SEO НАСТРОЙКИ

После деплоя:
1. Google Search Console → Add property → ввести домен
2. Залить sitemap.xml
3. Настроить robots.txt (уже создан)
4. Yandex Webmaster → аналогично

## СМЕНА ПАРОЛЯ АДМИНКИ

В консоли браузера (F12) на странице /admin/login.html:
```javascript
crypto.subtle.digest('SHA-256', new TextEncoder().encode('НовыйПароль'))
  .then(b => console.log([...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')))
```
Скопируй хэш и замени в admin/login.html в объекте CREDENTIALS.

## SUPABASE (для продакшна)

1. supabase.com → New project
2. SQL Editor → вставь схему из ARCHITECTURE.md
3. Добавь переменные:
   SUPABASE_URL = https://ХХХ.supabase.co
   SUPABASE_ANON_KEY = eyJ...
4. Замени fetch('../products_aesculap.json') на fetch('/api/products')
