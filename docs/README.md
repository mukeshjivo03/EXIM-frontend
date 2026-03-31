# EXIM Frontend - Technical Documentation

## Table of Contents

| Document | Description |
|----------|-------------|
| [Architecture](./architecture/README.md) | Tech stack, project structure, build tooling, theming |
| [Authentication & Authorization](./auth/README.md) | Login flow, roles, protected routes, token management |
| [API Layer](./api/README.md) | Axios client, all endpoints, request/response types |
| [Pages & Routing](./pages/README.md) | Every route, page purpose, CRUD operations, navigation |
| [Components](./components/README.md) | Shared components, UI library, custom CSS classes |
| [Setup & Development](./setup/README.md) | Local setup, environment config, build & deployment |
| **Backend** | |
| [Backend Overview](./backend/README.md) | Django project structure, apps, config, SAP integration |
| [Backend Models](./backend/models.md) | All database models, fields, relationships, ER diagram |
| [Backend Endpoints](./backend/endpoints.md) | Every URL pattern with permissions and response examples |
| [Backend Services](./backend/services.md) | SAP sync, FIFO rates, auto-calculations, business logic |

---

## What is EXIM?

EXIM is an **Export-Import management system** used internally to track:

- **Stock inventory** across tanks, raw materials, and finished goods
- **Tank monitoring** with real-time visual representations
- **Commodity daily prices** with historical charts and delta tracking
- **Jivo commodity rates** with matrix view and historical browsing
- **Open GRPOs** monitoring with pending day alerts
- **Domestic contracts** (purchase orders)
- **EXIM account** balances and transactions
- **Advance Licenses** and **DFIA Licenses** with line-level tracking
- **SAP data synchronization** for raw materials, finished goods, and vendors
- **User management** with role-based access control

The frontend is a **React 19 + TypeScript** single-page application that communicates with a Django REST Framework backend via REST APIs.

---

## High-Level Architecture

```
Browser
  |
  v
React SPA (Vite dev server / static build)
  |
  v
Axios HTTP Client (with JWT auth headers)
  |
  v
Django REST Framework Backend API
  |
  v
PostgreSQL Database
```

---

## Backend Overview

The backend is a **separate repository** built with:

| Layer | Technology |
|-------|-----------|
| Framework | Django REST Framework (Python) |
| Database | PostgreSQL |
| Authentication | JWT (djangorestframework-simplejwt) |
| API Style | REST with JSON payloads |

**Deployment:**

| Service | URL |
|---------|-----|
| Frontend | `http://103.89.45.75:5003` |
| Backend API | `http://103.89.45.75:9000` |

**Key points for frontend developers:**
- Backend runs on port `9000` (configurable via `VITE_API_BASE_URL`)
- Backend `.env` file lives in the backend repo (not this frontend repo)
- All API endpoints are documented in [API Layer](./api/README.md)
- JWT tokens (access + refresh) are issued by `/account/login/`
- The backend enforces role-based authorization independently of frontend route guards

---

## User Roles

| Role | Code | Access Level |
|------|------|-------------|
| Admin | `ADM` | Full access: all pages + user management + SAP sync |
| Manager | `MNG` | Dashboard, stock, contracts, licenses, accounts, daily price, stock logs. No access to sync operations or user management |
| Factory | `FTR` | Tank pages only: Tank Items (read-only), Tank Data (read + inward/outward, no create/delete), Tank Monitoring (full, no rate breakdown), Tank Logs, Home |

---

## Quick Reference: Key File Locations

| Purpose | Path |
|---------|------|
| App entry point | `src/main.tsx` |
| Route definitions | `src/App.tsx` |
| API client (Axios) | `src/api/client.ts` |
| Auth context | `src/context/AuthContext.tsx` |
| Theme context | `src/context/ThemeContext.tsx` |
| Layout shell | `src/components/Layout.tsx` |
| Sidebar navigation | `src/components/Sidebar.tsx` |
| Global styles & theme | `src/index.css` |
| Utility formatters | `src/lib/formatters.ts` |
| Error handling | `src/lib/errors.ts` |
| Zod validation schemas | `src/lib/schemas.ts` |
| CI/CD workflow | `.github/workflows/frontend-deploy.yml` |
| Deploy script | `deploy_frontend.bat` |
