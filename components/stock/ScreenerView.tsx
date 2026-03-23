import React, { useState, useMemo } from 'react';
import { Search, Info, TrendingUp, AlertTriangle, ShieldCheck, Download, ChevronUp, ChevronDown, ChevronsUpDown, ExternalLink, Zap, Target } from 'lucide-react';

type ScreenerPreset = 'previous' | 'latest' | 'no_filter' | 'vi' | 'high_dividend' | 'safe_haven' | 'quality_dividend';

interface ScreenerViewProps {
  onSelectTicker: (ticker: string) => void;
}

const ModernMetricInput = ({ 
  label, subtitle, value, onChange, min, max, step, unit, highlightColor 
}: any) => {
  const isUnset = value === '';
  const percent = isUnset ? 0 : Math.min(Math.max(((value - min) / (max - min)) * 100, 0), 100);
  const clampNumber = (num: number) => Math.min(max, Math.max(min, num));
  
  return (
    <div className="group relative bg-white/70 backdrop-blur-md border border-slate-200/60 p-3.5 rounded-2xl shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_12px_-4px_rgba(0,0,0,0.1)] transition-all">
      <div className="flex justify-between items-start mb-4">
        <div>
          <label className="text-xs font-black text-slate-800 tracking-wide uppercase">{label}</label>
          {subtitle && <p className="text-[10px] font-bold text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex flex-col items-end">
          <div className="flex items-baseline gap-1 bg-white px-2 py-1.5 rounded-lg border border-slate-200 shadow-sm focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
             <input 
               type="number" 
               value={value} 
               min={min}
               max={max}
               step={step}
               onChange={(e) => onChange(e.target.value === '' ? '' : clampNumber(Number(e.target.value)))} 
               className="w-12 text-right text-sm font-black text-slate-800 outline-none bg-transparent"
               placeholder="All"
             />
             {unit && <span className="text-[10px] font-black text-slate-400 uppercase">{unit}</span>}
          </div>
          {!isUnset && (
            <button onClick={() => onChange('')} className="text-[9px] font-bold text-rose-500 hover:text-rose-600 mt-1.5 uppercase tracking-widest transition-colors">
              Reset
            </button>
          )}
        </div>
      </div>
      <div className="relative h-3 bg-slate-100/80 rounded-full overflow-hidden border border-slate-200/50 shadow-inner">
        <div 
          className={`absolute top-0 left-0 h-full transition-all duration-300 ${isUnset ? 'bg-slate-300' : highlightColor}`} 
          style={{ width: `${isUnset ? 100 : percent}%`, opacity: isUnset ? 0.3 : 1 }}
        />
        <input 
          type="range" 
          min={min} max={max} step={step} 
          value={isUnset ? min : value} 
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
    </div>
  )
}

export default function ScreenerView({ onSelectTicker }: ScreenerViewProps) {
  const [preset, setPreset] = useState<ScreenerPreset>('latest');
  const [epsGrowthMin, setEpsGrowthMin] = useState<number | ''>(0);
  const [dpsGrowthMin, setDpsGrowthMin] = useState<number | ''>(0);
  const [peBandMode, setPeBandMode] = useState<string>('none');
  const [pbvBandMode, setPbvBandMode] = useState<string>('none');
  const [fScoreMin, setFScoreMin] = useState<number | ''>(5);
  const [zScoreMin, setZScoreMin] = useState<number | ''>(2.5);
  const [viScoreMin, setViScoreMin] = useState<number | ''>(12);
  const [marketCycleMode, setMarketCycleMode] = useState<string>('any');
  
  // New metrics
  const [yieldMin, setYieldMin] = useState<number | ''>(5);
  const [deMax, setDeMax] = useState<number | ''>(1);
  const [peMax, setPeMax] = useState<number | ''>(12);
  const [pbvMax, setPbvMax] = useState<number | ''>(2.5);
  const [roeMin, setRoeMin] = useState<number | ''>(15);
  const [dividendStreakMin, setDividendStreakMin] = useState<number | ''>(2);

  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [stats, setStats] = useState<{ total: number; matched: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'viScore', direction: 'desc' });

  const applyPreset = (nextPreset: ScreenerPreset) => {
    setPreset(nextPreset);

    if (nextPreset === 'quality_dividend') {
      setEpsGrowthMin(0);
      setDpsGrowthMin(0);
      setPeBandMode('none');
      setPbvBandMode('none');
      setFScoreMin(6);
      setZScoreMin(2.5);
      setViScoreMin(12);
      setYieldMin(5);
      setDeMax(1.2);
      setPeMax(18);
      setPbvMax(2.5);
      setRoeMin(12);
      setDividendStreakMin(2);
      setMarketCycleMode('any');
      return;
    }

    if (nextPreset === 'high_dividend') {
      setEpsGrowthMin(0);
      setDpsGrowthMin(0);  // High dividend doesn't always grow DPS wildly, yield is key
      setPeBandMode('none');
      setPbvBandMode('none');
      setFScoreMin(4);     // Relaxed
      setZScoreMin(1.2);   // Relaxed (dividend stocks often have debt)
      setViScoreMin(10);
      setYieldMin(6);      // Aggressive yield
      setDeMax(2.0);
      setPeMax(20);
      setPbvMax(3.0);
      setRoeMin(8);
      setDividendStreakMin(2);
      setMarketCycleMode('any');
      return;
    }

    if (nextPreset === 'vi') {
      setEpsGrowthMin(0);  // Just positive growth is fine
      setDpsGrowthMin(0);
      setPeBandMode('below_avg'); // Only require PE to be cheap relative to history
      setPbvBandMode('none');     // Demanding both PE & PBV below average is too strict
      setFScoreMin(5);            // Solid baseline
      setZScoreMin(1.8);          // 2.99 is way too strict for non-manufacturing
      setViScoreMin(12);
      setYieldMin(3);
      setDeMax(1.5);              // Typical healthy debt
      setPeMax(15);
      setPbvMax(2.0);
      setRoeMin(10);
      setDividendStreakMin('');
      setMarketCycleMode('any');
      return;
    }

    if (nextPreset === 'safe_haven') {
      setEpsGrowthMin(0);
      setDpsGrowthMin(0);
      setPeBandMode('none');
      setPbvBandMode('none');
      setFScoreMin(7);     // Very strong F-Score
      setZScoreMin(2.99);  // Safe zone
      setViScoreMin(12);
      setYieldMin(2);
      setDeMax(0.5);       // Minimal debt
      setPeMax(20);
      setPbvMax(3);
      setRoeMin(10);
      setDividendStreakMin('');
      setMarketCycleMode('any');
      return;
    }

    if (nextPreset === 'no_filter') {
      setEpsGrowthMin('');
      setDpsGrowthMin('');
      setPeBandMode('none');
      setPbvBandMode('none');
      setFScoreMin('');
      setZScoreMin('');
      setViScoreMin('');
      setYieldMin('');
      setDeMax('');
      setPeMax('');
      setPbvMax('');
      setRoeMin('');
      setDividendStreakMin('');
      setMarketCycleMode('any');
      return;
    }

    if (nextPreset === 'previous') {
      setEpsGrowthMin(0);
      setDpsGrowthMin(0);
      setPeBandMode('none'); // No strict band requirement
      setPbvBandMode('none');
      setFScoreMin(5);
      setZScoreMin(1.8);
      setViScoreMin(10);
      setYieldMin(4);
      setDeMax(2.0);
      setPeMax(20);
      setPbvMax(3.0);
      setRoeMin(10);
      setDividendStreakMin('');
      setMarketCycleMode('any');
      return;
    }

    // Default: 'latest' (สูตรเข้มข้น - Strict but possible)
    setEpsGrowthMin(5);
    setDpsGrowthMin(0);
    setPeBandMode('below_avg');
    setPbvBandMode('none');
    setFScoreMin(6);
    setZScoreMin(2.0);
    setViScoreMin(12);
    setYieldMin(4);
    setDeMax(1.5);
    setPeMax(15);
    setPbvMax(2.5);
    setRoeMin(12);
    setDividendStreakMin('');
    setMarketCycleMode('any');
  };

  const handleScan = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/screener', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          epsGrowthMin: epsGrowthMin === '' ? undefined : Number(epsGrowthMin),
          dpsGrowthMin: dpsGrowthMin === '' ? undefined : Number(dpsGrowthMin),
          peBandMode: peBandMode === 'none' ? undefined : peBandMode,
          pbvBandMode: pbvBandMode === 'none' ? undefined : pbvBandMode,
          fScoreMin: fScoreMin === '' ? undefined : Number(fScoreMin),
          zScoreMin: zScoreMin === '' ? undefined : Number(zScoreMin),
          viScoreMin: viScoreMin === '' ? undefined : Number(viScoreMin),
          yieldMin: yieldMin === '' ? undefined : Number(yieldMin),
          deMax: deMax === '' ? undefined : Number(deMax),
          peMax: peMax === '' ? undefined : Number(peMax),
          pbvMax: pbvMax === '' ? undefined : Number(pbvMax),
          roeMin: roeMin === '' ? undefined : Number(roeMin),
          dividendStreakMin: dividendStreakMin === '' ? undefined : Number(dividendStreakMin),
          marketCycleMode: marketCycleMode === 'any' ? undefined : marketCycleMode,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to scan stocks');
      }

      const data = await res.json();
      setResults(data.results);
      setStats({ total: data.total, matched: data.matched });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const sortedResults = useMemo(() => {
    let sortableItems = [...results];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        
        if (aVal === null || aVal === undefined) aVal = -Infinity;
        if (bVal === null || bVal === undefined) bVal = -Infinity;

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [results, sortConfig]);

  const renderSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) return <ChevronsUpDown size={14} className="inline ml-1 text-slate-300 group-hover:text-slate-400" />;
    return sortConfig.direction === 'asc' ? <ChevronUp size={14} className="inline ml-1 text-indigo-600" /> : <ChevronDown size={14} className="inline ml-1 text-indigo-600" />;
  };

  const exportToCSV = () => {
    if (results.length === 0) return;
    const headers = ['Ticker', 'Price', 'EPS CAGR', 'DPS CAGR', 'Yield', 'ROE', 'P/E', 'P/BV', 'PE -1SD', 'PBV -1SD', 'D/E', 'F-Score', 'Z-Score', 'VI Score', 'Market Cycle'];
    const csvData = sortedResults.map(r => [
      r.ticker,
      r.currentPrice,
      r.epsCAGR?.toFixed(2),
      r.dpsCAGR?.toFixed(2),
      r.latestYield?.toFixed(2),
      r.latestROE?.toFixed(2),
      r.latestPE?.toFixed(2),
      r.latestPBV?.toFixed(2),
      r.peMinus1SD?.toFixed(2),
      r.pbvMinus1SD?.toFixed(2),
      r.latestDE?.toFixed(2),
      r.fScore,
      r.zScore?.toFixed(2),
      r.viScore,
      r.marketCycleLabel || ''
    ].join(','));
    
    const csvContent = [headers.join(','), ...csvData].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `screener_results_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Premium Hero Header */}
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 relative overflow-hidden">
        {/* Decorators */}
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-70 z-0"></div>
        <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-emerald-50 rounded-full blur-3xl opacity-70 z-0"></div>

        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex items-center gap-4">
             <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-3 rounded-2xl text-white shadow-lg shadow-indigo-200">
               <Search size={28} strokeWidth={2.5} />
             </div>
             <div>
               <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">VI Screener Cockpit</h2>
               <p className="text-sm font-medium text-slate-500 mt-1">สแกนหาหุ้นคุณค่าและตรวจสุขภาพการเงินระดับมืออาชีพ</p>
             </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-7 gap-3">
            {[
              { id: 'latest', name: '👑 สูตรเข้มข้น', desc: 'คัดหุ้นสุดยอดVI' },
              { id: 'previous', name: '⚖️ สูตรสมดุล', desc: 'ไม่ตึงเกินไป' },
              { id: 'vi', name: '🎯 Value Investing', desc: 'เน้นราคาถูกและดี' },
              { id: 'quality_dividend', name: '🏆 ดี + ปันผล 5%', desc: 'พื้นฐานดี+ยิลด์สูง' },
              { id: 'high_dividend', name: '💰 High Dividend', desc: 'ปันผลสม่ำเสมอ' },
              { id: 'safe_haven', name: '🛡️ Safe Haven', desc: 'งบแข็งแกร่ง' },
              { id: 'no_filter', name: '🌐 กรองเอง', desc: 'ตั้งค่าอิสระ' },
            ].map(p => (
              <button
                key={p.id}
                onClick={() => applyPreset(p.id as ScreenerPreset)}
                className={`p-3.5 rounded-2xl text-left transition-all border ${
                  preset === p.id 
                    ? 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-800 text-white shadow-xl shadow-slate-300 transform scale-105 z-10 ring-2 ring-white ring-offset-2' 
                    : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white hover:border-slate-300 backdrop-blur-sm'
                }`}
              >
                <div className={`text-sm font-black tracking-wide ${preset === p.id ? 'text-white' : 'text-slate-800'}`}>{p.name}</div>
                <div className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${preset === p.id ? 'text-slate-300' : 'text-slate-400'}`}>{p.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 mt-2">
          {/* Growth Criteria Panel */}
          <div className="space-y-4 bg-gradient-to-b from-blue-50/50 to-white/50 p-5 rounded-3xl border border-blue-100 shadow-[0_2px_10px_-4px_rgba(59,130,246,0.1)]">
            <h3 className="font-black text-slate-800 flex items-center gap-2 mb-2">
              <span className="bg-blue-100/80 p-1.5 rounded-lg border border-blue-200"><TrendingUp size={20} className="text-blue-600" /></span>
              Growth Engine
            </h3>
            
            <ModernMetricInput 
               label="EPS Growth" subtitle="5Y CAGR ขั้นต่ำ" unit="%" 
               min={0} max={30} step={1} value={epsGrowthMin} onChange={setEpsGrowthMin} highlightColor="bg-blue-500" 
            />
            <ModernMetricInput 
               label="DPS Growth" subtitle="5Y CAGR ขั้นต่ำ" unit="%" 
               min={0} max={30} step={1} value={dpsGrowthMin} onChange={setDpsGrowthMin} highlightColor="bg-cyan-500" 
            />
            <ModernMetricInput 
               label="Dividend Yield" subtitle="อัตราปันผลตอบแทน" unit="%" 
               min={0} max={15} step={0.1} value={yieldMin} onChange={setYieldMin} highlightColor="bg-teal-500" 
            />
            <ModernMetricInput 
               label="Return on Equity" subtitle="ROE ขั้นต่ำ" unit="%" 
               min={0} max={40} step={1} value={roeMin} onChange={setRoeMin} highlightColor="bg-indigo-500" 
            />
          </div>

          {/* Valuation Criteria Panel */}
          <div className="space-y-4 bg-gradient-to-b from-amber-50/50 to-white/50 p-5 rounded-3xl border border-amber-100 shadow-[0_2px_10px_-4px_rgba(245,158,11,0.1)]">
            <h3 className="font-black text-slate-800 flex items-center gap-2 mb-2">
              <span className="bg-amber-100/80 p-1.5 rounded-lg border border-amber-200"><Target size={20} className="text-amber-600" /></span>
              Valuation Radars
            </h3>
            
            <div className="group relative bg-white/70 backdrop-blur-md border border-slate-200/60 p-3.5 rounded-2xl shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)]">
              <label className="block text-xs font-black text-slate-800 tracking-wide uppercase mb-2">PE Band Target</label>
              <select
                value={peBandMode}
                onChange={(e) => setPeBandMode(e.target.value)}
                className="w-full p-2.5 text-sm font-bold border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none bg-slate-50 cursor-pointer"
              >
                <option value="none">🌐 ไม่กรอง (Any)</option>
                <option value="below_avg">📉 ต่ำกว่าค่าเฉลี่ย (Below Avg)</option>
                <option value="below_minus_1_sd">💎 ต่ำกว่า -1 SD (Margin of Safety)</option>
              </select>
            </div>

            <div className="group relative bg-white/70 backdrop-blur-md border border-slate-200/60 p-3.5 rounded-2xl shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)]">
              <label className="block text-xs font-black text-slate-800 tracking-wide uppercase mb-2">PBV Band Target</label>
              <select
                value={pbvBandMode}
                onChange={(e) => setPbvBandMode(e.target.value)}
                className="w-full p-2.5 text-sm font-bold border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none bg-slate-50 cursor-pointer"
              >
                <option value="none">🌐 ไม่กรอง (Any)</option>
                <option value="below_avg">📉 ต่ำกว่าค่าเฉลี่ย (Below Avg)</option>
                <option value="below_minus_1_sd">💎 ต่ำกว่า -1 SD (Margin of Safety)</option>
              </select>
            </div>

            <ModernMetricInput 
               label="Max P/E Ratio" subtitle="เพดาน P/E สูงสุด" unit="x" 
               min={5} max={50} step={1} value={peMax} onChange={setPeMax} highlightColor="bg-amber-500" 
            />
            <ModernMetricInput 
               label="Max P/BV Ratio" subtitle="เพดาน P/BV สูงสุด" unit="x" 
               min={0.5} max={10} step={0.1} value={pbvMax} onChange={setPbvMax} highlightColor="bg-orange-500" 
            />
          </div>

          {/* Quality Criteria Panel */}
          <div className="space-y-4 bg-gradient-to-b from-emerald-50/50 to-white/50 p-5 rounded-3xl border border-emerald-100 shadow-[0_2px_10px_-4px_rgba(16,185,129,0.1)]">
            <h3 className="font-black text-slate-800 flex items-center gap-2 mb-2">
              <span className="bg-emerald-100/80 p-1.5 rounded-lg border border-emerald-200"><ShieldCheck size={20} className="text-emerald-600" /></span>
              Quality Assurance
            </h3>
            
            <ModernMetricInput 
               label="Piotroski F-Score" subtitle="คะแนนคุณภาพ 0-9" unit="Pts" 
               min={0} max={9} step={1} value={fScoreMin} onChange={setFScoreMin} highlightColor="bg-emerald-500" 
            />
            <ModernMetricInput 
               label="Altman Z-Score" subtitle="โอกาสล้มละลาย (ยิ่งสูงยิ่งดี)" unit="Pts" 
               min={0} max={10} step={0.1} value={zScoreMin} onChange={setZScoreMin} highlightColor="bg-green-500" 
            />
            <ModernMetricInput 
               label="VI Scorecard" subtitle="คะแนนอัตโนมัติ 0-20" unit="Pts" 
               min={0} max={20} step={1} value={viScoreMin} onChange={setViScoreMin} highlightColor="bg-purple-500" 
            />
            <ModernMetricInput
               label="Dividend Streak" subtitle="ปีที่จ่ายปันผลต่อเนื่องขั้นต่ำ" unit="Y"
               min={0} max={15} step={1} value={dividendStreakMin} onChange={setDividendStreakMin} highlightColor="bg-lime-500"
            />
            <div className="group relative bg-white/70 backdrop-blur-md border border-slate-200/60 p-3.5 rounded-2xl shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)]">
              <label className="block text-xs font-black text-slate-800 tracking-wide uppercase mb-2">Market Cycle</label>
              <select
                value={marketCycleMode}
                onChange={(e) => setMarketCycleMode(e.target.value)}
                className="w-full p-2.5 text-sm font-bold border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-slate-50 cursor-pointer"
              >
                <option value="any">🌐 ไม่กรอง (Any)</option>
                <option value="accumulation">🔵 สะสมพลัง (Accumulation)</option>
                <option value="markup">🟢 ขาขึ้น (Markup)</option>
                <option value="distribution">🟠 แจกจ่าย (Distribution)</option>
                <option value="markdown">🔴 ขาลง (Markdown)</option>
              </select>
            </div>
            <ModernMetricInput 
               label="Max D/E Ratio" subtitle="หนี้สินต่อทุน สูงสุด" unit="x" 
               min={0.1} max={5} step={0.1} value={deMax} onChange={setDeMax} highlightColor="bg-rose-500" 
            />
          </div>
        </div>

        <button
          onClick={handleScan}
          disabled={isLoading}
          className="w-full py-4 bg-slate-900 border-2 border-slate-800 hover:bg-slate-800 hover:border-slate-700 text-white font-black rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_4px_14px_0_rgba(0,0,0,0.1)] text-lg uppercase tracking-widest relative overflow-hidden group"
        >
          {/* Subtle Shine Effect over button */}
          <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-shimmer transition-transform" />
          
          {isLoading ? (
            <>
              <div className="w-6 h-6 border-4 border-slate-600 border-t-white rounded-full animate-spin"></div>
              <span>Scanning Database...</span>
            </>
          ) : (
            <>
              <Zap size={24} className="text-yellow-400 fill-yellow-400" />
              <span>Engage Screener</span>
            </>
          )}
        </button>
        
        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100 flex items-start gap-2 shadow-sm">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

      {stats && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex justify-between items-end mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800">ผลการสแกน (Screening Results)</h3>
              <p className="text-sm text-slate-500">
                พบหุ้นที่ผ่านเกณฑ์ <strong className="text-indigo-600 text-lg">{stats.matched}</strong> ตัว จากทั้งหมด {stats.total} ตัว
              </p>
            </div>
            <div className="flex items-center gap-2">
              {stats.matched > 0 && (
                <button
                  onClick={exportToCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 rounded-lg text-sm font-medium transition-colors"
                >
                  <Download size={16} />
                  Export CSV
                </button>
              )}
            </div>
          </div>

          {results.length > 0 ? (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 max-h-[600px] shadow-sm bg-white">
              <table className="w-full text-sm text-left relative">
                <thead className="bg-slate-50 text-slate-700 align-top sticky top-0 z-20">
                  <tr>
                    <th className="p-4 font-black sticky left-0 bg-slate-50 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-b border-slate-200 border-r border-slate-100">Ticker</th>
                    <th className="p-4 font-black text-right border-b border-slate-200 border-r border-slate-100">Price</th>
                    <th className="p-4 font-black text-center bg-blue-50/90 border-b border-blue-200/50 border-r border-slate-100" colSpan={4}>Growth & Returns</th>
                    <th className="p-4 font-black text-center bg-amber-50/90 border-b border-amber-200/50 border-r border-slate-100" colSpan={4}>Valuation Target</th>
                    <th className="p-4 font-black text-center bg-emerald-50/90 border-b border-emerald-200/50" colSpan={4}>Quality Health</th>
                  </tr>
                  <tr className="text-xs text-slate-500 bg-white/95 backdrop-blur shadow-sm border-b border-slate-200">
                    <th className="p-2 px-4 border-r border-slate-100 sticky left-0 bg-white/95 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"></th>
                    <th className="p-2 px-4 border-r border-slate-100"></th>
                    <th className="p-2 text-center border-r border-slate-100 cursor-pointer hover:bg-slate-50 group" title="EPS CAGR 5Y" onClick={() => handleSort('epsCAGR')}>EPS% {renderSortIcon('epsCAGR')}</th>
                    <th className="p-2 text-center border-r border-slate-100 cursor-pointer hover:bg-slate-50 group" title="DPS CAGR 5Y" onClick={() => handleSort('dpsCAGR')}>DPS% {renderSortIcon('dpsCAGR')}</th>
                    <th className="p-2 text-center border-r border-slate-100 cursor-pointer hover:bg-slate-50 group" title="Dividend Yield" onClick={() => handleSort('latestYield')}>Yield% {renderSortIcon('latestYield')}</th>
                    <th className="p-2 text-center border-r border-slate-100 cursor-pointer hover:bg-slate-50 group" title="Return on Equity" onClick={() => handleSort('latestROE')}>ROE% {renderSortIcon('latestROE')}</th>
                    <th className="p-2 text-center border-r border-slate-100 cursor-pointer hover:bg-slate-50 group" title="Price to Earnings" onClick={() => handleSort('latestPE')}>P/E {renderSortIcon('latestPE')}</th>
                    <th className="p-2 text-center border-r border-slate-100 cursor-pointer hover:bg-slate-50 group" title="Price to Book Value" onClick={() => handleSort('latestPBV')}>P/BV {renderSortIcon('latestPBV')}</th>
                    <th className="p-2 text-center border-r border-slate-100 cursor-pointer hover:bg-slate-50 group" title="PE ที่ -1 Standard Deviation" onClick={() => handleSort('peMinus1SD')}>PE (-1SD) {renderSortIcon('peMinus1SD')}</th>
                    <th className="p-2 text-center border-r border-slate-100 cursor-pointer hover:bg-slate-50 group" title="PBV ที่ -1 Standard Deviation" onClick={() => handleSort('pbvMinus1SD')}>PBV (-1SD) {renderSortIcon('pbvMinus1SD')}</th>
                    <th className="p-2 text-center border-r border-slate-100 cursor-pointer hover:bg-slate-50 group" title="Debt to Equity Ratio" onClick={() => handleSort('latestDE')}>D/E {renderSortIcon('latestDE')}</th>
                    <th className="p-2 text-center border-r border-slate-100 cursor-pointer hover:bg-slate-50 group" title="Piotroski F-Score (0-9)" onClick={() => handleSort('fScore')}>F-Score {renderSortIcon('fScore')}</th>
                    <th className="p-2 text-center border-r border-slate-100 cursor-pointer hover:bg-slate-50 group" title="Altman Z-Score" onClick={() => handleSort('zScore')}>Z-Score {renderSortIcon('zScore')}</th>
                    <th className="p-2 text-center cursor-pointer hover:bg-slate-50 group" title="คะแนนรวม Value Investing (0-20)" onClick={() => handleSort('viScore')}>VI Score {renderSortIcon('viScore')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {sortedResults.map((r, i) => (
                    <tr key={r.ticker} className="hover:bg-slate-50/80 transition-colors bg-white">
                      <td className="p-4 font-bold text-indigo-700 sticky left-0 bg-white shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] z-10 group">
                        <button
                          type="button"
                          onClick={() => onSelectTicker(r.ticker)}
                          className="hover:underline flex items-center gap-1.5"
                          title="คลิกเพื่อประเมินมูลค่า (DDM)"
                        >
                          {r.ticker}
                          <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      </td>
                      <td className="p-4 text-right font-medium bg-slate-50/30">{r.currentPrice?.toFixed(2) || '-'}</td>
                      
                      <td className={`p-4 text-center ${r.epsCAGR >= 10 ? 'text-emerald-600 font-medium' : r.epsCAGR > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {r.epsCAGR !== null && r.epsCAGR !== undefined ? `${r.epsCAGR.toFixed(1)}%` : '-'}
                      </td>
                      <td className={`p-4 text-center ${r.dpsCAGR >= 10 ? 'text-emerald-600 font-medium' : r.dpsCAGR > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {r.dpsCAGR !== null && r.dpsCAGR !== undefined ? `${r.dpsCAGR.toFixed(1)}%` : '-'}
                      </td>

                      <td className={`p-4 text-center font-bold ${r.latestYield >= 5 ? 'text-emerald-700 bg-emerald-50/80' : r.latestYield >= 3 ? 'text-emerald-600' : 'text-slate-600'}`}>
                        {r.latestYield?.toFixed(2) || '0.00'}%
                      </td>
                      <td className={`p-4 text-center font-bold ${r.latestROE >= 15 ? 'text-emerald-700 bg-emerald-50/80' : r.latestROE >= 10 ? 'text-emerald-600' : 'text-slate-600'}`}>
                        {r.latestROE?.toFixed(2) || '0.00'}%
                      </td>

                      <td className={`p-4 text-center font-medium ${r.latestPE && r.peMinus1SD && r.latestPE <= r.peMinus1SD ? 'text-emerald-700 bg-emerald-50/80' : ''}`}>
                        {r.latestPE?.toFixed(2) || '-'}
                      </td>
                      <td className={`p-4 text-center font-medium ${r.latestPBV && r.pbvMinus1SD && r.latestPBV <= r.pbvMinus1SD ? 'text-emerald-700 bg-emerald-50/80' : ''}`}>
                        {r.latestPBV?.toFixed(2) || '-'}
                      </td>

                      <td className="p-4 text-center text-slate-500 text-xs">
                        <div title={`AVG: ${r.peAvg?.toFixed(1)}`}>
                          {r.peMinus1SD?.toFixed(1) || '-'}
                        </div>
                      </td>
                      <td className="p-4 text-center text-slate-500 text-xs">
                        <div title={`AVG: ${r.pbvAvg?.toFixed(2)}`}>
                          {r.pbvMinus1SD?.toFixed(2) || '-'}
                        </div>
                      </td>

                      <td className={`p-4 text-center font-medium ${r.latestDE < 0.5 ? 'text-emerald-600 font-bold' : r.latestDE < 1 ? 'text-emerald-500' : r.latestDE > 2 ? 'text-red-500 font-bold' : 'text-amber-500'}`}>
                        {r.latestDE !== null && r.latestDE !== undefined ? r.latestDE.toFixed(2) : '-'}
                      </td>

                      <td className={`p-4 text-center font-bold ${r.fScore >= 7 ? 'text-emerald-700 bg-emerald-50/80' : r.fScore >= 5 ? 'text-emerald-600' : r.fScore <= 3 ? 'text-red-500 bg-red-50/80' : 'text-amber-500'}`}>
                        {r.fScore}/9
                      </td>
                      <td className={`p-4 text-center font-bold ${r.zScore >= 2.99 ? 'text-emerald-700 bg-emerald-50/80' : r.zScore >= 1.8 ? 'text-emerald-600' : 'text-red-500 bg-red-50/80'}`}>
                        {r.zScore?.toFixed(2) || '-'}
                      </td>
                      <td className={`p-4 text-center font-bold ${r.viScore >= 15 ? 'text-indigo-700 bg-indigo-100/50' : r.viScore >= 12 ? 'text-indigo-600 bg-indigo-50/30' : 'text-slate-600'}`}>
                        {r.viScore}/20
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 bg-slate-50 rounded-xl border border-slate-100 flex flex-col items-center justify-center text-slate-500">
              <Search size={48} className="text-slate-300 mb-4" />
              <p>ไม่พบหุ้นที่ผ่านเกณฑ์ทั้งหมดที่คุณตั้งไว้</p>
              <p className="text-sm mt-2">โปรดลองผ่อนปรนเกณฑ์บางข้อ (เช่น PE Band หรือ Z-Score) เพื่อดูผลลัพธ์ที่กว้างขึ้น</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
