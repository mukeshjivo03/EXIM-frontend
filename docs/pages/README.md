# Pages & Routing

All routes are defined in `src/App.tsx`. Pages are organized into section-based folders under `src/pages/`.

---

## Route Map

| Route | Page Component | Roles | Description |
|-------|---------------|-------|-------------|
| `/login` | `LoginPage` | Public | Login form |
| `/` | `HomePage` | All | Quick-access grid |
| `/dashboard` | `DashboardPage` | ADM, MNG | Main dashboard with charts |
| `/stock-dashboard` | `StockDashboardPage` | ADM, MNG | Stock breakdown by item/status |
| `/stock-dashboard/:status` | `StockDashboardDetailPage` | ADM, MNG | Filtered stock records by status |
| `/stock/stock-status` | `StockStatusPage` | ADM, MNG | Stock CRUD with filters |
| `/stock/tank-items` | `TankItemsPage` | All | Tank item management |
| `/stock/tank-monitoring` | `TankMonitoringPage` | All | Visual tank fill levels |
| `/stock/tank-data` | `TankDataPage` | All | Tank CRUD |
| `/stock/tank-logs` | `TankLogsPage` | All | Tank operation logs |
| `/commodity/daily-price` | `DailyPricePage` | ADM, MNG | Daily commodity prices + trends |
| `/commodity/jivo-rates` | `JivoRatesPage` | ADM, MNG | Jivo commodity rates (fetch, save, history) |
| `/exim-account` | `EximAccountPage` | ADM, MNG | Balance sheet from SAP |
| `/contracts/open-grpos` | `OpenGrpoPage` | ADM, MNG | Open GRPOs pending invoice |
| `/domestic-contracts` | `OldDomesticContractsPage` | ADM, MNG | Purchase orders (legacy view) |
| `/license/advance-license` | `AdvanceLicensePage` | ADM, MNG | Advance license headers |
| `/license/advance-license/:licenseNo` | `AdvanceLicenseDetailPage` | ADM, MNG | License lines for a header |
| `/license/dfia-license` | `DFIALicensePage` | ADM, MNG | DFIA license headers |
| `/license/dfia-license/:fileNo` | `DFIALicenseDetailPage` | ADM, MNG | DFIA license lines |
| `/admin/users` | `UsersPage` | ADM | User management |
| `/admin/stock-updation-logs` | `StockUpdationLogsPage` | ADM, MNG | Stock change audit logs |
| `/admin/sync-raw-material-data` | `SyncRawMaterialDataPage` | ADM | SAP raw material sync |
| `/admin/sync-finished-goods-data` | `SyncFinishedGoodsDataPage` | ADM | SAP finished goods sync |
| `/admin/sync-vendor-data` | `SyncVendorDataPage` | ADM | SAP vendor sync |
| `/admin/sync-logs` | `SyncLogsPage` | ADM | Sync operation history |

---

## Page Details

### LoginPage (`src/pages/LoginPage.tsx`)

**Purpose:** User authentication entry point.

**Features:**
- Email + password form
- Animated maritime hero banner with ship, waves, ocean, clouds, and shooting stars
- Stores tokens + user data in localStorage on success
- Redirects to `/` on successful login
- Error display for invalid credentials

**API:** `login()`

---

### HomePage (`src/pages/HomePage.tsx`)

**Purpose:** Quick-access grid showing all available pages based on user role.

**Features:**
- Grid of link cards, each with icon, label, and description
- Role-filtered: links with `roles` property only shown to matching users
- Links without `roles` are shown to all users

**Navigation:** Links to all other pages in the app.

---

### DashboardPage (`src/pages/dashboard/DashboardPage.tsx`)

**Purpose:** Main business dashboard with summary statistics and charts.

**Features:**
- Summary cards: total capacity, filled %, empty %, tank count
- Stock insights: total value, quantity, average price
- Item-wise tank summary with pie/bar charts (Recharts)
- Tank rate breakdown data

**API:** `getCapacityInsights()`, `syncBalanceSheet()`, `getPriceTrends()`

**Charts (Recharts):**
- Tank capacity utilization pie chart (filled vs empty)
- Daily price trends bar chart (multi-commodity comparison)
- Dr/Cr outstanding parties horizontal bar chart (top 5 receivables, top 5 payables)

---

