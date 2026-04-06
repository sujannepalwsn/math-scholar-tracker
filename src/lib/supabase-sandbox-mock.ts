import { sandboxData } from './sandbox-mock-data';

/**
 * A highly resilient mock for the Supabase client that uses a Proxy
 * to handle any method chain and return sensible defaults from sandboxData.
 */
export class SupabaseSandboxMock {
  private tableName: string;

  constructor(tableName: string = '') {
    this.tableName = tableName;

    // Bind methods to ensure 'this' is preserved when called via Proxy
    this.from = this.from.bind(this);
    this.select = this.select.bind(this);
    this.rpc = this.rpc.bind(this);
  }

  from(table: string) {
    return new SupabaseSandboxMock(table);
  }

  // Handle common filtering/chaining methods
  select(query: string = "*") { return this; }
  eq(column: string, value: any) { return this; }
  neq(column: string, value: any) { return this; }
  gt(column: string, value: any) { return this; }
  gte(column: string, value: any) { return this; }
  lt(column: string, value: any) { return this; }
  lte(column: string, value: any) { return this; }
  like(column: string, pattern: string) { return this; }
  ilike(column: string, pattern: string) { return this; }
  is(column: string, value: any) { return this; }
  in(column: string, values: any[]) { return this; }
  contains(column: string, value: any) { return this; }
  or(filters: string) { return this; }
  order(column: string, options?: any) { return this; }
  limit(count: number) { return this; }
  range(from: number, to: number) { return this; }
  abortSignal(signal: AbortSignal) { return this; }
  csv() { return this; }

  // Resilient fallback for any other method
  [key: string]: any;

  // Terminal methods
  single() {
    return this.then((res: any) => ({
      ...res,
      data: Array.isArray(res.data) ? res.data[0] : (res.data || null)
    }));
  }

  maybeSingle() {
    return this.single();
  }

  async then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any): Promise<any> {
    const data = (sandboxData as any)[this.tableName] || [];
    const response = {
      data,
      error: null,
      count: Array.isArray(data) ? data.length : 0,
      status: 200,
      statusText: "OK"
    };

    if (onfulfilled) {
      return Promise.resolve(onfulfilled(response));
    }
    return Promise.resolve(response);
  }

  // Mutations
  update(values: any) { return this; }
  insert(values: any) { return this; }
  upsert(values: any) { return this; }
  delete() { return this; }

  // RPC
  rpc(fn: string, args?: any) {
    return {
      then: (onfulfilled: any) => onfulfilled({ data: [], error: null })
    };
  }

  // Auth
  get auth() {
    return {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      signOut: () => Promise.resolve({ error: null }),
      onAuthStateChange: (callback: any) => {
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
      signInWithPassword: (credentials: any) => {
        return Promise.resolve({
          data: {
            user: { id: 'demo-user-id', email: credentials.email },
            session: { access_token: 'mock-token', refresh_token: 'mock-refresh' }
          },
          error: null
        });
      },
      setSession: () => Promise.resolve({ data: { session: {} }, error: null })
    };
  }

  // Edge Functions
  get functions() {
    return {
      invoke: (name: string, options?: any) => {
        if (name === 'auth-login') {
          return Promise.resolve({
            data: {
              success: true,
              user: (sandboxData as any).users[0],
              session: { access_token: 'mock-token', refresh_token: 'mock-refresh' }
            },
            error: null
          });
        }
        if (name === 'visitor-tracking') {
          return Promise.resolve({
            data: {
              success: true,
              sessionId: 'mock-session-id',
              visitorId: 'mock-visitor-id'
            },
            error: null
          });
        }
        return Promise.resolve({ data: null, error: null });
      }
    };
  }

  // Storage
  get storage() {
    return {
      from: () => ({
        upload: () => Promise.resolve({ data: {}, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: "" } }),
        list: () => Promise.resolve({ data: [], error: null }),
        remove: () => Promise.resolve({ data: [], error: null })
      })
    };
  }

  // Realtime
  channel(name: string) {
    const channelMock: any = {
      on: () => channelMock,
      subscribe: (callback: any) => {
        if (callback) callback('SUBSCRIBED');
        return channelMock;
      },
      unsubscribe: () => Promise.resolve()
    };
    return channelMock;
  }

  removeChannel(channel: any) {}
  removeAllChannels() {}
}
