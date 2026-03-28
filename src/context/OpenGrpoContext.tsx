import { createContext, useContext, useState, type ReactNode } from "react";
import type { OpenGrpo } from "@/api/openGrpo";

interface OpenGrpoContextValue {
  grpos: OpenGrpo[];
  fetched: boolean;
  setGrpos: (grpos: OpenGrpo[]) => void;
  setFetched: (fetched: boolean) => void;
}

const OpenGrpoContext = createContext<OpenGrpoContextValue | undefined>(undefined);

export function OpenGrpoProvider({ children }: { children: ReactNode }) {
  const [grpos, setGrpos] = useState<OpenGrpo[]>([]);
  const [fetched, setFetched] = useState(false);

  return (
    <OpenGrpoContext.Provider value={{ grpos, fetched, setGrpos, setFetched }}>
      {children}
    </OpenGrpoContext.Provider>
  );
}

export function useOpenGrpo() {
  const ctx = useContext(OpenGrpoContext);
  if (!ctx) throw new Error("useOpenGrpo must be used within OpenGrpoProvider");
  return ctx;
}
