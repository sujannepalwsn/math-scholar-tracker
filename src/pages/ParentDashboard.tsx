import { logger } from "@/utils/logger";
import React, { useEffect, useMemo, useState } from "react";
import { UserRole } from "@/types/roles";
import {
  Brain, Activity, ListChecks, Sparkles, Trophy, Star, BookMarked,
  TrendingUp, TrendingDown, Clock, Wallet, CalendarIcon, Book,
  GraduationCap, Search, Calendar, Eye, MessageSquare, ChevronRight,
  Info, AlertTriangle, ClipboardCheck, BarChart3, Bus, Loader2
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { useNavigate } from "react-router-dom"
import { eachDayOfInterval, format, isPast, subDays } from "date-fns"
import { cn, formatCurrency, safeFormatDate } from "@/lib/utils"
import { KPICard } from "@/components/dashboard/KPICard"
import { AlertList } from "@/components/dashboard/AlertList"
import { ClassSchedule } from "@/components/dashboard/ClassSchedule"
import { AIInsightsWidget } from "@/components/dashboard/AIInsightsWidget"
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DigitalNoticeBoard from "@/components/center/NoticeBoard";
import SuggestionForm from "@/components/center/SuggestionForm";
import { CommandCenter } from "@/components/dashboard/CommandCenter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tables } from "@/integrations/supabase/types"

// New Analytics Components
import { PerformanceTrendsChart } from "@/components/parent/PerformanceTrendsChart";
import { EffortOutcomeMatrix } from "@/components/parent/EffortOutcomeMatrix";
import { ActionPlanSection } from "@/components/parent/ActionPlanSection";
import { CelebrationsGrowth } from "@/components/parent/CelebrationsGrowth";
import { HomeworkHealth } from "@/components/parent/HomeworkHealth";

export default function ParentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split("T")[0];
  
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30).toISOString().split("T")[0],
    to: today
  });

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

  const [selectedChapterDetail, setSelectedChapterDetail] = useState<any>(null);
  const [selectedDisciplineIssue, setSelectedDisciplineIssue] = useState<any>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>("Math");

  useEffect(() => {
    if (!selectedStudentId && linkedStudents.length > 0) {
      setSelectedStudentId(linkedStudents[0].id);
    }
  }, [linkedStudents, selectedStudentId]);

  const activeStudentId = selectedStudentId || user?.student_id;

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
    queryKey: ['performance-trends', activeStudentId, selectedSubject],
    queryFn: async () => {
      if (!activeStudentId) return [];
      const { data, error } = await supabase.rpc('get_student_performance_trends', {
        p_student_id: activeStudentId,
        p_subject: selectedSubject
      });
      if (error) throw error;
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

  const { data: aiInsights = [] } = useQuery({
    queryKey: ['parent-ai-insights', activeStudentId],
    queryFn: async () => {
      if (!activeStudentId) return [];
      const { data, error } = await supabase
        .from('predictive_model_results')
        .select('*')
        .eq('student_id', activeStudentId)
        .order('prediction_date', { ascending: false })
        .limit(5);

      if (error) throw error;
      return (data as any[] || []).map(d => ({
        id: d.id,
        type: d.risk_level === 'High' ? 'risk' : 'sentiment',
        level: (d.risk_level as any) || 'Low',
        title: d.risk_level === 'Low' ? 'Learning Trajectory: Positive' : 'Academic Attention Required',
        description: d.risk_level === 'Low'
          ? 'Consistency identified in current evaluation cycles. Positive momentum detected.'
          : 'Variation in performance trends identified. Review recommended.',
        factors: d.suggested_interventions?.[0] ? { 'Action': d.suggested_interventions[0] } : undefined
      }));
    },
    enabled: !!activeStudentId
  });

  const { data: effortIndex = 0 } = useQuery({
    queryKey: ['effort-index', activeStudentId, dateRange],
    queryFn: async () => {
      if (!activeStudentId) return 0;
      const { data, error } = await supabase.rpc('calculate_effort_index', {
        p_student_id: activeStudentId,
        p_start_date: dateRange.from,
        p_end_date: dateRange.to
      });
      if (error) throw error;
      return data as number;
    },
    enabled: !!activeStudentId
  });

  const { data: outcomeIndex = 0 } = useQuery({
    queryKey: ['outcome-index', activeStudentId, dateRange],
    queryFn: async () => {
      if (!activeStudentId) return 0;
      const { data, error } = await supabase.rpc('calculate_outcome_index', {
        p_student_id: activeStudentId,
        p_start_date: dateRange.from,
        p_end_date: dateRange.to
      });
      if (error) throw error;
      return data as number;
    },
    enabled: !!activeStudentId
  });

  const effortOutcomeData = useMemo(() => [
    { id: activeStudentId || '1', studentName: student?.name || 'Child', effort: effortIndex, outcome: outcomeIndex }
  ], [activeStudentId, student, effortIndex, outcomeIndex]);

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

  const { data: milestones = [] } = useQuery({
    queryKey: ['milestones', activeStudentId],
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

  const { data: recommendations = [] } = useQuery({
    queryKey: ['recommendations', activeStudentId],
    queryFn: async () => {
      if (!activeStudentId) return [];
      const { data, error } = await supabase
        .from('recommendation_engine_rules')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false });
      if (error) throw error;
      return (data as any[] || []).map(d => ({
        id: d.id,
        title: (d.recommendation_text || '').split(':')[0] || 'Guidance',
        description: (d.recommendation_text || '').includes(':') ? d.recommendation_text.split(':')[1].trim() : (d.recommendation_text || 'No description'),
        urgency: (d.priority || 0) >= 10 ? 'High' : (d.priority || 0) >= 5 ? 'Medium' : 'Low',
        actionType: d.action_type || 'General'
      }));
    },
    enabled: !!activeStudentId
  });

  const { data: homeworkStatus = [] } = useQuery({
    queryKey: ['student-homework-records', activeStudentId, dateRange.from, dateRange.to],
    queryFn: async () => {
      if (!activeStudentId) return [];
      const { data, error } = await supabase
        .from('student_homework_records')
        .select('*, homework(*)')
        .eq('student_id', activeStudentId)
        .gte('created_at', `${dateRange.from}T00:00:00`)
        .lte('created_at', `${dateRange.to}T23:59:59`)
        .order('created_at', { ascending: false });
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

  // Standard dashboard data
  const { data: attendance = [] } = useQuery({
    queryKey: ['attendance', activeStudentId, dateRange.from, dateRange.to],
    queryFn: async () => {
      if (!activeStudentId) return [];
      const { data, error } = await supabase.from('attendance').select('*').eq('student_id', activeStudentId).gte('date', dateRange.from).lte('date', dateRange.to).order('date', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!activeStudentId
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['student-invoices-dashboard', activeStudentId],
    queryFn: async () => {
      if (!activeStudentId) return [];
      const { data, error } = await supabase.from('invoices').select('*').eq('student_id', activeStudentId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeStudentId
  });

  const attendanceRate = attendance.length > 0 ? Math.round((attendance.filter(a => a.status === 'present').length / attendance.length) * 100) : 0;
  const totalInvoiced = invoices.reduce((acc, inv) => acc + (inv?.total_amount || 0), 0);
  const totalPaid = invoices.reduce((acc, inv) => acc + (inv?.paid_amount || 0), 0);
  const outstandingDues = totalInvoiced - totalPaid;

  const { data: testResults = [] } = useQuery({
    queryKey: ['test-results-parent-dashboard', activeStudentId, dateRange.from, dateRange.to],
    queryFn: async () => {
      if (!activeStudentId) return [];
      const { data, error } = await supabase
        .from('test_results')
        .select('*, tests!inner(id, name, subject, total_marks, lesson_plan_id, questions)')
        .eq('student_id', activeStudentId)
        .gte('date_taken', dateRange.from)
        .lte('date_taken', dateRange.to)
        .order('date_taken', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!activeStudentId
  });

  const { data: disciplineIssues = [] } = useQuery({
    queryKey: ["student-discipline-issues-report", activeStudentId, dateRange],
    queryFn: async () => {
      if (!activeStudentId) return [];
      let query = supabase.from("discipline_issues").select("*, discipline_categories(name)")
        .eq("student_id", activeStudentId)
        .gte("issue_date", dateRange.from)
        .lte("issue_date", dateRange.to);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!activeStudentId
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["student-payments-report", activeStudentId, dateRange],
    queryFn: async () => {
      if (!activeStudentId) return [];
      const { data: invoiceIdsData, error: invError } = await supabase
        .from('invoices')
        .select('id')
        .eq('student_id', activeStudentId);

      if (invError) throw invError;
      if (!invoiceIdsData || invoiceIdsData.length === 0) return [];

      const invoiceIds = invoiceIdsData.map(inv => inv.id);
      const { data, error } = await supabase.from("payments").select("*")
        .in("invoice_id", invoiceIds)
        .gte("payment_date", dateRange.from)
        .lte("payment_date", dateRange.to);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!activeStudentId
  });

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
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-8 pb-24 md:pb-8 page-enter animate-in fade-in duration-1000">
      <DashboardHeader />
      <CommandCenter />

      {/* Hero Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-[1.75rem] bg-primary/10 border-2 border-primary/20 shadow-inner">
            <GraduationCap className="h-10 w-10 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary via-indigo-600 to-violet-600">
              Decision Intelligence
            </h1>
            <div className="flex items-center gap-2 mt-1">
               <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
               <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest">Parent Dashboard · {student?.name || "Active Scholar"}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 items-center">
          <Button
            onClick={() => navigate('/parent-snapshot')}
            className="rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black uppercase text-[10px] tracking-widest h-12 px-6 shadow-strong transition-all hover:scale-105"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Daily Snapshot
          </Button>

          {linkedStudents.length > 1 && (
            <Select value={selectedStudentId || ''} onValueChange={setSelectedStudentId}>
              <SelectTrigger className="w-56 bg-card/60 backdrop-blur-md border border-border/40 shadow-soft rounded-[1.25rem] font-black uppercase text-[10px] tracking-widest h-12 px-6">
                <SelectValue placeholder="Select Scholar" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-none shadow-strong backdrop-blur-xl bg-card/90">
                {linkedStudents.map((child) => (
                  <SelectItem key={child.id} value={child.id} className="font-black uppercase text-[10px] tracking-widest py-3">{child.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <KPICard title="Attendance Rate" value={`${attendanceRate}%`} description="Presence Index" icon={Clock} color="green" onClick={() => navigate("/parent/attendance?feature=Attendance%20Analytics")} />
        <KPICard title="Avg Performance" value={`${performanceTrends[performanceTrends.length-1]?.percentage || 0}%`} description="Evaluation Synthesis" icon={TrendingUp} color="purple" onClick={() => navigate("/parent/performance?feature=Performance%20Analytics")} />
        <KPICard title="Effort Score" value={`${Math.round(effortIndex)}/100`} description="Behavioral Engagement" icon={Activity} color="orange" onClick={() => navigate("/parent/performance?feature=Effort%20Analysis")} />
        <KPICard title="Fees Payable" value={formatCurrency(outstandingDues)} description="Outstanding Liability" icon={Wallet} color="rose" onClick={() => navigate("/parent/fees?feature=Fee%20Management")} />
      </div>

      {/* Intelligence Row 1: Trends and Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <PerformanceTrendsChart data={performanceTrends} subject={selectedSubject || "All Subjects"} />
        </div>
        <div className="lg:col-span-1">
          <EffortOutcomeMatrix data={effortOutcomeData} activeStudentId={activeStudentId || undefined} />
        </div>
      </div>

      {/* Intelligence Row 2: Action Plan and Homework Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <ActionPlanSection actions={recommendations} />
        </div>
        <div className="lg:col-span-1">
          <HomeworkHealth records={homeworkRecords} />
        </div>
      </div>

      {/* Intelligence Row 3: Celebrations and AI Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
           <CelebrationsGrowth milestones={milestones} />
        </div>
        <div className="lg:col-span-2">
           <AIInsightsWidget
             insights={aiInsights}
             title="Predictive Performance Alerts"
           />
        </div>
      </div>

      {/* Notice Board & Feedback */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <DigitalNoticeBoard centerId={user?.center_id || ""} role="parent" grade={student?.grade || undefined} />
        <div className="space-y-6">
          <div className="p-8 rounded-[2rem] bg-indigo-600 shadow-indigo-200 shadow-2xl text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
              <MessageSquare className="h-24 w-24" />
            </div>
            <div className="relative z-10 space-y-4">
              <h2 className="text-2xl font-black">Two-Way Collaboration Hub</h2>
              <p className="text-indigo-100 font-medium">Connect directly with subject teachers to discuss specific performance insights or behavior patterns.</p>
              <Button
                onClick={() => navigate('/parent-messages')}
                className="bg-white text-indigo-600 hover:bg-white/90 rounded-xl font-black uppercase text-[10px] tracking-widest px-8"
              >
                Open Messaging <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
          <SuggestionForm role="parent" />
        </div>
      </div>

      {/* Detailed Data Sections */}
      <div className="space-y-12 animate-in slide-in-from-bottom-8 duration-700">
          <div className="relative">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-muted" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-[hsl(var(--background))] px-4 text-sm font-bold uppercase tracking-[0.3em] text-muted-foreground/60">
                Detailed Academic Profile
              </span>
            </div>
          </div>

          {/* Finance Summary */}
          <Card className="border-none shadow-strong overflow-hidden rounded-2xl bg-card/60 backdrop-blur-md">
            <CardHeader className="bg-primary/5 pb-4 border-b border-primary/10">
              <CardTitle className="text-2xl font-bold flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Wallet className="h-6 w-6 text-primary" />
                </div>
                Financial Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 pt-4">
                <div className="text-[10px] md:text-sm font-semibold">Total Invoiced: {formatCurrency(totalInvoiced)}</div>
                <div className="text-[10px] md:text-sm font-semibold">Total Paid: {formatCurrency(totalPaid)}</div>
                <div className="text-[10px] md:text-sm font-bold text-rose-600">Outstanding Dues: {formatCurrency(outstandingDues)}</div>
              </div>
              <h3 className="font-semibold mb-2">Payment History</h3>
              {payments.length === 0 ? (
                <p className="text-muted-foreground text-sm italic">No payments recorded.</p>
              ) : (
                <div className="overflow-auto max-h-[300px] border rounded-xl custom-scrollbar">
                  <table className="w-full text-sm min-w-[600px]">
                    <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="border-b px-4 py-2 text-left">Date</th>
                        <th className="border-b px-4 py-2 text-left">Amount</th>
                        <th className="border-b px-4 py-2 text-left">Method</th>
                        <th className="border-b px-4 py-2 text-left">Reference</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/50">
                          <td className="border-b px-4 py-2">{safeFormatDate(p.payment_date, "PPP")}</td>
                          <td className="border-b px-4 py-2 font-bold">{formatCurrency(p.amount)}</td>
                          <td className="border-b px-4 py-2">{p.payment_method}</td>
                          <td className="border-b px-4 py-2">{p.reference_number || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attendance Overview */}
          <Card className="border-none shadow-strong overflow-hidden rounded-2xl bg-card/60 backdrop-blur-md">
            <CardHeader className="bg-green-500/5 pb-4 border-b border-green-500/10">
              <CardTitle className="text-2xl font-bold flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Clock className="h-6 w-6 text-green-600" />
                </div>
                Attendance Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 pt-4">
                <div className="text-[10px] md:text-sm font-semibold">Total Days: {attendance.length}</div>
                <div className="text-[10px] md:text-sm font-semibold text-green-600">Present: {attendance.filter(a => a.status === 'present').length}</div>
                <div className="text-[10px] md:text-sm font-semibold text-rose-600">Absent: {attendance.filter(a => a.status === 'absent').length}</div>
                <div className="text-[10px] md:text-sm font-bold">Attendance %: {attendanceRate}%</div>
              </div>
              <div className="overflow-auto max-h-[300px] border rounded-xl custom-scrollbar">
                <table className="w-full border-collapse text-sm min-w-[600px]">
                  <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="border-b px-4 py-2 text-left">Date</th>
                      <th className="border-b px-4 py-2 text-left">Status</th>
                      <th className="border-b px-4 py-2 text-left">Time In</th>
                      <th className="border-b px-4 py-2 text-left">Time Out</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50/50">
                        <td className="border-b px-4 py-2">{safeFormatDate(record.date, "PPP")}</td>
                        <td className="border-b px-4 py-2">
                          <Badge variant={record.status === 'present' ? 'success' : 'destructive'} className="uppercase text-[9px]">
                            {record.status}
                          </Badge>
                        </td>
                        <td className="border-b px-4 py-2">{record.time_in || "-"}</td>
                        <td className="border-b px-4 py-2">{record.time_out || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Test Report */}
          <Card className="border-none shadow-strong overflow-hidden rounded-2xl bg-card/60 backdrop-blur-md">
            <CardHeader className="bg-purple-500/5 pb-4 border-b border-purple-500/10">
              <CardTitle className="text-2xl font-bold flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <ClipboardCheck className="h-6 w-6 text-purple-600" />
                </div>
                Academic Test Records
              </CardTitle>
            </CardHeader>
            <CardContent>
              {testResults.length === 0 ? (
                <p className="text-muted-foreground text-sm italic py-4">No test results found.</p>
              ) : (
                <div className="overflow-auto max-h-[300px] border rounded-xl custom-scrollbar mt-4">
                  <table className="w-full text-sm min-w-[700px]">
                    <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="border-b px-4 py-2 text-left">Test Name</th>
                        <th className="border-b px-4 py-2 text-left">Subject</th>
                        <th className="border-b px-4 py-2 text-left">Date Taken</th>
                        <th className="border-b px-4 py-2 text-left">Marks</th>
                        <th className="border-b px-4 py-2 text-left">Percentage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {testResults.map((tr: any) => {
                        const percentage = tr.tests?.total_marks
                          ? Math.round((tr.marks_obtained / tr.tests.total_marks) * 100)
                          : 0;
                        return (
                          <tr key={tr.id} className="hover:bg-slate-50/50">
                            <td className="border-b px-4 py-2 font-medium">{tr.tests?.name || 'N/A'}</td>
                            <td className="border-b px-4 py-2">{tr.tests?.subject || 'N/A'}</td>
                            <td className="border-b px-4 py-2">{safeFormatDate(tr.date_taken, "PPP")}</td>
                            <td className="border-b px-4 py-2 font-bold">{tr.marks_obtained}/{tr.tests?.total_marks}</td>
                            <td className={cn("border-b px-4 py-2 font-bold", percentage >= 75 ? "text-green-600" : percentage >= 50 ? "text-orange-600" : "text-red-600")}>
                              {percentage}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Discipline Issues */}
          <Card className="border-none shadow-strong overflow-hidden rounded-2xl bg-card/60 backdrop-blur-md">
            <CardHeader className="bg-red-500/5 pb-4 border-b border-red-500/10">
              <CardTitle className="text-2xl font-bold flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                Behavioral Insight Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              {disciplineIssues.length === 0 ? (
                <p className="text-muted-foreground text-sm italic py-4">No discipline records found.</p>
              ) : (
                <div className="overflow-auto max-h-[300px] border rounded-xl custom-scrollbar mt-4">
                  <table className="w-full text-sm min-w-[700px]">
                    <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="border-b px-4 py-2 text-left">Category</th>
                        <th className="border-b px-4 py-2 text-left">Severity</th>
                        <th className="border-b px-4 py-2 text-left">Date</th>
                        <th className="border-b px-4 py-2 text-center">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {disciplineIssues.map((di: any) => (
                        <tr key={di.id} className="hover:bg-slate-50/50">
                          <td className="border-b px-4 py-2 font-medium">{di.discipline_categories?.name || 'N/A'}</td>
                          <td className="border-b px-4 py-2">
                            <Badge className={cn("text-[9px] font-black uppercase",
                              di.severity === "high" ? "bg-red-500" :
                              di.severity === "medium" ? "bg-orange-500" : "bg-green-500")}>
                              {di.severity}
                            </Badge>
                          </td>
                          <td className="border-b px-4 py-2">{safeFormatDate(di.issue_date, "PPP")}</td>
                          <td className="border-b px-4 py-2 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-[10px] font-bold uppercase text-primary bg-primary/5 hover:bg-primary/10 rounded-lg"
                              onClick={() => setSelectedDisciplineIssue(di)}
                            >
                              View
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
      </div>

      {/* Footer Navigation */}
      <div className="flex justify-center pt-8 border-t border-slate-100">
        <Button
          variant="outline"
          className="rounded-2xl border-2 font-black uppercase tracking-widest text-[10px] h-12 px-8 shadow-soft bg-white hover:bg-slate-50"
          onClick={() => navigate("/parent-student-report")}
        >
          <BarChart3 className="mr-2 h-4 w-4 text-primary" />
          Full Academic Dossier & Historical Reports
        </Button>
      </div>
    </div>
  );
}
