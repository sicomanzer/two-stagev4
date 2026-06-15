import { NextResponse } from 'next/server';
import { calculateFScore, calculateZScore, calculateCAGR, calculateScorecard } from '@/lib/calculations';
import { supabaseAdmin } from '@/lib/supabase-admin';
import YahooFinance from 'yahoo-finance2';

// We use dynamic import for the cache so it doesn't break the build if it's too large
// and we only load it on demand.
export const maxDuration = 60; // Allow more time for large computations

type ScreenerFundamentalsSource = 'supabase' | 'local-cache';
type ScreenerSnapshotSource = 'supabase' | 'yahoo-live' | 'historical-fallback';

type ScreenerFundamentalsNode = {
  companyName: string | null;
  sector: string | null;
  industry: string | null;
  history: any[];
  updatedAt: string | null;
  source: ScreenerFundamentalsSource;
};

type ScreenerFundamentalsCache = {
  tickers: Record<string, ScreenerFundamentalsNode>;
  source: ScreenerFundamentalsSource;
  updatedAt: string | null;
};

type ScreenerLiveQuote = {
  price: number | null;
  pe: number | null;
  pbv: number | null;
  yield: number | null;
  updatedAt: string | null;
  source: Exclude<ScreenerSnapshotSource, 'historical-fallback'>;
};

function normalizeDividendYield(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.abs(numeric) <= 1 ? numeric * 100 : numeric;
}

function deriveDividendPerShare(entry: any): number | null {
  if (entry?.dps !== null && entry?.dps !== undefined) return entry.dps;
  const dividendYield = normalizeDividendYield(entry?.dividendYield);
  const close = Number(entry?.close ?? entry?.price);
  if (dividendYield === null || !Number.isFinite(close) || close <= 0) return null;
  return (dividendYield / 100) * close;
}

