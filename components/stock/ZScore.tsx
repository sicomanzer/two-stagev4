import React from 'react';
import { ZScoreResult } from '@/types/stock';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

interface ZScoreProps {
  zScore: ZScoreResult;
}

export default function ZScore({ zScore }: ZScoreProps) {
  let headerColor = 'from-slate-500 to-slate-600';
  let icon = <AlertTriangle size={24} />;
  let description = '';
  const safeThreshold = 3.0;
  const distressThreshold = 1.8;
  const gapToSafe = Math.max(0, safeThreshold - zScore.score);
  const gapToDistress = Math.max(0, zScore.score - distressThreshold);

  if (zScore.status === 'Safe') {
    headerColor = 'from-emerald-600 to-teal-600';
    icon = <CheckCircle2 size={24} className="text-emerald-100" />;
    description = 'ความเสี่ยงล้มละลายต่ำ (Safe Zone)';
  } else if (zScore.status === 'Grey') {
    headerColor = 'from-amber-500 to-orange-500';
    icon = <AlertTriangle size={24} className="text-amber-100" />;
    description = 'ความเสี่ยงปานกลาง (Grey Zone)';
  } else {
    headerColor = 'from-red-500 to-rose-600';
    icon = <XCircle size={24} className="text-red-100" />;
    description = 'ความเสี่ยงสูง (Distress Zone)';
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className={`bg-gradient-to-r ${headerColor} px-6 py-4 text-white flex justify-between items-center`}>
        <div>
          <h3 className="font-bold text-lg flex items-center gap-2">
            🛡️ Altman Z-Score
          </h3>
          <p className="text-xs opacity-80 mt-0.5">วัดความเสี่ยงล้มละลาย (Bankruptcy Risk) {zScore.year ? `(${zScore.year})` : ''}</p>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-3xl font-black">{zScore.score.toFixed(2)}</span>
          <span className="text-xs font-medium uppercase tracking-wider opacity-90">{zScore.status}</span>
        </div>
      </div>

      {/* Criteria List */}
      <div className="p-0 divide-y divide-slate-100 flex-grow">
        <div className="grid grid-cols-12 gap-2 bg-slate-50 px-4 py-2 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
          <div className="col-span-5">Component</div>
          <div className="col-span-3 text-right">Value</div>
          <div className="col-span-2 text-right">Weight</div>
          <div className="col-span-2 text-right">Score</div>
        </div>
        
        {zScore.components.map((item, idx) => (
          <div key={idx} className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-slate-50 transition-colors">
            <div className="col-span-5">
              <div className="text-xs font-medium text-slate-700">{item.name}</div>
              <div className="text-[10px] text-slate-400">{item.formula}</div>
            </div>
            <div className="col-span-3 text-right">
              <div className="text-xs font-mono text-slate-600">
                {typeof item.value === 'number' ? item.value.toFixed(4) : item.value}
              </div>
            </div>
            <div className="col-span-2 text-right">
               <div className="text-xs font-mono text-slate-400">x{item.weight}</div>
            </div>
            <div className="col-span-2 text-right font-bold text-slate-700">
              {item.score.toFixed(2)}
            </div>
          </div>
        ))}
      </div>
      
      <div className="bg-slate-50 border-t border-slate-100 px-4 py-3 space-y-2">
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-center">
            <p className="text-[9px] font-semibold uppercase text-slate-400">Safe Zone</p>
            <p className="text-xs font-bold text-emerald-700 mt-0.5">&gt; 3.0</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-center">
            <p className="text-[9px] font-semibold uppercase text-slate-400">Grey Zone</p>
            <p className="text-xs font-bold text-amber-700 mt-0.5">1.8 - 3.0</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-center">
            <p className="text-[9px] font-semibold uppercase text-slate-400">Distress</p>
            <p className="text-xs font-bold text-red-700 mt-0.5">&lt; 1.8</p>
          </div>
        </div>
        <div className="flex items-center justify-between text-[11px] font-medium">
          <span className="text-slate-500">{description}</span>
          <span className="text-slate-700">
            {zScore.status === 'Safe' && `เหนือ Safe Zone +${(zScore.score - safeThreshold).toFixed(2)}`}
            {zScore.status === 'Grey' && `ขาดถึง Safe Zone ${(gapToSafe).toFixed(2)}`}
            {zScore.status === 'Distress' && `สูงกว่า Distress ${(gapToDistress).toFixed(2)}`}
          </span>
        </div>
      </div>
    </div>
  );
}
