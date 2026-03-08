import React, { useState } from "react";
import { AlertTriangle, Calendar, Clock, Info, ShieldCheck } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { Tables } from "@/integrations/supabase/types"
import { cn } from "@/lib/utils"

type DisciplineIssue = Tables<'discipline_issues'>;

export default function ParentDiscipline() {
  const { user } = useAuth();

  if (!user?.student_id) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="p-4 rounded-full bg-slate-100/50 backdrop-blur-sm border border-slate-200">
          <Info className="h-8 w-8 text-slate-400" />
        </div>
        <p className="text-muted-foreground font-medium">Please log in as a parent to view discipline records.</p>
      </div>
    );
  }

  // Fetch student's discipline issues
  const { data: issues = [], isLoading } = useQuery({
    queryKey: ['parent-discipline-issues', user.student_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('discipline_issues')
        .select('*, discipline_categories(name)')
        .eq('student_id', user.student_id!)
        .order('issue_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user.student_id });

  const getSeverityStyles = (severity: DisciplineIssue['severity']) => {
    switch (severity) {
      case "low": return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case "medium": return "bg-amber-50 text-amber-700 border-amber-100";
      case "high": return "bg-rose-50 text-rose-700 border-rose-100";
      default: return "bg-slate-50 text-slate-700 border-slate-100";
    }
  };

  const highSeverityCount = issues.filter(i => i.severity === 'high').length;
  const unresolvedCount = issues.filter(i => i.status !== 'resolved').length;

  return (
    <div className="space-y-8 animate-in fade-in duration-1000">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-600">
            Conduct Insights
          </h1>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <p className="text-muted-foreground text-sm font-medium">Monitoring behavioral excellence and institutional standards.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-card/40 backdrop-blur-md px-4 py-2 rounded-2xl border border-border/40 shadow-soft flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground leading-none">Unresolved</span>
              <span className="font-black text-slate-700 text-sm">{unresolvedCount} Issues</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 border-none shadow-strong overflow-hidden rounded-3xl bg-card/40 backdrop-blur-md border border-border/20">
          <CardHeader className="border-b border-muted/20 bg-primary/5 py-6">
            <CardTitle className="text-xl font-black flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
          <Clock className="h-6 w-6 text-primary" />
              </div>
              Incident Chronology
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
              </div>
            ) : issues.length === 0 ? (
              <div className="text-center py-12 px-6">
                <div className="mx-auto w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mb-4">
                  <ShieldCheck className="h-6 w-6 text-green-500" />
                </div>
                <p className="text-muted-foreground font-bold italic">Exemplary record. No behavioral incidents identified.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/5">
                      <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4">Protocol Date</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4">Classification</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4">Incident Log</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4">Priority</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4 text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {issues.map((issue: any) => (
                      <TableRow key={issue.id} className="group transition-all duration-300 hover:bg-card/60">
                        <TableCell className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="font-bold text-slate-600 text-xs">{format(new Date(issue.issue_date), "MMM dd, yyyy")}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <span className="font-black text-primary text-[10px] uppercase tracking-tighter">
                            {issue.discipline_categories?.name || 'Standard'}
                          </span>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <p className="text-xs font-medium text-slate-600 line-clamp-2 max-w-[250px]">{issue.description}</p>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <Badge variant="outline" className={cn("rounded-lg border-none text-[9px] font-black uppercase tracking-tighter px-2", getSeverityStyles(issue.severity))}>
                            {issue.severity}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right">
                          <span className={cn(
                            "font-black text-[10px] uppercase tracking-widest",
                            issue.status === 'resolved' ? 'text-green-600' : 'text-amber-600'
                          )}>
                            {issue.status || 'Pending'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-none shadow-strong rounded-3xl bg-gradient-to-br from-primary to-violet-700 text-white overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 rounded-xl bg-white/20 backdrop-blur-md">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <Badge className="bg-white/20 text-white border-none text-[10px] font-black">SYSTEM SECURE</Badge>
              </div>
              <h3 className="text-xl font-black mb-1">Behavioral Integrity</h3>
              <p className="text-primary/10 text-xs font-medium leading-relaxed opacity-80">
                Institutional standards ensure a conducive learning environment for every student.
              </p>
              <div className="mt-6 pt-6 border-t border-border/10 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-indigo-200">Critical Issues</p>
                  <p className="text-2xl font-black">{highSeverityCount}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-indigo-200">Total Logged</p>
                  <p className="text-2xl font-black">{issues.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-strong rounded-3xl bg-card/80 backdrop-blur-md border border-border/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> Policy Advisory
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100">
                <p className="text-[10px] leading-relaxed text-amber-900 font-medium">
                  Behavioral records are updated every 24 hours. For critical resolutions, please contact the institutional head directly.
                </p>
              </div>
              <div className="flex items-center gap-4 px-2">
                <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center">
                  <Info className="h-5 w-5 text-slate-400" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-tighter text-slate-400">Resolution Rate</span>
                  <span className="font-black text-slate-700 text-sm">
                    {issues.length > 0 ? Math.round(((issues.length - unresolvedCount) / issues.length) * 100) : 100}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
