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
| `stockStatus.ts` | Stock tracking | Stock CRUD, filters, insights, logs |
| `tank.ts` | Tank management | Tank items, tanks, summaries, rates |
| `dailyPrice.ts` | Commodity prices | Fetch, save, trends |
| `license.ts` | Licenses | Advance + DFIA license headers & lines |
| `sapSync.ts` | SAP integration | Item sync, vendor sync, POs, balance, logs |

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
  transporter_name?: string;
  created_at: string;
  created_by: string;
  deleted: boolean;       // soft-delete flag
}

interface StockStatusPayload {
  item_code: string;
  status: StockStatusChoice;
  vendor_code: string;
  rate: string;
  quantity: string;
  created_by: string;
  vehicle_number?: string;
  location?: string;
  eta?: string;
  transporter_name?: string;
}

interface StockEntryByRM {
  id: number;
  vendor_code: string;
  rate: number;
  quantity: number;
  quantity_in_litre: number;   // backend-calculated liters
  total: number;
  vehicle_number: string | null;
  transporter: string | null;
  location: string | null;
  eta: string | null;
  created_at: string;
}

interface StockStatusFilters {
  status?: string;
  vendor?: string;
  item?: string;
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
  id: number;
  field_name: string;
  old_value: string;
  new_value: string;
  updated_at: string;
  updated_by: string;
  stock_id: number;
}
```

### Endpoints

| Function | Method | Endpoint | Description |
|----------|--------|----------|-------------|
| `getStockStatuses(filters?)` | GET | `/stock-status/` | List stocks (filterable) |
| `getStockStatus(id)` | GET | `/stock-status/{id}/` | Get single stock record |
| `createStockStatus(data)` | POST | `/stock-status/` | Create stock entry |
| `updateStockStatus(id, data)` | PUT | `/stock-status/{id}/` | Update stock entry |
| `softDeleteStockStatus(record)` | PATCH | `/stock-status/{id}/` | Soft-delete (sends only `{ deleted: true }`) |
| `getUniqueRMCodes()` | GET | `/stock-status/get-unique-rm/` | List unique RM item codes |
| `getStockEntriesByRM(itemCode)` | GET | `/stock-status/get-stock-entry-by-rm/` | Stock entries for an item code |
| `getStockSummary()` | GET | `/stock-status/stock-summary/` | Overall stock summary |
| `getStockInsights(filters?)` | GET | `/stock-status/stock-insights/` | Filtered stock insights |
| `getStockLogs()` | GET | `/stock-status/stock-logs/` | Audit log of stock changes |

**Note:** Soft delete uses PATCH to send only `{ deleted: true }`. There is no hard DELETE endpoint for stock entries.

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

interface ItemWiseTankSummaryItem {
  color: string;
  tank_item_code: string;
  tank_item_name: string;
  quantity_in_liters: number;
  total_capacity: number;
  tank_count: number;
  tank_numbers: string[];
}

interface ItemWiseTankSummary {
  total_quantity: number;
  items: ItemWiseTankSummaryItem[];
}

interface TankLog {
  id: number;
  tank_code: string;
  log_type: "INWARD" | "OUTWARD";
  quantity: string;
  stock_status_id?: number;
  tank_layer_id?: number;
  remarks: string;
  created_at: string;
  created_by: string;
  consumptions: TankLogConsumption[];
}

interface TankLogConsumption {
  id: number;
  layer_id: number;
  stock_status_id: number;
  vendor_name: string;
  quantity_consumed: string;
  rate: string;
  created_at: string;
}

interface TankInwardPayload {
  tank_code: string;
  stock_status_id: string;
  quantity: string;
  user: string;
}

interface TankOutwardPayload {
  tank_code: string;
  quantity: string;
  remarks: string;
  user: string;
}

interface TankRateBreakdown {
  tank_code: string;
  item_code: string;
  item_name: string;
  color: string;
  tank_capacity: number;
  current_capacity: number;
  rate_breakdown: RateBreakdownEntry[];
  weighted_avg_rate: number;
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
| `getItemWiseTankSummary()` | GET | `/tank/item-wise-summary/` | Per-item tank summary (returns `{ total_quantity, items[] }`) |
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
| `getDailyPricesByDate(date)` | GET | `/daily-price/db-list/?date=YYYY-MM-DD` | Get saved prices for a date |
| `getPriceTrends()` | GET | `/daily-price/trends/` | Historical trend data for charts |

---

## Licenses (`src/api/license.ts`)

### Advance License Types

```typescript
interface LicenseHeader {
  license_no: string;                    // primary key
  lincense_lines: LicenseLine[];         // NOTE: "lincense" is a backend typo
  issue_date: string;
  import_validity: string;
  export_validity: string;
  import_in_mts: string;
  cif_value_inr: string;
  cif_value_usd: string;
  cif_exchange_rate: string;
  export_in_mts: string;
  fob_value_inr: string;
  fob_value_usd: string;
  fob_exhange_rate: string;             // NOTE: "exhange" is a backend typo
  status: string;                        // "OPEN" | "CLOSE"
}

