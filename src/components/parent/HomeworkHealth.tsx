import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookMarked, CheckCircle, AlertTriangle, TrendingUp, Info, ArrowDown, ArrowUp } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface HomeworkRecord {
  id: string;
  title: string;
  subject: string;
  dueDate: string;
  status: 'assigned' | 'in_progress' | 'completed' | 'checked';
  score?: number;
  maxScore?: number;
}

interface HomeworkHealthProps {
  records: HomeworkRecord[];
  title?: string;
}

export const HomeworkHealth: React.FC<HomeworkHealthProps> = ({
  records,
  title = "Homework Quality vs. Completion Tracking"
}) => {
  const completionRate = records.length > 0 ? Math.round(records.filter(r => ['completed', 'checked'].includes(r.status)).length / records.length * 100) : 0;

  const accuracyRate = useMemo(() => {
    const scoredRecords = records.filter(r => r.score !== undefined && r.maxScore !== undefined && r.maxScore > 0);
    if (scoredRecords.length === 0) return null;
    const totalScore = scoredRecords.reduce((sum, r) => sum + (r.score || 0), 0);
    const totalMax = scoredRecords.reduce((sum, r) => sum + (r.maxScore || 0), 0);
    return Math.round((totalScore / totalMax) * 100);
  }, [records]);

  const discrepancy = accuracyRate !== null ? completionRate - accuracyRate : 0;

  return (
    <Card className="border-none shadow-strong bg-card/60 backdrop-blur-md rounded-[2.5rem] overflow-hidden">
      <CardHeader className="bg-amber-500/5 border-b border-amber-100/30 p-6">
        <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-amber-600 flex items-center gap-2">
          <BookMarked className="h-5 w-5" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-100 text-center space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600/60">Completion Rate</p>
            <p className="text-3xl font-black text-emerald-600">{completionRate}%</p>
          </div>
          <div className="p-5 rounded-2xl bg-blue-50/50 border border-blue-100 text-center space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600/60">Accuracy Rate</p>
            <p className="text-3xl font-black text-blue-600">{accuracyRate !== null ? `${accuracyRate}%` : 'N/A'}</p>
          </div>
        </div>

        {discrepancy > 20 && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="p-4 rounded-2xl bg-rose-50 border border-rose-100 flex gap-3 items-start"
          >
            <div className="p-2 rounded-xl bg-white shadow-sm">
              <AlertTriangle className="h-5 w-5 text-rose-500" />
            </div>
            <div>
              <p className="text-xs font-black text-rose-700 uppercase tracking-wider mb-1">Rushing Warning detected</p>
              <p className="text-sm font-medium text-rose-600 leading-relaxed">
                Large discrepancy ({discrepancy}%) between completion and accuracy. The child might be rushing through homework without understanding.
              </p>
            </div>
          </motion.div>
        )}

        <div className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Recent Directive Evaluations</p>
          <div className="divide-y divide-slate-100 border rounded-2xl overflow-hidden bg-white/40">
            {records.slice(0, 3).map((record) => (
              <div key={record.id} className="p-4 flex justify-between items-center hover:bg-slate-50/50 transition-colors">
                <div>
                  <p className="text-sm font-black text-slate-700">{record.title}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{record.subject} · {record.dueDate}</p>
                </div>
                <div className="text-right">
                  {record.score !== undefined ? (
                    <p className="text-sm font-black text-slate-700">{record.score}/{record.maxScore}</p>
                  ) : (
                    <Badge className={cn("text-[8px] font-black uppercase rounded-lg", record.status === 'completed' ? "bg-emerald-500" : "bg-slate-200 text-slate-500")}>
                      {record.status}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
