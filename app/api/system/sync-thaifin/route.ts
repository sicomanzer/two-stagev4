import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export const runtime = 'nodejs';
export const maxDuration = 300;

type SyncMode = 'default' | 'all';

const runSyncScript = (mode: SyncMode): Promise<{ stdout: string; stderr: string; exitCode: number | null }> => {
  return new Promise((resolve, reject) => {
    const projectRoot = process.cwd();
    const scriptPath = path.join(projectRoot, 'scripts', 'sync_thaifin_cache.py');
    const pythonBin = process.env.PYTHON_BIN || (process.platform === 'win32' ? 'python' : 'python3');
    const args = mode === 'all' ? [scriptPath, '--all'] : [scriptPath];
    const child = spawn(pythonBin, args, {
      cwd: projectRoot,
      env: process.env,
      shell: false,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', (error) => reject(error));
    child.on('close', (code) => {
      resolve({ stdout, stderr, exitCode: code });
    });
  });
};

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const mode: SyncMode = body?.mode === 'all' ? 'all' : 'default';
    const result = await runSyncScript(mode);
    const ok = result.exitCode === 0;
    const output = `${result.stdout}\n${result.stderr}`.trim();
    const tail = output.split('\n').filter(Boolean).slice(-30).join('\n');

    return NextResponse.json(
      {
        success: ok,
        mode,
        exitCode: result.exitCode,
        outputTail: tail,
      },
      { status: ok ? 200 : 500 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
