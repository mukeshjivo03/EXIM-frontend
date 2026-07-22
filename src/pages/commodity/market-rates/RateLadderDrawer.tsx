import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

import type { MarketRate } from "@/api/marketRate";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { fmtINR, LADDER_COLORS } from "./CommodityCard";

const LTR_COLOR = "#64748b"; // slate-500

/** Format a rate's date safely — the API may omit it, leaving an empty/invalid string. */
function safeDateLabel(date: string | undefined | null, fmt: string, fallback: string): string {
  if (!date) return fallback;
  const d = parseISO(date);
  return isNaN(d.getTime()) ? fallback : format(d, fmt);
}

function useIsMobile() {
  const [mobile, setMobile] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const onChange = (e: MediaQueryListEvent) => setMobile(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return mobile;
}

export interface DrawerTarget {
  commodityId: number;
  name: string;
  /** pinned date (from heatmap click); undefined = latest/today */
  date?: string;
}

interface RateLadderDrawerProps {
  target: DrawerTarget | null;
  /** full history for the target commodity, asc by date */
  history: MarketRate[];
  onClose: () => void;
}

/* Waterfall of the server-computed price ladder (plain SVG). */
function WaterfallChart({ factory, packing, gstKg, gstLtr }: { factory: number; packing: number; gstKg: number; gstLtr: number }) {
  const W = 340;
  const H = 200;
  const top = 26;
  const bottom = 26;
  const plotH = H - top - bottom;

  const yMin = Math.min(factory, gstLtr) * 0.965;
  const yMax = gstKg * 1.01;
  const y = (v: number) => top + (1 - (v - yMin) / (yMax - yMin || 1)) * plotH;

  const barW = 56;
  const gap = (W - 4 * barW) / 5;
  const x = (i: number) => gap + i * (barW + gap);

  const bars = [
    { label: "Factory", from: yMin, to: factory, color: LADDER_COLORS.factory, step: null as string | null },
    { label: "+ Packing", from: factory, to: packing, color: LADDER_COLORS.packing, step: `+₹${fmtINR(packing - factory)}` },
    { label: "+ GST 0.5%", from: packing, to: gstKg, color: LADDER_COLORS.gst, step: `+₹${fmtINR(gstKg - packing)}` },
    { label: "Per Litre", from: yMin, to: gstLtr, color: LTR_COLOR, step: "÷1.0989" },
  ];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Price build-up waterfall">
      <line x1={x(0) + barW} y1={y(factory)} x2={x(1)} y2={y(factory)} stroke="currentColor" strokeDasharray="3 3" opacity="0.3" />
      <line x1={x(1) + barW} y1={y(packing)} x2={x(2)} y2={y(packing)} stroke="currentColor" strokeDasharray="3 3" opacity="0.3" />
      <line x1={x(2) + barW} y1={y(gstKg)} x2={x(3)} y2={y(gstKg)} stroke="currentColor" strokeDasharray="3 3" opacity="0.3" />

      {bars.map((b, i) => {
        const yTop = y(Math.max(b.from, b.to));
        const yBot = y(Math.min(b.from, b.to));
        const h = Math.max(3, yBot - yTop);
        const value = i === 0 ? factory : i === 1 ? packing : i === 2 ? gstKg : gstLtr;
        return (
          <g key={b.label}>
            <rect x={x(i)} y={yTop} width={barW} height={h} rx={3} fill={b.color} opacity={0.9} />
            <text x={x(i) + barW / 2} y={yTop - 6} textAnchor="middle" fontSize="11" fontWeight="700" fill="currentColor" className="tabular-nums">
              ₹{fmtINR(value)}
            </text>
            {b.step && (
              <text x={x(i) + barW / 2} y={Math.min(yBot + 12, H - bottom + 10)} textAnchor="middle" fontSize="9" fontWeight="600" fill="currentColor" opacity="0.55" className="tabular-nums">
                {b.step}
              </text>
            )}
            <text x={x(i) + barW / 2} y={H - 6} textAnchor="middle" fontSize="9.5" fontWeight="700" fill="currentColor" opacity="0.7">
              {b.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function RateLadderDrawer({ target, history, onClose }: RateLadderDrawerProps) {
  const isMobile = useIsMobile();

  const entry = useMemo(() => {
    if (!target || history.length === 0) return null;
    if (target.date) return history.find((h) => h.date === target.date) ?? null;
    return history[history.length - 1];
  }, [target, history]);

  const values = entry
    ? {
        factory: Number(entry.factory_kg),
        packing: Number(entry.with_packing),
        gstKg: Number(entry.with_gst_kg),
        gstLtr: Number(entry.with_gst_ltr),
        dateLabel: safeDateLabel(entry.date, "d MMM yyyy", "latest"),
      }
    : null;

  // Last 30 logged days for the line chart
  const chartData = useMemo(
    () =>
      history.slice(-30).map((h, i) => ({
        date: safeDateLabel(h.date, "d MMM", `#${i + 1}`),
        price: Number(h.factory_kg),
      })),
    [history]
  );

  return (
    <Sheet open={!!target} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={isMobile ? "max-h-[85dvh] overflow-y-auto rounded-t-2xl" : "w-full sm:max-w-lg overflow-y-auto"}
      >
        <SheetHeader>
          <SheetTitle>{target?.name}</SheetTitle>
          <SheetDescription>Price ladder · {values?.dateLabel ?? "no data"}</SheetDescription>
        </SheetHeader>

        {values ? (
          <div className="px-6 pb-8 space-y-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Price Build-up</p>
              <div className="rounded-xl border bg-muted/20 p-3 text-foreground">
                <WaterfallChart factory={values.factory} packing={values.packing} gstKg={values.gstKg} gstLtr={values.gstLtr} />
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Factory Rate · Last {chartData.length} Logged Day{chartData.length === 1 ? "" : "s"}
              </p>
              {chartData.length === 0 ? (
                <div className="rounded-xl border bg-muted/20 py-10 text-center text-xs text-muted-foreground">
                  No logged history for this commodity yet.
                </div>
              ) : (
                <div className="rounded-xl border bg-muted/20 p-2">
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={chartData} margin={{ top: 10, right: 12, left: -6, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={54} domain={["auto", "auto"]} tickFormatter={(v: number) => `₹${v}`} />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          return (
                            <div className="rounded-lg border bg-card px-3 py-2 shadow-lg text-xs">
                              <p className="font-bold">{label}</p>
                              <p className="tabular-nums">₹{fmtINR(payload[0].value as number)}</p>
                            </div>
                          );
                        }}
                      />
                      <Line type="monotone" dataKey="price" stroke={LADDER_COLORS.factory} strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Computed Values · {values.dateLabel}
              </p>
              <div className="rounded-xl border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/60 hover:bg-muted/60">
                      <TableHead className="font-bold text-foreground text-xs">Measure</TableHead>
                      <TableHead className="text-right font-bold text-foreground text-xs">Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      ["Factory (₹/Kg)", values.factory],
                      ["With Packing (₹/Kg)", values.packing],
                      ["With GST (₹/Kg)", values.gstKg],
                      ["With GST (₹/Ltr)", values.gstLtr],
                    ].map(([label, v]) => (
                      <TableRow key={label as string}>
                        <TableCell className="text-sm text-muted-foreground">{label}</TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">₹{fmtINR(v as number)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        ) : (
          <div className="px-6 pb-8 text-sm text-muted-foreground">No logged rates for this commodity.</div>
        )}
      </SheetContent>
    </Sheet>
  );
}
