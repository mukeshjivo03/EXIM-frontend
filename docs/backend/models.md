# Backend Models

All models are defined in their respective app's `models.py`. Database tables use custom names (specified via `Meta.db_table`).

---

## accounts.User

Custom user model extending `AbstractBaseUser`.

**Table:** `users`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `email` | EmailField | unique | Login identifier |
| `name` | CharField | max_length=100 | Display name |
| `role` | CharField | choices: ADM/MNG/FTR | User role |
| `is_active` | BooleanField | default=True | Account active flag |
| `is_staff` | BooleanField | default=False | Django admin access |

**Notes:**
- Uses `email` as `USERNAME_FIELD` (not username)
- Custom `UserManager` for `create_user()` and `create_superuser()`
- No `username` field

---

## sap_sync.RMProducts

Raw Material products synced from SAP.

**Table:** `rm_goods`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `item_code` | CharField | unique | SAP item code (PK identifier) |
| `item_name` | CharField | | Product name |
| `category` | CharField | | Product category |
| `sal_factor2` | CharField | | Sales factor |
| `u_tax_rate` | DecimalField | | Tax rate |
| `deleted` | CharField | | Deletion flag from SAP |
| `u_variety` | CharField | nullable | Variety (e.g., oil type) |
| `sal_pack_un` | CharField | | Sales packing unit |
| `u_brand` | CharField | | Brand name |
| `u_unit` | CharField | | Unit of measure |
| `u_sub_group` | CharField | | Sub-group classification |
| `total_trans_value` | DecimalField | | Total transaction value |
| `total_in_qty` | DecimalField | | Total inward quantity |
| `total_out_qty` | DecimalField | | Total outward quantity |
| `total_qty` | DecimalField | | Net quantity (in - out) |
| `rate` | DecimalField | | Current rate |

---

## sap_sync.FGProducts

Finished Goods products synced from SAP.

**Table:** `fg_goods`

Same structure as `RMProducts` but without financial fields (`total_trans_value`, `total_in_qty`, `total_out_qty`, `total_qty`, `rate`).

---

## sap_sync.Party

Vendors/suppliers synced from SAP.

**Table:** `Party`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `card_code` | CharField | unique | SAP vendor code |
| `card_name` | CharField | | Vendor/party name |
| `state` | CharField | | State/province |
| `u_main_group` | CharField | | Main group classification |
| `country` | CharField | | Country |

---

## sap_sync.DomesticContracts

Purchase orders synced from SAP.

**Table:** `domestic_contracts`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `po_number` | CharField | | Purchase order number |
| `po_date` | DateField | nullable | PO date |
| `status` | CharField | | Order status |
| `product_code` | CharField | | SAP product code |
| `product_name` | CharField | | Product name |
| `vendor` | CharField | | Vendor name |
| `contract_qty` | DecimalField | nullable | Contracted quantity |
| `contract_rate` | DecimalField | nullable | Contracted rate |
| `contract_value` | DecimalField | nullable | Total contract value |
| `load_qty` | DecimalField | nullable | Loaded quantity |
| `unload_qty` | DecimalField | nullable | Unloaded quantity |
| `allowance` | DecimalField | nullable | Allowance |
| `transporter` | CharField | nullable | Transporter name |
| `vehicle_no` | CharField | nullable | Vehicle number |
| `bilty_no` | CharField | nullable | Transport receipt number |
| `bilty_date` | DateField | nullable | Transport receipt date |
| `grpo_no` | CharField | | Goods Receipt PO number |
| `grpo_date` | DateField | nullable | GRPO date |
| `invoice_no` | CharField | | Invoice number |
| `basic_amount` | DecimalField | nullable | Basic amount |
| `landed_cost` | DecimalField | nullable | Landed cost |
| `net_amount` | DecimalField | nullable | Net amount |

**Constraints:** `unique_together = (po_number, grpo_no)`

---

## sap_sync.syncLogs

