# Authentication & Authorization

This document is synced to current frontend behavior (`src/context/AuthContext.tsx`, `src/components/ProtectedRoute.tsx`, `src/api/client.ts`).

---

## Auth Flow

1. User logs in from `/login`.
2. Backend returns access/refresh token and user details.
3. Frontend stores auth values in `localStorage`.
4. Protected routes render inside `<ProtectedRoute>`.

---

## Stored Keys

| Key | Purpose |
|---|---|
| `access_token` | JWT access token for API calls |
| `refresh_token` | JWT refresh token |
| `user_role` | Role code (`ADM`, `MNG`, `FTR`) |
| `user_name` | Display name |
| `user_email` | Display email |

---

## Token Refresh

`src/api/client.ts` retries 401 requests by calling refresh endpoint once and queueing concurrent failed requests during refresh.

If refresh fails, auth state is cleared and user is redirected to `/login`.

---

## Route Protection Model

- All app routes (except `/login`) are wrapped by `<ProtectedRoute>`.
- Route-level module checks use `requiredModules` and pass if user has at least one module with `view` action.

---

## Sidebar Visibility Model

Sidebar links in `src/components/Sidebar.tsx` also use module-based visibility:

- If `modules` is absent, link is visible.
- If present, user must match at least one module.
- Entire section hides if all its links are hidden.

---

## Current Route Access Matrix (By Modules)

Use [Pages & Routing](../pages/README.md) as source of truth for route-to-module mapping.

Role access (`ADM`, `MNG`, `FTR`) is determined by backend-assigned modules, not only role name.

---

## Current Accounts Navigation (Module Guarded)

| Link | Modules |
|---|---|
| `Oil Dr/Cr Outstanding` (`/exim-account`) | `debitentry` |
| `Vendor Outstanding` | `debitentry`, `party` |
| `Customer Outstanding` | `customer_balance_sheet` |
| `Customer Aging` | `customer_balance_sheet` |
| `Open ARs` | `customer_balance_sheet` |
| `Open APs` | `balance_sheet` |
| `Open POs` | `balance_sheet` |
| `Open GRPOs` | `open_grpos` |

