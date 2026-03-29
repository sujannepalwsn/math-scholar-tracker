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
import { format, isPast, startOfToday } from "date-fns"
import { Tables } from "@/integrations/supabase/types"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { usePagination } from "@/hooks/use-pagination";
import { ServerPagination } from "@/components/ui/server-pagination";
import { TableSkeleton } from "@/components/ui/table-skeleton";

type StudentHomeworkRecord = Tables<'student_homework_records'>;

export default function ParentHomework() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("today");
  const { page, pageSize, setPage, setPageSize } = usePagination(20);

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

  // Fetch student's homework records with server-side filtering for tabs
  const { data: homeworkData, isLoading } = useQuery({
    queryKey: ['parent-homework-records', user.student_id, activeTab, page, pageSize],
    queryFn: async () => {
      let query = supabase
        .from('student_homework_records')
        .select('*, homework!inner(*)', { count: 'exact' })
        .eq('student_id', user.student_id!)
        .order('created_at', { ascending: false });

      const today = format(new Date(), 'yyyy-MM-dd');

      if (activeTab === 'today') {
        query = query.eq('homework.due_date', today);
      } else if (activeTab === 'upcoming') {
        query = query.gt('homework.due_date', today).not('status', 'in', '("completed","checked")');
      } else if (activeTab === 'completed') {
        query = query.in('status', ['completed', 'checked']);
      } else if (activeTab === 'overdue') {
        query = query.lt('homework.due_date', today).not('status', 'in', '("completed","checked")');
      }

      const { data, error, count } = await query
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (error) throw error;
      return { data, count: count || 0 };
    },
    enabled: !!user.student_id });

  const homeworkStatus = homeworkData?.data || [];
  const totalRows = homeworkData?.count || 0;
  const totalPages = Math.ceil(totalRows / pageSize);

  const submitHomeworkMutation = useMutation({
    mutationFn: async ({ recordId, url }: { recordId: string; url: string }) => {
      const { error } = await supabase
        .from('student_homework_records')
        .update({
          submission_url: url,
          status: 'completed',
          submitted_at: new Date().toISOString()
        })
        .eq('id', recordId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parent-homework-records'] });
      toast.success("Homework submitted successfully!");
    },
    onError: (error) => {
      toast.error("Failed to submit homework: " + error.message);
    }
  });

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'completed':
      case 'checked':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'in_progress':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'assigned':
        return 'bg-blue-50 text-blue-700 border-blue-100';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  const HomeworkTable = ({ data, emptyMessage }: { data: any[], emptyMessage: string }) => (
    <div className="space-y-4">
      {data.length === 0 ? (
        <div className="text-center py-12 px-6">
          <div className="mx-auto w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <Book className="h-6 w-6 text-slate-300" />
          </div>
          <p className="text-muted-foreground font-bold italic">{emptyMessage}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/5">
                <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4">Assignment Directive</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4">Deadline</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4">Protocol Status</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4">Institutional Feedback</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((hs: any) => {
                const isOverdue = isPast(new Date(hs.homework?.due_date)) && hs.status !== 'completed' && hs.status !== 'checked' && format(new Date(hs.homework?.due_date), 'yyyy-MM-dd') !== format(new Date(), 'yyyy-MM-dd');
                return (
                  <TableRow key={hs.id} className="group transition-all duration-300 hover:bg-card/60">
                    <TableCell className="px-6 py-4">
                      <div className="space-y-1">
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
                      <div className="flex justify-end gap-2">
                      {hs.homework?.attachment_url && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl bg-white shadow-soft" asChild title="Download Assignment">
                          <a href={supabase.storage.from("homework-attachments").getPublicUrl(hs.homework.attachment_url).data.publicUrl} target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4 text-primary" />
                          </a>
                        </Button>
                      )}
                      {hs.status !== 'completed' && hs.status !== 'checked' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-xl bg-white shadow-soft"
                          onClick={() => {
                            const url = prompt("Enter your submission URL (e.g. Google Drive link):");
                            if (url) submitHomeworkMutation.mutate({ recordId: hs.id, url });
                          }}
                          title="Submit Homework"
                        >
                          <FileUp className="h-4 w-4 text-emerald-600" />
                        </Button>
                      )}
                      {hs.submission_url && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl bg-white shadow-soft" asChild title="View My Submission">
                           <a href={hs.submission_url} target="_blank" rel="noopener noreferrer">
                             <CheckCircle className="h-4 w-4 text-blue-600" />
                           </a>
                        </Button>
                      )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-1000 page-enter">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 border border-primary/20">
              <Book className="h-8 w-8 text-primary animate-pulse" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-600">
                Homework Hub
              </h1>
              <div className="flex items-center gap-2 mt-1">
                 <div className="h-2 w-2 rounded-full bg-primary" />
                 <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest">Scholar Assignment Lifecycle Monitor</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setPage(1); }} className="w-full">
        <TabsList className="flex flex-nowrap w-full overflow-x-auto h-auto md:h-14 bg-card/40 backdrop-blur-md rounded-2xl md:rounded-[2rem] p-1.5 border border-border/40 shadow-soft gap-1 custom-scrollbar">
          <TabsTrigger value="today" className="rounded-xl md:rounded-[1.5rem] flex-1 min-w-[80px] data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-medium font-black uppercase text-[9px] md:text-[10px] tracking-widest py-2 md:py-0">Today</TabsTrigger>
          <TabsTrigger value="upcoming" className="rounded-xl md:rounded-[1.5rem] flex-1 min-w-[80px] data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-medium font-black uppercase text-[9px] md:text-[10px] tracking-widest py-2 md:py-0">Upcoming</TabsTrigger>
          <TabsTrigger value="completed" className="rounded-xl md:rounded-[1.5rem] flex-1 min-w-[80px] data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-medium font-black uppercase text-[9px] md:text-[10px] tracking-widest py-2 md:py-0">Settled</TabsTrigger>
          <TabsTrigger value="overdue" className="rounded-xl md:rounded-[1.5rem] flex-1 min-w-[80px] data-[state=active]:bg-rose-600 data-[state=active]:text-white data-[state=active]:shadow-medium font-black uppercase text-[9px] md:text-[10px] tracking-widest py-2 md:py-0">Breached</TabsTrigger>
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
              {isLoading && !homeworkStatus.length ? (
                <TableSkeleton columns={5} rows={pageSize} />
              ) : (
                <>
                  <HomeworkTable data={homeworkStatus} emptyMessage="All protocols satisfied for today." />
                  <ServerPagination
                    currentPage={page}
                    totalPages={totalPages}
                    totalRows={totalRows}
                    pageSize={pageSize}
                    onPageChange={setPage}
                    onPageSizeChange={setPageSize}
                  />
                </>
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
              {isLoading && !homeworkStatus.length ? (
                <TableSkeleton columns={5} rows={pageSize} />
              ) : (
                <>
                  <HomeworkTable data={homeworkStatus} emptyMessage="No future directives identified." />
                  <ServerPagination
                    currentPage={page}
                    totalPages={totalPages}
                    totalRows={totalRows}
                    pageSize={pageSize}
                    onPageChange={setPage}
                    onPageSizeChange={setPageSize}
                  />
                </>
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
              {isLoading && !homeworkStatus.length ? (
                <TableSkeleton columns={5} rows={pageSize} />
              ) : (
                <>
                  <HomeworkTable data={homeworkStatus} emptyMessage="No settled records identified." />
                  <ServerPagination
                    currentPage={page}
                    totalPages={totalPages}
                    totalRows={totalRows}
                    pageSize={pageSize}
                    onPageChange={setPage}
                    onPageSizeChange={setPageSize}
                  />
                </>
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
              {isLoading && !homeworkStatus.length ? (
                <TableSkeleton columns={5} rows={pageSize} />
              ) : (
                <>
                  <HomeworkTable data={homeworkStatus} emptyMessage="No protocol breaches identified." />
                  <ServerPagination
                    currentPage={page}
                    totalPages={totalPages}
                    totalRows={totalRows}
                    pageSize={pageSize}
                    onPageChange={setPage}
                    onPageSizeChange={setPageSize}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