### StockDashboardPage (`src/pages/dashboard/StockDashboardPage.tsx`)

**Purpose:** Matrix view of stock quantities broken down by item and status.

**Features:**
- Summary cards (in-factory total from tank data, outside-factory total, active items)
- Unit toggle: KG / MTS / Liters with proper conversion (1ltr = 1kg * 1.0989)
- Matrix table: rows = items, columns = status+vendor combinations
- "In Factory" column shows actual tank quantities from `getItemWiseTankSummary()` (not stock status)
- Clickable status column headers navigate to detail page
- Grand total row at bottom

**API:** `getStockDashboard()`, `getItemWiseTankSummary()`

**Navigation:** Clicking a status column header navigates to `/stock-dashboard/:status`

---

### StockDashboardDetailPage (`src/pages/dashboard/StockDashboardDetailPage.tsx`)

**Purpose:** Filtered view of stock records for a specific status.

**Features:**
- Status-specific SVG hero illustration (`StatusHero`)
- Filtered stock records table
- Back navigation to stock dashboard

**URL Params:** `:status` - the stock status code (e.g., `ON_THE_SEA`)

**API:** `getStockStatuses({ status })`

---

### StockStatusPage (`src/pages/stock/StockStatusPage.tsx`)

**Purpose:** Full CRUD management of stock status entries.

**Features:**
- Filterable table (by status, vendor, item)
- Create stock entry dialog
- Edit stock entry (inline or dialog)
- Soft-delete stock entries
- Summary insights cards
- Pagination

**API:** `getStockStatuses()`, `createStockStatus()`, `updateStockStatus()`, `softDeleteStockStatus()`, `getStockInsights()`, `getStockSummary()`, `getRmItems()`, `getVendors()`

**Dialog Form Fields:**
- Item code (dropdown from RM items)
- Vendor code (dropdown from vendors)
- Status (dropdown from STATUS_CHOICES)
- Rate, Quantity

**Special Logic:** Quantity split - when updating with both quantity and status changes, the system can create a new record for the remaining quantity

---

### TankItemsPage (`src/pages/stock/TankItemsPage.tsx`)

**Purpose:** Manage tank item types (what can be stored in tanks).

**Features:**
- List of tank items with color indicators
- Create new tank item with custom color picker (add/delete colors, duplicate prevention)
- Edit tank item (color + name)
- Delete tank item
- Listens for `tank-items-updated` custom event to refresh
- **Role-based:** FTR users see read-only view (no create/edit/delete buttons)

**API:** `getTankItems()`, `createTankItem()`, `updateTankItem()`, `deleteTankItem()`

---

### TankDataPage (`src/pages/stock/TankDataPage.tsx`)

**Purpose:** Manage individual tanks and perform inward/outward operations.

**Features:**
- List of tanks with capacity, fill %, and assigned item
- Create new tank (capacity only, item code auto-assigned on inward)
- Edit tank: inward (add stock) or outward (remove stock) operations
- Inward flow: Select Item Code → Select Vendor/Vehicle (from `getStockEntriesByRM`) → Enter quantity or "Unload All"
- Outward flow: Enter quantity or "Drain All" to empty tank
- When tank is fully drained (quantity = 0), item assignment is automatically cleared
- Available quantity shown in both KG and Liters (using `quantity_in_litre` from API)
- Delete tank
- Tank summary cards (total capacity, current stock, utilisation rate)
- **Role-based:** FTR users cannot create or delete tanks (can still edit/inward/outward)

**API:** `getTanks()`, `createTank()`, `updateTank()`, `deleteTank()`, `getTankSummary()`, `getUniqueRMCodes()`, `getStockEntriesByRM()`, `tankInward()`, `tankOutward()`

---

### TankMonitoringPage (`src/pages/stock/TankMonitoringPage.tsx`)

**Purpose:** Visual monitoring of tank fill levels.

**Features:**
- Industrial tank SVG visuals with animated wave fill effects
- Each tank shows: tank code, item name, current/total capacity, fill percentage
- Color-coded by assigned tank item color
- Summary cards: total quantity, total capacity, total tanks, total products, fill rate
- Unit toggle: Liters / MTS (1000 L = 1 MT, MTS shown to 3 decimal places)
- Item-wise summary table with quantity and capacity per item
- Rate Breakdown dialog per tank (layers, rates, weighted average)
- **Role-based:** FTR users cannot see the Rate Breakdown button

