import api from "./client";

export const STATUS_CHOICES = [
  "OUT_SIDE_FACTORY",
  "ON_THE_WAY",
  "UNDER_LOADING",
  "AT_REFINERY",
  "OTW_TO_REFINERY",
  "KANDLA_STORAGE",
  "MUNDRA_PORT",
  "ON_THE_SEA",
  "IN_CONTRACT",
  "COMPLETED",
  "DELIVERED",
  "IN_TRANSIT",
  "PENDING",
  "PROCESSING",
] as const;

export type StockStatusChoice = (typeof STATUS_CHOICES)[number];

export interface StockStatus {
  id: number;
  item_code: string;
  vendor_code: string;
  status: StockStatusChoice;
  rate: string;
  total: string;
  quantity: string;
  created_at: string;
  created_by: string;
  deleted: boolean;
}

export interface StockStatusPayload {
  item_code: string;
  status: StockStatusChoice;
  vendor_code: string;
  rate: string;
  quantity: string;
  created_by: string;
}

export interface StockStatusFilters {
  status?: string;
  vendor?: string;
  item?: string;
}

export interface StockInsightsSummary {
  total_value: number;
  total_qty: number;
  total_count: number;
}

export interface StockInsights {
  summary: StockInsightsSummary;
}

export async function getStockInsights(filters?: StockStatusFilters): Promise<StockInsights> {
  const params: Record<string, string> = {};
  if (filters?.status) params.status = filters.status;
  if (filters?.vendor) params.vendor = filters.vendor;
  if (filters?.item) params.item = filters.item;
  const res = await api.get<StockInsights>("/stock-status/stock-insights/", { params });
  return res.data;
}

export async function getStockStatuses(filters?: StockStatusFilters): Promise<StockStatus[]> {
  const params: Record<string, string> = {};
  if (filters?.status) params.status = filters.status;
  if (filters?.vendor) params.vendor = filters.vendor;
  if (filters?.item) params.item = filters.item;
  const res = await api.get<StockStatus[]>("/stock-status/", { params });
  return res.data ?? [];
}

export async function getStockStatus(id: number): Promise<StockStatus> {
  const res = await api.get<StockStatus>(`/stock-status/${id}/`);
  return res.data;
}

export async function createStockStatus(data: StockStatusPayload): Promise<StockStatus> {
  const res = await api.post<StockStatus>("/stock-status/", data);
  return res.data;
}

export async function updateStockStatus(id: number, data: Partial<StockStatusPayload>): Promise<StockStatus> {
  const res = await api.put<StockStatus>(`/stock-status/${id}/`, data);
  return res.data;
}

export async function softDeleteStockStatus(record: StockStatus): Promise<StockStatus> {
  const res = await api.put<StockStatus>(`/stock-status/${record.id}/`, {
    item_code: record.item_code,
    status: record.status,
    vendor_code: record.vendor_code,
    rate: record.rate,
    quantity: record.quantity,
    created_by: record.created_by,
    deleted: true,
  });
  return res.data;
}
