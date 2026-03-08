"use client";
import { Book, BookOpen, Calendar, CheckCircle, Clock, ExternalLink, FileText, Info, Star, Target, User, XCircle } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn, safeFormatDate } from "@/lib/utils"
import { supabase } from "@/integrations/supabase/client"
import { Tables } from "@/integrations/supabase/types"

type LessonPlan = Tables<'lesson_plans'>;
type StudentChapter = Tables<'student_chapters'>;
type Test = Tables<'tests'>;
type Homework = Tables<'homework'>;
type StudentHomeworkRecord = Tables<'student_homework_records'>;
type TestResult = Tables<'test_results'>;

interface ChapterPerformanceGroup {
  lessonPlan: LessonPlan;
  studentChapters: (StudentChapter & { recorded_by_teacher?: Tables<'teachers'> })[];
  testResults: (TestResult & { tests: Pick<Test, 'id' | 'name' | 'subject' | 'total_marks' | 'lesson_plan_id' | 'questions'> })[];
  homeworkRecords: (StudentHomeworkRecord & { homework: Pick<Homework, 'id' | 'title' | 'subject' | 'due_date'> })[];
}

interface ParentChapterDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chapterGroup: ChapterPerformanceGroup | null;
}

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

const getHomeworkStatusStyles = (status: StudentHomeworkRecord['status']) => {
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

export default function ParentChapterDetailModal({ open, onOpenChange, chapterGroup }: ParentChapterDetailModalProps) {
  if (!chapterGroup) return null;

  const { lessonPlan, studentChapters, testResults, homeworkRecords } = chapterGroup;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] border-none shadow-strong bg-card/95 backdrop-blur-xl p-0">
        <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-md p-8 border-b border-slate-100 shrink-0">
          <DialogHeader>
            <div className="flex items-center gap-4 mb-2">
               <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                  <BookOpen className="h-6 w-6 text-white" />
               </div>
               <div>
                  <DialogTitle id="chapter-detail-title" className="text-2xl font-black tracking-tight text-foreground/90">
                    {lessonPlan.chapter}
                  </DialogTitle>
                  <DialogDescription id="chapter-detail-description" className="text-xs font-bold uppercase tracking-widest text-primary">
                    Academic Analytics • {lessonPlan.subject}
                  </DialogDescription>
               </div>
            </div>
          </DialogHeader>
        </div>

        <div className="p-8 space-y-10">
          {/* INSTRUCTIONAL CONTEXT */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2 border-none shadow-soft rounded-[2rem] bg-slate-50 border border-slate-100 overflow-hidden">
               <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                     <Info className="h-4 w-4 text-primary/80" />
                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Lesson Context</p>
                  </div>
                  <h4 className="text-lg font-black text-slate-700 leading-tight">{lessonPlan.topic || "Instructional Objective Specified"}</h4>
                  {lessonPlan.notes && <p className="text-xs font-medium text-slate-500 italic leading-relaxed">"{lessonPlan.notes}"</p>}
               </CardContent>
            </Card>
            <Card className="border-none shadow-soft rounded-[2rem] bg-white border border-slate-100 overflow-hidden">
               <CardContent className="p-6 flex flex-col justify-between h-full">
                  <div className="space-y-1">
                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Timeline</p>
                     <div className="flex items-center gap-2 font-black text-slate-700 text-sm">
                        <Calendar className="h-4 w-4 text-primary" />
                        {safeFormatDate(lessonPlan.lesson_date, "MMM dd, yyyy")}
                     </div>
                  </div>
                  {lessonPlan.lesson_file_url && (
                    <Button variant="ghost" size="sm" className="w-full mt-4 h-10 rounded-xl bg-primary/5 text-primary font-black text-[10px] uppercase tracking-widest shadow-soft" asChild>
                      <a href={supabase.storage.from("lesson-plan-files").getPublicUrl(lessonPlan.lesson_file_url).data.publicUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3 mr-2" /> View Asset
                      </a>
                    </Button>
                  )}
               </CardContent>
            </Card>
          </div>

          {/* EVALUATION MATRIX */}
          <div className="space-y-6">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400 px-2 flex items-center gap-2">
               <Target className="h-4 w-4" /> Proficiency Benchmarks
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               {/* LESSON RATING */}
               <Card className="border-none shadow-soft rounded-[2rem] bg-white border border-slate-100 overflow-hidden">
                  <CardHeader className="bg-slate-50/50 p-6 border-b border-slate-100">
                     <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                        <Star className="h-4 w-4 text-amber-500" /> Instructional Score
                     </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                     {studentChapters.length > 0 ? studentChapters.map(sc => (
                        <div key={sc.id} className="space-y-4">
                           <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Synthesis Score</span>
                              <RatingStars rating={sc.evaluation_rating} />
                           </div>
                           <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                              <p className="text-xs font-medium text-slate-600 italic leading-relaxed">"{sc.teacher_notes || 'No institutional remarks provided.'}"</p>
                           </div>
                           <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
                                 <User className="h-4 w-4 text-slate-400" />
                              </div>
                              <div>
                                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none">Instructor</p>
                                 <p className="text-[10px] font-black text-slate-700">{sc.recorded_by_teacher?.name || 'Academic Sys'}</p>
                              </div>
                           </div>
                        </div>
                     )) : <p className="text-xs font-medium text-slate-400 italic py-4 text-center">Score sequence pending.</p>}
                  </CardContent>
               </Card>

               {/* TEST RESULTS */}
               <Card className="border-none shadow-soft rounded-[2rem] bg-white border border-slate-100 overflow-hidden">
                  <CardHeader className="bg-slate-50/50 p-6 border-b border-slate-100">
                     <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-rose-500" /> Evaluation Records
                     </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    {testResults.length === 0 ? (
                      <div className="py-8 text-center"><p className="text-xs font-medium text-slate-400 italic">No associated evaluations identified.</p></div>
                    ) : (
                      <div className="space-y-4">
                        {testResults.map(tr => (
                          <div key={tr.id} className="flex items-center justify-between p-4 rounded-2xl bg-rose-50/50 border border-rose-100">
                            <div className="space-y-1">
                               <p className="text-xs font-black text-foreground/90">{tr.tests?.name}</p>
                               <p className="text-[10px] font-bold text-slate-400">{safeFormatDate(tr.date_taken, "MMM dd")}</p>
                            </div>
                            <div className="text-right">
                               <p className="text-lg font-black text-rose-600 tracking-tighter">{Math.round((tr.marks_obtained / (tr.tests?.total_marks || 1)) * 100)}%</p>
                               <p className="text-[10px] font-black text-rose-400">{tr.marks_obtained}/{tr.tests?.total_marks}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
               </Card>
            </div>

            {/* HOMEWORK RECORDS */}
            <Card className="border-none shadow-soft rounded-[2.5rem] bg-white border border-slate-100 overflow-hidden">
               <CardHeader className="bg-slate-50/50 p-6 border-b border-slate-100">
                  <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                     <Book className="h-4 w-4 text-primary" /> Operational Directives (Homework)
                  </CardTitle>
               </CardHeader>
               <CardContent className="p-6">
                 {homeworkRecords.length === 0 ? (
                    <div className="py-8 text-center"><p className="text-xs font-medium text-slate-400 italic">No associated directives identified.</p></div>
                 ) : (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {homeworkRecords.map(hr => (
                        <div key={hr.id} className="p-5 rounded-3xl border border-slate-100 bg-slate-50/50 flex flex-col justify-between gap-4">
                           <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                 <p className="text-sm font-black text-foreground/90 leading-tight">{hr.homework?.title}</p>
                                 <Badge variant="outline" className={cn("rounded-lg border-none text-[9px] font-black uppercase tracking-tighter", getHomeworkStatusStyles(hr.status))}>
                                    {hr.status}
                                 </Badge>
                              </div>
                              <p className="text-[10px] font-medium text-slate-400 italic">"{hr.teacher_remarks || 'No institutional remarks provided.'}"</p>
                           </div>
                           <div className="flex items-center justify-between pt-3 border-t border-slate-200/50">
                              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                                 <Calendar className="h-3 w-3" />
                                 Due: {safeFormatDate(hr.homework?.due_date, "MMM dd")}
                              </div>
                              {hr.status === 'completed' && <CheckCircle className="h-4 w-4 text-emerald-500" />}
                           </div>
                        </div>
                     ))}
                   </div>
                 )}
               </CardContent>
            </Card>
          </div>
        </div>

        <div className="p-8 border-t border-slate-100 shrink-0">
           <Button className="w-full h-12 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-slate-900/20" onClick={() => onOpenChange(false)}>
              Close Intelligence Log
           </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
