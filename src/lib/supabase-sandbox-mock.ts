import { sandboxData } from './sandbox-mock-data';

export class SupabaseSandboxMock {
  private tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  from(table: string) {
    return new SupabaseSandboxMock(table);
  }

  select(query: string = "*") {
    return this;
  }

  eq(column: string, value: any) {
    return this;
  }

  neq(column: string, value: any) {
    return this;
  }

  gt(column: string, value: any) {
    return this;
  }

  gte(column: string, value: any) {
    return this;
  }

  lt(column: string, value: any) {
    return this;
  }

  lte(column: string, value: any) {
    return this;
  }

  like(column: string, pattern: string) {
    return this;
  }

  ilike(column: string, pattern: string) {
    return this;
  }

  is(column: string, value: any) {
    return this;
  }

  in(column: string, values: any[]) {
    return this;
  }

  contains(column: string, value: any) {
    return this;
  }

  order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean }) {
    return this;
  }

  limit(count: number) {
    return this;
  }

  single() {
    return this.then((res: any) => ({ ...res, data: Array.isArray(res.data) ? res.data[0] : res.data }));
  }

  maybeSingle() {
    return this.single();
  }

  csv() { return this; }

  // Terminal method
  async then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any): Promise<any> {
    const data = (sandboxData as any)[this.tableName] || [];
    const response = { data, error: null, count: data.length, status: 200, statusText: "OK" };

    if (onfulfilled) {
      return Promise.resolve(onfulfilled(response));
    }
    return Promise.resolve(response);
  }

  // Support for rpc
  rpc(fn: string, args?: any) {
    return {
      then: (onfulfilled: any) => onfulfilled({ data: [], error: null })
    };
  }

  // Support for auth
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
      }
    };
  }

  // Support for edge functions
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
        return Promise.resolve({ data: null, error: null });
      }
    };
  }

  // Support for storage
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

  channel(name: string) {
    const channelMock: any = {
      on: (event: string, filter: any, callback: any) => {
        // If it's a 2-arg version (event, callback)
        return channelMock;
      },
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
