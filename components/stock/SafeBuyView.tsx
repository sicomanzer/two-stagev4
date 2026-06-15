import React, { useMemo, useState } from 'react';
import { ShieldCheck, Clock3, TriangleAlert, Sparkles } from 'lucide-react';

type SafeBuyProfile = 'busy_safe' | 'retiree_income' | 'long_term_growth';

interface SafeBuyViewProps {
  onSelectTicker: (ticker: string) => void;
}

type SafeStock = {
  ticker: string;
  companyName?: string | null;
  sector?: string | null;
  currentPrice?: number | null;
  latestYield?: number | null;
  latestROE?: number | null;
  latestDE?: number | null;
  latestPE?: number | null;
  latestPBV?: number | null;
  viScore?: number;
  viScoreMax?: number;
  revenueCAGR?: number | null;
  netProfitCAGR?: number | null;
  epsCAGR?: number | null;
  dpsCAGR?: number | null;
  dividendStreakYears?: number | null;
  npmDelta?: number | null;
  isFinancial?: boolean;
};

type SafeRule = {
  label: string;
  min?: number;
  max?: number;
  field: keyof SafeStock;
  optional?: boolean;
};

const PROFILE_CONFIG: Record<SafeBuyProfile, { title: string; subtitle: string; rules: SafeRule[] }> = {
  busy_safe: {
    title: 'สายปลอดภัยเวลาน้อย',
    subtitle: 'คัดหุ้นเสี่ยงต่ำ ถือยาว และไม่ต้องตามทุกวัน',
    rules: [
      { label: 'VI Quality', field: 'viScore', min: 10 },
      { label: 'ROE', field: 'latestROE', min: 10, optional: true },
      { label: 'D/E', field: 'latestDE', max: 1.2 },
      { label: 'P/E', field: 'latestPE', max: 20, optional: true },
      { label: 'EPS Growth', field: 'epsCAGR', min: 0, optional: true },
      { label: 'Dividend Streak', field: 'dividendStreakYears', min: 3, optional: true },
    ],
  },
  retiree_income: {
    title: 'สายกินปันผลสบายใจ',
    subtitle: 'เน้นหุ้นปันผลต่อเนื่อง งบค่อนข้างนิ่ง',
    rules: [
      { label: 'Dividend Yield', field: 'latestYield', min: 4 },
      { label: 'Dividend Streak', field: 'dividendStreakYears', min: 4, optional: true },
      { label: 'VI Quality', field: 'viScore', min: 9 },
      { label: 'D/E', field: 'latestDE', max: 2.0 },
      { label: 'ROE', field: 'latestROE', min: 8, optional: true },
      { label: 'DPS Growth', field: 'dpsCAGR', min: 0, optional: true },
    ],
  },
  long_term_growth: {
    title: 'สายเติบโตระยะยาว',
    subtitle: 'เน้นธุรกิจที่กำไรโตและคุณภาพดีต่อเนื่อง',
    rules: [
      { label: 'Revenue Growth', field: 'revenueCAGR', min: 3, optional: true },
      { label: 'Net Profit Growth', field: 'netProfitCAGR', min: 5, optional: true },
      { label: 'EPS Growth', field: 'epsCAGR', min: 5, optional: true },
      { label: 'NPM Delta', field: 'npmDelta', min: 0, optional: true },
      { label: 'VI Quality', field: 'viScore', min: 12 },
      { label: 'D/E', field: 'latestDE', max: 1.5 },
    ],
  },
};

function checkRule(stock: SafeStock, rule: SafeRule): boolean {
  const value = Number(stock[rule.field]);
  if (!Number.isFinite(value)) return !!rule.optional;
  if (rule.min !== undefined && value < rule.min) return false;
  if (rule.max !== undefined && value > rule.max) return false;
  return true;
}

function scoreStock(stock: SafeStock, rules: SafeRule[]) {
  let pass = 0;
  let hardFail = false;
  for (const rule of rules) {
    const ok = checkRule(stock, rule);
    if (ok) pass += 1;
    if (!ok && !rule.optional) hardFail = true;
  }
  return { pass, hardFail };
}

function getReason(stock: SafeStock): string[] {
  const reasons: string[] = [];
  if (typeof stock.viScore === 'number' && stock.viScore >= 12) reasons.push('คุณภาพรวมดี');
  if (typeof stock.latestDE === 'number' && stock.latestDE <= 1) reasons.push('หนี้ไม่สูง');
  if (typeof stock.latestYield === 'number' && stock.latestYield >= 4) reasons.push('ปันผลน่าสนใจ');
  if (typeof stock.epsCAGR === 'number' && stock.epsCAGR > 5) reasons.push('EPS โต');
  if (typeof stock.netProfitCAGR === 'number' && stock.netProfitCAGR > 5) reasons.push('กำไรโต');
  if (typeof stock.dividendStreakYears === 'number' && stock.dividendStreakYears >= 5) reasons.push('จ่ายปันผลต่อเนื่อง');
  return reasons.slice(0, 3);
}

