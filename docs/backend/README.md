# Backend Documentation

The backend is a **Django REST Framework** application in a separate repository at `c:\Users\Mukesh\Desktop\EXIM-backend`.

## Table of Contents

| Document | Description |
|----------|-------------|
| [Models](./models.md) | All database models, fields, relationships, and constraints |
| [Endpoints](./endpoints.md) | Every URL pattern mapped to views and permissions |
| [Services & Business Logic](./services.md) | SAP sync, FIFO rates, daily price fetching, auto-calculations |

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Django | 6.0.2 |
| API | Django REST Framework | - |
| Database | PostgreSQL | - |
| Authentication | djangorestframework-simplejwt | - |
| API Docs | drf-spectacular (OpenAPI/Swagger) | - |
| SAP Connection | pymssql (MSSQL) | - |
| CORS | django-cors-headers | - |

---

## Project Structure

```
EXIM-backend/
  |- config/                   # Project settings & root URL config
  |   |- settings.py           # Database, JWT, CORS, installed apps
  |   |- urls.py               # Root URL router
  |
  |- accounts/                 # User management & authentication
  |   |- models.py             # Custom User model (AbstractBaseUser)
  |   |- views.py              # Login, logout, register, user CRUD
  |   |- serializers.py        # User serializers + custom JWT token
  |   |- permissions.py        # IsAdminUser, IsManagerUser, IsFactoryUser
  |
  |- sap_sync/                 # SAP data synchronization
  |   |- models.py             # RMProducts, FGProducts, Party, DomesticContracts, syncLogs
  |   |- views.py              # Sync views, list views, summary views
  |   |- serializers.py        # Product, party, PO serializers
  |   |- services/
  |       |- connections.py    # MSSQL connection to SAP
  |       |- services.py       # Sync logic (bulk upsert, SQL queries)
  |
  |- tank/                     # Tank inventory management
  |   |- models.py             # TankItem, TankData, TankLayer, TankLog, TankLogConsumption
  |   |- views.py              # CRUD, summaries, capacity insights, FIFO rates, inward/outward
  |   |- serializers.py        # Tank serializers
  |
  |- stock/                    # Stock status tracking
  |   |- models.py             # StockStatus, StockStatusUpdateLog
  |   |- views.py              # CRUD, insights, dashboard
  |   |- serializers.py        # Stock serializers
  |   |- filters.py            # StockStatusFilters
  |
  |- daily_price/              # Commodity price management + Jivo rates
  |   |- models.py             # DailyPrice, JivoRates
  |   |- views.py              # Fetch from Google Sheets, save, trends, Jivo rate views
  |   |- serializers.py        # Price + Jivo rate serializers
  |   |- services.py           # Google Sheets CSV parser (daily prices + Jivo rates)
  |
  |- license/                  # License management
  |   |- models.py             # AdvanceLicenseHeaders/Lines, DFIALicenseHeader/Lines
  |   |- views.py              # CRUD for headers and lines, insight aggregations
  |   |- serializers.py        # License serializers with nested lines
  |
  |- contracts/                # Form-based domestic contract workflow
  |   |- models.py             # DomesticReports (multi-step: contract, loading, freight)
  |   |- views.py              # ContractPostView, LoadingPostView, FreightPostView
  |   |- serializers.py        # ContractSerializer, LoadingSerializer, FreightSerializer
  |
  |- planning/                 # (Empty - future use)
  |- manage.py
```

---

## Configuration

### Database (PostgreSQL)

All values from environment variables in `.env`:

| Env Var | Purpose |
|---------|---------|
| `DB_HOST` | Database host |
| `DB_NAME` | Database name |
| `DB_USER` | Database user |
| `DB_PASSWORD` | Database password |
| `DB_PORT` | Database port |

### JWT Settings

| Setting | Value |
|---------|-------|
| Access Token Lifetime | 1 day |
| Refresh Token Lifetime | 7 days |
| Token Blacklist | Enabled (for logout) |

### CORS

`CORS_ALLOW_ALL_ORIGINS = True` (allows requests from any frontend origin)

### API Documentation (auto-generated)

| URL | Description |
|-----|-------------|
| `/api/schema/` | OpenAPI schema (JSON) |
| `/api/docs/` | Swagger UI |
| `/api/redoc/` | ReDoc UI |

---

## Django Apps Overview

| App | Purpose | Models |
|-----|---------|--------|
| `accounts` | Auth, users, roles | User |
| `sap_sync` | SAP integration | RMProducts, FGProducts, Party, DomesticContracts, syncLogs |
| `tank` | Tank management | TankItem, TankData, TankLayer, TankLog, TankLogConsumption |
| `stock` | Inventory tracking | StockStatus, StockStatusUpdateLog, DebitEntry |
| `daily_price` | Commodity prices + Jivo rates | DailyPrice, JivoRates |
| `license` | License management | AdvanceLicenseHeaders, AdvanceLicenseLines, DFIALicenseHeader, DFIALicenseLines |
| `contracts` | Form-based domestic contracts | DomesticReports |
| `planning` | (Empty — future use) | - |

---

## Roles & Permissions

| Role | Code | Custom Permission Class | Access |
|------|------|------------------------|--------|
| Admin | `ADM` | `IsAdminUser` | Full access including user management, all sync operations |
| Manager | `MNG` | `IsManagerUser` | All stock, tank, dashboard, contracts, licenses, daily price. No sync or user management |
| Factory | `FTR` | `IsFactoryUser` | Tank pages only: Tank Items (read), Tank Data (read + inward/outward), Tank Monitoring (no rate breakdown), Tank Logs |

Permissions are defined in `accounts/permissions.py` and used across all views.

---

## SAP Integration

The backend connects to a **SAP HANA** database through an intermediate **MSSQL server** using `OPENQUERY`:

```
Django App  --(pymssql)-->  MSSQL (103.89.45.75)  --(OPENQUERY)-->  SAP HANA (HANADB112)
                            Database: Jivo_All_Branches_Live
```

SAP data synced:
- **Raw Material Products** (OITM + OINM tables)
- **Finished Goods Products** (OITM table)
- **Parties/Vendors** (OCRD table)
- **Purchase Orders** (OPDN, PDN1, POR1, OPOR, PCH1, OPCH, IPF1 tables)
- **Balance Sheet** (Vendor balances via CTEs — not persisted, returned directly)
- **Open GRPOs** (Goods Receipt POs pending invoice)
