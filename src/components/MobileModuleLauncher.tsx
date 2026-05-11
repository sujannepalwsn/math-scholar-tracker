import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Bell, Plus, GraduationCap,
  UserCheck, Star, X, Search,
  LayoutDashboard
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { hasPermission } from '@/utils/permissions';
import { UserRole } from '@/types/roles';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useParentInsights } from '@/hooks/useParentInsights';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import DashboardHeader from '@/components/dashboard/DashboardHeader';

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
  const { userPreferences } = useTheme();
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

  const today = format(new Date(), 'yyyy-MM-dd');

  // --- Live Data Queries ---
  const { data: totalStudentsCount = 0 } = useQuery({
    queryKey: ['mobile-kpi-students', user?.center_id],
    queryFn: async () => {
      const { count } = await supabase.from('students').select('*', { count: 'exact', head: true }).eq('center_id', user?.center_id).eq('is_active', true);
      return count || 0;
    },
    enabled: !!user?.center_id && (user.role === UserRole.ADMIN || user.role === UserRole.CENTER)
  });

  const { data: teachersCount = 0 } = useQuery({
    queryKey: ['mobile-kpi-teachers', user?.center_id],
    queryFn: async () => {
      const { count } = await supabase.from('teachers').select('*', { count: 'exact', head: true }).eq('center_id', user?.center_id);
      return count || 0;
    },
    enabled: !!user?.center_id && (user.role === UserRole.ADMIN || user.role === UserRole.CENTER)
  });

  const { data: attendanceToday = 0 } = useQuery({
    queryKey: ['mobile-kpi-attendance-today', user?.center_id],
    queryFn: async () => {
      const { count } = await supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('center_id', user?.center_id).eq('date', today).eq('status', 'present');
      return count || 0;
    },
    enabled: !!user?.center_id
  });

  const { stats: parentStats } = useParentInsights(
    user?.role === UserRole.PARENT ? (user.student_id || (user.linked_students?.[0] as any)?.id || null) : null
  );

  const kpis = React.useMemo(() => {
    if (user?.role === UserRole.PARENT) {
      return [
        { label: "Attendance", value: `${Math.round(parentStats.attendanceRate)}%` },
        { label: "Avg Score", value: `${Math.round(parentStats.averageTestScore)}%` },
        { label: "Homework", value: `${Math.round(parentStats.homeworkCompletionRate)}%` },
      ];
    }
    return [
      { label: "Students", value: totalStudentsCount.toString() },
      { label: "Teachers", value: teachersCount.toString() },
      { label: "Attendance", value: attendanceToday.toString() },
    ];
  }, [user?.role, parentStats, totalStudentsCount, teachersCount, attendanceToday]);

  const groupedItems = React.useMemo(() => {
    const groups: Record<string, NavItem[]> = {
      "Dashboard": [],
      "Administration": [],
      "Reports and Communication": [],
      "More": []
    };

    navItems.forEach(item => {
      if (item.is_active === false) return;
      const featureKey = item.featureName || (item as any).feature_name;
      if (!hasPermission(user, featureKey || 'unknown', item.to)) return;

      const category = item.category;
      if (category === 'Academics' || item.to.includes('dashboard')) {
        groups["Dashboard"].push(item);
      } else if (category === 'Administration') {
        groups["Administration"].push(item);
      } else if (category === 'Reports and Communication' || category === 'Reports' || category === 'Communication') {
        groups["Reports and Communication"].push(item);
      } else {
        groups["More"].push(item);
      }
    });

    return groups;
  }, [navItems, user]);

  const ModuleCard = ({ item }: { item: NavItem }) => {
    const Icon = item.icon;

    const handleNavigate = () => {
      if (item.to.includes('dashboard')) {
        navigate(`${item.to}${item.to.includes('?') ? '&' : '?'}show_stats=true`);
      } else {
        navigate(item.to);
      }
    };

    const getIconColors = () => {
      const label = item.label.toLowerCase();
      const category = item.category;

      if (category === 'Academics' || groups["Dashboard"].includes(item)) {
        if (label.includes("attendance")) return { bg: "bg-blue-500", text: "text-blue-600", glow: "shadow-blue-500/20" };
        if (label.includes("routine")) return { bg: "bg-cyan-500", text: "text-cyan-600", glow: "shadow-cyan-500/20" };
        if (label.includes("lesson")) return { bg: "bg-emerald-500", text: "text-emerald-600", glow: "shadow-emerald-500/20" };
        if (label.includes("homework")) return { bg: "bg-violet-500", text: "text-violet-600", glow: "shadow-violet-500/20" };
        if (label.includes("test") || label.includes("exam") || label.includes("marks") || label.includes("results")) return { bg: "bg-orange-500", text: "text-orange-600", glow: "shadow-orange-500/20" };
        if (label.includes("pre school") || label.includes("activities")) return { bg: "bg-cyan-500", text: "text-cyan-600", glow: "shadow-cyan-500/20" };
        if (label.includes("discipline")) return { bg: "bg-indigo-500", text: "text-indigo-600", glow: "shadow-indigo-500/20" };
        return { bg: "bg-blue-500", text: "text-blue-600", glow: "shadow-blue-500/20" };
      }

      if (category === 'Administration') {
        if (label.includes("registration") || label.includes("student")) return { bg: "bg-indigo-500", text: "text-indigo-600", glow: "shadow-indigo-500/20" };
        if (label.includes("teacher") || label.includes("hr") || label.includes("leave")) return { bg: "bg-purple-500", text: "text-purple-600", glow: "shadow-purple-500/20" };
        if (label.includes("attendance")) return { bg: "bg-green-500", text: "text-green-600", glow: "shadow-green-500/20" };
        if (label.includes("inventory") || label.includes("asset") || label.includes("id card")) return { bg: "bg-teal-500", text: "text-teal-600", glow: "shadow-teal-500/20" };
        if (label.includes("transport") || label.includes("settings")) return { bg: "bg-red-500", text: "text-red-600", glow: "shadow-red-500/20" };
        return { bg: "bg-indigo-500", text: "text-indigo-600", glow: "shadow-indigo-500/20" };
      }

      if (category === 'Reports and Communication' || category === 'Reports' || category === 'Communication') {
        if (label.includes("message") || label.includes("meeting")) return { bg: "bg-pink-500", text: "text-pink-600", glow: "shadow-pink-500/20" };
        if (label.includes("report") || label.includes("summary")) return { bg: "bg-yellow-500", text: "text-yellow-600", glow: "shadow-yellow-500/20" };
        if (label.includes("performance") || label.includes("record") || label.includes("calendar")) return { bg: "bg-orange-500", text: "text-orange-600", glow: "shadow-orange-500/20" };
        if (label.includes("finance")) return { bg: "bg-sky-500", text: "text-sky-600", glow: "shadow-sky-500/20" };
        return { bg: "bg-purple-500", text: "text-purple-600", glow: "shadow-purple-500/20" };
      }

      return { bg: "bg-slate-500", text: "text-slate-600", glow: "shadow-slate-500/20" };
    };

    const colors = getIconColors();

    return (
      <button
        onClick={handleNavigate}
        className="flex flex-col items-center gap-2 active:scale-95 transition-all text-center group w-full"
      >
        <div className="relative flex items-center justify-center h-16 w-full">
          {/* Glow Effect */}
          <div className={cn(
            "absolute inset-3 rounded-full blur-xl opacity-50 transition-opacity group-hover:opacity-70",
            colors.bg
          )} />

          <div className={cn(
            "h-14 w-14 rounded-2xl flex items-center justify-center bg-white shadow-[0_8px_20px_rgba(0,0,0,0.06)] relative z-10 transition-transform group-hover:scale-110",
            colors.glow
          )}>
            <Icon className={cn("h-7 w-7", colors.text)} />
          </div>
        </div>
        <span className="text-[10px] font-bold text-slate-800 leading-tight line-clamp-2 px-1 h-8 flex items-start justify-center">
          {item.label}
        </span>
      </button>
    );
  };

  const groups = groupedItems;

  if (!userPreferences.modernMobileUI) {
    return (
      <div className="grid grid-cols-2 gap-4 p-4 pb-24">
        {navItems.map((item, idx) => {
          if (item.is_active === false) return null;
          const featureKey = item.featureName || (item as any).feature_name;
          if (!hasPermission(user, featureKey || 'unknown', item.to)) return null;

          const Icon = item.icon;
          return (
            <button
              key={idx}
              onClick={() => navigate(item.to)}
              className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl bg-card border shadow-sm active:bg-accent transition-colors"
            >
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Icon className="h-6 w-6" />
              </div>
              <span className="text-xs font-medium text-center">{item.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-5 pb-40 animate-in fade-in duration-700 bg-gray-50 min-h-screen font-inter">
      <DashboardHeader />

      {/* Welcome Card */}
      <div className="bg-white rounded-[2rem] p-6 shadow-[0_15px_40px_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-black text-slate-900 tracking-tighter">Welcome Back!</h1>
            <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">
              {format(new Date(), 'EEEE, MMMM do')}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Avatar className="h-12 w-12 border-2 border-slate-50 shadow-sm">
              <AvatarImage src={user?.photo_url || ""} />
              <AvatarFallback className="bg-blue-50 text-blue-600 font-black">
                {user?.username?.substring(0, 2).toUpperCase() || 'US'}
              </AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-1.5 bg-emerald-50 px-2 py-1 rounded-full">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] font-black text-emerald-600 uppercase tracking-tight">System Online</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {kpis.map((stat, idx) => (
            <div key={idx} className="bg-slate-50/80 rounded-2xl p-3 flex flex-col items-center gap-1 border border-slate-100/50">
              <span className="text-lg font-black text-slate-900 tracking-tight">{stat.value}</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Favorites */}
      {favorites.length > 0 && (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between px-1">
             <h2 className="font-black text-slate-900 text-xs flex items-center gap-2 uppercase tracking-[0.2em] opacity-80">
              <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" /> Favorites
            </h2>
            <button
              onClick={() => setIsFavoritesDialogOpen(true)}
              className="text-[9px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2.5 py-1 rounded-full"
            >
              Edit
            </button>
          </div>
          <div className="grid grid-cols-4 gap-y-8 gap-x-2">
            {navItems.filter(i => favorites.includes(i.to)).map((item, idx) => (
              <ModuleCard key={idx} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* Main Sections */}
      {Object.entries(groups).map(([category, items]) => {
        if (items.length === 0) return null;
        return (
          <div key={category} className="flex flex-col gap-6">
            <div className="flex flex-col gap-4">
              <div className="h-px bg-slate-200 w-full" />
              <h2 className="font-black text-slate-900 text-[12px] px-1 tracking-[0.2em] uppercase text-center opacity-90">{category}</h2>
            </div>
            <div className="grid grid-cols-4 gap-y-6 gap-x-1">
              {items.map((item, idx) => (
                <ModuleCard key={idx} item={item} />
              ))}
            </div>
          </div>
        );
      })}

      {/* Floating Action Button */}
      <div className="fixed bottom-32 right-6 z-50">
        <button
          className="h-16 w-16 rounded-[2rem] bg-gradient-to-br from-blue-600 to-purple-600 shadow-2xl shadow-blue-600/40 flex items-center justify-center text-white active:scale-90 transition-all border-4 border-white"
          onClick={() => setIsFavoritesDialogOpen(true)}
        >
          <Plus className="h-9 w-9" />
        </button>
      </div>

      <Dialog open={isFavoritesDialogOpen} onOpenChange={setIsFavoritesDialogOpen}>
        <DialogContent className="max-w-[94vw] rounded-[3rem] p-0 overflow-hidden border-none shadow-2xl font-inter">
          <DialogHeader className="p-8 bg-slate-950 text-white relative">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Star className="h-24 w-24" />
            </div>
            <DialogTitle className="text-2xl font-black flex items-center gap-3 uppercase tracking-tighter">
              <Star className="h-6 w-6 text-amber-400 fill-amber-400" /> Quick Access
            </DialogTitle>
            <DialogDescription className="text-slate-400 font-bold text-sm mt-1 uppercase tracking-wider">
              Pin your most used modules
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 space-y-6 max-h-[65vh] overflow-y-auto custom-scrollbar bg-white">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 transition-colors group-focus-within:text-primary" />
              <Input
                placeholder="Search modules..."
                className="pl-12 h-14 rounded-[1.5rem] bg-slate-50 border-slate-100 font-bold text-slate-900 focus:bg-white transition-all shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-3">
              {navItems
                .filter(item => {
                  const labelMatch = item.label.toLowerCase().includes(searchQuery.toLowerCase());
                  const isPermitted = hasPermission(user, item.featureName || (item as any).feature_name || 'unknown', item.to);
                  const isActive = item.is_active !== false;
                  return labelMatch && isPermitted && isActive;
                })
                .map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      toggleFavorite(item.to);
                      setIsFavoritesDialogOpen(false);
                      setSearchQuery("");
                    }}
                    className="flex items-center gap-5 p-5 rounded-[1.5rem] bg-slate-50/50 hover:bg-slate-100 active:bg-slate-200 transition-all text-left border border-transparent active:border-slate-200 group"
                  >
                    <div className="h-12 w-12 rounded-2xl bg-white shadow-sm text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <item.icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <p className="font-black text-slate-900 tracking-tight">{item.label}</p>
                      <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-0.5">{item.category || 'System'}</p>
                    </div>
                    {favorites.includes(item.to) ? (
                      <div className="h-8 w-8 rounded-full bg-rose-100 flex items-center justify-center shadow-sm">
                        <X className="h-4 w-4 text-rose-600 stroke-[3px]" />
                      </div>
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center shadow-sm">
                        <Plus className="h-4 w-4 text-blue-600 stroke-[3px]" />
                      </div>
                    )}
                  </button>
                ))}
            </div>
          </div>
          <div className="p-6 bg-slate-50 border-t flex justify-end">
            <Button variant="outline" onClick={() => setIsFavoritesDialogOpen(false)} className="font-black rounded-2xl text-slate-600 h-12 px-8 uppercase tracking-widest text-xs border-slate-200">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
