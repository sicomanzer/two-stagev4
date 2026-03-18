import { useState, useEffect } from 'react';
import { LayoutDashboard, Plus, Pencil, Trash2, Bell, BarChart3 } from 'lucide-react';
import { PortfolioGroup, PortfolioItem } from '@/types/portfolio';
import { AppMode } from '@/types/stock';
import PortfolioAnalytics from '@/components/PortfolioAnalytics';
import { getStatus } from '@/lib/calculations';
import TargetPriceModal from './TargetPriceModal';

interface PortfolioViewProps {
  portfolios: PortfolioGroup[];
  currentPortfolioId: string | null;
  setCurrentPortfolioId: (id: string) => void;
  portfolio: PortfolioItem[];
  isLoadingData: boolean;
  openCreateModal: () => void;
  openEditModal: () => void;
  handleDeletePortfolioGroup: (id: string) => void;
  handleManualPriceCheck: () => void;
  showAnalytics: boolean;
  setShowAnalytics: (show: boolean) => void;
  handleDeletePortfolioItem: (id: number) => void;
  setJournalTicker: (ticker: string) => void;
  setMode: (mode: AppMode) => void;
  fetchPortfolioData: () => void;
  onAddTransaction: (ticker: string) => void;
}

export default function PortfolioView({
  portfolios,
  currentPortfolioId,
  setCurrentPortfolioId,
  portfolio,
  isLoadingData,
  openCreateModal,
  openEditModal,
  handleDeletePortfolioGroup,
  handleManualPriceCheck,
  showAnalytics,
  setShowAnalytics,
  handleDeletePortfolioItem,
  setJournalTicker,
  setMode,
  fetchPortfolioData,
  onAddTransaction
}: PortfolioViewProps) {
  
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null);
  const [realHoldings, setRealHoldings] = useState<any[]>([]);

  // Fetch real holdings for analytics
  useEffect(() => {
    const fetchRealHoldings = async () => {
      if (!currentPortfolioId) return;
      try {
        const res = await fetch(`/api/transactions?portfolio_id=${currentPortfolioId}`);
        if (res.ok) {
          const data = await res.json();
          setRealHoldings(data);
        }
      } catch (err) {
        console.error(err);
      }
    };
    
    if (showAnalytics && currentPortfolioId) {
        fetchRealHoldings();
    }
  }, [currentPortfolioId, showAnalytics]); 


  const handleOpenTargetModal = (item: PortfolioItem) => {
    setEditingItem(item);
    setIsTargetModalOpen(true);
  };

  const handleSaveTarget = async (price: number | null) => {
    if (!editingItem) return;

    try {
      await fetch('/api/portfolio', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingItem.id, target_price: price })
      });
      fetchPortfolioData();
    } catch (error) {
      console.error('Error updating target price:', error);
      alert('ไม่สามารถบันทึกราคาเป้าหมายได้');
    } finally {
      setIsTargetModalOpen(false);
      setEditingItem(null);
    }
  };

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-800 text-white flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <LayoutDashboard size={20} />
              <h3 className="font-bold text-lg">Favorites (รายการที่สนใจ)</h3>
            </div>
            
            {/* Portfolio Selector */}
            <div className="flex items-center gap-2">
              <select
                value={currentPortfolioId || ''}
                onChange={(e) => setCurrentPortfolioId(e.target.value)}
                className="bg-slate-700 text-white text-sm rounded-lg px-3 py-1.5 border border-slate-600 outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {portfolios.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <button
                onClick={openCreateModal}
                className="p-1.5 bg-emerald-600 rounded-lg hover:bg-emerald-500 transition-colors"
                title="New Portfolio"
              >
                <Plus size={16} />
              </button>
              {currentPortfolioId && (
                <>
                  <button
                    onClick={openEditModal}
                    className="p-1.5 bg-amber-500 rounded-lg hover:bg-amber-400 transition-colors"
                    title="Rename Portfolio"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleDeletePortfolioGroup(currentPortfolioId)}
                    className="p-1.5 bg-red-600/80 rounded-lg hover:bg-red-500 transition-colors"
                    title="Delete Portfolio"
                  >
                    <Trash2 size={16} />
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
                onClick={handleManualPriceCheck}
                disabled={isLoadingData}
                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
              <Bell size={14} />
              {isLoadingData ? 'Checking...' : 'Check Prices'}
            </button>
            <button
              onClick={() => setShowAnalytics(!showAnalytics)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                showAnalytics ? 'bg-purple-600 hover:bg-purple-500' : 'bg-slate-600 hover:bg-slate-500'
              }`}
            >
              <BarChart3 size={14} />
              {showAnalytics ? 'Hide Analytics' : 'Analytics'}
            </button>
            <span className="text-sm font-medium opacity-80">{portfolio.length} items</span>
          </div>
        </div>

        {/* Portfolio Analytics Dashboard */}
        {showAnalytics && portfolio.length > 0 && (
          <div className="p-6 border-b border-slate-200 animate-in fade-in slide-in-from-top-4 duration-300">
            <PortfolioAnalytics items={portfolio} realHoldings={realHoldings} />
          </div>
        )}
        
        {portfolio.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <p>No items in portfolio yet.</p>
            <button 
              onClick={() => setMode('multi')}
              className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
            >
              Go to Screening
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-slate-700 bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-3 font-bold text-xs uppercase text-slate-500 whitespace-nowrap sticky left-0 bg-slate-50 z-10" rowSpan={2}>Ticker</th>
                  <th className="px-3 py-3 font-bold text-center text-xs uppercase text-slate-500 whitespace-nowrap" rowSpan={2}>Action</th>
                  <th className="px-3 py-3 font-bold text-center text-xs uppercase text-slate-500 whitespace-nowrap" rowSpan={2}>Status</th>
                  <th className="px-3 py-3 font-bold text-right text-xs uppercase text-slate-500 whitespace-nowrap" rowSpan={2}>Price</th>
                  <th className="px-3 py-3 font-bold text-center text-xs uppercase text-slate-500 whitespace-nowrap" rowSpan={2}>Alert Target</th>
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
                {portfolio.map((item, i) => {
                  // Re-evaluate status based on current price (which is saved in DB)
                  // Note: In a real app, we might want to re-fetch live prices here
                  const statusInfo = getStatus(item.current_price || 0, item.mos30_price || 0, item.mos40_price || 0, item.mos50_price || 0, item.fair_price || 0);
                  
                  return (
                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-3 font-bold text-slate-900 text-sm sticky left-0 bg-white">{item.ticker}</td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => onAddTransaction(item.ticker)}
                            className="p-1 rounded-full hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"
                            title="Add to Real Portfolio"
                          >
                            <Plus size={16} />
                          </button>
                          <button
                            onClick={() => handleDeletePortfolioItem(item.id)}
                            className="p-1 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                            title="Remove from Portfolio"
                          >
                            <Trash2 size={16} />
                          </button>
                          <button
                            onClick={() => setJournalTicker(item.ticker)}
                            className="p-1 rounded-full hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors"
                            title="Investment Journal"
                          >
                            <span className="text-sm">📓</span>
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold whitespace-nowrap ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right text-slate-600 text-sm font-medium">{item.current_price ? item.current_price.toFixed(2) : '-'}</td>
                      
                      {/* Custom Target Price */}
                      <td className="px-3 py-3 text-center">
                        <button 
                          onClick={() => handleOpenTargetModal(item)}
                          className={`px-2 py-1 rounded text-xs font-bold transition-colors ${item.target_price ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                          title="Set Custom Target Price"
                        >
                          {item.target_price ? `🎯 ${item.target_price.toFixed(2)}` : '+ Target'}
                        </button>
                      </td>
                      
                      <td className="px-3 py-3 text-right font-bold text-emerald-600 text-sm">{item.fair_price ? item.fair_price.toFixed(2) : '-'}</td>
                      <td className="px-3 py-3 text-right text-slate-500 text-xs">
                        {(item.dividend_yield || item.yield) ? ((item.dividend_yield || item.yield)! * 100).toFixed(2) : '-'}
                      </td>
                      <td className="px-3 py-3 text-right text-slate-500 text-xs">{item.d0 ? item.d0.toFixed(2) : '-'}</td>
                      <td className="px-3 py-3 text-right text-slate-500 text-xs">{item.pe ? item.pe.toFixed(2) : '-'}</td>
                      <td className="px-3 py-3 text-right text-slate-500 text-xs">{item.pbv ? item.pbv.toFixed(2) : '-'}</td>
                      <td className="px-3 py-3 text-right text-slate-500 text-xs">
                        {(item.de || item.debt_to_equity) ? (item.de || item.debt_to_equity)!.toFixed(2) : '-'}
                      </td>
                      <td className="px-3 py-3 text-right text-slate-500 text-xs">{item.roe ? (item.roe * 100).toFixed(2) : '-'}</td>
                      <td className="px-3 py-3 text-right text-slate-500 text-xs">{item.roa ? (item.roa * 100).toFixed(2) : '-'}</td>
                      <td className="px-3 py-3 text-right text-slate-500 text-xs">{item.eps ? item.eps.toFixed(2) : '-'}</td>
                      
                      {/* MOS 30% Data */}
                      <td className="px-3 py-3 text-right text-cyan-700 font-medium text-xs bg-cyan-50/30">{item.mos30_price?.toFixed(2)}</td>
                      <td className="px-3 py-3 text-right text-slate-600 text-xs bg-cyan-50/30">{item.mos30_shares?.toLocaleString()}</td>
                      <td className="px-3 py-3 text-right text-slate-600 text-xs bg-cyan-50/30">{item.mos30_cost?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                      
                      {/* MOS 40% Data */}
                      <td className="px-3 py-3 text-right text-teal-700 font-medium text-xs bg-teal-50/30">{item.mos40_price?.toFixed(2)}</td>
                      <td className="px-3 py-3 text-right text-slate-600 text-xs bg-teal-50/30">{item.mos40_shares?.toLocaleString()}</td>
                      <td className="px-3 py-3 text-right text-slate-600 text-xs bg-teal-50/30">{item.mos40_cost?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>

                      {/* MOS 50% Data */}
                      <td className="px-3 py-3 text-right text-emerald-700 font-medium text-xs bg-emerald-50/30">{item.mos50_price?.toFixed(2)}</td>
                      <td className="px-3 py-3 text-right text-slate-600 text-xs bg-emerald-50/30">{item.mos50_shares?.toLocaleString()}</td>
                      <td className="px-3 py-3 text-right text-slate-600 text-xs bg-emerald-50/30">{item.mos50_cost?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      {/* Target Price Modal */}
      {editingItem && (
        <TargetPriceModal
          isOpen={isTargetModalOpen}
          onClose={() => {
            setIsTargetModalOpen(false);
            setEditingItem(null);
          }}
          onSave={handleSaveTarget}
          ticker={editingItem.ticker}
          currentTarget={editingItem.target_price || null}
        />
      )}
      </div>
    </>
  );
}
