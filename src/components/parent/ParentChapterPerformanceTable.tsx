"use client";
import { Calendar, Eye, Star } from "lucide-react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn, safeFormatDate } from "@/lib/utils"
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

interface ParentChapterPerformanceTableProps {
  chapterPerformanceData: ChapterPerformanceGroup[];
  onViewDetails: (chapterGroup: ChapterPerformanceGroup) => void;
}

export default function ParentChapterPerformanceTable({ chapterPerformanceData, onViewDetails }: ParentChapterPerformanceTableProps) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/5 border-b border-slate-100">
            <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4">Subject</TableHead>
            <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4">Topic</TableHead>
            <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4">Evaluation</TableHead>
            <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4">Homework</TableHead>
            <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4">Result</TableHead>
            <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4 text-center">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {chapterPerformanceData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-12 italic font-medium">
                No performance data identified for this academic sequence.
              </TableCell>
            </TableRow>
          ) : (
            chapterPerformanceData.map((group) => {
              const evaluation = group.studentChapters[0];
              const testResult = group.testResults[0];
              const homework = group.homeworkRecords[0];

              const avgPct = group.testResults.length > 0
                ? Math.round(group.testResults.reduce((acc, tr) => acc + (tr.marks_obtained / (tr.tests?.total_marks || 1)) * 100, 0) / group.testResults.length)
                : null;

              const getRatingStars = (rating: number | null) => {
                if (rating === null) return null;
                return Array(rating).fill("⭐").join("");
              };

              return (
                <TableRow key={group.lessonPlan.id} className="group transition-all duration-300 hover:bg-card/60">
                  <TableCell className="px-6 py-4">
                    <Badge variant="secondary" className="bg-primary/5 text-primary/70 border-none rounded-lg text-[9px] font-black uppercase tracking-tighter">
                        {group.lessonPlan.subject}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <p className="font-black text-slate-700 text-xs leading-none">{group.lessonPlan.topic}</p>
                    <p className="text-[10px] text-slate-400 font-medium mt-1">Module: {group.lessonPlan.chapter}</p>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    {evaluation ? (
                      <div className="flex items-center gap-1.5 text-amber-600">
                        <span className="font-black text-[10px] leading-none">{getRatingStars(evaluation.evaluation_rating)}</span>
                      </div>
                    ) : (
                      <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Awaiting</span>
                    )}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    {homework ? (
                      <Badge variant={homework.status === 'completed' || homework.status === 'checked' ? 'success' : homework.status === 'in_progress' ? 'warning' : 'destructive'} className="text-[9px] uppercase font-bold">
                        {homework.status}
                      </Badge>
                    ) : (
                      <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest italic">N/A</span>
                    )}
                  </TableCell>
                  <TableCell className="px-6 py-4 font-bold">
                    {avgPct !== null ? (
                      <span className={cn(avgPct >= 75 ? "text-green-600" : avgPct >= 50 ? "text-orange-600" : "text-red-600")}>
                        {avgPct}%
                      </span>
                    ) : (
                      <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest italic">N/A</span>
                    )}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl bg-white shadow-soft group-hover:scale-110 transition-transform" onClick={() => onViewDetails(group)}>
                      <Eye className="h-4 w-4 text-primary" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
