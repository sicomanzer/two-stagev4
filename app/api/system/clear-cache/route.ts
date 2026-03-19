import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'fundamentals-cache.json');
    
    // Check if file exists
    if (fs.existsSync(filePath)) {
      // Create empty structure
      const emptyCache = {
        updatedAt: new Date().toISOString(),
        sourceBaseUrl: "http://localhost:5001",
        tickers: {}
      };
      
      fs.writeFileSync(filePath, JSON.stringify(emptyCache, null, 2), 'utf-8');
      
      return NextResponse.json({
        success: true,
        message: 'เคลียร์แคชเรียบร้อยแล้ว'
      });
    } else {
      return NextResponse.json({
        success: true,
        message: 'ไม่พบไฟล์แคช (แคชว่างอยู่แล้ว)'
      });
    }
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
