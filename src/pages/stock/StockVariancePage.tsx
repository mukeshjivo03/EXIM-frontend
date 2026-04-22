import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  TrendingDown,
  TrendingUp,
  Activity,
} from "lucide-react";

import {
  getDebitEntries,
  getDebitInsights,
  type DebitEntry,
  type DebitInsight,
} from "@/api/stockStatus";
import { getVendors } from "@/api/sapSync";
import { fmtDecimal, fmtDateTime } from "@/lib/formatters";
import { getErrorMessage } from "@/lib/errors";
import { Pagination } from "@/components/Pagination";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

/* ── Sort ────────────────────────────────────────────────────── */

type SortKey = "id" | "type" | "vehicle_number" | "responsible_party" | "stock" | "quantity" | "rate" | "total" | "created_at";
type SortDir = "asc" | "desc";

const NUMERIC_KEYS: SortKey[] = ["id", "stock", "quantity", "rate", "total"];

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey | null; sortDir: SortDir }) {
  if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 text-muted-foreground/50 ml-1 inline" />;
  return sortDir === "asc"
    ? <ArrowUp className="h-3 w-3 ml-1 inline" />
    : <ArrowDown className="h-3 w-3 ml-1 inline" />;
}

/* ── Insight card ─────────────────────────────────────────────── */