export default function SafeBuyView({ onSelectTicker }: SafeBuyViewProps) {
  const [profile, setProfile] = useState<SafeBuyProfile>('busy_safe');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [safeList, setSafeList] = useState<SafeStock[]>([]);
  const [watchList, setWatchList] = useState<SafeStock[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);

  const profileConfig = PROFILE_CONFIG[profile];

  const runSafeScan = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/screener', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          growthYears: 10,
          strictGrowthWindow: false,
          dePolicy: 'sector-aware',
          financialDeSectorMultiplierMax: 1.1,
          dividendMode: 'or',
          viScoreMin: profile === 'long_term_growth' ? 10 : 8,
          peMax: profile === 'retiree_income' ? 25 : 22,
          pbvMax: 4,
          roeMin: profile === 'busy_safe' ? 8 : 6,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Safe Buy scan failed');
      }
      const data = await res.json();
      const stocks: SafeStock[] = Array.isArray(data.results) ? data.results : [];
      const ranked = stocks
        .map((stock) => {
          const score = scoreStock(stock, profileConfig.rules);
          return { stock, ...score };
        })
        .sort((a, b) => b.pass - a.pass || (b.stock.viScore || 0) - (a.stock.viScore || 0));

      setSafeList(ranked.filter((item) => !item.hardFail && item.pass >= Math.ceil(profileConfig.rules.length * 0.66)).map((item) => item.stock).slice(0, 12));
      setWatchList(ranked.filter((item) => item.hardFail || item.pass < Math.ceil(profileConfig.rules.length * 0.66)).map((item) => item.stock).slice(0, 8));
      setWarnings(Array.isArray(data.warnings) ? data.warnings : []);
    } catch (err: any) {
      setError(err?.message || 'Safe Buy scan failed');
      setSafeList([]);
      setWatchList([]);
      setWarnings([]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickGuide = useMemo(() => {
    if (profile === 'busy_safe') return 'เหมาะสำหรับคนไม่มีเวลาติดตามรายวัน และต้องการลดความเสี่ยงเป็นหลัก';
    if (profile === 'retiree_income') return 'เหมาะสำหรับผู้ที่ต้องการรายได้ปันผลต่อเนื่องและราคาค่อนข้างนิ่ง';
    return 'เหมาะสำหรับผู้ถือยาวที่รับความผันผวนได้เล็กน้อยเพื่อแลกการเติบโต';
  }, [profile]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-2xl bg-emerald-100 text-emerald-700">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900">Safe Buy Assistant</h2>
            <p className="text-sm font-medium text-slate-500 mt-1">โหมดสำหรับคนไม่มีเวลาและต้องการความปลอดภัยมากกว่าไล่ผลตอบแทนสูงสุด</p>
          </div>
        </div>
        <div className="mt-4 rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm font-bold text-emerald-800 flex items-start gap-2">
          <Clock3 size={16} className="mt-0.5 shrink-0" />
          <span>{quickGuide}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
          {(
            [
              { key: 'busy_safe', label: 'สายปลอดภัยเวลาน้อย' },
              { key: 'retiree_income', label: 'สายปันผลสบายใจ' },
              { key: 'long_term_growth', label: 'สายเติบโตระยะยาว' },
            ] as { key: SafeBuyProfile; label: string }[]
          ).map((item) => (
            <button
              key={item.key}
              onClick={() => setProfile(item.key)}
              className={`rounded-2xl px-4 py-3 text-left font-bold border transition-all ${
                profile === item.key
                  ? 'bg-slate-900 text-white border-slate-900 shadow'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <button
          onClick={runSafeScan}
          disabled={isLoading}
          className="mt-4 w-full rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white py-3 font-black transition-colors disabled:opacity-60"
        >
          {isLoading ? 'กำลังคัดหุ้นปลอดภัย...' : 'คัดหุ้นแบบ Safe Buy'}
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
          {error}
        </div>
      )}

      {warnings.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="text-xs font-black uppercase text-amber-700 mb-1">Warnings</div>
          {warnings.map((warning, index) => (
            <p key={index} className="text-sm font-bold text-amber-800">- {warning}</p>
          ))}
        </div>
      )}

      {safeList.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={18} className="text-emerald-600" />
            <h3 className="text-lg font-black text-slate-900">ซื้อได้ตอนนี้ ({safeList.length})</h3>
          </div>
          <div className="space-y-3">
            {safeList.map((stock) => {
              const reasons = getReason(stock);
              return (
                <div key={stock.ticker} className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button onClick={() => onSelectTicker(stock.ticker)} className="text-left">
                      <div className="text-base font-black text-slate-900">{stock.ticker}</div>
                      <div className="text-xs font-bold text-slate-500">{stock.sector || 'ไม่ระบุ sector'} • ฿{stock.currentPrice?.toFixed?.(2) ?? '-'}</div>
                    </button>
                    <div className="text-xs font-black text-emerald-700 bg-white border border-emerald-200 rounded-xl px-3 py-1">
                      VI {stock.viScore ?? '-'} / {stock.viScoreMax ?? 18}
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {reasons.length > 0 ? reasons.map((reason) => (
                      <span key={reason} className="text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-200 rounded-full px-2.5 py-1">
                        {reason}
                      </span>
                    )) : (
                      <span className="text-xs font-bold text-slate-500">ผ่านเกณฑ์รวมแบบปลอดภัย</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {watchList.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <TriangleAlert size={18} className="text-amber-600" />
            <h3 className="text-lg font-black text-slate-900">รอดูก่อน ({watchList.length})</h3>
          </div>
          <div className="space-y-2">
            {watchList.map((stock) => (
              <div key={stock.ticker} className="rounded-xl border border-slate-200 px-3 py-2 flex items-center justify-between gap-3">
                <button onClick={() => onSelectTicker(stock.ticker)} className="font-black text-slate-800 hover:text-emerald-700">{stock.ticker}</button>
                <div className="text-xs font-bold text-slate-500">
                  D/E {stock.latestDE?.toFixed?.(2) ?? '-'} • ROE {stock.latestROE?.toFixed?.(1) ?? '-'}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
