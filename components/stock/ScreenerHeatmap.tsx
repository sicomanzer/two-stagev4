import React, { useMemo } from 'react';

interface HeatmapProps {
  results: any[];
  metric: string;
  onSelectTicker: (ticker: string) => void;
}

const METRIC_CONFIG: Record<string, { label: string; higherIsBetter: boolean; format: (v: number) => string }> = {
  viScore: { label: 'VI Quality', higherIsBetter: true, format: v => `${v}/18` },
  latestYield: { label: 'Div Yield', higherIsBetter: true, format: v => `${v.toFixed(1)}%` },
  latestPE: { label: 'P/E', higherIsBetter: false, format: v => v.toFixed(1) },
  latestPBV: { label: 'P/BV', higherIsBetter: false, format: v => v.toFixed(2) },
  latestROE: { label: 'ROE', higherIsBetter: true, format: v => `${v.toFixed(1)}%` },
  fScore: { label: 'F-Score', higherIsBetter: true, format: v => `${v}/9` },
  zScore: { label: 'Z-Score', higherIsBetter: true, format: v => v.toFixed(2) },
  compositeRank: { label: 'Rank', higherIsBetter: false, format: v => `#${v}` },
};

function getColor(normalizedValue: number, higherIsBetter: boolean): string {
  const v = higherIsBetter ? normalizedValue : 1 - normalizedValue;
  if (v >= 0.8) return 'bg-emerald-500 text-white border-emerald-600';
  if (v >= 0.6) return 'bg-emerald-300 text-emerald-900 border-emerald-400';
  if (v >= 0.4) return 'bg-amber-200 text-amber-900 border-amber-300';
  if (v >= 0.2) return 'bg-orange-300 text-orange-900 border-orange-400';
  return 'bg-red-400 text-white border-red-500';
}

export default function ScreenerHeatmap({ results, metric, onSelectTicker }: HeatmapProps) {
  const config = METRIC_CONFIG[metric] || METRIC_CONFIG.viScore;

  const { cells, minVal, maxVal } = useMemo(() => {
    const values = results.map(r => r[metric] ?? 0).filter(v => v > 0 && isFinite(v));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    
    return {
      cells: results.map(r => {
        const val = r[metric] ?? 0;
        const normalized = (val - min) / range;
        return { ...r, normalizedValue: normalized, displayValue: val };
      }).sort((a, b) => config.higherIsBetter ? b.displayValue - a.displayValue : a.displayValue - b.displayValue),
      minVal: min,
      maxVal: max
    };
  }, [results, metric, config.higherIsBetter]);

  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex flex-wrap gap-2">
        {cells.map((cell, i) => {
          const colorClass = getColor(cell.normalizedValue, config.higherIsBetter);
          const isTop3 = i < 3;
          return (
            <button
              key={cell.ticker}
              onClick={() => onSelectTicker(cell.ticker)}
              className={`relative ${colorClass} border rounded-xl p-3 min-w-[100px] flex-1 max-w-[160px] hover:scale-105 hover:shadow-lg transition-all group ${isTop3 ? 'ring-2 ring-yellow-400 ring-offset-1' : ''}`}
              title={`${cell.ticker}: ${config.label} = ${config.format(cell.displayValue)}`}
            >
              {isTop3 && (
                <span className="absolute -top-2 -right-2 text-sm">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
              )}
              <div className="text-xs font-black tracking-wide">{cell.ticker}</div>
              <div className="text-lg font-black mt-0.5">{config.format(cell.displayValue)}</div>
              <div className="text-[9px] font-bold opacity-70 mt-0.5">฿{cell.currentPrice?.toFixed(2) || '-'}</div>
            </button>
          );
        })}
      </div>
      {/* Legend */}
      <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-500 font-bold">
        <span>🟢 {config.higherIsBetter ? 'สูง = ดี' : 'ต่ำ = ดี'}</span>
        <span>→</span>
        <span>🔴 {config.higherIsBetter ? 'ต่ำ' : 'สูง'}</span>
        <span className="ml-auto">Range: {config.format(minVal)} — {config.format(maxVal)}</span>
      </div>
    </div>
  );
}

export { METRIC_CONFIG };
