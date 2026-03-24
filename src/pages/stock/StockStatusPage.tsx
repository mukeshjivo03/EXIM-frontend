import { useEffect, useMemo, useRef, useState } from "react";
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
  MapPin,
  Clock,
  CheckCircle2,
  Ship,
  Anchor,
  Factory,
  Warehouse,
} from "lucide-react";

import {
  getStockStatuses,
  getStockStatus,
  getStockSummary,
  getStockInsights,
  createStockStatus,
  updateStockStatus,
  softDeleteStockStatus,
  moveStock,
  dispatchStock,
  arriveBatch,
  STATUS_CHOICES,
  type StockStatus,
  type StockStatusChoice,
  type StockStatusFilters,
  type StockInsightsSummary,
} from "@/api/stockStatus";
import { getVendors, type Vendor } from "@/api/sapSync";
import { getTankItems, type TankItem } from "@/api/tank";
import { useAuth } from "@/context/AuthContext";
import { fmtDateTime, fmtNum } from "@/lib/formatters";
import { getErrorMessage, toastApiError } from "@/lib/errors";
import { SummaryCard } from "@/components/SummaryCard";
import { Pagination } from "@/components/Pagination";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

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

function getEtaCountdown(eta: string) {
  if (!eta) return null;
  const target = new Date(eta);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return { text: "Today", variant: "warning" as const };
  if (diffDays === 1) return { text: "Tomorrow", variant: "info" as const };
  if (diffDays > 1) return { text: `In ${diffDays} days`, variant: "default" as const };
  return { text: `${Math.abs(diffDays)} days ago`, variant: "muted" as const };
}

/* ── Status Timeline Component ────────────────────────────── */

const JOURNEY_STEPS: { status: StockStatusChoice; label: string; icon: any }[] = [
  { status: "IN_CONTRACT", label: "Contract", icon: FileText },
  { status: "ON_THE_SEA", label: "Sea", icon: Ship },
  { status: "MUNDRA_PORT", label: "Port", icon: Anchor },
  { status: "ON_THE_WAY", label: "Transit", icon: Truck },
  { status: "AT_REFINERY", label: "Refinery", icon: Factory },
  { status: "UNDER_LOADING", label: "Underloading", icon: Package },
  { status: "OTW_TO_REFINERY", label: "OTW", icon: Truck },
  { status: "OUT_SIDE_FACTORY", label: "Outside Factory", icon: Truck },
  { status: "KANDLA_STORAGE", label: "Tank", icon: Warehouse },
];

