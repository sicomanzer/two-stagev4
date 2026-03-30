import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { results, criteria } = await request.json();
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'Groq API Key not configured.' }, { status: 500 });
    }

    if (!results || results.length === 0) {
      return NextResponse.json({ summary: 'ไม่พบหุ้นที่ผ่านเกณฑ์การกรอง' });
    }

    // Limit to top 15 results to save tokens
    const topResults = results.slice(0, 15).map((r: any, i: number) => {
      const rating = (r.viScore || 0) >= 16 ? '🟢 Strong Buy' : (r.viScore || 0) >= 13 ? '🟡 Buy' : (r.viScore || 0) >= 10 ? '🟠 Watch' : '🔴 Avoid';
      const risks = [];
      if (r.latestDE > 2) risks.push('D/E สูง');
      if (r.epsCAGR < 0) risks.push('EPS ลดลง');
      if (r.fScore <= 3) risks.push('F-Score ต่ำ');
      if (r.zScore < 1.8) risks.push('Z-Score เสี่ยง');
      return `#${i+1} ${r.ticker}: VI=${r.viScore}/20 ${rating} | P/E=${r.latestPE?.toFixed(1) || 'N/A'} P/BV=${r.latestPBV?.toFixed(1) || 'N/A'} ROE=${r.latestROE?.toFixed(1) || 0}% Yield=${r.latestYield?.toFixed(1) || 0}% D/E=${r.latestDE?.toFixed(2) || 'N/A'} F=${r.fScore}/9 Z=${r.zScore?.toFixed(2) || 'N/A'} EPS_CAGR=${r.epsCAGR?.toFixed(1) || 0}% DPS_CAGR=${r.dpsCAGR?.toFixed(1) || 0}% Cycle=${r.marketCycleLabel || 'N/A'}${risks.length ? ' ⚠️' + risks.join(',') : ''}`;
    }).join('\n');

    const prompt = `คุณคือเซียนหุ้น VI ระดับ Expert (Value Investing Guru) ที่มีประสบการณ์ลงทุนมากกว่า 20 ปี

## ข้อมูล Screener Criteria:
${criteria ? JSON.stringify(criteria, null, 2) : 'General Valuation Metrics'}

## หุ้นที่ผ่านเกณฑ์ (Top ${Math.min(results.length, 15)}):
${topResults}

## TASK — วิเคราะห์เชิงลึกเป็นภาษาไทย:

### 1. 🏆 Stock Ranking — จัดอันดับ Top 3 ที่น่าสนใจที่สุดพร้อมเหตุผล
- บอกว่าแต่ละตัว "ทำไมน่าซื้อ" (Bull Case) สั้นๆ 1-2 ประโยค
- ให้ Rating: 🟢 Strong Buy / 🟡 Buy / 🟠 Watch / 🔴 Avoid

### 2. ⚠️ Risk Alert — ตัวไหนต้องระวัง
- หุ้นที่อาจ "ดูดี แต่มีกับดัก" (Value Trap) บอกเหตุผล

### 3. 📊 ภาพรวมกลุ่ม
- Sector ไหนมีหุ้นผ่านเกณฑ์เยอะ? แสดงถึงอะไร?
- ค่าเฉลี่ยของกลุ่มน่าสนใจไหม?

### 4. 💡 คำแนะนำสำหรับนักลงทุน
- ถ้ามีงบ 100,000 บาท ควรเน้นตัวไหน? ทำไม?
- ข้อควรระวังก่อนตัดสินใจซื้อ

FORMAT: ใช้ Emoji + bullet points + ตัวหนา ให้อ่านง่าย กระชับ ไม่เกิน 400 คำ
⚠️ ห้ามภาษาอังกฤษยกเว้นชื่อหุ้นและ technical terms
⚠️ ตอบเฉพาะเนื้อหาวิเคราะห์เท่านั้น ห้ามมี prefix/disclaimer`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen/qwen3-32b',
        messages: [
          { role: 'system', content: 'You are a professional Thai Stock Screener Analyst. You MUST output your final answer securely in THAI language only.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 2048,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to call AI');
    }

    let aiResponse = data.choices[0].message.content;
    aiResponse = aiResponse.replace(/<think>[\s\S]*?(<\/think>|$)/gi, '').trim();

    if (!aiResponse) {
      aiResponse = "วิเคราะห์ข้อมูลซับซ้อนเกินกว่ากำหนดเวลาชั่วคราว กรุณากดขอคำแนะนำใหม่อีกครั้งครับ 🔄";
    }

    return NextResponse.json({ summary: aiResponse });

  } catch (error: any) {
    console.error('AI Screener Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
