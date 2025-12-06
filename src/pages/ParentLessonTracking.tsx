import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BookOpen, FileText, User } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';
import { safeFormatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type LessonPlan = Tables<'lesson_plans'>;
type StudentChapter = Tables<'student_chapters'>;

export default function ParentLessonTracking() {
  const { user } = useAuth();
  const [subjectFilter, setSubjectFilter] = useState<string>("all");

  if (!user || user.role !== 'parent' || !user.student_id) {
    return <div className="p-6 text-center text-muted-foreground">Please log in as a parent to view lesson tracking.</div>;
  }

  // Fetch lesson records (student_chapters now links to lesson_plans)
  const { data: lessonRecords = [] } = useQuery({
    queryKey: ['student-lesson-records-parent-lesson-tracking', user.student_id, subjectFilter],
    queryFn: async () => {
      let query = supabase.from('student_chapters').select(`
        *,
        lesson_plans(id, subject, chapter, topic, lesson_date, lesson_file_url),
        recorded_by_teacher:recorded_by_teacher_id(name)
      `).eq('student_id', user.student_id).order('completed_at', { ascending: false });
      
      if (subjectFilter !== "all") {
        query = query.eq('lesson_plans.subject', subjectFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const allSubjects = useMemo(() => {
    return Array.from(new Set(lessonRecords.map((lr: any) => lr.lesson_plans?.subject).filter(Boolean)));
  }, [lessonRecords]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Lessons Studied</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" /> Lessons Studied
            </CardTitle>
            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by Subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {allSubjects.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {lessonRecords.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No lessons recorded for your child.</p>
          ) : (
            <div className="overflow-x-auto max-h-96 border rounded">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Chapter</TableHead>
                    <TableHead>Topic</TableHead>
                    <TableHead>Date Taught</TableHead>
                    <TableHead>Teacher Notes</TableHead>
                    <TableHead>Recorded By</TableHead>
                    <TableHead>Lesson File</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lessonRecords.map((lr: any) => (
                    <TableRow key={lr.id}>
                      <TableCell>{lr.lesson_plans?.subject || '-'}</TableCell>
                      <TableCell>{lr.lesson_plans?.chapter || '-'}</TableCell>
                      <TableCell>{lr.lesson_plans?.topic || '-'}</TableCell>
                      <TableCell>{safeFormatDate(lr.completed_at, "PPP")}</TableCell>
                      <TableCell>{lr.teacher_notes || '-'}</TableCell>
                      <TableCell className="flex items-center gap-1">
                        {lr.recorded_by_teacher?.name || '-'}
                      </TableCell>
                      <TableCell>
                        {lr.lesson_plans?.lesson_file_url ? (
                          <Button variant="ghost" size="sm" asChild>
                            <a href={supabase.storage.from("lesson-plan-files").getPublicUrl(lr.lesson_plans.lesson_file_url).data.publicUrl} target="_blank" rel="noopener noreferrer">
                              <FileText className="h-4 w-4" />
                            </a>
                          </Button>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}