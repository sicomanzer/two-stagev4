import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { ticker, history, metrics, sector, industry } = await request.json();
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'Groq API Key not configured.' }, { status: 500 });
    }

    // Build safe history summary with null checks
    const historySummary = history.map((h: any) => {
      const roe = h.roe != null ? `${Number(h.roe).toFixed(1)}%` : 'N/A';
      const de = h.de != null ? Number(h.de).toFixed(2) : 'N/A';
      const rev = h.revenue != null ? h.revenue.toLocaleString() : 'N/A';
      const np = h.netProfit != null ? h.netProfit.toLocaleString() : 'N/A';
      const dps = h.dps != null ? h.dps : 'N/A';
      return `${h.year}: Revenue=${rev}, NetProfit=${np}, ROE=${roe}, DE=${de}, Div=${dps}`;
    }).join('\n');

    // Safe metric formatting (values already in correct units from frontend)
    const fmtPe = metrics.pe != null ? Number(metrics.pe).toFixed(2) : 'N/A';
    const fmtPbv = metrics.pbv != null ? Number(metrics.pbv).toFixed(2) : 'N/A';
    const fmtRoe = metrics.roe != null ? `${Number(metrics.roe).toFixed(1)}%` : 'N/A';
    const fmtDe = metrics.de != null ? Number(metrics.de).toFixed(2) : 'N/A';
    const fmtYield = metrics.yield != null ? `${Number(metrics.yield).toFixed(2)}%` : 'N/A';
    const fmtFScore = metrics.fScore ?? 'N/A';
    const fmtZScore = metrics.zScore != null ? Number(metrics.zScore).toFixed(2) : 'N/A';

    const prompt = `You are an expert Value Investor (VI) and Financial Analyst. 
Analyze the following stock data for "${ticker}" (${industry || 'N/A'} / ${sector || 'N/A'}).

STOCK HISTORY (Last 10+ Years):
${historySummary}

CURRENT METRICS:
- P/E: ${fmtPe}
- P/BV: ${fmtPbv}
- ROE: ${fmtRoe}
- D/E: ${fmtDe}
- Dividend Yield: ${fmtYield}
- F-Score: ${fmtFScore}/9
- Z-Score: ${fmtZScore}

TASK:
Provide a detailed qualitative analysis in THAI language.
1. **Economic Moat (คูเมืองทางธุรกิจ):** Identify competitive advantages based on ROE/GPM/NPM trends.
2. **Growth Quality (คุณภาพการเติบโต):** Is growth sustainable? Is it funded by debt or cash?
3. **Red Flags (ข้อควรระวัง):** Mention DE ratio, Cash Flow, or declining margins.
4. **Final Conclusion (สรุป):** Should a long-term VI be interested in this price level?

FORMAT: Use clean Markdown with emojis. Keep it professional but easy to read.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen/qwen3-32b',
        messages: [
          { role: 'system', content: 'You are a professional Thai Stock Market Analyst. You MUST output your final answer securely in THAI language only. Do NOT output english.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2, // Low temp for more factual/analytical response
        max_tokens: 2500, // Important: Increase tokens to allow reasoning AND final output
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to call AI');
    }

    let aiResponse = data.choices[0].message.content;
    
    // Remove reasoning tags, handling truncated tags if max_tokens was hit
    aiResponse = aiResponse.replace(/<think>[\s\S]*?(<\/think>|$)/gi, '').trim();

    if (!aiResponse) {
      aiResponse = "วิเคราะห์ข้อมูลซับซ้อนเกินกว่ากำหนดเวลาชั่วคราว กรุณากดขอคำแนะนำใหม่อีกครั้งครับ 🔄";
    }
    return NextResponse.json({ analysis: aiResponse });

  } catch (error: any) {
    console.error('AI Analysis Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
