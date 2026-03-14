# Setup & Development

## Prerequisites

- **Node.js** >= 18.x
- **npm** (comes with Node.js)
- Backend API server running (Django REST Framework + PostgreSQL) — separate repo

---

## Quick Start

```bash
# 1. Clone the repository
git clone <repo-url>
cd EXIM-frontend

# 2. Install dependencies
npm install

# 3. Configure environment (optional)
# Create .env file in project root:
echo "VITE_API_BASE_URL=http://localhost:9000" > .env

# 4. Start dev server
npm run dev
```

The app will be available at `http://localhost:5003`.

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_BASE_URL` | `http://localhost:9000` | Backend API base URL |

Create a `.env` file in the project root:

```env
# Local development
VITE_API_BASE_URL=http://localhost:9000

# Production
VITE_API_BASE_URL=http://103.89.45.75:9000
```

### Production URLs

| Service | URL |
|---------|-----|
| Frontend | `http://103.89.45.75:5003` |
| Backend API | `http://103.89.45.75:9000` |

**Note:** Vite requires the `VITE_` prefix for environment variables to be exposed to the frontend code. They are accessed via `import.meta.env.VITE_API_BASE_URL`.

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server (port 5003, LAN accessible) |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |

---

## Dev Server Configuration

The dev server is configured in `vite.config.ts`:

- **Port:** 5003
- **Host:** `0.0.0.0` (accessible from other devices on the network)
- **Path alias:** `@/` -> `./src/`

---

## Project Dependencies

### Runtime Dependencies

| Package | Purpose |
|---------|---------|
| `react`, `react-dom` | UI framework |
| `react-router-dom` | Client-side routing |
| `axios` | HTTP client for API calls |
| `tailwindcss` | Utility-first CSS framework |
| `@tailwindcss/vite` | Tailwind CSS Vite plugin |
| `radix-ui` | Headless UI primitives (used by shadcn) |
| `class-variance-authority` | Component variant management |
| `clsx` | Conditional classname construction |
| `tailwind-merge` | Tailwind class conflict resolution |
| `lucide-react` | Icon library |
| `recharts` | Chart library (line, bar, pie charts) |
| `sonner` | Toast notification library |

### Dev Dependencies

| Package | Purpose |
|---------|---------|
| `vite` | Build tool and dev server |
| `@vitejs/plugin-react` | React Fast Refresh for Vite |
| `typescript` | TypeScript compiler |
| `eslint` | Code linting |
| `shadcn` | CLI for installing shadcn/ui components |
| `tw-animate-css` | Tailwind animation utilities |

---

## Adding shadcn/ui Components

To add a new shadcn/ui component:

```bash
npx shadcn@latest add <component-name>
```

For example:

```bash
npx shadcn@latest add tooltip
npx shadcn@latest add dropdown-menu
```

Components are installed to `src/components/ui/`.

---

## Build & Deployment

### Production Build

```bash
npm run build
```

This generates a static `dist/` directory with:
- `index.html`
- Hashed JS/CSS bundles
- Static assets

### Serving the Build

The `dist/` folder can be served by any static file server:

```bash
# Preview locally
npm run preview

# Or with any static server
npx serve dist
```

### Deployment Considerations

1. **SPA routing:** The server must redirect all non-asset requests to `index.html` (React Router handles client-side routing). Configure your web server accordingly:
   - **Nginx:** `try_files $uri $uri/ /index.html;`
   - **Apache:** Use `.htaccess` with `FallbackResource /index.html`

2. **API URL:** Set `VITE_API_BASE_URL` at build time (it's embedded in the bundle)

3. **CORS:** The backend must allow requests from the frontend's origin

---

## Folder Structure for New Features

When adding a new feature:

1. **API file:** Add or extend a file in `src/api/`
2. **Page component:** Create in `src/pages/<section>/`
3. **Route:** Add to `src/App.tsx` with appropriate `ProtectedRoute` wrapper
4. **Sidebar link:** Add to the appropriate section in `src/components/Sidebar.tsx`
5. **HomePage link:** Add to the links array in `src/pages/HomePage.tsx`

### Example: Adding a New "Shipping" Feature

```
1. src/api/shipping.ts          # API functions + types
2. src/pages/shipping/           # Page folder
   ShippingPage.tsx              # List page
   ShippingDetailPage.tsx        # Detail page (if needed)
3. src/App.tsx                   # Add routes
4. src/components/Sidebar.tsx    # Add sidebar links
5. src/pages/HomePage.tsx        # Add to quick-access grid
```

---

## Code Conventions

### File Naming
- **Pages:** PascalCase with `Page` suffix (e.g., `StockStatusPage.tsx`)
- **Components:** PascalCase (e.g., `SummaryCard.tsx`)
- **API files:** camelCase (e.g., `stockStatus.ts`)
- **Utilities:** camelCase (e.g., `formatters.ts`)

### Import Aliases
Always use `@/` for imports from `src/`:

```typescript
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { fmtDate } from "@/lib/formatters";
```

### Formatting Functions
Use the utilities in `src/lib/formatters.ts`:

| Function | Input | Output | Example |
|----------|-------|--------|---------|
| `fmtDecimal(n)` | `"1234.5"` | `"1,234.50"` | Indian locale, 2 decimals |
| `fmtNum(n, d?)` | `1234` | `"1,234"` | Indian locale, optional decimals |
| `fmtDate(iso)` | `"2024-01-15"` | `"15 Jan 2024"` | Human readable |
| `fmtDateTime(iso)` | ISO string | `"15 Jan 2024, 02:30 PM"` | Date + time |
| `fmtCurrency(n)` | `"123456.78"` | `"Rs 1,23,456.78"` | Indian Rupee format |

### Error Handling
Use utilities from `src/lib/errors.ts`:

```typescript
import { getErrorMessage, toastApiError } from "@/lib/errors";

// In catch blocks:
catch (err) {
  setError(getErrorMessage(err, "Fallback message"));
  // or
  toastApiError(err, "Fallback message");
}
```

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| "Network Error" on API calls | Check `VITE_API_BASE_URL` and ensure backend is running |
| Redirected to /login repeatedly | Access token expired and refresh failed. Clear localStorage and re-login |
| Blank page after build | Ensure server redirects to `index.html` for SPA routing |
| "401 Unauthorized" loop | Token refresh endpoint may be down. Check backend `/account/login/refresh/` |
| Type errors after API change | Update the corresponding interface in `src/api/` to match backend response |
