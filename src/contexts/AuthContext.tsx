import { logger } from "@/utils/logger";
import React, { createContext, useContext, useEffect, useState } from "react";
import { tracking } from "@/utils/tracking";
import { UserRole } from "@/types/roles";
import { supabase } from "@/integrations/supabase/client"
import { Tables } from "@/integrations/supabase/types"
import { sandboxData } from "@/lib/sandbox-mock-data";

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
  centerPermissions?: Record<string, any>;
  teacherPermissions?: Record<string, any>;
  teacher_scope_mode?: 'full' | 'restricted';
  linked_students?: LinkedStudent[];
  // SECURITY: Metadata for UI/UX purposes only. NOT a secure source of truth.
  untrusted_metadata?: {
    permissions_fetched_at: string;
    is_ui_restricted: boolean;
  };
}

interface CachedProfile {
  data: any;
  fetchedAt: number;
}

const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const buildUserObject = (profileData: any): User => {
    return {
      id: profileData.user.id,
      username: profileData.user.username,
      role: profileData.user.role,
      center_id: profileData.user.center_id,
      teacher_id: profileData.user.teacher_id,
      student_id: profileData.user.student_id,
      center_name: profileData.center.name,
      centerPermissions: profileData.centerPermissions,
      teacherPermissions: profileData.teacherPermissions,
      teacher_scope_mode: profileData.teacherPermissions?.teacher_scope_mode || 'restricted',
      linked_students: profileData.linkedStudents,
      untrusted_metadata: {
        permissions_fetched_at: new Date().toISOString(),
        is_ui_restricted: profileData.teacherPermissions?.teacher_scope_mode === 'restricted'
      }
    };
  };

  useEffect(() => {
    const loadUser = async () => {
      setLoading(true);
      const storedUser = localStorage.getItem('auth_user');
      if (storedUser) {
        try {
          const parsedUser: User = JSON.parse(storedUser);
          setUser(parsedUser);

          // Hybrid caching logic
          const now = Date.now();
          const cachedProfile = localStorage.getItem('cached_user_profile');

          if (cachedProfile) {
            const parsed: CachedProfile = JSON.parse(cachedProfile);
            if (now - parsed.fetchedAt < CACHE_DURATION) {
              setUser(buildUserObject(parsed.data));
              setLoading(false);
              return;
            }
          }

          // Consolidated RPC call
          const { data: profileData, error } = await supabase.rpc('get_user_profile_with_permissions', {
            p_user_id: parsedUser.id
          });

          if (!error && profileData) {
            localStorage.setItem('cached_user_profile', JSON.stringify({
              data: profileData,
              fetchedAt: now
            }));
            const updatedUser = buildUserObject(profileData);
            setUser(updatedUser);
            localStorage.setItem('auth_user', JSON.stringify(updatedUser));
          }
        } catch (e) {
          logger.error("Failed to parse auth_user", e);
        }
      }
      setLoading(false);
    };
    loadUser();
  }, []);

  const login = async (
    username: string,
    password: string,
  ) => {
    logger.debug('AuthContext: login function called');

    // MOCK LOGIN FOR DEMO/PLAYWRIGHT TESTING
    const isSandbox = typeof window !== 'undefined' && localStorage.getItem('is_sandbox') === 'true';
    if (isSandbox || (username === 'demo@eduflow.com' && password === 'demo1234')) {
      const sandboxUser = sandboxData.users.find(u => u.username === username);
      if (sandboxUser) {
        const mockUser: User = {
          id: sandboxUser.id,
          username: sandboxUser.username,
          role: sandboxUser.role as any,
          center_id: sandboxUser.center_id,
          center_name: sandboxUser.center_id ? (sandboxData.centers.find(c => c.id === sandboxUser.center_id)?.name || 'Demo Center') : undefined,
          student_id: (sandboxUser as any).student_id,
          linked_students: (sandboxUser as any).linked_students,
          untrusted_metadata: {
            permissions_fetched_at: new Date().toISOString(),
            is_ui_restricted: false
          }
        };
        setUser(mockUser);
        localStorage.setItem('auth_user', JSON.stringify(mockUser));
        return { success: true };
      }

      // Fallback for default demo account if not found in list (though it should be)
      if (username === 'demo@eduflow.com' && password === 'demo1234') {
        const mockUser: User = {
          id: 'demo-user-id',
          username: 'demo@eduflow.com',
          role: UserRole.ADMIN,
          center_id: null,
          center_name: undefined,
          untrusted_metadata: {
            permissions_fetched_at: new Date().toISOString(),
            is_ui_restricted: false
          }
        };
        setUser(mockUser);
        localStorage.setItem('auth_user', JSON.stringify(mockUser));
        return { success: true };
      }
    }


    try {
      logger.debug('AuthContext: Preparing to invoke auth-login Edge Function...');
      const { data, error: invokeError } = await supabase.functions.invoke('auth-login', {
        body: { username, password } });
      logger.debug('AuthContext: Edge Function invocation completed.');

      if (invokeError) {
        logger.error('AuthContext: Edge Function invocation error:', invokeError);
        tracking.trackEvent('error', 'login_exception', { error: invokeError.message });
        return { success: false, error: invokeError.message || 'Login failed' };
      }

      if (!data.success) {
        logger.error('AuthContext: Login failed from Edge Function:', data.error);
        tracking.trackEvent('error', 'login_failed', { error: data.error });
        return { success: false, error: data.error || 'Login failed' };
      }

      const loggedInUser: User = data.user;
      const session = data.session;
      logger.debug('AuthContext: User data received from Edge Function:', loggedInUser.username);

      if (session) {
        logger.debug('AuthContext: Setting Supabase session...');
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });

        if (sessionError) {
          logger.error('AuthContext: Error setting Supabase session:', sessionError);
        } else {
          logger.debug('AuthContext: Supabase session successfully established.');
        }
      } else {
        logger.warn('AuthContext: No session returned from login. RLS may block data access.');
      }

      // Consolidated RPC call after successful login
      const now = Date.now();
      const { data: profileData, error: profileError } = await supabase.rpc('get_user_profile_with_permissions', {
        p_user_id: loggedInUser.id
      });

      if (profileError || !profileData) {
        logger.error('AuthContext: Error fetching profile after login:', profileError);
        setUser(loggedInUser);
        localStorage.setItem('auth_user', JSON.stringify(loggedInUser));
      } else {
        localStorage.setItem('cached_user_profile', JSON.stringify({
          data: profileData,
          fetchedAt: now
        }));
        const updatedUser = buildUserObject(profileData);
        setUser(updatedUser);
        localStorage.setItem('auth_user', JSON.stringify(updatedUser));
      }
      logger.debug('AuthContext: User state (with untrusted permissions) updated and stored in localStorage.');
      return { success: true };
    } catch (error) {
      logger.error('AuthContext: Login error caught in client-side:', error);
      return { success: false, error: error.message || 'Login failed' };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    localStorage.removeItem('auth_user');
    localStorage.removeItem('cached_user_profile');
    localStorage.removeItem('is_sandbox');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setUser }}>
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