**API:** `getTanks()`, `getTankItems()`, `getTankSummary()`, `getItemWiseTankSummary()`, `getTankLayers()`

---

### TankLogsPage (`src/pages/stock/TankLogsPage.tsx`)

**Purpose:** View tank operation history (inward/outward logs).

**Features:**
- Table: Tank Code, Log Type (IN/OUT badge), Quantity, Created At, Created By, View action
- View dialog: tank code, log type, quantity, tank layer id (OUT only), created at, created by, remarks
- Consumptions section (OUT only): Layer ID, Quantity Consumed, Rate, Total Value (rate × qty)
- Sorted by `created_at` descending (newest first)
- Pagination (20 per page)

**API:** `getTankLogs()`

---

### DailyPricePage (`src/pages/commodity/DailyPricePage.tsx`)

**Purpose:** View and manage daily commodity prices with trend charts.

**Features:**
- Fetch today's prices from Google Sheet (preview with "LIVE PREVIEW" badge)
- Save fetched prices to database
- KPI cards: commodity count, avg/highest/lowest factory price
- Delta badges on factory price column showing % change vs previous day
- Heatmap color coding on price cells (green = high, red = low)
- View saved prices by date range (calendar `DatePicker` components)
- Commodity filter dropdown for saved prices
- Price trend line chart (Recharts) with commodity toggle pills
- "Open Sheet" button linking to source Google Sheet
- Cached in `DailyPriceContext` to avoid redundant fetches on navigation

**API:** `fetchDailyPrices()`, `saveDailyPrices()`, `getDailyPricesByDate()`, `getDailyPricesByRange()`, `getPriceTrends()`

---

### JivoRatesPage (`src/pages/commodity/JivoRatesPage.tsx`)

**Purpose:** Fetch, preview, save, and browse historical Jivo commodity rates.

**Features:**
- Fetch latest Jivo rates from external source (preview with "LIVE PREVIEW" badge)
- Save fetched rates to database
- KPI cards: total entries, avg rate, highest rate, commodity count
- **Matrix view** (default): rows = commodity, columns = pack type, cells = rate with heatmap coloring
- **List view**: flat table of commodity / pack type / rate / date
- Toggle between matrix and list views
- Pack types sorted by weight/volume (g → kg → ton)
- Heatmap color coding on rate cells
- View saved rates by date range (calendar `DatePicker` components) with commodity filter
- Cached in `JivoRateContext` to avoid redundant fetches
- Search filter across commodity and pack type

**API:** `fetchJivoRates()`, `saveJivoRates()`, `getJivoRatesByRange()`

---

### OpenGrpoPage (`src/pages/contracts/OpenGrpoPage.tsx`)

**Purpose:** Monitor Goods Receipt Purchase Orders that are pending invoice.

**Features:**
- Auto-fetches on page load (cached in `OpenGrpoContext`)
- KPI cards: total open GRPOs, unique vendors, avg pending days, max pending days
- Critical warning banner when any GRPO has been pending 6+ days
- Row and badge color-coding by pending days: red (> 6d), yellow (> 3d), green (≤ 3d)
- Sortable columns: GRPO Number, Pending Days, Warehouse, Vendor Name
- Search across GRPO number, vendor ref, user, vendor name, warehouse
- Warehouse filter dropdown (dynamically populated)
- Columns: S.No, GRPO Number, Vendor Ref No, User, Vendor Name, Warehouse, Pending Days

**API:** `getOpenGrpos()`

---

### EximAccountPage (`src/pages/accounts/EximAccountPage.tsx`)

**Purpose:** View balance sheet data synced from SAP.

**Features:**
- Summary cards: Total parties, total receivable, total payable, net balance
- Color-coded balance display (green for receivable, red for payable)
- Sync button to fetch latest from SAP
- Export to CSV functionality
- Module-level caching of synced data (persists across navigation within session)
- Pagination

**API:** `syncBalanceSheet()`

---

### DomesticContractsPage (`src/pages/contracts/DomesticContractsPage.tsx`)

**Purpose:** Manage domestic purchase orders.

