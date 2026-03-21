
'use client';

import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  ComposedChart,
} from 'recharts';

interface StockHistory {
  year: number;
  revenue: number | null;
  netProfit: number | null;
  eps: number | null;
  dps: number | null;
  de: number | null;
  npm: number | null;
  pe: number | null;
  pbv: number | null;
  price: number | null;
  bvps: number | null;
}

interface BandData {
  date: string;
  value: number;
  price: number;
}

interface RatioBands {
  pe: {
    data: BandData[];
    stats: { avg: number; sd: number };
  };
  pbv: {
    data: BandData[];
    stats: { avg: number; sd: number };
  };
}

interface StockChartsProps {
  history: StockHistory[];
  ratioBands?: RatioBands;
  ticker: string;
}

const formatNumber = (num: number | null) => {
  if (num === null || num === undefined) return '-';
  if (Math.abs(num) >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  return num.toFixed(2);
};

const CustomTooltip = ({ active, payload, label, unit = '' }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-slate-200 shadow-md rounded-lg text-sm">
        <p className="font-bold text-slate-700 mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }}>
            {entry.name}: {formatNumber(entry.value)} {unit}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const ChartContainer = ({ title, footer, children }: { title: string; footer?: string; children: React.ReactNode }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
    <h3 className="text-xl font-bold text-slate-800 mb-6">{title}</h3>
    <div className="h-[350px] w-full">
      {children}
    </div>
    {footer && (
      <div className="mt-6 pt-4 border-t border-slate-50 text-center font-bold text-[#003399] text-sm md:text-base">
        {footer}
      </div>
    )}
  </div>
);

export default function StockCharts({ history, ratioBands, ticker }: StockChartsProps) {
  if (!history || history.length === 0) {
    return <div className="text-center p-8 text-slate-500">ไม่มีข้อมูลประวัติสำหรับหุ้นนี้</div>;
  }

  // Prepare PE Band Data
  const peChartData = ratioBands?.pe.data.map(d => {
    const { avg, sd } = ratioBands.pe.stats;
    return {
      date: d.date.substring(2, 7).replace('-', '/'), // YY/MM
      pe: d.value,
      avg: avg,
      sd1p: avg + sd,
      sd2p: avg + 2 * sd,
      sd1m: avg - sd,
      sd2m: avg - 2 * sd,
    };
  }) || [];

  const peLast = peChartData[peChartData.length - 1];
  const peStats = ratioBands?.pe.stats;
  const peFooter = peStats ? `[ Last PE = ${peLast?.pe.toFixed(2)} ] (${(peStats.avg - 2 * peStats.sd).toFixed(2)}) (${(peStats.avg - peStats.sd).toFixed(2)}) [ AVG = ${peStats.avg.toFixed(2)} ] (${(peStats.avg + peStats.sd).toFixed(2)}) (${(peStats.avg + 2 * peStats.sd).toFixed(2)})` : '';

  // Prepare PBV Band Data
  const pbvChartData = ratioBands?.pbv.data.map(d => {
    const { avg, sd } = ratioBands.pbv.stats;
    return {
      date: d.date.substring(2, 7).replace('-', '/'), // YY/MM
      pbv: d.value,
      avg: avg,
      sd1p: avg + sd,
      sd2p: avg + 2 * sd,
      sd1m: avg - sd,
      sd2m: avg - 2 * sd,
    };
  }) || [];

  const pbvLast = pbvChartData[pbvChartData.length - 1];
  const pbvStats = ratioBands?.pbv.stats;
  const pbvFooter = pbvStats ? `[ Last PBV = ${pbvLast?.pbv.toFixed(2)} ] (${(pbvStats.avg - 2 * pbvStats.sd).toFixed(2)}) (${(pbvStats.avg - pbvStats.sd).toFixed(2)}) [ AVG = ${pbvStats.avg.toFixed(2)} ] (${(pbvStats.avg + pbvStats.sd).toFixed(2)}) (${(pbvStats.avg + 2 * pbvStats.sd).toFixed(2)})` : '';
  const peInsight = ratioBands?.pe.stats && peLast ? buildBandInsight(peLast.pe, ratioBands.pe.stats.avg, ratioBands.pe.stats.sd) : null;
  const pbvInsight = ratioBands?.pbv.stats && pbvLast ? buildBandInsight(pbvLast.pbv, ratioBands.pbv.stats.avg, ratioBands.pbv.stats.sd) : null;
  const valuationSignal = getValuationSignal(peInsight, pbvInsight);

  // Removed activeTab state

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
      
      {/* Header */}
      <div className="flex flex-wrap border-b border-slate-200 bg-slate-50/50 p-4 gap-2">
        <h2 className="font-black text-lg text-slate-800 flex items-center gap-2">
          📊 Performance, Health & Valuation
        </h2>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in zoom-in-95 duration-300">
          <ChartContainer title={`กำไรสุทธิ (Net Profit)`}> 
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} tickFormatter={(val) => (val/1e6).toFixed(0) + 'M'} />
                  <Tooltip content={<CustomTooltip />} cursor={{fill: '#f8fafc'}} />
                  <Bar dataKey="netProfit" name="Net Profit" radius={[4, 4, 0, 0]} barSize={40}>
                    {history.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={(entry.netProfit || 0) < 0 ? '#ef4444' : '#8b5cf6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>

            <ChartContainer title={`รายได้รวม (Revenue)`}> 
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} tickFormatter={(val) => (val/1e6).toFixed(0) + 'M'} />
                  <Tooltip content={<CustomTooltip />} cursor={{fill: '#f8fafc'}} />
                  <Bar dataKey="revenue" name="Revenue" radius={[4, 4, 0, 0]} barSize={40}>
                    {history.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={(entry.revenue || 0) < 0 ? '#ef4444' : '#3b82f6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>

            <ChartContainer title={`กำไรต่อหุ้น (EPS)`}> 
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                  <Tooltip content={<CustomTooltip unit="THB" />} cursor={{fill: '#f8fafc'}} />
                  <Bar dataKey="eps" name="EPS" radius={[4, 4, 0, 0]} barSize={40}>
                    {history.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={(entry.eps || 0) < 0 ? '#ef4444' : '#0ea5e9'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>

            <ChartContainer title={`อัตรากำไรสุทธิ (NPM %)`}> 
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} unit="%" />
                  <Tooltip content={<CustomTooltip unit="%" />} cursor={{fill: '#f8fafc'}} />
                  <Bar dataKey="npm" name="NPM" radius={[4, 4, 0, 0]} barSize={40}>
                    {history.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={(entry.npm || 0) < 0 ? '#ef4444' : '#ec4899'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>

          {/* Health & Divs Charts */}
          <ChartContainer title={`เงินปันผลต่อหุ้น (DPS)`}> 
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={history}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip content={<CustomTooltip unit="THB" />} cursor={{fill: '#f8fafc'}} />
                <Bar dataKey="dps" name="DPS" radius={[4, 4, 0, 0]} barSize={40}>
                  {history.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={(entry.dps || 0) < 0 ? '#ef4444' : '#10b981'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>

          <ChartContainer title={`อัตราส่วนหนี้สินต่อทุน (D/E)`}> 
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={history}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip content={<CustomTooltip unit="x" />} cursor={{fill: '#f8fafc'}} />
                <Bar dataKey="de" name="D/E" radius={[4, 4, 0, 0]} barSize={40}>
                  {history.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={(entry.de || 0) < 0 ? '#ef4444' : '#f59e0b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>

          {/* Valuation Bands Charts */}
          <ChartContainer title={`PE Band (P/E Ratio Band)`} footer={peFooter}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={peChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} interval={Math.floor(peChartData.length / 10)} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} domain={['auto', 'auto']} />
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="bottom" height={36}/>
                <Line type="monotone" dataKey="pe" name="PE" stroke="#003399" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="sd2m" name="-2SD" stroke="#22c55e" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                <Line type="monotone" dataKey="sd1m" name="-1SD" stroke="#22c55e" strokeWidth={1} strokeDasharray="3 3" dot={false} />
                <Line type="monotone" dataKey="avg" name="AVG" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                <Line type="monotone" dataKey="sd1p" name="+1SD" stroke="#ef4444" strokeWidth={1} strokeDasharray="3 3" dot={false} />
                <Line type="monotone" dataKey="sd2p" name="+2SD" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>

          <ChartContainer title={`PBV Band (P/BV Ratio Band)`} footer={pbvFooter}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={pbvChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} interval={Math.floor(pbvChartData.length / 10)} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} domain={['auto', 'auto']} />
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="bottom" height={36}/>
                <Line type="monotone" dataKey="pbv" name="PBV" stroke="#7e22ce" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="sd2m" name="-2SD" stroke="#22c55e" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                <Line type="monotone" dataKey="sd1m" name="-1SD" stroke="#22c55e" strokeWidth={1} strokeDasharray="3 3" dot={false} />
                <Line type="monotone" dataKey="avg" name="AVG" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                <Line type="monotone" dataKey="sd1p" name="+1SD" stroke="#ef4444" strokeWidth={1} strokeDasharray="3 3" dot={false} />
                <Line type="monotone" dataKey="sd2p" name="+2SD" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>

          <div className="md:col-span-2 bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-4">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Valuation Band Insight</h3>
                <p className="text-xs text-slate-500 mt-1">สรุปตำแหน่งราคาปัจจุบันเทียบโซนสถิติของ PE/PBV ย้อนหลัง</p>
              </div>
              <span className={`text-xs md:text-sm font-bold px-3 py-1.5 rounded-full ${valuationSignal.badgeClass}`}>
                {valuationSignal.label}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
              <InsightCard title="PE Zone" value={peInsight?.zone ?? '-'} subValue={peInsight ? `z=${peInsight.zScore.toFixed(2)}` : 'N/A'} tone={peInsight?.tone ?? 'neutral'} />
              <InsightCard title="PBV Zone" value={pbvInsight?.zone ?? '-'} subValue={pbvInsight ? `z=${pbvInsight.zScore.toFixed(2)}` : 'N/A'} tone={pbvInsight?.tone ?? 'neutral'} />
              <InsightCard title="PE vs AVG" value={peInsight ? `${peInsight.distancePct > 0 ? '+' : ''}${peInsight.distancePct.toFixed(1)}%` : '-'} subValue={peInsight ? `ล่าสุด ${peInsight.lastValue.toFixed(2)}` : 'N/A'} tone={peInsight?.tone ?? 'neutral'} />
              <InsightCard title="PBV vs AVG" value={pbvInsight ? `${pbvInsight.distancePct > 0 ? '+' : ''}${pbvInsight.distancePct.toFixed(1)}%` : '-'} subValue={pbvInsight ? `ล่าสุด ${pbvInsight.lastValue.toFixed(2)}` : 'N/A'} tone={pbvInsight?.tone ?? 'neutral'} />
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-xs font-semibold uppercase text-slate-500">Quick Decision Insight</p>
              <p className="text-sm md:text-base font-bold text-slate-800 mt-1">{valuationSignal.message}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type InsightTone = 'cheap' | 'neutral' | 'expensive';

function buildBandInsight(lastValue: number, avg: number, sd: number) {
  const safeSd = sd > 0 ? sd : 0.0001;
  const zScore = (lastValue - avg) / safeSd;
  const distancePct = avg !== 0 ? ((lastValue - avg) / avg) * 100 : 0;

  if (zScore <= -1) {
    return { zone: 'ต่ำกว่าค่าเฉลี่ย', tone: 'cheap' as InsightTone, zScore, distancePct, lastValue };
  }
  if (zScore >= 1) {
    return { zone: 'สูงกว่าค่าเฉลี่ย', tone: 'expensive' as InsightTone, zScore, distancePct, lastValue };
  }
  return { zone: 'ใกล้ค่าเฉลี่ย', tone: 'neutral' as InsightTone, zScore, distancePct, lastValue };
}

function getValuationSignal(
  peInsight: ReturnType<typeof buildBandInsight> | null,
  pbvInsight: ReturnType<typeof buildBandInsight> | null
) {
  const tones = [peInsight?.tone, pbvInsight?.tone].filter((v): v is InsightTone => !!v);
  const cheapCount = tones.filter((tone) => tone === 'cheap').length;
  const expensiveCount = tones.filter((tone) => tone === 'expensive').length;

  if (cheapCount >= 2) {
    return {
      label: 'Valuation: ค่อนข้างถูก',
      message: 'PE และ PBV อยู่โซนต่ำกว่าค่าเฉลี่ยทั้งคู่ เหมาะสำหรับติดตามจังหวะสะสม',
      badgeClass: 'bg-emerald-100 text-emerald-700',
    };
  }
  if (expensiveCount >= 2) {
    return {
      label: 'Valuation: ค่อนข้างแพง',
      message: 'PE และ PBV อยู่โซนสูงกว่าค่าเฉลี่ยทั้งคู่ ควรรอจังหวะราคาที่ปลอดภัยกว่า',
      badgeClass: 'bg-red-100 text-red-700',
    };
  }
  if (cheapCount > expensiveCount) {
    return {
      label: 'Valuation: เริ่มน่าสนใจ',
      message: 'มีอย่างน้อยหนึ่งตัวชี้วัดอยู่โซนถูก มูลค่าเริ่มน่าสะสมแบบทยอย',
      badgeClass: 'bg-teal-100 text-teal-700',
    };
  }
  if (expensiveCount > cheapCount) {
    return {
      label: 'Valuation: กลางค่อนไปแพง',
      message: 'มีอย่างน้อยหนึ่งตัวชี้วัดอยู่โซนแพง แนะนำถือหรือรอราคาย่อลง',
      badgeClass: 'bg-amber-100 text-amber-700',
    };
  }
  return {
    label: 'Valuation: กลางโซน',
    message: 'PE และ PBV อยู่ใกล้ค่าเฉลี่ยประวัติศาสตร์ ควรใช้ปัจจัยคุณภาพและแนวโน้มร่วมตัดสินใจ',
    badgeClass: 'bg-blue-100 text-blue-700',
  };
}

function InsightCard({
  title,
  value,
  subValue,
  tone
}: {
  title: string;
  value: string;
  subValue: string;
  tone: InsightTone | 'neutral';
}) {
  const toneClass =
    tone === 'cheap'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : tone === 'expensive'
        ? 'border-red-200 bg-red-50 text-red-700'
        : 'border-slate-200 bg-slate-50 text-slate-700';

  return (
    <div className={`rounded-xl border px-3 py-2 ${toneClass}`}>
      <p className="text-[10px] font-semibold uppercase">{title}</p>
      <p className="text-sm font-extrabold mt-0.5">{value}</p>
      <p className="text-[10px] mt-0.5 opacity-80">{subValue}</p>
    </div>
  );
}
