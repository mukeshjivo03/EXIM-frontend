# Backend Overview

The backend is a separate Django REST Framework service. This document records frontend-facing assumptions only; backend code remains the final source of truth for models, permissions, and business logic.

## Frontend Contract

| Area | Assumption |
| --- | --- |
| API style | REST JSON endpoints |
| Auth | JWT access and refresh tokens |
| Login endpoint | `POST /account/login/` |
| Refresh endpoint | `POST /account/login/refresh/` |
| Logout endpoint | `POST /account/logout/` |
| Permission shape | `{ [module: string]: string[] }` |
| Frontend base URL config | `VITE_API_BASE_URL` |

## Main Backend Domains

| Domain | Frontend usage |
| --- | --- |
| Accounts/users | Login, logout, permissions, user CRUD |
| SAP sync | RM/FG items, vendors, purchase orders, account ledgers, open AP/AR/PO/GRPO, warehouse inventory |
| Stock | Stock status lifecycle, movements, shortage/debit reporting, stock dashboard |
| Tank | Tank master data, current capacity, FIFO layers, inward/outward logs |
| Daily price | Commodity price fetch/save/history/trends and Jivo rates |
| License | Advance License and DFIA License headers and lines |
| Contracts | Domestic contract workflow and financial-year views |

## Frontend Integration Notes

- The frontend expects failed auth refresh to mean the user must log in again.
- Module/action permission checks are enforced in the frontend for navigation and routes, but backend authorization still controls real access.
- Several SAP-backed endpoints return live computed data rather than persisted records.
- Some legacy endpoint names use mixed hyphen/underscore naming; keep the exact paths in `src/api/`.

## Related Docs

- [API Layer](../api/README.md)
- [Backend Endpoints](./endpoints.md)
- [Backend Models](./models.md)
- [Backend Services](./services.md)
