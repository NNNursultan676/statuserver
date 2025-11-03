# Инструкция по локальному запуску

## Требования

- Node.js 20.x или выше
- npm 10.x или выше

## Установка и запуск

### 1. Установка зависимостей

```bash
npm install
```

### 2. Настройка переменных окружения (опционально)

Создайте файл `.env` в корне проекта, если хотите использовать PostgreSQL или Grafana интеграцию:

```env
# Опционально: PostgreSQL база данных
# DATABASE_URL=postgresql://user:password@localhost:5432/statuserver

# Опционально: Grafana интеграция для мониторинга
# GRAFANA_URL=http://your-grafana-instance.com
# GRAFANA_API_KEY=your-api-key
```

**Примечание**: По умолчанию приложение использует in-memory storage и не требует базы данных.

### 3. Запуск в режиме разработки

```bash
npm run dev
```

Приложение будет доступно по адресу: http://localhost:5000

### 4. Сборка для production

```bash
npm run build
```

### 5. Запуск в production режиме

```bash
npm start
```

## Структура проекта

```
statuserver/
├── client/           # React frontend
│   ├── src/
│   │   ├── components/  # UI компоненты
│   │   ├── pages/       # Страницы приложения
│   │   ├── hooks/       # React хуки
│   │   └── lib/         # Утилиты
│   └── public/       # Статические файлы
├── server/           # Express backend
│   ├── index.ts      # Точка входа сервера
│   ├── routes.ts     # API маршруты
│   ├── storage.ts    # In-memory хранилище
│   └── vite.ts       # Vite middleware
├── shared/           # Общие типы и схемы
└── package.json
```

## Доступные скрипты

- `npm run dev` - Запуск в режиме разработки с hot-reload
- `npm run build` - Сборка frontend и backend для production
- `npm start` - Запуск production версии
- `npm run check` - Проверка TypeScript типов
- `npm run db:push` - Применение схемы базы данных (если используется PostgreSQL)

## API Endpoints

### Сервисы
- `GET /api/services` - Получить все сервисы
- `GET /api/services/:id` - Получить конкретный сервис
- `POST /api/services` - Создать новый сервис
- `PATCH /api/services/:id/status` - Обновить статус сервиса
- `POST /api/check-availability/:id` - Проверить доступность сервиса

### Инциденты
- `GET /api/incidents` - Получить все инциденты
- `POST /api/incidents` - Создать новый инцидент

### Импорт/Экспорт
- `POST /api/import-services` - Импорт сервисов (JSON)
- `GET /api/export-services?format=[json|csv]` - Экспорт сервисов

## Возможные проблемы

### Порт 5000 уже занят

Измените порт в файле `server/index.ts` или используйте переменную окружения:

```bash
PORT=3000 npm run dev
```

### Ошибки TypeScript

Запустите проверку типов:

```bash
npm run check
```

### Проблемы с зависимостями

Попробуйте удалить node_modules и переустановить:

```bash
rm -rf node_modules package-lock.json
npm install
```

## Дополнительная информация

- Приложение использует Vite для сборки frontend
- Backend построен на Express.js
- Данные хранятся в памяти (MemStorage) по умолчанию
- Поддержка PostgreSQL через Drizzle ORM (опционально)
- Hot Module Replacement (HMR) работает в режиме разработки
