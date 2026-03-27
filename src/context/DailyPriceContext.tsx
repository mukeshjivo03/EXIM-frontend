import { createContext, useContext, useState, type ReactNode } from "react";
import type { CommodityPrice } from "@/api/dailyPrice";

interface DailyPriceContextValue {
  prices: CommodityPrice[];
  count: number;
  fetched: boolean;
  setPrices: (prices: CommodityPrice[]) => void;
  setCount: (count: number) => void;
  setFetched: (fetched: boolean) => void;
  clear: () => void;
 }

const DailyPriceContext = createContext<DailyPriceContextValue | undefined>(undefined);

export function DailyPriceProvider({ children }: { children: ReactNode }) {
  const [prices, setPrices] = useState<CommodityPrice[]>([]);
  const [count, setCount] = useState(0);
  const [fetched, setFetched] = useState(false);

  function clear() {
    setPrices([]);
    setCount(0);
    setFetched(false);
  }

  return (
    <DailyPriceContext.Provider value={{ prices, count, fetched, setPrices, setCount, setFetched, clear }}>
      {children}
    </DailyPriceContext.Provider>
  );
}

export function useDailyPrice() {
  const ctx = useContext(DailyPriceContext);
  if (!ctx) throw new Error("useDailyPrice must be used within DailyPriceProvider");
  return ctx;
}
