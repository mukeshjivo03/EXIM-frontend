import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Droplets, Hash, IndianRupee, RefreshCw, Scale, Weight } from "lucide-react";

import {
  getInTankItems,
  getItemWiseAverage,
  getTankItems,
  type ItemWiseAverage,
  type TankItem,
} from "@/api/tank";
import Guard from "@/components/Guard";
import { SummaryCard } from "@/components/SummaryCard";
import { fmtDateTime, fmtNum } from "@/lib/formatters";
import { getErrorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function InTankBreakdownPage() {
  const [itemsLoading, setItemsLoading] = useState(true);
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [error, setError] = useState("");
  const [inTankItems, setInTankItems] = useState<string[]>([]);
  const [tankItems, setTankItems] = useState<TankItem[]>([]);
  const [selectedItem, setSelectedItem] = useState("");
  const [average, setAverage] = useState<ItemWiseAverage | null>(null);

  const itemNameMap = useMemo(
    () => new Map(tankItems.map((item) => [item.tank_item_code, item.tank_item_name])),
    [tankItems]
  );

  const breakdown = average?.breakdown ?? [];

  async function loadItems() {
    setItemsLoading(true);
    setError("");
    try {
      const [inTankRes, tankRes] = await Promise.all([getInTankItems(), getTankItems()]);
      const uniqueItems = [...new Set(inTankRes.map((item) => item.item_code).filter(Boolean))].sort();
      setInTankItems(uniqueItems);
      setTankItems((tankRes ?? []).sort((a, b) => a.tank_item_code.localeCompare(b.tank_item_code)));
      setSelectedItem((current) => current || uniqueItems[0] || "");
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load in-tank items"));
    } finally {
      setItemsLoading(false);
    }
  }

  async function loadBreakdown(itemCode: string) {
    if (!itemCode) {
      setAverage(null);
      return;
    }

    setBreakdownLoading(true);
    setError("");
    try {
      const data = await getItemWiseAverage(itemCode);
      setAverage(data);
    } catch (err) {
      setAverage(null);
      setError(getErrorMessage(err, "Failed to load item tank breakdown"));
    } finally {
      setBreakdownLoading(false);
    }
  }

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    if (selectedItem) loadBreakdown(selectedItem);
  }, [selectedItem]);

  return (
    <Guard
      resource="stockstatus"
      action="view"
      fallback={<div className="p-6 text-sm text-muted-foreground">You do not have permission to view tank breakdown.</div>}
    >
      <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 animate-page">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">In Tank Breakdown</h1>
            <p className="text-sm text-muted-foreground">Item-wise tank quantity and weighted average rates</p>
          </div>
          <Button variant="outline" className="gap-2" onClick={loadItems} disabled={itemsLoading || breakdownLoading}>
            <RefreshCw className={`h-4 w-4 ${itemsLoading || breakdownLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Card>
          <CardContent className="pt-6">
            <div className="max-w-md space-y-1.5">
              <Label className="text-xs text-muted-foreground">Item Currently In Tank</Label>
              <Select value={selectedItem || "__none__"} onValueChange={(value) => setSelectedItem(value === "__none__" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {itemsLoading ? (
                    <SelectItem value="__none__">Loading items...</SelectItem>
                  ) : inTankItems.length === 0 ? (
                    <SelectItem value="__none__">No in-tank items found</SelectItem>
                  ) : (
                    inTankItems.map((itemCode) => (
                      <SelectItem key={itemCode} value={itemCode}>
                        {itemCode}{itemNameMap.get(itemCode) ? ` - ${itemNameMap.get(itemCode)}` : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div>
          <h2 className="text-base font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Insights
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-5">
            <SummaryCard icon={Hash} label="Breakdown Count" value={breakdown.length} loading={breakdownLoading} />
            <SummaryCard icon={Droplets} label="Quantity / LTR" value={`${fmtNum(Number(average?.quantity_matched ?? 0))} LTR`} loading={breakdownLoading} />
            <SummaryCard icon={Scale} label="Quantity / KG" value={`${fmtNum(Number(average?.quantity_matched_kg ?? 0))} KG`} loading={breakdownLoading} />
            <SummaryCard icon={Weight} label="Avg Rate / KG" value={`Rs ${fmtNum(Number(average?.["adjusted_average_kg(STO)"] ?? 0))}`} loading={breakdownLoading} />
            <SummaryCard icon={IndianRupee} label="Avg Rate / LTR" value={`Rs ${fmtNum(Number(average?.["adjusted_average(STO)"] ?? 0))}`} loading={breakdownLoading} />
          </div>
          {average?.warning && (
            <div className="mt-3 flex items-center gap-2 text-sm text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              {average.warning}
            </div>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Stock Breakdown</CardTitle>
            <CardDescription>
              {selectedItem ? itemNameMap.get(selectedItem) ?? selectedItem : "Select an item"} · {breakdown.length} line{breakdown.length === 1 ? "" : "s"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {breakdownLoading ? (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableBody>
                    {Array.from({ length: 5 }).map((_, rowIndex) => (
                      <TableRow key={rowIndex}>
                        {Array.from({ length: 10 }).map((_, cellIndex) => (
                          <TableCell key={cellIndex}>
                            <Skeleton className="h-4 w-20" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-12">S.No</TableHead>
                      <TableHead>Stock ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Party</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Transporter</TableHead>
                      <TableHead className="text-right">Rate / LTR</TableHead>
                      <TableHead className="text-right">Rate / KG</TableHead>
                      <TableHead className="text-right">Qty LTR</TableHead>
                      <TableHead className="text-right">Qty KG</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {breakdown.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="py-16 text-center text-muted-foreground">
                          {selectedItem ? "No breakdown lines found for this item." : "Select an item to view breakdown."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      breakdown.map((row, index) => (
                        <TableRow key={`${row.stock_id}-${index}`}>
                          <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                          <TableCell className="font-medium">{row.stock_id}</TableCell>
                          <TableCell>{fmtDateTime(row.created_at).split(",")[0]}</TableCell>
                          <TableCell className="min-w-[220px] font-medium">{row.party || "-"}</TableCell>
                          <TableCell>{row.vehicle || "-"}</TableCell>
                          <TableCell>{row.transporter || "-"}</TableCell>
                          <TableCell className="text-right tabular-nums">{fmtNum(Number(row.rate_in_litres ?? 0))}</TableCell>
                          <TableCell className="text-right tabular-nums">{fmtNum(Number(row.rate_in_kg ?? 0))}</TableCell>
                          <TableCell className="text-right tabular-nums">{fmtNum(Number(row.quantity_consumed ?? 0))}</TableCell>
                          <TableCell className="text-right tabular-nums">{fmtNum(Number(row.quantity_consumed_kg ?? 0))}</TableCell>
                          <TableCell className="text-right tabular-nums">Rs {fmtNum(Number(row.batch_total_kg ?? row.batch_total ?? 0))}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Guard>
  );
}
