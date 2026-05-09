import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Calendar, ChevronRight, Users, BookOpen, Bell, Plus, Clock, ClipboardCheck, GraduationCap, ShieldCheck, FileText, BarChart3, Receipt, Database, Zap, LayoutTemplate, MousePointer2, Activity, Settings, TrendingUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission } from '@/utils/permissions';
import { UserRole } from '@/types/roles';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { format, startOfMonth } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useParentInsights } from '@/hooks/useParentInsights';

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  featureName?: string;
  is_active?: boolean;
  unreadCount?: number;
  category?: string;
}

interface MobileModuleLauncherProps {
  navItems: NavItem[];
}

export default function MobileModuleLauncher({ navItems }: MobileModuleLauncherProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const getGreeting = () => {
    const hour = new Date().getHours();
    let greeting = "Good Morning";
    if (hour >= 12 && hour < 17) greeting = "Good Afternoon";
    if (hour >= 17) greeting = "Good Evening";

    const roleName = user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "User";
    return `${greeting}, ${roleName} 👋`;
  };

  const today = format(new Date(), 'yyyy-MM-dd');
  const monthStart = startOfMonth(new Date()).toISOString();

  // --- Center Admin Queries ---
  const { data: totalStudentsCount = 0 } = useQuery({
    queryKey: ['mobile-kpi-students', user?.center_id],
    queryFn: async () => {
      const { count } = await supabase.from('students').select('*', { count: 'exact', head: true }).eq('center_id', user?.center_id).eq('is_active', true);
      return count || 0;
    },
    enabled: !!user?.center_id && (user.role === UserRole.ADMIN || user.role === UserRole.CENTER)
  });

  const { data: staffPresentCount = 0 } = useQuery({
    queryKey: ['mobile-kpi-staff', user?.center_id],
    queryFn: async () => {
      const { count } = await supabase.from('teacher_attendance').select('*', { count: 'exact', head: true }).eq('center_id', user?.center_id).eq('date', today).in('status', ['present', 'late']);
      return count || 0;
    },
    enabled: !!user?.center_id && (user.role === UserRole.ADMIN || user.role === UserRole.CENTER)
  });

  const { data: revenueMtd = 0 } = useQuery({
    queryKey: ['mobile-kpi-revenue', user?.center_id],
    queryFn: async () => {
      const { data } = await supabase.from('invoices').select('paid_amount').eq('center_id', user?.center_id).gte('invoice_date', monthStart);
      return data?.reduce((acc, curr) => acc + (curr.paid_amount || 0), 0) || 0;
    },
    enabled: !!user?.center_id && (user.role === UserRole.ADMIN || user.role === UserRole.CENTER)
  });

  // --- Teacher Queries ---
  const { data: teacherStudentsPresent = 0 } = useQuery({
    queryKey: ['mobile-kpi-teacher-students', user?.center_id, user?.id],
    queryFn: async () => {
      const { count } = await supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('center_id', user?.center_id).eq('date', today).eq('status', 'present').eq('marked_by', user?.id);
      return count || 0;
    },
    enabled: !!user?.center_id && user.role === UserRole.TEACHER
  });

  const { data: homeworkPendingCount = 0 } = useQuery({
    queryKey: ['mobile-kpi-homework-pending', user?.teacher_id],
    queryFn: async () => {
      const { count } = await supabase.from('student_homework_records').select('*, homework!inner(id)', { count: 'exact', head: true }).eq('status', 'submitted').eq('homework.teacher_id', user?.teacher_id);
      return count || 0;
    },
    enabled: !!user?.teacher_id && user.role === UserRole.TEACHER
  });

  // --- Common Queries ---
  const { data: unreadNotifs = 0 } = useQuery({
    queryKey: ['mobile-kpi-unread-notifs', user?.id],
    queryFn: async () => {
      const { count } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', user?.id).eq('is_read', false);
      return count || 0;
    },
    enabled: !!user?.id
  });

  const { data: upcomingExamsCount = 0 } = useQuery({
    queryKey: ['mobile-kpi-exams', user?.center_id],
    queryFn: async () => {
      const { count } = await supabase.from('exams').select('*', { count: 'exact', head: true }).eq('center_id', user?.center_id).gte('exam_date', today);
      return count || 0;
    },
    enabled: !!user?.center_id
  });

  // --- Parent Logic ---
  const { data: linkedStudents = [] } = useQuery({
    queryKey: ['mobile-linked-students', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('student_parent_relations').select('student_id').eq('parent_user_id', user?.id);
      return data?.map(d => d.student_id) || [];
    },
    enabled: !!user?.id && user.role === UserRole.PARENT
  });

  const primaryStudentId = linkedStudents[0] || null;
  const { stats: parentStats } = useParentInsights(primaryStudentId);

  const getKPIs = () => {
    switch (user?.role) {
      case UserRole.TEACHER:
        return [
          { label: "Students Present", value: teacherStudentsPresent.toString(), icon: Users, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Homework Pending", value: homeworkPendingCount.toString(), icon: BookOpen, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Upcoming Exams", value: upcomingExamsCount.toString(), icon: Calendar, color: "text-orange-600", bg: "bg-orange-50" },
          { label: "New Notices", value: unreadNotifs.toString(), icon: Bell, color: "text-indigo-600", bg: "bg-indigo-50" },
        ];
      case UserRole.PARENT:
        return [
          { label: "Attendance", value: `${Math.round(parentStats.attendanceRate)}%`, icon: Clock, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Homework Completion", value: `${Math.round(parentStats.homeworkCompletionRate)}%`, icon: BookOpen, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Exams", value: upcomingExamsCount.toString(), icon: GraduationCap, color: "text-orange-600", bg: "bg-orange-50" },
          { label: "Total Dues", value: parentStats.totalDues > 0 ? `$${(parentStats.totalDues / 1000).toFixed(1)}k` : "0", icon: Bell, color: "text-indigo-600", bg: "bg-indigo-50" },
        ];
      case UserRole.ADMIN:
      case UserRole.CENTER:
        return [
          { label: "Total Students", value: totalStudentsCount.toString(), icon: Users, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Staff Present", value: staffPresentCount.toString(), icon: ShieldCheck, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Revenue (MTD)", value: revenueMtd > 1000 ? `$${(revenueMtd / 1000).toFixed(1)}k` : `$${revenueMtd}`, icon: FileText, color: "text-orange-600", bg: "bg-orange-50" },
          { label: "Active Alerts", value: unreadNotifs.toString(), icon: Bell, color: "text-rose-600", bg: "bg-rose-50" },
        ];
      default:
        return [];
    }
  };

  const kpis = getKPIs();

  const groupedItems = React.useMemo(() => {
    const groups: Record<string, NavItem[]> = {
      "Quick Actions": [],
      "Academic": [],
      "Administration": []
    };

    navItems.forEach(item => {
      if (item.is_active === false) return;
      const featureKey = item.featureName || (item as any).feature_name;
      if (!hasPermission(user, featureKey || 'unknown', item.to)) return;

      const label = item.label.toLowerCase();

      const quickActionNames = ["take attendance", "attendance", "class routine", "homework", "lesson tracking", "tuition centers", "billing system"];
      const academicNames = ["exams & results", "exams", "tests", "published results", "student report", "center analytics"];
      const adminNames = ["lesson plans", "discipline", "pre school activities", "data usage", "saas subscriptions", "finance"];

      if (quickActionNames.some(name => label === name || label.includes(name))) {
        groups["Quick Actions"].push(item);
      } else if (academicNames.some(name => label === name || label.includes(name))) {
        groups["Academic"].push(item);
      } else {
        groups["Administration"].push(item);
      }
    });

    return groups;
  }, [navItems, user]);

  const ModuleCard = ({ item, variant = "grid" }: { item: NavItem, variant?: "list" | "grid" }) => {
    const Icon = item.icon;

    if (variant === "grid") {
      return (
        <button
          onClick={() => navigate(item.to)}
          className="flex flex-col items-start gap-3 p-3.5 rounded-3xl bg-white border border-slate-100/80 shadow-[0_4px_12px_rgba(0,0,0,0.03)] active:scale-95 transition-all text-left relative group min-h-[135px]"
        >
          <div className={cn("h-10 w-10 rounded-2xl flex items-center justify-center transition-transform group-active:scale-90",
            item.label.includes("Exams") || item.label.includes("Center") ? "bg-orange-50 text-orange-600" :
            item.label.includes("Tests") || item.label.includes("Billing") ? "bg-emerald-50 text-emerald-600" :
            item.label.includes("Results") || item.label.includes("Usage") ? "bg-rose-50 text-rose-600" :
            "bg-blue-50 text-blue-600"
          )}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex flex-col gap-0.5 pr-2">
            <span className="text-[12px] font-bold text-slate-800 leading-tight line-clamp-2">{item.label}</span>
            <span className="text-[9px] text-muted-foreground leading-tight">
              {item.label === "Exams & Results" ? "View exams and results" :
               item.label === "Tests" ? "Create & manage tests" :
               item.label === "Published Results" ? "View published results" :
               "View " + item.label.toLowerCase()}
            </span>
          </div>
          <ChevronRight className={cn("h-3 w-3 absolute right-3 bottom-3 opacity-30")} />
        </button>
      );
    }

    return (
      <button
        onClick={() => navigate(item.to)}
        className="flex items-center gap-3 p-3.5 rounded-3xl bg-white border border-slate-100/80 shadow-[0_4px_12px_rgba(0,0,0,0.03)] active:scale-95 transition-all w-full text-left relative group overflow-hidden"
      >
        <div className={cn("h-11 w-11 rounded-2xl flex items-center justify-center group-active:scale-90 transition-transform flex-shrink-0",
           item.label.toLowerCase().includes("attendance") ? "bg-emerald-50 text-emerald-600" :
           item.label.toLowerCase().includes("routine") || item.label.toLowerCase().includes("center") ? "bg-blue-50 text-blue-600" :
           item.label.toLowerCase().includes("homework") || item.label.toLowerCase().includes("billing") ? "bg-indigo-50 text-indigo-600" :
           "bg-orange-50 text-orange-600"
        )}>
          <Icon className="h-5.5 w-5.5" />
        </div>
        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <span className="text-[13px] font-bold text-slate-800 leading-tight">{item.label}</span>
          <span className="text-[10px] text-muted-foreground leading-tight truncate">
             {item.label.toLowerCase().includes("attendance") ? "Mark student attendance" :
              item.label.toLowerCase().includes("routine") ? "View today's schedule" :
              item.label.toLowerCase().includes("homework") ? "3 pending tasks" :
              item.label.toLowerCase().includes("tracking") ? "Track today's lessons" :
              "Manage " + item.label}
          </span>
        </div>
        <ChevronRight className="h-4 w-4 text-primary mr-0.5 flex-shrink-0 opacity-60" />
      </button>
    );
  };

  return (
    <div className="flex flex-col gap-6 p-4 pb-44 animate-in fade-in slide-in-from-bottom-4 duration-700 bg-[#fafbfc]">
      {/* Personalized Greeting */}
      <div className="flex items-center justify-between mt-2 px-1">
        <div className="flex flex-col gap-1">
          <h1 className="text-[22px] font-bold text-slate-900 tracking-tight">{getGreeting()}</h1>
          <p className="text-sm text-slate-500 font-medium">Here's what's happening today.</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-2xl border border-slate-100 shadow-sm">
          <Calendar className="h-4 w-4 text-slate-400" />
          <span className="text-[11px] font-bold text-slate-600">{format(new Date(), "MMM d, yyyy")}</span>
        </div>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-4 gap-3">
        {kpis.map((kpi, idx) => (
          <div key={idx} className="flex flex-col items-start gap-2 p-3 rounded-[1.75rem] bg-white border border-slate-100 shadow-sm overflow-hidden">
            <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center", kpi.bg, kpi.color)}>
              <kpi.icon className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-slate-900 leading-tight">{kpi.value}</span>
              <span className="text-[8px] font-bold text-slate-400 leading-tight uppercase tracking-tight line-clamp-2">{kpi.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-bold text-slate-800 text-[15px]">Quick Actions</h2>
          <Button variant="link" className="text-[12px] font-bold h-auto p-0 text-primary">View All <ChevronRight className="h-3 w-3 ml-0.5" /></Button>
        </div>
        <div className="grid grid-cols-1 gap-3">
          {groupedItems["Quick Actions"].length > 0 ? (
            groupedItems["Quick Actions"].slice(0, 4).map((item, idx) => (
              <ModuleCard key={idx} item={item} variant="list" />
            ))
          ) : (
             <div className="text-[10px] text-muted-foreground italic px-2">No quick actions assigned.</div>
          )}
        </div>
      </div>

      {/* Academic Group */}
      <div className="flex flex-col gap-4">
        <h2 className="font-bold text-slate-800 text-[15px] px-1">Academic</h2>
        <div className="grid grid-cols-2 gap-3">
          {groupedItems["Academic"].length > 0 ? (
            groupedItems["Academic"].map((item, idx) => (
              <ModuleCard key={idx} item={item} variant="grid" />
            ))
          ) : (
            <div className="col-span-2 text-[10px] text-muted-foreground italic px-2">No academic modules.</div>
          )}
        </div>
      </div>

      {/* Administration Group */}
      <div className="flex flex-col gap-4">
        <h2 className="font-bold text-slate-800 text-[15px] px-1">Administration</h2>
        <div className="grid grid-cols-2 gap-3">
          {groupedItems["Administration"].length > 0 ? (
            groupedItems["Administration"].map((item, idx) => (
              <ModuleCard key={idx} item={item} variant="grid" />
            ))
          ) : (
             <div className="col-span-2 text-[10px] text-muted-foreground italic px-2">No administration modules.</div>
          )}
        </div>
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-24 right-6 flex flex-col items-center gap-1 z-50">
        <button
          className="h-14 w-14 rounded-[1.25rem] bg-primary shadow-[0_8px_20px_rgba(79,70,229,0.3)] flex items-center justify-center text-white active:scale-90 transition-transform"
          onClick={() => {
            alert("Quick Add Actions");
          }}
        >
          <Plus className="h-7 w-7" />
        </button>
        <span className="text-[10px] font-bold text-primary tracking-tight">Quick Add</span>
      </div>
    </div>
  );
}
