import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface QuickActionProps {
  label: string;
  icon: LucideIcon;
  onClick?: () => void;
  className?: string;
  variant?: "outline" | "default" | "secondary" | "ghost";
}

export const QuickAction = ({
  label,
  icon: Icon,
  onClick,
  className,
  variant = "outline"
}: QuickActionProps) => {
  return (
    <Button
      variant={variant}
      onClick={onClick}
      className={cn(
        "flex items-center justify-start gap-3 h-12 px-6 rounded-xl font-bold text-sm tracking-tight transition-all duration-300 hover:scale-105 active:scale-95 shadow-soft border-white/20 bg-white/60 backdrop-blur-md",
        className
      )}
    >
      <Icon className="h-5 w-5 text-primary" />
      {label}
    </Button>
  );
};
