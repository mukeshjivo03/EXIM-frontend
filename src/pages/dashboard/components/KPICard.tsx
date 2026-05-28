import { ArrowUpRight, ArrowDownRight, MousePointer2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string | number;
  sub: string;
  icon: React.ElementType;
  trend?: number;
  color: string;
  loading?: boolean;
  onClick?: () => void;
}

export function KPICard({ title, value, sub, icon: Icon, trend, color, loading, onClick }: KPICardProps) {
  return (
    <Card className={cn("card-hover shimmer-hover overflow-hidden relative group", onClick && "cursor-pointer")} onClick={onClick}>
      <CardContent className="p-3 sm:p-5 lg:p-6">
        <div className="flex justify-between items-start">
          <div className="space-y-1.5 sm:space-y-2 min-w-0">
            <p className="text-[9px] sm:text-xs font-bold uppercase tracking-wide sm:tracking-widest text-muted-foreground leading-tight">{title}</p>
            {loading ? (
              <div className="h-7 w-20 sm:h-8 sm:w-24 bg-muted animate-pulse rounded" />
            ) : (
              <h3 className="text-sm sm:text-xl lg:text-2xl font-black tracking-tight leading-tight break-words">{value}</h3>
            )}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              {trend && (
                <span className={cn(
                  "flex items-center text-[9px] sm:text-[10px] font-bold px-1 sm:px-1.5 py-0.5 rounded-full",
                  trend > 0 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30" : "bg-red-100 text-red-700 dark:bg-red-900/30"
                )}>
                  {trend > 0 ? <ArrowUpRight className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5" /> : <ArrowDownRight className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5" />}
                  {Math.abs(trend).toFixed(1)}%
                </span>
              )}
              <p className="text-[8px] sm:text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{sub}</p>
            </div>
          </div>
          <div className={cn("p-1.5 sm:p-3 rounded-lg sm:rounded-2xl transition-all duration-500 group-hover:scale-110 shrink-0", color)}>
            <Icon className="h-4 w-4 sm:h-6 sm:w-6" />
          </div>
        </div>
      </CardContent>
      {onClick && (
        <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <MousePointer2 className="h-3 w-3 text-muted-foreground" />
        </div>
      )}
    </Card>
  );
}
