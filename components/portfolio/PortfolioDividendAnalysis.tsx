import React, { useEffect, useMemo, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar, DollarSign, PieChart as PieIcon } from 'lucide-react';

interface PortfolioDividendAnalysisProps {
  holdings: any[];
  currentPortfolioId?: string | null;
}

interface DividendEventRow {
  ticker: string;
  exDate: string;
  amountPerShare: number;
  sharesHeld: number;
  expectedCash: number;
}

const MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

const COLORS = [
  '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
];

export default function PortfolioDividendAnalysis({
  holdings,
  currentPortfolioId,
}: PortfolioDividendAnalysisProps) {
  const [dividendRows, setDividendRows] = useState<DividendEventRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const safeHoldings = useMemo(() => holdings || [], [holdings]);

  useEffect(() => {
    const loadDividendEvents = async () => {
      if (!currentPortfolioId) {
        setDividendRows([]);
        return;
      }

      setIsLoading(true);
      try {
        const buddhistYear = new Date().getFullYear() + 543;
        const res = await fetch(
          `/api/dividend-events?portfolio_id=${currentPortfolioId}&year=${buddhistYear}&types=XD`
        );
        if (!res.ok) throw new Error('Failed to load dividend events');
        const data = await res.json();
        setDividendRows(Array.isArray(data?.rows) ? data.rows : []);
      } catch (error) {
        console.error('Failed to load dividend events for real portfolio:', error);
        setDividendRows([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadDividendEvents();
  }, [currentPortfolioId]);

  const totalValue = safeHoldings.reduce((sum, h) => sum + h.marketValue, 0);
  const totalExpectedDividend = dividendRows.reduce((sum, row) => sum + (row.expectedCash || 0), 0);
  const avgYield = totalValue > 0 ? (totalExpectedDividend / totalValue) * 100 : 0;

  const sectorMap = new Map<string, number>();
  safeHoldings.forEach((holding) => {
    const sector = holding.sector || 'Unknown';
    sectorMap.set(sector, (sectorMap.get(sector) || 0) + holding.marketValue);
  });

  const sectorData = Array.from(sectorMap.entries())
    .map(([name, value], index) => ({
      name,
      value,
      color: COLORS[index % COLORS.length],
    }))
    .sort((a, b) => b.value - a.value);

  const holdingMap = useMemo(
    () => new Map(safeHoldings.map((holding) => [holding.ticker, holding])),
    [safeHoldings]
  );
  const frequencyMap = useMemo(() => {
    return dividendRows.reduce((acc: Record<string, number>, row) => {
      acc[row.ticker] = (acc[row.ticker] || 0) + 1;
      return acc;
    }, {});
  }, [dividendRows]);

  const upcomingEvents = useMemo(() => {
    return dividendRows
      .map((row) => {
        const holding = holdingMap.get(row.ticker);
        return {
          ...row,
          date: new Date(row.exDate),
          yieldPct: holding?.dividendYield ? holding.dividendYield * 100 : 0,
          frequency: frequencyMap[row.ticker] || 1,
        };
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [dividendRows, frequencyMap, holdingMap]);

  const calendarData = useMemo(() => {
    const grouped: Record<number, typeof upcomingEvents> = {};
    upcomingEvents.forEach((event) => {
      const monthIndex = event.date.getMonth();
      if (!grouped[monthIndex]) grouped[monthIndex] = [];
      grouped[monthIndex].push(event);
    });
    return grouped;
  }, [upcomingEvents]);

  if (safeHoldings.length === 0) return null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-slate-900 rounded-2xl p-8 text-white relative overflow-hidden shadow-lg">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <DollarSign size={120} />
        </div>
        <div className="relative z-10 text-center">
          <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-2">เงินปันผลสะสมจากรายการ XD จริงปีนี้</h3>
          <div className="text-5xl font-black text-orange-500 mb-2">
            ฿ {totalExpectedDividend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-slate-400 text-sm">
            Yield อิงมูลค่าพอร์ต <span className="text-emerald-400 font-bold">{avgYield.toFixed(2)}%</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Calendar className="text-orange-500" size={20} />
            รายการ XD ตามประกาศจริง
          </h3>
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {isLoading ? (
              <div className="text-sm text-slate-400 text-center py-10">กำลังโหลดรายการ XD...</div>
            ) : upcomingEvents.length === 0 ? (
              <div className="text-sm text-slate-400 text-center py-10">ยังไม่มีรายการ XD จริงในปีนี้สำหรับพอร์ตนี้</div>
            ) : (
              upcomingEvents.map((evt, i) => (
                <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-orange-200 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center justify-center bg-white border border-slate-200 rounded-lg w-12 h-12 group-hover:border-orange-300">
                      <span className="text-[10px] text-slate-500 font-bold uppercase">{MONTHS[evt.date.getMonth()]}</span>
                      <span className="text-lg font-bold text-slate-800">{evt.date.getDate()}</span>
                    </div>
                    <div>
                      <div className="font-bold text-slate-800">{evt.ticker}</div>
                      <div className="text-[10px] text-slate-500 flex flex-col gap-0.5">
                        <div>(XD) ตามประกาศจากตลาด</div>
                        <div className="text-slate-400">
                          มีหุ้นใน Port: <span className="font-bold text-slate-600">{evt.sharesHeld.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-orange-500">
                      {evt.amountPerShare.toFixed(2)} <span className="text-[10px] text-slate-400">บาท/หุ้น</span>
                    </div>
                    <div className="text-[10px] text-emerald-600 font-medium">({evt.yieldPct.toFixed(2)}%)</div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      รับปันผล: <span className="font-bold text-orange-500">{evt.expectedCash.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">ปีนี้มี {evt.frequency} ครั้ง</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-800 rounded-2xl shadow-sm border border-slate-700 p-6 text-white">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <PieIcon className="text-emerald-400" size={20} />
                สัดส่วนหุ้นที่มี (Sector)
              </h3>
            </div>
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="w-full md:w-1/2 h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={sectorData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {sectorData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                      itemStyle={{ color: '#fff' }}
                      formatter={(value) => `฿${Number(value ?? 0).toLocaleString()}`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full md:w-1/2 grid grid-cols-2 gap-3">
                {sectorData.map((entry, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                    <div className="flex-1">
                      <div className="text-xs font-bold text-slate-300">{entry.name}</div>
                      <div className="text-[10px] text-slate-500">{(entry.value / totalValue * 100).toFixed(1)}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-700 p-6">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Calendar className="text-blue-400" size={20} />
              ปฏิทินปันผล (Dividend Calendar)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {MONTHS.map((month, i) => {
                const events = calendarData[i] || [];
                const hasEvents = events.length > 0;
                const isCurrentMonth = i === new Date().getMonth();

                return (
                  <div
                    key={i}
                    className={`rounded-xl p-3 border ${
                      isCurrentMonth
                        ? 'bg-slate-800 border-orange-500/80 ring-1 ring-orange-500'
                        : hasEvents
                          ? 'bg-slate-800 border-slate-600'
                          : 'bg-slate-800/50 border-slate-700/50 opacity-50'
                    }`}
                  >
                    <div className="text-center mb-2 flex justify-between items-center">
                      <span className={`text-xs font-bold uppercase ${isCurrentMonth ? 'text-orange-400' : 'text-slate-400'}`}>{month}</span>
                      {hasEvents && (
                        <span className="text-[10px] font-bold text-emerald-400">
                          ฿{events.reduce((sum, e) => sum + e.expectedCash, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1.5 h-[120px] overflow-y-auto custom-scrollbar pr-1">
                      {events.map((evt, j) => (
                        <div
                          key={j}
                          className="text-[10px] font-bold px-2 py-1 rounded text-center truncate border bg-blue-600/20 text-blue-300 border-blue-500/30"
                          title={`XD ${evt.exDate}`}
                        >
                          {evt.ticker}
                        </div>
                      ))}
                      {!hasEvents && <div className="h-6" />}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-500 mt-4 text-center">* ข้อมูลอิงจากรายการ XD จริงของหุ้นที่ถืออยู่ในพอร์ตเท่านั้น</p>
          </div>
        </div>
      </div>
    </div>
  );
}
