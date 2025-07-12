
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

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
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Defer profile fetching to avoid potential deadlocks
        setTimeout(() => {
          fetchProfile(session.user.id);
        }, 0);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', session?.user?.email);
      setSession(session);
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
    try {
      console.log('Fetching profile for user:', userId);
      
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        
        // If profile doesn't exist, try to create it from user metadata
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.user_metadata) {
          console.log('Creating profile from user metadata:', user.user_metadata);
          
          const newProfile = {
            id: userId,
            email: user.email || '',
            full_name: user.user_metadata.full_name || 'User',
            role: (user.user_metadata.role as 'admin' | 'student' | 'parent' | 'co_teacher') || 'student',
            phone: user.user_metadata.phone,
            grade: user.user_metadata.grade,
          };

          const { data: insertedProfile, error: insertError } = await supabase
            .from('profiles')
            .insert(newProfile)
            .select()
            .single();

          if (insertError) {
            console.error('Failed to create profile:', insertError);
            setProfile(null);
          } else {
            console.log('Profile created successfully:', insertedProfile);
            setProfile(insertedProfile as Profile);
          }
        } else {
          setProfile(null);
        }
      } else {
        console.log('Profile fetched successfully:', profileData);
        setProfile(profileData as Profile);
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
      setLoading(true);
      
      // Clear any auth state
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('supabase') || key.includes('sb-')) {
          localStorage.removeItem(key);
        }
      });

      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) {
        console.error('Sign out error:', error);
      }
      
      // Force page reload for clean state
      setTimeout(() => {
        window.location.href = '/auth';
      }, 500);
    } catch (error) {
      console.error('Exception during sign out:', error);
      // Force redirect even if sign out fails
      window.location.href = '/auth';
    }
  };

  return {
    user,
    session,
    profile,
    loading,
    signOut,
    isAuthenticated: !!user && !!session,
    isAdmin: profile?.role === 'admin',
    isTeacher: profile?.role === 'co_teacher' || profile?.role === 'admin',
    isStudent: profile?.role === 'student',
    isParent: profile?.role === 'parent',
  };
};
