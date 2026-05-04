import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  CircleUser,
  LogOut,
  Home,
  Users,
  PanelLeftClose,
  PanelLeftOpen,
  Mail,
  Shield,
  User,
  RefreshCw,
  Truck,
  ScrollText,
  Droplets,
  Container,
  Gauge,
  ClipboardList,
  IndianRupee,
  TrendingUp,
  LayoutDashboard,
  BarChart3,
  Crown,
  Scale,
  FileText,
  FileCheck,
  ShieldCheck,
  Receipt,
  Globe,
  Warehouse,
  Activity,
  ReceiptText,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import { useHasPermission } from "@/hooks/useHasPermission";
import { logout as logoutApi } from "@/api/auth";
import type { LucideIcon } from "lucide-react";

/* ── Data-driven link type ─────────────────────────────────── */
interface SidebarLink {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Permission modules required — link visible if user has ANY of these. Empty = visible to all. */
  modules?: string[];
}

interface SidebarSection {
  label: string;
  links: SidebarLink[];
}

/* ── Section definitions ───────────────────────────────────── *
 * Each link can optionally specify `modules` — an array of
 * backend permission keys. The link renders if the user has
 * at least ONE of them. If `modules` is omitted the link is
 * visible to every authenticated user.
 *
 * Sections auto-hide when none of their links are visible.
 * To add a new page: just add an entry here with its module(s).
 * ──────────────────────────────────────────────────────────── */
const SIDEBAR_SECTIONS: SidebarSection[] = [
  {
    label: "Reports",
    links: [
      { to: "/dashboard",                label: "Dashboard",           icon: LayoutDashboard, modules: ["domesticreports", "stockstatus"] },
      { to: "/stock-dashboard",           label: "Stock Dashboard",     icon: BarChart3,       modules: ["stockstatus"] },
      { to: "/reports/director-dashboard",label: "Director Dashboard",  icon: Crown,           modules: ["director_report", "director_inventory", "director_inventorty", "domesticreports"] },
      { to: "/stock/warehouse-inventory", label: "Warehouse Inventory", icon: Warehouse,       modules: ["inventory", "stockstatus"] },
      { to: "/reports/vehicle-report",    label: "Vehicle Report",      icon: Truck,           modules: ["vehicle_report"] },
    ],
  },
  {
    label: "Stock",
    links: [
      { to: "/stock/stock-status",   label: "Stock Status",    icon: ClipboardList, modules: ["stockstatus"] },
      { to: "/stock/variance",       label: "Shortage Report",  icon: Activity,      modules: ["stockstatus"] },
      { to: "/stock/tank-items",     label: "Tank Items",      icon: Droplets,      modules: ["tankitem"] },
      { to: "/stock/tank-monitoring",label: "Tank Monitoring",  icon: Gauge,         modules: ["tankdata", "tanklayer"] },
      { to: "/stock/tank-data",      label: "Tank Data",       icon: Container,     modules: ["tankdata"] },
      { to: "/stock/tank-logs",      label: "Tank Logs",       icon: ScrollText,    modules: ["tanklog"] },
    ],
  },
  {
    label: "Domestic Contracts",
    links: [
      { to: "/domestic-contracts",       label: "FY 2025-2026", icon: FileCheck, modules: ["domesticcontract"] },
      { to: "/contracts/domestic-2627",  label: "FY 2026-2027", icon: FileCheck, modules: ["domesticcontract"] },
    ],
  },
  {
    label: "Accounts",
    links: [
      { to: "/exim-account",        label: "Dr/Cr Outstanding", icon: Scale,   modules: ["debitentry"] },
      { to: "/accounts/customer-outstanding", label: "Customer Outstanding", icon: ReceiptText, modules: ["customer_balance_sheet"] },
      { to: "/accounts/open-aps",   label: "Open APs",          icon: ReceiptText, modules: ["balance_sheet"] },
      { to: "/contracts/open-grpos", label: "Open GRPOs",        icon: Receipt, modules: ["open_grpos"] },
    ],
  },
  {
    label: "Commodity Price",
    links: [
      { to: "/commodity/daily-price", label: "Show Daily Price", icon: IndianRupee, modules: ["dailyprice"] },
      { to: "/commodity/jivo-rates",  label: "Jivo Rates",       icon: TrendingUp,  modules: ["jivorates"] },
    ],
  },
  {
    label: "Custom Exchange Rates",
    links: [
      { to: "/exim-rates", label: "Exchange Rates", icon: Globe, modules: ["exim_rates"] },
    ],
  },
  {
    label: "License",
    links: [
      { to: "/license/advance-license", label: "Advance License", icon: FileText,   modules: ["advancelicenseheaders"] },
      { to: "/license/dfia-license",    label: "DFIA License",    icon: ShieldCheck, modules: ["dfialicenseheader"] },
    ],
  },
  {
    label: "Administration",
    links: [
      { to: "/admin/users",                  label: "Users",               icon: Users,         modules: ["user"] },
      { to: "/admin/sync-raw-material-data",  label: "Sync Raw Material",   icon: RefreshCw,     modules: ["rmproducts"] },
      { to: "/admin/sync-finished-goods-data",label: "Sync Finished Goods", icon: RefreshCw,     modules: ["fgproducts"] },
      { to: "/admin/sync-vendor-data",        label: "Sync Vendor Data",    icon: Truck,         modules: ["party"] },
      { to: "/admin/sync-logs",               label: "Sync Logs",           icon: ScrollText,    modules: ["synclogs"] },
      { to: "/admin/stock-updation-logs",     label: "Stock Updation Logs", icon: ClipboardList, modules: ["stockstatusupdatelog"] },
    ],
  },
];

