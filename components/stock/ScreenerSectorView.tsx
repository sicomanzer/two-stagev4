import React, { useMemo } from 'react';
import { PieChart } from 'lucide-react';

interface SectorViewProps {
  results: any[];
}

export default function ScreenerSectorView({ results }: SectorViewProps) {
  const sectorData = useMemo(() => {
    const sectors: Record<string, { tickers: string[]; avgPE: number; avgYield: number; avgVI: number; count: number }> = {};
    
    results.forEach(r => {
      const sector = r.sector || 'ไม่ระบุ';
      if (!sectors[sector]) sectors[sector] = { tickers: [], avgPE: 0, avgYield: 0, avgVI: 0, count: 0 };
      sectors[sector].tickers.push(r.ticker);
      sectors[sector].avgPE += r.latestPE || 0;
      sectors[sector].avgYield += r.latestYield || 0;
      sectors[sector].avgVI += r.viScore || 0;
      sectors[sector].count++;
    });

    return Object.entries(sectors).map(([name, data]) => ({
      name,
      count: data.count,
      tickers: data.tickers,
      avgPE: data.avgPE / data.count,
      avgYield: data.avgYield / data.count,
      avgVI: data.avgVI / data.count,
      percent: (data.count / results.length) * 100
    })).sort((a, b) => b.count - a.count);
  }, [results]);

  const colors = ['bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500', 'bg-purple-500', 'bg-lime-500', 'bg-orange-500'];

  if (sectorData.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm mb-6 animate-in fade-in duration-300">
      <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
        <PieChart size={16} className="text-indigo-500" /> Sector Breakdown
      </h4>
      <p className="text-[11px] font-bold text-slate-400 mb-4">แสดงจาก sector จริงของข้อมูล fundamentals เท่านั้น</p>
      
      {/* Sector Bar */}
      <div className="flex rounded-xl overflow-hidden h-8 mb-4 shadow-inner border border-slate-100">
        {sectorData.map((s, i) => (
          <div
            key={s.name}
            className={`${colors[i % colors.length]} flex items-center justify-center text-[9px] font-black text-white transition-all hover:brightness-110`}
            style={{ width: `${s.percent}%` }}
            title={`${s.name}: ${s.count} ตัว (${s.percent.toFixed(0)}%)`}
          >
            {s.percent >= 10 && s.name.substring(0, 6)}
          </div>
        ))}
      </div>

      {/* Sector Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {sectorData.map((s, i) => (
          <div key={s.name} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-100">
            <div className={`w-3 h-3 rounded-full ${colors[i % colors.length]} flex-shrink-0`} />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-slate-800 truncate">{s.name}</div>
              <div className="flex gap-2 text-[9px] text-slate-400 font-bold">
                <span>{s.count} ตัว</span>
                <span>PE={s.avgPE.toFixed(1)}</span>
                <span>VI={s.avgVI.toFixed(1)}</span>
                <span>Yield={s.avgYield.toFixed(1)}%</span>
              </div>
            </div>
            <div className="text-xs font-black text-slate-600">{s.percent.toFixed(0)}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}
