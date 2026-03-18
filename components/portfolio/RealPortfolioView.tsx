import React, { useState, useEffect } from 'react';
import { Briefcase, Plus, Settings, PieChart, List, RefreshCw } from 'lucide-react';
import TransactionListModal from './TransactionListModal';
import PortfolioDividendAnalysis from './PortfolioDividendAnalysis';
import { PortfolioGroup } from '@/types/portfolio';
import { useRealPortfolio } from '@/hooks/useRealPortfolio';

interface RealPortfolioViewProps {
  currentPortfolioId: string;
  portfolios: PortfolioGroup[];
  setCurrentPortfolioId: (id: string) => void;
  onOpenModal: (ticker?: string) => void;
  refreshTrigger: number;
}

export default function RealPortfolioView({ 
  currentPortfolioId, 
  portfolios, 
  setCurrentPortfolioId,
  onOpenModal,
  refreshTrigger
}: RealPortfolioViewProps) {
  const { holdings, summary, isLoading, fetchHoldings } = useRealPortfolio(currentPortfolioId);
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [selectedTicker, setSelectedTicker] = useState<string>('');
  const [viewMode, setViewMode] = useState<'table' | 'analysis'>('table');

  useEffect(() => {
    if (currentPortfolioId) {
      fetchHoldings();
    } else if (portfolios.length > 0) {
      // Auto-select first portfolio if none selected
      setCurrentPortfolioId(portfolios[0].id);
    }
  }, [currentPortfolioId, portfolios, fetchHoldings, setCurrentPortfolioId]);

  // Refetch when external trigger changes
  useEffect(() => {
    if (refreshTrigger > 0 && currentPortfolioId) {
      fetchHoldings();
    }
  }, [refreshTrigger, currentPortfolioId, fetchHoldings]);

  const handleManage = (ticker: string) => {
    setSelectedTicker(ticker);
    setIsListModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header & Actions */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-2.5 rounded-xl text-blue-600">
            <Briefcase size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Real Portfolio</h2>
            <p className="text-slate-500 text-xs">ติดตามพอร์ตการลงทุนจริงและกำไร/ขาดทุน</p>
          </div>
        </div>
        
        <div className="flex gap-3">
            {/* View Mode Toggle Removed per user request */}

            <select
                value={currentPortfolioId || ''}
                onChange={(e) => setCurrentPortfolioId(e.target.value)}
                className="bg-slate-50 text-slate-700 text-sm font-medium rounded-xl px-4 py-2 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
            >
                {portfolios.length === 0 && <option value="">No Portfolio</option>}
                {portfolios.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                ))}
            </select>

            <button
                onClick={() => fetchHoldings()}
                disabled={isLoading || !currentPortfolioId}
                className={`p-2 rounded-xl transition-all ${isLoading ? 'bg-slate-100 text-slate-400' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-blue-600 border border-slate-200'}`}
                title="Refresh Data"
            >
                <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
            </button>

            <button
            onClick={() => onOpenModal()}
            disabled={!currentPortfolioId}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
            <Plus size={18} />
            เพิ่มรายการซื้อ/ขาย
            </button>
        </div>
      </div>

      {/* Summary Cards (Only show in Table Mode) */}
      {viewMode === 'table' && (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">มูลค่าพอร์ตปัจจุบัน</p>
          <p className="text-2xl font-bold text-slate-800">฿{summary.marketValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p className="text-xs text-slate-500 mt-1">ทุนรวม: ฿{summary.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Unrealized P/L</p>
          <div className={`flex items-end gap-2 ${summary.unrealizedPL >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            <p className="text-2xl font-bold">
              {summary.unrealizedPL > 0 ? '+' : ''}{summary.unrealizedPL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            {summary.totalCost > 0 && (
                <span className="text-sm font-bold mb-1">
                    ({((summary.unrealizedPL / summary.totalCost) * 100).toFixed(2)}%)
                </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">กำไร/ขาดทุน ทางบัญชี</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Realized P/L</p>
          <div className={`flex items-end gap-2 ${summary.realizedPL >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            <p className="text-2xl font-bold">
              {summary.realizedPL > 0 ? '+' : ''}{summary.realizedPL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <p className="text-xs text-slate-400 mt-1">กำไร/ขาดทุน ที่เกิดขึ้นจริง</p>
        </div>
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-5 rounded-2xl text-white shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total P/L</p>
          <div className={`flex items-end gap-2 ${summary.totalPL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            <p className="text-2xl font-bold">
              {summary.totalPL > 0 ? '+' : ''}{summary.totalPL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <p className="text-xs text-slate-500 mt-1">กำไรสุทธิรวมทั้งหมด</p>
        </div>
      </div>
      )}

      {/* Main Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-slate-500 bg-slate-50 border-b border-slate-200 text-xs uppercase font-bold">
              <tr>
                <th className="px-6 py-1.5">Symbol</th>
                <th className="px-6 py-1.5 text-right">Actual Vol</th>
                <th className="px-6 py-1.5 text-right">Avg Cost</th>
                <th className="px-6 py-1.5 text-right">Mkt Price</th>
                <th className="px-6 py-1.5 text-right">Cost Value</th>
                <th className="px-6 py-1.5 text-right">Market Value</th>
                <th className="px-6 py-1.5 text-right">Unrealized P/L</th>
                <th className="px-6 py-1.5 text-right">% Unrealized</th>
                <th className="px-6 py-1.5 text-right">Realized P/L</th>
                <th className="px-6 py-1.5 text-center">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                    <td colSpan={10} className="px-6 py-8 text-center text-slate-400">Loading portfolio data...</td>
                </tr>
              ) : holdings.length === 0 ? (
                <tr>
                    <td colSpan={10} className="px-6 py-8 text-center text-slate-400">
                        <div className="flex flex-col items-center gap-2">
                            <Briefcase size={32} className="opacity-20" />
                            <p>ยังไม่มีรายการในพอร์ตนี้</p>
                            {currentPortfolioId && <button onClick={() => onOpenModal()} className="text-emerald-600 font-bold hover:underline">เริ่มบันทึกรายการแรก</button>}
                        </div>
                    </td>
                </tr>
              ) : (
                holdings.map((h, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-1.5 font-bold text-slate-900">{h.ticker}</td>
                    <td className="px-6 py-1.5 text-right font-medium">{h.actualVol.toLocaleString()}</td>
                    <td className="px-6 py-1.5 text-right text-slate-600">{h.avgCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-6 py-1.5 text-right font-bold text-slate-800">{h.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-6 py-1.5 text-right text-slate-500">{h.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-6 py-1.5 text-right font-bold text-slate-800">{h.marketValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className={`px-6 py-1.5 text-right font-bold ${h.unrealizedPL >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {h.unrealizedPL > 0 ? '+' : ''}{h.unrealizedPL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className={`px-6 py-1.5 text-right font-bold ${h.percentUnrealizedPL >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {h.percentUnrealizedPL > 0 ? '+' : ''}{h.percentUnrealizedPL.toFixed(2)}%
                    </td>
                    <td className={`px-6 py-1.5 text-right font-medium ${h.realizedPL >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {h.realizedPL !== 0 ? (h.realizedPL > 0 ? '+' : '') + h.realizedPL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                    </td>
                    <td className="px-6 py-1.5 text-center">
                        <button
                            onClick={() => handleManage(h.ticker)}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                            title="จัดการรายการ"
                        >
                            <Settings size={14} />
                        </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <TransactionListModal
        isOpen={isListModalOpen}
        onClose={() => setIsListModalOpen(false)}
        portfolioId={currentPortfolioId}
        ticker={selectedTicker}
      />
    </div>
  );
}
