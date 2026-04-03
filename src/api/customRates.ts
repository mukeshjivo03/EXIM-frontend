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

export async function fetchCustomRates(date?: string): Promise<EximRatesResponse> {
  const { data } = await api.get<EximRatesResponse>("/exim-rates/fetch/", {
    params: { date },
  });
  return data;
}

// New function to fetch from external API with daily limit
export async function fetchExternalExchangeRates(): Promise<EximRatesResponse> {
  const STORAGE_KEY = "exim_live_rates_cache";
  const MAX_CALLS_PER_DAY = 10;
  const today = new Date().toISOString().split("T")[0];

  // Load cache
  const cached = localStorage.getItem(STORAGE_KEY);
  let cacheState = cached ? JSON.parse(cached) : { count: 0, lastDate: today, data: [] };

  // Reset count if new day
  if (cacheState.lastDate !== today) {
    cacheState = { count: 0, lastDate: today, data: cacheState.data };
  }

  // If limit exceeded, return cached data
  if (cacheState.count >= MAX_CALLS_PER_DAY && cacheState.data.length > 0) {
    console.warn("Live rates API limit reached for today. Serving cached data.");
    return { data: cacheState.data };
  }

  const apiKey = import.meta.env.VITE_EXCHANGE_RATE_API_KEY;
  const currencies = ["USD", "EUR", "AED", "AUD", "CAD", "GBP"];
  const currencyToFullName: Record<string, string> = {
    "USD": "U.S.Dollar",
    "EUR": "Euro",
    "AED": "UAE Dirham",
    "AUD": "Australian Dollar",
    "CAD": "Canadian Dollar",
    "GBP": "Sterling Pound"
  };

  const results: EximRate[] = [];

  try {
    for (const fromCcy of currencies) {
      const response = await fetch(`https://v6.exchangerate-api.com/v6/${apiKey}/pair/${fromCcy}/INR`);
      const data = await response.json();
      
      if (data.result === "success") {
        results.push({
          currency: currencyToFullName[fromCcy],
          import: data.conversion_rate.toString(),
          export: data.conversion_rate.toString(),
          date: new Date().toISOString(),
          notification_no: "API Live"
        });
      }
    }

    // Update cache on success
    if (results.length > 0) {
      cacheState.count += 1;
      cacheState.data = results;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cacheState));
    }

    return { data: results.length > 0 ? results : cacheState.data };
  } catch (error) {
    console.error("Failed to fetch live rates, returning cache", error);
    return { data: cacheState.data };
  }
}
