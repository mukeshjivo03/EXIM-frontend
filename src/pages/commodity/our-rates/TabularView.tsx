import { PackageOpen } from "lucide-react";

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { fmtINR } from "./helpers";
import type { OurRatesMatrix } from "./useOurRates";

interface TabularViewProps {
  matrix: OurRatesMatrix;
}

/** Matrix table: packing rows × commodity columns (screenshot-style "Jivo Rate" sheet). */
export function TabularView({ matrix }: TabularViewProps) {
  return (
    <Table className="text-base">
      <TableHeader>
        <TableRow>
          <TableHead className="min-w-[160px] font-bold text-primary text-center bg-primary/10 dark:bg-primary/20 border-b-2 border-primary/30">
            Packing
          </TableHead>
          {matrix.commodities.map((c) => (
            <TableHead
              key={c.fk}
              className="text-center min-w-[120px] font-bold text-foreground bg-muted/60 capitalize border-b-2 border-border/60"
            >
              {c.name}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {matrix.packings.length === 0 || matrix.commodities.length === 0 ? (
          <TableRow>
            <TableCell colSpan={matrix.commodities.length + 1} className="py-16 text-center">
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <PackageOpen className="h-10 w-10 stroke-1" />
                <p className="text-sm font-medium">No basic rates for this date</p>
                <p className="text-xs">Rates appear once market rates and packing margins are combined by the backend.</p>
              </div>
            </TableCell>
          </TableRow>
        ) : (
          matrix.packings.map((p) => (
            <TableRow key={p.id} className="hover:bg-muted/30 transition-colors">
              <TableCell className="font-semibold text-center capitalize bg-muted/40 border-r border-border/60 text-foreground">
                <div className="flex flex-col items-center leading-tight">
                  <span>{p.name}</span>
                  <span className="text-[10px] font-normal text-muted-foreground tabular-nums">+₹{fmtINR(p.margin)}</span>
                </div>
              </TableCell>
              {matrix.commodities.map((c) => {
                const price = matrix.valueMap.get(`${c.fk}||${p.id}`);
                return (
                  <TableCell key={c.fk} className="text-center border-r border-border/30 last:border-r-0">
                    {price !== undefined ? (
                      <div className="flex flex-col items-center gap-0.5 py-0.5">
                        <span className="font-semibold text-sm tabular-nums">₹ {fmtINR(price.kg)} /Kg</span>
                        <span className="text-[10px] text-muted-foreground tabular-nums leading-none">
                          ≈ ₹{fmtINR(price.ltr)} /Ltr
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground/30">—</span>
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
