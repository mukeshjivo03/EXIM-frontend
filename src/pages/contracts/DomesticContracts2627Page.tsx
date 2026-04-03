import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { toastApiError } from "@/lib/errors";
import { fmtDecimal, fmtDate } from "@/lib/formatters";
import {
  Plus,
  Truck,
  FileText,
  FileCheck,
  Eye,
  Search,
  X,
  Scale,
  IndianRupee,
  TrendingUp,
  Package,
} from "lucide-react";

import {
  createContract26,
  getContractsDropdown,
  getContract26,
  getContracts26,
  submitLoadingForm,
  submitFreightForm,
  type NewContractPayload,
  type FreightPayload,
  type ContractDropdownItem,
  type DomesticContract26,
} from "@/api/domesticContracts26";
import { getRmItems, getVendors, type SapItem, type Vendor } from "@/api/sapSync";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pagination } from "@/components/Pagination";
import { SummaryCard } from "@/components/SummaryCard";

/* ── constants ────────────────────────────────────────────── */

const STATUS_CHOICES = [
  "CONTRACT",
  "PO",
  "MAIL_APPROVAL",
  "PAYMENT",
  "TPT/LOADING",
  "IN_TRANSIT",
  "FACTORY",
  "RECIEVED",
] as const;

function completedLabel(c: number | undefined) {
  return c === 1 ? "Completed" : "Pending";
}

function completedVariant(c: number | undefined): "default" | "secondary" {
  return c === 1 ? "secondary" : "default";
}

const emptyContractForm: NewContractPayload = {
  status: "",
  product_code: "",
  vendor_code: "",
  po_number: "",
  po_date: "",
  contract_qty: 0,
  contract_rate: 0,
};

/* ── page ─────────────────────────────────────────────────── */

