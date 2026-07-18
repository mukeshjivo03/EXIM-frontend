import { PackageOpen } from "lucide-react";

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { DeltaChip } from "@/components/DeltaChip";
import { Sparkline } from "@/components/Sparkline";
import { cn } from "@/lib/utils";
import { fmtINR } from "./CommodityCard";
import type { EnrichedRate } from "./useMarketRates";

interface TabularViewProps {
  rows: EnrichedRate[];
  hasSearch: boolean;
  onSelect: (row: EnrichedRate) => void;
}

export function TabularView({ rows, hasSearch, onSelect }: TabularViewProps) {
  return (
    <Table className="text-base">
      <TableHeader className="sticky top-0 z-10 bg-background">
        <TableRow className="bg-muted/60 hover:bg-muted/60">
          <TableHead className="w-12 text-center font-bold text-foreground">#</TableHead>
          <TableHead className="font-bold text-foreground">Commodity</TableHead>
          <TableHead className="text-right font-bold text-foreground">Factory (₹/Kg)</TableHead>
          <TableHead className="text-center font-bold text-foreground">Δ vs yesterday</TableHead>
          <TableHead className="text-right font-bold text-foreground">With Packing</TableHead>
          <TableHead className="text-right font-bold text-foreground">With GST /Kg</TableHead>
          <TableHead className="text-right font-bold text-foreground">With GST /Ltr</TableHead>
          <TableHead className="text-center font-bold text-foreground">Trend</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={8} className="py-16">
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <PackageOpen className="h-10 w-10 stroke-1" />
                <p className="text-sm font-medium">
                  {hasSearch ? "No commodities match your search" : "No rates logged today"}
                </p>
                {!hasSearch && <p className="text-xs">Click "Log Today's Rates" to record them.</p>}
              </div>
            </TableCell>
          </TableRow>
        ) : (
          rows.map((row, idx) => (
            <TableRow
              key={row.commodityId}
              onClick={() => onSelect(row)}
              className={cn(
                "cursor-pointer hover:bg-muted/30 transition-colors border-b border-border/50",
                row.isHighest && "border-l-2 border-l-emerald-500",
                row.isLowest && "border-l-2 border-l-red-500"
              )}
            >
              <TableCell className="text-center text-muted-foreground text-sm">{idx + 1}</TableCell>
              <TableCell className="font-semibold">{row.name}</TableCell>
              <TableCell className="text-right tabular-nums font-bold">{fmtINR(row.factory)}</TableCell>
              <TableCell className="text-center">
                <DeltaChip current={row.factory} previous={row.prevFactory} size="sm" />
              </TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">{fmtINR(row.packing)}</TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">{fmtINR(row.gstKg)}</TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">{fmtINR(row.gstLtr)}</TableCell>
              <TableCell className="text-center">
                <Sparkline data={row.spark} width={56} height={20} className="inline-block" />
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
