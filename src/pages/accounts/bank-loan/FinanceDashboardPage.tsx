import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Banknote,
  Landmark,
  PiggyBank,
  Scale,
  Wallet,
} from "lucide-react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  categoryLabel,
  CATEGORY_ORDER,
  type Account,
  type AccountCategory,
  type Branch,
  type BranchFilter,
} from "@/api/bankAccounts";
import {
  useAccounts,
  useAccountsSummary,
  useMonthlyTrend,
} from "@/hooks/useBankAccounts";
import { useHasPermission } from "@/hooks/useHasPermission";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import BranchToggle from "./BranchToggle";
import { ErrorState } from "./states";
import {
  formatMoney,
  formatMoneyCompact,
  monthLabel,
  summariseByCurrency,
  type CurrencySummary,
} from "./helpers";

/** ISO date for the first day, N months back from today. */
function monthsAgoISO(months: number): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - months);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

const CATEGORY_META: Record<
  AccountCategory,
  { icon: typeof Landmark; tint: string }
> = {
  Bank: { icon: Landmark, tint: "text-sky-600 dark:text-sky-400" },
  FD: { icon: PiggyBank, tint: "text-violet-600 dark:text-violet-400" },
  Loan: { icon: Banknote, tint: "text-amber-600 dark:text-amber-400" },
};

export default function FinanceDashboardPage() {
  const navigate = useNavigate();
  const { hasPermission } = useHasPermission();
  const canViewClosing = hasPermission("bank_closing");

  const [branch, setBranch] = useState<BranchFilter>("OIL");

  const {
    data: summaryRows = [],
    isLoading: summaryLoading,
    isError: summaryError,
    error: summaryErr,
    refetch: refetchSummary,
  } = useAccountsSummary(branch);

  const { data: accounts = [] } = useAccounts(branch);

  const currencies = useMemo(
    () => summariseByCurrency(summaryRows),
    [summaryRows]
  );

  const [currency, setCurrency] = useState<string | null>(null);
  // Keep the selected currency valid as branch/data changes.
  useEffect(() => {
    if (currencies.length === 0) {
      setCurrency(null);
    } else if (!currency || !currencies.some((c) => c.currency === currency)) {
      setCurrency(currencies[0].currency);
    }
  }, [currencies, currency]);

  const active = currencies.find((c) => c.currency === currency) ?? currencies[0];

  return (
    <div className="flex w-full flex-col gap-5 p-4 sm:p-6">
      {/* Header */}
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start sm:gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl">
            Finance Dashboard
          </h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Bank, FD and loan positions across the branch, with per-account
            monthly cash-flow trends.
          </p>
        </div>
        <BranchToggle value={branch} onChange={setBranch} />
      </header>

      {summaryLoading ? (
        <KpiSkeleton />
      ) : summaryError ? (
        <ErrorState
          message={summaryErr?.message ?? "Failed to load summary."}
          onRetry={() => refetchSummary()}
        />
      ) : !active ? (
        <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
          No account data for this branch.
        </div>
      ) : (
        <>
          {/* Currency selector (only when more than one) */}
          {currencies.length > 1 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                Currency
              </span>
              {currencies.map((c) => {
                const on = c.currency === active.currency;
                return (
                  <button
                    key={c.currency}
                    type="button"
                    onClick={() => setCurrency(c.currency)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                      on
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-muted text-muted-foreground hover:bg-accent"
                    )}
                  >
                    {c.currency}
                  </button>
                );
              })}
            </div>
          )}

          <KpiRow summary={active} />
          <CategoryBreakdown summary={active} />

          {/* Top accounts */}
          <TopAccounts
            accounts={accounts}
            currency={active.currency}
            showBranch={branch === "ALL"}
            canOpen={canViewClosing}
            onOpen={(a) =>
              navigate(
                `/accounts/bank-loan/ledger/${a.sourceBranch}/${encodeURIComponent(
                  a.AcctCode
                )}`,
                { state: { account: a } }
              )
            }
          />

          {/* Monthly trend explorer */}
          <MonthlyTrendExplorer
            accounts={accounts}
            currency={active.currency}
            enabled={canViewClosing}
          />
        </>
      )}
    </div>
  );
}

/* ── KPI row ──────────────────────────────────────────────── */

