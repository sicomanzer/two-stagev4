import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const maxDuration = 30;

async function getLocalCacheMeta() {
  try {
    const cache = await import('@/data/fundamentals-cache.json');
    const data: any = cache.default || cache;
    const tickers = data?.tickers || data;
    const count = tickers ? Object.keys(tickers).length : 0;
    return {
      updatedAt: data?.updatedAt ?? null,
      count
    };
  } catch {
    return { updatedAt: null, count: 0 };
  }
}

export async function GET() {
  const local = await getLocalCacheMeta();

  let supabaseLastUpdatedAt: string | null = null;
  if (supabaseAdmin) {
    const { data } = await supabaseAdmin
      .from('stock_fundamentals')
      .select('updated_at')
      .order('updated_at', { ascending: false })
      .limit(1);
    supabaseLastUpdatedAt = data?.[0]?.updated_at ?? null;
  }

  return NextResponse.json({
    localCacheUpdatedAt: local.updatedAt,
    localCacheCount: local.count,
    supabaseLastUpdatedAt
  });
}

