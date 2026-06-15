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

const average = (values: number[]) => {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const getMetricWindow = (history: any[], years: number, strictWindow: boolean) => {
  const normalizedYears = Math.max(3, Math.min(Number.isFinite(years) ? years : 5, 10));
  const window = history.slice(-normalizedYears);
  if (strictWindow && window.length < normalizedYears) return null;
  return window;
};

const getNumericSeries = (history: any[], selector: (entry: any) => unknown) => {
  return history.map((entry) => {
    const value = Number(selector(entry));
    return Number.isFinite(value) ? value : null;
  });
};

const countDecliningYears = (values: (number | null)[]) => {
  let declines = 0;
  let comparisons = 0;
  for (let i = 1; i < values.length; i++) {
    const previous = values[i - 1];
    const current = values[i];
    if (previous === null || current === null) continue;
    comparisons += 1;
    if (current < previous) declines += 1;
  }
  return comparisons > 0 ? declines : null;
};

const countPositiveYears = (values: (number | null)[]): number => {
  return values.reduce<number>((count, value) => (value !== null && value > 0 ? count + 1 : count), 0);
};

const calculateNpmDelta = (history: any[]) => {
  const values = getNumericSeries(history, (entry) => entry.npm).filter((value): value is number => value !== null);
  if (values.length < 2) return null;
  const comparisonYears = Math.min(3, Math.floor(values.length / 2));
  if (comparisonYears < 1) return null;
  const earlyAverage = average(values.slice(0, comparisonYears));
  const latestAverage = average(values.slice(-comparisonYears));
  if (earlyAverage === null || latestAverage === null) return null;
  return latestAverage - earlyAverage;
};

const isFinancialBusiness = (sector?: string | null, industry?: string | null) => {
  const text = `${sector ?? ''} ${industry ?? ''}`.toLowerCase();
  return /(bank|banking|finance|financial|insurance|securities|asset|capital market|consumer finance|leasing|credit|ธนาคาร|การเงิน|ประกัน|หลักทรัพย์)/.test(text);
};

const getFinancialBucket = (sector?: string | null, industry?: string | null) => {
  if (sector && sector.trim()) return sector.trim().toLowerCase();
  if (industry && industry.trim()) return industry.trim().toLowerCase();
  return 'financial-other';
};

const getMedian = (values: number[]) => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle];
  return (sorted[middle - 1] + sorted[middle]) / 2;
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
      dePolicy,
      financialDeSectorMultiplierMax,
      peMax,
      pbvMax,
      roeMin,
      marketCycleMode,
      dividendStreakMin,
      dividendMode,
      growthYears,
      strictGrowthWindow,
      revenueGrowthMin,
      netProfitGrowthMin,
      npmDeltaMin,
      maxRevenueDownYears,
      maxNetProfitDownYears,
      maxEpsDownYears,
      positiveEpsYearsMin
    } = body;
    const effectiveViScoreMin = viScoreMin !== undefined ? Math.min(Number(viScoreMin), 18) : undefined;
    const effectiveDividendStreakMin = dividendStreakMin !== undefined ? Math.max(0, Number(dividendStreakMin)) : undefined;
    const effectiveGrowthYears = growthYears !== undefined ? Math.max(3, Math.min(Number(growthYears), 10)) : 5;
    const effectiveStrictGrowthWindow = strictGrowthWindow === true;
    const effectiveDePolicy: 'strict' | 'sector-aware' | 'ignore-financials' =
      dePolicy === 'sector-aware' || dePolicy === 'ignore-financials' ? dePolicy : 'strict';
    const effectiveFinancialDeSectorMultiplierMax =
      financialDeSectorMultiplierMax !== undefined ? Math.max(0.8, Math.min(Number(financialDeSectorMultiplierMax), 2)) : 1.1;
    const effectiveDividendMode: 'and' | 'or' = dividendMode === 'or' ? 'or' : 'and';

    const cache = (await getFundamentalsCacheFromSupabase()) || (await getFundamentalsCache());
    if (!cache || !cache.tickers) {
      return NextResponse.json({ error: 'ไม่พบฐานข้อมูลหุ้นสำหรับ Screener (fundamentals-cache.json)' }, { status: 500 });
    }

    const tickers = Object.keys(cache.tickers);
    const financialDeSeriesByBucket: Record<string, number[]> = {};
    for (const ticker of tickers) {
      const data = cache.tickers[ticker];
      const history = Array.isArray(data?.history) ? [...data.history].sort((a: any, b: any) => (a.year || 0) - (b.year || 0)) : [];
      if (history.length === 0 || !isFinancialBusiness(data?.sector, data?.industry)) continue;
      const latestEntry = history[history.length - 1];
      const latestDeValue = Number(latestEntry?.de);
      if (!Number.isFinite(latestDeValue) || latestDeValue <= 0) continue;
      const bucket = getFinancialBucket(data?.sector, data?.industry);
      financialDeSeriesByBucket[bucket] = financialDeSeriesByBucket[bucket] || [];
      financialDeSeriesByBucket[bucket].push(latestDeValue);
    }
    const financialDeMedianByBucket = Object.fromEntries(
      Object.entries(financialDeSeriesByBucket).map(([bucket, values]) => [bucket, getMedian(values)])
    ) as Record<string, number | null>;
    
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
    let computedFScoreCount = 0;
    let computedZScoreCount = 0;
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

      const growthWindow = getMetricWindow(normalizedHistory, effectiveGrowthYears, effectiveStrictGrowthWindow);
      const revenueSeries = growthWindow ? getNumericSeries(growthWindow, (h) => h.revenue) : [];
      const netProfitSeries = growthWindow ? getNumericSeries(growthWindow, (h) => h.netProfit) : [];
      const epsSeries = growthWindow ? getNumericSeries(growthWindow, (h) => h.eps) : [];
      const dpsSeries = growthWindow ? getNumericSeries(growthWindow, (h) => h.dps) : [];
      
      // Basic metrics
      const revenueCAGR = growthWindow ? calculateCAGR(revenueSeries) : null;
      const netProfitCAGR = growthWindow ? calculateCAGR(netProfitSeries) : null;
      const epsCAGR = growthWindow ? calculateCAGR(epsSeries) : null;
      const dpsCAGR = growthWindow ? calculateCAGR(dpsSeries) : null;
      const npmDelta = growthWindow ? calculateNpmDelta(growthWindow) : null;
      const revenueDownYears = growthWindow ? countDecliningYears(revenueSeries) : null;
      const netProfitDownYears = growthWindow ? countDecliningYears(netProfitSeries) : null;
      const epsDownYears = growthWindow ? countDecliningYears(epsSeries) : null;
      const positiveEpsYears = growthWindow ? countPositiveYears(epsSeries) : 0;

      // Calculate F-Score
      const fScoreRes = calculateFScore(normalizedHistory);
      const fScore = fScoreRes ? fScoreRes.score : null;
      if (fScore !== null) computedFScoreCount += 1;
      
      // Calculate Z-Score
      const lastHistory = normalizedHistory[normalizedHistory.length - 1];
      const currentPriceFromHistory = lastHistory.close || lastHistory.price || null;
      const marketCap = lastHistory.mktCap || (currentPriceFromHistory && lastHistory.shares ? currentPriceFromHistory * lastHistory.shares : null);
      const zScoreRes = calculateZScore(normalizedHistory, marketCap);
      const zScore = zScoreRes ? zScoreRes.score : null;
      if (zScore !== null) computedZScoreCount += 1;

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
      const latestDE = lastHistory.de !== null && lastHistory.de !== undefined ? lastHistory.de : null;
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
      const isFinancial = isFinancialBusiness(data.sector, data.industry);
      const financialBucket = getFinancialBucket(data.sector, data.industry);
      const financialSectorDeMedian = financialDeMedianByBucket[financialBucket] ?? null;
      const effectiveDeThreshold =
        isFinancial && effectiveDePolicy === 'sector-aware' && financialSectorDeMedian !== null
          ? financialSectorDeMedian * effectiveFinancialDeSectorMultiplierMax
          : deMax !== undefined
            ? Number(deMax)
            : null;

      // Check Filters
      if (revenueGrowthMin !== undefined && (revenueCAGR === null || (revenueCAGR * 100) < Number(revenueGrowthMin))) continue;
      if (netProfitGrowthMin !== undefined && (netProfitCAGR === null || (netProfitCAGR * 100) < Number(netProfitGrowthMin))) continue;
      if (epsGrowthMin !== undefined && (epsCAGR === null || (epsCAGR * 100) < epsGrowthMin)) continue;
      if (npmDeltaMin !== undefined && (npmDelta === null || npmDelta < Number(npmDeltaMin))) continue;
      const dpsGrowthPass = dpsGrowthMin === undefined || (dpsCAGR !== null && (dpsCAGR * 100) >= Number(dpsGrowthMin));
      const dividendStreakPass = effectiveDividendStreakMin === undefined || dividendStreakYears >= effectiveDividendStreakMin;
      if (effectiveDividendMode === 'or') {
        if (!dpsGrowthPass && !dividendStreakPass) continue;
      } else {
        if (!dpsGrowthPass) continue;
        if (!dividendStreakPass) continue;
      }
      if (maxRevenueDownYears !== undefined && (revenueDownYears === null || revenueDownYears > Number(maxRevenueDownYears))) continue;
      if (maxNetProfitDownYears !== undefined && (netProfitDownYears === null || netProfitDownYears > Number(maxNetProfitDownYears))) continue;
      if (maxEpsDownYears !== undefined && (epsDownYears === null || epsDownYears > Number(maxEpsDownYears))) continue;
      if (positiveEpsYearsMin !== undefined && positiveEpsYears < Number(positiveEpsYearsMin)) continue;
      if (fScoreMin !== undefined && fScore !== null && fScore < fScoreMin) continue;
      if (zScoreMin !== undefined && zScore !== null && zScore < zScoreMin) continue;
      if (effectiveViScoreMin !== undefined && viScore < effectiveViScoreMin) continue;
      if (yieldMin !== undefined && (latestYield === null || latestYield < yieldMin)) continue;
      if (deMax !== undefined) {
        if (latestDE === null) continue;
        if (isFinancial && effectiveDePolicy === 'ignore-financials') {
          // Skip D/E hard filter for financial companies when explicitly requested.
        } else if (effectiveDeThreshold !== null && latestDE > effectiveDeThreshold) {
          continue;
        }
      }
      if (peMax !== undefined && (!latestPE || latestPE > peMax)) continue;
      if (pbvMax !== undefined && (!latestPBV || latestPBV > pbvMax)) continue;
      if (roeMin !== undefined && latestROE < roeMin) continue;
      if (marketCycleMode !== undefined && marketCycle.phase !== marketCycleMode) continue;

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
        growthYears: effectiveGrowthYears,
        revenueCAGR: revenueCAGR !== null ? revenueCAGR * 100 : null,
        netProfitCAGR: netProfitCAGR !== null ? netProfitCAGR * 100 : null,
        epsCAGR: epsCAGR !== null ? epsCAGR * 100 : null,
        dpsCAGR: dpsCAGR !== null ? dpsCAGR * 100 : null,
        npmDelta,
        revenueDownYears,
        netProfitDownYears,
        epsDownYears,
        positiveEpsYears,
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
        dividendMode: effectiveDividendMode,
        marketCycle: marketCycle.phase,
        marketCycleLabel: marketCycle.label,
        marketCycleZScore: marketCycle.zScore,
        isFinancial,
        dePolicyApplied: effectiveDePolicy,
        deThresholdApplied: effectiveDeThreshold,
        sectorDeMedian: financialSectorDeMedian,
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
    if (effectiveGrowthYears >= 10) {
      warnings.push(`กำลังใช้หน้าต่างวิเคราะห์ ${effectiveGrowthYears} ปี${effectiveStrictGrowthWindow ? 'แบบต้องมีข้อมูลครบทุกปี' : ''}`);
    }
    if (effectiveDePolicy === 'sector-aware') {
      warnings.push('หุ้นกลุ่มการเงินใช้ D/E แบบเทียบ median ของกลุ่มธุรกิจเดียวกัน');
    }
    if (fScoreMin !== undefined && computedFScoreCount === 0) {
      warnings.push('Piotroski F-Score ยังไม่พร้อมในข้อมูลชุดนี้ จึงไม่สามารถใช้กรองได้');
    }
    if (zScoreMin !== undefined && computedZScoreCount === 0) {
      warnings.push('Altman Z-Score ยังไม่พร้อมในข้อมูลชุดนี้ จึงไม่สามารถใช้กรองได้');
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
        growthYears: effectiveGrowthYears,
        strictGrowthWindow: effectiveStrictGrowthWindow,
        dePolicy: effectiveDePolicy,
        financialDeSectorMultiplierMax: effectiveFinancialDeSectorMultiplierMax,
        dividendMode: effectiveDividendMode,
        fScoreComputedCount: computedFScoreCount,
        zScoreComputedCount: computedZScoreCount,
      }
    });

  } catch (error: any) {
    console.error('Screener error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
