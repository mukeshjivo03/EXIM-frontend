import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format, subDays } from "date-fns";

import {
  getCommodities,
  getLatestMarketRates,
  getMarketRates,
  type CommodityMargin,
  type MarketRate,
} from "@/api/marketRate";

/**
 * The backend may send the rate's day as `date`, or as a `created_at` / `created_on`
 * timestamp (possibly a full datetime). Normalize everything to a YYYY-MM-DD string
 * so the grouping / today-detection / history filters have a stable key.
 */
function normalizeRateDate(r: MarketRate): string {
  const raw = r.date ?? r.created_at ?? r.created_on ?? "";
  return String(raw).slice(0, 10);
}

/** Today's rate joined with commodity name + history-derived fields. */
export interface EnrichedRate {
  /** MarketRate row id — undefined until the backend exposes id */
  rateId?: number;
  commodityId: number;
  name: string;
  factory: number;
  packing: number;
  gstKg: number;
  gstLtr: number;
  date: string;
  prevFactory: number | null;
  /** up to 7 previous factory values + today (asc) */
  spark: number[];
  weekMin: number;
  weekMax: number;
  isHighest: boolean;
  isLowest: boolean;
}

/**
 * Loads commodities + a rolling window of market rates (default: last 30 days
 * via ?start_date=&end_date=) + the latest rate per commodity, and joins them
 * client-side (the API returns the commodity FK id, not the name).
 */
export function useMarketRates() {
  const [commodities, setCommodities] = useState<CommodityMargin[]>([]);
  const [rates, setRates] = useState<MarketRate[]>([]);
  const [latest, setLatest] = useState<MarketRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Start of the fetched history window — widened by ensureHistoryFrom().
  const windowStartRef = useRef(format(subDays(new Date(), 30), "yyyy-MM-dd"));

  const reload = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const end = format(new Date(), "yyyy-MM-dd");
      const [commoditiesData, ratesData, latestData] = await Promise.all([
        getCommodities(),
        getMarketRates({ start_date: windowStartRef.current, end_date: end }),
        getLatestMarketRates().catch(() => [] as MarketRate[]), // non-critical
      ]);
      setCommodities(commoditiesData);
      setRates(ratesData.map((r) => ({ ...r, date: normalizeRateDate(r) })));
      setLatest(latestData.map((r) => ({ ...r, date: normalizeRateDate(r) })));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  /** Widen the fetched window when the history picker goes further back. */
  const ensureHistoryFrom = useCallback(
    (date: string) => {
      if (date && date < windowStartRef.current) {
        windowStartRef.current = date;
        void reload();
      }
    },
    [reload]
  );

  /** true when the backend serializers expose `id` (required for joins/updates) */
  const idsAvailable = useMemo(
    () => commodities.length > 0 && commodities.every((c) => c.id != null),
    [commodities]
  );

  const commodityNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const c of commodities) {
      if (c.id != null) map.set(c.id, c.commodity);
    }
    return map;
  }, [commodities]);

  const commodityName = useCallback(
    (fk: number | null): string => {
      if (fk === null) return "Unassigned";
      return commodityNameById.get(fk) ?? `Commodity #${fk}`;
    },
    [commodityNameById]
  );

  /** rates grouped by commodity FK, sorted asc by date, deduped per date (last write wins) */
  const byCommodity = useMemo(() => {
    const map = new Map<number, MarketRate[]>();
    for (const r of rates) {
      if (r.commodity === null) continue; // orphan rows (nullable FK) are unusable
      const list = map.get(r.commodity);
      if (list) list.push(r);
      else map.set(r.commodity, [r]);
    }
    for (const [key, list] of map) {
      const perDate = new Map<string, MarketRate>();
      for (const r of list) perDate.set(r.date, r); // duplicates possible (unique_together not applied) — keep last
      map.set(key, Array.from(perDate.values()).sort((a, b) => a.date.localeCompare(b.date)));
    }
    return map;
  }, [rates]);

  const todayIso = format(new Date(), "yyyy-MM-dd");

  /** commodity FK → today's rate row (if logged) */
  const todayByCommodity = useMemo(() => {
    const map = new Map<number, MarketRate>();
    for (const [fk, list] of byCommodity) {
      const today = list.find((r) => r.date === todayIso);
      if (today) map.set(fk, today);
    }
    return map;
  }, [byCommodity, todayIso]);

  /** enriched rows for the graphical/tabular views (only commodities logged today) */
  const todayRows = useMemo<EnrichedRate[]>(() => {
    const entries = Array.from(todayByCommodity.entries());
    if (entries.length === 0) return [];
    const factories = entries.map(([, r]) => Number(r.factory_kg));
    const maxV = Math.max(...factories);
    const minV = Math.min(...factories);
    return entries
      .map(([fk, rate]) => {
        const factory = Number(rate.factory_kg);
        const history = byCommodity.get(fk) ?? [];
        const past = history.filter((h) => h.date < todayIso);
        const prev = past.length > 0 ? past[past.length - 1] : null;
        const spark = [...past.slice(-7).map((h) => Number(h.factory_kg)), factory];
        return {
          rateId: rate.id,
          commodityId: fk,
          name: commodityName(fk),
          factory,
          packing: Number(rate.with_packing),
          gstKg: Number(rate.with_gst_kg),
          gstLtr: Number(rate.with_gst_ltr),
          date: rate.date,
          prevFactory: prev ? Number(prev.factory_kg) : null,
          spark,
          weekMin: Math.min(...spark),
          weekMax: Math.max(...spark),
          isHighest: entries.length > 1 && factory === maxV,
          isLowest: entries.length > 1 && factory === minV,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [todayByCommodity, byCommodity, commodityName, todayIso]);

  /** commodity FK → most recent logged rate (from /market-rate/latest/) */
  const latestByCommodity = useMemo(() => {
    const map = new Map<number, MarketRate>();
    for (const r of latest) {
      if (r.commodity !== null) map.set(r.commodity, r);
    }
    return map;
  }, [latest]);

  return {
    commodities,
    rates,
    byCommodity,
    todayByCommodity,
    latestByCommodity,
    todayRows,
    commodityName,
    idsAvailable,
    loading,
    error,
    reload,
    ensureHistoryFrom,
  };
}
