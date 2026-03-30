import React from 'react';
import { Search, SlidersHorizontal, ArrowUpDown, X, GitCompareArrows } from 'lucide-react';

export type SortField = 'ticker' | 'upside' | 'div_yield' | 'pe' | 'status' | 'sort_order';
export type SortDir = 'asc' | 'desc';
export type FilterPreset = 'all' | 'mos30plus' | 'undervalued' | 'high_yield' | 'ready_buy';

export const TAG_OPTIONS = [
  { value: '📈 Growth', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: '💰 High Div', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { value: '🏦 Bank', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: '⚡ Turnaround', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: '🎯 Ready to Buy', color: 'bg-red-100 text-red-700 border-red-200' },
  { value: '👀 Watching', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  { value: '🏭 Industrial', color: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
  { value: '🛡️ Defensive', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
];

export function getTagStyle(tag: string) {
  return TAG_OPTIONS.find(t => t.value === tag)?.color || 'bg-slate-100 text-slate-600 border-slate-200';
}

interface FavoritesToolbarProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  sortField: SortField;
  setSortField: (f: SortField) => void;
  sortDir: SortDir;
  setSortDir: (d: SortDir) => void;
  filterPreset: FilterPreset;
  setFilterPreset: (f: FilterPreset) => void;
  compareMode: boolean;
  setCompareMode: (v: boolean) => void;
  selectedCount: number;
}

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'sort_order', label: 'Manual' },
  { value: 'upside', label: 'Upside %' },
  { value: 'div_yield', label: 'Div Yield' },
  { value: 'pe', label: 'P/E' },
  { value: 'ticker', label: 'Ticker' },
  { value: 'status', label: 'Status' },
];

const FILTER_OPTIONS: { value: FilterPreset; label: string; icon: string }[] = [
  { value: 'all', label: 'ทั้งหมด', icon: '📋' },
  { value: 'mos30plus', label: 'MOS 30%+', icon: '🛡️' },
  { value: 'undervalued', label: 'ต่ำกว่า FV', icon: '💎' },
  { value: 'high_yield', label: 'Yield > 4%', icon: '💰' },
  { value: 'ready_buy', label: '🎯 Ready', icon: '🎯' },
];

export default function FavoritesToolbar({
  searchQuery, setSearchQuery,
  sortField, setSortField, sortDir, setSortDir,
  filterPreset, setFilterPreset,
  compareMode, setCompareMode, selectedCount
}: FavoritesToolbarProps) {
  return (
    <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/80 flex flex-col gap-3">
      {/* Row 1: Search + Sort + Compare */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[160px] max-w-[260px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="ค้นหา ticker..."
            className="w-full pl-8 pr-8 py-1.5 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400 transition-all"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1">
          <ArrowUpDown size={13} className="text-slate-400" />
          <select
            value={sortField}
            onChange={e => setSortField(e.target.value as SortField)}
            className="text-xs font-medium text-slate-700 bg-transparent outline-none cursor-pointer pr-1"
          >
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button
            onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}
            className="text-[10px] font-bold text-slate-500 hover:text-emerald-600 px-1 transition-colors"
            title={sortDir === 'asc' ? 'Ascending' : 'Descending'}
          >
            {sortDir === 'asc' ? '↑' : '↓'}
          </button>
        </div>

        {/* Compare toggle */}
        <button
          onClick={() => setCompareMode(!compareMode)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
            compareMode
              ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
              : 'bg-white text-slate-600 border-slate-200 hover:border-violet-300 hover:text-violet-600'
          }`}
        >
          <GitCompareArrows size={14} />
          Compare {selectedCount > 0 && `(${selectedCount})`}
        </button>
      </div>

      {/* Row 2: Filters */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
        <SlidersHorizontal size={13} className="text-slate-400 flex-shrink-0" />
        {FILTER_OPTIONS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilterPreset(f.value)}
            className={`whitespace-nowrap px-2.5 py-1 rounded-full text-[11px] font-bold transition-all border ${
              filterPreset === f.value
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'
            }`}
          >
            {f.icon} {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}
