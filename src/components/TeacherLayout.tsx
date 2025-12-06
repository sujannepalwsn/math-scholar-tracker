import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, CheckSquare, BookOpen, Book, Paintbrush, AlertTriangle, FileText, ClipboardCheck, User, LogOut, KeyRound, Video, MessageSquare } from "lucide-react"; // Added Video icon
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import Sidebar from "./Sidebar";
import { useQuery } from "@tanstack/react-query"; // Import useQuery
import { supabase } from "@/integrations/supabase/client"; // Import supabase client

const navItems: Array<{
  to: string;
  label: string;
  icon: React.ElementType;
  role?: 'admin' | 'center' | 'parent' | 'teacher';
  featureName?: string;
  unreadCount?: number; // Added unreadCount
}> = [
  { to: "/teacher-dashboard", label: "Dashboard", icon: Home, role: 'teacher' as const },
  { to: "/teacher/take-attendance", label: "Take Attendance", icon: CheckSquare, role: 'teacher' as const, featureName: 'take_attendance' },
  { to: "/teacher/lesson-tracking", label: "Lesson Tracking", icon: BookOpen, role: 'teacher' as const, featureName: 'lesson_tracking' },
  { to: "/teacher/homework-management", label: "Homework Management", icon: Book, role: 'teacher' as const, featureName: 'homework_management' },
  { to: "/teacher/preschool-activities", label: "Preschool Activities", icon: Paintbrush, role: 'teacher' as const, featureName: 'preschool_activities' },
  { to: "/teacher/discipline-issues", label: "Discipline Issues", icon: AlertTriangle, role: 'teacher' as const, featureName: 'discipline_issues' },
  { to: "/teacher/test-management", label: "Test Management", icon: ClipboardCheck, role: 'teacher' as const, featureName: 'test_management' },
  { to: "/teacher/student-report", label: "Student Report", icon: User, role: 'teacher' as const, featureName: 'student_report_access' },
  { to: "/teacher-meetings", label: "Meetings", icon: Video, role: 'teacher' as const, featureName: 'meetings_management' },
  { to: "/teacher-messages", label: "Messages", icon: MessageSquare, role: 'teacher' as const }, // Updated route
  { to: "/change-password", label: "Change Password", icon: KeyRound, role: 'teacher' as const },
];

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login'); // Teachers also log in via the main login page
  };

  // Fetch unread message count for teacher
  const { data: unreadMessageCount = 0 } = useQuery({
    queryKey: ["unread-messages-teacher", user?.id, user?.center_id],
    queryFn: async () => {
      if (!user?.id || !user?.center_id) return 0;
      // Find conversation where this teacher's user ID is the 'parent_user_id' and center is their center
      // This is a workaround given the current schema, treating teacher's user as a 'parent' in a conversation with the center.
      const { data: conversation, error: convError } = await supabase
        .from('chat_conversations')
        .select('id')
        .eq('parent_user_id', user.id)
        .eq('center_id', user.center_id)
        .maybeSingle();
      
      if (convError || !conversation) {
        // console.log("No conversation found for teacher with center:", user.id, convError);
        return 0;
      }

      const { count, error } = await supabase
        .from('chat_messages')
        .select('id', { count: 'exact' })
        .eq('conversation_id', conversation.id)
        .eq('is_read', false)
        .neq('sender_user_id', user.id); // Messages NOT sent by the current teacher user
      if (error) {
        console.error("Error fetching unread messages for teacher:", error);
        return 0;
      }
      return count || 0;
    },
    enabled: !!user?.id && !!user?.center_id,
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  const updatedNavItems = navItems.map(item => 
    item.to === "/teacher-messages" ? { ...item, unreadCount: unreadMessageCount } : item
  );

  const headerContent = (
    <div className="flex items-center gap-2">
      <h1 className="text-xl font-bold text-foreground">Teacher Portal</h1>
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

  // Filter nav items based on teacher's specific permissions
  const filteredTeacherNavItems = updatedNavItems.filter(item => {
    if (item.featureName && user?.teacherPermissions) {
      return user.teacherPermissions[item.featureName];
    }
    return true; // Always show items without a specific featureName (like Dashboard, Change Password, Messages)
  });

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        navItems={filteredTeacherNavItems} // Pass the filtered items
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