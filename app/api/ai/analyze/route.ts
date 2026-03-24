import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { ticker, history, metrics, sector, industry } = await request.json();
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'Groq API Key not configured.' }, { status: 500 });
    }

    // Logic: Construct a prompt that summarizes the 10-15 year history
    const historySummary = history.map((h: any) => 
      `${h.year}: Revenue=${h.revenue}, NetProfit=${h.netProfit}, ROE=${(h.roe * 100).toFixed(1)}%, DE=${h.de}, Div=${h.dps}`
    ).join('\n');

    const prompt = `You are an expert Value Investor (VI) and Financial Analyst. 
Analyze the following stock data for "${ticker}" (${industry} / ${sector}).

STOCK HISTORY (Last 10+ Years):
${historySummary}

CURRENT METRICS:
- P/E: ${metrics.pe}
- P/BV: ${metrics.pbv}
- ROE: ${(metrics.roe * 100).toFixed(1)}%
- D/E: ${metrics.de}
- Dividend Yield: ${(metrics.yield * 100).toFixed(1)}%
- F-Score: ${metrics.fScore}/9
- Z-Score: ${metrics.zScore}

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
          { role: 'system', content: 'You are a professional Thai Stock Analyst specializing in Value Investing.' },
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
    // Qwen3 includes <think>...</think> reasoning blocks - strip them for clean output
    aiResponse = aiResponse.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    return NextResponse.json({ analysis: aiResponse });

  } catch (error: any) {
    console.error('AI Analysis Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
