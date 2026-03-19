import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, ChevronDown, Loader2 } from 'lucide-react';
import { PortfolioGroup } from '@/types/portfolio';

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
  const [summary, setSummary] = useState<{ totalRows: number; totalExpectedCash: number; tickerCount: number }>({
    totalRows: 0,
    totalExpectedCash: 0,
    tickerCount: 0
  });
  const dropdownRef = useRef<HTMLDivElement | null>(null);

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
              {getYearOptions().map((year) => (
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
          <p className="text-2xl font-bold text-slate-800">{summary.tickerCount.toLocaleString()}</p>
        </div>
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-5 rounded-2xl text-white shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">ยอดรับรวมโดยประมาณ</p>
          <p className="text-2xl font-bold text-emerald-400">
            ฿{summary.totalExpectedCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-slate-500 bg-slate-50 border-b border-slate-200 text-xs uppercase font-bold">
              <tr>
                <th className="px-6 py-2">Ticker</th>
                <th className="px-6 py-2">ประเภท</th>
                <th className="px-6 py-2">วันที่</th>
                <th className="px-6 py-2 text-right">เงินปันผล/หน่วย</th>
                <th className="px-6 py-2 text-right">จำนวนหุ้นที่ถือ</th>
                <th className="px-6 py-2 text-right">ยอดรับโดยประมาณ</th>
                <th className="px-6 py-2 text-center">แหล่งข้อมูล</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-400">
                    <div className="inline-flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin" />
                      <span>กำลังโหลดข้อมูล...</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-red-500">
                    {error}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-400">
                    ไม่พบรายการสำหรับเงื่อนไขที่เลือก
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-2 font-bold text-slate-900">{row.ticker}</td>
                    <td className="px-6 py-2">
                      <span className="px-2 py-1 rounded-md bg-blue-50 text-blue-700 font-bold text-xs">{row.eventType}</span>
                    </td>
                    <td className="px-6 py-2 text-slate-700">{formatThaiDate(row.exDate)}</td>
                    <td className="px-6 py-2 text-right text-slate-700">
                      {row.amountPerShare.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                    </td>
                    <td className="px-6 py-2 text-right font-medium text-slate-800">{row.sharesHeld.toLocaleString()}</td>
                    <td className="px-6 py-2 text-right font-bold text-emerald-600">
                      {row.expectedCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-2 text-center text-xs text-slate-500 uppercase">{row.source}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
