'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  calculateDDM, calculateGrahamNumber, 
  calculateConsensus, calculateScorecard, calculateTrendAnalysis,
  calculateScenarioAnalysis, getStatus as getStatusCalc, calculateShares as calcShares, calculateDCF,
  calculateInvestmentSignal, calculateImpliedGrowth
} from '@/lib/calculations';
import SettingsModal from '@/components/layout/SettingsModal';
import type { 
  ValuationConsensus, StockScorecard, TrendAnalysis, ScenarioAnalysis as ScenarioAnalysisType,
  StockHistory, RatioBands, DDMResult, ScreeningResult, AppMode, BudgetMode, AllocationRatio, GrowthMethod,
  FScoreResult, ZScoreResult, InvestmentSignal, ReverseDDMResult
} from '@/types/stock';
import Header from '@/components/layout/Header';
import { useNotifications } from '@/hooks/useNotifications';
import { usePortfolio } from '@/hooks/usePortfolio';
import InputForm from '@/components/input/InputForm';
import SingleStockView from '@/components/stock/SingleStockView';
import MultiScreeningView from '@/components/stock/MultiScreeningView';
import PortfolioView from '@/components/portfolio/PortfolioView';
import RealPortfolioView from '@/components/portfolio/RealPortfolioView';
import DividendEventsView from '@/components/portfolio/DividendEventsView';
import TransactionModal from '@/components/portfolio/TransactionModal';
import ScreenerView from '@/components/stock/ScreenerView';
import InvestmentJournal from '@/components/InvestmentJournal';
import Login from '@/components/auth/Login';
import DailyBriefingPanel from '@/components/layout/DailyBriefingPanel';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  const [ticker, setTicker] = useState('ADVANC');
  const [searchedTicker, setSearchedTicker] = useState('ADVANC');
  const tickerInputRef = useRef<HTMLInputElement | null>(null);
  const [stockHistory, setStockHistory] = useState<StockHistory[]>([]);
  const [ratioBands, setRatioBands] = useState<RatioBands | null>(null);
  const [currentPrice, setCurrentPrice] = useState('');
  const [d0, setD0] = useState('10.61');
  const [ks, setKs] = useState('10');
  const [g, setG] = useState('5');
  const [explicitYears, setExplicitYears] = useState('5');
  
  // Check auth session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: any } }) => {
      setSession(session);
      setIsLoadingSession(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // App Mode
  const [mode, setMode] = useState<AppMode>('single');
  const [multiTickers, setMultiTickers] = useState(`TU
TISCO
SCB
MC
MEGA
ICHI
BKIH
TLI
TACC
HTC
TTW`);
  const [multiResults, setMultiResults] = useState<ScreeningResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  
  // Settings
  const [showSettings, setShowSettings] = useState(false);

  // Portfolio Logic from Hook
  const {
    portfolios,
    currentPortfolioId,
    setCurrentPortfolioId,
    portfolio,
    setPortfolio,
    fetchPortfolioData,
    
    isPortfolioModalOpen,
    setIsPortfolioModalOpen,
    newPortfolioName,
    setNewPortfolioName,
    editingPortfolioId,
    
    isSaveModalOpen,
    setIsSaveModalOpen,
    saveTargetPortfolioId,
    setSaveTargetPortfolioId,
    itemsToSave,

    openCreateModal,
    openEditModal,
    handleCreateOrUpdatePortfolio,
    handleDeletePortfolioGroup,
    handleDeletePortfolioItem,
    handleSaveToPortfolio,
    handleSaveAllToPortfolio,
    confirmSaveToPortfolio
  } = usePortfolio(setIsLoadingData);
  const {
    telegramBotToken,
    setTelegramBotToken,
    telegramChatId,
    setTelegramChatId,
    saveSettings: baseSaveSettings,
    checkPriceAlerts
  } = useNotifications();

  const saveSettings = () => {
    baseSaveSettings();
    setShowSettings(false);
    alert('บันทึกการตั้งค่าเรียบร้อยแล้ว');
  };

  // Growth Assistant States
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [assistantMethod, setAssistantMethod] = useState<GrowthMethod>('sustainable');
  const [roe, setRoe] = useState('12');
  const [payoutRatio, setPayoutRatio] = useState('50');
  const [divStart, setDivStart] = useState('');
  const [divEnd, setDivEnd] = useState('');
  const [yearsCount, setYearsCount] = useState('5');

  // Budget & Allocation
  const [totalBudget, setTotalBudget] = useState('5,000,000');
  const [budgetMode, setBudgetMode] = useState<BudgetMode>('total');
  const [allocationRatio, setAllocationRatio] = useState<AllocationRatio>({
    mos30: 30, // 30%
    mos40: 40, // 40%
    mos50: 30  // 30%
  });

  const [result, setResult] = useState<DDMResult | null>(null);
  const [fcf, setFcf] = useState<number | null>(null);

  // === NEW: Multi-Model Valuation States ===
  const [consensus, setConsensus] = useState<ValuationConsensus | null>(null);
  const [scorecard, setScorecard] = useState<StockScorecard | null>(null);
  const [fScore, setFScore] = useState<FScoreResult | null>(null);
  const [zScore, setZScore] = useState<ZScoreResult | null>(null);
  const [trendAnalysis, setTrendAnalysis] = useState<TrendAnalysis | null>(null);
  const [scenarioAnalysis, setScenarioAnalysis] = useState<ScenarioAnalysisType | null>(null);
  const [investmentSignal, setInvestmentSignal] = useState<InvestmentSignal | null>(null);
  const [reverseDdm, setReverseDdm] = useState<ReverseDDMResult | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [journalTicker, setJournalTicker] = useState<string | null>(null);
  const [sector, setSector] = useState<string | null>(null);
  const [industry, setIndustry] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [thaiCompanyName, setThaiCompanyName] = useState<string | null>(null);

  // === Transaction Modal State ===
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [transactionTicker, setTransactionTicker] = useState('');
  const [refreshRealPortfolioTrigger, setRefreshRealPortfolioTrigger] = useState(0);

  useEffect(() => {
    setIsClient(true);
    if (mode === 'portfolio') {
      fetchPortfolioData().then(async data => {
        if (data && data.length > 0 && data.some((i: any) => i.d0 === undefined || i.d0 === null)) {
          const { updatedPortfolio, hasUpdates } = await checkPriceAlerts(data, setIsLoadingData, true);
          if (hasUpdates) {
            setPortfolio(updatedPortfolio);
          }
        }
      });
    }
    
  }, [mode, fetchPortfolioData, checkPriceAlerts, setPortfolio]);

  const handleManualPriceCheck = async () => {
    const { updatedPortfolio, hasUpdates } = await checkPriceAlerts(portfolio, setIsLoadingData, false);
    if (hasUpdates) {
      setPortfolio(updatedPortfolio);
    }
  };

  const fetchStockData = async (targetTicker?: string | React.MouseEvent | any) => {
    const tickerStr = typeof targetTicker === 'string' ? targetTicker : ticker;
    const tickerToFetch = tickerStr.toUpperCase();
    if (!tickerToFetch) return;
    setIsLoadingData(true);
    setError(null);
    setStockHistory([]);
    try {
      const res = await fetch(`/api/stock?ticker=${tickerToFetch}`);
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to fetch data');
      
      if (data.currentPrice) setCurrentPrice(data.currentPrice.toFixed(2));
      if (data.d0) setD0(data.d0.toFixed(2));
      if (data.roe) setRoe((data.roe * 100).toFixed(2));
      if (data.payoutRatio) setPayoutRatio((data.payoutRatio * 100).toFixed(2));
      
      if (data.history) {
        setStockHistory(data.history);
      }
      if (data.fcf) {
        setFcf(data.fcf);
      }
      
      if (data.ratioBands) {
        setRatioBands(data.ratioBands);
      }

      if (data.fScore) {
        setFScore(data.fScore);
      }
      
      if (data.zScore) {
        setZScore(data.zScore);
      }
      
      // Auto-open assistant if we have ROE/Payout data
      if (data.roe || data.payoutRatio) {
        setIsAssistantOpen(true);
        setAssistantMethod('sustainable');

        // Auto-apply sustainable growth rate to match Multi-Screening logic
        let gCalc = 0;
        const roeVal = data.roe || 0;
        const payoutVal = data.payoutRatio || 0;
        
        if (roeVal && payoutVal) {
          gCalc = roeVal * Math.max(0, 1 - payoutVal);
        }
        
        if (gCalc > 0.07) {
          gCalc = 0.07;
        }
        
        setG((gCalc * 100).toFixed(2));
      }

      setSector(data.sector || null);
      setIndustry(data.industry || null);
      setCompanyName(data.longName || data.shortName || null);
      setThaiCompanyName(data.thaiCompanyName || null);
      setSearchedTicker(tickerToFetch);
      
    } catch (err: any) {
      setError(`ไม่สามารถดึงข้อมูลหุ้น ${tickerToFetch} ได้: ${err.message}`);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleSelectScreenerTicker = async (selectedTicker: string) => {
    const nextTicker = selectedTicker.toUpperCase();
    setTicker(nextTicker);
    setMode('single');
    await fetchStockData(nextTicker);
  };

  const handleSelectPeerTicker = (selectedTicker: string) => {
    const nextTicker = selectedTicker.toUpperCase();
    setTicker(nextTicker);
    requestAnimationFrame(() => {
      if (!tickerInputRef.current) return;
      tickerInputRef.current.focus();
      tickerInputRef.current.select();
      tickerInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  const validateInputs = (data: any) => {
    const { d0, g, ks, years } = data;
    if (isNaN(d0) || d0 < 0) throw new Error('เงินปันผล (D0) ต้องเป็นตัวเลขที่มากกว่าหรือเท่ากับ 0');
    if (isNaN(g)) throw new Error('อัตราการเติบโต (g) ต้องเป็นตัวเลข');
    if (isNaN(ks) || ks <= 0) throw new Error('ผลตอบแทนที่คาดหวัง (ks) ต้องเป็นตัวเลขที่มากกว่า 0');
    if (isNaN(years) || years <= 0) throw new Error('จำนวนปีต้องเป็นตัวเลขที่มากกว่า 0');
    if (g >= ks) throw new Error(`อัตราการเติบโต (g=${(g * 100).toFixed(2)}%) ต้องน้อยกว่าอัตราผลตอบแทนที่คาดหวัง (ks=${(ks * 100).toFixed(2)}%) เพื่อให้แบบจำลองทำงานได้`);
  };

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      if (mode === 'single') {
        const d0Num = parseFloat(d0);
        let gNum = parseFloat(g) / 100;
        const ksNum = parseFloat(ks) / 100;
        const yearsNum = parseInt(explicitYears);
        const currentPriceNum = currentPrice ? parseFloat(currentPrice) : null;

        // Cap g at 7% (0.07)
        if (gNum > 0.07) {
          gNum = 0.07;
          setG('7.00'); // Update input to reflect capped value
        }

        validateInputs({ d0: d0Num, g: gNum, ks: ksNum, years: yearsNum });

        console.log(`Calculating DDM for ${searchedTicker} with parameters: d0=${d0Num}, g=${gNum}, ks=${ksNum}, years=${yearsNum}, price=${currentPriceNum}`);

        const res = calculateDDM(searchedTicker || 'Unknown', d0Num, gNum, ksNum, yearsNum, currentPriceNum);
        console.log(`DDM Result Fair Price: ${res.fairPrice}`);
        setResult(res);
        
        const reverseDdmRes = calculateImpliedGrowth(currentPriceNum, d0Num, ksNum);
        setReverseDdm(reverseDdmRes);

        let consensusResult: ValuationConsensus | null = null;
        let sc: StockScorecard | null = null;
        let trend: TrendAnalysis | null = null;
        let scenario: ScenarioAnalysisType | null = null;

        if (stockHistory.length > 0) {
          const latestHistory = stockHistory[stockHistory.length - 1];
          const grahamRes = calculateGrahamNumber(
            latestHistory?.eps || null,
            latestHistory?.bvps || null,
            currentPriceNum
          );

          let peBandFair: number | null = null;
          if (ratioBands?.pe?.stats && latestHistory?.eps && latestHistory.eps > 0) {
            const peAtMinus1SD = ratioBands.pe.stats.avg - ratioBands.pe.stats.sd;
            peBandFair = peAtMinus1SD * latestHistory.eps;
          }

          let dcfFair: number | null = null;
          if (fcf !== null && latestHistory?.shares) {
            const dcfRes = calculateDCF(fcf, latestHistory.shares);
            if (dcfRes) dcfFair = dcfRes.fairValue;
          }

          consensusResult = calculateConsensus(
            res.fairPrice,
            grahamRes?.grahamNumber || null,
            peBandFair,
            dcfFair,
            currentPriceNum
          );
          setConsensus(consensusResult);

          sc = calculateScorecard(
            searchedTicker,
            stockHistory,
            currentPriceNum,
            res.fairPrice,
            ratioBands?.pe?.data?.length ? ratioBands.pe.data[ratioBands.pe.data.length - 1]?.value : null,
            ratioBands?.pbv?.data?.length ? ratioBands.pbv.data[ratioBands.pbv.data.length - 1]?.value : null,
            ratioBands?.pe?.stats?.avg || null,
            ratioBands?.pbv?.stats?.avg || null
          );
          setScorecard(sc);

          trend = calculateTrendAnalysis(searchedTicker, stockHistory);
          setTrendAnalysis(trend);

          scenario = calculateScenarioAnalysis(searchedTicker, d0Num, currentPriceNum, yearsNum);
          setScenarioAnalysis(scenario);
        }

        const signal = calculateInvestmentSignal({
          result: res,
          consensus: consensusResult,
          scorecard: sc,
          fScore,
          zScore,
          trendAnalysis: trend,
          scenarioAnalysis: scenario,
        });
        setInvestmentSignal(signal);

      } else {
        const tickersRaw = multiTickers.split(/[\n,]+/).map(t => t.trim()).filter(t => t !== '');
        if (tickersRaw.length === 0) throw new Error('กรุณาระบุชื่อหุ้นอย่างน้อย 1 ตัว');

        setIsLoadingData(true);
        const ksNum = parseFloat(ks) / 100;
        const yearsNum = parseInt(explicitYears);

        // Fetch data for all tickers
        const results = await Promise.all(tickersRaw.map(async (item) => {
          try {
            const parts = item.split(':');
            const t = parts[0].trim();
            // If price is provided in input, use it. Otherwise use fetched price.
            const inputPrice = parts[1] ? parseFloat(parts[1].trim()) : null;

            // Use full mode for consistent data with Single Stock (especially ROE and History)
            const res = await fetch(`/api/stock?ticker=${t}`);
            const data = await res.json();

            let resultItem = null;

            if (!res.ok) {
              resultItem = { 
                ticker: t, 
                error: data.error || 'Failed to fetch', 
                d0: 0, g: 0, ks: 0, fairPrice: 0, margin: null, status: 'Error', recommendation: 'N/A', currentPrice: null
              } as any;
            } else {

              // Calculate g using Sustainable Growth Rate
              // g = ROE * (1 - PayoutRatio)
              let gCalc = 0;
              const roeVal = data.roe || 0;
              const payoutVal = data.payoutRatio || 0;
              
              if (roeVal && payoutVal) {
                // Prevent negative growth solely due to payout > 100%
                gCalc = roeVal * Math.max(0, 1 - payoutVal);
              }

              // Cap g at 7% (0.07) as per requirement
              if (gCalc > 0.07) {
                gCalc = 0.07;
              }

              // Match Single Stock rounding logic: round to 2 decimal places (percentage) then parse back
              // Example: 0.010563 -> "1.06" -> 1.06 -> 0.0106
              const gCalcRoundedStr = (gCalc * 100).toFixed(2);
              gCalc = parseFloat(gCalcRoundedStr) / 100;

              const priceToUse = inputPrice || data.currentPrice;
              const d0Val = data.d0 || 0;

              let calculation = null;
              if (gCalc < ksNum) {
                calculation = calculateDDM(t, d0Val, gCalc, ksNum, yearsNum, priceToUse);
              } else {
                // Fallback calculation for display purposes only (showing g > ks error)
                calculation = {
                  ticker: t,
                  currentPrice: priceToUse,
                  d0: d0Val,
                  g: gCalc,
                  ks: ksNum,
                  fairPrice: 0, // Invalid
                  margin: null,
                  status: 'Error: g >= ks',
                  recommendation: 'N/A',
                  tableData: []
                };
              }

              // Calculate MOS Prices and Status
              const fairPrice = calculation.fairPrice;
              const mos30Price = fairPrice * 0.7;
              const mos40Price = fairPrice * 0.6;
              const mos50Price = fairPrice * 0.5;
              
              const statusInfo = getStatusCalc(priceToUse, mos30Price, mos40Price, mos50Price, fairPrice);
              
              // Calculate Budget Allocation per Ticker
              let perTickerBudget = parseFloat(totalBudget.replace(/,/g, ''));
              if (isNaN(perTickerBudget)) perTickerBudget = 0;
              
              if (budgetMode === 'total') {
                perTickerBudget = perTickerBudget / tickersRaw.length;
              }
              const budget30 = perTickerBudget * (allocationRatio.mos30 / 100);
              const budget40 = perTickerBudget * (allocationRatio.mos40 / 100);
              const budget50 = perTickerBudget * (allocationRatio.mos50 / 100);

              // Calculate Shares and Costs
              const shares30 = calcShares(budget30, mos30Price);
              const cost30 = shares30 * mos30Price;
              
              const shares40 = calcShares(budget40, mos40Price);
              const cost40 = shares40 * mos40Price;
              
              const shares50 = calcShares(budget50, mos50Price);
              const cost50 = shares50 * mos50Price;

              resultItem = {
                ...calculation,
                pe: data.pe,
                pbv: data.pbv,
                eps: data.eps,
                debtToEquity: data.debtToEquity,
                roa: data.roa,
                marketCap: data.marketCap,
                dividendYield: data.dividendYield,
                roe: roeVal,
                payoutRatio: payoutVal,
                mos30Price, mos40Price, mos50Price,
                shares30, cost30,
                shares40, cost40,
                shares50, cost50,
                statusLabel: statusInfo.label,
                statusColor: statusInfo.color
              };
            }
            
            // Incremental Update
            setMultiResults(prev => [...prev, resultItem]);
            return resultItem;

          } catch (err) {
            const errorItem = { 
              ticker: item, 
              error: 'Error processing',
              d0: 0, g: 0, ks: 0, fairPrice: 0, margin: null, status: 'Error', recommendation: 'N/A', currentPrice: null
            } as any;
            setMultiResults(prev => [...prev, errorItem]);
            return errorItem;
          }
        }));

        // setMultiResults(results); // Removed bulk update
        setIsLoadingData(false);

      }
    } catch (err: any) {
      setError(err.message);
      setIsLoadingData(false);
    }
  };

  const calculateAssistantG = () => {
    try {
      let calculatedG = 0;
      if (assistantMethod === 'sustainable') {
        const r = parseFloat(roe);
        const p = parseFloat(payoutRatio);
        if (isNaN(r) || isNaN(p)) return '0.00';
        // Prevent negative growth solely due to payout > 100%
        calculatedG = (r / 100) * Math.max(0, 1 - p / 100) * 100;
      } else if (assistantMethod === 'historical') {
        const start = parseFloat(divStart);
        const end = parseFloat(divEnd);
        const n = parseInt(yearsCount);
        if (isNaN(start) || isNaN(end) || isNaN(n) || start <= 0 || n <= 0) return '0.00';
        calculatedG = (Math.pow(end / start, 1 / n) - 1) * 100;
      } else if (assistantMethod === 'preset') {
        calculatedG = 3;
      }
      return calculatedG.toFixed(2);
    } catch (e) {
      return '0.00';
    }
  };

  const applyAssistantG = () => {
    const suggested = calculateAssistantG();
    const ksNum = parseFloat(ks);
    let gNum = parseFloat(suggested);
    
    // Cap g at 7%
    if (gNum > 7) {
      gNum = 7;
    }

    if (!isNaN(ksNum) && !isNaN(gNum) && gNum >= ksNum) {
      const adjusted = (ksNum - 0.01).toFixed(2);
      setG(parseFloat(adjusted) > 7 ? '7.00' : adjusted);
    } else {
      setG(gNum.toFixed(2));
    }
    setIsAssistantOpen(false);
  };

  const handleOpenTransactionModal = (ticker?: string) => {
    setTransactionTicker(ticker || '');
    setIsTransactionModalOpen(true);
  };

  const handleTransactionSaved = () => {
    setRefreshRealPortfolioTrigger(prev => prev + 1);
  };

  const handleClearSearch = () => {
    setTicker('');
    setSearchedTicker('');
    setCurrentPrice('');
    setD0('');
    setG('5');
    setKs('10');
    setExplicitYears('5');
    setRoe('12');
    setPayoutRatio('50');
    setDivStart('');
    setDivEnd('');
    setYearsCount('5');
    setStockHistory([]);
    setRatioBands(null);
    setResult(null);
    setFcf(null);
    setConsensus(null);
    setScorecard(null);
    setFScore(null);
    setZScore(null);
    setTrendAnalysis(null);
    setScenarioAnalysis(null);
    setInvestmentSignal(null);
    setReverseDdm(null);
    setSector(null);
    setIndustry(null);
    setCompanyName(null);
    setThaiCompanyName(null);
    setError(null);
    setIsAssistantOpen(false);
  };

  if (isLoadingSession) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!session) {
    return <Login onLoginSuccess={() => {}} />;
  }

  return (
    <div suppressHydrationWarning className="min-h-screen bg-slate-50 pb-20 font-sans">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-slate-50/80 backdrop-blur-sm border-b border-slate-200/50">
        <div className="max-w-[95%] mx-auto p-4 md:p-8 pb-4">
          <Header 
            mode={mode}
            setMode={setMode}
            setError={setError} 
            setShowSettings={setShowSettings} 
          />
        </div>
      </div>

      <div className="pt-6">
        <DailyBriefingPanel />
      </div>

      <div suppressHydrationWarning className="max-w-[95%] mx-auto space-y-8 p-4 md:p-8 pt-0">

        {/* Main Content Area */}
        {mode === 'single' ? (
          // === Single Stock Mode: Full Width Layout (Internal Grid) ===
          <SingleStockView
            result={result}
            ticker={searchedTicker}
            companyName={companyName}
            thaiCompanyName={thaiCompanyName}
            currentPrice={currentPrice ? parseFloat(currentPrice) : null}
            stockHistory={stockHistory}
            ratioBands={ratioBands}
            consensus={consensus}
            scorecard={scorecard}
            fScore={fScore}
            zScore={zScore}
            trendAnalysis={trendAnalysis}
            scenarioAnalysis={scenarioAnalysis}
            investmentSignal={investmentSignal}
            reverseDdm={reverseDdm}
            error={error}
            onSelectPeerTicker={handleSelectPeerTicker}
            sector={sector}
            industry={industry}
            >
            {/* Pass InputForm as Children for Sidebar Layout */}
            <InputForm
                mode={mode}
                isLoadingData={isLoadingData}
                isClient={isClient}
                ticker={ticker}
                setTicker={setTicker}
                fetchStockData={fetchStockData}
                currentPrice={currentPrice}
                setCurrentPrice={setCurrentPrice}
                multiTickers={multiTickers}
                setMultiTickers={setMultiTickers}
                totalBudget={totalBudget}
                setTotalBudget={setTotalBudget}
                budgetMode={budgetMode}
                setBudgetMode={setBudgetMode}
                allocationRatio={allocationRatio}
                setAllocationRatio={setAllocationRatio}
                d0={d0}
                setD0={setD0}
                g={g}
                setG={setG}
                ks={ks}
                setKs={setKs}
                explicitYears={explicitYears}
                setExplicitYears={setExplicitYears}
                handleCalculate={handleCalculate}
                isAssistantOpen={isAssistantOpen}
                setIsAssistantOpen={setIsAssistantOpen}
                assistantMethod={assistantMethod}
                setAssistantMethod={setAssistantMethod}
                roe={roe}
                setRoe={setRoe}
                payoutRatio={payoutRatio}
                setPayoutRatio={setPayoutRatio}
                divStart={divStart}
                setDivStart={setDivStart}
                divEnd={divEnd}
                setDivEnd={setDivEnd}
                yearsCount={yearsCount}
                setYearsCount={setYearsCount}
                calculateAssistantG={calculateAssistantG}
                applyAssistantG={applyAssistantG}
                onClearSearch={handleClearSearch}
                tickerInputRef={tickerInputRef}
              />
          </SingleStockView>
        ) : (
          // === Other Modes: Standard Grid Layout ===
          <div suppressHydrationWarning className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Input Form (Only for Multi Mode) */}
            {mode === 'multi' && (
              <div className="lg:col-span-1 space-y-6 lg:order-last">
                <InputForm
                  mode={mode}
                  isLoadingData={isLoadingData}
                  isClient={isClient}
                  ticker={ticker}
                  setTicker={setTicker}
                  fetchStockData={fetchStockData}
                  currentPrice={currentPrice}
                  setCurrentPrice={setCurrentPrice}
                  multiTickers={multiTickers}
                  setMultiTickers={setMultiTickers}
                  totalBudget={totalBudget}
                  setTotalBudget={setTotalBudget}
                  budgetMode={budgetMode}
                  setBudgetMode={setBudgetMode}
                  allocationRatio={allocationRatio}
                  setAllocationRatio={setAllocationRatio}
                  d0={d0}
                  setD0={setD0}
                  g={g}
                  setG={setG}
                  ks={ks}
                  setKs={setKs}
                  explicitYears={explicitYears}
                  setExplicitYears={setExplicitYears}
                  handleCalculate={handleCalculate}
                  isAssistantOpen={isAssistantOpen}
                  setIsAssistantOpen={setIsAssistantOpen}
                  assistantMethod={assistantMethod}
                  setAssistantMethod={setAssistantMethod}
                  roe={roe}
                  setRoe={setRoe}
                  payoutRatio={payoutRatio}
                  setPayoutRatio={setPayoutRatio}
                  divStart={divStart}
                  setDivStart={setDivStart}
                  divEnd={divEnd}
                  setDivEnd={setDivEnd}
                  yearsCount={yearsCount}
                  setYearsCount={setYearsCount}
                  calculateAssistantG={calculateAssistantG}
                  applyAssistantG={applyAssistantG}
                  onClearSearch={handleClearSearch}
                />
              </div>
            )}

            {/* Results Area */}
            <div suppressHydrationWarning className={`${mode === 'portfolio' || mode === 'real_portfolio' || mode === 'screener' || mode === 'dividend_events' ? 'lg:col-span-3' : 'lg:col-span-2'} space-y-6 lg:order-first`}>
              {mode === 'screener' ? (
                <ScreenerView onSelectTicker={handleSelectScreenerTicker} />
              ) : mode === 'multi' ? (
                <MultiScreeningView
                  multiResults={multiResults}
                  error={error}
                  isLoadingData={isLoadingData}
                  handleSaveToPortfolio={handleSaveToPortfolio}
                  handleSaveAllToPortfolio={handleSaveAllToPortfolio}
                  setMultiResults={setMultiResults}
                />
              ) : mode === 'real_portfolio' ? (
                <RealPortfolioView 
                  currentPortfolioId={currentPortfolioId || ''}
                  portfolios={portfolios}
                  setCurrentPortfolioId={setCurrentPortfolioId}
                  onOpenModal={handleOpenTransactionModal}
                  refreshTrigger={refreshRealPortfolioTrigger}
                />
              ) : mode === 'dividend_events' ? (
                <DividendEventsView
                  currentPortfolioId={currentPortfolioId || ''}
                  portfolios={portfolios}
                  setCurrentPortfolioId={setCurrentPortfolioId}
                />
              ) : (
                <PortfolioView
                  portfolios={portfolios}
                  currentPortfolioId={currentPortfolioId}
                  setCurrentPortfolioId={setCurrentPortfolioId}
                  portfolio={portfolio}
                  isLoadingData={isLoadingData}
                  openCreateModal={openCreateModal}
                  openEditModal={openEditModal}
                  handleDeletePortfolioGroup={handleDeletePortfolioGroup}
                  handleManualPriceCheck={handleManualPriceCheck}
                  showAnalytics={showAnalytics}
                  setShowAnalytics={setShowAnalytics}
                  handleDeletePortfolioItem={handleDeletePortfolioItem}
                  setJournalTicker={setJournalTicker}
                  setMode={setMode}
                  fetchPortfolioData={fetchPortfolioData}
                  onAddTransaction={handleOpenTransactionModal}
                />
              )}
            </div>

          </div>
        )}
      </div>

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
        telegramBotToken={telegramBotToken} 
        setTelegramBotToken={setTelegramBotToken} 
        telegramChatId={telegramChatId} 
        setTelegramChatId={setTelegramChatId} 
        onSave={saveSettings} 
      />

      {/* Portfolio Creation/Edit Modal */}
      {isPortfolioModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4">
              {editingPortfolioId ? 'Rename Portfolio' : 'Create New Portfolio'}
            </h3>
            <input
              type="text"
              value={newPortfolioName}
              onChange={(e) => setNewPortfolioName(e.target.value)}
              placeholder="Portfolio Name"
              className="w-full px-4 py-2 rounded-xl border border-slate-200 mb-4 focus:ring-2 focus:ring-emerald-500 outline-none"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setIsPortfolioModalOpen(false)}
                className="flex-1 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-medium hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateOrUpdatePortfolio}
                disabled={!newPortfolioName.trim()}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50"
              >
                {editingPortfolioId ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save to Portfolio Modal */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4">
              Save {itemsToSave.length} Item{itemsToSave.length > 1 ? 's' : ''} to...
            </h3>
            
            <div className="space-y-3 mb-6">
              <label className="block text-sm font-medium text-slate-700">Select Portfolio</label>
              <select
                value={saveTargetPortfolioId}
                onChange={(e) => setSaveTargetPortfolioId(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
              >
                {portfolios.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              
              {portfolios.length === 0 && (
                <p className="text-xs text-red-500">Please create a portfolio first.</p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsSaveModalOpen(false)}
                className="flex-1 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-medium hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmSaveToPortfolio}
                disabled={!saveTargetPortfolioId || isLoadingData}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {isLoadingData ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Investment Journal Modal */}
      <InvestmentJournal 
        isOpen={!!journalTicker} 
        onClose={() => setJournalTicker(null)} 
        ticker={journalTicker || ''} 
      />

      {/* Shared Transaction Modal */}
      <TransactionModal
        isOpen={isTransactionModalOpen}
        onClose={() => setIsTransactionModalOpen(false)}
        onSave={handleTransactionSaved}
        portfolioId={currentPortfolioId || ''}
        ticker={transactionTicker}
      />

    </div>
  );
}
