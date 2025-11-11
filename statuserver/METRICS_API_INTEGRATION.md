# Интеграция с Monitoring API

Полное руководство по интеграции Status Server с вашим Monitoring API (Prometheus + Loki).

## 📡 Обзор API

Ваш Monitoring API предоставляет метрики серверов через следующие эндпоинты:

### Основные эндпоинты

| Эндпоинт | Метод | Описание |
|----------|-------|----------|
| `/metrics/available` | GET | Проверка доступности API |
| `/metrics/servers/all` | GET | **Главный эндпоинт** - метрики всех серверов |
| `/metrics/servers/{server_name}` | GET | Метрики конкретного сервера |
| `/metrics/cpu/usage` | GET | Использование CPU всех серверов |
| `/metrics/memory/usage` | GET | Использование памяти всех серверов |

## 🔧 Настройка интеграции

### 1. Конфигурация через переменные окружения

Создайте файл `.env` в папке `statuserver`:

```env
# URL вашего Monitoring API
METRICS_API_URL=http://10.183.45.198:8000

# Если API за VPN/туннелем
# METRICS_API_URL=http://localhost:8000
```

### 2. Настройка туннеля (если API за VPN)

Если ваш Monitoring API доступен только через VPN или требует туннеля:

```bash
# SSH туннель
ssh -L 8000:10.183.45.198:8000 user@vpn-gateway

# Или используйте WireGuard/OpenVPN согласно вашей инфраструктуре
```

Затем в `.env`:
```env
METRICS_API_URL=http://localhost:8000
```

### 3. Docker Compose конфигурация

Обновите `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - PORT=5000
      - STORAGE_TYPE=database
      - DATABASE_PATH=/app/data/services.db
      - METRICS_API_URL=http://10.183.45.198:8000  # ← Ваш API
      - ADMIN_USERNAME=admin
      - ADMIN_PASSWORD=changeme
    volumes:
      - ./data:/app/data
    restart: unless-stopped
    # Если нужен доступ к host network для туннеля
    # network_mode: "host"
```

## 📊 Формат данных API

### Ответ от `/metrics/servers/all`

```json
[
  {
    "server_name": "SIEM Server",
    "cpu_usage": 1.17,
    "memory_usage": 45.27,
    "disk_usage": 30.29,
    "load_average": 0.44,
    "network_in": 5966.46,
    "network_out": 102740.88,
    "timestamp": "2025-11-11T05:35:38.217258"
  },
  {
    "server_name": "OPS Server",
    "cpu_usage": 18.33,
    "memory_usage": 11.43,
    "disk_usage": 52.59,
    "load_average": 2.19,
    "network_in": 0,
    "network_out": 0,
    "timestamp": "2025-11-11T05:35:38.437879"
  }
]
```

## 🎯 Логика определения статусов

Status Server автоматически определяет статус каждого сервера:

### Правила статусов

| Статус | Условие | Описание |
|--------|---------|----------|
| 🔴 **Down** | `cpu_usage == 0 && memory_usage == 0` | Сервер не отвечает |
| 🟡 **Degraded** | `cpu > 90% || memory > 90% || disk > 90%` | Критическая нагрузка |
| 🟠 **Maintenance** | `cpu > 80% || memory > 80% || disk > 85%` | Высокая нагрузка |
| 🟢 **Operational** | Все остальные случаи | Нормальная работа |

### Определение категорий

Категории определяются автоматически по имени сервера:

| Имя содержит | Категория | Иконка |
|--------------|-----------|--------|
| database, db | Database | 💾 database |
| sso, auth | Authentication | 🛡️ shield |
| vpn, ipsec, firezone | Network | 🌐 globe |
| gitlab, git | DevTools | 🔀 git-branch |
| siem, wazuh | Security | 🛡️ shield |
| ai | Compute | 🖥️ cpu |
| ops | Operations | 🖥️ server |
| proxy | Network | 🌐 globe |

## 🔄 Автоматическая синхронизация

Status Server автоматически синхронизирует данные с Monitoring API:

### При запуске

```python
# При старте приложения проверяется доступность API
metrics_available = await metrics_client.check_availability()

if metrics_available:
    print(f"✓ Metrics API доступен: {metrics_client.base_url}")
    # Загружаются актуальные данные
else:
    print(f"✗ Metrics API недоступен")
    # Используется локальное хранилище
```

