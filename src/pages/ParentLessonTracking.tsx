import React, { useMemo, useState } from "react";
import { BookOpen, Calendar, Download, FileText, GraduationCap, Info, User } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tables } from "@/integrations/supabase/types"
import { cn, safeFormatDate } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export default function ParentLessonTracking() {
  const { user } = useAuth();
  const [subjectFilter, setSubjectFilter] = useState<string>("all");

  if (!user || user.role !== 'parent' || !user.student_id) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="p-4 rounded-full bg-slate-100/50 backdrop-blur-sm border border-slate-200">
          <Info className="h-8 w-8 text-slate-400" />
        </div>
        <p className="text-muted-foreground font-medium">Please log in as a parent to view lesson records.</p>
      </div>
    );
  }

  const { data: lessonRecords = [], isLoading } = useQuery({
    queryKey: ['student-lesson-records-parent-lesson-tracking', user.student_id, subjectFilter],
    queryFn: async () => {
      let query = supabase.from('student_chapters').select(`
        *,
        lesson_plans(id, subject, chapter, topic, lesson_date, lesson_file_url),
        recorded_by_teacher:recorded_by_teacher_id(name)
      `).eq('student_id', user.student_id).order('completed_at', { ascending: false });
      
      const { data, error } = await query;
      if (error) throw error;

      // Filter in memory if needed or use server side if possible
      let filteredData = data;
      if (subjectFilter !== "all") {
        filteredData = data.filter((lr: any) => lr.lesson_plans?.subject === subjectFilter);
      }
      return filteredData;
    } });

  const allSubjects = useMemo(() => {
    // Need a separate query for all subjects to populate filter correctly if lessonRecords is filtered
    return Array.from(new Set(lessonRecords.map((lr: any) => lr.lesson_plans?.subject).filter(Boolean)));
  }, [lessonRecords]);

  // Total modules count (unique chapters)
  const totalModules = useMemo(() => {
    return new Set(lessonRecords.map((lr: any) => lr.lesson_plans?.id)).size;
  }, [lessonRecords]);

  return (
    <div className="space-y-8 animate-in fade-in duration-1000">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-600">
            Learning Odyssey
          </h1>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <p className="text-muted-foreground text-sm font-medium">Track completed modules and instructional milestones.</p>
          </div>
        </div>

        <div className="bg-card/40 backdrop-blur-md px-4 py-2 rounded-2xl border border-border/40 shadow-soft flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <GraduationCap className="h-5 w-5 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground leading-none">Completed</span>
            <span className="font-black text-slate-700 text-sm">{totalModules} Modules</span>
          </div>
        </div>
      </div>

      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-violet-500/20 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
        <Card className="relative border-none shadow-medium p-6 overflow-hidden bg-card/60 backdrop-blur-2xl border border-white/30 rounded-3xl">
          <div className="flex flex-col md:flex-row gap-6 md:items-center justify-between">
            <div className="space-y-1">
                <h3 className="font-black text-slate-700 uppercase tracking-tight text-sm">Curriculum Navigation</h3>
                <p className="text-[10px] font-medium text-slate-400">Filter archive by academic domain</p>
            </div>
            <div className="w-full md:w-[250px]">
              <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                <SelectTrigger className="h-12 bg-card/50 border-none shadow-soft focus:ring-primary/20 rounded-2xl font-bold text-xs">
                  <SelectValue placeholder="All Academic Domains" />
                </SelectTrigger>
                <SelectContent className="backdrop-blur-xl bg-card/90 border-none shadow-strong rounded-2xl">
                  <SelectItem value="all" className="font-bold text-xs">All Domains</SelectItem>
                  {allSubjects.map((s: any) => <SelectItem key={s} value={s} className="font-bold text-xs">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>
      </div>

      <Card className="border-none shadow-strong overflow-hidden rounded-3xl bg-card/40 backdrop-blur-md border border-border/20">
        <CardHeader className="border-b border-muted/20 bg-primary/5 py-6">
          <CardTitle className="text-xl font-black flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            Educational Archive
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
            </div>
          ) : lessonRecords.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground font-medium italic">No instructional records identified for the selected domain.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/5">
                    <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4">Domain</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4">Module/Topic</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4">Completion Date</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4">Instructor</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4 text-right">Resources</TableHead>
                  </TableRow>
                </TableHeader>
                <tbody>
                  {lessonRecords.map((lr: any) => (
                    <TableRow key={lr.id} className="group transition-all duration-300 hover:bg-card/60">
                      <TableCell className="px-6 py-4">
                        <Badge variant="secondary" className="bg-primary/5 text-primary/70 border-none rounded-lg text-[9px] font-black uppercase tracking-tighter">
                          {lr.lesson_plans?.subject || 'Domain N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="space-y-0.5">
                            <p className="font-black text-slate-700 text-xs leading-none">{lr.lesson_plans?.chapter || 'Untitled Module'}</p>
                            <p className="text-[10px] font-medium text-slate-400">{lr.lesson_plans?.topic || 'General Topic'}</p>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            <span className="font-bold text-slate-600 text-xs">{safeFormatDate(lr.completed_at, "MMM dd, yyyy")}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center">
                                <User className="h-3 w-3 text-slate-500" />
                            </div>
                            <span className="font-black text-slate-700 text-[10px] uppercase tracking-tighter">{lr.recorded_by_teacher?.name || 'Academic System'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right">
                        {lr.lesson_plans?.lesson_file_url ? (
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl bg-white shadow-soft" asChild>
                            <a href={supabase.storage.from("lesson-plan-files").getPublicUrl(lr.lesson_plans.lesson_file_url).data.publicUrl} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4 text-primary" />
                            </a>
                          </Button>
                        ) : (
                          <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">No Asset</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
