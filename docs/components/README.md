# Components

## Directory Structure

```
src/components/
  |- Layout.tsx          # Page shell with sidebar + navbar + footer
  |- Sidebar.tsx         # Collapsible navigation sidebar
  |- Navbar.tsx          # Top bar with branding, search, theme toggle
  |- Footer.tsx          # Copyright footer
  |- ProtectedRoute.tsx  # Auth + role guard
  |- Pagination.tsx      # Reusable pagination bar
  |- SummaryCard.tsx     # Stat display card (icon + label + value)
  |- StatusHero.tsx      # SVG hero illustrations per stock status
  |- ui/                 # shadcn/ui primitives
```

---

## Layout (`Layout.tsx`)

The main application shell rendered for all authenticated routes.

### Structure

```
+---------------------------------------------------+
| Navbar (fixed top, glass-navbar)                   |
+--------+------------------------------------------+
| Sidebar| Main Content Area (<Outlet />)            |
| (fixed | Content adjusts padding based on          |
|  left) | sidebar collapsed state                   |
|        |                                           |
+--------+------------------------------------------+
| Footer (fixed bottom)                              |
+---------------------------------------------------+
```

### Props: None

### Key behavior:
- Manages `collapsed` state for the sidebar
- Main content area: `pl-56` (sidebar expanded) or `pl-16` (collapsed)
- Uses `<Outlet />` from React Router to render child routes

---

## Sidebar (`Sidebar.tsx`)

Collapsible navigation sidebar with role-based link filtering.

### Props

```typescript
{
  collapsed: boolean;
  onToggle: () => void;
}
```

### Navigation Sections

Each section is defined as an array of link objects with optional role restrictions:

| Section | Links | Roles |
|---------|-------|-------|
| Home | `/` | All |
| Dashboard | `/dashboard`, `/stock-dashboard` | ADM, MNG |
| Stock | Tank Monitoring, Tank Items, Tank Data, Tank Logs, Stock Status, Stock Updation Logs | All / ADM+MNG |
| Commodity | Daily Price, Jivo Rates | ADM, MNG |
| Accounts | Dr/Cr Outstanding (EXIM Account), Open GRPOs | ADM, MNG |
| Contracts | Domestic Contract | ADM, MNG |
| License | Advance License, DFIA License | ADM, MNG |
| Admin Only | Users, Sync Raw Material, Sync Finished Goods, Sync Vendor Data, Sync Logs | ADM |

### Features:
- Active link styling with left accent bar (`sidebar-link-active`)
- Profile dialog showing name, email, role badge
- Logout confirmation dialog
- Collapse/expand toggle button
- Tooltips when collapsed (shows link label)

---

## Navbar (`Navbar.tsx`)

Fixed top navigation bar.

### Features

1. **Branding:** "JIVO EXIM" text
2. **Global Search:**
   - Searches across 4 domains simultaneously: RM items, FG items, Vendors, Tank items
   - Uses `Promise.allSettled()` for parallel search
   - Results shown in a modal dialog with item details
   - Each result has a delete button with confirmation
   - On successful deletion, dispatches custom events:
     - `rm-items-updated`
     - `fg-items-updated`
     - `vendors-updated`
     - `tank-items-updated`
3. **Theme Toggle:** Moon/Sun icon button to switch dark/light mode

### API Functions Used

- `getRmItem()`, `deleteRmItem()` (raw materials)
- `getFgItem()`, `deleteFgItem()` (finished goods)
- `getVendor()`, `deleteVendor()` (vendors)
- `getTankItem()`, `deleteTankItem()` (tank items)

---

## Pagination (`Pagination.tsx`)

Reusable pagination component used across list pages.

### Props

```typescript
{
  page: number;           // current page (1-indexed)
  totalPages: number;     // total number of pages
  totalItems: number;     // total items in dataset
  perPage: number;        // items per page
  onPageChange: (page: number) => void;
}
```

### Behavior:
- Returns `null` if everything fits on one page
- Shows "Showing X-Y of Z" text
- Smart page number generation (1, ..., current-2..current+2, ..., last)
- Previous/Next buttons with disabled state at boundaries

---

## SummaryCard (`SummaryCard.tsx`)

Card component for displaying a single statistic.

### Props

```typescript
{
  icon: LucideIcon;         // lucide-react icon component
  label: string;            // descriptive label
  value: string | number;   // displayed value
  loading?: boolean;        // show skeleton placeholder
}
```

### Usage Example

```tsx
<SummaryCard
  icon={Package}
  label="Total Items"
  value={42}
  loading={false}
/>
```

---

## StatusHero (`StatusHero.tsx`)

Renders SVG hero illustrations based on stock status codes. Each status has a unique visual.

### Props

```typescript
{
  status: string;
}
```

### Supported Statuses and Their Visuals

| Status Code | Visual |
|-------------|--------|
| `ON_THE_SEA` | Cargo ship on calm ocean |
| `MUNDRA_PORT` | Port with gantry cranes and containers |
| `KANDLA_STORAGE` | Storage facility with warehouses |
| `UNDER_LOADING` | Loading operation with crane |
| `OTW_TO_REFINERY` | Truck in transit on highway |
| `AT_REFINERY` | Refinery facility |
| `IN_TRANSIT` | Moving truck on road |
| `IN_FACTORY` | Factory building |
| `OUT_SIDE_FACTORY` | Exterior factory view |
| `IN_CONTRACT` | Contract/document |
| `PENDING` | Hourglass |
| `PROCESSING` | Processing machinery |
| `COMPLETED` | Checkmark |
| `DELIVERED` | Truck with checkmark |

All illustrations are inline SVGs with gradients and subtle animations.

---

## ProtectedRoute (`ProtectedRoute.tsx`)

See [Authentication & Authorization](../auth/README.md) for full details.

---

## shadcn/ui Components (`ui/`)

These are generated components from the shadcn/ui library built on Radix UI primitives. They follow shadcn conventions and should NOT be manually edited unless customizing variants.

| Component | File | Variants/Notes |
|-----------|------|----------------|
| Button | `button.tsx` | default, destructive, outline, secondary, ghost, link; sizes: default, sm, lg, icon |
| Input | `input.tsx` | Standard text input with focus ring |
| Label | `label.tsx` | Accessible form labels |
| Card | `card.tsx` | Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter |
| Table | `table.tsx` | Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption, TableFooter |
| Dialog | `dialog.tsx` | Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter |
| Select | `select.tsx` | Select, SelectTrigger, SelectValue, SelectContent, SelectItem |
| Badge | `badge.tsx` | default, secondary, destructive, outline |
| Skeleton | `skeleton.tsx` | Loading placeholder with pulse animation |
| Separator | `separator.tsx` | Horizontal/vertical divider |
| Sonner | `sonner.tsx` | Toast notification wrapper for Sonner library |
| Checkbox | `checkbox.tsx` | Accessible checkbox input |
| Calendar | `calendar.tsx` | Day picker calendar (used inside DatePicker) |
| Popover | `popover.tsx` | Floating popover container |

### Custom Components (`ui/`)

| Component | File | Notes |
|-----------|------|-------|
| DatePicker | `date-picker.tsx` | Calendar-based date selector; value/onChange use `"YYYY-MM-DD"` strings; displays as `dd MMM yyyy` |

### Styling

All shadcn components use `class-variance-authority` (CVA) for variant management and `tailwind-merge` via the `cn()` utility function from `src/lib/utils.ts`:

```typescript
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```
