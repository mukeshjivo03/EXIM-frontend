import { useState } from "react";
import { format, parseISO } from "date-fns";
import {
  AlertCircle,
  LayoutGrid,
  Package,
  RefreshCw,
  TableProperties,
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { usePersistedState } from "@/hooks/usePersistedState";
import { ViewToggle } from "@/components/ViewToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";

import { useOurRates } from "./useOurRates";
import { GraphicalView } from "./GraphicalView";
import { TabularView } from "./TabularView";
import { PackingDialog } from "./PackingDialog";
import { RateTableCard } from "./RateTableCard";

const VIEW_OPTIONS = [
  { value: "graphical" as const, label: "Graphical", icon: LayoutGrid },
  { value: "tabular" as const, label: "Tabular", icon: TableProperties },
];

export default function OurRatesPage() {
  const { email } = useAuth();
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const { matrix, packings, commodities, rateTable, loading, error, reload } = useOurRates(date);

  const [viewMode, setViewMode] = usePersistedState<"graphical" | "tabular">(
    "ourRates.viewMode", "graphical", ["graphical", "tabular"]
  );
  const [selectedCommodity, setSelectedCommodity] = useState<number | null>(null);
  const [packingOpen, setPackingOpen] = useState(false);

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 animate-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Our Rates</h1>
          <p className="text-sm text-muted-foreground tabular-nums">
            {matrix.commodities.length > 0
              ? `${matrix.commodities.length} commodities × ${matrix.packings.length} packings · ${format(parseISO(date), "d MMM yyyy")}`
              : "Basic prices per commodity and packing, built from logged market rates"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DatePicker value={date} onChange={setDate} placeholder="Date" />
          <Button className="btn-press" variant="outline" onClick={() => setPackingOpen(true)}>
            <Package className="h-4 w-4 mr-2" />
            Packings
          </Button>
          <Button className="btn-press" variant="outline" onClick={() => void reload()} disabled={loading}>
            <RefreshCw className={loading ? "h-4 w-4 mr-2 animate-spin" : "h-4 w-4 mr-2"} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
          <p className="text-xs font-medium text-red-700 dark:text-red-300">
            Failed to load basic rates. Check that the Commodity Rates API is reachable, then hit Refresh.
          </p>
        </div>
      )}

      {/* Rates matrix */}
      <Card className="card-hover shimmer-hover">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Basic Rates</CardTitle>
              <CardDescription>
                Factory rate + packing margin per commodity for {format(parseISO(date), "d MMM yyyy")}
              </CardDescription>
            </div>
            <ViewToggle options={VIEW_OPTIONS} value={viewMode} onChange={setViewMode} />
          </div>
        </CardHeader>
        <CardContent>
          <div key={viewMode} className="animate-in fade-in slide-in-from-bottom-1 duration-150">
            {viewMode === "graphical" ? (
              <GraphicalView
                matrix={matrix}
                selectedCommodity={selectedCommodity}
                onSelectCommodity={setSelectedCommodity}
                loading={loading}
              />
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <TabularView matrix={matrix} />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Jivo rate table (pack sizes × commodities, latest market rates) */}
      <RateTableCard table={rateTable} loading={loading} onAddPackSize={() => setPackingOpen(true)} />

      {/* Packing management */}
      <PackingDialog
        open={packingOpen}
        onOpenChange={setPackingOpen}
        packings={packings}
        commodities={commodities}
        createdBy={email ?? "frontend"}
        onSaved={() => void reload()}
      />
    </div>
  );
}
