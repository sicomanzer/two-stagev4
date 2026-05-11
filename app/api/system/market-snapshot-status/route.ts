import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const maxDuration = 30;

const getBangkokDate = (value: string | Date) => {
  const d = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(d);
};

export async function GET() {
  let supabaseLastUpdatedAt: string | null = null;
  let supabaseCount = 0;

  if (supabaseAdmin) {
    const { data: last } = await supabaseAdmin
      .from('stock_market_snapshot')
      .select('updated_at')
      .order('updated_at', { ascending: false })
      .limit(1);
    supabaseLastUpdatedAt = last?.[0]?.updated_at ?? null;

    const { count } = await supabaseAdmin
      .from('stock_market_snapshot')
      .select('*', { count: 'exact', head: true });
    supabaseCount = count ?? 0;
  }

  const token = process.env.GITHUB_ACTIONS_TRIGGER_TOKEN;
  const owner = process.env.GITHUB_REPO_OWNER || 'sicomanzer';
  const repo = process.env.GITHUB_REPO_NAME || 'two-stagev4';
  const workflow = process.env.GITHUB_SNAPSHOT_WORKFLOW_FILE || 'daily-market-snapshot.yml';
  const ref = process.env.GITHUB_SNAPSHOT_REF || process.env.GITHUB_SYNC_REF || 'main';

  let workflowLastRunAt: string | null = null;
  let workflowLastRunStatus: string | null = null;
  let workflowLastRunConclusion: string | null = null;
  let canTriggerToday: boolean | null = null;

  if (token) {
    try {
      const runsUrl = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflow}/runs?per_page=1&branch=${encodeURIComponent(ref)}`;
      const res = await fetch(runsUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'two-stagev4'
        }
      });
      if (res.ok) {
        const json: any = await res.json().catch(() => null);
        const run = json?.workflow_runs?.[0];
        workflowLastRunAt = run?.created_at ?? null;
        workflowLastRunStatus = run?.status ?? null;
        workflowLastRunConclusion = run?.conclusion ?? null;
        const today = getBangkokDate(new Date());
        canTriggerToday = workflowLastRunAt ? getBangkokDate(workflowLastRunAt) !== today : true;
      }
    } catch {
      canTriggerToday = null;
    }
  }

  return NextResponse.json({
    supabaseLastUpdatedAt,
    supabaseCount,
    workflowLastRunAt,
    workflowLastRunStatus,
    workflowLastRunConclusion,
    canTriggerToday
  });
}

