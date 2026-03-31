# Backend Services & Business Logic

---

## SAP Integration (`sap_sync/services/`)

### Connection (`connections.py`)

Connects to SAP via an intermediate MSSQL server:

```
Django  --(pymssql)-->  MSSQL Server (103.89.45.75)  --(OPENQUERY)-->  SAP HANA (HANADB112)
                        Database: Jivo_All_Branches_Live
```

- Uses a context manager for safe connection handling
- Connection credentials are hardcoded in the service file
- All SAP queries use `OPENQUERY(HANADB112, '...')` syntax

### Product Sync (`ProductServices`)

**`syncRMProducts()`** - Bulk sync all raw material products:
1. Creates a `syncLogs` entry (status=Started)
2. Runs OPENQUERY against SAP HANA joining OITM (items) + OINM (inventory movements)
3. Filters: `u_sub_group = 'Edible Oil'`, category = `'101' or '102'`
4. Aggregates: total transaction value, inward/outward quantities, net qty, rate
5. Uses `update_or_create` for each item (upsert)
6. Tracks created vs updated counts
7. Updates `syncLogs` on completion (success or failure)
8. Batch size: 1000

**`syncFGProducts()`** - Similar to RM but:
- Queries OITM only (no inventory movements)
- Filters: category = `'101' or '102'`, different sub-groups

**`syncRMProduct(itemCode)` / `syncFGProduct(itemCode)`** - Single item sync:
- Same SAP query but filtered by specific `ItemCode`
- Returns the single synced item

### Party Sync (`PartyServices`)

**`syncParty(cardCode)`** - Sync single vendor:
1. Queries OCRD (SAP vendor master) by card_code
2. Uses `update_or_create` to upsert
3. Logs to `syncLogs`

### Purchase Order Sync (`POService`)

**`syncPOs()`** - Bulk sync purchase orders:
1. Complex OPENQUERY joining 7+ SAP tables (OPDN, PDN1, POR1, OPOR, PCH1, OPCH, IPF1)
2. Filters: post 2025-03-31, RM items only
3. Uses `bulk_create` with `update_conflicts` for efficient upsert
4. Deduplicates by `(po_number, grpo_no)` unique key

**`syncPO(grpo_no)`** - Single PO sync by GRPO number

### Balance Sheet (`BalanceSheetService`)

**`syncBalanceSheet()`** - Fetch vendor balances:
1. Complex SQL with CTEs (Common Table Expressions)
2. Gets latest transaction date and amount per vendor
3. Calculates running balance
4. Returns array of vendor balance entries
5. Does NOT persist to database (returned directly to frontend)

### Open GRPOs (`GRPOServices`)

**`syncGRPOS()`** - Fetch pending GRPOs from SAP:
1. Queries SAP for Goods Receipt POs that have not been invoiced
2. Returns list of `{ GRPO Number, Vendor Ref No, User Name, Vendor Name, Warehouse, Pending Days }`
3. `Pending Days` is calculated from the GRPO date to today
4. Does NOT persist to database (returned directly to frontend)

---

## Stock Dashboard Logic (`stock/views.py`)

### `StockDashboard` View

The most complex view, combining data from multiple sources:

**IN_FACTORY data:**
- Source: `TankData` model (not StockStatus!)
- Groups by `item_code`, sums `current_capacity`
- This represents goods physically in factory tanks

**OUTSIDE_FACTORY data:**
- Source: `StockStatus` where `status='OUT_SIDE_FACTORY'` and `deleted=False`
- Groups by `item_code`, sums `quantity`

**ALL OTHER STATUSES:**
- Source: `StockStatus` where status is not IN_FACTORY/OUT_SIDE_FACTORY and `deleted=False`
- Groups by `(status, vendor_name)` creating composite keys like `"ON_THE_SEA__Vendor A"`
- Each item gets a `status_data` dict mapping these composite keys to quantities

**Response structure:**
- `status_vendors`: ordered dict of status -> [vendor names], maintaining consistent column order
- `items`: list with per-item breakdown across all columns
- `totals`: column sums for the footer row

---

## Stock Auto-Logging (`stock/models.py`)

The `StockStatus.save()` method automatically tracks changes:

```python
def save(self, *args, **kwargs):
    self.total = self.rate * self.quantity  # auto-calculate

    if self.pk:  # update
        old = StockStatus.objects.get(pk=self.pk)
        for field in ['status', 'rate', 'quantity']:
            if getattr(old, field) != getattr(self, field):
                StockStatusUpdateLog.objects.create(
                    stock_id=self, field_name=field,
                    old_value=str(getattr(old, field)),
                    new_value=str(getattr(self, field)),
                    updated_by=self.created_by
                )
    else:  # create
        super().save(...)
        StockStatusUpdateLog.objects.create(
            stock_id=self, field_name='CREATED',
            old_value='', new_value='New Record',
            updated_by=self.created_by
        )
```

---

