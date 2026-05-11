
import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
import { calculateFScore, calculateZScore } from '@/lib/calculations';
// import fundamentalsCache from '@/data/fundamentals-cache.json'; // Removed static import to prevent large bundle size

import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Lazy load the large JSON file
async function getFundamentalsCache() {
  try {
    const cache = await import('@/data/fundamentals-cache.json');
    return cache.default || cache;
  } catch (e) {
    console.warn('Failed to load local fundamentals cache:', e);
    return null;
  }
}

const mergeFundamentalsToYearMap = (yearMap: Map<number, any>, fundamentals: any[], source?: string) => {
    if (!fundamentals || fundamentals.length === 0) return;
    
    fundamentals.forEach(f => {
        const year = f.year;
        if (!yearMap.has(year)) {
            yearMap.set(year, { 
                year,
                source: source || null,
                // Initialize with values from thaifin/cache
                revenue: f.revenue || null,
                netProfit: f.netProfit || null,
                eps: f.eps || null,
                dps: f.dps || null,
                de: f.de || null,
                npm: f.npm || null,
                gpm: f.gpm || null, // Ensure gpm is here
                roe: f.roe || null,
                roa: f.roa || null,
                pe: f.pe || null,
                pbv: f.pbv || null,
                price: f.price || f.close || null,
                bvps: f.bvps || null,
                
                // F-Score / Z-Score fields
                operatingCashFlow: f.operatingCashFlow || null,
                totalAssets: f.totalAssets || null,
                totalLiabilities: f.totalLiabilities || null,
                retainedEarnings: f.retainedEarnings || null,
                ebit: f.ebit || null,
                grossProfit: f.grossProfit || null,
                longTermDebt: f.longTermDebt || null,
                shares: f.shares || null,
                currentRatio: f.currentRatio || null,
                totalCurrentAssets: f.totalCurrentAssets || null,
                totalCurrentLiabilities: f.totalCurrentLiabilities || null,
            });
        } else {
            // Update existing entry (priority to thaifin/cache if value exists)
            const entry = yearMap.get(year);
            const keys = [
                'revenue', 'netProfit', 'eps', 'dps', 'de', 'npm', 'gpm', 'roe', 'roa', 'pe', 'pbv', 'price', 'bvps',
                'operatingCashFlow', 'totalAssets', 'totalLiabilities', 'retainedEarnings', 'ebit', 'grossProfit', 'longTermDebt', 'shares', 'currentRatio', 'totalCurrentAssets', 'totalCurrentLiabilities'
            ];
            keys.forEach(key => {
                if (f[key] !== undefined && f[key] !== null) {
                     entry[key] = f[key];
                }
            });
            // Special case for price/close alias
            if (!entry.price && f.close) entry.price = f.close;
        }
    });
};

async function readFundamentalsCache(ticker: string) {
  try {
    const tickerKey = ticker.toUpperCase();

    // 1. Try Supabase Database first
    if (supabase) {
      const { data, error } = await supabase
        .from('stock_fundamentals')
        .select('history')
        .eq('ticker', tickerKey)
        .single();
        
      if (!error && data && data.history) {
        console.log(`[Cache] Retrieved ${tickerKey} from Supabase DB`);
        return data.history;
      }
    }

    // 2. Fallback to Local JSON 
    console.log(`[Cache] Fetching ${tickerKey} from local JSON fallback...`);
    const cache = await getFundamentalsCache();
    if (cache) {
      const node = (cache as any)?.tickers?.[tickerKey] || (cache as any)?.[tickerKey];
      if (node && Array.isArray(node.history)) {
        return node.history;
      }
    }
  } catch (e) {
    console.warn('Error reading cache:', e);
  }
  return null;
}

// Helper to save missing cache aggressively back to Supabase
async function saveToSupabaseCache(ticker: string, history: any[], info: any = {}) {
  try {
    if (!supabaseAdmin) return;
    const tickerKey = ticker.toUpperCase();
    
    const { error } = await supabaseAdmin.from('stock_fundamentals').upsert({
      ticker: tickerKey,
      company_name: info.companyName || null,
      sector: info.sector || null,
      industry: info.industry || null,
      history: history,
      updated_at: new Date().toISOString()
    }, { onConflict: 'ticker' });

    if (error) {
      console.warn(`[Supabase] Failed to upsert cache for ${tickerKey}:`, error.message);
    } else {
      console.log(`[Supabase] Ingested history for ${tickerKey} into DB`);
    }
  } catch (err) {
    // silently fail cache writes
  }
}


