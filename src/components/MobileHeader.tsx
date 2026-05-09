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
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

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
    <header className="fixed top-0 left-0 right-0 h-[70px] bg-white/95 backdrop-blur-md z-40 flex items-center justify-between px-4 border-b border-slate-100">
      <div className="flex items-center gap-3">
        {showBackButton && !isLauncher ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-10 w-10 rounded-full bg-slate-50 text-slate-600 active:scale-90 transition-transform"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
        ) : isLauncher ? (
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border shadow-sm">
              <AvatarImage src={user?.center_logo_url || ""} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                {user?.center_name?.substring(0, 2).toUpperCase() || 'GA'}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-bold text-slate-900 text-sm leading-tight">
                {user?.center_name || "Global Academy"}
              </span>
              <span className="text-[10px] text-muted-foreground font-medium">
                {user?.role === 'parent' ? "Parent Portal" : "English School"}
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {!isLauncher && title && (
        <div className="absolute left-1/2 -translate-x-1/2 overflow-hidden px-2 max-w-[50%]">
          <span className="font-bold text-slate-800 truncate text-sm uppercase tracking-wider block text-center">
            {title}
          </span>
        </div>
      )}

      <div className="flex items-center gap-2">
        <NotificationBell />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full p-0 hover:bg-slate-100 border border-slate-200">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.photo_url} />
                <AvatarFallback className="bg-slate-100 text-slate-600">
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 shadow-2xl border-slate-100">
            <DropdownMenuLabel className="font-bold text-slate-900 px-3 py-2">
              <div className="flex flex-col">
                <span className="text-sm">{user?.username}</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{user?.role}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-slate-100" />
            <DropdownMenuItem
              onClick={() => navigate('/change-password')}
              className="rounded-xl focus:bg-slate-50 cursor-pointer py-2.5"
            >
              <User className="mr-2 h-4 w-4" />
              <span>Change Password</span>
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
