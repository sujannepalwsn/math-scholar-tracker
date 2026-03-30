import { createClient } from "@supabase/supabase-js"
import type { Database } from './types';
import { logger } from "@/utils/logger";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

/**
 * EXPORT RAW CLIENT FOR LOGGER TO PREVENT CIRCULAR DEPENDENCY & INFINITE RECURSION
 * The logger uses this directly to insert logs without going through the Proxy.
 */
export const rawSupabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
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
 * Recursive Proxy helper to wrap all methods of a query builder to ensure
 * the .then() handler is preserved through chaining.
 */
function wrapQueryBuilder(builder: any, tableName: string): any {
  return new Proxy(builder, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);

      if (prop === 'then') {
        return function(onfulfilled: any, onrejected: any) {
          return value.call(this,
            async (response: any) => {
              if (response && response.error) {
                logger.error(`Database error on table: ${tableName}`, response.error, {
                  errorType: 'database',
                  schemaContext: tableName,
                  payload: { table: tableName, error: response.error }
                });
              }
              return onfulfilled ? onfulfilled(response) : response;
            },
            (err: any) => {
              logger.error(`Unhandled DB Promise rejection on table: ${tableName}`, err, {
                errorType: 'database',
                schemaContext: tableName,
                payload: { table: tableName, error: err }
              });
              return onrejected ? onrejected(err) : Promise.reject(err);
            }
          );
        };
      }

      if (typeof value === 'function') {
        return (...args: any[]) => {
          const result = value.apply(target, args);
          // If the result looks like a query builder (has a then method but isn't a promise), wrap it.
          // Note: Check for 'then' to handle chaining, but we only want to wrap if it's the builder.
          if (result && typeof result === 'object' && typeof result.then === 'function') {
            return wrapQueryBuilder(result, tableName);
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
    const value = Reflect.get(target, prop, receiver);

    if (prop === 'from') {
      return (tableName: string) => {
        const queryBuilder = value.call(target, tableName);

        // Skip interception for the logs table to prevent infinite loops
        if (tableName === 'error_logs') {
          return queryBuilder;
        }

        return wrapQueryBuilder(queryBuilder, tableName);
      };
    }
    return value;
  }
});
