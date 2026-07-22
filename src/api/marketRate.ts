import api from "./client";

/**
 * Commodity Rates API (manual factory-rate logging architecture).
 * Derived prices are computed SERVER-SIDE (model properties):
 *   factory_kg_freight = factory_kg + freight_rate   (landed factory price)
 *   with_packing       = factory_kg + 14             (basic only, freight excluded)
 *   with_gst_kg        = with_packing × 1.05
 *   with_gst_ltr       = with_gst_kg ÷ 1.0989
 * The client never recomputes these — it displays what the API returns.
 *
 * The Django app is mounted under /rates/ — e.g. /rates/commodity/, /rates/packing/.
 */
const BASE = "/rates";

/* ── Packing margins ─────────────────────────────────────── */

export interface PackingMargin {
  /** not yet exposed by the backend serializer — optional until added */
  id?: number;
  packing_name: string;
  packing_margin: string; // decimal-as-string
  created_by: string;
}

export async function getPackingMargins(): Promise<PackingMargin[]> {
  const { data } = await api.get<PackingMargin[]>(`${BASE}/packing/`);
  return data ?? [];
}

export async function createPackingMargin(payload: Omit<PackingMargin, "id">): Promise<PackingMargin> {
  const { data } = await api.post<PackingMargin>(`${BASE}/packing/`, payload);
  return data;
}

export async function updatePackingMargin(id: number, payload: Partial<Omit<PackingMargin, "id">>): Promise<PackingMargin> {
  const { data } = await api.patch<PackingMargin>(`${BASE}/packing/${id}/`, payload);
  return data;
}

export async function deletePackingMargin(id: number): Promise<void> {
  await api.delete(`${BASE}/packing/${id}/`);
}

/* ── Commodity margins ───────────────────────────────────── */

export interface CommodityMargin {
  /** not yet exposed by the backend serializer — optional until added */
  id?: number;
  commodity: string;
  margin_rate: string | null;
  /** per-commodity freight rate (optional) */
  freight_rate?: string | null;
  created_by: string;
}

/** Payload for POST /rates/commodity/ — note the API field is `margin` (not `margin_rate`). */
export interface CommodityCreatePayload {
  commodity: string;
  margin: string | null;
  /** optional per-commodity freight rate */
  freight_rate?: string | null;
  created_by: string;
}

export async function getCommodities(): Promise<CommodityMargin[]> {
  const { data } = await api.get<CommodityMargin[]>(`${BASE}/commodity/`);
  return data ?? [];
}

export async function createCommodity(payload: CommodityCreatePayload): Promise<CommodityMargin> {
  const { data } = await api.post<CommodityMargin>(`${BASE}/commodity/`, payload);
  return data;
}

/** Update a commodity's margin / freight / name — PATCH /rates/commodity/:id/ */
export async function updateCommodity(
  id: number,
  payload: Partial<Pick<CommodityCreatePayload, "commodity" | "margin" | "freight_rate">>
): Promise<CommodityMargin> {
  const { data } = await api.patch<CommodityMargin>(`${BASE}/commodity/${id}/`, payload);
  return data;
}

export async function deleteCommodity(id: number): Promise<void> {
  await api.delete(`${BASE}/commodity/${id}/`);
}

/* ── Market rates ────────────────────────────────────────── */

export interface MarketRate {
  id?: number;
  /** FK id of CommodityMargin (join client-side against GET /commodity/) */
  commodity: number | null;
  /** decimals arrive as strings, computed properties may arrive as raw numbers */
  factory_kg: string | number;
  /** landed factory price = factory_kg + freight_rate */
  factory_kg_freight?: string | number;
  with_packing: string | number;
  with_gst_kg: string | number;
  with_gst_ltr: string | number;
  /** per-commodity freight rate carried on each rate row (nullable) */
  freight_rate?: string | number | null;
  date: string; // YYYY-MM-DD (normalized client-side from date/created_at/created_on)
  /** raw timestamp fields the backend may send instead of `date` */
  created_at?: string | null;
  created_on?: string | null;
}

export interface MarketRateCreatePayload {
  commodity: number;
  factory_kg: string;
  created_by: string;
}

/** Create today's rate for a commodity (date is auto_now_add server-side). */
export async function addMarketRate(payload: MarketRateCreatePayload): Promise<{ commodity: number; factory_kg: string; created_by: string }> {
  const { data } = await api.post(`${BASE}/market-rate/add/`, payload);
  return data;
}

