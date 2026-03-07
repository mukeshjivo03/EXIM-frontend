import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  RefreshCw,
  Eye,
  Pencil,
  Trash2,
  FileCheck,
  Package,
  Truck,
  FileText,
  IndianRupee,
  Search,
  X,
} from "lucide-react";

import { syncPOs, syncSinglePO, getPOs, deletePO, updatePO, type PO } from "@/api/sapSync";
import { fmtDecimal, fmtDate } from "@/lib/formatters";
import { getErrorMessage, toastApiError } from "@/lib/errors";
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

/* ── helpers ──────────────────────────────────────────────── */

function statusLabel(s: string) {
  if (s === "C") return "Closed";
  if (s === "O") return "Open";
  return s;
}

function statusVariant(s: string): "default" | "secondary" | "outline" {
  if (s === "C") return "secondary";
  if (s === "O") return "default";
  return "outline";
}

/* ── component ────────────────────────────────────────────── */

export default function DomesticContractsPage() {
  const [rows, setRows] = useState<PO[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");

  // search
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Pre-compute searchable string per row once (only recomputes when rows change)
  const searchIndex = useMemo(
    () =>
      rows.map((r) =>
        [
          r.po_number,
          r.product_name,
          r.product_code,
          r.vendor,
          r.grpo_no,
          r.invoice_no,
          r.status,
          r.bilty_no,
          r.transporter,
          r.vehicle_no,
          fmtDate(r.po_date),
          fmtDate(r.grpo_date),
          fmtDate(r.bilty_date),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
      ),
    [rows]
  );

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((_, i) => searchIndex[i].includes(q));
  }, [rows, searchIndex, search]);

  // pagination
  const perPage = 20;
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / perPage));
  const paginated = filteredRows.slice((page - 1) * perPage, page * perPage);

  // view dialog
  const [viewData, setViewData] = useState<PO | null>(null);

  // edit dialog
  const [editData, setEditData] = useState<PO | null>(null);
  const [ePoDate, setEPoDate] = useState("");
  const [eStatus, setEStatus] = useState("");
  const [eProductCode, setEProductCode] = useState("");
  const [eProductName, setEProductName] = useState("");
  const [eVendor, setEVendor] = useState("");
  const [eContractQty, setEContractQty] = useState("");
  const [eContractRate, setEContractRate] = useState("");
  const [eContractValue, setEContractValue] = useState("");
  const [eLoadQty, setELoadQty] = useState("");
  const [eUnloadQty, setEUnloadQty] = useState("");
  const [eAllowance, setEAllowance] = useState("");
  const [eTransporter, setETransporter] = useState("");
  const [eVehicleNo, setEVehicleNo] = useState("");
  const [eBiltyNo, setEBiltyNo] = useState("");
  const [eBiltyDate, setEBiltyDate] = useState("");
  const [eGrpoNo, setEGrpoNo] = useState("");
  const [eGrpoDate, setEGrpoDate] = useState("");
  const [eInvoiceNo, setEInvoiceNo] = useState("");
  const [eBasicAmount, setEBasicAmount] = useState("");
  const [eLandedCost, setELandedCost] = useState("");
  const [eNetAmount, setENetAmount] = useState("");
  const [editing, setEditing] = useState(false);

  // single sync
  const [grpoInput, setGrpoInput] = useState("");
  const [singleSyncing, setSingleSyncing] = useState(false);
  const [lastSyncedGrpo, setLastSyncedGrpo] = useState<string | null>(null);

  // delete dialog
  const [deleteData, setDeleteData] = useState<PO | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* ── fetch ──────────────────────────────────────────────── */

  async function fetchList() {
    setLoading(true);
    setError("");
    try {
      const data = await getPOs();
      setRows(data.sort((a, b) => b.id - a.id));
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load contracts"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchList();
  }, []);

  /* ── sync ───────────────────────────────────────────────── */

  async function handleSync() {
    setSyncing(true);
    try {
      await syncPOs();
      toast.success("Sync complete. Loading contracts...");
      await fetchList();
    } catch (err) {
      toastApiError(err, "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  /* ── single sync ────────────────────────────────────────── */

  async function handleSingleSync() {
    const grpo = grpoInput.trim();
    if (!grpo) return;
    setSingleSyncing(true);
    try {
      const details = await syncSinglePO(grpo);
      if (details.length === 0) {
        toast.info(`No records found for GRPO ${grpo}`);
      } else {
        await fetchList();
        setLastSyncedGrpo(grpo);
        toast.success(`Synced GRPO ${grpo} — ${details.length} record(s)`);
      }
    } catch (err) {
      toastApiError(err, "Sync failed");
    } finally {
      setSingleSyncing(false);
    }
  }

  /* ── edit ───────────────────────────────────────────────── */

  function openEdit(row: PO) {
    setEditData(row);
    setEPoDate(row.po_date ?? "");
    setEStatus(row.status ?? "");
    setEProductCode(row.product_code ?? "");
    setEProductName(row.product_name ?? "");
    setEVendor(row.vendor ?? "");
    setEContractQty(row.contract_qty ?? "");
    setEContractRate(row.contract_rate ?? "");
    setEContractValue(row.contract_value ?? "");
    setELoadQty(row.load_qty ?? "");
    setEUnloadQty(row.unload_qty ?? "");
    setEAllowance(row.allowance ?? "");
    setETransporter(row.transporter ?? "");
    setEVehicleNo(row.vehicle_no ?? "");
    setEBiltyNo(row.bilty_no ?? "");
    setEBiltyDate(row.bilty_date ?? "");
    setEGrpoNo(row.grpo_no ?? "");
    setEGrpoDate(row.grpo_date ?? "");
    setEInvoiceNo(row.invoice_no ?? "");
    setEBasicAmount(row.basic_amount ?? "");
    setELandedCost(row.landed_cost ?? "");
    setENetAmount(row.net_amount ?? "");
  }

  async function handleEdit() {
    if (!editData) return;
    setEditing(true);
    try {
      await updatePO(editData.id, {
        po_date: ePoDate || undefined,
        status: eStatus || undefined,
        product_code: eProductCode || undefined,
        product_name: eProductName || undefined,
        vendor: eVendor || undefined,
        contract_qty: eContractQty || undefined,
        contract_rate: eContractRate || undefined,
        contract_value: eContractValue || undefined,
        load_qty: eLoadQty || undefined,
        unload_qty: eUnloadQty || undefined,
        allowance: eAllowance || undefined,
        transporter: eTransporter || undefined,
        vehicle_no: eVehicleNo || undefined,
        bilty_no: eBiltyNo || undefined,
        bilty_date: eBiltyDate || undefined,
        grpo_date: eGrpoDate || undefined,
        invoice_no: eInvoiceNo || undefined,
        basic_amount: eBasicAmount || undefined,
        landed_cost: eLandedCost || undefined,
        net_amount: eNetAmount || undefined,
      });
      toast.success("Contract updated.");
      setEditData(null);
      await fetchList();
    } catch (err) {
      toastApiError(err, "Failed to update contract.");
    } finally {
      setEditing(false);
    }
  }

  /* ── delete ─────────────────────────────────────────────── */

  async function handleDelete() {
    if (!deleteData) return;
    setDeleting(true);
    try {
      await deletePO(deleteData.id);
      toast.success("Contract deleted.");
      setDeleteData(null);
      await fetchList();
    } catch {
      toast.error("Failed to delete contract.");
    } finally {
      setDeleting(false);
    }
  }

  /* ── render ──────────────────────────────────────────────── */

  return (
    <div className="p-6 space-y-6 animate-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Domestic Contracts</h1>
          <p className="text-sm text-muted-foreground">
            Purchase orders and contract data from SAP
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Enter GRPO number"
              value={grpoInput}
              onChange={(e) => setGrpoInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSingleSync()}
              className="w-48"
            />
            <Button onClick={handleSingleSync} disabled={singleSyncing || !grpoInput.trim()} variant="secondary" className="btn-press gap-2">
              <RefreshCw className={`h-4 w-4 ${singleSyncing ? "animate-spin" : ""}`} />
              {singleSyncing ? "Syncing..." : "Sync GRPO"}
            </Button>
          </div>
          <Button onClick={handleSync} disabled={syncing} className="btn-press gap-2">
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Sync All"}
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Single Sync Result */}
      {lastSyncedGrpo && (() => {
        const syncedRows = rows.filter((r) => r.grpo_no === lastSyncedGrpo);
        if (syncedRows.length === 0) return null;
        return (
          <Card className="border-primary/40 bg-primary/5">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileCheck className="h-4 w-4 text-primary" />
                    Last Synced — GRPO {lastSyncedGrpo}
                  </CardTitle>
                  <CardDescription>{syncedRows.length} record(s) synced from SAP</CardDescription>
                </div>
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => setLastSyncedGrpo(null)}>
                  Dismiss
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PO Number</TableHead>
                      <TableHead>PO Date</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>GRPO Date</TableHead>
                      <TableHead>Qty (MTS)</TableHead>
                      <TableHead>Rate (₹)</TableHead>
                      <TableHead>Value (₹)</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {syncedRows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.po_number}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{fmtDate(row.po_date)}</TableCell>
                        <TableCell className="max-w-[200px] truncate" title={row.product_name}>{row.product_name}</TableCell>
                        <TableCell className="max-w-[180px] truncate" title={row.vendor}>{row.vendor}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{fmtDate(row.grpo_date)}</TableCell>
                        <TableCell>{row.contract_qty ? fmtDecimal(row.contract_qty) : "—"}</TableCell>
                        <TableCell>₹{row.contract_rate ? fmtDecimal(row.contract_rate) : "—"}</TableCell>
                        <TableCell className="font-medium">₹{row.contract_value ? fmtDecimal(row.contract_value) : "—"}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(row.status)}>{statusLabel(row.status)}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewData(row)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(row)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteData(row)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Table */}
      <Card className="card-hover shimmer-hover">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Contracts</CardTitle>
              <CardDescription>
                {search.trim()
                  ? `${filteredRows.length} of ${rows.length} records`
                  : `${rows.length} records`}
              </CardDescription>
            </div>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search PO, product, vendor, GRPO..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9 pr-8"
              />
              {search && (
                <button
                  onClick={() => { setSearch(""); setPage(1); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {["PO Number", "PO Date", "Product", "Vendor", "GRPO Date", "Qty (MTS)", "Rate (₹)", "Value (₹)", "Status", "Actions"].map((h) => (
                      <TableHead key={h}>{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 10 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-16" /></TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>PO Date</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>GRPO Date</TableHead>
                    <TableHead>Qty (MTS)</TableHead>
                    <TableHead>Rate (₹)</TableHead>
                    <TableHead>Value (₹)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="py-16">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <FileCheck className="h-10 w-10 stroke-1" />
                          <p className="text-sm font-medium">No contracts found</p>
                          <p className="text-xs">{search.trim() ? "No contracts match your search." : "Click Sync All to load contracts from SAP."}</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginated.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.po_number}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{fmtDate(row.po_date)}</TableCell>
                        <TableCell className="max-w-[200px] truncate" title={row.product_name}>{row.product_name}</TableCell>
                        <TableCell className="max-w-[180px] truncate" title={row.vendor}>{row.vendor}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{fmtDate(row.grpo_date)}</TableCell>
                        <TableCell>{row.contract_qty ? fmtDecimal(row.contract_qty) : "—"}</TableCell>
                        <TableCell>₹{row.contract_rate ? fmtDecimal(row.contract_rate) : "—"}</TableCell>
                        <TableCell className="font-medium">₹{row.contract_value ? fmtDecimal(row.contract_value) : "—"}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(row.status)}>
                            {statusLabel(row.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setViewData(row)}
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
            <Pagination
              page={page}
              totalPages={totalPages}
              totalItems={filteredRows.length}
              perPage={perPage}
              onPageChange={setPage}
            />
          )}
        </CardContent>
      </Card>

      {/* ── View Dialog ──────────────────────────────────────── */}
      <Dialog open={!!viewData} onOpenChange={() => setViewData(null)}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Contract Details
            </DialogTitle>
            <DialogDescription>PO #{viewData?.po_number}</DialogDescription>
          </DialogHeader>

          {viewData && (
            <div className="space-y-5 py-2">
              {/* Section 1: Contract Information */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">Contract Information</h3>
                </div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-3 pl-6">
                  <div><p className="text-xs text-muted-foreground">PO Number</p><p className="text-sm font-medium">{viewData.po_number}</p></div>
                  <div><p className="text-xs text-muted-foreground">PO Date</p><p className="text-sm font-medium">{fmtDate(viewData.po_date)}</p></div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge variant={statusVariant(viewData.status)} className="mt-0.5">{statusLabel(viewData.status)}</Badge>
                  </div>
                  <div><p className="text-xs text-muted-foreground">Product Code</p><p className="text-sm font-medium">{viewData.product_code}</p></div>
                  <div className="col-span-2"><p className="text-xs text-muted-foreground">Product</p><p className="text-sm font-medium">{viewData.product_name}</p></div>
                  <div className="col-span-2"><p className="text-xs text-muted-foreground">Vendor</p><p className="text-sm font-medium">{viewData.vendor}</p></div>
                  <div><p className="text-xs text-muted-foreground">Contract Qty</p><p className="text-sm font-medium">{viewData.contract_qty ? fmtDecimal(viewData.contract_qty) : "—"} MTS</p></div>
                  <div><p className="text-xs text-muted-foreground">Contract Rate</p><p className="text-sm font-medium">₹ {viewData.contract_rate ? fmtDecimal(viewData.contract_rate) : "—"}/MTS</p></div>
                  <div className="col-span-2"><p className="text-xs text-muted-foreground">Contract Value</p><p className="text-base font-semibold">₹ {viewData.contract_value ? fmtDecimal(viewData.contract_value) : "—"}</p></div>
                </div>
              </div>

              <Separator />

              {/* Section 2: Loading Details */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Package className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">Loading Details</h3>
                </div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-3 pl-6">
                  <div><p className="text-xs text-muted-foreground">Load Qty</p><p className="text-sm font-medium">{viewData.load_qty ? fmtDecimal(viewData.load_qty) : "—"} MTS</p></div>
                  <div><p className="text-xs text-muted-foreground">Unload Qty</p><p className="text-sm font-medium">{viewData.unload_qty ? fmtDecimal(viewData.unload_qty) : "—"} MTS</p></div>
                  <div><p className="text-xs text-muted-foreground">Allowance</p><p className="text-sm font-medium">{viewData.allowance ?? "—"}</p></div>
                </div>
              </div>

              <Separator />

              {/* Section 3: Transport & Freight Details */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Truck className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">Transport & Freight Details</h3>
                </div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-3 pl-6">
                  <div><p className="text-xs text-muted-foreground">Transporter</p><p className="text-sm font-medium">{viewData.transporter ?? "—"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Vehicle No</p><p className="text-sm font-medium">{viewData.vehicle_no ?? "—"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Bilty No</p><p className="text-sm font-medium">{viewData.bilty_no ?? "—"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Bilty Date</p><p className="text-sm font-medium">{fmtDate(viewData.bilty_date)}</p></div>
                </div>
              </div>

              <Separator />

              {/* Section 4: GRPO & Invoice Details */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <FileCheck className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">GRPO & Invoice Details</h3>
                </div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-3 pl-6">
                  <div><p className="text-xs text-muted-foreground">GRPO Number</p><p className="text-sm font-medium">{viewData.grpo_no || "—"}</p></div>
                  <div><p className="text-xs text-muted-foreground">GRPO Date</p><p className="text-sm font-medium">{fmtDate(viewData.grpo_date)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Invoice Number</p><p className="text-sm font-medium">{viewData.invoice_no || "—"}</p></div>
                </div>
              </div>

              <Separator />

              {/* Section 5: Summary */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <IndianRupee className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">Summary</h3>
                </div>
                <div className="pl-6 space-y-2">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">Basic Amount</p>
                    <p className="text-sm font-medium">₹ {viewData.basic_amount ? fmtDecimal(viewData.basic_amount) : "—"}</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">Landed Cost</p>
                    <p className="text-sm font-medium">₹ {viewData.landed_cost ? fmtDecimal(viewData.landed_cost) : "—"}</p>
                  </div>
                  <Separator className="my-1" />
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-semibold">Net Amount</p>
                    <p className="text-base font-bold">₹ {viewData.net_amount ? fmtDecimal(viewData.net_amount) : "—"}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setViewData(null)}>Close</Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => { openEdit(viewData!); setViewData(null); }}
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
            <Button
              variant="destructive"
              className="gap-2"
              onClick={() => { setDeleteData(viewData); setViewData(null); }}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ──────────────────────────────────────── */}
      <Dialog open={!!editData} onOpenChange={() => setEditData(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Edit Contract
            </DialogTitle>
            <DialogDescription>
              PO #{editData?.po_number} &nbsp;|&nbsp; GRPO: {editData?.grpo_no || "—"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-1">
            {/* Contract Information */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">Contract Information</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="e-po-date">PO Date</Label>
                  <Input id="e-po-date" type="date" value={ePoDate} onChange={(e) => setEPoDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="e-status">Status</Label>
                  <Input id="e-status" value={eStatus} onChange={(e) => setEStatus(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="e-product-code">Product Code</Label>
                  <Input id="e-product-code" value={eProductCode} onChange={(e) => setEProductCode(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="e-product-name">Product Name</Label>
                  <Input id="e-product-name" value={eProductName} onChange={(e) => setEProductName(e.target.value)} />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="e-vendor">Vendor</Label>
                  <Input id="e-vendor" value={eVendor} onChange={(e) => setEVendor(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="e-contract-qty">Contract Qty</Label>
                  <Input id="e-contract-qty" value={eContractQty} onChange={(e) => setEContractQty(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="e-contract-rate">Contract Rate</Label>
                  <Input id="e-contract-rate" value={eContractRate} onChange={(e) => setEContractRate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="e-contract-value">Contract Value</Label>
                  <Input id="e-contract-value" value={eContractValue} onChange={(e) => setEContractValue(e.target.value)} />
                </div>
              </div>
            </div>

            <Separator />

            {/* Loading Details */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">Loading Details</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="e-load-qty">Load Qty</Label>
                  <Input id="e-load-qty" value={eLoadQty} onChange={(e) => setELoadQty(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="e-unload-qty">Unload Qty</Label>
                  <Input id="e-unload-qty" value={eUnloadQty} onChange={(e) => setEUnloadQty(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="e-allowance">Allowance</Label>
                  <Input id="e-allowance" value={eAllowance} onChange={(e) => setEAllowance(e.target.value)} />
                </div>
              </div>
            </div>

            <Separator />

            {/* Transport & Freight */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">Transport & Freight Details</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="e-transporter">Transporter</Label>
                  <Input id="e-transporter" value={eTransporter} onChange={(e) => setETransporter(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="e-vehicle-no">Vehicle No</Label>
                  <Input id="e-vehicle-no" value={eVehicleNo} onChange={(e) => setEVehicleNo(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="e-bilty-no">Bilty No</Label>
                  <Input id="e-bilty-no" value={eBiltyNo} onChange={(e) => setEBiltyNo(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="e-bilty-date">Bilty Date</Label>
                  <Input id="e-bilty-date" type="date" value={eBiltyDate} onChange={(e) => setEBiltyDate(e.target.value)} />
                </div>
              </div>
            </div>

            <Separator />

            {/* GRPO & Invoice */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">GRPO & Invoice Details</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="e-grpo-date">GRPO Date</Label>
                  <Input id="e-grpo-date" type="date" value={eGrpoDate} onChange={(e) => setEGrpoDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="e-invoice-no">Invoice No</Label>
                  <Input id="e-invoice-no" value={eInvoiceNo} onChange={(e) => setEInvoiceNo(e.target.value)} />
                </div>
              </div>
            </div>

            <Separator />

            {/* Summary */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">Summary</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="e-basic-amount">Basic Amount</Label>
                  <Input id="e-basic-amount" value={eBasicAmount} onChange={(e) => setEBasicAmount(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="e-landed-cost">Landed Cost</Label>
                  <Input id="e-landed-cost" value={eLandedCost} onChange={(e) => setELandedCost(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="e-net-amount">Net Amount</Label>
                  <Input id="e-net-amount" value={eNetAmount} onChange={(e) => setENetAmount(e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditData(null)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={editing}>
              {editing ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Dialog ─────────────────────────────────────── */}
      <Dialog open={!!deleteData} onOpenChange={() => setDeleteData(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Delete Contract
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete PO <strong>#{deleteData?.po_number}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteData(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
