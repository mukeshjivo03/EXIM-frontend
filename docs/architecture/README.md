# Architecture & Tech Stack

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| UI Framework | React | 19.2 |
| Language | TypeScript | 5.9 |
| Build Tool | Vite | 7.3 |
| CSS Framework | Tailwind CSS | 4.2 |
| UI Components | shadcn/ui (Radix UI primitives) | - |
| HTTP Client | Axios | 1.13 |
| Routing | React Router DOM | 7.13 |
| Charts | Recharts | 3.7 |
| Icons | Lucide React | 0.575 |
| Toasts | Sonner | 2.0 |
| Animations | tw-animate-css | 1.4 |
| Validation | Zod | 3.x |
| Date utilities | date-fns | 4.x |

---

## Project Structure

```
src/
 |- main.tsx                  # React DOM entry point
 |- App.tsx                   # Route definitions + provider tree
 |- index.css                 # Global styles, theme variables, animations
 |
 |- api/                      # API layer (one file per domain)
 |   |- client.ts             # Axios instance with interceptors
 |   |- auth.ts               # Login, logout, token refresh
 |   |- users.ts              # User CRUD
 |   |- dashboard.ts          # Dashboard summary data
 |   |- stockStatus.ts        # Stock status + item CRUD
 |   |- tank.ts               # Tank items, tank data, tank monitoring
 |   |- dailyPrice.ts         # Commodity daily prices
 |   |- jivoRate.ts           # Jivo commodity rates
 |   |- openGrpo.ts           # Open GRPOs (pending invoice)
 |   |- license.ts            # Advance License + DFIA License CRUD
 |   |- sapSync.ts            # SAP sync operations + logs
 |
 |- context/                  # React Context providers
 |   |- AuthContext.tsx        # Authentication state (role, name, tokens)
 |   |- ThemeContext.tsx       # Light/dark theme toggle
 |   |- DailyPriceContext.tsx  # Cached commodity price data
 |   |- JivoRateContext.tsx    # Cached Jivo rates preview data
 |   |- OpenGrpoContext.tsx    # Cached open GRPO data
 |
 |- components/               # Shared components
 |   |- Layout.tsx             # Page shell (navbar + sidebar + outlet + footer)
 |   |- Sidebar.tsx            # Role-based navigation sidebar
 |   |- Navbar.tsx             # Top bar with search + theme toggle
 |   |- Footer.tsx             # Copyright footer
 |   |- ProtectedRoute.tsx     # Auth + role guard wrapper
 |   |- Pagination.tsx         # Reusable pagination bar
 |   |- SummaryCard.tsx        # Icon + label + value stat card
 |   |- StatusHero.tsx         # SVG hero illustrations per stock status
 |   |- ui/                   # shadcn/ui primitives (button, input, dialog, etc.)
 |
 |- pages/                    # Page components (one per route)
 |   |- LoginPage.tsx
 |   |- HomePage.tsx           # Quick-access grid of all pages
 |   |- dashboard/             # Dashboard & stock dashboard
 |   |- stock/                 # Stock status, tank items, tank data, tank monitoring
 |   |- commodity/             # Daily price + Jivo rates pages
 |   |- accounts/              # EXIM account page
 |   |- contracts/             # Domestic contracts + Open GRPOs pages
 |   |- license/               # Advance license + DFIA license (list + detail)
 |   |- administration/        # Users, SAP sync pages, sync logs, stock logs
 |
 |- lib/                      # Utility functions
     |- utils.ts               # cn() - Tailwind class merger
     |- formatters.ts          # Number, date, currency formatting (Indian locale)
     |- errors.ts              # Error message extraction + toast helpers
     |- schemas.ts             # Zod validation schemas (stock, tank, user, login)
```

---

## Build Configuration

### Vite (`vite.config.ts`)

```typescript
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: {
    host: "0.0.0.0",   // accessible on LAN
    port: 5003,
  },
});
```

- **Path alias:** `@/` maps to `./src/` for clean imports
- **Dev server:** runs on port `5003`, exposed on all interfaces

### TypeScript (`tsconfig.json`)

- Target: ES2020
- Strict mode enabled
- `noUnusedLocals` and `noUnusedParameters` enforced
- Path alias: `@/*` -> `./src/*`

---

## Provider Tree

The app wraps all routes in a nested provider structure:

```
ThemeProvider           <- Light/dark theme state
  BrowserRouter         <- React Router
    AuthProvider         <- User auth state (role, name, email, tokens)
      DailyPriceProvider <- Cached commodity prices
        Routes           <- All route definitions
      /DailyPriceProvider
    /AuthProvider
  /BrowserRouter
  Toaster               <- Sonner toast notifications (bottom-right)
/ThemeProvider
```

---

## Theming

### CSS Variables

The app uses **oklch color space** CSS variables defined in `src/index.css`. Two themes are supported:

| Variable | Light | Dark | Purpose |
|----------|-------|------|---------|
| `--primary` | Deep sea teal | Luminous teal | Primary actions, buttons |
| `--accent` | Emerald | Deep emerald glow | Accent highlights |
| `--background` | Light blue-gray | Abyss blue | Page background |
| `--sidebar` | Dark (always) | Darker | Sidebar background |
| `--destructive` | Red | Red | Delete/error actions |
| `--chart-1..5` | Maritime gradient | Same | Recharts chart colors |

### Theme Toggle

- Managed by `ThemeContext.tsx`
- Persisted to `localStorage`
- Falls back to system preference (`prefers-color-scheme: dark`)
- Applied by toggling `.dark` class on `<html>`

### Custom CSS Classes

| Class | Effect |
|-------|--------|
| `animate-page` | Fade-slide-up entrance animation (0.4s) |
| `card-hover` | Lift + shadow on hover |
| `shimmer-hover` | Shimmer sweep effect on hover |
| `btn-press` | Scale-down on active/press |
| `glass-navbar` | Glassmorphism blur for navbar |
| `glass-sidebar` | Glassmorphism blur for sidebar |
| `sidebar-link-active` | Left accent bar on active sidebar link |
| `table-row-enhanced` | Hover highlight for table rows |
| `tank-wave-1`, `tank-wave-2` | Animated wave effect for tank monitoring |
| `tank-card` | Hover lift for tank cards |
| `tank-shell`, `tank-dome`, etc. | Industrial tank visual styles |
| `ship-sail`, `ship-bob` | Cargo ship animations on login page |
| `login-card` | Entrance animation for login form |

---

## State Management

See [State Management & Data Flow](./state-management.md) for details on React Context providers, data flow patterns, and localStorage usage.

---

## shadcn/ui Components

The following shadcn/ui components are installed in `src/components/ui/`:

| Component | File | Usage |
|-----------|------|-------|
| Button | `button.tsx` | All clickable actions |
| Input | `input.tsx` | Form text/number/date inputs |
| Label | `label.tsx` | Form field labels |
| Card | `card.tsx` | Content containers with header/title |
| Table | `table.tsx` | Data tables across all pages |
| Dialog | `dialog.tsx` | Modal dialogs for create/edit/delete |
| Select | `select.tsx` | Dropdown selectors (e.g., status) |
| Badge | `badge.tsx` | Status badges (OPEN/CLOSE) |
| Skeleton | `skeleton.tsx` | Loading placeholders |
| Separator | `separator.tsx` | Visual dividers |
| Sonner | `sonner.tsx` | Toast notification wrapper |
