import { NextResponse } from 'next/server';

const FALLBACK_BRIEFING =
  'เช้านี้ขอให้ลงทุนด้วยความสงบและยึดหลักระยะยาวไว้ก่อนเสมอ ตลาดผันผวนได้ แต่คุณภาพธุรกิจและวินัยยังเป็นสิ่งที่สำคัญที่สุด ลองจับตากระแสเงินสด ความสามารถทำกำไร และระดับหนี้ควบคู่กันก่อนตัดสินใจครับ';

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    console.log("Checking Groq API key:", apiKey ? "Configured" : "Missing");

    if (!apiKey) {
      return NextResponse.json({
        briefing: FALLBACK_BRIEFING,
        fallback: true,
        reason: 'Groq API Key not configured.'
      });
    }

    const { date } = await request.json();

    const prompt = `You are a respected, seasoned Value Investor (VI) mentor like Warren Buffett but speaking in Thai to your students.
Today's date is: ${date}

TASK:
Write a "Daily Morning Briefing" (ความในใจยามเช้าสำหรับนักลงทุน VI) (max 3-4 sentences).
Include:
1. A brief psychological reminder about long-term investing or risk management.
2. A tip on what fundamental metric to watch out for in current market conditions.
3. Keep the tone encouraging, calm, and professional.

FORMAT: Use concise THAI paragraphs with 1-2 emojis. Do not output English.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen/qwen3-32b',
        messages: [
          { role: 'system', content: 'You are a professional Thai Value Investor Mentor. You MUST output your final answer securely in THAI language only.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7, // Higher temp for more creative quotes
        max_tokens: 1500,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Groq API Error:', data);
      throw new Error(data.error?.message || 'Failed to call AI');
    }

    let aiResponse = data.choices[0].message.content;
    aiResponse = aiResponse.replace(/<think>[\s\S]*?(<\/think>|$)/gi, '').trim();

    if (!aiResponse) {
      return NextResponse.json({
        briefing: FALLBACK_BRIEFING,
        fallback: true,
        reason: 'Empty briefing returned from AI provider.'
      });
    }

    return NextResponse.json({ briefing: aiResponse });

  } catch (error: any) {
    console.error('AI Daily Briefing Error:', error);
    return NextResponse.json({
      briefing: FALLBACK_BRIEFING,
      fallback: true,
      reason: error?.message || 'Unknown daily briefing error'
    });
  }
}
