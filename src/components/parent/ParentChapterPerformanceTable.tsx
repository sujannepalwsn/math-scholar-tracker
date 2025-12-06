"use client";

import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye, Star } from "lucide-react";
import { safeFormatDate } from "@/lib/utils";
import { Tables } from "@/integrations/supabase/types";

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

const getRatingStars = (rating: number | null) => {
  if (rating === null) return "N/A";
  return Array(rating).fill("⭐").join("");
};

export default function ParentChapterPerformanceTable({ chapterPerformanceData, onViewDetails }: ParentChapterPerformanceTableProps) {
  return (
    <div className="overflow-x-auto max-h-[400px] border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Subject</TableHead>
            <TableHead>Chapter</TableHead>
            <TableHead>Topic</TableHead>
            <TableHead>Date Taught</TableHead>
            <TableHead>Avg. Rating</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {chapterPerformanceData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-4">
                No chapter performance data available for this period.
              </TableCell>
            </TableRow>
          ) : (
            chapterPerformanceData.map((group) => {
              const avgRating = group.studentChapters.length > 0
                ? (group.studentChapters.reduce((sum, sc) => sum + (sc.evaluation_rating || 0), 0) / group.studentChapters.length).toFixed(1)
                : 'N/A';

              return (
                <TableRow key={group.lessonPlan.id}>
                  <TableCell className="font-medium">{group.lessonPlan.subject}</TableCell>
                  <TableCell>{group.lessonPlan.chapter}</TableCell>
                  <TableCell>{group.lessonPlan.topic}</TableCell>
                  <TableCell>{safeFormatDate(group.lessonPlan.lesson_date, "PPP")}</TableCell>
                  <TableCell className="flex items-center gap-1">
                    {avgRating !== 'N/A' ? `${avgRating} ` : ''}
                    {avgRating !== 'N/A' && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                    {avgRating === 'N/A' && 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => onViewDetails(group)}>
                      <Eye className="h-4 w-4 mr-1" /> View Details
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