function InsightCard({ type, insight, loading }: { type: "GAIN" | "LOSS"; insight: DebitInsight | undefined; loading: boolean; }) {
  const isGain = type === "GAIN";
  const Icon = isGain ? TrendingUp : TrendingDown;

  return (
    <Card className={cn("card-hover", isGain ? "border-green-200 dark:border-green-900" : "border-red-200 dark:border-red-900")}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {isGain ? "Total Gains" : "Total Losses"}
          </CardTitle>
          <Icon className={cn("h-4 w-4", isGain ? "text-green-500" : "text-red-500")} />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <>
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-20" />
          </>
        ) : (
          <>
            <p className={cn("text-2xl font-bold", isGain ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
              {fmtDecimal(Math.abs(insight?.total_qty ?? 0))} KGS
            </p>
            <p className="text-sm text-muted-foreground">
              Value: ₹ {fmtDecimal(Math.abs(insight?.total_value ?? 0))}
            </p>
            <p className="text-xs text-muted-foreground">
              {insight?.total_records ?? 0} record{(insight?.total_records ?? 0) !== 1 ? "s" : ""}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* ── Page ─────────────────────────────────────────────────────── */

type TypeFilter = "ALL" | "GAIN" | "LOSS";

export default function StockVariancePage() {
  const [entries, setEntries] = useState<DebitEntry[]>([]);
  const [insights, setInsights] = useState<DebitInsight[]>([]);
  const [vendorMap, setVendorMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [error, setError] = useState("");

  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [sortKey, setSortKey] = useState<SortKey | null>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const perPage = 25;

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      setInsightsLoading(true);
      setError("");
      try {
        const [data, ins, vendorsRes] = await Promise.all([getDebitEntries(), getDebitInsights(), getVendors()]);
        setEntries(data);
        setInsights(ins);
        const map = new Map<string, string>();
        for (const v of vendorsRes.parties) map.set(v.card_code, v.card_name);
        setVendorMap(map);
      } catch (err) {
        setError(getErrorMessage(err, "Failed to load variance entries"));
      } finally {
        setLoading(false);
        setInsightsLoading(false);
      }
    }
    fetchAll();
  }, []);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
    setPage(1);
  }

  const filtered = useMemo(() => {
    if (typeFilter === "ALL") return entries;
    return entries.filter((e) => e.type === typeFilter);
  }, [entries, typeFilter]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = a[sortKey as keyof DebitEntry] ?? "";
      const bv = b[sortKey as keyof DebitEntry] ?? "";
      let cmp = NUMERIC_KEYS.includes(sortKey)
        ? (Number(av) || 0) - (Number(bv) || 0)
        : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));
  const paginated = sorted.slice((page - 1) * perPage, page * perPage);

  const gainInsight = insights.find((i) => i.type === "GAIN");
  const lossInsight = insights.find((i) => i.type === "LOSS");

  const FILTER_OPTIONS: { value: TypeFilter; label: string }[] = [
    { value: "ALL", label: `All (${entries.length})` },
    { value: "GAIN", label: `Gains (${entries.filter((e) => e.type === "GAIN").length})` },
    { value: "LOSS", label: `Losses (${entries.filter((e) => e.type === "LOSS").length})` },
  ];

  const skeletonCols = 10;

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 animate-page">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl sm:text-2xl font-bold">Stock Variance</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          Shortage and gain entries recorded during stock transitions
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Insight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InsightCard type="GAIN" insight={gainInsight} loading={insightsLoading} />
        <InsightCard type="LOSS" insight={lossInsight} loading={insightsLoading} />
      </div>

      {/* Table Card */}
      <Card className="card-hover shimmer-hover">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle>Variance Entries</CardTitle>
              <CardDescription>{sorted.length} entr{sorted.length !== 1 ? "ies" : "y"} found</CardDescription>
            </div>
            {/* Type filter */}
            <div className="flex gap-1.5">
              {FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { setTypeFilter(opt.value); setPage(1); }}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                    typeFilter === opt.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>S.No</TableHead>
                  <TableHead>
                    <button type="button" className="flex items-center cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort("type")}>
                      Type<SortIcon col="type" sortKey={sortKey} sortDir={sortDir} />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button type="button" className="flex items-center cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort("vehicle_number")}>
                      Vehicle No<SortIcon col="vehicle_number" sortKey={sortKey} sortDir={sortDir} />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button type="button" className="flex items-center cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort("responsible_party")}>
                      Responsible Party<SortIcon col="responsible_party" sortKey={sortKey} sortDir={sortDir} />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button type="button" className="flex items-center cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort("stock")}>
                      Stock ID<SortIcon col="stock" sortKey={sortKey} sortDir={sortDir} />
                    </button>
                  </TableHead>
                  <TableHead className="text-right">
                    <button type="button" className="flex items-center cursor-pointer hover:text-foreground transition-colors ml-auto" onClick={() => handleSort("quantity")}>
                      Quantity (KGS)<SortIcon col="quantity" sortKey={sortKey} sortDir={sortDir} />
                    </button>
                  </TableHead>
                  <TableHead className="text-right">
                    <button type="button" className="flex items-center cursor-pointer hover:text-foreground transition-colors ml-auto" onClick={() => handleSort("rate")}>
                      Rate (₹)<SortIcon col="rate" sortKey={sortKey} sortDir={sortDir} />
                    </button>
                  </TableHead>
                  <TableHead className="text-right">
                    <button type="button" className="flex items-center cursor-pointer hover:text-foreground transition-colors ml-auto" onClick={() => handleSort("total")}>
                      Total (₹)<SortIcon col="total" sortKey={sortKey} sortDir={sortDir} />
                    </button>
                  </TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>
                    <button type="button" className="flex items-center cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort("created_at")}>
                      Created At<SortIcon col="created_at" sortKey={sortKey} sortDir={sortDir} />
                    </button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: skeletonCols }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : paginated.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={skeletonCols} className="py-16 text-center text-muted-foreground">
                      No variance entries found.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginated.map((entry, i) => {
                    const isGain = entry.type === "GAIN";
                    const qty = Math.abs(Number(entry.quantity));
                    const total = Math.abs(Number(entry.total));
                    return (
                      <TableRow key={entry.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium text-muted-foreground">
                          {(page - 1) * perPage + i + 1}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={isGain ? "default" : "destructive"}
                            className={cn(
                              isGain && "bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/40 dark:text-green-400"
                            )}
                          >
                            {isGain ? "GAIN" : "LOSS"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{entry.vehicle_number || "—"}</TableCell>
                        <TableCell>{vendorMap.get(entry.responsible_party) || entry.responsible_party || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">#{entry.stock}</TableCell>
                        <TableCell className={cn("text-right font-medium", isGain ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                          {isGain ? "+" : "-"}{fmtDecimal(qty)}
                        </TableCell>
                        <TableCell className="text-right">{fmtDecimal(entry.rate)}</TableCell>
                        <TableCell className={cn("text-right font-medium", isGain ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                          {isGain ? "+" : "-"}₹ {fmtDecimal(total)}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <span className="text-sm text-muted-foreground line-clamp-2" title={entry.reason}>
                            {entry.reason}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {fmtDateTime(entry.created_at)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {!loading && (
            <Pagination
              page={page}
              totalPages={totalPages}
              totalItems={sorted.length}
              perPage={perPage}
              onPageChange={setPage}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
