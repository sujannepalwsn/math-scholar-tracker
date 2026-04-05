import React, { useState } from "react";
import { Activity, DollarSign, Home, KeyRound, LogOut, Settings, Shield, User, Building2, BarChart3, Receipt, Database, Zap, LayoutTemplate, Users, Menu, FileText, MousePointer2 } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";
import NotificationBell from "./NotificationBell";

const navItems: Array<{
  to: string;
  label: string;
  icon: React.ElementType;
  role: 'admin' | 'center' | 'parent' | 'teacher';
  category?: 'Academics' | 'Administration' | 'Reports and Communication';
}> = [
  { to: "/admin-dashboard", label: "Dashboard", icon: Home, role: 'admin' as const },
  { to: "/admin/centers", label: "Tuition Centers", icon: Building2, role: 'admin' as const, category: 'Administration' },
  { to: "/admin/analytics", label: "Center Analytics", icon: BarChart3, role: 'admin' as const, category: 'Reports and Communication' },
  { to: "/admin/billing", label: "Billing System", icon: Receipt, role: 'admin' as const, category: 'Administration' },
  { to: "/admin/usage", label: "Data Usage", icon: Database, role: 'admin' as const, category: 'Administration' },
  { to: "/admin/landing-page", label: "Page Editor", icon: LayoutTemplate, role: 'admin' as const, category: 'Administration' },
  { to: "/admin/demo-requests", label: "Revenue & Growth", icon: Users, role: 'admin' as const, category: 'Administration' },
  { to: "/admin/system-pages", label: "System Pages", icon: FileText, role: 'admin' as const, category: 'Administration' },
  { to: "/admin/subscriptions", label: "SaaS Subscriptions", icon: Zap, role: 'admin' as const, category: 'Administration' },
  { to: "/admin/finance", label: "Finance", icon: DollarSign, role: 'admin' as const, category: 'Administration' },
  { to: "/admin/visitor-logs", label: "Visitor Logs", icon: MousePointer2, role: 'admin' as const, category: 'Reports and Communication' },
  { to: "/admin/errors", label: "Error Tracking", icon: Activity, role: 'admin' as const, category: 'Reports and Communication' },
  { to: "/admin/settings", label: "Settings", icon: Settings, role: 'admin' as const, category: 'Administration' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login-admin');
  };

  const headerContent = (
    <div className="flex items-center gap-2">
      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
        <Shield className="h-4 w-4 text-primary" />
      </div>
      <span className="font-semibold text-foreground">Admin Panel</span>
    </div>
  );

  const footerContent = (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 text-sm">
        <User className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground truncate">{user?.username}</span>
      </div>
      <Button variant="ghost" size="sm" onClick={handleLogout}>
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background flex-col md:flex-row">
      <Sidebar
        navItems={navItems}
        headerContent={headerContent}
        footerContent={footerContent}
        onCollapseChange={setSidebarCollapsed}
        isMobileOpen={mobileMenuOpen}
        onMobileOpenChange={setMobileMenuOpen}
      />

      <header className="md:hidden fixed top-0 left-0 right-0 h-[50px] bg-white/90 backdrop-blur-xl border-b z-40 flex items-center justify-between px-2 shadow-sm">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(true)}
            className="h-9 w-9 bg-primary/5 text-primary rounded-xl"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Shield className="h-4 w-4 text-primary" />
          </div>
          <span className="font-semibold text-foreground text-sm">Admin</span>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <Button variant="ghost" size="icon" onClick={handleLogout} className="h-9 w-9 text-muted-foreground">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className={cn(
        "flex-1 overflow-y-auto bg-background transition-all duration-200",
        "md:h-screen",
        "pt-14 md:pt-0",
        "px-4 pb-20 md:p-6 lg:p-8",
        sidebarCollapsed ? "md:ml-20" : "md:ml-64"
      )}>
        <div className="page-enter max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      <BottomNav navItems={navItems} />
    </div>
  );
}
