import { useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { AlertCircle, Check, PackageOpen } from "lucide-react";

import {
  addMarketRate,
  updateMarketRate,
  updateCommodity,
  getMarketRates,
  type CommodityMargin,
  type MarketRate,
} from "@/api/marketRate";
import { toastApiError } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DeltaChip } from "@/components/DeltaChip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { fmtINR } from "./CommodityCard";

/**
 * Derived-price formula (mirrors the server-side model properties documented
 * in api/marketRate.ts). Used only for the live in-grid preview — once saved,
 * the API's own computed values are shown instead. NB: packing/GST use the
 * BASIC factory price; freight is a separate add (Factory+Freight = basic + freight).
 *   with_packing = factory_kg + 14
 *   with_gst_kg  = with_packing × 1.05
 *   with_gst_ltr = with_gst_kg ÷ 1.0989
 */
const PACKING_ADD = 14;
const GST_KG_MULT = 1.05;
const GST_LTR_DIV = 1.0989;

function derive(basic: number) {
  const packing = basic + PACKING_ADD;
  const gstKg = packing * GST_KG_MULT;
  return { packing, gstKg, gstLtr: gstKg / GST_LTR_DIV };
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

interface EditableRatesTableProps {
  commodities: CommodityMargin[];
  byCommodity: Map<number, MarketRate[]>;
  todayByCommodity: Map<number, MarketRate>;
  latestByCommodity: Map<number, MarketRate>;
  idsAvailable: boolean;
  createdBy: string;
  search: string;
  onSaved: () => void;
  onSelect: (commodityId: number, name: string) => void;
}

/**
 * The Today's Rates table, editable in place: type the factory ₹/Kg (basic) per
 * commodity and factory+freight / packing / GST columns compute live; Enter/↓
 * moves down the column. Rows are saved via POST /rates/market-rate/add/.
 */
export function EditableRatesTable({
  commodities, byCommodity, todayByCommodity, latestByCommodity, idsAvailable, createdBy, search, onSaved, onSelect,
}: EditableRatesTableProps) {
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Inline freight editor (opened via the "F" shortcut or the freight pill)
  const [freightEditId, setFreightEditId] = useState<number | null>(null);
  const [freightDraft, setFreightDraft] = useState("");
  const [savingFreight, setSavingFreight] = useState(false);
  // Locally-applied freight values after a PATCH, so we don't reload and lose
  // in-progress factory drafts (undefined = not overridden, null = cleared).
  const [freightOverrides, setFreightOverrides] = useState<Record<number, string | null>>({});

  const todayIso = format(new Date(), "yyyy-MM-dd");

  function openFreight(id: number, current: string | number | null | undefined) {
    setFreightDraft(current != null && String(current).trim() !== "" ? String(current) : "");
    setFreightEditId(id);
  }

  async function saveFreight(id: number) {
    const v = freightDraft.trim();
    if (v !== "" && (!Number.isFinite(Number(v)) || Number(v) < 0)) {
      toast.error("Freight must be a positive number.");
      return;
    }
    const saved = v === "" ? null : Number(v).toFixed(2);
    setSavingFreight(true);
    try {
      await updateCommodity(id, { freight_rate: saved });
      toast.success("Freight updated.");
      // Apply locally instead of reloading — keeps unsaved factory rates intact.
      setFreightOverrides((prev) => ({ ...prev, [id]: saved }));
      setFreightEditId(null);
    } catch (err) {
      toastApiError(err, "Failed to update freight.");
    } finally {
      setSavingFreight(false);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return commodities;
    return commodities.filter((c) => c.commodity.toLowerCase().includes(q));
  }, [commodities, search]);

  /** commodity ids with an edited, valid, changed value → to be saved */
  const dirtyIds = useMemo(() => {
    const ids: number[] = [];
    for (const c of commodities) {
      const id = c.id;
      if (id == null) continue;
      const draft = drafts[id];
      if (draft === undefined || draft.trim() === "") continue;
      const n = Number(draft);
      if (!Number.isFinite(n) || n <= 0) continue;
      const logged = todayByCommodity.get(id);
      const loggedVal = logged ? Number(logged.factory_kg) : null;
      if (loggedVal == null || n !== loggedVal) ids.push(id);
    }
    return ids;
  }, [commodities, drafts, todayByCommodity]);

  const loggedTodayCount = todayByCommodity.size;

  function focusRow(index: number, delta: number) {
    const next = inputRefs.current[index + delta];
    if (next) {
      next.focus();
      next.select();
    }
  }

  function handleKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number,
    id: number | null | undefined,
    currentFreight: string | number | null | undefined
  ) {
    if (e.key === "Enter" || e.key === "ArrowDown") {
      e.preventDefault();
      focusRow(index, 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      focusRow(index, -1);
    } else if ((e.key === "f" || e.key === "F") && id != null) {
      // Shortcut: reveal & edit this commodity's freight without leaving the row.
      e.preventDefault();
      openFreight(id, currentFreight);
    }
  }

  async function handleSaveAll() {
    if (dirtyIds.length === 0) {
      toast.error("Enter at least one factory rate.");
      return;
    }
    setSaving(true);

    // (commodity, date) is unique. Fetch today's rows with a server-side date
    // filter so we know their ids and can UPDATE them instead of inserting
    // duplicates — this works even when the list response omits the date field.
    const existingToday = new Map<number, MarketRate>();
    try {
      const todays = await getMarketRates({ date: todayIso });
      for (const r of todays) {
        // Trust the server-side date filter when the row carries no date;
        // otherwise require it to actually be today's row.
        const rDate = String(r.date ?? r.created_at ?? r.created_on ?? "").slice(0, 10);
        const isToday = rDate === "" || rDate === todayIso;
        if (isToday && r.commodity != null && r.id != null) existingToday.set(r.commodity, r);
      }
    } catch {
      // Lookup failed — fall back to whatever we already have client-side.
      for (const [fk, r] of todayByCommodity) existingToday.set(fk, r);
    }

    const results = await Promise.allSettled(
      dirtyIds.map((id) => {
        const factory_kg = Number(drafts[id]).toFixed(2);
        const existing = existingToday.get(id);
        if (existing?.id != null) {
          return updateMarketRate(existing.id, { factory_kg });
        }
        return addMarketRate({ commodity: id, factory_kg, created_by: createdBy });
      })
    );
    setSaving(false);
    const ok = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.length - ok;
    if (ok > 0) {
      toast.success(`Logged ${ok} rate${ok === 1 ? "" : "s"}.`);
      setDrafts({});
      onSaved();
    }
    if (failed > 0) {
      const firstError = results.find((r): r is PromiseRejectedResult => r.status === "rejected");
      toastApiError(firstError?.reason, `${failed} rate${failed === 1 ? "" : "s"} failed to save.`);
    }
  }

  return (
    <div className="space-y-3">
      {/* Status badge on top of the table */}
      <div className="flex flex-wrap items-center gap-2">
        {loggedTodayCount === 0 ? (
          <Badge variant="outline" className="gap-1.5 border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-300">
            <AlertCircle className="h-3.5 w-3.5" />
            No rates logged today — enter them below
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1.5 border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300">
            <Check className="h-3.5 w-3.5" />
            {loggedTodayCount} logged today · {format(new Date(), "d MMM yyyy")}
          </Badge>
        )}
        <span className="text-[11px] text-muted-foreground">Press Enter or ↓ to move down · <kbd className="rounded border px-1 font-mono">F</kbd> to edit a row's freight.</span>
      </div>

      {!idsAvailable && commodities.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 dark:border-amber-800/40 bg-amber-50/50 dark:bg-amber-950/20 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
            The commodity API does not return <strong>id</strong> yet, so rates cannot be linked to commodities.
            Add <code>id</code> to the backend serializers to enable logging.
          </p>
        </div>
      )}

      <div className="rounded-md border overflow-x-auto">
        <Table className="text-base">
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow className="bg-muted/60 hover:bg-muted/60">
              <TableHead className="w-12 text-center font-bold text-foreground">#</TableHead>
              <TableHead className="font-bold text-foreground">Commodity</TableHead>
              <TableHead className="w-44 text-right font-bold text-foreground">Factory (Basic)</TableHead>
              <TableHead className="text-right font-bold text-foreground">Factory + Freight</TableHead>
              <TableHead className="text-right font-bold text-foreground">With Packing</TableHead>
              <TableHead className="text-right font-bold text-foreground">With GST /Kg</TableHead>
              <TableHead className="text-right font-bold text-foreground">With GST /Ltr</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-16">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <PackageOpen className="h-10 w-10 stroke-1" />
                    <p className="text-sm font-medium">
                      {search ? "No commodities match your search" : "No commodities configured yet"}
                    </p>
                    {!search && <p className="text-xs">Use "Add Commodity" to create the first one.</p>}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((c, idx) => {
                const id = c.id;
                const disabled = id == null;
                const logged = id != null ? todayByCommodity.get(id) : undefined;
                const last = id != null ? latestByCommodity.get(id) : undefined;
                const history = id != null ? byCommodity.get(id) ?? [] : [];
                const past = history.filter((h) => h.date < todayIso);
                const prev = past.length > 0 ? past[past.length - 1] : null;
                // Previous Factory+Freight (landed) for the delta badge.
                const prevFF = prev ? num(prev.factory_kg_freight) || num(prev.factory_kg) + num(prev.freight_rate) : null;

                // Prefer today's logged rate, else fall back to the latest known rate so the
                // freight / packing / GST columns are always populated.
                const source = logged ?? last;
                const sourceVal = source ? Number(source.factory_kg) : null;
                const draft = id != null ? drafts[id] : undefined;
                const displayStr = draft !== undefined ? draft : sourceVal != null ? String(sourceVal) : "";
                const effNum = Number(displayStr);
                const valid = displayStr.trim() !== "" && Number.isFinite(effNum) && effNum > 0;
                const isDirty = id != null && dirtyIds.includes(id);

                // Freight is a SEPARATE add: Factory+Freight = basic + freight_rate.
                // Packing/GST derive from the BASIC factory price only (freight excluded).
                // A locally-saved override (from the inline PATCH) wins to avoid a reload.
                const freightOverride = id != null ? freightOverrides[id] : undefined;
                const freightChanged = freightOverride !== undefined;
                const freightRawVal = freightChanged ? freightOverride : c.freight_rate ?? source?.freight_rate ?? null;
                const freightComp = freightChanged
                  ? num(freightOverride)
                  : num(c.freight_rate ?? source?.freight_rate ?? 0);

                // Factory + Freight (landed): server value when nothing changed, else recompute.
                const factoryFreight = valid
                  ? !isDirty && !freightChanged && source?.factory_kg_freight != null
                    ? num(source.factory_kg_freight)
                    : effNum + freightComp
                  : null;

                // Packing / GST come from the server for unedited rows, else the basic-only formula.
                const computed = valid
                  ? !isDirty && source
                    ? { packing: num(source.with_packing), gstKg: num(source.with_gst_kg), gstLtr: num(source.with_gst_ltr) }
                    : derive(effNum)
                  : null;

                return (
                  <TableRow
                    key={id ?? `${c.commodity}-${idx}`}
                    className={cn(
                      "border-b border-border/50",
                      logged && "bg-emerald-50/40 dark:bg-emerald-950/10",
                      isDirty && "bg-primary/5"
                    )}
                  >
                    <TableCell className="text-center text-muted-foreground text-sm">{idx + 1}</TableCell>
                    <TableCell>
                      <button
                        type="button"
                        className="font-semibold text-left hover:underline disabled:no-underline disabled:cursor-default"
                        disabled={disabled}
                        onClick={() => id != null && onSelect(id, c.commodity)}
                        title={disabled ? undefined : "View rate history"}
                      >
                        {c.commodity}
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        ref={(el) => { inputRefs.current[idx] = el; }}
                        type="number"
                        min={0}
                        step="0.01"
                        inputMode="decimal"
                        placeholder={last ? Number(last.factory_kg).toFixed(2) : "₹/Kg"}
                        disabled={disabled}
                        title={disabled ? "Backend must expose commodity id first" : undefined}
                        className="h-9 w-32 ml-auto text-right tabular-nums font-bold"
                        value={displayStr}
                        onKeyDown={(e) => handleKeyDown(e, idx, id, freightRawVal)}
                        onChange={(e) => {
                          if (id == null) return;
                          const v = e.target.value;
                          setDrafts((prev) => ({ ...prev, [id]: v }));
                        }}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end gap-0.5">
                        {factoryFreight != null ? (
                          <>
                            <span className="tabular-nums font-medium">{fmtINR(factoryFreight)}</span>
                            <DeltaChip current={factoryFreight} previous={prevFF} size="sm" />
                          </>
                        ) : (
                          <span className="text-muted-foreground/50">—</span>
                        )}
                        <Popover
                          open={freightEditId === id}
                          onOpenChange={(o) => { if (!o) setFreightEditId(null); }}
                        >
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              disabled={disabled}
                              onClick={() => id != null && openFreight(id, freightRawVal)}
                              className="text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-default tabular-nums"
                              title="Edit freight (shortcut: F)"
                            >
                              Freight ₹{fmtINR(freightComp)} · edit
                            </button>
                          </PopoverTrigger>
                          <PopoverContent align="end" className="w-56 p-3 space-y-2">
                            <p className="text-xs font-medium">Freight for {c.commodity}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">₹</span>
                              <Input
                                autoFocus
                                type="number"
                                min={0}
                                step="0.01"
                                inputMode="decimal"
                                placeholder="0.00"
                                className="h-8 text-right tabular-nums"
                                value={freightDraft}
                                onChange={(e) => setFreightDraft(e.target.value)}
                                onFocus={(e) => e.currentTarget.select()}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") { e.preventDefault(); if (id != null) saveFreight(id); }
                                  else if (e.key === "Escape") { e.preventDefault(); setFreightEditId(null); }
                                }}
                              />
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="ghost" onClick={() => setFreightEditId(null)}>Cancel</Button>
                              <Button size="sm" disabled={savingFreight} onClick={() => id != null && saveFreight(id)}>
                                {savingFreight ? "Saving..." : "Save"}
                              </Button>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </TableCell>
                    <TableCell className={cn("text-right tabular-nums", computed ? "text-muted-foreground" : "text-muted-foreground/50")}>
                      {computed ? fmtINR(computed.packing) : "—"}
                    </TableCell>
                    <TableCell className={cn("text-right tabular-nums", computed ? "text-muted-foreground" : "text-muted-foreground/50")}>
                      {computed ? fmtINR(computed.gstKg) : "—"}
                    </TableCell>
                    <TableCell className={cn("text-right tabular-nums", computed ? "text-muted-foreground" : "text-muted-foreground/50")}>
                      {computed ? fmtINR(computed.gstLtr) : "—"}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <Button size="sm" className="gap-1.5 btn-press" onClick={handleSaveAll} disabled={saving || dirtyIds.length === 0}>
          <Check className="h-4 w-4" />
          {saving ? "Saving..." : `Log Rates${dirtyIds.length > 0 ? ` (${dirtyIds.length})` : ""}`}
        </Button>
      </div>
    </div>
  );
}
