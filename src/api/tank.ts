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

export interface ItemWiseTankSummary {
  color: string;
  tank_item_code: string;
  tank_item_name: string;
  quantity_in_liters: number;
  total_capacity: number;
  tank_count: number;
  tank_numbers: string[];
}

export async function getItemWiseTankSummary(): Promise<ItemWiseTankSummary[]> {
  const res = await api.get<ItemWiseTankSummary[]>("/tank/item-wise-summary/");
  return res.data ?? [];
}
