import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Droplets,
  Gauge,
  Warehouse,
  BarChart3,
  Container,
  Package,
  RefreshCw,
  Maximize2,
  Minimize2,
  AlertTriangle,
  Filter,
} from "lucide-react";

import {
  getTanks,
  getTankItems,
  getItemWiseTankSummary,
  getTankSummary,
  getItemWiseAverage,
  type Tank,
  type TankItem,
  type ItemWiseTankSummaryItem,
  type TankSummary,
  type ItemWiseAverage,
} from "@/api/tank";
import { createOpeningStock } from "@/api/stockStatus";

import { getErrorMessage, toastApiError } from "@/lib/errors";
import { useHasPermission } from "@/hooks/useHasPermission";
import { SummaryCard } from "@/components/SummaryCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/* ── helpers ─────────────────────────────────────────────── */

type Unit = "L" | "MT";
const L_PER_MT = 1098.9;

function conv(liters: number, unit: Unit): string {
  if (unit === "MT") {
    return (liters / L_PER_MT).toLocaleString("en-IN", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  }
  return liters.toLocaleString("en-IN");
}

function formatCapacity(value: string | number, unit: Unit): string {
  return conv(Number(value), unit);
}

function fillPercent(tank: Tank): number {
  if (!tank.current_capacity || !tank.tank_capacity) return 0;
  const current = Number(tank.current_capacity);
  const total = Number(tank.tank_capacity);
  if (total <= 0) return 0;
  return Math.min(100, Math.round((current / total) * 100));
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

type GroupMode = "none" | "product" | "status";

function getStatusBucket(pct: number): string {
  if (pct === 0) return "Empty";
  if (pct < 10) return "Critical Low";
  if (pct <= 50) return "Half Full";
  if (pct <= 90) return "Full";
  return "Nearly Full";
}

/* ─── Industrial IBC Tote Visual ─── */

function ToteVisual({ pct, fillHex, currentL, unit }: {
  pct: number;
  fillHex: string;
  currentL: string;
  unit: Unit;
}) {
  // SVG viewport: 160 wide × 210 tall
  // Body: x=10, y=18, w=140, h=130  (wide & squat IBC shape)
  const bx = 10, by = 18, bw = 140, bh = 130;
  const liquidH = (pct / 100) * bh;
  const liquidY = by + bh - liquidH;

  // parse fillHex to rgba for plastic-diffused look
  const r = parseInt(fillHex.slice(1, 3), 16);
  const g = parseInt(fillHex.slice(3, 5), 16);
  const b = parseInt(fillHex.slice(5, 7), 16);
  const liquidFill  = `rgba(${r},${g},${b},0.55)`;   // seen through plastic — muted
  const liquidSurf  = `rgba(${r},${g},${b},0.35)`;   // flat surface highlight

  // cage bars
  const vBars = [bx + bw * 0.33, bx + bw * 0.66];
  const hBars = [by + bh * 0.25, by + bh * 0.5, by + bh * 0.75];

  return (
    <svg width={160} height={196} viewBox="0 0 160 196" xmlns="http://www.w3.org/2000/svg">
      <defs>
        {/* Clip to inner bottle area */}
        <clipPath id={`tc-${pct}`}>
          <rect x={bx + 4} y={by + 4} width={bw - 8} height={bh - 8} rx="3" />
        </clipPath>
      </defs>

      {/* ── Fill opening on top (plastic cap) ── */}
      <rect x="68" y="6" width="24" height="8" rx="3" fill="#6b7280" />
      <rect x="74" y="3" width="12" height="6" rx="2" fill="#4b5563" />

      {/* ── Outer cage top rail ── */}
      <rect x={bx} y={by - 4} width={bw} height="6" rx="1" fill="#9ca3af" />

      {/* ── Plastic inner bottle (frosted HDPE) ── */}
      <rect x={bx + 4} y={by + 4} width={bw - 8} height={bh - 8} rx="3" fill="#f1f5f9" opacity="0.18" />

      {/* ── Liquid fill (clipped, flat top) ── */}
      <g clipPath={`url(#tc-${pct})`}>
        {/* liquid body */}
        <rect x={bx + 4} y={liquidY} width={bw - 8} height={liquidH} fill={liquidFill} />
        {/* flat surface line */}
        {pct > 0 && pct < 98 && (
          <rect x={bx + 4} y={liquidY} width={bw - 8} height="3" fill={liquidSurf} />
        )}
      </g>

      {/* ── Outer cage body ── */}
      <rect x={bx} y={by} width={bw} height={bh} rx="2"
        fill="none" stroke="#9ca3af" strokeWidth="2.5" />

      {/* ── Cage vertical bars ── */}
      {vBars.map((x, i) => (
        <line key={i} x1={x} y1={by} x2={x} y2={by + bh} stroke="#9ca3af" strokeWidth="1.5" />
      ))}

      {/* ── Cage horizontal rungs ── */}
      {hBars.map((y, i) => (
        <line key={i} x1={bx} y1={y} x2={bx + bw} y2={y} stroke="#9ca3af" strokeWidth="1.5" />
      ))}

      {/* ── Cage corner bolts ── */}
      {[[bx + 2, by + 2],[bx + bw - 2, by + 2],[bx + 2, by + bh - 2],[bx + bw - 2, by + bh - 2]].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="3" fill="#6b7280" />
      ))}

      {/* ── Outer cage bottom rail ── */}
      <rect x={bx} y={by + bh - 2} width={bw} height="6" rx="1" fill="#9ca3af" />

      {/* ── Outlet valve ── */}
      <rect x="62" y={by + bh + 4} width="36" height="8" rx="2" fill="#6b7280" />
      <rect x="70" y={by + bh + 12} width="20" height="5" rx="1" fill="#4b5563" />
      {/* valve handle */}
      <rect x="76" y={by + bh + 17} width="8" height="3" rx="1" fill="#374151" />

      {/* ── Quantity text inside bottle ── */}
      {pct > 14 && (
        <text
          x="80" y={liquidY + liquidH - 6}
          textAnchor="middle" fontSize="9" fontWeight="600"
          fill="white"
          style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.7))" }}
        >
          {currentL} {unit}
        </text>
      )}
      {pct === 0 && (
        <text x="80" y={by + bh / 2 + 4} textAnchor="middle" fontSize="9" fill="#9ca3af">
          Empty
        </text>
      )}

      {/* ── Pallet ── sits flush under the cage */}
      {/* py = start of pallet, right below valve area */}
      {(() => {
        const py = by + bh + 20; // start of pallet top deck
        const pw = 152;
        const px = 4;
        const deckH = 6;
        const blockH = 14;
        const skidH = 5;
        // 3 solid blocks + 2 fork-pocket openings between them
        const blockW = 38;
        const gap = (pw - blockW * 3) / 2; // space between blocks = fork opening width
        return (
          <>
            {/* Top deck — solid, full width */}
            <rect x={px} y={py} width={pw} height={deckH} rx="2" fill="#c8cdd5" />
            {/* Top deck edge shadow */}
            <rect x={px} y={py + deckH - 1} width={pw} height="2" fill="#a8adb5" opacity="0.5" />

            {/* 3 solid block feet */}
            <rect x={px}                        y={py + deckH} width={blockW} height={blockH} rx="1" fill="#d1d5db" />
            <rect x={px + blockW + gap}          y={py + deckH} width={blockW} height={blockH} rx="1" fill="#d1d5db" />
            <rect x={px + blockW * 2 + gap * 2}  y={py + deckH} width={blockW} height={blockH} rx="1" fill="#d1d5db" />

            {/* Fork pocket openings — dark recessed gaps */}
            <rect x={px + blockW}               y={py + deckH} width={gap} height={blockH} fill="#1f2937" opacity="0.55" />
            <rect x={px + blockW * 2 + gap}     y={py + deckH} width={gap} height={blockH} fill="#1f2937" opacity="0.55" />

            {/* Bottom skid — full width */}
            <rect x={px} y={py + deckH + blockH} width={pw} height={skidH} rx="2" fill="#c8cdd5" />
          </>
        );
      })()}
    </svg>
  );
}

