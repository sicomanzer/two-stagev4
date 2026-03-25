import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendTelegramMessage } from '@/lib/telegram';
import YahooFinance from 'yahoo-finance2';

// Set max duration for the serverless function (Vercel)
export const maxDuration = 60; 

export async function GET(request: Request) {
  try {
    // 1. Validate Cron Secret (Optional, for security in production)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Fetch all portfolio items
    if (!supabaseAdmin) {
       return NextResponse.json({ error: 'Supabase Admin not configured.' }, { status: 500 });
    }

    const { data: portfolios, error } = await supabaseAdmin
      .from('portfolio')
      .select('ticker, fair_price, mos30_price');

    if (error || !portfolios || portfolios.length === 0) {
      return NextResponse.json({ message: 'No portfolios to check or error fetching.', error });
    }

    // 3. Unique tickers
    const uniqueTickers = Array.from(new Set(portfolios.map(p => p.ticker)));
    
    // 4. Batch fetch current prices using Yahoo Finance
    const alerts: string[] = [];
    const yahooFinance = new YahooFinance();
    if (typeof (yahooFinance as any).suppressNotices === 'function') {
      (yahooFinance as any).suppressNotices(['yahooSurvey', 'ripHistorical']);
    }

    console.log(`Checking alerts for ${uniqueTickers.length} unique tickers...`);

    for (const ticker of uniqueTickers) {
      try {
        const symbol = ticker.toUpperCase().endsWith('.BK') ? ticker.toUpperCase() : `${ticker.toUpperCase()}.BK`;
        const quote = await yahooFinance.quoteSummary(symbol, { modules: ['price'] });
        const currentPrice = quote.price?.regularMarketPrice;

        if (!currentPrice || currentPrice <= 0) continue;

        // Find all portfolio entries for this ticker (a user might have multiple portfolios tracking the same stock)
        const items = portfolios.filter(p => p.ticker === ticker);
        
        // Use the highest fair price or individual fair price
        let highestFairPrice = 0;
        items.forEach(item => {
           if (item.fair_price > highestFairPrice) highestFairPrice = item.fair_price;
        });

        const margin = ((highestFairPrice - currentPrice) / currentPrice) * 100;

        // Condition for Alerting: Margin > 30% (Solid Undervalue)
        if (margin >= 30) {
           alerts.push(`🟢 <b>${ticker}</b>: <code>${currentPrice.toFixed(2)}</code> ฿ (FV: ${highestFairPrice.toFixed(2)}, MOS: +${margin.toFixed(2)}%)`);
        } else if (margin >= 15) {
           // Optional: Warn if it's getting close or at least 15%
           alerts.push(`🟡 <b>${ticker}</b>: <code>${currentPrice.toFixed(2)}</code> ฿ (FV: ${highestFairPrice.toFixed(2)}, MOS: +${margin.toFixed(2)}%)`);
        }

        // Delay slightly to prevent rate limits
        await new Promise(r => setTimeout(r, 200));

      } catch (err) {
        console.warn(`Could not check price for ${ticker}:`, err);
      }
    }

    // 5. Send Telegram Message if there are alerts
    if (alerts.length > 0) {
      const greenAlerts = alerts.filter(a => a.startsWith('🟢'));
      const yellowAlerts = alerts.filter(a => a.startsWith('🟡'));

      let finalMessage = '';
      const apiKey = process.env.GROQ_API_KEY;

      if (apiKey) {
        // AI Smart Notification (Idea 4)
        try {
          const prompt = `You are a friendly, professional Thai Value Investing (VI) broker assistant on Telegram.
I have a list of stocks that hit their Margin of Safety targets today.
Green Level (High Safety, MOS > 30%):
${greenAlerts.join('\n') || '- None -'}

Yellow Level (Watchlist, MOS > 15%):
${yellowAlerts.join('\n') || '- None -'}

TASK: 
Draft a Telegram message in THAI language to alert the user.
- Start with a catchy greeting (e.g. "🚨 สัญญาณลงทุนมาแล้วครับน้อง/พี่!")
- Summarize the stocks cleanly. Mention the pricing nicely.
- Add a 1-sentence analytical remark if applicable (e.g., "CPALL ลงมาในโซนปลอดภัย น่าสะสมนะครับ")
- Keep it concise, engaging, and use appropriate emojis.
- Do NOT output English or markdown headers.`;

          const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'qwen/qwen3-32b',
              messages: [
                { role: 'system', content: 'You are a Thai Stock Broker AI for Telegram. You MUST output ONLY the final Thai message.' },
                { role: 'user', content: prompt }
              ],
              temperature: 0.6,
              max_tokens: 1024,
            }),
          });

          const data = await response.json();
          if (response.ok && data.choices?.[0]?.message?.content) {
            finalMessage = data.choices[0].message.content.replace(/<think>[\s\S]*?(<\/think>|$)/gi, '').trim();
          }
        } catch (e) {
          console.error("AI Alert Generation Failed, falling back to basic:", e);
        }
      } 
      
      // Fallback to basic message if AI failed or API key missing
      if (!finalMessage) {
        finalMessage = `🚨 <b>VI Stock Analyzer Daily Alert</b> 🚨\n\n`;
        if (greenAlerts.length > 0) {
           finalMessage += `🎯 <b>HIGH MARGIN OF SAFETY (MOS > 30%)</b>\n`;
           finalMessage += greenAlerts.join('\n') + `\n\n`;
        }
        if (yellowAlerts.length > 0) {
           finalMessage += `👀 <b>WATCHLIST (MOS > 15%)</b>\n`;
           finalMessage += yellowAlerts.join('\n') + `\n\n`;
        }
        finalMessage += `<i>Check your app to review detailed analysis.</i>`;
      }

      await sendTelegramMessage(finalMessage);
      console.log('Fired telegram alert:', alerts.length, 'stocks triggered.');
    } else {
      console.log('Prices checked. No stocks reached the Margin of Safety threshold.');
    }

    return NextResponse.json({ success: true, alertsSent: alerts.length });

  } catch (error: any) {
    console.error('Check-alerts API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
