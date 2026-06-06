# Architecture & Tech Stack

## Stack

| Area | Package |
| --- | --- |
| UI | React 19, React DOM 19 |
| Language | TypeScript 5.9 |
| Build | Vite 7, `@vitejs/plugin-react` |
| Styling | Tailwind CSS 4, `@tailwindcss/vite`, `tw-animate-css` |
| UI primitives | Local shadcn-style components backed by Radix UI |
| Routing | React Router DOM 7 |
| HTTP | Axios |
| Charts | Recharts |
| Icons | Lucide React |
| Toasts | Sonner |
| Validation | Zod |
| Dates | date-fns, react-day-picker |
| Excel | xlsx, xlsx-js-style |
| PWA | vite-plugin-pwa |

## Project Structure

```text
src/
  api/
    client.ts                 Axios instance, auth header, refresh retry
    auth.ts                   Login/logout types and calls
    dashboard.ts              Dashboard and stock dashboard APIs
    stockStatus.ts            Stock lifecycle, logs, reports, debit entries
    tank.ts                   Tank items, tanks, layers, logs, movements
    sapSync.ts                SAP inventory, sync, account, ledger APIs
    dailyPrice.ts             Daily price fetch, save, range, trends
    jivoRate.ts               Jivo fetch, save, range, trends
    customRates.ts            EXIM and external exchange rates
    openGrpo.ts               Open GRPOs
    domesticContracts26.ts    Domestic contract workflow APIs
    oldContracts.ts           Legacy contract data
    license.ts                Advance and DFIA license APIs
    users.ts                  User CRUD
  components/
    Layout.tsx                App shell
    Sidebar.tsx               Permission-aware navigation
    Navbar.tsx                Top navigation
    Footer.tsx                Footer
    ProtectedRoute.tsx        Auth and module guard
    Guard.tsx                 In-page permission guard
    InstallPWA.tsx            PWA install/update prompt
    ui/                       Button, table, dialog, select, date picker, etc.
  context/
    AuthContext.tsx           Auth and permission state
    ThemeContext.tsx          Light/dark preference
    DailyPriceContext.tsx     Cached commodity prices
    JivoRateContext.tsx       Cached Jivo rates
    OpenGrpoContext.tsx       Cached open GRPO rows
  hooks/
    useHasPermission.ts       Permission lookup helper
  lib/
    errors.ts                 Error extraction and toast helpers
    formatters.ts             Indian number/date/currency formatting
    schemas.ts                Zod validation schemas
    utils.ts                  `cn()` class merge helper
  pages/                      Route-level screens by business area
```

## Provider Tree

```text
ThemeProvider
  BrowserRouter
    AuthProvider
      DailyPriceProvider
        JivoRateProvider
          OpenGrpoProvider
            Routes
            InstallPWA
  Toaster
```

## Vite Configuration

Key behavior in `vite.config.ts`:

- exposes `__APP_VERSION__` from `package.json`;
- registers React, Tailwind, and PWA plugins;
- aliases `@` to `src`;
- runs dev server on `0.0.0.0:5003`;
- increases chunk warning limit to `1000`;
- manually splits major vendor chunks for React, Radix, Recharts, Framer Motion, Excel, and utilities.

## PWA

The app uses `vite-plugin-pwa` with:

- `registerType: "autoUpdate"`;
- app manifest name `JIVO EXIM`;
- `navigateFallback: "/index.html"`;
- network-first page/API caching;
- stale-while-revalidate static asset and image caching;
- install/update UI through `src/components/InstallPWA.tsx`.

## Theming

`src/index.css` defines theme tokens and custom animation classes. `ThemeContext` persists the theme in `localStorage` and toggles the `dark` class on the document root.
