import { useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Search } from "lucide-react";
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
  groupName,
  type Account,
  type Branch,
} from "@/api/bankAccounts";
import { useAccounts, useLedger } from "@/hooks/useBankAccounts";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  buildLedgerAnalytics,
  defaultDateRange,
  formatLedgerDate,
  formatMoney,
  formatMoneyCompact,
  ledgerDate,
} from "./helpers";
import { TOOLTIP_STYLE, useChartPalette } from "./chartTheme";
import { ErrorState } from "./states";
import BankLogo from "./BankLogo";
import { resolveBrand } from "./brands";

type LedgerRouteState = { account?: Account };

/** One bordered fact tile, matching the vendor ledger's summary grid. */
function Fact({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-muted-foreground">{label}</p>
      <p className={cn("font-semibold", className)}>{value}</p>
    </div>
  );
}

export default function BankLedgerPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const palette = useChartPalette();

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
    stateAccount ?? branchAccounts?.find((a) => a.AcctCode === acctCode) ?? null;

  const defaults = useMemo(() => defaultDateRange(), []);
  const [startDate, setStartDate] = useState(defaults.from);
  const [endDate, setEndDate] = useState(defaults.to);
  const [search, setSearch] = useState("");

  const rangeValid = !!startDate && !!endDate && startDate <= endDate;

  const {
    data: entries = [],
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
  } = useLedger(
    { branch, acctCode, fromDate: startDate, toDate: endDate },
    isValidBranch && !!acctCode && rangeValid
  );

  const analytics = useMemo(() => buildLedgerAnalytics(entries), [entries]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return analytics.rows;
    return analytics.rows.filter((r) =>
      [r.LineMemo, r.HeaderMemo, r.Ref1, r.Ref2, String(r.TransId), r.TransType].some(
        (v) => (v ?? "").toLowerCase().includes(q)
      )
    );
  }, [analytics.rows, search]);

  const currency = account?.ActCurr ?? "INR";
  const displayName = account?.AcctName ?? entries[0]?.AcctName ?? acctCode;
  const loading = isLoading || isFetching;
  const brand = account ? resolveBrand(account) : null;

  if (!isValidBranch || !acctCode) {
    return (
      <div className="p-3 sm:p-4 md:p-6">
        <ErrorState
          message="Invalid account or branch in the URL."
          onRetry={() => navigate("/accounts/bank-loan")}
        />
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 animate-page">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          {account && (
            <BankLogo
              name={account.U_Bank_Name || account.AcctName}
              brand={brand}
              size="lg"
            />
          )}
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold truncate">{displayName}</h1>
            <p className="text-sm text-muted-foreground">
              Account code: {acctCode} · {branch}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          className="btn-press"
          onClick={() => navigate("/accounts/bank-loan")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Accounts
        </Button>
      </div>

      {/* Account summary */}
      <Card className="card-hover">
        <CardHeader>
          <CardTitle>Account Summary</CardTitle>
          <CardDescription>
            Account details and movement over the selected period
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-sm">
            <Fact label="Account Code" value={acctCode} />
            <Fact label="Account Name" value={displayName} />
            <Fact label="Bank" value={account?.U_Bank_Name || "—"} />
            <Fact label="Account No." value={account?.U_Account_Number || "—"} />
            <Fact label="IFSC" value={account?.U_IFSC || "—"} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-sm">
            <Fact
              label="Group"
              value={account ? groupName(account) : "—"}
            />
            <Fact
              label="Category"
              value={account ? categoryLabel(account.Category) : "—"}
            />
            <Fact
              label="Current Balance"
              value={account ? formatMoney(account.CurrTotal, currency) : "—"}
              className={cn(
                (account?.CurrTotal ?? 0) < 0
                  ? "text-red-600 dark:text-red-400"
                  : "text-green-600 dark:text-green-400"
              )}
            />
            <Fact
              label="Money In · Money Out"
              value={
                <>
                  <span className="text-green-600 dark:text-green-400">
                    {formatMoney(analytics.totalDebit, currency)}
                  </span>
                  {" · "}
                  <span className="text-red-600 dark:text-red-400">
                    {formatMoney(analytics.totalCredit, currency)}
                  </span>
                </>
              }
            />
            <Fact
              label="Net Movement (period)"
              value={formatMoney(analytics.net, currency)}
              className={cn(
                analytics.net < 0
                  ? "text-red-600 dark:text-red-400"
                  : "text-green-600 dark:text-green-400"
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* Running balance */}
      {analytics.points.length > 0 && (
        <Card className="card-hover">
          <CardHeader>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <CardTitle>Running Balance</CardTitle>
                <CardDescription>
                  Cumulative movement over the period, relative to the opening balance
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs">
                {analytics.rows.length} entries
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart
                data={analytics.points}
                margin={{ top: 4, right: 8, bottom: 0, left: -4 }}
              >
                <defs>
                  <linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor={analytics.net >= 0 ? palette.flow.in : palette.flow.out}
                      stopOpacity={0.35}
                    />
                    <stop
                      offset="100%"
                      stopColor={analytics.net >= 0 ? palette.flow.in : palette.flow.out}
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={palette.grid} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={24}
                />
                <YAxis
                  width={70}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => formatMoneyCompact(v, currency)}
                />
                <Tooltip
                  formatter={(v) => [formatMoney(Number(v), currency), "Balance"]}
                  contentStyle={TOOLTIP_STYLE}
                  labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                />
                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke={analytics.net >= 0 ? palette.flow.in : palette.flow.out}
                  strokeWidth={2}
                  fill="url(#balanceFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Ledger entries */}
      <Card className="card-hover shimmer-hover">
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle>Ledger Entries</CardTitle>
              <CardDescription>Search by memo / reference / transaction</CardDescription>
            </div>
            <Badge variant="outline" className="text-xs">
              {loading ? "Loading..." : `${filteredRows.length} rows`}
            </Badge>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Memo / Ref / Trans ID"
                className="h-9 pl-8"
              />
            </div>
            <div className="flex items-center gap-2">
              <DatePicker
                value={startDate}
                onChange={setStartDate}
                placeholder="Start Date"
              />
              <span className="text-muted-foreground text-sm">to</span>
              <DatePicker value={endDate} onChange={setEndDate} placeholder="End Date" />
              {(startDate !== defaults.from || endDate !== defaults.to) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStartDate(defaults.from);
                    setEndDate(defaults.to);
                  }}
                  className="h-9 text-xs"
                >
                  Reset Dates
                </Button>
              )}
            </div>
          </div>
          {!rangeValid && (
            <p className="text-xs text-destructive">
              Start date must be on or before the end date.
            </p>
          )}
        </CardHeader>
        <CardContent>
          {isError ? (
            <ErrorState
              message={error?.message ?? "Failed to load ledger."}
              onRetry={() => refetch()}
            />
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Posting Date</TableHead>
                    <TableHead>Trans ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Memo</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead className="text-right">Running Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center py-8 text-muted-foreground"
                      >
                        Loading ledger...
                      </TableCell>
                    </TableRow>
                  ) : filteredRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8}>
                        <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                          <CheckCircle2 className="h-4 w-4" />
                          {search.trim()
                            ? "No ledger rows for this search"
                            : "No ledger rows for this period"}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRows.map((row) => {
                      const ref = [row.Ref1, row.Ref2].filter(Boolean).join(" · ");
                      return (
                        <TableRow key={`${row.TransId}-${row.Line_ID}`}>
                          <TableCell className="whitespace-nowrap font-medium">
                            {formatLedgerDate(row.RefDate)}
                            <span className="block text-[11px] font-normal text-muted-foreground tabular-nums">
                              {ledgerDate(row.RefDate)}
                            </span>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {row.TransId}
                          </TableCell>
                          <TableCell>{row.TransType || "—"}</TableCell>
                          <TableCell
                            className="max-w-[260px] truncate"
                            title={row.LineMemo || row.HeaderMemo}
                          >
                            {row.LineMemo || row.HeaderMemo || "—"}
                          </TableCell>
                          <TableCell
                            className="max-w-[160px] truncate text-muted-foreground"
                            title={ref}
                          >
                            {ref || "—"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {row.Debit ? (
                              <span className="text-green-600 dark:text-green-400">
                                {formatMoney(row.Debit, currency)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {row.Credit ? (
                              <span className="text-red-600 dark:text-red-400">
                                {formatMoney(row.Credit, currency)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "text-right font-semibold tabular-nums",
                              row.runningBalance < 0
                                ? "text-red-600 dark:text-red-400"
                                : "text-green-600 dark:text-green-400"
                            )}
                          >
                            {formatMoney(row.runningBalance, currency)}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