function KpiRow({ summary }: { summary: CurrencySummary }) {
  const tiles = [
    {
      label: "Assets (Bank + FD)",
      value: summary.assets,
      icon: Wallet,
      tint: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    },
    {
      label: "Liabilities (Loans)",
      value: summary.liabilities,
      icon: Banknote,
      tint: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    },
    {
      label: "Net Position",
      value: summary.netBalance,
      icon: Scale,
      tint: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
    },
  ];
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {tiles.map((t) => (
        <div key={t.label} className="rounded-xl border bg-card p-4">
          <div
            className={cn(
              "mb-2 inline-flex size-9 items-center justify-center rounded-lg",
              t.tint
            )}
          >
            <t.icon className="size-5" />
          </div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {t.label}
          </p>
          <p
            className="mt-0.5 truncate text-xl font-bold tabular-nums"
            title={formatMoney(t.value, summary.currency)}
          >
            {formatMoney(t.value, summary.currency)}
          </p>
        </div>
      ))}
      <div className="rounded-xl border bg-card p-4">
        <div className="mb-2 inline-flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Landmark className="size-5" />
        </div>
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Accounts ({summary.currency})
        </p>
        <p className="mt-0.5 text-xl font-bold tabular-nums">
          {summary.totalAccounts}
        </p>
      </div>
    </div>
  );
}

/* ── Category breakdown ───────────────────────────────────── */

