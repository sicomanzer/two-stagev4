import React, { useState } from 'react';
import { RefreshCcw, Activity, TrendingUp, AlertTriangle, ArrowDownRight, Info, Brain, Sparkles, Loader2 } from 'lucide-react';

interface MarketCyclePanelProps {
  ticker: string;
  ratioBands: any;
  stockHistory: any[];
  currentPrice: number | null;
}

export default function MarketCyclePanel({ ticker, ratioBands, stockHistory, currentPrice }: MarketCyclePanelProps) {
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  // 1. Calculate Z-Score to determine valuation extreme
  let zScorePE = 0;
  let hasData = false;

  const currentPE = ratioBands?.pe?.data?.[ratioBands.pe.data.length - 1]?.value;
  const peAvg = ratioBands?.pe?.stats?.avg;
  const peSd = ratioBands?.pe?.stats?.sd;

  const currentPBV = ratioBands?.pbv?.data?.[ratioBands.pbv.data.length - 1]?.value;
  const pbvAvg = ratioBands?.pbv?.stats?.avg;
  const pbvSd = ratioBands?.pbv?.stats?.sd;

  if (currentPE !== undefined && peAvg !== undefined && peSd !== undefined && peSd > 0) {
    zScorePE = (currentPE - peAvg) / peSd;
    hasData = true;
  } else if (currentPBV !== undefined && pbvAvg !== undefined && pbvSd !== undefined && pbvSd > 0) {
    zScorePE = (currentPBV - pbvAvg) / pbvSd;
    hasData = true;
  }

  // 2. Determine Price Trend (Simple momentum check)
  let isPriceTrendingUp = true;
  if (stockHistory && stockHistory.length >= 2 && currentPrice) {
    const lastYearPrice = stockHistory[0].price; // assuming index 0 is most recent year-end
    if (currentPrice < lastYearPrice) {
      isPriceTrendingUp = false;
    }
  }

  // 3. Logic to determine the 4 Phases of Market Cycle
  // Phase 1: Accumulation (Undervalued, Fear)
  // Phase 2: Markup (Fair/Recovering, Optimism)
  // Phase 3: Distribution (Overvalued, Greed)
  // Phase 4: Markdown (Overvalued/Fair but momentum down, Panic/Capitulation)
  let currentPhase = 2; // Default
  
  if (hasData) {
    if (zScorePE <= -0.5) {
      currentPhase = isPriceTrendingUp ? 2 : 1;
    } else if (zScorePE > -0.5 && zScorePE <= 1.0) {
      currentPhase = isPriceTrendingUp ? 2 : 4;
    } else if (zScorePE > 1.0) {
      currentPhase = isPriceTrendingUp ? 3 : 4;
    }
  }

  const phases = [
    {
      id: 1,
      name: 'สะสมพลัง (Accumulation)',
      icon: Activity,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      activeColor: 'bg-blue-500',
      desc: 'หุ้นราคาถูก ข่าวร้ายเต็มตลาด คนส่วนใหญ่กลัวและสิ้นหวัง',
      lesson: 'บทเรียน: ช่วงเวลาที่ปลอดภัยที่สุด คือตอนที่ทุกคนกลัวสุดขีด (Margin of Safety สูงสุด)',
    },
    {
      id: 2,
      name: 'ขาขึ้น (Markup)',
      icon: TrendingUp,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      activeColor: 'bg-emerald-500',
      desc: 'ราคาเริ่มฟื้นตัว ปัจจัยพื้นฐานดีขึ้น คนเริ่มมีความหวัง',
      lesson: 'บทเรียน: ตลาดถูกขับเคลื่อนด้วยความคาดหวัง เราต้องรู้ว่าตอนนี้ตลาดกำลังให้ค่าความหวังมากเกินไปหรือไม่',
    },
    {
      id: 3,
      name: 'แจกจ่าย (Distribution)',
      icon: AlertTriangle,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      activeColor: 'bg-amber-500',
      desc: 'ราคาแพง ข่าวดีเต็มตลาด ทุกคนมั่นใจและประมาท',
      lesson: 'บทเรียน: ความเสี่ยงสูงสุด ซ่อนอยู่ในตอนที่ตลาดดูปลอดภัยที่สุด (ระวังความโลภ)',
    },
    {
      id: 4,
      name: 'ขาลง (Markdown)',
      icon: ArrowDownRight,
      color: 'text-rose-600',
      bgColor: 'bg-rose-50',
      borderColor: 'border-rose-200',
      activeColor: 'bg-rose-500',
      desc: 'ราคาตกต่ำ ปัจจัยพื้นฐานเริ่มแย่ลง คนเริ่มเทขายหนีตาย',
      lesson: 'บทเรียน: ไม่ควรฝืนตลาด ควรรอให้ฝุ่นตลบและวัฏจักรเริ่มรอบใหม่',
    }
  ];

  if (!hasData) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm text-center">
        <div className="text-slate-400 mb-2 flex justify-center">
          <Info size={32} />
        </div>
        <h3 className="text-slate-600 font-medium">ไม่สามารถวิเคราะห์ Market Cycle ได้</h3>
        <p className="text-sm text-slate-500 mt-1">ไม่มีข้อมูล P/E หรือ P/BV ย้อนหลังเพียงพอสำหรับการคำนวณ Z-Score</p>
      </div>
    );
  }

  const handleGetAdvice = async () => {
    setIsAiLoading(true);
    setAiAdvice(null);
    try {
      const res = await fetch('/api/ai/timing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker,
          currentPhaseName: phases[currentPhase-1].name,
          zScorePE,
          isPriceTrendingUp,
          currentPrice,
          peAvg,
          pbvAvg
        })
      });

      const data = await res.json();
      if (data.advice) {
        setAiAdvice(data.advice);
      } else {
        throw new Error(data.error || 'Failed to get AI advice');
      }
    } catch (err: any) {
      alert(`AI Timing Error: ${err.message}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden h-full">
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
        <RefreshCcw size={120} />
      </div>
      
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
          <RefreshCcw size={20} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-800">Market Cycle Analysis</h3>
          <p className="text-xs text-slate-500">วิเคราะห์ตำแหน่งปัจจุบันของหุ้นในวัฏจักร (5 บทเรียนนอกตำรา)</p>
        </div>
      </div>

      {/* Cycle Visualization */}
      <div className="relative mb-8 mt-4">
        {/* Progress Line */}
        <div className="absolute top-1/2 left-0 w-full h-1.5 bg-slate-100 rounded-full -translate-y-1/2 z-0"></div>
        
        <div className="relative z-10 flex justify-between">
          {phases.map((phase, index) => {
            const isActive = phase.id === currentPhase;
            const isPast = phase.id < currentPhase;
            const Icon = phase.icon;
            
            return (
              <div key={phase.id} className="flex flex-col items-center w-1/4">
                <div 
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-4 transition-all duration-500 ${
                    isActive 
                      ? `${phase.activeColor} border-white shadow-md text-white scale-110` 
                      : isPast 
                        ? 'bg-slate-200 border-white text-slate-400'
                        : 'bg-white border-slate-100 text-slate-300'
                  }`}
                >
                  <Icon size={18} strokeWidth={isActive ? 3 : 2} />
                </div>
                <p className={`text-[11px] sm:text-xs font-bold mt-2 text-center transition-colors ${isActive ? phase.color : 'text-slate-400'}`}>
                  {phase.name}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Phase Details */}
      <div className={`p-4 rounded-xl border ${phases[currentPhase-1].bgColor} ${phases[currentPhase-1].borderColor}`}>
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 ${phases[currentPhase-1].color}`}>
            <Info size={18} />
          </div>
          <div>
            <h4 className={`text-sm font-bold ${phases[currentPhase-1].color} mb-1`}>
              สถานะปัจจุบัน: {phases[currentPhase-1].name}
            </h4>
            <p className="text-sm text-slate-700 mb-3 leading-relaxed">
              {phases[currentPhase-1].desc} 
              <span className="text-xs text-slate-500 ml-1">
                (อ้างอิงจาก Z-Score: {zScorePE.toFixed(2)} และทิศทางราคา)
              </span>
            </p>
            <div className="bg-white/60 p-3 rounded-lg border border-white/40 text-xs text-slate-700 italic font-medium">
              &quot;{phases[currentPhase-1].lesson}&quot;
            </div>
          </div>
        </div>

        {/* AI Timing Advisor (Idea 2) */}
        <div className="mt-4 pt-4 border-t border-slate-200/50">
          {!aiAdvice && !isAiLoading ? (
            <button 
              onClick={handleGetAdvice}
              className={`w-full flex items-center justify-center gap-2 py-2.5 bg-white/50 hover:bg-white border ${phases[currentPhase-1].borderColor} ${phases[currentPhase-1].color} font-bold rounded-xl transition-all shadow-sm group`}
            >
              <Brain size={16} className="group-hover:scale-110 transition-transform" />
              ขอคำแนะนำจาก AI (Timing Advisor)
              <Sparkles size={14} className="opacity-70" />
            </button>
          ) : (
            <div className={`bg-white rounded-xl p-4 border shadow-sm relative overflow-hidden ${phases[currentPhase-1].borderColor}`}>
              <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                <div className={`flex items-center gap-2 font-bold text-sm ${phases[currentPhase-1].color}`}>
                  <Brain size={16} />
                  AI Timing Advisor
                </div>
                {aiAdvice && (
                  <button onClick={handleGetAdvice} disabled={isAiLoading} className="text-slate-400 hover:text-slate-600 transition-colors" title="วิเคราะห์ใหม่">
                    <RefreshCcw size={14} className={isAiLoading ? 'animate-spin' : ''} />
                  </button>
                )}
              </div>
              
              <div className="text-slate-700 text-sm leading-relaxed">
                {isAiLoading ? (
                  <div className="flex items-center gap-3 py-2 text-slate-400">
                    <Loader2 className="animate-spin" size={16} />
                    <span className="text-xs font-semibold uppercase tracking-wider">Analyzing cycle data...</span>
                  </div>
                ) : (
                  <p>{aiAdvice}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
    </div>
  );
}
