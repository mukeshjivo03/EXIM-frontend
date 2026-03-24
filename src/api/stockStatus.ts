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
  vehicle_number?: string;
  location?: string;
  eta?: string;
  transporter_name?: string;
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
  vehicle_number?: string;
  location?: string;
  eta?: string;
  transporter_name?: string;
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
  avg_price_per_kg: number;
  avg_price_per_ltr: number;
}

export interface StockInsights {
  summary: StockInsightsSummary;
}

export async function getStockSummary(): Promise<StockInsights> {
  const res = await api.get<StockInsights>("/stock-status/stock-summary/");
  return res.data;
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

export interface StockLog {
  id: number;
  field_name: string;
  old_value: string;
  new_value: string;
  updated_at: string;
  updated_by: string;
  stock_id: number;
}

export async function getStockLogs(): Promise<StockLog[]> {
  const res = await api.get<StockLog[]>("/stock-status/stock-logs/");
  return res.data ?? [];
}

export async function getOutOfFactoryStockStatuses(): Promise<StockStatus[]> {
  const res = await api.get<StockStatus[]>("/stock-status/out/");
  return (res.data ?? []).filter((r) => !r.deleted);
}

// ── Unique RM codes & stock entries by RM ────────────────────

export async function getUniqueRMCodes(): Promise<string[]> {
  const res = await api.get<string[]>("/stock-status/get-unique-rm/");
  return res.data ?? [];
}

export interface StockEntryByRM {
  id: number;
  vendor_code: string;
  vendor_code__card_name: string;
  rate: number;
  quantity: number;
  quantity_in_litre: number;
  total: number;
  vehicle_number: string | null;
  transporter: string | null;
  location: string | null;
  eta: string | null;
  created_at: string;
}

export async function getStockEntriesByRM(itemCode: string): Promise<StockEntryByRM[]> {
  const res = await api.get<StockEntryByRM[]>("/stock-status/get-stock-entry-by-rm/", {
    params: { item_code: itemCode },
  });
  return res.data ?? [];
}

export async function moveStock(data: {
  stock_id: number;
  new_quantity: number;
  new_status: string;
  action: string;
  created_by: string;
}): Promise<StockStatus> {
  const res = await api.post<StockStatus>("/stock-status/move/", data);
  return res.data;
}

export async function dispatchStock(data: {
  stock_id: number;
  quantity: number;
  destination_status: string;
  action: string;
  created_by: string;
}): Promise<StockStatus> {
  const res = await api.post<StockStatus>("/stock-status/dispatch/", data);
  return res.data;
}

export async function arriveBatch(data: {
  stock_id: number;
  weighed_qty: number;
  destination_status: string;
  action: string;
  created_by: string;
}): Promise<StockStatus> {
  const res = await api.post<StockStatus>("/stock-status/arrive-batch/", data);
  return res.data;
}

export async function softDeleteStockStatus(record: StockStatus): Promise<StockStatus> {
  const res = await api.patch<StockStatus>(`/stock-status/${record.id}/`, {
    deleted: true,
  });
  return res.data;
}
