# API Layer

All API communication is handled through an Axios instance defined in `src/api/client.ts`. Each domain has its own API file in `src/api/`.

---

## Axios Client (`src/api/client.ts`)

### Base URL

```
VITE_API_BASE_URL  (defaults to http://localhost:9000)
```

Set this in a `.env` file at the project root:

```env
# Local development
VITE_API_BASE_URL=http://localhost:9000

# Production
VITE_API_BASE_URL=http://103.89.45.75:9000
```

### Request Interceptor

Every request automatically attaches the JWT access token from `localStorage`:

```
Authorization: Bearer <access_token>
```

### Response Interceptor (Token Refresh)

When a `401 Unauthorized` response is received:

1. If no refresh token exists, redirect to `/login`
2. If a refresh is already in-flight, queue the failed request
3. Otherwise, call `POST /account/login/refresh/` with `{ refresh: <token> }`
4. On success: update `access_token` in localStorage, retry all queued requests
5. On failure: clear all auth data from localStorage, redirect to `/login`

Refresh is skipped for `/account/login/` and `/account/login/refresh/` endpoints.

---

## API Files Overview

| File | Domain | Endpoints |
|------|--------|-----------|
| `auth.ts` | Authentication | Login, logout |
| `users.ts` | User management | CRUD users |
| `dashboard.ts` | Dashboard data | Capacity insights, stock dashboard |
| `stockStatus.ts` | Stock tracking | Stock CRUD, filters, insights, logs, variance/debit entries |
| `tank.ts` | Tank management | Tank items, tanks, summaries, rates |
| `dailyPrice.ts` | Commodity prices | Fetch, save, range, trends |
| `license.ts` | Licenses | Advance + DFIA license headers & import/export lines |
| `sapSync.ts` | SAP integration | Item sync, vendor sync, POs, balance, logs |
| `openGrpo.ts` | Open GRPOs | Open purchase order data |
| `jivoRate.ts` | Jivo rates | Jivo commodity rate data |
| `customRates.ts` | Exchange rates | Custom exchange rate management |
| `domesticContracts26.ts` | Contracts | Domestic contract data FY 2026-27 |

---

## Authentication (`src/api/auth.ts`)

### Types

```typescript
interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  access: string;    // JWT access token
  refresh: string;   // JWT refresh token
  role: "ADM" | "FTR" | "MNG";
  name: string;
}
```

### Endpoints

| Function | Method | Endpoint | Description |
|----------|--------|----------|-------------|
| `login(data)` | POST | `/account/login/` | Authenticate user, returns tokens + role |
| `logout()` | POST | `/account/logout/` | Invalidate refresh token |

---

## Users (`src/api/users.ts`)

### Types

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  role: "ADM" | "FTR" | "MNG";
}

interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  role: "ADM" | "FTR" | "MNG";
}

interface UpdateUserRequest {
  name?: string;
  email?: string;
  password?: string;
  role?: "ADM" | "FTR" | "MNG";
}
```

### Endpoints

| Function | Method | Endpoint | Description |
|----------|--------|----------|-------------|
| `getUsers()` | GET | `/account/users/` | List all users |
| `createUser(data)` | POST | `/account/register/` | Create new user |
| `updateUser(id, data)` | PATCH | `/account/user/{id}/` | Update user fields |
| `deleteUser(id)` | DELETE | `/account/user/{id}/` | Delete user |

---

## Dashboard (`src/api/dashboard.ts`)

### Types

```typescript
interface CapacityInsight {
  total_capacity: number;
  filled_capacity: number;
  filled_percentage: number;
  empty_capacity: number;
  empty_percentage: number;
}

interface StockDashboardItem {
  item_code: string;
  in_factory: number;
  outside_factory: number;
  status_data: Record<string, number>;  // status -> quantity
  total: number;
}

