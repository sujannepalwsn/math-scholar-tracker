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

  from(table: string, options?: any) {
    let finalTableName = table;
    if (options?.count) {
      finalTableName = `${table}?count=${options.count}`;
    }
    return new SupabaseSandboxMock(finalTableName);
  }

  // Handle common filtering/chaining methods
  select(query: string = "*") { return this; }
  eq(column: string, value: any) {
    this.filters.push({ column, value });
    return this;
  }
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

  private filters: Array<{ column: string, value: any }> = [];

  async then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any): Promise<any> {
    // Handle complex table names like "centers?count=exact"
    let tableName = this.tableName.split('(')[0];
    if (tableName.includes('?')) {
      tableName = tableName.split('?')[0];
    }

    // Clean up trailing slash if any
    tableName = tableName.replace(/\/$/, '');

    let data = (sandboxData as any)[tableName] || [];

    // Apply simple equality filters
    if (this.filters.length > 0 && Array.isArray(data)) {
      data = data.filter(item =>
        this.filters.every(f => (item as any)[f.column] === f.value)
      );
    }

    // Simulate join for centers with users
    if (tableName === 'centers' && Array.isArray(data)) {
      data = data.map(center => ({
        ...center,
        users: (sandboxData as any).users.filter((u: any) => u.center_id === center.id)
      }));
    }

    // Handle count only requests
    if (this.tableName.includes('count=exact')) {
       return { data: null, error: null, count: Array.isArray(data) ? data.length : 0 };
    }

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
    let data: any = [];
    if (fn === 'calculate_effort_index') data = 85;
    if (fn === 'calculate_outcome_index') data = 78;
    if (fn === 'get_student_performance_trends') {
      data = [
        { evaluation_date: new Date(Date.now() - 20*24*60*60*1000).toISOString(), score: 70, max_score: 100, percentage: 70, trend_status: 'Stable', risk_level: 'Low' },
        { evaluation_date: new Date(Date.now() - 10*24*60*60*1000).toISOString(), score: 75, max_score: 100, percentage: 75, trend_status: 'Improving', risk_level: 'Low' },
        { evaluation_date: new Date().toISOString(), score: 82, max_score: 100, percentage: 82, trend_status: 'Improving', risk_level: 'Low' }
      ];
    }
    if (fn === 'get_system_stats') {
      data = {
        counts: {
          centers: 12,
          teachers: 45,
          students: 420,
          parents: 380,
          admins: 4
        },
        table_stats: [
          { table_name: 'attendance', estimated_rows: 15000, total_size_bytes: 2048000 },
          { table_name: 'invoices', estimated_rows: 5000, total_size_bytes: 1024000 }
        ],
        timestamp: new Date().toISOString()
      };
    }
    return {
      then: (onfulfilled: any) => onfulfilled({ data, error: null })
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
          const { username } = options?.body || {};
          const sandboxUser = (sandboxData as any).users.find((u: any) => u.username === username);

          if (!sandboxUser) {
            return Promise.resolve({
              data: { success: false, error: 'Invalid credentials' },
              error: null
            });
          }

          return Promise.resolve({
            data: {
              success: true,
              user: sandboxUser,
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
