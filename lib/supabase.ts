import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const createMockQuery = () => {
  const response = { data: [], error: null };
  const query: any = {
    select: () => query,
    insert: () => query,
    update: () => query,
    delete: () => query,
    upsert: () => query,
    eq: () => query,
    neq: () => query,
    gt: () => query,
    gte: () => query,
    lt: () => query,
    lte: () => query,
    like: () => query,
    ilike: () => query,
    in: () => query,
    contains: () => query,
    order: () => query,
    limit: () => query,
    range: () => query,
    single: () => Promise.resolve({ data: null, error: null }),
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
    then: (onFulfilled?: any, onRejected?: any) => Promise.resolve(response).then(onFulfilled, onRejected),
  };
  return query;
};

const createMockAuthError = () => ({ message: 'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.' });

export const supabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey)
  : {
      from: () => createMockQuery(),
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signInWithPassword: async () => ({ data: { user: null, session: null }, error: createMockAuthError() }),
        signUp: async () => ({ data: { user: null, session: null }, error: createMockAuthError() }),
        signOut: async () => ({ error: createMockAuthError() }),
        updateUser: async () => ({ data: { user: null }, error: createMockAuthError() }),
      },
    } as any;
