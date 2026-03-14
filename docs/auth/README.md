# Authentication & Authorization

## Overview

The app uses **JWT (JSON Web Token)** authentication with access/refresh token pairs. The backend is a Django REST Framework server using `djangorestframework-simplejwt` (or similar).

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

3. Multiple concurrent 401s are handled by queuing - only one refresh call is made

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
  // ...
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
  allowedRoles?: string[];    // e.g., ["ADM", "MNG"]
}
```

### Behavior

1. If `!isLoggedIn` -> redirect to `/login`
2. If `allowedRoles` is provided and user's role is not in the list -> redirect to `/`
3. Otherwise -> render `children`

### Usage in Routes (`src/App.tsx`)

```tsx
// Wraps the entire layout - requires login
<Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>

  // No role restriction - all logged-in users
  <Route path="/stock/tank-items" element={<TankItemsPage />} />

  // ADM + MNG only
  <Route path="/dashboard" element={
    <ProtectedRoute allowedRoles={["ADM", "MNG"]}>
      <DashboardPage />
    </ProtectedRoute>
  } />

  // ADM only
  <Route path="/admin/users" element={
    <ProtectedRoute allowedRoles={["ADM"]}>
      <UsersPage />
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
| `/dashboard` | Yes | Yes | No |
| `/stock-dashboard` | Yes | Yes | No |
| `/stock/stock-status` | Yes | Yes | No |
| `/domestic-contracts` | Yes | Yes | No |
| `/exim-account` | Yes | Yes | No |
| `/commodity/daily-price` | Yes | Yes | No |
| `/license/advance-license` | Yes | Yes | No |
| `/license/dfia-license` | Yes | Yes | No |
| `/admin/stock-updation-logs` | Yes | Yes | No |
| `/admin/users` | Yes | No | No |
| `/admin/sync-raw-material-data` | Yes | No | No |
| `/admin/sync-finished-goods-data` | Yes | No | No |
| `/admin/sync-vendor-data` | Yes | No | No |
| `/admin/sync-logs` | Yes | No | No |

---

## Sidebar Role Filtering

The sidebar (`src/components/Sidebar.tsx`) also filters navigation links by role, so users only see links they have access to. This is a UI-level filter on top of the route-level protection.

### Sidebar Sections by Role

| Section | ADM | MNG | FTR |
|---------|-----|-----|-----|
| Home | Yes | Yes | Yes |
| Dashboard | Yes | Yes | No |
| Stock (tanks only) | Yes | Yes | Yes |
| Stock Status | Yes | Yes | No |
| Commodity Price | Yes | Yes | No |
| Accounts | Yes | Yes | No |
| Contracts | Yes | Yes | No |
| License | Yes | Yes | No |
| Admin (stock logs) | Yes | Yes | No |
| Admin (users, sync) | Yes | No | No |

---

## Security Notes

- Tokens are stored in `localStorage` (not httpOnly cookies). This is a common SPA pattern but means tokens are accessible via JavaScript.
- The backend should validate tokens on every request regardless of frontend checks.
- Role checks happen on both frontend (UI visibility) and backend (API authorization).
- When a refresh token fails, ALL stored auth data is cleared to prevent stale state.
