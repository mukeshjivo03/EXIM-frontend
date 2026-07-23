import { BRANCHES, type Branch } from "@/api/bankAccounts";
import { cn } from "@/lib/utils";

interface BranchToggleProps {
  value: Branch;
  onChange: (branch: Branch) => void;
}

/**
 * Segmented control for the global branch switch. Changing it is handled by the
 * parent (refetch list + clear detail).
 */
export default function BranchToggle({ value, onChange }: BranchToggleProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Branch"
      className="inline-flex items-center gap-1 rounded-lg border bg-muted p-1"
    >
      {BRANCHES.map((branch) => {
        const active = branch === value;
        return (
          <button
            key={branch}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(branch)}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {branch}
          </button>
        );
      })}
    </div>
  );
}
