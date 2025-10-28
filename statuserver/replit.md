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

### Backend (Express.js)
- **Server**: Express.js with TypeScript
- **Storage**: In-memory storage (MemStorage) for development
- **API**: RESTful API with validation using Zod schemas

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

## Recent Changes
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
