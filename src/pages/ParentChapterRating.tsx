import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { safeFormatDate } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Star, User } from "lucide-react";
import { useMemo, useState } from "react";

type LessonPlan = Tables<'lesson_plans'>;
type StudentChapter = Tables<'student_chapters'>;

export default function ParentChapterRating() {
  const { user } = useAuth();
  const [subjectFilter, setSubjectFilter] = useState<string>("all");

  if (!user || user.role !== 'parent' || !user.student_id) {
    return <div className="p-6 text-center text-muted-foreground">Please log in as a parent to view chapter ratings.</div>;
  }

  // Fetch lesson records (student_chapters now links to lesson_plans)
  const { data: lessonRecords = [] } = useQuery({
    queryKey: ['student-lesson-records-parent-chapter-rating', user.student_id, subjectFilter],
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
      chapters: data.chapters.sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime()),
    }));
  }, [lessonRecords]);

  const allSubjects = useMemo(() => {
    return Array.from(new Set(lessonRecords.map((lr: any) => lr.lesson_plans?.subject).filter(Boolean)));
  }, [lessonRecords]);

  const getRatingStars = (rating: number | null) => {
    if (rating === null) return "N/A";
    return Array(rating).fill("⭐").join("");
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">Skill Matrix</h1>
          <p className="text-muted-foreground text-lg">Visual breakdown of your child's understanding across different subjects.</p>
        </div>
      </div>

      <Card className="border-none shadow-soft overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" /> Chapter Rating Report
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
          {chapterRatingsBySubject.length === 0 ? (
            <p className="text-muted-foreground">No chapter ratings available for your child.</p>
          ) : (
            <div className="space-y-6">
              {/* Accumulated Subject-wise Rating */}
              <h3 className="font-bold text-xl mb-4">Subject Proficiency</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {chapterRatingsBySubject.map((subjectData) => (
                  <Card key={subjectData.subject} className="border-2 border-primary/5 bg-muted/30 p-5 rounded-2xl shadow-soft hover:shadow-medium transition-all group">
                    <h4 className="font-bold text-lg text-muted-foreground group-hover:text-primary transition-colors">{subjectData.subject}</h4>
                    <div className="flex items-baseline gap-2 mt-2">
                       <p className="text-4xl font-black tracking-tighter text-primary">
                        {subjectData.averageRating}
                      </p>
                      <Star className="h-6 w-6 text-yellow-500 fill-current" />
                    </div>
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mt-2">{subjectData.chapters.length} Modules Analyzed</p>
                  </Card>
                ))}
              </div>

              {/* Individual Chapter Ratings */}
              <h3 className="font-semibold text-lg mb-2">Individual Chapter Ratings</h3>
              <div className="overflow-x-auto max-h-96 border rounded">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border px-2 py-1">Subject</th>
                      <th className="border px-2 py-1">Chapter</th>
                      <th className="border px-2 py-1">Topic</th>
                      <th className="border px-2 py-1">Date Completed</th>
                      <th className="border px-2 py-1">Rating</th>
                      <th className="border px-2 py-1">Teacher Notes</th>
                      <th className="border px-2 py-1">Recorded By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chapterRatingsBySubject.flatMap(subjectData =>
                      subjectData.chapters.map((record: any) => (
                        <TableRow key={record.id}>
                          <TableCell className="border px-2 py-1">{record.lesson_plans?.subject || '-'} </TableCell>
                          <TableCell className="border px-2 py-1">{record.lesson_plans?.chapter || '-'}</TableCell>
                          <TableCell className="border px-2 py-1">{record.lesson_plans?.topic || '-'}</TableCell>
                          <TableCell className="border px-2 py-1">{safeFormatDate(record.completed_at, "PPP")}</TableCell>
                          <TableCell className="border px-2 py-1 flex items-center gap-1">
                            {getRatingStars(record.evaluation_rating)}
                          </TableCell>
                          <TableCell className="border px-2 py-1">{record.teacher_notes || '-'}</TableCell>
                          <TableCell className="border px-2 py-1 flex items-center gap-1">
                            {record.recorded_by_teacher?.name || '-'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}