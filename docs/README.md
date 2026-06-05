# EXIM Frontend Documentation

This folder documents the current frontend codebase in this repository. Backend notes are included only where they help frontend work.

## Documents

| Document | Description |
| --- | --- |
| [Setup & Development](./setup/README.md) | Local setup, environment variables, scripts, build, deployment |
| [Architecture](./architecture/README.md) | Stack, project structure, provider tree, Vite/PWA config |
| [State Management](./architecture/state-management.md) | Contexts, localStorage, page data flow |
| [Authentication & Authorization](./auth/README.md) | Login, token refresh, permissions, route guards |
| [API Layer](./api/README.md) | Axios client, API modules, frontend-used endpoints |
| [Pages & Routing](./pages/README.md) | Route map and permission modules from `src/App.tsx` |
| [Components](./components/README.md) | Layout, navigation, shared components, UI primitives |
| [Backend Overview](./backend/README.md) | Frontend-facing backend assumptions |
| [Backend Models](./backend/models.md) | Domain model reference used by frontend features |
| [Backend Endpoints](./backend/endpoints.md) | Endpoint inventory consumed by `src/api/` |
| [Backend Services](./backend/services.md) | Business rules that affect frontend behavior |

## Product Scope

JIVO EXIM is an internal export-import operations frontend for:

- stock status and movement tracking;
- tank inventory and FIFO layer visibility;
- SAP-backed inventory, account, vendor, customer, AP/AR/PO, and GRPO reports;
- daily commodity pricing, Jivo rates, and exchange rates;
- domestic contracts across financial years;
- Advance License and DFIA License workflows;
- user and sync administration.

## Runtime Shape

```text
Browser
  -> React SPA served by Vite/static hosting
  -> Axios client with Bearer access token
  -> Django REST API
  -> SAP/PostgreSQL-backed services
```

## Source Of Truth

- Routes: `src/App.tsx`
- Navigation visibility: `src/components/Sidebar.tsx`
- Auth state and permissions: `src/context/AuthContext.tsx`
- API base client: `src/api/client.ts`
- API domains and types: `src/api/*.ts`
- Build/PWA config: `vite.config.ts`
