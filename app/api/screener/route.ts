import { NextResponse } from 'next/server';
import { calculateFScore, calculateZScore, calculateCAGR, calculateScorecard } from '@/lib/calculations';
// We use dynamic import for the cache so it doesn't break the build if it's too large
// and we only load it on demand.
export const maxDuration = 60; // Allow more time for large computations

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
      roeMin
    } = body;

    const cache: any = await getFundamentalsCache();
    if (!cache || !cache.tickers) {
      return NextResponse.json({ error: 'ไม่พบฐานข้อมูลหุ้นสำหรับ Screener (fundamentals-cache.json)' }, { status: 500 });
    }

    const tickers = Object.keys(cache.tickers);
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
      
      const latestPE = lastHistory.pe || peValues[peValues.length - 1];
      const latestPBV = lastHistory.pbv || pbvValues[pbvValues.length - 1];

      let peMinus1SD = peStats.avg - peStats.sd;
      let pbvMinus1SD = pbvStats.avg - pbvStats.sd;

      const latestROE = lastHistory.roe ? lastHistory.roe : 0;
      const latestDE = lastHistory.de !== null && lastHistory.de !== undefined ? lastHistory.de : 0;
      const latestYield = lastHistory.dividendYield !== null && lastHistory.dividendYield !== undefined 
          ? lastHistory.dividendYield 
          : (lastHistory.dps && lastHistory.close ? (lastHistory.dps / lastHistory.close) * 100 : 0);

      // Calculate VI Scorecard (without Fair Price, passing null)
      const currentPrice = lastHistory.close || lastHistory.price || null;
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

      // Check Filters
      if (epsGrowthMin !== undefined && (epsCAGR * 100) < epsGrowthMin) continue;
      if (dpsGrowthMin !== undefined && (dpsCAGR * 100) < dpsGrowthMin) continue;
      if (fScoreMin !== undefined && fScore < fScoreMin) continue;
      if (zScoreMin !== undefined && zScore < zScoreMin) continue;
      if (viScoreMin !== undefined && viScore < viScoreMin) continue;
      if (yieldMin !== undefined && latestYield < yieldMin) continue;
      if (deMax !== undefined && latestDE > deMax) continue;
      if (peMax !== undefined && (!latestPE || latestPE > peMax)) continue;
      if (pbvMax !== undefined && (!latestPBV || latestPBV > pbvMax)) continue;
      if (roeMin !== undefined && latestROE < roeMin) continue;

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
        latestYield
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
