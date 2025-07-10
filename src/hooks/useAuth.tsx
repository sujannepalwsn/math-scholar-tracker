
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'student' | 'parent' | 'co_teacher';
  phone?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      // Use raw SQL query to bypass type issues while schema updates
      const { data, error } = await supabase
        .rpc('get_profile', { user_id: userId })
        .single();

      if (error) {
        console.log('Profile fetch error (expected during setup):', error);
        // For now, create a basic profile from user data if table doesn't exist yet
        if (user) {
          setProfile({
            id: user.id,
            email: user.email || '',
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
            role: (user.user_metadata?.role as Profile['role']) || 'student',
            created_at: user.created_at,
            updated_at: user.updated_at || user.created_at
          });
        }
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.log('Profile fetch error (expected during setup):', error);
      // Fallback to user metadata
      if (user) {
        setProfile({
          id: user.id,
          email: user.email || '',
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          role: (user.user_metadata?.role as Profile['role']) || 'student',
          created_at: user.created_at,
          updated_at: user.updated_at || user.created_at
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
    }
  };

  return {
    user,
    profile,
    loading,
    signOut,
    isAuthenticated: !!user,
    isAdmin: profile?.role === 'admin',
    isTeacher: profile?.role === 'co_teacher' || profile?.role === 'admin',
    isStudent: profile?.role === 'student',
    isParent: profile?.role === 'parent',
  };
};
