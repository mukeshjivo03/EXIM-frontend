import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getBasicRates,
  getCommodities,
  getLatestMarketRates,
  getMarketRates,
  getPackingMargins,
  getRateTableLatest,
  type BasicRate,
  type CommodityMargin,
  type MarketRate,
  type PackingMargin,
  type RateTableLatest,
} from "@/api/marketRate";

export interface BasicPrice {
  kg: number;
  ltr: number;
}

export interface OurRatesMatrix {
  /** commodity columns present in the data: FK id + display name */
  commodities: { fk: number; name: string }[];
  /** packing rows: FK id + name + margin */
  packings: { id: number; name: string; margin: number }[];
  /** `${commodityFk}||${packingId}` → basic price (₹/Kg + ₹/Ltr) */
  valueMap: Map<string, BasicPrice>;
}

/**
 * Loads basic rates for one day and resolves both FKs client-side:
 * basic_rate.market_rate → market rate row → commodity name,
 * basic_rate.packing_type → packing margin row.
 */
export function useOurRates(date: string) {
  const [basicRates, setBasicRates] = useState<BasicRate[]>([]);
  const [packings, setPackings] = useState<PackingMargin[]>([]);
  const [commodities, setCommodities] = useState<CommodityMargin[]>([]);
  const [marketRates, setMarketRates] = useState<MarketRate[]>([]);
  const [rateTable, setRateTable] = useState<RateTableLatest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [basicData, packingData, commodityData, marketData, latestData, rateTableData] = await Promise.all([
        getBasicRates({ start_date: date, end_date: date }),
        getPackingMargins(),
        getCommodities(),
        getMarketRates({ start_date: date, end_date: date }),
        getLatestMarketRates().catch(() => [] as MarketRate[]), // fallback source for rate→commodity mapping
        getRateTableLatest().catch(() => null), // non-critical
      ]);
      setBasicRates(basicData);
      setPackings(packingData);
      setCommodities(commodityData);
      setRateTable(rateTableData);
      // merge: same-day rates take precedence, latest fills gaps for older references
      const merged = new Map<number, MarketRate>();
      for (const r of latestData) if (r.id != null) merged.set(r.id, r);
      for (const r of marketData) if (r.id != null) merged.set(r.id, r);
      setMarketRates(Array.from(merged.values()));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const commodityNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const c of commodities) if (c.id != null) map.set(c.id, c.commodity);
    return map;
  }, [commodities]);

  /** market rate row id → commodity FK */
  const rateToCommodity = useMemo(() => {
    const map = new Map<number, number>();
    for (const r of marketRates) {
      if (r.id != null && r.commodity !== null) map.set(r.id, r.commodity);
    }
    return map;
  }, [marketRates]);

  const matrix = useMemo<OurRatesMatrix>(() => {
    const packingRows = packings
      .filter((p) => p.id != null)
      .map((p) => ({ id: p.id as number, name: p.packing_name, margin: Number(p.packing_margin) }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const commodityFks = new Set<number>();
    const valueMap = new Map<string, BasicPrice>();
    for (const br of basicRates) {
      if (br.packing_type === null || br.market_rate === null) continue;
      const commodityFk = rateToCommodity.get(br.market_rate);
      if (commodityFk === undefined) continue; // unresolvable reference
      commodityFks.add(commodityFk);
      valueMap.set(`${commodityFk}||${br.packing_type}`, {
        kg: Number(br.basic_price_kg),
        ltr: Number(br.basic_price_ltr),
      });
    }

    const commodityCols = Array.from(commodityFks)
      .map((fk) => ({ fk, name: commodityNameById.get(fk) ?? `Commodity #${fk}` }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return { commodities: commodityCols, packings: packingRows, valueMap };
  }, [basicRates, packings, rateToCommodity, commodityNameById]);

  return { matrix, packings, commodities, basicRates, rateTable, loading, error, reload };
}