Audit trail for all SAP sync operations.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `sync_type` | CharField | choices | `PRT` (Parties), `PRD` (Products), `DMC` (Domestic Contracts) |
| `status` | CharField | choices | `STR` (Started), `FLD` (Failed), `SCS` (Success) |
| `triggered_by` | CharField | | User who triggered sync |
| `started_at` | DateTimeField | auto_now_add | Sync start time |
| `completed_at` | DateTimeField | nullable | Sync completion time |
| `error_message` | TextField | blank | Error details if failed |
| `records_processed` | IntegerField | default=0 | Total records processed |
| `records_created` | IntegerField | default=0 | New records created |
| `records_updated` | IntegerField | default=0 | Existing records updated |

---

## stock.StockStatus

Individual stock inventory entries tracking goods through the supply chain.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `item_code` | ForeignKey | -> RMProducts | Raw material item |
| `vendor_code` | ForeignKey | -> Party | Vendor/supplier |
| `status` | CharField | 14 choices | Current location/state |
| `rate` | DecimalField | | Price per unit |
| `quantity` | DecimalField | | Quantity (KG) |
| `quantity_in_litre` | DecimalField | default=0.00 | Quantity in liters (auto-calculated) |
| `total` | DecimalField | auto-calculated | `rate * quantity` |
| `vehicle_number` | CharField | nullable | Vehicle number |
| `location` | CharField | nullable | Current location |
| `eta` | CharField | nullable | Estimated time of arrival |
| `transporter_name` | CharField | nullable | Transporter name |
| `created_at` | DateTimeField | auto_now_add | Creation timestamp |
| `created_by` | CharField | | Creator's name |
| `deleted` | BooleanField | default=False | Soft-delete flag |

### Additional Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `parent` | ForeignKey | self, nullable | Parent stock entry (FIFO tree structure) |
| `is_accumulator` | BooleanField | default=False | Marks a batch aggregator record |
| `remainder_action` | CharField | nullable | `RETAIN` / `TOLERATE` / `DEBIT` — how to handle leftover qty |
| `job_work` | CharField | nullable | Job work vendor (used when status=AT_REFINERY) |

### Status Choices

```
OUT_SIDE_FACTORY    - Outside factory premises
ON_THE_WAY          - In transit (generic)
UNDER_LOADING       - Being loaded
AT_REFINERY         - At refinery for job work
OTW_TO_REFINERY     - On the way to refinery
KANDLA_STORAGE      - At Kandla port storage
MUNDRA_PORT         - At Mundra port
ON_THE_SEA          - In sea transit (import)
IN_CONTRACT         - Under contract
COMPLETED           - Completed (ready for tank inward)
DELIVERED           - Delivered
IN_TANK             - In tank (set by inward operation)
IN_TRANSIT          - In transit
PENDING             - Pending
PROCESSING          - Being processed
```

### Auto-Behaviors

- `total` = `rate × quantity` (recalculated on every save)
- `quantity_in_litre` = `quantity × 1.0989` (recalculated on every save)
- Field changes (`status`, `rate`, `quantity`) are logged to `StockStatusUpdateLog`
- On create, a log entry with `field_name="CREATED"` is recorded
- If `status=AT_REFINERY` and `item_code=RM0CDRO`: quantity is auto-reduced by 3% and item code is converted to `RM00C01`

---

## stock.DebitEntry

Records explicit loss or damage against a stock entry.

**Table:** `stock_debit_entries`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `stock` | ForeignKey | -> StockStatus, related='debits', nullable | The stock entry that incurred loss |
| `quantity` | DecimalField | 10,2 | Lost/damaged quantity |
| `rate` | DecimalField | 10,2 | Rate at time of loss |
| `total` | DecimalField | 20,2, auto | `rate × quantity` (auto-calculated) |
| `responsible_party` | ForeignKey | -> Party, nullable | Vendor responsible for the loss |
| `reason` | CharField | nullable | Reason for debit |
| `created_at` | DateTimeField | auto_now_add | Record creation time |
| `created_by` | CharField | | User who created the debit |

---

## stock.StockStatusUpdateLog

Audit trail for stock status changes.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `stock_id` | ForeignKey | -> StockStatus | Related stock entry |
| `field_name` | CharField | | Field that changed (`status`, `rate`, `quantity`, `CREATED`) |
| `old_value` | CharField | | Previous value |
| `new_value` | CharField | | New value |
| `updated_at` | DateTimeField | auto_now_add | Change timestamp |
| `updated_by` | CharField | | User who made the change |

