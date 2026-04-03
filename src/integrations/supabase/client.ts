import type { Database } from './types';
import { logger } from "@/utils/logger";
import { rawSupabase } from "./raw-client";
import { SupabaseSandboxMock } from "@/lib/supabase-sandbox-mock";

// Re-export rawSupabase for backward compatibility, though most things should use the proxy
export { rawSupabase };

/**
 * Simple property check to identify PostgREST builders without triggering complex Proxy loops.
 */
const IS_PROXY = Symbol('IS_PROXY');

const sandboxClient = new SupabaseSandboxMock('');

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
    // REDIRECT TO SANDBOX IF is_sandbox FLAG IS PRESENT IN LOCALSTORAGE
    if (typeof window !== 'undefined' && localStorage.getItem('is_sandbox') === 'true') {
      return Reflect.get(sandboxClient, prop);
    }

    const value = Reflect.get(target, prop, receiver);

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
