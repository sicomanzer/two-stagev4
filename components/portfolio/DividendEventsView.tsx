import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, ChevronDown, Loader2, XCircle, Target, TrendingUp, TrendingDown, Edit3, Check, X } from 'lucide-react';
import { PortfolioGroup } from '@/types/portfolio';
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
  PieChart, Pie, Cell
} from 'recharts';

type EventCode = 'XD' | 'XM' | 'XN' | 'XR' | 'XW';

interface DividendEventRow {
  id: string;
  ticker: string;
  eventType: EventCode;
  exDate: string;
  amountPerShare: number;
  sharesHeld: number;
  expectedCash: number;
  avgCost: number;
  source: string;
}

interface DividendEventsResponse {
  year: number;
  selectedTypes: EventCode[];
  supportedTypes: EventCode[];
  rows: DividendEventRow[];
  summary: {
    totalRows: number;
    totalExpectedCash: number;
    tickerCount: number;
  };
}

interface DividendEventsViewProps {
  currentPortfolioId: string;
  portfolios: PortfolioGroup[];
  setCurrentPortfolioId: (id: string) => void;
}

const EVENT_TYPES: EventCode[] = ['XD', 'XM', 'XN', 'XR', 'XW'];

const MONTHS_TH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

const PIE_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'];

interface YearlySummaryItem {
  yearBE: number;
  totalExpectedCash: number;
}

/* ── Goal storage helpers ── */
function getStoredGoal(portfolioId: string): number {
  if (typeof window === 'undefined') return 0;
  try {
    return Number(localStorage.getItem(`div-goal-${portfolioId}`)) || 0;
  } catch { return 0; }
}
function storeGoal(portfolioId: string, goal: number) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(`div-goal-${portfolioId}`, String(goal)); } catch { /* noop */ }
}

/* ── Helpers ── */
function formatThaiDate(isoDate: string) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: '2-digit' });
}

function getYearOptions(): number[] {
  const currentBE = new Date().getFullYear() + 543;
  return Array.from({ length: 7 }, (_, idx) => currentBE - idx);
}

function getYocColor(yoc: number) {
  if (yoc >= 5) return 'text-emerald-500';
  if (yoc >= 3) return 'text-amber-500';
  return 'text-red-400';
}
function getYocBg(yoc: number) {
  if (yoc >= 5) return 'bg-emerald-50 border-emerald-200';
  if (yoc >= 3) return 'bg-amber-50 border-amber-200';
  return 'bg-red-50 border-red-200';
}

