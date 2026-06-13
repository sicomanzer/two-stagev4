
import { useState, useCallback } from 'react';

export interface PortfolioHolding {
  ticker: string;
  actualVol: number;
  avgCost: number;
  totalCost: number;
  realizedPL: number;
  realizedPLAverageCost: number;
  realizedPLFifo: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPL: number;
  percentUnrealizedPL: number;
  sector?: string;
  exDividendDate?: string;
  d0?: number;
  dividendYield?: number;
}

export interface PortfolioSummary {
  totalCost: number;
  marketValue: number;
  unrealizedPL: number;
  realizedPL: number;
  realizedPLAverageCost: number;
  realizedPLFifo: number;
  totalPL: number;
  totalPLAverageCost: number;
  totalPLFifo: number;
}

export function useRealPortfolio(currentPortfolioId: string | null) {
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary>({
    totalCost: 0,
    marketValue: 0,
    unrealizedPL: 0,
    realizedPL: 0,
    realizedPLAverageCost: 0,
    realizedPLFifo: 0,
    totalPL: 0,
    totalPLAverageCost: 0,
    totalPLFifo: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHoldings = useCallback(async () => {
    if (!currentPortfolioId) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/transactions?portfolio_id=${currentPortfolioId}`);
      if (!res.ok) throw new Error('Failed to fetch holdings');
      const data = await res.json();
      
      // Batch fetch prices
      const tickers = [...new Set(data.map((h: any) => h.ticker))].join(',');
      let priceMap: Record<string, any> = {};

      if (tickers) {
          try {
            const priceRes = await fetch(`/api/stock?tickers=${tickers}`);
            if (priceRes.ok) {
                const prices = await priceRes.json();
                if (Array.isArray(prices)) {
                    prices.forEach((p: any) => {
                        if (p.ticker) priceMap[p.ticker] = p;
                    });
                }
            }
          } catch (e) {
              console.error('Failed to batch fetch prices:', e);
          }
      }

      const enrichedData: PortfolioHolding[] = data.map((h: any) => {
        const priceData = priceMap[h.ticker] || {};
        const currentPrice = priceData.currentPrice || h.avgCost; // Fallback

        const marketValue = h.actualVol * currentPrice;
        const unrealizedPL = marketValue - h.totalCost;
        const percentUnrealizedPL = h.totalCost > 0 ? (unrealizedPL / h.totalCost) * 100 : 0;
        
        return {
            ...h,
            currentPrice,
            marketValue,
            unrealizedPL,
            percentUnrealizedPL,
            sector: priceData.sector,
            exDividendDate: priceData.exDividendDate,
            d0: priceData.d0,
            dividendYield: priceData.dividendYield
        };
      });

      setHoldings(enrichedData);

      // Calculate Summary
      const totalCost = enrichedData.reduce((acc, h) => acc + h.totalCost, 0);
      const marketValue = enrichedData.reduce((acc, h) => acc + h.marketValue, 0);
      const unrealizedPL = enrichedData.reduce((acc, h) => acc + h.unrealizedPL, 0);
      const realizedPLAverageCost = enrichedData.reduce(
        (acc, h) => acc + (h.realizedPLAverageCost ?? h.realizedPL ?? 0),
        0
      );
      const realizedPLFifo = enrichedData.reduce(
        (acc, h) => acc + (h.realizedPLFifo ?? h.realizedPL ?? 0),
        0
      );

      setSummary({
        totalCost,
        marketValue,
        unrealizedPL,
        realizedPL: realizedPLAverageCost,
        realizedPLAverageCost,
        realizedPLFifo,
        totalPL: unrealizedPL + realizedPLAverageCost,
        totalPLAverageCost: unrealizedPL + realizedPLAverageCost,
        totalPLFifo: unrealizedPL + realizedPLFifo
      });

    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [currentPortfolioId]);

  return {
    holdings,
    summary,
    isLoading,
    error,
    fetchHoldings
  };
}
