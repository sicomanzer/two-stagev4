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
    const topResults = results.slice(0, 15).map((r: any) => 
      `${r.ticker} (${r.sector || 'N/A'}): P/E=${r.pe != null ? Number(r.pe).toFixed(1) : 'N/A'}, P/BV=${r.pbv != null ? Number(r.pbv).toFixed(1) : 'N/A'}, ROE=${r.roe != null ? Number(r.roe).toFixed(1)+'%' : 'N/A'}, DivYield=${r.dividend_yield != null ? Number(r.dividend_yield).toFixed(1)+'%' : 'N/A'}`
    ).join('\n');

    const prompt = `You are an expert Value Investor (VI) Data Analyst.
I have just run a stock screener with the following criteria:
${criteria ? JSON.stringify(criteria, null, 2) : 'General Valuation Metrics'}

Here are the Top ${Math.min(results.length, 15)} matching stocks:
${topResults}

TASK:
Write a SHORT, punchy executive summary (max 4-5 sentences) in THAI.
1. Mention the dominant sector or interesting trends in these results.
2. Highlight 1-2 standout stocks (e.g., extremely high ROE or very low P/E).
3. Add a quick word of caution (e.g., "Don't forget to check their debt").

FORMAT: Use bullet points or short paragraphs with emojis for readability. Do not output anything other than the Thai summary.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen/qwen3-32b',
        messages: [
          { role: 'system', content: 'You are a professional Thai Stock Screener Analyst.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 1024,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to call AI');
    }

    let aiResponse = data.choices[0].message.content;
    aiResponse = aiResponse.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    return NextResponse.json({ summary: aiResponse });

  } catch (error: any) {
    console.error('AI Screener Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
