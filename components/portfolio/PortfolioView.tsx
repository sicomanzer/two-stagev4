import React, { useState, useEffect, useMemo } from 'react';
import { LayoutDashboard, Plus, Pencil, Trash2, Bell, BarChart3, ChevronDown, ChevronUp, AlertCircle, BookOpen, Target, Activity } from 'lucide-react';
import { PortfolioGroup, PortfolioItem } from '@/types/portfolio';
import { AppMode } from '@/types/stock';
import PortfolioAnalytics from '@/components/PortfolioAnalytics';
import { getStatus } from '@/lib/calculations';
import TargetPriceModal from './TargetPriceModal';
import FavoritesToolbar, { SortField, SortDir, FilterPreset } from './FavoritesToolbar';
import { InlineNotes, TagsPicker } from './FavoritesExtras';
import CompareModal from './CompareModal';
import StockLogo from '@/components/ui/StockLogo';

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
  portfolios, currentPortfolioId, setCurrentPortfolioId, portfolio,
  isLoadingData, openCreateModal, openEditModal, handleDeletePortfolioGroup,
  handleManualPriceCheck, showAnalytics, setShowAnalytics,
  handleDeletePortfolioItem, setJournalTicker, setMode, fetchPortfolioData, onAddTransaction
}: PortfolioViewProps) {
  
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null);
  const [realHoldings, setRealHoldings] = useState<any[]>([]);
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});

  // ─── NEW: Sort, Filter, Search, Compare ───────
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('upside');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [filterPreset, setFilterPreset] = useState<FilterPreset>('all');
  const [compareMode, setCompareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isCompareOpen, setIsCompareOpen] = useState(false);

  const toggleRow = (id: number) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else if (next.size < 5) next.add(id);
      return next;
    });
  };

  // Fetch real holdings for analytics
  useEffect(() => {
    const fetchRealHoldings = async () => {
      if (!currentPortfolioId) return;
      try {
        const res = await fetch(`/api/transactions?portfolio_id=${currentPortfolioId}`);
        if (res.ok) { const data = await res.json(); setRealHoldings(data); }
      } catch (err) { console.error(err); }
    };
    if (showAnalytics && currentPortfolioId) fetchRealHoldings();
  }, [currentPortfolioId, showAnalytics]); 

  // ─── Sort + Filter + Search Pipeline ───────
  const filteredPortfolio = useMemo(() => {
    let items = [...portfolio];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toUpperCase();
      items = items.filter(i => i.ticker.includes(q) || (i.notes || '').toUpperCase().includes(q));
    }

    // Filter
    if (filterPreset !== 'all') {
      items = items.filter(i => {
        const status = i.status || '';
        const yld = (i.dividend_yield || i.yield || 0) * 100;
        const tags = i.tags || [];
        switch (filterPreset) {
          case 'mos30plus': return status.includes('MOS');
          case 'undervalued': return status.includes('MOS') || status === 'ต่ำกว่า FV';
          case 'high_yield': return yld >= 4;
          case 'ready_buy': return tags.includes('🎯 Ready to Buy');
          default: return true;
        }
      });
    }

    // Sort
    items.sort((a, b) => {
      let va: number = 0, vb: number = 0;
      const getUpside = (i: PortfolioItem) => (i.fair_price && i.current_price && i.current_price > 0) ? ((i.fair_price - i.current_price) / i.current_price) * 100 : -9999;

      switch (sortField) {
        case 'ticker': return sortDir === 'asc' ? a.ticker.localeCompare(b.ticker) : b.ticker.localeCompare(a.ticker);
        case 'upside': va = getUpside(a); vb = getUpside(b); break;
        case 'div_yield': va = (a.dividend_yield || a.yield || 0); vb = (b.dividend_yield || b.yield || 0); break;
        case 'pe': va = a.pe || 9999; vb = b.pe || 9999; break;
        case 'sort_order': va = a.sort_order || 0; vb = b.sort_order || 0; break;
        case 'status':
          const statusOrder: Record<string, number> = { 'MOS 50%': 1, 'MOS 40%': 2, 'MOS 30%': 3, 'ต่ำกว่า FV': 4, 'รอก่อนนะ': 5 };
          va = statusOrder[a.status || ''] || 6; vb = statusOrder[b.status || ''] || 6;
          break;
      }
      return sortDir === 'asc' ? va - vb : vb - va;
    });

    return items;
  }, [portfolio, searchQuery, sortField, sortDir, filterPreset]);

  const handleOpenTargetModal = (item: PortfolioItem) => {
    setEditingItem(item); setIsTargetModalOpen(true);
  };

  const handleSaveTarget = async (price: number | null) => {
    if (!editingItem) return;
    try {
      await fetch('/api/portfolio', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editingItem.id, target_price: price }) });
      fetchPortfolioData();
    } catch (error) { console.error('Error updating target price:', error); alert('ไม่สามารถบันทึกราคาเป้าหมายได้'); }
    finally { setIsTargetModalOpen(false); setEditingItem(null); }
  };

  const handleSaveNotes = async (id: number, notes: string) => {
    try {
      await fetch('/api/portfolio', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, notes }) });
      fetchPortfolioData();
    } catch (err) { console.error(err); }
  };

  const handleSaveTags = async (id: number, tags: string[]) => {
    try {
      await fetch('/api/portfolio', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, tags }) });
      fetchPortfolioData();
    } catch (err) { console.error(err); }
  };

  const compareItems = portfolio.filter(i => selectedIds.has(i.id));

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* ─── Header ─── */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-800 text-white flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <LayoutDashboard size={20} />
              <h3 className="font-bold text-lg">Favorites (รายการที่สนใจ)</h3>
            </div>
            <div className="flex items-center gap-2">
              <select value={currentPortfolioId || ''} onChange={(e) => setCurrentPortfolioId(e.target.value)} className="bg-slate-700 text-white text-sm rounded-lg px-3 py-1.5 border border-slate-600 outline-none focus:ring-1 focus:ring-emerald-500">
                {portfolios.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
              </select>
              <button onClick={openCreateModal} className="p-1.5 bg-emerald-600 rounded-lg hover:bg-emerald-500 transition-colors" title="New Portfolio"><Plus size={16} /></button>
              {currentPortfolioId && (
                <>
                  <button onClick={openEditModal} className="p-1.5 bg-amber-500 rounded-lg hover:bg-amber-400 transition-colors" title="Rename"><Pencil size={16} /></button>
                  <button onClick={() => handleDeletePortfolioGroup(currentPortfolioId)} className="p-1.5 bg-red-600/80 rounded-lg hover:bg-red-500 transition-colors" title="Delete"><Trash2 size={16} /></button>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={handleManualPriceCheck} disabled={isLoadingData} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-bold transition-colors disabled:opacity-50">
              <Bell size={14} /> {isLoadingData ? 'Checking...' : 'Check Prices'}
            </button>
            <button onClick={() => setShowAnalytics(!showAnalytics)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${showAnalytics ? 'bg-purple-600 hover:bg-purple-500' : 'bg-slate-600 hover:bg-slate-500'}`}>
              <BarChart3 size={14} /> {showAnalytics ? 'Hide Analytics' : 'Analytics'}
            </button>
            <span className="text-sm font-medium opacity-80">{filteredPortfolio.length}/{portfolio.length} items</span>
          </div>
        </div>

        {/* ─── Analytics ─── */}
        {showAnalytics && portfolio.length > 0 && (
          <div className="p-6 border-b border-slate-200 animate-in fade-in slide-in-from-top-4 duration-300">
            <PortfolioAnalytics items={portfolio} realHoldings={realHoldings} />
          </div>
        )}

        {/* ─── Toolbar (Sort / Filter / Search / Compare) ─── */}
        {portfolio.length > 0 && (
          <FavoritesToolbar
            searchQuery={searchQuery} setSearchQuery={setSearchQuery}
            sortField={sortField} setSortField={setSortField}
            sortDir={sortDir} setSortDir={setSortDir}
            filterPreset={filterPreset} setFilterPreset={setFilterPreset}
            compareMode={compareMode} setCompareMode={(v) => { setCompareMode(v); if (!v) setSelectedIds(new Set()); }}
            selectedCount={selectedIds.size}
          />
        )}

        {/* ─── Compare bar ─── */}
        {compareMode && selectedIds.size >= 2 && (
          <div className="px-4 py-2 bg-violet-50 border-b border-violet-200 flex items-center justify-between animate-in fade-in duration-200">
            <span className="text-xs font-bold text-violet-700">เลือกแล้ว {selectedIds.size} ตัว (สูงสุด 5)</span>
            <button onClick={() => setIsCompareOpen(true)} className="px-4 py-1.5 bg-violet-600 text-white rounded-lg text-xs font-bold hover:bg-violet-700 transition-colors shadow-sm">
              เปรียบเทียบเลย →
            </button>
          </div>
        )}
        
        {/* ─── Table ─── */}
        {filteredPortfolio.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            {portfolio.length === 0 ? (
              <>
                <p>No items in portfolio yet.</p>
                <button onClick={() => setMode('multi')} className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">Go to Screening</button>
              </>
            ) : (
              <p>ไม่พบหุ้นที่ตรงกับเงื่อนไข — ลองเปลี่ยน filter</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-slate-500 bg-slate-50 border-b border-slate-200 uppercase text-[10px] sm:text-xs">
                <tr>
                  {compareMode && <th className="px-3 py-3 sm:py-4 w-10"></th>}
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
                {filteredPortfolio.map((item) => {
                  const statusInfo = getStatus(item.current_price || 0, item.mos30_price || 0, item.mos40_price || 0, item.mos50_price || 0, item.fair_price || 0);
                  const isExpanded = expandedRows[item.id];
                  const isSelected = selectedIds.has(item.id);
                  const current = item.current_price || 0;
                  const targetMos = item.mos30_price || 0;
                  let progress = 0, dropNeeded = 0;
                  if (current > 0 && targetMos > 0) {
                    if (current <= targetMos) { progress = 100; dropNeeded = 0; }
                    else { progress = (targetMos / current) * 100; dropNeeded = ((current - targetMos) / current) * 100; }
                  }
                  const progressColor = progress >= 100 ? 'bg-emerald-500' : progress >= 85 ? 'bg-amber-400' : 'bg-red-400';
                  let upside = 0;
                  if (item.fair_price && current > 0) upside = ((item.fair_price - current) / current) * 100;

                  return (
                    <React.Fragment key={item.id}>
                      <tr className={`hover:bg-slate-50 transition-colors ${isExpanded ? 'bg-slate-50' : ''} ${isSelected ? 'bg-violet-50/50' : ''}`}>
                        {compareMode && (
                          <td className="px-3 py-3 sm:py-4">
                            <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(item.id)} disabled={!isSelected && selectedIds.size >= 5}
                              className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500 cursor-pointer" />
                          </td>
                        )}
                        <td className="px-4 py-3 sm:py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <StockLogo ticker={item.ticker} />
                            <div>
                              <span className="font-black text-slate-900 text-sm sm:text-base">{item.ticker}</span>
                              {item.notes && <p className="text-[10px] text-amber-600 truncate max-w-[120px]" title={item.notes}>💡 {item.notes}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 sm:py-4 text-right font-black text-slate-800 text-base whitespace-nowrap tabular-nums">{current > 0 ? current.toFixed(2) : '-'}</td>
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
                            ) : <span className="text-slate-400">-</span>}
                            {item.d0 && <span className="text-[9px] text-slate-400 font-bold">฿{item.d0.toFixed(2)}/หุ้น</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 sm:py-4 text-center whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${statusInfo.color}`}>{statusInfo.label}</span>
                        </td>
                        <td className="px-4 py-3 sm:py-4 text-center hidden md:table-cell whitespace-nowrap">
                          <button onClick={() => handleOpenTargetModal(item)} className={`px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all shadow-sm inline-flex items-center justify-center gap-1.5 mx-auto ${item.target_price ? 'bg-orange-100 text-orange-700 hover:bg-orange-200 border border-orange-200' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`} title="Set Custom Target Price">
                            <Target size={12} /> {item.target_price ? `${item.target_price.toFixed(2)}` : 'Set'}
                          </button>
                        </td>
                        <td className="px-4 py-3 sm:py-4 hidden lg:table-cell">
                          <div className="flex flex-col gap-1 w-full mx-auto">
                            <div className="flex justify-between text-[10px] font-bold">
                              <span className="text-slate-400">MOS 30</span>
                              <span className={progress >= 100 ? 'text-emerald-500' : 'text-slate-600'}>{progress >= 100 ? 'REACHED 🎉' : `-${dropNeeded.toFixed(1)}%`}</span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                              <div className={`h-full ${progressColor} transition-all duration-1000 ease-out`} style={{ width: `${Math.min(progress, 100)}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 sm:py-4">
                          <div className="flex items-center justify-center gap-1 sm:gap-2">
                            <button onClick={() => onAddTransaction(item.ticker)} className="p-1.5 rounded-md lg:rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors" title="Add to Real Portfolio"><Plus size={14} /></button>
                            <button onClick={() => setJournalTicker(item.ticker)} className="p-1.5 rounded-md lg:rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors" title="Investment Journal"><BookOpen size={14} /></button>
                            <button onClick={() => handleDeletePortfolioItem(item.id)} className="p-1.5 rounded-md lg:rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors" title="Remove"><Trash2 size={14} /></button>
                          </div>
                        </td>
                        <td className="px-2 py-3 sm:py-4 text-center">
                          <button onClick={() => toggleRow(item.id)} className={`p-1.5 rounded-full transition-colors ${isExpanded ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </td>
                      </tr>
                      
                      {/* ─── Expanded Row ─── */}
                      {isExpanded && (
                        <tr className="bg-slate-50/70 border-b border-slate-200">
                          <td colSpan={compareMode ? 12 : 11} className="p-4 sm:p-6 shadow-inner">
                            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-2 duration-300">
                              
                              {/* 1. Fundamentals + Notes + Tags */}
                              <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm col-span-1">
                                <h4 className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-4 pb-3 border-b border-slate-100">
                                  <Activity size={16} className="text-blue-500" /> Fundamental Health
                                </h4>
                                <div className="grid grid-cols-2 gap-y-5 gap-x-4 text-sm">
                                  <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">P/E Ratio</p><p className={`font-black tracking-tight text-lg ${item.pe && item.pe < 15 ? 'text-emerald-500' : 'text-slate-800'}`}>{item.pe ? item.pe.toFixed(2) : '-'}</p></div>
                                  <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">P/BV</p><p className={`font-black tracking-tight text-lg ${item.pbv && item.pbv < 1.5 ? 'text-emerald-500' : 'text-slate-800'}`}>{item.pbv ? item.pbv.toFixed(2) : '-'}</p></div>
                                  <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">ROE</p><p className={`font-black tracking-tight text-lg ${item.roe && item.roe > 0.15 ? 'text-emerald-500' : 'text-slate-800'}`}>{item.roe ? (item.roe * 100).toFixed(2) + '%' : '-'}</p></div>
                                  <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">ROA</p><p className="font-black tracking-tight text-lg text-slate-800">{item.roa ? (item.roa * 100).toFixed(2) + '%' : '-'}</p></div>
                                  <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">D/E Ratio</p><p className={`font-black tracking-tight text-lg ${(item.de || item.debt_to_equity) && (item.de || item.debt_to_equity)! < 1 ? 'text-emerald-500' : 'text-red-500'}`}>{(item.de || item.debt_to_equity) ? (item.de || item.debt_to_equity)!.toFixed(2) : '-'}</p></div>
                                  <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">EPS</p><p className="font-black tracking-tight text-lg text-slate-800">{item.eps ? item.eps.toFixed(2) : '-'}</p></div>
                                </div>
                                {/* Inline Notes */}
                                <InlineNotes itemId={item.id} notes={item.notes || null} onSave={handleSaveNotes} />
                                {/* Tags */}
                                <TagsPicker itemId={item.id} tags={item.tags || []} onSave={handleSaveTags} />
                              </div>

                              {/* 2. MOS Scenarios */}
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
                                      <div className="flex justify-between text-xs items-center"><span className="text-slate-500 font-medium">Buy Shares</span><span className="font-bold text-slate-700">{item.mos30_shares?.toLocaleString()}</span></div>
                                      <div className="flex justify-between text-xs items-center"><span className="text-slate-500 font-medium">Total Cost</span><span className="font-bold text-slate-700 bg-white px-1.5 py-0.5 rounded border border-cyan-100">฿{item.mos30_cost?.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}</span></div>
                                    </div>
                                  </div>
                                  {/* MOS 40 */}
                                  <div className="bg-teal-50/50 rounded-xl p-4 border border-teal-100 hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-center mb-3">
                                      <span className="text-[10px] font-black text-teal-800 bg-teal-100 px-2 py-1 rounded tracking-wider uppercase">MOS 40%</span>
                                      <span className="text-lg font-black text-teal-700 tabular-nums">฿{item.mos40_price?.toFixed(2)}</span>
                                    </div>
                                    <div className="space-y-1">
                                      <div className="flex justify-between text-xs items-center"><span className="text-slate-500 font-medium">Buy Shares</span><span className="font-bold text-slate-700">{item.mos40_shares?.toLocaleString()}</span></div>
                                      <div className="flex justify-between text-xs items-center"><span className="text-slate-500 font-medium">Total Cost</span><span className="font-bold text-slate-700 bg-white px-1.5 py-0.5 rounded border border-teal-100">฿{item.mos40_cost?.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}</span></div>
                                    </div>
                                  </div>
                                  {/* MOS 50 */}
                                  <div className="bg-emerald-50/70 rounded-xl p-4 border border-emerald-200 hover:shadow-md transition-shadow relative overflow-hidden">
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-400"></div>
                                    <div className="flex justify-between items-center mb-3 pl-1">
                                      <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-2 py-1 rounded tracking-wider uppercase flex items-center gap-1">MOS 50% <span className="text-[8px]">🎯</span></span>
                                      <span className="text-xl font-black text-emerald-700 tabular-nums">฿{item.mos50_price?.toFixed(2)}</span>
                                    </div>
                                    <div className="space-y-1 pl-1">
                                      <div className="flex justify-between text-xs items-center"><span className="text-slate-500 font-medium">Buy Shares</span><span className="font-bold text-emerald-800">{item.mos50_shares?.toLocaleString()}</span></div>
                                      <div className="flex justify-between text-xs items-center"><span className="text-slate-500 font-medium">Total Cost</span><span className="font-bold text-emerald-800 bg-white px-1.5 py-0.5 rounded shadow-sm border border-emerald-100">฿{item.mos50_cost?.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}</span></div>
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
        <TargetPriceModal isOpen={isTargetModalOpen} onClose={() => { setIsTargetModalOpen(false); setEditingItem(null); }} onSave={handleSaveTarget} ticker={editingItem.ticker} currentTarget={editingItem.target_price || null} />
      )}
      </div>

      {/* Compare Modal */}
      <CompareModal isOpen={isCompareOpen} onClose={() => setIsCompareOpen(false)} items={compareItems} />
    </>
  );
}
