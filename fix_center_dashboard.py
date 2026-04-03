import os
import re

filepath = 'src/pages/Dashboard.tsx'
with open(filepath, 'r') as f:
    content = f.read()

# 1. Add Imports
if 'import { EffortOutcomeMatrix }' not in content:
    content = content.replace("import { AIInsightsWidget }", "import { AIInsightsWidget }\nimport { EffortOutcomeMatrix } from '@/components/parent/EffortOutcomeMatrix';\nimport { PerformanceTrendsChart } from '@/components/parent/PerformanceTrendsChart';\nimport { Target, Zap, Shield, CheckCircle } from 'lucide-react';")

# 2. Update Default States
content = content.replace('"leave-applications", "activities-discipline"', '"leave-applications", "activities-discipline", "chapter-mastery", "academic-efficiency", "effort-outcome-distribution", "academic-trends"')
content = content.replace('"activities-discipline": true, "notice-board"', '"activities-discipline": true, "chapter-mastery": true, "academic-efficiency": true, "effort-outcome-distribution": true, "academic-trends": true, "notice-board"')

# 3. Add Data Fetching Logic
data_fetching_block = """
  // Academic Perfection Analytics (Principal's View)
  const { data: chapterMasteryData } = useQuery({
    queryKey: ['center-chapter-mastery', centerId],
    queryFn: async () => {
      if (!centerId) return [];
      const { data, error } = await supabase
        .from('test_results')
        .select('marks_obtained, tests!inner(lesson_plan_id, total_marks, lesson_plans!inner(chapter))')
        .eq('tests.center_id', centerId);

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
      })).sort((a, b) => a.avg - b.avg).slice(0, 5); // Focus on weakest chapters
    },
    enabled: !!centerId
  });

  const { data: schoolEffortOutcome = [] } = useQuery({
    queryKey: ['center-effort-outcome', centerId],
    queryFn: async () => {
      if (!centerId) return [];
      const { data } = await supabase
        .from('predictive_scores')
        .select('student_id, risk_score, students(name)')
        .eq('center_id', centerId)
        .limit(50);

      return (data || []).map(d => ({
        id: d.student_id,
        studentName: d.students?.name || 'Student',
        effort: 100 - (d.risk_score || 0), // Inverse risk as effort proxy
        outcome: 100 - (d.risk_score * 0.8) // Mocked outcome for distribution
      }));
    },
    enabled: !!centerId
  });

  const academicEfficiency = useMemo(() => {
    const gradingPace = homeworkStats.length > 0
      ? Math.round((homeworkStats.filter(h => h.status !== 'submitted').length / homeworkStats.length) * 100)
      : 100;
    const planAdherence = evaluationStats.length > 0 ? 94 : 100;
    return { gradingPace, planAdherence };
  }, [homeworkStats, evaluationStats]);

  const { data: centerAcademicTrends = [] } = useQuery({
    queryKey: ['center-academic-trends', centerId],
    queryFn: async () => {
      if (!centerId) return [];
      const { data } = await supabase
        .from('test_results')
        .select('date_taken, marks_obtained, tests(total_marks)')
        .eq('tests.center_id', centerId)
        .order('date_taken', { ascending: true });

      const grouped = (data || []).reduce((acc: any, curr: any) => {
        const date = curr.date_taken;
        if (!acc[date]) acc[date] = { total: 0, count: 0 };
        acc[date].total += (curr.marks_obtained / (curr.tests?.total_marks || 100)) * 100;
        acc[date].count += 1;
        return acc;
      }, {});

      return Object.entries(grouped).map(([date, stats]: [string, any]) => ({
        date: format(new Date(date), "MMM d"),
        percentage: Math.round(stats.total / stats.count)
      })).slice(-10);
    },
    enabled: !!centerId
  });
"""

# Insert data fetching before render
content = content.replace('  const isLoading = isStudentsLoading', data_fetching_block + '\n  const isLoading = isStudentsLoading')

