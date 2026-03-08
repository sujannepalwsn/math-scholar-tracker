import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Eye, Star } from 'lucide-react';
import { cn, safeFormatDate } from '@/lib/utils';
import { Tables } from '@/integrations/supabase/types';
import React from 'react';
"use client";


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
            <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4">Domain</TableHead>
            <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4">Module/Chapter</TableHead>
            <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4">Topic</TableHead>
            <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4">Instruction Date</TableHead>
            <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4">Proficiency</TableHead>
            <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4 text-right">Details</TableHead>
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
              const chaptersWithRatings = group.studentChapters.filter(sc => sc.evaluation_rating !== null && sc.evaluation_rating !== undefined);
              const avgRating = chaptersWithRatings.length > 0
                ? (chaptersWithRatings.reduce((sum, sc) => sum + (sc.evaluation_rating || 0), 0) / chaptersWithRatings.length).toFixed(1)
                : 'N/A';

              return (
                <TableRow key={group.lessonPlan.id} className="group transition-all duration-300 hover:bg-white/60">
                  <TableCell className="px-6 py-4">
                    <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-none rounded-lg text-[9px] font-black uppercase tracking-tighter">
                        {group.lessonPlan.subject}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <p className="font-black text-slate-700 text-xs leading-none">{group.lessonPlan.chapter}</p>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <p className="text-[10px] font-medium text-slate-400 line-clamp-1 max-w-[150px]">{group.lessonPlan.topic}</p>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center gap-2 text-slate-500 font-bold text-xs">
                        <Calendar className="h-3 w-3" />
                        {safeFormatDate(group.lessonPlan.lesson_date, "MMM dd, yyyy")}
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    {avgRating !== 'N/A' ? (
                       <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-600 px-2 py-1 rounded-lg w-fit">
                          <span className="font-black text-[10px] leading-none">{avgRating}</span>
                          <Star className="h-2.5 w-2.5 fill-current" />
                       </div>
                    ) : (
                       <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Awaiting</span>
                    )}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right">
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