function CategoryBreakdown({ summary }: { summary: CurrencySummary }) {
  const maxAbs = Math.max(
    1,
    ...CATEGORY_ORDER.map((c) => Math.abs(summary.byCategory[c].balance))
  );
  return (
    <div className="rounded-xl border bg-card p-4 sm:p-5">
      <h3 className="mb-4 text-sm font-semibold">Balance by Category</h3>
      <div className="space-y-4">
        {CATEGORY_ORDER.map((cat) => {
          const { count, balance } = summary.byCategory[cat];
          const Meta = CATEGORY_META[cat];
          const pct = (Math.abs(balance) / maxAbs) * 100;
          return (
            <div key={cat}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-medium">
                  <Meta.icon className={cn("size-4", Meta.tint)} />
                  {categoryLabel(cat)}
                  <span className="text-xs text-muted-foreground">
                    · {count} {count === 1 ? "account" : "accounts"}
                  </span>
                </span>
                <span className="font-semibold tabular-nums">
                  {formatMoney(balance, summary.currency)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full",
                    cat === "Bank"
                      ? "bg-sky-500"
                      : cat === "FD"
                        ? "bg-violet-500"
                        : "bg-amber-500"
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Top accounts ─────────────────────────────────────────── */

function TopAccounts({
  accounts,
  currency,
  showBranch,
  canOpen,
  onOpen,
}: {
  accounts: Account[];
  currency: string;
  showBranch: boolean;
  canOpen: boolean;
  onOpen: (a: Account) => void;
}) {
  const rows = useMemo(
    () =>
      accounts
        .filter((a) => (a.ActCurr || "INR") === currency)
        .sort((a, b) => Math.abs(b.CurrTotal) - Math.abs(a.CurrTotal))
        .slice(0, 8),
    [accounts, currency]
  );

  if (rows.length === 0) return null;

  return (
    <div className="rounded-xl border bg-card">
      <div className="border-b p-4 sm:p-5">
        <h3 className="text-sm font-semibold">Top Accounts by Balance</h3>
        <p className="text-xs text-muted-foreground">
          {currency} · open an account for its full ledger
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-[11px] uppercase tracking-wider text-muted-foreground">
              {showBranch && (
                <th className="px-4 py-2.5 text-left font-semibold">Branch</th>
              )}
              <th className="px-4 py-2.5 text-left font-semibold">Account</th>
              <th className="px-4 py-2.5 text-left font-semibold">Type</th>
              <th className="px-4 py-2.5 text-right font-semibold">Balance</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((a) => (
              <tr
                key={`${a.sourceBranch}:${a.AcctCode}`}
                {...(canOpen
                  ? {
                      onClick: () => onOpen(a),
                      tabIndex: 0,
                      onKeyDown: (e: React.KeyboardEvent) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onOpen(a);
                        }
                      },
                    }
                  : {})}
                className={cn(
                  "align-top transition-colors",
                  canOpen
                    ? "cursor-pointer hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                    : ""
                )}
              >
                {showBranch && (
                  <td className="px-4 py-2.5">
                    <span className="inline-flex rounded-full border bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {a.sourceBranch}
                    </span>
                  </td>
                )}
                <td className="px-4 py-2.5">
                  <div className="font-medium">{a.AcctName}</div>
                  <div className="text-xs text-muted-foreground">
                    {a.AcctCode}
                    {a.U_Bank_Name ? ` · ${a.U_Bank_Name}` : ""}
                  </div>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  {categoryLabel(a.Category)}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right font-medium tabular-nums">
                  {formatMoney(a.CurrTotal, a.ActCurr)}
                </td>
                <td className="px-4 py-2.5 text-right">
                  {canOpen && (
                    <ArrowRight className="ml-auto size-4 text-muted-foreground" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Monthly trend explorer ───────────────────────────────── */

function MonthlyTrendExplorer({
  accounts,
  currency,
  enabled,
}: {
  accounts: Account[];
  currency: string;
  enabled: boolean;
}) {
  const options = useMemo(
    () => accounts.filter((a) => (a.ActCurr || "INR") === currency),
    [accounts, currency]
  );

  const [acctKey, setAcctKey] = useState<string | null>(null);
  const selected = options.find((a) => `${a.sourceBranch}:${a.AcctCode}` === acctKey);

  // Reset the picker when the currency/branch changes it out of range.
  useEffect(() => {
    if (acctKey && !options.some((a) => `${a.sourceBranch}:${a.AcctCode}` === acctKey)) {
      setAcctKey(null);
    }
  }, [options, acctKey]);

  const [from] = useState(monthsAgoISO(11));
  const [to] = useState(todayISO());

  const {
    data: trend = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useMonthlyTrend(
    {
      branch: selected?.sourceBranch as Branch | undefined,
      acctCode: selected?.AcctCode,
      fromDate: from,
      toDate: to,
    },
    enabled && !!selected
  );

  const data = useMemo(
    () =>
      trend.map((r) => ({
        label: monthLabel(r.Year, r.Month),
        debit: r.TotalDebit,
        credit: r.TotalCredit,
        net: r.NetMovement,
      })),
    [trend]
  );

  const byCategory = useMemo(() => {
    const groups = new Map<AccountCategory, Account[]>();
    for (const a of options) {
      const list = groups.get(a.Category) ?? [];
      list.push(a);
      groups.set(a.Category, list);
    }
    return groups;
  }, [options]);

  return (
    <div className="rounded-xl border bg-card p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Monthly Cash-Flow Trend</h3>
          <p className="text-xs text-muted-foreground">
            Debit vs credit by month · last 12 months
          </p>
        </div>
        <div className="w-full sm:w-72">
          <Select value={acctKey ?? undefined} onValueChange={setAcctKey}>
            <SelectTrigger aria-label="Select an account">
              <SelectValue placeholder="Select an account…" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_ORDER.filter((c) => byCategory.get(c)?.length).map((cat) => (
                <SelectGroup key={cat}>
                  <SelectLabel>{categoryLabel(cat)}</SelectLabel>
                  {byCategory.get(cat)!.map((a) => (
                    <SelectItem
                      key={`${a.sourceBranch}:${a.AcctCode}`}
                      value={`${a.sourceBranch}:${a.AcctCode}`}
                    >
                      {a.AcctName}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!enabled ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          You don’t have permission to view account trends.
        </p>
      ) : !selected ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Select an account to see its monthly cash-flow.
        </p>
      ) : isLoading ? (
        <Skeleton className="h-72 rounded-xl" />
      ) : isError ? (
        <ErrorState
          message={error?.message ?? "Failed to load trend."}
          onRetry={() => refetch()}
        />
      ) : data.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No transactions for {selected.AcctName} in this period.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -4 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis
              width={64}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => formatMoneyCompact(v, currency)}
            />
            <Tooltip
              formatter={(v, name) => [
                formatMoney(Number(v), currency),
                String(name),
              ]}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid hsl(var(--border))",
                background: "hsl(var(--card))",
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="debit" name="Debit (in)" fill="#10b981" radius={[3, 3, 0, 0]} />
            <Bar dataKey="credit" name="Credit (out)" fill="#ef4444" radius={[3, 3, 0, 0]} />
            <Line
              type="monotone"
              dataKey="net"
              name="Net"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

/* ── Skeleton ─────────────────────────────────────────────── */

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-28 rounded-xl" />
      ))}
    </div>
  );
}
