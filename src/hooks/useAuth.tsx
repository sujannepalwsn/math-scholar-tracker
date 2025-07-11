
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
  grade?: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        // Defer profile fetching to prevent deadlocks
        setTimeout(() => {
          fetchProfile(session.user.id);
        }, 0);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    setLoading(true);
    try {
      // Try to get profile using RPC function first
      const { data: rpcData, error: rpcError } = await (supabase as any)
        .rpc('get_profile', { user_id: userId })
        .single();

      if (!rpcError && rpcData) {
        setProfile(rpcData as Profile);
      } else {
        // Fallback: try to get profile directly from profiles table
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (!profileError && profileData) {
          setProfile(profileData as Profile);
        } else {
          console.log('No profile found, creating from user metadata...');
          // Create profile from user metadata if it doesn't exist
          const user = await supabase.auth.getUser();
          if (user.data.user) {
            const metadata = user.data.user.user_metadata;
            const newProfile = {
              id: userId,
              email: user.data.user.email || '',
              full_name: metadata.full_name || 'User',
              role: metadata.role || 'student',
              phone: metadata.phone,
              grade: metadata.grade,
            };

            const { data: insertedProfile, error: insertError } = await supabase
              .from('profiles')
              .insert(newProfile)
              .select()
              .single();

            if (!insertError && insertedProfile) {
              setProfile(insertedProfile as Profile);
            } else {
              console.error('Failed to create profile:', insertError);
              setProfile(null);
            }
          }
        }
      }
    } catch (error) {
      console.error('Exception during fetchProfile:', error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      // Clean up auth state
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          localStorage.removeItem(key);
        }
      });
      
      // Attempt global sign out
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Continue even if this fails
      }
      
      // Force page reload for clean state
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
      // Force reload anyway
      window.location.href = '/';
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
