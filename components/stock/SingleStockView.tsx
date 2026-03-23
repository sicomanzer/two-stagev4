import React, { ReactNode, useState } from 'react';
import { AlertCircle, CheckCircle2, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import StockCharts from '@/components/StockCharts';
import ConsensusDashboard from '@/components/ConsensusDashboard';
import Scorecard from '@/components/Scorecard';
import TrendAnalysisPanel from '@/components/TrendAnalysis';
import ScenarioAnalysisPanel from '@/components/ScenarioAnalysis';
import PeerComparison from '@/components/PeerComparison';
import FScore from '@/components/stock/FScore';
import ZScore from '@/components/stock/ZScore';
import StockLogo from '@/components/ui/StockLogo';
import { 
  ValuationConsensus, 
  StockScorecard, 
  TrendAnalysis, 
  ScenarioAnalysis, 
  DDMResult, 
  StockHistory, 
  RatioBands,
  FScoreResult,
  ZScoreResult,
  InvestmentSignal
} from '@/types/stock';

interface SingleStockViewProps {
  children?: ReactNode;
  result: DDMResult | null;
  ticker: string;
  currentPrice: number | null;
  stockHistory: StockHistory[];
  ratioBands: RatioBands | null;
  consensus: ValuationConsensus | null;
  scorecard: StockScorecard | null;
  fScore: FScoreResult | null;
  zScore: ZScoreResult | null;
  trendAnalysis: TrendAnalysis | null;
  scenarioAnalysis: ScenarioAnalysis | null;
  investmentSignal: InvestmentSignal | null;
  error: string | null;
  onSelectPeerTicker: (ticker: string) => void;
}

export default function SingleStockView({
  children,
  result,
  ticker,
  currentPrice,
  stockHistory,
  ratioBands,
  consensus,
  scorecard,
  fScore,
  zScore,
  trendAnalysis,
  scenarioAnalysis,
  investmentSignal,
  error,
  onSelectPeerTicker
}: SingleStockViewProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start space-x-3 text-red-700">
        <AlertCircle className="shrink-0 mt-0.5" size={20} />
        <div>
          <h3 className="font-semibold">เกิดข้อผิดพลาด</h3>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  // if (!result && stockHistory.length === 0) {
  //   return (
  //     <div className="bg-white rounded-2xl p-12 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-slate-400 text-center h-full min-h-[400px]">
  //       <div className="mb-4 opacity-20">
  //           <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trending-up"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
  //       </div>
  //       <p>กรอกข้อมูลและกดคำนวณเพื่อดูผลลัพธ์รายตัว</p>
  //     </div>
  //   );
  // }

  const latestData = stockHistory[stockHistory.length - 1];
  
  // Find the latest valid values by checking in reverse (so we don't get N/A if the current year hasn't reported yet)
  const latestPe = stockHistory.slice().reverse().find(d => d.pe !== null && d.pe !== undefined)?.pe;
  const latestPbv = stockHistory.slice().reverse().find(d => d.pbv !== null && d.pbv !== undefined)?.pbv;
  const latestRoe = stockHistory.slice().reverse().find(d => d.roe !== null && d.roe !== undefined)?.roe;
  const latestEps = stockHistory.slice().reverse().find(d => d.eps !== null && d.eps !== undefined)?.eps;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      
      {/* 1. EXECUTIVE HEADER: Stock Profile & Quick Stats  */}
      {(stockHistory.length > 0) && (
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 flex flex-col xl:flex-row xl:items-center justify-between gap-6 relative overflow-hidden">
          {/* subtle background decor */}
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-slate-50 rounded-full blur-3xl opacity-50 z-0"></div>
          
          <div className="flex items-center gap-5 z-10">
            <StockLogo ticker={ticker} size="xl" />
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">{ticker}</h1>
                <span className="px-2.5 py-1 bg-slate-100 text-slate-600 font-bold text-[10px] rounded-md tracking-wider border border-slate-200">
                  {ticker.includes('-') ? 'CRYPTO/FX' : 'STOCK'}
                </span>
              </div>
              <p className="text-slate-500 font-medium text-sm mt-0.5">Stock Analysis & Valuation Cockpit</p>
            </div>
          </div>

          {currentPrice && (
             <div className="flex flex-col xl:items-end z-10">
               <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Current Price</span>
               <div className="flex items-baseline gap-2">
                 <span className="text-4xl font-black text-slate-800 tracking-tighter">{currentPrice.toFixed(2)}</span>
                 <span className="text-sm font-bold text-slate-500">THB</span>
               </div>
             </div>
          )}
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 z-10">
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-center min-w-[90px]">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">P/E</p>
              <p className="text-sm font-black text-slate-700">{latestPe !== undefined && latestPe !== null ? latestPe.toFixed(2) : 'N/A'}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-center min-w-[90px]">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">P/BV</p>
              <p className="text-sm font-black text-slate-700">{latestPbv !== undefined && latestPbv !== null ? latestPbv.toFixed(2) : 'N/A'}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-center min-w-[90px]">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">ROE</p>
              <p className="text-sm font-black text-emerald-600">{latestRoe !== undefined && latestRoe !== null ? latestRoe.toFixed(1) + '%' : 'N/A'}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-center min-w-[90px]">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">EPS</p>
              <p className="text-sm font-black text-blue-600">{latestEps !== undefined && latestEps !== null ? latestEps.toFixed(2) : 'N/A'}</p>
            </div>
          </div>
        </div>
      )}

      {/* MAIN LAYOUT: Split Top Section (Charts vs Sidebar) */}
      <div className="grid grid-cols-12 gap-6 items-start">
        


        {/* RIGHT COLUMN: Sidebar (Input, Result, Table, Consensus) (33%) */}
        <div className="col-span-12 xl:col-span-4 flex flex-col gap-6 xl:order-last">
           {/* 1. Input Form (Passed as Children) */}
           {children}

           {/* 2. Fair Price Card */}
           {result && (
            <div className="bg-emerald-600 rounded-2xl p-3 shadow-sm border border-emerald-500 text-white flex flex-col justify-between relative overflow-hidden group min-h-[150px]">
              {/* Decorators */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-500/40 transition-colors"></div>
              <div className="absolute bottom-0 left-0 w-40 h-40 bg-black/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"></div>
              
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-emerald-100 font-medium text-xs uppercase tracking-wider">Fair Value</p>
                    <h3 className="text-xl font-bold mt-0.5">มูลค่าที่เหมาะสม</h3>
                  </div>
                  <div className="bg-white/20 p-1 rounded-lg backdrop-blur-sm">
                    <span className="text-xl">🏷️</span>
                  </div>
                </div>
                
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl lg:text-4xl font-black tracking-tight">{result.fairPrice.toFixed(2)}</span>
                  <span className="text-base text-emerald-200 font-medium">บาท</span>
                </div>
              </div>

              <div className="relative z-10 mt-2.5 space-y-1.5">
                {result.currentPrice && (
                  <div className="bg-black/10 rounded-xl p-2 backdrop-blur-sm">
                    <div className="flex justify-between items-center mt-1 pt-1 border-t border-white/10">
                      <span className="text-emerald-100 text-xs">Margin of Safety</span>
                      <span className={`text-xl font-black ${
                        (result.margin || 0) > 0 ? 'text-white' : 'text-emerald-200'
                      }`}>
                         {(result.margin || 0) > 0 ? '+' : ''}{(result.margin || 0).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                )}

                <div className={`py-1.5 px-2.5 rounded-lg flex items-center justify-center gap-2 font-bold text-sm shadow-lg transform transition-transform ${
                    result.status === 'Undervalued' ? 'bg-white text-emerald-700' :
                    result.status === 'Overvalued' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'
                }`}>
                    {result.status === 'Undervalued' && <CheckCircle2 size={16} />}
                    {result.status === 'Overvalued' && <XCircle size={16} />}
                    {result.status === 'Fair' && <AlertCircle size={16} />}
                    <span>{result.status.toUpperCase()}</span>
                </div>
              </div>
            </div>
           )}

           {result && investmentSignal && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">Signal</p>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">คำแนะนำรวมทุกมิติ</h3>
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                  investmentSignal.action === 'BUY'
                    ? 'bg-emerald-100 text-emerald-700'
                    : investmentSignal.action === 'HOLD'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-red-100 text-red-700'
                }`}>
                  {investmentSignal.action}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase">Score</p>
                  <p className="text-lg font-extrabold text-slate-800 mt-0.5">{investmentSignal.score.toFixed(0)}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase">Confidence</p>
                  <p className="text-lg font-extrabold text-slate-800 mt-0.5">{investmentSignal.confidence}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase">DDM</p>
                  <p className="text-lg font-extrabold text-slate-800 mt-0.5">{result.recommendation}</p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-5 gap-1.5">
                <SignalPill label="Val" value={investmentSignal.valuationScore} />
                <SignalPill label="Qlt" value={investmentSignal.qualityScore} />
                <SignalPill label="Risk" value={investmentSignal.riskScore} />
                <SignalPill label="Trend" value={investmentSignal.momentumScore} />
                <SignalPill label="Scn" value={investmentSignal.scenarioScore} />
              </div>

              {investmentSignal.reasons.length > 0 && (
                <div className="mt-3 space-y-1">
                  {investmentSignal.reasons.map((reason, idx) => (
                    <p key={`${reason}-${idx}`} className="text-[11px] text-slate-600 leading-relaxed">
                      • {reason}
                    </p>
                  ))}
                </div>
              )}
            </div>
           )}

           {/* 3. Assumption Table */}
           {result && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-4 py-2 border-b border-slate-200 bg-[#4472C4] text-white flex justify-between items-center">
                <h3 className="font-bold text-sm">{result.ticker}</h3>
                <span className="text-xs font-medium opacity-80">Assumption</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="text-slate-700 bg-[#E9EBF5] border-b border-slate-300">
                    <tr>
                      <th className="px-3 py-1.5 font-bold">Year</th>
                      <th className="px-3 py-1.5 font-bold text-right">Div</th>
                      <th className="px-3 py-1.5 font-bold text-right">PV</th>
                      <th className="px-3 py-1.5 font-bold text-right">Gr%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.tableData.map((row, i) => (
                      <tr key={i} className={`border-b border-slate-200 last:border-0 ${
                        row.isTerminal ? 'bg-slate-50 font-medium' : 'bg-white'
                      }`}>
                        <td className="px-3 py-1.5 text-slate-900">{row.year}</td>
                        <td className="px-3 py-1.5 text-right text-slate-800">
                          {row.dividend !== null ? row.dividend.toFixed(2) : ''}
                        </td>
                        <td className="px-3 py-1.5 text-right text-slate-800">
                          {row.pv !== null ? row.pv.toFixed(2) : ''}
                        </td>
                        <td className="px-3 py-1.5 text-right text-slate-800">
                          {row.growth !== null ? `${(row.growth * 100).toFixed(0)}%` : ''}
                          {row.isTerminal && ' ✚'}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-[#70AD47] text-white font-bold">
                      <td className="px-3 py-1.5">Fair Price</td>
                      <td className="px-3 py-1.5 text-right" colSpan={3}>{result.fairPrice.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
           )}

           {/* 4. Peer Comparison */}
           {result && ticker && (
             <PeerComparison mainTicker={ticker} onSelectTicker={onSelectPeerTicker} />
           )}
        </div>

        {/* LEFT COLUMN: Charts (66%) */}
        <div className="col-span-12 xl:col-span-8 space-y-6 xl:order-first">
           {stockHistory.length > 0 ? (
             <StockCharts history={stockHistory} ratioBands={ratioBands || undefined} ticker={ticker} />
           ) : (
             <div className="bg-white rounded-2xl p-12 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-slate-400 text-center h-full min-h-[400px]">
                <div className="mb-4 opacity-20">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trending-up"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
                </div>
                <p>กรอกข้อมูลและกดคำนวณเพื่อดูผลลัพธ์รายตัว</p>
              </div>
           )}
        </div>
      </div>

      {/* --- ADVANCED ANALYTICS TOGGLE --- */}
      {result && (
        <div className="flex justify-center pt-4">
          <button 
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-full shadow-sm text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
          >
            {showAdvanced ? (
              <>ซ่อนข้อมูลวิเคราะห์เชิงลึก <ChevronUp size={18} /></>
            ) : (
              <>ดูข้อมูลวิเคราะห์เชิงลึกเพิ่มเติม <ChevronDown size={18} /></>
            )}
          </button>
        </div>
      )}

      {/* --- LEVEL 3: Deep Dive Quality Dashboard --- */}
      {result && showAdvanced && (
        <div className="space-y-4 pt-6 mt-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-2 mb-2 pl-2 border-l-4 border-indigo-500">
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Quality & Safety Dashboard</h2>
            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-md border border-indigo-100 shadow-sm">Deep Dive</span>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {fScore && <FScore fScore={fScore} />}
            {zScore && <ZScore zScore={zScore} />}
            {scorecard && <Scorecard scorecard={scorecard} />}
          </div>
        </div>
      )}

      {/* --- LEVEL 4: Advanced Analytics --- */}
      {result && showAdvanced && (
        <div className="space-y-4 pt-6 mt-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-2 mb-2 pl-2 border-l-4 border-blue-500">
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Advanced Analytics</h2>
            <span className="px-2.5 py-1 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-md border border-blue-100 shadow-sm">Pro Tools</span>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {scenarioAnalysis && <ScenarioAnalysisPanel analysis={scenarioAnalysis} />}
            {consensus && (
              <ConsensusDashboard consensus={consensus} ticker={ticker} />
            )}
            {trendAnalysis && <TrendAnalysisPanel analysis={trendAnalysis} />}
          </div>
        </div>
      )}

      {/* 5. Detailed Calculation Table - REMOVED per user request */}

    </div>
  );
}

function SignalPill({ label, value }: { label: string; value: number | null }) {
  const score = value ?? 0;
  const tone = value === null
    ? 'bg-slate-100 text-slate-400'
    : score >= 70
      ? 'bg-emerald-100 text-emerald-700'
      : score >= 50
        ? 'bg-amber-100 text-amber-700'
        : 'bg-red-100 text-red-700';

  return (
    <div className={`rounded-md px-1.5 py-1 text-center ${tone}`}>
      <p className="text-[9px] font-semibold uppercase">{label}</p>
      <p className="text-xs font-extrabold mt-0.5">{value === null ? '-' : value.toFixed(0)}</p>
    </div>
  );
}
