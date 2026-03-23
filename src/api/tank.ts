import { z } from "zod";
import api from "./client";

// ── Tank Items ───────────────────────────────────────────────

export const TankItemPayloadSchema = z.object({
  tank_item_code: z.string(),
  tank_item_name: z.string(),
  is_active: z.boolean(),
  created_by: z.string(),
  color: z.string(),
});

export const TankItemSchema = TankItemPayloadSchema.extend({
  id: z.number(),
  created_at: z.string(),
});

export type TankItemPayload = z.infer<typeof TankItemPayloadSchema>;
export type TankItem = z.infer<typeof TankItemSchema>;

export async function getTankItems(): Promise<TankItem[]> {
  const res = await api.get("/tank/items/");
  return z.array(TankItemSchema).parse(res.data ?? []);
}

export async function createTankItem(data: TankItemPayload): Promise<TankItemPayload> {
  const res = await api.post("/tank/items/", data);
  return TankItemPayloadSchema.parse(res.data);
}

export async function getTankItem(tankItemCode: string): Promise<TankItem> {
  const res = await api.get(`/tank/item/${tankItemCode}/`);
  return TankItemSchema.parse(res.data);
}

export async function deleteTankItem(tankItemCode: string): Promise<void> {
  await api.delete(`/tank/item/${tankItemCode}/`);
}

export async function updateTankItem(tankItemCode: string, color: string, tankItemName: string): Promise<void> {
  await api.put(`/tank/item/update-color/${tankItemCode}/`, { color, tank_item_name: tankItemName });
}

// ── Tank (Tank Data) ────────────────────────────────────────────

