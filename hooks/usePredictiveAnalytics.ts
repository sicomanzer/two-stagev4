import { useState, useCallback } from 'react';
import { StockHistory } from '@/types/stock';

export interface Predictions {
  net_profit?: number;
  revenue?: number;
  eps?: number;
  npm?: number;
  dps?: number;
  de_ratio?: number;
  pe_ratio?: number;
  pbv_ratio?: number;
  fair_value_estimation?: number;
}

export function usePredictiveAnalytics() {
  const [predictions, setPredictions] = useState<Predictions | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPredictions = useCallback(async (ticker: string, history: StockHistory[]) => {
    if (!history || history.length === 0) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Map Next.js StockHistory format to Python API expected format
      const payload = history.map(h => ({
        ticker,
        year: h.year,
        revenue: h.revenue || 0,
        net_profit: h.netProfit || 0,
        eps: h.eps || 0,
        dps: h.dps || 0,
        de_ratio: h.de || 0,
        pe_ratio: h.pe || 0,
        pbv_ratio: h.pbv || 0,
        npm: h.npm || 0
      }));

      const response = await fetch('http://127.0.0.1:5002/api/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ history: payload }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch predictions from ML model');
      }

      const data = await response.json();
      if (data.status === 'success') {
        setPredictions(data.predictions);
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { predictions, isLoading, error, fetchPredictions };
}
