# Authentication & Authorization

Source files:

- `src/api/auth.ts`
- `src/api/client.ts`
- `src/context/AuthContext.tsx`
- `src/components/ProtectedRoute.tsx`
- `src/hooks/useHasPermission.ts`
- `src/components/Sidebar.tsx`

## Login Flow

1. `LoginPage` validates email/password with Zod.
2. `login()` posts to `/account/login/`.
3. The response supplies `access`, `refresh`, `permissions`, and `name`.
4. The page stores auth values in `localStorage`.
5. `AuthContext.setAuth()` updates in-memory state.
6. The user is sent to `/`.

## Stored Values

| Key | Used by |
| --- | --- |
| `access_token` | Axios request interceptor, `AuthContext.isLoggedIn` |
| `refresh_token` | Axios response interceptor |
| `user_permissions` | `AuthContext`, `useHasPermission`, route/sidebar guards |
| `user_name` | Profile/sidebar display |
| `user_email` | Profile/sidebar display |
| `login-remember-email` | Login page remember-me field |

## Token Refresh

`src/api/client.ts` attaches `Authorization: Bearer <access_token>` to requests.

When an API request returns 401:

- login and refresh requests are ignored;
- one refresh call is made to `/account/login/refresh/`;
- concurrent failed requests queue while refresh is in progress;
- the new access token is stored and queued requests retry;
- if refresh fails, auth keys are cleared and the browser redirects to `/login`.

## Permission Model

Permissions are stored as:

```ts
type Permissions = Record<string, string[]>;
```

Example:

```json
{
  "stockstatus": ["view", "add", "change", "delete"],
  "tankdata": ["view"]
}
```

`ProtectedRoute` accepts:

| Prop | Meaning |
| --- | --- |
| `requiredModules` | User needs at least one listed module |
| `requiredAction` | Action required for the module, default `view` |

If permission fails, the user is redirected to `/`.

## Sidebar Visibility

`Sidebar.tsx` uses the same permission model:

- links without `modules` are visible to all authenticated users;
- links with `modules` are visible when the user has `view` on at least one module;
- a section is hidden when all of its links are hidden.

## Logout

The sidebar calls `/account/logout/` through `logout()`. Even if the API call fails, `clearAuth()` removes local auth state and navigates to `/login`.
