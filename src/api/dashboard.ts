import { z } from "zod";
import api from "./client";

// ── Capacity Insights ──────────────────────────────────────────

export const CapacityInsightSchema = z.object({
  total_capacity: z.number(),
  filled_capacity: z.number(),
  filled_percentage: z.number(),
  empty_capacity: z.number(),
  empty_percentage: z.number(),
});

export type CapacityInsight = z.infer<typeof CapacityInsightSchema>;

export async function getCapacityInsights(): Promise<CapacityInsight> {
  const res = await api.get("/tank/capacity-insights/");
  return CapacityInsightSchema.parse(res.data);
}

// ── Stock Dashboard ───────────────────────────────────────────

export const StockDashboardItemSchema = z.object({
  item_code: z.string(),
  in_factory: z.number(),
  outside_factory: z.number(),
  status_data: z.record(z.string(), z.number()),
  total: z.number(),
});

export const StockDashboardResponseSchema = z.object({
  summary: z.object({
    in_factory_total: z.number(),
    outside_factory_total: z.number(),
    active_items: z.number(),
  }),
  status_vendors: z.record(z.string(), z.array(z.string())),
  items: z.array(StockDashboardItemSchema),
  totals: z.object({
    in_factory: z.number(),
    outside_factory: z.number(),
    status_vendor_totals: z.record(z.string(), z.number()),
    grand_total: z.number(),
  }),
});

export type StockDashboardItem = z.infer<typeof StockDashboardItemSchema>;
export type StockDashboardResponse = z.infer<typeof StockDashboardResponseSchema>;

export async function getStockDashboard(): Promise<StockDashboardResponse> {
  const res = await api.get("/stock-status/stock-dashboard/");
  return StockDashboardResponseSchema.parse(res.data);
}
