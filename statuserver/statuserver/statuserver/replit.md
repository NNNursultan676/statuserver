# Service Status Monitoring Platform

## Overview
A comprehensive service status monitoring platform similar to Yandex Cloud Status. Built with React, Express.js, and TypeScript, featuring real-time service health tracking, incident management, and analytics dashboards.

## Project Architecture

### Frontend (React + TypeScript)
- **Framework**: React with Vite
- **Routing**: Wouter for client-side navigation
- **State Management**: TanStack Query for server state
- **UI Components**: Shadcn UI with Tailwind CSS
- **Charts**: Recharts for data visualization
- **Styling**: Dark mode-first design with custom color tokens

### Backend (Python/FastAPI)
- **Server**: FastAPI with Python 3.11 (migrated from TypeScript/Express.js)
- **Storage**: In-memory storage for development
- **API**: RESTful API with Pydantic validation
- **Features**: 
  - Automatic Grafana integration with 30-second sync intervals
  - Deterministic ID generation for imported services
  - CSV/JSON export and import capabilities
  - Full API parity with original TypeScript backend

### Data Models
1. **Services**: Core services being monitored with status, region, and category
2. **Incidents**: Records of service disruptions and outages
3. **Status History**: Historical status changes for analytics

## Key Features

### 1. Dashboard
- Real-time service status overview
- Service filtering by region and category
- Search functionality
- Visual status indicators (Operational, Degraded, Down, Maintenance)
- System health summary

### 2. Analytics
- Key metrics cards (Overall Uptime, Active Services, Active Incidents, MTTR)
- 30-day uptime trend chart
- Incidents over time visualization
- Service status distribution (pie chart)
- Services by category breakdown
- Circular progress indicators

### 3. History
- Timeline view of all incidents
- Calendar heatmap showing 30-day uptime
- Incident details with severity and status badges
- Resolution time tracking

### 4. Admin Panel
- Add new services with detailed configuration
- Update service status in real-time
- Report new incidents with severity levels
- Manage all services from central dashboard

### 5. Service Details
- Individual service page with comprehensive metrics
- 30-day uptime trend for specific service
- Incident history filtered by service
- Real-time status updates

## Design System

### Colors
- **Status Colors**:
  - Operational: Green (`142 76% 45%`)
  - Degraded: Amber (`38 92% 50%`)
  - Down: Red (`0 84% 60%`)
  - Maintenance: Blue (`217 91% 60%`)

### Typography
- **Primary Font**: Inter
- **Monospace**: JetBrains Mono (for metrics and timestamps)

### Components
- StatusBadge: Visual status indicators with icons
- ServiceCard: Service information cards with hover effects
- MetricCard: Analytics metric display with trends
- Charts: Various data visualizations using Recharts

## API Endpoints

### Services
- `GET /api/services` - Get all services
- `GET /api/services/:id` - Get specific service
- `POST /api/services` - Create new service
- `PATCH /api/services/:id/status` - Update service status

### Incidents
- `GET /api/incidents` - Get all incidents
- `POST /api/incidents` - Create new incident

## User Preferences
- All data from the original HTML dashboard must be preserved without any losses
- Display service addresses and ports with "Открыть" (Open) buttons
- Support Russian language in UI elements

## Deployment
- **Platform**: Replit Autoscale deployment
- **Development Workflow**:
  - Vite dev server on port 5173 (frontend with HMR)
  - FastAPI server on port 5000 (backend API + proxy to Vite)
- **Production Build**: npm run build:client (Vite static build)
- **Ports**:
  - Development: FastAPI (5000) proxies to Vite (5173)
  - Production: FastAPI (5000) serves static files and API

## Replit Environment Setup
- **Node.js Version**: 20.x
- **Package Manager**: npm
- **Working Directory**: `/statuserver`
- **Development Workflow**: Configured to run `npm run dev` on port 5000
- **Configuration**:
  - TypeScript paths configured for `@shared`, `@`, and `@assets` aliases
  - Vite configured for Replit proxy (0.0.0.0:5000, HMR via WSS)
  - In-memory storage (no database required)
  - Grafana integration optional (via environment variables)

