import { useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  Search,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BRANCHES,
  categoryLabel,
  type Account,
  type Branch,
} from "@/api/bankAccounts";
import { useAccounts, useLedger } from "@/hooks/useBankAccounts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  buildLedgerAnalytics,
  defaultDateRange,
  formatLedgerDate,
  formatMoney,
  formatMoneyCompact,
  ledgerDate,
  type LedgerRow,
} from "./helpers";
import { EmptyState, ErrorState } from "./states";
import { Skeleton } from "@/components/ui/skeleton";

type LedgerRouteState = { account?: Account };

export default function BankLedgerPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  const branch = params.branch as Branch;
  const acctCode = useMemo(() => {
    try {
      return decodeURIComponent(params.acctCode ?? "");
    } catch {
      return params.acctCode ?? "";
    }
  }, [params.acctCode]);

  const isValidBranch = BRANCHES.includes(branch);

  // Prefer the account passed via navigation state; otherwise reconstruct it
  // from the branch's cached (or freshly fetched) account list.
  const stateAccount = (location.state as LedgerRouteState | null)?.account;
  const { data: branchAccounts } = useAccounts(isValidBranch ? branch : "OIL");
  const account: Account | null =
    stateAccount ??
    branchAccounts?.find((a) => a.AcctCode === acctCode) ??
    null;

  const defaults = defaultDateRange();
  const [draftFrom, setDraftFrom] = useState(defaults.from);
  const [draftTo, setDraftTo] = useState(defaults.to);
  const [range, setRange] = useState({ from: defaults.from, to: defaults.to });
  const [query, setQuery] = useState("");

  const rangeValid = draftFrom !== "" && draftTo !== "" && draftFrom <= draftTo;
  const dirty = draftFrom !== range.from || draftTo !== range.to;

  const {
    data: entries = [],
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
  } = useLedger(
    { branch, acctCode, fromDate: range.from, toDate: range.to },
    isValidBranch && !!acctCode
  );

  const analytics = useMemo(() => buildLedgerAnalytics(entries), [entries]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return analytics.rows;
    return analytics.rows.filter((r) =>
      [r.LineMemo, r.HeaderMemo, r.Ref1, r.Ref2, String(r.TransId), r.TransType].some(
        (v) => (v ?? "").toLowerCase().includes(q)
      )
    );
  }, [analytics.rows, query]);

  const apply = () => {
    if (rangeValid) setRange({ from: draftFrom, to: draftTo });
  };

  const currency = account?.ActCurr ?? "INR";
  const displayName = account?.AcctName ?? entries[0]?.AcctName ?? acctCode;
  const busy = isLoading || isFetching;

  const bankDetails = account
    ? [
        { label: "Bank", value: account.U_Bank_Name },
        { label: "Account No.", value: account.U_Account_Number },
        { label: "IFSC", value: account.U_IFSC },
      ].filter((d) => d.value)
    : [];

  if (!isValidBranch || !acctCode) {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState
          message="Invalid account or branch in the URL."
          onRetry={() => navigate("/accounts/bank-loan")}
        />
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-5 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="w-fit -ml-2 gap-2 text-muted-foreground"
          onClick={() => navigate("/accounts/bank-loan")}
        >
          <ArrowLeft className="size-4" />
          Back to Accounts
        </Button>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl">
              {displayName}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {acctCode} · {branch}
            </p>
          </div>
          {account && (
            <span className="rounded-full border bg-muted px-3 py-1 text-xs font-medium">
              {categoryLabel(account.Category)}
            </span>
          )}
        </div>

        {bankDetails.length > 0 && (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-xl border bg-card p-4 sm:grid-cols-3 lg:grid-cols-4">
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
      <div className="rounded-xl border bg-card p-4 sm:p-5">
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

      {/* Ledger body — independent states */}
      {busy ? (
        <LedgerSkeleton />
      ) : isError ? (
        <ErrorState
          message={error?.message ?? "Failed to load ledger."}
          onRetry={() => refetch()}
        />
      ) : analytics.rows.length === 0 ? (
        <div className="rounded-xl border bg-card">
          <EmptyState message="No ledger entries for this range" />
        </div>
      ) : (
        <div className="space-y-5">
          {/* Summary tiles */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <SummaryTile
              label="Money In"
              value={formatMoney(analytics.totalDebit, currency)}
              tone="in"
              icon={<ArrowDownLeft className="size-4" />}
            />
            <SummaryTile
              label="Money Out"
              value={formatMoney(analytics.totalCredit, currency)}
              tone="out"
              icon={<ArrowUpRight className="size-4" />}
            />
            <SummaryTile
              label="Net Movement"
              value={formatMoney(analytics.net, currency)}
              tone={analytics.net >= 0 ? "in" : "out"}
              icon={
                analytics.net >= 0 ? (
                  <TrendingUp className="size-4" />
                ) : (
                  <TrendingDown className="size-4" />
                )
              }
            />
          </div>

          {/* In vs out proportion bar */}
          <InOutBar debit={analytics.totalDebit} credit={analytics.totalCredit} />

          {/* Running balance chart */}
          <div className="rounded-xl border bg-card p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Running Balance</h3>
              <span className="text-xs text-muted-foreground">
                {analytics.rows.length} entries
              </span>
            </div>
            <RunningBalanceChart points={analytics.points} currency={currency} />
            <p className="mt-2 text-[11px] text-muted-foreground">
              Cumulative movement over the period (relative to the opening balance).
            </p>
          </div>

          {/* Transactions table */}
          <div className="rounded-xl border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b p-3 sm:p-4">
              <h3 className="text-sm font-semibold">Transactions</h3>
              <div className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search memo / ref…"
                  className="h-9 pl-9"
                  aria-label="Search transactions"
                />
              </div>
            </div>

            {filteredRows.length === 0 ? (
              <EmptyState message={`No transactions match “${query}”`} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead className="sticky top-0 z-10 bg-card">
                    <tr className="border-b text-[11px] uppercase tracking-wider text-muted-foreground">
                      <th className="px-3 py-2.5 text-left font-semibold">Date</th>
                      <th className="px-3 py-2.5 text-left font-semibold">Details</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Debit</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Credit</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredRows.map((row) => (
                      <LedgerTableRow
                        key={`${row.TransId}-${row.Line_ID}`}
                        row={row}
                        currency={currency}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Pieces ──────────────────────────────────────────────── */

function LedgerSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading ledger">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-2.5 rounded-full" />
      <Skeleton className="h-56 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

function SummaryTile({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string;
  tone: "in" | "out";
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div
        className={cn(
          "mb-2 inline-flex size-8 items-center justify-center rounded-lg",
          tone === "in"
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
        )}
      >
        {icon}
      </div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 truncate text-lg font-bold tabular-nums",
          tone === "in"
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-red-600 dark:text-red-400"
        )}
        title={value}
      >
        {value}
      </p>
    </div>
  );
}

function InOutBar({ debit, credit }: { debit: number; credit: number }) {
  const total = debit + credit;
  const inPct = total > 0 ? (debit / total) * 100 : 0;
  const outPct = total > 0 ? (credit / total) * 100 : 0;
  return (
    <div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
        <div className="bg-emerald-500" style={{ width: `${inPct}%` }} aria-hidden />
        <div className="bg-red-500" style={{ width: `${outPct}%` }} aria-hidden />
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-full bg-emerald-500" /> In {inPct.toFixed(0)}%
        </span>
        <span className="flex items-center gap-1">
          Out {outPct.toFixed(0)}% <span className="size-2 rounded-full bg-red-500" />
        </span>
      </div>
    </div>
  );
}

function RunningBalanceChart({
  points,
  currency,
}: {
  points: { date: string; label: string; balance: number }[];
  currency: string;
}) {
  const positive = (points[points.length - 1]?.balance ?? 0) >= 0;
  const stroke = positive ? "#10b981" : "#ef4444";
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={points} margin={{ top: 4, right: 8, bottom: 0, left: -4 }}>
        <defs>
          <linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
            <stop offset="100%" stopColor={stroke} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          minTickGap={24}
        />
        <YAxis
          width={64}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => formatMoneyCompact(v, currency)}
        />
        <Tooltip
          formatter={(v) => [formatMoney(Number(v), currency), "Balance"]}
          labelClassName="text-xs"
          contentStyle={{
            borderRadius: 12,
            border: "1px solid hsl(var(--border))",
            background: "hsl(var(--card))",
            fontSize: 12,
          }}
        />
        <Area
          type="monotone"
          dataKey="balance"
          stroke={stroke}
          strokeWidth={2}
          fill="url(#balanceFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function LedgerTableRow({ row, currency }: { row: LedgerRow; currency: string }) {
  const ref = [row.Ref1, row.Ref2].filter(Boolean).join(" · ");
  return (
    <tr className="align-top hover:bg-accent/50">
      <td className="whitespace-nowrap px-3 py-2.5">
        <div className="font-medium">{formatLedgerDate(row.RefDate)}</div>
        <div className="text-[11px] tabular-nums text-muted-foreground">
          {ledgerDate(row.RefDate)}
        </div>
      </td>
      <td className="px-3 py-2.5">
        <div className="max-w-[28rem] truncate" title={row.LineMemo}>
          {row.LineMemo || "—"}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="rounded border bg-muted px-1 py-px font-mono">
            #{row.TransId}
          </span>
          {ref && <span className="truncate">{ref}</span>}
        </div>
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">
        {row.Debit ? (
          <span className="font-medium text-emerald-600 dark:text-emerald-400">
            {formatMoney(row.Debit, currency)}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">
        {row.Credit ? (
          <span className="font-medium text-red-600 dark:text-red-400">
            {formatMoney(row.Credit, currency)}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td
        className={cn(
          "whitespace-nowrap px-3 py-2.5 text-right font-semibold tabular-nums",
          row.runningBalance < 0 ? "text-red-600 dark:text-red-400" : "text-foreground"
        )}
      >
        {formatMoney(row.runningBalance, currency)}
      </td>
    </tr>
  );
}