interface StockDashboardResponse {
  summary: {
    in_factory_total: number;
    outside_factory_total: number;
    active_items: number;
  };
  status_vendors: Record<string, string[]>;  // status -> vendor codes
  items: StockDashboardItem[];
  totals: {
    in_factory: number;
    outside_factory: number;
    status_vendor_totals: Record<string, number>;
    grand_total: number;
  };
}
```

### Endpoints

| Function | Method | Endpoint | Description |
|----------|--------|----------|-------------|
| `getCapacityInsights()` | GET | `/tank/capacity-insights/` | Tank fill percentages |
| `getStockDashboard()` | GET | `/stock-status/stock-dashboard/` | Full stock dashboard data |

---

## Stock Status (`src/api/stockStatus.ts`)

### Status Choices

```typescript
const STATUS_CHOICES = [
  "COMPLETED", "IN_TANK",
  "OUT_SIDE_FACTORY", "ON_THE_WAY", "UNDER_LOADING",
  "AT_REFINERY", "OTW_TO_REFINERY", "KANDLA_STORAGE",
  "MUNDRA_PORT", "ON_THE_SEA", "IN_CONTRACT",
  "DELIVERED", "IN_TRANSIT",
  "PENDING", "PROCESSING",
] as const;
```

### Types

```typescript
interface StockStatus {
  id: number;
  item_code: string;
  vendor_code: string;
  status: StockStatusChoice;
  rate: string;
  total: string;
  quantity: string;
  vehicle_number?: string;
  location?: string;
  eta?: string;
  arrival_date?: string;
  transporter_name?: string;
  job_work_vendor?: string;
  created_at: string;
  created_by: string;
  deleted: boolean;       // soft-delete flag
}

interface StockEntryByRM {
  id: number;
  vendor_code: string;
  vendor_code__card_name: string;
  rate: number;
  quantity: number;
  quantity_in_litre: number;
  total: number;
  vehicle_number: string | null;
  transporter: string | null;
  location: string | null;
  eta: string | null;
  created_at: string;
}

interface StockInsights {
  summary: {
    total_value: number;
    total_qty: number;
    total_count: number;
    avg_price_per_kg: number;
    avg_price_per_ltr: number;
  };
}

interface StockLog {
  id: string;
  stock: number;
  action: "CREATE" | "UPDATE" | "DELETE" | string;
  changed_by_label: string;
  note: string;
  timestamp: string;
  field_logs: Array<{ field_name: string; old_value: unknown; new_value: unknown }>;
}

interface VehicleReport {
  vehicle_number: string;
  quantity_in_litre: number;
  eta: string | null;
  status: string;
  job_work: string | null;
  item_name: string;
}

// Stock Variance
interface DebitEntry {
  id: number;
  type: "GAIN" | "LOSS";
  quantity: string;         // negative for GAIN, positive for LOSS
  rate: string;
  total: string;            // negative for GAIN, positive for LOSS
  vehicle_number: string;
  responsible_transporter: string | null;
  reason: string;
  created_at: string;
  created_by: string;
  stock: number;            // FK to stock entry
  responsible_party: string; // vendor card_code
}

