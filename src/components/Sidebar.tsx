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
  Scale,
  FileText,
  FileCheck,
  ShieldCheck,
  Receipt,
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
import { logout as logoutApi } from "@/api/auth";

const ROLE_LABELS: Record<string, string> = {
  ADM: "Admin",
  FTR: "Factory",
  MNG: "Manager",
};

const stockLinks = [
  { to: "/stock/stock-status", label: "Stock Status", icon: ClipboardList },
  { to: "/stock/tank-items", label: "Tank Items", icon: Droplets },
  { to: "/stock/tank-monitoring", label: "Tank Monitoring", icon: Gauge },
  { to: "/stock/tank-data", label: "Tank Data", icon: Container },
  { to: "/stock/tank-logs", label: "Tank Logs", icon: ScrollText },
  { to: "/admin/stock-updation-logs", label: "Stock Updation Logs", icon: ClipboardList },
];

const commodityLinks = [
  { to: "/commodity/daily-price", label: "Show Daily Price", icon: IndianRupee },
  { to: "/commodity/jivo-rates", label: "Jivo Rates", icon: TrendingUp },
];

const accountsLinks = [
  { to: "/exim-account", label: "Dr/Cr Outstanding", icon: Scale },
];

const contractsLinks = [
  { to: "/domestic-contracts", label: "Domestic Contract", icon: FileCheck },
  { to: "/contracts/open-grpos", label: "Open GRPOs", icon: Receipt },
];

const licenseLinks = [
  { to: "/license/advance-license", label: "Advance License", icon: FileText },
  { to: "/license/dfia-license", label: "DFIA License", icon: ShieldCheck },
];

