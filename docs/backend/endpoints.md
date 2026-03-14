# Backend API Endpoints

All endpoints are served from the Django backend at `http://103.89.45.75:9000` (production) or `http://localhost:9000` (development).

Auto-generated API docs are available at:
- Swagger UI: `/api/docs/`
- ReDoc: `/api/redoc/`

---

## Authentication (`/account/`)

| Method | Endpoint | View | Permission | Description |
|--------|----------|------|------------|-------------|
| POST | `/account/login/` | MyTokenObtainPairView | Public | Login, returns JWT tokens + role + name |
| POST | `/account/login/refresh/` | TokenRefreshView | Public | Refresh access token |
| POST | `/account/logout/` | Logout | Authenticated | Blacklist refresh token |
| POST | `/account/register/` | RegisterView | ADM | Create new user |
| GET | `/account/users/` | ListUservView | ADM | List all users |
| GET/PATCH/DELETE | `/account/user/{id}/` | GetDeleteUpdate | ADM | Get, update, or delete user |

### Login Response

```json
{
  "access": "eyJ...",
  "refresh": "eyJ...",
  "role": "ADM",
  "name": "John Doe",
  "email": "john@example.com",
  "id": 1
}
```

---

## SAP Sync - Raw Materials (`/sap_sync/rm/`, `/items/rm/`, `/item/rm/`)

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/sap_sync/rm/items/` | ADM | Sync ALL raw material items from SAP |
| GET | `/sap_sync/rm/item/{itemCode}/` | ADM | Sync single RM item from SAP |
| GET | `/items/rm/` | ADM, MNG | List RM items (filter: `?variety=X&variety=Y`) |
| GET | `/items/rm/summary/` | ADM, MNG | Summary stats (filter: `?variety=X`) |
| GET | `/items/rm/varieties/` | ADM, MNG | List distinct varieties |
| GET | `/item/rm/{itemCode}/` | ADM, MNG | Get single RM item |
| DELETE | `/item/rm/{itemCode}/` | ADM | Delete RM item |

### RM Summary Response

```json
{
  "summary": {
    "total_count": 42,
    "total_qty": "15000.00",
    "avg_rate": "85.50",
    "total_trans_value": "1282500.00"
  }
}
```

---

## SAP Sync - Finished Goods (`/sap_sync/fg/`, `/items/fg/`, `/item/fg/`)

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/sap_sync/fg/items/` | ADM | Sync ALL FG items from SAP |
| GET | `/sap_sync/fg/item/{itemCode}/` | ADM | Sync single FG item from SAP |
| GET | `/items/fg/` | ADM, MNG | List FG items |
| GET | `/item/fg/{itemCode}/` | ADM, MNG | Get single FG item |
| DELETE | `/item/fg/{itemCode}/` | ADM | Delete FG item |

---

## SAP Sync - Vendors/Parties (`/sap_sync/party/`, `/parties/`, `/party/`)

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/sap_sync/party/{cardCode}/` | ADM | Sync single vendor from SAP |
| GET | `/parties/` | ADM, MNG | List all vendors |
| GET/DELETE | `/party/{cardCode}/` | ADM, MNG / ADM | Get or delete vendor |

---

## SAP Sync - Purchase Orders (`/sap-sync/po/`, `/pos/`, `/po/`)

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/sap-sync/po/` | ADM | Sync ALL purchase orders from SAP |
| GET | `/sap-sync/po/{grpoNo}/` | ADM | Sync single PO by GRPO number |
| GET | `/pos/` | ADM, MNG | List all purchase orders |
| GET/PATCH/DELETE | `/po/{id}/` | ADM, MNG | Get, update, or delete PO |

---

## SAP Sync - Balance Sheet (`/sap-sync/balance-sheet/`)

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/sap-sync/balance-sheet/` | ADM, MNG | Fetch vendor balance sheet from SAP |

---

## Sync Logs (`/sync_logs/`)

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/sync_logs/` | ADM | List all sync operation logs |

---