## Grafana Integration (Автоматическое обновление статусов)
- **Функция**: Автоматическая синхронизация статусов сервисов из Grafana каждые 30 секунд
- **Требуемые переменные окружения** (добавить в Secrets):
  - `GRAFANA_URL` - URL вашего Grafana сервера (пример: https://grafana.example.com)
  - `GRAFANA_API_TOKEN` - API токен с правами Viewer или Editor
- **Prometheus Query**: `up{job="node_exporter"}`
- **Логика сопоставления**: По адресу сервиса или имени с `instance` в метриках
- **Маппинг статусов**:
  - Метрика = 1 → Service status = `operational` (зеленый)
  - Метрика = 0 → Service status = `down` (красный)
- **Интервал синхронизации**: 
  - Первая синхронизация через 5 секунд после старта
  - Далее каждые 30 секунд автоматически
- **Примечание**: Если переменные не установлены, приложение работает в обычном режиме без авто-обновления

## Local Setup Instructions
1. Install dependencies: 
   - Python packages: Already installed (fastapi, uvicorn, httpx, pydantic)
   - Node packages: `npm install`
2. Start development server: `bash start.sh`
3. Access application at: `http://localhost:5000`
4. Optional: Configure Grafana integration via environment variables (GRAFANA_URL, GRAFANA_API_TOKEN)

## Recent Changes

- 2025-10-29: **Backend Migration to Python/FastAPI**
  - ✅ **Complete migration from TypeScript/Express.js to Python/FastAPI**
  - **100% functionality preserved**: All API endpoints, storage logic, and Grafana integration
  - **Architecture**:
    * Created `server_py/` directory with Python backend
    * Models: Pydantic models replicate TypeScript schemas (Service, Incident, StatusHistory, ServerMetrics)
    * Storage: In-memory storage with deterministic ID generation (hash-based)
    * Grafana: Full integration with automatic 30-second sync and graceful degradation
    * Routes: All 13+ API endpoints ported (services, incidents, status history, metrics, import/export, availability checks)
  - **Development Workflow**:
    * Vite dev server runs on port 5173 (frontend HMR)
    * FastAPI server runs on port 5000 (API + proxy to Vite)
    * `start.sh` script orchestrates both servers
  - **Verified Working**:
    * All 274 services load correctly
    * Dashboard displays properly with full functionality
    * API responses match original TypeScript backend
    * Frontend appearance unchanged (0% visual changes)
  - **Environment Variables** (optional):
    * `GRAFANA_URL` - Grafana server URL
    * `GRAFANA_API_TOKEN` - Grafana API token for metrics sync
  - **Files Created**:
    * `server_py/main.py` - FastAPI application entry point
    * `server_py/models.py` - Pydantic data models
    * `server_py/storage.py` - In-memory storage implementation
    * `server_py/routes.py` - API endpoints
    * `server_py/grafana_service.py` - Grafana integration
    * `server_py/import_data.py` - Data import utilities
    * `start.sh` - Development server startup script
  - **Architect Review**: ✅ Pass - Full API parity achieved, application operates correctly
- 2025-10-29: Docker Build Configuration Fixed
  - ✅ Исправлена сборка для Docker - теперь работает корректно!
  - Создан tsconfig.server.json для компиляции только серверной части
  - Переключен на esbuild для быстрой сборки сервера (вместо tsc)
  - Обновлен Dockerfile с правильными путями: dist/server/index.js
  - package.json: разделены build:client (Vite) и build:server (esbuild)
  - Структура сборки: dist/public/ (frontend) + dist/server/ (backend)
  - Docker Compose готов к использованию локально

- 2025-10-29: Replit Environment Configuration
  - Configured TypeScript module system to ESNext for proper ES module support
  - Added path aliases in tsconfig.json for @shared, @, and @assets
  - Fixed Vite configuration to work with Replit proxy
  - Created .gitignore with Node.js best practices
  - Configured autoscale deployment for production
  - Verified full functionality with 274 imported services


- 2025-10-29: Dashboard UX Improvements
  - Удален компонент ExportMenu для упрощения интерфейса
  - Блок статистики переработан - оставлен только "Избранное", убрана "История"
  - Улучшено отображение статуса сервисов:
    * Desktop: цветные индикаторы с текстовыми метками (OK, OFF, —)
    * Mobile: профессиональные Badge компоненты с цветными точками и описанием
  - Более чистый и понятный интерфейс для пользователей

- 2025-10-29: Mobile-First Responsive Design Implementation
  - Полностью адаптивный интерфейс для мобильных устройств и планшетов
  - Dashboard table преобразована в карточки на мобильных (< md breakpoint)
  - Адаптивная навигация в шапке с уменьшенными размерами на mobile
  - Горизонтальная прокрутка для фильтров окружения на маленьких экранах
  - Оптимизированные размеры текста для всех устройств (responsive typography)
  - Улучшенные отступы и spacing для комфортного использования на телефонах
  - Touch-friendly кнопки и элементы управления
  - Настроен Replit deployment с autoscale


- 2025-10-28: Добавлены расширенные функции мониторинга (Agent Update)
  - Добавлено поле `type` в схему Service для явной типизации сервисов
  - Реализован детерминированный ID для сервисов (на основе name+region+category+address+port)
  - Добавлены API endpoints:
    * POST /api/import-services - импорт сервисов через curl с поддержкой JSON данных
    * GET /api/export-services?format=[json|csv] - экспорт сервисов
    * POST /api/check-availability/:id - проверка доступности сервисов
  - Созданы хуки для фронтенда:
    * use-favorites - управление избранными сервисами (localStorage)
    * use-history - история просмотренных сервисов (localStorage)
    * use-availability - проверка доступности сервисов
  - Создан компонент ExportMenu с поддержкой экспорта в JSON, CSV, Excel и копирования в буфер
  - Полностью обновлен Dashboard:
    * Фильтрация по средам (CI/CD, Development, Production, Stage, Test, dev-bi)
    * Фильтрация по категориям сервисов
    * Множественный выбор типов сервисов (Backend, Frontend, DevTools, BPMN, PSQL)
    * Три вкладки: "Все", "Избранное", "История"
    * Статистические панели с количеством сервисов по средам и типам
    * Кнопка "Проверить доступность" для массовой проверки
    * Полная локализация интерфейса на русский язык
  - Обновлен ServiceCard:
    * Кнопка звездочки для добавления в избранное
    * Цветной индикатор доступности (зеленый/красный)
    * Поддержка отображения статуса проверки доступности

- 2025-10-28: Project optimization and refactoring
  - Reduced UI components from 48 to 25 (removed 23 unused components)
  - Reduced total TypeScript files from 62 to 41
  - Created shared utilities file (serviceUtils.ts) for reusable functions
  - Eliminated code duplication across ServiceCard and ServiceDetail components
  
- 2025-10-28: Integrated real service data from HTML dashboard
  - Added 274 services across 7 environments (CI/CD, Development, Production, Stage, Test, dev-bi, 🌍 Все среды)
  - Extended Service schema with `address` and `port` fields
  - Updated ServiceCard component to display addresses, ports, and "Открыть" buttons
  - Updated ServiceDetail page to show service URLs with external link buttons
  - Enhanced Admin panel to support address and port fields in service creation form
  - Imported all data from original HTML file without any losses
  - Created data import functionality (importData.ts)

- 2025-01-22: Initial project setup with all core features
  - Created data schemas for Service, Incident, StatusHistory
  - Built complete frontend with Dashboard, Analytics, History, Admin, and ServiceDetail pages
  - Implemented reusable components (StatusBadge, ServiceCard, MetricCard)
  - Set up navigation and routing
  - Configured design system with status colors and typography
