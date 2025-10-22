# StatusForge - Service Status Monitoring Dashboard

## Overview
StatusForge is a comprehensive service status monitoring and incident management system. It provides real-time status tracking, incident history, and detailed analytics with export capabilities.

## Project Structure
- **Client**: React + TypeScript frontend using Vite
- **Server**: Express.js backend with PostgreSQL database
- **Database**: PostgreSQL with Drizzle ORM
- **UI**: Shadcn/ui components with Tailwind CSS

## Key Features

### Dashboard (Main Page)
- Real-time service status monitoring
- Search functionality
- Category and status filters
- Service cards with status indicators
- Overall system health indicator

### Reports & Analytics
- Date range selection (7 days, 30 days, 3 months, all time)
- Export to CSV and JSON
- Key metrics: uptime percentage, active services, incidents, MTTR
- Interactive charts: uptime trends, incident trends, status distribution
- Detailed services and incidents tables
- Filter by unresolved incidents

### Incident History & Analytics
- Advanced filtering: date range, severity, status, search
- Incident trend visualization with severity breakdown
- Key metrics: unresolved count, total incidents, average resolution time
- Timeline and calendar views
- Severity badges: minor, major, critical
- Status tracking: investigating, identified, monitoring, resolved

### Admin Panel
- Service management (create, update, delete)
- Incident creation and tracking
- Status updates

## Recent Changes (October 22, 2025)

### Dashboard Improvements
- Removed region filter (no longer relevant)
- Added status filter (operational, degraded, down, maintenance)
- Improved filter layout for better UX

### Reports Page Enhancements
- Added date range selection with preset options
- Export functionality for CSV and JSON reports
- Added "Show Unresolved Only" filter
- New stacked bar chart for status by category
- Comprehensive services overview table
- Recent incidents table with duration tracking

### Incident History Upgrades
- Multi-dimensional filtering (date, severity, status, search)
- Incident trend chart with severity breakdown
- Statistics cards for quick insights
- Improved data visualization with charts
- Better mobile responsiveness

## Technology Stack
- React 18 with TypeScript
- Express.js
- PostgreSQL (Neon)
- Drizzle ORM
- Recharts for data visualization
- Tailwind CSS + Shadcn/ui
- Wouter for routing
- TanStack Query for data fetching

## Database Schema
- **services**: Service definitions with status tracking
- **incidents**: Incident records with severity and resolution tracking
- **status_history**: Historical status changes

## User Preferences
- Clean, modern UI with dark mode support
- Focus on data visualization and analytics
- Export capabilities for reporting
- Advanced filtering across all views
- No region-based filtering (removed as not relevant)

## Architecture Decisions
- Single-page application with client-side routing
- RESTful API design
- Real-time status updates
- Consistent design language across all pages
- Mobile-first responsive design
