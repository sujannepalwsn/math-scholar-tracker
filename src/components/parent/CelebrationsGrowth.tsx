import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Star, Sparkles, TrendingUp, CheckCircle, Info, Heart } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Milestone {
  id: string;
  type: 'streak' | 'improvement' | 'mastery' | 'effort';
  title: string;
  description: string;
  date: string;
  metadata?: Record<string, any>;
}

interface CelebrationsGrowthProps {
  milestones: Milestone[];
  title?: string;
}

export const CelebrationsGrowth: React.FC<CelebrationsGrowthProps> = ({
  milestones,
  title = "Emotional Safety & Confidence Building"
}) => {
  const getIcon = (type: Milestone['type']) => {
    switch (type) {
      case 'streak': return <Trophy className="h-4 w-4" />;
      case 'improvement': return <TrendingUp className="h-4 w-4" />;
      case 'mastery': return <Star className="h-4 w-4" />;
      case 'effort': return <Heart className="h-4 w-4" />;
      default: return <Sparkles className="h-4 w-4" />;
    }
  };

  const getBadgeColor = (type: Milestone['type']) => {
    switch (type) {
      case 'streak': return "bg-amber-500/10 text-amber-600 border-amber-200";
      case 'improvement': return "bg-blue-500/10 text-blue-600 border-blue-200";
      case 'mastery': return "bg-purple-500/10 text-purple-600 border-purple-200";
      case 'effort': return "bg-rose-500/10 text-rose-600 border-rose-200";
    }
  };

  return (
    <Card className="border-none shadow-strong bg-gradient-to-br from-pink-50/30 to-white backdrop-blur-md rounded-[2.5rem] overflow-hidden border border-pink-100/50">
      <CardHeader className="bg-pink-500/5 border-b border-pink-100/30 p-6">
        <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-pink-600 flex items-center gap-2">
          <Sparkles className="h-5 w-5 animate-pulse" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-pink-100/30 max-h-[400px] overflow-y-auto custom-scrollbar">
          {milestones.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No milestones recorded for this period</p>
            </div>
          ) : (
            milestones.map((milestone, index) => (
              <motion.div
                key={milestone.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-5 hover:bg-pink-50/30 transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <div className={cn("p-1.5 rounded-lg", getBadgeColor(milestone.type).split(' ')[0])}>
                        {getIcon(milestone.type)}
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {milestone.type} Milestone · {milestone.date}
                      </span>
                    </div>
                    <p className="text-sm font-black text-slate-800 group-hover:text-pink-600 transition-colors">
                      {milestone.title}
                    </p>
                    <p className="text-[11px] font-medium text-slate-500 leading-relaxed">
                      {milestone.description}
                    </p>
                    {milestone.metadata && milestone.type === 'streak' && (
                      <div className="mt-2 flex items-center gap-1 text-[10px] font-black text-amber-600 uppercase">
                        Current Streak: {milestone.metadata.days} Days <TrendingUp className="h-3 w-3" />
                      </div>
                    )}
                  </div>
                  <Badge className={cn("text-[9px] font-black uppercase rounded-lg border", getBadgeColor(milestone.type))}>
                    Celebrated
                  </Badge>
                </div>
              </motion.div>
            ))
          )}
        </div>
        <div className="p-4 bg-pink-50/10 border-t border-pink-100/30">
          <p className="text-[10px] font-bold text-pink-600/60 uppercase tracking-widest text-center italic">
            Focusing on growth over absolute scores to build resilience.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
