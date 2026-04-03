import { createClient } from "@supabase/supabase-js"
import type { Database } from './types';
import { logger } from "@/utils/logger";
import { mockSupabase } from "@/lib/supabase-sandbox-mock";

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

/**
 * Simple property check to identify PostgREST builders without triggering complex Proxy loops.
 */
const IS_PROXY = Symbol('IS_PROXY');

/**
 * Recursive Proxy helper to wrap all methods of a query builder to ensure
 * the .then() handler is preserved through chaining and context is captured.
 */
function wrapQueryBuilder(builder: any, tableName: string, queryLog: any[] = []): any {
  // Prevent double-wrapping
  if (builder?.[IS_PROXY]) return builder;

  return new Proxy(builder, {
    get(target, prop, receiver) {
      if (prop === IS_PROXY) return true;
      const value = Reflect.get(target, prop, receiver);

      if (prop === 'then' && typeof value === 'function') {
        return function(onfulfilled: any, onrejected: any) {
          // Bind the original 'then' to the target builder (the PostgREST query)
          return value.call(target,
            async (response: any) => {
              if (response && response.error) {
                // Use rawSupabase for internal errors to avoid recursion
                logger.error(`Database error on table: ${tableName}`, response.error, {
                  errorType: 'database',
                  schemaContext: tableName,
                  requestContext: { query: queryLog },
                  payload: { table: tableName, error: response.error }
                });
              }
              return onfulfilled ? onfulfilled(response) : response;
            },
            (err: any) => {
              logger.error(`Unhandled DB Promise rejection on table: ${tableName}`, err, {
                errorType: 'database',
                schemaContext: tableName,
                requestContext: { query: queryLog },
                payload: { table: tableName, error: err }
              });
              return onrejected ? onrejected(err) : Promise.reject(err);
            }
          );
        };
      }

      if (typeof value === 'function') {
        return (...args: any[]) => {
          // Capture the call in the query log for debugging
          const updatedLog = [...queryLog, { method: prop, args }];
          const result = value.apply(target, args);

          // Only wrap results that look like another PostgREST builder (thenable objects)
          // and are not the same object as target (to prevent redundant wrapping)
          if (result &&
              typeof result === 'object' &&
              typeof result.then === 'function' &&
              result !== target &&
              !result[IS_PROXY]) {
             return wrapQueryBuilder(result, tableName, updatedLog);
          }
          return result;
        };
      }

      return value;
    }
  });
}

/**
 * Proxy/Wrapper for the Supabase client to automatically capture schema context on errors.
 * This implementation uses a recursive proxy to ensure context is kept through method chaining.
 */
export const supabase = new Proxy(rawSupabase, {
  get(target, prop, receiver) {
    const isSandbox = typeof window !== 'undefined' && localStorage.getItem('is_sandbox') === 'true';
    const effectiveTarget = isSandbox ? mockSupabase : target;
    const value = Reflect.get(effectiveTarget, prop, receiver);

    if (prop === 'from' && typeof value === 'function') {
      return (tableName: string) => {
        const queryBuilder = value.call(target, tableName);

        // Skip interception for the logs table to prevent infinite loops
        if (tableName === 'error_logs') {
          return queryBuilder;
        }

        return wrapQueryBuilder(queryBuilder, tableName);
      };
    }

    if (typeof value === 'function') {
      return value.bind(target);
    }

    return value;
  }
});
