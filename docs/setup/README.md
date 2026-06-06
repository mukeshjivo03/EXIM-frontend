# Setup & Development

## Prerequisites

- Node.js 18 or newer
- npm
- Backend API available locally or remotely

## Install

```bash
npm install
```

## Environment

Create `.env` in the project root when overriding the default API URL:

```env
VITE_API_BASE_URL=http://localhost:8000
```

| Variable | Default in code | Purpose |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `http://localhost:8000` | Backend API base URL used by Axios |

Vite exposes only variables prefixed with `VITE_`.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Starts Vite on port `5003` with LAN access |
| `npm run build` | Builds static assets into `dist/` |
| `npm run preview` | Serves the production build locally |
| `npm run lint` | Runs ESLint across the repo |

## Development Server

`vite.config.ts` sets:

- `server.host = "0.0.0.0"`
- `server.port = 5003`
- alias `@/` to `src/`
- `__APP_VERSION__` from `package.json`
- PWA plugin disabled during dev through `devOptions.enabled = false`

## Production Build

```bash
npm run build
```

The static output is written to `dist/`. Host it with any static web server and configure SPA fallback so unknown routes return `index.html`.

Examples:

```nginx
try_files $uri $uri/ /index.html;
```

## Deployment Files

| File | Purpose |
| --- | --- |
| `.github/workflows/frontend-deploy.yml` | Self-hosted runner deployment workflow |
| `deploy_frontend.bat` | Pulls latest code, installs dependencies, builds frontend |
| `vite.config.ts` | Build, chunking, dev server, PWA, alias config |

## Adding A Feature

1. Add or extend a domain module in `src/api/`.
2. Add the page under `src/pages/<domain>/`.
3. Register the route in `src/App.tsx`.
4. Add navigation metadata in `src/components/Sidebar.tsx`.
5. Add shared state only when multiple mounted areas need the same data.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| API calls fail with network errors | `VITE_API_BASE_URL`, backend availability, CORS |
| Redirected to `/login` | Missing/expired token or empty `user_permissions` |
| 401 repeats | Refresh endpoint or refresh token failed |
| Blank page after deploy | Static server needs SPA fallback to `index.html` |
| Page hidden in sidebar | User lacks `view` permission for that module |