## Stock Insights Calculation (`stock/views.py`)

The `StockStatusInsights` view computes:

```python
avg_price_per_kg = total_value / total_qty
avg_price_per_ltr = total_value / (total_qty * 0.92)  # kg to liter conversion
```

The `0.92` factor is the density conversion for edible oils (kg to liters).

---

## Tank FIFO Rate Breakdown (`tank/views.py`)

### `TankRateBreakdownView`

Returns the active FIFO layers per tank with weighted average rate:

1. Queries all non-exhausted `TankLayer` records per tank (`is_exhausted=False`)
2. For each layer: collects `rate`, `quantity_remaining`, `vendor`, `item`
3. Calculates `weighted_avg_rate = sum(rate × qty_remaining) / sum(qty_remaining)`
4. Returns per-tank breakdown with vendor attribution

### `TankStatusView` (`/tank/layers/{tank_code}/`)

Returns active layers with cost breakdown for a single tank — same logic as above but scoped to one tank.

### `ItemWiseAverage` (`/tank/item-wise-average/`)

Calculates the weighted average cost per commodity across all IN_TANK stock records:

```
avg_cost(item) = sum(rate × quantity) / sum(quantity)
                 for all StockStatus where status=IN_TANK and item_code=item
```

---

## Tank Code Generation (`tank/models.py`)

Auto-generates sequential tank codes atomically:

```python
def save(self, *args, **kwargs):
    if not self.tank_code:
        with transaction.atomic():
            last = TankData.objects.select_for_update().order_by('-tank_code').first()
            if last:
                num = int(last.tank_code.replace('TNK', '')) + 1
            else:
                num = 1
            self.tank_code = f'TNK{num:03d}'
    super().save(...)
```

Uses `select_for_update()` to prevent race conditions.

---

## Daily Price Fetching (`daily_price/services.py`)

### `fetch_table_manually()`

Fetches commodity prices from a published Google Sheets CSV:

1. **Source**: Google Sheets published as CSV (specific sheet gid=655973128)
2. **Parsing**:
   - Downloads CSV via HTTP GET
   - Finds the "Commodities" anchor row
   - Reads 12 commodity rows after the anchor
   - Skips alternating columns (thin separator columns in the sheet)
   - Extracts: commodity name, factory price/kg, packing cost/kg, GST/kg, GST/ltr
3. **Cleaning**: Removes commas from decimal values, handles empty values
4. **Returns**: List of `CommodityPrice` dicts with today's date

### Save Logic (`views.py`)

On POST to `/daily-price/fetch/`:
1. Fetches prices using `fetch_table_manually()`
2. For each commodity: `update_or_create` by `(commodity_name, date)`
3. This allows re-fetching on the same day to update values

### `fetch_jivo_rates(creator_name='System')`

Fetches Jivo brand rates from the same Google Sheets CSV:

1. **Source**: Same published CSV as daily prices
2. **Parsing**:
   - Finds the "JIVO RATE" anchor row
   - Extracts pack types as columns (e.g., Pouch 1L, 750Gm, 700Gm, Bottle 1L, Tins)
   - Commodity aliases: SOYA, Mustard, Sunflower, Cotton Refined, Ricebran Refined
   - Builds (commodity, pack_type, rate) tuples
3. **Returns**: List of `JivoRateItem` dicts with today's date

On POST to `/jivo-rate/fetch`:
- Calls `fetch_jivo_rates(created_by)`
- Bulk-inserts via `JivoRates.objects.create()` for each entry

---

## License Auto-Calculations (`license/models.py`)

### Advance License Headers

On save, automatically calculates USD values:

```python
def save(self, *args, **kwargs):
    if self.cif_exchange_rate and self.cif_value_inr:
        self.cif_value_usd = self.cif_value_inr / self.cif_exchange_rate
    if self.fob_exhange_rate and self.fob_value_inr:
        self.fob_value_usd = self.fob_value_inr / self.fob_exhange_rate
    super().save(...)
```

### DFIA License Headers

Bidirectional conversion:

```python
def save(self, *args, **kwargs):
    # If INR provided, calculate USD
    if self.fob_exchange_rate and self.fob_value_inr:
        self.fob_value_usd = self.fob_value_inr / self.fob_exchange_rate
    # If USD provided (and no INR), calculate INR
    elif self.fob_exchange_rate and self.fob_value_usd:
        self.fob_value_inr = self.fob_value_usd * self.fob_exchange_rate
    # Same for CIF...
    super().save(...)
```

---

## Stock State Machine Services (`stock/services.py`)

These functions implement the stock movement workflow. They are called by `ArriveBatch`, `Dispatch`, and `MoveView`.

### `arrive_batch(otw_record, weighed_qty, created_by, action, destination_status)`

Records the physical arrival of a shipment:

