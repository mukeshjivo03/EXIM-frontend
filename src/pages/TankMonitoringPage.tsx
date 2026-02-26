import { useEffect, useState } from "react";
import { AxiosError } from "axios";
import { Droplets } from "lucide-react";

import { getTanks, getTankItems, type Tank, type TankItem } from "@/api/tank";
import { Skeleton } from "@/components/ui/skeleton";

function formatCapacity(value: string | number): string {
  return Number(value).toLocaleString();
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
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [tankItems, setTankItems] = useState<TankItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [t, i] = await Promise.all([getTanks(), getTankItems()]);
        setTanks((t ?? []).sort((a, b) => a.id - b.id));
        setTankItems(i ?? []);
      } catch (err) {
        setError(
          err instanceof AxiosError
            ? (err.response?.data?.detail ?? err.message)
            : "Failed to load data"
        );
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const colorMap = new Map(
    tankItems.map((i) => [i.tank_item_code, i.color])
  );

  return (
    <div className="p-6 space-y-6 animate-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Tank Monitoring</h1>
        <div className="flex items-center gap-1.5 mt-1">
          <Droplets className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Live Tank Visual Display</p>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

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
              ? formatCapacity(tank.current_capacity)
              : "0";
            const totalL = formatCapacity(tank.tank_capacity);

            // Derived colours
            const fillHex = color ?? "#94a3b8"; // slate-400 fallback
            const fillSolid = hexToRgba(fillHex, 0.8);
            const fillLight = hexToRgba(fillHex, 0.5);
            const glowColor = hexToRgba(fillHex, 0.3);

            return (
              <div
                key={tank.id}
                className="tank-card rounded-2xl border bg-card p-5 flex flex-col items-center gap-3"
              >
                {/* Tank Number */}
                <h3 className="font-bold text-base tracking-wide">
                  Tank {tank.tank_number}
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
                <div className="relative flex flex-col items-center my-1">
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

                    {/* Level gauge (left side) */}
                    <div className="absolute top-3 bottom-3 left-[7px] w-[5px] rounded-full border border-border/50 bg-black/15 z-20 overflow-hidden">
                      <div
                        className="absolute bottom-0 left-0 right-0 rounded-full transition-all duration-1000"
                        style={{ height: `${pct}%`, backgroundColor: fillHex }}
                      />
                    </div>

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
                          {currentL} L
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-muted-foreground">
                          {pct === 0 ? "Empty" : `${currentL} L`}
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
                    <span>Current: {currentL} L</span>
                    <span>Total: {totalL} L</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
