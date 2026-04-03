import { SANDBOX_MOCK_DATA } from './sandbox-mock-data';

class MockQueryBuilder {
  private data: any[];
  private tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
    this.data = JSON.parse(JSON.stringify(SANDBOX_MOCK_DATA[tableName] || []));
  }

  select(columns: string = '*') {
    // Basic select simulation - in a real mock we could filter columns
    return this;
  }

  eq(column: string, value: any) {
    this.data = this.data.filter(item => item[column] === value);
    return this;
  }

  neq(column: string, value: any) {
    this.data = this.data.filter(item => item[column] !== value);
    return this;
  }

  in(column: string, values: any[]) {
    this.data = this.data.filter(item => values.includes(item[column]));
    return this;
  }

  limit(count: number) {
    this.data = this.data.slice(0, count);
    return this;
  }

  order(column: string, { ascending = true } = {}) {
    this.data.sort((a, b) => {
      if (a[column] < b[column]) return ascending ? -1 : 1;
      if (a[column] > b[column]) return ascending ? 1 : -1;
      return 0;
    });
    return this;
  }

  maybeSingle() {
    return Promise.resolve({ data: this.data[0] || null, error: null });
  }

  single() {
    if (this.data.length === 0) {
      return Promise.resolve({ data: null, error: { message: "No rows found" } });
    }
    return Promise.resolve({ data: this.data[0], error: null });
  }

  then(onfulfilled?: (value: any) => any) {
    const result = { data: this.data, error: null };
    return Promise.resolve(result).then(onfulfilled);
  }

  // Add dummy methods to prevent crashes
  insert(data: any) { console.log(`Mock DB: Insert into ${this.tableName}`, data); return this; }
  update(data: any) { console.log(`Mock DB: Update in ${this.tableName}`, data); return this; }
  delete() { console.log(`Mock DB: Delete from ${this.tableName}`); return this; }
  upsert(data: any) { console.log(`Mock DB: Upsert in ${this.tableName}`, data); return this; }
  rpc(name: string, args: any) { console.log(`Mock DB: RPC ${name}`, args); return Promise.resolve({ data: null, error: null }); }
}

export const mockSupabase = {
  from: (tableName: string) => new MockQueryBuilder(tableName),
  channel: () => {
    const channelObj = {
      on: () => channelObj,
      subscribe: () => ({})
    };
    return channelObj;
  },
  removeChannel: () => {},
  auth: {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    signOut: () => Promise.resolve({ error: null }),
    setSession: () => Promise.resolve({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
  },
  functions: {
    invoke: (name: string, options: any) => {
      console.log(`Mock DB: Edge Function ${name} called`, options);
      return Promise.resolve({ data: { success: true }, error: null });
    }
  },
  storage: {
    from: () => ({
      upload: () => Promise.resolve({ data: { path: "mock-path" }, error: null }),
      getPublicUrl: () => ({ data: { publicUrl: "https://via.placeholder.com/150" } })
    })
  }
};
