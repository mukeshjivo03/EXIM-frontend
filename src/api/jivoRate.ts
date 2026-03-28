import api from "./client";

export interface JivoRateItem {
  pack_type: string;
  commodity: string;
  rate: number;
  date: string;
  created_by: string;
}

export interface JivoRateFetchResponse {
  status: string;
  count: number;
  preview_data: JivoRateItem[];
}

export async function fetchJivoRates(): Promise<JivoRateFetchResponse> {
  const { data } = await api.get<JivoRateFetchResponse>("/jivo-rate/fetch");
  return data;
}

export async function saveJivoRates(createdBy: string): Promise<{ status: string }> {
  const { data } = await api.post<{ status: string }>("/jivo-rate/fetch", { created_by: createdBy });
  return data;
}

export interface DbJivoRate {
  id: number;
  pack_type: string;
  commodity: string;
  rate: number;
  date: string;
  created_by: string;
}

export async function getJivoRatesByRange(fromDate: string, toDate: string): Promise<DbJivoRate[]> {
  const { data } = await api.get<DbJivoRate[]>("/jivo-rate/range/", {
    params: { from_date: fromDate, to_date: toDate },
  });
  return data;
}

export interface JivoTrendDataset {
  label: string;
  data: (number | null)[];
}

export interface JivoTrendsResponse {
  labels: string[];
  datasets: JivoTrendDataset[];
}

export async function getJivoRateTrends(): Promise<JivoTrendsResponse> {
  const { data } = await api.get<JivoTrendsResponse>("/jivo-rate/trends/");
  return data;
}
