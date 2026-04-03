import { createClient } from "@supabase/supabase-js"
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Use placeholder values to prevent the client from crashing on initialization
// if environment variables are missing. This allows the JS bundle to load
// and the error to be logged gracefully.
const url = SUPABASE_URL || "https://placeholder-project.supabase.co";
const key = SUPABASE_PUBLISHABLE_KEY || "placeholder-key";

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.error("Critical Configuration Error: Missing Supabase environment variables (VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY). Please check your .env file.");
}

/**
 * EXPORT RAW CLIENT FOR LOGGER TO PREVENT CIRCULAR DEPENDENCY & INFINITE RECURSION
 * The logger uses this directly to insert logs without going through the Proxy.
 */
export const rawSupabase = createClient<Database>(url, key, {
  auth: {
    storage: typeof window !== 'undefined' ? localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true
  },
  global: {
    headers: {
      'X-Client-Info': '@supabase/supabase-js'
    }
  }
});