interface LicenseLine {
  id: number;
  boe_No: string;                        // NOTE: camelCase "No" from backend
  boe_value_usd: string;
  shipping_bill_no: string;
  date: string;
  sb_value_usd: string;
  import_in_mts: string;
  export_in_mts: string;
  balance: string;
  license_no: string;
}
```

### Advance License Endpoints

| Function | Method | Endpoint | Description |
|----------|--------|----------|-------------|
| `getLicenseHeaders()` | GET | `/license/advance-license-headers/` | List all headers |
| `getLicenseHeader(no)` | GET | `/license/advance-license-header/{no}/` | Get header + lines |
| `createLicenseHeader(data)` | POST | `/license/advance-license-headers/` | Create header |
| `updateLicenseHeader(no, data)` | PUT | `/license/advance-license-header/{no}/` | Update header |
| `deleteLicenseHeader(no)` | DELETE | `/license/advance-license-header/{no}/` | Delete header |
| `createLicenseLine(data)` | POST | `/license/advance-license-lines/` | Create line |
| `updateLicenseLine(id, data)` | PUT | `/license/advance-license-lines/{id}/` | Update line |

### DFIA License Types

```typescript
interface DFIALicenseHeader {
  file_no: string;                       // primary key
  dfia_license_lines: DFIALicenseLine[];
  issue_date: string;
  export_validity: string;
  export_in_mts: string;
  fob_value_inr: string;
  fob_value_usd: string;
  fob_exchange_rate: string;
  import_validity: string;
  import_in_mts: string;
  cif_value_inr: string;
  cif_value_usd: string;
  cif_exchange_rate: string;
  status: string;                        // "OPEN" | "CLOSE"
}

interface DFIALicenseLine {
  id: number;
  boe_no: string;
  shipping_bill_no: string;
  date: string;
  to_be_imported_in_mts: string;
  exported_in_mts: string;
  balance: string;
  sb_value_inr: string;
  license_no: string;
}
```

### DFIA License Endpoints

| Function | Method | Endpoint | Description |
|----------|--------|----------|-------------|
| `getDFIALicenseHeaders()` | GET | `/license/dfia-license-header/list/` | List all headers |
| `getDFIALicenseHeader(no)` | GET | `/license/dfia-license-header/{no}/` | Get header + lines |
| `createDFIALicenseHeader(data)` | POST | `/license/dfia-license-header/create/` | Create header |
| `updateDFIALicenseHeader(no, data)` | PUT | `/license/dfia-license-header/{no}/` | Update header |
| `deleteDFIALicenseHeader(no)` | DELETE | `/license/dfia-license-header/{no}/` | Delete header |
| `createDFIALicenseLine(data)` | POST | `/license/dfia-license-lines/create/` | Create line |
| `updateDFIALicenseLine(id, data)` | PUT | `/license/dfia-license-lines/{id}/` | Update line |

**Note:** DFIA endpoint patterns differ from Advance License (e.g., `/list/` suffix, `/create/` suffix). This is a backend inconsistency to be aware of.

---

## SAP Sync & Items (`src/api/sapSync.ts`)

### Types

```typescript
interface SapItem {
  id: number;
  item_code: string;
  item_name: string;
  category: string;
  sal_factor2: string;
  u_tax_rate: number;
  deleted: string;
  u_variety: string;
  sal_pack_un: string;
  u_brand: string;
  u_unit: string;
  u_sub_group: string;
  total_trans_value: string;
  total_in_qty: string;
  total_out_qty: string;
  total_qty: string;
  rate: string;
}

interface Vendor {
  id: number;
  card_code: string;
  card_name: string;
  state: string;
  u_main_group: string;
  country: string;
}

interface PO {
  id: number;
  po_number: string;
  po_date: string | null;
  status: string;
  product_code: string;
  product_name: string;
  vendor: string;
  contract_qty: string | null;
  contract_rate: string | null;
  contract_value: string | null;
  load_qty: string | null;
  unload_qty: string | null;
  allowance: string | null;
  transporter: string | null;
  vehicle_no: string | null;
  bilty_no: string | null;
  bilty_date: string | null;
  grpo_no: string;
  grpo_date: string | null;
  invoice_no: string;
  basic_amount: string | null;
  landed_cost: string | null;
  net_amount: string | null;
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
| `getRmItems(varieties?)` | GET | `/items/rm/` | List RM items (filterable by variety) |
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
| `getVendors()` | GET | `/parties/` | List all vendors |
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
| `lincense_lines` | `LicenseHeader` | Misspelled "license" |
| `fob_exhange_rate` | `LicenseHeader` | Misspelled "exchange" |
| `boe_No` | `LicenseLine` | Inconsistent casing (camelCase `No`) |
| `Last Transanction Amount` | `BalanceEntry` | Misspelled "Transaction" |
| `records_procesed` | `SyncLog` | Misspelled "processed" |
| `/sap_sync/` vs `/sap-sync/` | SAP endpoints | Inconsistent URL prefixes |
| `/dfia-license-header/list/` | DFIA endpoints | Different URL pattern from Advance License |
