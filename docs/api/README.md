# API Layer

Source of truth: `src/api/`.

## Base Client

`src/api/client.ts` creates the shared Axios instance.

| Setting | Value |
| --- | --- |
| Base URL | `import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"` |
| Default content type | `application/json` |
| Auth header | `Authorization: Bearer <access_token>` when token exists |
| Refresh endpoint | `/account/login/refresh/` |

401 responses are retried once after token refresh. Concurrent requests wait for the same refresh request.

## API Modules

| File | Domain |
| --- | --- |
| `auth.ts` | Login and logout |
| `users.ts` | User listing, create, update, delete |
| `dashboard.ts` | Capacity insights, stock dashboard, director inventory |
| `stockStatus.ts` | Stock status CRUD, movements, reports, dashboard, logs, debit entries |
| `tank.ts` | Tank items, tanks, summaries, layers, in-tank items, logs |
| `sapSync.ts` | SAP items, vendors, purchase orders, sync logs, warehouse inventory, ledgers, open AP/AR/PO, customer/vendor balances |
| `dailyPrice.ts` | Fetch/save daily prices, date/range reads, high-low, trends |
| `jivoRate.ts` | Fetch/save Jivo rates, range reads, trends |
| `customRates.ts` | Custom EXIM exchange rates and external exchange rates |
| `openGrpo.ts` | Open GRPO list |
| `domesticContracts26.ts` | Domestic contracts workflow for financial-year pages |
| `oldContracts.ts` | Legacy contract list |
| `license.ts` | Advance License and DFIA License headers/lines |

## Common Patterns

- API modules export TypeScript interfaces beside the request functions.
- List functions normalize wrapped and unwrapped array responses where the backend varies.
- Date filters are sent as query parameters.
- Stock soft delete uses PATCH through `softDeleteStockStatus()`.
- Auth refresh is centralized in `client.ts`; page code should not implement token refresh.

## Endpoint Inventory

See [Backend Endpoints](../backend/endpoints.md) for the frontend-used endpoint list grouped by feature.

## Adding API Calls

1. Add the type/interface next to the function in the relevant `src/api/*.ts` file.
2. Use the shared `api` instance from `src/api/client.ts`.
3. Normalize backend response wrappers in the API module, not in pages.
4. Keep page components focused on loading, filters, state, and rendering.
