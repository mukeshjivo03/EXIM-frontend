import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Globe,
  Landmark,
  MapPin,
  RefreshCw,
  Search,
  Trash2,
  Users2,
} from "lucide-react";

import {
  getVendors,
  syncVendor,
  deleteVendor,
  type Vendor,
} from "@/api/sapSync";
import { getErrorMessage } from "@/lib/errors";
import { Pagination } from "@/components/Pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  | "card_code"
  | "card_name"
  | "state"
  | "u_main_group"
  | "country";
type SortDir = "asc" | "desc";

/* ── Badge colors ──────────────────────────────────────────── */

const STATE_COLORS = [
  "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
  "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800",
  "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
  "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
  "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800",
  "bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-400 dark:border-pink-800",
  "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800",
];

const COUNTRY_COLORS: Record<string, string> = {
  IN: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800",
  US: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  AE: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
};

/* ── Component ─────────────────────────────────────────────── */

export default function SyncVendorDataPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Single vendor sync
  const [vendorCode, setVendorCode] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [highlightedCode, setHighlightedCode] = useState<string | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Refreshing
  const [refreshing, setRefreshing] = useState(false);

  // Search & filters
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("ALL");

  // Sort
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Pagination
  const [page, setPage] = useState(1);
  const perPage = 20;

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Vendor | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* ── Derived data ────────────────────────────────────────── */

  const stateColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    const uniqueStates = [
      ...new Set(vendors.map((v) => v.state).filter(Boolean)),
    ].sort();
    uniqueStates.forEach((s, i) => {
      map[s] = STATE_COLORS[i % STATE_COLORS.length];
    });
    return map;
  }, [vendors]);

  const uniqueGroups = useMemo(
    () =>
      [...new Set(vendors.map((v) => v.u_main_group).filter(Boolean))].sort(),
    [vendors]
  );

  // Summary stats
  const stats = useMemo(() => {
    const states = new Set(vendors.map((v) => v.state).filter(Boolean));
    const groups = new Set(vendors.map((v) => v.u_main_group).filter(Boolean));
    const countries = new Set(vendors.map((v) => v.country).filter(Boolean));
    return {
      total: vendors.length,
      states: states.size,
      groups: groups.size,
      countries: countries.size,
    };
  }, [vendors]);

  /* ── Filtered & sorted ───────────────────────────────────── */

  const filteredVendors = useMemo(() => {
    let result = [...vendors];

    // Group filter
    if (groupFilter !== "ALL")
      result = result.filter((v) => v.u_main_group === groupFilter);

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (v) =>
          v.card_code.toLowerCase().includes(q) ||
          v.card_name.toLowerCase().includes(q) ||
          v.state?.toLowerCase().includes(q) ||
          v.u_main_group?.toLowerCase().includes(q) ||
          v.country?.toLowerCase().includes(q)
      );
    }

    // Sort
    if (sortKey) {
      result.sort((a, b) => {
        const aVal = String(a[sortKey] ?? "");
        const bVal = String(b[sortKey] ?? "");
        const cmp = aVal.localeCompare(bVal);
        return sortDir === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [vendors, search, groupFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredVendors.length / perPage));
  const paginatedVendors = filteredVendors.slice(
    (page - 1) * perPage,
    page * perPage
  );

  const hasFilters = search.trim() !== "" || groupFilter !== "ALL";

  /* ── Reset page on filter change ─────────────────────────── */

  useEffect(() => {
    setPage(1);
  }, [search, groupFilter]);

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

  /* ── Fetch ───────────────────────────────────────────────── */

  async function fetchVendors() {
    setLoading(true);
    setError("");
    try {
      const { count: c, parties: data } = await getVendors();
      setVendors(data ?? []);
      setCount(c);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load vendors"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchVendors();

    function onVendorsUpdated() {
      fetchVendors();
    }
    window.addEventListener("vendors-updated", onVendorsUpdated);
    return () =>
      window.removeEventListener("vendors-updated", onVendorsUpdated);
  }, []);

  /* ── Refresh ─────────────────────────────────────────────── */

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await fetchVendors();
    } finally {
      setRefreshing(false);
    }
  }

  /* ── Sync single ─────────────────────────────────────────── */

  async function handleSync() {
    if (!vendorCode.trim()) return;
    const code = vendorCode.trim();
    if (vendors.some((v) => v.card_code === code)) {
      toast.info(`Vendor "${code}" is already synced.`);
      return;
    }
    setSyncing(true);
    setError("");
    try {
      await syncVendor(code);
      toast.success(`Vendor "${code}" synced successfully.`);
      setVendorCode("");
      setLastSyncTime(new Date());
      await fetchVendors();

      // Highlight synced row
      setHighlightedCode(code);
      clearTimeout(highlightTimer.current);
      highlightTimer.current = setTimeout(
        () => setHighlightedCode(null),
        3000
      );
    } catch (err) {
      setError(getErrorMessage(err, "Failed to sync vendor"));
    } finally {
      setSyncing(false);
    }
  }

  /* ── Delete ──────────────────────────────────────────────── */

  async function handleDelete() {
    if (!deleteTarget) return;
    const deletedName = deleteTarget.card_name;
    setDeleting(true);
    try {
      await deleteVendor(deleteTarget.card_code);
      setVendors((prev) => {
        const next = prev.filter((v) => v.id !== deleteTarget.id);
        const maxPage = Math.max(1, Math.ceil(next.length / perPage));
        setPage((p) => Math.min(p, maxPage));
        return next;
      });
      setCount((c) => c - 1);
      setDeleteTarget(null);
      toast.success(`Vendor "${deletedName}" deleted.`);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to delete vendor"));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  /* ── Clear filters ───────────────────────────────────────── */

  function clearFilters() {
    setSearch("");
    setGroupFilter("ALL");
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 animate-page">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Sync Vendor Data</h1>
          <p className="text-sm text-muted-foreground">
            Sync vendor data from SAP and manage vendors
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
            placeholder="Enter vendor code"
            value={vendorCode}
            onChange={(e) => setVendorCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSync()}
            className="w-48"
          />
          <Button
            className="btn-press"
            onClick={handleSync}
            disabled={syncing || !vendorCode.trim()}
          >
            {syncing ? "Syncing..." : "Sync"}
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

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-orange-50 dark:bg-orange-900/50 p-2 shrink-0">
                <Users2 className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Vendors</p>
                {loading ? (
                  <Skeleton className="h-7 w-16 mt-1" />
                ) : (
                  <p className="text-lg font-bold">{stats.total}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 dark:bg-blue-900/50 p-2 shrink-0">
                <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Unique States</p>
                {loading ? (
                  <Skeleton className="h-7 w-16 mt-1" />
                ) : (
                  <p className="text-lg font-bold">{stats.states}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-50 dark:bg-purple-900/50 p-2 shrink-0">
                <Landmark className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Main Groups</p>
                {loading ? (
                  <Skeleton className="h-7 w-16 mt-1" />
                ) : (
                  <p className="text-lg font-bold">{stats.groups}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-50 dark:bg-green-900/50 p-2 shrink-0">
                <Globe className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Countries</p>
                {loading ? (
                  <Skeleton className="h-7 w-16 mt-1" />
                ) : (
                  <p className="text-lg font-bold">{stats.countries}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table Card */}
      <Card className="card-hover shimmer-hover">
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle>Vendors</CardTitle>
              <CardDescription>
                {filteredVendors.length !== vendors.length
                  ? `${filteredVendors.length} of ${count} vendors`
                  : `${count} vendors synced from SAP`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search vendors..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-9 w-48 sm:w-56"
                />
              </div>

              {/* Group filter */}
              <Select value={groupFilter} onValueChange={setGroupFilter}>
                <SelectTrigger className="h-9 w-44">
                  <Landmark className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="All Groups" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Groups</SelectItem>
                  {uniqueGroups.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {hasFilters && (
            <div className="mt-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={clearFilters}
              >
                Clear all filters
              </Button>
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {loading ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">S.No</TableHead>
                    <TableHead>Vendor Code</TableHead>
                    <TableHead>Vendor Name</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Main Group</TableHead>
                    <TableHead>Country</TableHead>
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
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-12 rounded-full" />
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
                    <TableHead className="w-12">S.No</TableHead>
                    <TableHead>
                      <button
                        type="button"
                        className="flex items-center cursor-pointer hover:text-foreground transition-colors"
                        onClick={() => handleSort("card_code")}
                      >
                        Vendor Code
                        <SortIcon column="card_code" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        type="button"
                        className="flex items-center cursor-pointer hover:text-foreground transition-colors"
                        onClick={() => handleSort("card_name")}
                      >
                        Vendor Name
                        <SortIcon column="card_name" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        type="button"
                        className="flex items-center cursor-pointer hover:text-foreground transition-colors"
                        onClick={() => handleSort("state")}
                      >
                        State
                        <SortIcon column="state" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        type="button"
                        className="flex items-center cursor-pointer hover:text-foreground transition-colors"
                        onClick={() => handleSort("u_main_group")}
                      >
                        Main Group
                        <SortIcon column="u_main_group" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        type="button"
                        className="flex items-center cursor-pointer hover:text-foreground transition-colors"
                        onClick={() => handleSort("country")}
                      >
                        Country
                        <SortIcon column="country" />
                      </button>
                    </TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedVendors.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-16">
                        <div className="flex flex-col items-center gap-3 text-muted-foreground">
                          <Users2 className="h-10 w-10 stroke-1" />
                          <p className="font-medium">
                            {hasFilters
                              ? "No vendors match your filters"
                              : "No vendors found"}
                          </p>
                          <p className="text-sm">
                            {hasFilters
                              ? "Try adjusting your search or group filter."
                              : "Enter a vendor code above and click Sync to get started."}
                          </p>
                          {hasFilters && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={clearFilters}
                            >
                              Clear filters
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedVendors.map((vendor, i) => {
                      const isHighlighted =
                        highlightedCode === vendor.card_code;
                      return (
                        <TableRow
                          key={vendor.id}
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
                            {vendor.card_code}
                          </TableCell>
                          <TableCell>{vendor.card_name}</TableCell>
                          <TableCell>
                            {vendor.state ? (
                              <Badge
                                variant="outline"
                                className={`text-xs ${stateColorMap[vendor.state] ?? ""}`}
                              >
                                {vendor.state}
                              </Badge>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell>{vendor.u_main_group || "—"}</TableCell>
                          <TableCell>
                            {vendor.country ? (
                              <Badge
                                variant="outline"
                                className={`text-xs ${COUNTRY_COLORS[vendor.country] ?? "bg-muted text-muted-foreground border-border"}`}
                              >
                                {vendor.country}
                              </Badge>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleteTarget(vendor)}
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
              totalItems={filteredVendors.length}
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
            <DialogTitle>Delete Vendor</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <strong>{deleteTarget?.card_name}</strong>? This action cannot be
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
