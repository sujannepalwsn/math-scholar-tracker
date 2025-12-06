"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Star, FileText, Book, User, CheckCircle, XCircle, Clock } from "lucide-react";
import { safeFormatDate } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
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

interface ParentChapterDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chapterGroup: ChapterPerformanceGroup | null;
}

const getRatingStars = (rating: number | null) => {
  if (rating === null) return "N/A";
  return Array(rating).fill("⭐").join("");
};

const getHomeworkStatusIcon = (status: StudentHomeworkRecord['status']) => {
  switch (status) {
    case 'completed':
    case 'checked':
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'in_progress':
      return <Clock className="h-4 w-4 text-yellow-600" />;
    case 'assigned':
    default:
      return <XCircle className="h-4 w-4 text-red-600" />;
  }
};

export default function ParentChapterDetailModal({ open, onOpenChange, chapterGroup }: ParentChapterDetailModalProps) {
  if (!chapterGroup) return null;

  const { lessonPlan, studentChapters, testResults, homeworkRecords } = chapterGroup;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" aria-labelledby="chapter-detail-title" aria-describedby="chapter-detail-description">
        <DialogHeader>
          <DialogTitle id="chapter-detail-title" className="flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            {lessonPlan.subject}: {lessonPlan.chapter} - {lessonPlan.topic}
          </DialogTitle>
          <DialogDescription id="chapter-detail-description">
            Detailed performance overview for this chapter.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Taught on: {safeFormatDate(lessonPlan.lesson_date, "PPP")}</p>
              {lessonPlan.notes && <p className="text-sm mt-2">Lesson Notes: {lessonPlan.notes}</p>}
              {lessonPlan.lesson_file_url && (
                <Button variant="outline" size="sm" asChild className="mt-3">
                  <a href={supabase.storage.from("lesson-plan-files").getPublicUrl(lessonPlan.lesson_file_url).data.publicUrl} target="_blank" rel="noopener noreferrer">
                    <BookOpen className="h-4 w-4 mr-1" /> View Lesson File
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Lesson Evaluation */}
          {studentChapters.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Star className="h-5 w-5" /> Lesson Evaluation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {studentChapters.map(sc => (
                  <div key={sc.id} className="border-b pb-3 last:border-b-0 last:pb-0">
                    <p>Rating: {getRatingStars(sc.evaluation_rating)}</p>
                    <p>Teacher Notes: {sc.teacher_notes || '-'}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <User className="h-3 w-3" /> Recorded by: {sc.recorded_by_teacher?.name || 'N/A'}
                    </p>
                    <p className="text-xs text-muted-foreground">Completed on: {safeFormatDate(sc.completed_at, "PPP")}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Associated Test Results */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5" /> Associated Test Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              {testResults.length === 0 ? (
                <p className="text-muted-foreground">No associated test results.</p>
              ) : (
                <div className="space-y-3">
                  {testResults.map(tr => (
                    <div key={tr.id} className="border-b pb-3 last:border-b-0 last:pb-0">
                      <p className="font-medium">{tr.tests?.name}</p>
                      <p>Marks: {tr.marks_obtained}/{tr.tests?.total_marks} ({Math.round((tr.marks_obtained / (tr.tests?.total_marks || 1)) * 100)}%)</p>
                      <p className="text-xs text-muted-foreground">Date: {safeFormatDate(tr.date_taken, "PPP")}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Associated Homework Records */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Book className="h-5 w-5" /> Associated Homework
              </CardTitle>
            </CardHeader>
            <CardContent>
              {homeworkRecords.length === 0 ? (
                <p className="text-muted-foreground">No associated homework records.</p>
              ) : (
                <div className="space-y-3">
                  {homeworkRecords.map(hr => (
                    <div key={hr.id} className="border-b pb-3 last:border-b-0 last:pb-0">
                      <p className="font-medium flex items-center gap-1">
                        {getHomeworkStatusIcon(hr.status)} {hr.homework?.title}
                      </p>
                      <p>Status: {hr.status}</p>
                      <p className="text-xs text-muted-foreground">Due: {safeFormatDate(hr.homework?.due_date, "PPP")}</p>
                      {hr.teacher_remarks && <p className="text-xs text-muted-foreground">Remarks: {hr.teacher_remarks}</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}