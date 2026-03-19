import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'sync-status.json');
    
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);
      return NextResponse.json(data);
    } else {
      return NextResponse.json({
        status: 'idle',
        percent: 0,
        current: 0,
        total: 0,
        ticker: ''
      });
    }
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'error',
        percent: 0,
        error: error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}
