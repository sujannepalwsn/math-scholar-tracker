import { logger } from "@/utils/logger";
import React, { createContext, useContext, useEffect, useState } from "react";
import { tracking } from "@/utils/tracking";
import { UserRole } from "@/types/roles";
import { User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client"
import { Tables } from "@/integrations/supabase/types"
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
  active_academic_year?: string | null;
  linked_students?: LinkedStudent[];
  // SECURITY: Metadata for UI/UX purposes only. NOT a secure source of truth.
  untrusted_metadata?: {
    permissions_fetched_at: string;
    is_ui_restricted: boolean;
  };
}

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

  useEffect(() => {
    const loadUser = async () => {
      setLoading(true);
      const storedUser = localStorage.getItem('auth_user');
      if (storedUser) {
        try {
          const parsedUser: User = JSON.parse(storedUser);
          setUser(parsedUser);

          // Fetch fresh permissions and metadata from DB to avoid stale localStorage data
          if (parsedUser.center_id) {
            // We use a helper function to avoid async in useEffect directly
            const fetchFreshData = async (userToUpdate: User) => {
              try {
                const updatedUser = { ...userToUpdate };
                let hasChanges = false;

                // Fetch fresh center metadata
                const { data: centerData } = await supabase
                  .from('centers')
                  .select('name')
                  .eq('id', userToUpdate.center_id!)
                  .maybeSingle();

                if (centerData && centerData.name !== userToUpdate.center_name) {
                  updatedUser.center_name = centerData.name;
                  hasChanges = true;
                }

                // Fetch user specific metadata like active_academic_year
                const { data: userData } = await supabase
                  .from('users')
                  .select('active_academic_year')
                  .eq('id', userToUpdate.id)
                  .maybeSingle();

                if (userData && userData.active_academic_year !== userToUpdate.active_academic_year) {
                  updatedUser.active_academic_year = userData.active_academic_year;
                  hasChanges = true;
                }

                // Always fetch center permissions
                const { data: centerPerms } = await supabase
                  .from('center_feature_permissions')
                  .select('*')
                  .eq('center_id', userToUpdate.center_id!)
                  .maybeSingle();

                if (centerPerms) {
                  updatedUser.centerPermissions = centerPerms;
                  hasChanges = true;
                }

                // Fetch teacher permissions if user is a teacher
                if (userToUpdate.role === UserRole.TEACHER && userToUpdate.teacher_id) {
                  const { data: teacherPerms } = await supabase
                    .from('teacher_feature_permissions')
                    .select('*')
                    .eq('teacher_id', userToUpdate.teacher_id)
                    .maybeSingle();

                  if (teacherPerms) {
                    updatedUser.teacherPermissions = teacherPerms;
                    updatedUser.teacher_scope_mode = teacherPerms.teacher_scope_mode || 'restricted';
                  } else {
                    updatedUser.teacher_scope_mode = 'restricted';
                  }
                  hasChanges = true;
                }

                if (hasChanges) {
                  updatedUser.untrusted_metadata = {
                    permissions_fetched_at: new Date().toISOString(),
                    is_ui_restricted: updatedUser.teacher_scope_mode === 'restricted'
                  };
                  setUser(updatedUser);
                  localStorage.setItem('auth_user', JSON.stringify(updatedUser));
                }
              } catch (err) {
                logger.error("Error fetching fresh permissions:", err);
              }
            };

            fetchFreshData(parsedUser);
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
    if (username === 'demo@eduflow.com' && password === 'demo1234') {
      const mockUser: User = {
        id: 'demo-user-id',
        username: 'demo@eduflow.com',
        role: UserRole.CENTER,
        center_id: 'demo-center-id',
        center_name: 'Demo Academy',
        untrusted_metadata: {
          permissions_fetched_at: new Date().toISOString(),
          is_ui_restricted: false
        }
      };
      setUser(mockUser);
      localStorage.setItem('auth_user', JSON.stringify(mockUser));
      return { success: true };
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

      // The role check is now handled by ProtectedRoute after successful authentication
      // This allows any valid user to log in via the main login page and then be redirected
      // to their specific dashboard by the router.

      // SECURITY: Permissions were removed from auth-login response.
      // Fetch them now after successful login.
      let updatedUser = { ...loggedInUser };

      if (loggedInUser.center_id) {
        const { data: userData } = await supabase
          .from('users')
          .select('active_academic_year')
          .eq('id', loggedInUser.id)
          .maybeSingle();

        if (userData) {
          updatedUser.active_academic_year = userData.active_academic_year;
        }

        const { data: centerPerms } = await supabase
          .from('center_feature_permissions')
          .select('*')
          .eq('center_id', loggedInUser.center_id)
          .maybeSingle();

        if (centerPerms) {
          updatedUser.centerPermissions = centerPerms;
        }

        if (loggedInUser.role === UserRole.TEACHER && loggedInUser.teacher_id) {
          const { data: teacherPerms } = await supabase
            .from('teacher_feature_permissions')
            .select('*')
            .eq('teacher_id', loggedInUser.teacher_id)
            .maybeSingle();

          if (teacherPerms) {
            updatedUser.teacherPermissions = teacherPerms;
            updatedUser.teacher_scope_mode = teacherPerms.teacher_scope_mode || 'restricted';
          }
        }
      }

      updatedUser.untrusted_metadata = {
        permissions_fetched_at: new Date().toISOString(),
        is_ui_restricted: updatedUser.teacher_scope_mode === 'restricted'
      };
      setUser(updatedUser);
      localStorage.setItem('auth_user', JSON.stringify(updatedUser));
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
