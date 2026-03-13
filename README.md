# EXIM Frontend

A web-based dashboard for managing EXIM (Export-Import) operations, SAP data synchronization, stock monitoring, and commodity pricing.

## Tech Stack

- **React 19** with TypeScript
- **Vite 7** for build tooling
- **Tailwind CSS 4** for styling
- **shadcn/ui** (Radix UI) for component primitives
- **Recharts** for data visualization (bar, line, and pie charts)
- **Axios** for API communication with JWT auth (access + refresh tokens)
- **React Router v7** for client-side routing
- **Sonner** for toast notifications

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```env
VITE_API_BASE_URL=http://localhost:8000
```

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:5173` (accessible on the local network via `--host`).

### Production Build

```bash
npm run build
npm run preview
```

## Project Structure

```
src/
├── api/                  # Axios API client & endpoint modules
│   ├── client.ts         # Axios instance with JWT interceptors
│   ├── auth.ts           # Login / token endpoints
│   ├── users.ts          # User management
│   ├── sapSync.ts        # SAP sync (vendors, raw materials, finished goods, logs)
│   ├── stockStatus.ts    # Stock status CRUD
│   ├── tank.ts           # Tank items & tank data
│   ├── dailyPrice.ts     # Daily commodity pricing
│   └── dashboard.ts      # Dashboard & stock dashboard data
├── components/
│   ├── ui/               # shadcn/ui primitives (Button, Card, Dialog, etc.)
│   ├── Layout.tsx         # App shell with Sidebar + Navbar
│   ├── Sidebar.tsx        # Collapsible navigation sidebar
│   ├── Navbar.tsx         # Top navigation bar
│   ├── Footer.tsx         # App footer
│   ├── Pagination.tsx     # Reusable pagination component
│   ├── SummaryCard.tsx    # Reusable metric summary card
│   └── ProtectedRoute.tsx # Role-based route guard
├── context/
│   ├── AuthContext.tsx    # Authentication state & JWT handling
│   ├── ThemeContext.tsx   # Light/dark theme toggle
│   └── DailyPriceContext.tsx # Daily price shared state
├── lib/
│   ├── errors.ts         # Shared error extraction & toast helpers
│   ├── formatters.ts     # Number, date, and currency formatters (Indian locale)
│   └── utils.ts          # Tailwind class merge utility
├── pages/
│   ├── HomePage.tsx                   # Landing page with quick access links
│   ├── LoginPage.tsx                  # Authentication page
│   ├── DashboardPage.tsx              # Main analytics dashboard with charts
│   ├── StockDashboardPage.tsx         # Stock overview across statuses & vendors
│   ├── StockStatusPage.tsx            # Stock status management (CRUD)
│   ├── StockUpdationLogsPage.tsx      # Stock update history logs
│   ├── TankItemsPage.tsx              # Tank item configuration
│   ├── TankDataPage.tsx               # Tank data entry & history
│   ├── TankMonitoringPage.tsx         # Live tank monitoring with charts
│   ├── DailyPricePage.tsx             # Commodity price tracking & trends
│   ├── DomesticContractsPage.tsx      # Domestic contract management
│   ├── EximAccountPage.tsx            # EXIM account details & CSV export
│   ├── AdvanceLicensePage.tsx         # Advance license list & management
│   ├── AdvanceLicenseDetailPage.tsx   # Individual advance license detail view
│   ├── SyncRawMaterialDataPage.tsx    # SAP raw material sync
│   ├── SyncFinishedGoodsDataPage.tsx  # SAP finished goods sync
│   ├── SyncVendorDataPage.tsx         # SAP vendor sync
│   ├── SyncLogsPage.tsx               # Sync operation logs
│   └── UsersPage.tsx                  # User administration
├── App.tsx               # Route definitions & providers
└── main.tsx              # Entry point
```

## Key Features

- **Authentication** — JWT-based login with automatic token refresh and role-based access control (ADM, MNG, FTR roles)
- **SAP Integration** — Sync vendors, raw materials, and finished goods from SAP with detailed sync logs
- **Stock Management** — Track stock statuses, tank items, and tank data with CRUD operations and update history logs
- **Tank Monitoring** — Real-time tank level visualization with bar and pie charts
- **Analytics Dashboard** — Balance trends, daily price charts, and commodity comparisons
- **Stock Dashboard** — Grouped stock overview across statuses and vendors with dynamic filters
- **Daily Pricing** — Track and compare commodity prices with multi-line trend charts
- **Domestic Contracts** — View and manage domestic contract data
- **EXIM Accounts** — Account overview with CSV export functionality
- **Advance License** — Manage advance licenses with per-license detail view
- **Dark Mode** — Full light/dark theme support
- **Responsive Design** — Works across desktop and mobile with a collapsible sidebar

## Scripts

| Command           | Description                    |
| ----------------- | ------------------------------ |
| `npm run dev`     | Start dev server with HMR      |
| `npm run build`   | Production build via Vite       |
| `npm run preview` | Preview the production build    |
| `npm run lint`    | Run ESLint                      |