/**
 * List market rates. Filters: `date` (exact day) or `start_date`/`end_date` (range),
 * e.g. /rates/market-rate/get/?start_date=2026-07-01&end_date=2026-07-18
 */
export async function getMarketRates(params?: { date?: string; start_date?: string; end_date?: string }): Promise<MarketRate[]> {
  const { data } = await api.get<MarketRate[]>(`${BASE}/market-rate/get/`, { params });
  return data ?? [];
}

/** Latest rate per commodity (includes id + computed fields). */
export async function getLatestMarketRates(): Promise<MarketRate[]> {
  const { data } = await api.get<MarketRate[]>(`${BASE}/market-rate/latest/`);
  return data ?? [];
}

export async function getMarketRate(id: number): Promise<MarketRate> {
  const { data } = await api.get<MarketRate>(`${BASE}/market-rate/${id}/`);
  return data;
}

export async function updateMarketRate(
  id: number,
  payload: Partial<Pick<MarketRateCreatePayload, "commodity" | "factory_kg">>
): Promise<MarketRate> {
  const { data } = await api.patch<MarketRate>(`${BASE}/market-rate/${id}/`, payload);
  return data;
}

export async function deleteMarketRate(id: number): Promise<void> {
  await api.delete(`${BASE}/market-rate/${id}/`);
}

/* ── Basic rates (our rates: market rate + packing margin) ── */

export interface BasicRate {
  id: number;
  basic_price_kg: string | number; // decimal-as-string, e.g. "164.300"
  basic_price_ltr: string | number; // raw computed number, e.g. 149.5131…
  date: string; // YYYY-MM-DD
  /** FK id of PackingMargin */
  packing_type: number | null;
  /** FK id of MarketRates (→ its commodity) */
  market_rate: number | null;
}

/** List basic rates; start_date/end_date are optional. */
export async function getBasicRates(params?: { start_date?: string; end_date?: string }): Promise<BasicRate[]> {
  const { data } = await api.get<{ basic_rates: BasicRate[] }>(`${BASE}/basic-rate/`, { params });
  return data?.basic_rates ?? [];
}

/* ── Pack sizes & pack rates (Jivo-style rate table) ────── */

export interface PackSize {
  id?: number;
  name: string;
  /** FK id of PackingMargin */
  packing: number | null;
  unit: string; // "kg" | "ltr"
  conversion_factor: number | string; // pack size in `unit`, e.g. 0.75
  /** commodity ids this pack size applies to */
  commodities: number[];
  display_order: number;
  created_by: string;
}

export interface PackSizePayload {
  name: string;
  packing: number;
  unit: string;
  conversion_factor: number;
  commodities: number[];
  display_order: number;
  created_by: string;
}

export async function getPackSizes(): Promise<PackSize[]> {
  const { data } = await api.get<PackSize[]>(`${BASE}/pack-size/`);
  return data ?? [];
}

export async function createPackSize(payload: PackSizePayload): Promise<PackSize> {
  const { data } = await api.post<PackSize>(`${BASE}/pack-size/`, payload);
  return data;
}

export async function updatePackSize(id: number, payload: Partial<PackSizePayload>): Promise<PackSize> {
  const { data } = await api.patch<PackSize>(`${BASE}/pack-size/${id}/`, payload);
  return data;
}

export async function deletePackSize(id: number): Promise<void> {
  await api.delete(`${BASE}/pack-size/${id}/`);
}

export interface PackRate {
  id?: number;
  date?: string;
  [key: string]: unknown; // flat generated-rate rows; shape not fully specified yet
}

export async function getPackRates(params?: { start_date?: string; end_date?: string }): Promise<PackRate[]> {
  const { data } = await api.get<PackRate[]>(`${BASE}/pack-rate/`, { params });
  return data ?? [];
}

/** Pivoted grid built from each commodity's latest market rate (Excel-style "JIVO RATE" sheet). */
export interface RateTableRow {
  pack_size: string;
  /** commodity name → rate; missing combos are null/absent */
  rates: Record<string, string | number | null>;
}

export interface RateTableLatest {
  commodities: string[];
  rows: RateTableRow[];
}

export async function getRateTableLatest(): Promise<RateTableLatest> {
  const { data } = await api.get<RateTableLatest>(`${BASE}/rate-table/latest/`);
  return data ?? { commodities: [], rows: [] };
}
