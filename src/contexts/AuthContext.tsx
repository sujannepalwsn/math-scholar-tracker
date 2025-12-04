import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
// Auth context for managing user authentication state

// Define linked student interface
interface LinkedStudent {
  id: string;
  name: string;
  grade: string | null;
}

// Define the User interface based on the database schema
interface User {
  id: string;
  username: string;
  role: Tables<'users'>['role'];
  center_id: string | null;
  center_name?: string;
  student_id?: string | null;
  student_name?: string;
  teacher_id?: string | null;
  teacher_name?: string;
  centerPermissions?: Record<string, boolean>;
  teacherPermissions?: Record<string, boolean>;
  linked_students?: LinkedStudent[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      setLoading(true);
      const storedUser = localStorage.getItem('auth_user');
      if (storedUser) {
        const parsedUser: User = JSON.parse(storedUser);
        setUser(parsedUser);
        // Permissions are now fetched by the Edge Function during login,
        // but we can keep this for initial load if needed, or remove for simplicity.
        // For now, let's assume the stored user has the latest permissions.
      }
      setLoading(false);
    };
    loadUser();
  }, []);

  const login = async (
    username: string,
    password: string,
  ) => {
    console.log('AuthContext: login function called');
    try {
      console.log('AuthContext: Preparing to invoke auth-login Edge Function...'); // Added this line
      const { data, error: invokeError } = await supabase.functions.invoke('auth-login', {
        body: { username, password },
      });
      console.log('AuthContext: Edge Function invocation completed.');

      if (invokeError) {
        console.error('AuthContext: Edge Function invocation error:', invokeError);
        // Log the full error object for more details
        console.error('AuthContext: Full invokeError object:', JSON.stringify(invokeError, null, 2));
        return { success: false, error: invokeError.message || 'Login failed' };
      }

      if (!data.success) {
        console.error('AuthContext: Login failed from Edge Function:', data.error);
        return { success: false, error: data.error || 'Login failed' };
      }

      const loggedInUser: User = data.user;
      console.log('AuthContext: User logged in successfully:', loggedInUser.username);

      // The role check is now handled by ProtectedRoute after successful authentication
      // This allows any valid user to log in via the main login page and then be redirected
      // to their specific dashboard by the router.

      setUser(loggedInUser);
      localStorage.setItem('auth_user', JSON.stringify(loggedInUser));
      console.log('AuthContext: User state updated and stored in localStorage.');
      return { success: true };
    } catch (error: any) {
      console.error('AuthContext: Login error caught in client-side:', error);
      // Log the full error object for more details
      console.error('AuthContext: Full client-side error object:', JSON.stringify(error, null, 2));
      return { success: false, error: error.message || 'Login failed' };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    localStorage.removeItem('auth_user');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};