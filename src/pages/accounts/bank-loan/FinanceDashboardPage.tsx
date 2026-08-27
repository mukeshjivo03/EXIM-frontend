import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Banknote,
  Landmark,
  LayoutDashboard,
  Lock,
  PiggyBank,
  Scale,
  Wallet as WalletIcon,
} from "lucide-react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { type Account, type Branch, type BranchFilter } from "@/api/bankAccounts";
import {
  ASSET_CATEGORIES,
  displayCategory,
  displayCategoryLabel,
  DISPLAY_CATEGORY_ORDER,
  type DisplayCategory,
} from "./grouping";
import { resolveBrand } from "./brands";
import BankLogo from "./BankLogo";
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
import Guard from "@/components/Guard";
import {
  CATEGORY_TINT,
  TOOLTIP_STYLE,
  useChartPalette,
  type ChartPalette,
} from "./chartTheme";
import {
  CompositionMeter,
  LegendRow,
  MagnitudeBar,
  PageHeader,
  SectionCard,
  StatTile,
  Tag,
} from "./ui";
import {
  formatMoney,
  formatMoneyCompact,
  monthLabel,
  summariseByCurrency,
  type CurrencySummary,
} from "./helpers";

/** How many accounts the "Top accounts" table lists. */
const TOP_ACCOUNTS = 8;

const TREND_RANGES = [
  { key: "6m", label: "6M", months: 5 },
  { key: "12m", label: "12M", months: 11 },
  { key: "24m", label: "24M", months: 23 },
] as const;
type TrendRangeKey = (typeof TREND_RANGES)[number]["key"];

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

const CATEGORY_ICONS: Record<DisplayCategory, typeof Landmark> = {
  Bank: Landmark,
  Wallet: WalletIcon,
  FD: PiggyBank,
  Loan: Banknote,
};

export default function FinanceDashboardPage() {
  const navigate = useNavigate();
  const { hasPermission } = useHasPermission();
  const canViewClosing = hasPermission("bank_ledger");
  const palette = useChartPalette();

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
    <Guard
      resource="finance_dashboard"
      action="view"
      fallback={<div className="p-6 text-sm text-muted-foreground">You do not have permission to view the Finance Dashboard.</div>}
    >
    <div className="animate-page flex w-full flex-col gap-5 p-4 sm:p-6">
      <PageHeader
        icon={LayoutDashboard}
        title="Finance Dashboard"
        description="Bank, FD and loan positions across the branch, with per-account monthly cash-flow trends."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {currencies.length > 1 && (
              <div
                role="radiogroup"
                aria-label="Currency"
                className="inline-flex items-center gap-1 rounded-lg border bg-muted p-1"
              >
                {currencies.map((c) => {
                  const on = c.currency === active?.currency;
                  return (
                    <button
                      key={c.currency}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setCurrency(c.currency)}
                      className={cn(
                        "btn-press rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        on
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {c.currency}
                    </button>
                  );
                })}
              </div>
            )}
            <BranchToggle value={branch} onChange={setBranch} />
          </div>
        }
      />

      {summaryLoading ? (
        <DashboardSkeleton />
      ) : summaryError ? (
        <ErrorState
          message={summaryErr?.message ?? "Failed to load summary."}
          onRetry={() => refetchSummary()}
        />
      ) : !active ? (
        <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
          No account data for this branch.
        </div>
      ) : (
        <>
          <KpiRow summary={active} palette={palette} />

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
            <CategoryBreakdown
              summary={active}
              palette={palette}
              className="xl:col-span-2"
            />
            <TopAccounts
              className="xl:col-span-3"
              accounts={accounts}
              currency={active.currency}
              palette={palette}
              showBranch={branch === "ALL"}
              canOpen={canViewClosing}
              onViewAll={() => navigate("/accounts/bank-loan")}
              onOpen={(a) =>
                navigate(
                  `/accounts/bank-loan/ledger/${a.sourceBranch}/${encodeURIComponent(
                    a.AcctCode
                  )}`,
                  { state: { account: a } }
                )
              }
            />
          </div>

          <MonthlyTrendExplorer
            accounts={accounts}
            currency={active.currency}
            palette={palette}
            enabled={canViewClosing}
          />
        </>
      )}
    </div>
    </Guard>
  );
}

/* ── KPI row ──────────────────────────────────────────────── */

