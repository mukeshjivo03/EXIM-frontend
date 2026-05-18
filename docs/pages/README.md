# Pages & Routing

This document reflects the current route configuration in `src/App.tsx`.

---

## Route Map

| Route | Component | Required Modules (any) |
|---|---|---|
| `/login` | `LoginPage` | Public |
| `/` | `HomePage` | Authenticated |
| `/dashboard` | `DashboardPage` | `domesticreports`, `stockstatus` |
| `/stock-dashboard` | `StockDashboardPage` | `stockstatus` |
| `/stock-dashboard/:status` | `StockDashboardDetailPage` | `stockstatus` |
| `/stock/warehouse-inventory` | `WarehouseInventoryPage` | `inventory`, `stockstatus` |
| `/reports/vehicle-report` | `VehicleReportPage` | `vehicle_report` |
| `/reports/director-dashboard` | `DirectorDashboardPage` | `director_report`, `director_inventory`, `director_inventorty`, `domesticreports` |
| `/stock/stock-status` | `StockStatusPage` | `stockstatus` |
| `/stock/variance` | `ShortageReportPage` | `stockstatus` |
| `/stock/contractual-history` | `ContractualHistoryPage` | `stockstatus` |
| `/stock/tank-items` | `TankItemsPage` | `tankitem` |
| `/stock/tank-monitoring` | `TankMonitoringPage` | `tankdata`, `tanklayer` |
| `/stock/tank-data` | `TankDataPage` | `tankdata` |
| `/stock/in-tank-breakdown` | `InTankBreakdownPage` | `stockstatus`, `tankdata`, `tanklayer` |
| `/stock/tank-logs` | `TankLogsPage` | `tanklog` |
| `/contracts/open-grpos` | `OpenGrpoPage` | `open_grpos` |
| `/domestic-contracts` | `DomesticContracts2526Page` | `domesticcontract` |
| `/contracts/domestic-2627` | `DomesticContracts2627Page` | `domesticcontract` |
| `/exim-account` | `CrDrOutstandingPage` (`EximAccountPage`) | `debitentry`, `party` |
| `/exim-account/:vendorCode` | `CrDrVendorLedgerPage` (`EximAccountVendorPage`) | `debitentry`, `party` |
| `/accounts/vendor-outstanding` | `VendorOutstandingPage` | `debitentry`, `party` |
| `/accounts/vendor-outstanding/:vendorCode` | `VendorLedgerPage` | `debitentry`, `party` |
| `/accounts/customer-outstanding` | `CustomerOutstandingPage` | `customer_balance_sheet` |
| `/accounts/customer-outstanding/:customerCode` | `CustomerLedgerPage` | `customer_balance_sheet` |
| `/accounts/customer-aging` | `CustomerAgingPage` | `customer_balance_sheet` |
| `/accounts/open-ars` | `OpenArsPage` | `customer_balance_sheet` |
| `/accounts/open-aps` | `OpenApsPage` | `balance_sheet` |
| `/accounts/open-pos` | `OpenPosPage` | `balance_sheet` |
| `/exim-rates` | `CustomExchangeRatesPage` | `exim_rates` |
| `/commodity/daily-price` | `DailyPricePage` | `dailyprice` |
| `/commodity/jivo-rates` | `JivoRatesPage` | `jivorates` |
| `/license/advance-license` | `AdvanceLicensePage` | `advancelicenseheaders` |
| `/license/advance-license/:licenseNo` | `AdvanceLicenseDetailPage` | `advancelicenseheaders` |
| `/license/dfia-license` | `DFIALicensePage` | `dfialicenseheader` |
| `/license/dfia-license/:fileNo` | `DFIALicenseDetailPage` | `dfialicenseheader` |
| `/admin/stock-updation-logs` | `StockUpdationLogsPage` | `stockstatusupdatelog` |
| `/admin/users` | `UsersPage` | `user` |
| `/admin/sync-raw-material-data` | `SyncRawMaterialDataPage` | `rmproducts` |
| `/admin/sync-finished-goods-data` | `SyncFinishedGoodsDataPage` | `fgproducts` |
| `/admin/sync-vendor-data` | `SyncVendorDataPage` | `party` |
| `/admin/sync-logs` | `SyncLogsPage` | `synclogs` |

---

## Accounts Pages

| Route | Purpose |
|---|---|
| `/exim-account` | Oil Dr/Cr outstanding |
| `/accounts/vendor-outstanding` | Vendor outstanding summary |
| `/accounts/customer-outstanding` | Customer outstanding summary |
| `/accounts/customer-aging` | Aging-based customer receivables |
| `/accounts/open-ars` | Open AR invoices |
| `/accounts/open-aps` | Open AP invoices |
| `/accounts/open-pos` | Open purchase orders (SAP) with computed `Days Open` |