const THAI_COMPANY_NAMES: Record<string, string> = {
  'PTT': 'บริษัท ปตท. จำกัด (มหาชน)',
  'AOT': 'บริษัท ท่าอากาศยานไทย จำกัด (มหาชน)',
  'CPALL': 'บริษัท ซีพี ออลล์ จำกัด (มหาชน)',
  'ADVANC': 'บริษัท แอดวานซ์ อินโฟร์ เซอร์วิส จำกัด (มหาชน)',
  'DELTA': 'บริษัท เดลต้า อีเลคโทรนิคส์ (ประเทศไทย) จำกัด (มหาชน)',
  'PTTEP': 'บริษัท ปตท. สำรวจและผลิตปิโตรเลียม จำกัด (มหาชน)',
  'GULF': 'บริษัท กัลฟ์ เอ็นเนอร์จี ดีเวลลอปเมนท์ จำกัด (มหาชน)',
  'BDMS': 'บริษัท กรุงเทพดุสิตเวชการ จำกัด (มหาชน)',
  'SCB': 'ธนาคารไทยพาณิชย์ จำกัด (มหาชน)',
  'KBANK': 'ธนาคารกสิกรไทย จำกัด (มหาชน)',
  'BBL': 'ธนาคารกรุงเทพ จำกัด (มหาชน)',
  'SCC': 'บริษัท ปูนซิเมนต์ไทย จำกัด (มหาชน)',
  'CPN': 'บริษัท เซ็นทรัลพัฒนา จำกัด (มหาชน)',
  'INTUCH': 'บริษัท อินทัช โฮลดิ้งส์ จำกัด (มหาชน)',
  'MINT': 'บริษัท ไมเนอร์ อินเตอร์เนชั่นแนล จำกัด (มหาชน)',
  'TLI': 'บริษัท ไทยประกันชีวิต จำกัด (มหาชน)',
  'MC': 'บริษัท แม็คกรุ๊ป จำกัด (มหาชน)'
};