function KpiRow({
  summary,
  palette,
}: {
  summary: CurrencySummary;
  palette: ChartPalette;
}) {
  const liabilities = Math.abs(summary.liabilities);
  // How many times the assets cover the outstanding loans.
  const coverage = liabilities > 0 ? summary.assets / liabilities : null;
  const assetCategories = ASSET_CATEGORIES.filter(
    (c) => summary.byCategory[c].count > 0
  );
  const assetAccounts = assetCategories.reduce(
    (sum, c) => sum + summary.byCategory[c].count,
    0
  );

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatTile
        label={`Assets (${assetCategories.map(displayCategoryLabel).join(" + ") || "none"})`}
        value={formatMoney(summary.assets, summary.currency)}
        hint={`${assetAccounts} ${assetAccounts === 1 ? "account" : "accounts"}`}
        icon={WalletIcon}
        tone="positive"
        footer={
          <CompositionMeter
            segments={assetCategories.map((c) => ({
              key: c,
              label: displayCategoryLabel(c),
              value: summary.byCategory[c].balance,
              color: palette.category[c],
            }))}
          />
        }
      />
      <StatTile
        label="Liabilities (Loans)"
        value={formatMoney(summary.liabilities, summary.currency)}
        hint={`${summary.byCategory.Loan.count} loan ${summary.byCategory.Loan.count === 1 ? "account" : "accounts"}`}
        icon={Banknote}
        tone="negative"
      />
      <StatTile
        label="Net Position"
        value={formatMoney(summary.assets - liabilities, summary.currency)}
        hint={
          coverage === null
            ? "No loans outstanding"
            : `Assets cover loans ${coverage.toFixed(2)}×`
        }
        icon={Scale}
        tone={summary.assets - liabilities >= 0 ? "positive" : "negative"}
      />
      <StatTile
        label={`Accounts (${summary.currency})`}
        value={String(summary.totalAccounts)}
        hint={DISPLAY_CATEGORY_ORDER.filter((c) => summary.byCategory[c].count > 0)
          .map((c) => `${summary.byCategory[c].count} ${displayCategoryLabel(c)}`)
          .join(" · ")}
        icon={Landmark}
        tone="brand"
      />
    </div>
  );
}

/* ── Category breakdown ───────────────────────────────────── */

