import api from "./client";

export interface EximRate {
  currency: string;
  import: string;
  export: string;
  date: string;
  notification_no: string | null;
}

export interface EximRatesResponse {
  data: EximRate[];
  recordsTotal?: number;
  recordsFiltered?: number;
}

export async function fetchEximRates(date?: string): Promise<EximRatesResponse> {
  const { data } = await api.get<EximRatesResponse>("/exim-rates/fetch/", {
    params: { date },
  });
  return data;
}
