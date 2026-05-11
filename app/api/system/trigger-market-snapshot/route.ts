import { NextResponse } from 'next/server';

export const maxDuration = 30;

const getBangkokDate = (value: string | Date) => {
  const d = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(d);
};

export async function POST() {
  const token = process.env.GITHUB_ACTIONS_TRIGGER_TOKEN;
  const owner = process.env.GITHUB_REPO_OWNER || 'sicomanzer';
  const repo = process.env.GITHUB_REPO_NAME || 'two-stagev4';
  const workflow = process.env.GITHUB_SNAPSHOT_WORKFLOW_FILE || 'daily-market-snapshot.yml';
  const ref = process.env.GITHUB_SNAPSHOT_REF || process.env.GITHUB_SYNC_REF || 'main';

  if (!token) {
    return NextResponse.json({ error: 'Missing GITHUB_ACTIONS_TRIGGER_TOKEN' }, { status: 500 });
  }

  try {
    const runsUrl = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflow}/runs?per_page=1&branch=${encodeURIComponent(ref)}`;
    const runsRes = await fetch(runsUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'two-stagev4'
      }
    });
    if (runsRes.ok) {
      const json: any = await runsRes.json().catch(() => null);
      const lastRunAt: string | null = json?.workflow_runs?.[0]?.created_at ?? null;
      const today = getBangkokDate(new Date());
      if (lastRunAt && getBangkokDate(lastRunAt) === today) {
        return NextResponse.json({ error: 'วันนี้สั่งอัปเดตไปแล้ว (ได้วันละ 1 ครั้ง)' }, { status: 429 });
      }
    }
  } catch {}

  const url = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflow}/dispatches`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'two-stagev4'
    },
    body: JSON.stringify({ ref })
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return NextResponse.json({ error: 'Failed to dispatch workflow', status: res.status, details: text.slice(0, 500) }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