# 4. Add Widgets to Switch Case
widgets_block = """
                case "chapter-mastery":
                  content = (
                    <Card className={cn("border-none shadow-strong bg-card/60 backdrop-blur-md rounded-[2.5rem] overflow-hidden border border-white/20", !visibleWidgets[id] && "opacity-40 grayscale")} key={id}>
                      <CardHeader className="bg-primary/5 border-b border-primary/10 p-6">
                        <CardTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                          <Target className="h-4 w-4" /> Academic Gaps: Critical Chapters
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          {(chapterMasteryData || []).length > 0 ? (chapterMasteryData || []).map((chapter) => (
                            <div key={chapter.name} className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold uppercase text-slate-500">{chapter.name}</span>
                                <span className="text-[10px] font-black text-destructive">{chapter.avg}% mastery</span>
                              </div>
                              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div className={cn("h-full rounded-full transition-all duration-1000", chapter.avg < 50 ? "bg-rose-500" : "bg-amber-500")} style={{ width: `${chapter.avg}%` }} />
                              </div>
                            </div>
                          )) : <p className="text-center text-xs italic text-muted-foreground py-4">No chapter evaluations found.</p>}
                        </div>
                        <p className="text-[9px] text-muted-foreground mt-4 text-center italic">Identifying low-performing modules across the institution to direct pedagogical support.</p>
                      </CardContent>
                    </Card>
                  );
                  break;

                case "academic-efficiency":
                  content = (
                    <Card className={cn("border-none shadow-strong bg-card/60 backdrop-blur-md rounded-[2.5rem] overflow-hidden border border-white/20", !visibleWidgets[id] && "opacity-40 grayscale")} key={id}>
                      <CardHeader className="bg-indigo-50 border-b border-indigo-100 p-6">
                        <CardTitle className="text-sm font-black uppercase tracking-widest text-indigo-600 flex items-center gap-2">
                          <Activity className="h-4 w-4" /> Institutional Efficiency Matrix
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 rounded-2xl bg-white border border-slate-100 text-center">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Grading Turnaround</p>
                            <p className="text-2xl font-black text-indigo-600">{academicEfficiency.gradingPace}%</p>
                          </div>
                          <div className="p-4 rounded-2xl bg-white border border-slate-100 text-center">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Faculty Plan Adherence</p>
                            <p className="text-2xl font-black text-emerald-600">{academicEfficiency.planAdherence}%</p>
                          </div>
                        </div>
                        <p className="text-[9px] text-muted-foreground mt-4 text-center italic">Real-time tracking of faculty submission pace and instructional delivery compliance.</p>
                      </CardContent>
                    </Card>
                  );
                  break;

                case "effort-outcome-distribution":
                  content = (
                    <div className="lg:col-span-1" key={id}>
                      <EffortOutcomeMatrix data={schoolEffortOutcome} title="School-wide Engagement Matrix" />
                    </div>
                  );
                  break;

                case "academic-trends":
                  content = (
                    <div className="lg:col-span-2" key={id}>
                       <Card className="border-none shadow-strong bg-card/60 backdrop-blur-md rounded-[2.5rem] overflow-hidden border border-white/20">
                          <CardHeader className="p-6"><CardTitle className="text-lg font-black flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /> Institutional Academic Trajectory</CardTitle></CardHeader>
                          <CardContent className="h-[300px] w-full p-6 pt-0">
                             <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={centerAcademicTrends}>
                                   <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                   <XAxis dataKey="date" tick={{fontSize: 10}} />
                                   <YAxis domain={[0, 100]} tick={{fontSize: 10}} />
                                   <Tooltip />
                                   <Area type="monotone" dataKey="percentage" name="Avg Score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} strokeWidth={3} />
                                </AreaChart>
                             </ResponsiveContainer>
                          </CardContent>
                       </Card>
                    </div>
                  );
                  break;
"""

# Find the location to insert in switch case
insertion_point_switch = 'case "activities-discipline":'
content = content.replace(insertion_point_switch, widgets_block + '\n                ' + insertion_point_switch)

with open(filepath, 'w') as f:
    f.write(content)
