import React, { useMemo, useState, useEffect } from "react";
import { UserRole } from "@/types/roles";
import { AlertTriangle, ArrowRight, Bell, Book, BookOpen, Bus, Calendar, CalendarIcon, CheckCircle2, ChevronDown, Clock, FileText, Home, Package, Search, TrendingUp, Users, Wallet, GripVertical, Settings2, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { eachDayOfInterval, format, isFuture, isToday, startOfDay, subDays, subMonths, startOfYear } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import { KPICard } from "@/components/dashboard/KPICard";
import { AlertList } from "@/components/dashboard/AlertList";
import { ClassSchedule } from "@/components/dashboard/ClassSchedule";
import { hasActionPermission } from "@/utils/permissions";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { CommandCenter } from "@/components/dashboard/CommandCenter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { hasPermission } from "@/utils/permissions";
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar } from "recharts";
import { AIInsightsWidget } from "@/components/dashboard/AIInsightsWidget";
import { EffortOutcomeMatrix } from '@/components/parent/EffortOutcomeMatrix';
import { PerformanceTrendsChart } from '@/components/parent/PerformanceTrendsChart';
import { Target, Zap, Shield, CheckCircle, Activity } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LibraryManagement from "@/components/center/LibraryManagement";
import TransportManagement from "@/components/center/TransportManagement";
import AssetTracking from "@/components/center/AssetTracking";
import DigitalNoticeBoard from "@/components/center/NoticeBoard";
import { logger } from "@/utils/logger";

type AttendanceRange = "weekly" | "monthly" | "yearly" | "overall";