export async function GET(request: Request) {
  // Try to suppress notices if the method exists
  try {
    const yahooFinance = new YahooFinance();
    if (typeof (yahooFinance as any).suppressNotices === 'function') {
      (yahooFinance as any).suppressNotices(['yahooSurvey', 'ripHistorical']);
    }
  } catch (e) {
    // Ignore error if suppressNotices fails
  }

  const { searchParams } = new URL(request.url);
    const ticker = searchParams.get('ticker');
    const tickers = searchParams.get('tickers'); // New param for batch fetching
    const mode = searchParams.get('mode'); // 'light' for faster fetch

    // --- BATCH FETCHING LOGIC ---
  if (tickers) {
    const tickerList = tickers.split(',').filter(t => t.trim().length > 0);
    if (tickerList.length === 0) {
        return NextResponse.json({ error: 'No valid tickers provided' }, { status: 400 });
    }

    try {
        const yahooFinance = new YahooFinance(); // Ensure instance is created inside
        if (typeof (yahooFinance as any).suppressNotices === 'function') {
           (yahooFinance as any).suppressNotices(['yahooSurvey', 'ripHistorical']);
        }
        
        const results = await Promise.all(tickerList.map(async (t) => {
            const symbol = t.toUpperCase().endsWith('.BK') ? t.toUpperCase() : `${t.toUpperCase()}.BK`;
            try {
                const quote = await yahooFinance.quoteSummary(symbol, {
            modules: ['price', 'summaryDetail', 'financialData', 'summaryProfile', 'calendarEvents']
        }, { validateResult: false });
        
        // Manual Overrides (Copy from single logic)
        const overrides: Record<string, number> = {
          'BKIH.BK': 17.0, 'HTC.BK': 1.02, 'TACC.BK': 0.4, 'TLI.BK': 0.5,
          'TTW.BK': 0.60, 'ICHI.BK': 1.05, 'TU.BK': 0.7, 'MEGA.BK': 1.60,
          'SCB.BK': 10.44, 'TISCO.BK': 7.75, 'MC.BK': 0.96
        };

        // Fix for TypeScript 'unknown' error - Cast entire quote object to any first
        const quoteAny = quote as any;
        const summaryDetail = quoteAny.summaryDetail;
        const financialData = quoteAny.financialData;
        const price = quoteAny.price;

        let d0 = summaryDetail?.dividendRate || summaryDetail?.trailingAnnualDividendRate;
        if (overrides[symbol]) d0 = overrides[symbol];

        const currentPrice = financialData?.currentPrice || price?.regularMarketPrice;
        let dividendYield = summaryDetail?.dividendYield;
        if (d0 && currentPrice) dividendYield = d0 / currentPrice;

        return {
            ticker: t.toUpperCase(),
            currentPrice,
            sector: quoteAny.summaryProfile?.sector,
            exDividendDate: quoteAny.calendarEvents?.exDividendDate || summaryDetail?.exDividendDate,
            d0,
            dividendYield,
            pe: summaryDetail?.trailingPE,
            marketCap: summaryDetail?.marketCap
        };
    } catch (err) {
        // Fallback for batch failure: return error object but continue
        console.error(`Failed to fetch ${t}:`, err);
        return { ticker: t.toUpperCase(), error: true };
    }
}));

        return NextResponse.json(results);
    } catch (error: any) {
        return NextResponse.json({ error: 'Batch fetch failed', details: error.message }, { status: 500 });
    }
  }

  // --- SINGLE TICKER LOGIC (Keep existing) ---
  if (!ticker) {
    return NextResponse.json({ error: 'Ticker is required' }, { status: 400 });
  }

  try {
    // Add .BK suffix for Thai stocks if not present
    const symbol = ticker.toUpperCase().endsWith('.BK') ? ticker.toUpperCase() : `${ticker.toUpperCase()}.BK`;

    const yahooFinance = new YahooFinance();
    
    // Setup dates for historical data
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(endDate.getFullYear() - 10); // Reduced from 20 to 10 years for stability

    // Conditional Fetching based on mode
    let quoteResult, chartResult, fundamentalsResult;
    
    if (mode === 'light') {
       // Light mode: Only Quote (fastest)
       [quoteResult] = await Promise.allSettled([
          yahooFinance.quoteSummary(symbol, {
            modules: ['financialData', 'defaultKeyStatistics', 'summaryDetail', 'price', 'summaryProfile', 'calendarEvents', 'balanceSheetHistoryQuarterly']
          }, { validateResult: false })
       ]);
       
       // Mock empty results for others
       chartResult = { status: 'fulfilled', value: null };
       fundamentalsResult = { status: 'fulfilled', value: [] };
    
    } else {
       // Full mode: Fetch all
       [quoteResult, chartResult, fundamentalsResult] = await Promise.allSettled([
          yahooFinance.quoteSummary(symbol, {
            modules: ['financialData', 'defaultKeyStatistics', 'summaryDetail', 'price', 'incomeStatementHistory', 'balanceSheetHistory', 'cashflowStatementHistory', 'summaryProfile', 'calendarEvents', 'balanceSheetHistoryQuarterly']
          }, { validateResult: false }),
          yahooFinance.chart(symbol, {
            period1: startDate.toISOString().split('T')[0],
            interval: '1mo',
            events: 'div'
          }),
          yahooFinance.fundamentalsTimeSeries(symbol, {
            period1: startDate.toISOString().split('T')[0],
            period2: endDate.toISOString().split('T')[0],
            type: 'annual',
            module: 'all'
          })
       ]);
    }

    const quote: any = quoteResult.status === 'fulfilled' ? quoteResult.value : {};
    let chartData: any = chartResult.status === 'fulfilled' ? chartResult.value : null;
    let financials: any[] = fundamentalsResult.status === 'fulfilled' ? (fundamentalsResult.value as any[]) : [];

    if (quoteResult.status === 'rejected') console.error('Quote fetch failed:', quoteResult.reason);
    if (chartResult.status === 'rejected') console.error('Chart fetch failed:', chartResult.reason);
    if (fundamentalsResult.status === 'rejected') console.error('Fundamentals fetch failed:', fundamentalsResult.reason);

    // Process History Data
    const yearMap = new Map<number, any>();
    
    // Process Financials (Annual)
    let lastShares = 0;
    let lastEquity = 0;

    // 3. Merge Yahoo Data (fill gaps)
    if (financials && financials.length > 0) {
        financials.forEach((f: any) => {
            if (!f.date) return;
            const year = new Date(f.date).getFullYear();
            
            let entry = yearMap.get(year);
            if (!entry) {
                entry = { year };
                yearMap.set(year, entry);
            }

            // Only overwrite if value is missing/null/zero in current entry
            // Helper to conditionally set
            const setIfMissing = (key: string, val: any) => {
                if (val !== undefined && val !== null && (entry[key] === undefined || entry[key] === null || entry[key] === 0)) {
                    entry[key] = val;
                }
            };

            // Extract Metrics from Yahoo
            const revenue = f.totalRevenue || f.operatingRevenue;
            const netProfit = f.netIncome || f.netIncomeCommonStockholders || f.netIncomeContinuousOperations;
            const eps = f.dilutedEPS || f.basicEPS;
            const grossProfit = f.grossProfit;
            const operatingCashFlow = f.operatingCashFlow || f.totalCashFromOperatingActivities;
            const totalAssets = f.totalAssets;
            const currentAssets = f.currentAssets || f.totalCurrentAssets;
            const currentLiabilities = f.currentLiabilities || f.totalCurrentLiabilities;
            const longTermDebt = f.longTermDebt;
            
            // Debt Calculation
            let totalDebt = f.totalDebt;
            if (totalDebt === undefined || totalDebt === null) {
                 totalDebt = (f.currentDebt || 0) + (f.longTermDebt || 0);
            }
            
            const totalEquity = f.totalStockholderEquity || f.totalEquityGrossMinorityInterest;
            const shares = f.shareIssued || f.dilutedAverageShares || f.basicAverageShares;
            
            if (shares) lastShares = shares;
            if (totalEquity) lastEquity = totalEquity;
            
            const totalLiabilities = f.totalLiabilitiesNetMinorityInterest || f.totalLiabilities;
            const de = (totalLiabilities && totalEquity) ? totalLiabilities / totalEquity : null;
            const npm = (netProfit && revenue) ? (netProfit / revenue) * 100 : null;
            const gpm = (grossProfit && revenue) ? (grossProfit / revenue) * 100 : null;
            const currentRatio = (currentAssets && currentLiabilities) ? currentAssets / currentLiabilities : null;
            
            // BVPS (Book Value Per Share)
            const bvps = (totalEquity && shares) ? totalEquity / shares : null;
            const roa = (netProfit && totalAssets) ? (netProfit / totalAssets) * 100 : null;
            const roe = (netProfit && totalEquity) ? (netProfit / totalEquity) * 100 : null;

            // Z-Score specific fields
            const retainedEarnings = f.retainedEarnings || f.retainedEarningsTotalEquity;
            const ebit = f.ebit || f.operatingIncome || f.operatingRevenue - (f.costOfRevenue || 0) - (f.operatingExpense || 0);

            // Merge into entry
            setIfMissing('revenue', revenue);
            setIfMissing('netProfit', netProfit);
            setIfMissing('eps', eps);
            setIfMissing('de', de);
            setIfMissing('npm', npm);
            setIfMissing('gpm', gpm);
            setIfMissing('currentRatio', currentRatio);
            setIfMissing('operatingCashFlow', operatingCashFlow);
            setIfMissing('totalAssets', totalAssets);
            setIfMissing('longTermDebt', longTermDebt);
            setIfMissing('bvps', bvps);
            setIfMissing('roa', roa);
            setIfMissing('roe', roe);
            setIfMissing('retainedEarnings', retainedEarnings);
            setIfMissing('ebit', ebit);
            setIfMissing('totalLiabilities', totalLiabilities);
            setIfMissing('totalCurrentAssets', currentAssets);
            setIfMissing('totalCurrentLiabilities', currentLiabilities);
            setIfMissing('shares', shares);
        });
    }

    // Merge Income Statement History (Legacy) for missing years
    if (quote.incomeStatementHistory && quote.incomeStatementHistory.incomeStatementHistory) {
        quote.incomeStatementHistory.incomeStatementHistory.forEach((f: any) => {
             if (!f.endDate) return;
             const year = new Date(f.endDate).getFullYear();
             
             let entry = yearMap.get(year);
             if (!entry) {
                 entry = { year, dps: 0, price: null, de: null, bvps: null };
                 yearMap.set(year, entry);
             }
             
             // Update if missing
             if (!entry.revenue) entry.revenue = f.totalRevenue || f.operatingRevenue;
             if (!entry.netProfit) entry.netProfit = f.netIncome || f.netIncomeCommonStockholders;
             if (!entry.grossProfit) entry.grossProfit = f.grossProfit;
             if (!entry.ebit) entry.ebit = f.ebit || f.operatingIncome;
             
             // Try to calculate EPS if missing
             if (!entry.eps) {
                 entry.eps = f.dilutedEPS || f.basicEPS;
                 if (!entry.eps && entry.netProfit && lastShares) {
                     entry.eps = entry.netProfit / lastShares;
                 }
             }
             
             // Try to calculate NPM
             if (!entry.npm && entry.netProfit && entry.revenue) {
                 entry.npm = (entry.netProfit / entry.revenue) * 100;
             }
             
             // Calculate GPM
             if (!entry.gpm && entry.grossProfit && entry.revenue) {
                 entry.gpm = (entry.grossProfit / entry.revenue) * 100;
             }
        });
    }

    // Merge Balance Sheet History
    if (quote.balanceSheetHistory && quote.balanceSheetHistory.balanceSheetStatements) {
        quote.balanceSheetHistory.balanceSheetStatements.forEach((f: any) => {
            if (!f.endDate) return;
            const year = new Date(f.endDate).getFullYear();
            
            let entry = yearMap.get(year);
            if (!entry) {
                 entry = { year, dps: 0, price: null, de: null, bvps: null };
                 yearMap.set(year, entry);
            }

            if (!entry.totalAssets) entry.totalAssets = f.totalAssets;
            const totalLiabilities = f.totalLiabilitiesNetMinorityInterest || f.totalLiabilities;
            if (!entry.totalLiabilities) entry.totalLiabilities = totalLiabilities;
            if (!entry.totalCurrentAssets) entry.totalCurrentAssets = f.totalCurrentAssets || f.totalAssets / 2; // Fallback? No, strict.
            if (!entry.totalCurrentAssets && f.totalCurrentAssets) entry.totalCurrentAssets = f.totalCurrentAssets;
            
            if (!entry.totalCurrentLiabilities) entry.totalCurrentLiabilities = f.totalCurrentLiabilities;
            if (!entry.longTermDebt) entry.longTermDebt = f.longTermDebt;
            if (!entry.retainedEarnings) entry.retainedEarnings = f.retainedEarnings || f.retainedEarningsTotalEquity;
            if (!entry.shares) entry.shares = f.shareIssued || f.commonStockSharesOutstanding;
            
            const totalEquity = f.totalStockholderEquity || f.totalEquityGrossMinorityInterest;
            
            // Recalculate derived metrics ONLY if missing (do NOT overwrite thaifin/cache values)
            if (!entry.bvps && entry.shares && totalEquity) {
                entry.bvps = totalEquity / entry.shares;
            }
            if (!entry.roa && entry.netProfit && entry.totalAssets) {
                entry.roa = (entry.netProfit / entry.totalAssets) * 100;
            }
            if (!entry.roe && entry.netProfit && totalEquity) {
                entry.roe = (entry.netProfit / totalEquity) * 100;
            }
            if (!entry.currentRatio && entry.totalCurrentAssets && entry.totalCurrentLiabilities) {
                entry.currentRatio = entry.totalCurrentAssets / entry.totalCurrentLiabilities;
            }
            
            // Update DE only if missing
            if (!entry.de && totalLiabilities && totalEquity) {
                entry.de = totalLiabilities / totalEquity;
            }
        });
    }

    // Merge Cash Flow Statement History
    if (quote.cashflowStatementHistory && quote.cashflowStatementHistory.cashflowStatements) {
        quote.cashflowStatementHistory.cashflowStatements.forEach((f: any) => {
            if (!f.endDate) return;
            const year = new Date(f.endDate).getFullYear();
            
            let entry = yearMap.get(year);
            if (!entry) {
                 entry = { year, dps: 0, price: null, de: null, bvps: null };
                 yearMap.set(year, entry);
            }

            if (!entry.operatingCashFlow) entry.operatingCashFlow = f.totalCashFromOperatingActivities || f.operatingCashFlow;
        });
    }

    // ===== thaifin Integration: Backfill 10+ years of fundamentals =====
    // Yahoo Finance typically only provides 4-5 years of fundamental data for Thai stocks.
    // thaifin (Python microservice on port 5001) provides 10-16 years from SET/Settrade/Finnomena.
    // Strategy: Use thaifin data to FILL GAPS only — Yahoo data takes priority for overlapping years.
    const tickerClean = symbol.replace('.BK', '');
    let mergedFromThaifin = false;
    try {
        const thaifinBaseUrl =
            process.env.THAIFIN_BASE_URL ||
            (process.env.NODE_ENV === 'production' && process.env.VERCEL_URL
                ? `https://${process.env.VERCEL_URL}`
                : 'http://localhost:5001');
        
        // Vercel Serverless Function Timeout is usually 10s (Hobby) or 60s (Pro).
        // We set timeout to 5s to fail fast and fallback to cache if thaifin is slow/blocked.
        const thaifinRes = await fetch(`${thaifinBaseUrl}/api/fundamentals?ticker=${tickerClean}`, {
            signal: AbortSignal.timeout(5000) 
        });

        if (thaifinRes.ok) {
            const thaifinData = await thaifinRes.json();
            if (Array.isArray(thaifinData.history) && thaifinData.history.length > 0) {
                mergeFundamentalsToYearMap(yearMap, thaifinData.history, 'thaifin');
                mergedFromThaifin = true;
                console.log(`[thaifin] ✅ Merged ${thaifinData.totalYears || thaifinData.history.length || 0} years for ${tickerClean}`);
            }
        }
    } catch (thaifinErr: any) {
        // thaifin server not available — gracefully degrade to Yahoo-only data
        console.warn(`[thaifin] ⚠️ Server unavailable (${thaifinErr.message}), using Yahoo data only`);
    }
    if (!mergedFromThaifin) {
        const cachedHistory = await readFundamentalsCache(tickerClean);
        if (cachedHistory && cachedHistory.length > 0) {
            mergeFundamentalsToYearMap(yearMap, cachedHistory, 'cache');
            console.log(`[thaifin-cache] ✅ Merged ${cachedHistory.length} years for ${tickerClean}`);
        } else {
            // Check Supabase Cache as last resort
            try {
                const { data: supabaseData, error } = await supabase
                    .from('fundamentals_cache')
                    .select('*')
                    .eq('ticker', tickerClean)
                    .order('year', { ascending: true });
                
                if (supabaseData && supabaseData.length > 0) {
                    mergeFundamentalsToYearMap(yearMap, supabaseData, 'supabase');
                    console.log(`[supabase-cache] ✅ Merged ${supabaseData.length} years for ${tickerClean}`);
                }
            } catch (err) {
                console.warn(`[supabase-cache] ⚠️ Fetch failed: ${err}`);
            }
        }
    } else {
        // LAZY CACHING: Save fetched data to Supabase for future use
        // This runs asynchronously to not block response
        (async () => {
            try {
                // Map thaifin data to Supabase schema
                const cacheRows = Array.from(yearMap.values())
                    .filter(v => v.source === 'thaifin' && v.year)
                    .map(v => ({
                        ticker: tickerClean,
                        year: v.year,
                        revenue: v.revenue,
                        netProfit: v.netProfit,
                        eps: v.eps,
                        de: v.de,
                        npm: v.npm,
                        bvps: v.bvps,
                        roe: v.roe,
                        roa: v.roa,
                        
                        // F-Score / Z-Score fields
                        operatingCashFlow: v.operatingCashFlow,
                        totalAssets: v.totalAssets,
                        totalLiabilities: v.totalLiabilities,
                        retainedEarnings: v.retainedEarnings,
                        ebit: v.ebit,
                        grossProfit: v.grossProfit,
                        gpm: v.gpm,
                        longTermDebt: v.longTermDebt,
                        shares: v.shares,
                        currentRatio: v.currentRatio,
                        totalCurrentAssets: v.totalCurrentAssets,
                        totalCurrentLiabilities: v.totalCurrentLiabilities
                    }));
                
                if (cacheRows.length > 0) {
                     const { error } = await supabase.from('fundamentals_cache').upsert(cacheRows, { onConflict: 'ticker,year' });
                     if (error) console.error(`[lazy-cache] ❌ Failed to save ${tickerClean}: ${error.message}`);
                     else console.log(`[lazy-cache] ✅ Saved ${cacheRows.length} years for ${tickerClean}`);
                }
            } catch (e) {
                console.error(`[lazy-cache] ❌ Error: ${e}`);
            }
        })();
    }

    // Process Dividends from Chart Events
    const dividendByYear = new Map<number, number>();
    const dividendByQuarterByYear = new Map<number, { q1: number; q2: number; q3: number; q4: number; payments: number }>();
    try {
       if (chartData && chartData.events && chartData.events.dividends) {
           const divs = chartData.events.dividends;
           if (Array.isArray(divs)) {
               divs.forEach((d: any) => {
                   if (d.date && d.amount) {
                       const dateVal = new Date(d.date);
                       const year = dateVal.getFullYear();
                       const amount = Number(d.amount) || 0;
                       const current = dividendByYear.get(year) || 0;
                       dividendByYear.set(year, current + amount);
                       const quarterData = dividendByQuarterByYear.get(year) || { q1: 0, q2: 0, q3: 0, q4: 0, payments: 0 };
                       const month = dateVal.getMonth();
                       if (month <= 2) quarterData.q1 += amount;
                       else if (month <= 5) quarterData.q2 += amount;
                       else if (month <= 8) quarterData.q3 += amount;
                       else quarterData.q4 += amount;
                       quarterData.payments += 1;
                       dividendByQuarterByYear.set(year, quarterData);
                   }
               });
           } else {
               // Handle as object map if it comes that way (legacy)
               Object.values(divs).forEach((d: any) => {
                   if (d.date && d.amount) {
                       const dateVal = typeof d.date === 'number' ? new Date(d.date * 1000) : new Date(d.date);
                       const year = dateVal.getFullYear();
                       const amount = Number(d.amount) || 0;
                       const current = dividendByYear.get(year) || 0;
                       dividendByYear.set(year, current + amount);
                       const quarterData = dividendByQuarterByYear.get(year) || { q1: 0, q2: 0, q3: 0, q4: 0, payments: 0 };
                       const month = dateVal.getMonth();
                       if (month <= 2) quarterData.q1 += amount;
                       else if (month <= 5) quarterData.q2 += amount;
                       else if (month <= 8) quarterData.q3 += amount;
                       else quarterData.q4 += amount;
                       quarterData.payments += 1;
                       dividendByQuarterByYear.set(year, quarterData);
                   }
               });
           }
       }
    } catch(e) { console.error('Error processing dividends:', e); }

    // Process Price History to get Annual Average/Close Price
    const priceByYear = new Map<number, number>();
    const monthlyData: any[] = []; // Store monthly data for PE/PBV Bands

    if (chartData && chartData.quotes) {
        const tempPriceSum = new Map<number, { sum: number, count: number }>();
        
        // Sort financials by date descending for easier lookup
        const sortedFinancials = [...financials].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // ===== Build combined EPS/BVPS lookup from Yahoo financials + thaifin yearMap =====
        // This enables PE/PBV bands to extend to 10+ years instead of only 4-5 years.
        // For each monthly price point, we try: 1) Yahoo financials (most precise), 2) thaifin yearMap (broader coverage)
        const yearlyEpsBvps = new Map<number, { eps: number | null; bvps: number | null; shares?: number | null; source?: string; }>();
        
        // First: populate from thaifin yearMap (broader but annual-level precision)
        yearMap.forEach((entry, year) => {
            yearlyEpsBvps.set(year, {
                eps: entry.eps || null,
                bvps: entry.bvps || null,
                shares: entry.shares || null, // Add shares to yearlyEpsBvps
                source: entry.source || null
            });
        });
        
        // Then: override with Yahoo financials where available (more precise per-date data)
        sortedFinancials.forEach((f: any) => {
            if (!f.date) return;
            const year = new Date(f.date).getFullYear();
            const eps = f.dilutedEPS || f.basicEPS;
            const totalEquity = f.totalEquityGrossMinorityInterest || f.totalStockholderEquity;
            const shares = f.shareIssued || f.dilutedAverageShares || f.basicAverageShares;
            const bvps = (totalEquity && shares) ? totalEquity / shares : null;
            if (eps || bvps) {
                yearlyEpsBvps.set(year, {
                    eps: eps || yearlyEpsBvps.get(year)?.eps || null,
                    bvps: bvps || yearlyEpsBvps.get(year)?.bvps || null,
                });
            }
        });

        chartData.quotes.forEach((q: any) => {
            if (!q.date || !q.close) return;
            const date = new Date(q.date);
            const year = date.getFullYear();
            
            // Annual Price Calculation
            const current = tempPriceSum.get(year) || { sum: 0, count: 0 };
            tempPriceSum.set(year, { sum: current.sum + q.close, count: current.count + 1 });

            // Monthly Data for PE/PBV Bands
            // Strategy: Try Yahoo financials first (date-precise), then fall back to yearMap (annual)
            let eps: number | null = null;
            let bvps: number | null = null;

            // 1) Try Yahoo financials (most recent report before this quote date)
            const report = sortedFinancials.find(f => new Date(f.date) <= date);
            if (report) {
                eps = report.dilutedEPS || report.basicEPS || null;
                const totalEquity = report.totalEquityGrossMinorityInterest || report.totalStockholderEquity;
                const shares = report.shareIssued || report.dilutedAverageShares || report.basicAverageShares;
                bvps = (totalEquity && shares) ? totalEquity / shares : null;
            }

            // 2) Fallback to thaifin yearMap if Yahoo didn't have data
            if (!eps || !bvps) {
                // Try current year first, then previous year (for early months before annual report is published)
                const yearData = yearlyEpsBvps.get(year) || yearlyEpsBvps.get(year - 1);
                if (yearData) {
                    if (!eps && yearData.eps) eps = yearData.eps;
                    if (!bvps && yearData.bvps) bvps = yearData.bvps;
                }
            }

            const pe = (eps && eps > 0) ? q.close / eps : null;
            const pbv = (bvps && bvps > 0) ? q.close / bvps : null;

            if (pe !== null || pbv !== null) {
                monthlyData.push({
                    date: date.toISOString().split('T')[0], // YYYY-MM-DD
                    price: q.close,
                    pe,
                    pbv
                });
            }
        });

        tempPriceSum.forEach((val, year) => {
            priceByYear.set(year, val.sum / val.count);
        });
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

    const peValues = monthlyData.map(d => d.pe).filter(v => v !== null && v > 0 && v < 100); // Filter outliers
    const pbvValues = monthlyData.map(d => d.pbv).filter(v => v !== null && v > 0 && v < 20); // Filter outliers

    const peStats = calculateStats(peValues);
    const pbvStats = calculateStats(pbvValues);

    const ratioBands = {
        pe: {
            data: monthlyData.map(d => ({
                date: d.date,
                value: d.pe,
                price: d.price
            })).filter(d => d.value !== null && d.value > 0 && d.value < 100),
            stats: peStats
        },
        pbv: {
            data: monthlyData.map(d => ({
                date: d.date,
                value: d.pbv,
                price: d.price
            })).filter(d => d.value !== null && d.value > 0 && d.value < 20),
            stats: pbvStats
        }
    };

    // Merge everything into History Array
    // We want last 20 years, e.g. 2004-2024
    const currentYear = new Date().getFullYear();
    for (let y = currentYear - 20; y <= currentYear; y++) {
        let entry = yearMap.get(y);
        if (!entry) {
            entry = { year: y };
            yearMap.set(y, entry);
        }
        
        // Add Dividend
        if (dividendByYear.has(y)) {
            entry.dps = dividendByYear.get(y);
        }
        if (dividendByQuarterByYear.has(y)) {
            const quarterly = dividendByQuarterByYear.get(y)!;
            entry.dpsQ1 = quarterly.q1;
            entry.dpsQ2 = quarterly.q2;
            entry.dpsQ3 = quarterly.q3;
            entry.dpsQ4 = quarterly.q4;
            entry.dpsPayments = quarterly.payments;
        }
        
        // Add Price
        if (priceByYear.has(y)) {
            entry.price = priceByYear.get(y);
        }

        // Calculate PE and PBV if possible
        if (entry.price && entry.eps) {
            entry.pe = entry.price / entry.eps;
        }
        if (entry.price && entry.bvps) {
            entry.pbv = entry.price / entry.bvps;
        }
    }

    // Final cleanup: Remove years with no substantial data (to prevent 0.00 metrics)
    // Sometimes Yahoo returns a placeholder year with no data.
    const sortedYears = Array.from(yearMap.keys()).sort((a, b) => a - b);
    
    sortedYears.forEach(year => {
        const entry = yearMap.get(year);
        // If critical fields are missing, remove it.
        // Critical: Revenue, Net Profit, Total Assets, Price, Dividend
        const hasData = entry.revenue || entry.netProfit || entry.totalAssets || entry.price || entry.dps;
        if (!hasData) {
            yearMap.delete(year);
        } else {
            // Fix ROE: Only calculate if MISSING — do NOT overwrite authoritative thaifin/cache values
            if (!entry.roe && entry.netProfit && entry.bvps && entry.shares) {
                const totalEq = entry.bvps * entry.shares;
                if (totalEq > 0) {
                    entry.roe = (entry.netProfit / totalEq) * 100;
                }
            } else if (entry.roe && entry.roe > 1000) {
                // If ROE is ridiculously high (like 4685.6%), try to divide by 100
                entry.roe = entry.roe / 100;
            }
            // Fix ROA: Only calculate if MISSING
            if (!entry.roa && entry.netProfit && entry.totalAssets && entry.totalAssets > 0) {
                entry.roa = (entry.netProfit / entry.totalAssets) * 100;
            }
        }
    });

    // Final history construction
    const history = Array.from(yearMap.values())
         .sort((a, b) => a.year - b.year); // Sort by year ascending

    // [New] Cache generated history to Supabase asynchronously after building!
    if (history.length > 0) {
       saveToSupabaseCache(symbol, history, {
         sector: quote.summaryProfile?.sector,
         industry: quote.summaryProfile?.industry,
         companyName: quote.price?.longName
       });
    }

    // Manual Overrides for known incorrect data from Yahoo
    const overrides: Record<string, number> = {
      'BKIH.BK': 17.0,
      'HTC.BK': 1.02,
      'TACC.BK': 0.4,
      'TLI.BK': 0.5,
      'TTW.BK': 0.60,
      'ICHI.BK': 1.05,
      'TU.BK': 0.7,
      'MEGA.BK': 1.60,
      'SCB.BK': 10.44,
      'TISCO.BK': 7.75,
      'MC.BK': 0.96
    };

    let d0 = quote.summaryDetail?.dividendRate || quote.summaryDetail?.trailingAnnualDividendRate;
    
    // Extract the latest valid dividend from History for accuracy over Yahoo snapshot
    // If this year is 2026, fetch the dividend from the previous year (2025), etc.
    if (history && history.length > 0) {
      const currentYear = new Date().getFullYear();
      const targetYear = currentYear - 1;
      const targetHistory = history.find(h => h.year === targetYear);
      
      if (targetHistory && targetHistory.dps > 0) {
        d0 = targetHistory.dps;
      } else {
        // Fallback to the latest available if target year is not found
        for (let i = history.length - 1; i >= 0; i--) {
          if (history[i].dps > 0) {
            d0 = history[i].dps;
            break;
          }
        }
      }
    }
    
    // Apply override if exists
    if (overrides[symbol]) {
      d0 = overrides[symbol];
    }

    const currentPrice = quote.financialData?.currentPrice || quote.price?.regularMarketPrice;
    
    // Recalculate yield if we have D0 and Price (Override yield if D0 was overridden)
    let dividendYield = quote.summaryDetail?.dividendYield;
    if (d0 && currentPrice) {
      dividendYield = d0 / currentPrice;
    }

    // Extract the latest priority values from History (thaifin/SET data) for accuracy over Yahoo
    let finalRoe = quote.financialData?.returnOnEquity;
    let finalPe = quote.summaryDetail?.trailingPE;
    let finalPbv = quote.defaultKeyStatistics?.priceToBook;
    let finalBvps: number | undefined = undefined;
    let finalEps = quote.defaultKeyStatistics?.trailingEps || quote.defaultKeyStatistics?.forwardEps;
    let finalRoa = quote.financialData?.returnOnAssets;
    let finalDe = quote.financialData?.debtToEquity !== undefined && quote.financialData?.debtToEquity !== null ? quote.financialData.debtToEquity / 100 : undefined;
    
    if (history && history.length > 0) {
       for (let i = history.length - 1; i >= Math.max(0, history.length - 3); i--) {
           const h = history[i];
           if (finalRoe === quote.financialData?.returnOnEquity && h.roe !== null && h.roe !== undefined) finalRoe = h.roe / 100;
           if (finalPe === quote.summaryDetail?.trailingPE && h.pe !== null && h.pe !== undefined) finalPe = h.pe;
           if (finalPbv === quote.defaultKeyStatistics?.priceToBook && h.pbv !== null && h.pbv !== undefined) finalPbv = h.pbv;
           if (finalEps === (quote.defaultKeyStatistics?.trailingEps || quote.defaultKeyStatistics?.forwardEps) && h.eps !== null && h.eps !== undefined) finalEps = h.eps;
           if (finalBvps === undefined && h.bvps !== null && h.bvps !== undefined && Number(h.bvps) > 0) finalBvps = Number(h.bvps);
           if (finalRoa === quote.financialData?.returnOnAssets && h.roa !== null && h.roa !== undefined) finalRoa = h.roa / 100;
           if (finalDe === (quote.financialData?.debtToEquity !== undefined && quote.financialData?.debtToEquity !== null ? quote.financialData.debtToEquity / 100 : undefined) && h.de !== null && h.de !== undefined) finalDe = h.de;
       }
    }

    if (currentPrice && finalEps && Number(finalEps) > 0) {
      finalPe = currentPrice / Number(finalEps);
    }
    if (currentPrice && finalBvps && Number(finalBvps) > 0) {
      finalPbv = currentPrice / Number(finalBvps);
    }
    const quarterlyBalance = quote.balanceSheetHistoryQuarterly?.balanceSheetStatements?.[0];
    const quarterlyEquity = quarterlyBalance?.totalStockholderEquity || quarterlyBalance?.totalEquityGrossMinorityInterest;
    const quarterlyLiabilities = quarterlyBalance?.totalLiabilitiesNetMinorityInterest || quarterlyBalance?.totalLiabilities;
    if (quarterlyLiabilities && quarterlyEquity) {
      finalDe = quarterlyLiabilities / quarterlyEquity;
    }

    const data = {
      currentPrice: currentPrice,
      d0: d0,
      roe: finalRoe,
      payoutRatio: quote.summaryDetail?.payoutRatio,
      // Additional fields for table
      sector: quote.summaryProfile?.sector,
      industry: quote.summaryProfile?.industry,
      sectorKey: quote.summaryProfile?.sector, // Explicit key for sector
      industryKey: quote.summaryProfile?.industry, // Explicit key for industry
      exDividendDate: quote.calendarEvents?.exDividendDate || quote.summaryDetail?.exDividendDate,
      pe: finalPe,
      pbv: finalPbv,
      eps: finalEps,
      debtToEquity: finalDe,
      roa: finalRoa,
      marketCap: quote.summaryDetail?.marketCap,
      dividendYield: dividendYield,
      shortName: quote.price?.shortName,
      longName: quote.price?.longName,
      thaiCompanyName: THAI_COMPANY_NAMES[tickerClean] || null,
      currency: quote.financialData?.financialCurrency,
      history: history, // Add history to response
      ratioBands: ratioBands, // Add detailed monthly ratio bands
      
      // Simple FCF proxy calculation (Net Income as fallback if FCF not directly available)
      fcf: quote.financialData?.freeCashflow || 
           (history.length > 0 && history[history.length - 1].netProfit ? history[history.length - 1].netProfit : null),
      fScore: calculateFScore(history),
      zScore: calculateZScore(history, quote.summaryDetail?.marketCap)
    };

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching stock data:', error);
    return NextResponse.json({ error: 'Failed to fetch stock data', details: error.message }, { status: 500 });
  }
}
