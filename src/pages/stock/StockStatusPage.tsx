import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  ClipboardList,
  Eye,
  Pencil,
  Trash2,
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
import { getVendors, type Vendor } from "@/api/sapSync";
import { getTankItems, type TankItem } from "@/api/tank";
import { useAuth } from "@/context/AuthContext";
import { fmtDateTime, fmtDecimal } from "@/lib/formatters";
import { getErrorMessage, toastApiError } from "@/lib/errors";
import { SummaryCard } from "@/components/SummaryCard";
import { Pagination } from "@/components/Pagination";

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

/* ── component ────────────────────────────────────────────── */

export default function StockStatusPage() {
  const { email } = useAuth();

  const [rows, setRows] = useState<StockStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  // create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [cItemCode, setCItemCode] = useState("");
  const [cStatus, setCStatus] = useState<StockStatusChoice>("PENDING");
  const [cVendorCode, setCVendorCode] = useState("");
  const [cRate, setCRate] = useState("");
  const [cQuantity, setCQuantity] = useState("");
  const [cVehicleNumber, setCVehicleNumber] = useState("");
  const [cLocation, setCLocation] = useState("");
  const [cEta, setCEta] = useState("");
  const [cTransporterName, setCTransporterName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // view dialog
  const [viewData, setViewData] = useState<StockStatus | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  // edit dialog
  const [editData, setEditData] = useState<StockStatus | null>(null);
  const [eStatus, setEStatus] = useState<StockStatusChoice>("PENDING");
  const [eQuantity, setEQuantity] = useState("");
  const [eVehicleNumber, setEVehicleNumber] = useState("");
  const [eLocation, setELocation] = useState("");
  const [eEta, setEEta] = useState("");
  const [eTransporterName, setETransporterName] = useState("");
  const [editing, setEditing] = useState(false);

  // delete
  const [deleteData, setDeleteData] = useState<StockStatus | null>(null);
  const [deleting, setDeleting] = useState(false);

  // all rows (unfiltered) for deriving filter options
  const [allRows, setAllRows] = useState<StockStatus[]>([]);

  // unique filter options derived from actual data
  const uniqueStatuses = useMemo(
    () => [...new Set(allRows.map((r) => r.status))].sort(),
    [allRows]
  );
  const uniqueVendors = useMemo(
    () => [...new Set(allRows.map((r) => r.vendor_code))].sort(),
    [allRows]
  );
  const uniqueItems = useMemo(
    () => [...new Set(allRows.map((r) => r.item_code))].sort(),
    [allRows]
  );

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
      setError(getErrorMessage(err, "Failed to load stock statuses"));
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

  async function fetchAllRows() {
    try {
      const data = await getStockStatuses();
      setAllRows(data.filter((r) => !r.deleted));
    } catch {
      // non-critical
    }
  }

  useEffect(() => {
    fetchList();
    fetchOverallSummary();
    fetchAllRows();
    loadDropdowns();
  }, []);

  /* ── load dropdowns ────────────────────────────────────── */

  async function loadDropdowns() {
    try {
      const [tankRes, vendorRes] = await Promise.all([getTankItems(), getVendors()]);
      setTankItems((tankRes ?? []).sort((a, b) => a.tank_item_code.localeCompare(b.tank_item_code)));
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
    setCVehicleNumber("");
    setCLocation("");
    setCEta("");
    setCTransporterName("");
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
        vehicle_number: cVehicleNumber.trim() || undefined,
        location: cLocation.trim() || undefined,
        eta: cEta.trim() || undefined,
        transporter_name: cTransporterName.trim() || undefined,
      });
      toast.success("Stock status created.");
      setCreateOpen(false);
      await Promise.all([fetchList(currentFilters()), fetchOverallSummary(), fetchAllRows()]);
    } catch (err) {
      toastApiError(err, "Failed to create stock status.");
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
    setEStatus(row.status);
    setEQuantity(row.quantity);
    setEVehicleNumber(row.vehicle_number ?? "");
    setELocation(row.location ?? "");
    setEEta(row.eta ?? "");
    setETransporterName(row.transporter_name ?? "");
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
            vehicle_number: eVehicleNumber.trim() || undefined,
            location: eLocation.trim() || undefined,
            eta: eEta.trim() || undefined,
            transporter_name: eTransporterName.trim() || undefined,
          }),
          createStockStatus({
            item_code: editData.item_code,
            status: editData.status,
            vendor_code: editData.vendor_code,
            rate: editData.rate,
            quantity: remainingQty,
            created_by: editData.created_by,
            vehicle_number: editData.vehicle_number || undefined,
            location: editData.location || undefined,
            eta: editData.eta || undefined,
            transporter_name: editData.transporter_name || undefined,
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
          vehicle_number: eVehicleNumber.trim() || undefined,
          location: eLocation.trim() || undefined,
          eta: eEta.trim() || undefined,
          transporter_name: eTransporterName.trim() || undefined,
        });
        toast.success("Stock status updated.");
      }
      setEditData(null);
      await Promise.all([fetchList(currentFilters()), fetchOverallSummary(), fetchAllRows()]);
    } catch (err) {
      toastApiError(err, "Failed to update stock status.");
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
      await Promise.all([fetchList(currentFilters()), fetchOverallSummary(), fetchAllRows()]);
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
        <h2 className="text-base font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          Stock Status Summary
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-5">
          <SummaryCard icon={Hash} label="Total Count" value={overallSummary?.total_count ?? 0} loading={!overallSummary} />
          <SummaryCard icon={IndianRupee} label="Total Value" value={`₹ ${fmtDecimal(overallSummary?.total_value ?? 0)}`} loading={!overallSummary} />
          <SummaryCard icon={Scale} label="Total Quantity" value={`${fmtDecimal(overallSummary?.total_qty ?? 0)} KG`} loading={!overallSummary} />
          <SummaryCard icon={Weight} label="Avg Price / KG" value={`₹ ${fmtDecimal(overallSummary?.avg_price_per_kg ?? 0)}`} loading={!overallSummary} />
          <SummaryCard icon={Droplets} label="Avg Price / LTR" value={`₹ ${fmtDecimal(overallSummary?.avg_price_per_ltr ?? 0)}`} loading={!overallSummary} />
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
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-5">
          <SummaryCard icon={Hash} label="Total Count" value={summary?.total_count ?? 0} loading={loading} />
          <SummaryCard icon={IndianRupee} label="Total Value" value={`₹ ${fmtDecimal(summary?.total_value ?? 0)}`} loading={loading} />
          <SummaryCard icon={Scale} label="Total Quantity" value={`${fmtDecimal(summary?.total_qty ?? 0)} KG`} loading={loading} />
          <SummaryCard icon={Weight} label="Avg Price / KG" value={`₹ ${fmtDecimal(summary?.avg_price_per_kg ?? 0)}`} loading={loading} />
          <SummaryCard icon={Droplets} label="Avg Price / LTR" value={`₹ ${fmtDecimal(summary?.avg_price_per_ltr ?? 0)}`} loading={loading} />
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
                          {fmtDateTime(row.created_at)}
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
          {!loading && (
            <Pagination page={page} totalPages={totalPages} totalItems={rows.length} perPage={perPage} onPageChange={setPage} />
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
                  {tankItems.map((item) => (
                    <SelectItem key={item.tank_item_code} value={item.tank_item_code}>
                      {item.tank_item_code} - {item.tank_item_name}
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
                <SelectTrigger className="w-full h-auto min-h-9 whitespace-normal text-left">
                  <SelectValue placeholder="Select a vendor" />
                </SelectTrigger>
                <SelectContent className="max-w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)]">
                  {vendors.map((v) => (
                    <SelectItem key={v.card_code} value={v.card_code} className="whitespace-normal">
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
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="c-vehicle">Vehicle Number</Label>
                <Input
                  id="c-vehicle"
                  placeholder="e.g. GJ-05-AB-1234"
                  value={cVehicleNumber}
                  onChange={(e) => setCVehicleNumber(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-transporter">Transporter Name</Label>
                <Input
                  id="c-transporter"
                  placeholder="e.g. ABC Logistics"
                  value={cTransporterName}
                  onChange={(e) => setCTransporterName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-location">Location</Label>
                <Input
                  id="c-location"
                  placeholder="e.g. Mundra Port"
                  value={cLocation}
                  onChange={(e) => setCLocation(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-eta">ETA</Label>
                <Input
                  id="c-eta"
                  type="date"
                  value={cEta}
                  onChange={(e) => setCEta(e.target.value)}
                />
              </div>
            </div>
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
                      {tankItems.find((i) => i.tank_item_code === viewData.item_code)?.tank_item_name ?? "—"}
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

              {/* Transport & Location */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Truck className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">
                    Transport & Location
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-3 pl-6">
                  <div>
                    <p className="text-xs text-muted-foreground">Vehicle Number</p>
                    <p className="text-sm font-medium">{viewData.vehicle_number || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Transporter Name</p>
                    <p className="text-sm font-medium">{viewData.transporter_name || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Location</p>
                    <p className="text-sm font-medium">{viewData.location || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">ETA</p>
                    <p className="text-sm font-medium">{viewData.eta || "—"}</p>
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
                    <p className="text-sm font-medium">{fmtDateTime(viewData.created_at)}</p>
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
                <p className="text-sm font-medium">{tankItems.find((i) => i.tank_item_code === editData?.item_code)?.tank_item_name ?? "—"}</p>
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
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="e-vehicle">Vehicle Number</Label>
                <Input
                  id="e-vehicle"
                  placeholder="e.g. GJ-05-AB-1234"
                  value={eVehicleNumber}
                  onChange={(e) => setEVehicleNumber(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="e-transporter">Transporter Name</Label>
                <Input
                  id="e-transporter"
                  placeholder="e.g. ABC Logistics"
                  value={eTransporterName}
                  onChange={(e) => setETransporterName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="e-location">Location</Label>
                <Input
                  id="e-location"
                  placeholder="e.g. Mundra Port"
                  value={eLocation}
                  onChange={(e) => setELocation(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="e-eta">ETA</Label>
                <Input
                  id="e-eta"
                  type="date"
                  value={eEta}
                  onChange={(e) => setEEta(e.target.value)}
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
