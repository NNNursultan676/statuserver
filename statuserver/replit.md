# Service Status Monitoring Platform

## Overview

A comprehensive service status monitoring platform inspired by Yandex Cloud Status. Built with React, Express.js, and TypeScript, this application provides real-time service health tracking, incident management, and analytics capabilities. The platform features a dark-mode-first design system based on Shadcn UI and supports monitoring of distributed services across multiple environments and regions.

The application serves as a centralized dashboard for tracking the operational status of various backend services, databases, and infrastructure components, with optional Grafana integration for automated metrics collection.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- **React 18** with TypeScript for type-safe component development
- **Vite** as the build tool and development server, configured for fast hot module replacement
- **Wouter** for lightweight client-side routing (alternative to React Router)

**State Management**
- **TanStack Query (React Query)** for server state management, caching, and automatic refetching
- Local state managed via React hooks (`useState`, `useEffect`)
- Custom hooks for cross-cutting concerns: `useFavorites`, `useHistory`, `useAvailability`

**UI Component System**
- **Shadcn UI** component library built on Radix UI primitives
- **Tailwind CSS** for utility-first styling with custom design tokens
- **class-variance-authority** for variant-based component styling
- Custom CSS variables for theme colors, spacing, and elevation states

**Data Visualization**
- **Recharts** library for rendering charts (line, area, bar, pie)
- Service status timelines and uptime heatmaps
- Real-time metrics dashboards

**Design Principles**
- Dark mode as primary theme (light mode support via CSS variables)
- Responsive design with mobile-first breakpoints
- Accessibility-focused components via Radix UI
- Monospace fonts (JetBrains Mono) for metrics and timestamps

### Backend Architecture

**Server Framework**
- **Express.js** with TypeScript running on Node.js 20
- ESM module system throughout the codebase
- Middleware for JSON parsing, CORS, and request logging

**Storage Layer**
- **In-memory storage (MemStorage)** as the default persistence mechanism
- Interface-based design (`IStorage`) allows for easy swapping to database implementations
- Drizzle ORM configuration present for future PostgreSQL integration
- Data models: Services, Incidents, StatusHistory, ServerMetrics

**API Design**
- RESTful endpoints under `/api/*` namespace
- Zod schema validation for request payloads
- Deterministic ID generation for imported services (hash-based)
- CSV/JSON export capabilities

**Build Process**
- **esbuild** for fast server-side bundling
- Separate client and server build pipelines
- Multi-stage Docker builds with production optimization

### Data Models

**Services**
- Core entity representing monitored infrastructure components
- Fields: name, description, category, region, status, type, icon, address, port
- Status types: operational, degraded, down, maintenance, loading
- Supports hierarchical organization by environment and category

**Incidents**
- Track service disruptions with severity levels (minor, major, critical)
- Lifecycle states: investigating, identified, monitoring, resolved
- Timestamps for start time, resolution time, and creation

**Status History**
- Temporal tracking of service status changes
- Used for uptime calculations and trend analysis

**Server Metrics**
- CPU, RAM, and disk usage tracking per service
- Time-series data for performance dashboards

### External Dependencies

**Grafana Integration (Optional)**
- REST API integration for automated service status synchronization
- Prometheus metrics querying via Grafana proxy endpoints
- Periodic polling (30-second intervals) for status updates
- Configuration via environment variables: `GRAFANA_URL`, `GRAFANA_API_TOKEN`, `GRAFANA_DASHBOARD_ID`
- Fallback to manual status management when Grafana is not configured

**Database (Optional)**
- Drizzle ORM configured for PostgreSQL via `@neondatabase/serverless`
- Schema definitions in `shared/schema.ts` with migration support
- Environment variable: `DATABASE_URL`
- Default mode operates without database using in-memory storage

**Third-Party UI Libraries**
- **Radix UI** primitives for accessible component foundation
- **Lucide React** for consistent iconography
- **date-fns** for date manipulation and formatting
- **jsPDF** and **autoTable** for PDF report generation

**Development Tools**
- Replit-specific plugins for development environment integration
- TypeScript compiler with strict mode disabled for flexibility
- ESLint for code quality (configuration present)

**Deployment**
- Docker containerization with multi-stage builds
- Docker Compose orchestration for local development
- Static file serving for production builds
- Environment-based configuration (development vs. production modes)