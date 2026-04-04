import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, AlertTriangle, TrendingDown, TrendingUp, Info } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AIInsight {
  id: string;
  type: 'risk' | 'sentiment' | 'fee';
  level: 'Low' | 'Medium' | 'High';
  title: string;
  description: string;
  factors?: Record<string, any>;
  studentName?: string;
}

interface AIInsightsWidgetProps {
  insights: AIInsight[];
  title?: string;
}

export const AIInsightsWidget: React.FC<AIInsightsWidgetProps> = ({
  insights,
  title = "AI-Powered Predictions"
}) => {
  const getIcon = (type: AIInsight['type']) => {
    switch (type) {
      case 'risk': return <TrendingDown className="h-4 w-4" />;
      case 'sentiment': return <Sparkles className="h-4 w-4" />;
      case 'fee': return <AlertTriangle className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const getLevelColor = (level: AIInsight['level']) => {
    switch (level) {
      case 'High': return "bg-rose-500/10 text-rose-600 border-rose-200";
      case 'Medium': return "bg-amber-500/10 text-amber-600 border-amber-200";
      case 'Low': return "bg-emerald-500/10 text-emerald-600 border-emerald-200";
    }
  };

  return (
    <Card className="border border-indigo-100 shadow-sm bg-white rounded-2xl overflow-hidden">
      <CardHeader className="bg-indigo-50/30 border-b border-indigo-100/50 p-6">
        <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-indigo-600 flex items-center gap-2">
          <Sparkles className="h-5 w-5 animate-pulse text-indigo-500" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-indigo-100/30 max-h-[400px] overflow-y-auto custom-scrollbar">
          {insights.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No critical AI insights detected at this time</p>
            </div>
          ) : (
            insights.map((insight, index) => (
              <motion.div
                key={insight.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-5 hover:bg-indigo-50/30 transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <div className={cn("p-1.5 rounded-lg", getLevelColor(insight.level).split(' ')[0])}>
                        {getIcon(insight.type)}
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {insight.type} · {insight.studentName || 'Global'}
                      </span>
                    </div>
                    <p className="text-sm font-black text-slate-800 group-hover:text-indigo-600 transition-colors">
                      {insight.title}
                    </p>
                    <p className="text-[11px] font-medium text-slate-500 leading-relaxed">
                      {insight.description}
                    </p>
                    {insight.factors && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {Object.entries(insight.factors).map(([k, v]) => (
                          <div key={k} className="px-2 py-0.5 rounded-md bg-white border border-slate-100 text-[9px] font-bold text-slate-400 uppercase">
                            {k}: <span className="text-slate-700">{v}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <Badge className={cn("text-[9px] font-black uppercase rounded-lg border", getLevelColor(insight.level))}>
                    {insight.level} Risk
                  </Badge>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
