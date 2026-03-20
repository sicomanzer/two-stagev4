import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
import { supabase } from '@/lib/supabase';

type EventCode = 'XD' | 'XM' | 'XN' | 'XR' | 'XW';

interface HoldingState {
  ticker: string;
  actualVol: number;
  avgCost: number;
  totalCost: number;
  realizedPL: number;
}

interface DividendEventRow {
  id: string;
  ticker: string;
  eventType: EventCode;
  exDate: string;
  amountPerShare: number;
  sharesHeld: number;
  expectedCash: number;
  avgCost: number;
  source: 'yfinance';
}

const SUPPORTED_EVENT_TYPES: EventCode[] = ['XD', 'XM', 'XN', 'XR', 'XW'];

function toGregorianYear(yearInput: string | null): number {
  const nowYear = new Date().getFullYear();
  if (!yearInput) return nowYear;
  const parsed = Number(yearInput);
  if (!Number.isFinite(parsed)) return nowYear;
  if (parsed > 2400) return parsed - 543;
  return parsed;
}

function toDateString(dateValue: string | number): string | null {
  const date = typeof dateValue === 'number' ? new Date(dateValue * 1000) : new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().split('T')[0];
}

function calculateCurrentHoldings(transactions: any[]): HoldingState[] {
  const holdings: Record<string, HoldingState> = {};
  transactions.forEach((tx: any) => {
    const ticker = String(tx.ticker || '').toUpperCase().trim();
    if (!ticker) return;
    const type = String(tx.type || '').toUpperCase().trim();
    const volume = Number(tx.volume) || 0;
    const price = Number(tx.price) || 0;
    const commission = Number(tx.commission) || 0;
    if (!holdings[ticker]) {
      holdings[ticker] = { ticker, actualVol: 0, avgCost: 0, totalCost: 0, realizedPL: 0 };
    }
    const state = holdings[ticker];
    if (type === 'BUY') {
      const cost = volume * price + commission;
      state.totalCost += cost;
      state.actualVol += volume;
      if (state.actualVol > 0) state.avgCost = state.totalCost / state.actualVol;
      return;
    }
    if (type === 'SELL') {
      const costBasis = volume * state.avgCost;
      const saleProceeds = volume * price - commission;
      state.realizedPL += saleProceeds - costBasis;
      state.actualVol -= volume;
      state.totalCost -= costBasis;
      if (state.actualVol <= 0) {
        state.actualVol = 0;
        state.totalCost = 0;
        state.avgCost = 0;
      }
    }
  });
  return Object.values(holdings).filter((h) => h.actualVol > 0);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const portfolioId = searchParams.get('portfolio_id');
    if (!portfolioId) {
      return NextResponse.json({ error: 'portfolio_id is required' }, { status: 400 });
    }

    const year = toGregorianYear(searchParams.get('year'));
    const typesInput = (searchParams.get('types') || 'XD')
      .split(',')
      .map((t) => t.trim().toUpperCase())
      .filter((t): t is EventCode => SUPPORTED_EVENT_TYPES.includes(t as EventCode));
    const selectedTypes = typesInput.length > 0 ? typesInput : ['XD'];

    const { data: transactions, error: txError } = await supabase
      .from('portfolio_transactions')
      .select('*')
      .eq('portfolio_id', portfolioId)
      .order('transaction_date', { ascending: true });

    if (txError) {
      throw new Error(txError.message);
    }

    const holdings = calculateCurrentHoldings(transactions || []);
    if (holdings.length === 0) {
      return NextResponse.json({
        year,
        selectedTypes,
        supportedTypes: SUPPORTED_EVENT_TYPES,
        rows: [],
        summary: {
          totalRows: 0,
          totalExpectedCash: 0,
          tickerCount: 0
        }
      });
    }

    const yahooFinance = new YahooFinance();
    if (typeof (yahooFinance as any).suppressNotices === 'function') {
      (yahooFinance as any).suppressNotices(['yahooSurvey', 'ripHistorical']);
    }

    const period1 = `${year}-01-01`;
    const period2 = `${year}-12-31`;

    const rawRows = await Promise.all(
      holdings.map(async (holding) => {
        const symbol = holding.ticker.endsWith('.BK') ? holding.ticker : `${holding.ticker}.BK`;
        try {
          const chart = await yahooFinance.chart(symbol, {
            period1,
            period2,
            interval: '1d',
            events: 'div'
          });
          const dividends = chart?.events?.dividends;
          if (!dividends) return [] as DividendEventRow[];

          const dividendList = Array.isArray(dividends) ? dividends : Object.values(dividends);
          return dividendList
            .map<DividendEventRow | null>((d: any, idx: number) => {
              const amountPerShare = Number(d?.amount) || 0;
              const exDate = toDateString(d?.date);
              if (!exDate || amountPerShare <= 0) return null;
              const expectedCash = amountPerShare * holding.actualVol;
              return {
                id: `${holding.ticker}-XD-${exDate}-${idx}`,
                ticker: holding.ticker,
                eventType: 'XD' as EventCode,
                exDate,
                amountPerShare,
                sharesHeld: holding.actualVol,
                expectedCash,
                avgCost: holding.avgCost,
                source: 'yfinance' as const
              };
            })
            .filter((row): row is DividendEventRow => row !== null);
        } catch (error) {
          console.error(`Failed to fetch dividend events for ${symbol}:`, error);
          return [] as DividendEventRow[];
        }
      })
    );

    const rows = rawRows
      .flat()
      .filter((row) => selectedTypes.includes(row.eventType))
      .sort((a, b) => b.exDate.localeCompare(a.exDate));

    const totalExpectedCash = rows.reduce((sum, row) => sum + row.expectedCash, 0);
    const tickerCount = new Set(rows.map((row) => row.ticker)).size;

    return NextResponse.json({
      year,
      selectedTypes,
      supportedTypes: SUPPORTED_EVENT_TYPES,
      rows,
      summary: {
        totalRows: rows.length,
        totalExpectedCash,
        tickerCount
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch dividend events', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
