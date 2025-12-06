import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Add console logs to verify environment variables
console.log('Supabase Client: VITE_SUPABASE_URL loaded:', !!SUPABASE_URL);
console.log('Supabase Client: VITE_SUPABASE_PUBLISHABLE_KEY loaded:', !!SUPABASE_PUBLISHABLE_KEY);

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      'X-Client-Info': '@supabase/supabase-js'
    }
  }
});

console.log('Supabase Client: Client instance created.');