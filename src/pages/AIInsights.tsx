import React, { useState } from "react";
import { AlertCircle, Brain, Loader2, ShieldCheck, Target, TrendingUp, Users, Zap } from "lucide-react";
import { useMutation } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export default function AIInsights() {
  const [insights, setInsights] = useState<any>(null);

  const generateInsightsMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("ai-generate-insights");
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setInsights(data);
      toast.success("AI insights generated successfully");
    },
    onError: (error: any) => {
      console.error("Error generating insights:", error);
      if (error.message?.includes("429")) {
        toast.error("Rate limit exceeded. Please try again in a few moments.");
      } else if (error.message?.includes("402")) {
        toast.error("AI credits depleted. Please add funds to your workspace.");
      } else {
        toast.error("Failed to generate insights");
      }
    } });

  return (
    <div className="space-y-10 animate-in fade-in duration-1000">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
             <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                <Brain className="h-6 w-6 text-primary animate-pulse" />
             </div>
             <h1 className="text-3xl md:text-5xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-primary to-violet-600 uppercase">
               Neural Insights
             </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <p className="text-muted-foreground text-sm font-bold uppercase tracking-[0.2em] opacity-70">Pedagogical Intelligence Synthesis</p>
          </div>
        </div>

        <Button
          size="lg"
          className="rounded-[2rem] shadow-strong h-16 px-10 text-base font-black tracking-tight bg-slate-900 hover:bg-slate-800 text-white hover:scale-[1.02] transition-all duration-300 group overflow-hidden relative"
          onClick={() => generateInsightsMutation.mutate()}
          disabled={generateInsightsMutation.isPending}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary to-violet-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative flex items-center gap-3">
            {generateInsightsMutation.isPending ? (
               <>
                 <Loader2 className="h-5 w-5 animate-spin" />
                 <span>PROCESSING NEURAL VECTORS...</span>
               </>
            ) : (
               <>
                 <Zap className="h-5 w-5 text-amber-400 fill-amber-400 group-hover:animate-bounce" />
                 <span>ACTIVATE SYNTHESIS PROTOCOL</span>
               </>
            )}
          </div>
        </Button>
      </div>

      {!insights && !generateInsightsMutation.isPending && (
        <Card className="border-none shadow-strong rounded-[2.5rem] bg-card/40 backdrop-blur-md border border-border/20 p-12 text-center overflow-hidden relative">
           <div className="absolute top-0 right-0 -mr-20 -mt-20 h-64 w-64 bg-primary/5 rounded-full blur-3xl" />
           <div className="relative z-10 space-y-6">
              <div className="h-20 w-20 rounded-[2rem] bg-primary/10 mx-auto flex items-center justify-center border border-primary/20">
                 <Brain className="h-10 w-10 text-primary" />
              </div>
              <div className="space-y-2">
                 <h3 className="text-2xl font-black text-foreground/90 tracking-tight">Intelligence Engine Standby</h3>
                 <p className="text-slate-500 max-w-lg mx-auto font-medium leading-relaxed">
                    Trigger the synthesis protocol to evaluate multi-dimensional student performance data and generate actionable pedagogical recommendations.
                 </p>
              </div>
              <Badge variant="outline" className="font-black text-[10px] uppercase tracking-[0.2em] px-4 py-1.5 rounded-full border-primary/20 text-primary">v4.0 Neural Core Active</Badge>
           </div>
        </Card>
      )}

      {insights && (
        <div className="space-y-10 animate-in slide-in-from-bottom-8 duration-700">
          {/* Overall Insights */}
          <Card className="border-none shadow-strong overflow-hidden rounded-[2.5rem] bg-card/40 backdrop-blur-md border border-border/20 group">
            <CardHeader className="border-b border-slate-100 bg-primary/5 py-8 px-8">
              <CardTitle className="text-xl font-black flex items-center gap-4 text-foreground/90">
                <div className="p-3 rounded-[1.5rem] bg-primary/10 group-hover:scale-110 transition-transform">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                Executive Synthesis Matrix
              </CardTitle>
            </CardHeader>
            <CardContent className="p-10">
              <div className="relative">
                 <div className="absolute -left-6 top-0 bottom-0 w-1.5 bg-gradient-to-b from-primary via-violet-500 to-primary rounded-full opacity-30" />
                 <p className="text-slate-700 leading-relaxed font-black text-2xl tracking-tight italic">
                   "{insights.overallInsights}"
                 </p>
              </div>
            </CardContent>
          </Card>

          {/* Intervention Priorities */}
          {insights.studentsNeedingAttention && insights.studentsNeedingAttention.length > 0 && (
            <div className="space-y-6">
               <div className="flex items-center gap-3 px-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
                  <h2 className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">Pedagogical Intervention Priorities</h2>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 {insights.studentsNeedingAttention.map((student: any, idx: number) => (
                   <Card key={idx} className="border-none shadow-strong rounded-[2.5rem] bg-card/60 backdrop-blur-md border border-border/20 overflow-hidden hover:shadow-xl transition-all duration-500 group">
                     <CardHeader className="pb-4 pt-8 px-8 flex-row items-center justify-between">
                        <div className="space-y-1">
                           <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">Enrolled Student</p>
                           <CardTitle className="text-2xl font-black text-foreground/90 tracking-tight group-hover:text-primary transition-colors">{student.name}</CardTitle>
                        </div>
                        <div className="h-12 w-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-600">
                           <AlertCircle className="h-6 w-6" />
                        </div>
                     </CardHeader>
                     <CardContent className="p-8 pt-0 space-y-8">
                       <div className="space-y-4">
                         <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Identified Anomalies</p>
                         <div className="grid gap-3">
                           {student.issues.map((issue: string, i: number) => (
                             <div key={i} className="flex items-start gap-3 p-3 rounded-2xl bg-rose-50/50 border border-rose-100/50 text-xs font-bold text-rose-700">
                               <div className="h-1.5 w-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                               {issue}
                             </div>
                           ))}
                         </div>
                       </div>

                       <div className="p-6 rounded-[1.5rem] bg-primary/5 border border-primary/10/60 relative overflow-hidden">
                         <div className="absolute top-0 right-0 p-4 opacity-5">
                            <Brain className="h-12 w-12 text-primary" />
                         </div>
                         <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-3 flex items-center gap-2">
                           <Target className="h-3.5 w-3.5" /> Neural Strategy
                         </p>
                         <p className="text-sm font-medium text-slate-700 leading-relaxed italic relative z-10">
                           {student.recommendations}
                         </p>
                       </div>
                     </CardContent>
                   </Card>
                 ))}
               </div>
            </div>
          )}

          {/* Secondary Insights Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
             {/* High Performers */}
             {insights.highPerformers && insights.highPerformers.length > 0 && (
               <Card className="border-none shadow-strong rounded-[2rem] bg-emerald-50/50 border border-emerald-100 backdrop-blur-md">
                 <CardHeader className="pb-4">
                   <CardTitle className="text-sm font-black uppercase tracking-widest text-emerald-700 flex items-center gap-3">
                     <ShieldCheck className="h-5 w-5" /> Peak Performance
                   </CardTitle>
                 </CardHeader>
                 <CardContent>
                   <div className="flex flex-wrap gap-2">
                     {insights.highPerformers.map((name: string, idx: number) => (
                       <Badge key={idx} className="bg-white text-emerald-700 border-emerald-100 rounded-lg px-3 py-1 font-black text-[10px] uppercase tracking-tighter shadow-soft">
                         {name}
                       </Badge>
                     ))}
                   </div>
                 </CardContent>
               </Card>
             )}

             {/* Common Challenges */}
             {insights.commonChallenges && insights.commonChallenges.length > 0 && (
               <Card className="border-none shadow-strong rounded-[2rem] bg-slate-900 text-white overflow-hidden">
                 <CardHeader className="pb-4 border-b border-white/5 bg-white/5">
                   <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400">Systemic Challenges</CardTitle>
                 </CardHeader>
                 <CardContent className="p-6">
                   <ul className="space-y-4">
                     {insights.commonChallenges.map((challenge: string, idx: number) => (
                       <li key={idx} className="flex items-start gap-3">
                         <div className="h-5 w-5 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-[10px] font-black text-primary">{idx + 1}</span>
                         </div>
                         <span className="text-xs font-medium text-slate-300 leading-relaxed">{challenge}</span>
                       </li>
                     ))}
                   </ul>
                 </CardContent>
               </Card>
             )}

             {/* Actionable Recommendations */}
             {insights.actionableRecommendations && insights.actionableRecommendations.length > 0 && (
               <Card className="border-none shadow-strong rounded-[2rem] bg-white border border-slate-100">
                 <CardHeader className="pb-4 border-b border-slate-50 bg-slate-50/50 rounded-t-[2rem]">
                   <CardTitle className="text-sm font-black uppercase tracking-widest text-primary">Operational Directives</CardTitle>
                 </CardHeader>
                 <CardContent className="p-6">
                   <ul className="space-y-4">
                     {insights.actionableRecommendations.map((rec: string, idx: number) => (
                       <li key={idx} className="flex items-start gap-3">
                         <div className="h-5 w-5 rounded-full bg-primary/5 flex items-center justify-center shrink-0 mt-0.5">
                            <Zap className="h-3 w-3 text-primary" />
                         </div>
                         <span className="text-xs font-bold text-slate-600 leading-relaxed italic">"{rec}"</span>
                       </li>
                     ))}
                   </ul>
                 </CardContent>
               </Card>
             )}
          </div>
        </div>
      )}
    </div>
  );
}
