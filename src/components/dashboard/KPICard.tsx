import { type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

interface KPICardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trendData?: any[];
  color?: string;
  onClick?: () => void;
  className?: string;
  secondaryIcon?: LucideIcon;
  secondaryIconColor?: string;
}

export const KPICard = ({
  title,
  value,
  description,
  icon: Icon,
  trendData,
  color = "indigo",
  onClick,
  className,
  secondaryIcon: SecondaryIcon,
  secondaryIconColor
}: KPICardProps) => {
  const colorVariants: Record<string, string> = {
    indigo: "bg-primary/10 text-primary",
    green: "bg-green-500/10 text-green-600",
    orange: "bg-orange-500/10 text-orange-600",
    blue: "bg-blue-500/10 text-blue-600",
    purple: "bg-purple-500/10 text-purple-600",
    rose: "bg-rose-500/10 text-rose-600",
    yellow: "bg-yellow-500/10 text-yellow-600",
    pink: "bg-pink-500/10 text-pink-600" };

  const chartColors: Record<string, string> = {
    indigo: "hsl(var(--primary))",
    green: "#22c55e",
    orange: "#f97316",
    blue: "#3b82f6",
    purple: "#a855f7",
    rose: "#f43f5e",
    yellow: "#eab308",
    pink: "#ec4899" };

  return (
    <Card
      onClick={onClick}
      className={cn(
        "group overflow-hidden border-none shadow-soft transition-all duration-300 hover:shadow-medium hover:-translate-y-1 bg-card/60 backdrop-blur-md rounded-2xl border border-border/20",
        onClick && "cursor-pointer",
        className
      )}
    >
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-2">
          <div className={cn("p-2 rounded-lg", colorVariants[color])}>
            <Icon className="h-5 w-5" />
          </div>
          {SecondaryIcon && (
            <div className={cn("p-2 rounded-lg bg-card shadow-sm", secondaryIconColor)}>
               <SecondaryIcon className="h-4 w-4" />
            </div>
          )}
        </div>

        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-black tracking-tight text-foreground">{value}</h3>
          </div>
          {description && (
            <p className="text-[10px] font-bold text-muted-foreground/70">{description}</p>
          )}
        </div>

        {trendData && trendData.length > 0 && (
          <div className="h-12 w-full mt-4 -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color === 'indigo' ? 'var(--primary-hex, #6366f1)' : chartColors[color]} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={color === 'indigo' ? 'var(--primary-hex, #6366f1)' : chartColors[color]} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={color === 'indigo' ? 'hsl(var(--primary))' : chartColors[color]}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill={`url(#gradient-${color})`}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
