import React, { useState, useMemo } from 'react';
import { Search, Info, TrendingUp, AlertTriangle, ShieldCheck, Download, ChevronUp, ChevronDown, ChevronsUpDown, ExternalLink } from 'lucide-react';

type ScreenerPreset = 'previous' | 'latest' | 'no_filter' | 'vi' | 'high_dividend' | 'safe_haven';

interface ScreenerViewProps {
  onSelectTicker: (ticker: string) => void;
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
  
  // New metrics
  const [yieldMin, setYieldMin] = useState<number | ''>(5);
  const [deMax, setDeMax] = useState<number | ''>(1);
  const [peMax, setPeMax] = useState<number | ''>(12);
  const [pbvMax, setPbvMax] = useState<number | ''>(2.5);
  const [roeMin, setRoeMin] = useState<number | ''>(15);

  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [stats, setStats] = useState<{ total: number; matched: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'viScore', direction: 'desc' });

  const applyPreset = (nextPreset: ScreenerPreset) => {
    setPreset(nextPreset);

    if (nextPreset === 'high_dividend') {
      setEpsGrowthMin(0);
      setDpsGrowthMin(5);
      setPeBandMode('none');
      setPbvBandMode('none');
      setFScoreMin(5);
      setZScoreMin(1.8);
      setViScoreMin(10);
      setYieldMin(6);
      setDeMax(1.5);
      setPeMax(20);
      setPbvMax(3);
      setRoeMin(10);
      return;
    }

    if (nextPreset === 'vi') {
      setEpsGrowthMin(5);
      setDpsGrowthMin(0);
      setPeBandMode('below_avg');
      setPbvBandMode('below_avg');
      setFScoreMin(6);
      setZScoreMin(2.99);
      setViScoreMin(14);
      setYieldMin(3);
      setDeMax(1.0);
      setPeMax(15);
      setPbvMax(2);
      setRoeMin(15);
      return;
    }

    if (nextPreset === 'safe_haven') {
      setEpsGrowthMin(0);
      setDpsGrowthMin(0);
      setPeBandMode('none');
      setPbvBandMode('none');
      setFScoreMin(7);
      setZScoreMin(3.5);
      setViScoreMin(12);
      setYieldMin(2);
      setDeMax(0.5);
      setPeMax(25);
      setPbvMax(4);
      setRoeMin(12);
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
      return;
    }

    if (nextPreset === 'previous') {
      setEpsGrowthMin(5);
      setDpsGrowthMin(0);
      setPeBandMode('below_avg');
      setPbvBandMode('below_avg');
      setFScoreMin(6);
      setZScoreMin(3.0);
      setViScoreMin(12);
      setYieldMin(4);
      setDeMax(1.5);
      setPeMax(15);
      setPbvMax(2);
      setRoeMin(12);
      return;
    }

    setEpsGrowthMin(0);
    setDpsGrowthMin(0);
    setPeBandMode('none');
    setPbvBandMode('none');
    setFScoreMin(5);
    setZScoreMin(2.5);
    setViScoreMin(12);
    setYieldMin(5);
    setDeMax(1);
    setPeMax(12);
    setPbvMax(2.5);
    setRoeMin(15);
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
    const headers = ['Ticker', 'Price', 'EPS CAGR', 'DPS CAGR', 'Yield', 'ROE', 'P/E', 'P/BV', 'PE -1SD', 'PBV -1SD', 'D/E', 'F-Score', 'Z-Score', 'VI Score'];
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
      r.viScore
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
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600">
              <Search size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">VI Screener (สแกนหาหุ้นคุณค่า)</h2>
              <p className="text-sm text-slate-500">กรองหุ้นจากฐานข้อมูลด้วยเกณฑ์คุณภาพและความถูกของราคา</p>
            </div>
          </div>
          <div className="bg-slate-100 p-1 rounded-lg flex items-center gap-1 self-start md:self-auto flex-wrap">
            <button
              type="button"
              onClick={() => applyPreset('previous')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${preset === 'previous' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              สูตรสมดุล
            </button>
            <button
              type="button"
              onClick={() => applyPreset('latest')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${preset === 'latest' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              สูตรเข้มข้น
            </button>
            <button
              type="button"
              onClick={() => applyPreset('vi')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${preset === 'vi' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              🎯 Value Investing (VI)
            </button>
            <button
              type="button"
              onClick={() => applyPreset('high_dividend')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${preset === 'high_dividend' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              💰 High Dividend
            </button>
            <button
              type="button"
              onClick={() => applyPreset('safe_haven')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${preset === 'safe_haven' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              🛡️ Safe Haven
            </button>
            <button
              type="button"
              onClick={() => applyPreset('no_filter')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${preset === 'no_filter' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              ไม่กรอง
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {/* Growth Criteria */}
          <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
              <TrendingUp size={18} className="text-blue-500" />
              แนวโน้มการเติบโต (Growth)
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                EPS Growth (5Y CAGR) ขั้นต่ำ (%)
              </label>
              <input
                type="number"
                value={epsGrowthMin}
                placeholder="ไม่กรอง"
                onChange={(e) => setEpsGrowthMin(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                DPS Growth (5Y CAGR) ขั้นต่ำ (%)
              </label>
              <input
                type="number"
                value={dpsGrowthMin}
                placeholder="ไม่กรอง"
                onChange={(e) => setDpsGrowthMin(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center justify-between">
                <span>อัตราผลตอบแทนเงินปันผล ขั้นต่ำ (%)</span>
                <span className="text-xs text-slate-500">Yield</span>
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="ไม่กรอง"
                value={yieldMin}
                onChange={(e) => setYieldMin(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center justify-between">
                <span>ผลตอบแทนส่วนผู้ถือหุ้น ขั้นต่ำ (%)</span>
                <span className="text-xs text-slate-500" title="> 15 คือดีเยี่ยม">ROE</span>
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="ไม่กรอง"
                value={roeMin}
                onChange={(e) => setRoeMin(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          {/* Value Criteria */}
          <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
              <AlertTriangle size={18} className="text-orange-500" />
              ความถูกของราคา (Valuation Bands)
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                PE Band Target
              </label>
              <select
                value={peBandMode}
                onChange={(e) => setPeBandMode(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
              >
                <option value="none">ไม่กรอง</option>
                <option value="below_avg">ต่ำกว่าค่าเฉลี่ย (Below Avg)</option>
                <option value="below_minus_1_sd">ต่ำกว่า -1 SD (Margin of Safety)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                PBV Band Target
              </label>
              <select
                value={pbvBandMode}
                onChange={(e) => setPbvBandMode(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
              >
                <option value="none">ไม่กรอง</option>
                <option value="below_avg">ต่ำกว่าค่าเฉลี่ย (Below Avg)</option>
                <option value="below_minus_1_sd">ต่ำกว่า -1 SD (Margin of Safety)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center justify-between">
                <span>P/E Ratio สูงสุด (เท่า)</span>
                <span className="text-xs text-slate-500">PE Max</span>
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="ไม่กรอง"
                value={peMax}
                onChange={(e) => setPeMax(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center justify-between">
                <span>P/BV Ratio สูงสุด (เท่า)</span>
                <span className="text-xs text-slate-500">PBV Max</span>
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="ไม่กรอง"
                value={pbvMax}
                onChange={(e) => setPbvMax(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          {/* Quality Criteria */}
          <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
              <ShieldCheck size={18} className="text-emerald-500" />
              คุณภาพความแข็งแกร่ง (Quality Health)
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center justify-between">
                <span>Piotroski F-Score ขั้นต่ำ (0-9)</span>
                <span className="text-xs text-slate-500" title="> 5 คือแข็งแกร่ง">แนะนำ {'>'}= 6</span>
              </label>
              <input
                type="number"
                min="0"
                max="9"
                placeholder="ไม่กรอง"
                value={fScoreMin}
                onChange={(e) => setFScoreMin(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center justify-between">
                <span>Altman Z-Score ขั้นต่ำ</span>
                <span className="text-xs text-slate-500" title="> 2.99 คือปลอดภัย">แนะนำ {'>'} 2.99</span>
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="ไม่กรอง"
                value={zScoreMin}
                onChange={(e) => setZScoreMin(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center justify-between">
                <span>VI Quality Scorecard (0-20)</span>
                <span className="text-xs text-slate-500" title="> 10 คือผ่านเกณฑ์">แนะนำ {'>'} 10</span>
              </label>
              <input
                type="number"
                min="0"
                max="20"
                placeholder="ไม่กรอง"
                value={viScoreMin}
                onChange={(e) => setViScoreMin(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center justify-between">
                <span>หนี้สินต่อทุน สูงสุด (เท่า)</span>
                <span className="text-xs text-slate-500" title="< 1.0 คือดี">D/E Max</span>
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="ไม่กรอง"
                value={deMax}
                onChange={(e) => setDeMax(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>
        </div>

        <button
          onClick={handleScan}
          disabled={isLoading}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              กำลังสแกน...
            </>
          ) : (
            <>
              <Search size={20} />
              เริ่มสแกนหาหุ้น
            </>
          )}
        </button>
        
        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100 flex items-start gap-2">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

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
            <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-[600px]">
              <table className="w-full text-sm text-left relative">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 align-top sticky top-0 z-20 shadow-sm">
                  <tr>
                    <th className="p-4 font-semibold sticky left-0 bg-slate-50 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-b border-slate-200 border-r border-white">Ticker</th>
                    <th className="p-4 font-semibold text-right border-b border-slate-200 border-r border-white">Price</th>
                    <th className="p-4 font-semibold text-center bg-blue-50/90 border-b border-slate-200 border-r border-white" colSpan={4}>Growth & Returns</th>
                    <th className="p-4 font-semibold text-center bg-orange-50/90 border-b border-slate-200 border-r border-white" colSpan={4}>Valuation</th>
                    <th className="p-4 font-semibold text-center bg-emerald-50/90 border-b border-slate-200" colSpan={4}>Quality</th>
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
