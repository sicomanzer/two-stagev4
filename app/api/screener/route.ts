import { NextResponse } from 'next/server';
import { calculateFScore, calculateZScore, calculateCAGR, calculateScorecard } from '@/lib/calculations';
import { supabaseAdmin } from '@/lib/supabase-admin';
import YahooFinance from 'yahoo-finance2';

// We use dynamic import for the cache so it doesn't break the build if it's too large
// and we only load it on demand.
export const maxDuration = 60; // Allow more time for large computations

async function getFundamentalsCacheFromSupabase() {
  try {
    if (!supabaseAdmin) return null;
    const { data, error } = await supabaseAdmin
      .from('stock_fundamentals')
      .select('ticker,company_name,sector,industry,history,updated_at')
      .limit(2000);
    if (error || !data || data.length === 0) return null;
    const tickers: Record<string, any> = {};
    for (const row of data) {
      if (!row.ticker || !row.history) continue;
      tickers[row.ticker] = {
        companyName: row.company_name ?? null,
        sector: row.sector ?? null,
        industry: row.industry ?? null,
        history: row.history
      };
    }
    if (Object.keys(tickers).length === 0) return null;
    return { tickers };
  } catch (e) {
    console.warn('Failed to load fundamentals from Supabase:', e);
    return null;
  }
}

async function getMarketSnapshotFromSupabase() {
  try {
    if (!supabaseAdmin) return null;
    const { data, error } = await supabaseAdmin
      .from('stock_market_snapshot')
      .select('ticker,price,pe,pbv,dividend_yield,updated_at')
      .limit(2000);
    if (error || !data || data.length === 0) return null;
    const map: Record<string, any> = {};
    for (const row of data) {
      if (!row.ticker) continue;
      map[row.ticker] = {
        price: row.price ?? null,
        pe: row.pe ?? null,
        pbv: row.pbv ?? null,
        yield: row.dividend_yield ?? null,
        updatedAt: row.updated_at ?? null
      };
    }
    return map;
  } catch (e) {
    console.warn('Failed to load market snapshot from Supabase:', e);
    return null;
  }
}

async function getFundamentalsCache() {
  try {
    const cache = await import('@/data/fundamentals-cache.json');
    return cache.default || cache;
  } catch (e) {
    console.warn('Failed to load local fundamentals cache:', e);
    return null;
  }
}

// Calculate Band Statistics (AVG, SD)
const calculateStats = (data: number[]) => {
  if (data.length === 0) return { avg: 0, sd: 0 };
  const sum = data.reduce((a, b) => a + b, 0);
  const avg = sum / data.length;
  const squareDiffs = data.map(value => Math.pow(value - avg, 2));
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / data.length;
  const sd = Math.sqrt(avgSquareDiff);
  return { avg, sd };
};

const getDividendStreakYears = (history: any[]) => {
  const currentYear = new Date().getFullYear();
  let streak = 0;
  let startedStreak = false;

  for (let i = history.length - 1; i >= 0; i--) {
    const h = history[i];
    if (h.year === currentYear && (!h.dps || h.dps <= 0)) {
      continue;
    }

    if (h.dps && h.dps > 0) {
      streak++;
      startedStreak = true;
    } else {
      if (startedStreak) break;
      if (h.year < currentYear) break;
    }
  }

  return streak;
};

