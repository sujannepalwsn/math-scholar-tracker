import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, DollarSign, Settings, LogOut, User, Shield, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import Sidebar from "./Sidebar"; // Import the new Sidebar component

const navItems: Array<{
  to: string;
  label: string;
  icon: React.ElementType;
  role: 'admin' | 'center' | 'parent' | 'teacher';
}> = [
  { to: "/admin-dashboard", label: "Dashboard", icon: Home, role: 'admin' as const },
  { to: "/admin/finance", label: "Finance", icon: DollarSign, role: 'admin' as const },
  { to: "/admin/settings", label: "Settings", icon: Settings, role: 'admin' as const },
  { to: "/change-password", label: "Change Password", icon: KeyRound, role: 'admin' as const },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login-admin');
  };

  const headerContent = (
    <div className="flex items-center gap-2">
      <Shield className="h-6 w-6 text-destructive" />
      <h1 className="text-xl font-bold text-foreground">Admin Panel</h1>
    </div>
  );

  const footerContent = (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm">
        <User className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">{user?.username}</span>
      </div>
      <Button variant="ghost" size="sm" onClick={handleLogout}>
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Fixed Sidebar */}
      <div className="fixed top-0 left-0 h-screen z-10">
        <Sidebar
          navItems={navItems}
          headerContent={headerContent}
          footerContent={footerContent}
        />
      </div>

      {/* Main Content - Scrollable */}
      <main className="flex-1 p-6 overflow-y-auto h-screen ml-64">
        {children}
      </main>
    </div>
  );
}