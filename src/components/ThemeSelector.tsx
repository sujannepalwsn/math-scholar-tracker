import React from "react";
import { Check, Moon, Smartphone, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useTheme, ThemePreset } from "@/contexts/ThemeContext";

interface ThemeSelectorProps {
  onThemeChange?: () => void;
}

export default function ThemeSelector({ onThemeChange }: ThemeSelectorProps) {
  const { userPreferences, availablePresets, updateUserPreferences } = useTheme();

  const handleSelectTheme = async (preset: ThemePreset) => {
    await updateUserPreferences({ theme: preset.name });
    onThemeChange?.();
    toast.success(`Theme changed to ${preset.name}`);
  };

  const handleDarkMode = (enabled: boolean) => {
    updateUserPreferences({ darkMode: enabled });
    toast.success(enabled ? "Dark mode enabled" : "Light mode enabled");
  };

  const handleCompactMode = (enabled: boolean) => {
    updateUserPreferences({ compactMode: enabled });
    toast.success(enabled ? "Compact mode enabled" : "Compact mode disabled");
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Theme Presets */}
      <div>
        <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-4">Institutional Color Palettes</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {availablePresets.map((preset) => (
            <button
              key={preset.name}
              onClick={() => handleSelectTheme(preset)}
              className={cn(
                "relative group rounded-2xl border-2 p-4 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]",
                userPreferences.theme === preset.name
                  ? "border-primary bg-primary/5 shadow-soft ring-4 ring-primary/10"
                  : "border-border hover:border-primary/40 bg-card/40"
              )}
            >
              <div className="flex gap-2 mb-3">
                <div className="h-8 w-8 rounded-full border-2 border-white shadow-sm shrink-0" style={{ backgroundColor: preset.primary }} />
                <div className="h-8 w-8 rounded-full border-2 border-white shadow-sm shrink-0" style={{ backgroundColor: preset.secondary }} />
                <div className="h-8 w-8 rounded-full border-2 border-white shadow-sm shrink-0" style={{ backgroundColor: preset.background }} />
              </div>
              <p className={cn(
                "text-xs font-black text-left truncate uppercase tracking-tighter",
                userPreferences.theme === preset.name ? "text-primary" : "text-slate-600"
              )}>
                {preset.name}
              </p>
              {userPreferences.theme === preset.name && (
                <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-primary flex items-center justify-center shadow-medium animate-in zoom-in duration-300">
                  <Check className="h-3 w-3 text-primary-foreground stroke-[3px]" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Toggles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Card className="border-none shadow-soft rounded-3xl bg-card/60 backdrop-blur-md border border-border/20 overflow-hidden group hover:shadow-medium transition-all">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={cn(
                "p-3 rounded-2xl transition-colors duration-300",
                userPreferences.darkMode ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-400"
              )}>
                {userPreferences.darkMode ? <Moon className="h-6 w-6" /> : <Sun className="h-6 w-6" />}
              </div>
              <div>
                <Label className="font-black text-foreground/90 uppercase tracking-widest text-xs">Nocturnal Mode</Label>
                <p className="text-xs font-medium text-muted-foreground">High contrast dark appearance</p>
              </div>
            </div>
            <Switch
              checked={userPreferences.darkMode}
              onCheckedChange={handleDarkMode}
              className="data-[state=checked]:bg-primary"
            />
          </CardContent>
        </Card>

        <Card className="border-none shadow-soft rounded-3xl bg-card/60 backdrop-blur-md border border-border/20 overflow-hidden group hover:shadow-medium transition-all">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={cn(
                "p-3 rounded-2xl transition-colors duration-300",
                userPreferences.compactMode ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-400"
              )}>
                <Smartphone className="h-6 w-6" />
              </div>
              <div>
                <Label className="font-black text-foreground/90 uppercase tracking-widest text-xs">Information Density</Label>
                <p className="text-xs font-medium text-muted-foreground">Tighter spacing for data clarity</p>
              </div>
            </div>
            <Switch
              checked={userPreferences.compactMode}
              onCheckedChange={handleCompactMode}
              className="data-[state=checked]:bg-primary"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Keep initializeTheme for backward compatibility or initial load
export function initializeTheme() {
  const themeName = localStorage.getItem("app-theme-name");
  const darkMode = localStorage.getItem("app-dark-mode") === "true";
  const compactMode = localStorage.getItem("app-compact-mode") === "true";

  const root = document.documentElement;

  if (darkMode) root.classList.add("dark");
  if (compactMode) root.classList.add("compact");
}
