import React from 'react';
import { Activity, TrendingUp, TrendingDown, Shield, Zap, Star, BookOpen, Plus } from 'lucide-react';
import StockLogo from '@/components/ui/StockLogo';

interface StockCardProps {
  stock: any;
  rank: number;
  onSelectTicker: (ticker: string) => void;
  onSave?: (ticker: string) => void;
  onJournal?: (ticker: string) => void;
}

export default function ScreenerStockCard({ stock, rank, onSelectTicker, onSave, onJournal }: StockCardProps) {
  const r = stock;
  const viScoreMax = r.viScoreMax ?? 18;
  const viRating = r.viScore >= 15 ? { label: 'Strong Buy', color: 'bg-emerald-500 text-white', icon: '🟢' }
    : r.viScore >= 12 ? { label: 'Buy', color: 'bg-emerald-100 text-emerald-700', icon: '🟡' }
    : r.viScore >= 9 ? { label: 'Watch', color: 'bg-amber-100 text-amber-700', icon: '🟠' }
    : { label: 'Avoid', color: 'bg-red-100 text-red-700', icon: '🔴' };

  const risks: string[] = [];
  if (r.latestDE > 2) risks.push('D/E สูง');
  if (typeof r.epsCAGR === 'number' && r.epsCAGR < 0) risks.push('EPS ลดลง');
  if (typeof r.fScore === 'number' && r.fScore <= 3) risks.push('F-Score ต่ำ');
  if (typeof r.zScore === 'number' && r.zScore < 1.8) risks.push('Z-Score เสี่ยง');
  if (r.latestPE > 25) risks.push('PE แพง');

  const strengths: string[] = [];
  if (r.latestROE >= 15) strengths.push(`ROE ${r.latestROE.toFixed(1)}% สูง`);
  if (typeof r.latestYield === 'number' && r.latestYield >= 5) strengths.push(`Yield ${r.latestYield.toFixed(1)}% ดี`);
  if (typeof r.fScore === 'number' && r.fScore >= 7) strengths.push(`F-Score ${r.fScore}/9 แข็งแกร่ง`);
  if (r.latestDE < 0.5) strengths.push('หนี้ต่ำมาก');
  if (typeof r.epsCAGR === 'number' && r.epsCAGR > 10) strengths.push(`EPS โต ${r.epsCAGR.toFixed(0)}%`);
  if (r.dividendStreakYears >= 5) strengths.push(`ปันผล ${r.dividendStreakYears}ปี ต่อเนื่อง`);

  const rankBadge = rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : `#${rank + 1}`;

  return (
    <div className="p-4 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        {/* Stock Identity + Rating */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <StockLogo ticker={r.ticker} size="lg" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-slate-900">{r.ticker}</span>
                <span className="text-sm">{rankBadge}</span>
              </div>
              <div className="text-xs text-slate-400 font-bold">฿{r.currentPrice?.toFixed(2)} • {r.sector || 'ไม่ระบุ sector'}</div>
            </div>
          </div>
          {/* VI Rating Badge */}
          <div className={`${viRating.color} px-3 py-2 rounded-xl text-center mb-3`}>
            <span className="text-sm font-black">{viRating.icon} {viRating.label}</span>
            <span className="text-xs font-bold ml-2">VI Quality {r.viScore}/{viScoreMax}</span>
          </div>
          {/* Quick Actions */}
          <div className="flex gap-2">
            <button onClick={() => onSelectTicker(r.ticker)} className="flex-1 px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors flex items-center justify-center gap-1">
              <Zap size={12} /> DDM วิเคราะห์
            </button>
            {onSave && (
              <button onClick={() => onSave(r.ticker)} className="px-3 py-2 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors flex items-center justify-center gap-1">
                <Plus size={12} /> Save
              </button>
            )}
            {onJournal && (
              <button onClick={() => onJournal(r.ticker)} className="px-3 py-2 bg-amber-50 text-amber-600 rounded-lg text-xs font-bold hover:bg-amber-100 transition-colors">
                <BookOpen size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1"><Activity size={12} /> Key Metrics</h5>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'P/E', value: r.latestPE?.toFixed(1), good: r.latestPE < 15 },
              { label: 'P/BV', value: r.latestPBV?.toFixed(2), good: r.latestPBV < 1.5 },
              { label: 'ROE', value: `${r.latestROE?.toFixed(1)}%`, good: r.latestROE >= 15 },
              { label: 'D/E', value: r.latestDE?.toFixed(2), good: r.latestDE < 1 },
              { label: 'Yield', value: typeof r.latestYield === 'number' ? `${r.latestYield.toFixed(1)}%` : '-', good: typeof r.latestYield === 'number' && r.latestYield >= 4 },
              { label: 'EPS Growth', value: typeof r.epsCAGR === 'number' ? `${r.epsCAGR.toFixed(1)}%` : '-', good: typeof r.epsCAGR === 'number' && r.epsCAGR > 5 },
            ].map(m => (
              <div key={m.label} className="text-center">
                <div className="text-[9px] text-slate-400 font-bold uppercase">{m.label}</div>
                <div className={`text-sm font-black ${m.good ? 'text-emerald-600' : 'text-slate-700'}`}>{m.value || '-'}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Strengths */}
        <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-100">
          <h5 className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-2 flex items-center gap-1"><TrendingUp size={12} /> จุดแข็ง ({strengths.length})</h5>
          <div className="space-y-1.5">
            {strengths.length > 0 ? strengths.map((s, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                <Star size={10} className="text-emerald-400 flex-shrink-0" /> {s}
              </div>
            )) : <p className="text-xs text-slate-400">ไม่มีจุดแข็งเด่น</p>}
          </div>
        </div>

        {/* Risks */}
        <div className="bg-red-50/50 rounded-xl p-4 border border-red-100">
          <h5 className="text-[10px] font-bold text-red-600 uppercase tracking-wider mb-2 flex items-center gap-1"><TrendingDown size={12} /> ความเสี่ยง ({risks.length})</h5>
          <div className="space-y-1.5">
            {risks.length > 0 ? risks.map((r, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs font-bold text-red-600">
                <Shield size={10} className="text-red-400 flex-shrink-0" /> {r}
              </div>
            )) : <p className="text-xs text-emerald-500 font-bold">✅ ไม่พบความเสี่ยงสำคัญ</p>}
          </div>
          {/* Quality Scores */}
          <div className="mt-3 pt-3 border-t border-red-100 grid grid-cols-3 gap-2 text-center">
            <div><div className="text-[9px] text-slate-400 font-bold">F-Score</div><div className={`text-sm font-black ${typeof r.fScore === 'number' ? (r.fScore >= 7 ? 'text-emerald-600' : r.fScore >= 5 ? 'text-amber-600' : 'text-red-500') : 'text-slate-400'}`}>{typeof r.fScore === 'number' ? `${r.fScore}/9` : '-'}</div></div>
            <div><div className="text-[9px] text-slate-400 font-bold">Z-Score</div><div className={`text-sm font-black ${typeof r.zScore === 'number' ? (r.zScore >= 2.99 ? 'text-emerald-600' : r.zScore >= 1.8 ? 'text-amber-600' : 'text-red-500') : 'text-slate-400'}`}>{typeof r.zScore === 'number' ? r.zScore.toFixed(2) : '-'}</div></div>
            <div><div className="text-[9px] text-slate-400 font-bold">Cycle</div><div className="text-sm font-black text-slate-600">{r.marketCycleLabel || '-'}</div></div>
          </div>
        </div>
      </div>
    </div>
  );
}