function StatusTimeline({ currentStatus }: { currentStatus: string }) {
  const currentIndex = JOURNEY_STEPS.findIndex((s) => s.status === currentStatus);
  const activeIndex = currentIndex === -1 ? 0 : currentIndex;

  return (
    <div className="py-6 overflow-x-auto">
      <div className="flex items-center min-w-[700px] px-4">
        {JOURNEY_STEPS.map((step, idx) => {
          const isCompleted = idx < activeIndex;
          const isActive = idx === activeIndex;
          const Icon = step.icon;

          return (
            <div key={step.status} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-2 relative">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-500 z-10 bg-background",
                    isCompleted
                      ? "border-primary bg-primary text-primary-foreground"
                      : isActive
                      ? "border-primary text-primary shadow-[0_0_10px_rgba(var(--primary),0.3)] animate-pulse"
                      : "border-muted text-muted-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-wider absolute -bottom-5 whitespace-nowrap",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>
              {idx < JOURNEY_STEPS.length - 1 && (
                <div className="flex-1 h-[2px] mx-2 bg-muted relative overflow-hidden">
                  <div
                    className={cn(
                      "absolute inset-0 bg-primary transition-all duration-1000 origin-left",
                      idx < activeIndex ? "scale-x-100" : "scale-x-0"
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── component ────────────────────────────────────────────── */

export default function StockStatusPage() {
  const { email } = useAuth();

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

  // create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [cItemCode, setCItemCode] = useState("");
  const [cItemSearch, setCItemSearch] = useState("");
  const [cItemOpen, setCItemOpen] = useState(false);
  const cItemRef = useRef<HTMLDivElement>(null);
  const [cStatus, setCStatus] = useState<StockStatusChoice>("PENDING");
  const [cVendorCode, setCVendorCode] = useState("");
  const [cVendorSearch, setCVendorSearch] = useState("");
  const [cVendorOpen, setCVendorOpen] = useState(false);
  const cVendorRef = useRef<HTMLDivElement>(null);
  const [cRate, setCRate] = useState("");
  const [cQuantity, setCQuantity] = useState("");
  const [cVehicleNumber, setCVehicleNumber] = useState("");
  const [cLocation, setCLocation] = useState("");
  const [cEta, setCEta] = useState("");
  const [cTransporterName, setCTransporterName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // view sheet
  const [viewData, setViewData] = useState<StockStatus | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  // edit dialog
  const [editData, setEditData] = useState<StockStatus | null>(null);
  const [eStatus, setEStatus] = useState<StockStatusChoice>("PENDING");
  const [eRate, setERate] = useState("");
  const [eQuantity, setEQuantity] = useState("");
  const [eVehicleNumber, setEVehicleNumber] = useState("");
  const [eLocation, setELocation] = useState("");
  const [eEta, setEEta] = useState("");
  const [eTransporterName, setETransporterName] = useState("");
  const [eTransferType, setETransferType] = useState<"bulk" | "batch" | "">("");
  const [eAction, setEAction] = useState<"RETAIN" | "TOLERATE" | "DEBIT" | "">("");
  const [editing, setEditing] = useState(false);

  // delete
  const [deleteData, setDeleteData] = useState<StockStatus | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Bulk Actions
  const [bulkProcessing, setBulkProcessing] = useState(false);

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
      const STATUS_ORDER: Record<string, number> = {
        OUT_SIDE_FACTORY: 0, ON_THE_WAY: 1, AT_REFINERY: 2, OTW_TO_REFINERY: 3,
        MUNDRA_PORT: 4, ON_THE_SEA: 5, IN_CONTRACT: 6, IN_TANK: 7,
        DELIVERED: 8, IN_TRANSIT: 9, PENDING: 10, PROCESSING: 11,
      };
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
      setSelectedIds(new Set()); // Reset selection
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
      await fetchList(currentFilters());
    } catch (err) {
      toastApiError(err, "Failed to complete bulk delete.");
    } finally {
      setBulkProcessing(false);
    }
  }

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

  // click-outside to close omnisearch dropdowns
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (cItemRef.current && !cItemRef.current.contains(e.target as Node)) setCItemOpen(false);
      if (cVendorRef.current && !cVendorRef.current.contains(e.target as Node)) setCVendorOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filteredItems = useMemo(() => {
    const q = cItemSearch.toLowerCase();
    if (!q) return tankItems;
    return tankItems.filter(
      (i) => i.tank_item_code.toLowerCase().includes(q) || i.tank_item_name.toLowerCase().includes(q)
    );
  }, [tankItems, cItemSearch]);

  const filteredVendors = useMemo(() => {
    const q = cVendorSearch.toLowerCase();
    if (!q) return vendors;
    return vendors.filter(
      (v) => v.card_code.toLowerCase().includes(q) || v.card_name.toLowerCase().includes(q)
    );
  }, [vendors, cVendorSearch]);

  /* ── create ──────────────────────────────────────────────── */

  async function openCreate() {
    setCItemCode("");
    setCItemSearch("");
    setCItemOpen(false);
    setCStatus("PENDING");
    setCVendorCode("");
    setCVendorSearch("");
    setCVendorOpen(false);
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
    setERate(row.rate);
    setEQuantity(row.quantity);
    setEVehicleNumber(row.vehicle_number ?? "");
    setELocation(row.location ?? "");
    setEEta(row.eta ?? "");
    setETransporterName(row.transporter_name ?? "");
    setETransferType("");
    setEAction("");
    await loadDropdowns();
  }

  async function handleEdit() {
    if (!editData) return;
    if (!eRate.trim() || !eQuantity.trim()) {
      toast.error("Rate and quantity are required.");
      return;
    }

    const newQty = Number(eQuantity.trim());
    if (newQty <= 0) {
      toast.error("Quantity must be greater than 0.");
      return;
    }

    if (eStatus !== editData.status) {
      if (eStatus !== "AT_REFINERY" && !eTransferType) {
        toast.error("Please select a Transfer Type.");
        return;
      }
      if (!eAction) {
        toast.error("Please select an Action.");
        return;
      }
    }

    setEditing(true);
    try {
      if (eStatus !== editData.status) {
        if (eStatus === "AT_REFINERY") {
          await arriveBatch({
            stock_id: editData.id,
            weighed_qty: newQty,
            destination_status: eStatus,
            action: eAction,
            created_by: email ?? "SYSTEM",
          });
          toast.success("Stock arrived (Arrive Batch).");
        } else if (eTransferType === "bulk") {
          await moveStock({
            stock_id: editData.id,
            new_quantity: newQty,
            new_status: eStatus,
            action: eAction,
            created_by: email ?? "SYSTEM",
          });
          toast.success("Stock moved (Bulk).");
        } else if (eTransferType === "batch") {
          await dispatchStock({
            stock_id: editData.id,
            quantity: newQty,
            destination_status: eStatus,
            action: eAction,
            created_by: email ?? "SYSTEM",
          });
          toast.success("Stock dispatched (Batch).");
        }
      } else {
        // Just updating other fields (metadata) - normal PUT
        await updateStockStatus(editData.id, {
          rate: eRate.trim(),
          quantity: eQuantity.trim(),
          vehicle_number: eVehicleNumber.trim() || undefined,
          location: eLocation.trim() || undefined,
          eta: eEta.trim() || undefined,
          transporter_name: eTransporterName.trim() || undefined,
        });
        toast.success("Stock status metadata updated.");
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
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 animate-page relative pb-20">
      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-primary text-primary-foreground px-6 py-3 rounded-full shadow-2xl flex items-center gap-6 border border-primary/20 backdrop-blur-md">
            <span className="text-sm font-bold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              {selectedIds.size} Selected
            </span>
            <Separator orientation="vertical" className="h-6 bg-primary-foreground/20" />
            <div className="flex gap-2">
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Stock Status</h1>
          <p className="text-sm text-muted-foreground">
            Track and manage stock statuses
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={openCreate} className="btn-press gap-2 shadow-sm">
            <Plus className="h-4 w-4" />
            Add Stock Status
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Stock Status Summary */}
      <div>
        <h2 className="text-base font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          Stock Status Summary
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-5">
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
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-5">
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Stock Statuses</CardTitle>
              <CardDescription>{rows.length} records</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Qty (KG)</TableHead>
                    <TableHead>Total (&#8377;)</TableHead>
                    <TableHead>ETA</TableHead>
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
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-10 px-4">
                      <Checkbox
                        checked={selectedIds.size === paginated.length && paginated.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Qty (KG)</TableHead>
                    <TableHead>Total (&#8377;)</TableHead>
                    <TableHead>ETA</TableHead>
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
                    paginated.map((row, idx) => {
                      const countdown = getEtaCountdown(row.eta ?? "");
                      const weightPercent = maxQty > 0 ? (Number(row.quantity) / maxQty) * 100 : 0;

                      return (
                        <TableRow key={row.id} className={cn(selectedIds.has(row.id) && "bg-primary/5")}>
                          <TableCell className="px-4">
                            <Checkbox
                              checked={selectedIds.has(row.id)}
                              onCheckedChange={() => toggleSelect(row.id)}
                            />
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {(page - 1) * perPage + idx + 1}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-bold">{row.item_code}</span>
                              <span className="text-[10px] text-muted-foreground uppercase tracking-tight">
                                {tankItems.find((i) => i.tank_item_code === row.item_code)?.tank_item_name ?? ""}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusBadgeVariant(row.status)} className="capitalize font-medium shadow-none">
                              {formatStatus(row.status).toLowerCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col max-w-[150px]">
                              <span className="truncate">{row.vendor_code}</span>
                              <span className="text-[10px] text-muted-foreground truncate uppercase">
                                {vendors.find((v) => v.card_code === row.vendor_code)?.card_name ?? ""}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="relative">
                            <div
                              className="absolute left-0 top-0 h-full bg-primary/10 transition-all duration-1000"
                              style={{ width: `${weightPercent}%` }}
                            />
                            <div className="relative z-10 flex flex-col">
                              <span className="font-bold">{Number(row.quantity).toLocaleString("en-IN")}</span>
                              <span className="text-[10px] text-muted-foreground">Rate: ₹{row.rate}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold text-primary">
                            ₹{Number(row.total).toLocaleString("en-IN")}
                          </TableCell>
                          <TableCell>
                            {countdown ? (
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
                          <TableCell className="text-right">
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
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEdit(row)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </div>
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
              <div className="relative" ref={cItemRef}>
                <Input
                  placeholder="Search item code..."
                  value={cItemSearch}
                  onChange={(e) => {
                    setCItemSearch(e.target.value);
                    setCItemOpen(true);
                    if (!e.target.value) setCItemCode("");
                  }}
                  onFocus={() => setCItemOpen(true)}
                />
                {cItemCode && !cItemOpen && (
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {cItemCode}
                    </Badge>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => { setCItemCode(""); setCItemSearch(""); }}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
                {cItemOpen && (
                  <div className="absolute z-50 mt-1 w-full max-h-48 overflow-auto rounded-md border bg-popover shadow-md">
                    {filteredItems.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">No items found</div>
                    ) : (
                      filteredItems.map((item) => (
                        <button
                          key={item.tank_item_code}
                          type="button"
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors ${cItemCode === item.tank_item_code ? "bg-accent font-medium" : ""}`}
                          onClick={() => {
                            setCItemCode(item.tank_item_code);
                            setCItemSearch(item.tank_item_code);
                            setCItemOpen(false);
                          }}
                        >
                          {item.tank_item_code}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
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
              <div className="relative" ref={cVendorRef}>
                <Input
                  placeholder="Search vendor code or name..."
                  value={cVendorSearch}
                  onChange={(e) => {
                    setCVendorSearch(e.target.value);
                    setCVendorOpen(true);
                    if (!e.target.value) setCVendorCode("");
                  }}
                  onFocus={() => setCVendorOpen(true)}
                />
                {cVendorCode && !cVendorOpen && (
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs whitespace-normal">
                      {cVendorCode} - {vendors.find((v) => v.card_code === cVendorCode)?.card_name}
                    </Badge>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground shrink-0"
                      onClick={() => { setCVendorCode(""); setCVendorSearch(""); }}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
                {cVendorOpen && (
                  <div className="absolute z-50 mt-1 w-full max-h-48 overflow-auto rounded-md border bg-popover shadow-md">
                    {filteredVendors.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">No vendors found</div>
                    ) : (
                      filteredVendors.map((v) => (
                        <button
                          key={v.card_code}
                          type="button"
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors whitespace-normal ${cVendorCode === v.card_code ? "bg-accent font-medium" : ""}`}
                          onClick={() => {
                            setCVendorCode(v.card_code);
                            setCVendorSearch(v.card_code + " - " + v.card_name);
                            setCVendorOpen(false);
                          }}
                        >
                          {v.card_code} - {v.card_name}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
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
                <DateInput
                  id="c-eta"
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

      {/* ── View Sheet ───────────────────────────────────────── */}
      <Sheet open={viewLoading || !!viewData} onOpenChange={() => setViewData(null)}>
        <SheetContent side="right" className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Stock Status Details
            </SheetTitle>
            <SheetDescription>
              {viewData ? `Detailed view of record #${viewData.id}` : "Loading record data..."}
            </SheetDescription>
          </SheetHeader>

          {viewLoading ? (
            <div className="space-y-6 p-6">
              <Skeleton className="h-32 w-full" />
              <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            </div>
          ) : viewData ? (
            <div className="space-y-8 p-6">
              {/* Journey Timeline */}
              <div className="bg-muted/30 rounded-xl p-4 border border-border/50 shadow-inner">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4 px-2">
                  Logistical Journey
                </h3>
                <StatusTimeline currentStatus={viewData.status} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Item Information */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b pb-2">
                    <Package className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-bold uppercase tracking-wider">Item Information</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-3 pl-2">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">Item Code</p>
                      <p className="text-sm font-semibold">{viewData.item_code}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">Item Name</p>
                      <p className="text-sm font-medium">
                        {tankItems.find((i) => i.tank_item_code === viewData.item_code)?.tank_item_name ?? "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">Status</p>
                      <Badge variant={statusBadgeVariant(viewData.status)} className="mt-0.5">
                        {formatStatus(viewData.status)}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Vendor Information */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b pb-2">
                    <Truck className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-bold uppercase tracking-wider">Vendor Information</h3>
                  </div>
                  {(() => {
                    const v = vendors.find((v) => v.card_code === viewData.vendor_code);
                    return (
                      <div className="grid grid-cols-1 gap-3 pl-2">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-muted-foreground">Vendor Code</p>
                          <p className="text-sm font-semibold">{viewData.vendor_code}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-muted-foreground">Vendor Name</p>
                          <p className="text-sm font-medium">{v?.card_name ?? "—"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-muted-foreground">Vendor Group</p>
                          <p className="text-sm font-medium">{v?.u_main_group ?? "—"}</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Pricing & Quantity */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b pb-2">
                    <IndianRupee className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-bold uppercase tracking-wider">Pricing Detail</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-3 pl-2">
                    <div className="flex justify-between items-center bg-muted/50 p-2 rounded-lg">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">Rate</span>
                      <span className="text-sm font-semibold">₹ {fmtNum(Number(viewData.rate))}</span>
                    </div>
                    <div className="flex justify-between items-center bg-muted/50 p-2 rounded-lg">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">Quantity</span>
                      <span className="text-sm font-semibold">{fmtNum(Number(viewData.quantity))} KG</span>
                    </div>
                    <div className="flex justify-between items-center bg-primary/5 p-2 rounded-lg border border-primary/10">
                      <span className="text-[10px] uppercase font-bold text-primary">Total Value</span>
                      <span className="text-base font-black text-primary">₹ {fmtNum(Number(viewData.total))}</span>
                    </div>
                  </div>
                </div>

                {/* Logistics */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b pb-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-bold uppercase tracking-wider">Logistics Info</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-3 pl-2">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">Vehicle / Transporter</p>
                      <p className="text-sm font-medium">{viewData.vehicle_number || "—"} / {viewData.transporter_name || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">Current Location</p>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{viewData.location || "—"}</p>
                        {viewData.location && (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(viewData.location)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:text-blue-600"
                          >
                            <MapPin className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">Estimated Arrival (ETA)</p>
                      <p className="text-sm font-medium">{viewData.eta ? fmtDateTime(viewData.eta) : "—"}</p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* metadata */}
              <div className="bg-muted/20 p-4 rounded-lg text-[10px] grid grid-cols-2 gap-4 text-muted-foreground uppercase tracking-widest font-bold">
                <div>Created By: <span className="text-foreground">{viewData.created_by}</span></div>
                <div>Created At: <span className="text-foreground">{fmtDateTime(viewData.created_at)}</span></div>
                <div>Record ID: <span className="text-foreground">#{viewData.id}</span></div>
              </div>
            </div>
          ) : null}

          <SheetFooter className="absolute bottom-0 left-0 w-full bg-background border-t p-6 flex flex-row items-center justify-between">
            <Button
              variant="destructive"
              className="gap-2 rounded-full"
              onClick={() => {
                if (viewData) {
                  setDeleteData(viewData);
                  setViewData(null);
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
              Delete Record
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" className="rounded-full px-6" onClick={() => setViewData(null)}>
                Close
              </Button>
              <Button
                className="rounded-full px-6 gap-2"
                onClick={() => {
                  if (viewData) {
                    openEdit(viewData);
                    setViewData(null);
                  }
                }}
              >
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

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
              <Select value={eStatus} onValueChange={(v) => {
                const s = v as StockStatusChoice;
                setEStatus(s);
                if (s !== editData?.status) {
                   if (s === "OUT_SIDE_FACTORY" || s === "ON_THE_WAY" || s === "MUNDRA_PORT") {
                     setETransferType("bulk");
                   } else if (s === "UNDER_LOADING" || s === "OTW_TO_REFINERY") {
                     setETransferType("batch");
                   } else {
                     setETransferType("");
                   }
                   
                   if (s === "MUNDRA_PORT") {
                     setEAction("TOLERATE");
                   } else {
                     setEAction("");
                   }
                }
              }}>
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

            {eStatus !== editData?.status && (
              <>
                {eStatus !== "AT_REFINERY" && 
                 eStatus !== "OUT_SIDE_FACTORY" && 
                 eStatus !== "ON_THE_WAY" && 
                 eStatus !== "MUNDRA_PORT" && 
                 eStatus !== "UNDER_LOADING" && 
                 eStatus !== "OTW_TO_REFINERY" && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <Label>Transfer Type *</Label>
                    <Select value={eTransferType} onValueChange={(v) => setETransferType(v as "bulk" | "batch")}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select transfer type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bulk">Bulk</SelectItem>
                        <SelectItem value="batch">Batch</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {(eTransferType || eStatus === "AT_REFINERY" || eStatus === "OUT_SIDE_FACTORY" || eStatus === "ON_THE_WAY" || eStatus === "MUNDRA_PORT" || eStatus === "UNDER_LOADING" || eStatus === "OTW_TO_REFINERY") && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <Label>Action *</Label>
                    <Select value={eAction} onValueChange={(v) => setEAction(v as any)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select action" />
                      </SelectTrigger>
                      <SelectContent>
                        {eStatus !== "OUT_SIDE_FACTORY" && <SelectItem value="RETAIN">Retain</SelectItem>}
                        <SelectItem value="TOLERATE">Tolerate</SelectItem>
                        <SelectItem value="DEBIT">Debit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}

            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="e-rate">Rate (&#8377;) *</Label>
                <Input
                  id="e-rate"
                  type="number"
                  min={0}
                  step="0.01"
                  value={eRate}
                  onChange={(e) => setERate(e.target.value)}
                />
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
                {editData && eQuantity && Number(eQuantity) !== Number(editData.quantity) && (
                  <p className={`text-xs font-medium mt-1.5 ${Number(editData.quantity) - Number(eQuantity) > 0 ? "text-emerald-600" : "text-destructive"}`}>
                    Difference: {Number(editData.quantity) - Number(eQuantity) > 0 ? "+" : ""}{fmtNum(Number(editData.quantity) - Number(eQuantity))} KG
                  </p>
                )}
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
                <DateInput
                  id="e-eta"
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
