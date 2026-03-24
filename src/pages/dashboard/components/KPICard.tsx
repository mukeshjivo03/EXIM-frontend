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
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</p>
            {loading ? (
              <div className="h-8 w-24 bg-muted animate-pulse rounded" />
            ) : (
              <h3 className="text-2xl font-black tracking-tight">{value}</h3>
            )}
            <div className="flex items-center gap-2">
              {trend && (
                <span className={cn(
                  "flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                  trend > 0 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30" : "bg-red-100 text-red-700 dark:bg-red-900/30"
                )}>
                  {trend > 0 ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                  {Math.abs(trend).toFixed(1)}%
                </span>
              )}
              <p className="text-[10px] text-muted-foreground font-medium uppercase">{sub}</p>
            </div>
          </div>
          <div className={cn("p-3 rounded-2xl transition-all duration-500 group-hover:scale-110", color)}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
      {onClick && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <MousePointer2 className="h-3 w-3 text-muted-foreground" />
        </div>
      )}
    </Card>
  );
}
