import React, { useMemo, useState } from "react";
import { BookOpen, Calendar, Info, Star, Target, TrendingUp, User, Zap } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tables } from "@/integrations/supabase/types"
import { cn, safeFormatDate } from "@/lib/utils"

type LessonPlan = Tables<'lesson_plans'>;
type StudentChapter = Tables<'student_chapters'>;

export default function ParentChapterRating() {
  const { user } = useAuth();
  const [subjectFilter, setSubjectFilter] = useState<string>("all");

  if (!user || user.role !== 'parent' || !user.student_id) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="p-4 rounded-full bg-slate-100/50 backdrop-blur-sm border border-slate-200">
          <Info className="h-8 w-8 text-slate-400" />
        </div>
        <p className="text-muted-foreground font-medium">Please log in as a parent to view skill matrices.</p>
      </div>
    );
  }

  // Fetch lesson records (student_chapters now links to lesson_plans)
  const { data: lessonRecords = [], isLoading } = useQuery({
    queryKey: ['student-lesson-records-parent-chapter-rating', user.student_id, subjectFilter],
    queryFn: async () => {
      let query = supabase.from('student_chapters').select(`
        *,
        lesson_plans(id, subject, chapter, topic, lesson_date, lesson_file_url),
        recorded_by_teacher:recorded_by_teacher_id(name)
      `).eq('student_id', user.student_id).order('completed_at', { ascending: false });
      
      const { data, error } = await query;
      if (error) throw error;

      let filteredData = data;
      if (subjectFilter !== "all") {
        filteredData = data.filter((record: any) => record.lesson_plans?.subject === subjectFilter);
      }
      return filteredData;
    } });

  // Chapter Rating Calculations
  const chapterRatingsBySubject = useMemo(() => {
    const subjectMap = new Map<string, { totalRating: number; count: number; chapters: (StudentChapter & { lesson_plans: LessonPlan; recorded_by_teacher?: Tables<'teachers'> })[] }>();

    lessonRecords.forEach((record: any) => {
      if (record.lesson_plans?.subject && record.evaluation_rating !== null) {
        const subject = record.lesson_plans.subject;
        if (!subjectMap.has(subject)) {
          subjectMap.set(subject, { totalRating: 0, count: 0, chapters: [] });
        }
        const entry = subjectMap.get(subject)!;
        entry.totalRating += record.evaluation_rating;
        entry.count += 1;
        entry.chapters.push(record);
      }
    });

    return Array.from(subjectMap.entries()).map(([subject, data]) => ({
      subject,
      averageRating: data.count > 0 ? (data.totalRating / data.count).toFixed(1) : 'N/A',
      chapters: data.chapters.sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime()) }));
  }, [lessonRecords]);

  const allSubjects = useMemo(() => {
    // Need a separate logic or query for the filter if lessonRecords is filtered
    // But since we fetch all above and filter in memory, we can use the original list if we stored it
    return Array.from(new Set(lessonRecords.map((lr: any) => lr.lesson_plans?.subject).filter(Boolean)));
  }, [lessonRecords]);

  const RatingStars = ({ rating }: { rating: number | null }) => {
    if (rating === null) return <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Unrated</span>;
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star key={s} className={cn("h-3 w-3", s <= rating ? "text-amber-400 fill-amber-400" : "text-slate-200")} />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-1000">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-600">
            Skill Matrix
          </h1>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <p className="text-muted-foreground text-sm font-medium">Visual breakdown of cross-disciplinary understanding and proficiency.</p>
          </div>
        </div>

        <div className="bg-card/40 backdrop-blur-md px-4 py-2 rounded-2xl border border-border/40 shadow-soft flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <Target className="h-5 w-5 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground leading-none">Proficiency</span>
            <span className="font-black text-slate-700 text-sm">Real-time Analytics</span>
          </div>
        </div>
      </div>

      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-violet-500/20 rounded-[2rem] blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
        <Card className="relative border-none shadow-medium p-6 overflow-hidden bg-card/60 backdrop-blur-2xl border border-white/30 rounded-[2rem]">
          <div className="flex flex-col md:flex-row gap-6 md:items-center justify-between">
            <div className="space-y-1">
                <h3 className="font-black text-slate-700 uppercase tracking-tight text-sm">Intelligence Filter</h3>
                <p className="text-[10px] font-medium text-slate-400">Isolate domain-specific performance</p>
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

      {isLoading ? (
        <div className="flex justify-center py-20"><div className="h-10 w-10 rounded-full border-4 border-primary/30 border-t-primary animate-spin" /></div>
      ) : chapterRatingsBySubject.length === 0 ? (
        <div className="text-center py-20 bg-card/40 backdrop-blur-md rounded-[2.5rem] border border-border/20 shadow-strong">
            <p className="text-muted-foreground font-medium italic">No proficiency data identified for the selected parameters.</p>
        </div>
      ) : (
        <div className="space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {chapterRatingsBySubject.map((subjectData) => (
              <Card key={subjectData.subject} className="border-none shadow-strong rounded-[2.5rem] bg-card/40 backdrop-blur-md border border-border/20 overflow-hidden group hover:translate-y-[-4px] transition-all duration-300">
                <CardHeader className="p-6 pb-0">
                   <Badge variant="secondary" className="bg-primary/5 text-primary/70 border-none rounded-lg text-[9px] font-black uppercase tracking-widest px-2.5 w-fit">
                      {subjectData.subject}
                   </Badge>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="flex items-center justify-between">
                     <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Synthesis</p>
                        <div className="flex items-baseline gap-1">
                           <span className="text-5xl font-black text-foreground/90 tracking-tighter">{subjectData.averageRating}</span>
                           <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
                        </div>
                     </div>
                     <div className="p-4 rounded-3xl bg-emerald-50 text-emerald-600">
                        <TrendingUp className="h-8 w-8" />
                     </div>
                  </div>
                  <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{subjectData.chapters.length} Modules</p>
                     <div className="flex -space-x-2">
                        {[1,2,3].map(i => <div key={i} className="h-6 w-6 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center"><User className="h-3 w-3 text-slate-400" /></div>)}
                     </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-none shadow-strong overflow-hidden rounded-[2.5rem] bg-card/40 backdrop-blur-md border border-border/20">
            <CardHeader className="border-b border-muted/20 bg-primary/5 py-6">
              <CardTitle className="text-xl font-black flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                Instructional Milestones & Ratings
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/5">
                      <th className="font-black uppercase text-[10px] tracking-widest px-6 py-4 text-left">Module/Chapter</th>
                      <th className="font-black uppercase text-[10px] tracking-widest px-6 py-4 text-left">Synthesis Date</th>
                      <th className="font-black uppercase text-[10px] tracking-widest px-6 py-4 text-left">Proficiency</th>
                      <th className="font-black uppercase text-[10px] tracking-widest px-6 py-4 text-left">Instructor Notes</th>
                      <th className="font-black uppercase text-[10px] tracking-widest px-6 py-4 text-right">Observer</th>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {chapterRatingsBySubject.flatMap(subjectData =>
                      subjectData.chapters.map((record: any) => (
                        <TableRow key={record.id} className="group transition-all duration-300 hover:bg-card/60">
                          <TableCell className="px-6 py-4">
                            <div className="space-y-0.5">
                                <p className="font-black text-slate-700 text-xs leading-none">{record.lesson_plans?.chapter || 'Untitled'}</p>
                                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter">{record.lesson_plans?.subject || 'Domain N/A'}</p>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <div className="flex items-center gap-2">
                               <Calendar className="h-3.5 w-3.5 text-slate-400" />
                               <span className="font-bold text-slate-600 text-xs">{safeFormatDate(record.completed_at, "MMM dd, yyyy")}</span>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-4">
                             <RatingStars rating={record.evaluation_rating} />
                          </TableCell>
                          <TableCell className="px-6 py-4 max-w-[250px]">
                            <p className="text-[10px] font-medium text-slate-500 line-clamp-2 italic leading-relaxed">"{record.teacher_notes || 'No institutional notes provided.'}"</p>
                          </TableCell>
                          <TableCell className="px-6 py-4 text-right">
                             <div className="flex items-center justify-end gap-2">
                                <span className="font-black text-slate-700 text-[10px] uppercase tracking-tighter">{record.recorded_by_teacher?.name || 'Academic Sys'}</span>
                                <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center">
                                    <User className="h-3 w-3 text-slate-500" />
                                </div>
                             </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