interface DebitInsight {
  type: "GAIN" | "LOSS";
  total_qty: number;
  total_records: number;
  total_value: number;
}
```

### Endpoints

| Function | Method | Endpoint | Description |
|----------|--------|----------|-------------|
| `getStockStatuses(filters?)` | GET | `/stock-status/` | List stocks (filterable by status/vendor/item) |
| `getStockStatus(id)` | GET | `/stock-status/{id}/` | Get single stock record |
| `createStockStatus(data)` | POST | `/stock-status/` | Create stock entry |
| `updateStockStatus(id, data)` | PUT | `/stock-status/{id}/` | Update stock entry |
| `softDeleteStockStatus(record)` | PATCH | `/stock-status/{id}/` | Soft-delete (sends `{ deleted: true }`) |
| `getUniqueRMCodes()` | GET | `/stock-status/get-unique-rm/` | List unique RM item codes |
| `getStockEntriesByRM(itemCode)` | GET | `/stock-status/get-stock-entry-by-rm/` | Stock entries for an item |
| `getStockSummary()` | GET | `/stock-status/stock-summary/` | Overall stock summary |
| `getStockInsights(filters?)` | GET | `/stock-status/stock-insights/` | Filtered stock insights |
| `getStockLogs()` | GET | `/stock-status/stock-logs/` | Audit log of all stock changes |
| `getOutOfFactoryStockStatuses()` | GET | `/stock-status/out/` | Stocks currently outside factory |
| `moveStock(data)` | POST | `/stock-status/move/` | Move stock to new status/quantity |
| `dispatchStock(data)` | POST | `/stock-status/dispatch/` | Dispatch stock to destination |
| `arriveBatch(data)` | POST | `/stock-status/arrive-batch/` | Record batch arrival with weighed qty |
| `getVehicleReport(status)` | GET | `/stock-status/vehicle-report/` | Vehicle report filtered by status |
| `createOpeningStock(data)` | POST | `/stock-status/opening-stock/` | Create opening stock entry |
| `getDebitEntries()` | GET | `/stock-status/debit-entries/` | All variance (gain/loss) entries |
| `getDebitInsights()` | GET | `/stock-status/debit-insights/` | Aggregated gain/loss summary |

**Notes:**
- Soft delete uses PATCH to send only `{ deleted: true }`. There is no hard DELETE for stock entries.
- GAIN entries have negative `quantity` and `total`; LOSS entries are positive. Display as `Math.abs()` with color coding.

---

## Tanks (`src/api/tank.ts`)

### Types

```typescript
interface TankItem {
  id: number;
  tank_item_code: string;
  tank_item_name: string;
  is_active: boolean;
  created_at: string;
  created_by: string;
  color: string;            // hex color for UI display
}