**Features:**
- Summary cards: Total Quantity (MTS), Total Value (₹), Average Rate (₹/MTS) — dynamically update based on active filters
- List of purchase orders with full details
- Sync all POs from SAP
- Sync individual PO by GRPO number
- Edit PO details (inline fields)
- Delete PO
- **Date range filter** (PO Date from/to) using native date inputs
- **Filter dropdowns** (Product, Vendor, Status) — values are dynamically derived from loaded data
- Text search across all fields (PO number, product, vendor, GRPO, invoice, transporter, etc.)
- "Clear filters" button when any filter is active
- Pagination
- Columns: PO Number, Date, Status, Product, Vendor, Contract Qty/Rate/Value, Load/Unload Qty, Transporter, Vehicle, GRPO details, Invoice, Amounts

**API:** `getPOs()`, `syncPOs()`, `syncSinglePO()`, `updatePO()`, `deletePO()`

---

### AdvanceLicensePage (`src/pages/license/AdvanceLicensePage.tsx`)

**Purpose:** Manage Advance License headers.

**Features:**
- List of license headers with key fields
- Create new license header (dialog form)
- Edit license header (dialog form)
- Delete license header (confirmation dialog)
- Click row to navigate to detail page
- Pagination
- Status badge (OPEN/CLOSE)

**API:** `getLicenseHeaders()`, `createLicenseHeader()`, `updateLicenseHeader()`, `deleteLicenseHeader()`

**Table Columns:** License No, Issue Date, Import Validity, Export Validity, Status, Import (MTS), Export (MTS), CIF INR, CIF USD, CIF Rate, FOB INR, FOB USD, FOB Rate, Actions

**Navigation:** Clicking a row navigates to `/license/advance-license/:licenseNo`

---

### AdvanceLicenseDetailPage (`src/pages/license/AdvanceLicenseDetailPage.tsx`)

**Purpose:** View and manage license lines for a specific Advance License.

**Features:**
- Header summary cards (issue date, import/export validity, status)
- License lines table
- Add new line (dialog form)
- Edit existing line (dialog form with pencil icon)
- Back button to license list

**URL Params:** `:licenseNo`

**API:** `getLicenseHeader()`, `createLicenseLine()`, `updateLicenseLine()`

**Line Table Columns:** #, BOE No, BOE Value (USD), Shipping Bill No, Date, SB Value (USD), Import (MTS), Export (MTS), Balance, Actions

**Line Form Fields:** boe_No, boe_value_usd, shipping_bill_no, date, sb_value_usd, import_in_mts, export_in_mts, balance

---

### DFIALicensePage (`src/pages/license/DFIALicensePage.tsx`)

**Purpose:** Manage DFIA License headers.

**Features:** Same pattern as AdvanceLicensePage but for DFIA licenses.

**API:** `getDFIALicenseHeaders()`, `createDFIALicenseHeader()`, `updateDFIALicenseHeader()`, `deleteDFIALicenseHeader()`

**Navigation:** Clicking a row navigates to `/license/dfia-license/:fileNo`

---

### DFIALicenseDetailPage (`src/pages/license/DFIALicenseDetailPage.tsx`)

**Purpose:** View and manage DFIA license lines.

**Features:** Same pattern as AdvanceLicenseDetailPage but for DFIA lines.

**URL Params:** `:fileNo`

**API:** `getDFIALicenseHeader()`, `createDFIALicenseLine()`, `updateDFIALicenseLine()`

**Line Table Columns:** #, BOE No, Shipping Bill No, Date, To Be Imported (MTS), Exported (MTS), Balance, SB Value (INR), Actions

**Line Form Fields:** boe_no, shipping_bill_no, date, to_be_imported_in_mts, exported_in_mts, balance, sb_value_inr

---

### UsersPage (`src/pages/administration/UsersPage.tsx`)

**Purpose:** Admin-only user management.

**Features:**
- List all users with name, email, role
- Create new user (name, email, password, role dropdown)
- Edit user (modify any field including role)
- Delete user (confirmation dialog)

**API:** `getUsers()`, `createUser()`, `updateUser()`, `deleteUser()`

---

### SyncRawMaterialDataPage (`src/pages/administration/SyncRawMaterialDataPage.tsx`)

**Purpose:** Admin page to view and sync raw material items from SAP.

