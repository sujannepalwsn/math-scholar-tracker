import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

interface CenterTheme {
  primary: string;
  background: string;
  sidebar: string;
}

interface ThemeContextType {
  theme: CenterTheme | null;
  logoUrl: string | null;
  loading: boolean;
  refreshTheme: () => void;
}

const defaultTheme: CenterTheme = {
  primary: '#6366f1',
  background: '#ffffff',
  sidebar: '#1e293b',
};

const ThemeContext = createContext<ThemeContextType>({
  theme: null,
  logoUrl: null,
  loading: true,
  refreshTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [theme, setTheme] = useState<CenterTheme | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTheme = async () => {
    if (!user?.center_id) {
      setTheme(null);
      setLogoUrl(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('centers')
        .select('theme, logo_url')
        .eq('id', user.center_id)
        .single();

      if (error) throw error;

      if (data) {
        const centerTheme = (data as any).theme;
        const logo = (data as any).logo_url;
        
        if (centerTheme && typeof centerTheme === 'object') {
          setTheme({
            primary: centerTheme.primary || defaultTheme.primary,
            background: centerTheme.background || defaultTheme.background,
            sidebar: centerTheme.sidebar || defaultTheme.sidebar,
          });
        } else {
          setTheme(defaultTheme);
        }
        setLogoUrl(logo || null);
      }
    } catch (error) {
      console.error('Error fetching theme:', error);
      setTheme(defaultTheme);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTheme();
  }, [user?.center_id]);

  // Apply theme to CSS variables
  useEffect(() => {
    if (theme) {
      const root = document.documentElement;
      
      // Convert hex to HSL for CSS variables
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

      const primaryHsl = hexToHsl(theme.primary);
      if (primaryHsl) {
        root.style.setProperty('--primary', primaryHsl);
      }
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, logoUrl, loading, refreshTheme: fetchTheme }}>
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