---

## tank.TankItem

Tank commodity types (what can be stored in tanks).

**Table:** `tank_item`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `tank_item_code` | CharField | unique, PK | Item code (e.g., from RM items) |
| `tank_item_name` | CharField | | Display name |
| `is_active` | BooleanField | default=True | Active flag |
| `created_at` | DateTimeField | auto_now_add | Creation time |
| `created_by` | CharField | | Creator |
| `color` | CharField | | Hex color for UI display |

---

## tank.TankData

Individual tank records.

**Table:** `tank_data`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `tank_code` | CharField | PK, auto-generated | Format: `TNK001`, `TNK002`, etc. |
| `item_code` | ForeignKey | -> TankItem, nullable | Assigned commodity |
| `tank_capacity` | DecimalField | | Maximum capacity (liters) |
| `current_capacity` | DecimalField | nullable | Current fill level |
| `is_active` | BooleanField | default=True | Active flag |
| `created_at` | DateTimeField | auto_now_add | Creation time |
| `updated_at` | DateTimeField | auto_now | Last update time |

### Auto-Behaviors

- `tank_code` is auto-generated on create using atomic `select_for_update()` to get the next sequential code
- Format: `TNK` + 3-digit zero-padded number (e.g., `TNK001`, `TNK042`)

---

## tank.TankLayer

FIFO layers tracking stock entries added to tanks.

**Table:** `tank_layer`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `tank_code` | ForeignKey | -> TankData | Parent tank |
| `stock_status` | ForeignKey | -> StockStatus | Source stock entry |
| `item_code` | ForeignKey | -> TankItem | Commodity in this layer |
| `vendor` | ForeignKey | -> Party | Vendor of this stock |
| `rate` | DecimalField | | Rate at time of inward |
| `quantity_added` | DecimalField | nullable | Original quantity when layer was created |
| `quantity_remaining` | DecimalField | nullable | Remaining quantity in this layer |
| `is_exhausted` | BooleanField | default=False | True when layer is fully consumed |
| `created_at` | DateTimeField | nullable | Layer creation time |
| `created_by` | CharField | nullable | User who created the layer |

---

## tank.TankLog

Audit trail for tank inward/outward/transfer operations.

**Table:** `tank_logs`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `log_type` | CharField | choices: INWARD/OUTWARD/TRANSFER | Operation type |
| `quantity` | DecimalField | | Quantity moved |
| `stock_status` | ForeignKey | -> StockStatus, nullable | Source stock entry (inward) |
| `tank_layer` | ForeignKey | -> TankLayer, nullable | Source layer reference (transfer) |
| `destination_tank` | ForeignKey | -> TankData, nullable | Destination tank (transfer only) |
| `vehicle_number` | CharField | nullable | Vehicle number |
| `rate` | DecimalField | nullable | Rate snapshot |
| `party` | CharField | nullable | Party/vendor name snapshot |
| `remarks` | TextField | nullable | Operation notes |
| `created_at` | DateTimeField | auto_now_add | Operation timestamp |
| `created_by` | CharField | | User who performed operation |

**Note:** `tank_code` is not a FK — it's stored as a CharField snapshot on the log.

---

## tank.TankLogConsumption

Per-layer FIFO cost trail for outward and transfer operations.

**Table:** `tank_log_consumption`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `tank_log` | ForeignKey | -> TankLog, related='consumptions' | Parent log entry |
| `tank_layer` | ForeignKey | -> TankLayer, related='consumptions' | Consumed layer |
| `quantity_consumed` | DecimalField | | Quantity consumed from this layer |
| `rate` | DecimalField | | Rate snapshot at consumption time |
| `created_at` | DateTimeField | auto_now_add | Consumption timestamp |

---

## daily_price.DailyPrice

Daily commodity prices fetched from Google Sheets.

**Table:** `daily_prices`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `commodity_name` | CharField | max_length=125 | Commodity name |
| `factory_price` | DecimalField | 6,2 | Factory price per kg |
| `packing_cost_kg` | DecimalField | 6,2 | Packing cost per kg |
| `with_gst_kg` | DecimalField | 6,2 | Price with GST per kg |
| `with_gst_ltr` | DecimalField | 6,2 | Price with GST per liter |
| `date` | DateField | | Price date |
| `created_by` | CharField | max_length=50 | User who saved |

