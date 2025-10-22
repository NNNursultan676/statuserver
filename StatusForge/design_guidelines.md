# Design Guidelines: Service Status Monitoring Platform

## Design Approach
**Selected Approach:** Design System (Utility-Focused Application)  
**Primary Reference:** Yandex Cloud Status aesthetic + Material Design principles  
**Justification:** Data-dense monitoring platform requiring clarity, consistency, and efficient information hierarchy for technical users tracking service health.

## Core Design Elements

### A. Color Palette

**Dark Mode (Primary):**
- Background Base: `222 15% 10%` (deep charcoal)
- Surface Elevated: `222 12% 14%` (card backgrounds)
- Surface Hover: `222 10% 18%`
- Text Primary: `0 0% 95%`
- Text Secondary: `0 0% 70%`
- Border Subtle: `222 10% 20%`

**Status Colors:**
- Operational/Available: `142 76% 45%` (green)
- Degraded/Warning: `38 92% 50%` (amber)
- Down/Critical: `0 84% 60%` (red)
- Maintenance: `217 91% 60%` (blue)
- Unknown: `0 0% 50%` (gray)

**Accent Colors:**
- Primary Action: `217 91% 60%` (blue - for buttons, links)
- Chart Colors: Use distinct hues `217 91% 60%`, `142 76% 45%`, `280 60% 60%`, `38 92% 50%`

### B. Typography
- **Primary Font:** Inter (via Google Fonts CDN)
- **Monospace Font:** JetBrains Mono (for metrics, timestamps)
- **Hierarchy:**
  - Page Titles: text-3xl font-semibold
  - Section Headers: text-xl font-medium
  - Card Titles: text-base font-medium
  - Body Text: text-sm
  - Metrics/Numbers: text-2xl font-bold (monospace)
  - Timestamps: text-xs text-gray-400 (monospace)

### C. Layout System
**Spacing Units:** Consistent use of Tailwind units: 2, 4, 6, 8, 12, 16, 24  
**Container:** max-w-7xl mx-auto px-6  
**Grid Patterns:**
- Service cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4
- Analytics metrics: grid-cols-2 md:grid-cols-4 gap-6
- Incident timeline: Single column with left border accent

### D. Component Library

**Navigation:**
- Top navbar: Fixed with logo, main navigation tabs (Dashboard, Analytics, History), subtle bottom border
- Tab Navigation: Underline active state with primary color
- Breadcrumbs: For service detail pages

**Status Dashboard:**
- Service Cards: Elevated surface (bg-surface), rounded corners (rounded-lg), padding p-6
- Status Badge: Pill shape with dot indicator, colored background matching status
- Service List: Group by category with collapsible sections
- Last Updated: Small timestamp in corner with relative time

**Analytics Components:**
- Metric Cards: Large numbers with trend indicators (↑↓), colored accents for positive/negative
- Circular Progress: Use Chart.js or similar - show percentage in center, colored arc
- Line Charts: Time-series data with grid lines, tooltips on hover, multiple series support
- Area Charts: For uptime over time with gradient fill
- Filter Controls: Date range picker, service selector (multi-select dropdown)

**Incident History:**
- Timeline Layout: Vertical line on left, incident cards branching right
- Incident Card: Title, timestamp, affected services (pills), status badge, expandable description
- Calendar Heatmap: Grid showing 30 days, cells colored by daily uptime percentage

**Data Display:**
- Tables: Striped rows, sticky header, sortable columns
- Empty States: Centered icon + message for "No incidents"
- Loading States: Skeleton screens matching component structure

**Forms (Admin Panel):**
- Dark inputs with subtle borders, focus state with primary color
- Toggle switches for service status changes
- Rich text editor for incident descriptions
- Dropdown selectors for service/region selection

### E. Interaction Patterns
**Animations:** Minimal and purposeful only
- Page transitions: Fade in content (150ms)
- Chart rendering: Smooth draw animation (500ms)
- Status changes: Pulse effect on badge update
- No scroll-triggered animations

**Hover States:**
- Cards: Subtle elevation increase (shadow-lg)
- Buttons: Brightness increase, maintain blur on outlined buttons over images
- Chart elements: Highlight data point, show tooltip

**Responsive Behavior:**
- Mobile: Stack all grids to single column, collapsible navigation drawer
- Tablet: 2-column grids where appropriate
- Desktop: Full multi-column layouts with sidebar navigation option

## Page-Specific Guidelines

**Dashboard:** Hero-free, immediate data display. Service grid leads, followed by recent incidents summary, overall health indicators in header.

**Analytics:** Top row of 4 key metric cards (uptime %, MTTR, incident count, active services), followed by 2-column layout: left for line charts, right for circular progress indicators. Bottom section with detailed service breakdown table.

**Incident History:** Timeline chronological view as primary, secondary calendar heatmap view toggle. Filter bar at top.

**Service Detail:** Header with service name + current status, tabs for (Metrics | History | Configuration), metric graphs below, incident history at bottom.

## Icons
**Library:** Heroicons (outline style) via CDN  
**Usage:** Service type icons, status indicators, navigation, alert icons

## Images
No hero images required. This is a data-focused utility application. Use icons and data visualizations exclusively.