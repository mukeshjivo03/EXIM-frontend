import api from "./client";

export interface CommodityPrice {
  commodity_name: string;
  factory_kg: number;
  packing_kg: number;
  gst_kg: number;
  gst_ltr: number;
  fetched_date: string;
}

export interface DailyPriceResponse {
  status: string;
  count: number;
  preview_data: CommodityPrice[];
}

export async function fetchDailyPrices(): Promise<DailyPriceResponse> {
  const { data } = await api.get<DailyPriceResponse>("/daily-price/fetch/");
  return data;
}

export interface SavePriceResponse {
  status: string;
}

export async function saveDailyPrices(): Promise<SavePriceResponse> {
  const { data } = await api.post<SavePriceResponse>("/daily-price/fetch/");
  return data;
}

export interface DbDailyPrice {
  id: number;
  commodity_name: string;
  factory_price: string;
  packing_cost_kg: string;
  with_gst_kg: string;
  with_gst_ltr: string;
  date: string;
  created_by: string;
}

export async function getDailyPricesByDate(date: string): Promise<DbDailyPrice[]> {
  const { data } = await api.get<DbDailyPrice[]>("/daily-price/db-list/", {
    params: { date },
  });
  return data;
}

export async function getDailyPricesByRange(fromDate: string, toDate: string): Promise<DbDailyPrice[]> {
  const { data } = await api.get<DbDailyPrice[]>("/daily-price/range/", {
    params: { from_date: fromDate, to_date: toDate },
  });
  return data;
}

export interface TrendDataset {
  label: string;
  data: number[];
}

export interface PriceTrendsResponse {
  labels: string[];
  datasets: TrendDataset[];
}

export async function getPriceTrends(): Promise<PriceTrendsResponse> {
  const { data } = await api.get<PriceTrendsResponse>("/daily-price/trends/");
  return data;
}