**Constraints:** `unique_together = (commodity_name, date)`

---

## daily_price.JivoRates

Jivo brand commodity rates by pack type, fetched from Google Sheets.

**Table:** `jivo_rates`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `pack_type` | CharField | max_length=125, nullable | Pack size/type (e.g., "Pouch 1L", "750Gm") |
| `commodity` | CharField | max_length=125, nullable | Commodity name |
| `rate` | DecimalField | 10,3, nullable | Rate in INR |
| `date` | DateField | | Rate date |
| `created_by` | CharField | max_length=50 | User who saved |

---

## license.AdvanceLicenseHeaders

Advance License document headers.

**Table:** `advance_license_headers`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `license_no` | CharField | unique, PK | License number |
| `issue_date` | DateField | | Issue date |
| `import_validity` | DateField | | Import validity date |
| `export_validity` | DateField | | Export validity date |
| `import_in_mts` | DecimalField | | Import quantity (metric tons) |
| `cif_value_inr` | DecimalField | | CIF value in INR |
| `cif_value_usd` | DecimalField | | CIF value in USD (auto-calculated) |
| `cif_exchange_rate` | DecimalField | | CIF exchange rate |
| `export_in_mts` | DecimalField | | Export quantity (metric tons) |
| `fob_value_inr` | DecimalField | | FOB value in INR |
| `fob_value_usd` | DecimalField | | FOB value in USD (auto-calculated) |
| `fob_exhange_rate` | DecimalField | | FOB exchange rate (note: typo in field name) |
| `status` | CharField | choices: OPEN/CLOSE | License status |

### Auto-Behaviors

- `cif_value_usd` = `cif_value_inr / cif_exchange_rate` (calculated on save)
- `fob_value_usd` = `fob_value_inr / fob_exhange_rate` (calculated on save)

---

## license.AdvanceLicenseLines

Line items for Advance Licenses.

**Table:** `advance_license_lines`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `license_no` | ForeignKey | -> AdvanceLicenseHeaders | Parent license |
| `boe_No` | CharField | | Bill of Entry number (note: camelCase) |
| `boe_value_usd` | DecimalField | | BOE value in USD |
| `shipping_bill_no` | CharField | | Shipping bill number |
| `date` | DateField | | Line date |
| `sb_value_usd` | DecimalField | | Shipping bill value in USD |
| `import_in_mts` | DecimalField | | Import quantity (MTS) |
| `export_in_mts` | DecimalField | | Export quantity (MTS) |
| `balance` | DecimalField | | Balance |

---

## license.DFIALicenseHeader

DFIA License document headers.

**Table:** `dfia_license_header`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `file_no` | CharField | unique, PK | File number |
| `issue_date` | DateField | | Issue date |
| `export_validity` | DateField | | Export validity |
| `export_in_mts` | DecimalField | | Export quantity (MTS) |
| `fob_value_inr` | DecimalField | | FOB value in INR |
| `fob_value_usd` | DecimalField | | FOB value in USD (auto-calculated) |
| `fob_exchange_rate` | DecimalField | | FOB exchange rate |
| `import_validity` | DateField | | Import validity |
| `import_in_mts` | DecimalField | | Import quantity (MTS) |
| `cif_value_inr` | DecimalField | | CIF value in INR |
| `cif_value_usd` | DecimalField | | CIF value in USD (auto-calculated) |
| `cif_exchange_rate` | DecimalField | | CIF exchange rate |
| `status` | CharField | | License status |

### Auto-Behaviors

- Bidirectional USD/INR calculation on save:
  - If INR provided: `usd = inr / exchange_rate`
  - If USD provided: `inr = usd * exchange_rate`

---

## license.DFIALicenseLines

Line items for DFIA Licenses.

**Table:** `dfia_license_lines`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `license_no` | ForeignKey | -> DFIALicenseHeader | Parent license |
| `boe_no` | CharField | | Bill of Entry number |
| `shipping_bill_no` | CharField | | Shipping bill number |
| `date` | DateField | | Line date |
| `to_be_imported_in_mts` | DecimalField | | Quantity to be imported (MTS) |
| `exported_in_mts` | DecimalField | | Exported quantity (MTS) |
| `balance` | DecimalField | | Balance |
| `sb_value_inr` | DecimalField | | Shipping bill value in INR |

