import React from "react";
import { ParentInsight } from "@/hooks/useParentInsights";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Info, CheckCircle, Flame, TrendingDown, Wallet, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface InsightAlertsProps {
  insights: ParentInsight[];
}

export const InsightAlerts: React.FC<InsightAlertsProps> = ({ insights }) => {
  if (insights.length === 0) return null;

  const getIcon = (type: ParentInsight['type'], level: ParentInsight['level']) => {
    if (level === 'critical') return <Flame className="h-5 w-5 text-rose-500" />;
    switch (type) {
      case 'performance': return <TrendingDown className="h-5 w-5 text-amber-500" />;
      case 'attendance': return <AlertTriangle className="h-5 w-5 text-rose-500" />;
      case 'homework': return <BookOpen className="h-5 w-5 text-amber-500" />;
      case 'finance': return <Wallet className="h-5 w-5 text-amber-500" />;
      default: return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getColors = (level: ParentInsight['level']) => {
    switch (level) {
      case 'critical': return "bg-rose-50 border-rose-100 text-rose-900";
      case 'warning': return "bg-amber-50 border-amber-100 text-amber-900";
      case 'success': return "bg-emerald-50 border-emerald-100 text-emerald-900";
      default: return "bg-slate-50 border-slate-100 text-slate-900";
    }
  };

  return (
    <div className="space-y-3">
      <AnimatePresence>
        {insights.map((insight, idx) => (
          <motion.div
            key={`${insight.title}-${idx}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ delay: idx * 0.1 }}
          >
            <Card className={cn("border shadow-none overflow-hidden rounded-2xl", getColors(insight.level))}>
              <CardContent className="p-4 flex gap-4 items-start">
                <div className="p-2 rounded-xl bg-white shadow-sm shrink-0">
                  {getIcon(insight.type, insight.level)}
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-black uppercase tracking-tight">{insight.title}</h4>
                  <p className="text-sm font-medium opacity-80 leading-relaxed">{insight.message}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
