import { cn } from "@/lib/utils";
import { JOURNEY_STEPS } from "../stock-helpers";

export function StatusTimeline({ currentStatus }: { currentStatus: string }) {
  const currentIndex = JOURNEY_STEPS.findIndex((s) => s.status === currentStatus);
  const activeIndex = currentIndex === -1 ? 0 : currentIndex;

  return (
    <div className="py-6 overflow-x-auto">
      <div className="flex items-center min-w-[700px] px-4">
        {JOURNEY_STEPS.map((step, idx) => {
          const isCompleted = idx < activeIndex;
          const isActive = idx === activeIndex;
          const Icon = step.icon;

          return (
            <div key={step.status} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-2 relative">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-500 z-10 bg-background",
                    isCompleted
                      ? "border-primary bg-primary text-primary-foreground"
                      : isActive
                      ? "border-primary text-primary shadow-[0_0_10px_rgba(var(--primary),0.3)] animate-pulse"
                      : "border-muted text-muted-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-wider absolute -bottom-5 whitespace-nowrap",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>
              {idx < JOURNEY_STEPS.length - 1 && (
                <div className="flex-1 h-[2px] mx-2 bg-muted relative overflow-hidden">
                  <div
                    className={cn(
                      "absolute inset-0 bg-primary transition-all duration-1000 origin-left",
                      idx < activeIndex ? "scale-x-100" : "scale-x-0"
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