/* ── Helpers ────────────────────────────────────────────────── */

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
}

function SectionLabel({
  label,
  collapsed,
  isActive,
}: {
  label: string;
  collapsed: boolean;
  isActive: boolean;
}) {
  if (collapsed) return null;
  return (
    <span
      className={`px-3 py-1 text-xs font-semibold uppercase tracking-wider transition-colors ${isActive
          ? "text-foreground"
          : "text-muted-foreground"
        }`}
    >
      {isActive && (
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary mr-1.5 align-middle" />
      )}
      {label}
    </span>
  );
}

const linkClass = (isActive: boolean, collapsed: boolean) =>
  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${isActive
    ? "bg-accent text-accent-foreground shadow-sm sidebar-link-active"
    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
  } ${collapsed ? "justify-center px-0" : ""}`;

/* ── Component ─────────────────────────────────────────────── */

export default function Sidebar({ collapsed, onToggle, mobileOpen }: SidebarProps) {
  const { permissions, name, email, clearAuth } = useAuth();
  const { hasPermission } = useHasPermission();
  const navigate = useNavigate();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  /** A link is visible if it has no module requirement OR the user has at least one of the listed modules */
  function isLinkVisible(link: SidebarLink): boolean {
    if (!link.modules || link.modules.length === 0) return true;
    return link.modules.some((module) => hasPermission(module, "view"));
  }

  /** Filter to only visible links */
  function visibleLinks(links: SidebarLink[]): SidebarLink[] {
    return links.filter(isLinkVisible);
  }

  function isSectionActive(links: SidebarLink[]) {
    return links.some((link) => location.pathname.startsWith(link.to));
  }

  async function handleLogout() {
    try {
      await logoutApi();
    } catch {
      // proceed even if API fails
    }
    clearAuth();
    navigate("/login");
  }

  return (
    <>
      <aside
        className={`fixed left-0 top-14 bottom-12 border-r glass-sidebar flex flex-col transition-all duration-300 z-40 ${mobileOpen ? "translate-x-0 w-56" : "-translate-x-full w-56"
          } md:translate-x-0 ${collapsed ? "md:w-16" : "md:w-56"}`}
      >
        {/* Toggle button */}
        <div className={`flex p-2 ${collapsed ? "justify-center" : "justify-end"}`}>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggle}>
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1 px-2 flex-1 overflow-y-auto">
          {/* Home — always visible */}
          <NavLink
            to="/"
            end
            title="Home"
            className={({ isActive }) => linkClass(isActive, collapsed)}
          >
            <Home className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Home</span>}
          </NavLink>

          {/* Dynamic sections */}
          {SIDEBAR_SECTIONS.map((section) => {
            const visible = visibleLinks(section.links);
            if (visible.length === 0) return null;
            return (
              <div key={section.label}>
                <Separator className="my-3" />
                <SectionLabel
                  label={section.label}
                  collapsed={collapsed}
                  isActive={isSectionActive(visible)}
                />
                {visible.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    title={link.label}
                    className={({ isActive }) => linkClass(isActive, collapsed)}
                  >
                    <link.icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>{link.label}</span>}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>

        {/* Bottom section: profile + logout */}
        <div className="border-t p-2">
          <button
            onClick={() => setProfileOpen(true)}
            className={`flex w-full items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-left hover:bg-muted transition-colors ${collapsed ? "justify-center px-0" : ""
              }`}
          >
            <CircleUser className="h-5 w-5 shrink-0 text-muted-foreground" />
            {!collapsed && (
              <span className="truncate text-sm font-medium flex-1">{name}</span>
            )}
          </button>
          <Button
            variant="ghost"
            size="sm"
            className={`mt-2 w-full gap-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/50 ${collapsed ? "justify-center px-0" : "justify-start"
              }`}
            onClick={() => setLogoutOpen(true)}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Logout</span>}
          </Button>
        </div>
      </aside>

      {/* Profile dialog */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Profile</DialogTitle>
            <DialogDescription>Your account details</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-3 py-2">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <span className="text-2xl font-semibold">
                {name?.charAt(0).toUpperCase() ?? "U"}
              </span>
            </div>
            <h3 className="text-lg font-semibold">{name ?? "Unknown"}</h3>
            <Badge variant="secondary">{Object.keys(permissions).length > 0 ? "Active" : "—"}</Badge>
          </div>

          <Separator />

          <div className="space-y-3 py-1">
            <div className="flex items-center gap-3 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground text-xs">Name</p>
                <p className="font-medium">{name ?? "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground text-xs">Email</p>
                <p className="font-medium">{email ?? "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground text-xs">Permissions</p>
                <p className="font-medium">{Object.keys(permissions).length} modules</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Logout confirmation dialog */}
      <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm Logout</DialogTitle>
            <DialogDescription>
              Are you sure you want to log out?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogoutOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setLogoutOpen(false);
                handleLogout();
              }}
            >
              Logout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
