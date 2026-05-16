# Backend Endpoints (Frontend-Used)

This file lists endpoints currently consumed by the frontend codebase.

Source of truth: `src/api/*.ts`.

---

## Authentication

- `POST /account/login/`
- `POST /account/login/refresh/`
- `POST /account/logout/`
- `GET /account/users/`
- `POST /account/register/`
- `PATCH /account/user/{id}/`
- `DELETE /account/user/{id}/`

---

## SAP Sync / Accounts / Contracts

- `GET /sap-sync/items/`
- `GET /sap-sync/po/`
- `GET /sap-sync/po/{grpoNo}/`
- `GET /sap-sync/balance-sheet/`
- `GET /sap-sync/inventory/`
- `GET /sap-sync/finished-inventory/`
- `GET /sap-sync/vendor/ledger`
- `GET /sap-sync/open-ap/`
- `GET /sap-sync/open-ar/`
- `GET /sap-sync/open-pos/`
- `GET /sap-sync/custa/balance-sheet/`
- `GET /sap-sync/vendor/balance-sheet/`
- `GET /sap-sync/customer/balance/`
- `GET /sap-sync/customer/ledger`
- `GET /sap-sync/customer-aging-balance/`

- `GET /pos/`
- `PATCH /po/{id}/`
- `DELETE /po/{id}/`

- `GET /parties/`
- `GET /party/{cardCode}/`
- `DELETE /party/{cardCode}/`
- `GET /sap_sync/party/{cardCode}/`

- `GET /items/rm/`
- `GET /items/rm/summary/`
- `GET /items/rm/varieties/`
- `GET /item/rm/{itemCode}/`
- `DELETE /item/rm/{itemCode}/`
- `GET /sap_sync/rm/items/`
- `GET /sap_sync/rm/item/{itemCode}/`

- `GET /items/fg/`
- `GET /item/fg/{itemCode}/`
- `DELETE /item/fg/{itemCode}/`
- `GET /sap_sync/fg/items/`
- `GET /sap_sync/fg/item/{itemCode}/`

- `GET /sync_logs/`

---

## Stock

- `GET /stock-status/`
- `GET /stock-status/{id}/`
- `POST /stock-status/`
- `PUT /stock-status/{id}/`
- `PATCH /stock-status/{id}/`
- `GET /stock-status/stock-summary/`
- `GET /stock-status/stock-insights/`
- `GET /stock-status/stock-logs/`
- `GET /stock-status/out/`
- `GET /stock-status/get-unique-rm/`
- `GET /stock-status/get-stock-entry-by-rm/`
- `POST /stock-status/move/`
- `POST /stock-status/dispatch/`
- `POST /stock-status/arrive-batch/`
- `POST /stock-status/opening-stock/`
- `GET /stock-status/vehicle-report/`
- `GET /stock-status/debit-entries/`
- `GET /stock-status/debit-insights/`
- `GET /stock-status/contractual-history/`
- `GET /stock-status/stock-dashboard/`

---

## Tanks

- `GET /tank/items/`
- `POST /tank/items/`
- `GET /tank/item/{tankItemCode}/`
- `DELETE /tank/item/{tankItemCode}/`
- `PUT /tank/item/update-color/{tankItemCode}/`

- `GET /tank/`
- `POST /tank/`
- `DELETE /tank/{tankCode}/`
- `PUT /tank/update-capacity/{tankCode}/`

- `GET /tank/tank-summary/`
- `GET /tank/item-wise-summary/`
- `GET /tank/item-wise-average/`
- `GET /tank/in-tank-items/`
- `GET /tank/layers/{tankCode}/`
- `GET /tank/log/`

- `POST /tank/inward/`
- `POST /tank/outward/`

---

## Commodity / Rates

- `GET /daily-price/fetch/`
- `POST /daily-price/fetch/`
- `GET /daily-price/db-list/`
- `GET /daily-price/range/`
- `GET /daily-price/trends/`

- `GET /jivo-rate/fetch`
- `POST /jivo-rate/fetch`
- `GET /jivo-rate/range/`
- `GET /jivo-rate/trends/`

- `GET /custom-exchange-rates/`
- `GET /custom-exchange-rates/external/`

---

## Open GRPO

- `GET /sap_sync/open-grpos/`

---

## Licenses

### Advance License

- `GET /license/advance-license-headers/`
- `POST /license/advance-license-headers/`
- `GET /license/advance-license-header/{licenseNo}/`
- `PUT /license/advance-license-header/{licenseNo}/`
- `DELETE /license/advance-license-header/{licenseNo}/`
- `GET /license/advance-license-import-lines/dropdown/{licenseNo}/`
- `POST /license/advance-license-import-lines/`
- `PUT /license/advance-license-import-lines/{id}/`
- `DELETE /license/advance-license-import-lines/{id}/`
- `POST /license/advance-license-export-lines/`
- `PUT /license/advance-license-export-lines/{id}/`
- `DELETE /license/advance-license-export-lines/{id}/`

### DFIA License

- `GET /license/dfia-license-header/list/`
- `POST /license/dfia-license-header/create/`
- `GET /license/dfia-license-header/{fileNo}/`
- `PUT /license/dfia-license-header/{fileNo}/`
- `DELETE /license/dfia-license-header/{fileNo}/`
- `GET /license/dfia-license-export-lines/dropdown/{fileNo}/`
- `POST /license/dfia-license-import-lines/create/`
- `PUT /license/dfia-license-import-lines/{id}/`
- `DELETE /license/dfia-license-import-lines/{id}/`
- `POST /license/dfia-license-export-lines/create/`
- `PUT /license/dfia-license-export-lines/{id}/`
- `DELETE /license/dfia-license-export-lines/{id}/`