**Features:**
- List of raw material items with all SAP fields
- "Sync All" button to bulk sync from SAP
- Sync individual item by code
- Delete individual items
- Variety filter (multi-select)
- Summary stats (total count, total qty, avg rate, total value)
- Pagination
- Listens for `rm-items-updated` event

**API:** `getRmItems()`, `syncRmItems()`, `syncSingleRmItem()`, `deleteRmItem()`, `getRmSummary()`, `getRmVarieties()`

---

### SyncFinishedGoodsDataPage (`src/pages/administration/SyncFinishedGoodsDataPage.tsx`)

**Purpose:** Admin page to view and sync finished goods items from SAP.

**Features:**
- Same pattern as SyncRawMaterialDataPage but for finished goods
- Listens for `fg-items-updated` event

**API:** `getFgItems()`, `syncFgItems()`, `syncSingleFgItem()`, `deleteFgItem()`

---

### SyncVendorDataPage (`src/pages/administration/SyncVendorDataPage.tsx`)

**Purpose:** Admin page to view and sync vendor/party data from SAP.

**Features:**
- List of vendors with card code, name, state, country, main group
- Sync individual vendor by code
- Delete vendor
- Listens for `vendors-updated` event

**API:** `getVendors()`, `syncVendor()`, `deleteVendor()`

---

### SyncLogsPage (`src/pages/administration/SyncLogsPage.tsx`)

**Purpose:** View history of all SAP sync operations.

**Features:**
- Read-only table of sync logs
- Status badges: FLD=Failed (destructive), SUC=Success (default), RUN=Running (secondary)
- Sync type codes: PRT=Party, ITM=Item
- Error message dialog for viewing full error details
- Pagination

**API:** `getSyncLogs()`

---

### StockUpdationLogsPage (`src/pages/administration/StockUpdationLogsPage.tsx`)

**Purpose:** Audit trail for stock status changes.

**Features:**
- Read-only table of stock update logs
- **Grouped display:** Logs are grouped by stock_id + updated_by + timestamp (within 2 seconds) to show all field changes for a single update operation together
- Columns: stock ID (badge), updated by, updated at, changes (field -> old -> new format)
- Pagination

**API:** `getStockLogs()`

---

## Common Page Patterns

### CRUD Dialog Pattern

Most pages follow this pattern for create/edit operations:

```typescript
// State
const [dialogOpen, setDialogOpen] = useState(false);
const [form, setForm] = useState<FormType>(emptyForm);
const [formError, setFormError] = useState("");
const [saving, setSaving] = useState(false);

// Handler
async function handleSave() {
  setSaving(true);
  setFormError("");
  try {
    await apiCall(form);
    setDialogOpen(false);
    fetchData();  // refresh list
  } catch (err) {
    // Extract error from AxiosError response
    if (err instanceof AxiosError) {
      const data = err.response?.data;
      // Parse field-level errors: { field: ["error1"] }
      // or string errors
    }
  } finally {
    setSaving(false);
  }
}
```

### Error Handling in Dialogs

API validation errors from Django (typically `{ field_name: ["Error message"] }`) are parsed and displayed as a single string:

```
field1: Error message 1; field2: Error message 2
```

### Pagination Pattern

Pages with long lists use client-side pagination:

```typescript
const [page, setPage] = useState(1);
const perPage = 20;
const totalPages = Math.ceil(items.length / perPage);
const paged = items.slice((page - 1) * perPage, page * perPage);
```

### Loading State Pattern

Tables show skeleton placeholders during loading:

```tsx
{loading ? (
  <TableBody>
    {Array.from({ length: 3 }).map((_, i) => (
      <TableRow key={i}>
        {columns.map((col) => (
          <TableCell key={col}><Skeleton className="h-4 w-20" /></TableCell>
        ))}
      </TableRow>
    ))}
  </TableBody>
) : (
  // actual data
)}
```

### Custom Event Pattern

Some pages communicate via `window` custom events:

```typescript
// Dispatch (e.g., after deleting from Navbar search)
window.dispatchEvent(new Event("rm-items-updated"));

// Listen (e.g., in SyncRawMaterialDataPage)
useEffect(() => {
  const handler = () => fetchData();
  window.addEventListener("rm-items-updated", handler);
  return () => window.removeEventListener("rm-items-updated", handler);
}, []);
```

Events: `rm-items-updated`, `fg-items-updated`, `vendors-updated`, `tank-items-updated`
