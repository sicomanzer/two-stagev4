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
      // Group by safety
      const greenAlerts = alerts.filter(a => a.startsWith('🟢'));
      const yellowAlerts = alerts.filter(a => a.startsWith('🟡'));

      let message = `🚨 <b>VI Stock Analyzer Daily Alert</b> 🚨\n\n`;
      
      if (greenAlerts.length > 0) {
         message += `🎯 <b>HIGH MARGIN OF SAFETY (MOS > 30%)</b>\n`;
         message += greenAlerts.join('\n') + `\n\n`;
      }
      if (yellowAlerts.length > 0) {
         message += `👀 <b>WATCHLIST (MOS > 15%)</b>\n`;
         message += yellowAlerts.join('\n') + `\n\n`;
      }
      
      message += `<i>Check your app to review detailed analysis.</i>`;

      await sendTelegramMessage(message);
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
