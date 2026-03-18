import { Trash2, Save, TrendingUp, AlertCircle } from 'lucide-react';
import { ScreeningResult } from '@/types/stock';

interface MultiScreeningViewProps {
  multiResults: any[]; // Using any[] for now as ScreeningResult might not match exactly what's being passed in page.tsx yet
  error: string | null;
  isLoadingData: boolean;
  handleSaveToPortfolio: (item: any) => void;
  handleSaveAllToPortfolio: (items: any[]) => void;
  setMultiResults: (results: any[]) => void;
}

export default function MultiScreeningView({
  multiResults,
  error,
  isLoadingData,
  handleSaveToPortfolio,
  handleSaveAllToPortfolio,
  setMultiResults
}: MultiScreeningViewProps) {

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

  if (multiResults.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-12 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-slate-400 text-center h-full min-h-[400px]">
        <TrendingUp size={48} className="mb-4 opacity-20" />
        <p>ระบุรายชื่อหุ้นและกดสแกนเพื่อเปรียบเทียบมูลค่า</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="px-6 py-4 border-b border-slate-200 bg-emerald-600 text-white flex justify-between items-center">
        <h3 className="font-bold text-lg">Stock Screening Results</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setMultiResults([])}
            className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-white rounded-lg text-xs font-bold transition-colors"
          >
            <Trash2 size={14} />
            Clear
          </button>
          <button
            onClick={() => handleSaveAllToPortfolio(multiResults)}
            disabled={multiResults.length === 0}
            className="flex items-center gap-2 px-3 py-1.5 bg-white text-emerald-600 hover:bg-emerald-50 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={14} />
            Save All ({multiResults.length})
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-slate-700 bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-3 py-3 font-bold text-xs uppercase text-slate-500 whitespace-nowrap sticky left-0 bg-slate-50 z-10" rowSpan={2}>Ticker</th>
              <th className="px-3 py-3 font-bold text-center text-xs uppercase text-slate-500 whitespace-nowrap" rowSpan={2}>Status</th>
              <th className="px-3 py-3 font-bold text-center text-xs uppercase text-slate-500 whitespace-nowrap" rowSpan={2}>Save</th>
              <th className="px-3 py-3 font-bold text-right text-xs uppercase text-slate-500 whitespace-nowrap" rowSpan={2}>Price</th>
              <th className="px-3 py-3 font-bold text-right text-xs uppercase text-slate-500 whitespace-nowrap" rowSpan={2}>Fair Price</th>
              <th className="px-3 py-3 font-bold text-right text-xs uppercase text-slate-500 whitespace-nowrap" rowSpan={2}>Div Yld %</th>
              <th className="px-3 py-3 font-bold text-right text-xs uppercase text-slate-500 whitespace-nowrap" rowSpan={2}>D0 (Baht)</th>
              <th className="px-3 py-3 font-bold text-right text-xs uppercase text-slate-500 whitespace-nowrap" rowSpan={2}>P/E</th>
              <th className="px-3 py-3 font-bold text-right text-xs uppercase text-slate-500 whitespace-nowrap" rowSpan={2}>P/BV</th>
              <th className="px-3 py-3 font-bold text-right text-xs uppercase text-slate-500 whitespace-nowrap" rowSpan={2}>D/E</th>
              <th className="px-3 py-3 font-bold text-right text-xs uppercase text-slate-500 whitespace-nowrap" rowSpan={2}>ROE %</th>
              <th className="px-3 py-3 font-bold text-right text-xs uppercase text-slate-500 whitespace-nowrap" rowSpan={2}>ROA %</th>
              <th className="px-3 py-3 font-bold text-right text-xs uppercase text-slate-500 whitespace-nowrap" rowSpan={2}>EPS</th>
              
              {/* MOS 30% */}
              <th className="px-3 py-3 font-bold text-center text-xs uppercase text-white bg-cyan-600 whitespace-nowrap" colSpan={3}>MOS 30%</th>
              
              {/* MOS 40% */}
              <th className="px-3 py-3 font-bold text-center text-xs uppercase text-white bg-teal-600 whitespace-nowrap" colSpan={3}>MOS 40%</th>
              
              {/* MOS 50% */}
              <th className="px-3 py-3 font-bold text-center text-xs uppercase text-white bg-emerald-600 whitespace-nowrap" colSpan={3}>MOS 50%</th>
            </tr>
            <tr className="bg-slate-100 text-xs text-slate-500">
              {/* Sub-headers for MOS */}
              <th className="px-2 py-1 text-center bg-cyan-50 text-cyan-800 font-semibold border-r border-cyan-100">Buy<br/>Price</th>
              <th className="px-2 py-1 text-center bg-cyan-50 text-cyan-800 font-semibold border-r border-cyan-100">Shares</th>
              <th className="px-2 py-1 text-center bg-cyan-50 text-cyan-800 font-semibold">Cost</th>
              
              <th className="px-2 py-1 text-center bg-teal-50 text-teal-800 font-semibold border-r border-teal-100">Buy<br/>Price</th>
              <th className="px-2 py-1 text-center bg-teal-50 text-teal-800 font-semibold border-r border-teal-100">Shares</th>
              <th className="px-2 py-1 text-center bg-teal-50 text-teal-800 font-semibold">Cost</th>
              
              <th className="px-2 py-1 text-center bg-emerald-50 text-emerald-800 font-semibold border-r border-emerald-100">Buy<br/>Price</th>
              <th className="px-2 py-1 text-center bg-emerald-50 text-emerald-800 font-semibold border-r border-emerald-100">Shares</th>
              <th className="px-2 py-1 text-center bg-emerald-50 text-emerald-800 font-semibold">Cost</th>
            </tr>
          </thead>
          <tbody>
            {multiResults.map((res: any, i: number) => (
              <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="px-3 py-3 font-bold text-slate-900 text-sm sticky left-0 bg-white">{res.ticker}</td>
                <td className="px-3 py-3 text-center">
                  <span className={`px-2 py-1 rounded text-[10px] font-bold whitespace-nowrap ${res.statusColor}`}>
                    {res.statusLabel}
                  </span>
                </td>
                <td className="px-3 py-3 text-center">
                  <button
                    onClick={() => handleSaveToPortfolio(res)}
                    className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-emerald-600 transition-colors"
                    title="Save to Portfolio"
                  >
                    <Save size={16} />
                  </button>
                </td>
                <td className="px-3 py-3 text-right text-slate-600 text-sm font-medium">{res.currentPrice ? res.currentPrice.toFixed(2) : '-'}</td>
                <td className="px-3 py-3 text-right font-bold text-emerald-600 text-sm">{res.fairPrice > 0 ? res.fairPrice.toFixed(2) : 'N/A'}</td>
                <td className="px-3 py-3 text-right text-slate-500 text-xs">{res.dividendYield ? (res.dividendYield * 100).toFixed(2) : '-'}</td>
                <td className="px-3 py-3 text-right text-slate-600 text-sm">{res.d0 ? res.d0.toFixed(2) : '-'}</td>
                <td className="px-3 py-3 text-right text-slate-500 text-xs">{res.pe ? res.pe.toFixed(2) : '-'}</td>
                <td className="px-3 py-3 text-right text-slate-500 text-xs">{res.pbv ? res.pbv.toFixed(2) : '-'}</td>
                <td className="px-3 py-3 text-right text-slate-500 text-xs">{res.debtToEquity ? res.debtToEquity.toFixed(2) : '-'}</td>
                <td className="px-3 py-3 text-right text-slate-500 text-xs">{res.roe ? (res.roe * 100).toFixed(2) : '-'}</td>
                <td className="px-3 py-3 text-right text-slate-500 text-xs">{res.roa ? (res.roa * 100).toFixed(2) : '-'}</td>
                <td className="px-3 py-3 text-right text-slate-500 text-xs">{res.eps ? res.eps.toFixed(2) : '-'}</td>
                
                {/* MOS 30% Data */}
                <td className="px-3 py-3 text-right text-cyan-700 font-medium text-xs bg-cyan-50/30">{res.mos30Price?.toFixed(2)}</td>
                <td className="px-3 py-3 text-right text-slate-600 text-xs bg-cyan-50/30">{res.shares30?.toLocaleString()}</td>
                <td className="px-3 py-3 text-right text-slate-600 text-xs bg-cyan-50/30">{res.cost30?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                
                {/* MOS 40% Data */}
                <td className="px-3 py-3 text-right text-teal-700 font-medium text-xs bg-teal-50/30">{res.mos40Price?.toFixed(2)}</td>
                <td className="px-3 py-3 text-right text-slate-600 text-xs bg-teal-50/30">{res.shares40?.toLocaleString()}</td>
                <td className="px-3 py-3 text-right text-slate-600 text-xs bg-teal-50/30">{res.cost40?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>

                {/* MOS 50% Data */}
                <td className="px-3 py-3 text-right text-emerald-700 font-medium text-xs bg-emerald-50/30">{res.mos50Price?.toFixed(2)}</td>
                <td className="px-3 py-3 text-right text-slate-600 text-xs bg-emerald-50/30">{res.shares50?.toLocaleString()}</td>
                <td className="px-3 py-3 text-right text-slate-600 text-xs bg-emerald-50/30">{res.cost50?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}