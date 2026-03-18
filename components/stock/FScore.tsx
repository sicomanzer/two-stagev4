import React from 'react';
import { FScoreResult } from '@/types/stock';
import { CheckCircle2, XCircle, MinusCircle } from 'lucide-react';

interface FScoreProps {
  fScore: FScoreResult;
}

export default function FScore({ fScore }: FScoreProps) {
  // Color coding based on score (0-9)
  // 7-9: Strong (Green)
  // 4-6: Stable (Yellow/Amber)
  // 0-3: Weak (Red)
  
  let colorClass = 'bg-slate-100 text-slate-800';
  let headerColor = 'from-slate-500 to-slate-600';
  let icon = <MinusCircle size={24} />;
  
  if (fScore.score >= 7) {
    colorClass = 'bg-emerald-50 text-emerald-800 border-emerald-200';
    headerColor = 'from-emerald-600 to-teal-600';
    icon = <CheckCircle2 size={24} className="text-emerald-100" />;
  } else if (fScore.score >= 4) {
    colorClass = 'bg-amber-50 text-amber-800 border-amber-200';
    headerColor = 'from-amber-500 to-orange-500';
    icon = <MinusCircle size={24} className="text-amber-100" />;
  } else {
    colorClass = 'bg-red-50 text-red-800 border-red-200';
    headerColor = 'from-red-500 to-rose-600';
    icon = <XCircle size={24} className="text-red-100" />;
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className={`bg-gradient-to-r ${headerColor} px-6 py-4 text-white flex justify-between items-center`}>
        <div>
          <h3 className="font-bold text-lg flex items-center gap-2">
            💎 Piotroski F-Score
          </h3>
          <p className="text-xs opacity-80 mt-0.5">วัดความแข็งแกร่งทางการเงิน (Quality & Health) {fScore.year ? `(${fScore.year})` : ''}</p>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-3xl font-black">{fScore.score}/9</span>
          <span className="text-xs font-medium uppercase tracking-wider opacity-90">{fScore.grade}</span>
        </div>
      </div>

      {/* Criteria List */}
      <div className="p-0 divide-y divide-slate-100 flex-grow">
        <div className="grid grid-cols-12 gap-2 bg-slate-50 px-4 py-2 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
          <div className="col-span-6">Criteria</div>
          <div className="col-span-4 text-right">Value</div>
          <div className="col-span-2 text-center">Pass</div>
        </div>
        
        {fScore.criteria.map((item, idx) => (
          <div key={idx} className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-slate-50 transition-colors">
            <div className="col-span-6">
              <div className="text-xs font-medium text-slate-700">{item.name}</div>
              <div className="text-[10px] text-slate-400">{item.condition}</div>
            </div>
            <div className="col-span-4 text-right">
              <div className="text-xs font-mono text-slate-600 truncate" title={String(item.value)}>
                {item.value}
              </div>
            </div>
            <div className="col-span-2 flex justify-center">
              {item.passed ? (
                <CheckCircle2 size={16} className="text-emerald-500" />
              ) : (
                <XCircle size={16} className="text-slate-300" />
              )}
            </div>
          </div>
        ))}
      </div>
      
      {/* Footer / Summary */}
      <div className="bg-slate-50 px-4 py-3 border-t border-slate-100 text-xs text-center text-slate-500">
        คะแนนสูง (7-9) บ่งบอกถึงสุขภาพทางการเงินที่แข็งแกร่งและโอกาสชนะสูง
      </div>
    </div>
  );
}
