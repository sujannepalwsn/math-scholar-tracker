
import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Menu, 
  Home, 
  Users, 
  Calendar, 
  ClipboardCheck, 
  FileText, 
  BarChart3, 
  MessageSquare, 
  Settings, 
  LogOut,
  GraduationCap,
  BookOpen,
  UserCheck
} from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { profile, signOut, isAdmin, isTeacher, isStudent, isParent } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const menuItems = [
    { icon: Home, label: 'Dashboard', href: '/', roles: ['admin', 'student', 'parent', 'co_teacher'] },
    { icon: Users, label: 'Students', href: '/students', roles: ['admin', 'co_teacher'] },
    { icon: UserCheck, label: 'My Profile', href: '/profile', roles: ['student'] },
    { icon: Calendar, label: 'Lesson Plans', href: '/lessons', roles: ['admin', 'co_teacher', 'student'] },
    { icon: ClipboardCheck, label: 'Tests', href: '/tests', roles: ['admin', 'co_teacher', 'student'] },
    { icon: BookOpen, label: 'Assignments', href: '/assignments', roles: ['admin', 'co_teacher', 'student'] },
    { icon: FileText, label: 'Attendance', href: '/attendance', roles: ['admin', 'co_teacher', 'student', 'parent'] },
    { icon: BarChart3, label: 'Reports', href: '/reports', roles: ['admin', 'co_teacher', 'parent'] },
    { icon: MessageSquare, label: 'Messages', href: '/messages', roles: ['admin', 'co_teacher', 'student', 'parent'] },
    { icon: Settings, label: 'Settings', href: '/settings', roles: ['admin', 'co_teacher'] },
  ];

  const filteredMenuItems = menuItems.filter(item => 
    item.roles.includes(profile?.role || 'student')
  );

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Progress Tracker</h1>
            <p className="text-sm text-gray-500 capitalize">{profile?.role}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {filteredMenuItems.map((item) => (
          <Button
            key={item.href}
            variant="ghost"
            className="w-full justify-start gap-3 h-12 text-gray-700 hover:text-blue-600 hover:bg-blue-50"
            onClick={() => mobile && setSidebarOpen(false)}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </Button>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
          <Avatar className="w-10 h-10">
            <AvatarImage src={profile?.avatar_url} />
            <AvatarFallback className="bg-blue-600 text-white">
              {getInitials(profile?.full_name || 'User')}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {profile?.full_name}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {profile?.email}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 h-10 mt-2 text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={signOut}
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:w-64">
        <Sidebar />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <Sidebar mobile />
        </SheetContent>
      </Sheet>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 lg:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Sheet>
                <SheetTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="lg:hidden"
                    onClick={() => setSidebarOpen(true)}
                  >
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
              </Sheet>
              <h2 className="text-xl font-semibold text-gray-900">
                Welcome back, {profile?.full_name?.split(' ')[0]}!
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <Avatar className="w-8 h-8 lg:hidden">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback className="bg-blue-600 text-white text-sm">
                  {getInitials(profile?.full_name || 'User')}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