function CategoryBreakdown({
  summary,
  palette,
  className,
}: {
  summary: CurrencySummary;
  palette: ChartPalette;
  className?: string;
}) {
  const present = DISPLAY_CATEGORY_ORDER.filter(
    (c) => summary.byCategory[c].count > 0
  );
  const maxAbs = Math.max(
    1,
    ...present.map((c) => Math.abs(summary.byCategory[c].balance))
  );
  const gross = present.reduce(
    (sum, c) => sum + Math.abs(summary.byCategory[c].balance),
    0
  );

  return (
    <SectionCard
      title="Balance by Category"
      description={`${summary.currency} · share of gross balance, broken down by SAP group`}
      className={className}
    >
      <div className="space-y-5">
        {present.map((cat) => {
          const { count, balance } = summary.byCategory[cat];
          const Icon = CATEGORY_ICONS[cat];
          const share = gross > 0 ? Math.abs(balance) / gross : 0;
          // A category is worth breaking down only when SAP files it under
          // more than one group (e.g. Loans → term / vehicle / director).
          const subGroups = summary.byGroup.filter((g) => g.category === cat);
          return (
            <div key={cat}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex size-6 shrink-0 items-center justify-center rounded-md",
                      CATEGORY_TINT[cat]
                    )}
                  >
                    <Icon className="size-3.5" />
                  </span>
                  <span className="truncate font-medium">
                    {displayCategoryLabel(cat)}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {count} {count === 1 ? "account" : "accounts"}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-semibold tabular-nums">
                    {formatMoney(balance, summary.currency)}
                  </span>
                  <span className="block text-[11px] text-muted-foreground tabular-nums">
                    {(share * 100).toFixed(1)}% of gross
                  </span>
                </span>
              </div>
              <MagnitudeBar
                className="h-2"
                ratio={Math.abs(balance) / maxAbs}
                color={palette.category[cat]}
                track={palette.track}
              />

              {subGroups.length > 1 && (
                <ul className="mt-2 space-y-1 border-l-2 pl-3">
                  {subGroups.map((g) => (
                    <li
                      key={g.key}
                      className="flex items-baseline justify-between gap-3 text-xs"
                    >
                      <span className="truncate text-muted-foreground">
                        {g.label}
                        <span className="ml-1.5 tabular-nums opacity-70">
                          ({g.count})
                        </span>
                      </span>
                      <span className="shrink-0 tabular-nums">
                        {formatMoney(g.balance, summary.currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

/* ── Top accounts ─────────────────────────────────────────── */

function TopAccounts({
  accounts,
  currency,
  palette,
  showBranch,
  canOpen,
  onOpen,
  onViewAll,
  className,
}: {
  accounts: Account[];
  currency: string;
  palette: ChartPalette;
  showBranch: boolean;
  canOpen: boolean;
  onOpen: (a: Account) => void;
  onViewAll: () => void;
  className?: string;
}) {
  const inCurrency = useMemo(
    () => accounts.filter((a) => (a.ActCurr || "INR") === currency),
    [accounts, currency]
  );
  const rows = useMemo(
    () =>
      [...inCurrency]
        .sort((a, b) => Math.abs(b.CurrTotal) - Math.abs(a.CurrTotal))
        .slice(0, TOP_ACCOUNTS),
    [inCurrency]
  );

  const maxAbs = Math.max(1, ...rows.map((a) => Math.abs(a.CurrTotal)));

  return (
    <SectionCard
      flush
      className={className}
      title="Top Accounts by Balance"
      description={
        inCurrency.length === 0
          ? `No ${currency} accounts`
          : `Largest ${rows.length} of ${inCurrency.length} ${currency} accounts` +
            (canOpen ? " · open one for its full ledger" : "")
      }
      action={
        <button
          type="button"
          onClick={onViewAll}
          className="btn-press inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          View all
          <ArrowRight className="size-3.5" />
        </button>
      }
    >
      {rows.length === 0 ? (
        <p className="p-8 text-center text-sm text-muted-foreground">
          No accounts in {currency} for this branch.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-[11px] uppercase tracking-wider text-muted-foreground">
                {showBranch && (
                  <th className="px-4 py-2.5 text-left font-semibold">Branch</th>
                )}
                <th className="px-4 py-2.5 text-left font-semibold">Account</th>
                <th className="hidden px-4 py-2.5 text-left font-semibold sm:table-cell">
                  Type
                </th>
                <th className="px-4 py-2.5 text-right font-semibold">Balance</th>
                {canOpen && <th className="w-8 px-2 py-2.5" aria-label="Open" />}
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
                    "group align-top transition-colors",
                    canOpen
                      ? "cursor-pointer hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                      : ""
                  )}
                >
                  {showBranch && (
                    <td className="px-4 py-3">
                      <Tag>{a.sourceBranch}</Tag>
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <BankLogo
                        name={a.U_Bank_Name || a.AcctName}
                        brand={resolveBrand(a)}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <div className="truncate font-medium">{a.AcctName}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          <span className="font-mono">{a.AcctCode}</span>
                          {a.U_Bank_Name ? ` · ${a.U_Bank_Name}` : ""}
                          <span className="sm:hidden">
                            {" "}
                            · {displayCategoryLabel(displayCategory(a))}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <span
                        className="size-2.5 shrink-0 rounded-[3px]"
                        style={{
                          backgroundColor: palette.category[displayCategory(a)],
                        }}
                        aria-hidden
                      />
                      {displayCategoryLabel(displayCategory(a))}
                    </span>
                  </td>
                  <td className="w-[12rem] px-4 py-3">
                    <div className="whitespace-nowrap text-right font-semibold tabular-nums">
                      {formatMoney(a.CurrTotal, a.ActCurr)}
                    </div>
                    <MagnitudeBar
                      className="mt-1.5"
                      ratio={Math.abs(a.CurrTotal) / maxAbs}
                      color={palette.category[displayCategory(a)]}
                      track={palette.track}
                    />
                  </td>
                  {canOpen && (
                    <td className="px-2 py-3 align-middle">
                      <ArrowRight className="size-4 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

/* ── Monthly trend explorer ───────────────────────────────── */

function MonthlyTrendExplorer({
  accounts,
  currency,
  palette,
  enabled,
}: {
  accounts: Account[];
  currency: string;
  palette: ChartPalette;
  enabled: boolean;
}) {
  const options = useMemo(
    () =>
      [...accounts.filter((a) => (a.ActCurr || "INR") === currency)].sort(
        (a, b) => Math.abs(b.CurrTotal) - Math.abs(a.CurrTotal)
      ),
    [accounts, currency]
  );

  const [acctKey, setAcctKey] = useState<string | null>(null);
  const selected = options.find((a) => `${a.sourceBranch}:${a.AcctCode}` === acctKey);

  // Default to the largest account, and reset when the branch/currency change
  // takes the current pick out of range — the chart is never left empty when
  // there is something to show.
  useEffect(() => {
    if (options.length === 0) {
      if (acctKey !== null) setAcctKey(null);
      return;
    }
    if (!acctKey || !options.some((a) => `${a.sourceBranch}:${a.AcctCode}` === acctKey)) {
      setAcctKey(`${options[0].sourceBranch}:${options[0].AcctCode}`);
    }
  }, [options, acctKey]);

  const [rangeKey, setRangeKey] = useState<TrendRangeKey>("12m");
  const months = TREND_RANGES.find((r) => r.key === rangeKey)!.months;
  const from = useMemo(() => monthsAgoISO(months), [months]);
  const to = useMemo(() => todayISO(), []);

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

  const totals = useMemo(
    () =>
      data.reduce(
        (acc, d) => ({
          debit: acc.debit + d.debit,
          credit: acc.credit + d.credit,
          net: acc.net + d.net,
        }),
        { debit: 0, credit: 0, net: 0 }
      ),
    [data]
  );

  const byCategory = useMemo(() => {
    const groups = new Map<DisplayCategory, Account[]>();
    for (const a of options) {
      const category = displayCategory(a);
      const list = groups.get(category) ?? [];
      list.push(a);
      groups.set(category, list);
    }
    return groups;
  }, [options]);

  const series = [
    { key: "debit", label: "Money in (debit)", color: palette.flow.in },
    { key: "credit", label: "Money out (credit)", color: palette.flow.out },
    { key: "net", label: "Net movement", color: palette.flow.net },
  ];

  return (
    <SectionCard
      title="Monthly Cash-Flow Trend"
      description={
        selected
          ? `${selected.AcctName} · ${displayCategoryLabel(displayCategory(selected))} · last ${months + 1} months`
          : "Debit vs credit by month"
      }
      action={
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="radiogroup"
            aria-label="Trend period"
            className="inline-flex items-center gap-1 rounded-lg border bg-muted p-1"
          >
            {TREND_RANGES.map((r) => {
              const on = r.key === rangeKey;
              return (
                <button
                  key={r.key}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setRangeKey(r.key)}
                  className={cn(
                    "btn-press rounded-md px-2.5 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    on
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
          <div className="w-full sm:w-64">
            <Select
              value={acctKey ?? undefined}
              onValueChange={setAcctKey}
              disabled={!enabled || options.length === 0}
            >
              <SelectTrigger aria-label="Select an account">
                <SelectValue placeholder="Select an account…" />
              </SelectTrigger>
              <SelectContent>
                {DISPLAY_CATEGORY_ORDER.filter((c) => byCategory.get(c)?.length).map((cat) => (
                  <SelectGroup key={cat}>
                    <SelectLabel>{displayCategoryLabel(cat)}</SelectLabel>
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
      }
    >
      {!enabled ? (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-sm text-muted-foreground">
          <Lock className="size-6 opacity-60" />
          <p>You don’t have permission to view account trends.</p>
        </div>
      ) : !selected ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No {currency} accounts to chart for this branch.
        </p>
      ) : isLoading ? (
        <Skeleton className="h-[19rem] rounded-xl" />
      ) : isError ? (
        <ErrorState
          message={error?.message ?? "Failed to load trend."}
          onRetry={() => refetch()}
        />
      ) : data.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No transactions for {selected.AcctName} in this period.
        </p>
      ) : (
        <div className="space-y-4">
          <LegendRow items={series} />

          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart
              data={data}
              margin={{ top: 8, right: 8, bottom: 0, left: -4 }}
              barGap={2}
            >
              <CartesianGrid stroke={palette.grid} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                minTickGap={12}
              />
              <YAxis
                width={70}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => formatMoneyCompact(v, currency)}
              />
              <Tooltip
                cursor={{ fill: palette.track }}
                formatter={(v, name) => [formatMoney(Number(v), currency), String(name)]}
                contentStyle={TOOLTIP_STYLE}
                labelStyle={{ fontWeight: 600, marginBottom: 4 }}
              />
              <Bar
                dataKey="debit"
                name="Money in (debit)"
                fill={palette.flow.in}
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="credit"
                name="Money out (credit)"
                fill={palette.flow.out}
                radius={[4, 4, 0, 0]}
              />
              <Line
                type="monotone"
                dataKey="net"
                name="Net movement"
                stroke={palette.flow.net}
                strokeWidth={2}
                dot={{ r: 4, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>

          {/* Period totals — the direct labels the chart itself omits */}
          <dl className="grid grid-cols-1 gap-3 border-t pt-4 sm:grid-cols-3">
            {[
              { label: "Total in", value: totals.debit, color: palette.flow.in },
              { label: "Total out", value: totals.credit, color: palette.flow.out },
              { label: "Net movement", value: totals.net, color: palette.flow.net },
            ].map((t) => (
              <div key={t.label} className="flex items-center gap-2">
                <span
                  className="size-2.5 shrink-0 rounded-[3px]"
                  style={{ backgroundColor: t.color }}
                  aria-hidden
                />
                <div className="min-w-0">
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {t.label}
                  </dt>
                  <dd className="truncate font-semibold tabular-nums">
                    {formatMoney(t.value, currency)}
                  </dd>
                </div>
              </div>
            ))}
          </dl>
        </div>
      )}
    </SectionCard>
  );
}

/* ── Skeleton ─────────────────────────────────────────────── */

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <Skeleton className="h-64 rounded-xl xl:col-span-2" />
        <Skeleton className="h-64 rounded-xl xl:col-span-3" />
      </div>
      <Skeleton className="h-[24rem] rounded-xl" />
    </div>
  );
}
