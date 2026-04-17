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
│   ├── stockStatus.ts    # Stock status CRUD, variance/debit entries
│   ├── tank.ts           # Tank items & tank data
│   ├── dailyPrice.ts     # Daily commodity pricing
│   ├── dashboard.ts      # Dashboard & stock dashboard data
│   ├── license.ts        # Advance + DFIA license headers & lines
│   ├── openGrpo.ts       # Open GRPO data
│   ├── jivoRate.ts       # Jivo commodity rates
│   ├── customRates.ts    # Custom exchange rates
│   ├── oldContracts.ts   # Legacy contract data
│   └── domesticContracts26.ts  # Domestic contracts FY 2026-27
├── components/
│   ├── ui/               # shadcn/ui primitives (Button, Card, Dialog, DatePicker, etc.)
│   ├── Layout.tsx         # App shell with Sidebar + Navbar
│   ├── Sidebar.tsx        # Collapsible navigation sidebar
│   ├── Navbar.tsx         # Top navigation bar
│   ├── Footer.tsx         # App footer
│   ├── Pagination.tsx     # Reusable pagination component
│   ├── SummaryCard.tsx    # Reusable metric summary card
│   └── ProtectedRoute.tsx # Module-based route guard
├── context/
│   ├── AuthContext.tsx    # Authentication state & JWT handling
│   ├── ThemeContext.tsx   # Light/dark theme toggle
│   ├── DailyPriceContext.tsx # Daily price shared state
│   ├── JivoRateContext.tsx   # Jivo rate shared state
│   └── OpenGrpoContext.tsx   # Open GRPO shared state
├── lib/
│   ├── errors.ts         # Shared error extraction & toast helpers
│   ├── formatters.ts     # Number, date, and currency formatters (Indian locale)
│   └── utils.ts          # Tailwind class merge utility
├── pages/
│   ├── HomePage.tsx                       # Landing page with quick access links
│   ├── LoginPage.tsx                      # Authentication page
│   ├── dashboard/
│   │   ├── DashboardPage.tsx              # Main analytics dashboard with charts
│   │   ├── StockDashboardPage.tsx         # Stock overview across statuses & vendors
│   │   └── StockDashboardDetailPage.tsx   # Stock detail drilldown by status
│   ├── stock/
│   │   ├── StockStatusPage.tsx            # Stock status management (CRUD)
│   │   ├── StockVariancePage.tsx          # Gain/loss variance entries with insights
│   │   ├── WarehouseInventoryPage.tsx     # Warehouse inventory overview
│   │   ├── TankItemsPage.tsx              # Tank item configuration
│   │   ├── TankDataPage.tsx               # Tank data entry & history
│   │   ├── TankMonitoringPage.tsx         # Live tank monitoring with charts
│   │   └── TankLogsPage.tsx              # Tank operation logs
│   ├── reports/
│   │   ├── VehicleReportPage.tsx          # Vehicle report by status
│   │   └── DirectorDashboardPage.tsx      # Director-level summary dashboard
│   ├── accounts/
│   │   └── EximAccountPage.tsx            # Dr/Cr outstanding with aging (Days Outstanding tab)
│   ├── contracts/
│   │   ├── OpenGrpoPage.tsx               # Open GRPOs with Days Open aging
│   │   ├── DomesticContractsPage.tsx      # Domestic contracts (FY 25-26)
│   │   ├── DomesticContracts2526Page.tsx  # Domestic contracts FY 2025-26
│   │   └── DomesticContracts2627Page.tsx  # Domestic contracts FY 2026-27
│   ├── commodity/
│   │   ├── DailyPricePage.tsx             # Commodity price tracking & trends
│   │   └── JivoRatesPage.tsx             # Jivo commodity rates
│   ├── license/
│   │   ├── AdvanceLicensePage.tsx         # Advance license list & management
│   │   ├── AdvanceLicenseDetailPage.tsx   # Per-license import/export lines (CRUD)
│   │   ├── DFIALicensePage.tsx            # DFIA license list & management
│   │   └── DFIALicenseDetailPage.tsx      # Per-license import/export lines (CRUD)
│   ├── Custom-Exchange/
│   │   └── CustomExchangeRatesPage.tsx    # Custom exchange rate management
│   └── administration/
│       ├── UsersPage.tsx                  # User administration
│       ├── SyncRawMaterialDataPage.tsx    # SAP raw material sync
│       ├── SyncFinishedGoodsDataPage.tsx  # SAP finished goods sync
│       ├── SyncVendorDataPage.tsx         # SAP vendor sync
│       ├── SyncLogsPage.tsx               # Sync operation logs
│       └── StockUpdationLogsPage.tsx      # Stock update history logs
├── App.tsx               # Route definitions & providers
└── main.tsx              # Entry point
```

## Key Features

- **Authentication** — JWT-based login with automatic token refresh and module-based access control
- **SAP Integration** — Sync vendors, raw materials, and finished goods from SAP with detailed sync logs
- **Stock Management** — Track stock statuses with CRUD operations, movement history, and update logs
- **Stock Variance** — View gain/loss debit entries from stock transitions with summary insight cards
- **Tank Monitoring** — Real-time tank level visualization with bar and pie charts
- **Analytics Dashboard** — Balance trends, daily price charts, and commodity comparisons
- **Stock Dashboard** — Grouped stock overview across statuses and vendors with dynamic filters
- **Daily Pricing** — Track and compare commodity prices with multi-line trend charts
- **Jivo Rates** — Commodity rate tracking specific to Jivo operations
- **Open GRPOs** — Track open purchase orders with aging ("Days Open" column)
- **Dr/Cr Outstanding** — Account balances with aging analysis ("Days Outstanding" tab)
- **Domestic Contracts** — View and manage domestic contract data for FY 25-26 and FY 26-27
- **Advance License** — Manage advance licenses with per-license import/export line CRUD
- **DFIA License** — Manage DFIA licenses with per-license import/export line CRUD
- **Custom Exchange Rates** — Manage custom exchange rates for EXIM operations
- **Date Picker** — All date fields support both manual `dd/mm/yyyy` typed input (with auto-slash) and calendar picker
- **Dark Mode** — Full light/dark theme support
- **Responsive Design** — Works across desktop and mobile with a collapsible sidebar

## Scripts

| Command           | Description                    |
| ----------------- | ------------------------------ |
| `npm run dev`     | Start dev server with HMR      |
| `npm run build`   | Production build via Vite       |
| `npm run preview` | Preview the production build    |
| `npm run lint`    | Run ESLint                      |