export default function Dashboard() {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const today = new Date().toISOString().split("T")[0];
  const centerId = user?.center_id;
  const role = user?.role;

  const [attendanceRange, setAttendanceRange] = useState<AttendanceRange>("weekly");
  const [selectedVacantClass, setSelectedVacantClass] = useState<any>(null);
  const [isCustomizeMode, setIsCustomizeMode] = useState(false);

  const canEditRoutine = hasActionPermission(user, 'class_routine', 'edit');
  const canEditDashboard = hasActionPermission(user, 'dashboard', 'edit');

  const [kpiOrder, setKpiOrder] = useState<string[]>([]);
  const [visibleWidgets, setVisibleWidgets] = useState<Record<string, boolean>>({});
  const [mainWidgetsOrder, setMainWidgetsOrder] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (user?.id && !isInitialized) {
      const savedKpi = localStorage.getItem(`dashboard-kpi-order-${user.id}`);
      const savedVisible = localStorage.getItem(`dashboard-visible-widgets-${user.id}`);
      const savedMain = localStorage.getItem(`dashboard-main-order-${user.id}`);

      const defaultVisible = {
        "students": true, "teachers": true, "student-attendance": true, "teacher-attendance": true,
        "lesson-plans": true, "approvals": true, "leave-requests": true, "messages": true,
        "attendance-overview": true, "ai-insights": true, "performers": true, "teacher-status": true, "financial-health": true,
        "leave-applications": true, "activities-discipline": true, "chapter-mastery": true, "academic-efficiency": true, "effort-outcome-distribution": true, "academic-trends": true, "notice-board": true, "alerts": true, "class-schedule": true,
        "pending-attendance": true
      };

      const defaultMain = [
        "attendance-overview", "pending-attendance", "ai-insights", "performers", "teacher-status", "leave-applications", "activities-discipline", "chapter-mastery", "academic-efficiency", "effort-outcome-distribution", "academic-trends"
      ];

      setKpiOrder(savedKpi ? JSON.parse(savedKpi) : [
        "students", "teachers", "student-attendance", "teacher-attendance",
        "lesson-plans", "approvals", "leave-requests", "messages"
      ]);

      // Merge saved visibility with defaults to ensure new widgets appear for existing users
      const parsedVisible = savedVisible ? JSON.parse(savedVisible) : {};
      setVisibleWidgets({ ...defaultVisible, ...parsedVisible });

      // Ensure new default widgets are added to the main order if they aren't there
      const parsedMain = savedMain ? JSON.parse(savedMain) : [];
      const mergedMain = [...parsedMain];
      defaultMain.forEach(id => {
        if (!mergedMain.includes(id)) mergedMain.push(id);
      });

      setMainWidgetsOrder(mergedMain.length > 0 ? mergedMain : defaultMain);

      setIsInitialized(true);
    }
  }, [user?.id, isInitialized]);

  useEffect(() => {
    if (user?.id && isInitialized) {
      localStorage.setItem(`dashboard-kpi-order-${user.id}`, JSON.stringify(kpiOrder));
      localStorage.setItem(`dashboard-visible-widgets-${user.id}`, JSON.stringify(visibleWidgets));
      localStorage.setItem(`dashboard-main-order-${user.id}`, JSON.stringify(mainWidgetsOrder));
    }
  }, [kpiOrder, visibleWidgets, mainWidgetsOrder, user?.id, isInitialized]);

  // Real-time subscription for dashboard data
  useEffect(() => {
    if (!centerId) return;

    const channel = supabase
      .channel('dashboard-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance', filter: `center_id=eq.${centerId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["attendance-dashboard"] });
        queryClient.invalidateQueries({ queryKey: ["attendance-historical"] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teacher_attendance', filter: `center_id=eq.${centerId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["teacher-attendance-dashboard"] });
        queryClient.invalidateQueries({ queryKey: ["teacher-attendance-historical"] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leave_applications', filter: `center_id=eq.${centerId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["pending-leaves-count"] });
        queryClient.invalidateQueries({ queryKey: ["approved-leaves-dashboard"] });
        queryClient.invalidateQueries({ queryKey: ["leave-applications-dashboard"] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lesson_plans', filter: `center_id=eq.${centerId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["pending-lesson-plans-count"] });
        queryClient.invalidateQueries({ queryKey: ["upcoming-lessons-dashboard"] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [centerId, queryClient]);

  const handleDragStart = (e: React.DragEvent, type: 'kpi' | 'main', id: string) => {
    if (!isCustomizeMode) return;
    e.dataTransfer.setData('text/plain', JSON.stringify({ type, id }));
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.classList.add('opacity-40', 'scale-95', 'rotate-1');
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('opacity-40', 'scale-95', 'rotate-1', 'opacity-50');
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!isCustomizeMode) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetType: 'kpi' | 'main', targetId: string) => {
    if (!isCustomizeMode) return;
    e.preventDefault();

    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      const sourceType = data.type;
      const sourceId = data.id;

      if (sourceType !== targetType || sourceId === targetId) return;

      if (sourceType === 'kpi') {
        const newOrder = [...kpiOrder];
        const sourceIdx = newOrder.indexOf(sourceId);
        const targetIdx = newOrder.indexOf(targetId);

        if (sourceIdx === -1 || targetIdx === -1) return;

        newOrder.splice(sourceIdx, 1);
        newOrder.splice(targetIdx, 0, sourceId);
        setKpiOrder(newOrder);
        toast.success("KPI layout updated", { duration: 1000 });
      } else {
        const newOrder = [...mainWidgetsOrder];
        const sourceIdx = newOrder.indexOf(sourceId);
        const targetIdx = newOrder.indexOf(targetId);

        if (sourceIdx === -1 || targetIdx === -1) return;

        newOrder.splice(sourceIdx, 1);
        newOrder.splice(targetIdx, 0, sourceId);
        setMainWidgetsOrder(newOrder);
        toast.success("Widget layout updated", { duration: 1000 });
      }
    } catch (err) {
      logger.error("Drop error:", err);
    }
  };

  const toggleWidgetVisibility = (id: string) => {
    setVisibleWidgets(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Compute date range based on attendance selector
  const dateRange = useMemo(() => {
    const to = today;
    let from: string;
    switch (attendanceRange) {
      case "weekly": from = subDays(new Date(), 7).toISOString().split("T")[0]; break;
      case "monthly": from = subDays(new Date(), 30).toISOString().split("T")[0]; break;
      case "yearly": from = startOfYear(new Date()).toISOString().split("T")[0]; break;
      case "overall": from = "2020-01-01"; break;
      default: from = subDays(new Date(), 7).toISOString().split("T")[0];
    }
    return { from, to };
  }, [attendanceRange, today]);

  // Data Fetching
  const { data: myAssignedGrades = [] } = useQuery({
    queryKey: ["my-assigned-grades", user?.teacher_id],
    queryFn: async () => {
      if (!user?.teacher_id || user?.role !== UserRole.TEACHER) return [];
      const { data: assignments } = await supabase.from('class_teacher_assignments').select('grade').eq('teacher_id', user.teacher_id);
      const { data: schedules } = await supabase.from('period_schedules').select('grade').eq('teacher_id', user.teacher_id);
      const combined = [...(assignments?.map(a => a.grade) || []), ...(schedules?.map(s => s.grade) || [])];
      return Array.from(new Set(combined));
    },
    enabled: !!user?.teacher_id && user?.role === UserRole.TEACHER
  });

  const isRestricted = user?.role === UserRole.TEACHER && user?.teacher_scope_mode !== 'full';

  const { data: students = [], isLoading: isStudentsLoading } = useQuery({
    queryKey: ["students", centerId, isRestricted, myAssignedGrades],
    queryFn: async () => {
      let query = supabase.from("students").select("*").eq("is_active", true).order("name");
      if (role !== UserRole.ADMIN && centerId) query = query.eq("center_id", centerId);

      // SECURITY: Frontend filtering is for UI/UX. RLS enforces the actual restriction.
      // We allow the query to run to ensure cards still render even if empty.
      if (isRestricted && myAssignedGrades.length > 0) {
        query = query.in('grade', myAssignedGrades);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !loading,
  });

  const { data: teachers = [], isLoading: isTeachersLoading } = useQuery({
    queryKey: ["teachers", centerId],
    queryFn: async () => {
      if (!centerId) return [];
      const { data, error } = await supabase.from("teachers").select("*").eq("center_id", centerId).eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!centerId,
  });

  const { data: pendingLeavesCount = 0 } = useQuery({
    queryKey: ["pending-leaves-count", centerId],
    queryFn: async () => {
      if (!centerId) return 0;
      const { count, error } = await supabase
        .from("leave_applications")
        .select("*", { count: "exact", head: true })
        .eq("center_id", centerId)
        .eq("status", "pending");
      if (error) throw error;
      return count || 0;
    },
    enabled: !!centerId,
  });

  const { data: allAttendance = [] } = useQuery({
    queryKey: ["attendance-dashboard", centerId, today, isRestricted, myAssignedGrades],
    queryFn: async () => {
      if (!centerId) return [];
      let query = supabase.from("attendance").select("student_id, status, date, students!inner(grade)").eq("center_id", centerId).eq("date", today);

      if (isRestricted && myAssignedGrades.length > 0) {
        query = query.in('students.grade', myAssignedGrades);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!centerId,
  });

  const { data: centerAiInsights = [] } = useQuery({
    queryKey: ['center-ai-insights', centerId],
    queryFn: async () => {
      if (!centerId) return [];
      const [riskScores, feePredictions, sentimentInsights] = await Promise.all([
        supabase.from('predictive_scores').select('*, students(name)').eq('center_id', centerId).neq('risk_level', 'Low').limit(5),
        supabase.from('fee_default_predictions').select('*, students(name)').eq('center_id', centerId).eq('risk_level', 'High').limit(5),
        supabase.from('ai_insights').select('*').eq('center_id', centerId).lt('sentiment_score', -0.5).limit(5)
      ]);

      const insights: any[] = [];

      (riskScores.data || []).forEach(d => insights.push({
        id: d.id, type: 'risk', level: d.risk_level, title: `Academic Risk: ${d.students?.name}`, description: `Attendance/Grades risk score is ${d.risk_score}/100.`, studentName: d.students?.name, factors: d.factors
      }));

      (feePredictions.data || []).forEach(d => insights.push({
        id: d.id, type: 'fee', level: d.risk_level, title: `Fee Default Risk: ${d.students?.name}`, description: `High probability of payment default detected.`, studentName: d.students?.name, factors: d.factors
      }));

      (sentimentInsights.data || []).forEach(d => insights.push({
        id: d.id, type: 'sentiment', level: 'High', title: `Negative Sentiment Detected`, description: d.content, factors: { score: d.sentiment_score }
      }));

      return insights;
    },
    enabled: !!centerId
  });

  const { data: teacherAttendance = [] } = useQuery({
    queryKey: ["teacher-attendance-dashboard", centerId, today],
    queryFn: async () => {
      if (!centerId) return [];
      const { data, error } = await supabase.from("teacher_attendance").select("*, teachers(*)").eq("center_id", centerId).eq("date", today);
      if (error) throw error;
      return data || [];
    },
    enabled: !!centerId,
  });

  const { data: todayApprovedLeaves = [] } = useQuery({
    queryKey: ["approved-leaves-dashboard", centerId, today],
    queryFn: async () => {
      if (!centerId) return [];
      const { data, error } = await supabase
        .from("leave_applications")
        .select("*")
        .eq("center_id", centerId)
        .eq("status", "approved")
        .lte("start_date", today)
        .gte("end_date", today);
      if (error) throw error;
      return data || [];
    },
    enabled: !!centerId,
  });

  const { data: homeworkStats = [] } = useQuery({
    queryKey: ["homework-stats-dashboard", centerId, dateRange.from, dateRange.to, isRestricted],
    queryFn: async () => {
      if (!centerId) return [];
      let query = supabase
        .from("student_homework_records")
        .select("status, created_at, homework!inner(center_id, teacher_id)")
        .eq("homework.center_id", centerId)
        .gte("created_at", `${dateRange.from}T00:00:00`)
        .lte("created_at", `${dateRange.to}T23:59:59`);

      if (isRestricted) {
        query = query.eq('homework.teacher_id', user?.teacher_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!centerId,
  });

  const { data: evaluationStats = [] } = useQuery({
    queryKey: ["evaluation-stats-dashboard", centerId, dateRange.from, dateRange.to, isRestricted],
    queryFn: async () => {
      if (!centerId) return [];
      let query = supabase
        .from("student_chapters")
        .select("completed, completed_at, evaluation_rating, lesson_plans!inner(center_id, teacher_id)")
        .eq("lesson_plans.center_id", centerId)
        .gte("completed_at", `${dateRange.from}T00:00:00`)
        .lte("completed_at", `${dateRange.to}T23:59:59`);

      if (isRestricted) {
        query = query.eq('lesson_plans.teacher_id', user?.teacher_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!centerId,
  });

  const { data: pendingLessonPlansCount = 0 } = useQuery({
    queryKey: ["pending-lesson-plans-count", centerId],
    queryFn: async () => {
      if (!centerId) return 0;
      const { count, error } = await supabase
        .from("lesson_plans")
        .select("*", { count: "exact", head: true })
        .eq("center_id", centerId)
        .eq("status", "pending");
      if (error) throw error;
      return count || 0;
    },
    enabled: !!centerId,
  });

  // Recent activities for preview card
  const { data: recentActivities = [] } = useQuery({
    queryKey: ["recent-activities-dashboard", centerId, isRestricted, user?.id],
    queryFn: async () => {
      if (!centerId) return [];
      let query = supabase
        .from("activities")
        .select("id, name, title, grade, activity_date")
        .eq("center_id", centerId)
        .order("activity_date", { ascending: false })
        .limit(5);

      if (isRestricted && user?.id) {
        query = query.eq('created_by', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!centerId,
  });

  // Recent discipline issues for preview card
  const { data: recentDiscipline = [] } = useQuery({
    queryKey: ["recent-discipline-dashboard", centerId, isRestricted, myAssignedGrades, user?.id],
    queryFn: async () => {
      if (!centerId) return [];
      let query = supabase
        .from("discipline_issues")
        .select("id, description, severity, issue_date, reported_by, students!inner(name, grade)")
        .eq("center_id", centerId)
        .eq("status", "open")
        .order("issue_date", { ascending: false })
        .limit(5);

      if (isRestricted && user?.id) {
        // To avoid complex cross-table OR filters in PostgREST, we first get student IDs for the assigned grades
        const { data: assignedStudents } = await supabase
          .from('students')
          .select('id')
          .in('grade', myAssignedGrades);

        const studentIds = assignedStudents?.map(s => s.id) || [];

        // Teacher sees their own reports OR reports for their assigned students
        const conditions = [`reported_by.eq.${user.id}`];
        if (studentIds.length > 0) {
          conditions.push(`student_id.in.(${studentIds.join(',')})`);
        }
        query = query.or(conditions.join(','));
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!centerId,
  });

  const { data: pendingAttendanceByGrade = [] } = useQuery({
    queryKey: ["pending-attendance-by-grade", centerId, today],
    queryFn: async () => {
      if (!centerId) return [];
      const { data, error } = await supabase.rpc("get_pending_attendance_by_grade", {
        p_center_id: centerId,
        p_date: today
      });
      if (error) throw error;
      return data || [];
    },
    enabled: !!centerId,
  });

  const { data: pendingTeachers = [] } = useQuery({
    queryKey: ["pending-teacher-attendance", centerId, today],
    queryFn: async () => {
      if (!centerId) return [];
      const { data, error } = await supabase.rpc("get_pending_teacher_attendance", {
        p_center_id: centerId,
        p_date: today
      });
      if (error) throw error;
      return data || [];
    },
    enabled: !!centerId,
  });

  const { data: upcomingLessons = [] } = useQuery({
    queryKey: ["upcoming-lessons-dashboard", centerId, today, isRestricted],
    queryFn: async () => {
      if (!centerId) return [];
      let query = supabase.from("lesson_plans").select("*").eq("center_id", centerId).gte("lesson_date", today).order("lesson_date").limit(8);

      if (isRestricted) {
        query = query.eq('teacher_id', user?.teacher_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!centerId,
  });

  const { data: recentTestResults = [] } = useQuery({
    queryKey: ["recent-test-results-dashboard", centerId, dateRange.from, dateRange.to, isRestricted],
    queryFn: async () => {
      if (!centerId) return [];
      let query = supabase
        .from("test_results")
        .select("*, students(name, grade), tests!inner(name, total_marks, subject, created_by)")
        .gte("date_taken", dateRange.from)
        .lte("date_taken", dateRange.to)
        .order("date_taken", { ascending: false });

      if (isRestricted) {
        query = query.eq('tests.created_by', user?.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!centerId,
  });

  const { data: invoicesInRange = [] } = useQuery({
    queryKey: ["invoices-dashboard", centerId, dateRange.from, dateRange.to],
    queryFn: async () => {
      if (!centerId) return [];
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("center_id", centerId)
        .gte("invoice_date", dateRange.from)
        .lte("invoice_date", dateRange.to);
      if (error) throw error;
      return data || [];
    },
    enabled: !!centerId,
  });

  const { data: historicalAttendance = [] } = useQuery({
    queryKey: ["attendance-historical", centerId, dateRange.from, dateRange.to],
    queryFn: async () => {
      if (!centerId) return [];
      const { data, error } = await supabase
        .from("attendance")
        .select("date, status")
        .eq("center_id", centerId)
        .gte("date", dateRange.from)
        .lte("date", dateRange.to)
        .order("date");
      if (error) throw error;
      return data || [];
    },
    enabled: !!centerId,
  });

  const { data: historicalTeacherAttendance = [] } = useQuery({
    queryKey: ["teacher-attendance-historical", centerId, dateRange.from, dateRange.to],
    queryFn: async () => {
      if (!centerId) return [];
      const { data, error } = await supabase
        .from("teacher_attendance")
        .select("date, status")
        .eq("center_id", centerId)
        .gte("date", dateRange.from)
        .lte("date", dateRange.to)
        .order("date");
      if (error) throw error;
      return data || [];
    },
    enabled: !!centerId,
  });

  const { data: testTrend = [] } = useQuery({
    queryKey: ["test-performance-trend", centerId, dateRange.from, dateRange.to],
    queryFn: async () => {
      if (!centerId) return [];
      const { data, error } = await supabase
        .from("test_results")
        .select("date_taken, marks_obtained, tests(total_marks)")
        .gte("date_taken", dateRange.from)
        .lte("date_taken", dateRange.to)
        .order("date_taken");
      if (error) throw error;
      return data || [];
    },
    enabled: !!centerId,
  });

  // Today's class schedule - connected to period_schedules
  const { data: periodSchedules = [] } = useQuery({
    queryKey: ["period-schedules-dashboard", centerId, isRestricted],
    queryFn: async () => {
      if (!centerId) return [];
      const dayOfWeek = new Date().getDay();

      // No routines scheduled for Saturday (6)
      if (dayOfWeek === 6) return [];

      let query = supabase
        .from("period_schedules")
        .select("*, teachers:teachers!period_schedules_teacher_id_fkey(*), substitute_teacher:teachers!period_schedules_substitute_teacher_id_fkey(name), class_periods:class_periods!inner(*)")
        .eq("center_id", centerId)
        .eq("day_of_week", dayOfWeek);

      if (role !== UserRole.ADMIN && role !== UserRole.CENTER && role !== 'super_admin') {
        query = query.eq("class_periods.is_published", true);
      }

      if (isRestricted) {
        query = query.eq('teacher_id', user?.teacher_id);
      }

      const { data, error } = await query.order('class_period_id', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!centerId,
  });

  const { data: substitutions = [] } = useQuery({
    queryKey: ["class-substitutions", centerId, today],
    queryFn: async () => {
      if (!centerId) return [];
      const { data, error } = await supabase
        .from("class_substitutions")
        .select("*, substitute_teacher:teachers!substitute_teacher_id(name)")
        .eq("center_id", centerId)
        .eq("date", today);
      if (error) throw error;
      return data || [];
    },
    enabled: !!centerId,
  });

  const { data: leaveApplications = [] } = useQuery({
    queryKey: ["leave-applications-dashboard", centerId],
    queryFn: async () => {
      if (!centerId) return [];
      const { data, error } = await supabase
        .from("leave_applications")
        .select("*, teachers(name), students(name, grade), leave_categories(name)")
        .eq("center_id", centerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!centerId,
  });

  const { data: homeworkDefaulters = [] } = useQuery({
    queryKey: ["homework-defaulters-dashboard", centerId],
    queryFn: async () => {
      if (!centerId) return [];
      const { data, error } = await supabase.from("student_homework_records").select("*, students(name, grade), homework(title, subject, due_date)").eq("status", "assigned").order("created_at", { ascending: false }).limit(5);
      if (error) throw error;
      return data || [];
    },
    enabled: !!centerId,
  });

  // Memos
  const attendanceTrend = useMemo(() => {
    const range = eachDayOfInterval({ start: new Date(dateRange.from), end: new Date(dateRange.to) });
    return range.map((day) => {
      const dayStr = format(day, "yyyy-MM-dd");
      const dayRecords = historicalAttendance.filter((a) => a.date === dayStr);
      const present = dayRecords.filter((a) => a.status === "present" || a.status === "late").length;
      const total = dayRecords.length;
      return { date: format(day, "MMM d"), value: total > 0 ? Math.round((present / total) * 100) : 0, fullDate: dayStr };
    });
  }, [historicalAttendance, dateRange]);

  const teacherAttendanceTrend = useMemo(() => {
    const range = eachDayOfInterval({ start: new Date(dateRange.from), end: new Date(dateRange.to) });
    return range.map((day) => {
      const dayStr = format(day, "yyyy-MM-dd");
      const dayRecords = historicalTeacherAttendance.filter((a) => a.date === dayStr);
      const present = dayRecords.filter((a) => a.status === "present").length;
      const total = dayRecords.length;
      return { date: format(day, "MMM d"), value: total > 0 ? Math.round((present / total) * 100) : 0, fullDate: dayStr };
    });
  }, [historicalTeacherAttendance, dateRange]);

  const performanceTrend = useMemo(() => {
    const grouped = testTrend.reduce((acc: any, curr: any) => {
      const date = curr.date_taken;
      if (!acc[date]) acc[date] = { total: 0, count: 0 };
      const percentage = (curr.marks_obtained / (curr.tests?.total_marks || 100)) * 100;
      acc[date].total += percentage;
      acc[date].count += 1;
      return acc;
    }, {});
    return Object.keys(grouped)
      .map((date) => ({ date: format(new Date(date), "MMM d"), value: Math.round(grouped[date].total / grouped[date].count) }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-7);
  }, [testTrend]);

  const overviewTrend = useMemo(() => {
    const range = eachDayOfInterval({ start: new Date(dateRange.from), end: new Date(dateRange.to) });
    // For yearly/overall, group by week/month to avoid too many data points
    const maxPoints = attendanceRange === "yearly" || attendanceRange === "overall" ? 12 : range.length;
    const step = Math.max(1, Math.floor(range.length / maxPoints));
    
    const points: any[] = [];
    for (let i = 0; i < range.length; i += step) {
      const chunk = range.slice(i, i + step);
      let sPres = 0, sTotal = 0, tPres = 0, tTotal = 0;
      chunk.forEach(day => {
        const dayStr = format(day, "yyyy-MM-dd");
        const sRecs = historicalAttendance.filter((a) => a.date === dayStr);
        const tRecs = historicalTeacherAttendance.filter((a) => a.date === dayStr);
        sPres += sRecs.filter((a) => a.status === "present" || a.status === "late").length;
        sTotal += sRecs.length;
        tPres += tRecs.filter((a) => a.status === "present" || a.status === "late").length;
        tTotal += tRecs.length;
      });
      points.push({
        name: format(chunk[0], attendanceRange === "yearly" || attendanceRange === "overall" ? "MMM" : "eee"),
        Students: sTotal > 0 ? Math.round((sPres / sTotal) * 100) : 0,
        Teachers: tTotal > 0 ? Math.round((tPres / tTotal) * 100) : 0,
      });
    }
    return points;
  }, [historicalAttendance, historicalTeacherAttendance, dateRange, attendanceRange]);

  const totalStudents = students.length;
  const presentCount = allAttendance.filter((a) => a.status === "present" || a.status === "late").length;
  const teacherPresentCount = teacherAttendance.filter((a) => a.status === "present" || a.status === "late").length;
  const studentAttendanceRate = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;
  const teacherAttendanceRate = teachers.length > 0 ? Math.round((teacherPresentCount / teachers.length) * 100) : 0;
  const completedHomework = homeworkStats.filter((h) => ["completed", "checked"].includes(h.status || "")).length;
  const homeworkRate = homeworkStats.length > 0 ? Math.round((completedHomework / homeworkStats.length) * 100) : 0;
  const ratedEvaluations = evaluationStats.filter((e) => e.evaluation_rating !== null).length;
  const evaluationRate = evaluationStats.length > 0 ? Math.round((ratedEvaluations / evaluationStats.length) * 100) : 0;
  const avgTestScore = performanceTrend.length > 0 ? performanceTrend[performanceTrend.length - 1].value : 0;
  const isDemo = user?.username === 'demo@eduflow.com' || user?.username === 'demo';
  const feeCollection = isDemo ? 85000 : invoicesInRange.reduce((acc, curr) => acc + (curr.paid_amount || 0), 0);
  const totalInvoiced = isDemo ? 100000 : invoicesInRange.reduce((acc, curr) => acc + (curr.total_amount || 0), 0);
  const collectionRate = totalInvoiced > 0 ? Math.round((feeCollection / totalInvoiced) * 100) : 0;

  const highestPerformers = useMemo(() => {
    return [...recentTestResults]
      .sort((a: any, b: any) => {
        const aP = (a.marks_obtained / (a.tests?.total_marks || 100)) * 100;
        const bP = (b.marks_obtained / (b.tests?.total_marks || 100)) * 100;
        return bP - aP;
      })
      .slice(0, 50);
  }, [recentTestResults]);

  const lowestPerformers = useMemo(() => {
    return [...recentTestResults]
      .filter((r: any) => (r.marks_obtained / (r.tests?.total_marks || 100)) < 0.4)
      .sort((a: any, b: any) => {
        const aP = (a.marks_obtained / (a.tests?.total_marks || 100)) * 100;
        const bP = (b.marks_obtained / (b.tests?.total_marks || 100)) * 100;
        return aP - bP;
      })
      .slice(0, 50);
  }, [recentTestResults]);

  // Connect instruction grid to period_schedules with current day
  const todayClasses = useMemo(() => {
    return periodSchedules.map((ps: any) => {
      const sub = substitutions.find((s: any) => s.period_schedule_id === ps.id);

      const isMissingAttendance = !sub && ps.teacher_id && (() => {
        const att = teacherAttendance.find((a: any) => a.teacher_id === ps.teacher_id);
        if (att) return false;
        // Check if teacher is on approved leave
        const leave = todayApprovedLeaves.find((l: any) => l.teacher_id === ps.teacher_id);
        if (leave) return true;

        if (!ps.teachers?.expected_check_in) return false;
        const [h, m] = ps.teachers.expected_check_in.split(':').map(Number);
        const cutoff = new Date(); cutoff.setHours(h, m, 0);
        return new Date() > cutoff;
      })();

      const isOnLeave = !sub && ps.teacher_id && (() => {
        const leave = todayApprovedLeaves.find((l: any) => l.teacher_id === ps.teacher_id);
        if (!leave) return false;

        // Mid-day leave check
        if (leave.start_time && leave.end_time && ps.class_periods) {
          const [sh, sm] = ps.class_periods.start_time.split(':').map(Number);
          const [eh, em] = ps.class_periods.end_time.split(':').map(Number);
          const periodStart = sh * 60 + sm;
          const periodEnd = eh * 60 + em;

          const [lsh, lsm] = leave.start_time.split(':').map(Number);
          const [leh, lem] = leave.end_time.split(':').map(Number);
          const leaveStart = lsh * 60 + lsm;
          const leaveEnd = leh * 60 + lem;

          return periodStart < leaveEnd && periodEnd > leaveStart;
        }
        return true; // Full day leave
      })();

      return {
      id: ps.id,
      teacher_id: ps.teacher_id,
      class_period_id: ps.class_period_id,
      time: ps.class_periods ? `${ps.class_periods.start_time?.slice(0, 5)} – ${ps.class_periods.end_time?.slice(0, 5)}` : "N/A",
      grade: ps.grade,
      teacher: (sub || ps.substitute_teacher) ? `${sub?.substitute_teacher?.name || ps.substitute_teacher?.name} (Sub)` : (ps.teachers?.name || "Unassigned"),
      subject: ps.subject,
      isSubstitution: !!sub || !!ps.substitute_teacher,
      isVacant: !sub && !ps.substitute_teacher && (!ps.teacher_id || isMissingAttendance || isOnLeave || (() => {
        const att = teacherAttendance.find((a: any) => a.teacher_id === ps.teacher_id);
        return att?.status === 'absent' || att?.status === 'leave';
      })()),
      status: (() => {
        if (!ps.class_periods) return "upcoming" as const;
        const now = new Date();
        const [sh, sm] = (ps.class_periods.start_time || "").split(":").map(Number);
        const [eh, em] = (ps.class_periods.end_time || "").split(":").map(Number);
        const startMin = sh * 60 + sm;
        const endMin = eh * 60 + em;
        const nowMin = now.getHours() * 60 + now.getMinutes();
        if (nowMin >= endMin) return "completed" as const;
        if (nowMin >= startMin) return "running" as const;
        return "upcoming" as const;
      })(),
    };}).sort((a: any, b: any) => a.time.localeCompare(b.time));
  }, [periodSchedules, substitutions, teacherAttendance]);

  const { data: aiInsightNotifications = [] } = useQuery({
    queryKey: ['ai-insight-notifications', centerId],
    queryFn: async () => {
      if (!centerId) return [];
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('center_id', centerId)
        .eq('is_ai_insight', true)
        .order('created_at', { ascending: false })
        .limit(5);
      return (data || []).map(n => ({
        id: n.id,
        title: n.title,
        description: n.message,
        type: n.type as any,
        timestamp: n.created_at,
        is_ai_insight: true
      }));
    },
    enabled: !!centerId
  });

  const recentAlerts = [
    ...aiInsightNotifications,
    ...pendingAttendanceByGrade.map((p: any) => ({
      id: `pending-att-${p.grade}`,
      title: `Pending Attendance: Grade ${p.grade}`,
      description: `${p.pending_count} students records missing for today`,
      type: "warning" as const,
      timestamp: new Date().toISOString(),
      onClick: () => navigate(user?.role === UserRole.TEACHER ? "/teacher/take-attendance" : "/attendance")
    })),
    ...pendingTeachers.map((p: any) => ({
      id: `pending-teacher-att-${p.teacher_id}`,
      title: `Pending Attendance: ${p.teacher_name}`,
      description: `Faculty attendance not recorded for today`,
      type: "warning" as const,
      timestamp: new Date().toISOString(),
      onClick: () => navigate("/teacher-attendance")
    })),
    ...allAttendance
      .filter((a) => a.status === "absent")
      .slice(0, 3)
      .map((a) => ({
        id: `absent-${a.student_id}`,
        title: `${students.find((s) => s.id === a.student_id)?.name || "Student"} absent today`,
        type: "warning" as const,
        timestamp: new Date().toISOString(),
      })),
    ...homeworkDefaulters.slice(0, 2).map((h) => ({
      id: `hw-${h.id}`,
      title: `Homework pending for Grade ${h.students?.grade}`,
      description: h.students?.name,
      type: "info" as const,
      timestamp: h.created_at,
    })),
    ...(pendingLeavesCount > 0 && hasPermission(user, 'leave_management') ? [{
      id: "pending-leaves",
      title: `${pendingLeavesCount} Pending Leave Applications`,
      description: "Needs center admin review",
      type: "warning" as const,
      timestamp: new Date().toISOString(),
      onClick: () => navigate("/leave-management")
    }] : []),
    ...(pendingLessonPlansCount > 0 && hasPermission(user, 'lesson_plans') ? [{
      id: "pending-lesson-plans",
      title: `${pendingLessonPlansCount} Pending Lesson Plans`,
      description: "Needs pedagogical review",
      type: "info" as const,
      timestamp: new Date().toISOString(),
      onClick: () => navigate("/lesson-plans")
    }] : []),
    ...todayClasses.filter(c => c.isVacant && !c.isSubstitution && c.status !== 'completed').map(c => ({
      id: `vacant-${c.id}`,
      title: `Vacant Class: Grade ${c.grade} ${c.subject}`,
      description: `Period ${c.time} is currently unassigned or teacher is absent.`,
      type: "error" as const,
      timestamp: new Date().toISOString(),
    })),
    ...periodSchedules.filter(ps => {
      const att = teacherAttendance.find(a => a.teacher_id === ps.teacher_id);
      if (att) return false; // Attendance marked
      if (!ps.teachers?.expected_check_in) return false;
      const [h, m] = ps.teachers.expected_check_in.split(':').map(Number);
      const cutoff = new Date(); cutoff.setHours(h, m, 0);
      return new Date() > cutoff;
    }).map(ps => {
      const cls = todayClasses.find(c => c.id === ps.id);
      return {
        id: `vacant-${ps.id}`, // Reuse vacant ID to trigger dialog
        title: `Missing Attendance: ${ps.teachers?.name}`,
        description: `Expected check-in was at ${ps.teachers?.expected_check_in}. Class: Grade ${ps.grade} ${ps.subject}`,
        type: "warning" as const,
        timestamp: new Date().toISOString(),
      };
    })
  ].slice(0, 10);

  const availableTeachers = useMemo(() => {
    if (!selectedVacantClass) return [];

    // 1. Get all present teachers today
    const presentTeachers = teacherAttendance
      .filter(a => a.status === 'present')
      .map(a => a.teacher_id);

    // 2. Filter out those who have a class in THIS period in period_schedules
    const busyTeachers = periodSchedules
      .filter(ps => ps.class_period_id === selectedVacantClass.class_period_id)
      .map(ps => ps.teacher_id);

    // 3. Filter out those who have a substitution in THIS period today
    const busyBySub = substitutions
      .filter(s => {
        // If the substitution itself has the class_period_id (might not, depends on JOIN)
        // or if we find it via period_schedules
        const ps = periodSchedules.find(p => p.id === s.period_schedule_id);
        // Important: check both if substitution has direct period_id OR linked period_schedule has it
        const periodId = s.class_period_id || ps?.class_period_id || s.period_schedules?.class_period_id;
        return periodId === selectedVacantClass.class_period_id;
      })
      .map(s => s.substitute_teacher_id);

    return teachers.filter(t => {
      const isPresent = presentTeachers.includes(t.id);
      const isBusyRegular = busyTeachers.includes(t.id);
      const isBusySub = busyBySub.includes(t.id);

      return isPresent && !isBusyRegular && !isBusySub;
    });
  }, [selectedVacantClass, teacherAttendance, periodSchedules, substitutions, teachers]);

  const assignSubstitutionMutation = useMutation({
    mutationFn: async (teacherId: string) => {
      if (!centerId || !selectedVacantClass) throw new Error("Missing center ID or class selection");

      const { error } = await supabase.from('class_substitutions').insert({
        center_id: centerId,
        period_schedule_id: selectedVacantClass.id,
        date: today,
        substitute_teacher_id: teacherId,
        original_teacher_id: selectedVacantClass.teacher_id || null,
        status: 'assigned'
      });
      if (error) throw error;

      if (!canEditRoutine) throw new Error("Access Denied: You do not have permission to assign substitutions.");

      // Create notification for the substitute teacher
      const subTeacher = teachers.find(t => t.id === teacherId);
      if (subTeacher?.user_id) {
        const { error: notifError } = await supabase.from('notifications').insert({
          user_id: subTeacher.user_id,
          center_id: centerId,
          title: 'New Substitution Assigned',
          message: `You have been assigned to cover Grade ${selectedVacantClass.grade} ${selectedVacantClass.subject} at ${selectedVacantClass.time}.`,
          type: 'info',
          link: '/teacher/class-routine'
        });
        if (notifError) logger.error("Error sending substitution notification:", notifError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class-substitutions"] });
      toast.success("Substitution assigned successfully!");
      setSelectedVacantClass(null);
    },
    onError: (err: any) => {
      logger.error("Substitution assignment error:", err);
      toast.error(err.message || "Failed to assign substitution");
    }
  });


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

  const isLoading = isStudentsLoading || isTeachersLoading;

  const getDelta = (trend: any[]) => {
    if (trend.length < 2) return 0;
    const current = trend[trend.length - 1].value;
    const previous = trend[trend.length - 2].value;
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const renderKPICard = (id: string) => {
    if (!visibleWidgets[id] && !isCustomizeMode) return null;

    const cards: Record<string, React.ReactNode> = {
      "students": hasPermission(user, 'register_student') ? (
        <KPICard
          title="Students"
          value={totalStudents}
          description="Active Enrollments"
          icon={Users}
          color="indigo"
          delta={students.length > 5 ? 2.4 : 0}
          target={95}
          onClick={() => navigate("/register")}
        />
      ) : null,
      "teachers": hasPermission(user, 'teacher_management') ? (
        <KPICard
          title="Teachers"
          value={teachers.length}
          description="Active Faculty"
          icon={Users}
          color="blue"
          delta={teachers.length > 2 ? 0.5 : 0}
          onClick={() => navigate("/teachers")}
        />
      ) : null,
      "student-attendance": hasPermission(user, 'take_attendance') ? (
        <KPICard
          title="Student Attendance"
          value={`${studentAttendanceRate}%`}
          description="Presence Index"
          icon={CheckCircle2}
          color="green"
          trendData={attendanceTrend}
          delta={getDelta(attendanceTrend)}
          target={studentAttendanceRate}
          onClick={() => navigate(user?.role === UserRole.TEACHER ? "/teacher/take-attendance" : "/attendance")}
        />
      ) : null,
      "teacher-attendance": hasPermission(user, 'teachers_attendance') ? (
        <KPICard
          title="Teacher Attendance"
          value={`${teacherAttendanceRate}%`}
          description="Daily Logging"
          icon={Clock}
          color="orange"
          trendData={teacherAttendanceTrend}
          delta={getDelta(teacherAttendanceTrend)}
          target={teacherAttendanceRate}
          onClick={() => navigate("/teacher-attendance")}
        />
      ) : null,
      "lesson-plans": hasPermission(user, 'lesson_plans') ? (
        <KPICard
          title="Lesson Plans"
          value={upcomingLessons.length}
          description="Pedagogical Assets"
          icon={FileText}
          color="purple"
          delta={upcomingLessons.length > 0 ? 5 : 0}
          onClick={() => navigate("/lesson-plans")}
        />
      ) : null,
      "approvals": hasPermission(user, 'lesson_plans') ? (
        <KPICard
          title="Approvals"
          value={pendingLessonPlansCount}
          description="Pending Review"
          icon={CheckCircle2}
          color="yellow"
          delta={pendingLessonPlansCount > 0 ? -10 : 0}
          onClick={() => navigate("/lesson-plan-management")}
        />
      ) : null,
      "leave-requests": hasPermission(user, 'leave_management') ? (
        <KPICard
          title="Leave Requests"
          value={pendingLeavesCount}
          description="Pending Applications"
          icon={Calendar}
          color="rose"
          delta={pendingLeavesCount > 0 ? 15 : 0}
          onClick={() => navigate("/leave-management")}
        />
      ) : null,
      "messages": hasPermission(user, 'messaging') ? (
        <KPICard
          title="Messages"
          value="View"
          description="Communication Hub"
          icon={Bell}
          color="pink"
          onClick={() => navigate("/messages")}
        />
      ) : null,
    };

    if (!cards[id]) return null;

    return (
      <div
        key={id}
        draggable={isCustomizeMode}
        onDragStart={(e) => handleDragStart(e, 'kpi', id)}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, 'kpi', id)}
        className={cn(
          "relative group/kpi animate-in fade-in zoom-in-95 duration-500",
          !visibleWidgets[id] && "opacity-40 grayscale"
        )}
      >
        {isCustomizeMode && (
          <div className="absolute top-2 right-2 z-10 flex gap-1">
            <Button
              variant="secondary"
              size="icon"
              className="h-6 w-6 rounded-full opacity-0 group-hover/kpi:opacity-100 transition-opacity"
              onClick={() => toggleWidgetVisibility(id)}
            >
              {visibleWidgets[id] ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            </Button>
            <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover/kpi:opacity-100 transition-opacity">
              <GripVertical className="h-3 w-3 text-muted-foreground" />
            </div>
          </div>
        )}
        {cards[id]}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-4 md:p-8">
        <div className="flex justify-between items-center mb-8">
          <Skeleton className="h-10 w-64" />
          <div className="flex gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-6 pb-24 md:pb-8 animate-in fade-in duration-1000">
      {/* Substitution Dialog */}
      <Dialog open={!!selectedVacantClass} onOpenChange={(open) => !open && setSelectedVacantClass(null)}>
        <DialogContent className="w-[95vw] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Assign Substitute</DialogTitle>
            <DialogDescription className="font-medium">
              Assign a teacher to cover Grade {selectedVacantClass?.grade} {selectedVacantClass?.subject} during {selectedVacantClass?.time}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">Available Teachers (Present & Free)</h4>
            <div className="border rounded-2xl overflow-hidden shadow-soft">
              <div className="overflow-x-auto">
  <Table>
                <TableHeader className="bg-muted/5">
                  <TableRow>
                    <TableHead className="font-bold text-[10px] uppercase">Teacher</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase">Subject</TableHead>
                    <TableHead className="text-right font-bold text-[10px] uppercase">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availableTeachers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground italic">No available teachers found for this period.</TableCell>
                    </TableRow>
                  ) : (
                    availableTeachers.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-bold">{t.name}</TableCell>
                        <TableCell className="text-xs font-medium text-muted-foreground">{t.subject}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            className="rounded-xl font-black text-[10px] uppercase tracking-widest"
                            onClick={() => assignSubstitutionMutation.mutate(t.id)}
                            disabled={assignSubstitutionMutation.isPending}
                          >
                            Assign
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
</div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Top Header - School Details */}
      <DashboardHeader />
      <CommandCenter />

      <div className="flex justify-end items-center gap-4">
        {/* Command Center Search Trigger - Relocated and Enhanced */}
        <div className="relative group/search flex-1 max-w-md hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Search modules, students, reports..."
            className="pl-10 h-11 rounded-2xl bg-white/80 border-white/40 shadow-soft focus-visible:ring-primary/20 cursor-pointer backdrop-blur-sm group-hover:border-primary/30 transition-all"
            readOnly
            onClick={() => window.dispatchEvent(new CustomEvent('open-command-center'))}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden lg:flex items-center gap-1 px-1.5 py-0.5 rounded-lg border bg-white/50 text-[10px] font-black text-slate-400">
             <kbd className="font-sans">⌘</kbd> K
          </div>
        </div>

        {canEditDashboard && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCustomizeMode(!isCustomizeMode)}
            className={cn(
              "gap-2 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all",
              isCustomizeMode ? "bg-primary text-primary-foreground shadow-medium" : "text-muted-foreground"
            )}
          >
            <Settings2 className={cn("h-4 w-4", isCustomizeMode && "animate-spin-slow")} />
            {isCustomizeMode ? "Exit Customization" : "Customize Dashboard"}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left/Main Column */}
        <div className="lg:col-span-8 space-y-8">
          {/* KPI Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-4">
            {kpiOrder.map(id => renderKPICard(id))}
          </div>

          {/* Main Widgets Area */}
          <div className="space-y-8">
            {mainWidgetsOrder.map(id => {
              if (!visibleWidgets[id] && !isCustomizeMode) return null;

              let content: React.ReactNode = null;
              switch (id) {
                case "ai-insights":
                  content = (
                    <div className="relative group/widget" key={id}>
                      {isCustomizeMode && (
                        <div className="absolute top-2 right-2 z-10 flex gap-1">
                          <Button variant="secondary" size="icon" className="h-6 w-6 rounded-full" onClick={() => toggleWidgetVisibility(id)}>
                            {visibleWidgets[id] ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                          </Button>
                          <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center cursor-grab active:cursor-grabbing">
                            <GripVertical className="h-3 w-3 text-muted-foreground" />
                          </div>
                        </div>
                      )}
                      <div className={cn(!visibleWidgets[id] && "opacity-40 grayscale")}>
                        <AIInsightsWidget insights={centerAiInsights} />
                      </div>
                    </div>
                  );
                  break;
                case "attendance-overview":
                  content = (
                    <Card className="border-none shadow-strong bg-card/60 backdrop-blur-md rounded-[2.5rem] relative group/widget overflow-hidden border border-white/20">
                      {isCustomizeMode && (
                        <div className="absolute top-2 right-2 z-10 flex gap-1">
                          <Button
                            variant="secondary"
                            size="icon"
                            className="h-6 w-6 rounded-full"
                            onClick={() => toggleWidgetVisibility(id)}
                          >
                            {visibleWidgets[id] ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                          </Button>
                          <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center cursor-grab active:cursor-grabbing">
                            <GripVertical className="h-3 w-3 text-muted-foreground" />
                          </div>
                        </div>
                      )}
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg font-bold">Attendance Overview</CardTitle>
                        <div className="flex gap-1 pr-12">
                          {(["weekly", "monthly", "yearly", "overall"] as AttendanceRange[]).map((range) => (
                            <Button
                              key={range}
                              variant={attendanceRange === range ? "default" : "ghost"}
                              size="sm"
                              className={cn("text-xs h-7 rounded-lg capitalize", attendanceRange === range && "shadow-soft")}
                              onClick={() => setAttendanceRange(range)}
                            >
                              {range}
                            </Button>
                          ))}
                        </div>
                      </CardHeader>
                      <CardContent className={cn(!visibleWidgets[id] && "opacity-40 grayscale")}>
                        <div className="h-[300px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={overviewTrend}>
                              <defs>
                                <linearGradient id="colorStudents" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.1} />
                                  <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorTeachers" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600, fill: "hsl(var(--muted-foreground))" }} dy={10} />
                              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600, fill: "hsl(var(--muted-foreground))" }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                              <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }} />
                              <Area type="monotone" dataKey="Students" stroke="hsl(var(--success))" strokeWidth={3} fillOpacity={1} fill="url(#colorStudents)" animationDuration={1500} />
                              <Area type="monotone" dataKey="Teachers" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorTeachers)" animationDuration={1500} />
                              <Legend verticalAlign="top" align="left" iconType="circle" wrapperStyle={{ paddingBottom: '20px' }} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  );
                  break;
                case "performers":
                  content = hasPermission(user, 'student_report') ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative group/widget">
                      {isCustomizeMode && (
                        <div className="absolute top-2 right-2 z-10 flex gap-1">
                          <Button
                            variant="secondary"
                            size="icon"
                            className="h-6 w-6 rounded-full"
                            onClick={() => toggleWidgetVisibility(id)}
                          >
                            {visibleWidgets[id] ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                          </Button>
                          <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center cursor-grab active:cursor-grabbing">
                            <GripVertical className="h-3 w-3 text-muted-foreground" />
                          </div>
                        </div>
                      )}
                      <Card className={cn("border-none shadow-strong bg-card/60 backdrop-blur-md rounded-[2.5rem] overflow-hidden border border-white/20", !visibleWidgets[id] && "opacity-40 grayscale")}>
                        <CardHeader className="bg-success/5 border-b border-success/10 p-6">
                          <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-success flex items-center gap-2">
                            <TrendingUp className="h-5 w-5" /> Top Performers
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                          <div className="divide-y divide-border/10 max-h-[400px] overflow-y-auto custom-scrollbar">
                            {highestPerformers.length === 0 ? (
                              <p className="p-8 text-center text-xs italic text-muted-foreground">No data available</p>
                            ) : (
                              highestPerformers.slice(0, 10).map((r: any) => (
                                <div key={r.id} className="p-5 flex justify-between items-center hover:bg-success/5 transition-colors cursor-pointer" onClick={() => navigate(`/student-report?student_id=${r.student_id}`)}>
                                  <div>
                                    <p className="text-sm font-black text-slate-800">{r.students?.name}</p>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{r.tests?.name}</p>
                                  </div>
                                  <Badge className="bg-success text-success-foreground font-black text-[10px] px-2 rounded-lg">{Math.round((r.marks_obtained / (r.tests?.total_marks || 100)) * 100)}%</Badge>
                                </div>
                              ))
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      <Card className={cn("border-none shadow-strong bg-card/60 backdrop-blur-md rounded-[2.5rem] overflow-hidden border border-white/20", !visibleWidgets[id] && "opacity-40 grayscale")}>
                        <CardHeader className="bg-destructive/5 border-b border-destructive/10 p-6">
                          <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-destructive flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5" /> Critical Attention
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                          <div className="divide-y divide-border/10 max-h-[400px] overflow-y-auto custom-scrollbar">
                            {lowestPerformers.length === 0 ? (
                              <p className="p-8 text-center text-xs italic text-muted-foreground">No critical alerts</p>
                            ) : (
                              lowestPerformers.slice(0, 10).map((r: any) => (
                                <div key={r.id} className="p-5 flex justify-between items-center hover:bg-destructive/5 transition-colors cursor-pointer" onClick={() => navigate(`/student-report?student_id=${r.student_id}`)}>
                                  <div>
                                    <p className="text-sm font-black text-slate-800">{r.students?.name}</p>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{r.tests?.name}</p>
                                  </div>
                                  <Badge className="bg-destructive text-destructive-foreground font-black text-[10px] px-2 rounded-lg">{Math.round((r.marks_obtained / (r.tests?.total_marks || 100)) * 100)}%</Badge>
                                </div>
                              ))
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ) : null;
                  break;
                case "teacher-status":
                  content = (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative group/widget">
                      {isCustomizeMode && (
                        <div className="absolute top-2 right-2 z-10 flex gap-1">
                          <Button
                            variant="secondary"
                            size="icon"
                            className="h-6 w-6 rounded-full"
                            onClick={() => toggleWidgetVisibility(id)}
                          >
                            {visibleWidgets[id] ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                          </Button>
                          <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center cursor-grab active:cursor-grabbing">
                            <GripVertical className="h-3 w-3 text-muted-foreground" />
                          </div>
                        </div>
                      )}
                      <Card className={cn("border-none shadow-strong bg-card/60 backdrop-blur-md rounded-[2.5rem] overflow-hidden border border-white/20", !visibleWidgets[id] && "opacity-40 grayscale")}>
                        <CardHeader className="p-6">
                          <CardTitle className="text-lg font-black flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-primary/10 text-primary">
                              <Users className="h-5 w-5" />
                            </div>
                            Teacher Attendance
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                          <div className="divide-y divide-border/10 max-h-[400px] overflow-y-auto custom-scrollbar">
                            {teachers.length === 0 ? (
                              <p className="p-8 text-center text-xs italic text-muted-foreground">No teachers found</p>
                            ) : (
                              teachers.map((t) => {
                                const attendance = teacherAttendance.find((ta) => ta.teacher_id === t.id);
                                const leave = todayApprovedLeaves.find((l: any) => l.teacher_id === t.id);
                                const status = leave ? "leave" : (attendance?.status || "pending");
                                const canNavigateToTeachers = hasPermission(user, 'teacher_management');

                                return (
                                  <div key={t.id} className={cn("p-5 flex justify-between items-center transition-colors", canNavigateToTeachers && "hover:bg-primary/5 cursor-pointer")} onClick={() => canNavigateToTeachers && navigate("/teachers")}>
                                    <div className="flex items-center gap-3">
                                      <div className={cn(
                                        "h-10 w-10 rounded-2xl flex items-center justify-center border-2",
                                        status === "present" ? "bg-success/5 border-success/20" : (status === "absent" || status === "leave") ? "bg-destructive/5 border-destructive/20" : "bg-warning/5 border-warning/20"
                                      )}>
                                        <Users className={cn(
                                          "h-5 w-5",
                                          status === "present" ? "text-success" : (status === "absent" || status === "leave") ? "text-destructive" : "text-warning"
                                        )} />
                                      </div>
                                      <div>
                                        <p className="text-sm font-black text-slate-800">{t.name}</p>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t.subject}</p>
                                      </div>
                                    </div>
                                    <Badge
                                      variant={status === "present" ? "pulse" : (status === "absent" || status === "leave") ? "destructive" : "warning"}
                                      className="font-black text-[9px] uppercase px-2 py-0.5 rounded-lg"
                                    >
                                      {status === "present" ? "Present" : status === "leave" ? "On Leave" : status === "absent" ? "Absent" : "Not Marked"}
                                    </Badge>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      <Card
                        className={cn(
                          "border-none shadow-strong bg-card/60 backdrop-blur-md rounded-[2.5rem] border border-white/20 transition-all duration-500",
                          !visibleWidgets[id] && "opacity-40 grayscale",
                          hasPermission(user, 'finance') && "cursor-pointer hover:shadow-elevated"
                        )}
                        onClick={() => hasPermission(user, 'finance') && navigate("/finance")}
                      >
                        <CardHeader className="p-8">
                          <CardTitle className="text-lg font-black flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-success/10 text-success">
                              <Wallet className="h-5 w-5" />
                            </div>
                            Financial Health
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-8 p-8 pt-0">
                          <div className="flex justify-between items-end">
                            <div>
                              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-2">Collection Ratio</p>
                              <p className="text-5xl font-black tracking-tighter text-slate-900">{collectionRate}%</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-2">Total Invoiced</p>
                              <p className="text-xl font-black text-slate-700">{formatCurrency(totalInvoiced)}</p>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div className="flex justify-between text-[11px] font-black uppercase tracking-widest">
                              <span className="text-muted-foreground">Collected</span>
                              <span className="text-success">{formatCurrency(feeCollection)}</span>
                            </div>
                            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner p-0.5 border">
                              <div className="h-full bg-gradient-to-r from-emerald-400 to-success rounded-full transition-all duration-1000 shadow-sm" style={{ width: `${collectionRate}%` }} />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  );
                  break;

                case "leave-applications":
                  content = hasPermission(user, 'leave_management') ? (
                    <Card className="border shadow-soft bg-card rounded-2xl overflow-hidden relative group/widget">
                      {isCustomizeMode && (
                        <div className="absolute top-2 right-2 z-10 flex gap-1">
                          <Button
                            variant="secondary"
                            size="icon"
                            className="h-6 w-6 rounded-full"
                            onClick={() => toggleWidgetVisibility(id)}
                          >
                            {visibleWidgets[id] ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                          </Button>
                          <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center cursor-grab active:cursor-grabbing">
                            <GripVertical className="h-3 w-3 text-muted-foreground" />
                          </div>
                        </div>
                      )}
                      <CardHeader className="flex flex-row items-center justify-between p-6 pb-2">
                        <CardTitle className="text-lg font-black flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-warning/10 text-warning">
                            <Calendar className="h-5 w-5" />
                          </div>
                          Leave Applications
                        </CardTitle>
                        <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase tracking-widest text-primary h-7 pr-12" onClick={() => navigate("/leave-management")}>
                          Manage <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      </CardHeader>
                      <CardContent className={cn("p-0", !visibleWidgets[id] && "opacity-40 grayscale")}>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/5 border-none">
                                <TableHead className="px-6 font-black text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Applicant</TableHead>
                                <TableHead className="font-black text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Type</TableHead>
                                <TableHead className="font-black text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Period</TableHead>
                                <TableHead className="font-black text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {leaveApplications.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={4} className="text-center py-12 text-muted-foreground font-medium italic text-xs">No pending leave requests found.</TableCell>
                                </TableRow>
                              ) : (
                                leaveApplications.slice(0, 5).map((leave) => (
                                  <TableRow key={leave.id} className="border-border/10 cursor-pointer hover:bg-primary/5 transition-colors" onClick={() => navigate("/leave-management")}>
                                    <TableCell className="px-6 py-4">
                                      <div className="flex flex-col">
                                        <span className="font-black text-sm text-slate-800">{leave.teachers?.name || leave.students?.name}</span>
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{leave.teacher_id ? 'Faculty' : `Grade ${leave.students?.grade}`}</span>
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-xs font-black text-slate-600">{leave.leave_categories?.name}</TableCell>
                                    <TableCell className="text-[11px] font-bold text-muted-foreground uppercase tracking-tighter">
                                      {format(new Date(leave.start_date), "MMM d")} – {format(new Date(leave.end_date), "MMM d")}
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant={leave.status === 'approved' ? 'success' : leave.status === 'pending' ? 'warning' : 'destructive'} className="text-[9px] font-black uppercase rounded-lg">
                                        {leave.status}
                                      </Badge>
                                    </TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  ) : null;
                  break;

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

                case "pending-attendance":
                  const totalPendingStudents = pendingAttendanceByGrade.reduce((acc: number, curr: any) => acc + Number(curr.pending_count), 0);
                  const isVisibleForUser = role === UserRole.ADMIN || role === UserRole.CENTER || (role === UserRole.TEACHER && pendingAttendanceByGrade.length > 0);

                  content = isVisibleForUser ? (
                    <Card className={cn("border-none shadow-strong bg-card/60 backdrop-blur-md rounded-[2.5rem] overflow-hidden border border-white/20", !visibleWidgets[id] && "opacity-40 grayscale")} key={id}>
                      <CardHeader className="bg-amber-50 border-b border-amber-100 p-6 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-black uppercase tracking-widest text-amber-600 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" /> Pending Roll Call
                        </CardTitle>
                        {totalPendingStudents > 0 && <Badge variant="warning" className="bg-amber-500 text-white">{totalPendingStudents} Students</Badge>}
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="divide-y divide-border/10 max-h-[300px] overflow-y-auto">
                          {pendingAttendanceByGrade.length === 0 && pendingTeachers.length === 0 ? (
                            <div className="p-8 text-center">
                              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                              <p className="text-xs font-bold text-emerald-600 uppercase">All Attendance Completed</p>
                            </div>
                          ) : (
                            <>
                              {pendingAttendanceByGrade.map((p: any) => (
                                <div key={p.grade} className="p-4 flex justify-between items-center hover:bg-amber-50/50 transition-colors cursor-pointer" onClick={() => navigate(role === UserRole.TEACHER ? "/teacher/take-attendance" : "/attendance")}>
                                  <div>
                                    <p className="text-sm font-black text-slate-800">Grade {p.grade}</p>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Student Attendance Missing</p>
                                  </div>
                                  <Badge variant="outline" className="text-amber-600 border-amber-200">{p.pending_count} Pending</Badge>
                                </div>
                              ))}
                              {(role === UserRole.ADMIN || role === UserRole.CENTER) && pendingTeachers.map((p: any) => (
                                <div key={p.teacher_id} className="p-4 flex justify-between items-center hover:bg-amber-50/50 transition-colors cursor-pointer" onClick={() => navigate("/teacher-attendance")}>
                                  <div>
                                    <p className="text-sm font-black text-slate-800">{p.teacher_name}</p>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Faculty Attendance Missing</p>
                                  </div>
                                  <Badge variant="outline" className="text-amber-600 border-amber-200">Pending</Badge>
                                </div>
                              ))}
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ) : null;
                  break;

                case "activities-discipline":
                  content = (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative group/widget">
                      {isCustomizeMode && (
                        <div className="absolute top-2 right-2 z-10 flex gap-1">
                          <Button
                            variant="secondary"
                            size="icon"
                            className="h-6 w-6 rounded-full"
                            onClick={() => toggleWidgetVisibility(id)}
                          >
                            {visibleWidgets[id] ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                          </Button>
                          <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center cursor-grab active:cursor-grabbing">
                            <GripVertical className="h-3 w-3 text-muted-foreground" />
                          </div>
                        </div>
                      )}
                      {hasPermission(user, 'preschool_activities') ? (
                        <Card className={cn("border-none shadow-strong bg-card/60 backdrop-blur-md rounded-[2.5rem] overflow-hidden border border-white/20", !visibleWidgets[id] && "opacity-40 grayscale")}>
                          <CardHeader className="flex flex-row items-center justify-between p-6 pb-2">
                            <CardTitle className="text-lg font-black flex items-center gap-3">
                              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                                <BookOpen className="h-5 w-5" />
                              </div>
                              Activities
                            </CardTitle>
                            <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase tracking-widest text-primary h-7" onClick={() => navigate("/activities")}>
                              View All <ArrowRight className="h-3 w-3 ml-1" />
                            </Button>
                          </CardHeader>
                          <CardContent className="p-0">
                            {recentActivities.length === 0 ? (
                              <p className="p-8 text-center text-sm text-muted-foreground font-medium italic">No upcoming activities</p>
                            ) : (
                              <div className="divide-y divide-border/10">
                                {recentActivities.map((a: any) => (
                                  <div key={a.id} className="p-5 hover:bg-primary/5 transition-colors">
                                    <p className="text-sm font-black text-slate-800">{a.title || a.name}</p>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                                      Grade {a.grade || "All"} · {a.activity_date ? format(new Date(a.activity_date), "MMM d") : "No date"}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ) : <div />}

                      {hasPermission(user, 'discipline_issues') ? (
                        <Card className={cn("border-none shadow-strong bg-card/60 backdrop-blur-md rounded-[2.5rem] overflow-hidden border border-white/20", !visibleWidgets[id] && "opacity-40 grayscale")}>
                          <CardHeader className="flex flex-row items-center justify-between p-6 pb-2">
                            <CardTitle className="text-lg font-black flex items-center gap-3">
                              <div className="p-2 rounded-xl bg-destructive/10 text-destructive">
                                <AlertTriangle className="h-5 w-5" />
                              </div>
                              Discipline
                            </CardTitle>
                            <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase tracking-widest text-primary h-7" onClick={() => navigate("/discipline")}>
                              View All <ArrowRight className="h-3 w-3 ml-1" />
                            </Button>
                          </CardHeader>
                          <CardContent className="p-0">
                            {recentDiscipline.length === 0 ? (
                              <p className="p-8 text-center text-sm text-muted-foreground font-medium italic">No discipline issues reported</p>
                            ) : (
                              <div className="divide-y divide-border/10">
                                {recentDiscipline.map((d: any) => (
                                  <div key={d.id} className="p-5 hover:bg-destructive/5 transition-colors">
                                    <p className="text-sm font-black text-slate-800 line-clamp-1">{d.description}</p>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                                      {d.students?.name} · Grade {d.students?.grade} · {format(new Date(d.issue_date), "MMM d")}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ) : <div />}
                    </div>
                  );
                  break;
              }

              return (
                <div
                  key={id}
                  draggable={isCustomizeMode}
                  onDragStart={(e) => handleDragStart(e, 'main', id)}
                  onDragEnd={handleDragEnd}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, 'main', id)}
                  className={cn(
                    "transition-all duration-300",
                    isCustomizeMode && "outline-dashed outline-2 outline-primary/30 outline-offset-4 rounded-2xl"
                  )}
                >
                  {content}
                </div>
              );
            })}
          </div>

          {/* Management Tabs */}
          {(hasPermission(user, 'inventory_assets') || hasPermission(user, 'transport_tracking')) && (
            <Card className="border-none shadow-strong bg-card/60 backdrop-blur-md rounded-[2.5rem] overflow-hidden border border-white/20">
              <CardContent className="p-6">
                <Tabs defaultValue={hasPermission(user, 'inventory_assets') ? "library" : "transport"} className="w-full">
                  <TabsList className="flex flex-nowrap w-full overflow-x-auto mb-8 bg-muted/50 p-1 rounded-2xl custom-scrollbar">
                    {hasPermission(user, 'inventory_assets') && (
                      <TabsTrigger value="library" className="flex-1 min-w-[100px] rounded-xl font-bold text-xs uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-soft">
                        <Book className="h-4 w-4 mr-2" /> Library
                      </TabsTrigger>
                    )}
                    {hasPermission(user, 'transport_tracking') && (
                      <TabsTrigger value="transport" className="rounded-xl font-bold text-xs uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-soft">
                        <Bus className="h-4 w-4 mr-2" /> Transport
                      </TabsTrigger>
                    )}
                    {hasPermission(user, 'inventory_assets') && (
                      <TabsTrigger value="assets" className="rounded-xl font-bold text-xs uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-soft">
                        <Package className="h-4 w-4 mr-2" /> Assets
                      </TabsTrigger>
                    )}
                  </TabsList>
                  {hasPermission(user, 'inventory_assets') && (
                    <TabsContent value="library" className="mt-0 focus-visible:outline-none">
                      <LibraryManagement centerId={centerId || ""} />
                    </TabsContent>
                  )}
                  {hasPermission(user, 'transport_tracking') && (
                    <TabsContent value="transport" className="mt-0 focus-visible:outline-none">
                      <TransportManagement centerId={centerId || ""} />
                    </TabsContent>
                  )}
                  {hasPermission(user, 'inventory_assets') && (
                    <TabsContent value="assets" className="mt-0 focus-visible:outline-none">
                      <AssetTracking centerId={centerId || ""} />
                    </TabsContent>
                  )}
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column */}
        <div className="lg:col-span-4 space-y-8">
          <div className={cn("space-y-8 animate-in slide-in-from-right-8 duration-1000", isCustomizeMode && "outline-dashed outline-2 outline-primary/30 outline-offset-4 rounded-[2.5rem] p-4")}>
            <div className="relative group/side-widget">
              {isCustomizeMode && (
                <div className="absolute top-2 right-2 z-20">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-6 w-6 rounded-full"
                    onClick={() => toggleWidgetVisibility("notice-board")}
                  >
                    {visibleWidgets["notice-board"] ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  </Button>
                </div>
              )}
              {(visibleWidgets["notice-board"] || isCustomizeMode) && (
                <div className={cn("transition-all duration-500", !visibleWidgets["notice-board"] && "opacity-40 grayscale blur-[1px]")}>
                  <div className="rounded-[2.5rem] overflow-hidden shadow-strong border border-white/20">
                    <DigitalNoticeBoard centerId={centerId || ""} />
                  </div>
                </div>
              )}
            </div>

            <div className="relative group/side-widget">
              {isCustomizeMode && (
                <div className="absolute top-2 right-2 z-20">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-6 w-6 rounded-full"
                    onClick={() => toggleWidgetVisibility("alerts")}
                  >
                    {visibleWidgets["alerts"] ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  </Button>
                </div>
              )}
              {(visibleWidgets["alerts"] || isCustomizeMode) && (
                <div className={cn("transition-all duration-500", !visibleWidgets["alerts"] && "opacity-40 grayscale blur-[1px]")}>
                  <div className="rounded-[2.5rem] overflow-hidden shadow-strong border border-white/20">
                    <AlertList
                      alerts={recentAlerts}
                      onViewAll={() => hasPermission(user, 'messaging') && navigate("/messages")}
                      onItemClick={(a) => {
                        if (a.id.startsWith('vacant-')) {
                          const classId = a.id.replace('vacant-', '');
                          const cls = todayClasses.find(c => c.id === classId);
                          if (cls) setSelectedVacantClass(cls);
                        } else if (a.onClick) {
                          a.onClick();
                        }
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="relative group/side-widget">
              {isCustomizeMode && (
                <div className="absolute top-2 right-2 z-20">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-6 w-6 rounded-full"
                    onClick={() => toggleWidgetVisibility("class-schedule")}
                  >
                    {visibleWidgets["class-schedule"] ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  </Button>
                </div>
              )}
              {(visibleWidgets["class-schedule"] || isCustomizeMode) && (
                <div className={cn("transition-all duration-500", !visibleWidgets["class-schedule"] && "opacity-40 grayscale blur-[1px]")}>
                  <div className="rounded-[2.5rem] overflow-hidden shadow-strong border border-white/20">
                    <ClassSchedule
                      classes={todayClasses}
                      title="Today's Classes"
                      onViewRoutine={() => hasPermission(user, 'class_routine') && navigate("/class-routine")}
                      onItemClick={(item) => {
                        if (item.isVacant) setSelectedVacantClass(item);
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
