import React, { useEffect, useRef } from 'react';
import { StockHistory } from '@/types/stock';
import { usePredictiveAnalytics } from '@/hooks/usePredictiveAnalytics';
import { Activity, AlertCircle, TrendingUp } from 'lucide-react';

interface Props {
  ticker: string;
  stockHistory: StockHistory[];
}

export default function PredictiveAnalysisPanel({ ticker, stockHistory }: Props) {
  const { predictions, isLoading, error, fetchPredictions } = usePredictiveAnalytics();
  const hasFetched = useRef(false);

  useEffect(() => {
    if (stockHistory.length > 0 && !hasFetched.current) {
      hasFetched.current = true;
      fetchPredictions(ticker, stockHistory);
    }
  }, [ticker, stockHistory, fetchPredictions]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 animate-pulse flex items-center justify-center min-h-[200px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">Running AI Predictive Models...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-red-200">
        <div className="flex items-center gap-2 text-red-500 mb-2">
          <AlertCircle size={20} />
          <h3 className="font-bold">Prediction Error</h3>
        </div>
        <p className="text-slate-600 text-sm">{error}</p>
        <p className="text-slate-400 text-xs mt-2">Make sure the Python ML server is running on port 5002.</p>
      </div>
    );
  }

  if (!predictions) return null;

  return (
    <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
            <Activity size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Predictive History Forecast</h2>
            <p className="text-sm text-slate-500">Machine Learning projections for the next fiscal year based on historical patterns</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium border border-indigo-100">
          <TrendingUp size={16} />
          <span>AI Powered</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard 
          title="Est. Fair Value" 
          value={predictions.fair_value_estimation} 
          prefix="฿" 
          highlight 
          tooltip="Calculated from Predicted EPS × Predicted P/E"
        />
        <MetricCard title="Predicted EPS" value={predictions.eps} prefix="฿" />
        <MetricCard title="Predicted DPS" value={predictions.dps} prefix="฿" />
        <MetricCard title="Predicted P/E" value={predictions.pe_ratio} suffix="x" />
        
        <MetricCard title="Net Profit (M)" value={(predictions.net_profit || 0) / 1000000} prefix="฿" suffix="M" />
        <MetricCard title="Revenue (M)" value={(predictions.revenue || 0) / 1000000} prefix="฿" suffix="M" />
        <MetricCard title="NPM" value={predictions.npm} suffix="%" />
        <MetricCard title="D/E Ratio" value={predictions.de_ratio} suffix="x" />
      </div>
    </div>
  );
}

function MetricCard({ 
  title, 
  value, 
  prefix = '', 
  suffix = '', 
  highlight = false,
  tooltip
}: { 
  title: string, 
  value?: number, 
  prefix?: string, 
  suffix?: string, 
  highlight?: boolean,
  tooltip?: string
}) {
  const displayValue = value !== undefined && value !== null 
    ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) 
    : 'N/A';
    
  return (
    <div 
      className={`p-4 rounded-2xl border transition-colors ${highlight ? 'bg-indigo-50 border-indigo-100 hover:bg-indigo-100/50' : 'bg-slate-50 border-slate-100 hover:bg-slate-100/50'}`}
      title={tooltip}
    >
      <p className={`text-xs font-medium mb-1 ${highlight ? 'text-indigo-600' : 'text-slate-500'}`}>
        {title}
      </p>
      <p className={`text-lg font-bold ${highlight ? 'text-indigo-900' : 'text-slate-800'}`}>
        {prefix}{displayValue}{suffix}
      </p>
    </div>
  );
}