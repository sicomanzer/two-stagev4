import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  if (!supabaseAdmin) {
    return NextResponse.json(
      {
        success: false,
        error: 'Supabase admin client is not configured.'
      },
      { status: 500 }
    );
  }

  try {
    const [{ count: fundamentalsCount, error: fundamentalsError }, { count: snapshotCount, error: snapshotError }] =
      await Promise.all([
        supabaseAdmin.from('stock_fundamentals').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('stock_market_snapshot').select('*', { count: 'exact', head: true }),
      ]);

    if (fundamentalsError) throw fundamentalsError;
    if (snapshotError) throw snapshotError;

    return NextResponse.json({
      success: true,
      details: `เชื่อมต่อ Supabase สำเร็จ | stock_fundamentals: ${fundamentalsCount ?? 0} rows | stock_market_snapshot: ${snapshotCount ?? 0} rows`
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Unknown database error'
      },
      { status: 500 }
    );
  }
}
