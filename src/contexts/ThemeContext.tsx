import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "./AuthContext"

interface CenterTheme {
  primary: string;
  background: string;
  sidebar: string;
  foreground?: string;
  cardBackground?: string;
  mutedForeground?: string;
}

export interface ThemePreset {
  name: string;
  primary: string;
  secondary: string;
  background: string;
}

export interface UserPreferences {
  theme: string;
  darkMode: boolean;
  compactMode: boolean;
}

interface ThemeContextType {
  theme: CenterTheme | null;
  userPreferences: UserPreferences;
  logoUrl: string | null;
  loading: boolean;
  refreshTheme: () => void;
  updateUserPreferences: (prefs: Partial<UserPreferences>) => Promise<void>;
  availablePresets: ThemePreset[];
}

export const themePresets: ThemePreset[] = [
  { name: "Modern Blue", primary: "#2563EB", secondary: "#3B82F6", background: "#F8FAFC" },
  { name: "Emerald School", primary: "#059669", secondary: "#10B981", background: "#F0FDF4" },
  { name: "Indigo Pro", primary: "#4F46E5", secondary: "#6366F1", background: "#EEF2FF" },
  { name: "Dark Academic", primary: "#111827", secondary: "#374151", background: "#F9FAFB" },
  { name: "Royal Purple", primary: "#7C3AED", secondary: "#8B5CF6", background: "#F5F3FF" },
  { name: "Warm Orange", primary: "#EA580C", secondary: "#FB923C", background: "#FFF7ED" },
  { name: "Teal Modern", primary: "#0F766E", secondary: "#14B8A6", background: "#F0FDFA" },
  { name: "Navy School", primary: "#1E3A8A", secondary: "#3B82F6", background: "#EFF6FF" },
  { name: "Graphite Dark", primary: "#1F2937", secondary: "#4B5563", background: "#111827" },
  { name: "Rose Elegant", primary: "#BE185D", secondary: "#F43F5E", background: "#FFF1F2" },
];

const defaultPreferences: UserPreferences = {
  theme: "Indigo Pro",
  darkMode: false,
  compactMode: false
};

const defaultTheme: CenterTheme = {
  primary: '#6366f1',
  background: '#ffffff',
  sidebar: '#1e293b' };

const ThemeContext = createContext<ThemeContextType>({
  theme: null,
  userPreferences: defaultPreferences,
  logoUrl: null,
  loading: true,
  refreshTheme: () => {},
  updateUserPreferences: async () => {},
  availablePresets: themePresets
});

