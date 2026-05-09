import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission, getDashboardPath } from '@/utils/permissions';

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

  const filteredItems = React.useMemo(() => {
    return navItems.filter(item => {
      if (item.is_active === false) return false;
      const featureKey = item.featureName || (item as any).feature_name;

      // Filter out Dashboard from the main list as we'll add it as the first icon explicitly
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

  return (
    <div className="grid grid-cols-3 gap-3 p-4 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Dashboard Module */}
      <button
        onClick={() => navigate(`${dashboardPath}?show_stats=true`)}
        className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white/40 backdrop-blur-md border border-white/40 shadow-sm active:scale-95 transition-all aspect-square justify-center"
      >
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
          <Home className="h-6 w-6" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-tight text-center leading-tight">Dashboard</span>
      </button>

      {/* Other Permitted Modules */}
      {filteredItems.map((item, idx) => {
        const Icon = item.icon;
        return (
          <button
            key={`${item.to}-${idx}`}
            onClick={() => navigate(item.to)}
            className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white/40 backdrop-blur-md border border-white/40 shadow-sm active:scale-95 transition-all aspect-square justify-center"
          >
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary relative shadow-inner">
              <Icon className="h-6 w-6" />
              {item.unreadCount && item.unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-rose-500 text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                  {item.unreadCount > 9 ? '9+' : item.unreadCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-black uppercase tracking-tight text-center leading-tight truncate w-full px-1">
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
