import React, { useState, useEffect } from 'react';
import { Coffee, Sunrise, Sparkles, Brain, Loader2, X } from 'lucide-react';

export default function DailyBriefingPanel() {
  const [briefing, setBriefing] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Only load if not hidden explicitly and no cached briefing for today
    const loadBriefing = async () => {
      try {
        const today = new Date().toLocaleDateString('th-TH', { 
          year: 'numeric', month: 'long', day: 'numeric' 
        });

        // Check local storage so we only hit the API once a day
        const cacheKey = `vi_briefing`;
        const cachedStr = localStorage.getItem(cacheKey);
        if (cachedStr) {
          try {
            const cache = JSON.parse(cachedStr);
            if (cache.date === today && cache.content) {
              setBriefing(cache.content);
              setIsLoading(false);
              return;
            }
          } catch(e) {}
        }

        const res = await fetch('/api/ai/daily-briefing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: today })
        });
        
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error || 'Failed to load daily briefing');
        }

        if (typeof data?.briefing === 'string' && data.briefing.trim()) {
          setBriefing(data.briefing);
          localStorage.setItem(cacheKey, JSON.stringify({
            date: today,
            content: data.briefing
          }));
        } else {
          setError('ไม่สามารถโหลดข้อคิดเช้านี้ได้');
        }
      } catch (err: any) {
        console.error('Failed to load briefing:', err);
        setError('ไม่สามารถโหลดข้อคิดเช้านี้ได้');
      } finally {
        setIsLoading(false);
      }
    };

    loadBriefing();
  }, []);

  if (!isVisible) return null;

  return (
    <div className="w-full max-w-5xl mx-auto mb-6 px-4 md:px-0 animate-in fade-in slide-in-from-top-4 duration-700">
      <div className="bg-gradient-to-r from-teal-50 via-cyan-50 to-blue-50 border border-teal-100 rounded-3xl p-5 md:p-6 shadow-[0_4px_20px_-4px_rgba(20,184,166,0.15)] relative overflow-hidden flex flex-col md:flex-row gap-6">
        
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-teal-200/40 rounded-full blur-3xl z-0 pointer-events-none"></div>

        {/* Left Icon Area */}
        <div className="shrink-0 relative z-10 flex md:flex-col items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-teal-500 to-cyan-600 text-white rounded-2xl shadow-lg shadow-teal-200/50 flex items-center justify-center">
             <Coffee size={28} />
          </div>
          <div>
            <h3 className="font-black text-slate-800 tracking-tight text-lg">VI Morning</h3>
            <p className="text-[10px] uppercase tracking-widest text-teal-600 font-bold flex items-center gap-1">
              <Brain size={10} /> Qwen 3 AI
            </p>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 relative z-10 py-1">
          {isLoading ? (
            <div className="flex items-center gap-3 h-full text-teal-600/70">
              <Loader2 className="animate-spin" size={20} />
              <span className="text-sm font-semibold tracking-wide">AI กำลังคั่วกาแฟและสรุปข้อคิดการลงทุนให้คุณ...</span>
            </div>
          ) : error ? (
            <div className="text-sm text-slate-500 italic h-full flex items-center">
              พร้อมลุยวิเคราะห์หุ้นกันเลย! (ไม่มีข้อความใหม่สำหรับวันนี้)
            </div>
          ) : (
            <div className="prose prose-sm prose-teal max-w-none text-slate-700 leading-relaxed font-medium">
              {/* <Sunrise size={16} className="inline text-amber-500 mr-2 -mt-1" /> */}
              {briefing}
            </div>
          )}
        </div>

        {/* Close Button */}
        <button 
          onClick={() => setIsVisible(false)}
          className="absolute top-4 right-4 text-teal-400 hover:text-teal-700 bg-teal-50 hover:bg-teal-100 p-1.5 rounded-full transition-colors z-20"
          title="ปิดข้อความเช้านี้"
        >
          <X size={16} />
        </button>

      </div>
    </div>
  );
}
