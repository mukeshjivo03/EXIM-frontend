import { AlertCircle, CheckCircle2, Clock, Truck } from "lucide-react";

import type { SapPoFlow } from "@/api/stockStatus";
import { cn } from "@/lib/utils";
import { currentStepIndex, poStatus, poSteps } from "./flow";

/** Small status pill for a PO, e.g. "Pending · Landed Cost" or "All posted". */
export function PoStatusBadge({ flow, className }: { flow?: SapPoFlow; className?: string }) {
  const status = poStatus(flow);
  const base = "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap";

  if (status === "complete") {
    return (
      <span className={cn(base, "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300", className)}>
        <CheckCircle2 className="h-3 w-3" /> All posted in SAP
      </span>
    );
  }
  if (status === "pending" && flow?.found) {
    const steps = poSteps(flow);
    return (
      <span className={cn(base, "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300", className)}>
        <Clock className="h-3 w-3" /> Pending · {steps[currentStepIndex(steps)].label}
      </span>
    );
  }
  if (status === "no-grpo") {
    return (
      <span className={cn(base, "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-300", className)}>
        <Truck className="h-3 w-3" /> Awaiting first truck
      </span>
    );
  }
  return (
    <span className={cn(base, "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300", className)}>
      <AlertCircle className="h-3 w-3" /> {status === "not-found" ? "PO not found in SAP" : "SAP unavailable"}
    </span>
  );
}