export default function DomesticContracts2627Page() {
  const [rmItems, setRmItems] = useState<SapItem[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(true);

  // dialog state
  const [contractOpen, setContractOpen] = useState(false);
  const [loadingOpen, setLoadingOpen] = useState(false);
  const [freightOpen, setFreightOpen] = useState(false);

  // new contract form
  const [form, setForm] = useState<NewContractPayload>(emptyContractForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // loading form
  const [contractsList, setContractsList] = useState<ContractDropdownItem[]>([]);
  const [contractsListLoading, setContractsListLoading] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState<number | null>(null);
  const [contractRate, setContractRate] = useState<number>(0);
  const [selectedProductCode, setSelectedProductCode] = useState("");
  const [selectedProductName, setSelectedProductName] = useState("");
  const [contractDetailLoading, setContractDetailLoading] = useState(false);
  const [loadQty, setLoadQty] = useState("");
  const [unloadQty, setUnloadQty] = useState("");
  const [loadingSaving, setLoadingSaving] = useState(false);
  const [loadingError, setLoadingError] = useState("");

  // freight form state
  const [freightContractId, setFreightContractId] = useState<number | null>(null);
  const [freightUnloadQty, setFreightUnloadQty] = useState<string>("");
  const [transporterCode, setTransporterCode] = useState("");
  const [transporterName, setTransporterName] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [biltyNumber, setBiltyNumber] = useState("");
  const [biltyDate, setBiltyDate] = useState("");
  const [freightRate, setFreightRate] = useState("");
  const [brokerageAmount, setBrokerageAmount] = useState("");
  const [grpoNumber, setGrpoNumber] = useState("");
  const [grpoDate, setGrpoDate] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [freightSaving, setFreightSaving] = useState(false);
  const [freightError, setFreightError] = useState("");

  // list view state
  const [rows, setRows] = useState<DomesticContract26[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  // search & filters
  const [search, setSearch] = useState("");
  const [filterProduct, setFilterProduct] = useState("all");
  const [filterVendor, setFilterVendor] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCompleted, setFilterCompleted] = useState("all");
  const [filterPoDateFrom, setFilterPoDateFrom] = useState("");
  const [filterPoDateTo, setFilterPoDateTo] = useState("");
  const [page, setPage] = useState(1);

  // view dialog
  const [viewData, setViewData] = useState<DomesticContract26 | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [rmRes, vendorRes] = await Promise.all([
          getRmItems(),
          getVendors(),
        ]);
        setRmItems(rmRes.items);
        setVendors(vendorRes.parties);
      } catch (err) {
        toastApiError(err, "Failed to load dropdown data");
      } finally {
        setLoadingDropdowns(false);
      }
    }
    load();
    fetchList();
  }, []);

  /* ── fetch ──────────────────────────────────────────────── */

  async function fetchList() {
    setLoadingList(true);
    try {
      const data = await getContracts26(2026);
      setRows(data.filter((r) => r.deleted === 0).sort((a, b) => b.id - a.id));
    } catch (err) {
      toastApiError(err, "Failed to load contracts list");
    } finally {
      setLoadingList(false);
    }
  }

  /* ── computed ─────────────────────────────────────────────── */

  const rowsWithSearch = useMemo(() => {
    return rows.map((r) => {
      const searchStr = [
        r.po_number,
        r.product_code,
        r.product_name,
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
        .toLowerCase();
      return { ...r, searchStr };
    });
  }, [rows]);

  const productOptions = useMemo(() => [...new Set(rows.map((r) => r.product_code).filter(Boolean))].sort(), [rows]);
  const vendorOptions = useMemo(() => [...new Set(rows.map((r) => r.vendor_code).filter(Boolean))].sort(), [rows]);

  const filteredRows = useMemo(() => {
    let result = rowsWithSearch;

    if (filterProduct !== "all") result = result.filter((r) => r.product_code === filterProduct);
    if (filterVendor !== "all") result = result.filter((r) => r.vendor_code === filterVendor);
    if (filterStatus !== "all") result = result.filter((r) => r.status === filterStatus);
    if (filterCompleted !== "all") result = result.filter((r) => String(r.Completed) === filterCompleted);
    if (filterPoDateFrom) result = result.filter((r) => (r.po_date ?? "") >= filterPoDateFrom);
    if (filterPoDateTo) result = result.filter((r) => (r.po_date ?? "") <= filterPoDateTo);

    const q = search.trim().toLowerCase();
    if (q) result = result.filter((r) => r.searchStr.includes(q));

    return result;
  }, [rowsWithSearch, search, filterProduct, filterVendor, filterStatus, filterCompleted, filterPoDateFrom, filterPoDateTo]);

  const summary = useMemo(() => {
    let totalQty = 0;
    let totalValue = 0;
    let count = 0;
    for (const r of filteredRows) {
      const qty = Number(r.contract_qty) || 0;
      const val = Number(r.basic_amount) || Number(r.contract_total) || 0;
      totalQty += qty;
      totalValue += val;
      if (qty > 0) count++;
    }
    const avgRate = count > 0 ? totalValue / totalQty : 0;
    return { totalQty, totalValue, avgRate };
  }, [filteredRows]);

  const perPage = 20;
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / perPage));
  const paginated = filteredRows.slice((page - 1) * perPage, page * perPage);

  const totalValue =
    form.contract_qty && form.contract_rate
      ? Number(form.contract_qty) * Number(form.contract_rate)
      : 0;

  /* ── handlers ─────────────────────────────────────────────── */

  async function handleLoadingOpen() {
    setSelectedContractId(null);
    setSelectedProductCode("");
    setSelectedProductName("");
    setContractRate(0);
    setLoadQty("");
    setUnloadQty("");
    setLoadingError("");
    setLoadingOpen(true);
    setContractsListLoading(true);
    try {
      const list = await getContractsDropdown();
      setContractsList(list);
    } catch (err) {
      toastApiError(err, "Failed to load contracts");
    } finally {
      setContractsListLoading(false);
    }
  }

  async function handleContractSelect(idStr: string) {
    const id = Number(idStr);
    setSelectedContractId(id);
    setLoadQty("");
    setUnloadQty("");
    setContractDetailLoading(true);

    // Get product name from the list since detail API might not have it
    const contract = contractsList.find((c) => c.id === id);
    if (contract) {
      setSelectedProductCode(contract.product_code);
      setSelectedProductName(contract.product_name || contract.product_code);
    }

    try {
      const detail = await getContract26(id);
      setContractRate(Number(detail.contract_rate));
      // In case detail API has a more specific name, we can update it, but fallback is already set
      if (detail.product_name) {
        setSelectedProductName(detail.product_name);
      }
    } catch (err) {
      toastApiError(err, "Failed to load contract details");
    } finally {
      setContractDetailLoading(false);
    }
  }

  async function handleLoadingSubmit() {
    if (!selectedContractId) { setLoadingError("Please select a contract."); return; }
    if (!loadQty || Number(loadQty) <= 0) { setLoadingError("Load quantity must be > 0."); return; }
    if (!unloadQty || Number(unloadQty) <= 0) { setLoadingError("Unload quantity must be > 0."); return; }
    if (Number(unloadQty) > Number(loadQty)) { setLoadingError("Unload quantity cannot be greater than load quantity."); return; }
    setLoadingSaving(true);
    setLoadingError("");
    try {
      await submitLoadingForm(selectedContractId, {
        load_qty: Number(loadQty),
        unload_qty: Number(unloadQty),
      });
      toast.success("Loading details saved successfully.");
      setLoadingOpen(false);
      fetchList();
    } catch (err) {
      toastApiError(err, "Failed to save loading details");
    } finally {
      setLoadingSaving(false);
    }
  }

  async function handleFreightOpen() {
    setFreightContractId(null);
    setFreightUnloadQty("");
    setTransporterCode("");
    setTransporterName("");
    setVehicleNumber("");
    setBiltyNumber("");
    setBiltyDate("");
    setFreightRate("");
    setBrokerageAmount("");
    setGrpoNumber("");
    setGrpoDate("");
    setInvoiceNumber("");
    setFreightError("");
    setFreightOpen(true);
    setContractsListLoading(true);
    try {
      const list = await getContractsDropdown();
      setContractsList(list);
    } catch (err) {
      toastApiError(err, "Failed to load contracts");
    } finally {
      setContractsListLoading(false);
    }
  }

  async function handleFreightContractSelect(idStr: string) {
    const id = Number(idStr);
    setFreightContractId(id);
    setFreightUnloadQty("");
    setContractDetailLoading(true);

    const contract = contractsList.find((c) => c.id === id);
    if (contract) {
      setSelectedProductCode(contract.product_code);
      setSelectedProductName(contract.product_name || contract.product_code);
    }

    try {
      const detail = await getContract26(id);
      if (detail.product_name) {
        setSelectedProductName(detail.product_name);
      }
      setFreightUnloadQty(detail.unload_qty || "0");
      setTransporterCode(detail.transporter_code || "");
      setTransporterName(detail.transporter_name || "");
      setVehicleNumber(detail.vehicle_number || "");
      setBiltyNumber(detail.bility_number || "");
      setBiltyDate(detail.bility_date || "");
      setFreightRate(detail.frieght_rate || ""); // Use spelling 'frieght_rate' as in provided API example
      setBrokerageAmount(detail.brokerage_amount || "");
      setGrpoNumber(detail.grpo_number || "");
      setGrpoDate(detail.grpo_date || "");
      setInvoiceNumber(detail.invoice_number || "");
    } catch (err) {
      toastApiError(err, "Failed to load contract details");
    } finally {
      setContractDetailLoading(false);
    }
  }

  async function handleFreightSubmit() {
    if (!freightContractId) { setFreightError("Please select a contract."); return; }
    if (!transporterCode) { setFreightError("Please select a transporter."); return; }
    if (!vehicleNumber.trim()) { setFreightError("Vehicle number is required."); return; }
    if (!biltyNumber.trim()) { setFreightError("Bilty number is required."); return; }
    if (!biltyDate) { setFreightError("Bilty date is required."); return; }
    if (!freightRate || Number(freightRate) <= 0) { setFreightError("Freight rate must be > 0."); return; }

    setFreightSaving(true);
    setFreightError("");
    try {
      const payload: FreightPayload = {
        transporter_code: transporterCode,
        transporter_name: transporterName,
        vehicle_number: vehicleNumber,
        bility_number: biltyNumber,
        bility_date: biltyDate,
        freight_rate: Number(freightRate),
        brokerage_amount: Number(brokerageAmount) || 0,
        invoice_number: invoiceNumber,
        grpo_number: grpoNumber,
        grpo_date: grpoDate,
      };
      await submitFreightForm(freightContractId, payload);
      toast.success("Freight details saved successfully.");
      setFreightOpen(false);
      fetchList();
    } catch (err) {
      toastApiError(err, "Failed to save freight details");
    } finally {
      setFreightSaving(false);
    }
  }

  function handleContractOpen() {
    setForm(emptyContractForm);
    setFormError("");
    setContractOpen(true);
  }

  async function handleContractSubmit() {
    if (!form.status) { setFormError("Please select a status."); return; }
    if (!form.product_code) { setFormError("Please select a product."); return; }
    if (!form.vendor_code) { setFormError("Please select a vendor."); return; }
    if (!form.po_number.trim()) { setFormError("PO number is required."); return; }
    if (!form.po_date) { setFormError("Please select a PO date."); return; }
    if (!form.contract_qty || Number(form.contract_qty) <= 0) { setFormError("Contract quantity must be > 0."); return; }
    if (!form.contract_rate || Number(form.contract_rate) <= 0) { setFormError("Contract rate must be > 0."); return; }

    setSaving(true);
    setFormError("");
    try {
      await createContract26(form);
      toast.success("Contract created successfully.");
      setContractOpen(false);
      fetchList();
    } catch (err) {
      toastApiError(err, "Failed to create contract");
    } finally {
      setSaving(false);
    }
  }

  /* ── render ───────────────────────────────────────────────── */

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-6 animate-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Domestic Contracts (2026-2027)</h1>
          <p className="text-sm text-muted-foreground">Manage contracts, loading, and freight details</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={handleContractOpen} size="sm" className="btn-press">
            <Plus className="h-4 w-4 mr-2" /> New Contract
          </Button>
          <Button onClick={handleLoadingOpen} variant="outline" size="sm">
            <Truck className="h-4 w-4 mr-2" /> Loading Form
          </Button>
          <Button onClick={handleFreightOpen} variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-2" /> Freight Detail
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <SummaryCard
          icon={Scale}
          label="Total Quantity"
          value={loadingList ? "" : `${summary.totalQty.toLocaleString("en-IN", { maximumFractionDigits: 0 })} MTS`}
          loading={loadingList}
        />
        <SummaryCard
          icon={IndianRupee}
          label="Total Basic Amount"
          value={loadingList ? "" : `₹ ${summary.totalValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
          loading={loadingList}
        />
        <SummaryCard
          icon={TrendingUp}
          label="Average Rate"
          value={loadingList ? "" : `₹ ${summary.avgRate.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/MTS`}
          loading={loadingList}
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
              <Label className="text-xs text-muted-foreground shrink-0">PO Date</Label>
              <DatePicker
                value={filterPoDateFrom}
                onChange={(v) => { setFilterPoDateFrom(v); setPage(1); }}
                placeholder="From"
                className="h-9 w-[150px]"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <DatePicker
                value={filterPoDateTo}
                onChange={(v) => { setFilterPoDateTo(v); setPage(1); }}
                placeholder="To"
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

            <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(1); }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {STATUS_CHOICES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterCompleted} onValueChange={(v) => { setFilterCompleted(v); setPage(1); }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Completion" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="1">Completed</SelectItem>
                <SelectItem value="0">Pending</SelectItem>
              </SelectContent>
            </Select>

            {(filterPoDateFrom || filterPoDateTo || filterProduct !== "all" || filterVendor !== "all" || filterStatus !== "all" || filterCompleted !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => { setFilterPoDateFrom(""); setFilterPoDateTo(""); setFilterProduct("all"); setFilterVendor("all"); setFilterStatus("all"); setFilterCompleted("all"); setPage(1); }}
              >
                <X className="h-3 w-3 mr-1" />
                Clear filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingList ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {["PO Number", "PO Date", "Product", "Vendor", "Qty (MTS)", "Rate (₹)", "Status", "Completion", "Actions"].map((h) => (
                      <TableHead key={h}>{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 9 }).map((_, j) => (
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
                    <TableHead>Product</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Qty (MTS)</TableHead>
                    <TableHead>Rate (₹)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Completion</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="py-16">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <FileCheck className="h-10 w-10 stroke-1" />
                          <p className="text-sm font-medium">No contracts found</p>
                          <p className="text-xs">{search.trim() || filterPoDateFrom || filterPoDateTo || filterProduct !== "all" || filterVendor !== "all" || filterStatus !== "all" || filterCompleted !== "all" ? "No contracts match your search or filters." : "No contracts available."}</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginated.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.po_number}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{fmtDate(row.po_date)}</TableCell>
                        <TableCell className="max-w-[150px] truncate" title={row.product_name || row.product_code}>
                          {row.product_name || row.product_code}
                        </TableCell>
                        <TableCell>{row.vendor_code}</TableCell>
                        <TableCell>{fmtDecimal(row.contract_qty)}</TableCell>
                        <TableCell>₹{Number(row.contract_rate).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{row.status}</Badge>
                        </TableCell>
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
          {!loadingList && (
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

      {/* ── New Contract Dialog ───────────────────────────────── */}
      <Dialog open={contractOpen} onOpenChange={setContractOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-primary" />
              New Contract
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-1">

            {/* ── Contract Information ───────────────────────── */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-primary" />
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Contract Information</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                {/* Status */}
                <div className="space-y-1.5">
                  <Label htmlFor="status">Status <span className="text-destructive">*</span></Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}
                  >
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_CHOICES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Product */}
                <div className="space-y-1.5">
                  <Label htmlFor="product_code">Product <span className="text-destructive">*</span></Label>
                  <Select
                    value={form.product_code}
                    onValueChange={(v) => setForm((f) => ({ ...f, product_code: v }))}
                    disabled={loadingDropdowns}
                  >
                    <SelectTrigger id="product_code">
                      <SelectValue placeholder={loadingDropdowns ? "Loading..." : "Select product"} />
                    </SelectTrigger>
                    <SelectContent>
                      {rmItems.map((item) => (
                        <SelectItem key={item.item_code} value={item.item_code}>
                          <span className="font-mono text-sm text-foreground mr-2">{item.item_code}</span>
                          {item.item_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* ── Vendor Details ─────────────────────────────── */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-primary" />
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Vendor Details</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                {/* Vendor */}
                <div className="space-y-1.5">
                  <Label htmlFor="vendor_code">Vendor <span className="text-destructive">*</span></Label>
                  <Select
                    value={form.vendor_code}
                    onValueChange={(v) => setForm((f) => ({ ...f, vendor_code: v }))}
                    disabled={loadingDropdowns}
                  >
                    <SelectTrigger id="vendor_code">
                      <SelectValue placeholder={loadingDropdowns ? "Loading..." : "Select vendor"} />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors.map((v) => (
                        <SelectItem key={v.card_code} value={v.card_code}>
                          <span className="font-mono text-sm text-foreground mr-2">{v.card_code}</span>
                          {v.card_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* PO Number */}
                <div className="space-y-1.5">
                  <Label htmlFor="po_number">PO Number <span className="text-destructive">*</span></Label>
                  <Input
                    id="po_number"
                    placeholder="e.g. PO-10234"
                    value={form.po_number}
                    onChange={(e) => setForm((f) => ({ ...f, po_number: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* ── Contract Details ───────────────────────────── */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-primary" />
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Contract Details</p>
              </div>

              {/* PO Date */}
              <div className="space-y-1.5">
                <Label>PO Date <span className="text-destructive">*</span></Label>
                <DatePicker
                  value={form.po_date}
                  onChange={(v) => setForm((f) => ({ ...f, po_date: v }))}
                  placeholder="Pick date"
                  className="w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 items-start">
                {/* Contract Quantity */}
                <div className="space-y-1.5">
                  <Label htmlFor="contract_qty">Contract Qty <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <Input
                      id="contract_qty"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="pr-14"
                      value={form.contract_qty || ""}
                      onChange={(e) => setForm((f) => ({ ...f, contract_qty: Number(e.target.value) }))}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">MTS</span>
                  </div>
                </div>

                {/* Contract Rate */}
                <div className="space-y-1.5">
                  <Label htmlFor="contract_rate">Contract Rate <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <Input
                      id="contract_rate"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="pr-16"
                      value={form.contract_rate || ""}
                      onChange={(e) => setForm((f) => ({ ...f, contract_rate: Number(e.target.value) }))}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">₹/MTS</span>
                  </div>
                </div>
              </div>

              {/* Total Value */}
              {totalValue > 0 && (
                <div className="flex items-center justify-between rounded-xl border bg-muted/40 px-4 py-3">
                  <span className="text-sm font-medium text-muted-foreground">Total Contract Value</span>
                  <span className="text-lg font-bold text-primary">₹ {fmtDecimal(totalValue)}</span>
                </div>
              )}
            </div>

            {/* Error */}
            {formError && (
              <p className="text-sm text-destructive font-medium">{formError}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setContractOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleContractSubmit} disabled={saving} className="btn-press">
              {saving ? "Creating..." : "Create Contract"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Loading Form Dialog ───────────────────────────────── */}
      <Dialog open={loadingOpen} onOpenChange={setLoadingOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-amber-500" />
              Loading Form
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-1">

            {/* ── Contract Selection ─────────────────────────── */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-amber-500" />
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Contract Selection</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                <div className="space-y-1.5">
                  <Label>Select Contract <span className="text-destructive">*</span></Label>
                  <Select
                    value={selectedContractId ? String(selectedContractId) : ""}
                    onValueChange={handleContractSelect}
                    disabled={contractsListLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={contractsListLoading ? "Loading..." : "Select contract"} />
                    </SelectTrigger>
                    <SelectContent>
                      {contractsList.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          <span className="font-mono text-sm text-foreground mr-2">#{c.id}</span>
                          {c.po_number} — {c.product_name || c.product_code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Product Name</Label>
                  <Input
                    value={contractDetailLoading ? "Loading..." : selectedProductName || selectedProductCode}
                    readOnly
                    className="bg-muted/50 text-muted-foreground cursor-not-allowed"
                    placeholder="Auto-filled on contract selection"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* ── Loading Details ────────────────────────────── */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-amber-500" />
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Loading Details</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
                <div className="space-y-1.5">
                  <Label htmlFor="load_qty">Load Quantity <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <Input
                      id="load_qty"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="pr-14"
                      value={loadQty}
                      onChange={(e) => setLoadQty(e.target.value)}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">MTS</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Loading Rate</Label>
                  <div className="relative">
                    <Input
                      value={contractRate ? fmtDecimal(contractRate) : "—"}
                      readOnly
                      className="bg-muted/50 text-muted-foreground cursor-not-allowed pr-16"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">₹/MTS</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Basic Amount</Label>
                  <div className="relative">
                    <Input
                      value={loadQty && contractRate ? fmtDecimal(Number(loadQty) * contractRate) : "—"}
                      readOnly
                      className="bg-muted/50 text-muted-foreground cursor-not-allowed font-semibold pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">₹</span>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* ── Unloading Details ──────────────────────────── */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-amber-500" />
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Unloading Details</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
                <div className="space-y-1.5">
                  <Label htmlFor="unload_qty">Unload Quantity <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <Input
                      id="unload_qty"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className={`pr-14 ${unloadQty && loadQty && Number(unloadQty) > Number(loadQty) ? "border-destructive focus-visible:ring-destructive" : ""}`}
                      value={unloadQty}
                      onChange={(e) => setUnloadQty(e.target.value)}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">MTS</span>
                  </div>
                  {unloadQty && loadQty && Number(unloadQty) > Number(loadQty) && (
                    <p className="text-xs text-destructive mt-1">Cannot exceed load quantity ({loadQty} MTS)</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label>Shortage</Label>
                  <div className="relative">
                    <Input
                      value={loadQty && unloadQty ? fmtDecimal(Math.max(0, Number(loadQty) - Number(unloadQty)) * 1000) : "—"}
                      readOnly
                      className="bg-muted/50 text-muted-foreground cursor-not-allowed pr-10"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">KG</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Shortage Allowance</Label>
                  <div className="relative">
                    <Input
                      value={loadQty ? fmtDecimal(Number(loadQty) * 0.0025 * 1000) : "—"}
                      readOnly
                      className="bg-muted/50 text-muted-foreground cursor-not-allowed pr-10"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">KG</span>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* ── Deduction Details ──────────────────────────── */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-amber-500" />
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Deduction Details</p>
              </div>

              {(() => {
                const load = Number(loadQty) || 0;
                const unload = Number(unloadQty) || 0;
                const shortage = Math.max(0, load - unload) * 1000;
                const allowShortage = load * 0.0025 * 1000;
                const deductionQty = Math.max(0, shortage - allowShortage);
                const deductionAmt = contractRate ? (deductionQty / 1000) * contractRate : 0;

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                    <div className="space-y-1.5">
                      <Label>Deduction Quantity</Label>
                      <div className="relative">
                        <Input
                          value={loadQty && unloadQty ? fmtDecimal(deductionQty) : "—"}
                          readOnly
                          className="bg-muted/50 text-muted-foreground cursor-not-allowed pr-10"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">KG</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Deduction Amount</Label>
                      <div className="relative">
                        <Input
                          value={loadQty && unloadQty && contractRate ? fmtDecimal(deductionAmt) : "—"}
                          readOnly
                          className="bg-muted/50 text-muted-foreground cursor-not-allowed pr-8"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">₹</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {loadingError && (
              <p className="text-sm text-destructive font-medium">{loadingError}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setLoadingOpen(false)} disabled={loadingSaving}>
              Cancel
            </Button>
            <Button
              onClick={handleLoadingSubmit}
              disabled={loadingSaving || !selectedContractId}
              className="btn-press"
            >
              {loadingSaving ? "Saving..." : "Save Loading Details"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Freight Detail Dialog ──────────────────────── */}
      <Dialog open={freightOpen} onOpenChange={setFreightOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-500" />
              Freight Detail
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-1">

            {/* ── Contract Selection ─────────────────────────── */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-emerald-500" />
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Contract Selection</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
                <div className="space-y-1.5">
                  <Label>Select Contract <span className="text-destructive">*</span></Label>
                  <Select
                    value={freightContractId ? String(freightContractId) : ""}
                    onValueChange={handleFreightContractSelect}
                    disabled={contractsListLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={contractsListLoading ? "Loading..." : "Select contract"} />
                    </SelectTrigger>
                    <SelectContent>
                      {contractsList.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          <span className="font-mono text-sm text-foreground mr-2">#{c.id}</span>
                          {c.po_number} — {c.product_name || c.product_code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Product Name</Label>
                  <Input
                    value={contractDetailLoading ? "Loading..." : selectedProductName || selectedProductCode}
                    readOnly
                    className="bg-muted/50 text-muted-foreground cursor-not-allowed"
                    placeholder="Auto-filled"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Unload Quantity</Label>
                  <div className="relative">
                    <Input
                      value={contractDetailLoading ? "Loading..." : freightUnloadQty || "—"}
                      readOnly
                      className="bg-muted/50 text-muted-foreground cursor-not-allowed pr-14"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">MTS</span>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* ── Transporter Details ────────────────────────── */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-emerald-500" />
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Transporter Details</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                <div className="space-y-1.5">
                  <Label>Transporter Name <span className="text-destructive">*</span></Label>
                  <Select
                    value={transporterCode}
                    onValueChange={(v) => {
                      setTransporterCode(v);
                      const vendor = vendors.find(vend => vend.card_code === v);
                      if (vendor) setTransporterName(vendor.card_name);
                    }}
                    disabled={loadingDropdowns}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={loadingDropdowns ? "Loading..." : "Select Transporter"} />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors.map((v) => (
                        <SelectItem key={v.card_code} value={v.card_code}>
                          {v.card_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="vehicle_number">Vehicle Number <span className="text-destructive">*</span></Label>
                  <Input
                    id="vehicle_number"
                    placeholder="e.g. RJ14GC1234"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* ── Bilty Details ─────────────────────────────── */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-emerald-500" />
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Bilty Details</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                <div className="space-y-1.5">
                  <Label htmlFor="bilty_number">Bilty Number <span className="text-destructive">*</span></Label>
                  <Input
                    id="bilty_number"
                    placeholder="Enter Bilty Number"
                    value={biltyNumber}
                    onChange={(e) => setBiltyNumber(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Bilty Date <span className="text-destructive">*</span></Label>
                  <DatePicker
                    value={biltyDate}
                    onChange={(v) => setBiltyDate(v)}
                    placeholder="Pick date"
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* ── Freight Details ───────────────────────────── */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-emerald-500" />
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Freight Details</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
                <div className="space-y-1.5">
                  <Label htmlFor="freight_rate">Freight Rate <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <Input
                      id="freight_rate"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={freightRate}
                      onChange={(e) => setFreightRate(e.target.value)}
                      className="pr-16"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">₹/MTS</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Freight Amount</Label>
                  <div className="relative">
                    <Input
                      value={freightUnloadQty && freightRate ? fmtDecimal(Number(freightUnloadQty) * Number(freightRate)) : "—"}
                      readOnly
                      className="bg-muted/50 text-muted-foreground cursor-not-allowed pr-8 font-semibold"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">₹</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="brokerage_amount">Brokerage Amount</Label>
                  <div className="relative">
                    <Input
                      id="brokerage_amount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={brokerageAmount}
                      onChange={(e) => setBrokerageAmount(e.target.value)}
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">₹</span>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* ── GRPO & Invoice Details ────────────────────── */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-emerald-500" />
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">GRPO & Invoice Details</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
                <div className="space-y-1.5">
                  <Label htmlFor="grpo_number">GRPO Number</Label>
                  <Input
                    id="grpo_number"
                    placeholder="Enter GRPO Number"
                    value={grpoNumber}
                    onChange={(e) => setGrpoNumber(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>GRPO Date</Label>
                  <DatePicker
                    value={grpoDate}
                    onChange={(v) => setGrpoDate(v)}
                    placeholder="Pick date"
                    className="w-full"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="invoice_number">Invoice Number</Label>
                  <Input
                    id="invoice_number"
                    placeholder="Enter Invoice Number"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {freightError && (
              <p className="text-sm text-destructive font-medium">{freightError}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFreightOpen(false)} disabled={freightSaving}>
              Cancel
            </Button>
            <Button
              onClick={handleFreightSubmit}
              disabled={freightSaving || !freightContractId}
              className="btn-press"
            >
              {freightSaving ? "Saving..." : "Save Freight Details"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                  <div><p className="text-xs text-muted-foreground">Product</p><p className="text-sm font-medium">{viewData.product_name || viewData.product_code}</p></div>
                  <div><p className="text-xs text-muted-foreground">Vendor Code</p><p className="text-sm font-medium">{viewData.vendor_code}</p></div>
                  <div><p className="text-xs text-muted-foreground">Invoice Number</p><p className="text-sm font-medium">{viewData.invoice_number || "—"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Contract Qty</p><p className="text-sm font-medium">{fmtDecimal(viewData.contract_qty || 0)} MTS</p></div>
                  <div><p className="text-xs text-muted-foreground">Contract Rate</p><p className="text-sm font-medium">₹ {fmtDecimal(viewData.contract_rate || 0)}/MTS</p></div>
                  <div className="col-span-2"><p className="text-xs text-muted-foreground">Basic Amount</p><p className="text-base font-semibold">₹ {fmtDecimal(viewData.basic_amount || viewData.contract_total || 0)}</p></div>
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
                  <div><p className="text-xs text-muted-foreground">Load Qty</p><p className="text-sm font-medium">{fmtDecimal(viewData.load_qty || 0)} MTS</p></div>
                  <div><p className="text-xs text-muted-foreground">Unload Qty</p><p className="text-sm font-medium">{fmtDecimal(viewData.unload_qty || 0)} MTS</p></div>
                  <div><p className="text-xs text-muted-foreground">Shortage</p><p className="text-sm font-medium">{fmtDecimal(viewData.shortage || 0)} KG</p></div>
                  <div><p className="text-xs text-muted-foreground">Allow Shortage</p><p className="text-sm font-medium">{fmtDecimal(viewData.allow_shortage || 0)} KG</p></div>
                  <div><p className="text-xs text-muted-foreground">Deduction Qty</p><p className="text-sm font-medium">{fmtDecimal(viewData.deduction_qty || 0)} KG</p></div>
                  <div><p className="text-xs text-muted-foreground">Deduct Amount</p><p className="text-sm font-medium">₹ {fmtDecimal(viewData.deduction_amount || 0)}</p></div>
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
                  <div className="col-span-2"><p className="text-xs text-muted-foreground">Transporter</p><p className="text-sm font-medium">{viewData.transporter_name || "—"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Vehicle Number</p><p className="text-sm font-medium">{viewData.vehicle_number || "—"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Bilty Number</p><p className="text-sm font-medium">{viewData.bility_number || "—"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Bilty Date</p><p className="text-sm font-medium">{fmtDate(viewData.bility_date || null)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Freight Rate</p><p className="text-sm font-medium">₹ {fmtDecimal(viewData.frieght_rate || 0)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Freight Amount</p><p className="text-sm font-medium text-emerald-600">₹ {fmtDecimal(viewData.freight_amount || 0)}</p></div>
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
                  <div><p className="text-xs text-muted-foreground">GRPO Date</p><p className="text-sm font-medium">{fmtDate(viewData.grpo_date || null)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Brokerage Rate</p><p className="text-sm font-medium">₹ {fmtDecimal(viewData.brokerage_rate || 0)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Brokerage Amount</p><p className="text-sm font-medium">₹ {fmtDecimal(viewData.brokerage_amount || 0)}</p></div>
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

