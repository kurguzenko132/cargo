# CARGO STORE — Supabase Auth + Supabase DB + Telegram

Проект Next.js для Vercel.

## Что подключено

- товары и заказы через Supabase;
- регистрация и вход пользователей через Supabase Auth;
- корзина в localStorage;
- админка `admin@admin.ru / admin`;
- оформление заказа из каталога или по ссылке на внешний товар;
- отправка заказа в Telegram менеджеру.

## Переменные окружения

Создай `.env.local` в корне проекта:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_your_secret_key

NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_or_anon_key

TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

На Vercel добавь эти же переменные в `Project → Settings → Environment Variables`.

## Supabase Auth

В Supabase проверь:

`Authentication → Sign In / Providers → Email` — Email provider должен быть включён.

Для разработки можно отключить обязательное подтверждение почты, иначе после регистрации пользователь должен подтвердить email.

## База данных

В Supabase открой `SQL Editor`, вставь код из `supabase/schema.sql` и нажми `Run`.

## Запуск

```bash
npm install
npm run dev
```

## Деплой

```bash
git add .
git commit -m "update auth"
git push
```

После пуша Vercel сам запустит новый деплой.
