import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Plus, Pencil, Trash2, Bell, BarChart3, ChevronDown, ChevronUp, AlertCircle, BookOpen, Target, Activity } from 'lucide-react';
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
const StockLogo = ({ ticker }: { ticker: string }) => {
  const [errorIndex, setErrorIndex] = useState(0);
  const cleanTicker = ticker.replace('.BK', '').trim();

  // Try multiple known public sources for Thai stock logos gracefully
  const logoUrls = [
    `/api/logo?ticker=${cleanTicker}`,
    `https://jitta.com/images/stock/TH/${cleanTicker}.png`,
    `https://s3-symbol-logo.tradingview.com/${cleanTicker.toLowerCase()}--big.svg`,
    `https://logo.clearbit.com/${cleanTicker.toLowerCase()}.co.th`,
    `https://logo.clearbit.com/${cleanTicker.toLowerCase()}.com`
  ];

  if (errorIndex >= logoUrls.length) {
     return (
       <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs shadow-sm shadow-slate-300 flex-shrink-0">
         {cleanTicker.charAt(0)}
       </div>
     );
  }

  return (
    <div className="w-8 h-8 bg-white border border-slate-200 rounded-full shadow-sm flex items-center justify-center flex-shrink-0 overflow-hidden p-0.5">
      <img
        src={logoUrls[errorIndex]}
        alt={cleanTicker}
        className="w-full h-full object-contain"
        onError={() => setErrorIndex(prev => prev + 1)}
      />
    </div>
  );
};

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
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});

  const toggleRow = (id: number) => {
    setExpandedRows(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

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
              <thead className="text-slate-500 bg-slate-50 border-b border-slate-200 uppercase text-[10px] sm:text-xs">
                <tr>
                  <th className="px-4 py-3 sm:py-4 font-bold tracking-wider">Ticker</th>
                  <th className="px-4 py-3 sm:py-4 font-bold tracking-wider text-right">Price</th>
                  <th className="px-4 py-3 sm:py-4 font-bold tracking-wider text-right">Fair Value</th>
                  <th className="px-4 py-3 sm:py-4 font-bold tracking-wider text-center hidden xl:table-cell">Key Ratios</th>
                  <th className="px-4 py-3 sm:py-4 font-bold tracking-wider text-center">Div Yield</th>
                  <th className="px-4 py-3 sm:py-4 font-bold tracking-wider text-center">Status</th>
                  <th className="px-4 py-3 sm:py-4 font-bold tracking-wider text-center hidden md:table-cell">Target</th>
                  <th className="px-4 py-3 sm:py-4 font-bold tracking-wider w-[140px] hidden lg:table-cell">To MOS 30%</th>
                  <th className="px-4 py-3 sm:py-4 font-bold tracking-wider text-center">Actions</th>
                  <th className="px-4 py-3 sm:py-4 font-bold tracking-wider text-center w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {portfolio.map((item) => {
                  const statusInfo = getStatus(item.current_price || 0, item.mos30_price || 0, item.mos40_price || 0, item.mos50_price || 0, item.fair_price || 0);
                  const isExpanded = expandedRows[item.id];
                  
                  // Calculate MOS Distance Progress Bar
                  const current = item.current_price || 0;
                  const targetMos = item.mos30_price || 0;
                  let progress = 0;
                  let dropNeeded = 0;

                  if (current > 0 && targetMos > 0) {
                    if (current <= targetMos) {
                      progress = 100;
                      dropNeeded = 0;
                    } else {
                      progress = (targetMos / current) * 100;
                      dropNeeded = ((current - targetMos) / current) * 100;
                    }
                  }
                  
                  const progressColor = progress >= 100 ? 'bg-emerald-500' : progress >= 85 ? 'bg-amber-400' : 'bg-red-400';
                  
                  // Calculate Upside
                  let upside = 0;
                  if (item.fair_price && current > 0) {
                    upside = ((item.fair_price - current) / current) * 100;
                  }

                  return (
                    <React.Fragment key={item.id}>
                      <tr className={`hover:bg-slate-50 transition-colors ${isExpanded ? 'bg-slate-50' : ''}`}>
                        <td className="px-4 py-3 sm:py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <StockLogo ticker={item.ticker} />
                            <span className="font-black text-slate-900 text-sm sm:text-base">{item.ticker}</span>
                          </div>
                        </td>
                        
                        <td className="px-4 py-3 sm:py-4 text-right font-black text-slate-800 text-base whitespace-nowrap tabular-nums">
                          {current > 0 ? current.toFixed(2) : '-'}
                        </td>
                        
                        <td className="px-4 py-3 sm:py-4 whitespace-nowrap tabular-nums">
                          <div className="flex flex-col items-end justify-center">
                            <span className="font-black text-emerald-600 text-base">{item.fair_price ? item.fair_price.toFixed(2) : '-'}</span>
                            {item.fair_price && current > 0 && (
                              <span className={`text-[10px] font-bold tracking-tight ${upside > 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                                {upside > 0 ? 'UP +' : 'DWN '}{upside.toFixed(1)}%
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3 sm:py-4 text-center hidden xl:table-cell">
                          <div className="flex items-center justify-center gap-3 bg-white border border-slate-200 rounded-lg px-2 py-1.5 shadow-sm inline-flex mx-auto">
                            <div className="flex flex-col items-center">
                              <span className="text-[9px] text-slate-400 font-bold tracking-wider">P/E</span>
                              <span className={`text-[11px] font-black ${item.pe && item.pe < 15 ? 'text-emerald-500' : 'text-slate-700'}`}>{item.pe ? item.pe.toFixed(2) : '-'}</span>
                            </div>
                            <div className="w-px h-5 bg-slate-200"></div>
                            <div className="flex flex-col items-center">
                              <span className="text-[9px] text-slate-400 font-bold tracking-wider">P/BV</span>
                              <span className={`text-[11px] font-black ${item.pbv && item.pbv < 1.5 ? 'text-emerald-500' : 'text-slate-700'}`}>{item.pbv ? item.pbv.toFixed(2) : '-'}</span>
                            </div>
                            <div className="w-px h-5 bg-slate-200"></div>
                            <div className="flex flex-col items-center">
                              <span className="text-[9px] text-slate-400 font-bold tracking-wider">ROE</span>
                              <span className={`text-[11px] font-black ${item.roe && item.roe > 0.15 ? 'text-emerald-500' : 'text-slate-700'}`}>{item.roe ? `${(item.roe * 100).toFixed(1)}%` : '-'}</span>
                            </div>
                            <div className="w-px h-5 bg-slate-200"></div>
                            <div className="flex flex-col items-center">
                              <span className="text-[9px] text-slate-400 font-bold tracking-wider">D/E</span>
                              <span className={`text-[11px] font-black ${(item.de || item.debt_to_equity) && (item.de || item.debt_to_equity)! < 1 ? 'text-emerald-500' : 'text-slate-700'}`}>
                                {(item.de || item.debt_to_equity) ? (item.de || item.debt_to_equity)!.toFixed(2) : '-'}
                              </span>
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-4 py-3 sm:py-4 text-center whitespace-nowrap">
                          <div className="flex flex-col items-center justify-center gap-1">
                            {(item.dividend_yield || item.yield) ? (
                              <span className="bg-slate-100/80 px-2.5 py-1 rounded-md text-[11px] font-bold text-slate-700 inline-block tabular-nums border border-slate-200 shadow-sm">
                                {((item.dividend_yield || item.yield)! * 100).toFixed(2)}%
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                            {item.d0 && (
                              <span className="text-[9px] text-slate-400 font-bold">฿{item.d0.toFixed(2)}/หุ้น</span>
                            )}
                          </div>
                        </td>
                        
                        <td className="px-4 py-3 sm:py-4 text-center whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </td>
                        
                        <td className="px-4 py-3 sm:py-4 text-center hidden md:table-cell whitespace-nowrap">
                           <button 
                              onClick={() => handleOpenTargetModal(item)}
                              className={`px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all shadow-sm inline-flex items-center justify-center gap-1.5 mx-auto ${item.target_price ? 'bg-orange-100 text-orange-700 hover:bg-orange-200 border border-orange-200' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                              title="Set Custom Target Price"
                            >
                              <Target size={12} />
                              {item.target_price ? `${item.target_price.toFixed(2)}` : 'Set'}
                            </button>
                        </td>
                          
                        <td className="px-4 py-3 sm:py-4 hidden lg:table-cell">
                          <div className="flex flex-col gap-1 w-full mx-auto">
                            <div className="flex justify-between text-[10px] font-bold">
                              <span className="text-slate-400">MOS 30</span>
                              <span className={progress >= 100 ? 'text-emerald-500' : 'text-slate-600'}>
                                {progress >= 100 ? 'REACHED 🎉' : `-${dropNeeded.toFixed(1)}%`}
                              </span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                              <div className={`h-full ${progressColor} transition-all duration-1000 ease-out`} style={{ width: `${Math.min(progress, 100)}%` }} />
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3 sm:py-4">
                          <div className="flex items-center justify-center gap-1 sm:gap-2">
                            <button onClick={() => onAddTransaction(item.ticker)} className="p-1.5 rounded-md lg:rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors" title="Add to Real Portfolio">
                              <Plus size={14} className="sm:w-4 sm:h-4" />
                            </button>
                            <button onClick={() => setJournalTicker(item.ticker)} className="p-1.5 rounded-md lg:rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors" title="Investment Journal">
                              <BookOpen size={14} className="sm:w-4 sm:h-4" />
                            </button>
                            <button onClick={() => handleDeletePortfolioItem(item.id)} className="p-1.5 rounded-md lg:rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors" title="Remove from Portfolio">
                              <Trash2 size={14} className="sm:w-4 sm:h-4" />
                            </button>
                          </div>
                        </td>
                        
                        <td className="px-2 py-3 sm:py-4 text-center">
                          <button 
                            onClick={() => toggleRow(item.id)}
                            className={`p-1.5 rounded-full transition-colors ${isExpanded ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                            title="Expand details"
                          >
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </td>
                      </tr>
                      
                      {/* 🔽 EXPANDED ROW CONTENT 🔽 */}
                      {isExpanded && (
                        <tr className="bg-slate-50/70 border-b border-slate-200">
                          <td colSpan={9} className="p-4 sm:p-6 shadow-inner">
                            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-2 duration-300">
                              
                              {/* --- 1. Fundamental Metrics Dashboard --- */}
                              <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm col-span-1 xl:col-span-1">
                                <h4 className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-4 pb-3 border-b border-slate-100">
                                  <Activity size={16} className="text-blue-500" /> Fundamental Health
                                </h4>
                                <div className="grid grid-cols-2 gap-y-5 gap-x-4 text-sm">
                                  <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">P/E Ratio</p>
                                    <p className={`font-black tracking-tight text-lg ${item.pe && item.pe < 15 ? 'text-emerald-500' : 'text-slate-800'}`}>{item.pe ? item.pe.toFixed(2) : '-'}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">P/BV</p>
                                    <p className={`font-black tracking-tight text-lg ${item.pbv && item.pbv < 1.5 ? 'text-emerald-500' : 'text-slate-800'}`}>{item.pbv ? item.pbv.toFixed(2) : '-'}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">ROE</p>
                                    <p className={`font-black tracking-tight text-lg ${item.roe && item.roe > 0.15 ? 'text-emerald-500' : 'text-slate-800'}`}>{item.roe ? (item.roe * 100).toFixed(2) + '%' : '-'}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">ROA</p>
                                    <p className="font-black tracking-tight text-lg text-slate-800">{item.roa ? (item.roa * 100).toFixed(2) + '%' : '-'}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">D/E Ratio</p>
                                    <p className={`font-black tracking-tight text-lg ${(item.de || item.debt_to_equity) && (item.de || item.debt_to_equity)! < 1 ? 'text-emerald-500' : 'text-red-500'}`}>
                                      {(item.de || item.debt_to_equity) ? (item.de || item.debt_to_equity)!.toFixed(2) : '-'}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">EPS</p>
                                    <p className="font-black tracking-tight text-lg text-slate-800">{item.eps ? item.eps.toFixed(2) : '-'}</p>
                                  </div>
                                </div>
                              </div>

                              {/* --- 2. Margin of Safety Scenarios --- */}
                              <div className="bg-white rounded-xl p-5 border border-emerald-100 shadow-sm col-span-1 xl:col-span-2 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -z-10 opacity-60"></div>
                                <h4 className="flex items-center gap-2 text-sm font-bold text-emerald-800 mb-4 pb-3 border-b border-emerald-50">
                                  <AlertCircle size={16} className="text-emerald-500" /> Margin of Safety Scenarios
                                </h4>
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  {/* MOS 30 */}
                                  <div className="bg-cyan-50/50 rounded-xl p-4 border border-cyan-100 hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-center mb-3">
                                      <span className="text-[10px] font-black text-cyan-800 bg-cyan-100 px-2 py-1 rounded tracking-wider uppercase">MOS 30%</span>
                                      <span className="text-lg font-black text-cyan-700 tabular-nums">฿{item.mos30_price?.toFixed(2)}</span>
                                    </div>
                                    <div className="space-y-1">
                                      <div className="flex justify-between text-xs items-center">
                                        <span className="text-slate-500 font-medium tracking-wide">Buy Shares</span>
                                        <span className="font-bold text-slate-700">{item.mos30_shares?.toLocaleString()}</span>
                                      </div>
                                      <div className="flex justify-between text-xs items-center">
                                        <span className="text-slate-500 font-medium tracking-wide">Total Cost</span>
                                        <span className="font-bold text-slate-700 bg-white px-1.5 py-0.5 rounded border border-cyan-100">฿{item.mos30_cost?.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}</span>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* MOS 40 */}
                                  <div className="bg-teal-50/50 rounded-xl p-4 border border-teal-100 hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-center mb-3">
                                      <span className="text-[10px] font-black text-teal-800 bg-teal-100 px-2 py-1 rounded tracking-wider uppercase">MOS 40%</span>
                                      <span className="text-lg font-black text-teal-700 tabular-nums">฿{item.mos40_price?.toFixed(2)}</span>
                                    </div>
                                    <div className="space-y-1">
                                      <div className="flex justify-between text-xs items-center">
                                        <span className="text-slate-500 font-medium tracking-wide">Buy Shares</span>
                                        <span className="font-bold text-slate-700">{item.mos40_shares?.toLocaleString()}</span>
                                      </div>
                                      <div className="flex justify-between text-xs items-center">
                                        <span className="text-slate-500 font-medium tracking-wide">Total Cost</span>
                                        <span className="font-bold text-slate-700 bg-white px-1.5 py-0.5 rounded border border-teal-100">฿{item.mos40_cost?.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* MOS 50 - The Holy Grail */}
                                  <div className="bg-emerald-50/70 rounded-xl p-4 border border-emerald-200 hover:shadow-md transition-shadow relative overflow-hidden">
                                     {/* Accent bar */}
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-400"></div>
                                    <div className="flex justify-between items-center mb-3 pl-1">
                                      <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-2 py-1 rounded tracking-wider uppercase flex items-center gap-1">
                                        MOS 50% <span className="text-[8px]">🎯</span>
                                      </span>
                                      <span className="text-xl font-black text-emerald-700 tabular-nums">฿{item.mos50_price?.toFixed(2)}</span>
                                    </div>
                                    <div className="space-y-1 pl-1">
                                      <div className="flex justify-between text-xs items-center">
                                        <span className="text-slate-500 font-medium tracking-wide">Buy Shares</span>
                                        <span className="font-bold text-emerald-800">{item.mos50_shares?.toLocaleString()}</span>
                                      </div>
                                      <div className="flex justify-between text-xs items-center">
                                        <span className="text-slate-500 font-medium tracking-wide">Total Cost</span>
                                        <span className="font-bold text-emerald-800 bg-white px-1.5 py-0.5 rounded shadow-sm border border-emerald-100">฿{item.mos50_cost?.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
