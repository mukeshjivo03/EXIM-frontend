import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Activity,
  Scale,
  Hash,
  IndianRupee,
} from "lucide-react";

import {
  getDebitEntries,
  getDebitInsights,
  type DebitEntry,
  type DebitInsights,
} from "@/api/stockStatus";
import { getErrorMessage } from "@/lib/errors";
import { Pagination } from "@/components/Pagination";
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

/* ── Sort ────────────────────────────────────────────────────── */

type SortKey =
  | "supplier"
  | "item_name"
  | "load_qty"
  | "unload_qty"
  | "shortage_qty"
  | "allowed_shortage_qty"
  | "deducted_shortage_qty"
  | "deduction_amount"
  | "transporter"
  | "vehicle_number"
  | "grpo_number"
  | "grop_number"
  | "bility_number";

type SortDir = "asc" | "desc";

const NUMERIC_KEYS: SortKey[] = [
  "load_qty",
  "unload_qty",
  "shortage_qty",
  "allowed_shortage_qty",
  "deducted_shortage_qty",
  "deduction_amount",
];

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey | null; sortDir: SortDir }) {
  if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 text-muted-foreground/50 ml-1 inline" />;
  return sortDir === "asc"
    ? <ArrowUp className="h-3 w-3 ml-1 inline" />
    : <ArrowDown className="h-3 w-3 ml-1 inline" />;
}

function SortHead({
  col, label, sortKey, sortDir, onSort, right,
}: {
  col: SortKey;
  label: string;
  sortKey: SortKey | null;
  sortDir: SortDir;
  onSort: (k: SortKey) => void;
  right?: boolean;
}) {
  return (
    <TableHead className={right ? "text-right" : undefined}>
      <button
        type="button"
        className={`flex items-center cursor-pointer hover:text-foreground transition-colors${right ? " ml-auto" : ""}`}
        onClick={() => onSort(col)}
      >
        {label}<SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
      </button>
    </TableHead>
  );
}

function fmt3(n: number | string): string {
  return Number(n).toLocaleString("en-IN", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

/* ── Page ─────────────────────────────────────────────────────── */

const COLS = 13;

export default function ShortageReportPage() {
  const [entries, setEntries] = useState<DebitEntry[]>([]);
  const [insights, setInsights] = useState<DebitInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  const perPage = 25;

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      setError("");
      try {
        const [data, insightsData] = await Promise.all([
          getDebitEntries(),
          getDebitInsights(),
        ]);
        setEntries(data);
        setInsights(insightsData);
      } catch (err) {
        setError(getErrorMessage(err, "Failed to load Shortage Entries"));
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
    setPage(1);
  }

  const sorted = useMemo(() => {
    if (!sortKey) return entries;
    const copy = [...entries];
    copy.sort((a, b) => {
      const av = a[sortKey as keyof DebitEntry] ?? "";
      const bv = b[sortKey as keyof DebitEntry] ?? "";
      let cmp = NUMERIC_KEYS.includes(sortKey)
        ? (Number(av) || 0) - (Number(bv) || 0)
        : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [entries, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));
  const paginated = sorted.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 animate-page">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl sm:text-2xl font-bold">Shortage Report</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          Shortage entries recorded during stock transitions
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Insight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-none bg-blue-50/60 dark:bg-blue-950/20 shadow-sm">
          <CardContent className="p-5 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wider text-blue-600 dark:text-blue-400">Total Records</p>
              <Hash className="h-4 w-4 text-blue-500" />
            </div>
            {loading
              ? <div className="h-8 w-12 bg-blue-200/50 dark:bg-blue-800/30 animate-pulse rounded mt-1" />
              : <h3 className="text-2xl font-bold">{insights?.total_records ?? 0}</h3>
            }
          </CardContent>
        </Card>

        <Card className="border-none bg-red-50/60 dark:bg-red-950/20 shadow-sm">
          <CardContent className="p-5 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wider text-red-600 dark:text-red-400">Total Shortage</p>
              <Scale className="h-4 w-4 text-red-500" />
            </div>
            {loading
              ? <div className="h-8 w-24 bg-red-200/50 dark:bg-red-800/30 animate-pulse rounded mt-1" />
              : <h3 className="text-2xl font-bold tabular-nums">{Number(insights?.total_deduction_shortage ?? insights?.total_deduction_shortager ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} <span className="text-sm font-normal text-muted-foreground">MTS</span></h3>
            }
          </CardContent>
        </Card>

        <Card className="border-none bg-orange-50/60 dark:bg-orange-950/20 shadow-sm">
          <CardContent className="p-5 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wider text-orange-600 dark:text-orange-400">Total Deduction</p>
              <IndianRupee className="h-4 w-4 text-orange-500" />
            </div>
            {loading
              ? <div className="h-8 w-28 bg-orange-200/50 dark:bg-orange-800/30 animate-pulse rounded mt-1" />
              : <h3 className="text-2xl font-bold tabular-nums">₹ {Number(insights?.total_deduction_amount ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            }
          </CardContent>
        </Card>
      </div>

      <Card className="card-hover shimmer-hover">
        <CardHeader>
          <CardTitle>Shortage Entries</CardTitle>
          <CardDescription>{sorted.length} entr{sorted.length !== 1 ? "ies" : "y"} found</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>S.No</TableHead>
                  <SortHead col="supplier" label="Supplier" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortHead col="item_name" label="Item Name" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortHead col="load_qty" label="Load Qty (MTS)" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} right />
                  <SortHead col="unload_qty" label="Unload Qty (MTS)" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} right />
                  <SortHead col="shortage_qty" label="Shortage (MTS)" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} right />
                  <SortHead col="allowed_shortage_qty" label="Allowed Shortage (MTS)" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} right />
                  <SortHead col="deducted_shortage_qty" label="Deduction Qty (MTS)" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} right />
                  <SortHead col="deduction_amount" label="Deduction Amount (Rs)" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} right />
                  <SortHead col="transporter" label="Transporter" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortHead col="vehicle_number" label="Vehicle No" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortHead col="bility_number" label="Bility No" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortHead col="grpo_number" label="GRPO No" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: COLS }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : paginated.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={COLS} className="py-16 text-center text-muted-foreground">
                      No Shortage Entries found.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginated.map((entry, i) => (
                    <TableRow key={entry.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium text-muted-foreground">
                        {(page - 1) * perPage + i + 1}
                      </TableCell>
                      <TableCell>{entry.supplier || "-"}</TableCell>
                      <TableCell>{entry.item_name || "-"}</TableCell>
                      <TableCell className="text-right">{fmt3(entry.load_qty)}</TableCell>
                      <TableCell className="text-right">{fmt3(entry.unload_qty)}</TableCell>
                      <TableCell className="text-right text-red-600 dark:text-red-400 font-medium">
                        {fmt3(entry.shortage_qty)}
                      </TableCell>
                      <TableCell className="text-right">{fmt3(entry.allowed_shortage_qty)}</TableCell>
                      <TableCell className="text-right text-orange-600 dark:text-orange-400 font-medium">
                        {fmt3(entry.deducted_shortage_qty)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        Rs {fmt3(entry.deduction_amount)}
                      </TableCell>
                      <TableCell>{entry.transporter || "-"}</TableCell>
                      <TableCell className="font-mono text-sm">{entry.vehicle_number || "-"}</TableCell>
                      <TableCell>{entry.bility_number || "-"}</TableCell>
                      <TableCell>{entry.grpo_number || entry.grop_number || "-"}</TableCell>
                    </TableRow>
                  ))
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

