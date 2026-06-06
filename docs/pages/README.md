# Pages & Routing

Source of truth: `src/App.tsx`.

All routes except `/login` render inside an authenticated layout. Permission-protected routes use `ProtectedRoute` with `requiredModules`; the user needs `view` on at least one listed module.

## Route Map

| Route | Component | Required modules |
| --- | --- | --- |
| `/login` | `LoginPage` | Public |
| `/` | `HomePage` | Authenticated |
| `/dashboard` | `DashboardPage` | `domesticreports`, `stockstatus` |
| `/stock-dashboard` | `StockDashboardPage` | `stockstatus` |
| `/stock-dashboard/:status` | `StockDashboardDetailPage` | `stockstatus` |
| `/reports/director-dashboard` | `DirectorDashboardPage` | `director_report`, `director_inventory`, `director_inventorty`, `domesticreports` |
| `/reports/vehicle-report` | `VehicleReportPage` | `vehicle_report` |
| `/stock/warehouse-inventory` | `WarehouseInventoryPage` | `inventory`, `stockstatus` |
| `/stock/stock-status` | `StockStatusPage` | `stockstatus` |
| `/stock/variance` | `ShortageReportPage` | `stockstatus` |
| `/stock/contractual-history` | `ContractualHistoryPage` | `stockstatus` |
| `/stock/tank-items` | `TankItemsPage` | `tankitem` |
| `/stock/tank-monitoring` | `TankMonitoringPage` | `tankdata`, `tanklayer` |
| `/stock/tank-data` | `TankDataPage` | `tankdata` |
| `/stock/in-tank-breakdown` | `InTankBreakdownPage` | `stockstatus`, `tankdata`, `tanklayer` |
| `/stock/tank-logs` | `TankLogsPage` | `tanklog` |
| `/domestic-contracts` | `DomesticContracts2526Page` | `domesticcontract` |
| `/contracts/domestic-2627` | `DomesticContracts2627Page` | `domesticcontract` |
| `/contracts/open-grpos` | `OpenGrpoPage` | `open_grpos` |
| `/exim-account` | `CrDrOutstandingPage` | `debitentry`, `party` |
| `/exim-account/:vendorCode` | `CrDrVendorLedgerPage` | `debitentry`, `party` |
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
| `/admin/users` | `UsersPage` | `user` |
| `/admin/sync-raw-material-data` | `SyncRawMaterialDataPage` | `rmproducts` |
| `/admin/sync-finished-goods-data` | `SyncFinishedGoodsDataPage` | `fgproducts` |
| `/admin/sync-vendor-data` | `SyncVendorDataPage` | `party` |
| `/admin/sync-logs` | `SyncLogsPage` | `synclogs` |
| `/admin/stock-updation-logs` | `StockUpdationLogsPage` | `stockstatusupdatelog` |

## Page Groups

| Folder | Purpose |
| --- | --- |
| `pages/dashboard/` | Dashboard, stock dashboard, stock dashboard detail |
| `pages/reports/` | Vehicle and director reports |
| `pages/stock/` | Stock lifecycle, tanks, inventory, history |
| `pages/accounts/` | Vendor/customer balances, ledgers, aging, AP/AR/PO |
| `pages/contracts/` | Domestic contracts and open GRPOs |
| `pages/commodity/` | Daily prices and Jivo rates |
| `pages/Custom-Exchange/` | EXIM exchange rates |
| `pages/license/` | Advance and DFIA license flows |
| `pages/administration/` | Users, SAP sync, sync logs, stock update logs |

## Adding A Route

1. Create the page in the matching `src/pages/` subfolder.
2. Import it in `src/App.tsx`.
3. Add a `<Route>` under the protected layout.
4. Wrap with `ProtectedRoute requiredModules={...}` when the page is permissioned.
5. Add the navigation item to `SIDEBAR_SECTIONS`.