export const TankSchema = z.object({
  tank_code: z.string(),
  item_code: z.string().nullable(),
  tank_capacity: z.string(),
  current_capacity: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const TankPayloadSchema = z.object({
  tank_capacity: z.string(),
  current_capacity: z.string().nullable(),
  item_code: z.string().nullable(),
});

export type Tank = z.infer<typeof TankSchema>;
export type TankPayload = z.infer<typeof TankPayloadSchema>;

export async function getTanks(): Promise<Tank[]> {
  const res = await api.get("/tank/");
  return z.array(TankSchema).parse(res.data ?? []);
}

export async function createTank(data: TankPayload): Promise<Tank> {
  const res = await api.post("/tank/", data);
  return TankSchema.parse(res.data);
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

export const TankSummarySchema = z.object({
  total_tank_capacity: z.number(),
  current_stock: z.number(),
  utilisation_rate: z.number(),
  tank_count: z.number(),
  item_count: z.number(),
});

export type TankSummary = z.infer<typeof TankSummarySchema>;

export async function getTankSummary(): Promise<TankSummary> {
  const res = await api.get("/tank/tank-summary/");
  // Data arrives as { summary: ... }
  const wrapper = z.object({ summary: TankSummarySchema });
  return wrapper.parse(res.data).summary;
}

// ── Item-wise Tank Summary ───────────────────────────────────

export const ItemWiseTankSummaryItemSchema = z.object({
  color: z.string(),
  tank_item_code: z.string(),
  tank_item_name: z.string(),
  quantity_in_liters: z.number(),
  total_capacity: z.number(),
  tank_count: z.number(),
  tank_numbers: z.array(z.string()),
});

export const ItemWiseTankSummarySchema = z.object({
  total_quantity: z.number(),
  items: z.array(ItemWiseTankSummaryItemSchema),
});

export type ItemWiseTankSummaryItem = z.infer<typeof ItemWiseTankSummaryItemSchema>;
export type ItemWiseTankSummary = z.infer<typeof ItemWiseTankSummarySchema>;

export async function getItemWiseTankSummary(): Promise<ItemWiseTankSummary> {
  const res = await api.get("/tank/item-wise-summary/");
  return ItemWiseTankSummarySchema.parse(res.data ?? { total_quantity: 0, items: [] });
}

// ── Tank Rate Breakdown ─────────────────────────────────────

export const RateBreakdownEntrySchema = z.object({
  rate: z.number(),
  qty: z.number(),
  percentage: z.number(),
  vendor: z.string(),
});

export const TankRateBreakdownSchema = z.object({
  tank_code: z.string(),
  item_code: z.string(),
  item_name: z.string(),
  color: z.string(),
  tank_capacity: z.number(),
  current_capacity: z.number(),
  rate_breakdown: z.array(RateBreakdownEntrySchema),
  weighted_avg_rate: z.number(),
});

export type RateBreakdownEntry = z.infer<typeof RateBreakdownEntrySchema>;
export type TankRateBreakdown = z.infer<typeof TankRateBreakdownSchema>;

export async function getTankRates(): Promise<TankRateBreakdown[]> {
  const res = await api.get("/tank/tank-rates/");
  return z.array(TankRateBreakdownSchema).parse(res.data ?? []);
}

// ── Tank Layers ────────────────────────────────────────────────

export const TankLayerSchema = z.object({
  layer_id: z.number(),
  stock_status_id: z.number(),
  vendor: z.string(),
  item: z.string(),
  rate: z.number(),
  quantity_remaining: z.number(),
  quantity_added: z.number(),
  line_cost: z.number(),
  created_at: z.string(),
});

export const TankLayersResponseSchema = z.object({
  tank_code: z.string(),
  tank_capacity: z.number(),
  current_capacity: z.number(),
  layers: z.array(TankLayerSchema),
  total_quantity: z.number(),
  total_cost: z.number(),
  weighted_avg_rate: z.number(),
});

export type TankLayer = z.infer<typeof TankLayerSchema>;
export type TankLayersResponse = z.infer<typeof TankLayersResponseSchema>;

export async function getTankLayers(tankCode: string): Promise<TankLayersResponse> {
  const res = await api.get(`/tank/layers/${tankCode}/`);
  return TankLayersResponseSchema.parse(res.data);
}

// ── Tank Inward / Outward ──────────────────────────────────────

export const TankInwardPayloadSchema = z.object({
  tank_code: z.string(),
  stock_status_id: z.string(),
  quantity: z.string(),
  user: z.string(),
});

export type TankInwardPayload = z.infer<typeof TankInwardPayloadSchema>;

export async function tankInward(data: TankInwardPayload): Promise<void> {
  await api.post("/tank/inward/", data);
}

export const TankOutwardPayloadSchema = z.object({
  tank_code: z.string(),
  quantity: z.string(),
  remarks: z.string(),
  user: z.string(),
});

export type TankOutwardPayload = z.infer<typeof TankOutwardPayloadSchema>;

export async function tankOutward(data: TankOutwardPayload): Promise<void> {
  await api.post("/tank/outward/", data);
}

// ── Tank Logs ─────────────────────────────────────────────────

export const TankLogConsumptionSchema = z.object({
  id: z.number(),
  layer_id: z.number(),
  stock_status_id: z.number(),
  vendor_name: z.string(),
  quantity_consumed: z.string(),
  rate: z.string(),
  created_at: z.string(),
});

export const TankLogSchema = z.object({
  id: z.number(),
  tank_code: z.string(),
  log_type: z.enum(["INWARD", "OUTWARD"]),
  quantity: z.string(),
  stock_status_id: z.number().optional(),
  tank_layer_id: z.number().optional(),
  remarks: z.string(),
  created_at: z.string(),
  created_by: z.string(),
  consumptions: z.array(TankLogConsumptionSchema),
});

export type TankLogConsumption = z.infer<typeof TankLogConsumptionSchema>;
export type TankLog = z.infer<typeof TankLogSchema>;

export async function getTankLogs(): Promise<TankLog[]> {
  const res = await api.get("/tank/log/");
  return z.array(TankLogSchema).parse(res.data ?? []);
}