async function getFundamentalsCacheFromSupabase() {
  try {
    if (!supabaseAdmin) return null;
    const { data, error } = await supabaseAdmin
      .from('stock_fundamentals')
      .select('ticker,company_name,sector,industry,history,updated_at')
      .limit(2000);
    if (error || !data || data.length === 0) return null;
    const tickers: Record<string, ScreenerFundamentalsNode> = {};
    let latestUpdatedAt: string | null = null;
    for (const row of data) {
      if (!row.ticker || !row.history) continue;
      tickers[row.ticker] = {
        companyName: row.company_name ?? null,
        sector: row.sector ?? null,
        industry: row.industry ?? null,
        history: row.history,
        updatedAt: row.updated_at ?? null,
        source: 'supabase'
      };
      if (row.updated_at && (!latestUpdatedAt || row.updated_at > latestUpdatedAt)) {
        latestUpdatedAt = row.updated_at;
      }
    }
    if (Object.keys(tickers).length === 0) return null;
    return { tickers, source: 'supabase', updatedAt: latestUpdatedAt } satisfies ScreenerFundamentalsCache;
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
    const map: Record<string, ScreenerLiveQuote> = {};
    for (const row of data) {
      if (!row.ticker) continue;
      map[row.ticker] = {
        price: row.price ?? null,
        pe: row.pe ?? null,
        pbv: row.pbv ?? null,
        yield: normalizeDividendYield(row.dividend_yield),
        updatedAt: row.updated_at ?? null,
        source: 'supabase'
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
    const data = cache.default || cache;
    const rawTickers = data?.tickers || data;
    if (!rawTickers || typeof rawTickers !== 'object') return null;

    const tickers: Record<string, ScreenerFundamentalsNode> = {};
    for (const [ticker, node] of Object.entries<any>(rawTickers)) {
      if (!node?.history || !Array.isArray(node.history)) continue;
      tickers[ticker] = {
        companyName: node.companyName ?? null,
        sector: node.sector ?? null,
        industry: node.industry ?? null,
        history: node.history,
        updatedAt: data?.updatedAt ?? null,
        source: 'local-cache'
      };
    }

    if (Object.keys(tickers).length === 0) return null;
    return { tickers, source: 'local-cache', updatedAt: data?.updatedAt ?? null } satisfies ScreenerFundamentalsCache;
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
    const effectiveViScoreMin = viScoreMin !== undefined ? Math.min(Number(viScoreMin), 18) : undefined;
    const effectiveDividendStreakMin = dividendStreakMin !== undefined ? Math.max(0, Number(dividendStreakMin)) : undefined;

    const cache = (await getFundamentalsCacheFromSupabase()) || (await getFundamentalsCache());
    if (!cache || !cache.tickers) {
      return NextResponse.json({ error: 'ไม่พบฐานข้อมูลหุ้นสำหรับ Screener (fundamentals-cache.json)' }, { status: 500 });
    }

    const tickers = Object.keys(cache.tickers);
    
    let liveQuotes: Record<string, ScreenerLiveQuote> = (await getMarketSnapshotFromSupabase()) || {};

    if (Object.keys(liveQuotes).length === 0) {
      try {
        const yf = new YahooFinance();
        const yfSymbols = tickers.map(t => `${t}.BK`);
        const quotes = await yf.quote(yfSymbols);
        const nowIso = new Date().toISOString();
        quotes.forEach((q: any) => {
          const symbol = q.symbol.replace('.BK', '');
          liveQuotes[symbol] = {
            price: q.regularMarketPrice,
            pe: q.trailingPE,
            pbv: q.priceToBook,
            yield: normalizeDividendYield(q.dividendYield),
            updatedAt: nowIso,
            source: 'yahoo-live'
          };
        });
      } catch (e) {
        console.warn('Failed to fetch live quotes from Yahoo Finance, falling back to cache:', e);
      }
    }

    const results = [];
    const snapshotSourceCounts: Record<string, number> = {
      supabase: 0,
      'yahoo-live': 0,
      'historical-fallback': 0,
    };

    for (const ticker of tickers) {
      const data = cache.tickers[ticker];
      if (!data.history || !Array.isArray(data.history) || data.history.length === 0) {
        continue;
      }

      const history = [...data.history].sort((a: any, b: any) => (a.year || 0) - (b.year || 0));
      const normalizedHistory = history.map((h: any) => ({
        ...h,
        dividendYield: normalizeDividendYield(h.dividendYield),
        dps: deriveDividendPerShare(h),
      }));

      const recent5 = normalizedHistory.slice(-5);
      
      // Basic metrics
      const epsCAGR = calculateCAGR(recent5.map((h: any) => h.eps));
      const dpsCAGR = calculateCAGR(recent5.map((h: any) => h.dps));

      // Calculate F-Score
      const fScoreRes = calculateFScore(normalizedHistory);
      const fScore = fScoreRes ? fScoreRes.score : null;
      
      // Calculate Z-Score
      const lastHistory = normalizedHistory[normalizedHistory.length - 1];
      const currentPriceFromHistory = lastHistory.close || lastHistory.price || null;
      const marketCap = lastHistory.mktCap || (currentPriceFromHistory && lastHistory.shares ? currentPriceFromHistory * lastHistory.shares : null);
      const zScoreRes = calculateZScore(normalizedHistory, marketCap);
      const zScore = zScoreRes ? zScoreRes.score : null;

      // Calculate PE and PBV Bands (Annual approximation)
      const peValues = normalizedHistory.map((h: any) => h.pe).filter((v: any) => v !== null && v > 0 && v < 100);
      const pbvValues = normalizedHistory.map((h: any) => h.pbv).filter((v: any) => v !== null && v > 0 && v < 20);
      
      const peStats = calculateStats(peValues);
      const pbvStats = calculateStats(pbvValues);

      const liveQuote = liveQuotes[ticker] ?? null;
      const hasSnapshotMetrics = !!liveQuote && [liveQuote.price, liveQuote.pe, liveQuote.pbv, liveQuote.yield].some((value) => value !== null && value !== undefined);
      const snapshotSource: ScreenerSnapshotSource = hasSnapshotMetrics ? liveQuote!.source : 'historical-fallback';
      const snapshotUpdatedAt = hasSnapshotMetrics ? liveQuote!.updatedAt : null;
      snapshotSourceCounts[snapshotSource] = (snapshotSourceCounts[snapshotSource] || 0) + 1;

      const latestPE = liveQuote?.pe ?? (lastHistory.pe || peValues[peValues.length - 1] || null);
      const latestPBV = liveQuote?.pbv ?? (lastHistory.pbv || pbvValues[pbvValues.length - 1] || null);

      let peMinus1SD = peStats.avg - peStats.sd;
      let pbvMinus1SD = pbvStats.avg - pbvStats.sd;

      const latestROE = lastHistory.roe ? lastHistory.roe : 0;
      const latestDE = lastHistory.de !== null && lastHistory.de !== undefined ? lastHistory.de : 0;
      const latestYield = liveQuote?.yield ?? (lastHistory.dividendYield !== null && lastHistory.dividendYield !== undefined 
          ? lastHistory.dividendYield 
          : (lastHistory.dps && lastHistory.close ? (lastHistory.dps / lastHistory.close) * 100 : null));

      // Calculate VI score without MOS because fair value is not part of Screener.
      const currentPrice = liveQuote?.price ?? (lastHistory.close || lastHistory.price || null);
      const scorecard = calculateScorecard(
        ticker,
        normalizedHistory,
        currentPrice,
        null, // fairPrice null
        latestPE,
        latestPBV,
        peStats.avg,
        pbvStats.avg
      );
      const viScore = scorecard.totalScore;
      const viScoreMax = Math.max(scorecard.maxScore - 2, 0);
      const marketCycle = getMarketCycle(normalizedHistory, currentPrice, latestPE, peStats, latestPBV, pbvStats);
      const dividendStreakYears = getDividendStreakYears(normalizedHistory);

      // Check Filters
      if (epsGrowthMin !== undefined && (epsCAGR === null || (epsCAGR * 100) < epsGrowthMin)) continue;
      if (dpsGrowthMin !== undefined && (dpsCAGR === null || (dpsCAGR * 100) < dpsGrowthMin)) continue;
      if (fScoreMin !== undefined && (fScore === null || fScore < fScoreMin)) continue;
      if (zScoreMin !== undefined && (zScore === null || zScore < zScoreMin)) continue;
      if (effectiveViScoreMin !== undefined && viScore < effectiveViScoreMin) continue;
      if (yieldMin !== undefined && (latestYield === null || latestYield < yieldMin)) continue;
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
        companyName: data.companyName,
        sector: data.sector,
        industry: data.industry,
        epsCAGR: epsCAGR !== null ? epsCAGR * 100 : null,
        dpsCAGR: dpsCAGR !== null ? dpsCAGR * 100 : null,
        fScore,
        fScoreAvailable: fScore !== null,
        zScore,
        zScoreAvailable: zScore !== null,
        viScore,
        viScoreMax,
        viScoreLabel: 'VI Quality Score',
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
        yieldUnit: 'percent',
        dividendStreakYears,
        marketCycle: marketCycle.phase,
        marketCycleLabel: marketCycle.label,
        marketCycleZScore: marketCycle.zScore,
        fundamentalsSource: data.source,
        fundamentalsUpdatedAt: data.updatedAt ?? cache.updatedAt,
        snapshotSource,
        snapshotUpdatedAt,
        usedProxyMetrics: false,
      });
    }

    const warnings: string[] = [];
    if (cache.source === 'local-cache') {
      warnings.push('กำลังใช้ fundamentals จาก local cache แทน Supabase');
    }
    if (snapshotSourceCounts['historical-fallback'] > 0) {
      warnings.push(`มี ${snapshotSourceCounts['historical-fallback']} หุ้นที่ fallback ไปใช้ข้อมูลย้อนหลัง เพราะ snapshot ล่าสุดไม่ครบ`);
    }

    return NextResponse.json({
      total: tickers.length,
      matched: results.length,
      results: results.sort((a, b) => b.viScore - a.viScore),
      warnings,
      meta: {
        fundamentalsSource: cache.source,
        fundamentalsUpdatedAt: cache.updatedAt,
        snapshotSourceCounts,
        usedProxyMetrics: false,
        yieldUnit: 'percent',
      }
    });

  } catch (error: any) {
    console.error('Screener error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
