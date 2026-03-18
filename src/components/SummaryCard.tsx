import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface SummaryCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  loading?: boolean;
}

export function SummaryCard({ icon: Icon, label, value, loading }: SummaryCardProps) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3 px-3 sm:pt-6 sm:pb-5 sm:px-5">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="rounded-lg bg-orange-50 dark:bg-orange-900/50 p-2 sm:p-3 shrink-0">
            <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm text-muted-foreground">{label}</p>
            {loading ? (
              <Skeleton className="h-7 w-24 mt-1" />
            ) : (
              <p className="text-base sm:text-lg md:text-2xl font-bold mt-0.5 break-words">{value}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
