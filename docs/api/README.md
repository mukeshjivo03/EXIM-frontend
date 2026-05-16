# API Layer

Source of truth: `src/api/` and Axios client in `src/api/client.ts`.

---

## Base Client

- File: `src/api/client.ts`
- Base URL: `VITE_API_BASE_URL`
- Auth header: `Authorization: Bearer <access_token>`
- Automatic refresh flow using `refresh_token` on 401

---

## API Modules

| File | Purpose | Key Functions |
|---|---|---|
| `auth.ts` | Login/logout | `login`, `logout` |
| `users.ts` | User CRUD | `getUsers`, `createUser`, `updateUser`, `deleteUser` |
| `dashboard.ts` | Dashboard aggregates | `getCapacityInsights`, `getStockDashboard` |
| `stockStatus.ts` | Stock lifecycle and logs | `getStockStatuses`, `createStockStatus`, `updateStockStatus`, `softDeleteStockStatus`, `getStockInsights`, `getStockSummary`, `getStockLogs`, `getVehicleReport`, `getDebitEntries`, `getDebitInsights` |
| `tank.ts` | Tank inventory and operations | `getTankItems`, `createTankItem`, `updateTankItem`, `deleteTankItem`, `getTanks`, `createTank`, `updateTank`, `deleteTank`, `tankInward`, `tankOutward`, `getTankSummary`, `getItemWiseTankSummary`, `getTankLogs`, `getTankLayers` |
| `dailyPrice.ts` | Daily commodity prices | `fetchDailyPrices`, `saveDailyPrices`, `getDailyPricesByDate`, `getDailyPricesByRange`, `getPriceTrends` |
| `jivoRate.ts` | Jivo rates | `fetchJivoRates`, `saveJivoRates`, `getJivoRatesByRange` |
| `customRates.ts` | Exchange rates | `fetchCustomRates`, `fetchExternalExchangeRates` |
| `openGrpo.ts` | Open GRPO list | `getOpenGrpos` |
| `oldContracts.ts` | Legacy/old contracts | `getOldContracts` |
| `domesticContracts26.ts` | FY 26-27 contracts endpoints | FY 26-27 contract APIs |
| `license.ts` | Advance + DFIA licenses | header/line CRUD functions for both license types |
| `sapSync.ts` | SAP sync and accounts datasets | RM/FG/vendor sync functions, PO sync, balance-sheet helpers, customer/vendor ledgers, open AP/AR/PO helpers |

---

## Accounts-related SAP Endpoints Used

From `src/api/sapSync.ts`:

| Function | Endpoint |
|---|---|
| `syncBalanceSheet` | `/sap-sync/balance-sheet/` |
| `getOpenAps` | `/sap-sync/open-ap/` |
| `getOpenArs` | `/sap-sync/open-ar/` |
| `getOpenPos` | `/sap-sync/open-pos/` |
| `getCustomerOutstanding` | `/sap-sync/custa/balance-sheet/` |
| `getCustomerOutstandingBalance` | `/sap-sync/customer/balance/` |
| `getCustomerLedger` | `/sap-sync/customer/ledger` |
| `getCustomerAgingBalance` | `/sap-sync/customer-aging-balance/` |
| `getVendorOutstanding` | `/sap-sync/vendor/balance-sheet/` |
| `getReconciliation` | `/sap-sync/vendor/ledger` |

---

## Notes

- Backend response shapes are normalized in API functions (for array/wrapper variants).
- Some backend routes use both hyphen and underscore styles; frontend handles both where needed.
