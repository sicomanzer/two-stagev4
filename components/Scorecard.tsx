'use client';

import React from 'react';
import type { StockScorecard } from '@/types/stock';
import { getRatingStars, getRatingColor } from '@/lib/calculations';

interface ScorecardProps {
  scorecard: StockScorecard;
}

export default function Scorecard({ scorecard }: ScorecardProps) {
  const percentage = (scorecard.totalScore / scorecard.maxScore) * 100;
  
  let statusColor = 'from-slate-400 to-slate-500 text-slate-700 bg-slate-50 border-slate-200';
  let gaugeColor = '#94a3b8';

  if (scorecard.rating >= 4) {
    statusColor = 'from-indigo-400 to-indigo-600 text-indigo-900 bg-indigo-50/50 border-indigo-100';
    gaugeColor = '#4f46e5';
  } else if (scorecard.rating >= 3) {
    statusColor = 'from-blue-400 to-blue-600 text-blue-900 bg-blue-50/50 border-blue-100';
    gaugeColor = '#2563eb';
  } else if (scorecard.rating >= 2) {
    statusColor = 'from-amber-400 to-amber-600 text-amber-900 bg-amber-50/50 border-amber-100';
    gaugeColor = '#d97706';
  } else {
    statusColor = 'from-rose-400 to-rose-600 text-rose-900 bg-rose-50/50 border-rose-100';
    gaugeColor = '#e11d48';
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
                🏆
              </span>
              <h3 className="font-black text-lg tracking-tight">VI Quality Scorecard</h3>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">{scorecard.ticker}</p>
          </div>
        </div>
      </div>

      <div className="p-6 relative z-10 flex-grow bg-white/40 backdrop-blur-sm">
        {/* Main Score Display */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1">
            {/* Circular Progress */}
            <div className="relative w-28 h-28 mx-auto">
              <svg className="w-28 h-28 transform -rotate-90 drop-shadow-sm" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="12" />
                <circle
                  cx="60" cy="60" r="50"
                  fill="none"
                  stroke={gaugeColor}
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${(percentage * 3.14).toFixed(2)} 314`}
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-black text-slate-800 tracking-tighter mix-blend-multiply opacity-80">{scorecard.totalScore}</span>
                <span className="text-xs font-black text-slate-400 mt-[-4px]">/{scorecard.maxScore}</span>
              </div>
            </div>
          </div>

          <div className="flex-1 text-center">
            <div className="text-3xl mb-2 drop-shadow-sm">{getRatingStars(scorecard.rating)}</div>
            <div className={`inline-block px-3 py-1 rounded-xl text-[10px] uppercase font-black tracking-widest border border-white/50 shadow-sm backdrop-blur-md ${getRatingColor(scorecard.rating).replace('border-', 'border-')}`}>
              {scorecard.ratingLabel}
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="space-y-1">
          <div className="grid grid-cols-12 gap-1 text-[8px] font-black uppercase tracking-widest text-slate-400 px-2 mb-2">
            <div className="col-span-1"></div>
            <div className="col-span-4">Metric</div>
            <div className="col-span-4">Detail</div>
            <div className="col-span-3 text-right">Score</div>
          </div>
          {scorecard.categories.map((cat, i) => (
            <div 
              key={i} 
              className={`grid grid-cols-12 gap-1 items-center px-4 py-2.5 rounded-xl border border-white/40 shadow-[0_1px_3px_0_rgba(0,0,0,0.02)] transition-all ${
                cat.score === cat.maxScore ? 'bg-emerald-50/80 hover:bg-emerald-100/80' :
                cat.score > 0 ? 'bg-amber-50/80 hover:bg-amber-100/80' : 'bg-white/60 hover:bg-white/90'
              }`}
            >
              <div className="col-span-1 text-sm">{cat.icon}</div>
              <div className="col-span-4 font-bold text-slate-700 truncate pr-2 text-[10px] leading-tight flex items-center">{cat.name}</div>
              <div className="col-span-4 text-[9px] font-medium text-slate-500 truncate pr-2 flex items-center">{cat.detail}</div>
              <div className="col-span-3 text-right">
                <span className={`font-black text-[11px] ${
                  cat.score === cat.maxScore ? 'text-emerald-600' :
                  cat.score > 0 ? 'text-amber-600' : 'text-slate-400'
                }`}>
                  {cat.score}
                </span>
                <span className="text-slate-400 text-[9px] font-bold">/{cat.maxScore}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
