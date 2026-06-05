# Backend Models Reference

This is a frontend-facing model summary. It is not a substitute for backend migrations/models, but it explains the entities the UI displays and edits.

## Accounts

### User

Used by login and user administration.

| Field | Meaning |
| --- | --- |
| `email` | Login identifier |
| `name` | Display name |
| `permissions` | Module/action map returned at login |
| `is_active` | Account status |

The current frontend uses permissions instead of role names for route and navigation checks.

## SAP Sync Domain

### RM / FG Items

Raw material and finished goods data synced from SAP and used by stock, inventory, tank, and sync screens.

Common fields include item code, item name, category, variety, unit, brand, subgroup, and deletion state. RM inventory records also include quantities, transaction value, and rate data.

### Party

Vendor/customer master data used by stock entries, ledgers, outstanding reports, and sync pages.

Common fields include card code, card name, state, country, and main group.

### Domestic Contracts / Purchase Orders

SAP-derived PO/GRPO data used by domestic contract and open PO views. Rows include PO details, vendor, product, quantities, vehicle/transporter, GRPO/invoice details, and amount fields.

### Sync Logs

Audit rows for SAP sync actions. The UI displays sync type, status, triggered user, start/completion times, error text, and record counts.

## Stock Domain

### StockStatus

Primary stock lifecycle record.

| Group | Fields |
| --- | --- |
| Item/vendor | `item_code`, `vendor_code` |
| Movement state | `status`, `parent`, `is_accumulator`, `remainder_action` |
| Quantity/value | `quantity`, `quantity_in_litre`, `rate`, `total` |
| Logistics | `vehicle_number`, `location`, `eta`, `transporter_name`, `job_work` |
| Audit | `created_at`, `created_by`, `deleted` |

The frontend treats deletion as soft delete through `deleted: true`.

### StockStatusUpdateLog

Audit trail for stock changes. Used by Stock Updation Logs.

### DebitEntry

Records shortage/loss/damage quantities, rate, total, responsible party, reason, and creator. Used by the Shortage Report.

## Tank Domain

### TankItem

Master list of commodities that can be stored in tanks. Includes code, name, active state, creator, and UI color.

### TankData

Tank master/current state. Includes tank code, assigned item, tank capacity, current capacity, active state, and timestamps.

### TankLayer

FIFO cost layer created when completed stock is inwarded to a tank. Used for in-tank breakdown and weighted-average cost displays.

### TankLog

Operation log for inward, outward, and transfer actions. Includes quantity, tank references, vehicle/rate/party snapshots, remarks, and creator.

### TankLogConsumption

Per-layer FIFO consumption trail for outward/transfer operations.

## Commodity Domain

### DailyPrice

Daily commodity price row. The UI displays commodity name, factory price/kg, packing cost/kg, GST/kg, GST/liter, date, and creator.

### JivoRates

Jivo rate row by commodity and pack type. Used by Jivo rate matrix/history/trend views.

## License Domain

### AdvanceLicenseHeaders / Lines

Header rows represent one Advance License with import/export validity, quantities, CIF/FOB values, exchange rates, USD values, and status.

Line rows track Bill of Entry and Shipping Bill values, import/export quantities, dates, and balances.

### DFIALicenseHeader / Lines

Header rows represent one DFIA License with export/import validity, quantities, CIF/FOB values, exchange rates, USD/INR values, and status.

Line rows track BOE/shipping bill values, to-be-imported/exported quantities, dates, and balances.

## Domestic Contract Workflow

Manual domestic contract rows are edited through staged screens:

| Stage | Data |
| --- | --- |
| Contract | Product, vendor, PO, contract quantity/rate/value |
| Loading | Load/unload quantities, shortage, deduction, basic amount |
| Freight | Transporter, vehicle, bility, freight, brokerage, GRPO, invoice |

Backend calculations populate totals and derived shortage/freight fields.

## Relationships

```text
Party
  -> StockStatus
  -> DebitEntry

RM/FG Items
  -> StockStatus
  -> TankItem

StockStatus
  -> StockStatusUpdateLog
  -> TankLayer
  -> TankLog

TankData
  -> TankLayer
  -> TankLog
  -> TankLogConsumption

AdvanceLicenseHeaders
  -> AdvanceLicenseLines

DFIALicenseHeader
  -> DFIALicenseLines
```
