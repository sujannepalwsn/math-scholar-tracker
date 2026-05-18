import { logger } from "@/utils/logger";
import React, { useMemo, useState, useEffect } from "react";
import { UserRole } from "@/types/roles";
import {
  Brain, Activity, Sparkles, TrendingUp, Clock, Wallet, Book,
  GraduationCap, MessageSquare, ChevronRight,
  AlertTriangle, ClipboardCheck, BarChart3, Loader2,
  CalendarCheck, BookOpen, Paintbrush, Star
} from "lucide-react";
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { useNavigate, useSearchParams } from "react-router-dom"
import { format, subDays } from "date-fns"
import { cn, formatCurrency } from "@/lib/utils"
import { KPICard } from "@/components/dashboard/KPICard"
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DigitalNoticeBoard from "@/components/center/NoticeBoard";
import SuggestionForm from "@/components/center/SuggestionForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

// New Analytics Components
import { PerformanceTrendsChart } from "@/components/parent/PerformanceTrendsChart";
import { EffortOutcomeMatrix } from "@/components/parent/EffortOutcomeMatrix";
import { ActionPlanSection } from "@/components/parent/ActionPlanSection";
import { CelebrationsGrowth } from "@/components/parent/CelebrationsGrowth";
import { HomeworkHealth } from "@/components/parent/HomeworkHealth";
import { ChildSwitcher } from "@/components/parent/ChildSwitcher";
import { InsightAlerts } from "@/components/parent/InsightAlerts";
import { useParentInsights } from "@/hooks/useParentInsights";
import { hasPermission } from "@/utils/permissions";

