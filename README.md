# JIVO EXIM Frontend

React + TypeScript frontend for the JIVO EXIM management platform. The app covers stock movement, tank inventory, SAP-derived reports, accounts aging, commodity rates, licenses, domestic contracts, and administration workflows.

## Tech Stack

| Area | Tooling |
| --- | --- |
| UI | React 19, TypeScript |
| Build | Vite 7 |
| Styling | Tailwind CSS 4, shadcn-style Radix primitives |
| Routing | React Router DOM 7 |
| Data/API | Axios with JWT refresh handling |
| Charts | Recharts |
| Forms/helpers | Zod, date-fns, xlsx/xlsx-js-style |
| PWA | vite-plugin-pwa |

## Quick Start

```bash
npm install
npm run dev
```

The Vite dev server runs on `http://localhost:5003` and is exposed on the local network through `--host` / `host: "0.0.0.0"`.

Create `.env` in the project root when you need a non-default backend URL:

```env
VITE_API_BASE_URL=http://localhost:8000
```

If `VITE_API_BASE_URL` is not set, `src/api/client.ts` defaults to `http://localhost:8000`.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Build production assets into `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |

## Project Structure

```text
src/
  api/                    Axios client and domain API modules
  components/             Layout, navigation, route guards, shared UI
  components/ui/          Local shadcn/Radix-style primitives
  context/                Auth, theme, and cached domain contexts
  hooks/                  Permission helpers
  lib/                    Formatters, schemas, errors, class utilities
  pages/                  Route-level pages grouped by business area
  App.tsx                 Provider tree and route definitions
  main.tsx                React entry point
  index.css               Global styles, theme variables, animations
```

## Major Areas

- Authentication with access/refresh JWT tokens and module/action permissions.
- Dashboard and stock dashboard views with stock, vendor, status, and director-level reporting.
- Stock status lifecycle, shortage report, contractual history, vehicle report, and stock update logs.
- Tank items, tank data, tank monitoring, in-tank breakdown, and tank operation logs.
- Warehouse inventory from SAP data.
- Vendor/customer outstanding, ledgers, customer aging, open APs, open ARs, open POs, and open GRPOs.
- Domestic contracts for FY 2025-2026 and FY 2026-2027.
- Daily commodity prices, Jivo rates, and custom exchange rates.
- Advance License and DFIA License list/detail workflows.
- User administration and SAP sync pages for raw materials, finished goods, vendors, and sync logs.
- PWA install prompt and auto-update service worker configuration.

## Documentation

The full docs live in [docs/README.md](./docs/README.md).

Useful starting points:

- [Setup & Development](./docs/setup/README.md)
- [Architecture](./docs/architecture/README.md)
- [Authentication & Authorization](./docs/auth/README.md)
- [API Layer](./docs/api/README.md)
- [Pages & Routing](./docs/pages/README.md)
- [Components](./docs/components/README.md)

## Deployment Notes

`vite.config.ts` configures manual chunks, PWA caching, `@/` path aliases, and the dev server on port `5003`.

Production deployment is expected to build `dist/`:

```bash
npm install
npm run build
```

Because this is a single-page app, the static server must send unknown non-asset routes to `index.html`.
