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

export function statusBadgeVariant(s: string): "default" | "secondary" | "destructive" | "outline" {
  switch (s) {
    case "DELIVERED":
      return "default";
    case "PENDING":
    case "PROCESSING":
    case "IN_CONTRACT":
      return "secondary";
    case "OUT_SIDE_FACTORY":
      return "destructive";
    default:
      return "outline";
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
  OUT_SIDE_FACTORY: 0, ON_THE_WAY: 1, AT_REFINERY: 2, OTW_TO_REFINERY: 3,
  MUNDRA_PORT: 4, ON_THE_SEA: 5, IN_CONTRACT: 6, IN_TANK: 7,
  DELIVERED: 8, IN_TRANSIT: 9, PENDING: 10, PROCESSING: 11,
};
