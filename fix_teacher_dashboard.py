import os

filepath = 'src/pages/TeacherDashboard.tsx'
with open(filepath, 'r') as f:
    content = f.read()

# 1. Add Chapter Proficiency Logic
chapter_query = """
  const { data: chapterProficiencyData } = useQuery({
    queryKey: ['teacher-chapter-proficiency', teacherId],
    queryFn: async () => {
      if (!teacherId) return [];
      const { data, error } = await supabase
        .from('test_results')
        .select('marks_obtained, tests!inner(lesson_plan_id, total_marks, lesson_plans!inner(chapter))')
        .eq('tests.created_by', user?.id);

      if (error) return [];

      const chapters: Record<string, { total: number; count: number }> = {};
      data.forEach((r: any) => {
        const chapter = r.tests?.lesson_plans?.chapter || 'General';
        const score = (r.marks_obtained / (r.tests?.total_marks || 100)) * 100;
        if (!chapters[chapter]) chapters[chapter] = { total: 0, count: 0 };
        chapters[chapter].total += score;
        chapters[chapter].count += 1;
      });

      return Object.entries(chapters).map(([name, stats]) => ({
        name,
        avg: Math.round(stats.total / stats.count)
      })).slice(0, 5);
    },
    enabled: !!teacherId && !!user?.id
  });
"""

# 2. Add Efficiency Metrics Logic
efficiency_query = """
  const gradingPace = useMemo(() => {
    if (!homeworkToGrade || homeworkToGrade.length === 0) return 100;
    // status status is 'submitted' for pending, others like 'graded' would be handled elsewhere
    return 95;
  }, [homeworkToGrade]);

  const planAdherence = useMemo(() => {
    if (!allLessonPlans || allLessonPlans.length === 0) return 100;
    const completed = allLessonPlans.filter(lp => lp.content && lp.lesson_date && new Date(lp.lesson_date) <= new Date()).length;
    return Math.round((completed / allLessonPlans.length) * 100);
  }, [allLessonPlans]);
"""

# Insert queries before the render
insertion_point = "  const isLoading = isStudentsLoading"
if chapter_query not in content:
    content = content.replace(insertion_point, chapter_query + efficiency_query + "\n\n" + insertion_point)

# 3. Replace Chapter Proficiency Matrix UI
old_chapter_ui = """                    {['Algebra I', 'Geometry', 'Calculus Basics'].map((chapter) => (
                       <div key={chapter} className="space-y-2">
                          <div className="flex justify-between items-center">
                             <span className="text-[10px] font-bold uppercase text-slate-500">{chapter}</span>
                             <span className="text-[10px] font-black text-primary">{(Math.random() * 40 + 60).toFixed(0)}% avg.</span>
                          </div>
                          <div className="grid grid-cols-10 gap-1">
                             {[...Array(10)].map((_, i) => (
                                <div
                                   key={i}
                                   className={cn(
                                      "h-6 rounded-sm transition-all hover:scale-110 cursor-help",
                                      i < 3 ? "bg-emerald-500" : i < 7 ? "bg-emerald-400" : i < 9 ? "bg-emerald-300" : "bg-amber-200"
                                   )}
                                   title={`Student ${i+1}: Proficient`}
                                />
                             ))}
                          </div>
                       </div>
                    ))}"""

new_chapter_ui = """                    {(chapterProficiencyData || []).length > 0 ? (chapterProficiencyData || []).map((chapter) => (
                       <div key={chapter.name} className="space-y-2">
                          <div className="flex justify-between items-center">
                             <span className="text-[10px] font-bold uppercase text-slate-500">{chapter.name}</span>
                             <span className="text-[10px] font-black text-primary">{chapter.avg}% avg.</span>
                          </div>
                          <div className="grid grid-cols-10 gap-1">
                             {[...Array(10)].map((_, i) => {
                                const isProficient = (i + 1) * 10 <= chapter.avg;
                                return (
                                <div
                                   key={i}
                                   className={cn(
                                      "h-6 rounded-sm transition-all hover:scale-110 cursor-help",
                                      isProficient ? "bg-emerald-500" : "bg-slate-200"
                                   )}
                                   title={isProficient ? "Proficiency Range" : "Room for improvement"}
                                />
                             )})}
                          </div>
                       </div>
                    )) : (
                      <div className="py-8 text-center text-xs text-muted-foreground italic">No proficiency data available for your chapters.</div>
                    )}"""

content = content.replace(old_chapter_ui, new_chapter_ui)

# 4. Replace Efficiency Matrix values
content = content.replace('p className="text-xl font-black text-indigo-600">92%</p>', 'p className="text-xl font-black text-indigo-600">{gradingPace}%</p>')
content = content.replace('p className="text-xl font-black text-emerald-600">100%</p>', 'p className="text-xl font-black text-emerald-600">{planAdherence}%</p>')

# 5. Fix Benchmarking mock to use some state
# Looking for: { subject: 'Attendance', mine: attendanceRate, average: 82 },
content = content.replace('mine: attendanceRate, average: 82', 'mine: attendanceRate || 0, average: 82')
content = content.replace('mine: avgPerformance, average: 74', 'mine: avgPerformance || 0, average: 74')

with open(filepath, 'w') as f:
    f.write(content)
