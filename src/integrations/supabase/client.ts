import { createClient } from "@supabase/supabase-js"
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: typeof window !== 'undefined' ? localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true },
  global: {
    fetch: async (url, options = {}) => {
      const storedUser = typeof window !== 'undefined' ? localStorage.getItem('auth_user') : null;
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          const headers = new Headers(options.headers);
          if (user.center_id) headers.set('x-center-id', user.center_id);
          if (user.id) headers.set('x-user-id', user.id);
          if (user.role) headers.set('x-user-role', user.role);
          options.headers = headers;
        } catch (e) {
          console.error("Error parsing auth_user for headers", e);
        }
      }
      return fetch(url, options);
    },
    headers: {
      'X-Client-Info': '@supabase/supabase-js'
    }
  }
});
