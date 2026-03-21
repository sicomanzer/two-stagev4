import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get('ticker');

  if (!ticker) {
    return NextResponse.json({ error: 'Ticker is required' }, { status: 400 });
  }

  try {
    const cleanTicker = ticker.replace('.BK', '').trim().toUpperCase();
    
    // Attempt 1: Fetch from TradingView Symbol Search
    const searchUrl = `https://symbol-search.tradingview.com/symbol_search/?text=${encodeURIComponent(cleanTicker)}&exchange=SET`;
    const searchRes = await fetch(searchUrl, {
      headers: {
        'Origin': 'https://www.tradingview.com',
        'Referer': 'https://www.tradingview.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (searchRes.ok) {
      const data = await searchRes.json();
      if (Array.isArray(data) && data.length > 0) {
        // Look for exact ticker match on SET
        const match = data.find(d => d.symbol === cleanTicker && d.exchange === 'SET');
        if (match && match.logoid) {
          // TradingView Logo ID format
          const logoUrl = `https://s3-symbol-logo.tradingview.com/${match.logoid}--big.svg`;
          return NextResponse.redirect(logoUrl, 302);
        }
      }
    }

    // Fallback if no TradingView logoid is found
    // If we want to return a fallback placeholder image, we can just redirect to clearbit or Jitta
    return NextResponse.redirect(`https://logo.clearbit.com/${cleanTicker.toLowerCase()}.co.th`, 302);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to find logo' }, { status: 500 });
  }
}
