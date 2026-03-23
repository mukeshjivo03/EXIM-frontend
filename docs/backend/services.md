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
avg_price_per_ltr = total_value / (total_qty * 1.0989)  # kg to liter conversion
```

The `1.0989` factor is the conversion for edible oils (1 kg = 1.0989 liters).

---

## Tank FIFO Rate Breakdown (`tank/views.py`)

### `TankRateBreakdownView`

Calculates the weighted average rate for each tank using FIFO allocation:

1. **Get completed stocks**: Query `StockStatusUpdateLog` for entries where `field_name='status'` and `new_value='COMPLETED'`
2. **Get completion dates**: Map each stock_id to its completion timestamp
3. **Sort by date**: Order completed stocks by completion date (FIFO)
4. **Allocate to tanks**: For each tank with a matching item_code:
   - Walk through completed stocks in date order
   - Allocate stock quantity to tank until tank's `current_capacity` is filled
   - Record rate, quantity, percentage, and vendor for each allocation
5. **Calculate weighted average**: `sum(rate * qty) / sum(qty)` across all allocations

This gives a breakdown showing which vendor's stock (and at what rate) is in each tank.

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

## Tank Inward/Outward Operations (`tank/views.py`)

### Inward Operation

When stock is added to a tank:
1. Validates stock entry exists and has sufficient quantity
2. Creates a `TankLayer` with the rate and quantity from the stock entry
3. Updates `TankData.current_capacity` (adds quantity)
4. Updates `TankData.item_code` if not already set
5. Changes the source `StockStatus.status` to `IN_TANK`
6. Creates a `TankLog` entry with `log_type=INWARD`

### Outward Operation

When stock is removed from a tank (FIFO):
1. Validates tank has sufficient current capacity
2. Consumes layers in FIFO order (oldest first):
   - Reduces `TankLayer.quantity_remaining`
   - Deletes layer if fully consumed
3. Updates `TankData.current_capacity` (subtracts quantity)
4. Creates a `TankLog` entry with `log_type=OUTWARD`
5. Creates `TankLogConsumption` entries for each consumed layer

### Auto-Clear Item on Empty

When the frontend detects a tank is fully drained (remaining quantity = 0), it calls `updateTank()` to set both `current_capacity` and `item_code` to `null`.

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
KG_TO_LTR = 1.0989  # Used in stock insights for avg_price_per_ltr calculation
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
