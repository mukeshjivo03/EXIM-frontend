import { createContext, useContext, useState, type ReactNode } from "react";
import type { JivoRateItem } from "@/api/jivoRate";

interface JivoRateContextValue {
  preview: JivoRateItem[];
  count: number;
  fetched: boolean;
  setPreview: (preview: JivoRateItem[]) => void;
  setCount: (count: number) => void;
  setFetched: (fetched: boolean) => void;
}

const JivoRateContext = createContext<JivoRateContextValue | undefined>(undefined);

export function JivoRateProvider({ children }: { children: ReactNode }) {
  const [preview, setPreview] = useState<JivoRateItem[]>([]);
  const [count, setCount] = useState(0);
  const [fetched, setFetched] = useState(false);

  return (
    <JivoRateContext.Provider value={{ preview, count, fetched, setPreview, setCount, setFetched }}>
      {children}
    </JivoRateContext.Provider>
  );
}

export function useJivoRate() {
  const ctx = useContext(JivoRateContext);
  if (!ctx) throw new Error("useJivoRate must be used within JivoRateProvider");
  return ctx;
}
