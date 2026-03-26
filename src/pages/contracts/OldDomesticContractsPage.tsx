import { useEffect, useMemo, useState } from "react";
import {
  Eye,
  FileCheck,
  Package,
  Truck,
  FileText,
  IndianRupee,
  Search,
  X,
  Scale,
  TrendingUp,
} from "lucide-react";

import { getOldContracts, type OldContract } from "@/api/oldContracts";
import { fmtDecimal, fmtDate } from "@/lib/formatters";
import { getErrorMessage } from "@/lib/errors";
import { Pagination } from "@/components/Pagination";
import { SummaryCard } from "@/components/SummaryCard";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
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

function completedLabel(c: number) {
  return c === 1 ? "Completed" : "Pending";
}

function completedVariant(c: number): "default" | "secondary" {
  return c === 1 ? "secondary" : "default";
}

/* ── component ────────────────────────────────────────────── */

export default function OldDomesticContractsPage() {
  const [rows, setRows] = useState<OldContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // search & filters
  const [search, setSearch] = useState("");
  const [filterProduct, setFilterProduct] = useState("all");
  const [filterVendor, setFilterVendor] = useState("all");
  const [filterCompleted, setFilterCompleted] = useState("all");
  const [filterPoDateFrom, setFilterPoDateFrom] = useState("");
  const [filterPoDateTo, setFilterPoDateTo] = useState("");
  const [page, setPage] = useState(1);

  // view dialog
  const [viewData, setViewData] = useState<OldContract | null>(null);

  // searchable index
  const searchIndex = useMemo(
    () =>
      rows.map((r) =>
        [
          r.po_number,
          r.product_code,
          r.vendor_code,
          r.transporter_name,
          r.vehicle_number,
          r.invoice_number,
          r.grpo_number,
          r.bility_number,
          fmtDate(r.po_date),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
      ),
    [rows]
  );

  // unique filter options
  const productOptions = useMemo(() => [...new Set(rows.map((r) => r.product_code).filter(Boolean))].sort(), [rows]);
  const vendorOptions = useMemo(() => [...new Set(rows.map((r) => r.vendor_code).filter(Boolean))].sort(), [rows]);

  const filteredRows = useMemo(() => {
    let result = rows;

    if (filterProduct !== "all") result = result.filter((r) => r.product_code === filterProduct);
    if (filterVendor !== "all") result = result.filter((r) => r.vendor_code === filterVendor);
    if (filterCompleted !== "all") result = result.filter((r) => String(r.Completed) === filterCompleted);
    if (filterPoDateFrom) result = result.filter((r) => (r.po_date ?? "") >= filterPoDateFrom);
    if (filterPoDateTo) result = result.filter((r) => (r.po_date ?? "") <= filterPoDateTo);

    const q = search.trim().toLowerCase();
    if (q) result = result.filter((r) => {
      const idx = rows.indexOf(r);
      return searchIndex[idx].includes(q);
    });

    return result;
  }, [rows, searchIndex, search, filterProduct, filterVendor, filterCompleted, filterPoDateFrom, filterPoDateTo]);

  // summary stats
  const summary = useMemo(() => {
    let totalQty = 0;
    let totalValue = 0;
    let count = 0;
    for (const r of filteredRows) {
      const qty = Number(r.contract_qty) || 0;
      const val = Number(r.basic_amount) || 0;
      totalQty += qty;
      totalValue += val;
      if (qty > 0) count++;
    }
    const avgRate = count > 0 ? totalValue / totalQty : 0;
    return { totalQty, totalValue, avgRate };
  }, [filteredRows]);

  // pagination
  const perPage = 20;
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / perPage));
  const paginated = filteredRows.slice((page - 1) * perPage, page * perPage);

  /* ── fetch ──────────────────────────────────────────────── */

  async function fetchList() {
    setLoading(true);
    setError("");
    try {
      const data = await getOldContracts();
      setRows(data.filter((r) => r.deleted === 0).sort((a, b) => b.id - a.id));
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load old contracts"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchList();
  }, []);

  /* ── render ──────────────────────────────────────────────── */

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 animate-page">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Old Domestic Contracts</h1>
        <p className="text-sm text-muted-foreground">
          Historical contract records
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <SummaryCard
          icon={Scale}
          label="Total Quantity"
          value={loading ? "" : `${summary.totalQty.toLocaleString("en-IN", { maximumFractionDigits: 0 })} MTS`}
          loading={loading}
        />
        <SummaryCard
          icon={IndianRupee}
          label="Total Basic Amount"
          value={loading ? "" : `₹ ${summary.totalValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
          loading={loading}
        />
        <SummaryCard
          icon={TrendingUp}
          label="Average Rate"
          value={loading ? "" : `₹ ${summary.avgRate.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/MTS`}
          loading={loading}
        />
      </div>

      {/* Table */}
      <Card className="card-hover shimmer-hover">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Contracts</CardTitle>
              <CardDescription>
                {filteredRows.length !== rows.length
                  ? `${filteredRows.length} of ${rows.length} records`
                  : `${rows.length} records`}
              </CardDescription>
            </div>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search PO, product, vendor..."
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

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 pt-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground shrink-0">PO Date</label>
              <DateInput
                value={filterPoDateFrom}
                onChange={(e) => { setFilterPoDateFrom(e.target.value); setPage(1); }}
                className="h-9 w-[150px]"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <DateInput
                value={filterPoDateTo}
                onChange={(e) => { setFilterPoDateTo(e.target.value); setPage(1); }}
                className="h-9 w-[150px]"
              />
            </div>

            <Select value={filterProduct} onValueChange={(v) => { setFilterProduct(v); setPage(1); }}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Product" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                {productOptions.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterVendor} onValueChange={(v) => { setFilterVendor(v); setPage(1); }}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Vendor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vendors</SelectItem>
                {vendorOptions.map((v) => (
                  <SelectItem key={v} value={v}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterCompleted} onValueChange={(v) => { setFilterCompleted(v); setPage(1); }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="1">Completed</SelectItem>
                <SelectItem value="0">Pending</SelectItem>
              </SelectContent>
            </Select>

            {(filterPoDateFrom || filterPoDateTo || filterProduct !== "all" || filterVendor !== "all" || filterCompleted !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => { setFilterPoDateFrom(""); setFilterPoDateTo(""); setFilterProduct("all"); setFilterVendor("all"); setFilterCompleted("all"); setPage(1); }}
              >
                <X className="h-3 w-3 mr-1" />
                Clear filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {["PO Number", "PO Date", "Product", "Vendor", "Qty (MTS)", "Rate (₹)", "Basic Amount (₹)", "Vehicle", "Status", "Actions"].map((h) => (
                      <TableHead key={h}>{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 10 }).map((_, j) => (
                        <TableCell key={j}><div className="h-4 w-16 bg-muted animate-pulse rounded" /></TableCell>
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
                    <TableHead>Product Code</TableHead>
                    <TableHead>Vendor Code</TableHead>
                    <TableHead>Qty (MTS)</TableHead>
                    <TableHead>Rate (₹)</TableHead>
                    <TableHead>Basic Amount (₹)</TableHead>
                    <TableHead>Vehicle</TableHead>
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
                          <p className="text-xs">{search.trim() || filterPoDateFrom || filterPoDateTo || filterProduct !== "all" || filterVendor !== "all" || filterCompleted !== "all" ? "No contracts match your search or filters." : "No historical contracts available."}</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginated.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.po_number}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{fmtDate(row.po_date)}</TableCell>
                        <TableCell>{row.product_code}</TableCell>
                        <TableCell>{row.vendor_code}</TableCell>
                        <TableCell>{fmtDecimal(row.contract_qty)}</TableCell>
                        <TableCell>₹{Number(row.contract_rate).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</TableCell>
                        <TableCell className="font-medium">₹{Number(row.basic_amount).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</TableCell>
                        <TableCell>{row.vehicle_number || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={completedVariant(row.Completed)}>
                            {completedLabel(row.Completed)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setViewData(row)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
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
              {/* Contract Information */}
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
                    <Badge variant={completedVariant(viewData.Completed)} className="mt-0.5">{completedLabel(viewData.Completed)}</Badge>
                  </div>
                  <div><p className="text-xs text-muted-foreground">Product Code</p><p className="text-sm font-medium">{viewData.product_code}</p></div>
                  <div><p className="text-xs text-muted-foreground">Vendor Code</p><p className="text-sm font-medium">{viewData.vendor_code}</p></div>
                  <div><p className="text-xs text-muted-foreground">Invoice Number</p><p className="text-sm font-medium">{viewData.invoice_number || "—"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Contract Qty</p><p className="text-sm font-medium">{fmtDecimal(viewData.contract_qty)} MTS</p></div>
                  <div><p className="text-xs text-muted-foreground">Contract Rate</p><p className="text-sm font-medium">₹ {fmtDecimal(viewData.contract_rate)}/MTS</p></div>
                  <div className="col-span-2"><p className="text-xs text-muted-foreground">Basic Amount</p><p className="text-base font-semibold">₹ {fmtDecimal(viewData.basic_amount)}</p></div>
                </div>
              </div>

              <Separator />

              {/* Loading Details */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Package className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">Loading Details</h3>
                </div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-3 pl-6">
                  <div><p className="text-xs text-muted-foreground">Load Qty</p><p className="text-sm font-medium">{fmtDecimal(viewData.load_qty)} MTS</p></div>
                  <div><p className="text-xs text-muted-foreground">Unload Qty</p><p className="text-sm font-medium">{fmtDecimal(viewData.unload_qty)} MTS</p></div>
                  <div><p className="text-xs text-muted-foreground">Shortage (Rec)</p><p className="text-sm font-medium">{fmtDecimal(viewData.shortage_rec)} KG</p></div>
                  <div><p className="text-xs text-muted-foreground">Allow Shortage</p><p className="text-sm font-medium">{fmtDecimal(viewData.allow_shortage)} KG</p></div>
                  <div><p className="text-xs text-muted-foreground">Deduction</p><p className="text-sm font-medium">{fmtDecimal(viewData.deduction)} KG</p></div>
                  <div><p className="text-xs text-muted-foreground">Deduct Amount</p><p className="text-sm font-medium">₹ {fmtDecimal(viewData.deduct_amount)}</p></div>
                </div>
              </div>

              <Separator />

              {/* Transport & Freight */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Truck className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">Transport & Freight</h3>
                </div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-3 pl-6">
                  <div><p className="text-xs text-muted-foreground">Transporter</p><p className="text-sm font-medium">{viewData.transporter_name || "—"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Transporter Code</p><p className="text-sm font-medium">{viewData.transporter_code || "—"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Vehicle Number</p><p className="text-sm font-medium">{viewData.vehicle_number || "—"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Bilty Number</p><p className="text-sm font-medium">{viewData.bility_number || "—"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Bilty Date</p><p className="text-sm font-medium">{fmtDate(viewData.bility_date)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Freight Rate</p><p className="text-sm font-medium">₹ {fmtDecimal(viewData.frieght_rate)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Freight Amount</p><p className="text-sm font-medium">₹ {fmtDecimal(viewData.freight_amount)}</p></div>
                </div>
              </div>

              <Separator />

              {/* GRPO & Brokerage */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <IndianRupee className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">GRPO & Brokerage</h3>
                </div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-3 pl-6">
                  <div><p className="text-xs text-muted-foreground">GRPO Number</p><p className="text-sm font-medium">{viewData.grpo_number || "—"}</p></div>
                  <div><p className="text-xs text-muted-foreground">GRPO Date</p><p className="text-sm font-medium">{fmtDate(viewData.grpo_date)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Brokerage Rate</p><p className="text-sm font-medium">₹ {fmtDecimal(viewData.brokerage_rate)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Brokerage Amount</p><p className="text-sm font-medium">₹ {fmtDecimal(viewData.brokerage_amount)}</p></div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewData(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
