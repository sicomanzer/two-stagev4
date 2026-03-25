import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { ticker, currentPhaseName, zScorePE, isPriceTrendingUp, currentPrice, peAvg, pbvAvg } = await request.json();
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'Groq API Key not configured.' }, { status: 500 });
    }

    const prompt = `You are an expert Value Investor (VI) and Market Psychologist.
Analyze the current market cycle timing for the stock: ${ticker}

CURRENT DATA:
- Current Price: ${currentPrice}
- Market Phase: ${currentPhaseName}
- Valuation Z-Score: ${zScorePE != null ? zScorePE.toFixed(2) : 'N/A'} (Above 1 is expensive, below -0.5 is cheap)
- Price Trend: ${isPriceTrendingUp ? 'Trending Up' : 'Trending Down'}
- Historical PE Avg: ${peAvg != null ? peAvg.toFixed(2) : 'N/A'}
- Historical PBV Avg: ${pbvAvg != null ? pbvAvg.toFixed(2) : 'N/A'}

TASK:
Write a SHORT, actionable advice block (max 3-4 sentences) in THAI language explaining the psychology of the market for this stock right now, and what a Value Investor should ideally do (e.g., "Wait for dust to settle", "Start accumulating", "Take some profit"). 

FORMAT: Do not use Markdown headings. Just output the short Thai paragraph with a relevant emoji.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen/qwen3-32b',
        messages: [
          { role: 'system', content: 'You are a professional Thai VI Timing Advisor.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to call AI');
    }

    let aiResponse = data.choices[0].message.content;
    aiResponse = aiResponse.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    return NextResponse.json({ advice: aiResponse });

  } catch (error: any) {
    console.error('AI Timing Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
