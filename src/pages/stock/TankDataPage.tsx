import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  Plus,
  Container,
  Trash2,
  Gauge,
  Warehouse,
  Search,
  LayoutGrid,
  List,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowRightLeft,
  DatabaseZap,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getErrorMessage, toastApiError } from "@/lib/errors";
import { SummaryCard } from "@/components/SummaryCard";
import { fmtNum } from "@/lib/formatters";
import { Pagination } from "@/components/Pagination";
import { findPaletteColor } from "@/components/ColorPicker";

import {
  getTanks,
  createTank,
  deleteTank,
  getTankSummary,
  tankInward,
  tankOutward,
  tankTransfer,
  getSameTanks,
  updateTank,
  getTankItems,
  type Tank,
  type TankSummary,
  type TankItem,
} from "@/api/tank";
import {
  getUniqueRMCodes,
  getStockEntriesByRM,
  type StockEntryByRM,
} from "@/api/stockStatus";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/* ── helpers ─────────────────────────────────────────── */

function fillPercent(tank: Tank): number {
  if (!tank.current_capacity || !tank.tank_capacity) return 0;
  const current = Number(tank.current_capacity);
  const total = Number(tank.tank_capacity);
  if (total <= 0) return 0;
  return Math.min(100, Math.round(current / total * 100 * 100) / 100);
}

function fillColor(pct: number): string {
  if (pct >= 75) return "bg-green-500";
  if (pct >= 40) return "bg-yellow-500";
  if (pct > 0) return "bg-red-500";
  return "bg-muted";
}

function fillTextColor(pct: number): string {
  if (pct >= 75) return "text-green-600 dark:text-green-400";
  if (pct >= 40) return "text-yellow-600 dark:text-yellow-400";
  if (pct > 0) return "text-red-600 dark:text-red-400";
  return "text-muted-foreground";
}

/** Circular SVG gauge for utilisation */
function CircularGauge({ value, size = 56 }: { value: number; size?: number }) {
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(value, 100) / 100) * circumference;
  const color =
    value >= 75
      ? "stroke-green-500"
      : value >= 40
        ? "stroke-yellow-500"
        : value > 0
          ? "stroke-red-500"
          : "stroke-muted";

  return (
    <svg width={size} height={size} className="shrink-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={stroke}
        className="stroke-muted"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className={`${color} transition-all duration-500`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-foreground text-[11px] font-bold"
      >
        {value}%
      </text>
    </svg>
  );
}

/* ── main component ──────────────────────────────────── */

