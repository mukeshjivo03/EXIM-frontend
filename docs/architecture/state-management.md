# State Management & Data Flow

The app uses React Context for cross-cutting state and local `useState`/`useEffect` for page data. There is no Redux, Zustand, or query-cache library.

## Context Providers

| Provider | File | Responsibility |
| --- | --- | --- |
| `AuthProvider` | `src/context/AuthContext.tsx` | User name/email, permissions, login state, permission helpers |
| `ThemeProvider` | `src/context/ThemeContext.tsx` | Light/dark theme and persistence |
| `DailyPriceProvider` | `src/context/DailyPriceContext.tsx` | Cached daily commodity price rows |
| `JivoRateProvider` | `src/context/JivoRateContext.tsx` | Cached Jivo rate rows |
| `OpenGrpoProvider` | `src/context/OpenGrpoContext.tsx` | Cached open GRPO rows |

## Auth State

`AuthContext` reads and writes:

| Key | Purpose |
| --- | --- |
| `access_token` | Bearer token for API requests |
| `refresh_token` | Token used by `src/api/client.ts` after 401 responses |
| `user_permissions` | JSON object of `{ module: actions[] }` |
| `user_name` | Display name |
| `user_email` | Display email |

`isLoggedIn` is true only when an access token exists and the permission object is not empty.

## Theme State

`ThemeContext` stores:

| Key | Value |
| --- | --- |
| `theme` | `light` or `dark` |

It applies the selected theme by updating the root `dark` class.

## Page Data Pattern

Most pages follow this shape:

```text
mount
  -> set loading
  -> call a function from src/api/*
  -> store response in local state
  -> render cards, filters, tables, charts
```

CRUD pages usually refetch after create, update, delete, move, dispatch, or inward/outward operations.

## Permission Flow

```text
LoginPage
  -> POST /account/login/
  -> stores tokens, name, email, permissions
  -> AuthProvider exposes hasPermission/hasAnyModule
  -> ProtectedRoute guards routes
  -> Sidebar filters links and sections
```

Route guards require the `view` action by default. The user passes if they have `view` on at least one listed module.

## When To Add Context

Prefer local page state unless data must survive navigation or be shared by unrelated components. Existing shared caches are limited to daily prices, Jivo rates, and open GRPOs.
