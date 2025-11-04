# Service Status Monitoring Platform

## Overview
A comprehensive service status monitoring platform, similar to Yandex Cloud Status. This platform provides real-time service health tracking, incident management, and analytics dashboards. It aims to offer a robust solution for monitoring various services with detailed insights and administrative control.

## User Preferences
- All data from the original HTML dashboard must be preserved without any losses
- Display service addresses and ports with "Открыть" (Open) buttons
- Support Russian language in UI elements

## System Architecture

### UI/UX Decisions
- **Dark mode-first design** with custom color tokens.
- **Status Colors**: Operational (Green), Degraded (Amber), Down (Red), Maintenance (Blue).
- **Typography**: Primary font Inter, Monospace JetBrains Mono.
- **Component Design**: StatusBadge for visual indicators, ServiceCard for service information, MetricCard for analytics display.
- **Responsive Design**: Fully adaptive interface for mobile and tablet devices, including dashboard table transformation to cards on smaller screens and optimized text sizes.

### Technical Implementations
- **Frontend**: React with Vite, Wouter for routing, TanStack Query for state management, Shadcn UI with Tailwind CSS for components, Recharts for data visualization.
- **Backend**: FastAPI with Python 3.11, RESTful API with Pydantic validation.
- **Data Models**: Services (status, region, category), Incidents (disruptions), Status History (changes).
- **Key Features**:
    - **Dashboard**: Real-time status, filtering, search, visual status indicators, system health summary.
    - **Analytics**: Uptime, active services/incidents, MTTR, uptime trend, incident visualization, service distribution by status/category.
    - **History**: Incident timeline, calendar heatmap for uptime, detailed incident view.
    - **Admin Panel**: Add/update services, report incidents, manage services.
    - **Service Details**: Individual service metrics, uptime trend, incident history.
- **API Endpoints**: Comprehensive set for managing services (GET, POST, PATCH) and incidents (GET, POST).
- **Development Workflow**: Vite dev server (port 5173) and FastAPI server (port 5000) with proxying.

### System Design Choices
- **Deterministic ID generation** for imported services based on attributes like name, region, category, address, and port.
- **In-memory storage** for development environments.
- **CSV/JSON export and import capabilities** for services.
- **Grafana Integration**: Automatic status synchronization from Grafana every 30 seconds, mapping Prometheus `up{job="node_exporter"}` metrics to service statuses (1=operational, 0=down). Graceful degradation if Grafana variables are not set.
- **Replit Environment**: Node.js 20.x, npm, working directory `/statuserver`, configured for autoscale deployment.

## External Dependencies
- **Metrics API**: External API для получения метрик серверов. Requires `METRICS_API_URL` environment variable.
- **Grafana**: For automatic service status synchronization (опционально). Requires `GRAFANA_URL` and `GRAFANA_API_TOKEN`.

## Recent Changes (2025-11-04)

### ✅ Metrics API Integration
- **Создан клиент для интеграции с внешним Metrics API** (`server_py/metrics_api_client.py`)
  - Автоматическая проверка доступности API при запуске
  - Получение списка серверов через `/metrics/servers`
  - Получение метрик для каждого сервера (CPU, Memory, status)
  - Конвертация данных Metrics API в формат Service
  - Синхронизация с локальным хранилищем
  - Graceful fallback: использует локальные данные если API недоступен

### 🔐 Authentication System
- **HTTP Basic Authentication для админских endpoints** (`server_py/auth.py`)
  - Логин: `root`
  - Пароль: `72416810`
  - Защищенные endpoints:
    * POST /api/services - создание сервисов
    * PATCH /api/services/{id}/status - обновление статусов
    * POST /api/incidents - создание инцидентов
    * POST /api/import-services - импорт данных
    * POST /api/grafana/sync - синхронизация с Grafana

### 🔄 API Error Handling
- **Обработка недоступности Metrics API**:
  - GET /api/services возвращает 503 если API недоступен и нет локальных данных
  - GET /api/metrics-api/status - проверка статуса внешнего API
  - Автоматическое переключение между live metrics и cached data
  - Сообщения в логах о статусе API

### 🐳 Docker Configuration
- **Multi-stage Dockerfile**:
  - Stage 1: Node.js для сборки frontend (Vite build)
  - Stage 2: Python 3.11 slim для production
  - Оптимизирован для минимального размера образа
- **docker-compose.yml**:
  - Настройка environment variables (METRICS_API_URL, PORT, etc.)
  - Healthcheck endpoint: /api/metrics-api/status
  - Автоматический restart политика
- **Environment variables** (.env.example):
  - METRICS_API_URL - URL внешнего Metrics API (обязательно)
  - GRAFANA_URL, GRAFANA_API_TOKEN - Grafana интеграция (опционально)
  - NODE_ENV - режим окружения (development/production)
  - PORT - порт приложения (default: 5000)

### 📝 Documentation
- **README.md**: Comprehensive documentation включая:
  - Быстрый старт для Replit
  - Инструкции по настройке Metrics API
  - Docker setup и команды
  - API endpoints документация
  - Логика работы с Metrics API
  - Troubleshooting guide
  - Инструкции по смене пароля админки

### 🔧 Development Workflow
- **start.sh**: Улучшенный скрипт запуска с:
  - Цветные логи и статус сообщения
  - Отображение environment variables
  - Graceful shutdown на Ctrl+C
  - Запуск двух серверов (Vite + FastAPI)

## Architecture Decisions (2025-11-04)

### Backend Integration Strategy
1. **Primary Data Source**: External Metrics API
2. **Fallback Strategy**: Local in-memory storage
3. **Sync Mechanism**: On-demand при запросе GET /api/services
4. **Status Mapping**: 
   - Metric value 1 → operational
   - Metric value 0 → down
   - No data → degraded

### Security Considerations
- HTTP Basic Auth для защиты admin endpoints
- Credentials хранятся в коде (hardcoded) для простоты development
- **Production**: рекомендуется использовать environment variables и более безопасную аутентификацию

### API Design
- RESTful API endpoints
- Pydantic validation для всех данных
- Consistent error responses (HTTPException)
- Health check endpoint для Docker healthcheck