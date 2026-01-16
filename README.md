
# HR Absences — Демо (облако)

Готовое демо веб‑приложения: отделы → сотрудники → отсутствие (CRUD), фильтры, RU/AM.

## Локальный запуск
```bash
npm install
npm start
# открой http://localhost:3000
```

## Деплой на Render (рекомендуется для демо)
1. Создай пустой репозиторий на GitHub и залей файлы проекта.
2. Зайди на https://render.com → New → Web Service → подключи репозиторий.
3. Build Command: `npm install`  •  Start Command: `node server.js`  •  Environment: Node 18+
4. После билда Render выдаст URL вида `https://<имя>.onrender.com` — открой и пользуйся.

> Альтернатива: Docker
```bash
docker build -t absence-demo .
docker run -e PORT=8080 -p 8080:8080 absence-demo
# открой http://localhost:8080
```

## Структура
- `server.js` — Express API + раздача статических файлов из `public/`
- `public/` — фронтенд (index.html, styles.css, app.js)
- `data.json` — «база» (JSON файл). Для демо ок; в проде будет PostgreSQL.

## Примечания
- Данные сохраняются в `data.json` на диске (для демонстрации). На бесплатных платформах возможна перезагрузка контейнера — данные могут сбрасываться.
- В проде план: Next.js + PostgreSQL + авторизация + роли + отчёты/экспорт.
