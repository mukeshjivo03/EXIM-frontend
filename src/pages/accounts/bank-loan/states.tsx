import { AlertTriangle, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/* ── Loading skeletons ───────────────────────────────────── */

/** Skeleton rows for the account list. */
export function AccountListSkeleton() {
  return (
    <div className="space-y-1 p-2" aria-busy="true" aria-label="Loading accounts">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-lg border px-3 py-2.5"
        >
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="space-y-1.5 text-right">
            <Skeleton className="ml-auto h-4 w-24" />
            <Skeleton className="ml-auto h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Skeleton for the detail result card. */
export function BalanceSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading balance">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-12 w-56" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

/* ── Empty state ─────────────────────────────────────────── */

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
      <Inbox className="size-8 opacity-60" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

/* ── Error state ─────────────────────────────────────────── */

/** Renders the API's error string plus a Retry button. */
export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
      <AlertTriangle className="size-8 text-destructive" />
      <p className="max-w-md text-sm text-destructive break-words">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