interface Tank {
  tank_code: string;
  item_code: string | null;
  tank_capacity: string;
  current_capacity: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface TankSummary {
  total_tank_capacity: number;
  current_stock: number;
  utilisation_rate: number;
  tank_count: number;
  item_count: number;
}

interface TankLog {
  id: number;
  tank_code: string;
  log_type: "INWARD" | "OUTWARD";
  quantity: string;
  remarks: string;
  created_at: string;
  created_by: string;
  consumptions: TankLogConsumption[];
}
```

### Endpoints

| Function | Method | Endpoint | Description |
|----------|--------|----------|-------------|
| **Tank Items** | | | |
| `getTankItems()` | GET | `/tank/items/` | List all tank items |
| `createTankItem(data)` | POST | `/tank/items/` | Create tank item |
| `getTankItem(code)` | GET | `/tank/item/{code}/` | Get single tank item |
| `deleteTankItem(code)` | DELETE | `/tank/item/{code}/` | Delete tank item |
| `updateTankItem(code, color, name)` | PUT | `/tank/item/update-color/{code}/` | Update item color + name |
| **Tanks** | | | |
| `getTanks()` | GET | `/tank/` | List all tanks |
| `createTank(data)` | POST | `/tank/` | Create a tank |
| `deleteTank(code)` | DELETE | `/tank/{code}/` | Delete a tank |
| `updateTank(code, data)` | PUT | `/tank/update-capacity/{code}/` | Update tank capacity + item |
| **Summaries** | | | |
| `getTankSummary()` | GET | `/tank/tank-summary/` | Overall tank summary |
| `getItemWiseTankSummary()` | GET | `/tank/item-wise-summary/` | Per-item tank summary |
| `getTankLayers(code)` | GET | `/tank/layers/{code}/` | Rate breakdown layers for a tank |
| **Operations** | | | |
| `tankInward(data)` | POST | `/tank/inward/` | Add stock to tank |
| `tankOutward(data)` | POST | `/tank/outward/` | Remove stock from tank |
| **Logs** | | | |
| `getTankLogs()` | GET | `/tank/log/` | Tank operation history with consumptions |

---

## Daily Price (`src/api/dailyPrice.ts`)

### Types

```typescript
interface CommodityPrice {
  commodity_name: string;
  factory_kg: number;
  packing_kg: number;
  gst_kg: number;
  gst_ltr: number;
  fetched_date: string;
}

interface DbDailyPrice {
  id: number;
  commodity_name: string;
  factory_price: string;
  packing_cost_kg: string;
  with_gst_kg: string;
  with_gst_ltr: string;
  date: string;
  created_by: string;
}

interface PriceTrendsResponse {
  labels: string[];              // date labels
  datasets: TrendDataset[];      // { label, data[] } per commodity
}
```

### Endpoints

| Function | Method | Endpoint | Description |
|----------|--------|----------|-------------|
| `fetchDailyPrices()` | GET | `/daily-price/fetch/` | Preview today's prices (not saved) |
| `saveDailyPrices()` | POST | `/daily-price/fetch/` | Save fetched prices to database |
| `getDailyPricesByDate(date)` | GET | `/daily-price/db-list/?date=YYYY-MM-DD` | Prices for a specific date |
| `getDailyPricesByRange(from, to)` | GET | `/daily-price/range/?from_date=&to_date=` | Prices across a date range |
| `getPriceTrends()` | GET | `/daily-price/trends/` | Historical trend data for charts |

**Note:** `getPriceTrends()` returns `{ labels: [], datasets: [] }` when no data is saved. At least 2 days of saved prices are needed to produce a meaningful chart.

---

## Licenses (`src/api/license.ts`)

### Advance License

Advance Licenses have a header (metadata) and separate import lines + export lines.

#### Types

```typescript
interface ImportLine {
  id: number;
  boe_No: string;           // NOTE: camelCase "No" from backend
  boe_value_usd: string;
  boe_date: string;
  import_in_mts: string;
  license_no: string;
}

interface ExportLine {
  id: number;
  shipping_bill_no: string;
  sb_value_usd: string;
  export_in_mts: string;
  license_no: string;
}

interface LicenseHeader {
  license_no: string;
  import_lines: ImportLine[];
  export_lines: ExportLine[];
  issue_date: string;
  import_validity: string;
  export_validity: string;
  cif_value_inr: string;
  cif_value_usd: string;         // computed by backend
  cif_exchange_rate: string;
  fob_value_inr: string;
  fob_value_usd: string;         // computed by backend
  fob_exhange_rate: string;      // NOTE: "exhange" is a backend typo
  status: string;                // "OPEN" | "CLOSE"
  total_import: string;          // sum of import lines
  total_export: string;          // sum of export lines
  to_be_exported: string;        // computed
  balance: string;               // computed remaining balance
}

interface LicenseHeaderPayload {
  license_no: string;
  issue_date: string;
  import_validity: string;
  export_validity: string;
  cif_value_inr: string;
  cif_exchange_rate: string;
  fob_value_inr: string;
  fob_exhange_rate: string;
  status: string;
}
```

#### Endpoints

| Function | Method | Endpoint | Description |
|----------|--------|----------|-------------|
| `getLicenseHeaders()` | GET | `/license/advance-license-headers/` | List all headers |
| `getLicenseHeader(no)` | GET | `/license/advance-license-header/{no}/` | Get header + nested lines |
| `createLicenseHeader(data)` | POST | `/license/advance-license-headers/` | Create header |
| `updateLicenseHeader(no, data)` | PUT | `/license/advance-license-header/{no}/` | Update header |
| `deleteLicenseHeader(no)` | DELETE | `/license/advance-license-header/{no}/` | Delete header |
| `createImportLine(data)` | POST | `/license/advance-license-import-lines/` | Create import line |
| `updateImportLine(id, data)` | PUT | `/license/advance-license-import-lines/{id}/` | Update import line |
| `deleteImportLine(id)` | DELETE | `/license/advance-license-import-lines/{id}/` | Delete import line |
| `createExportLine(data)` | POST | `/license/advance-license-export-lines/` | Create export line |
| `updateExportLine(id, data)` | PUT | `/license/advance-license-export-lines/{id}/` | Update export line |
| `deleteExportLine(id)` | DELETE | `/license/advance-license-export-lines/{id}/` | Delete export line |

---

### DFIA License

DFIA (Duty Free Import Authorization) also has a header plus separate import and export lines.

#### Types

```typescript
interface DFIAImportLine {
  id: number;
  boe_no: string;
  boe_value_usd: string;
  boe_date: string;
  import_in_mts: string;
  license_no: string;
}

interface DFIAExportLine {
  id: number;
  shipping_bill_no: string;
  sb_value_usd: string;
  export_in_mts: string;
  license_no: string;
}

interface DFIALicenseHeader {
  file_no: string;                   // primary key
  dfia_import_lines: DFIAImportLine[];
  dfia_export_lines: DFIAExportLine[];
  issue_date: string;
  export_validity: string;
  export_in_mts: string;             // read-only from backend
  fob_value_inr: string;
  fob_value_usd: string;             // computed
  fob_exchange_rate: string;
  import_validity: string;
  import_in_mts: string;             // read-only from backend
  cif_value_inr: string;
  cif_value_usd: string;             // computed
  cif_exchange_rate: string;
  status: string;                    // "OPEN" | "CLOSE" | "Active"
  total_import: string;
  total_export: string;
  to_be_imported: string;
  balance: string;
}

interface DFIALicenseHeaderPayload {
  file_no: string;
  issue_date: string;
  export_validity: string;
  fob_value_inr: string;
  fob_exchange_rate: string;
  import_validity: string;
  cif_value_inr: string;
  cif_exchange_rate: string;
  status: string;
  // NOTE: export_in_mts and import_in_mts are NOT sent in the payload —
  // they are computed by the backend from the lines
}
```

#### Endpoints

| Function | Method | Endpoint | Description |
|----------|--------|----------|-------------|
| `getDFIALicenseHeaders()` | GET | `/license/dfia-license-header/list/` | List all headers |
| `getDFIALicenseHeader(no)` | GET | `/license/dfia-license-header/{no}/` | Get header + nested lines |
| `createDFIALicenseHeader(data)` | POST | `/license/dfia-license-header/create/` | Create header |
| `updateDFIALicenseHeader(no, data)` | PUT | `/license/dfia-license-header/{no}/` | Update header |
| `deleteDFIALicenseHeader(no)` | DELETE | `/license/dfia-license-header/{no}/` | Delete header |
| `createDFIAImportLine(data)` | POST | `/license/dfia-license-import-lines/create/` | Create import line |
| `updateDFIAImportLine(id, data)` | PUT | `/license/dfia-license-import-lines/{id}/` | Update import line |
| `deleteDFIAImportLine(id)` | DELETE | `/license/dfia-license-import-lines/{id}/` | Delete import line |
| `createDFIAExportLine(data)` | POST | `/license/dfia-license-export-lines/create/` | Create export line |
| `updateDFIAExportLine(id, data)` | PUT | `/license/dfia-license-export-lines/{id}/` | Update export line |
| `deleteDFIAExportLine(id)` | DELETE | `/license/dfia-license-export-lines/{id}/` | Delete export line |

**Note:** DFIA endpoint URL patterns differ from Advance License (e.g., `/list/` and `/create/` suffixes). This is a backend inconsistency.

---

## SAP Sync & Items (`src/api/sapSync.ts`)

### Types

```typescript
interface Vendor {
  id: number;
  card_code: string;
  card_name: string;
  state: string;
  u_main_group: string;
  country: string;
}

interface BalanceEntry {
  CardCode: string;
  CardName: string;
  Balance: number;
  "Last Transaction Date": string | null;
  "Last Transanction Amount": number;    // NOTE: "Transanction" typo from backend
}

interface SyncLog {
  id: number;
  sync_type: string;
  status: string;
  triggered_by: string;
  started_at: string;
  completed_at: string | null;
  error_message: string;
  records_procesed: number;              // NOTE: "procesed" typo from backend
  records_created: number;
  records_updated: number;
}
```

### Endpoints

| Function | Method | Endpoint | Description |
|----------|--------|----------|-------------|
| **Raw Materials** | | | |
| `getRmItems(varieties?)` | GET | `/items/rm/` | List RM items |
| `getRmItem(code)` | GET | `/item/rm/{code}/` | Get single RM item |
| `deleteRmItem(code)` | DELETE | `/item/rm/{code}/` | Delete RM item |
| `syncRmItems()` | GET | `/sap_sync/rm/items/` | Sync all RM items from SAP |
| `syncSingleRmItem(code)` | GET | `/sap_sync/rm/item/{code}/` | Sync single RM item |
| `getRmSummary(varieties?)` | GET | `/items/rm/summary/` | RM summary stats |
| `getRmVarieties()` | GET | `/items/rm/varieties/` | List available RM varieties |
| **Finished Goods** | | | |
| `getFgItems()` | GET | `/items/fg/` | List FG items |
| `getFgItem(code)` | GET | `/item/fg/{code}/` | Get single FG item |
| `deleteFgItem(code)` | DELETE | `/item/fg/{code}/` | Delete FG item |
| `syncFgItems()` | GET | `/sap_sync/fg/items/` | Sync all FG items from SAP |
| `syncSingleFgItem(code)` | GET | `/sap_sync/fg/item/{code}/` | Sync single FG item |
| **Vendors** | | | |
| `getVendors()` | GET | `/parties/` | List all vendors (returns `{ count, parties[] }`) |
| `getVendor(code)` | GET | `/party/{code}/` | Get single vendor |
| `deleteVendor(code)` | DELETE | `/party/{code}/` | Delete vendor |
| `syncVendor(code)` | GET | `/sap_sync/party/{code}/` | Sync vendor from SAP |
| **Purchase Orders** | | | |
| `getPOs()` | GET | `/pos/` | List all POs |
| `syncPOs()` | GET | `/sap-sync/po/` | Sync all POs from SAP |
| `syncSinglePO(grpoNo)` | GET | `/sap-sync/po/{grpoNo}/` | Sync single PO |
| `updatePO(id, data)` | PATCH | `/po/{id}/` | Update PO fields |
| `deletePO(id)` | DELETE | `/po/{id}/` | Delete PO |
| **Balance Sheet** | | | |
| `syncBalanceSheet()` | GET | `/sap-sync/balance-sheet/` | Fetch balance sheet from SAP |
| **Sync Logs** | | | |
| `getSyncLogs()` | GET | `/sync_logs/` | Get all sync operation logs |

**Note on URL patterns:** SAP sync endpoints use inconsistent prefixes (`/sap_sync/` with underscore vs `/sap-sync/` with hyphen). This is a backend inconsistency.

---

## Known Backend Quirks

These are field naming issues from the backend that the frontend works around:

| Issue | Location | Details |
|-------|----------|---------|
| `fob_exhange_rate` | `LicenseHeader` | Misspelled "exchange" |
| `boe_No` | `ImportLine` | Inconsistent casing (camelCase `No`) |
| `Last Transanction Amount` | `BalanceEntry` | Misspelled "Transaction" |
| `records_procesed` | `SyncLog` | Misspelled "processed" |
| `/sap_sync/` vs `/sap-sync/` | SAP endpoints | Inconsistent URL prefixes |
| `/dfia-license-header/list/` | DFIA endpoints | `/list/` and `/create/` suffixes differ from Advance License pattern |
