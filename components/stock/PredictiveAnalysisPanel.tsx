import React, { useEffect, useRef, useMemo } from 'react';
import { StockHistory } from '@/types/stock';
import { usePredictiveAnalytics } from '@/hooks/usePredictiveAnalytics';
import { Activity, AlertCircle, TrendingUp } from 'lucide-react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Scatter
} from 'recharts';

interface Props {
  ticker: string;
  stockHistory: StockHistory[];
}

export default function PredictiveAnalysisPanel({ ticker, stockHistory }: Props) {
  const { predictions, isLoading, error, fetchPredictions } = usePredictiveAnalytics();
  const hasFetched = useRef(false);

  // Generate chart data combining history and predictions
  const chartData = useMemo(() => {
    if (!predictions || stockHistory.length === 0) return [];
    
    // Take last 4 years of history
    const recentHistory = stockHistory.slice(-4);
    
    const data = recentHistory.map(h => ({
      year: h.year.toString(),
      actualEps: h.eps,
      actualNetProfit: h.netProfit ? h.netProfit / 1000000 : null,
      actualRevenue: h.revenue ? h.revenue / 1000000 : null,
      isPrediction: false
    }));

    // Add prediction for next year
    const lastYear = recentHistory[recentHistory.length - 1].year;
    data.push({
      year: `${lastYear + 1} (F)`,
      actualEps: null as any,
      actualNetProfit: null as any,
      actualRevenue: null as any,
      predictedEps: predictions.eps,
      predictedNetProfit: predictions.net_profit ? predictions.net_profit / 1000000 : null,
      predictedRevenue: predictions.revenue ? predictions.revenue / 1000000 : null,
      isPrediction: true
    });

    return data;
  }, [stockHistory, predictions]);

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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <MetricCard 
          title="Est. Fair Value" 
          value={predictions.fair_value_estimation} 
          prefix="฿" 
          highlight 
          tooltip="Calculated from Predicted EPS × Predicted P/E"
        />
        <MetricCard title="Predicted EPS" value={predictions.eps} prefix="฿" />
        <MetricCard title="Predicted P/E" value={predictions.pe_ratio} suffix="x" />
        <MetricCard title="Predicted DPS" value={predictions.dps} prefix="฿" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* EPS Chart */}
        <div className="h-[300px] w-full">
          <h3 className="text-sm font-bold text-slate-700 mb-4 text-center">EPS Forecast Trend</h3>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
              <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dx={-10} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value: any) => [
                  `฿${typeof value === 'number' ? value.toFixed(2) : Number(value || 0).toFixed(2)}`, 
                  ''
                ]}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              
              {/* Actual EPS Points (Solid Circles) */}
              <Scatter yAxisId="left" name="Actual EPS" dataKey="actualEps" fill="#10b981" shape="circle" r={6} />
              
              {/* Predicted EPS Points (Hollow Circles) */}
              <Scatter yAxisId="left" name="Predicted EPS" dataKey="predictedEps" fill="#fff" stroke="#6366f1" strokeWidth={2} shape="circle" r={6} />
              
              {/* Trend line connecting actuals */}
              <Line yAxisId="left" type="monotone" dataKey="actualEps" stroke="#10b981" strokeWidth={2} dot={false} activeDot={false} />
              
              {/* Dashed line connecting to prediction */}
              <Line yAxisId="left" type="monotone" dataKey="predictedEps" stroke="#6366f1" strokeWidth={2} strokeDasharray="5 5" dot={false} activeDot={false} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue & Net Profit Chart */}
        <div className="h-[300px] w-full">
          <h3 className="text-sm font-bold text-slate-700 mb-4 text-center">Revenue & Net Profit (M) Forecast</h3>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
              <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dx={-10} tickFormatter={(val) => `${(val/1000).toFixed(0)}k`} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value: any) => [
                  `฿${typeof value === 'number' ? value.toLocaleString(undefined, {maximumFractionDigits: 0}) : Number(value || 0).toLocaleString(undefined, {maximumFractionDigits: 0})}M`, 
                  ''
                ]}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              
              <Bar yAxisId="left" name="Actual Revenue" dataKey="actualRevenue" fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={20} />
              <Bar yAxisId="left" name="Predicted Rev" dataKey="predictedRevenue" fill="#cbd5e1" radius={[4, 4, 0, 0]} barSize={20} />
              
              <Scatter yAxisId="left" name="Actual Net Profit" dataKey="actualNetProfit" fill="#ef4444" shape="circle" r={6} />
              <Scatter yAxisId="left" name="Predicted NP" dataKey="predictedNetProfit" fill="#fff" stroke="#f43f5e" strokeWidth={2} shape="circle" r={6} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
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