const getMarketCycle = (
  history: any[],
  currentPrice: number | null,
  latestPE: number | null | undefined,
  peStats: { avg: number; sd: number },
  latestPBV: number | null | undefined,
  pbvStats: { avg: number; sd: number }
) => {
  let zScore = 0;
  let hasData = false;

  if (latestPE !== null && latestPE !== undefined && peStats.sd > 0) {
    zScore = (latestPE - peStats.avg) / peStats.sd;
    hasData = true;
  } else if (latestPBV !== null && latestPBV !== undefined && pbvStats.sd > 0) {
    zScore = (latestPBV - pbvStats.avg) / pbvStats.sd;
    hasData = true;
  }

  if (!hasData) {
    return { phase: 'unknown', label: 'ไม่พอข้อมูล', zScore: null };
  }

  let isPriceTrendingUp = true;
  if (history.length > 0 && currentPrice !== null && currentPrice !== undefined) {
    const latestHistoricalPrice = history[history.length - 1]?.close ?? history[history.length - 1]?.price;
    if (latestHistoricalPrice && currentPrice < latestHistoricalPrice) {
      isPriceTrendingUp = false;
    }
  }

  let phase: 'accumulation' | 'markup' | 'distribution' | 'markdown' = 'markup';
  if (zScore <= -0.5) {
    phase = isPriceTrendingUp ? 'markup' : 'accumulation';
  } else if (zScore > -0.5 && zScore <= 1.0) {
    phase = isPriceTrendingUp ? 'markup' : 'markdown';
  } else {
    phase = isPriceTrendingUp ? 'distribution' : 'markdown';
  }

  const labelMap = {
    accumulation: 'สะสมพลัง',
    markup: 'ขาขึ้น',
    distribution: 'แจกจ่าย',
    markdown: 'ขาลง'
  };

  return { phase, label: labelMap[phase], zScore };
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      epsGrowthMin,
      dpsGrowthMin,
      peBandMode, // 'below_minus_1_sd', 'below_avg', 'any'
      pbvBandMode, // 'below_minus_1_sd', 'below_avg', 'any'
      fScoreMin,
      zScoreMin,
      viScoreMin,
      yieldMin,
      deMax,
      peMax,
      pbvMax,
      roeMin,
      marketCycleMode,
      dividendStreakMin
    } = body;
    const effectiveViScoreMin = viScoreMin !== undefined ? Math.min(Number(viScoreMin), 20) : undefined;
    const effectiveDividendStreakMin = dividendStreakMin !== undefined ? Math.max(0, Number(dividendStreakMin)) : undefined;

    const cache: any = (await getFundamentalsCacheFromSupabase()) || (await getFundamentalsCache());
    if (!cache || !cache.tickers) {
      return NextResponse.json({ error: 'ไม่พบฐานข้อมูลหุ้นสำหรับ Screener (fundamentals-cache.json)' }, { status: 500 });
    }

    const tickers = Object.keys(cache.tickers);
    
    let liveQuotes: Record<string, any> = (await getMarketSnapshotFromSupabase()) || {};

    if (Object.keys(liveQuotes).length === 0) {
      try {
        const yf = new YahooFinance();
        const yfSymbols = tickers.map(t => `${t}.BK`);
        const quotes = await yf.quote(yfSymbols);
        quotes.forEach((q: any) => {
          const symbol = q.symbol.replace('.BK', '');
          liveQuotes[symbol] = {
            price: q.regularMarketPrice,
            pe: q.trailingPE,
            pbv: q.priceToBook,
            yield: q.dividendYield
          };
        });
      } catch (e) {
        console.warn('Failed to fetch live quotes from Yahoo Finance, falling back to cache:', e);
      }
    }

    const results = [];

    for (const ticker of tickers) {
      const data = cache.tickers[ticker];
      if (!data.history || !Array.isArray(data.history) || data.history.length === 0) {
        continue;
      }

      const history = data.history.sort((a: any, b: any) => (a.year || 0) - (b.year || 0));
      
      // Enrich history with proxies for missing data to allow F-Score and Z-Score calculation
      const enrichedHistory = history.map((h: any) => {
          const totalLiabilities = h.totalLiabilities || (h.equity && h.de !== null ? h.equity * h.de : (h.totalDebt || 0));
          const totalAssets = h.totalAssets || (h.equity ? h.equity + totalLiabilities : (h.netProfit && h.roa ? h.netProfit / (h.roa / 100) : 1));
          const totalCurrentAssets = h.totalCurrentAssets || (totalAssets * 0.4);
          const totalCurrentLiabilities = h.totalCurrentLiabilities || (totalLiabilities * 0.3);

          return {
              ...h,
              dps: h.dps !== undefined && h.dps !== null ? h.dps : (h.dividendYield && h.close ? (h.dividendYield / 100) * h.close : 0),
              totalAssets,
              totalLiabilities,
              retainedEarnings: h.retainedEarnings || (h.equity ? h.equity * 0.4 : 0),
              ebit: h.ebit || h.netProfit || 0,
              operatingCashFlow: h.operatingCashFlow || h.netProfit || 0,
              totalCurrentAssets,
              totalCurrentLiabilities,
              currentRatio: h.currentRatio || (totalCurrentAssets / (totalCurrentLiabilities || 1)),
              longTermDebt: h.longTermDebt || h.totalDebt || 0,
              shares: h.shares || (h.mktCap && h.close ? h.mktCap / h.close : 1),
          };
      });

      const recent5 = enrichedHistory.slice(-5);
      
      // Basic metrics
      const epsCAGR = calculateCAGR(recent5.map((h: any) => h.eps)) || 0;
      const dpsCAGR = calculateCAGR(recent5.map((h: any) => h.dps)) || 0;

      // Calculate F-Score
      const fScoreRes = calculateFScore(enrichedHistory);
      const fScore = fScoreRes ? fScoreRes.score : 0;
      
      // Calculate Z-Score
      const lastHistory = enrichedHistory[enrichedHistory.length - 1];
      const marketCap = lastHistory.mktCap || (lastHistory.close && lastHistory.shares ? lastHistory.close * lastHistory.shares : null);
      const zScoreRes = calculateZScore(enrichedHistory, marketCap);
      const zScore = zScoreRes ? zScoreRes.score : 0;

      // Calculate PE and PBV Bands (Annual approximation)
      const peValues = history.map((h: any) => h.pe).filter((v: any) => v !== null && v > 0 && v < 100);
      const pbvValues = history.map((h: any) => h.pbv).filter((v: any) => v !== null && v > 0 && v < 20);
      
      const peStats = calculateStats(peValues);
      const pbvStats = calculateStats(pbvValues);
      
      const latestPE = liveQuotes[ticker]?.pe ?? (lastHistory.pe || peValues[peValues.length - 1]);
      const latestPBV = liveQuotes[ticker]?.pbv ?? (lastHistory.pbv || pbvValues[pbvValues.length - 1]);

      let peMinus1SD = peStats.avg - peStats.sd;
      let pbvMinus1SD = pbvStats.avg - pbvStats.sd;

      const latestROE = lastHistory.roe ? lastHistory.roe : 0;
      const latestDE = lastHistory.de !== null && lastHistory.de !== undefined ? lastHistory.de : 0;
      const latestYield = liveQuotes[ticker]?.yield ?? (lastHistory.dividendYield !== null && lastHistory.dividendYield !== undefined 
          ? lastHistory.dividendYield 
          : (lastHistory.dps && lastHistory.close ? (lastHistory.dps / lastHistory.close) * 100 : 0));

      // Calculate VI Scorecard (without Fair Price, passing null)
      const currentPrice = liveQuotes[ticker]?.price ?? (lastHistory.close || lastHistory.price || null);
      const scorecard = calculateScorecard(
        ticker,
        history,
        currentPrice,
        null, // fairPrice null
        latestPE,
        latestPBV,
        peStats.avg,
        pbvStats.avg
      );
      const viScore = scorecard.totalScore;
      const marketCycle = getMarketCycle(history, currentPrice, latestPE, peStats, latestPBV, pbvStats);
      const dividendStreakYears = getDividendStreakYears(enrichedHistory);

      // Check Filters
      if (epsGrowthMin !== undefined && (epsCAGR * 100) < epsGrowthMin) continue;
      if (dpsGrowthMin !== undefined && (dpsCAGR * 100) < dpsGrowthMin) continue;
      if (fScoreMin !== undefined && fScore < fScoreMin) continue;
      if (zScoreMin !== undefined && zScore < zScoreMin) continue;
      if (effectiveViScoreMin !== undefined && viScore < effectiveViScoreMin) continue;
      if (yieldMin !== undefined && latestYield < yieldMin) continue;
      if (deMax !== undefined && latestDE > deMax) continue;
      if (peMax !== undefined && (!latestPE || latestPE > peMax)) continue;
      if (pbvMax !== undefined && (!latestPBV || latestPBV > pbvMax)) continue;
      if (roeMin !== undefined && latestROE < roeMin) continue;
      if (marketCycleMode !== undefined && marketCycle.phase !== marketCycleMode) continue;
      if (effectiveDividendStreakMin !== undefined && dividendStreakYears < effectiveDividendStreakMin) continue;

      if (peBandMode === 'below_minus_1_sd') {
        if (!latestPE || !peStats.avg || latestPE > peMinus1SD) continue;
      } else if (peBandMode === 'below_avg') {
        if (!latestPE || !peStats.avg || latestPE > peStats.avg) continue;
      }

      if (pbvBandMode === 'below_minus_1_sd') {
        if (!latestPBV || !pbvStats.avg || latestPBV > pbvMinus1SD) continue;
      } else if (pbvBandMode === 'below_avg') {
        if (!latestPBV || !pbvStats.avg || latestPBV > pbvStats.avg) continue;
      }

      results.push({
        ticker,
        epsCAGR: epsCAGR * 100,
        dpsCAGR: dpsCAGR * 100,
        fScore,
        zScore,
        viScore,
        latestPE,
        peAvg: peStats.avg,
        peMinus1SD,
        latestPBV,
        pbvAvg: pbvStats.avg,
        pbvMinus1SD,
        currentPrice,
        latestROE,
        latestDE,
        latestYield,
        dividendStreakYears,
        marketCycle: marketCycle.phase,
        marketCycleLabel: marketCycle.label,
        marketCycleZScore: marketCycle.zScore
      });
    }

    return NextResponse.json({
      total: tickers.length,
      matched: results.length,
      results: results.sort((a, b) => b.viScore - a.viScore) // Sort by VI Score descending
    });

  } catch (error: any) {
    console.error('Screener error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
