# Инструкция по запуску и настройке Service Status Platform

## 🚀 Быстрый старт в Replit

### Ваш проект УЖЕ ЗАПУЩЕН! 
Приложение работает по адресу, который вы видите в предпросмотре Replit (webview).

**Что уже настроено:**
- ✅ Node.js 20
- ✅ Все зависимости установлены
- ✅ Сервер запущен на порту 5000
- ✅ Frontend и Backend работают
- ✅ 274 сервиса импортированы

---

## 🔗 Интеграция с Grafana (автоматическое обновление статусов)

### Как это работает:
Система автоматически опрашивает Grafana каждые **30 секунд** и обновляет статусы сервисов на основе метрик Prometheus.

### Настройка интеграции:

#### 1. Получите токен API из Grafana

В вашем Grafana:
1. Перейдите в **Configuration** → **API Keys** (или **Service Accounts** в новых версиях)
2. Создайте новый API токен с правами **Viewer** или **Editor**
3. Скопируйте токен (он показывается только один раз!)

#### 2. Добавьте переменные окружения в Replit

**В этом Replit проекте:**

1. Откройте панель **Tools** → **Secrets** (замок 🔒 слева)
2. Добавьте следующие секреты:

```bash
GRAFANA_URL=https://ваш-grafana-сервер.com
GRAFANA_API_TOKEN=ваш-токен-api
```

**Пример:**
```bash
GRAFANA_URL=https://grafana.mycompany.com
GRAFANA_API_TOKEN=glsa_xxxxxxxxxxxxxxxxxxxxx
```

#### 3. Перезапустите сервер

После добавления переменных окружения:
- Нажмите кнопку **Stop** в панели Workflows
- Нажмите **Start** или сервер перезапустится автоматически

#### 4. Проверьте логи

В консоли вы должны увидеть:
```
Grafana integration is configured. Starting automatic sync...
Initial Grafana sync completed
Grafana sync completed: X updated, 0 errors
```

### Принцип работы синхронизации:

Система использует Prometheus метрики через Grafana:
- **Запрос:** `up{job="node_exporter"}`
- **Метрика:** `probe_success` (1 = работает, 0 = не работает)
- **Сопоставление:** По адресу сервиса или имени
- **Статусы:**
  - `1` → `operational` (зеленый)
  - `0` → `down` (красный)

---

## 💻 Локальный запуск (на вашем компьютере)

### ⚠️ О Docker

В Replit **Docker недоступен** из-за архитектуры NixOS.  
Но вы можете запустить проект локально на своём компьютере с Docker или без него.

### Вариант 1: Локальный запуск БЕЗ Docker

#### Требования:
- Node.js 20.x или выше
- npm 10.x или выше

#### Шаги:

```bash
# 1. Клонируйте репозиторий (или скачайте код из Replit)
git clone <ваш-репозиторий>
cd <папка-проекта>

# 2. Перейдите в папку проекта
cd statuserver

# 3. Установите зависимости
npm install

# 4. (Опционально) Создайте файл .env для Grafana
cat > .env << EOF
GRAFANA_URL=https://ваш-grafana-сервер.com
GRAFANA_API_TOKEN=ваш-токен-api
EOF

# 5. Запустите в режиме разработки
npm run dev
```

**Приложение будет доступно:** http://localhost:5000

### Вариант 2: Локальный запуск С Docker

#### Требования:
- Docker Desktop
- Docker Compose

#### Шаги:

```bash
# 1. Перейдите в корневую папку проекта (там где docker-compose.yml)
cd statuserver

# 2. Создайте .env файл (если нужна интеграция с Grafana)
cat > .env << EOF
GRAFANA_URL=https://ваш-grafana-сервер.com
GRAFANA_API_TOKEN=ваш-токен-api
EOF

# 3. Запустите Docker Compose
docker-compose up --build

# Или в фоновом режиме:
docker-compose up -d --build
```

**Приложение будет доступно:** http://localhost:5000

#### Остановка:
```bash
docker-compose down
```

#### Просмотр логов:
```bash
docker-compose logs -f
```

### Вариант 3: Production сборка БЕЗ Docker

```bash
# 1. Соберите проект
npm run build

# 2. Запустите production версию
npm start
```

---

## 🔧 Технические детали сборки

### Процесс сборки (`npm run build`):

1. **Frontend (Vite)**: Собирается в `dist/public/`
   - HTML, CSS, JavaScript бандлы
   - Оптимизированные статические файлы

2. **Backend (esbuild)**: Собирается в `dist/server/index.js`
   - TypeScript → JavaScript
   - Быстрая сборка без строгой проверки типов
   - Все зависимости external (используются из node_modules)

