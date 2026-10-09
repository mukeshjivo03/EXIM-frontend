import { Check, Minus, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { currentStepIndex, type FlowStep, type StepState } from "./flow";

const LINE_TONE: Record<StepState, string> = {
  done: "text-muted-foreground",
  partial: "text-primary font-medium",
  pending: "text-amber-700 dark:text-amber-400 font-medium",
  waiting: "text-muted-foreground",
  na: "text-muted-foreground",
  cancelled: "text-red-600 dark:text-red-400",
};

function StepCircle({ step, index, isCurrent, size }: { step: FlowStep; index: number; isCurrent: boolean; size: "lg" | "md" | "xs" }) {
  const dim = size === "lg" ? "h-8 w-8 text-sm" : size === "md" ? "h-7 w-7 text-xs" : "h-4 w-4 text-[9px]";
  const icon = size === "xs" ? "h-2.5 w-2.5" : "h-4 w-4";

  if (step.state === "done") {
    return (
      <span className={cn("flex items-center justify-center rounded-full bg-emerald-600 text-white", dim)}>
        <Check className={icon} strokeWidth={3} />
      </span>
    );
  }
  if (step.state === "cancelled") {
    return (
      <span className={cn("flex items-center justify-center rounded-full bg-red-600 text-white", dim)}>
        <X className={icon} strokeWidth={3} />
      </span>
    );
  }
  if (isCurrent) {
    return (
      <span className={cn("flex items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground ring-4 ring-primary/15", dim)}>
        {size !== "xs" && index + 1}
      </span>
    );
  }
  if (step.state === "na") {
    return (
      <span className={cn("flex items-center justify-center rounded-full border bg-card text-muted-foreground/60", dim)}>
        <Minus className={icon} />
      </span>
    );
  }
  return (
    <span
      className={cn(
        "flex items-center justify-center rounded-full border bg-card",
        step.state === "pending" ? "border-amber-400 text-amber-600 dark:text-amber-400" : "text-muted-foreground",
        dim
      )}
    >
      {size !== "xs" && index + 1}
    </span>
  );
}

/**
 * Horizontal progress tracker: numbered circles joined by a line, label and
 * status lines under each circle. `xs` renders circles only (for table rows).
 */
export function FlowStepper({ steps, size = "lg" }: { steps: FlowStep[]; size?: "lg" | "md" | "xs" }) {
  const current = currentStepIndex(steps);
  const lineTop = size === "lg" ? "top-4" : size === "md" ? "top-3.5" : "top-2";

  return (
    <ol className={cn("flex w-full", size !== "xs" && "min-w-[560px]")}>
      {steps.map((step, i) => (
        <li
          key={step.key}
          className="relative flex flex-1 flex-col items-center text-center"
          title={size === "xs" ? `${step.label}: ${step.lines.join(", ")}` : undefined}
        >
          {i < steps.length - 1 && (
            <span
              aria-hidden
              className={cn(
                "absolute left-1/2 h-0.5 w-full",
                lineTop,
                step.state === "done" ? "bg-emerald-500" : "bg-border"
              )}
            />
          )}
          <span className="relative z-10">
            <StepCircle step={step} index={i} isCurrent={i === current} size={size} />
          </span>
          {size !== "xs" && (
            <div className="mt-2 px-1">
              <p className={cn("font-medium leading-tight", size === "lg" ? "text-sm" : "text-xs", i === current && "text-primary")}>
                {step.label}
              </p>
              {step.lines.map((line, j) => (
                <p key={j} className={cn("mt-0.5 leading-snug", size === "lg" ? "text-xs" : "text-[11px]", LINE_TONE[step.state])}>
                  {line}
                </p>
              ))}
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}