const hexToHsl = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [theme, setTheme] = useState<CenterTheme | null>(null);
  const [userPreferences, setUserPreferences] = useState<UserPreferences>(defaultPreferences);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchThemeAndPrefs = async () => {
    if (!user?.id) {
      setTheme(null);
      setLogoUrl(null);
      setLoading(false);
      return;
    }

    try {
      // Fetch user preferences and center details in parallel
      const [userResult, centerResult] = await Promise.all([
        supabase.from('users').select('preferences').eq('id', user.id).single(),
        user.center_id
          ? supabase.from('centers').select('theme, logo_url').eq('id', user.center_id).single()
          : Promise.resolve({ data: null, error: null })
      ]);

      if (userResult.data?.preferences) {
        const prefs = userResult.data.preferences as any;
        setUserPreferences({
          theme: prefs.theme || defaultPreferences.theme,
          darkMode: prefs.darkMode ?? defaultPreferences.darkMode,
          compactMode: prefs.compactMode ?? defaultPreferences.compactMode
        });
      } else {
        // Fallback to local storage if DB doesn't have it yet
        const localTheme = localStorage.getItem("app-theme-name");
        const localDark = localStorage.getItem("app-dark-mode") === "true";
        const localCompact = localStorage.getItem("app-compact-mode") === "true";

        if (localTheme) {
          setUserPreferences({
            theme: localTheme,
            darkMode: localDark,
            compactMode: localCompact
          });
        }
      }

      if (centerResult.data) {
        const centerTheme = (centerResult.data as any).theme;
        const logo = (centerResult.data as any).logo_url;
        
        if (centerTheme && typeof centerTheme === 'object') {
          setTheme({
            primary: centerTheme.primary || defaultTheme.primary,
            background: centerTheme.background || defaultTheme.background,
            sidebar: centerTheme.sidebar || defaultTheme.sidebar,
            foreground: centerTheme.foreground,
            cardBackground: centerTheme.cardBackground,
            mutedForeground: centerTheme.mutedForeground });
        } else {
          setTheme(defaultTheme);
        }
        setLogoUrl(logo || null);
      }
    } catch (error) {
      console.error('Error fetching theme/preferences:', error);
      setTheme(defaultTheme);
    } finally {
      setLoading(false);
    }
  };

  const updateUserPreferences = async (newPrefs: Partial<UserPreferences>) => {
    if (!user?.id) return;

    const updated = { ...userPreferences, ...newPrefs };
    setUserPreferences(updated);

    try {
      const { error } = await supabase
        .from('users')
        .update({ preferences: updated } as any)
        .eq('id', user.id);

      if (error) throw error;

      // Also update local storage as a quick cache/backup
      localStorage.setItem("app-theme-name", updated.theme);
      localStorage.setItem("app-dark-mode", String(updated.darkMode));
      localStorage.setItem("app-compact-mode", String(updated.compactMode));
    } catch (error) {
      console.error('Error updating user preferences:', error);
    }
  };

  useEffect(() => {
    fetchThemeAndPrefs();
  }, [user?.id, user?.center_id]);

  // Apply theme to CSS variables
  useEffect(() => {
    const root = document.documentElement;
    const preset = themePresets.find(p => p.name === userPreferences.theme) || themePresets[2];

    // 1. Handle Dark Mode class
    if (userPreferences.darkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    // 2. Handle Compact Mode class
    if (userPreferences.compactMode) {
      root.classList.add("compact");
    } else {
      root.classList.remove("compact");
    }

    // 3. Apply Colors
    const applyVar = (varName: string, hex: string) => {
      const hsl = hexToHsl(hex);
      if (hsl) root.style.setProperty(varName, hsl);
    };

    // Primary
    applyVar('--primary', preset.primary);
    applyVar('--ring', preset.primary);
    root.style.setProperty('--primary-hex', preset.primary);

    // Secondary & Accent (Hover states and highlights)
    applyVar('--secondary', preset.secondary);
    root.style.setProperty('--secondary-foreground', '0 0% 100%');
    applyVar('--accent', preset.secondary);
    root.style.setProperty('--accent-foreground', '0 0% 100%');

    // Neutral (Backgrounds and cards)
    if (userPreferences.darkMode) {
      if (preset.name === "Graphite Dark") {
        applyVar('--background', preset.background);
        applyVar('--card', preset.background);
      } else {
        // Standard dark mode palette if not Graphite Dark
        root.style.setProperty('--background', '222 47% 6%');
        root.style.setProperty('--card', '222 47% 9%');
      }
      root.style.setProperty('--foreground', '210 40% 98%');
      root.style.setProperty('--card-foreground', '210 40% 98%');
    } else {
      applyVar('--background', preset.background);
      // For light mode, we use white for cards for better elevation visibility,
      // but we could also use a very light version of the background if preferred.
      applyVar('--card', '#ffffff');
      root.style.setProperty('--foreground', '222 47% 11%');
      root.style.setProperty('--card-foreground', '222 47% 11%');
    }

    // Sidebar
    if (userPreferences.darkMode) {
      root.style.setProperty('--sidebar-background', '222 47% 9%');
      root.style.setProperty('--sidebar-foreground', '210 40% 98%');
    } else {
      applyVar('--sidebar-background', '#ffffff');
      root.style.setProperty('--sidebar-foreground', '222 47% 11%');
    }
    applyVar('--sidebar-primary', preset.primary);

  }, [userPreferences]);

  return (
    <ThemeContext.Provider value={{
      theme,
      userPreferences,
      logoUrl,
      loading,
      refreshTheme: fetchThemeAndPrefs,
      updateUserPreferences,
      availablePresets: themePresets
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
