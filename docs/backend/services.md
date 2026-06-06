# Backend Services & Business Logic

This file documents backend behavior that affects frontend screens and API expectations.

## Authentication

- Login returns access token, refresh token, display name, and permission map.
- Refresh token requests return a new access token.
- If refresh fails, the frontend clears auth state and redirects to `/login`.

## SAP Sync

SAP-backed screens depend on backend services that query SAP through an intermediate database connection.

Frontend-visible sync areas:

| Area | UI |
| --- | --- |
| Raw materials | Sync Raw Material, stock item selectors, inventory views |
| Finished goods | Sync Finished Goods, warehouse inventory |
| Vendors/parties | Sync Vendor, stock vendor selectors, account pages |
| Purchase orders | Domestic contracts, Open POs |
| Account balances | Vendor/customer outstanding, ledgers, AP/AR aging |
| Open GRPOs | Open GRPO report |

Sync actions write sync log rows with status and record counts.

## Stock Lifecycle

Stock entries move through statuses such as outside factory, on the way, at refinery, completed, delivered, in tank, pending, and processing.

Important frontend behaviors:

- creates and edits use `POST /stock-status/`, `PUT /stock-status/{id}/`, or `PATCH /stock-status/{id}/`;
- delete is soft delete using `deleted: true`;
- movement buttons call move, dispatch, arrive-batch, or opening-stock endpoints;
- stock logs and update logs are read-only audit views;
- shortage/debit reports come from debit entry endpoints.

## Remainder Actions

Movement APIs may require a remainder action:

| Action | Meaning |
| --- | --- |
| `RETAIN` | Return remaining quantity to parent/source |
| `TOLERATE` | Accept the difference as tolerated loss |
| `DEBIT` | Create a debit/shortage entry |

## Tank Operations

Tank operations are backend-calculated and audited.

| Operation | Effect |
| --- | --- |
| Inward | Moves completed stock into a tank and creates FIFO layers |
| Outward | Reduces tank capacity and consumes FIFO layers oldest-first |
| Transfer | Moves quantity between tanks while preserving layer cost data |

The frontend displays tank capacity, current capacity, item assignment, item-wise summaries, in-tank items, FIFO breakdowns, and logs.

## Stock Dashboard

The stock dashboard combines multiple backend data sources:

- in-factory quantities from tank data/current capacity;
- outside-factory quantities from `StockStatus`;
- other status/vendor columns from grouped stock rows;
- totals for footer and summary cards.

`StockDashboardPage` and `StockDashboardDetailPage` consume this data through `src/api/dashboard.ts`.

## Commodity Prices

Daily prices and Jivo rates are fetched by backend services from external sheet data and can be saved to database endpoints.

Frontend expectations:

- fetch endpoints preview external data;
- save endpoints persist current external data;
- range endpoints power history tables;
- trend endpoints power charts;
- high/low endpoint powers summary insight cards for daily prices.

## Exchange Rates

`customRates.ts` reads:

- saved EXIM exchange rates;
- external exchange rates.

The page can request rates for a selected date.

## License Calculations

Advance and DFIA license headers include exchange-rate-derived INR/USD values. The frontend sends header and line payloads and displays backend-calculated values after refetch/update.

## Domestic Contracts

Domestic contract screens use a staged workflow:

1. create or edit the contract;
2. submit loading details;
3. submit freight details.

Backend services calculate values such as shortage, allowed shortage, deduction quantity, deduction amount, basic amount, freight amount, and brokerage amount.

## Error Handling

The frontend should route API errors through `src/lib/errors.ts` helpers so pages show consistent messages and toasts.
