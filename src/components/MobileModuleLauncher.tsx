import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission, getDashboardPath } from '@/utils/permissions';
import { UserRole } from '@/types/roles';
import { cn } from '@/lib/utils';

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  featureName?: string;
  is_active?: boolean;
  unreadCount?: number;
}

interface MobileModuleLauncherProps {
  navItems: NavItem[];
}

export default function MobileModuleLauncher({ navItems }: MobileModuleLauncherProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const getRoleColors = () => {
    switch (user?.role) {
      case UserRole.ADMIN:
      case UserRole.CENTER:
        return {
          bg: 'bg-[#f0f7ff]/80',
          iconBg: 'bg-[#0070f3] text-white',
          accent: 'border-blue-100/50',
          shadow: 'shadow-[0_20px_50px_rgba(0,112,243,0.05)]'
        };
      case UserRole.TEACHER:
        return {
          bg: 'bg-[#f0fff4]/80',
          iconBg: 'bg-[#10b981] text-white',
          accent: 'border-emerald-100/50',
          shadow: 'shadow-[0_20px_50px_rgba(16,185,129,0.05)]'
        };
      case UserRole.PARENT:
        return {
          bg: 'bg-[#fff5f0]/80',
          iconBg: 'bg-[#f97316] text-white',
          accent: 'border-orange-100/50',
          shadow: 'shadow-[0_20px_50px_rgba(249,115,22,0.05)]'
        };
      default:
        return {
          bg: 'bg-slate-50/80',
          iconBg: 'bg-slate-600 text-white',
          accent: 'border-slate-100/50',
          shadow: 'shadow-slate-900/5'
        };
    }
  };

  const colors = getRoleColors();

  const filteredItems = React.useMemo(() => {
    return navItems.filter(item => {
      if (item.is_active === false) return false;
      const featureKey = item.featureName || (item as any).feature_name;

      const isDashboard = item.label === "Dashboard" ||
                         item.to === "/center-dashboard" ||
                         item.to === "/teacher-dashboard" ||
                         item.to === "/parent-dashboard" ||
                         item.to === "/admin-dashboard";

      if (isDashboard) return false;

      return hasPermission(user, featureKey || 'unknown', item.to);
    });
  }, [navItems, user]);

  const dashboardPath = getDashboardPath(user?.role);

  const ModuleCard = ({ onClick, icon: Icon, label, unreadCount }: any) => (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-4 p-6 rounded-[2.5rem] bg-white border backdrop-blur-md transition-all active:scale-95 shadow-2xl justify-center aspect-square group relative overflow-hidden",
        colors.accent,
        colors.shadow
      )}
    >
      {/* Soft Background Tint */}
      <div className={cn("absolute inset-0 opacity-40", colors.bg)} />

      <div className={cn(
        "h-16 w-16 rounded-[1.5rem] flex items-center justify-center relative transition-all group-active:scale-90 shadow-lg z-10",
        colors.iconBg
      )}>
        <Icon className="h-8 w-8" />
        {unreadCount && unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 h-6 w-6 bg-rose-500 text-white text-[11px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-xl animate-bounce">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </div>
      <span className="text-[12px] font-black uppercase tracking-[0.1em] text-center leading-tight text-slate-800 px-1 z-10 w-full truncate">
        {label}
      </span>
    </button>
  );

  return (
    <div className="grid grid-cols-2 gap-5 p-5 pb-32 animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out">
      {/* Dashboard Module */}
      <ModuleCard
        onClick={() => navigate(`${dashboardPath}?show_stats=true`)}
        icon={Home}
        label="Dashboard"
      />

      {/* Other Permitted Modules */}
      {filteredItems.map((item, idx) => (
        <ModuleCard
          key={`${item.to}-${idx}`}
          onClick={() => navigate(item.to)}
          icon={item.icon}
          label={item.label}
          unreadCount={item.unreadCount}
        />
      ))}
    </div>
  );
}
