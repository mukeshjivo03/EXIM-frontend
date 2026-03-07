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
      <CardContent className="pt-6 pb-5 px-5">
        <div className="flex items-center gap-4">
          <div className="rounded-lg bg-orange-50 dark:bg-orange-900/50 p-3">
            <Icon className="h-6 w-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            {loading ? (
              <Skeleton className="h-7 w-24 mt-1" />
            ) : (
              <p className="text-2xl font-bold mt-0.5">{value}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
