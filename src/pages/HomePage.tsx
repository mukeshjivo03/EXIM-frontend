import { useAuth } from "@/context/AuthContext";
import {
  Droplets,
  Container,
  Gauge,
  Users,
  RefreshCw,
  Truck,
  ScrollText,
} from "lucide-react";
import { Link } from "react-router-dom";

const quickLinks = [
  { to: "/stock/tank-monitoring", label: "Tank Monitoring", icon: Gauge, desc: "Live tank visuals" },
  { to: "/stock/tank-items", label: "Tank Items", icon: Droplets, desc: "Manage tank items" },
  { to: "/stock/tank-data", label: "Tank Data", icon: Container, desc: "Manage tanks" },
  { to: "/admin/users", label: "Users", icon: Users, desc: "Manage accounts" },
  { to: "/admin/sync-product-data", label: "Sync Products", icon: RefreshCw, desc: "SAP product sync" },
  { to: "/admin/sync-vendor-data", label: "Sync Vendors", icon: Truck, desc: "SAP vendor sync" },
  { to: "/admin/sync-logs", label: "Sync Logs", icon: ScrollText, desc: "View sync history" },
];

export default function HomePage() {
  const { name, role } = useAuth();

  const ROLE_LABELS: Record<string, string> = {
    ADM: "Administrator",
    FTR: "Factory User",
    MNG: "Manager",
  };

  return (
    <div className="p-6 space-y-8 animate-page">
      {/* Welcome header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {name ?? "User"}
        </h1>
        <p className="text-muted-foreground">
          {ROLE_LABELS[role ?? ""] ?? role ?? ""} &middot; JIVO EXIM Management System
        </p>
      </div>

      {/* Quick links grid */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          Quick Access
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {quickLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="card-hover shimmer-hover group rounded-xl border bg-card p-5 flex items-start gap-4 no-underline"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-200">
                <link.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground">{link.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{link.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
