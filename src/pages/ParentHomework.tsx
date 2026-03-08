import React, { useState } from "react";
import { Book, Calendar, CheckCircle, Clock, Download, FileUp, Info, XCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { format, isPast } from "date-fns"
import { Tables } from "@/integrations/supabase/types"
import { cn } from "@/lib/utils"

type StudentHomeworkRecord = Tables<'student_homework_records'>;

export default function ParentHomework() {
  const { user } = useAuth();

  if (!user?.student_id) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="p-4 rounded-full bg-slate-100/50 backdrop-blur-sm border border-slate-200">
          <Info className="h-8 w-8 text-slate-400" />
        </div>
        <p className="text-muted-foreground font-medium">Please log in as a parent to view homework records.</p>
      </div>
    );
  }

  // Fetch student's homework records
  const { data: homeworkStatus = [], isLoading } = useQuery({
    queryKey: ['parent-homework-records', user.student_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_homework_records')
        .select('*, homework(*)')
        .eq('student_id', user.student_id!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user.student_id });

  const getStatusStyles = (status: StudentHomeworkRecord['status']) => {
    switch (status) {
      case 'completed':
      case 'checked':
        return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case 'in_progress':
        return "bg-amber-50 text-amber-700 border-amber-100";
      default:
        return "bg-rose-50 text-rose-700 border-rose-100";
    }
  };

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todaysHomework = homeworkStatus.filter((hs: any) => hs.homework?.due_date && format(new Date(hs.homework.due_date), "yyyy-MM-dd") === todayStr && hs.status !== 'completed' && hs.status !== 'checked');
  const upcomingHomework = homeworkStatus.filter((hs: any) => hs.homework?.due_date && !isPast(new Date(hs.homework.due_date)) && format(new Date(hs.homework.due_date), "yyyy-MM-dd") !== todayStr && hs.status !== 'completed' && hs.status !== 'checked');
  const completedHomework = homeworkStatus.filter((hs: any) => hs.status === 'completed' || hs.status === 'checked');
  const overdueHomework = homeworkStatus.filter((hs: any) => hs.homework?.due_date && isPast(new Date(hs.homework.due_date)) && hs.status !== 'completed' && hs.status !== 'checked');

  const HomeworkTable = ({ data, emptyMessage, isOverdue = false }: { data: any[], emptyMessage: string, isOverdue?: boolean }) => (
    <div className="overflow-x-auto">
      {data.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground font-medium italic">{emptyMessage}</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/5">
              <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4">Title/Subject</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4">Due Date</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4">Status</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4">Remarks</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4 text-right">Asset</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((hs: any) => (
              <TableRow key={hs.id} className="group transition-all duration-300 hover:bg-card/60">
                <TableCell className="px-6 py-4">
                  <div className="space-y-0.5">
                    <p className="font-black text-slate-700 text-xs leading-none">{hs.homework?.title || 'Untitled'}</p>
                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter">{hs.homework?.subject || 'General'}</p>
                  </div>
                </TableCell>
                <TableCell className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Calendar className={cn("h-3.5 w-3.5", isOverdue ? "text-rose-400" : "text-slate-400")} />
                    <span className={cn("font-bold text-xs", isOverdue ? "text-rose-600" : "text-slate-600")}>
                      {format(new Date(hs.homework?.due_date), "MMM dd, yyyy")}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="px-6 py-4">
                  <Badge variant="outline" className={cn("rounded-lg border-none text-[9px] font-black uppercase tracking-tighter", getStatusStyles(hs.status))}>
                    {hs.status.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell className="px-6 py-4 max-w-[200px]">
                  <p className="text-[10px] font-medium text-slate-500 line-clamp-2 italic">{hs.teacher_remarks || "No institutional remarks."}</p>
                </TableCell>
                <TableCell className="px-6 py-4 text-right">
                  {hs.homework?.attachment_url ? (
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl bg-white shadow-soft" asChild>
                      <a href={supabase.storage.from("homework-attachments").getPublicUrl(hs.homework.attachment_url).data.publicUrl} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4 text-primary" />
                      </a>
                    </Button>
                  ) : (
                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">None</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-1000">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-600">
            Homework Monitor
          </h1>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <p className="text-muted-foreground text-sm font-medium">Monitoring the institutional assignment lifecycle.</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="today" className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 h-auto md:h-14 bg-card/40 backdrop-blur-md rounded-2xl md:rounded-[2rem] p-1.5 border border-border/40 shadow-soft gap-1">
          <TabsTrigger value="today" className="rounded-xl md:rounded-[1.5rem] data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-medium font-black uppercase text-[9px] md:text-[10px] tracking-widest py-2 md:py-0">Today</TabsTrigger>
          <TabsTrigger value="upcoming" className="rounded-xl md:rounded-[1.5rem] data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-medium font-black uppercase text-[9px] md:text-[10px] tracking-widest py-2 md:py-0">Upcoming</TabsTrigger>
          <TabsTrigger value="completed" className="rounded-xl md:rounded-[1.5rem] data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-medium font-black uppercase text-[9px] md:text-[10px] tracking-widest py-2 md:py-0">Settled</TabsTrigger>
          <TabsTrigger value="overdue" className="rounded-xl md:rounded-[1.5rem] data-[state=active]:bg-rose-600 data-[state=active]:text-white data-[state=active]:shadow-medium font-black uppercase text-[9px] md:text-[10px] tracking-widest py-2 md:py-0">Breached</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="mt-8">
          <Card className="border-none shadow-strong overflow-hidden rounded-3xl bg-card/40 backdrop-blur-md border border-border/20">
            <CardHeader className="border-b border-muted/20 bg-primary/5 py-6">
              <CardTitle className="text-xl font-black flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                Due Protocol Today
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex justify-center py-12"><div className="h-8 w-8 rounded-full border-4 border-primary/30 border-t-primary animate-spin" /></div>
              ) : (
                <HomeworkTable data={todaysHomework} emptyMessage="All protocols satisfied for today." />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upcoming" className="mt-8">
          <Card className="border-none shadow-strong overflow-hidden rounded-3xl bg-card/40 backdrop-blur-md border border-border/20">
            <CardHeader className="border-b border-muted/20 bg-primary/5 py-6">
              <CardTitle className="text-xl font-black flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10">
                  <Book className="h-6 w-6 text-primary" />
                </div>
                Future Directives
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex justify-center py-12"><div className="h-8 w-8 rounded-full border-4 border-primary/30 border-t-primary animate-spin" /></div>
              ) : (
                <HomeworkTable data={upcomingHomework} emptyMessage="No future directives identified." />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed" className="mt-8">
          <Card className="border-none shadow-strong overflow-hidden rounded-3xl bg-card/40 backdrop-blur-md border border-border/20">
            <CardHeader className="border-b border-muted/20 bg-emerald-500/5 py-6">
              <CardTitle className="text-xl font-black flex items-center gap-3 text-emerald-700">
                <div className="p-2 rounded-xl bg-emerald-500/10">
                  <CheckCircle className="h-6 w-6 text-emerald-600" />
                </div>
                Settled Assignments
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex justify-center py-12"><div className="h-8 w-8 rounded-full border-4 border-primary/30 border-t-primary animate-spin" /></div>
              ) : (
                <HomeworkTable data={completedHomework} emptyMessage="No settled records identified." />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overdue" className="mt-8">
          <Card className="border-none shadow-strong overflow-hidden rounded-3xl bg-card/40 backdrop-blur-md border border-border/20">
            <CardHeader className="border-b border-muted/20 bg-rose-500/5 py-6">
              <CardTitle className="text-xl font-black flex items-center gap-3 text-rose-700">
                <div className="p-2 rounded-xl bg-rose-500/10">
                  <XCircle className="h-6 w-6 text-rose-600" />
                </div>
                Institutional Breaches
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex justify-center py-12"><div className="h-8 w-8 rounded-full border-4 border-primary/30 border-t-primary animate-spin" /></div>
              ) : (
                <HomeworkTable data={overdueHomework} emptyMessage="No protocol breaches identified." isOverdue />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