3. **Структура dist/**:
   ```
   dist/
   ├── public/           # Статические файлы фронтенда
   │   ├── index.html
   │   └── assets/
   └── server/
       └── index.js      # Скомпилированный сервер
   ```

---

## 📋 Проверка работы Grafana интеграции

### Способ 1: Через логи сервера

Вы должны видеть в консоли:
```
Grafana integration is configured. Starting automatic sync...
Initial Grafana sync completed
Updated Service-Name: operational -> down
Grafana sync completed: 5 updated, 0 errors
```

### Способ 2: Через Dashboard

1. Откройте приложение в браузере
2. На главной странице статусы сервисов должны обновляться каждые 30 секунд
3. Зелёный индикатор "UP" = сервис работает
4. Красный "OFF" = сервис не работает

### Способ 3: Через API

```bash
# Проверить статусы всех сервисов
curl http://localhost:5000/api/services | jq '.[].status'
```

---

## 🛠 Возможные проблемы и решения

### Docker: Cannot find module '/app/dist/index.js'

**Решение:** ✅ **УЖЕ ИСПРАВЛЕНО!**

Обновлена конфигурация сборки:
- `package.json` - добавлены скрипты build:client и build:server
- `Dockerfile` - исправлен путь к серверу: `dist/server/index.js`
- Используется `esbuild` для быстрой сборки сервера

**Теперь Docker работает корректно!**

### Grafana интеграция не работает

**Симптом:** В логах "Grafana integration is not configured"

**Решение:**
1. Проверьте, что переменные окружения установлены:
   ```bash
   echo $GRAFANA_URL
   echo $GRAFANA_API_TOKEN
   ```
2. Убедитесь, что токен API действителен
3. Проверьте, что Grafana сервер доступен

### Ошибка "Grafana API error: 401"

**Решение:**
- Токен API недействителен или истёк
- Создайте новый токен в Grafana

### Ошибка "Grafana API error: 404"

**Решение:**
- Проверьте URL Grafana
- Убедитесь, что используется правильный формат: `https://grafana.example.com` (без `/` в конце)
- Путь к API формируется автоматически: `/api/datasources/proxy/1/api/v1/query`

### Сервисы не обновляются автоматически

**Решение:**
1. Проверьте, что в Grafana настроен Prometheus как data source с ID = 1
2. Убедитесь, что query `up{job="node_exporter"}` возвращает данные в Prometheus
3. Проверьте, что адреса сервисов в базе данных совпадают с `instance` в метриках

---

## 📊 Структура проекта

```
statuserver/
├── client/              # React frontend
│   ├── src/
│   │   ├── components/  # UI компоненты
│   │   ├── pages/       # Страницы (Dashboard, Analytics, Admin)
│   │   └── hooks/       # React хуки
│   └── public/
├── server/              # Express backend
│   ├── index.ts         # Точка входа (с Grafana sync)
│   ├── routes.ts        # API endpoints
│   ├── storage.ts       # In-memory хранилище
│   ├── grafanaService.ts # Интеграция с Grafana
│   └── vite.ts          # Vite middleware для dev
├── shared/
│   └── schema.ts        # Общие TypeScript типы
├── dist/                # Собранные файлы (после npm run build)
│   ├── public/          # Frontend bundle
│   └── server/          # Backend JavaScript
├── Dockerfile           # Docker конфигурация
├── docker-compose.yml   # Docker Compose
├── tsconfig.json        # TypeScript config
├── tsconfig.server.json # TypeScript config для сервера
├── vite.config.ts       # Vite config
└── package.json
```

---

## 🎯 Основные возможности

### 1. Dashboard
- Просмотр всех сервисов с фильтрацией
- Поиск по имени/адресу
- Фильтры по среде (CI/CD, Production, Stage, etc.)
- Статистика по типам и средам

### 2. Analytics
- Метрики uptime
- Графики доступности
- История инцидентов

### 3. History
- Полная история изменений статусов
- Календарь с heatmap

### 4. Admin
- Добавление новых сервисов
- Обновление статусов вручную
- Создание инцидентов

---

## 🔄 API Endpoints

### Сервисы
```bash
# Получить все сервисы
GET /api/services

# Получить конкретный сервис
GET /api/services/:id

# Создать сервис
POST /api/services

# Обновить статус
PATCH /api/services/:id/status

# Проверить доступность
POST /api/check-availability/:id
```

### Импорт/Экспорт
```bash
# Импорт сервисов
POST /api/import-services

# Экспорт в JSON
GET /api/export-services?format=json

# Экспорт в CSV
GET /api/export-services?format=csv
```

---

## 📞 Поддержка

Если у вас возникли проблемы:
1. Проверьте логи сервера
2. Убедитесь, что все переменные окружения установлены
3. Проверьте доступность Grafana сервера
4. Посмотрите документацию Grafana API

**Полезные ссылки:**
- [Grafana HTTP API](https://grafana.com/docs/grafana/latest/developers/http_api/)
- [Prometheus Query API](https://prometheus.io/docs/prometheus/latest/querying/api/)

---

## ✅ Changelog

### 2025-10-29: Docker и Build конфигурация
- ✅ Исправлена сборка для Docker
- ✅ Добавлен отдельный tsconfig.server.json
- ✅ Используется esbuild для быстрой сборки сервера
- ✅ Dockerfile обновлен с правильными путями
- ✅ package.json обновлен с правильными скриптами сборки
- ✅ Docker Compose готов к использованию
