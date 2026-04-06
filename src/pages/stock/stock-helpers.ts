import {
  FileText,
  Ship,
  Anchor,
  Truck,
  Factory,
  Package,
  Warehouse,
} from "lucide-react";
import type { StockStatusChoice } from "@/api/stockStatus";

/* ── Format & Badge helpers ─────────────────────────────── */

export function formatStatus(s: string) {
  return s.replace(/_/g, " ");
}

export function statusColorClass(s: string): string {
  switch (s) {
    case "OUT_SIDE_FACTORY":
      return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800";
    case "UNDER_LOADING":
      return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800";
    case "ON_THE_SEA":
      return "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800";
    case "MUNDRA_PORT":
      return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800";
    case "IN_CONTRACT":
      return "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800";
    case "ON_THE_WAY":
    case "OTW_TO_REFINERY":
      return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800";
    case "AT_REFINERY":
      return "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800";
    case "DELIVERED":
    case "COMPLETED":
    case "IN_TANK":
    case "KANDLA_STORAGE":
      return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800";
    case "PENDING":
    case "PROCESSING":
      return "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export function getEtaCountdown(eta: string) {
  if (!eta) return null;
  const target = new Date(eta);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return { text: "Today", variant: "warning" as const };
  if (diffDays === 1) return { text: "Tomorrow", variant: "info" as const };
  if (diffDays > 1) return { text: `In ${diffDays} days`, variant: "default" as const };
  return { text: `${Math.abs(diffDays)} days ago`, variant: "muted" as const };
}

/* ── Journey Steps for Timeline ─────────────────────────── */

export const JOURNEY_STEPS: { status: StockStatusChoice; label: string; icon: any }[] = [
  { status: "IN_CONTRACT", label: "Contract", icon: FileText },
  { status: "ON_THE_SEA", label: "Sea", icon: Ship },
  { status: "MUNDRA_PORT", label: "Port", icon: Anchor },
  { status: "ON_THE_WAY", label: "Transit", icon: Truck },
  { status: "AT_REFINERY", label: "Refinery", icon: Factory },
  { status: "UNDER_LOADING", label: "Underloading", icon: Package },
  { status: "OTW_TO_REFINERY", label: "OTW", icon: Truck },
  { status: "OUT_SIDE_FACTORY", label: "Outside Factory", icon: Truck },
  { status: "KANDLA_STORAGE", label: "Tank", icon: Warehouse },
];

/* ── Status sort order for table ────────────────────────── */

export const STATUS_ORDER: Record<string, number> = {
  OUT_SIDE_FACTORY: 0, ON_THE_WAY: 1, UNDER_LOADING: 2, AT_REFINERY: 3,
  OTW_TO_REFINERY: 4, KANDLA_STORAGE: 5, MUNDRA_PORT: 6, ON_THE_SEA: 7,
  IN_CONTRACT: 8, IN_TANK: 9, DELIVERED: 10, IN_TRANSIT: 11,
  PENDING: 12, PROCESSING: 13, COMPLETED: 14,
};
