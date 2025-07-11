
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
      // Use the properly typed profiles table from the Database types
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!profileError && profileData) {
        // Safely construct the profile object
        const profileObj: Profile = {
          id: profileData.id,
          email: profileData.email,
          full_name: profileData.full_name,
          role: profileData.role,
          phone: profileData.phone || undefined,
          avatar_url: profileData.avatar_url || undefined,
          created_at: profileData.created_at,
          updated_at: profileData.updated_at,
          grade: profileData.grade || undefined,
        };
        setProfile(profileObj);
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
            // Safely construct the profile object from inserted data  
            const profileObj: Profile = {
              id: insertedProfile.id,
              email: insertedProfile.email,
              full_name: insertedProfile.full_name,
              role: insertedProfile.role,
              phone: insertedProfile.phone || undefined,
              avatar_url: insertedProfile.avatar_url || undefined,
              created_at: insertedProfile.created_at,
              updated_at: insertedProfile.updated_at,
              grade: insertedProfile.grade || undefined,
            };
            setProfile(profileObj);
          } else {
            console.error('Failed to create profile:', insertError);
            setProfile(null);
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
