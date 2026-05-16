import { useEffect, useMemo, useState } from "react";
import { FileText, Search, Building2, Package, CircleDollarSign, Clock3, X } from "lucide-react";

import { getOpenPos, type OpenPosEntry } from "@/api/sapSync";
import { getErrorMessage } from "@/lib/errors";
import Guard from "@/components/Guard";
import { Pagination } from "@/components/Pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const COLS = 15;

function fmtDate(value: string | null): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN");
}

function fmtNum(value: number): string {
  return Number(value ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 3 });
}

function fmtInr(value: number): string {
  return `INR ${Number(value ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function getDaysOpen(poDate: string | null): number | null {
  if (!poDate) return null;
  const d = new Date(poDate);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  d.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  const diffMs = now.getTime() - d.getTime();
  return diffMs >= 0 ? Math.floor(diffMs / (1000 * 60 * 60 * 24)) : 0;
}

function getDaysOpenTone(daysOpen: number | null): "default" | "amber" | "rose" {
  if (daysOpen == null) return "default";
  if (daysOpen >= 45) return "rose";
  if (daysOpen >= 20) return "amber";
  return "default";
}

export default function OpenPosPage() {
  const [rows, setRows] = useState<OpenPosEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const perPage = 20;

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await getOpenPos();
        setRows(data);
      } catch (err) {
        setError(getErrorMessage(err, "Failed to load Open POS"));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      String(row.PO_NUMBER ?? "").includes(q) ||
      (row.VENDOR_CODE ?? "").toLowerCase().includes(q) ||
      (row.VENDOR_NAME ?? "").toLowerCase().includes(q) ||
      (row.ItemCode ?? "").toLowerCase().includes(q) ||
      (row.ITEM_NAME ?? "").toLowerCase().includes(q) ||
      (row.WAREHOUSE ?? "").toLowerCase().includes(q)
    );
  }, [rows, search]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filtered.length / perPage)), [filtered.length]);
  const paginated = useMemo(() => filtered.slice((page - 1) * perPage, page * perPage), [filtered, page]);
  const totalOpenValue = useMemo(
    () => filtered.reduce((sum, row) => sum + Number(row.OPEN_VALUE ?? 0), 0),
    [filtered]
  );
  const totalPendingQty = useMemo(
    () => filtered.reduce((sum, row) => sum + Number(row.PENDING_QTY ?? 0), 0),
    [filtered]
  );
  const vendorCount = useMemo(
    () => new Set(filtered.map((row) => row.VENDOR_CODE).filter(Boolean)).size,
    [filtered]
  );
  const avgDaysOpen = useMemo(() => {
    const valid = filtered.map((row) => getDaysOpen(row.PO_DATE)).filter((d): d is number => d !== null);
    if (!valid.length) return 0;
    return valid.reduce((sum, d) => sum + d, 0) / valid.length;
  }, [filtered]);
  const staleCount = useMemo(
    () => filtered.filter((row) => (getDaysOpen(row.PO_DATE) ?? 0) >= 30).length,
    [filtered]
  );
  const hasFilters = search.trim().length > 0;

  return (
    <Guard resource="balance_sheet" action="view" fallback={<div className="p-6 text-sm text-muted-foreground">You do not have permission to view Open POS.</div>}>
      <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 animate-page">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Open POS</h1>
            <p className="text-sm text-muted-foreground">Open purchase orders from SAP</p>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-none bg-emerald-50/60 dark:bg-emerald-950/20 shadow-sm">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Open Value</p>
                <p className="text-xl font-bold mt-1">{fmtInr(totalOpenValue)}</p>
              </div>
              <CircleDollarSign className="h-5 w-5 text-emerald-600" />
            </CardContent>
          </Card>
          <Card className="border-none bg-blue-50/60 dark:bg-blue-950/20 shadow-sm">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-blue-700 dark:text-blue-300">Pending Qty</p>
                <p className="text-xl font-bold mt-1">{fmtNum(totalPendingQty)}</p>
              </div>
              <Package className="h-5 w-5 text-blue-600" />
            </CardContent>
          </Card>
          <Card className="border-none bg-amber-50/60 dark:bg-amber-950/20 shadow-sm">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-amber-700 dark:text-amber-300">Vendors</p>
                <p className="text-xl font-bold mt-1">{vendorCount}</p>
              </div>
              <Building2 className="h-5 w-5 text-amber-600" />
            </CardContent>
          </Card>
          <Card className="border-none bg-rose-50/60 dark:bg-rose-950/20 shadow-sm">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-rose-700 dark:text-rose-300">Aging PO (30+ Days)</p>
                <p className="text-xl font-bold mt-1">{staleCount}</p>
                <p className="text-[11px] text-rose-700/80 dark:text-rose-300/80 mt-0.5">Avg Days Open: {fmtNum(avgDaysOpen)}</p>
              </div>
              <Clock3 className="h-5 w-5 text-rose-600" />
            </CardContent>
          </Card>
        </div>

        <Card className="card-hover shimmer-hover">
          <CardHeader>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <CardTitle>Open POS List</CardTitle>
                <CardDescription>
                  {filtered.length} record{filtered.length !== 1 ? "s" : ""}
                  {search ? ` (filtered from ${rows.length})` : ""}
                </CardDescription>
              </div>
              <div className="w-full sm:w-auto flex items-center gap-2">
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search PO / vendor / item / warehouse"
                    value={search}
                    className="pl-8"
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                  />
                </div>
                {hasFilters && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearch("");
                      setPage(1);
                    }}
                    className="shrink-0"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>S.No</TableHead>
                    <TableHead>PO Number</TableHead>
                    <TableHead>PO Date</TableHead>
                    <TableHead className="text-right">Days Open</TableHead>
                    <TableHead>Vendor Code</TableHead>
                    <TableHead>Vendor Name</TableHead>
                    <TableHead>Item Code</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead className="text-right">Ordered Qty</TableHead>
                    <TableHead className="text-right">Pending Qty</TableHead>
                    <TableHead className="text-right">Received Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Open Value</TableHead>
                    <TableHead>Warehouse</TableHead>
                    <TableHead>UOM</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: COLS }).map((__, j) => (
                          <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : paginated.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={COLS} className="py-16 text-center text-muted-foreground">
                        No Open POS records found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginated.map((row, i) => (
                      <TableRow key={`${row.PO_NUMBER}-${row.ItemCode}-${i}`} className="hover:bg-muted/40">
                        <TableCell>{(page - 1) * perPage + i + 1}</TableCell>
                        <TableCell className="font-medium">{row.PO_NUMBER ?? "-"}</TableCell>
                        <TableCell>{fmtDate(row.PO_DATE)}</TableCell>
                        <TableCell className="text-right">
                          {(() => {
                            const daysOpen = getDaysOpen(row.PO_DATE);
                            const tone = getDaysOpenTone(daysOpen);
                            if (daysOpen == null) return "-";
                            if (tone === "rose") return <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300">{daysOpen}</Badge>;
                            if (tone === "amber") return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300">{daysOpen}</Badge>;
                            return <Badge variant="outline">{daysOpen}</Badge>;
                          })()}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{row.VENDOR_CODE ?? "-"}</TableCell>
                        <TableCell>{row.VENDOR_NAME ?? "-"}</TableCell>
                        <TableCell className="font-mono text-xs">{row.ItemCode ?? "-"}</TableCell>
                        <TableCell className="max-w-[280px] truncate" title={row.ITEM_NAME ?? ""}>{row.ITEM_NAME ?? "-"}</TableCell>
                        <TableCell className="text-right">{fmtNum(row.ORDERED_QTY ?? 0)}</TableCell>
                        <TableCell className="text-right font-semibold">{fmtNum(row.PENDING_QTY ?? 0)}</TableCell>
                        <TableCell className="text-right">{fmtNum(row.RECEIVED_QTY ?? 0)}</TableCell>
                        <TableCell className="text-right">{fmtInr(row.UNIT_PRICE ?? 0)}</TableCell>
                        <TableCell className="text-right font-bold">{fmtInr(row.OPEN_VALUE ?? 0)}</TableCell>
                        <TableCell>{row.WAREHOUSE ?? "-"}</TableCell>
                        <TableCell>{row.UOM ?? "-"}</TableCell>
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
                totalItems={filtered.length}
                perPage={perPage}
                onPageChange={setPage}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </Guard>
  );
}
