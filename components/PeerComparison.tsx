'use client';

import React, { useState, useEffect } from 'react';
import { calculateScorecard } from '@/lib/calculations';
import type { StockScorecard } from '@/types/stock';

// Type definitions for the JSON data
interface SectorData {
  sectors: Record<string, string[]>;
  meta: Record<string, { group: string; name: string }>;
  tickers: Record<string, { sector: string; group: string }>;
}

let sectorDataCache: SectorData | null = null;

const loadSectorData = async (): Promise<SectorData> => {
  if (sectorDataCache) {
    return sectorDataCache;
  }
  const module = await import('@/data/stock_sectors.json');
  sectorDataCache = module.default as unknown as SectorData;
  return sectorDataCache;
};

// Helper to find sector info by ticker
const getSectorInfoForTicker = async (ticker: string) => {
  const sectorData = await loadSectorData();
  const upperTicker = ticker.toUpperCase();
  const info = sectorData.tickers[upperTicker];
  if (info) {
    const sectorCode = info.sector;
    const meta = sectorData.meta[sectorCode];
    return {
      code: sectorCode,
      name: meta?.name || sectorCode,
      group: meta?.group || info.group,
      peers: sectorData.sectors[sectorCode] || []
    };
  }
  return null;
};

interface PeerData {
  ticker: string;
  price: number | null;
  pe: number | null;
  pbv: number | null;
  roe: number | null;
  de: number | null;
  yield: number | null;
  score: number | null;
  scorecard: StockScorecard | null;
  sector?: string; // Add sector info
  industry?: string; // Add industry info
  isLoading: boolean;
  error: string | null;
}

interface PeerComparisonProps {
  mainTicker: string;
  onSelectTicker: (ticker: string) => void;
}

