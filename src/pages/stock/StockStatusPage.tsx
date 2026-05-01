import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  ClipboardList,
  Eye,
  Pencil,
  Truck,
  IndianRupee,
  Filter,
  X,
  Hash,
  Scale,
  Weight,
  Droplets,
  MapPin,
  Clock,
  CheckCircle2,
  Ship,
  Anchor,
  Factory,
  Trash2,
  Container,
  Search,
} from "lucide-react";

import {
  getStockStatuses,
  getStockStatus,
  getStockInsights,
  arriveBatch,
  moveStock,
  softDeleteStockStatus,
  type StockStatus,
  type StockStatusFilters,
  type StockInsightsSummary,
} from "@/api/stockStatus";
import { getVendors, type Vendor } from "@/api/sapSync";
import { getTankItems, type TankItem } from "@/api/tank";
import { useAuth } from "@/context/AuthContext";
import { useHasPermission } from "@/hooks/useHasPermission";
import Guard from "@/components/Guard";
import { fmtDateTime, fmtNum } from "@/lib/formatters";
import { getErrorMessage, toastApiError } from "@/lib/errors";
import { SummaryCard } from "@/components/SummaryCard";
import { Pagination } from "@/components/Pagination";
import { formatStatus, statusColorClass, getEtaCountdown, STATUS_ORDER } from "./stock-helpers";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

import { CreateStockDialog } from "./components/CreateStockDialog";
import { ViewStockSheet } from "./components/ViewStockSheet";
import { EditStockDialog } from "./components/EditStockDialog";
import { DeleteStockDialog } from "./components/DeleteStockDialog";

/* ── component ────────────────────────────────────────────── */

