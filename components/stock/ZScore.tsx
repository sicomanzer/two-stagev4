import React from 'react';
import { ZScoreResult } from '@/types/stock';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

interface ZScoreProps {
  zScore: ZScoreResult;
}

export default function ZScore({ zScore }: ZScoreProps) {
  let statusColor = 'from-slate-400 to-slate-500 text-slate-700 bg-slate-50 border-slate-200';
  let badgeColor = 'bg-slate-100 text-slate-600';
  let icon = <AlertTriangle size={20} className="text-slate-400" />;
  let description = '';
  const safeThreshold = 3.0;
  const distressThreshold = 1.8;
  const gapToSafe = Math.max(0, safeThreshold - zScore.score);
  const gapToDistress = Math.max(0, zScore.score - distressThreshold);

  if (zScore.status === 'Safe') {
    statusColor = 'from-emerald-400 to-emerald-600 text-emerald-900 bg-emerald-50/50 border-emerald-100';
    badgeColor = 'bg-emerald-100 text-emerald-700';
    icon = <CheckCircle2 size={20} className="text-emerald-500" />;
    description = 'ความเสี่ยงล้มละลายต่ำ (Safe Zone)';
  } else if (zScore.status === 'Grey') {
    statusColor = 'from-amber-400 to-orange-500 text-amber-900 bg-amber-50/50 border-amber-100';
    badgeColor = 'bg-amber-100 text-amber-700';
    icon = <AlertTriangle size={20} className="text-amber-500" />;
    description = 'ความเสี่ยงปานกลาง (Grey Zone)';
  } else {
    statusColor = 'from-red-400 to-rose-600 text-red-900 bg-red-50/50 border-red-100';
    badgeColor = 'bg-red-100 text-red-700';
    icon = <XCircle size={20} className="text-red-500" />;
    description = 'ความเสี่ยงสูง (Distress Zone)';
  }

  return (
    <div className={`rounded-3xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] border ${statusColor} overflow-hidden flex flex-col h-full backdrop-blur-xl relative`}>
      
      {/* Background Decor */}
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${statusColor.split(' ')[0]} ${statusColor.split(' ')[1]} opacity-10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3 z-0`}></div>

      {/* Header */}
      <div className="p-6 relative z-10 border-b border-white/20">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 bg-white/50 rounded-lg shadow-sm border border-white/40 backdrop-blur-md">
                {icon}
              </span>
              <h3 className="font-black text-lg tracking-tight">Altman Z-Score</h3>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Bankruptcy Risk {zScore.year ? `(${zScore.year})` : ''}</p>
          </div>
          <div className="text-right flex flex-col items-end">
            <span className="text-4xl font-black tracking-tighter mix-blend-multiply opacity-80">{zScore.score.toFixed(2)}</span>
            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full mt-1 ${badgeColor} shadow-sm border border-white/50 backdrop-blur-md`}>
              {zScore.status}
            </span>
          </div>
        </div>
      </div>

      {/* Criteria List */}
      <div className="p-2 flex-grow relative z-10 bg-white/40 backdrop-blur-sm">
        <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[9px] uppercase font-black text-slate-400 tracking-widest">
          <div className="col-span-4">Component</div>
          <div className="col-span-4 text-right">Value</div>
          <div className="col-span-2 text-right">Weight</div>
          <div className="col-span-2 text-right">Score</div>
        </div>
        
        <div className="space-y-1">
          {zScore.components.map((item, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 px-4 py-2.5 items-center bg-white/60 hover:bg-white/90 rounded-xl transition-all border border-white/40 shadow-[0_1px_3px_0_rgba(0,0,0,0.02)]">
              <div className="col-span-5 pr-2">
                <div className="text-xs font-bold text-slate-700 leading-tight mb-0.5">{item.name}</div>
                <div className="text-[9px] font-medium text-slate-400 truncate w-full">{item.formula}</div>
              </div>
              <div className="col-span-3 text-right">
                <div className="text-[11px] font-black text-slate-600">
                {typeof item.value === 'number' ? item.value.toFixed(4) : item.value}
              </div>
            </div>
            <div className="col-span-2 text-right">
                <div className="text-[11px] font-black text-slate-400">x{item.weight}</div>
              </div>
              <div className="col-span-2 text-right font-black text-slate-700 border-l border-slate-100 pl-2">
                {item.score.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="bg-white/40 backdrop-blur-md px-4 py-3 border-t border-white/20 relative z-10 space-y-3 shadow-inner">
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-white/60 bg-white/50 px-2 py-2 text-center shadow-[0_1px_2px_0_rgba(0,0,0,0.02)]">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Safe</p>
            <p className="text-[11px] font-black text-emerald-600 mt-1">&gt; 3.0</p>
          </div>
          <div className="rounded-xl border border-white/60 bg-white/50 px-2 py-2 text-center shadow-[0_1px_2px_0_rgba(0,0,0,0.02)]">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Grey</p>
            <p className="text-[11px] font-black text-amber-600 mt-1">1.8 - 3.0</p>
          </div>
          <div className="rounded-xl border border-white/60 bg-white/50 px-2 py-2 text-center shadow-[0_1px_2px_0_rgba(0,0,0,0.02)]">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Distress</p>
            <p className="text-[11px] font-black text-red-600 mt-1">&lt; 1.8</p>
          </div>
        </div>
        <div className="flex items-center justify-between text-[10px] font-bold pb-1 pt-1 border-t border-white/50">
          <span className="text-slate-500 uppercase tracking-widest">{description}</span>
          <span className="text-slate-700 tracking-wider">
            {zScore.status === 'Safe' && `Above Safe Zone +${(zScore.score - safeThreshold).toFixed(2)}`}
            {zScore.status === 'Grey' && `Gap to Safe ${(gapToSafe).toFixed(2)}`}
            {zScore.status === 'Distress' && `Above Distress ${(gapToDistress).toFixed(2)}`}
          </span>
        </div>
      </div>
    </div>
  );
}
