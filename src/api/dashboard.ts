import api from "./client";

export interface CapacityInsight {
  total_capacity: number;
  filled_capacity: number;
  filled_percentage: number;
  empty_capacity: number;
  empty_percentage: number;
}

export async function getCapacityInsights(): Promise<CapacityInsight> {
  const res = await api.get<CapacityInsight>("/tank/capacity-insights/");
  return res.data;
}

export interface StockDashboardItem {
  item_code: string;
  in_factory: number;
  outside_factory: number;
  status_data: Record<string, number>;
  total: number;
}

export interface StockDashboardResponse {
  summary: {
    in_factory_total: number;
    outside_factory_total: number;
    active_items: number;
  };
  status_vendors: Record<string, string[]>;
  items: StockDashboardItem[];
  totals: {
    in_factory: number;
    outside_factory: number;
    status_vendor_totals: Record<string, number>;
    grand_total: number;
  };
}

export async function getStockDashboard(): Promise<StockDashboardResponse> {
  const res = await api.get<StockDashboardResponse>("/stock-status/stock-dashboard/");
  return res.data;
}
