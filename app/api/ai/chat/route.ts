import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { message, contextTicker } = await request.json();
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'Groq API Key not configured.' }, { status: 500 });
    }

    const contextAddition = contextTicker 
      ? `The user is currently looking at the stock ticker: ${contextTicker}. If they ask a specific question, it might be about this stock.` 
      : `The user is in the general dashboard area.`;

    const systemPrompt = `You are a helpful, knowledgeable Thai Value Investor Assistant named "VI Buddy".
You help answers user's questions about stock valuation, financial formulas (like DDM, DCF, Graham Number), or general investing concepts.
${contextAddition}
Keep your answers very clear, friendly, and strictly in Thai language. Use emojis to make it engaging. Formulate your replies concisely.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen/qwen3-32b',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.5,
        max_tokens: 1500,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to call AI');
    }

    let aiResponse = data.choices[0].message.content;
    aiResponse = aiResponse.replace(/<think>[\s\S]*?(<\/think>|$)/gi, '').trim();

    return NextResponse.json({ reply: aiResponse });

  } catch (error: any) {
    console.error('AI Chat Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