/* ══════════════════════════════════════════════════════════════ */
export default function DividendEventsView({
  currentPortfolioId,
  portfolios,
  setCurrentPortfolioId
}: DividendEventsViewProps) {
  /* ── State ── */
  const [selectedYearBE, setSelectedYearBE] = useState<number>(new Date().getFullYear() + 543);
  const [selectedTypes, setSelectedTypes] = useState<EventCode[]>(['XD']);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<DividendEventRow[]>([]);
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);
  const [yearlySummary, setYearlySummary] = useState<YearlySummaryItem[]>([]);
  const [isYearlyLoading, setIsYearlyLoading] = useState(false);
  const [summary, setSummary] = useState<{ totalRows: number; totalExpectedCash: number; tickerCount: number }>({
    totalRows: 0, totalExpectedCash: 0, tickerCount: 0
  });
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const yearOptions = useMemo(() => getYearOptions(), []);

  // Goal state (Feature 5)
  const [dividendGoal, setDividendGoal] = useState(0);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState('');

  /* ── Effects ── */
  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    if (!currentPortfolioId && portfolios.length > 0) {
      setCurrentPortfolioId(portfolios[0].id);
    }
  }, [currentPortfolioId, portfolios, setCurrentPortfolioId]);

  // Load goal from localStorage
  useEffect(() => {
    if (currentPortfolioId) {
      setDividendGoal(getStoredGoal(currentPortfolioId));
    }
  }, [currentPortfolioId]);

  const selectedTypeLabel = useMemo(() => {
    if (selectedTypes.length === EVENT_TYPES.length) return 'เลือกทั้งหมด';
    return selectedTypes.join(', ');
  }, [selectedTypes]);

  // Fetch dividend events for selected year
  useEffect(() => {
    const run = async () => {
      if (!currentPortfolioId) {
        setRows([]);
        setSummary({ totalRows: 0, totalExpectedCash: 0, tickerCount: 0 });
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const typeParam = selectedTypes.join(',');
        const res = await fetch(
          `/api/dividend-events?portfolio_id=${currentPortfolioId}&year=${selectedYearBE}&types=${encodeURIComponent(typeParam)}`
        );
        const data: DividendEventsResponse = await res.json();
        if (!res.ok) {
          throw new Error((data as any)?.error || 'โหลดข้อมูลไม่สำเร็จ');
        }
        setRows(Array.isArray(data.rows) ? data.rows : []);
        setSummary(
          data.summary || { totalRows: 0, totalExpectedCash: 0, tickerCount: 0 }
        );
      } catch (err: any) {
        setError(err?.message || 'โหลดข้อมูลไม่สำเร็จ');
        setRows([]);
        setSummary({ totalRows: 0, totalExpectedCash: 0, tickerCount: 0 });
      } finally {
        setIsLoading(false);
      }
    };
    run();
  }, [currentPortfolioId, selectedYearBE, selectedTypes]);

  // Fetch yearly summary for chart
  useEffect(() => {
    const runYearly = async () => {
      if (!currentPortfolioId) {
        setYearlySummary([]);
        return;
      }
      setIsYearlyLoading(true);
      try {
        const typeParam = selectedTypes.join(',');
        const responses = await Promise.all(
          yearOptions.map(async (yearBE) => {
            const res = await fetch(
              `/api/dividend-events?portfolio_id=${currentPortfolioId}&year=${yearBE}&types=${encodeURIComponent(typeParam)}`
            );
            const data: DividendEventsResponse = await res.json();
            if (!res.ok) {
              throw new Error((data as any)?.error || 'โหลดข้อมูลไม่สำเร็จ');
            }
            return {
              yearBE,
              totalExpectedCash: data?.summary?.totalExpectedCash || 0
            };
          })
        );
        setYearlySummary(responses.sort((a, b) => a.yearBE - b.yearBE));
      } catch {
        setYearlySummary([]);
      } finally {
        setIsYearlyLoading(false);
      }
    };
    runYearly();
  }, [currentPortfolioId, selectedTypes, yearOptions]);

  /* ── Handlers ── */
  const toggleType = (type: EventCode) => {
    setSelectedTypes((prev) => {
      if (prev.includes(type)) {
        const next = prev.filter((t) => t !== type);
        return next.length > 0 ? next : prev;
      }
      return [...prev, type];
    });
  };

  const toggleAllTypes = () => {
    setSelectedTypes((prev) => (prev.length === EVENT_TYPES.length ? ['XD'] : [...EVENT_TYPES]));
  };

  const handleStartEditGoal = () => {
    setGoalInput(dividendGoal > 0 ? String(dividendGoal) : '');
    setIsEditingGoal(true);
  };
  const handleSaveGoal = () => {
    const val = Number(goalInput);
    if (val > 0) {
      storeGoal(currentPortfolioId, val);
      setDividendGoal(val);
    }
    setIsEditingGoal(false);
  };
  const handleCancelEditGoal = () => {
    setIsEditingGoal(false);
  };

  /* ── Computed (useMemo) ── */

  // Feature 1: YoY Growth
  const yoyGrowth = useMemo(() => {
    if (yearlySummary.length < 2) return null;
    const sorted = [...yearlySummary].sort((a, b) => a.yearBE - b.yearBE);
    const currentIdx = sorted.findIndex((y) => y.yearBE === selectedYearBE);
    if (currentIdx <= 0) return null;
    const current = sorted[currentIdx];
    const prev = sorted[currentIdx - 1];
    if (prev.totalExpectedCash === 0) return null;
    return ((current.totalExpectedCash - prev.totalExpectedCash) / prev.totalExpectedCash) * 100;
  }, [yearlySummary, selectedYearBE]);

  // Feature 2: Monthly data
  const monthlyData = useMemo(() => {
    const monthMap = new Array(12).fill(0);
    rows.forEach((row) => {
      const date = new Date(row.exDate);
      if (!isNaN(date.getTime())) {
        monthMap[date.getMonth()] += row.expectedCash;
      }
    });
    return monthMap.map((total, i) => ({ month: MONTHS_TH[i], total }));
  }, [rows]);

  const hasMonthlyData = monthlyData.some((d) => d.total > 0);

  // Feature 3 + 4: Dividend by ticker (for pie chart + YOC)
  const dividendByTicker = useMemo(() => {
    const map = new Map<string, {
      ticker: string; totalDivPerShare: number; avgCost: number;
      sharesHeld: number; totalCash: number; eventCount: number;
    }>();
    rows.forEach((row) => {
      const current = map.get(row.ticker);
      if (current) {
        current.totalDivPerShare += row.amountPerShare;
        current.totalCash += row.expectedCash;
        current.eventCount += 1;
      } else {
        map.set(row.ticker, {
          ticker: row.ticker,
          totalDivPerShare: row.amountPerShare,
          avgCost: row.avgCost || 0,
          sharesHeld: row.sharesHeld,
          totalCash: row.expectedCash,
          eventCount: 1,
        });
      }
    });
    return Array.from(map.values())
      .map((item) => ({
        ...item,
        yoc: item.avgCost > 0 ? (item.totalDivPerShare / item.avgCost) * 100 : 0,
      }))
      .sort((a, b) => b.totalCash - a.totalCash);
  }, [rows]);

  // Pie chart data
  const pieData = useMemo(() => {
    return dividendByTicker.map((item, i) => ({
      name: item.ticker,
      value: item.totalCash,
      color: PIE_COLORS[i % PIE_COLORS.length],
    }));
  }, [dividendByTicker]);

  const pieTotalCash = pieData.reduce((s, d) => s + d.value, 0);

  // Feature 5: Goal progress
  const goalProgress = dividendGoal > 0 ? Math.min((summary.totalExpectedCash / dividendGoal) * 100, 100) : 0;
  const goalRemaining = dividendGoal > 0 ? Math.max(dividendGoal - summary.totalExpectedCash, 0) : 0;

  // Portfolio Yield on Cost
  const totalInvested = useMemo(() => {
    return dividendByTicker.reduce((sum, item) => sum + (item.avgCost * item.sharesHeld), 0);
  }, [dividendByTicker]);

  const portfolioYield = useMemo(() => {
    return totalInvested > 0 ? (summary.totalExpectedCash / totalInvested) * 100 : 0;
  }, [summary.totalExpectedCash, totalInvested]);

  /* ══════════════════════════════════════════ */
  /*                 RENDER                    */
  /* ══════════════════════════════════════════ */
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ── FILTER SECTION ── */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-5">
          <div className="bg-emerald-100 p-2.5 rounded-xl text-emerald-600">
            <Calendar size={22} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">รายงานรับปันผลรายครั้ง</h2>
            <p className="text-slate-500 text-xs">ดึงรายชื่อจาก Real Portfolio และแสดงรายการสิทธิ์ตามประเภทที่เลือก</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">พอร์ต</label>
            <select
              value={currentPortfolioId || ''}
              onChange={(e) => setCurrentPortfolioId(e.target.value)}
              className="w-full bg-slate-50 text-slate-800 text-sm font-medium rounded-xl px-4 py-2.5 border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {portfolios.length === 0 && <option value="">No Portfolio</option>}
              {portfolios.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">ปี (พ.ศ.)</label>
            <select
              value={selectedYearBE}
              onChange={(e) => setSelectedYearBE(Number(e.target.value))}
              className="w-full bg-slate-50 text-slate-800 text-sm font-medium rounded-xl px-4 py-2.5 border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div ref={dropdownRef} className="relative">
            <label className="block text-sm font-bold text-slate-700 mb-2">ประเภทรายการ</label>
            <button
              type="button"
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              className="w-full bg-slate-50 text-slate-800 text-sm font-medium rounded-xl px-4 py-2.5 border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 flex justify-between items-center"
            >
              <span className="truncate">{selectedTypeLabel}</span>
              <ChevronDown size={16} className={`${isDropdownOpen ? 'rotate-180' : ''} transition-transform`} />
            </button>
            {isDropdownOpen && (
              <div className="absolute z-20 mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                <button
                  type="button"
                  onClick={toggleAllTypes}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 font-medium border-b border-slate-100"
                >
                  เลือกทั้งหมด
                </button>
                {EVENT_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleType(type)}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 flex items-center justify-between"
                  >
                    <span>{type}</span>
                    {selectedTypes.includes(type) && <span className="text-emerald-600 font-bold">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── SUMMARY CARDS (Enhanced with YoY Growth - Feature 1) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">จำนวนรายการ</p>
          <p className="text-2xl font-bold text-slate-800">{summary.totalRows.toLocaleString()}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">จำนวนหุ้นที่มีรายการ</p>
          <p
            className="text-2xl font-bold text-slate-800 cursor-pointer hover:text-emerald-600 transition-colors"
            onClick={() => setIsBreakdownOpen(true)}
          >
            {summary.tickerCount.toLocaleString()}
          </p>
        </div>

        {/* Feature 1: YoY Growth Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">เทียบกับปีก่อน</p>
          {yoyGrowth === null ? (
            <p className="text-2xl font-bold text-slate-300">—</p>
          ) : (
            <div className="flex items-center gap-2">
              {yoyGrowth >= 0 ? (
                <TrendingUp size={22} className="text-emerald-500" />
              ) : (
                <TrendingDown size={22} className="text-red-400" />
              )}
              <p className={`text-2xl font-bold ${yoyGrowth >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                {yoyGrowth >= 0 ? '+' : ''}{yoyGrowth.toFixed(1)}%
              </p>
            </div>
          )}
          {yoyGrowth !== null && (
            <p className="text-[10px] text-slate-400 mt-1">
              Dividend Growth YoY
            </p>
          )}
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-5 rounded-2xl text-white shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">ยอดรับรวมโดยประมาณ</p>
          <p className="text-2xl font-bold text-emerald-400">
            ฿{summary.totalExpectedCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        {/* Feature: Portfolio Yield */}
        <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">% ปันผลเทียบเงินลงทุน</p>
          <p className="text-2xl font-bold text-emerald-500">
            {portfolioYield.toFixed(2)}%
          </p>
          <p className="text-[10px] text-slate-400 mt-1">
            ทุนหุ้นปันผล: <span className="font-bold text-slate-700">฿{totalInvested.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </p>
        </div>
      </div>

      {/* ── Feature 5: DIVIDEND GOAL TRACKER ── */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="bg-amber-100 p-2 rounded-xl text-amber-600">
              <Target size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">เป้าหมายปันผลปี {selectedYearBE}</h3>
              <p className="text-[10px] text-slate-400">ตั้งเป้ารายได้ปันผลที่ต้องการต่อปี</p>
            </div>
          </div>
          {!isEditingGoal ? (
            <button
              onClick={handleStartEditGoal}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-amber-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-amber-50"
            >
              <Edit3 size={13} />
              {dividendGoal > 0 ? 'แก้ไขเป้า' : 'ตั้งเป้า'}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveGoal(); if (e.key === 'Escape') handleCancelEditGoal(); }}
                placeholder="เช่น 50000"
                className="w-32 text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-amber-400"
                autoFocus
              />
              <button onClick={handleSaveGoal} className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors">
                <Check size={14} />
              </button>
              <button onClick={handleCancelEditGoal} className="p-1.5 rounded-lg bg-slate-50 text-slate-400 hover:bg-slate-100 transition-colors">
                <X size={14} />
              </button>
            </div>
          )}
        </div>

        {dividendGoal > 0 ? (
          <div>
            <div className="flex items-end justify-between mb-2">
              <div>
                <span className="text-xl font-bold text-slate-800">
                  ฿{summary.totalExpectedCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-sm text-slate-400 ml-1.5">
                  / ฿{dividendGoal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <span className={`text-lg font-bold ${goalProgress >= 100 ? 'text-emerald-500' : goalProgress >= 50 ? 'text-amber-500' : 'text-slate-500'}`}>
                {goalProgress.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${
                  goalProgress >= 100
                    ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                    : goalProgress >= 50
                      ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                      : 'bg-gradient-to-r from-slate-300 to-slate-400'
                }`}
                style={{ width: `${goalProgress}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              {goalProgress >= 100 ? (
                <span className="text-emerald-500 font-bold">🎉 ยินดีด้วย! คุณทำเป้าหมายสำเร็จแล้ว!</span>
              ) : (
                <>เหลืออีก <span className="font-bold text-slate-600">฿{goalRemaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> เพื่อถึงเป้าหมาย</>
              )}
            </p>
          </div>
        ) : (
          <div className="text-center py-4 text-slate-400 text-sm">
            <p>ยังไม่ได้ตั้งเป้าหมาย — กดปุ่ม &quot;ตั้งเป้า&quot; เพื่อเริ่มต้น</p>
            <p className="text-[10px] mt-1">การตั้งเป้าหมายช่วยให้คุณมีแรงจูงใจในการสะสมหุ้นปันผล 💪</p>
          </div>
        )}
      </div>

      {/* ── Feature 2 + 4: Monthly Chart + Pie Chart ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">

        {/* Feature 2: Monthly Income Chart */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 h-full min-w-0">
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-800">📅 รายได้ปันผลรายเดือน</h3>
            <p className="text-xs text-slate-500">แสดงเงินปันผลที่ได้รับแยกตามเดือน (ปี {selectedYearBE})</p>
          </div>
          <div className="h-[260px]">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-slate-400 gap-2">
                <Loader2 size={16} className="animate-spin" />
                <span>กำลังโหลดข้อมูล...</span>
              </div>
            ) : !hasMonthlyData ? (
              <div className="h-full flex items-center justify-center text-slate-400">ไม่มีข้อมูลรายเดือนสำหรับเงื่อนไขที่เลือก</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 8, right: 12, left: 4, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value: number) => `฿${Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(59, 130, 246, 0.08)' }}
                    formatter={(value) => [
                      `฿${Number(value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                      'ปันผลรับ'
                    ]}
                    labelFormatter={(label) => `เดือน ${label}`}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                  <Bar dataKey="total" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Feature 4: Dividend Proportion Pie Chart */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 shadow-sm border border-slate-700 h-full min-w-0">
          <div className="mb-4">
            <h3 className="text-base font-bold text-white">🥧 สัดส่วนปันผลแยกรายหุ้น</h3>
            <p className="text-xs text-slate-400">ดูว่าปันผลกระจุกตัวอยู่ที่หุ้นตัวไหน (Concentration Risk)</p>
          </div>
          {isLoading ? (
            <div className="h-[260px] flex items-center justify-center text-slate-400 gap-2">
              <Loader2 size={16} className="animate-spin" />
              <span>กำลังโหลดข้อมูล...</span>
            </div>
          ) : pieData.length === 0 ? (
            <div className="h-[260px] flex items-center justify-center text-slate-500">ไม่มีข้อมูล</div>
          ) : (
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="w-full md:w-1/2 h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                      itemStyle={{ color: '#fff' }}
                      formatter={(value) => {
                        const pct = pieTotalCash > 0 ? ((Number(value) / pieTotalCash) * 100).toFixed(1) : '0';
                        return [`฿${Number(value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${pct}%)`, 'ปันผลรับ'];
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full md:w-1/2 space-y-2 max-h-[240px] overflow-y-auto pr-1">
                {pieData.map((entry, i) => {
                  const pct = pieTotalCash > 0 ? ((entry.value / pieTotalCash) * 100).toFixed(1) : '0';
                  return (
                    <div key={i} className="flex items-center gap-2.5 group">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-200 truncate">{entry.name}</span>
                          <span className="text-[10px] font-medium text-slate-400 ml-2">{pct}%</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-1.5 mt-0.5">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, backgroundColor: entry.color }}
                          />
                        </div>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-bold whitespace-nowrap">
                        ฿{entry.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── EXISTING: Yearly Chart + Event Table ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 h-full min-w-0">
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-800">กราฟยอดรับรวมโดยประมาณรายปี</h3>
            <p className="text-xs text-slate-500">เปรียบเทียบยอดปันผลรวมในพอร์ตตามปี (พ.ศ.)</p>
          </div>
          <div className="h-[230px] sm:h-[260px] md:h-[280px] xl:h-[320px]">
            {isYearlyLoading ? (
              <div className="h-full flex items-center justify-center text-slate-400 gap-2">
                <Loader2 size={16} className="animate-spin" />
                <span>กำลังโหลดข้อมูลกราฟ...</span>
              </div>
            ) : yearlySummary.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400">ไม่มีข้อมูลรายปีสำหรับเงื่อนไขที่เลือก</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={yearlySummary} margin={{ top: 8, right: 12, left: 4, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="yearBE" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value: number) => `฿${Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(16, 185, 129, 0.08)' }}
                    formatter={(value) => [
                      `฿${Number(value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                      'ยอดรับรวมโดยประมาณ'
                    ]}
                    labelFormatter={(label) => `ปี ${label}`}
                  />
                  <Bar dataKey="totalExpectedCash" fill="#10b981" radius={[8, 8, 0, 0]} maxBarSize={46} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-full min-w-0">
          <div className="overflow-hidden">
            <table className="w-full table-fixed text-[11px] sm:text-xs lg:text-sm text-left">
            <thead className="text-slate-500 bg-slate-50 border-b border-slate-200 text-[11px] sm:text-xs font-bold">
              <tr>
                <th className="w-[24%] px-2 sm:px-3 md:px-4 py-2.5 whitespace-nowrap">Ticker</th>
                <th className="w-[10%] px-2 sm:px-3 md:px-4 py-2.5 whitespace-nowrap hidden 2xl:table-cell">ประเภท</th>
                <th className="w-[18%] px-2 sm:px-3 md:px-4 py-2.5 whitespace-nowrap">วันที่</th>
                <th className="w-[16%] pl-2 sm:pl-3 md:pl-4 pr-2 sm:pr-3 md:pr-4 py-2.5 text-right whitespace-nowrap">เงิน/หน่วย</th>
                <th className="w-[16%] pl-2 sm:pl-3 md:pl-4 pr-2 sm:pr-3 md:pr-4 py-2.5 text-right whitespace-nowrap">หุ้นถือ</th>
                <th className="w-[26%] pl-2 sm:pl-3 md:pl-4 pr-2 sm:pr-3 md:pr-4 py-2.5 text-right whitespace-nowrap">ยอดรับโดยประมาณ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                    <div className="inline-flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin" />
                      <span>กำลังโหลดข้อมูล...</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-red-500">
                    {error}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                    ไม่พบรายการสำหรับเงื่อนไขที่เลือก
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-2 sm:px-3 md:px-4 py-2.5 font-bold text-slate-900 whitespace-nowrap">{row.ticker}</td>
                    <td className="px-2 sm:px-3 md:px-4 py-2.5 hidden 2xl:table-cell">
                      <span className="px-2 py-1 rounded-md bg-blue-50 text-blue-700 font-bold text-xs">{row.eventType}</span>
                    </td>
                    <td className="px-2 sm:px-3 md:px-4 py-2.5 text-slate-700 whitespace-nowrap">{formatThaiDate(row.exDate)}</td>
                    <td className="pl-2 sm:pl-3 md:pl-4 pr-3 sm:pr-4 md:pr-5 py-2.5 text-right text-slate-700 whitespace-nowrap">
                      {row.amountPerShare.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                    </td>
                    <td className="pl-2 sm:pl-3 md:pl-4 pr-3 sm:pr-4 md:pr-5 py-2.5 text-right font-medium text-slate-800 whitespace-nowrap">{row.sharesHeld.toLocaleString()}</td>
                    <td className="pl-2 sm:pl-3 md:pl-4 pr-2 sm:pr-3 md:pr-4 py-2.5 text-right font-bold text-emerald-600 whitespace-nowrap tabular-nums">
                      {row.expectedCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>

      {/* ── Feature 3: YOC TABLE SECTION ── */}
      {dividendByTicker.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-800">📊 Yield on Cost (YOC) แยกรายหุ้น</h3>
            <p className="text-xs text-slate-500">
              เปรียบเทียบปันผลที่ได้รับกับต้นทุนเฉลี่ยของแต่ละตัว —
              <span className="text-emerald-500 font-bold ml-1">≥5% ดีมาก</span>
              <span className="text-amber-500 font-bold ml-2">3-5% ปานกลาง</span>
              <span className="text-red-400 font-bold ml-2">&lt;3% ต่ำ</span>
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {dividendByTicker.map((item) => (
              <div
                key={item.ticker}
                className={`rounded-xl p-4 border ${getYocBg(item.yoc)} transition-all hover:shadow-md`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-slate-800">{item.ticker}</span>
                  <span className={`text-lg font-black ${getYocColor(item.yoc)}`}>
                    {item.avgCost > 0 ? `${item.yoc.toFixed(2)}%` : 'N/A'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500">ปันผลรวม/หุ้น</span>
                    <span className="font-bold text-slate-700">{item.totalDivPerShare.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">ต้นทุนเฉลี่ย</span>
                    <span className="font-bold text-slate-700">{item.avgCost > 0 ? item.avgCost.toFixed(2) : '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">หุ้นถือ</span>
                    <span className="font-bold text-slate-700">{item.sharesHeld.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">ปันผลรวม</span>
                    <span className="font-bold text-emerald-600">฿{item.totalCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
                {/* YOC visual bar */}
                {item.avgCost > 0 && (
                  <div className="mt-2.5">
                    <div className="w-full bg-white/50 rounded-full h-1.5">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          item.yoc >= 5 ? 'bg-emerald-400' : item.yoc >= 3 ? 'bg-amber-400' : 'bg-red-300'
                        }`}
                        style={{ width: `${Math.min(item.yoc * 10, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── BREAKDOWN MODAL (Enhanced with YOC - Feature 3) ── */}
      {isBreakdownOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
          onClick={() => setIsBreakdownOpen(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-3xl shadow-xl border border-slate-200 flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-800">สรุปปันผลรวมทั้งปีแยกรายหุ้น</h3>
                <p className="text-xs text-slate-500">ปี {selectedYearBE} • {dividendByTicker.length.toLocaleString()} หุ้น</p>
              </div>
              <button onClick={() => setIsBreakdownOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <XCircle size={22} />
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-4">
              {dividendByTicker.length === 0 ? (
                <div className="text-center text-slate-400 py-10">ไม่พบข้อมูลปันผลสำหรับเงื่อนไขที่เลือก</div>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="text-slate-500 border-b border-slate-200 text-xs uppercase font-bold">
                    <tr>
                      <th className="py-2">Ticker</th>
                      <th className="py-2 text-right">จำนวนครั้ง</th>
                      <th className="py-2 text-right">ปันผลรวม/หุ้น</th>
                      <th className="py-2 text-right">ต้นทุนเฉลี่ย</th>
                      <th className="py-2 text-right">YOC%</th>
                      <th className="py-2 text-right">ปันผลรวมทั้งปี</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dividendByTicker.map((item) => (
                      <tr key={item.ticker} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 font-bold text-slate-900">{item.ticker}</td>
                        <td className="py-2.5 text-right text-slate-700">{item.eventCount.toLocaleString()}</td>
                        <td className="py-2.5 text-right text-slate-700">{item.totalDivPerShare.toFixed(4)}</td>
                        <td className="py-2.5 text-right text-slate-700">{item.avgCost > 0 ? item.avgCost.toFixed(2) : '—'}</td>
                        <td className={`py-2.5 text-right font-bold ${getYocColor(item.yoc)}`}>
                          {item.avgCost > 0 ? `${item.yoc.toFixed(2)}%` : '—'}
                        </td>
                        <td className="py-2.5 text-right font-bold text-emerald-600">
                          ฿{item.totalCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-sm">
              <span className="text-slate-600">ยอดรวมทุกหุ้น</span>
              <span className="font-bold text-slate-900">
                ฿{dividendByTicker.reduce((sum, item) => sum + item.totalCash, 0).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
