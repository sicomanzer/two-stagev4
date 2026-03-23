import React from 'react';
import { FScoreResult } from '@/types/stock';
import { CheckCircle2, XCircle, MinusCircle } from 'lucide-react';

interface FScoreProps {
  fScore: FScoreResult;
}

export default function FScore({ fScore }: FScoreProps) {
  // Color coding based on score (0-9)
  let statusColor = 'from-slate-400 to-slate-500 text-slate-700 bg-slate-50 border-slate-200';
  let badgeColor = 'bg-slate-100 text-slate-600';
  let icon = <MinusCircle size={20} className="text-slate-400" />;
  
  if (fScore.score >= 7) {
    statusColor = 'from-emerald-400 to-emerald-600 text-emerald-900 bg-emerald-50/50 border-emerald-100';
    badgeColor = 'bg-emerald-100 text-emerald-700';
    icon = <CheckCircle2 size={20} className="text-emerald-500" />;
  } else if (fScore.score >= 4) {
    statusColor = 'from-amber-400 to-orange-500 text-amber-900 bg-amber-50/50 border-amber-100';
    badgeColor = 'bg-amber-100 text-amber-700';
    icon = <MinusCircle size={20} className="text-amber-500" />;
  } else {
    statusColor = 'from-red-400 to-rose-600 text-red-900 bg-red-50/50 border-red-100';
    badgeColor = 'bg-red-100 text-red-700';
    icon = <XCircle size={20} className="text-red-500" />;
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
              <h3 className="font-black text-lg tracking-tight">Piotroski F-Score</h3>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">สุขภาพทางการเงิน {fScore.year ? `(${fScore.year})` : ''}</p>
          </div>
          <div className="text-right flex flex-col items-end">
            <span className="text-4xl font-black tracking-tighter mix-blend-multiply opacity-80">{fScore.score}<span className="text-xl opacity-50">/9</span></span>
            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full mt-1 ${badgeColor} shadow-sm border border-white/50 backdrop-blur-md`}>
              {fScore.grade === 'Strong' ? 'แข็งแกร่ง' : fScore.grade === 'Stable' ? 'มั่นคง' : 'อ่อนแอ'}
            </span>
          </div>
        </div>
      </div>

      {/* Criteria List */}
      <div className="p-2 flex-grow relative z-10 bg-white/40 backdrop-blur-sm">
        <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[9px] uppercase font-black text-slate-400 tracking-widest">
          <div className="col-span-7">เกณฑ์</div>
          <div className="col-span-3 text-right">ค่าที่ได้</div>
          <div className="col-span-2 text-center">ผ่าน</div>
        </div>
        
        <div className="space-y-1">
          {fScore.criteria.map((item, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 px-4 py-2.5 items-center bg-white/60 hover:bg-white/90 rounded-xl transition-all border border-white/40 shadow-[0_1px_3px_0_rgba(0,0,0,0.02)]">
              <div className="col-span-7 pr-2">
                <div className="text-xs font-bold text-slate-700 leading-tight mb-0.5">{item.name}</div>
                <div className="text-[9px] font-medium text-slate-400 truncate w-full" title={item.condition}>{item.condition}</div>
              </div>
              <div className="col-span-3 text-right">
                <div className="text-[11px] font-black text-slate-600 truncate" title={String(item.value)}>
                  {item.value !== null ? item.value : '-'}
                </div>
              </div>
              <div className="col-span-2 flex justify-center border-l border-slate-100 pl-2">
                {item.passed ? (
                  <CheckCircle2 size={16} className="text-emerald-500" strokeWidth={3} />
                ) : (
                  <XCircle size={16} className="text-rose-400" strokeWidth={3} />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Footer */}
      <div className="bg-white/40 backdrop-blur-md px-4 py-3 border-t border-white/20 text-[10px] font-bold text-center text-slate-500 uppercase tracking-widest relative z-10">
        คะแนน ≥ 7 หมายถึง มีสุขภาพทางการเงินที่แข็งแกร่ง
      </div>
    </div>
  );
}
