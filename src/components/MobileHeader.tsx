import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import NotificationBell from './NotificationBell';
import SchoolBranding from './dashboard/SchoolBranding';
import { useAuth } from '@/contexts/AuthContext';

interface MobileHeaderProps {
  showBackButton?: boolean;
  onLogout: () => void;
  title?: string;
  isLauncher?: boolean;
}

export default function MobileHeader({ showBackButton, onLogout, title, isLauncher }: MobileHeaderProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 h-[60px] bg-white/80 backdrop-blur-xl border-b z-40 flex items-center justify-between px-3 shadow-sm">
      <div className="flex items-center gap-2 min-w-[40px]">
        {showBackButton && !isLauncher && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-10 w-10 rounded-2xl bg-slate-100/50 text-slate-600 active:scale-90 transition-transform"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
        )}
      </div>

      <div className="flex-1 flex justify-center overflow-hidden px-2">
        {isLauncher ? (
          <SchoolBranding isMobileCompact={true} />
        ) : (
          <span className="font-bold text-slate-800 truncate text-sm uppercase tracking-wider">
            {title || "Dashboard"}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 min-w-[40px] justify-end">
        <NotificationBell />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl p-0 hover:bg-slate-100">
              <Avatar className="h-8 w-8 border-2 border-white shadow-sm">
                <AvatarImage src={user?.photo_url} />
                <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                  {user?.username?.substring(0, 2).toUpperCase() || 'US'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-[1.5rem] p-2 shadow-2xl border-slate-100">
            <DropdownMenuLabel className="font-bold text-slate-900 px-3 py-2">
              <div className="flex flex-col">
                <span className="text-sm">{user?.username}</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{user?.role}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-slate-100" />
            <DropdownMenuItem className="rounded-xl focus:bg-slate-50 cursor-pointer py-2.5">
              <User className="mr-2 h-4 w-4" />
              <span>Profile Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-slate-100" />
            <DropdownMenuItem
              onClick={onLogout}
              className="rounded-xl focus:bg-rose-50 text-rose-600 focus:text-rose-600 cursor-pointer py-2.5"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
