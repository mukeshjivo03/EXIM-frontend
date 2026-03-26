import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Filter,
  Hash,
  IndianRupee,
  PackageOpen,
  RefreshCw,
  Scale,
  Search,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";

import {
  getRmItems,
  getRmVarieties,
  getRmSummary,
  syncRmItems,
  syncSingleRmItem,
  deleteRmItem,
  type SapItem,
  type RmSummary,
} from "@/api/sapSync";
import { getErrorMessage } from "@/lib/errors";
import { fmtDecimal, fmtNum } from "@/lib/formatters";
import { SummaryCard } from "@/components/SummaryCard";
import { Pagination } from "@/components/Pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/* ── Types ─────────────────────────────────────────────────── */

type SortKey =
  | "item_code"
  | "item_name"
  | "u_brand"
  | "u_variety"
  | "u_unit"
  | "total_qty"
  | "rate"
  | "total_trans_value";
type SortDir = "asc" | "desc";

/* ── Variety colors ────────────────────────────────────────── */

const VARIETY_COLORS = [
  "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
  "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800",
  "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
  "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
  "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800",
  "bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-400 dark:border-pink-800",
  "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800",
];

/* ── Component ─────────────────────────────────────────────── */

export default function SyncRawMaterialDataPage() {
  const [items, setItems] = useState<SapItem[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Single item sync
  const [itemCode, setItemCode] = useState("");
  const [syncingOne, setSyncingOne] = useState(false);
  const [highlightedCode, setHighlightedCode] = useState<string | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Sync all
  const [syncingAll, setSyncingAll] = useState(false);

  // Refreshing
  const [refreshing, setRefreshing] = useState(false);

  // Search
  const [search, setSearch] = useState("");

  // Sort
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Pagination
  const [page, setPage] = useState(1);
  const perPage = 20;

  // Filter
  const [varieties, setVarieties] = useState<string[]>([]);
  const [fVarieties, setFVarieties] = useState<string[]>([]);
  const [varietySearch, setVarietySearch] = useState("");

  // Summary
  const [summary, setSummary] = useState<RmSummary | null>(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<SapItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* ── Variety color map ───────────────────────────────────── */

  const varietyColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    const uniqueVarieties = [...new Set(items.map((i) => i.u_variety).filter(Boolean))].sort();
    uniqueVarieties.forEach((v, i) => {
      map[v] = VARIETY_COLORS[i % VARIETY_COLORS.length];
    });
    return map;
  }, [items]);

  /* ── Filtered & sorted ───────────────────────────────────── */

  const filteredItems = useMemo(() => {
    let result = [...items];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (item) =>
          item.item_code.toLowerCase().includes(q) ||
          item.item_name.toLowerCase().includes(q) ||
          item.u_brand?.toLowerCase().includes(q) ||
          item.u_variety?.toLowerCase().includes(q)
      );
    }

    // Sort
    if (sortKey) {
      result.sort((a, b) => {
        let cmp = 0;
        const numericKeys = ["total_qty", "rate", "total_trans_value"];
        if (numericKeys.includes(sortKey)) {
          cmp =
            (Number(a[sortKey as keyof SapItem]) || 0) -
            (Number(b[sortKey as keyof SapItem]) || 0);
        } else {
          cmp = String(a[sortKey as keyof SapItem] ?? "").localeCompare(
            String(b[sortKey as keyof SapItem] ?? "")
          );
        }
        return sortDir === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [items, search, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / perPage));
  const paginatedItems = filteredItems.slice(
    (page - 1) * perPage,
    page * perPage
  );

  const hasFilters = search.trim() !== "" || fVarieties.length > 0;

  /* ── Sort handler ────────────────────────────────────────── */

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function SortIcon({ column }: { column: SortKey }) {
    if (sortKey !== column)
      return (
        <ArrowUpDown className="h-3 w-3 text-muted-foreground/50 ml-1 inline" />
      );
    return sortDir === "asc" ? (
      <ArrowUp className="h-3 w-3 ml-1 inline" />
    ) : (
      <ArrowDown className="h-3 w-3 ml-1 inline" />
    );
  }

  /* ── Reset page on filter change ─────────────────────────── */

  useEffect(() => {
    setPage(1);
  }, [search]);

  /* ── Fetch ───────────────────────────────────────────────── */

  async function fetchItems(selectedVarieties?: string[]) {
    setLoading(true);
    setError("");
    try {
      const { count: c, items: data } = await getRmItems(
        selectedVarieties?.length ? selectedVarieties : undefined
      );
      setItems(
        (data ?? []).sort((a, b) => a.item_code.localeCompare(b.item_code))
      );
      setCount(c);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load raw material items"));
    } finally {
      setLoading(false);
    }
  }

  async function fetchSummary(selectedVarieties?: string[]) {
    try {
      const data = await getRmSummary(
        selectedVarieties?.length ? selectedVarieties : undefined
      );
      setSummary(data);
    } catch {
      // non-critical
    }
  }

  async function loadVarieties() {
    try {
      const data = await getRmVarieties();
      setVarieties(data);
    } catch {
      // non-critical
    }
  }

  useEffect(() => {
    fetchItems();
    fetchSummary();
    loadVarieties();

    function onItemsUpdated() {
      fetchItems(fVarieties.length ? fVarieties : undefined);
      fetchSummary(fVarieties.length ? fVarieties : undefined);
    }
    window.addEventListener("rm-items-updated", onItemsUpdated);
    return () => window.removeEventListener("rm-items-updated", onItemsUpdated);
  }, []);

  /* ── Refresh (re-fetch without SAP sync) ─────────────────── */

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await fetchItems(fVarieties.length ? fVarieties : undefined);
      await fetchSummary(fVarieties.length ? fVarieties : undefined);
    } finally {
      setRefreshing(false);
    }
  }

  /* ── Sync all ────────────────────────────────────────────── */

  async function handleSyncAll() {
    setSyncingAll(true);
    setError("");
    try {
      const data = await syncRmItems();
      toast.success(
        `All raw materials synced. ${(data ?? []).length} items processed.`
      );
      setLastSyncTime(new Date());
      await fetchItems(fVarieties.length ? fVarieties : undefined);
      await fetchSummary(fVarieties.length ? fVarieties : undefined);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to sync raw material data"));
    } finally {
      setSyncingAll(false);
    }
  }

  /* ── Sync single ─────────────────────────────────────────── */

  async function handleSyncOne() {
    if (!itemCode.trim()) return;
    const code = itemCode.trim();
    if (items.some((item) => item.item_code === code)) {
      toast.info(`Item "${code}" is already synced.`);
      return;
    }
    setSyncingOne(true);
    setError("");
    try {
      await syncSingleRmItem(code);
      toast.success(`Item "${code}" synced successfully.`);
      setItemCode("");
      setLastSyncTime(new Date());
      await fetchItems(fVarieties.length ? fVarieties : undefined);
      fetchSummary(fVarieties.length ? fVarieties : undefined);

      // Highlight the synced item
      setHighlightedCode(code);
      clearTimeout(highlightTimer.current);
      highlightTimer.current = setTimeout(() => setHighlightedCode(null), 3000);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to sync item"));
    } finally {
      setSyncingOne(false);
    }
  }

  /* ── Delete ──────────────────────────────────────────────── */

  async function handleDelete() {
    if (!deleteTarget) return;
    const deletedName = deleteTarget.item_name;
    setDeleting(true);
    try {
      await deleteRmItem(deleteTarget.item_code);
      setItems((prev) => {
        const next = prev.filter((item) => item.id !== deleteTarget.id);
        const maxPage = Math.max(1, Math.ceil(next.length / perPage));
        setPage((p) => Math.min(p, maxPage));
        return next;
      });
      setCount((c) => c - 1);
      setDeleteTarget(null);
      toast.success(`Item "${deletedName}" deleted.`);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to delete item"));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  /* ── Variety filter helpers ──────────────────────────────── */

  const filteredVarieties = varietySearch.trim()
    ? varieties.filter((v) =>
        v.toLowerCase().includes(varietySearch.toLowerCase())
      )
    : varieties;

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 animate-page">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">
            Sync Raw Material Data
          </h1>
          <p className="text-sm text-muted-foreground">
            Sync raw material data from SAP and manage items
            {lastSyncTime && (
              <span className="text-muted-foreground/60">
                {" "}
                &middot; Last synced{" "}
                {lastSyncTime.toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Enter item code"
            value={itemCode}
            onChange={(e) => setItemCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSyncOne()}
            className="w-48"
          />
          <Button
            className="btn-press"
            onClick={handleSyncOne}
            disabled={syncingOne || !itemCode.trim()}
          >
            {syncingOne ? "Syncing..." : "Sync"}
          </Button>
          <Button
            className="btn-press"
            variant="outline"
            onClick={handleSyncAll}
            disabled={syncingAll}
          >
            {syncingAll ? "Syncing All..." : "Sync All"}
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={handleRefresh}
            disabled={refreshing}
            title="Refresh"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Filters */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Filters
        </h2>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-end gap-4 flex-wrap">
              <div className="space-y-1.5 min-w-[180px] flex-1">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Filter className="h-3 w-3" /> Variety
                </Label>
                <Select
                  value="__pick__"
                  onValueChange={(v) => {
                    if (v === "__pick__") return;
                    const next = fVarieties.includes(v)
                      ? fVarieties.filter((x) => x !== v)
                      : [...fVarieties, v];
                    setFVarieties(next);
                    setPage(1);
                    fetchItems(next.length ? next : undefined);
                    fetchSummary(next.length ? next : undefined);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue>
                      {fVarieties.length === 0
                        ? "All Varieties"
                        : `${fVarieties.length} selected`}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {/* Search within varieties */}
                    <div className="px-2 pb-2">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Search varieties..."
                          value={varietySearch}
                          onChange={(e) => setVarietySearch(e.target.value)}
                          className="w-full pl-7 pr-2 py-1.5 text-sm border rounded-md bg-background outline-none focus:ring-1 focus:ring-ring"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                    <SelectItem value="__pick__" disabled>
                      Select varieties
                    </SelectItem>
                    {filteredVarieties.map((v) => (
                      <SelectItem key={v} value={v}>
                        {fVarieties.includes(v) ? `✓ ${v}` : v}
                      </SelectItem>
                    ))}
                    {filteredVarieties.length === 0 && (
                      <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                        No varieties found
                      </div>
                    )}
                  </SelectContent>
                </Select>
                {fVarieties.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {fVarieties.map((v) => (
                      <Badge
                        key={v}
                        variant="outline"
                        className={`text-xs gap-1 cursor-pointer ${varietyColorMap[v] ?? ""}`}
                        onClick={() => {
                          const next = fVarieties.filter((x) => x !== v);
                          setFVarieties(next);
                          setPage(1);
                          fetchItems(next.length ? next : undefined);
                          fetchSummary(next.length ? next : undefined);
                        }}
                      >
                        {v}
                        <X className="h-3 w-3" />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div>
                {fVarieties.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1"
                    onClick={() => {
                      setFVarieties([]);
                      setPage(1);
                      fetchItems();
                      fetchSummary();
                    }}
                  >
                    <X className="h-4 w-4" />
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Cards */}
      <div>
        <h2 className="text-base font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          Summary
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <SummaryCard
            icon={Hash}
            label="Total Count"
            value={summary?.total_count ?? 0}
            loading={!summary}
          />
          <SummaryCard
            icon={Scale}
            label="Total Quantity (LTR)"
            value={summary ? fmtNum(Number(summary.total_qty)) : ""}
            loading={!summary}
          />
          <SummaryCard
            icon={TrendingUp}
            label="Avg Rate / LTR"
            value={
              summary ? `₹ ${fmtNum(Number(summary.avg_rate))}` : ""
            }
            loading={!summary}
          />
          <SummaryCard
            icon={IndianRupee}
            label="Total Trans Value"
            value={
              summary
                ? `₹ ${fmtNum(Number(summary.total_trans_value))}`
                : ""
            }
            loading={!summary}
          />
        </div>
      </div>

      {/* Table Card */}
      <Card className="card-hover shimmer-hover">
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle>Raw Material Items</CardTitle>
              <CardDescription>
                {filteredItems.length !== items.length
                  ? `${filteredItems.length} of ${count} items`
                  : `${count} items synced from SAP`}
              </CardDescription>
            </div>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 w-48 sm:w-56"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Item Code</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Variety</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">
                      Total Quantity (LTR)
                    </TableHead>
                    <TableHead className="text-right">Rate / LTR</TableHead>
                    <TableHead className="text-right">
                      Total Trans Value
                    </TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-6" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-12" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="h-4 w-8 ml-auto" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>
                      <button
                        type="button"
                        className="flex items-center cursor-pointer hover:text-foreground transition-colors"
                        onClick={() => handleSort("item_code")}
                      >
                        Item Code
                        <SortIcon column="item_code" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        type="button"
                        className="flex items-center cursor-pointer hover:text-foreground transition-colors"
                        onClick={() => handleSort("item_name")}
                      >
                        Item Name
                        <SortIcon column="item_name" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        type="button"
                        className="flex items-center cursor-pointer hover:text-foreground transition-colors"
                        onClick={() => handleSort("u_brand")}
                      >
                        Brand
                        <SortIcon column="u_brand" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        type="button"
                        className="flex items-center cursor-pointer hover:text-foreground transition-colors"
                        onClick={() => handleSort("u_variety")}
                      >
                        Variety
                        <SortIcon column="u_variety" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        type="button"
                        className="flex items-center cursor-pointer hover:text-foreground transition-colors"
                        onClick={() => handleSort("u_unit")}
                      >
                        Unit
                        <SortIcon column="u_unit" />
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button
                        type="button"
                        className="flex items-center cursor-pointer hover:text-foreground transition-colors ml-auto"
                        onClick={() => handleSort("total_qty")}
                      >
                        Total Qty (LTR)
                        <SortIcon column="total_qty" />
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button
                        type="button"
                        className="flex items-center cursor-pointer hover:text-foreground transition-colors ml-auto"
                        onClick={() => handleSort("rate")}
                      >
                        Rate / LTR
                        <SortIcon column="rate" />
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button
                        type="button"
                        className="flex items-center cursor-pointer hover:text-foreground transition-colors ml-auto"
                        onClick={() => handleSort("total_trans_value")}
                      >
                        Total Trans Value
                        <SortIcon column="total_trans_value" />
                      </button>
                    </TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="py-16">
                        <div className="flex flex-col items-center gap-3 text-muted-foreground">
                          <PackageOpen className="h-10 w-10 stroke-1" />
                          <p className="font-medium">
                            {hasFilters
                              ? "No items match your filters"
                              : "No items found"}
                          </p>
                          <p className="text-sm">
                            {hasFilters
                              ? "Try adjusting your search or variety filter."
                              : "Sync raw material data from SAP to see items here."}
                          </p>
                          {!hasFilters ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5"
                              onClick={handleSyncAll}
                              disabled={syncingAll}
                            >
                              {syncingAll ? "Syncing..." : "Sync All"}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSearch("");
                                setFVarieties([]);
                                setPage(1);
                                fetchItems();
                                fetchSummary();
                              }}
                            >
                              Clear filters
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedItems.map((item, i) => {
                      const isHighlighted =
                        highlightedCode === item.item_code;
                      return (
                        <TableRow
                          key={item.id}
                          className={
                            isHighlighted
                              ? "bg-green-50 dark:bg-green-900/20 animate-pulse"
                              : ""
                          }
                        >
                          <TableCell className="font-medium">
                            {(page - 1) * perPage + i + 1}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {item.item_code}
                          </TableCell>
                          <TableCell>{item.item_name}</TableCell>
                          <TableCell>{item.u_brand}</TableCell>
                          <TableCell>
                            {item.u_variety ? (
                              <Badge
                                variant="outline"
                                className={`text-xs ${varietyColorMap[item.u_variety] ?? ""}`}
                              >
                                {item.u_variety}
                              </Badge>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell>{item.u_unit}</TableCell>
                          <TableCell className="text-right">
                            {fmtDecimal(item.total_qty)}
                          </TableCell>
                          <TableCell className="text-right">
                            {fmtDecimal(item.rate)}
                          </TableCell>
                          <TableCell className="text-right">
                            {fmtDecimal(item.total_trans_value)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleteTarget(item)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {!loading && (
            <Pagination
              page={page}
              totalPages={totalPages}
              totalItems={filteredItems.length}
              perPage={perPage}
              onPageChange={setPage}
            />
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <strong>{deleteTarget?.item_name}</strong>? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