export default function StockStatusPage() {
  const { email } = useAuth();
  const { hasPermission } = useHasPermission();
  const canAdd = hasPermission("stockstatus", "add");
  const canEdit = hasPermission("stockstatus", "change") || hasPermission("stockstatus", "edit");
  const canDelete = hasPermission("stockstatus", "delete");
  const canBulk = canEdit || canDelete;

  const [rows, setRows] = useState<StockStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // dropdown data
  const [tankItems, setTankItems] = useState<TankItem[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  // insights summary
  const [overallSummary, setOverallSummary] = useState<StockInsightsSummary | null>(null);
  const [summary, setSummary] = useState<StockInsightsSummary | null>(null);

  // filters
  const [fStatus, setFStatus] = useState("");
  const [fVendor, setFVendor] = useState("");
  const [fItem, setFItem] = useState("");
  const hasFilters = !!(fStatus || fVendor || fItem);

  // Heatmap helper
  const maxQty = useMemo(() => {
    if (rows.length === 0) return 0;
    return Math.max(...rows.map((r) => Number(r.quantity)));
  }, [rows]);

  // dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [viewData, setViewData] = useState<StockStatus | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [editData, setEditData] = useState<StockStatus | null>(null);
  const [deleteData, setDeleteData] = useState<StockStatus | null>(null);

  // Bulk Actions
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // all rows (unfiltered) for deriving filter options
  const [allRows, setAllRows] = useState<StockStatus[]>([]);

  // unique filter options derived from actual data
  const uniqueStatuses = useMemo(() => [...new Set(allRows.map((r) => r.status))].sort(), [allRows]);
  const uniqueVendors = useMemo(() => [...new Set(allRows.map((r) => r.vendor_code))].sort(), [allRows]);
  const uniqueItems = useMemo(() => [...new Set(allRows.map((r) => r.item_code))].sort(), [allRows]);
  const itemNameMap = useMemo(() => new Map(tankItems.map((t) => [t.tank_item_code, t.tank_item_name])), [tankItems]);
  const vendorNameMap = useMemo(() => new Map(vendors.map((v) => [v.card_code, v.card_name])), [vendors]);

  // search
  const [search, setSearch] = useState("");

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const itemName = (itemNameMap.get(row.item_code) ?? row.item_code).toLowerCase();
      const vendorName = (vendorNameMap.get(row.vendor_code) ?? row.vendor_code).toLowerCase();
      return (
        itemName.includes(q) ||
        formatStatus(row.status).toLowerCase().includes(q) ||
        vendorName.includes(q) ||
        (row.vehicle_number ?? "").toLowerCase().includes(q) ||
        String(row.rate).includes(q) ||
        String(row.quantity).includes(q) ||
        (row.eta ?? "").toLowerCase().includes(q) ||
        (row.arrival_date ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, search, itemNameMap, vendorNameMap]);

  // pagination
  const [page, setPage] = useState(1);
  const perPage = 20;
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / perPage));
  const paginated = filteredRows.slice((page - 1) * perPage, page * perPage);

  /* ── fetch list ──────────────────────────────────────────── */

  async function fetchList(filters?: StockStatusFilters) {
    setLoading(true);
    setError("");
    try {
      const [data, insights] = await Promise.all([
        getStockStatuses(filters),
        getStockInsights({
          status: filters?.status,
          vendor: filters?.vendor,
          item: filters?.item,
        }),
      ]);
      setRows(
        data
          .filter((r) => !r.deleted)
          .sort((a, b) => {
            const oa = STATUS_ORDER[a.status] ?? 99;
            const ob = STATUS_ORDER[b.status] ?? 99;
            return oa !== ob ? oa - ob : b.id - a.id;
          })
      );
      setSummary(insights.summary);
      setSelectedIds(new Set());
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load stock statuses"));
    } finally {
      setLoading(false);
    }
  }

  async function fetchOverallSummary() {
    try {
      const data = await getStockInsights();
      setOverallSummary(data.summary);
    } catch {
      // non-critical
    }
  }

  async function fetchAllRows() {
    try {
      const data = await getStockStatuses();
      setAllRows(data.filter((r) => !r.deleted));
    } catch {
      // non-critical
    }
  }

  async function loadDropdowns() {
    try {
      const [tankRes, vendorRes] = await Promise.all([getTankItems(), getVendors()]);
      setTankItems((tankRes ?? []).sort((a, b) => a.tank_item_code.localeCompare(b.tank_item_code)));
      setVendors((vendorRes.parties ?? []).sort((a, b) => a.card_code.localeCompare(b.card_code)));
    } catch {
      // keep whatever was loaded before
    }
  }

  function refreshAll() {
    return Promise.all([fetchList(currentFilters()), fetchOverallSummary(), fetchAllRows()]);
  }

  useEffect(() => {
    fetchList();
    fetchOverallSummary();
    fetchAllRows();
    loadDropdowns();
  }, []);

  /* ── Selection ─────────────────────────────────────────── */

  const toggleSelectAll = () => {
    if (selectedIds.size === paginated.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginated.map((r) => r.id)));
    }
  };

  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  /* ── Bulk Actions ──────────────────────────────────────── */

  async function handleBulkArrive() {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    setBulkProcessing(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) => {
          const row = rows.find((r) => r.id === id);
          if (!row) return Promise.resolve();
          return arriveBatch({
            stock_id: id,
            weighed_qty: Number(row.quantity),
            destination_status: "AT_REFINERY",
            action: "TOLERATE",
            created_by: email ?? "SYSTEM",
          });
        })
      );
      toast.success(`Bulk arrival completed for ${count} records.`);
      await fetchList(currentFilters());
    } catch (err) {
      toastApiError(err, "Failed to complete bulk arrival.");
    } finally {
      setBulkProcessing(false);
    }
  }

  // Check if all selected rows are COMPLETED (for In Tank action)
  const allSelectedCompleted = selectedIds.size > 0 && Array.from(selectedIds).every((id) => {
    const row = rows.find((r) => r.id === id);
    return row?.status === "COMPLETED";
  });

  async function handleBulkInTank() {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    setBulkProcessing(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) => {
          const row = rows.find((r) => r.id === id);
          if (!row) return Promise.resolve();
          return moveStock({
            stock_id: id,
            new_quantity: Number(row.quantity),
            new_status: "IN_TANK",
            action: "TOLERATE",
            created_by: email ?? "SYSTEM",
          });
        })
      );
      toast.success(`${count} record(s) marked as In Tank.`);
      await fetchList(currentFilters());
    } catch (err) {
      toastApiError(err, "Failed to mark as In Tank.");
    } finally {
      setBulkProcessing(false);
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    setBulkProcessing(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) => {
          const row = rows.find((r) => r.id === id);
          if (!row) return Promise.resolve();
          return softDeleteStockStatus(row);
        })
      );
      toast.success(`Bulk delete completed for ${count} records.`);
      await refreshAll();
    } catch (err) {
      toastApiError(err, "Failed to complete bulk delete.");
    } finally {
      setBulkProcessing(false);
    }
  }

  /* ── view ─────────────────────────────────────────────────── */

  async function openView(id: number) {
    setViewLoading(true);
    setViewData(null);
    try {
      const [data] = await Promise.all([getStockStatus(id), loadDropdowns()]);
      setViewData(data);
    } catch {
      toast.error("Failed to load stock status details.");
    } finally {
      setViewLoading(false);
    }
  }

  /* ── edit ─────────────────────────────────────────────────── */

  async function openEdit(row: StockStatus) {
    await loadDropdowns();
    setEditData(row);
  }

  /* ── filters ─────────────────────────────────────────────── */

  function currentFilters(): StockStatusFilters | undefined {
    if (!hasFilters) return undefined;
    const f: StockStatusFilters = {};
    if (fStatus) f.status = fStatus;
    if (fVendor) f.vendor = fVendor;
    if (fItem) f.item = fItem;
    return f;
  }

  function applyFilters() {
    setPage(1);
    fetchList(currentFilters());
  }

  function clearFilters() {
    setFStatus("");
    setFVendor("");
    setFItem("");
    setPage(1);
    fetchList();
  }

  /* ── render ──────────────────────────────────────────────── */

  return (
    <Guard
      resource="stockstatus"
      action="view"
      fallback={<div className="p-6 text-sm text-muted-foreground">You do not have permission to view stock status.</div>}
    >
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 animate-page relative pb-20">
      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && canBulk && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-primary text-primary-foreground px-6 py-3 rounded-full shadow-2xl flex items-center gap-6 border border-primary/20 backdrop-blur-md">
            <span className="text-sm font-bold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              {selectedIds.size} Selected
            </span>
            <Separator orientation="vertical" className="h-6 bg-primary-foreground/20" />
            <div className="flex gap-2">
              {canEdit && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="rounded-full gap-1.5"
                  disabled={bulkProcessing}
                  onClick={handleBulkArrive}
                >
                  <Factory className="h-3.5 w-3.5" />
                  Arrive Refinery
                </Button>
              )}
              {canEdit && allSelectedCompleted && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="rounded-full gap-1.5"
                  disabled={bulkProcessing}
                  onClick={handleBulkInTank}
                >
                  <Container className="h-3.5 w-3.5" />
                  Mark In Tank
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="rounded-full gap-1.5 bg-red-500 hover:bg-red-600 border-none"
                  disabled={bulkProcessing}
                  onClick={handleBulkDelete}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full text-primary-foreground hover:bg-primary-foreground/10"
                onClick={() => setSelectedIds(new Set())}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Stock Status</h1>
          <p className="text-sm text-muted-foreground">Track and manage stock statuses</p>
        </div>
        {canAdd && (
        <Button onClick={() => { loadDropdowns(); setCreateOpen(true); }} className="btn-press gap-2 shadow-sm shrink-0">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add Stock Status</span>
        </Button>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Stock Status Summary */}
      <div>
        <h2 className="text-base font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          Stock Status Summary
        </h2>
        <Card className="md:hidden">
          <CardContent className="p-3 space-y-2 text-sm">
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Total Count</span><span className="font-semibold">{overallSummary?.total_count ?? 0}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Total Value</span><span className="font-semibold">₹ {fmtNum(Number(overallSummary?.total_value ?? 0))}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Total Quantity</span><span className="font-semibold">{fmtNum(Number(overallSummary?.total_qty ?? 0))} KG</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Avg Price / KG</span><span className="font-semibold">₹ {fmtNum(Number(overallSummary?.avg_price_per_kg ?? 0))}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Avg Price / LTR</span><span className="font-semibold">₹ {fmtNum(Number(overallSummary?.avg_price_per_ltr ?? 0))}</span></div>
          </CardContent>
        </Card>
        <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-5">
          <SummaryCard icon={Hash} label="Total Count" value={overallSummary?.total_count ?? 0} loading={!overallSummary} />
          <SummaryCard icon={IndianRupee} label="Total Value" value={`₹ ${fmtNum(Number(overallSummary?.total_value ?? 0))}`} loading={!overallSummary} />
          <SummaryCard icon={Scale} label="Total Quantity" value={`${fmtNum(Number(overallSummary?.total_qty ?? 0))} KG`} loading={!overallSummary} />
          <SummaryCard icon={Weight} label="Avg Price / KG" value={`₹ ${fmtNum(Number(overallSummary?.avg_price_per_kg ?? 0))}`} loading={!overallSummary} />
          <SummaryCard icon={Droplets} label="Avg Price / LTR" value={`₹ ${fmtNum(Number(overallSummary?.avg_price_per_ltr ?? 0))}`} loading={!overallSummary} />
        </div>
      </div>

      {/* Presets */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={!fStatus && !fVendor && !fItem ? "default" : "outline"}
          size="sm"
          className="rounded-full"
          onClick={clearFilters}
        >
          All
        </Button>
        <Button
          variant={fStatus === "MUNDRA_PORT" ? "default" : "outline"}
          size="sm"
          className="rounded-full gap-1.5"
          onClick={() => {
            setFStatus("MUNDRA_PORT");
            setFItem("");
            setFVendor("");
            fetchList({ status: "MUNDRA_PORT" });
          }}
        >
          <Anchor className="h-3.5 w-3.5" />
          At Port
        </Button>
        <Button
          variant={fStatus === "ON_THE_SEA" ? "default" : "outline"}
          size="sm"
          className="rounded-full gap-1.5"
          onClick={() => {
            setFStatus("ON_THE_SEA");
            setFItem("");
            setFVendor("");
            fetchList({ status: "ON_THE_SEA" });
          }}
        >
          <Ship className="h-3.5 w-3.5" />
          On Sea
        </Button>
        <Button
          variant={fStatus === "ON_THE_WAY" ? "default" : "outline"}
          size="sm"
          className="rounded-full gap-1.5"
          onClick={() => {
            setFStatus("ON_THE_WAY");
            setFItem("");
            setFVendor("");
            fetchList({ status: "ON_THE_WAY" });
          }}
        >
          <Truck className="h-3.5 w-3.5" />
          In Transit
        </Button>
      </div>

      {/* Filters */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Detailed Filters
        </h2>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-end gap-4 flex-wrap">
            <div className="space-y-1.5 min-w-[180px] flex-1">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Filter className="h-3 w-3" /> Status
              </Label>
              <Select value={fStatus || "__all__"} onValueChange={(v) => setFStatus(v === "__all__" ? "" : v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Statuses</SelectItem>
                  {uniqueStatuses.map((s) => (
                    <SelectItem key={s} value={s}>
                      {formatStatus(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 min-w-[180px] flex-1">
              <Label className="text-xs text-muted-foreground">Vendor</Label>
              <Select value={fVendor || "__all__"} onValueChange={(v) => setFVendor(v === "__all__" ? "" : v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Vendors</SelectItem>
                  {uniqueVendors.map((vc) => {
                    const v = vendors.find((x) => x.card_code === vc);
                    return (
                      <SelectItem key={vc} value={vc}>
                        {vc}{v ? ` - ${v.card_name}` : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 min-w-[180px] flex-1">
              <Label className="text-xs text-muted-foreground">Item</Label>
              <Select value={fItem || "__all__"} onValueChange={(v) => setFItem(v === "__all__" ? "" : v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Items</SelectItem>
                  {uniqueItems.map((ic) => {
                    const item = tankItems.find((x) => x.tank_item_code === ic);
                    return (
                      <SelectItem key={ic} value={ic}>
                        {ic}{item ? ` - ${item.tank_item_name}` : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button onClick={applyFilters} className="gap-1.5">
                <Filter className="h-4 w-4" />
                Apply
              </Button>
              {hasFilters && (
                <Button variant="outline" onClick={clearFilters} className="gap-1.5">
                  <X className="h-4 w-4" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      </div>

      {/* Filtered Summary */}
      <div>
        <h2 className="text-base font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          Filtered Summary
        </h2>
        <Card className="md:hidden">
          <CardContent className="p-3 space-y-2 text-sm">
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Total Count</span><span className="font-semibold">{summary?.total_count ?? 0}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Total Value</span><span className="font-semibold">₹ {fmtNum(Number(summary?.total_value ?? 0))}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Total Quantity</span><span className="font-semibold">{fmtNum(Number(summary?.total_qty ?? 0))} KG</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Avg Price / KG</span><span className="font-semibold">₹ {fmtNum(Number(summary?.avg_price_per_kg ?? 0))}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Avg Price / LTR</span><span className="font-semibold">₹ {fmtNum(Number(summary?.avg_price_per_ltr ?? 0))}</span></div>
          </CardContent>
        </Card>
        <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-5">
          <SummaryCard icon={Hash} label="Total Count" value={summary?.total_count ?? 0} loading={loading} />
          <SummaryCard icon={IndianRupee} label="Total Value" value={`₹ ${fmtNum(Number(summary?.total_value ?? 0))}`} loading={loading} />
          <SummaryCard icon={Scale} label="Total Quantity" value={`${fmtNum(Number(summary?.total_qty ?? 0))} KG`} loading={loading} />
          <SummaryCard icon={Weight} label="Avg Price / KG" value={`₹ ${fmtNum(Number(summary?.avg_price_per_kg ?? 0))}`} loading={loading} />
          <SummaryCard icon={Droplets} label="Avg Price / LTR" value={`₹ ${fmtNum(Number(summary?.avg_price_per_ltr ?? 0))}`} loading={loading} />
        </div>
      </div>

      {/* Table Card */}
      <Card className="card-hover shimmer-hover">
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle>Stock Statuses</CardTitle>
              <CardDescription>
                {filteredRows.length}{search ? ` of ${rows.length}` : ""} record{rows.length !== 1 ? "s" : ""}
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search any value..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <>
            <div className="md:hidden space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl border p-4 space-y-3">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ))}
            </div>
            <div className="hidden md:block rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {canBulk && <TableHead className="w-10"></TableHead>}
                    <TableHead className="w-12 hidden sm:table-cell">S.No</TableHead>
                    <TableHead>RM Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Party Name</TableHead>
                    <TableHead className="hidden md:table-cell">Vehicle No</TableHead>
                    <TableHead className="hidden md:table-cell">Rate (&#8377;)</TableHead>
                    <TableHead className="hidden md:table-cell">Qty (KG)</TableHead>
                    <TableHead className="hidden lg:table-cell">ETA / Arrival</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: canBulk ? 10 : 9 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-16" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            </>
          ) : (
            <>
            <div className="md:hidden space-y-3">
              {paginated.length === 0 ? (
                <div className="rounded-xl border py-12 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <ClipboardList className="h-10 w-10 stroke-1" />
                    <p className="text-sm font-medium">No stock statuses found</p>
                    <p className="text-xs">Add a stock status to get started.</p>
                  </div>
                </div>
              ) : (
                paginated.map((row, idx) => {
                  const etaText = row.arrival_date
                    ? fmtDateTime(row.arrival_date).split(",")[0]
                    : row.eta
                    ? fmtDateTime(row.eta).split(",")[0]
                    : "-";
                  return (
                    <div key={row.id} className={cn("rounded-xl border p-3 space-y-2", selectedIds.has(row.id) && "bg-primary/5")}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">#{(page - 1) * perPage + idx + 1}</p>
                          <p className="font-semibold truncate">{itemNameMap.get(row.item_code) ?? row.item_code}</p>
                        </div>
                        <Badge variant="outline" className={cn("capitalize font-semibold shadow-none text-xs px-2.5 py-1", statusColorClass(row.status))}>
                          {formatStatus(row.status).toLowerCase()}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                        <p className="text-muted-foreground">Party</p><p className="truncate">{vendorNameMap.get(row.vendor_code) ?? row.vendor_code}</p>
                        <p className="text-muted-foreground">Vehicle</p><p>{row.vehicle_number || "-"}</p>
                        <p className="text-muted-foreground">Rate</p><p>₹{Number(row.rate).toLocaleString("en-IN")}</p>
                        <p className="text-muted-foreground">Qty</p><p>{Number(row.quantity).toLocaleString("en-IN")} KG</p>
                        <p className="text-muted-foreground">ETA/Arrival</p><p>{etaText}</p>
                      </div>
                      {canBulk && (
                        <div className="flex items-center gap-2 pt-1">
                          <Checkbox checked={selectedIds.has(row.id)} onCheckedChange={() => toggleSelect(row.id)} />
                          <span className="text-xs text-muted-foreground">Select</span>
                        </div>
                      )}
                      <div className="flex items-center justify-end gap-1 pt-1">
                        {row.location && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:text-blue-600" asChild>
                            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(row.location)}`} target="_blank" rel="noopener noreferrer">
                              <MapPin className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openView(row.id)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canEdit && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(row)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="hidden md:block rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    {canBulk && <TableHead className="w-10 px-4">
                      <Checkbox
                        checked={selectedIds.size === paginated.length && paginated.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>}
                    <TableHead className="w-12 hidden sm:table-cell">S.No</TableHead>
                    <TableHead>RM Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Party Name</TableHead>
                    <TableHead className="hidden md:table-cell">Vehicle No</TableHead>
                    <TableHead className="hidden md:table-cell">Rate (&#8377;)</TableHead>
                    <TableHead className="hidden md:table-cell">Qty (KG)</TableHead>
                    <TableHead className="hidden lg:table-cell">ETA / Arrival</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={canBulk ? 10 : 9} className="py-16 text-center">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <ClipboardList className="h-10 w-10 stroke-1" />
                          <p className="text-sm font-medium">No stock statuses found</p>
                          <p className="text-xs">Add a stock status to get started.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginated.map((row, idx) => {
                      const countdown = getEtaCountdown(row.eta ?? "");
                      const weightPercent = maxQty > 0 ? (Number(row.quantity) / maxQty) * 100 : 0;

                      return (
                        <TableRow key={row.id} className={cn(selectedIds.has(row.id) && "bg-primary/5")}>
                          {canBulk && <TableCell className="px-4">
                            <Checkbox
                              checked={selectedIds.has(row.id)}
                              onCheckedChange={() => toggleSelect(row.id)}
                            />
                          </TableCell>}
                          <TableCell className="text-muted-foreground hidden sm:table-cell">
                            {(page - 1) * perPage + idx + 1}
                          </TableCell>
                          <TableCell className="min-w-[220px]">
                            <div className="font-medium">{itemNameMap.get(row.item_code) ?? row.item_code}</div>
                            <div className="mt-1 space-y-0.5 text-[11px] text-muted-foreground md:hidden">
                              <div>Party: {vendorNameMap.get(row.vendor_code) ?? row.vendor_code}</div>
                              <div>Vehicle: {row.vehicle_number || "-"}</div>
                              <div>Rate: ₹{Number(row.rate).toLocaleString("en-IN")}</div>
                              <div>Qty: {Number(row.quantity).toLocaleString("en-IN")} KG</div>
                              <div>
                                ETA/Arrival: {row.arrival_date ? fmtDateTime(row.arrival_date).split(",")[0] : row.eta ? fmtDateTime(row.eta).split(",")[0] : "-"}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn("capitalize font-semibold shadow-none text-xs px-2.5 py-1", statusColorClass(row.status))}>
                              {formatStatus(row.status).toLowerCase()}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell font-medium">
                            {vendorNameMap.get(row.vendor_code) ?? row.vendor_code}
                          </TableCell>
                          <TableCell className="hidden md:table-cell font-medium">
                            {row.vehicle_number || "—"}
                          </TableCell>
                          <TableCell className="hidden md:table-cell tabular-nums">
                            ₹{Number(row.rate).toLocaleString("en-IN")}
                          </TableCell>
                          <TableCell className="hidden md:table-cell relative">
                            <div
                              className="absolute left-0 top-0 h-full bg-primary/10 transition-all duration-1000"
                              style={{ width: `${weightPercent}%` }}
                            />
                            <span className="relative z-10 font-bold">{Number(row.quantity).toLocaleString("en-IN")}</span>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {row.arrival_date ? (
                              <div className="flex flex-col gap-0.5">
                                <span className="text-xs font-medium">{fmtDateTime(row.arrival_date).split(",")[0]}</span>
                                <div className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full w-fit bg-green-100 text-green-700">
                                  <Clock className="h-3 w-3" />
                                  Arrived
                                </div>
                              </div>
                            ) : countdown ? (
                              <div className="flex flex-col gap-0.5">
                                <span className="text-xs font-medium">{fmtDateTime(row.eta ?? "").split(",")[0]}</span>
                                <div className={cn(
                                  "flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full w-fit",
                                  countdown.variant === "warning" ? "bg-amber-100 text-amber-700" :
                                  countdown.variant === "info" ? "bg-blue-100 text-blue-700" :
                                  countdown.variant === "muted" ? "bg-muted text-muted-foreground" :
                                  "bg-primary/10 text-primary"
                                )}>
                                  <Clock className="h-3 w-3" />
                                  {countdown.text}
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right hidden sm:table-cell">
                            <div className="flex justify-end gap-1">
                              {row.location && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-blue-500 hover:text-blue-600"
                                  asChild
                                >
                                  <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(row.location)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <MapPin className="h-4 w-4" />
                                  </a>
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openView(row.id)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {canEdit && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => openEdit(row)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            </>
          )}

          {/* Pagination */}
          {!loading && (
            <Pagination page={page} totalPages={totalPages} totalItems={filteredRows.length} perPage={perPage} onPageChange={setPage} />
          )}
        </CardContent>
      </Card>

      {/* ── Dialogs & Sheets ─────────────────────────────────── */}

      <CreateStockDialog
        open={createOpen && canAdd}
        onOpenChange={setCreateOpen}
        tankItems={tankItems}
        vendors={vendors}
        email={email ?? ""}
        onCreated={refreshAll}
      />

      <ViewStockSheet
        data={viewData}
        loading={viewLoading}
        tankItems={tankItems}
        vendors={vendors}
        onClose={() => setViewData(null)}
        onEdit={(row) => { if (canEdit) { setViewData(null); openEdit(row); } }}
        onDelete={(row) => { if (canDelete) { setViewData(null); setDeleteData(row); } }}
      />

      <EditStockDialog
        data={editData}
        tankItems={tankItems}
        vendors={vendors}
        email={email ?? "SYSTEM"}
        onClose={() => setEditData(null)}
        onSaved={refreshAll}
        onDelete={(row) => { if (canDelete) { setEditData(null); setDeleteData(row); } }}
      />

      <DeleteStockDialog
        data={deleteData}
        onClose={() => setDeleteData(null)}
        onDeleted={refreshAll}
      />
    </div>
    </Guard>
  );
}
