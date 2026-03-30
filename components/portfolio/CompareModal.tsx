import React from 'react';
import { X, TrendingUp, TrendingDown, Shield, BarChart3 } from 'lucide-react';
import { PortfolioItem } from '@/types/portfolio';
import StockLogo from '@/components/ui/StockLogo';

interface CompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: PortfolioItem[];
}

export default function CompareModal({ isOpen, onClose, items }: CompareModalProps) {
  if (!isOpen || items.length < 2) return null;

  const metrics: { key: string; label: string; getValue: (i: PortfolioItem) => number | null; format: (v: number | null) => string; higherIsBetter: boolean }[] = [
    { key: 'upside', label: 'Upside %', getValue: i => i.fair_price && i.current_price ? ((i.fair_price - i.current_price) / i.current_price) * 100 : null, format: v => v !== null ? `${v > 0 ? '+' : ''}${v.toFixed(1)}%` : '-', higherIsBetter: true },
    { key: 'pe', label: 'P/E', getValue: i => i.pe, format: v => v !== null ? v.toFixed(1) : '-', higherIsBetter: false },
    { key: 'pbv', label: 'P/BV', getValue: i => i.pbv, format: v => v !== null ? v.toFixed(2) : '-', higherIsBetter: false },
    { key: 'roe', label: 'ROE', getValue: i => i.roe ? i.roe * 100 : null, format: v => v !== null ? `${v.toFixed(1)}%` : '-', higherIsBetter: true },
    { key: 'de', label: 'D/E', getValue: i => i.de || i.debt_to_equity || null, format: v => v !== null ? v.toFixed(2) : '-', higherIsBetter: false },
    { key: 'yield', label: 'Div Yield', getValue: i => (i.dividend_yield || i.yield) ? (i.dividend_yield || i.yield)! * 100 : null, format: v => v !== null ? `${v.toFixed(2)}%` : '-', higherIsBetter: true },
    { key: 'eps', label: 'EPS', getValue: i => i.eps, format: v => v !== null ? v.toFixed(2) : '-', higherIsBetter: true },
    { key: 'mos30', label: 'MOS 30% Price', getValue: i => i.mos30_price, format: v => v !== null ? `฿${v.toFixed(2)}` : '-', higherIsBetter: false },
    { key: 'fair', label: 'Fair Value', getValue: i => i.fair_price, format: v => v !== null ? `฿${v.toFixed(2)}` : '-', higherIsBetter: true },
  ];

  const getBestIndex = (metric: typeof metrics[0]) => {
    const values = items.map(i => metric.getValue(i));
    const validValues = values.filter((v): v is number => v !== null);
    if (validValues.length === 0) return -1;
    const best = metric.higherIsBetter ? Math.max(...validValues) : Math.min(...validValues);
    return values.indexOf(best);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-violet-50 to-indigo-50">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 size={20} className="text-violet-600" />
            เปรียบเทียบหุ้น ({items.length} ตัว)
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold px-3 py-1 rounded bg-white border border-slate-200 hover:bg-slate-50">✕</button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-[140px]">Metric</th>
                  {items.map(item => (
                    <th key={item.id} className="text-center py-3 px-4">
                      <div className="flex flex-col items-center gap-2">
                        <StockLogo ticker={item.ticker} size="sm" />
                        <span className="font-black text-slate-900">{item.ticker}</span>
                        <span className="text-[10px] text-slate-400 tabular-nums">฿{item.current_price?.toFixed(2) || '-'}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {metrics.map(metric => {
                  const bestIdx = getBestIndex(metric);
                  return (
                    <tr key={metric.key} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-700 text-xs">{metric.label}</td>
                      {items.map((item, idx) => {
                        const val = metric.getValue(item);
                        const isBest = idx === bestIdx && val !== null;
                        return (
                          <td key={item.id} className="py-3 px-4 text-center">
                            <span className={`font-bold tabular-nums text-sm ${
                              isBest ? 'text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg' : 'text-slate-700'
                            }`}>
                              {metric.format(val)}
                              {isBest && <span className="ml-1 text-[9px]">✦</span>}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="mt-6 p-4 bg-gradient-to-r from-violet-50 to-indigo-50 rounded-xl border border-violet-100">
            <h4 className="font-bold text-violet-800 text-sm mb-2 flex items-center gap-2">
              <Shield size={14} /> สรุปการเปรียบเทียบ
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-violet-700">
              {metrics.slice(0, 6).map(metric => {
                const bestIdx = getBestIndex(metric);
                if (bestIdx === -1) return null;
                const icon = metric.higherIsBetter ? <TrendingUp size={12} className="text-emerald-500 inline" /> : <TrendingDown size={12} className="text-emerald-500 inline" />;
                return (
                  <div key={metric.key} className="flex items-center gap-1.5">
                    {icon}
                    <span><strong>{items[bestIdx].ticker}</strong> ดีที่สุดใน {metric.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
