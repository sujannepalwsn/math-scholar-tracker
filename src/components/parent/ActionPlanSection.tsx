import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ListChecks, CheckCircle2, AlertCircle, TrendingUp, Info, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ActionPoint {
  id: string;
  title: string;
  description: string;
  urgency: 'Low' | 'Medium' | 'High';
  actionType: string;
}

interface ActionPlanSectionProps {
  actions: ActionPoint[];
  title?: string;
}

export const ActionPlanSection: React.FC<ActionPlanSectionProps> = ({
  actions,
  title = "Parent Decision Support & Actionable Guidance"
}) => {
  const getUrgencyColor = (urgency: ActionPoint['urgency']) => {
    switch (urgency) {
      case 'High': return "bg-rose-500/10 text-rose-600 border-rose-200";
      case 'Medium': return "bg-amber-500/10 text-amber-600 border-amber-200";
      case 'Low': return "bg-emerald-500/10 text-emerald-600 border-emerald-200";
    }
  };

  return (
    <Card className="border-none shadow-strong bg-card/60 backdrop-blur-md rounded-[2.5rem] overflow-hidden border border-primary/20">
      <CardHeader className="bg-primary/5 border-b border-primary/10 p-6">
        <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
          <ListChecks className="h-5 w-5" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-primary/10 max-h-[500px] overflow-y-auto custom-scrollbar">
          {actions.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No priority actions recommended at this time</p>
            </div>
          ) : (
            actions.map((action, index) => (
              <motion.div
                key={action.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-6 hover:bg-primary/5 transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge className={cn("text-[9px] font-black uppercase rounded-lg border", getUrgencyColor(action.urgency))}>
                        {action.urgency} Priority
                      </Badge>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {action.actionType}
                      </span>
                    </div>
                    <p className="text-base font-black text-slate-800 group-hover:text-primary transition-colors">
                      {action.title}
                    </p>
                    <p className="text-sm font-medium text-slate-500 leading-relaxed">
                      {action.description}
                    </p>
                    <div className="flex items-center gap-2 pt-2">
                      <p className="text-xs font-black text-primary uppercase tracking-widest group-hover:translate-x-1 transition-transform flex items-center gap-1">
                        Execute recommendation <ArrowRight className="h-3 w-3" />
                      </p>
                    </div>
                  </div>
                  <div className={cn("p-2 rounded-full", action.urgency === 'High' ? "bg-rose-500/10 text-rose-500" : "bg-emerald-500/10 text-emerald-500")}>
                    {action.urgency === 'High' ? <AlertCircle className="h-6 w-6" /> : <CheckCircle2 className="h-6 w-6" />}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
