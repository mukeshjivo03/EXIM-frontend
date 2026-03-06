import { useEffect, useState } from "react";
import { AxiosError } from "axios";
import { toast } from "sonner";
import {
  Plus,
  ClipboardList,
  Eye,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Package,
  Truck,
  IndianRupee,
  FileText,
  Filter,
  X,
  Hash,
  Scale,
  Weight,
  Droplets,
} from "lucide-react";

import {
  getStockStatuses,
  getStockStatus,
  getStockSummary,
  getStockInsights,
  createStockStatus,
  updateStockStatus,
  softDeleteStockStatus,
  STATUS_CHOICES,
  type StockStatus,
  type StockStatusChoice,
  type StockStatusFilters,
  type StockInsightsSummary,
} from "@/api/stockStatus";
import { getRmItems, type SapItem } from "@/api/sapSync";
import { getVendors, type Vendor } from "@/api/sapSync";
import { useAuth } from "@/context/AuthContext";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/* ── helpers ──────────────────────────────────────────────── */

function formatStatus(s: string) {
  return s.replace(/_/g, " ");
}

function statusBadgeVariant(s: string): "default" | "secondary" | "destructive" | "outline" {
  switch (s) {
    case "COMPLETED":
    case "DELIVERED":
      return "default";
    case "PENDING":
    case "PROCESSING":
    case "IN_CONTRACT":
      return "secondary";
    case "OUT_SIDE_FACTORY":
      return "destructive";
    default:
      return "outline";
  }
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ── component ────────────────────────────────────────────── */

export default function StockStatusPage() {
  const { email } = useAuth();

  const [rows, setRows] = useState<StockStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // dropdown data
  const [rmItems, setRmItems] = useState<SapItem[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  // insights summary
  const [overallSummary, setOverallSummary] = useState<StockInsightsSummary | null>(null);
  const [summary, setSummary] = useState<StockInsightsSummary | null>(null);

  // filters
  const [fStatus, setFStatus] = useState("");
  const [fVendor, setFVendor] = useState("");
  const [fItem, setFItem] = useState("");
  const hasFilters = !!(fStatus || fVendor || fItem);

  // create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [cItemCode, setCItemCode] = useState("");
  const [cStatus, setCStatus] = useState<StockStatusChoice>("PENDING");
  const [cVendorCode, setCVendorCode] = useState("");
  const [cRate, setCRate] = useState("");
  const [cQuantity, setCQuantity] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // view dialog
  const [viewData, setViewData] = useState<StockStatus | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  // edit dialog
  const [editData, setEditData] = useState<StockStatus | null>(null);
  const [eItemCode, setEItemCode] = useState("");
  const [eStatus, setEStatus] = useState<StockStatusChoice>("PENDING");
  const [eVendorCode, setEVendorCode] = useState("");
  const [eRate, setERate] = useState("");
  const [eQuantity, setEQuantity] = useState("");
  const [editing, setEditing] = useState(false);

  // delete
  const [deleteData, setDeleteData] = useState<StockStatus | null>(null);
  const [deleting, setDeleting] = useState(false);

  // pagination
  const [page, setPage] = useState(1);
  const perPage = 20;
  const totalPages = Math.max(1, Math.ceil(rows.length / perPage));
  const paginated = rows.slice((page - 1) * perPage, page * perPage);

  /* ── fetch list ──────────────────────────────────────────── */

  async function fetchList(filters?: StockStatusFilters) {
    setLoading(true);
    setError("");
    try {
      const [data, insights] = await Promise.all([
        getStockStatuses(filters),
        getStockInsights(filters),
      ]);
      setRows(data.filter((r) => !r.deleted).sort((a, b) => b.id - a.id));
      setSummary(insights.summary);
    } catch (err) {
      if (err instanceof AxiosError) {
        setError(err.response?.data?.detail ?? err.message);
      } else {
        setError("Failed to load stock statuses");
      }
    } finally {
      setLoading(false);
    }
  }

  async function fetchOverallSummary() {
    try {
      const data = await getStockSummary();
      setOverallSummary(data.summary);
    } catch {
      // non-critical, keep whatever was loaded before
    }
  }

  useEffect(() => {
    fetchList();
    fetchOverallSummary();
    loadDropdowns();
  }, []);

  /* ── load dropdowns ────────────────────────────────────── */

  async function loadDropdowns() {
    try {
      const [rmRes, vendorRes] = await Promise.all([getRmItems(), getVendors()]);
      setRmItems((rmRes.items ?? []).sort((a, b) => a.item_code.localeCompare(b.item_code)));
      setVendors((vendorRes.parties ?? []).sort((a, b) => a.card_code.localeCompare(b.card_code)));
    } catch {
      // keep whatever was loaded before
    }
  }

  /* ── create ──────────────────────────────────────────────── */

  async function openCreate() {
    setCItemCode("");
    setCStatus("PENDING");
    setCVendorCode("");
    setCRate("");
    setCQuantity("");
    await loadDropdowns();
    setCreateOpen(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!cItemCode || !cVendorCode || !cRate.trim() || !cQuantity.trim()) {
      toast.error("All fields are required.");
      return;
    }
    const total = Number(cRate.trim()) * Number(cQuantity.trim());
    if (total >= 1e10) {
      toast.error("Total value (rate × quantity) is too large. Maximum allowed is 9,999,999,999.99.");
      return;
    }
    setSubmitting(true);
    try {
      await createStockStatus({
        item_code: cItemCode,
        status: cStatus,
        vendor_code: cVendorCode,
        rate: cRate.trim(),
        quantity: cQuantity.trim(),
        created_by: email ?? "",
      });
      toast.success("Stock status created.");
      setCreateOpen(false);
      await fetchList(currentFilters());
    } catch (err) {
      if (err instanceof AxiosError && err.response?.data) {
        const data = err.response.data;
        if (typeof data === "string") {
          toast.error(data);
        } else if (data.detail) {
          toast.error(data.detail);
        } else {
          const messages = Object.entries(data)
            .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(", ") : val}`)
            .join("; ");
          toast.error(messages || "Failed to create stock status.");
        }
      } else {
        toast.error("Failed to create stock status.");
      }
    } finally {
      setSubmitting(false);
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
    setEditData(row);
    setEItemCode(row.item_code);
    setEStatus(row.status);
    setEVendorCode(row.vendor_code);
    setERate(row.rate);
    setEQuantity(row.quantity);
    await loadDropdowns();
  }

  async function handleEdit() {
    if (!editData) return;
    if (!eQuantity.trim()) {
      toast.error("Quantity is required.");
      return;
    }

    const oldQty = Number(editData.quantity);
    const newQty = Number(eQuantity.trim());
    const statusChanged = eStatus !== editData.status;
    const qtyChanged = newQty !== oldQty;

    // Cannot change quantity without changing status
    if (qtyChanged && !statusChanged) {
      toast.error("You must select a new status when changing the quantity.");
      return;
    }

    // New quantity cannot exceed existing quantity
    if (newQty > oldQty) {
      toast.error("New quantity cannot be greater than the existing quantity.");
      return;
    }

    if (newQty <= 0) {
      toast.error("Quantity must be greater than 0.");
      return;
    }

    setEditing(true);
    try {
      if (statusChanged && qtyChanged && newQty < oldQty) {
        // Split: update existing with new qty + new status,
        // create a new record for remaining qty with old status
        const remainingQty = (oldQty - newQty).toFixed(2);
        await Promise.all([
          updateStockStatus(editData.id, {
            item_code: editData.item_code,
            status: eStatus,
            vendor_code: editData.vendor_code,
            rate: editData.rate,
            quantity: eQuantity.trim(),
            created_by: editData.created_by,
          }),
          createStockStatus({
            item_code: editData.item_code,
            status: editData.status,
            vendor_code: editData.vendor_code,
            rate: editData.rate,
            quantity: remainingQty,
            created_by: editData.created_by,
          }),
        ]);
        toast.success(
          `Stock split: ${eQuantity.trim()} KG moved to ${formatStatus(eStatus)}, ${remainingQty} KG remains as ${formatStatus(editData.status)}.`
        );
      } else {
        // Status change only (or no change) — update normally
        await updateStockStatus(editData.id, {
          item_code: editData.item_code,
          status: eStatus,
          vendor_code: editData.vendor_code,
          rate: editData.rate,
          quantity: eQuantity.trim(),
          created_by: editData.created_by,
        });
        toast.success("Stock status updated.");
      }
      setEditData(null);
      await fetchList(currentFilters());
    } catch (err) {
      if (err instanceof AxiosError && err.response?.data) {
        const data = err.response.data;
        if (typeof data === "string") {
          toast.error(data);
        } else if (data.detail) {
          toast.error(data.detail);
        } else {
          const messages = Object.entries(data)
            .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(", ") : val}`)
            .join("; ");
          toast.error(messages || "Failed to update stock status.");
        }
      } else {
        toast.error("Failed to update stock status.");
      }
    } finally {
      setEditing(false);
    }
  }

  /* ── delete (soft) ─────────────────────────────────────── */

  async function handleDelete() {
    if (!deleteData) return;
    setDeleting(true);
    try {
      await softDeleteStockStatus(deleteData);
      toast.success("Stock status deleted.");
      setDeleteData(null);
      await fetchList(currentFilters());
    } catch {
      toast.error("Failed to delete stock status.");
    } finally {
      setDeleting(false);
    }
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
    <div className="p-6 space-y-6 animate-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Stock Status</h1>
          <p className="text-sm text-muted-foreground">
            Track and manage stock statuses
          </p>
        </div>
        <Button onClick={openCreate} className="btn-press gap-2">
          <Plus className="h-4 w-4" />
          Add Stock Status
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Stock Status Summary */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Stock Status Summary
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-orange-50 dark:bg-orange-900/50 p-2">
                  <Hash className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Count</p>
                  {!overallSummary ? (
                    <Skeleton className="h-6 w-24 mt-1" />
                  ) : (
                    <p className="text-xl font-bold">{overallSummary.total_count}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-orange-50 dark:bg-orange-900/50 p-2">
                  <IndianRupee className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Value</p>
                  {!overallSummary ? (
                    <Skeleton className="h-6 w-24 mt-1" />
                  ) : (
                    <p className="text-xl font-bold">
                      &#8377; {(overallSummary.total_value ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-orange-50 dark:bg-orange-900/50 p-2">
                  <Scale className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Quantity</p>
                  {!overallSummary ? (
                    <Skeleton className="h-6 w-24 mt-1" />
                  ) : (
                    <p className="text-xl font-bold">
                      {(overallSummary.total_qty ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KG
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-orange-50 dark:bg-orange-900/50 p-2">
                  <Weight className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Avg Price / KG</p>
                  {!overallSummary ? (
                    <Skeleton className="h-6 w-24 mt-1" />
                  ) : (
                    <p className="text-xl font-bold">
                      &#8377; {(overallSummary.avg_price_per_kg ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-orange-50 dark:bg-orange-900/50 p-2">
                  <Droplets className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Avg Price / LTR</p>
                  {!overallSummary ? (
                    <Skeleton className="h-6 w-24 mt-1" />
                  ) : (
                    <p className="text-xl font-bold">
                      &#8377; {(overallSummary.avg_price_per_ltr ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

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
                <Filter className="h-3 w-3" /> Status
              </Label>
              <Select value={fStatus || "__all__"} onValueChange={(v) => setFStatus(v === "__all__" ? "" : v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Statuses</SelectItem>
                  {STATUS_CHOICES.map((s) => (
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
                  {vendors.map((v) => (
                    <SelectItem key={v.card_code} value={v.card_code}>
                      {v.card_code} - {v.card_name}
                    </SelectItem>
                  ))}
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
                  {rmItems.map((item) => (
                    <SelectItem key={item.item_code} value={item.item_code}>
                      {item.item_code} - {item.item_name}
                    </SelectItem>
                  ))}
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
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Filtered Summary
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-md bg-orange-50 dark:bg-orange-900/50 p-2">
                <Hash className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Count</p>
                {loading ? (
                  <Skeleton className="h-6 w-24 mt-1" />
                ) : (
                  <p className="text-xl font-bold">{summary?.total_count ?? 0}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-md bg-orange-50 dark:bg-orange-900/50 p-2">
                <IndianRupee className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Value</p>
                {loading ? (
                  <Skeleton className="h-6 w-24 mt-1" />
                ) : (
                  <p className="text-xl font-bold">
                    &#8377; {(summary?.total_value ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-md bg-orange-50 dark:bg-orange-900/50 p-2">
                <Scale className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Quantity</p>
                {loading ? (
                  <Skeleton className="h-6 w-24 mt-1" />
                ) : (
                  <p className="text-xl font-bold">
                    {(summary?.total_qty ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KG
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-md bg-orange-50 dark:bg-orange-900/50 p-2">
                <Weight className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Avg Price / KG</p>
                {loading ? (
                  <Skeleton className="h-6 w-24 mt-1" />
                ) : (
                  <p className="text-xl font-bold">
                    &#8377; {(summary?.avg_price_per_kg ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-md bg-orange-50 dark:bg-orange-900/50 p-2">
                <Droplets className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Avg Price / LTR</p>
                {loading ? (
                  <Skeleton className="h-6 w-24 mt-1" />
                ) : (
                  <p className="text-xl font-bold">
                    &#8377; {(summary?.avg_price_per_ltr ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>

      {/* Table Card */}
      <Card className="card-hover shimmer-hover">
        <CardHeader>
          <CardTitle>Stock Statuses</CardTitle>
          <CardDescription>{rows.length} records</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Rate (&#8377;)</TableHead>
                    <TableHead>Qty (KG)</TableHead>
                    <TableHead>Total (&#8377;)</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 9 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-16" />
                        </TableCell>
                      ))}
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
                    <TableHead>Item</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Rate (&#8377;)</TableHead>
                    <TableHead>Qty (KG)</TableHead>
                    <TableHead>Total (&#8377;)</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="py-16">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <ClipboardList className="h-10 w-10 stroke-1" />
                          <p className="text-sm font-medium">No stock statuses found</p>
                          <p className="text-xs">Add a stock status to get started.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginated.map((row, idx) => (
                      <TableRow key={row.id}>
                        <TableCell className="text-muted-foreground">
                          {(page - 1) * perPage + idx + 1}
                        </TableCell>
                        <TableCell className="font-medium">{row.item_code}</TableCell>
                        <TableCell>
                          <Badge variant={statusBadgeVariant(row.status)}>
                            {formatStatus(row.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>{row.vendor_code}</TableCell>
                        <TableCell>{row.rate}</TableCell>
                        <TableCell>{row.quantity}</TableCell>
                        <TableCell className="font-medium">{row.total}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {fmtDate(row.created_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openView(row.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEdit(row)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteData(row)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {!loading && rows.length > perPage && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, rows.length)} of {rows.length}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {(() => {
                  const pages: (number | "...")[] = [];
                  const start = Math.max(2, page - 2);
                  const end = Math.min(totalPages - 1, page + 2);
                  pages.push(1);
                  if (start > 2) pages.push("...");
                  for (let i = start; i <= end; i++) pages.push(i);
                  if (end < totalPages - 1) pages.push("...");
                  if (totalPages > 1) pages.push(totalPages);
                  return pages.map((p, idx) =>
                    p === "..." ? (
                      <span key={`dots-${idx}`} className="px-1 text-sm text-muted-foreground">...</span>
                    ) : (
                      <Button
                        key={p}
                        variant={p === page ? "default" : "outline"}
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </Button>
                    )
                  );
                })()}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Create Dialog ────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Add Stock Status
            </DialogTitle>
            <DialogDescription>Create a new stock status entry.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Item Code *</Label>
              <Select value={cItemCode} onValueChange={setCItemCode}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select an item" />
                </SelectTrigger>
                <SelectContent>
                  {rmItems.map((item) => (
                    <SelectItem key={item.item_code} value={item.item_code}>
                      {item.item_code} - {item.item_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status *</Label>
              <Select value={cStatus} onValueChange={(v) => setCStatus(v as StockStatusChoice)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_CHOICES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {formatStatus(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Vendor *</Label>
              <Select value={cVendorCode} onValueChange={setCVendorCode}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((v) => (
                    <SelectItem key={v.card_code} value={v.card_code}>
                      {v.card_code} - {v.card_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="c-rate">Rate (&#8377;) *</Label>
                <Input
                  id="c-rate"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="e.g. 120"
                  value={cRate}
                  onChange={(e) => setCRate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-qty">Quantity (KG) *</Label>
                <Input
                  id="c-qty"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="e.g. 20"
                  value={cQuantity}
                  onChange={(e) => setCQuantity(e.target.value)}
                />
              </div>
            </div>
            {cRate && cQuantity && (
              <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
                <span className="text-muted-foreground">Total: </span>
                <span className="font-semibold">&#8377; {(Number(cRate) * Number(cQuantity)).toFixed(2)}</span>
              </div>
            )}
            <div className="space-y-2">
              <Label>Created By</Label>
              <Input value={email ?? ""} disabled className="disabled:opacity-70" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || !cItemCode || !cVendorCode || !cRate.trim() || !cQuantity.trim()}
              >
                {submitting ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── View Dialog ──────────────────────────────────────── */}
      <Dialog open={viewLoading || !!viewData} onOpenChange={() => setViewData(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Stock Status Details
            </DialogTitle>
            <DialogDescription>
              {viewData ? `Record #${viewData.id}` : "Loading..."}
            </DialogDescription>
          </DialogHeader>

          {viewLoading ? (
            <div className="space-y-4 py-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : viewData ? (
            <div className="space-y-5 py-2">
              {/* Item Information */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Package className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">
                    Item Information
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-3 pl-6">
                  <div>
                    <p className="text-xs text-muted-foreground">Item Code</p>
                    <p className="text-sm font-medium">{viewData.item_code}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Item Name</p>
                    <p className="text-sm font-medium">
                      {rmItems.find((i) => i.item_code === viewData.item_code)?.item_name ?? "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge variant={statusBadgeVariant(viewData.status)} className="mt-0.5">
                      {formatStatus(viewData.status)}
                    </Badge>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Vendor Information */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Truck className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">
                    Vendor Information
                  </h3>
                </div>
                {(() => {
                  const v = vendors.find((v) => v.card_code === viewData.vendor_code);
                  return (
                    <div className="grid grid-cols-2 gap-3 pl-6">
                      <div>
                        <p className="text-xs text-muted-foreground">Vendor Code</p>
                        <p className="text-sm font-medium">{viewData.vendor_code}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Vendor Name</p>
                        <p className="text-sm font-medium">{v?.card_name ?? "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Vendor Group</p>
                        <p className="text-sm font-medium">{v?.u_main_group ?? "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Vendor Address</p>
                        <p className="text-sm font-medium">
                          {v ? [v.state, v.country].filter(Boolean).join(", ") || "—" : "—"}
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <Separator />

              {/* Pricing Detail */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <IndianRupee className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">
                    Pricing Detail
                  </h3>
                </div>
                <div className="grid grid-cols-3 gap-3 pl-6">
                  <div>
                    <p className="text-xs text-muted-foreground">Rate (&#8377;)</p>
                    <p className="text-sm font-medium">{viewData.rate}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Quantity (KG)</p>
                    <p className="text-sm font-medium">{viewData.quantity}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total (&#8377;)</p>
                    <p className="text-sm font-semibold">{viewData.total}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Record Information */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">
                    Record Information
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-3 pl-6">
                  <div>
                    <p className="text-xs text-muted-foreground">Created By</p>
                    <p className="text-sm font-medium">{viewData.created_by}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Created At</p>
                    <p className="text-sm font-medium">{fmtDate(viewData.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Record ID</p>
                    <p className="text-sm font-medium">{viewData.id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Deleted</p>
                    <p className="text-sm font-medium">{viewData.deleted ? "Yes" : "No"}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter className="flex-row justify-between sm:justify-between">
            <Button
              variant="destructive"
              className="gap-1.5"
              onClick={() => {
                if (viewData) {
                  setDeleteData(viewData);
                  setViewData(null);
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
            <Button variant="outline" onClick={() => setViewData(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ──────────────────────────────────────── */}
      <Dialog open={!!editData} onOpenChange={() => setEditData(null)}>
        <DialogContent className="sm:max-w-lg overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Edit Stock Status
            </DialogTitle>
            <DialogDescription>
              Update record <strong>#{editData?.id}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Item Code</p>
                <p className="text-sm font-medium">{editData?.item_code ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Item Name</p>
                <p className="text-sm font-medium">{rmItems.find((i) => i.item_code === editData?.item_code)?.item_name ?? "—"}</p>
              </div>
            </div>
            {(() => {
              const v = vendors.find((v) => v.card_code === editData?.vendor_code);
              return (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Vendor Code</p>
                    <p className="text-sm font-medium">{editData?.vendor_code ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Vendor Name</p>
                    <p className="text-sm font-medium">{v?.card_name ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Vendor Group</p>
                    <p className="text-sm font-medium">{v?.u_main_group ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Vendor State</p>
                    <p className="text-sm font-medium">{v?.state ?? "—"}</p>
                  </div>
                </div>
              );
            })()}
            <div className="space-y-2">
              <Label>Status *</Label>
              <Select value={eStatus} onValueChange={(v) => setEStatus(v as StockStatusChoice)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_CHOICES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {formatStatus(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Rate (&#8377;)</p>
                <p className="text-sm font-medium">{editData?.rate ?? "—"}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="e-qty">Quantity (KG) *</Label>
                <Input
                  id="e-qty"
                  type="number"
                  min={0}
                  step="0.01"
                  value={eQuantity}
                  onChange={(e) => setEQuantity(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="flex-row justify-between sm:justify-between">
            <Button
              variant="destructive"
              className="gap-1.5"
              onClick={() => {
                if (editData) {
                  setDeleteData(editData);
                  setEditData(null);
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditData(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleEdit}
                disabled={editing || !eQuantity.trim()}
              >
                {editing ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ─────────────────────── */}
      <Dialog open={!!deleteData} onOpenChange={() => setDeleteData(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Delete Stock Status
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete record <strong>#{deleteData?.id}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteData(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
