import React from 'react';
import { TrendingUp, Shield, Award, BarChart3, Zap, Target } from 'lucide-react';

interface QuickStatsProps {
  results: any[];
  total: number;
  matched: number;
}

export default function ScreenerQuickStats({ results, total, matched }: QuickStatsProps) {
  if (results.length === 0) return null;

  const avgViScore = results.reduce((a, r) => a + (r.viScore || 0), 0) / results.length;
  const avgYield = results.reduce((a, r) => a + (r.latestYield || 0), 0) / results.length;
  const avgPE = results.filter(r => r.latestPE > 0).reduce((a, r, _, arr) => a + r.latestPE / arr.length, 0);
  const topROE = results.reduce((best, r) => (r.latestROE || 0) > (best.latestROE || 0) ? r : best, results[0]);
  const safest = results.reduce((best, r) => (r.zScore || 0) > (best.zScore || 0) ? r : best, results[0]);
  const bestValue = results.reduce((best, r) => (r.viScore || 0) > (best.viScore || 0) ? r : best, results[0]);

  // VI Score distribution
  const dist = { excellent: 0, good: 0, fair: 0, low: 0 };
  results.forEach(r => {
    if (r.viScore >= 16) dist.excellent++;
    else if (r.viScore >= 13) dist.good++;
    else if (r.viScore >= 10) dist.fair++;
    else dist.low++;
  });

  const stats = [
    { icon: <Award size={18} />, label: 'ผ่านเกณฑ์', value: `${matched}/${total}`, sub: `${((matched/total)*100).toFixed(1)}%`, color: 'from-indigo-500 to-purple-600', bg: 'bg-indigo-50' },
    { icon: <BarChart3 size={18} />, label: 'VI Score เฉลี่ย', value: avgViScore.toFixed(1), sub: '/20', color: 'from-violet-500 to-indigo-600', bg: 'bg-violet-50' },
    { icon: <TrendingUp size={18} />, label: 'Yield เฉลี่ย', value: `${avgYield.toFixed(2)}%`, sub: `PE avg ${avgPE.toFixed(1)}`, color: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-50' },
    { icon: <Zap size={18} />, label: 'Top ROE', value: topROE.ticker, sub: `${topROE.latestROE?.toFixed(1)}%`, color: 'from-amber-500 to-orange-600', bg: 'bg-amber-50' },
    { icon: <Shield size={18} />, label: 'Safest (Z)', value: safest.ticker, sub: `Z=${safest.zScore?.toFixed(2)}`, color: 'from-cyan-500 to-blue-600', bg: 'bg-cyan-50' },
    { icon: <Target size={18} />, label: 'Best VI', value: bestValue.ticker, sub: `${bestValue.viScore}/20`, color: 'from-rose-500 to-pink-600', bg: 'bg-rose-50' },
  ];

  return (
    <div className="space-y-4 mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map((s, i) => (
          <div key={i} className={`${s.bg} rounded-2xl p-3.5 border border-white/60 shadow-sm hover:shadow-md transition-all group`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`bg-gradient-to-br ${s.color} p-1.5 rounded-lg text-white shadow-sm`}>{s.icon}</div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{s.label}</span>
            </div>
            <div className="text-lg font-black text-slate-900 tracking-tight">{s.value}<span className="text-xs font-bold text-slate-400 ml-1">{s.sub}</span></div>
          </div>
        ))}
      </div>

      {/* VI Score Distribution Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">VI Score Distribution</h4>
        <div className="flex rounded-xl overflow-hidden h-6 shadow-inner border border-slate-100">
          {dist.excellent > 0 && (
            <div className="bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-[9px] font-black text-white transition-all" style={{ width: `${(dist.excellent/results.length)*100}%` }} title={`Excellent (16+): ${dist.excellent}`}>
              {dist.excellent > 0 && `⭐${dist.excellent}`}
            </div>
          )}
          {dist.good > 0 && (
            <div className="bg-gradient-to-r from-emerald-400 to-emerald-500 flex items-center justify-center text-[9px] font-black text-white" style={{ width: `${(dist.good/results.length)*100}%` }} title={`Good (13-15): ${dist.good}`}>
              {`✓${dist.good}`}
            </div>
          )}
          {dist.fair > 0 && (
            <div className="bg-gradient-to-r from-amber-400 to-amber-500 flex items-center justify-center text-[9px] font-black text-white" style={{ width: `${(dist.fair/results.length)*100}%` }} title={`Fair (10-12): ${dist.fair}`}>
              {`~${dist.fair}`}
            </div>
          )}
          {dist.low > 0 && (
            <div className="bg-gradient-to-r from-slate-300 to-slate-400 flex items-center justify-center text-[9px] font-black text-white" style={{ width: `${(dist.low/results.length)*100}%` }} title={`Low (<10): ${dist.low}`}>
              {`${dist.low}`}
            </div>
          )}
        </div>
        <div className="flex gap-4 mt-2 text-[10px] font-bold text-slate-400">
          <span>⭐ Excellent (16+)</span><span>✓ Good (13-15)</span><span>~ Fair (10-12)</span><span>○ Low (&lt;10)</span>
        </div>
      </div>
    </div>
  );
}
