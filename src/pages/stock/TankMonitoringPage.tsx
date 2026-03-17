import { useEffect, useState } from "react";
import {
  Droplets,
  Gauge,
  Warehouse,
  BarChart3,
  Container,
  Package,
  Layers,
} from "lucide-react";

import { getTanks, getTankItems, getItemWiseTankSummary, getTankSummary, getTankLayers, type Tank, type TankItem, type ItemWiseTankSummary, type TankSummary, type TankLayersResponse } from "@/api/tank";
import { useAuth } from "@/context/AuthContext";
import { toastApiError } from "@/lib/errors";
import { getErrorMessage } from "@/lib/errors";
import { SummaryCard } from "@/components/SummaryCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";


type Unit = "L" | "MT";
const L_PER_MT = 1000;

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

/** Hex → rgba helper for glow / gradient effects */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/* ─── SVG wave paths (two layers for realistic liquid surface) ─── */

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

export default function TankMonitoringPage() {
  const { role } = useAuth();
  const isFTR = role === "FTR";
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [tankItems, setTankItems] = useState<TankItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [itemSummary, setItemSummary] = useState<ItemWiseTankSummary[]>([]);
  const [itemSummaryLoading, setItemSummaryLoading] = useState(true);
  const [tankSummary, setTankSummary] = useState<TankSummary | null>(null);
  const [unit, setUnit] = useState<Unit>("L");

  // Rate breakdown dialog
  const [layersData, setLayersData] = useState<TankLayersResponse | null>(null);
  const [layersLoading, setLayersLoading] = useState(false);

  async function openRateBreakdown(tankCode: string) {
    setLayersLoading(true);
    setLayersData(null);
    try {
      const data = await getTankLayers(tankCode);
      setLayersData(data);
    } catch (err) {
      toastApiError(err, "Failed to load rate breakdown.");
    } finally {
      setLayersLoading(false);
    }
  }

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
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
    fetchData();
    fetchItemSummary();
    fetchTankSummary();
  }, []);

  async function fetchTankSummary() {
    try {
      const data = await getTankSummary();
      setTankSummary(data);
    } catch {
      // non-critical
    }
  }

  async function fetchItemSummary() {
    setItemSummaryLoading(true);
    try {
      const data = await getItemWiseTankSummary();
      setItemSummary(data);
    } catch {
      // non-critical
    } finally {
      setItemSummaryLoading(false);
    }
  }

  const colorMap = new Map(
    tankItems.map((i) => [i.tank_item_code, i.color])
  );


  return (
    <div className="p-6 space-y-6 animate-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tank Monitoring</h1>
          <div className="flex items-center gap-1.5 mt-1">
            <Droplets className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Live Tank Visual Display</p>
          </div>
        </div>
        <div className="flex items-center rounded-lg border bg-muted p-0.5">
          <button
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${unit === "L" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setUnit("L")}
          >
            Liters
          </button>
          <button
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${unit === "MT" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setUnit("MT")}
          >
            MTS
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Tank Summary Cards */}
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

      {/* Loading skeleton */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border bg-card p-5 flex flex-col items-center gap-3"
            >
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
        /* ─── Tank grid ─── */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {tanks.map((tank) => {
            const pct = fillPercent(tank);
            const color = tank.item_code
              ? colorMap.get(tank.item_code) ?? null
              : null;
            const currentL = tank.current_capacity
              ? formatCapacity(tank.current_capacity, unit)
              : "0";
            const totalL = formatCapacity(tank.tank_capacity, unit);

            // Derived colours
            const fillHex = color ?? "#94a3b8"; // slate-400 fallback
            const fillSolid = hexToRgba(fillHex, 0.8);
            const fillLight = hexToRgba(fillHex, 0.5);
            const glowColor = hexToRgba(fillHex, 0.3);

            return (
              <div
                key={tank.tank_code}
                className="tank-card rounded-2xl border bg-card p-5 flex flex-col items-center gap-3"
              >
                {/* Tank Number */}
                <h3 className="font-bold text-base tracking-wide">
                  {tank.tank_code}
                </h3>

                {/* Item Code with color dot */}
                <p className="text-xs text-muted-foreground font-medium">
                  {tank.item_code ? (
                    <span className="flex items-center gap-1.5">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full border border-white/20"
                        style={{ backgroundColor: fillHex }}
                      />
                      {tank.item_code}
                    </span>
                  ) : (
                    "No Item Assigned"
                  )}
                </p>

                {/* ─── Industrial Tank Visual ─── */}
                <div className="relative flex items-start gap-2 my-1">
                  {/* Level gauge (outside, left side) */}
                  <div className="relative z-10 flex flex-col items-center" style={{ marginTop: 27, height: 190 }}>
                    {/* Percentage label */}
                    <span className="text-[9px] font-bold text-muted-foreground mb-1">{pct}%</span>
                    {/* Gauge track */}
                    <div className="relative flex-1 w-[5px] rounded-full border border-border/50 bg-muted overflow-hidden">
                      <div
                        className="absolute bottom-0 left-0 right-0 rounded-full transition-all duration-1000"
                        style={{ height: `${pct}%`, backgroundColor: fillHex }}
                      />
                    </div>
                  </div>

                  {/* Tank structure */}
                  <div className="relative flex flex-col items-center">
                  {/* Glow behind tank */}
                  {pct > 0 && (
                    <div
                      className="tank-glow absolute -inset-5 rounded-3xl blur-2xl pointer-events-none"
                      style={{ backgroundColor: glowColor }}
                    />
                  )}

                  {/* Dome cap */}
                  <div className="relative z-10 w-[130px] h-[20px] rounded-t-[55%] border-2 border-b-0 border-border tank-dome overflow-hidden">
                    <div className="absolute top-[4px] left-[25%] right-[25%] h-[4px] bg-white/10 rounded-full blur-[1px]" />
                  </div>

                  {/* Top flange */}
                  <div className="relative z-10 w-[144px] h-[7px] border-x-2 border-t-2 border-border tank-flange" />

                  {/* Tank body */}
                  <div className="tank-shell relative z-10 w-[130px] h-[190px] border-x-2 border-border overflow-hidden">
                    {/* Reinforcement bands */}
                    <div className="absolute top-[28%] left-0 right-0 h-[4px] tank-band z-20" />
                    <div className="absolute top-[62%] left-0 right-0 h-[4px] tank-band z-20" />

                    {/* Liquid fill */}
                    <div
                      className="absolute bottom-0 left-0 right-0 transition-all duration-1000 ease-out"
                      style={{
                        height: `${pct}%`,
                        background: `linear-gradient(to top, ${fillSolid}, ${fillLight})`,
                      }}
                    >
                      {/* Wave layer 1 (Uiverse.io-style animated waves) */}
                      {pct > 0 && pct < 97 && (
                        <div className="absolute -top-[8px] left-0 right-0 overflow-hidden tank-wave-1">
                          <WaveSvg color={fillSolid} />
                        </div>
                      )}

                      {/* Wave layer 2 (offset for depth) */}
                      {pct > 0 && pct < 97 && (
                        <div className="absolute -top-[6px] left-0 right-0 overflow-hidden tank-wave-2 opacity-60">
                          <WaveSvg color={fillLight} />
                        </div>
                      )}

                      {/* Vertical shine streak */}
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background:
                            "linear-gradient(to right, transparent 15%, rgba(255,255,255,0.1) 38%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.08) 62%, transparent 85%)",
                        }}
                      />
                    </div>

                    {/* Glass reflection on empty area */}
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 50%, rgba(255,255,255,0.02) 100%)",
                      }}
                    />

                    {/* Capacity text inside tank */}
                    <div className="absolute inset-0 flex items-end justify-center pb-3 z-10">
                      {pct > 15 ? (
                        <span className="text-[11px] font-bold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
                          {currentL} {unit}
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-white/70">
                          {pct === 0 ? "Empty" : `${currentL} ${unit}`}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bottom flange */}
                  <div className="relative z-10 w-[144px] h-[7px] border-x-2 border-b-2 border-border tank-flange" />

                  {/* Support legs */}
                  <div className="relative z-10 flex justify-between w-[118px]">
                    <div className="w-[12px] h-[16px] border border-border border-t-0 tank-leg rounded-b-sm" />
                    <div className="w-[12px] h-[16px] border border-border border-t-0 tank-leg rounded-b-sm" />
                  </div>

                  {/* Base plate */}
                  <div className="relative z-10 w-[140px] h-[4px] rounded-b-sm tank-base" />
                  </div>
                </div>

                {/* Fill progress bar */}
                <div className="w-full space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{ width: `${pct}%`, backgroundColor: fillHex }}
                      />
                    </div>
                    <span className="text-xs font-bold w-10 text-right">{pct}%</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>Current: {currentL} {unit}</span>
                    <span>Total: {totalL} {unit}</span>
                  </div>
                </div>

                {/* Rate Breakdown button */}
                {!isFTR && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-1.5 text-xs"
                    onClick={() => openRateBreakdown(tank.tank_code)}
                  >
                    <Layers className="h-3.5 w-3.5" />
                    Rate Breakdown
                  </Button>
                )}

              </div>
            );
          })}
        </div>
      )}

      {/* Item-wise Tank Summary */}
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
                      <TableHead>Tank Count</TableHead>
                      <TableHead>Tank Numbers</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
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
                      <TableHead>Tank Count</TableHead>
                      <TableHead>Tank Numbers</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itemSummary.map((item) => (
                      <TableRow key={item.tank_item_code}>
                        <TableCell>
                          <div
                            className="h-5 w-5 rounded-full border border-border"
                            style={{ backgroundColor: item.color }}
                            title={item.color}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{item.tank_item_code}</TableCell>
                        <TableCell>{conv(item.quantity_in_liters, unit)}</TableCell>
                        <TableCell>{conv(item.total_capacity, unit)}</TableCell>
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

      {/* Rate Breakdown Dialog */}
      <Dialog open={layersLoading || !!layersData} onOpenChange={() => setLayersData(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Rate Breakdown
            </DialogTitle>
            <DialogDescription>
              {layersData ? `Tank ${layersData.tank_code}` : "Loading..."}
            </DialogDescription>
          </DialogHeader>

          {layersLoading ? (
            <div className="space-y-3 py-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : layersData ? (
            <div className="space-y-4">
              {/* Tank Info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Tank Code</p>
                  <p className="text-sm font-medium">{layersData.tank_code}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Item Code</p>
                  <p className="text-sm font-medium">
                    {tanks.find((t) => t.tank_code === layersData.tank_code)?.item_code ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tank Capacity</p>
                  <p className="text-sm font-medium">{conv(layersData.tank_capacity ?? 0, unit)} {unit}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Current Capacity</p>
                  <p className="text-sm font-medium">{conv(layersData.current_capacity ?? 0, unit)} {unit}</p>
                </div>
              </div>

              <Separator />

              {/* Layers */}
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Layers ({(layersData.layers ?? []).length})
                </h3>
                {(layersData.layers ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No layers found</p>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">#</TableHead>
                          <TableHead>Rate</TableHead>
                          <TableHead>Quantity</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(layersData.layers ?? []).map((layer, idx) => (
                          <TableRow key={layer.layer_id}>
                            <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                            <TableCell>&#8377; {layer.rate.toLocaleString("en-IN")}</TableCell>
                            <TableCell>{conv(layer.quantity_remaining, unit)} {unit}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              <Separator />

              {/* Totals */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Total Quantity</p>
                  <p className="text-sm font-semibold">{conv(layersData.total_quantity ?? 0, unit)} {unit}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Cost</p>
                  <p className="text-sm font-semibold">&#8377; {(layersData.total_cost ?? 0).toLocaleString("en-IN")}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Weighted Avg Rate</p>
                  <p className="text-sm font-semibold">&#8377; {(layersData.weighted_avg_rate ?? 0).toLocaleString("en-IN")}</p>
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setLayersData(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