const adminLinks = [
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/sync-raw-material-data", label: "Sync Raw Material", icon: RefreshCw },
  { to: "/admin/sync-finished-goods-data", label: "Sync Finished Goods", icon: RefreshCw },
  { to: "/admin/sync-vendor-data", label: "Sync Vendor Data", icon: Truck },
  { to: "/admin/sync-logs", label: "Sync Logs", icon: ScrollText },
];

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
      className={`px-3 py-1 text-xs font-semibold uppercase tracking-wider transition-colors ${
        isActive
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

export default function Sidebar({ collapsed, onToggle, mobileOpen }: SidebarProps) {
  const { role, name, email, clearAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = role === "ADM";
  const isAdminOrManager = role === "ADM" || role === "MNG";
  const [profileOpen, setProfileOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  // Check if any link in a section is active
  function isSectionActive(links: { to: string }[]) {
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
        className={`fixed left-0 top-14 bottom-12 border-r glass-sidebar flex flex-col transition-all duration-300 z-40 ${
          mobileOpen ? "translate-x-0 w-56" : "-translate-x-full w-56"
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
          <NavLink
            to="/"
            end
            title="Home"
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-accent text-accent-foreground shadow-sm sidebar-link-active"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              } ${collapsed ? "justify-center px-0" : ""}`
            }
          >
            <Home className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Home</span>}
          </NavLink>
          {isAdminOrManager && (
            <>
              <NavLink
                to="/dashboard"
                title="Dashboard"
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-accent text-accent-foreground shadow-sm sidebar-link-active"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  } ${collapsed ? "justify-center px-0" : ""}`
                }
              >
                <LayoutDashboard className="h-4 w-4 shrink-0" />
                {!collapsed && <span>Dashboard</span>}
              </NavLink>
              <NavLink
                to="/stock-dashboard"
                title="Stock Dashboard"
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-accent text-accent-foreground shadow-sm sidebar-link-active"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  } ${collapsed ? "justify-center px-0" : ""}`
                }
              >
                <BarChart3 className="h-4 w-4 shrink-0" />
                {!collapsed && <span>Stock Dashboard</span>}
              </NavLink>
            </>
          )}

          {/* ── Stock section (Tank pages: all roles, Stock Status: ADM|MNG) ── */}
          <Separator className="my-3" />

          <SectionLabel label="Stock" collapsed={collapsed} isActive={isSectionActive(stockLinks)} />

          {stockLinks.map((link) => {
            // Stock Status & Stock Updation Logs require ADM|MNG; Tank pages are for all authenticated users
            const needsAdmMng = link.to === "/stock/stock-status" || link.to === "/admin/stock-updation-logs";
            if (needsAdmMng && !isAdminOrManager) return null;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                title={link.label}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-accent text-accent-foreground shadow-sm sidebar-link-active"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  } ${collapsed ? "justify-center px-0" : ""}`
                }
              >
                <link.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{link.label}</span>}
              </NavLink>
            );
          })}

          {/* ── Commodity Price (ADM | MNG) ── */}
          {isAdminOrManager && (
            <>
              <Separator className="my-3" />

              <SectionLabel label="Commodity Price" collapsed={collapsed} isActive={isSectionActive(commodityLinks)} />

              {commodityLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  title={link.label}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-accent text-accent-foreground shadow-sm sidebar-link-active"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                    } ${collapsed ? "justify-center px-0" : ""}`
                  }
                >
                  <link.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{link.label}</span>}
                </NavLink>
              ))}
            </>
          )}

          {/* ── Accounts (ADM | MNG) ── */}
          {isAdminOrManager && (
            <>
              <Separator className="my-3" />

              <SectionLabel label="Accounts" collapsed={collapsed} isActive={isSectionActive(accountsLinks)} />

              {accountsLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  title={link.label}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-accent text-accent-foreground shadow-sm sidebar-link-active"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                    } ${collapsed ? "justify-center px-0" : ""}`
                  }
                >
                  <link.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{link.label}</span>}
                </NavLink>
              ))}
            </>
          )}

          {/* ── Contracts (ADM | MNG) ── */}
          {isAdminOrManager && (
            <>
              <Separator className="my-3" />

              <SectionLabel label="Contracts" collapsed={collapsed} isActive={isSectionActive(contractsLinks)} />

              {contractsLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  title={link.label}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-accent text-accent-foreground shadow-sm sidebar-link-active"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                    } ${collapsed ? "justify-center px-0" : ""}`
                  }
                >
                  <link.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{link.label}</span>}
                </NavLink>
              ))}
            </>
          )}

          {/* ── License (ADM | MNG) ── */}
          {isAdminOrManager && (
            <>
              <Separator className="my-3" />

              <SectionLabel label="License" collapsed={collapsed} isActive={isSectionActive(licenseLinks)} />

              {licenseLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  title={link.label}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-accent text-accent-foreground shadow-sm sidebar-link-active"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                    } ${collapsed ? "justify-center px-0" : ""}`
                  }
                >
                  <link.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{link.label}</span>}
                </NavLink>
              ))}
            </>
          )}

          {/* ── Administration (ADM only) ── */}
          {isAdmin && (
            <>
              <Separator className="my-3" />

              <SectionLabel label="Administration" collapsed={collapsed} isActive={isSectionActive(adminLinks)} />

              {adminLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  title={link.label}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-accent text-accent-foreground shadow-sm sidebar-link-active"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                    } ${collapsed ? "justify-center px-0" : ""}`
                  }
                >
                  <link.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{link.label}</span>}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        {/* Bottom section: profile + logout */}
        <div className="border-t p-2">
          <button
            onClick={() => setProfileOpen(true)}
            className={`flex w-full items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-left hover:bg-muted transition-colors ${
              collapsed ? "justify-center px-0" : ""
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
            className={`mt-2 w-full gap-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/50 ${
              collapsed ? "justify-center px-0" : "justify-start"
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
            <Badge variant="secondary">{ROLE_LABELS[role ?? ""] ?? role ?? "—"}</Badge>
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
                <p className="text-muted-foreground text-xs">Role</p>
                <p className="font-medium">{ROLE_LABELS[role ?? ""] ?? role ?? "—"}</p>
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