---

## contracts.DomesticReports

Form-based domestic contract workflow (separate from SAP-synced `DomesticContracts`). Created manually in three steps: contract → loading → freight.

**Table:** `contracts`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `status` | CharField | choices | `CONTRACT` / `PO` / `MAIL_APPROVAL` / `PAYMENT` / `TPT/LOADING` / `IN_TRANSIT` / `FACTORY` / `RECIEVED` |
| `product_code` | CharField | max_length=20 | Product code |
| `vendor_code` | CharField | max_length=50 | Vendor code |
| `po_number` | CharField | max_length=50 | Purchase order number |
| `po_date` | DateField | | PO date |
| **Form 1 — Contract** | | | |
| `contract_qty` | DecimalField | | Contracted quantity |
| `contract_rate` | DecimalField | | Contracted rate |
| `contract_total` | DecimalField | auto | `contract_qty × contract_rate` |
| **Form 2 — Loading** | | | |
| `load_qty` | DecimalField | | Loaded quantity (KG) |
| `unload_qty` | DecimalField | | Unloaded quantity (KG) |
| `shortage` | DecimalField | auto | `load_qty - unload_qty` |
| `allow_shortage` | DecimalField | auto | `0.25 × load_qty` |
| `deduction_qty` | DecimalField | auto | `max(shortage - allow_shortage, 0)` |
| `deduction_amount` | DecimalField | auto | `(deduction_qty ÷ 1000) × contract_rate` |
| `basic_amount` | DecimalField | auto | `load_qty × contract_rate` |
| **Form 3 — Freight** | | | |
| `transporter_code` | CharField | | Transporter SAP code |
| `transporter_name` | CharField | | Transporter name |
| `bility_number` | CharField | | Bill of lading number |
| `bility_date` | DateField | | Bill of lading date |
| `frieght_rate` | DecimalField | | Freight rate (note: typo in field name) |
| `freight_amount` | DecimalField | auto | `unload_qty × frieght_rate` |
| `grpo_date` | DateField | | GRPO date |
| `grpo_number` | CharField | | GRPO number |
| `brokerage_rate` | DecimalField | | Brokerage rate |
| `brokerage_amount` | DecimalField | auto | Auto-calculated from brokerage_rate |
| `vehicle_number` | CharField | | Vehicle number |
| `invoice_number` | CharField | | Invoice number |
| **Meta** | | | |
| `created_by` | CharField | max_length=50 | Creator |
| `created_at` | DateTimeField | auto_now_add | Creation time |
| `deleted` | IntegerField | default=0 | Soft-delete flag |
| `Completed` | IntegerField | default=0 | Completion flag |

---

## Entity Relationship Diagram

```
User (accounts)
  +-- role: ADM/MNG/FTR

RMProducts (sap_sync)         Party (sap_sync)
  |                              |
  +--< StockStatus (stock) >----+
         |    |
         |    +--< StockStatusUpdateLog (stock)
         |    +--< DebitEntry (stock) >---- Party
         |
         +--< TankLayer (tank) <---+
                                    |
TankItem (tank)                    |
  |                                |
  +--< TankData (tank)             |
         |                         |
         +--< TankLayer (tank) >--+
         |         (FIFO layers, oldest-first consumption)
         |
         +--< TankLog (tank)
                |    +-- destination_tank -> TankData (transfer)
                |    +-- stock_status -> StockStatus (inward)
                |
                +--< TankLogConsumption (tank)
                         +-- tank_layer -> TankLayer

AdvanceLicenseHeaders (license)
  +--< AdvanceLicenseLines (license)

DFIALicenseHeader (license)
  +--< DFIALicenseLines (license)

DomesticContracts (sap_sync)   -- synced from SAP, read/update only
DomesticReports (contracts)    -- manually created (3-step form)

syncLogs (sap_sync)            -- SAP sync audit trail

DailyPrice (daily_price)       -- fetched from Google Sheets
JivoRates (daily_price)        -- fetched from Google Sheets
```
