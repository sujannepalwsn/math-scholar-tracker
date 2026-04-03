import { type LucideIcon, TrendingUp, TrendingDown, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils"
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";

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
  delta?: number;
  target?: number;
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
  secondaryIconColor,
  delta,
  target
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

  const isProFeature = ["teacher attendance", "lesson plans", "approvals", "leave requests"].includes(title.toLowerCase());

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      className="h-full"
    >
    <Card
      onClick={onClick}
      className={cn(
        "group overflow-hidden border-none shadow-glass transition-all duration-500 bg-white/70 dark:bg-slate-900/70 backdrop-blur-lg rounded-3xl border border-white/40 dark:border-slate-800/40 h-full flex flex-col justify-between relative",
        onClick && "cursor-pointer",
        isProFeature && "border-indigo-500/20 shadow-indigo-500/5",
        className
      )}
    >
      {isProFeature && (
         <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5">
            <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg">
               <Sparkles className="h-2 w-2 mr-1" /> Pro
            </Badge>
         </div>
      )}
      <CardContent className="p-6">
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
          <p className="label-caps mb-2">{title}</p>
          <div className="flex items-center justify-between gap-2">
            <h3 className="display-metric">{value}</h3>
            {delta !== undefined && (
              <div className={cn(
                "flex items-center gap-1 text-[11px] font-black px-2 py-1 rounded-full",
                delta >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
              )}>
                {delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {Math.abs(delta)}%
              </div>
            )}
          </div>
          {description && (
            <p className="text-[10px] font-bold text-muted-foreground/60">{description}</p>
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
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-background/80 backdrop-blur-md border shadow-soft px-2 py-1 rounded-lg text-[10px] font-bold">
                          {payload[0].value}%
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={color === 'indigo' ? 'hsl(var(--primary))' : chartColors[color]}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill={`url(#gradient-${color})`}
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {target !== undefined && (
           <div className="mt-6 space-y-2">
             <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-tighter opacity-50">
                <span>Goal Progress</span>
                <span>{target}%</span>
             </div>
             <Progress value={target} className="h-1.5" />
           </div>
        )}
      </CardContent>
    </Card>
    </motion.div>
  );
};