export default function TankDataPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { email, role } = useAuth();
  const canCreateDelete = role === "ADM" || role === "MNG";
  const autoEditHandled = useRef(false);

  const [tanks, setTanks] = useState<Tank[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tankSummary, setTankSummary] = useState<TankSummary | null>(null);
  const [tankItems, setTankItems] = useState<TankItem[]>([]);

  // Search & view
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [tankCapacity, setTankCapacity] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Tank | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Edit dialog
  const [editTarget, setEditTarget] = useState<Tank | null>(null);
  const [editOperation, setEditOperation] = useState<"IN" | "OUT" | "TRANSFER" | "">("");
  const [editItemCode, setEditItemCode] = useState("");
  const [editSelectedEntry, setEditSelectedEntry] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const [editing, setEditing] = useState(false);
  const [uniqueRMCodes, setUniqueRMCodes] = useState<string[]>([]);
  const [stockEntries, setStockEntries] = useState<StockEntryByRM[]>([]);

  // Transfer state
  const [transferTanks, setTransferTanks] = useState<import("@/api/tank").SameTank[]>([]);
  const [transferDestination, setTransferDestination] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const perPage = 20;

  // Filter
  const filteredTanks = tanks.filter((t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      t.tank_code.toLowerCase().includes(q) ||
      (t.item_code?.toLowerCase().includes(q) ?? false)
    );
  });
  const totalPages = Math.max(1, Math.ceil(filteredTanks.length / perPage));
  const paginatedTanks = filteredTanks.slice((page - 1) * perPage, page * perPage);

  // Derived stats
  const occupiedCount = tanks.filter((t) => t.current_capacity && Number(t.current_capacity) > 0).length;
  const emptyCount = tanks.length - occupiedCount;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const tanksData = await getTanks();
      setTanks(
        (tanksData ?? []).sort((a, b) =>
          a.tank_code.localeCompare(b.tank_code, undefined, { numeric: true })
        )
      );
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load tank data"));
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTankSummary = useCallback(async () => {
    try {
      const data = await getTankSummary();
      setTankSummary(data);
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    fetchData().then(() => {
      const editCode = searchParams.get("edit");
      if (editCode && !autoEditHandled.current) {
        autoEditHandled.current = true;
        setTimeout(() => {
          setTanks((prev) => {
            const tank = prev.find((t) => t.tank_code === editCode);
            if (tank) openEdit(tank);
            return prev;
          });
          setSearchParams(
            (p) => {
              p.delete("edit");
              return p;
            },
            { replace: true }
          );
        }, 100);
      }
    });
    fetchTankSummary();
    getTankItems()
      .then(setTankItems)
      .catch(() => {});
  }, [fetchData, fetchTankSummary]);

  // Reset page on search
  useEffect(() => {
    setPage(1);
  }, [search]);

  /* ── item color helper ─────────────────────────── */

  function getItemColor(itemCode: string | null): string | null {
    if (!itemCode) return null;
    const item = tankItems.find(
      (ti) => ti.tank_item_code.toLowerCase() === itemCode.toLowerCase()
    );
    if (!item) return null;
    return findPaletteColor(item.color) || item.color || null;
  }

  /* ── Create ──────────────────────────────────────── */

  function openCreateDialog() {
    setTankCapacity("");
    setCreateOpen(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (
      !tankCapacity.trim() ||
      isNaN(Number(tankCapacity)) ||
      Number(tankCapacity) <= 0
    ) {
      toast.error("Valid tank capacity is required.");
      return;
    }
    setSubmitting(true);
    try {
      const created = await createTank({
        tank_capacity: tankCapacity.trim(),
        current_capacity: null,
        item_code: null,
      });
      toast.success(`Tank "${created.tank_code}" created successfully.`);
      setCreateOpen(false);
      await fetchData();
      fetchTankSummary();
    } catch (err) {
      toastApiError(err, "Failed to create tank.");
    } finally {
      setSubmitting(false);
    }
  }

  /* ── Delete ──────────────────────────────────────── */

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteTank(deleteTarget.tank_code);
      setTanks((prev) => {
        const next = prev.filter(
          (t) => t.tank_code !== deleteTarget.tank_code
        );
        const maxPage = Math.max(1, Math.ceil(next.length / perPage));
        setPage((p) => Math.min(p, maxPage));
        return next;
      });
      setDeleteTarget(null);
      toast.success(`Tank "${deleteTarget.tank_code}" deleted.`);
      fetchTankSummary();
    } catch (err) {
      toastApiError(err, "Failed to delete tank.");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  /* ── Edit ─────────────────────────────────────────── */

  async function openEdit(tank: Tank, operation?: "IN" | "OUT" | "TRANSFER") {
    setEditTarget(tank);
    setEditOperation(operation ?? "");
    setEditItemCode("");
    setEditSelectedEntry("");
    setEditQuantity("");
    setStockEntries([]);
    setTransferTanks([]);
    setTransferDestination("");
    try {
      const rmCodes = await getUniqueRMCodes();
      setUniqueRMCodes(rmCodes);
    } catch {
      // keep whatever was loaded before
    }
    if (operation === "TRANSFER" && tank.item_code) {
      loadTransferTanks(tank.item_code);
    }
  }

  function switchOperation(op: "IN" | "OUT" | "TRANSFER") {
    setEditOperation(op);
    setEditItemCode("");
    setEditSelectedEntry("");
    setEditQuantity("");
    setStockEntries([]);
    setTransferTanks([]);
    setTransferDestination("");
    if (op === "TRANSFER" && editTarget?.item_code) {
      loadTransferTanks(editTarget.item_code);
    }
  }

  async function handleItemCodeChange(itemCode: string) {
    setEditItemCode(itemCode);
    setEditSelectedEntry("");
    setEditQuantity("");
    if (!itemCode) {
      setStockEntries([]);
      return;
    }
    try {
      const entries = await getStockEntriesByRM(itemCode);
      setStockEntries(entries);
    } catch {
      setStockEntries([]);
    }
  }

  const editSelectedStock = editSelectedEntry
    ? stockEntries.find((s) => String(s.id) === editSelectedEntry)
    : null;

  async function loadTransferTanks(itemCode: string) {
    try {
      const tanks = await getSameTanks(itemCode);
      setTransferTanks(tanks);
    } catch {
      setTransferTanks([]);
    }
  }

  async function handleEdit() {
    if (!editTarget) return;

    if (editOperation === "TRANSFER") {
      if (!transferDestination) {
        toast.error("Please select a destination tank.");
        return;
      }
      if (!editQuantity.trim() || Number(editQuantity) <= 0) {
        toast.error("Please enter a valid quantity.");
        return;
      }
      const currentCap = Number(editTarget.current_capacity ?? 0);
      if (Number(editQuantity) > currentCap) {
        toast.error(
          `Quantity cannot exceed current stock (${currentCap} L).`
        );
        return;
      }
      const destTank = transferTanks.find(
        (t) => t.tank_code === transferDestination
      );
      if (destTank) {
        const destCurrent = Number(destTank.current_capacity ?? 0);
        const destCapacity = Number(destTank.tank_capacity);
        const available = destCapacity - destCurrent;
        if (Number(editQuantity) > available) {
          toast.error(
            `Destination tank only has ${available.toFixed(2)} L available space.`
          );
          return;
        }
      }
    }

    if (editOperation === "IN") {
      if (!editItemCode) {
        toast.error("Please select an item code.");
        return;
      }
      if (!editSelectedEntry) {
        toast.error("Please select a vendor / vehicle.");
        return;
      }
      if (!editQuantity.trim() || Number(editQuantity) <= 0) {
        toast.error("Please enter a valid quantity.");
        return;
      }
      const maxQtyL = Number(editSelectedStock?.quantity_in_litre ?? 0);
      if (Number(editQuantity) > maxQtyL) {
        toast.error(
          `Quantity cannot exceed available stock (${maxQtyL} L).`
        );
        return;
      }
      const currentCap = Number(editTarget.current_capacity ?? 0);
      const tankCap = Number(editTarget.tank_capacity);
      if (currentCap + Number(editQuantity) > tankCap) {
        toast.error(
          `Adding ${editQuantity} would exceed tank capacity (${tankCap} L). Available space: ${(tankCap - currentCap).toFixed(2)} L.`
        );
        return;
      }
    }

    if (editOperation === "OUT") {
      if (!editQuantity.trim() || Number(editQuantity) <= 0) {
        toast.error("Please enter a valid quantity.");
        return;
      }
      const currentCap = Number(editTarget.current_capacity ?? 0);
      if (Number(editQuantity) > currentCap) {
        toast.error(
          `Quantity cannot exceed current stock (${currentCap} KG).`
        );
        return;
      }
    }

    setEditing(true);
    try {
      if (editOperation === "IN") {
        await tankInward({
          tank_code: editTarget.tank_code,
          stock_status_id: String(editSelectedStock!.id),
          quantity: editQuantity.trim(),
          user: email ?? "",
        });
      } else if (editOperation === "OUT") {
        await tankOutward({
          tank_code: editTarget.tank_code,
          quantity: editQuantity.trim(),
          remarks: "Used for Production",
          user: email ?? "",
        });
        const remaining =
          Number(editTarget.current_capacity ?? 0) - Number(editQuantity);
        if (remaining <= 0) {
          await updateTank(editTarget.tank_code, {
            current_capacity: null,
            item_code: null,
          });
        }
      } else if (editOperation === "TRANSFER") {
        await tankTransfer({
          source_tank_code: editTarget.tank_code,
          destination_tank_code: transferDestination,
          quantity: Number(editQuantity.trim()),
          remarks: `Transfer to free up space in ${editTarget.tank_code}`,
        });
      }
      const opLabel =
        editOperation === "IN"
          ? "added"
          : editOperation === "OUT"
            ? "removed"
            : `transferred to ${transferDestination}`;
      toast.success(
        `Tank "${editTarget.tank_code}" updated: ${opLabel} ${editQuantity} L.`
      );
      setEditTarget(null);
      fetchData();
      fetchTankSummary();
    } catch (err) {
      toastApiError(err, "Failed to update tank.");
    } finally {
      setEditing(false);
    }
  }

  /* ── can transfer check ──────────────────────────── */
  const canTransfer =
    !!editTarget?.item_code &&
    !!editTarget?.current_capacity &&
    Number(editTarget.current_capacity) > 0;

  /* ── render ──────────────────────────────────────── */

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 animate-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Tank Data</h1>
          <p className="text-sm text-muted-foreground">
            Create and manage tanks
          </p>
        </div>
        {canCreateDelete && (
          <Button onClick={openCreateDialog} className="btn-press gap-2">
            <Plus className="h-4 w-4" />
            Create Tank
          </Button>
        )}
      </div>

      {/* Error */}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Tank Summary */}
      <div>
        <h2 className="text-base font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          Tank Summary
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <SummaryCard
            icon={Warehouse}
            label="Total Tank Capacity"
            value={
              tankSummary
                ? `${fmtNum(Number(tankSummary.total_tank_capacity))} L`
                : ""
            }
            loading={!tankSummary}
          />
          <SummaryCard
            icon={Gauge}
            label="Current Stock"
            value={
              tankSummary
                ? `${fmtNum(Number(tankSummary.current_stock))} L`
                : ""
            }
            loading={!tankSummary}
          />
          {/* Utilisation with circular gauge */}
          <Card>
            <CardContent className="pt-4 pb-3 px-3 sm:pt-6 sm:pb-5 sm:px-5">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <CircularGauge
                  value={tankSummary?.utilisation_rate ?? 0}
                />
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Utilisation Rate
                  </p>
                  {!tankSummary ? (
                    <Skeleton className="h-7 w-24 mt-1" />
                  ) : (
                    <p className="text-base sm:text-lg md:text-2xl font-bold mt-0.5">
                      {tankSummary.utilisation_rate}%
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          {/* Empty vs Occupied */}
          <Card>
            <CardContent className="pt-4 pb-3 px-3 sm:pt-6 sm:pb-5 sm:px-5">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div className="rounded-lg bg-orange-50 dark:bg-orange-900/50 p-2 sm:p-3 shrink-0">
                  <DatabaseZap className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Tank Status
                  </p>
                  {loading ? (
                    <Skeleton className="h-7 w-24 mt-1" />
                  ) : (
                    <div className="flex items-center gap-3 mt-0.5">
                      <div className="text-center">
                        <p className="text-base sm:text-lg md:text-2xl font-bold text-green-600 dark:text-green-400">
                          {occupiedCount}
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                          Occupied
                        </p>
                      </div>
                      <div className="h-8 w-px bg-border" />
                      <div className="text-center">
                        <p className="text-base sm:text-lg md:text-2xl font-bold text-muted-foreground">
                          {emptyCount}
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                          Empty
                        </p>
                      </div>
                    </div>
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
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle>Tanks</CardTitle>
              <CardDescription>
                {filteredTanks.length}
                {search.trim() ? ` of ${tanks.length}` : ""} tanks
                {search.trim() ? " matching" : " in the system"}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tanks..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-9 w-48 sm:w-56"
                />
              </div>
              {/* View toggle */}
              <div className="flex items-center border rounded-md">
                <Button
                  variant={viewMode === "table" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-9 w-9 rounded-r-none"
                  onClick={() => setViewMode("table")}
                  title="Table view"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-9 w-9 rounded-l-none"
                  onClick={() => setViewMode("grid")}
                  title="Grid view"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {loading ? (
            viewMode === "table" ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tank Number</TableHead>
                      <TableHead>Item Code</TableHead>
                      <TableHead>Tank Capacity (L)</TableHead>
                      <TableHead>Current Quantity (L)</TableHead>
                      <TableHead>Fill %</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Skeleton className="h-8 w-8" />
                            <Skeleton className="h-8 w-8" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="rounded-lg border p-4 space-y-3">
                    <Skeleton className="h-24 w-12 mx-auto rounded" />
                    <Skeleton className="h-4 w-16 mx-auto" />
                    <Skeleton className="h-3 w-20 mx-auto" />
                  </div>
                ))}
              </div>
            )
          ) : viewMode === "table" ? (
            /* ───── TABLE VIEW ───── */
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tank Number</TableHead>
                    <TableHead>Item Code</TableHead>
                    <TableHead>Tank Capacity (L)</TableHead>
                    <TableHead>Current Quantity (L)</TableHead>
                    <TableHead>Fill %</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTanks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-16">
                        <div className="flex flex-col items-center gap-3 text-muted-foreground">
                          <Container className="h-10 w-10 stroke-1" />
                          <p className="font-medium">
                            {search.trim()
                              ? "No tanks match your search"
                              : "No tanks found"}
                          </p>
                          {!search.trim() && canCreateDelete && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5"
                              onClick={openCreateDialog}
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Create Tank
                            </Button>
                          )}
                          {search.trim() && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSearch("")}
                            >
                              Clear search
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedTanks.map((tank) => {
                      const pct = fillPercent(tank);
                      const itemColor = getItemColor(tank.item_code);
                      return (
                        <TableRow key={tank.tank_code}>
                          <TableCell className="font-medium">
                            {tank.tank_code}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {itemColor && (
                                <span
                                  className="h-3 w-3 rounded-full border border-border shrink-0 inline-block"
                                  style={{ backgroundColor: itemColor }}
                                />
                              )}
                              {tank.item_code ?? "—"}
                            </div>
                          </TableCell>
                          <TableCell>
                            {Number(tank.tank_capacity).toLocaleString(
                              "en-IN"
                            )}{" "}
                            L
                          </TableCell>
                          <TableCell>
                            {tank.current_capacity
                              ? `${Number(tank.current_capacity).toLocaleString("en-IN")} L`
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-3 w-24 rounded-full bg-muted overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${fillColor(pct)}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span
                                className={`font-medium w-14 ${fillTextColor(pct)}`}
                              >
                                {pct.toFixed(1)}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {/* Quick IN */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                                onClick={() => openEdit(tank, "IN")}
                                title="Inward"
                              >
                                <ArrowDownToLine className="h-4 w-4" />
                              </Button>
                              {/* Quick OUT */}
                              {tank.current_capacity &&
                                Number(tank.current_capacity) > 0 && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                                    onClick={() => openEdit(tank, "OUT")}
                                    title="Outward"
                                  >
                                    <ArrowUpFromLine className="h-4 w-4" />
                                  </Button>
                                )}
                              {/* Edit */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                onClick={() => openEdit(tank, "TRANSFER")}
                                title="Transfer"
                              >
                                <ArrowRightLeft className="h-4 w-4" />
                              </Button>
                              {canCreateDelete && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => setDeleteTarget(tank)}
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
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
          ) : (
            /* ───── GRID VIEW ───── */
            <>
              {paginatedTanks.length === 0 ? (
                <div className="flex flex-col items-center gap-3 text-muted-foreground py-16">
                  <Container className="h-10 w-10 stroke-1" />
                  <p className="font-medium">
                    {search.trim()
                      ? "No tanks match your search"
                      : "No tanks found"}
                  </p>
                  {!search.trim() && canCreateDelete && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={openCreateDialog}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Create Tank
                    </Button>
                  )}
                  {search.trim() && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSearch("")}
                    >
                      Clear search
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {paginatedTanks.map((tank) => {
                    const pct = fillPercent(tank);
                    const itemColor = getItemColor(tank.item_code);
                    return (
                      <div
                        key={tank.tank_code}
                        className="relative rounded-lg border p-4 transition-all hover:shadow-md hover:border-foreground/20 group"
                      >
                        {/* Actions */}
                        <div className="absolute top-2 right-2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-green-600"
                            onClick={() => openEdit(tank, "IN")}
                            title="Inward"
                          >
                            <ArrowDownToLine className="h-3.5 w-3.5" />
                          </Button>
                          {tank.current_capacity &&
                            Number(tank.current_capacity) > 0 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-orange-600"
                                onClick={() => openEdit(tank, "OUT")}
                                title="Outward"
                              >
                                <ArrowUpFromLine className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-blue-600"
                            onClick={() => openEdit(tank, "TRANSFER")}
                            title="Transfer"
                          >
                            <ArrowRightLeft className="h-3.5 w-3.5" />
                          </Button>
                          {canCreateDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => setDeleteTarget(tank)}
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>

                        {/* Tank gauge visual */}
                        <div className="flex flex-col items-center gap-2 pt-1">
                          <div className="relative h-24 w-14 rounded-lg border-2 border-border bg-muted/30 overflow-hidden">
                            <div
                              className={`absolute bottom-0 left-0 right-0 transition-all duration-500 ${fillColor(pct)}`}
                              style={{
                                height: `${pct}%`,
                                opacity: 0.7,
                              }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span
                                className={`text-xs font-bold ${pct > 50 ? "text-white drop-shadow" : fillTextColor(pct)}`}
                              >
                                {pct.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                          <p className="font-semibold text-sm">
                            {tank.tank_code}
                          </p>
                        </div>

                        {/* Info */}
                        <div className="text-center mt-2 space-y-1">
                          {tank.item_code && (
                            <div className="flex items-center justify-center gap-1.5">
                              {itemColor && (
                                <span
                                  className="h-2.5 w-2.5 rounded-full border border-border shrink-0 inline-block"
                                  style={{ backgroundColor: itemColor }}
                                />
                              )}
                              <span className="text-xs text-muted-foreground">
                                {tank.item_code}
                              </span>
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {tank.current_capacity
                              ? `${Number(tank.current_capacity).toLocaleString("en-IN")} L`
                              : "Empty"}{" "}
                            /{" "}
                            {Number(tank.tank_capacity).toLocaleString(
                              "en-IN"
                            )}{" "}
                            L
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Pagination */}
          {!loading && filteredTanks.length > perPage && (
            <Pagination
              page={page}
              totalPages={totalPages}
              totalItems={filteredTanks.length}
              perPage={perPage}
              onPageChange={setPage}
            />
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Container className="h-5 w-5" />
              Create Tank
            </DialogTitle>
            <DialogDescription>
              Add a new tank. Tank code will be auto-generated.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="tank-capacity">Tank Capacity (L) *</Label>
              <Input
                id="tank-capacity"
                type="number"
                min={0}
                step="0.01"
                placeholder="e.g. 10000.00"
                value={tankCapacity}
                onChange={(e) => setTankCapacity(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || !tankCapacity.trim()}
              >
                {submitting ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Tank</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <strong>{deleteTarget?.tank_code}</strong>? This action cannot
              be undone.
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

      {/* Edit Dialog */}
      <Dialog open={!!editTarget} onOpenChange={() => setEditTarget(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Tank</DialogTitle>
            <DialogDescription>
              Update <strong>{editTarget?.tank_code}</strong>
            </DialogDescription>
          </DialogHeader>

          {/* Tank info + visual gauge */}
          {editTarget && (
            <div className="flex gap-4 items-start">
              {/* Mini tank gauge */}
              <div className="relative h-20 w-10 rounded-lg border-2 border-border bg-muted/30 overflow-hidden shrink-0">
                <div
                  className={`absolute bottom-0 left-0 right-0 transition-all ${fillColor(fillPercent(editTarget))}`}
                  style={{
                    height: `${fillPercent(editTarget)}%`,
                    opacity: 0.7,
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[10px] font-bold">
                    {fillPercent(editTarget).toFixed(0)}%
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 flex-1 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Tank Code</p>
                  <p className="font-medium">
                    {editTarget.tank_code}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Tank Capacity
                  </p>
                  <p className="font-medium">
                    {editTarget.tank_capacity
                      ? `${Number(editTarget.tank_capacity).toLocaleString("en-IN")} L`
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Current Stock
                  </p>
                  <p className="font-medium">
                    {editTarget.current_capacity
                      ? `${Number(editTarget.current_capacity).toLocaleString("en-IN")} L`
                      : "0 L"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Current Item
                  </p>
                  <div className="flex items-center gap-1.5">
                    {getItemColor(editTarget.item_code) && (
                      <span
                        className="h-2.5 w-2.5 rounded-full border border-border shrink-0 inline-block"
                        style={{
                          backgroundColor:
                            getItemColor(editTarget.item_code) ?? undefined,
                        }}
                      />
                    )}
                    <p className="font-medium">
                      {editTarget.item_code ?? "—"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-5">
            {/* Operation as segmented tabs */}
            <div className="space-y-2">
              <Label>Operation *</Label>
              <div className="flex rounded-lg border p-1 gap-1">
                <button
                  type="button"
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    editOperation === "IN"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                      : "hover:bg-muted text-muted-foreground"
                  }`}
                  onClick={() => switchOperation("IN")}
                >
                  <ArrowDownToLine className="h-4 w-4" />
                  In
                </button>
                <button
                  type="button"
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    editOperation === "OUT"
                      ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400"
                      : "hover:bg-muted text-muted-foreground"
                  }`}
                  onClick={() => switchOperation("OUT")}
                >
                  <ArrowUpFromLine className="h-4 w-4" />
                  Out
                </button>
                {canTransfer && (
                  <button
                    type="button"
                    className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      editOperation === "TRANSFER"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400"
                        : "hover:bg-muted text-muted-foreground"
                    }`}
                    onClick={() => switchOperation("TRANSFER")}
                  >
                    <ArrowRightLeft className="h-4 w-4" />
                    Transfer
                  </button>
                )}
              </div>
            </div>

            {editOperation === "IN" && (
              <>
                <div className="space-y-2">
                  <Label>Item Code *</Label>
                  <Select
                    value={editItemCode || "__none__"}
                    onValueChange={(v) =>
                      handleItemCodeChange(v === "__none__" ? "" : v)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select item" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        value="__none__"
                        className="text-muted-foreground"
                      >
                        Select item
                      </SelectItem>
                      {uniqueRMCodes.map((code) => (
                        <SelectItem key={code} value={code}>
                          {code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {editItemCode && stockEntries.length > 0 && (
                  <div className="space-y-2">
                    <Label>Vendor / Vehicle *</Label>
                    <Select
                      value={editSelectedEntry || "__none__"}
                      onValueChange={(v) => {
                        setEditSelectedEntry(v === "__none__" ? "" : v);
                        setEditQuantity("");
                      }}
                    >
                      <SelectTrigger className="w-full h-auto min-h-9 whitespace-normal text-left">
                        <SelectValue placeholder="Select vendor / vehicle" />
                      </SelectTrigger>
                      <SelectContent className="max-w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)]">
                        <SelectItem
                          value="__none__"
                          className="text-muted-foreground"
                        >
                          Select
                        </SelectItem>
                        {stockEntries.map((entry) => (
                          <SelectItem
                            key={entry.id}
                            value={String(entry.id)}
                            className="whitespace-normal"
                          >
                            {entry.vehicle_number ?? "—"} —{" "}
                            {entry.vendor_code__card_name || entry.vendor_code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {editSelectedStock && (
                  <div className="rounded-md bg-muted/50 px-3 py-2 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Vendor:</span>
                      <span className="font-medium">
                        {editSelectedStock.vendor_code__card_name ||
                          editSelectedStock.vendor_code}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Vehicle:</span>
                      <span className="font-medium">
                        {editSelectedStock.vehicle_number ?? "—"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Available Qty:
                      </span>
                      <span className="font-medium">
                        {Number(
                          editSelectedStock.quantity
                        ).toLocaleString("en-IN")}{" "}
                        KG /{" "}
                        {Number(
                          editSelectedStock.quantity_in_litre
                        ).toLocaleString("en-IN")}{" "}
                        L
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}

            {editOperation === "TRANSFER" && (
              <div className="space-y-2">
                <Label>Destination Tank *</Label>
                <Select
                  value={transferDestination || "__none__"}
                  onValueChange={(v) =>
                    setTransferDestination(v === "__none__" ? "" : v)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select destination tank" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      value="__none__"
                      className="text-muted-foreground"
                    >
                      Select
                    </SelectItem>
                    {transferTanks
                      .filter((t) => t.tank_code !== editTarget?.tank_code)
                      .map((t) => (
                        <SelectItem key={t.tank_code} value={t.tank_code}>
                          {t.tank_code} — {t.item_code ?? "Empty"} (
                          {Number(
                            t.current_capacity ?? 0
                          ).toLocaleString("en-IN")}{" "}
                          /{" "}
                          {Number(t.tank_capacity).toLocaleString("en-IN")}{" "}
                          L)
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {(editOperation === "OUT" ||
              editOperation === "TRANSFER" ||
              (editOperation === "IN" && editSelectedEntry)) && (
              <div className="space-y-2">
                <Label htmlFor="edit-qty">
                  Quantity (L) *
                  {editOperation === "IN" && editSelectedStock && (
                    <span className="text-xs text-muted-foreground ml-2">
                      (max: {Number(editSelectedStock.quantity_in_litre)} L)
                    </span>
                  )}
                  {(editOperation === "OUT" ||
                    editOperation === "TRANSFER") &&
                    editTarget && (
                      <span className="text-xs text-muted-foreground ml-2">
                        (max: {editTarget.current_capacity ?? 0} L)
                      </span>
                    )}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="edit-qty"
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Enter quantity"
                    value={editQuantity}
                    onChange={(e) => setEditQuantity(e.target.value)}
                    className="flex-1"
                  />
                  {editOperation === "IN" && editSelectedStock && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0 h-9"
                      onClick={() =>
                        setEditQuantity(
                          String(
                            Number(editSelectedStock.quantity_in_litre)
                          )
                        )
                      }
                    >
                      Unload All
                    </Button>
                  )}
                  {(editOperation === "OUT" ||
                    editOperation === "TRANSFER") &&
                    editTarget?.current_capacity && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0 h-9"
                        onClick={() =>
                          setEditQuantity(
                            String(editTarget.current_capacity)
                          )
                        }
                      >
                        {editOperation === "TRANSFER"
                          ? "Transfer All"
                          : "Drain All"}
                      </Button>
                    )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleEdit}
              disabled={editing || !editQuantity.trim() || !editOperation}
            >
              {editing ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