## Stock Status (`/stock-status/`)

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/stock-status/` | ADM, MNG | List stock entries (filters: `?status=X&vendor=X&item=X`) |
| POST | `/stock-status/` | ADM, MNG | Create stock entry |
| GET/PUT/DELETE | `/stock-status/{id}/` | ADM, MNG | Get, update, or delete stock entry |
| GET | `/stock-status/stock-logs/` | ADM, MNG | List stock update audit logs |
| GET | `/stock-status/stock-insights/` | ADM, MNG | Aggregate insights (filterable) |
| GET | `/stock-status/stock-summary/` | ADM, MNG | Overall summary |
| GET | `/stock-status/stock-dashboard/` | ADM, MNG | Full dashboard data |

### Stock Insights Response

```json
{
  "summary": {
    "total_value": 1500000,
    "total_qty": 25000,
    "total_count": 150,
    "avg_price_per_kg": 60.0,
    "avg_price_per_ltr": 55.2
  }
}
```

### Stock Dashboard Response

```json
{
  "summary": {
    "in_factory_total": 50000,
    "outside_factory_total": 12000,
    "active_items": 8
  },
  "status_vendors": {
    "ON_THE_SEA": ["Vendor A", "Vendor B"],
    "MUNDRA_PORT": ["Vendor C"]
  },
  "items": [
    {
      "item_code": "RM001",
      "in_factory": 5000,
      "outside_factory": 1200,
      "status_data": { "ON_THE_SEA__Vendor A": 500 },
      "total": 6700
    }
  ],
  "totals": { "in_factory": 50000, "outside_factory": 12000, "grand_total": 62000 }
}
```

**Note:** `IN_FACTORY` data comes from TankData (sum of `current_capacity` grouped by `item_code`), not from StockStatus records.

---

## Tanks (`/tank/`)

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/tank/` | Authenticated | List all tanks |
| POST | `/tank/` | ADM, MNG | Create a tank |
| GET/DELETE | `/tank/{tankCode}/` | ADM, MNG | Get or delete tank |
| PUT | `/tank/update-capacity/{tankCode}/` | ADM, FTR | Update tank capacity + item |
| GET | `/tank/items/` | Authenticated | List all tank items |
| POST | `/tank/items/` | ADM, MNG | Create tank item |
| GET/DELETE | `/tank/item/{tankItemCode}/` | ADM, MNG | Get or delete tank item |
| PUT | `/tank/item/update-color/{tankItemCode}/` | ADM, MNG | Update item color + name |
| GET | `/tank/tank-summary/` | Authenticated | Tank summary stats |
| GET | `/tank/item-wise-summary/` | Authenticated | Per-item summary |
| GET | `/tank/capacity-insights/` | ADM, MNG | Capacity utilization |
| GET | `/tank/tank-rates/` | ADM, MNG | FIFO rate breakdown per tank |

### Tank Summary Response

```json
{
  "summary": {
    "total_tank_capacity": 100000,
    "current_stock": 75000,
    "utilisation_rate": 75.0,
    "tank_count": 10,
    "item_count": 5
  }
}
```

### Tank Rates Response

```json
[
  {
    "tank_code": "TNK001",
    "item_code": "RM001",
    "item_name": "Sunflower Oil",
    "color": "#FF5733",
    "tank_capacity": 10000,
    "current_capacity": 7500,
    "rate_breakdown": [
      { "rate": 85.0, "qty": 5000, "percentage": 66.7, "vendor": "Vendor A" },
      { "rate": 90.0, "qty": 2500, "percentage": 33.3, "vendor": "Vendor B" }
    ],
    "weighted_avg_rate": 86.67
  }
]
```

---

## Daily Price (`/daily-price/`)

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/daily-price/fetch/` | ADM, MNG | Fetch today's prices from Google Sheets (preview) |
| POST | `/daily-price/fetch/` | ADM, MNG | Save fetched prices to database |
| GET | `/daily-price/db-list/` | ADM, MNG | List saved prices (filter: `?date=YYYY-MM-DD`) |
| GET | `/daily-price/trends/` | ADM, MNG | 7-day price trend data for charts |

### Trends Response

```json
{
  "labels": ["2024-01-01", "2024-01-02", "..."],
  "datasets": [
    { "label": "Sunflower Oil", "data": [85.0, 86.5, 84.0] },
    { "label": "Palm Oil", "data": [72.0, 71.5, 73.0] }
  ]
}
```

---

## Licenses (`/license/`)

### Advance License

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/license/advance-license-headers/` | ADM, MNG | List all headers |
| POST | `/license/advance-license-headers/` | ADM, MNG | Create header |
| GET/PUT/DELETE | `/license/advance-license-header/{licenseNo}/` | ADM, MNG | CRUD single header |
| GET | `/license/advance-license-lines/` | ADM, MNG | List all lines |
| POST | `/license/advance-license-lines/` | ADM, MNG | Create line |
| GET/PUT/DELETE | `/license/advance-license-lines/{id}/` | ADM, MNG | CRUD single line |

### DFIA License

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/license/dfia-license-header/list/` | ADM, MNG | List all headers |
| POST | `/license/dfia-license-header/create/` | ADM, MNG | Create header |
| GET/PUT/DELETE | `/license/dfia-license-header/{fileNo}/` | ADM, MNG | CRUD single header |
| GET | `/license/dfia-license-lines/list/` | ADM, MNG | List all lines |
| POST | `/license/dfia-license-lines/create/` | ADM, MNG | Create line |
| GET/PUT/DELETE | `/license/dfia-license-lines/{id}/` | ADM, MNG | CRUD single line |

**Note:** DFIA endpoints use `/list/` and `/create/` suffixes, unlike Advance License endpoints. This is an inconsistency.

### Header Serializer Behavior

When GET-ting a header, the response includes nested lines:
- Advance: `lincense_lines` (note: typo in serializer field name)
- DFIA: `dfia_license_lines`

---

## URL Pattern Inconsistencies

| Pattern | Examples | Notes |
|---------|----------|-------|
| Underscore vs hyphen | `/sap_sync/` vs `/sap-sync/` | Mixed across endpoints |
| Trailing suffixes | `/dfia-license-header/list/` vs `/advance-license-headers/` | DFIA uses action suffixes |
| Field naming | `boe_No` (camelCase), `fob_exhange_rate` (typo) | From model definitions |
| Serializer field | `lincense_lines` | Typo for "license_lines" |
