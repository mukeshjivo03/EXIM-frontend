# Components

This document reflects the current shared component usage in `src/components/`.

---

## Core Layout Components

| Component | File | Purpose |
|---|---|---|
| Layout | `src/components/Layout.tsx` | App shell with sidebar/navbar/footer and outlet |
| Sidebar | `src/components/Sidebar.tsx` | Collapsible, module-aware navigation |
| Navbar | `src/components/Navbar.tsx` | Top header and app controls |
| Footer | `src/components/Footer.tsx` | Bottom footer |
| ProtectedRoute | `src/components/ProtectedRoute.tsx` | Route auth + module gate |
| Guard | `src/components/Guard.tsx` | In-page permission guard for sections/pages |

---

## Sidebar Sections (Current)

From `SIDEBAR_SECTIONS` in `src/components/Sidebar.tsx`:

- Reports
- Stock
- Domestic Contracts
- Accounts
- Commodity Price
- Custom Exchange Rates
- License
- Administration

Accounts currently includes:

- Oil Dr/Cr Outstanding
- Vendor Outstanding
- Customer Outstanding
- Customer Aging
- Open ARs
- Open APs
- Open POs
- Open GRPOs

---

## Reusable UI Components

| Component | File |
|---|---|
| Pagination | `src/components/Pagination.tsx` |
| SummaryCard | `src/components/SummaryCard.tsx` |
| StatusHero | `src/components/StatusHero.tsx` |
| StatusHeroBanner | `src/components/StatusHeroBanner.tsx` |
| InstallPWA | `src/components/InstallPWA.tsx` |
| ColorPicker | `src/components/ColorPicker.tsx` |

---

## UI Primitive Library

The project uses local shadcn-based primitives under `src/components/ui/` (`button`, `card`, `table`, `dialog`, `select`, `badge`, `input`, `calendar`, `sheet`, `tabs`, etc.).
