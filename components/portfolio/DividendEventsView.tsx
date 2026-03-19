import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, ChevronDown, Loader2, XCircle } from 'lucide-react';
import { PortfolioGroup } from '@/types/portfolio';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type EventCode = 'XD' | 'XM' | 'XN' | 'XR' | 'XW';

interface DividendEventRow {
  id: string;
  ticker: string;
  eventType: EventCode;
  exDate: string;
  amountPerShare: number;
  sharesHeld: number;
  expectedCash: number;
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

interface YearlySummaryItem {
  yearBE: number;
  totalExpectedCash: number;
}

function formatThaiDate(isoDate: string) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: '2-digit' });
}

function getYearOptions(): number[] {
  const currentBE = new Date().getFullYear() + 543;
  return Array.from({ length: 7 }, (_, idx) => currentBE - idx);
}

export default function DividendEventsView({
  currentPortfolioId,
  portfolios,
  setCurrentPortfolioId
}: DividendEventsViewProps) {
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
    totalRows: 0,
    totalExpectedCash: 0,
    tickerCount: 0
  });
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const yearOptions = useMemo(() => getYearOptions(), []);

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

  const selectedTypeLabel = useMemo(() => {
    if (selectedTypes.length === EVENT_TYPES.length) return 'เลือกทั้งหมด';
    return selectedTypes.join(', ');
  }, [selectedTypes]);

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
          data.summary || {
            totalRows: 0,
            totalExpectedCash: 0,
            tickerCount: 0
          }
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

  const yearlyDividendByTicker = useMemo(() => {
    const map = new Map<string, { ticker: string; totalCash: number; eventCount: number }>();
    rows.forEach((row) => {
      const current = map.get(row.ticker);
      if (current) {
        current.totalCash += row.expectedCash;
        current.eventCount += 1;
      } else {
        map.set(row.ticker, {
          ticker: row.ticker,
          totalCash: row.expectedCash,
          eventCount: 1
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.totalCash - a.totalCash);
  }, [rows]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-5 rounded-2xl text-white shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">ยอดรับรวมโดยประมาณ</p>
          <p className="text-2xl font-bold text-emerald-400">
            ฿{summary.totalExpectedCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

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

      {isBreakdownOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
          onClick={() => setIsBreakdownOpen(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-2xl shadow-xl border border-slate-200 flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-800">สรุปปันผลรวมทั้งปีแยกรายหุ้น</h3>
                <p className="text-xs text-slate-500">ปี {selectedYearBE} • {yearlyDividendByTicker.length.toLocaleString()} หุ้น</p>
              </div>
              <button onClick={() => setIsBreakdownOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <XCircle size={22} />
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-4">
              {yearlyDividendByTicker.length === 0 ? (
                <div className="text-center text-slate-400 py-10">ไม่พบข้อมูลปันผลสำหรับเงื่อนไขที่เลือก</div>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="text-slate-500 border-b border-slate-200 text-xs uppercase font-bold">
                    <tr>
                      <th className="py-2">Ticker</th>
                      <th className="py-2 text-right">จำนวนครั้ง</th>
                      <th className="py-2 text-right">ปันผลรวมทั้งปี</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {yearlyDividendByTicker.map((item) => (
                      <tr key={item.ticker}>
                        <td className="py-2 font-bold text-slate-900">{item.ticker}</td>
                        <td className="py-2 text-right text-slate-700">{item.eventCount.toLocaleString()}</td>
                        <td className="py-2 text-right font-bold text-emerald-600">
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
                ฿{yearlyDividendByTicker.reduce((sum, item) => sum + item.totalCash, 0).toLocaleString(undefined, {
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