export default function ParentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleDiscuss = (e: any) => {
      const { quadrant } = e.detail;
      navigate('/parent-messages', {
        state: {
          attachedContext: {
            title: `Effort vs Outcome: ${quadrant.label}`,
            type: 'matrix',
            data: quadrant
          }
        }
      });
    };

    window.addEventListener('open-discuss-teacher', handleDiscuss);
    return () => window.removeEventListener('open-discuss-teacher', handleDiscuss);
  }, [navigate]);

  const linkedStudents = useMemo(() => {
    const raw = user?.linked_students;
    if (!Array.isArray(raw)) return [];
    return raw.map(s => typeof s === 'string' ? { id: s, name: 'Student' } : s);
  }, [user?.linked_students]);

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(() => {
    if (user?.student_id) return user.student_id;
    if (linkedStudents.length > 0) return linkedStudents[0].id;
    return null;
  });

  const activeStudentId = selectedStudentId || user?.student_id;
  const { insights, stats, isLoading: isInsightsLoading } = useParentInsights(activeStudentId);

  // Real data fetching
  const { data: student, isLoading: isStudentLoading } = useQuery({
    queryKey: ['student', activeStudentId],
    queryFn: async () => {
      if (!activeStudentId) return null;
      const { data, error } = await supabase.from('students').select('*').eq('id', activeStudentId).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!activeStudentId
  });

  const { data: performanceTrends = [] } = useQuery({
    queryKey: ['performance-trends-parent', activeStudentId],
    queryFn: async () => {
      if (!activeStudentId) return [];
      const { data, error } = await supabase.rpc('get_student_performance_trends', {
        p_student_id: activeStudentId,
        p_subject: null
      });
      if (error) {
        console.error("Performance trends RPC error:", error);
        return [];
      }
      return (data as any[] || []).map(d => ({
        date: d.evaluation_date ? format(new Date(d.evaluation_date), "MMM d") : 'N/A',
        score: d.score || 0,
        maxScore: d.max_score || 100,
        percentage: d.percentage || 0,
        trendStatus: d.trend_status || 'Stable',
        riskLevel: d.risk_level || 'Low'
      }));
    },
    enabled: !!activeStudentId
  });

  const { data: effortIndex = 0 } = useQuery({
    queryKey: ['effort-index-parent', activeStudentId],
    queryFn: async () => {
      if (!activeStudentId) return 0;
      const { data, error } = await supabase.rpc('calculate_effort_index', {
        p_student_id: activeStudentId,
        p_start_date: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
        p_end_date: format(new Date(), 'yyyy-MM-dd')
      });
      if (error) {
        console.warn("Effort index RPC error:", error);
        return 0;
      }
      return data as number;
    },
    enabled: !!activeStudentId
  });

  const { data: outcomeIndex = 0 } = useQuery({
    queryKey: ['outcome-index-parent', activeStudentId],
    queryFn: async () => {
      if (!activeStudentId) return 0;
      const { data, error } = await supabase.rpc('calculate_outcome_index', {
        p_student_id: activeStudentId,
        p_start_date: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
        p_end_date: format(new Date(), 'yyyy-MM-dd')
      });
      if (error) {
        console.warn("Outcome index RPC error:", error);
        return 0;
      }
      return data as number;
    },
    enabled: !!activeStudentId
  });

  const effortOutcomeData = useMemo(() => [
    { id: activeStudentId || '1', studentName: student?.name || 'Child', effort: effortIndex, outcome: outcomeIndex }
  ], [activeStudentId, student, effortIndex, outcomeIndex]);

  const { data: milestones = [] } = useQuery({
    queryKey: ['milestones-parent', activeStudentId],
    queryFn: async () => {
      if (!activeStudentId) return [];
      const { data, error } = await supabase
        .from('student_milestones')
        .select('*')
        .eq('student_id', activeStudentId)
        .order('date_achieved', { ascending: false });
      if (error) throw error;
      return (data as any[] || []).map(d => ({
        id: d.id,
        type: d.milestone_type as any || 'effort',
        title: (d.description || '').split(':')[0] || 'Achievement',
        description: (d.description || '').includes(':') ? d.description.split(':')[1].trim() : (d.description || 'Achievement unlocked'),
        date: d.date_achieved ? format(new Date(d.date_achieved), "MMM d") : 'Recent',
        metadata: d.metadata || {}
      }));
    },
    enabled: !!activeStudentId
  });

  const { data: recentActivities = [] } = useQuery({
    queryKey: ['parent-recent-activities', activeStudentId],
    queryFn: async () => {
      if (!activeStudentId) return [];
      const { data, error } = await supabase
        .from('student_activities')
        .select('*, activities(*)')
        .eq('student_id', activeStudentId)
        .order('created_at', { ascending: false })
        .limit(4);
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeStudentId
  });

  const { data: homeworkStatus = [] } = useQuery({
    queryKey: ['student-homework-records-dashboard', activeStudentId],
    queryFn: async () => {
      if (!activeStudentId) return [];
      const { data, error } = await supabase
        .from('student_homework_records')
        .select('*, homework(*)')
        .eq('student_id', activeStudentId)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!activeStudentId
  });

  const homeworkRecords = useMemo(() => {
    return homeworkStatus.map((hs: any) => ({
      id: hs.id,
      title: hs.homework?.title || 'Untitled',
      subject: hs.homework?.subject || 'N/A',
      dueDate: hs.homework?.due_date ? format(new Date(hs.homework.due_date), "MMM d") : 'N/A',
      status: hs.status as any,
      score: hs.score,
      maxScore: hs.max_score || hs.homework?.max_score
    }));
  }, [homeworkStatus]);

  if (!user || user.role !== UserRole.PARENT) {
    navigate('/login-parent');
    return null;
  }

  if (isStudentLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-4 md:p-8 space-y-10 pb-24 md:pb-8 page-enter animate-in fade-in duration-1000">
      <DashboardHeader />

      {/* Header & Child Switcher */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl md:text-4xl font-black tracking-tight text-slate-900 mb-2">
              Scholar Monitor
            </h1>
            <p className="text-slate-500 font-medium text-lg">
              Welcome back. Here is a summary of <span className="text-primary font-bold">{student?.name || "your child"}'s</span> academic status.
            </p>
          </div>
          <ChildSwitcher selectedId={activeStudentId} onSelect={setSelectedStudentId} />
        </div>

        <div className="flex gap-3">
          <Button
            onClick={() => navigate('/parent-messages')}
            className="rounded-2xl bg-white border-2 border-slate-200 hover:bg-slate-50 text-slate-900 font-black uppercase text-[10px] tracking-widest h-12 px-6 transition-all"
          >
            <MessageSquare className="mr-2 h-4 w-4 text-primary" />
            Contact Teachers
          </Button>
          <Button
            onClick={() => navigate('/parent-snapshot')}
            className="rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black uppercase text-[10px] tracking-widest h-12 px-6 shadow-strong transition-all hover:scale-105"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Daily Snapshot
          </Button>
        </div>
      </div>

      {/* KPI Grid - Modern SaaS Style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <KPICard
          title="Attendance"
          value={`${Math.round(stats.attendanceRate)}%`}
          description="Monthly Average"
          icon={CalendarCheck}
          color={stats.attendanceRate < 75 ? "rose" : "green"}
          onClick={() => navigate("/parent/attendance")}
        />
        <KPICard
          title="Avg Score"
          value={`${Math.round(stats.averageTestScore)}%`}
          description="Academic Scale"
          icon={GraduationCap}
          color={stats.averageTestScore < 60 ? "rose" : "purple"}
          onClick={() => navigate("/parent/performance")}
        />
        <KPICard
          title="Homework"
          value={`${Math.round(stats.homeworkCompletionRate)}%`}
          description="Completion Rate"
          icon={Book}
          color={stats.homeworkCompletionRate < 80 ? "orange" : "blue"}
          onClick={() => navigate("/parent-homework")}
        />
        <KPICard
          title="Missed"
          value={stats.missedClasses}
          description="Classes Missed"
          icon={Clock}
          color={stats.missedClasses > 3 ? "rose" : "slate"}
          onClick={() => navigate("/parent/attendance")}
        />
        <KPICard
          title="Progress"
          value={`${Math.round(stats.learningProgress)}%`}
          description="Chapters Covered"
          icon={BookOpen}
          color="indigo"
          onClick={() => navigate("/parent/performance")}
        />
        {hasPermission(user, 'preschool_activities') && (
          <KPICard
            title="Pre School Activities"
            value={recentActivities.length}
            description="Creative Milestones"
            icon={Paintbrush}
            color="indigo"
            onClick={() => navigate("/parent/activities")}
          />
        )}
        <KPICard
          title="Due Fees"
          value={formatCurrency(stats.totalDues)}
          description="Pending Payment"
          icon={Wallet}
          color={stats.totalDues > 0 ? "rose" : "green"}
          onClick={() => navigate("/parent/fees")}
        />
      </div>

      {/* Main Intelligence Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Alerts & Matrix */}
        <div className="lg:col-span-1 space-y-8">
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Smart Alerts
            </h3>
            <InsightAlerts insights={insights} />
          </div>

          <EffortOutcomeMatrix data={effortOutcomeData} activeStudentId={activeStudentId || undefined} />
        </div>

        {/* Right Column: Trends & Action Plan */}
        <div className="lg:col-span-2 space-y-8">
          <PerformanceTrendsChart data={performanceTrends} title="Academic Growth Trajectory" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <HomeworkHealth records={homeworkRecords} />
             {hasPermission(user, 'preschool_activities') && (
                <Card className="border-none shadow-soft bg-card/60 backdrop-blur-md rounded-[2rem] overflow-hidden border border-border/20">
                  <CardHeader className="bg-primary/5 border-b border-primary/10 p-6 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                      <Paintbrush className="h-4 w-4" /> Pre School Activity Journal
                    </CardTitle>
                    <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase text-primary" onClick={() => navigate("/parent/activities")}>View All</Button>
                  </CardHeader>
                  <CardContent className="p-0">
                    {recentActivities.length === 0 ? (
                      <p className="p-8 text-center text-xs italic text-muted-foreground">No recent activities logged</p>
                    ) : (
                      <div className="divide-y divide-primary/5">
                        {recentActivities.map((sa: any) => (
                          <div key={sa.id} className="p-4 flex gap-4 hover:bg-primary/5 transition-colors cursor-pointer" onClick={() => navigate("/parent/activities")}>
                            {sa.activities?.photo_url ? (
                               <img src={supabase.storage.from("activity-photos").getPublicUrl(sa.activities.photo_url).data.publicUrl} className="h-12 w-12 rounded-lg object-cover" alt="" />
                            ) : (
                               <div className="h-12 w-12 rounded-lg bg-slate-100 flex items-center justify-center"><Paintbrush className="h-5 w-5 text-slate-300" /></div>
                            )}
                            <div className="flex-1">
                              <p className="text-sm font-bold text-slate-800">{sa.activities?.title}</p>
                              <p className="text-[10px] text-slate-400 font-medium">{sa.activities?.activity_date ? format(new Date(sa.activities.activity_date), "MMM d, yyyy") : 'Recent'}</p>
                            </div>
                            {sa.involvement_score && (
                               <div className="flex items-center gap-1 text-amber-500 font-black text-xs">
                                  <Star className="h-3 w-3 fill-current" /> {sa.involvement_score}
                               </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
             )}
             <CelebrationsGrowth milestones={milestones} />
          </div>
        </div>
      </div>

      {/* Community & Communication */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <DigitalNoticeBoard centerId={user?.center_id || ""} role="parent" grade={student?.grade || undefined} />
        <div className="space-y-6">
          <div className="p-8 rounded-[2rem] bg-indigo-600 shadow-indigo-200 shadow-2xl text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
              <MessageSquare className="h-24 w-24" />
            </div>
            <div className="relative z-10 space-y-4">
              <h2 className="text-2xl font-black text-white">Institutional Support</h2>
              <p className="text-indigo-100 font-medium">Connect directly with subject teachers to discuss specific performance insights or behavior patterns.</p>
              <Button
                onClick={() => navigate('/parent-messages')}
                className="bg-white text-indigo-600 hover:bg-white/90 rounded-xl font-black uppercase text-[10px] tracking-widest px-8 h-12 shadow-lg"
              >
                Open Messaging <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
          <SuggestionForm role="parent" />
        </div>
      </div>

      {/* Footer CTA */}
      <div className="flex flex-col items-center gap-4 py-12 border-t border-slate-100">
        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">In-depth Analysis Required?</p>
        <Button
          variant="outline"
          className="rounded-2xl border-2 border-slate-200 font-black uppercase tracking-widest text-[10px] h-14 px-10 shadow-soft bg-white hover:bg-slate-50 hover:border-slate-300 transition-all"
          onClick={() => navigate("/parent/performance")}
        >
          <BarChart3 className="mr-2 h-4 w-4 text-primary" />
          Access Full Academic Dossier
        </Button>
      </div>
    </div>
  );
}
