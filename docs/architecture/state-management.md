# State Management & Data Flow

## Overview

The app uses **React Context** for global state and **local component state** (`useState`) for page-level data. There is no external state library (Redux, Zustand, etc.).

---

## Context Providers

### 1. AuthContext (`src/context/AuthContext.tsx`)

**Purpose:** Manages authentication state (user identity + login status).

**State:**

| Field | Type | Source |
|-------|------|--------|
| `role` | `"ADM" \| "FTR" \| "MNG" \| null` | `localStorage.user_role` |
| `name` | `string \| null` | `localStorage.user_name` |
| `email` | `string \| null` | `localStorage.user_email` |

**Computed:**
- `isLoggedIn` = `!!localStorage.access_token && role !== null`

**Methods:**
- `setAuth(name, role, email)` - Called after successful login
- `clearAuth()` - Called on logout, clears localStorage + state

**Usage:**
```typescript
const { role, name, isLoggedIn, clearAuth } = useAuth();
```

---

### 2. ThemeContext (`src/context/ThemeContext.tsx`)

**Purpose:** Manages light/dark theme preference.

**State:**

| Field | Type | Default |
|-------|------|---------|
| `theme` | `"light" \| "dark"` | System preference or localStorage |

**Methods:**
- `toggleTheme()` - Switches between light/dark

**Side Effects:**
- Toggles `.dark` class on `document.documentElement`
- Persists to `localStorage`

**Usage:**
```typescript
const { theme, toggleTheme } = useTheme();
```

---

### 3. DailyPriceContext (`src/context/DailyPriceContext.tsx`)

**Purpose:** Caches commodity price data to avoid redundant API calls.

**State:**

| Field | Type | Default |
|-------|------|---------|
| `prices` | `CommodityPrice[]` | `[]` |
| `count` | `number` | `0` |
| `fetched` | `boolean` | `false` |

**Methods:**
- `setPrices(prices)` - Update cached prices
- `setCount(count)` - Update count
- `setFetched(fetched)` - Mark as fetched
- `clear()` - Reset all state

**How it's used:**
The DailyPricePage checks `fetched` before calling the API. If already fetched, it uses the cached data.

---

### 4. JivoRateContext (`src/context/JivoRateContext.tsx`)

**Purpose:** Caches Jivo commodity rate data shared across components.

---

### 5. OpenGrpoContext (`src/context/OpenGrpoContext.tsx`)

**Purpose:** Caches open GRPO data to avoid re-fetching when navigating between pages.

---

## Data Flow Patterns

### Pattern 1: Page-Level Fetch

Most pages fetch data on mount and manage it locally:

```
Component Mount
  |-> useEffect with fetchData()
  |-> API call via src/api/*.ts
  |-> setState with response
  |-> Render table/cards
```

```typescript
const [data, setData] = useState<Type[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");

async function fetchData() {
  setLoading(true);
  try {
    const result = await apiCall();
    setData(result);
  } catch (err) {
    setError(getErrorMessage(err));
  } finally {
    setLoading(false);
  }
}

useEffect(() => { fetchData(); }, []);
```

### Pattern 2: CRUD with Dialog

Pages with create/edit/delete operations:

```
List View
  |
  |-> [Create] -> Open dialog -> Fill form -> API POST -> Close dialog -> Refetch list
  |
  |-> [Edit]   -> Open dialog with existing data -> API PUT/PATCH -> Close -> Refetch
  |
  |-> [Delete] -> Confirmation dialog -> API DELETE -> Refetch
```

Each operation triggers `fetchData()` on success to refresh the list.

### Pattern 3: Cross-Component Communication

The Navbar search can delete items across domains. Since the list pages aren't always mounted, custom DOM events are used:

```
Navbar                          SyncRawMaterialDataPage
  |                                     |
  |-- deleteRmItem(code) ------->       |
  |-- dispatch("rm-items-updated") -->  |
  |                              addEventListener("rm-items-updated")
  |                                     |-> fetchData()
```

### Pattern 4: Master-Detail Navigation

License pages use a two-level navigation:

```
AdvanceLicensePage (list of headers)
  |
  |-> Click row -> navigate("/license/advance-license/:licenseNo")
  |
  v
AdvanceLicenseDetailPage (lines for that header)
  |
  |-> useParams() to get licenseNo
  |-> Fetch header (includes nested lines)
  |-> Render lines table with create/edit
```

---

## localStorage Keys

| Key | Set By | Read By | Purpose |
|-----|--------|---------|---------|
| `access_token` | LoginPage, client.ts | client.ts, AuthContext | JWT access token |
| `refresh_token` | LoginPage, client.ts | client.ts, auth.ts | JWT refresh token |
| `user_role` | LoginPage | AuthContext | User role code |
| `user_name` | LoginPage | AuthContext | Display name |
| `user_email` | LoginPage | AuthContext | Email address |
| `theme` | ThemeContext | ThemeContext | "light" or "dark" |

---

## No Global State Library

The app deliberately avoids Redux/Zustand. State is managed at two levels:

1. **Global (Context):** Auth, theme, and cached daily prices
2. **Local (useState):** All page data, form state, dialog state, loading/error state

This works well because:
- Pages are independent - they don't share data
- List data is always re-fetched when navigating to a page
- The only truly shared state is auth/theme (which rarely changes)