1. Converts input quantity from litres → KG (`÷ 1.0989`)
2. Looks for an existing accumulator with the same `parent` + `destination_status`
3. If found: adds quantity to the accumulator; if not: creates a new accumulator record with `is_accumulator=True`
4. Handles remainder on the OTW record:
   - `RETAIN`: adds leftover quantity back to parent storage record
   - `TOLERATE`: ignores any difference (quantity is lost/within tolerance)
   - `DEBIT`: creates a `DebitEntry` for the difference
5. Deletes the OTW record
6. Returns the updated accumulator

### `dispatch(source, quantity, status, created_by, action)`

Dispatches a quantity from a source record into a new status record:

1. Reduces `source.quantity` by the dispatched amount
2. Creates a new `StockStatus` child record with the given `status`
3. If source quantity reaches 0 and action is `TOLERATE`/`DEBIT`: handles accordingly
4. Links the new record to source via `parent` FK

### `move(source, new_quantity, action, new_status, created_by)`

Moves an entire (or partial) stock record to a new status:

1. Updates `source.quantity` to `new_quantity`
2. Updates `source.status` to `new_status`
3. If `action == RETAIN`: calculates the difference and adds it back to the parent record

---

## Tank Inward/Outward/Transfer Operations (`tank/services.py`)

### `TankService.inward(tank_code, stock_status_id, quantity, created_by)`

1. Validates: tank has space, stock entry is `COMPLETED`, item codes match (or tank is empty), quantity ≤ stock quantity
2. If partial quantity: creates a new `OUT_SIDE_FACTORY` remainder record with the leftover
   - Remainder KG = leftover litres `÷ 1.0989`
3. Creates a `TankLayer` (rate, vendor, item, quantity_added, quantity_remaining)
4. Updates `TankData.current_capacity` (+=quantity) and sets `item_code` if empty
5. Changes source `StockStatus.status` → `IN_TANK`
6. Creates `TankLog` with `log_type=INWARD`

### `TankService.outward(tank_code, quantity, created_by, remarks)`

1. Validates tank has oil and quantity ≤ current_capacity
2. Creates `TankLog` with `log_type=OUTWARD`
3. FIFO consumption: walks `TankLayer` records ordered by `id` (oldest first)
   - For each layer: consumes what's needed, reduces `quantity_remaining`, sets `is_exhausted=True` when fully consumed
   - Creates one `TankLogConsumption` per layer touched
4. Updates `TankData.current_capacity` (-=quantity)
5. If tank fully drained: clears `item_code` from `TankData`

### `TankService.transfer(source_tank_code, dest_tank_code, quantity, created_by)`

1. Validates: source has oil, dest has space, item codes match (or dest empty), source ≠ dest
2. Creates `TankLog` with `log_type=TRANSFER` referencing both tanks
3. FIFO consumption on source (same as outward — walks layers, creates `TankLogConsumption`)
4. Creates new `TankLayer` records in destination (same rate/vendor/item as consumed layers, proportional quantities)
5. Updates both `TankData.current_capacity` values

### Auto-Clear Item on Empty

When `TankService.outward()` fully drains a tank, `item_code` is automatically cleared from `TankData`. The frontend also calls `updateTank()` as a UI-side safety check.

---

## Domestic Contract Auto-Calculations (`contracts/serializers.py`)

The `LoadingSerializer` auto-calculates on PUT to `/dc/loading/create/{id}/`:

```
shortage        = load_qty - unload_qty
allow_shortage  = 0.25 × load_qty
deduction_qty   = max(shortage - allow_shortage, 0)
deduction_amount = (deduction_qty ÷ 1000) × contract_rate
basic_amount    = load_qty × contract_rate
```

The `FreightSerializer` auto-calculates on PUT to `/dc/freight/create/{id}/`:

```
freight_amount   = unload_qty × frieght_rate
brokerage_amount = auto-calculated from brokerage_rate
```

---

## Stock AT_REFINERY Auto-Reduction (`stock/models.py`)

When a stock entry is saved with `status=AT_REFINERY` and `item_code=RM0CDRO`:

1. Quantity is automatically reduced by **3%** (refinery processing loss)
2. `item_code` is automatically changed to `RM00C01` (refined output product)
3. This fires on every save when the condition is met

---

## Soft Delete Pattern (`stock/`)

Stock entries use soft-delete (not hard delete):

- `deleted` field is a BooleanField (default=False)
- Frontend sends PATCH with `{ deleted: true }` only
- All list queries filter `deleted=False`
- No hard DELETE endpoint exists for stock status

---

## Key Constants

### Oil Density Factor

```python
KG_TO_LTR = 0.92  # Used in stock insights for avg_price_per_ltr calculation
```

### Sync Type Codes

| Code | Meaning |
|------|---------|
| `PRT` | Parties/Vendors |
| `PRD` | Products (RM/FG) |
| `DMC` | Domestic Contracts |

### Sync Status Codes

| Code | Meaning |
|------|---------|
| `STR` | Started |
| `FLD` | Failed |
| `SCS` | Success |
