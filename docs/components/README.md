# Components

## Layout Components

| Component | File | Purpose |
| --- | --- | --- |
| `Layout` | `src/components/Layout.tsx` | Main shell around routed pages |
| `Sidebar` | `src/components/Sidebar.tsx` | Collapsible, permission-filtered navigation |
| `Navbar` | `src/components/Navbar.tsx` | Top bar and app controls |
| `Footer` | `src/components/Footer.tsx` | Fixed app footer |
| `ProtectedRoute` | `src/components/ProtectedRoute.tsx` | Auth and module/action route guard |
| `Guard` | `src/components/Guard.tsx` | Permission guard for in-page sections |
| `InstallPWA` | `src/components/InstallPWA.tsx` | PWA install/update prompt |

## Sidebar Sections

Defined in `SIDEBAR_SECTIONS` inside `src/components/Sidebar.tsx`.

| Section | Main Links |
| --- | --- |
| Reports | Dashboard, Stock Dashboard, Director Dashboard, Warehouse Inventory, Vehicle Report |
| Stock | Stock Status, Shortage Report, Contractual History, Tank Items, Tank Monitoring, Tank Data, In Tank Breakdown, Tank Logs |
| Domestic Contracts | FY 2025-2026, FY 2026-2027 |
| Accounts | Oil Dr/Cr Outstanding, Vendor/Customer Outstanding, Customer Aging, Open ARs/APs/POs/GRPOs |
| Commodity Price | Daily Price, Jivo Rates |
| Custom Exchange Rates | Exchange Rates |
| License | Advance License, DFIA License |
| Administration | Users, SAP sync pages, Sync Logs, Stock Updation Logs |

Each link can declare permission modules; the link renders if the user has `view` on any listed module.

## Shared Domain Components

| Component | File |
| --- | --- |
| `Pagination` | `src/components/Pagination.tsx` |
| `SummaryCard` | `src/components/SummaryCard.tsx` |
| `StatusHero` | `src/components/StatusHero.tsx` |
| `StatusHeroBanner` | `src/components/StatusHeroBanner.tsx` |
| `ColorPicker` | `src/components/ColorPicker.tsx` |
| Stock dialogs and stock sheet | `src/pages/stock/components/*` |
| Stock dashboard KPI card | `src/pages/dashboard/components/KPICard.tsx` |

## UI Primitives

Local UI primitives live in `src/components/ui/`:

```text
badge, button, calendar, card, checkbox, date-input, date-picker,
dialog, input, label, popover, select, separator, sheet, skeleton,
sonner, table, tabs
```

Use these primitives for new pages before introducing new component libraries.