### При запросе данных

```python
# GET /api/services автоматически проверяет API
if metrics_api_available:
    services = await metrics_client.sync_services_from_api()
    # Обновляет данные в БД
    for service in services:
        await storage.create_service(service)
```

## 🗄️ Постоянное хранилище

Даже если Monitoring API временно недоступен, Status Server продолжает работать с сохраненными данными:

- **SQLite база данных** в `/app/data/services.db`
- **Автоматическое обновление** при доступности API
- **История изменений** статусов сервисов

## 🚀 Запуск в Docker

### Полный процесс

```bash
cd statuserver

# 1. Настройте переменные окружения
cp .env.example .env
nano .env  # Укажите METRICS_API_URL

# 2. Соберите и запустите
docker-compose up --build -d

# 3. Проверьте логи
docker-compose logs -f

# Вы должны увидеть:
# ✓ Metrics API доступен: http://10.183.45.198:8000
# 🔄 Синхронизация с Monitoring API...
# ✓ Синхронизировано 13 сервисов
```

## 📋 Проверка интеграции

### 1. Тест доступности API

```bash
curl http://10.183.45.198:8000/metrics/available
# Ответ: "string" (HTTP 200)
```

### 2. Тест получения метрик

```bash
curl http://10.183.45.198:8000/metrics/servers/all | jq '.[0]'
```

Ожидаемый ответ:
```json
{
  "server_name": "SIEM Server",
  "cpu_usage": 1.17,
  "memory_usage": 45.27,
  "disk_usage": 30.29,
  "load_average": 0.44,
  "network_in": 5966.46,
  "network_out": 102740.88,
  "timestamp": "2025-11-11T05:35:38.217258"
}
```

### 3. Проверка Status Server

```bash
# Откройте в браузере
http://localhost:5000

# Или через API
curl http://localhost:5000/api/services | jq '.[0]'
```

## 🎨 Пример данных в Status Server

После синхронизации с вашим API вы увидите:

```json
{
  "id": "srv-siem-server",
  "name": "SIEM Server",
  "description": "SIEM Server - CPU: 1.2%, RAM: 45.3%, Disk: 30.3%",
  "category": "Security",
  "region": "Production",
  "status": "operational",
  "type": "Server",
  "icon": "shield",
  "updated_at": "2025-11-11T05:35:38.217258"
}
```

## 🔧 Troubleshooting

### Проблема: API не доступен из Docker

**Решение 1**: Используйте host network mode

```yaml
services:
  app:
    network_mode: "host"
    environment:
      - METRICS_API_URL=http://localhost:8000
```

**Решение 2**: Используйте IP адрес хоста

```yaml
environment:
  - METRICS_API_URL=http://172.17.0.1:8000  # Docker bridge gateway
```

### Проблема: Timeout при подключении

**Увеличьте timeout** в `metrics_api_client.py`:

```python
self.timeout = 60.0  # Было 30.0
```

### Проблема: Данные не обновляются

**Проверьте логи**:

```bash
docker-compose logs app | grep "Синхронизация"
docker-compose logs app | grep "Metrics API"
```

**Принудительная синхронизация** через API:

```bash
curl http://localhost:5000/api/services?force_sync=true
```

## 📝 Список ваших серверов

По данным из API обнаружены следующие серверы:

1. **SIEM Server** - Security monitoring
2. **OPS Server** - Operations management
3. **AI Test Environment** - AI testing
4. **IPSec Server** - VPN gateway
5. **Stage Database** - Staging DB
6. **Production Database** - Production DB
7. **Wazuh Demo** - Security monitoring demo
8. **Firezone VPN** - VPN service
9. **GitLab VM** - Version control
10. **SSO Server** - Single Sign-On
11. **Central Proxy** - Reverse proxy
12. **AI Project VM** - AI project
13. **Demo DB CreditBroker** - Demo database

Все эти сервисы будут автоматически импортированы при первом подключении к Monitoring API!

## 🎉 Готово!

После настройки ваш Status Server будет:

✅ Автоматически получать метрики из Monitoring API  
✅ Отображать актуальный статус всех серверов  
✅ Сохранять историю изменений  
✅ Работать даже при отключении API  
✅ Показывать CPU, RAM, Disk usage каждого сервера  

**URL вашего Status Server**: `http://localhost:5000`
