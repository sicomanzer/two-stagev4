import { NextResponse } from 'next/server';

export const maxDuration = 30;

export async function POST() {
  const token = process.env.GITHUB_ACTIONS_TRIGGER_TOKEN;
  const owner = process.env.GITHUB_REPO_OWNER || 'sicomanzer';
  const repo = process.env.GITHUB_REPO_NAME || 'two-stagev4';
  const workflow = process.env.GITHUB_SYNC_WORKFLOW_FILE || 'daily-fundamentals-sync.yml';
  const ref = process.env.GITHUB_SYNC_REF || 'main';

  if (!token) {
    return NextResponse.json({ error: 'Missing GITHUB_ACTIONS_TRIGGER_TOKEN' }, { status: 500 });
  }

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

