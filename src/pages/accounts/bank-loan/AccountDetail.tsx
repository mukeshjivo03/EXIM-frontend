import { useState } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { categoryLabel, type Account, type Branch } from "@/api/bankAccounts";
import { useAccountBalance } from "@/hooks/useBankAccounts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatMoney, defaultDateRange } from "./helpers";
import { BalanceSkeleton, EmptyState, ErrorState } from "./states";

interface AccountDetailProps {
  account: Account;
  branch: Branch;
}

/**
 * Detail panel for a selected account, rendered inside the right side-panel.
 * Owns its date range; committing a range (Apply) drives the balance query.
 * The parent should mount this with key={account.AcctCode} so the range resets
 * per account.
 */
export default function AccountDetail({ account, branch }: AccountDetailProps) {
  const defaults = defaultDateRange();
  const [draftFrom, setDraftFrom] = useState(defaults.from);
  const [draftTo, setDraftTo] = useState(defaults.to);
  // Committed range that the query actually uses. Starts at the default range
  // (one month before today → today) so the card loads once on selection;
  // thereafter it only changes on Apply.
  const [range, setRange] = useState({ from: defaults.from, to: defaults.to });

  const rangeValid = draftFrom !== "" && draftTo !== "" && draftFrom <= draftTo;
  const dirty = draftFrom !== range.from || draftTo !== range.to;

  const {
    data: balance,
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
  } = useAccountBalance(
    { branch, acctCode: account.AcctCode, fromDate: range.from, toDate: range.to },
    true
  );

  const apply = () => {
    if (rangeValid) setRange({ from: draftFrom, to: draftTo });
  };

  const bankDetails = [
    { label: "Bank", value: account.U_Bank_Name },
    { label: "Account No.", value: account.U_Account_Number },
    { label: "IFSC", value: account.U_IFSC },
  ].filter((d) => d.value);

  return (
    <div className="flex h-full flex-col">
      {/* Header — pr-10 keeps content clear of the sheet's close button */}
      <div className="border-b p-4 pr-12 sm:p-6 sm:pr-12">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold">{account.AcctName}</h2>
            <p className="text-sm text-muted-foreground">{account.AcctCode}</p>
          </div>
          <span className="rounded-full border bg-muted px-3 py-1 text-xs font-medium">
            {categoryLabel(account.Category)}
          </span>
        </div>

        {bankDetails.length > 0 && (
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
            {bankDetails.map((d) => (
              <div key={d.label} className="min-w-0">
                <dt className="text-xs text-muted-foreground">{d.label}</dt>
                <dd className="truncate text-sm font-medium">{d.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      {/* Date range + Apply */}
      <div className="border-b p-4 sm:p-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="from-date">From</Label>
            <Input
              id="from-date"
              type="date"
              value={draftFrom}
              max={draftTo || undefined}
              onChange={(e) => setDraftFrom(e.target.value)}
              className="w-[9.5rem]"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="to-date">To</Label>
            <Input
              id="to-date"
              type="date"
              value={draftTo}
              min={draftFrom || undefined}
              onChange={(e) => setDraftTo(e.target.value)}
              className="w-[9.5rem]"
            />
          </div>
          <Button onClick={apply} disabled={!rangeValid || (!dirty && !isError)}>
            Apply
          </Button>
        </div>
        {!rangeValid && (
          <p className="mt-2 text-xs text-destructive">
            “From” must be on or before “To”.
          </p>
        )}
      </div>

      {/* Result card — independent states */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto max-w-md rounded-xl border bg-card p-6 shadow-sm sm:p-8">
          {isLoading || isFetching ? (
            <BalanceSkeleton />
          ) : isError ? (
            <ErrorState
              message={error?.message ?? "Failed to load balance."}
              onRetry={() => refetch()}
            />
          ) : balance == null ? (
            <EmptyState message="No data for this range" />
          ) : (
            <NetMovement value={balance.ClosingBalance} currency={account.ActCurr} />
          )}
        </div>
      </div>
    </div>
  );
}

/** Large "Net Movement" figure with sign colouring and ▲/▼ indicator. */
function NetMovement({ value, currency }: { value: number; currency: string }) {
  const positive = value >= 0;
  return (
    <div>
      <p className="text-sm font-medium text-muted-foreground">Net Movement</p>
      <p className="text-xs text-muted-foreground">for selected period</p>
      <div
        className={cn(
          "mt-4 flex items-center gap-2",
          positive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
        )}
      >
        {positive ? (
          <TrendingUp className="size-7 shrink-0" aria-hidden />
        ) : (
          <TrendingDown className="size-7 shrink-0" aria-hidden />
        )}
        <span className="text-3xl font-bold tracking-tight sm:text-4xl">
          <span aria-hidden className="mr-1">
            {positive ? "▲" : "▼"}
          </span>
          {formatMoney(value, currency)}
        </span>
      </div>
    </div>
  );
}
