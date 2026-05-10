import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Calendar, ChevronRight, Users, BookOpen, Bell, Plus, Clock, ClipboardCheck, GraduationCap, ShieldCheck, FileText, BarChart3, Receipt, Database, Zap, LayoutTemplate, MousePointer2, Activity, Settings, TrendingUp, Star, X, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission } from '@/utils/permissions';
import { UserRole } from '@/types/roles';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { format, startOfMonth } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useParentInsights } from '@/hooks/useParentInsights';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

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

  // --- Favorites Logic ---
  const [favorites, setFavorites] = React.useState<string[]>(() => {
    if (!user?.id) return [];
    const saved = localStorage.getItem(`mobile-favorites-${user.id}`);
    return saved ? JSON.parse(saved) : [];
  });

  const [isFavoritesDialogOpen, setIsFavoritesDialogOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  React.useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`mobile-favorites-${user.id}`, JSON.stringify(favorites));
    }
  }, [favorites, user?.id]);

  const toggleFavorite = (to: string) => {
    setFavorites(prev =>
      prev.includes(to) ? prev.filter(f => f !== to) : [...prev, to]
    );
  };

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

  const favoriteItems = React.useMemo(() => {
    return navItems.filter(item => {
      if (item.is_active === false) return false;
      if (!favorites.includes(item.to)) return false;
      const featureKey = item.featureName || (item as any).feature_name;
      return hasPermission(user, featureKey || 'unknown', item.to);
    });
  }, [navItems, favorites, user]);

  const groupedItems = React.useMemo(() => {
    const groups: Record<string, NavItem[]> = {
      "Academics": [],
      "Administration": [],
      "Reports": [],
      "Communications": []
    };

    navItems.forEach(item => {
      if (item.is_active === false) return;
      const featureKey = item.featureName || (item as any).feature_name;
      if (!hasPermission(user, featureKey || 'unknown', item.to)) return;

      const label = item.label.toLowerCase();
      const category = item.category;

      // Group by Category (strictly following user request)
      if (category === 'Academics') {
        groups["Academics"].push(item);
      } else if (category === 'Administration') {
        groups["Administration"].push(item);
      } else if (category === 'Reports and Communication' || category === 'Reports' || category === 'Communication') {
        const reportNames = ["report", "summary", "analytics", "performance", "records", "finance"];
        const commNames = ["message", "meeting", "calendar", "event", "notice"];

        if (reportNames.some(name => label.includes(name))) {
          groups["Reports"].push(item);
        } else if (commNames.some(name => label.includes(name))) {
          groups["Communications"].push(item);
        } else {
          groups["Reports"].push(item);
        }
      } else if (item.label === "Dashboard" || item.to.includes('dashboard')) {
        // Dashboard goes to Academics for prominence if requested grid only
        groups["Academics"].unshift(item);
      } else {
        // Fallback for uncategorized items (like About Institution)
        groups["Administration"].push(item);
      }
    });

    return groups;
  }, [navItems, user]);

  const ModuleCard = ({ item, isFavorite }: { item: NavItem, isFavorite?: boolean }) => {
    const Icon = item.icon;

    const getIconColor = () => {
      const label = item.label.toLowerCase();
      if (label.includes("exams") || label.includes("center") || label.includes("marks")) return "bg-orange-50 text-orange-600";
      if (label.includes("tests") || label.includes("billing") || label.includes("attendance")) return "bg-emerald-50 text-emerald-600";
      if (label.includes("results") || label.includes("usage") || label.includes("discipline")) return "bg-rose-50 text-rose-600";
      if (label.includes("messages") || label.includes("meetings") || label.includes("notice")) return "bg-indigo-50 text-indigo-600";
      if (label.includes("report") || label.includes("summary") || label.includes("tracking")) return "bg-purple-50 text-purple-600";
      return "bg-blue-50 text-blue-600";
    };

    const handleNavigation = () => {
      // If clicking Dashboard from the launcher, we want to show the actual stats/charts
      if (item.label === "Dashboard") {
        const separator = item.to.includes('?') ? '&' : '?';
        navigate(`${item.to}${separator}show_stats=true`);
      } else {
        navigate(item.to);
      }
    };

    return (
      <div
        onClick={handleNavigation}
        className="flex flex-col items-start gap-3 p-3.5 rounded-3xl bg-white border border-slate-100/80 shadow-[0_4px_12px_rgba(0,0,0,0.03)] active:scale-95 transition-all text-left relative group min-h-[135px] cursor-pointer"
      >
        {isFavorite && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(item.to);
            }}
            className="absolute top-3 right-3 h-7 w-7 rounded-full bg-slate-50 flex items-center justify-center text-rose-500 hover:bg-rose-50 transition-colors z-10"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        <div className={cn("h-10 w-10 rounded-2xl flex items-center justify-center transition-transform group-active:scale-90", getIconColor())}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex flex-col gap-0.5 pr-2">
          <span className="text-[12px] font-bold text-slate-800 leading-tight line-clamp-2">{item.label}</span>
          <span className="text-[9px] text-muted-foreground leading-tight">
            {item.label === "Exams & Results" ? "View exams and results" :
              item.label === "Tests" ? "Create & manage tests" :
              item.label === "Published Results" ? "View published results" :
              "Open " + item.label}
          </span>
        </div>
        {!isFavorite && <ChevronRight className={cn("h-3 w-3 absolute right-3 bottom-3 opacity-30")} />}
      </div>
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

      {/* Favorites Section */}
      {favoriteItems.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-bold text-slate-800 text-[15px] flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500 fill-amber-500" /> Favorites
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {favoriteItems.map((item, idx) => (
              <ModuleCard key={idx} item={item} isFavorite={true} />
            ))}
          </div>
        </div>
      )}

      {/* Academics Group */}
      <div className="flex flex-col gap-4">
        <h2 className="font-bold text-slate-800 text-[15px] px-1">Academics</h2>
        <div className="grid grid-cols-2 gap-3">
          {groupedItems["Academics"].length > 0 ? (
            groupedItems["Academics"].map((item, idx) => (
              <ModuleCard key={idx} item={item} />
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
              <ModuleCard key={idx} item={item} />
            ))
          ) : (
             <div className="col-span-2 text-[10px] text-muted-foreground italic px-2">No administration modules.</div>
          )}
        </div>
      </div>

      {/* Reports Group */}
      <div className="flex flex-col gap-4">
        <h2 className="font-bold text-slate-800 text-[15px] px-1">Reports</h2>
        <div className="grid grid-cols-2 gap-3">
          {groupedItems["Reports"].length > 0 ? (
            groupedItems["Reports"].map((item, idx) => (
              <ModuleCard key={idx} item={item} />
            ))
          ) : (
            <div className="col-span-2 text-[10px] text-muted-foreground italic px-2">No report modules.</div>
          )}
        </div>
      </div>

      {/* Communications Group */}
      <div className="flex flex-col gap-4">
        <h2 className="font-bold text-slate-800 text-[15px] px-1">Communications</h2>
        <div className="grid grid-cols-2 gap-3">
          {groupedItems["Communications"].length > 0 ? (
            groupedItems["Communications"].map((item, idx) => (
              <ModuleCard key={idx} item={item} />
            ))
          ) : (
            <div className="col-span-2 text-[10px] text-muted-foreground italic px-2">No communication modules.</div>
          )}
        </div>
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-24 right-6 flex flex-col items-center gap-1 z-50">
        <button
          id="quick-add-btn"
          className="h-14 w-14 rounded-[1.25rem] bg-primary shadow-[0_8px_20px_rgba(79,70,229,0.3)] flex items-center justify-center text-white active:scale-90 transition-transform"
          onClick={() => {
            console.log("FAB Clicked");
            setIsFavoritesDialogOpen(true);
          }}
        >
          <Plus className="h-7 w-7" />
        </button>
        <span className="text-[10px] font-bold text-primary tracking-tight">Quick Add</span>
      </div>
      {isFavoritesDialogOpen && <div className="sr-only" id="dialog-state-open">Open</div>}

      {/* Add Favorites Dialog */}
      <Dialog open={isFavoritesDialogOpen} onOpenChange={setIsFavoritesDialogOpen}>
        <DialogContent
          aria-labelledby="fav-title"
          aria-describedby="fav-description"
          className="max-w-[90vw] rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl"
        >
          <DialogHeader className="p-6 bg-slate-900 text-white">
            <DialogTitle id="fav-title" className="text-xl font-bold flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-400 fill-amber-400" /> Quick Add Favorites
            </DialogTitle>
            <DialogDescription id="fav-description" className="text-slate-400 font-medium">
              Select modules to pin them at the top for faster access.
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search modules..."
                className="pl-10 h-11 rounded-2xl bg-slate-50 border-slate-100"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              {navItems
                .filter(item => {
                  const labelMatch = item.label.toLowerCase().includes(searchQuery.toLowerCase());
                  const isPermitted = hasPermission(user, item.featureName || (item as any).feature_name || 'unknown', item.to);
                  const isNotFavorite = !favorites.includes(item.to);
                  const isActive = item.is_active !== false;
                  return labelMatch && isPermitted && isNotFavorite && isActive;
                })
                .map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        toggleFavorite(item.to);
                        setIsFavoritesDialogOpen(false);
                        setSearchQuery("");
                      }}
                      className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 active:bg-slate-100 transition-colors text-left border border-transparent active:border-slate-200"
                    >
                      <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{item.label}</span>
                        <span className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">{item.category || "Administration"}</span>
                      </div>
                      <Plus className="h-4 w-4 ml-auto text-slate-300" />
                    </button>
                  );
                })}

              {navItems.filter(item => {
                  const labelMatch = item.label.toLowerCase().includes(searchQuery.toLowerCase());
                  const isPermitted = hasPermission(user, item.featureName || (item as any).feature_name || 'unknown', item.to);
                  const isNotFavorite = !favorites.includes(item.to);
                  const isActive = item.is_active !== false;
                  return labelMatch && isPermitted && isNotFavorite && isActive;
              }).length === 0 && (
                <div className="py-8 text-center text-slate-400 italic text-sm">
                  No more modules to add.
                </div>
              )}
            </div>
          </div>
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
            <Button variant="ghost" onClick={() => setIsFavoritesDialogOpen(false)} className="font-bold rounded-xl">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
