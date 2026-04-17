# Authentication & Authorization

## Overview

The app uses **JWT (JSON Web Token)** authentication with access/refresh token pairs. The backend is a Django REST Framework server using `djangorestframework-simplejwt`.

---

## Login Flow

```
1. User enters email + password on /login
2. POST /account/login/ -> { access, refresh, role, name }
3. Tokens stored in localStorage:
   - access_token   (short-lived JWT)
   - refresh_token  (long-lived JWT)
   - user_role      ("ADM" | "FTR" | "MNG")
   - user_name      (display name)
   - user_email     (user email)
4. User redirected to / (HomePage)
```

### Token Storage

All auth data is stored in `localStorage`:

| Key | Value | Purpose |
|-----|-------|---------|
| `access_token` | JWT string | Attached to every API request |
| `refresh_token` | JWT string | Used to obtain new access token |
| `user_role` | `"ADM"`, `"FTR"`, `"MNG"` | Role-based UI rendering |
| `user_name` | string | Display in sidebar profile |
| `user_email` | string | Display in sidebar profile |

### Logout Flow

```
1. POST /account/logout/ with { refresh_token }
2. Clear all localStorage keys
3. Redirect to /login
```

If the logout API call fails, localStorage is still cleared and the user is redirected.

---

## Token Refresh (Automatic)

The Axios response interceptor in `src/api/client.ts` handles automatic token refresh:

1. On any `401` response (except login/refresh endpoints):
   - Check if refresh token exists
   - If already refreshing, queue the failed request
   - POST `/account/login/refresh/` with `{ refresh: <token> }`
   - On success: store new access token, retry all queued requests
   - On failure: clear auth, redirect to `/login`

2. The `_retry` flag prevents infinite loops on the same request

3. Multiple concurrent 401s are handled by queuing — only one refresh call is made

---

## Auth Context (`src/context/AuthContext.tsx`)

### Provided Values

```typescript
type Role = "ADM" | "FTR" | "MNG";

interface AuthContextValue {
  role: Role | null;
  name: string | null;
  email: string | null;
  isLoggedIn: boolean;        // true if access_token exists AND role is set
  setAuth: (name: string, role: Role, email: string) => void;
  clearAuth: () => void;
}
```

### Usage

```typescript
import { useAuth } from "@/context/AuthContext";

function MyComponent() {
  const { role, name, isLoggedIn, clearAuth } = useAuth();
}
```

### Initialization

On mount, `AuthProvider` reads from `localStorage`:
- `user_role` -> `role`
- `user_name` -> `name`
- `user_email` -> `email`

`isLoggedIn` is computed: `!!localStorage.getItem("access_token") && role !== null`

---

## Roles

| Role | Code | Description |
|------|------|-------------|
| Admin | `ADM` | Full access to all features |
| Manager | `MNG` | All business features, no user management or SAP sync |
| Factory | `FTR` | Tank pages only (monitoring, items, data) |

---

## Protected Routes (`src/components/ProtectedRoute.tsx`)

### Props

```typescript
interface Props {
  children: React.ReactNode;
  requiredModules?: string[];   // e.g., ["stockstatus", "tankitem"]
}
```

### Behavior

1. If `!isLoggedIn` → redirect to `/login`
2. If `requiredModules` is provided, user must have at least one of the listed modules → otherwise redirect to `/`
3. Otherwise → render `children`

### Usage in Routes (`src/App.tsx`)

```tsx
// Wraps the entire layout — requires login
<Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>

  // Module-guarded route
  <Route path="/stock/stock-status" element={
    <ProtectedRoute requiredModules={["stockstatus"]}>
      <StockStatusPage />
    </ProtectedRoute>
  } />

  // Multiple modules — user needs at least one
  <Route path="/stock/variance" element={
    <ProtectedRoute requiredModules={["stockstatus"]}>
      <StockVariancePage />
    </ProtectedRoute>
  } />
</Route>
```

---

## Route Access Matrix

| Route | ADM | MNG | FTR |
|-------|-----|-----|-----|
| `/` (Home) | Yes | Yes | Yes |
| `/stock/tank-items` | Yes | Yes | Yes |
| `/stock/tank-monitoring` | Yes | Yes | Yes |
| `/stock/tank-data` | Yes | Yes | Yes |
| `/stock/tank-logs` | Yes | Yes | Yes |
| `/dashboard` | Yes | Yes | No |
| `/stock-dashboard` | Yes | Yes | No |
| `/stock/stock-status` | Yes | Yes | No |
| `/stock/variance` | Yes | Yes | No |
| `/stock/warehouse-inventory` | Yes | Yes | No |
| `/reports/vehicle-report` | Yes | Yes | No |
| `/reports/director-dashboard` | Yes | Yes | No |
| `/domestic-contracts` | Yes | Yes | No |
| `/contracts/domestic-2627` | Yes | Yes | No |
| `/contracts/open-grpos` | Yes | Yes | No |
| `/exim-account` | Yes | Yes | No |
| `/exim-rates` | Yes | Yes | No |
| `/commodity/daily-price` | Yes | Yes | No |
| `/commodity/jivo-rates` | Yes | Yes | No |
| `/license/advance-license` | Yes | Yes | No |
| `/license/advance-license/:licenseNo` | Yes | Yes | No |
| `/license/dfia-license` | Yes | Yes | No |
| `/license/dfia-license/:fileNo` | Yes | Yes | No |
| `/admin/stock-updation-logs` | Yes | Yes | No |
| `/admin/users` | Yes | No | No |
| `/admin/sync-raw-material-data` | Yes | No | No |
| `/admin/sync-finished-goods-data` | Yes | No | No |
| `/admin/sync-vendor-data` | Yes | No | No |
| `/admin/sync-logs` | Yes | No | No |

---

## Sidebar Role Filtering

The sidebar (`src/components/Sidebar.tsx`) filters navigation links by module permissions. Each link declares a `modules` array — the user must have at least one matching module to see the link.

### Sidebar Sections

| Section | Links |
|---------|-------|
| Reports | Dashboard, Stock Dashboard, Director Dashboard, Warehouse Inventory, Vehicle Report |
| Stock | Stock Status, **Stock Variance**, Tank Items, Tank Monitoring, Tank Data, Tank Logs |
| Domestic Contracts | FY 2025-2026, FY 2026-2027 |
| Accounts | Dr/Cr Outstanding, Open GRPOs |
| Commodity Price | Daily Price, Jivo Rates |
| Custom Exchange Rates | Exchange Rates |
| License | Advance License, DFIA License |
| Administration | Users, Sync (RM/FG/Vendor), Sync Logs, Stock Updation Logs |

---

## Security Notes

- Tokens are stored in `localStorage` (not httpOnly cookies). This is a common SPA pattern but means tokens are accessible via JavaScript.
- The backend validates tokens on every request regardless of frontend checks.
- Module checks happen on both frontend (UI visibility) and backend (API authorization).
- When a refresh token fails, ALL stored auth data is cleared to prevent stale state.
