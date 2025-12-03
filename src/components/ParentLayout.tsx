import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, DollarSign, LogOut, User, Book, Paintbrush, AlertTriangle, KeyRound, Video, MessageSquare, Star, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import Sidebar from "./Sidebar"; // Import the new Sidebar component

const navItems: Array<{
  to: string;
  label: string;
  icon: React.ElementType;
  role?: 'admin' | 'center' | 'parent' | 'teacher';
}> = [
  { to: "/parent-dashboard", label: "Dashboard", icon: Home, role: 'parent' as const },
  { to: "/parent-finance", label: "Finance", icon: DollarSign, role: 'parent' as const },
  { to: "/parent-homework", label: "Homework", icon: Book, role: 'parent' as const },
  { to: "/parent-activities", label: "Activities", icon: Paintbrush, role: 'parent' as const },
  { to: "/parent-discipline", label: "Discipline", icon: AlertTriangle, role: 'parent' as const },
  { to: "/parent-meetings", label: "Meetings", icon: Video, role: 'parent' as const },
  { to: "/parent-messages", label: "Messages", icon: MessageSquare, role: 'parent' as const },
  { to: "/parent-chapter-rating", label: "Chapter Rating", icon: Star, role: 'parent' as const },
  { to: "/parent-lesson-tracking", label: "Lesson Tracking", icon: BookOpen, role: 'parent' as const },
  { to: "/change-password", label: "Change Password", icon: KeyRound, role: 'parent' as const },
];

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login-parent');
  };

  const headerContent = (
    <div className="flex items-center gap-2">
      <h1 className="text-xl font-bold text-foreground">Parent Portal</h1>
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
      <Sidebar
        navItems={navItems}
        headerContent={headerContent}
        footerContent={footerContent}
      />

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}