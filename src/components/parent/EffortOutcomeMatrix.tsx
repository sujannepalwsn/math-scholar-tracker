import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Target, Shield, AlertTriangle, Zap, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis, ReferenceArea, ReferenceLine } from 'recharts';

interface EffortOutcomePoint {
  studentName: string;
  effort: number;
  outcome: number;
  id: string;
}

interface EffortOutcomeMatrixProps {
  data: EffortOutcomePoint[];
  title?: string;
  activeStudentId?: string;
}

export const EffortOutcomeMatrix: React.FC<EffortOutcomeMatrixProps> = ({
  data,
  title = "Effort vs. Outcome Matrix",
  activeStudentId
}) => {
  const activePoint = data.find(p => p.id === activeStudentId);

  const getQuadrant = (effort: number, outcome: number) => {
    if (effort >= 50 && outcome >= 50) return { label: 'Praise', description: 'High Effort / High Outcome', color: 'emerald', icon: <Target className="h-4 w-4" /> };
    if (effort >= 50 && outcome < 50) return { label: 'Support / Tutor', description: 'High Effort / Low Outcome', color: 'amber', icon: <Shield className="h-4 w-4" /> };
    if (effort < 50 && outcome >= 50) return { label: 'Challenge / Enrich', description: 'Low Effort / High Outcome', color: 'blue', icon: <Zap className="h-4 w-4" /> };
    return { label: 'Motivate / Discipline', description: 'Low Effort / Low Outcome', color: 'rose', icon: <AlertTriangle className="h-4 w-4" /> };
  };

  const quadrant = activePoint ? getQuadrant(activePoint.effort, activePoint.outcome) : null;

  return (
    <Card className="border-none shadow-strong bg-card/60 backdrop-blur-md rounded-[2rem] overflow-hidden h-full">
      <CardHeader className="bg-primary/5 border-b border-primary/10 p-6">
        <CardTitle className="text-lg font-black flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="h-[300px] w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" dataKey="effort" name="Effort" domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} label={{ value: 'Effort', position: 'insideBottom', offset: -10, fontSize: 10, fontWeight: 700 }} />
              <YAxis type="number" dataKey="outcome" name="Outcome" domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} label={{ value: 'Outcome', angle: -90, position: 'insideLeft', fontSize: 10, fontWeight: 700 }} />
              <ZAxis range={[100, 100]} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />

              {/* Quadrant Lines */}
              <ReferenceLine x={50} stroke="#cbd5e1" strokeDasharray="5 5" />
              <ReferenceLine y={50} stroke="#cbd5e1" strokeDasharray="5 5" />

              <Scatter data={data} fill="hsl(var(--primary))">
                {data.map((entry, index) => (
                  <motion.circle
                    key={index}
                    cx={entry.effort}
                    cy={entry.outcome}
                    r={entry.id === activeStudentId ? 8 : 4}
                    fill={entry.id === activeStudentId ? 'hsl(var(--primary))' : '#94a3b8'}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {quadrant && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              "mt-6 p-5 rounded-2xl border flex items-center justify-between group cursor-pointer transition-all hover:shadow-medium",
              quadrant.color === 'emerald' ? "bg-emerald-50 border-emerald-100 text-emerald-900" :
              quadrant.color === 'amber' ? "bg-amber-50 border-amber-100 text-amber-900" :
              quadrant.color === 'blue' ? "bg-blue-50 border-blue-100 text-blue-900" :
              "bg-rose-50 border-rose-100 text-rose-900"
            )}
            onClick={() => window.dispatchEvent(new CustomEvent('open-discuss-teacher', { detail: { quadrant } }))}
          >
            <div className="flex gap-4 items-center">
              <div className={cn("p-3 rounded-xl shadow-sm bg-white",
                quadrant.color === 'emerald' ? "text-emerald-500" :
                quadrant.color === 'amber' ? "text-amber-500" :
                quadrant.color === 'blue' ? "text-blue-500" :
                "text-rose-500"
              )}>
                {quadrant.icon}
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Child Position</p>
                <p className="text-lg font-black">{quadrant.label}</p>
                <p className="text-xs font-medium opacity-80">{quadrant.description}</p>
              </div>
            </div>
            <div className="bg-white/50 p-2 rounded-full group-hover:bg-white transition-colors">
              <MessageSquare className="h-5 w-5" />
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
};
