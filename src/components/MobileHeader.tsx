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
import { Search } from 'lucide-react';

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
    <header className={cn(
      "fixed top-0 left-0 right-0 h-[70px] z-40 flex items-center justify-between px-4 transition-all",
      isLauncher
        ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
        : "bg-white/95 backdrop-blur-md border-b border-slate-100 text-slate-900"
    )}>
      <div className="flex items-center gap-3 min-w-[40px]">
        {showBackButton && !isLauncher && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-10 w-10 rounded-full bg-slate-50 text-slate-600 active:scale-90 transition-transform"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
        )}
      </div>

      <div className="flex-1 flex items-center justify-center overflow-hidden px-2">
        {isLauncher ? (
          <div className="flex items-center gap-2">
            <Avatar className="h-9 w-9 border-2 border-white/20 shadow-sm">
              <AvatarImage src={user?.center_logo_url || ""} />
              <AvatarFallback className="bg-white/10 text-white text-xs font-bold">
                {user?.center_name?.substring(0, 2).toUpperCase() || 'GA'}
              </AvatarFallback>
            </Avatar>
            <span className="font-bold text-white text-base leading-tight truncate">
              {user?.center_name || "Global Academy"}
            </span>
          </div>
        ) : (
          title && (
            <span className="font-bold text-slate-800 truncate text-sm uppercase tracking-wider block text-center">
              {title}
            </span>
          )
        )}
      </div>

      <div className="flex items-center gap-1 min-w-[80px] justify-end">
        {isLauncher && (
          <Button variant="ghost" size="icon" className="h-10 w-10 text-white hover:bg-white/10 rounded-full">
            <Search className="h-5 w-5" />
          </Button>
        )}

        <div className={cn(isLauncher && "text-white [&_button]:bg-transparent [&_button]:shadow-none [&_button]:text-white [&_svg]:text-white")}>
          <NotificationBell />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className={cn(
              "h-9 w-9 rounded-full p-0 transition-all active:scale-95",
              isLauncher ? "border border-white/20" : "hover:bg-slate-100 border border-slate-200"
            )}>
              <Avatar className="h-7 w-7">
                <AvatarImage src={user?.photo_url} />
                <AvatarFallback className={cn(isLauncher ? "bg-white/10 text-white" : "bg-slate-100 text-slate-600")}>
                  <User className="h-3.5 w-3.5" />
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
