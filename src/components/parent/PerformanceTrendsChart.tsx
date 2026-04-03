import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, TrendingUp, TrendingDown, Minus, Info } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea } from 'recharts';

interface TrendPoint {
  date: string;
  score: number;
  maxScore: number;
  percentage: number;
  trendStatus: string;
  riskLevel: string;
}

interface PerformanceTrendsChartProps {
  data: TrendPoint[];
  title?: string;
  subject?: string;
}

export const PerformanceTrendsChart: React.FC<PerformanceTrendsChartProps> = ({
  data,
  title = "Granular Performance Trends",
  subject
}) => {
  const lastPoint = data[data.length - 1];

  const getTrendIcon = (status: string) => {
    switch (status) {
      case 'Improving': return <TrendingUp className="h-4 w-4 text-emerald-500" />;
      case 'Declining': return <TrendingDown className="h-4 w-4 text-rose-500" />;
      default: return <Minus className="h-4 w-4 text-slate-400" />;
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'High': return "text-rose-600 bg-rose-50 border-rose-100";
      case 'Medium': return "text-amber-600 bg-amber-50 border-amber-100";
      case 'Low': return "text-emerald-600 bg-emerald-50 border-emerald-100";
      default: return "text-slate-600 bg-slate-50 border-slate-100";
    }
  };

  return (
    <Card className="border-none shadow-strong bg-card/60 backdrop-blur-md rounded-[2rem] overflow-hidden">
      <CardHeader className="bg-primary/5 border-b border-primary/10 p-6">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-black flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            {title} {subject && <span className="text-muted-foreground font-medium">— {subject}</span>}
          </CardTitle>
          {lastPoint && (
            <Badge className={cn("text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border", getRiskColor(lastPoint.riskLevel))}>
              {lastPoint.trendStatus} · {lastPoint.riskLevel} Risk
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                domain={[0, 100]}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '1rem',
                  border: 'none',
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                  padding: '12px'
                }}
                labelStyle={{ fontWeight: 800, marginBottom: '4px', fontSize: '12px' }}
                itemStyle={{ fontSize: '12px', fontWeight: 600 }}
              />
              <Line
                type="monotone"
                dataKey="percentage"
                stroke="hsl(var(--primary))"
                strokeWidth={4}
                dot={{ r: 6, fill: 'hsl(var(--primary))', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 8, strokeWidth: 0 }}
                animationDuration={2000}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {lastPoint && lastPoint.trendStatus === 'Declining' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-4 rounded-2xl bg-rose-50 border border-rose-100 flex gap-3 items-start"
          >
            <div className="p-2 rounded-xl bg-white shadow-sm">
              <TrendingDown className="h-5 w-5 text-rose-500" />
            </div>
            <div>
              <p className="text-xs font-black text-rose-700 uppercase tracking-wider mb-1">Early Warning Detected</p>
              <p className="text-sm font-medium text-rose-600 leading-relaxed">
                We've noticed a sudden drop in performance. This might be an acute issue. Consider discussing this with the subject teacher.
              </p>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
};
