import React, { useState } from "react";
import { DollarSign, Home, KeyRound, LogOut, Settings, Shield, User } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";

const navItems: Array<{
  to: string;
  label: string;
  icon: React.ElementType;
  role: 'admin' | 'center' | 'parent' | 'teacher';
  category?: 'Academics' | 'Administration' | 'Reports and Communications';
}> = [
  { to: "/admin-dashboard", label: "Dashboard", icon: Home, role: 'admin' as const },
  { to: "/admin/finance", label: "Finance", icon: DollarSign, role: 'admin' as const, category: 'Reports and Communications' },
  { to: "/admin/settings", label: "Settings", icon: Settings, role: 'admin' as const, category: 'Administration' },
  { to: "/change-password", label: "Change Password", icon: KeyRound, role: 'admin' as const, category: 'Administration' },
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

      <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-card border-b z-20 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Shield className="h-4 w-4 text-primary" />
          </div>
          <span className="font-semibold text-foreground">Admin</span>
        </div>
        <Button variant="ghost" size="icon" onClick={handleLogout} className="h-9 w-9">
          <LogOut className="h-4 w-4" />
        </Button>
      </header>

      <main className={cn(
        "flex-1 overflow-y-auto bg-background transition-all duration-200",
        "md:h-screen",
        "pt-16 md:pt-0",
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
