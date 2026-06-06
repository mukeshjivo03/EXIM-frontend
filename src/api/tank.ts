import api from "./client";

export interface TankItemPayload {
  tank_item_code: string;
  tank_item_name: string;
  is_active: boolean;
  created_by: string;
  color: string;
  category: string;
}

export interface TankItem {
  id: string;
  tank_item_code: string;
  tank_item_name: string;
  is_active: boolean;
  created_at: string;
  created_by: string;
  color: string;
  category?: string;
}

export async function getTankItems(): Promise<TankItem[]> {
  const res = await api.get<TankItem[]>("/tank/items/");
  return res.data ?? [];
}

export async function createTankItem(data: TankItemPayload): Promise<TankItemPayload> {
  const res = await api.post<TankItemPayload>("/tank/items/", data);
  return res.data;
}

export async function getTankItem(tankItemId: string): Promise<TankItem> {
  const res = await api.get<TankItem>(`/tank/item/${tankItemId}/`);
  return res.data;
}

export async function deleteTankItem(tankItemId: string): Promise<void> {
  await api.delete(`/tank/item/${tankItemId}/`);
}

export async function updateTankItem(
  tankItemId: string,
  color: string,
  tankItemName: string,
  tankItemCode?: string,
  category?: string
): Promise<void> {
  await api.put(`/tank/item/update-color/${tankItemId}/`, {
    color,
    tank_item_name: tankItemName,
    ...(tankItemCode ? { tank_item_code: tankItemCode } : {}),
    ...(category ? { category } : {}),
  });
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
  tank_type?: string;
}

export interface TankPayload {
  tank_capacity: string;
  current_capacity: string | null;
  item_code: string | null;
  tank_type?: string;
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

export async function emptyTank(tankCode: string): Promise<void> {
  await api.patch(`/tank/empty-tank/?tank_code=${tankCode}`);
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

// ── Item-wise Average ──────────────────────────────────────────

export interface InTankItem {
  item_code: string;
}

export async function getInTankItems(): Promise<InTankItem[]> {
  const res = await api.get<InTankItem[]>("/tank/in-tank-items/");
  return res.data ?? [];
}

export interface ItemWiseAverage {
  item_code: string;
  tank_total_capacity: number;
  tank_total_capacity_kg: number;
  quantity_matched: number;
  quantity_matched_kg: number;
  quantity_unmatched: number;
  "average_rate(IN_TANK)": number;
  "adjusted_average(STO)": number;
  "average_rate_kg(IN_TANK)": number;
  "adjusted_average_kg(STO)": number;
  breakdown?: ItemWiseAverageBreakdown[];
  warning?: string;
}

export interface ItemWiseAverageBreakdown {
  stock_id: number;
  created_at: string;
  party: string;
  vehicle: string;
  transporter: string;
  rate_in_litres: number;
  rate_in_kg: number;
  batch_quantity: number;
  batch_quantity_kg: number;
  quantity_consumed: number;
  quantity_consumed_kg: number;
  batch_total: number;
  batch_total_kg: number;
}

export async function getItemWiseAverage(itemCode: string): Promise<ItemWiseAverage> {
  const res = await api.get<ItemWiseAverage>(`/tank/item-wise-average/`, { params: { item_code: itemCode } });
  return res.data;
}

// ── Tank Logs ─────────────────────────────────────────────────

export interface TankLog {
  id: number;
  log_type: "INWARD" | "OUTWARD" | "TRANSFER";
  quantity: string;
  vehicle_number?: string | null;
  rate?: string | null;
  party?: string | null;
  item_code?: string | null;
  item_name?: string | null;
  arrival?: string | null;
  created_at: string;
  created_by: string;
  stock_status?: number | null;
}

export async function getTankLogs(): Promise<TankLog[]> {
  const res = await api.get<TankLog[]>("/tank/log/");
  return res.data ?? [];
}