/* ─── SVG wave paths ─── */

function WaveSvg({ color, className }: { color: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 800 60"
      preserveAspectRatio="none"
      className={className}
      style={{ width: "200%", height: "16px", minHeight: "16px" }}
    >
      <path
        d="M0,30 C100,10 200,50 400,30 C600,10 700,50 800,30 L800,60 L0,60 Z"
        fill={color}
      />
    </svg>
  );
}

/* ── page ─────────────────────────────────────────────────── */

export default function TankMonitoringPage() {
  const { hasPermission } = useHasPermission();
  const canAddOpeningRate = hasPermission("opening_rate", "add");

  const [tanks, setTanks] = useState<Tank[]>([]);
  const [tankItems, setTankItems] = useState<TankItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [itemSummary, setItemSummary] = useState<ItemWiseTankSummaryItem[]>([]);
  const [itemSummaryLoading, setItemSummaryLoading] = useState(true);
  const [itemAverages, setItemAverages] = useState<Map<string, ItemWiseAverage>>(new Map());
  const [tankSummary, setTankSummary] = useState<TankSummary | null>(null);
  const [openingRates, setOpeningRates] = useState<Record<string, string>>({});
  const [openingSubmitMap, setOpeningSubmitMap] = useState<Record<string, boolean>>({});

  // Persist unit
  const [unit, setUnit] = useState<Unit>(() => {
    const saved = localStorage.getItem("tank_monitoring_unit");
    return saved === "MT" ? "MT" : "L";
  });
  useEffect(() => { localStorage.setItem("tank_monitoring_unit", unit); }, [unit]);


  // Kiosk mode
  const [kiosk, setKiosk] = useState(false);

  // Splash animation (triggers on refresh)
  const [splashing, setSplashing] = useState(false);

  // Group / filter
  const [groupMode, setGroupMode] = useState<GroupMode>("none");
  const [filterItem, setFilterItem] = useState("");

  /* ── data fetching ─────────────────────────────────────── */

  async function fetchTanks() {
    setLoading(true);
    setError("");
    try {
      const [t, i] = await Promise.all([getTanks(), getTankItems()]);
      setTanks((t ?? []).sort((a, b) => a.tank_code.localeCompare(b.tank_code, undefined, { numeric: true })));
      setTankItems(i ?? []);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load data"));
    } finally {
      setLoading(false);
    }
  }

  async function fetchTankSummary() {
    try {
      const data = await getTankSummary();
      setTankSummary(data);
    } catch { /* non-critical */ }
  }

  async function fetchItemSummary() {
    setItemSummaryLoading(true);
    try {
      const data = await getItemWiseTankSummary();
      const items = data.items ?? [];
      setItemSummary(items);
      // Fetch averages for each item in parallel
      if (items.length > 0) {
        const avgResults = await Promise.allSettled(
          items.map((item) => getItemWiseAverage(item.tank_item_code))
        );
        const avgMap = new Map<string, ItemWiseAverage>();
        avgResults.forEach((r) => {
          if (r.status === "fulfilled" && r.value) avgMap.set(r.value.item_code, r.value);
        });
        setItemAverages(avgMap);
      }
    } catch { /* non-critical */ }
    finally { setItemSummaryLoading(false); }
  }

  const refreshAll = useCallback(async () => {
    setSplashing(true);
    await Promise.all([fetchTanks(), fetchTankSummary(), fetchItemSummary()]);
    setTimeout(() => setSplashing(false), 2000);
  }, []);

  const submitOpeningStock = useCallback(async (item: ItemWiseTankSummaryItem) => {
    if (!canAddOpeningRate) {
      toast.error("You don't have permission to add opening rate.");
      return;
    }

    const itemCode = item.tank_item_code;
    const existingAvg = itemAverages.get(itemCode);
    const hasAvgRate = existingAvg?.["average_rate(IN_TANK)"] != null;
    const hasAdjustedAvgRate = existingAvg?.["adjusted_average(STO)"] != null;
    const canAddOpeningStock = !hasAvgRate && !hasAdjustedAvgRate;

    if (!canAddOpeningStock) {
      toast.error(`Opening stock is only allowed when both average rates are unavailable for ${itemCode}.`);
      return;
    }

    const enteredRate = (openingRates[itemCode] ?? "").trim();
    if (!enteredRate) {
      toast.error(`Enter opening stock rate for ${itemCode}.`);
      return;
    }

    const numericRate = Number(enteredRate);
    if (!Number.isFinite(numericRate) || numericRate <= 0) {
      toast.error("Rate must be a valid number greater than 0.");
      return;
    }

    setOpeningSubmitMap((prev) => ({ ...prev, [itemCode]: true }));
    try {
      await createOpeningStock({
        item_code: itemCode,
        rate: numericRate.toFixed(2),
        quantity: Number(item.quantity_in_liters ?? 0).toFixed(2),
      });
      toast.success(`Opening stock saved for ${itemCode}.`);
      await fetchItemSummary();
    } catch (err) {
      toastApiError(err, "Failed to save opening stock.");
    } finally {
      setOpeningSubmitMap((prev) => ({ ...prev, [itemCode]: false }));
    }
  }, [openingRates, fetchItemSummary, itemAverages]);

  useEffect(() => {
    fetchTanks();
    fetchItemSummary();
    fetchTankSummary();
  }, []);


  /* ── derived data ──────────────────────────────────────── */

  const colorMap = new Map(tankItems.map((i) => [i.tank_item_code, i.color]));
  const nameMap = new Map(tankItems.map((i) => [i.tank_item_code, i.tank_item_name]));

  const uniqueItemCodes = useMemo(() => {
    const codes = [...new Set(tanks.map((t) => t.item_code).filter(Boolean))] as string[];
    return codes.sort();
  }, [tanks]);

  const filteredTanks = useMemo(() => {
    if (!filterItem) return tanks;
    return tanks.filter((t) => t.item_code === filterItem);
  }, [tanks, filterItem]);

  const groupedTanks = useMemo(() => {
    if (groupMode === "none") return [{ label: "", tanks: filteredTanks }];

    const groups = new Map<string, Tank[]>();
    for (const tank of filteredTanks) {
      let key: string;
      if (groupMode === "product") {
        key = tank.item_code
          ? `${tank.item_code} — ${nameMap.get(tank.item_code) ?? ""}`
          : "Unassigned";
      } else {
        key = getStatusBucket(fillPercent(tank));
      }
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(tank);
    }

    // Sort groups by key, but put "Unassigned"/"Empty" last
    const entries = [...groups.entries()].sort((a, b) => {
      if (groupMode === "status") {
        const order = ["Nearly Full", "Full", "Half Full", "Critical Low", "Empty"];
        return order.indexOf(a[0]) - order.indexOf(b[0]);
      }
      if (a[0] === "Unassigned") return 1;
      if (b[0] === "Unassigned") return -1;
      return a[0].localeCompare(b[0]);
    });

    return entries.map(([label, tanks]) => ({ label, tanks }));
  }, [filteredTanks, groupMode, nameMap]);

  // Max item quantity for fill bar scaling in summary table
  const maxItemQty = useMemo(() => {
    if (itemSummary.length === 0) return 0;
    return Math.max(...itemSummary.map((i) => i.quantity_in_liters));
  }, [itemSummary]);

  /* ── kiosk toggle ──────────────────────────────────────── */

  useEffect(() => {
    if (kiosk) {
      document.documentElement.classList.add("kiosk-mode");
    } else {
      document.documentElement.classList.remove("kiosk-mode");
    }
    return () => document.documentElement.classList.remove("kiosk-mode");
  }, [kiosk]);

  /* ── render ────────────────────────────────────────────── */

  return (
    <div className={cn("p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 animate-page", kiosk && "p-4")}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Tank Monitoring</h1>
          <div className="flex items-center gap-1.5 mt-1">
            <Droplets className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Live Tank Visual Display</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Filter by item */}
          <Select value={filterItem || "__all__"} onValueChange={(v) => setFilterItem(v === "__all__" ? "" : v)}>
            <SelectTrigger className="w-[180px] h-9 text-xs">
              <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="All Items" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Items</SelectItem>
              {uniqueItemCodes.map((code) => (
                <SelectItem key={code} value={code}>
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: colorMap.get(code) ?? "#94a3b8" }} />
                    {code}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Group mode */}
          <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl border border-border/50">
            {([["none", "Grid"], ["product", "By Product"], ["status", "By Status"]] as [GroupMode, string][]).map(([mode, label]) => (
              <button
                key={mode}
                onClick={() => setGroupMode(mode)}
                className={cn(
                  "px-3 py-1 text-[10px] font-bold uppercase tracking-widest transition-all rounded-lg",
                  groupMode === mode ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Unit toggle */}
          <div className="flex items-center rounded-lg border bg-muted p-0.5">
            <button
              className={cn("px-3 py-1.5 text-xs font-medium rounded-md transition-colors", unit === "L" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
              onClick={() => setUnit("L")}
            >
              Liters
            </button>
            <button
              className={cn("px-3 py-1.5 text-xs font-medium rounded-md transition-colors", unit === "MT" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
              onClick={() => setUnit("MT")}
            >
              MTS
            </button>
          </div>

          {/* Refresh */}
          <Button variant="outline" size="sm" className="gap-2 rounded-xl border-2" onClick={refreshAll} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>

          {/* Kiosk */}
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-2" onClick={() => setKiosk(!kiosk)} title={kiosk ? "Exit Kiosk Mode" : "Kiosk Mode"}>
            {kiosk ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Tank Summary Cards */}
      {!kiosk && (
        <div>
          <h2 className="text-base font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Tank Summary
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-5">
            <SummaryCard icon={Gauge} label="Total Quantity" value={tankSummary ? `${conv(Number(tankSummary.current_stock), unit)} ${unit}` : ""} loading={!tankSummary} />
            <SummaryCard icon={Warehouse} label="Total Capacity" value={tankSummary ? `${conv(Number(tankSummary.total_tank_capacity), unit)} ${unit}` : ""} loading={!tankSummary} />
            <SummaryCard icon={Container} label="Total Tanks" value={tankSummary ? tankSummary.tank_count : ""} loading={!tankSummary} />
            <SummaryCard icon={Package} label="Total Products" value={tankSummary ? tankSummary.item_count : ""} loading={!tankSummary} />
            <SummaryCard icon={BarChart3} label="Fill Rate" value={tankSummary ? `${tankSummary.utilisation_rate}%` : ""} loading={!tankSummary} />
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {loading ? (
        <div className={cn("grid gap-5", kiosk ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6" : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4")}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-2xl border bg-card p-5 flex flex-col items-center gap-3">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-[240px] w-[130px] rounded-t-[40%] rounded-b-lg" />
              <Skeleton className="h-2 w-full rounded-full" />
              <Skeleton className="h-3 w-28" />
            </div>
          ))}
        </div>
      ) : tanks.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
          <Droplets className="h-10 w-10 stroke-1" />
          <p className="text-sm font-medium">No tanks found</p>
          <p className="text-xs">Add tanks in Tank Data to see them here.</p>
        </div>
      ) : (
        /* ─── Grouped Tank Grid ─── */
        <div className="space-y-8">
          {groupedTanks.map(({ label, tanks: groupTanks }) => {
            const regularTanks = groupTanks.filter((t) => t.tank_type !== "TOTES");
            const totes = groupTanks.filter((t) => t.tank_type === "TOTES");

            return (
            <div key={label || "__all__"}>
              {label && (
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">{label}</h2>
                  <div className="h-[1px] flex-1 bg-border/50" />
                  <Badge variant="secondary" className="text-[10px]">{groupTanks.length}</Badge>
                </div>
              )}

              {/* ── Regular Tanks ── */}
              {regularTanks.length > 0 && (
                <div className={cn("grid gap-5 mb-6", kiosk ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6" : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4")}>
                  {regularTanks.map((tank) => {
                    const pct = fillPercent(tank);
                    const color = tank.item_code ? colorMap.get(tank.item_code) ?? null : null;
                    const currentL = tank.current_capacity ? formatCapacity(tank.current_capacity, unit) : "0";
                    const totalL = formatCapacity(tank.tank_capacity, unit);
                    const fillHex = color ?? "#94a3b8";
                    const fillSolid = hexToRgba(fillHex, 0.8);
                    const fillLight = hexToRgba(fillHex, 0.5);
                    const glowColor = hexToRgba(fillHex, 0.3);
                    const isCriticalHigh = pct > 90;
                    const isCriticalLow = pct > 0 && pct < 10;
                    const isEmpty = pct === 0;
                    const isUnassigned = !tank.item_code;

                    return (
                      <div
                        key={tank.tank_code}
                        className={cn(
                          "tank-card rounded-2xl border bg-card p-5 flex flex-col items-center gap-3 group relative",
                          isCriticalHigh && "tank-critical-high",
                          isCriticalLow && "tank-critical-low",
                          (isEmpty || isUnassigned) && "tank-empty",
                          splashing && "tank-splash",
                        )}
                      >
                        {isCriticalHigh && (
                          <div className="absolute -top-2 -right-2 z-20">
                            <Badge className="bg-red-500 text-white border-none text-[9px] px-1.5 py-0 gap-1 animate-pulse shadow-lg">
                              <AlertTriangle className="h-3 w-3" /> {pct}%
                            </Badge>
                          </div>
                        )}
                        {isCriticalLow && (
                          <div className="absolute -top-2 -right-2 z-20">
                            <Badge className="bg-amber-500 text-white border-none text-[9px] px-1.5 py-0 gap-1 animate-pulse shadow-lg">
                              <AlertTriangle className="h-3 w-3" /> LOW
                            </Badge>
                          </div>
                        )}
                        <h3 className="font-bold text-base tracking-wide">{tank.tank_code}</h3>
                        <p className="text-xs text-muted-foreground font-medium">
                          {tank.item_code ? (
                            <span className="flex items-center gap-1.5">
                              <span className="inline-block h-2.5 w-2.5 rounded-full border border-white/20" style={{ backgroundColor: fillHex }} />
                              {tank.item_code}
                            </span>
                          ) : (
                            <span className="italic">No Item Assigned</span>
                          )}
                        </p>
                        <div className="relative flex items-start gap-2 my-1">
                          <div className="relative z-10 flex flex-col items-center" style={{ marginTop: 27, height: 190 }}>
                            <span className="text-[9px] font-bold text-muted-foreground mb-1">{pct}%</span>
                            <div className="relative flex-1 w-[5px] rounded-full border border-border/50 bg-muted overflow-hidden">
                              <div className="absolute bottom-0 left-0 right-0 rounded-full transition-all duration-1000" style={{ height: `${pct}%`, backgroundColor: fillHex }} />
                            </div>
                          </div>
                          <div className="relative flex flex-col items-center">
                            {pct > 0 && (
                              <div className={cn("tank-glow absolute -inset-5 rounded-3xl blur-2xl pointer-events-none", isCriticalHigh && "tank-glow-critical")} style={{ backgroundColor: glowColor }} />
                            )}
                            <div className="relative z-10 w-[130px] h-[20px] rounded-t-[55%] border-2 border-b-0 border-border tank-dome overflow-hidden">
                              <div className="absolute top-[4px] left-[25%] right-[25%] h-[4px] bg-white/10 rounded-full blur-[1px]" />
                            </div>
                            <div className="relative z-10 w-[144px] h-[7px] border-x-2 border-t-2 border-border tank-flange" />
                            <div className="tank-shell relative z-10 w-[130px] h-[190px] border-x-2 border-border overflow-hidden">
                              <div className="absolute top-[28%] left-0 right-0 h-[4px] tank-band z-20" />
                              <div className="absolute top-[62%] left-0 right-0 h-[4px] tank-band z-20" />
                              <div className="absolute bottom-0 left-0 right-0 transition-all duration-1000 ease-out" style={{ height: `${pct}%`, background: `linear-gradient(to top, ${fillSolid}, ${fillLight})` }}>
                                {pct > 0 && pct < 97 && (
                                  <div className={cn("absolute -top-[8px] left-0 right-0 overflow-hidden tank-wave-1", splashing && "tank-wave-splash")}>
                                    <WaveSvg color={fillSolid} />
                                  </div>
                                )}
                                {pct > 0 && pct < 97 && (
                                  <div className={cn("absolute -top-[6px] left-0 right-0 overflow-hidden tank-wave-2 opacity-60", splashing && "tank-wave-splash")}>
                                    <WaveSvg color={fillLight} />
                                  </div>
                                )}
                                <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to right, transparent 15%, rgba(255,255,255,0.1) 38%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.08) 62%, transparent 85%)" }} />
                              </div>
                              <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 50%, rgba(255,255,255,0.02) 100%)" }} />
                              <div className="absolute inset-0 flex items-end justify-center pb-3 z-10">
                                {pct > 15 ? (
                                  <span className="text-[11px] font-bold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">{currentL} {unit}</span>
                                ) : (
                                  <span className="text-[10px] font-semibold text-white/70">{pct === 0 ? "Empty" : `${currentL} ${unit}`}</span>
                                )}
                              </div>
                            </div>
                            <div className="relative z-10 w-[144px] h-[7px] border-x-2 border-b-2 border-border tank-flange" />
                            <div className="relative z-10 flex justify-between w-[118px]">
                              <div className="w-[12px] h-[16px] border border-border border-t-0 tank-leg rounded-b-sm" />
                              <div className="w-[12px] h-[16px] border border-border border-t-0 tank-leg rounded-b-sm" />
                            </div>
                            <div className="relative z-10 w-[140px] h-[4px] rounded-b-sm tank-base" />
                          </div>
                        </div>
                        <div className="w-full space-y-1.5">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, backgroundColor: fillHex }} />
                            </div>
                            <span className="text-xs font-bold w-10 text-right">{pct}%</span>
                          </div>
                          <div className="flex justify-between text-[11px] text-muted-foreground">
                            <span>Current: {currentL} {unit}</span>
                            <span>Total: {totalL} {unit}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── Totes ── */}
              {totes.length > 0 && (
                <>
                  {regularTanks.length > 0 && (
                    <div className="flex items-center gap-3 mb-4">
                      <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Totes</h3>
                      <div className="h-[1px] flex-1 bg-border/50" />
                      <Badge variant="outline" className="text-[10px]">{totes.length}</Badge>
                    </div>
                  )}
                  <div className={cn("grid gap-5", kiosk ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8" : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6")}>
                    {totes.map((tank) => {
                      const pct = fillPercent(tank);
                      const color = tank.item_code ? colorMap.get(tank.item_code) ?? null : null;
                      const currentL = tank.current_capacity ? formatCapacity(tank.current_capacity, unit) : "0";
                      const totalL = formatCapacity(tank.tank_capacity, unit);
                      const fillHex = color ?? "#94a3b8";
                      const fillSolid = hexToRgba(fillHex, 0.8);
                      const fillLight = hexToRgba(fillHex, 0.5);
                      const glowColor = hexToRgba(fillHex, 0.3);
                      const isCriticalHigh = pct > 90;
                      const isCriticalLow = pct > 0 && pct < 10;

                      return (
                        <div
                          key={tank.tank_code}
                          className={cn(
                            "rounded-2xl border bg-card p-3 flex flex-col items-center gap-2 relative",
                            isCriticalHigh && "border-red-400",
                            isCriticalLow && "border-amber-400",
                          )}
                        >
                          {isCriticalHigh && (
                            <div className="absolute -top-2 -right-2 z-20">
                              <Badge className="bg-red-500 text-white border-none text-[9px] px-1.5 py-0 gap-1 animate-pulse shadow-lg">
                                <AlertTriangle className="h-3 w-3" /> {pct}%
                              </Badge>
                            </div>
                          )}
                          {isCriticalLow && (
                            <div className="absolute -top-2 -right-2 z-20">
                              <Badge className="bg-amber-500 text-white border-none text-[9px] px-1.5 py-0 gap-1 animate-pulse shadow-lg">
                                <AlertTriangle className="h-3 w-3" /> LOW
                              </Badge>
                            </div>
                          )}
                          <h3 className="font-bold text-sm tracking-wide">{tank.tank_code}</h3>
                          <p className="text-xs text-muted-foreground">
                            {tank.item_code ? (
                              <span className="flex items-center gap-1">
                                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: fillHex }} />
                                {tank.item_code}
                              </span>
                            ) : <span className="italic">Unassigned</span>}
                          </p>
                          <ToteVisual pct={pct} fillHex={fillHex} currentL={currentL} unit={unit} />
                          <div className="flex justify-between text-[10px] text-muted-foreground w-full">
                            <span>Cap: {totalL} {unit}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
            );
          })}
        </div>
      )}

      {/* Item-wise Tank Summary */}
      {!kiosk && (
        <Card className="card-hover shimmer-hover">
          <CardHeader>
            <CardTitle>Item-wise Tank Summary</CardTitle>
            <CardDescription>{itemSummary.length} items</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {itemSummaryLoading ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Color</TableHead>
                      <TableHead>Item Code</TableHead>
                      <TableHead>Quantity ({unit})</TableHead>
                      <TableHead>Capacity ({unit})</TableHead>
                      <TableHead>Avg Price</TableHead>
                      <TableHead>Adjusted Avg Price</TableHead>
                      <TableHead>Tank Count</TableHead>
                      <TableHead>Tank Numbers</TableHead>
                      <TableHead>Opening Stock</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-9 w-44" /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : itemSummary.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                <Droplets className="h-10 w-10 stroke-1" />
                <p className="text-sm font-medium">No item summary available</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Color</TableHead>
                      <TableHead>Item Code</TableHead>
                      <TableHead>Quantity ({unit})</TableHead>
                      <TableHead>Capacity ({unit})</TableHead>
                      <TableHead>Avg Price</TableHead>
                      <TableHead>Adjusted Avg Price</TableHead>
                      <TableHead>Tank Count</TableHead>
                      <TableHead>Tank Numbers</TableHead>
                      <TableHead>Opening Stock</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itemSummary.map((item) => {
                      const fillPct = maxItemQty > 0 ? (item.quantity_in_liters / maxItemQty) * 100 : 0;
                      const avg = itemAverages.get(item.tank_item_code);
                      const hasAvgRate = avg?.["average_rate(IN_TANK)"] != null;
                      const hasAdjustedAvgRate = avg?.["adjusted_average(STO)"] != null;
                      const canAddOpeningStock = !hasAvgRate && !hasAdjustedAvgRate;
                      return (
                        <TableRow key={item.tank_item_code}>
                          <TableCell>
                            <div
                              className="h-5 w-5 rounded-full border border-border"
                              style={{ backgroundColor: item.color }}
                              title={item.color}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{item.tank_item_code}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <span className="font-medium">{conv(item.quantity_in_liters, unit)}</span>
                              <div className="h-1.5 w-full max-w-[120px] rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-700"
                                  style={{ width: `${fillPct}%`, backgroundColor: item.color }}
                                />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{conv(item.total_capacity, unit)}</TableCell>
                          <TableCell>
                            {avg?.["average_rate(IN_TANK)"] != null
                              ? `₹ ${Number(avg["average_rate(IN_TANK)"]).toLocaleString("en-IN")}`
                              : "—"}
                          </TableCell>
                          <TableCell>
                            {avg?.["adjusted_average(STO)"] != null
                              ? `₹ ${Number(avg["adjusted_average(STO)"]).toLocaleString("en-IN")}`
                              : "—"}
                          </TableCell>
                          <TableCell>{item.tank_count}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {item.tank_numbers.map((tn) => (
                                <Badge key={tn} variant="secondary" className="text-xs">
                                  {tn}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            {canAddOpeningRate && canAddOpeningStock ? (
                              <div className="flex items-center gap-2 min-w-[220px]">
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder="Rate"
                                  value={openingRates[item.tank_item_code] ?? ""}
                                  onChange={(e) => {
                                    const nextRate = e.target.value;
                                    setOpeningRates((prev) => ({
                                      ...prev,
                                      [item.tank_item_code]: nextRate,
                                    }));
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      void submitOpeningStock(item);
                                    }
                                  }}
                                  className="h-8 w-28"
                                />
                                <Button
                                  size="sm"
                                  onClick={() => void submitOpeningStock(item)}
                                  disabled={openingSubmitMap[item.tank_item_code]}
                                  className="h-8"
                                >
                                  {openingSubmitMap[item.tank_item_code] ? "Saving..." : "Save"}
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {!canAddOpeningRate ? "—" : "Already has avg rate"}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

    </div>
  );
}