export default function PeerComparison({ mainTicker, onSelectTicker }: PeerComparisonProps) {
  const [sector, setSector] = useState<string | null>(null);
  const [sectorName, setSectorName] = useState<string | null>(null);
  const [customPeers, setCustomPeers] = useState<string>('');
  const [peersData, setPeersData] = useState<PeerData[]>([]);
  const [isFetching, setIsFetching] = useState(false);

  // Initialize peer list
  useEffect(() => {
    let active = true;

    const initializePeers = async () => {
      const info = await getSectorInfoForTicker(mainTicker);
      if (!active) {
        return;
      }
      
      let peersToFetch: string[] = [];
      if (info) {
        setSector(info.code);
        setSectorName(`${info.group} > ${info.name}`);
        
        // Get peers and ensure mainTicker is included
        peersToFetch = [...info.peers];
        if (!peersToFetch.includes(mainTicker.toUpperCase())) {
          peersToFetch.unshift(mainTicker.toUpperCase());
        }
        
        // Move mainTicker to front
        peersToFetch = peersToFetch.filter(t => t !== mainTicker.toUpperCase());
        peersToFetch.unshift(mainTicker.toUpperCase());
        
        // Limit to top 15 to avoid performance issues
        if (peersToFetch.length > 15) {
          peersToFetch = peersToFetch.slice(0, 15);
        }
        
        setCustomPeers(peersToFetch.join(', '));
        fetchPeersData(peersToFetch);
      } else {
        // If not found in local JSON (e.g. MAI stock), fetch data for the ticker first to see if we can get sector from Yahoo
        setSector(null);
        setSectorName(null);
        peersToFetch = [mainTicker.toUpperCase()];
        setCustomPeers(peersToFetch.join(', '));
        fetchPeersData(peersToFetch); // Fetch the main ticker first
      }
    };

    initializePeers();
    return () => {
      active = false;
    };
  }, [mainTicker]);

  const fetchPeersData = async (tickers: string[]) => {
    setIsFetching(true);
    // Setup initial state
    const initialData: PeerData[] = tickers.map(t => ({
      ticker: t,
      price: null, pe: null, pbv: null, roe: null, de: null, yield: null,
      score: null, scorecard: null, isLoading: true, error: null
    }));
    setPeersData(initialData);

    // Fetch parallelly
    const fetchPromises = tickers.map(async (ticker) => {
      try {
        const res = await fetch(`/api/stock?ticker=${ticker}`);
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error || 'Failed');
        
        // If this is the main ticker and we don't have a sector yet, try to use Yahoo sector
        if (ticker === mainTicker.toUpperCase() && !sector) {
            if (data.sector || data.industry) {
                // Update sector state (side effect in render loop - careful, but okay for async)
                // Better to do this after all promises resolve or use a callback, but let's try direct state update via effect or here
                // We'll update it via a separate check later or just display it
            }
        }

        // Calculate Score if possible
        let score = null;
        let sc: StockScorecard | null = null;
        if (data.history && data.history.length > 0) {
            // Very simplified scorecard generation just to get a score
            // In reality, we need full data, but we can do our best.
            try {
                // Mock historical data structure for calculateScorecard
                sc = calculateScorecard(
                    ticker,
                    data.history,
                    data.currentPrice || null,
                    null, // fairPrice is omitted to keep simple
                    data.pe || null,
                    data.pbv || null,
                    data.ratioBands?.pe?.stats?.avg || null,
                    data.ratioBands?.pbv?.stats?.avg || null
                );
                score = sc.totalScore;
            } catch (e) {
                // Ignore score calc error
            }
        }

        return {
          ticker,
          price: data.currentPrice || null,
          pe: data.pe || null,
          pbv: data.pbv || null,
          roe: data.roe || null,
          de: data.debtToEquity || null,
          yield: data.dividendYield || null,
          score,
          scorecard: sc,
          sector: data.sector,
          industry: data.industry,
          isLoading: false,
          error: null
        };
      } catch (err: any) {
        return {
          ticker,
          price: null, pe: null, pbv: null, roe: null, de: null, yield: null,
          score: null, scorecard: null,
          isLoading: false,
          error: err.message
        };
      }
    });

    const results = await Promise.all(fetchPromises);
    setPeersData(results);
    
    // Check if main ticker has sector info from Yahoo (fallback)
    const mainPeer = results.find(p => p.ticker === mainTicker.toUpperCase());
    if (mainPeer && !sector && (mainPeer.sector || mainPeer.industry)) {
        setSectorName(`${mainPeer.sector || ''} > ${mainPeer.industry || ''} (Yahoo)`);
    }
    
    setIsFetching(false);
  };

  const handleCustomPeersSubmit = (e: React.FormEvent) => {
     e.preventDefault();
     const tickers = customPeers.split(',').map(t => t.trim().toUpperCase()).filter(t => t);
     if (tickers.length > 0) {
         fetchPeersData(tickers);
     }
  };

  // Calculate Averages (exclude nulls)
  const calculateAvg = (key: keyof PeerData) => {
    const validData = peersData.filter(p => !p.isLoading && !p.error && typeof p[key] === 'number' && p[key] !== null);
    if (validData.length === 0) return null;
    const sum = validData.reduce((acc, p) => acc + (p[key] as number), 0);
    return sum / validData.length;
  };

  const avgPE = calculateAvg('pe');
  const avgPBV = calculateAvg('pbv');
  const avgROE = calculateAvg('roe');
  const avgDE = calculateAvg('de');
  const avgYield = calculateAvg('yield');
  const sortedPeersData = [...peersData].sort((a, b) => {
    if (a.isLoading !== b.isLoading) return a.isLoading ? 1 : -1;
    if (!!a.error !== !!b.error) return a.error ? 1 : -1;
    if (a.score === null && b.score === null) return a.ticker.localeCompare(b.ticker);
    if (a.score === null) return 1;
    if (b.score === null) return -1;
    return b.score - a.score;
  });

  return (
    <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 flex flex-col gap-6 relative overflow-hidden">
      {/* Background Decorator */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 -z-10"></div>
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <span className="text-xl">🔍</span> Peer Comparison
          </h2>
          <p className="text-slate-500 text-xs mt-1 flex items-center gap-2">
            เปรียบเทียบ {mainTicker.toUpperCase()} กับหุ้นในกลุ่มอุตสาหกรรม {sectorName ? `(${sectorName})` : '(กำหนดเอง)'}
          </p>
        </div>
        
        <form onSubmit={handleCustomPeersSubmit} className="flex items-center gap-2">
           <input 
              type="text" 
              value={customPeers}
              onChange={(e) => setCustomPeers(e.target.value)}
              placeholder="e.g. SCB, KBANK, BBL"
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none w-48 uppercase"
           />
           <button 
             type="submit"
             disabled={isFetching}
             className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
           >
             Compare
           </button>
        </form>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 hide-scrollbar">
        <table className="w-full text-xs text-left">
          <thead className="bg-indigo-50/50 text-indigo-900 border-b border-indigo-100">
            <tr>
              <th className="px-2 py-2 font-bold whitespace-nowrap">Ticker</th>
              <th className="px-2 py-2 text-right font-bold whitespace-nowrap">Price</th>
              <th className="px-2 py-2 text-right font-bold whitespace-nowrap">P/E</th>
              <th className="px-2 py-2 text-right font-bold whitespace-nowrap">P/BV</th>
              <th className="px-2 py-2 text-right font-bold whitespace-nowrap">ROE%</th>
              <th className="px-2 py-2 text-right font-bold whitespace-nowrap">D/E</th>
              <th className="px-2 py-2 text-right font-bold whitespace-nowrap">Yld%</th>
              <th className="px-2 py-2 text-center font-bold whitespace-nowrap">Score ↓</th>
            </tr>
          </thead>
          <tbody>
            {sortedPeersData.map((peer, i) => {
              const isMain = peer.ticker === mainTicker.toUpperCase();
              return (
                <tr key={peer.ticker} className={`border-b border-slate-50 transition-colors ${isMain ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}`}>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-1">
                      <span
                        onClick={() => onSelectTicker(peer.ticker)}
                        className={`font-black cursor-pointer hover:underline ${isMain ? 'text-indigo-700' : 'text-slate-800'}`}
                      >
                        {peer.ticker}
                      </span>
                      {isMain && <span className="px-1 py-0.5 bg-indigo-100 text-indigo-700 text-[8px] rounded-full font-bold">Target</span>}
                    </div>
                  </td>
                  
                  {peer.isLoading ? (
                    <td colSpan={7} className="px-2 py-2 text-center text-slate-400">Loading...</td>
                  ) : peer.error ? (
                    <td colSpan={7} className="px-2 py-2 text-center text-red-400 text-[10px]">Err</td>
                  ) : (
                    <>
                      <td className="px-2 py-2 text-right font-medium text-slate-700">
                        {peer.price ? peer.price.toFixed(2) : '-'}
                      </td>
                      <td className={`px-2 py-2 text-right font-medium ${peer.pe && avgPE && peer.pe < avgPE ? 'text-emerald-600' : 'text-slate-600'}`}>
                        {peer.pe ? peer.pe.toFixed(2) : '-'}
                      </td>
                      <td className={`px-2 py-2 text-right font-medium ${peer.pbv && avgPBV && peer.pbv < avgPBV ? 'text-emerald-600' : 'text-slate-600'}`}>
                        {peer.pbv ? peer.pbv.toFixed(2) : '-'}
                      </td>
                      <td className={`px-2 py-2 text-right font-medium ${peer.roe && avgROE && peer.roe > avgROE ? 'text-emerald-600' : 'text-slate-600'}`}>
                        {peer.roe ? (peer.roe * 100).toFixed(1) : '-'}
                      </td>
                      <td className={`px-2 py-2 text-right font-medium ${peer.de && avgDE && peer.de < avgDE ? 'text-emerald-600' : 'text-slate-600'}`}>
                        {peer.de ? peer.de.toFixed(2) : '-'}
                      </td>
                      <td className={`px-2 py-2 text-right font-medium ${peer.yield && avgYield && peer.yield > avgYield ? 'text-emerald-600' : 'text-slate-600'}`}>
                        {peer.yield ? (peer.yield * 100).toFixed(1) : '-'}
                      </td>
                      <td className="px-2 py-2 text-center">
                         {peer.score !== null ? (
                             <span className={`px-1.5 py-0.5 flex justify-center items-center rounded text-[10px] font-bold gap-0.5 ${
                                peer.score >= 15 ? 'bg-emerald-100 text-emerald-800' :
                                peer.score >= 10 ? 'bg-blue-100 text-blue-800' :
                                peer.score >= 5 ? 'bg-amber-100 text-amber-800' :
                                'bg-red-100 text-red-800'
                             }`}>
                                {peer.score}
                             </span>
                         ) : '-'}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
            
            {/* Industry Average Row */}
            {!isFetching && peersData.length > 0 && (
               <tr className="bg-slate-100/80 font-bold border-t-2 border-slate-200 text-[10px]">
                 <td className="px-2 py-2 text-slate-700">AVG</td>
                 <td className="px-2 py-2 text-right text-slate-400">-</td>
                 <td className="px-2 py-2 text-right text-slate-800">{avgPE ? avgPE.toFixed(2) : '-'}</td>
                 <td className="px-2 py-2 text-right text-slate-800">{avgPBV ? avgPBV.toFixed(2) : '-'}</td>
                 <td className="px-2 py-2 text-right text-slate-800">{avgROE ? (avgROE * 100).toFixed(1) : '-'}</td>
                 <td className="px-2 py-2 text-right text-slate-800">{avgDE ? avgDE.toFixed(2) : '-'}</td>
                 <td className="px-2 py-2 text-right text-slate-800">{avgYield ? (avgYield * 100).toFixed(1) : '-'}</td>
                 <td className="px-2 py-2"></td>
               </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
