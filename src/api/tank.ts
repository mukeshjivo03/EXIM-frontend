import api from "./client";

export interface TankItemPayload {
  tank_item_code: string;
  tank_item_name: string;
  is_active: boolean;
  created_by: string;
  color: string;
}

export interface TankItem {
  id: number;
  tank_item_code: string;
  tank_item_name: string;
  is_active: boolean;
  created_at: string;
  created_by: string;
  color: string;
}

export async function getTankItems(): Promise<TankItem[]> {
  const res = await api.get<TankItem[]>("/tank/items/");
  return res.data ?? [];
}

export async function createTankItem(data: TankItemPayload): Promise<TankItemPayload> {
  const res = await api.post<TankItemPayload>("/tank/items/", data);
  return res.data;
}

export async function getTankItem(tankItemCode: string): Promise<TankItem> {
  const res = await api.get<TankItem>(`/tank/item/${tankItemCode}/`);
  return res.data;
}

export async function deleteTankItem(tankItemCode: string): Promise<void> {
  await api.delete(`/tank/item/${tankItemCode}/`);
}

export async function updateTankItem(tankItemCode: string, color: string, tankItemName: string): Promise<void> {
  await api.put(`/tank/item/update-color/${tankItemCode}/`, { color, tank_item_name: tankItemName });
}

// ── Tank (Tank Data) ────────────────────────────────────────────

export interface Tank {
  tank_code: string;
  item_code: string | null;
  tank_capacity: string;
  current_capacity: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TankPayload {
  tank_capacity: string;
  current_capacity: string | null;
  item_code: string | null;
}

export async function getTanks(): Promise<Tank[]> {
  const res = await api.get<Tank[]>("/tank/");
  return res.data ?? [];
}

export async function createTank(data: TankPayload): Promise<Tank> {
  const res = await api.post<Tank>("/tank/", data);
  return res.data;
}

export async function deleteTank(tankCode: string): Promise<void> {
  await api.delete(`/tank/${tankCode}/`);
}

export async function updateTank(
  tankCode: string,
  data: { current_capacity: string | null; item_code: string | null }
): Promise<void> {
  await api.put(`/tank/update-capacity/${tankCode}/`, data);
}

// ── Tank Summary ─────────────────────────────────────────────

export interface TankSummary {
  total_tank_capacity: number;
  current_stock: number;
  utilisation_rate: number;
  tank_count: number;
  item_count: number;
}

export async function getTankSummary(): Promise<TankSummary> {
  const res = await api.get<{ summary: TankSummary }>("/tank/tank-summary/");
  return res.data.summary;
}

// ── Item-wise Tank Summary ───────────────────────────────────

export interface ItemWiseTankSummaryItem {
  color: string;
  tank_item_code: string;
  tank_item_name: string;
  quantity_in_liters: number;
  total_capacity: number;
  tank_count: number;
  tank_numbers: string[];
}

export interface ItemWiseTankSummary {
  total_quantity: number;
  items: ItemWiseTankSummaryItem[];
}

export async function getItemWiseTankSummary(): Promise<ItemWiseTankSummary> {
  const res = await api.get<ItemWiseTankSummary>("/tank/item-wise-summary/");
  return res.data ?? { total_quantity: 0, items: [] };
}

// ── Tank Rate Breakdown ─────────────────────────────────────

export interface RateBreakdownEntry {
  rate: number;
  qty: number;
  percentage: number;
  vendor: string;
}

export interface TankRateBreakdown {
  tank_code: string;
  item_code: string;
  item_name: string;
  color: string;
  tank_capacity: number;
  current_capacity: number;
  rate_breakdown: RateBreakdownEntry[];
  weighted_avg_rate: number;
}

export async function getTankRates(): Promise<TankRateBreakdown[]> {
  const res = await api.get<TankRateBreakdown[]>("/tank/tank-rates/");
  return res.data ?? [];
}

// ── Tank Layers ────────────────────────────────────────────────

export interface TankLayer {
  layer_id: number;
  stock_status_id: number;
  vendor: string;
  item: string;
  rate: number;
  quantity_remaining: number;
  quantity_added: number;
  line_cost: number;
  created_at: string;
}

export interface TankLayersResponse {
  tank_code: string;
  tank_capacity: number;
  current_capacity: number;
  layers: TankLayer[];
  total_quantity: number;
  total_cost: number;
  weighted_avg_rate: number;
}

export async function getTankLayers(tankCode: string): Promise<TankLayersResponse> {
  const res = await api.get<TankLayersResponse>(`/tank/layers/${tankCode}/`);
  return res.data;
}

// ── Tank Inward / Outward ──────────────────────────────────────

export interface TankInwardPayload {
  tank_code: string;
  stock_status_id: string;
  quantity: string;
  user: string;
}

export async function tankInward(data: TankInwardPayload): Promise<void> {
  await api.post("/tank/inward/", data);
}

export interface TankOutwardPayload {
  tank_code: string;
  quantity: string;
  remarks: string;
  user: string;
}

export async function tankOutward(data: TankOutwardPayload): Promise<void> {
  await api.post("/tank/outward/", data);
}

// ── Tank Transfer ─────────────────────────────────────────────

export interface SameTank {
  tank_code: string;
  item_code: string | null;
  current_capacity: string | null;
  tank_capacity: string;
}

export async function getSameTanks(itemCode: string): Promise<SameTank[]> {
  const res = await api.get<SameTank[]>("/tank/get-same-tanks/", { params: { item_code: itemCode } });
  return res.data;
}

export interface TankTransferPayload {
  source_tank_code: string;
  destination_tank_code: string;
  quantity: number;
  remarks: string;
}

export async function tankTransfer(data: TankTransferPayload): Promise<void> {
  await api.post("/tank/transfer/", data);
}

// ── Tank Logs ─────────────────────────────────────────────────

export interface TankLogConsumption {
  id: number;
  layer_id: number;
  stock_status_id: number;
  vendor_name: string;
  quantity_consumed: string;
  rate: string;
  created_at: string;
}

export interface TankLog {
  id: number;
  tank_code: string;
  log_type: "INWARD" | "OUTWARD" | "TRANSFER";
  quantity: string;
  stock_status_id?: number;
  tank_layer_id?: number;
  source_tank_code?: string;
  destination_tank_code?: string;
  remarks: string;
  created_at: string;
  created_by: string;
  consumptions: TankLogConsumption[];
}

export async function getTankLogs(): Promise<TankLog[]> {
  const res = await api.get<TankLog[]>("/tank/log/");
  return res.data ?? [];
}
