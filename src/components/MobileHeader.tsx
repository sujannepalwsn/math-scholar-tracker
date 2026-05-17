import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, LogOut, User, Search, Menu, Building } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import SchoolBranding from './dashboard/SchoolBranding';

interface MobileHeaderProps {
  showBackButton?: boolean;
  onLogout: () => void;
  title?: string;
  isLauncher?: boolean;
}

export default function MobileHeader({ showBackButton, onLogout, title, isLauncher }: MobileHeaderProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { userPreferences } = useTheme();

  const { data: center } = useQuery({
    queryKey: ["center-branding", user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return null;
      const { data, error } = await supabase
        .from("centers")
        .select("*")
        .eq("id", user.center_id)
        .maybeSingle();
      if (error) return null;
      return data;
    },
    enabled: !!user?.center_id,
    staleTime: 1000 * 60 * 5,
  });

  const handleSearchClick = () => {
    window.dispatchEvent(new CustomEvent('open-command-center'));
  };

  if (userPreferences.modernMobileUI) {
    return (
      <header className={cn(
        "fixed top-0 left-0 right-0 h-[calc(70px+var(--safe-area-inset-top))] z-40 flex items-center justify-between px-4 pt-safe transition-all bg-white/95 backdrop-blur-md border-b border-slate-100 text-slate-900"
      )}>
        {/* Background Image Overlay like desktop */}
        {isLauncher && center?.header_bg_url && (
          <div
            className="absolute inset-0 z-0 opacity-[0.15] pointer-events-none bg-cover bg-center"
            style={{ backgroundImage: `url(${center.header_bg_url})` }}
          />
        )}

        <div className="flex items-center gap-3 min-w-[40px] relative z-10">
          {!isLauncher && showBackButton && (
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

        <div className="flex-1 flex items-center justify-center overflow-hidden px-2 relative z-10">
          {isLauncher ? (
             <SchoolBranding fullTitle={true} />
          ) : (
            <span className="font-black text-slate-900 text-base leading-tight truncate tracking-tighter uppercase">
              {title}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 min-w-[80px] justify-end relative z-10">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-slate-600 hover:bg-slate-100 rounded-full"
            onClick={handleSearchClick}
          >
            <Search className="h-5 w-5" />
          </Button>

          <NotificationBell className="bg-transparent shadow-none hover:bg-slate-100 text-slate-600" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className={cn(
                "h-9 w-9 rounded-full p-0 transition-all active:scale-95 hover:bg-slate-100 border border-slate-200"
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

  // Classic UI Header
  return (
    <header className="fixed top-0 left-0 right-0 h-[calc(4rem+var(--safe-area-inset-top))] bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50 flex items-center justify-between px-4 pt-safe border-b">
      {/* Background Image Overlay like desktop */}
      {isLauncher && center?.header_bg_url && (
        <div
          className="absolute inset-0 z-0 opacity-10 pointer-events-none bg-cover bg-center"
          style={{ backgroundImage: `url(${center.header_bg_url})` }}
        />
      )}

      <div className="flex items-center gap-2 relative z-10">
        {showBackButton && (
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-8 w-8">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        {!showBackButton && isLauncher && (
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Menu className="h-5 w-5" />
          </Button>
        )}
        {isLauncher ? (
           <SchoolBranding fullTitle={true} />
        ) : (
          <span className="font-semibold text-foreground truncate max-w-[150px]">
            {title}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 relative z-10">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleSearchClick}>
          <Search className="h-5 w-5" />
        </Button>
        <NotificationBell />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full p-0">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.photo_url} />
                <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/change-password')}>
              Change Password
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onLogout}>
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
