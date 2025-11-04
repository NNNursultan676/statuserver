# 🐳 Быстрый запуск с Docker

## ✅ Проблема ИСПРАВЛЕНА!

Docker теперь работает корректно. Все необходимые исправления уже внесены.

## Запуск за 3 шага

### 1. Перейдите в папку проекта

```bash
cd C:\Users\Nursultan\Desktop\statuserver\statuserver
```

### 2. (Опционально) Создайте .env для Grafana

Если вам нужна интеграция с Grafana, создайте файл `.env`:

**Windows PowerShell:**
```powershell
@"
GRAFANA_URL=http://10.128.0.38:3000
GRAFANA_API_TOKEN=glsa_SSwlVwr0yWshV2re9TZlV14jcN7oQBgT_1059b810
"@ | Out-File -FilePath .env -Encoding UTF8
```

**Windows CMD:**
```cmd
(
echo GRAFANA_URL=http://10.128.0.38:3000
echo GRAFANA_API_TOKEN=glsa_SSwlVwr0yWshV2re9TZlV14jcN7oQBgT_1059b810
) > .env
```

**Linux/Mac:**
```bash
cat > .env << 'EOF'
GRAFANA_URL=http://10.128.0.38:3000
GRAFANA_API_TOKEN=glsa_SSwlVwr0yWshV2re9TZlV14jcN7oQBgT_1059b810
EOF
```

### 3. Запустите Docker Compose

```bash
docker-compose up --build
```

**Готово!** Приложение доступно на **http://localhost:5000**

---

## Команды управления

### Запуск в фоновом режиме:
```bash
docker-compose up -d --build
```

### Просмотр логов:
```bash
docker-compose logs -f
```

### Остановка:
```bash
docker-compose down
```

### Перезапуск после изменений:
```bash
docker-compose down
docker-compose up --build
```

---

## Что было исправлено (29.10.2025)

### Проблема 1: `Cannot find module '/app/dist/index.js'`
✅ **Исправлено**
- Обновлён Dockerfile с правильным путём: `dist/server/index.js`
- Добавлен отдельный tsconfig.server.json
- Используется esbuild для сборки сервера

### Проблема 2: `Cannot find package 'vite'`
✅ **Исправлено**
- `vite` перемещён из devDependencies в dependencies
- Добавлен `--external:vite` в esbuild конфигурацию
- Теперь vite доступен в production контейнере

---

## Структура после сборки

```
dist/
├── public/           # Frontend (Vite bundle)
│   ├── index.html
│   └── assets/
│       ├── index-*.css
│       └── index-*.js
└── server/
    └── index.js      # Backend (esbuild bundle, 65KB)
```

---

## Переменные окружения для Docker

Вы можете настроить переменные двумя способами:

### Способ 1: Файл .env (рекомендуется)
Создайте файл `.env` в папке `statuserver/`:
```env
GRAFANA_URL=http://10.128.0.38:3000
GRAFANA_API_TOKEN=glsa_SSwlVwr0yWshV2re9TZlV14jcN7oQBgT_1059b810
```

### Способ 2: Отредактировать docker-compose.yml
```yaml
environment:
  - NODE_ENV=production
  - PORT=5000
  - GRAFANA_URL=http://10.128.0.38:3000
  - GRAFANA_API_TOKEN=glsa_SSwlVwr0yWshV2re9TZlV14jcN7oQBgT_1059b810
```

---

## Проверка работы

После запуска Docker:

### 1. Проверить, что контейнер запущен
```bash
docker ps
```

Вы должны увидеть:
```
CONTAINER ID   IMAGE                 STATUS         PORTS
xxxxx          statuserver-app       Up 10 seconds  0.0.0.0:5000->5000/tcp
```

### 2. Проверить логи
```bash
docker-compose logs
```

Ожидаемый вывод:
```
app-1  | serving on port 5000
app-1  | Grafana integration is configured. Starting automatic sync...
```

### 3. Проверить API
```bash
curl http://localhost:5000/api/services
```

### 4. Открыть в браузере
```
http://localhost:5000
```

---

## Troubleshooting

### Порт 5000 занят

Измените порт в `docker-compose.yml`:

```yaml
ports:
  - "3000:5000"  # Локальный порт 3000 → контейнер порт 5000
```

Затем откройте http://localhost:3000

### Ошибки при сборке

```bash
# Очистите Docker кеш и пересоберите
docker-compose down
docker system prune -a
docker-compose up --build
```

### Изменения в коде не применяются

```bash
# Пересоберите образ принудительно
docker-compose build --no-cache
docker-compose up
```

### Grafana не подключается (внутри Docker)

Если ваш Grafana на `http://10.128.0.38:3000`, убедитесь:
1. Docker контейнер может достучаться до этого IP
2. Попробуйте использовать `host.docker.internal` вместо локального IP:
   ```env
   GRAFANA_URL=http://host.docker.internal:3000
   ```

---

## Production Deployment

Для production рекомендуется:

1. **Используйте environment variables для секретов**
   - Не храните токены в docker-compose.yml
   - Используйте Docker secrets или .env файл

2. **Настройте volume для персистентности**
   ```yaml
   volumes:
     - app-data:/app/data
   ```

3. **Настройте health checks**
   ```yaml
   healthcheck:
     test: ["CMD", "curl", "-f", "http://localhost:5000/api/services"]
     interval: 30s
     timeout: 10s
     retries: 3
   ```

4. **Используйте reverse proxy (nginx/traefik)**

---

## Полная документация

Смотрите `SETUP_GUIDE_RU.md` для подробной инструкции со всеми вариантами запуска и настройки Grafana интеграции.

---

## 📝 Changelog

### 2025-10-29: Исправлена интеграция Vite для Docker
- ✅ `vite` перемещён в dependencies (был в devDependencies)
- ✅ Добавлен `--external:vite` в esbuild
- ✅ Docker теперь работает без ошибок
- ✅ Production сборка полностью функциональна
