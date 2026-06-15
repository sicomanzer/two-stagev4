/**
 * VI Calculation Engine
 * รวมสูตรการคำนวณทั้งหมดสำหรับ Value Investing
 */

import type { 
  DDMResult, DDMTableRow, GrahamResult, PEGResult, DCFResult,
  ValuationConsensus, StockScorecard, ScoreCategory,
  TrendAnalysis, CAGRData, Scenario, ScenarioAnalysis,
  StockHistory, ScreeningResult, AllocationRatio,
  FScoreResult, FScoreCriteria,
  ZScoreResult, ZScoreComponent, InvestmentSignal, ReverseDDMResult
} from '@/types/stock';

// ===================================================================
// 1. TWO-STAGE DDM (อ.กวี ชูกิจเกษม)
// ===================================================================

export function calculateDDM(
  ticker: string,
  d0: number,
  g: number,
  ks: number,
  years: number,
  currentPrice: number | null
): DDMResult {
  const tableData: DDMTableRow[] = [];
  const baseYear = new Date().getFullYear();

  // Year 0
  tableData.push({
    year: (baseYear - 1).toString(),
    dividend: d0,
    pv: null,
    growth: null,
    k: ks,
  });

  let pvSum = 0;
  let prevD = d0;

  // Explicit Years
  for (let t = 1; t <= years; t++) {
    const year = baseYear + t - 1;
    const dt = prevD * (1 + g);
    const pv = dt / Math.pow(1 + ks, t);
    pvSum += pv;

    tableData.push({
      year: year.toString(),
      dividend: dt,
      pv,
      growth: g,
      k: null,
    });

    prevD = dt;
  }

  // Terminal Year
  const terminalYear = baseYear + years;
  const dTerminal = prevD * (1 + g);
  const tv = dTerminal / (ks - g);
  const pvTv = tv / Math.pow(1 + ks, years);

  tableData.push({
    year: `${terminalYear} (Terminal)`,
    dividend: dTerminal,
    pv: pvTv,
    growth: g,
    k: null,
    isTerminal: true,
  });

  const fairPrice = pvSum + pvTv;
  let margin: number | null = null;
  let status: 'Undervalued' | 'Overvalued' | 'Fair' = 'Fair';
  let recommendation: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';

  if (currentPrice) {
    margin = ((fairPrice - currentPrice) / currentPrice) * 100;
    if (margin >= 15) {
      status = 'Undervalued';
      recommendation = 'BUY';
    } else if (margin <= -15) {
      status = 'Overvalued';
      recommendation = 'SELL';
    }
  }

  return {
    ticker,
    currentPrice,
    d0,
    g,
    ks,
    fairPrice,
    margin,
    status,
    recommendation,
    tableData,
  };
}

export function calculateImpliedGrowth(currentPrice: number | null, d0: number, ks: number): ReverseDDMResult | null {
  if (!currentPrice || currentPrice <= 0 || d0 < 0 || ks <= 0) return null;
  
  // Formula: g = (Price * ks - D0) / (Price + D0)
  const impliedG = (currentPrice * ks - d0) / (currentPrice + d0);
  
  let expectationStatus: 'High' | 'Moderate' | 'Low' = 'Moderate';
  if (impliedG >= 0.10) {
    expectationStatus = 'High';
  } else if (impliedG <= 0.03) {
    expectationStatus = 'Low';
  }

  // Realistic boundary check: it's very hard for a mature dividend stock to grow > 15% perpetually.
  const isRealistic = impliedG < 0.15 && impliedG >= 0;

  return {
    impliedG,
    isRealistic,
    marketExpectationStatus: expectationStatus
  };
}


// ===================================================================
// 2. GRAHAM NUMBER (Benjamin Graham)
// ===================================================================

export function calculateGrahamNumber(
  eps: number | null,
  bvps: number | null,
  currentPrice: number | null
): GrahamResult | null {
  if (!eps || eps <= 0 || !bvps || bvps <= 0) return null;

  const grahamNumber = Math.sqrt(22.5 * eps * bvps);
  let margin: number | null = null;
  let status = 'N/A';

  if (currentPrice && currentPrice > 0) {
    margin = ((grahamNumber - currentPrice) / currentPrice) * 100;
    if (margin > 20) status = 'Very Undervalued';
    else if (margin > 0) status = 'Undervalued';
    else if (margin > -20) status = 'Fair';
    else status = 'Overvalued';
  }

  return { grahamNumber, eps, bvps, margin, status };
}

// ===================================================================
// 3. PEG RATIO (Price/Earnings to Growth)
// ===================================================================

export function calculatePEG(
  pe: number | null,
  epsGrowth: number | null // as decimal, e.g. 0.10 for 10%
): PEGResult | null {
  if (!pe || pe <= 0 || !epsGrowth || epsGrowth <= 0) return null;

  const epsGrowthPercent = epsGrowth * 100;
  const peg = pe / epsGrowthPercent;

  let status = '';
  if (peg < 0.5) status = 'Very Undervalued';
  else if (peg < 1.0) status = 'Undervalued';
  else if (peg < 1.5) status = 'Fair';
  else if (peg < 2.0) status = 'Slightly Overvalued';
  else status = 'Overvalued';

  return { peg, pe, epsGrowth: epsGrowthPercent, status };
}

// ===================================================================
// 3.5 DCF (Discounted Cash Flow)
// ===================================================================

export function calculateDCF(
  fcf0: number | null, // Free Cash Flow at year 0
  shares: number | null,
  wacc: number = 0.08, // Default WACC 8%
  growthRate: number = 0.05, // Phase 1 Growth 5%
  terminalGrowthRate: number = 0.02, // Terminal Growth 2%
  years: number = 5
): DCFResult | null {
  if (!fcf0 || fcf0 <= 0 || !shares || shares <= 0) return null;

  const fcfValues: number[] = [];
  let currentFCF = fcf0;
  let pvSum = 0;

  // 1. Explicit Forecast Period
  for (let t = 1; t <= years; t++) {
    currentFCF = currentFCF * (1 + growthRate);
    fcfValues.push(currentFCF);
    
    // Calculate Present Value of FCF
    const pv = currentFCF / Math.pow(1 + wacc, t);
    pvSum += pv;
  }

  // 2. Terminal Value Calculation (Gordon Growth Model)
  const terminalFCF = currentFCF * (1 + terminalGrowthRate);
  const terminalValue = terminalFCF / (wacc - terminalGrowthRate);
  
  // Present Value of Terminal Value
  const pvTerminalValue = terminalValue / Math.pow(1 + wacc, years);

  // 3. Enterprise Value
  const enterpriseValue = pvSum + pvTerminalValue;
  // *Usually we add cash and subtract debt here, but keeping it simple proxy for now*
  
  // 4. Fair Value Per Share
  const fairValue = enterpriseValue / shares;

  return {
    fairValue,
    fcfValues,
    terminalValue,
    wacc,
    terminalGrowth: terminalGrowthRate,
    margin: null // calculated later
  };
}

// ===================================================================
// 4. VALUATION CONSENSUS (Multi-Model)
// ===================================================================

export function calculateConsensus(
  ddmFair: number | null,
  grahamFair: number | null,
  peBandFair: number | null, // -1SD PE based fair price
  dcfFair: number | null,
  currentPrice: number | null
): ValuationConsensus {
  const models: { fairPrice: number; weight: number }[] = [];

  // Assign weights (DDM gets highest for dividend stocks)
  if (ddmFair && ddmFair > 0) {
    models.push({ fairPrice: ddmFair, weight: 0.35 });
  }
  if (grahamFair && grahamFair > 0) {
    models.push({ fairPrice: grahamFair, weight: 0.20 });
  }
  if (peBandFair && peBandFair > 0) {
    models.push({ fairPrice: peBandFair, weight: 0.20 });
  }
  if (dcfFair && dcfFair > 0) {
    models.push({ fairPrice: dcfFair, weight: 0.25 });
  }

  // Normalize weights if not all models are available
  const totalWeight = models.reduce((sum, m) => sum + m.weight, 0);
  if (totalWeight > 0) {
    models.forEach(m => (m.weight = m.weight / totalWeight));
  }

  const consensusFairPrice = models.reduce(
    (sum, m) => sum + m.fairPrice * m.weight,
    0
  );

  const upside =
    currentPrice && currentPrice > 0
      ? ((consensusFairPrice - currentPrice) / currentPrice) * 100
      : null;

  return {
    ddm: ddmFair && ddmFair > 0 ? { fairPrice: ddmFair, weight: 0.35 } : null,
    graham: grahamFair && grahamFair > 0 ? { fairPrice: grahamFair, weight: 0.30 } : null,
    dcf: dcfFair && dcfFair > 0 ? { fairPrice: dcfFair, weight: 0.25 } : null,
    peBand: peBandFair && peBandFair > 0 ? { fairPrice: peBandFair, weight: 0.35 } : null,
    consensusFairPrice,
    currentPrice,
    upside,
  };
}

// ===================================================================
// 5. STOCK SCORECARD (VI Quality Score — /20)
// ===================================================================

export function calculateScorecard(
  ticker: string,
  history: StockHistory[],
  currentPrice: number | null,
  fairPrice: number | null,
  latestPE: number | null,
  latestPBV: number | null,
  peAvg: number | null,
  pbvAvg: number | null
): StockScorecard {
  const categories: ScoreCategory[] = [];
  let totalScore = 0;

  // Need at least 5 years of data
  const recent5 = history.slice(-5);
  const recent10 = history.slice(-10);

  // --- 1. ROE > 15% consistently (3 pts) ---
  const roeValues = recent5.map(h => h.roe).filter((v): v is number => v != null);
  let roeScore = 0;
  if (roeValues.length >= 3) {
    const avgROE = roeValues.reduce((a, b) => a + b, 0) / roeValues.length;
    const allAbove15 = roeValues.every(v => v > 12); // Thaifin roe is percentage (e.g. 15.5)
    if (avgROE > 15 && allAbove15) roeScore = 3;
    else if (avgROE > 12) roeScore = 2;
    else if (avgROE > 8) roeScore = 1;
  }
  categories.push({
    name: 'ROE',
    score: roeScore,
    maxScore: 3,
    detail: roeValues.length > 0 ? `AVG ${(roeValues.reduce((a, b) => a + b, 0) / roeValues.length).toFixed(1)}%` : 'N/A',
    icon: '📊',
  });
  totalScore += roeScore;

  // --- 2. D/E < 1.0 (2 pts) ---
  const deValues = recent5.map(h => h.de).filter((v): v is number => v != null);
  let deScore = 0;
  if (deValues.length > 0) {
    const latestDE = deValues[deValues.length - 1];
    if (latestDE < 0.5) deScore = 2;
    else if (latestDE < 1.0) deScore = 1;
  }
  categories.push({
    name: 'D/E',
    score: deScore,
    maxScore: 2,
    detail: deValues.length > 0 ? `${deValues[deValues.length - 1].toFixed(2)}x` : 'N/A',
    icon: '🏦',
  });
  totalScore += deScore;

  // --- 3. Dividend consistency (3 pts) ---
  // Fix: Check CONSECUTIVE years, not just total years
  const currentYear = new Date().getFullYear();
  let consecutiveYears = 0;
  let startedStreak = false;

  // Iterate backwards to find streak
  for (let i = history.length - 1; i >= 0; i--) {
    const h = history[i];
    // Skip current incomplete year if no dividend yet
    if (h.year === currentYear && (!h.dps || h.dps <= 0)) {
      continue;
    }
    
    if (h.dps && h.dps > 0) {
      consecutiveYears++;
      startedStreak = true;
    } else {
      // If we hit a zero after finding dividends, streak ends
      if (startedStreak) break;
      // If we hit a zero (gap) before finding any dividends in past years, streak is 0
      if (h.year < currentYear) break;
    }
  }

  let divScore = 0;
  if (consecutiveYears >= 10) divScore = 3;
  else if (consecutiveYears >= 7) divScore = 2;
  else if (consecutiveYears >= 5) divScore = 1;
  
  // Check if dividend is growing (Bonus)
  // Use dpsValues for Growth check (Trend)
  const dpsValues = history.map(h => h.dps).filter((v): v is number => v != null && v > 0);
  if (divScore >= 2 && dpsValues.length >= 2) {
    const first = dpsValues[0];
    const last = dpsValues[dpsValues.length - 1];
    if (last > first) divScore = Math.min(divScore + 1, 3); // Bonus point for growth (max 3)
  }
  categories.push({
    name: 'เงินปันผล',
    score: divScore,
    maxScore: 3,
    detail: `จ่ายต่อเนื่อง ${consecutiveYears} ปี`,
    icon: '💰',
  });
  totalScore += divScore;

  // --- 4. EPS Growth CAGR > 5% (2 pts) ---
  const epsCAGR = calculateCAGR(recent5.map(h => h.eps));
  let epsScore = 0;
  if (epsCAGR !== null) {
    if (epsCAGR > 0.10) epsScore = 2;
    else if (epsCAGR > 0.05) epsScore = 1;
  }
  categories.push({
    name: 'EPS Growth',
    score: epsScore,
    maxScore: 2,
    detail: epsCAGR !== null ? `CAGR ${(epsCAGR * 100).toFixed(1)}%` : 'N/A',
    icon: '📈',
  });
  totalScore += epsScore;

  // --- 5. Revenue Growth CAGR > 5% (2 pts) ---
  const revCAGR = calculateCAGR(recent5.map(h => h.revenue));
  let revScore = 0;
  if (revCAGR !== null) {
    if (revCAGR > 0.10) revScore = 2;
    else if (revCAGR > 0.05) revScore = 1;
  }
  categories.push({
    name: 'Revenue Growth',
    score: revScore,
    maxScore: 2,
    detail: revCAGR !== null ? `CAGR ${(revCAGR * 100).toFixed(1)}%` : 'N/A',
    icon: '🏭',
  });
  totalScore += revScore;

  // --- 6. NPM Stability (1 pt) ---
  const npmValues = recent5.map(h => h.npm).filter((v): v is number => v != null);
  let npmScore = 0;
  if (npmValues.length >= 3) {
    const avg = npmValues.reduce((a, b) => a + b, 0) / npmValues.length;
    const maxDeviation = Math.max(...npmValues.map(v => Math.abs(v - avg) / avg));
    if (maxDeviation < 0.30) npmScore = 1;
  }
  categories.push({
    name: 'NPM Stability',
    score: npmScore,
    maxScore: 1,
    detail: npmValues.length > 0 ? `AVG ${npmValues[npmValues.length - 1].toFixed(1)}%` : 'N/A',
    icon: '📉',
  });
  totalScore += npmScore;

  // --- 7. Payout Ratio 30%-70% (1 pt) ---
  let payoutScore = 0;
  let payoutDetail = 'นอกช่วง';
  
  // Find latest year with BOTH EPS and DPS
  for (let i = history.length - 1; i >= 0; i--) {
    const h = history[i];
    if (h.dps && h.dps > 0 && h.eps && h.eps > 0) {
      const payout = h.dps / h.eps;
      if (payout >= 0.30 && payout <= 0.70) {
        payoutScore = 1;
        payoutDetail = `อยู่ในช่วง ${(payout * 100).toFixed(0)}%`;
      } else {
        payoutDetail = `${(payout * 100).toFixed(0)}% (นอกช่วง)`;
      }
      break;
    }
  }

  categories.push({
    name: 'Payout Ratio',
    score: payoutScore,
    maxScore: 1,
    detail: payoutDetail,
    icon: '🎯',
  });
  totalScore += payoutScore;

  // --- 8. PE below average (2 pts) ---
  let peScore = 0;
  if (latestPE && peAvg) {
    if (latestPE < peAvg * 0.8) peScore = 2;
    else if (latestPE < peAvg) peScore = 1;
  }
  categories.push({
    name: 'PE Band',
    score: peScore,
    maxScore: 2,
    detail: latestPE ? `PE ${latestPE.toFixed(1)} vs AVG ${peAvg?.toFixed(1) || 'N/A'}` : 'N/A',
    icon: '📊',
  });
  totalScore += peScore;

  // --- 9. PBV below average (2 pts) ---
  let pbvScore = 0;
  if (latestPBV && pbvAvg) {
    if (latestPBV < pbvAvg * 0.8) pbvScore = 2;
    else if (latestPBV < pbvAvg) pbvScore = 1;
  }
  categories.push({
    name: 'PBV Band',
    score: pbvScore,
    maxScore: 2,
    detail: latestPBV ? `PBV ${latestPBV.toFixed(2)} vs AVG ${pbvAvg?.toFixed(2) || 'N/A'}` : 'N/A',
    icon: '📊',
  });
  totalScore += pbvScore;

  // --- 10. MOS > 30% (2 pts) ---
  let mosScore = 0;
  if (currentPrice && fairPrice && fairPrice > 0) {
    const mos = ((fairPrice - currentPrice) / fairPrice) * 100;
    if (mos >= 50) mosScore = 2;
    else if (mos >= 30) mosScore = 1;
  }
  categories.push({
    name: 'Margin of Safety',
    score: mosScore,
    maxScore: 2,
    detail: currentPrice && fairPrice ? `MOS ${(((fairPrice - currentPrice) / fairPrice) * 100).toFixed(0)}%` : 'N/A',
    icon: '🛡️',
  });
  totalScore += mosScore;

  // Rating
  let rating: 1 | 2 | 3 | 4 | 5 = 1;
  let ratingLabel = '';
  if (totalScore >= 17) { rating = 5; ratingLabel = 'หุ้นพิเศษ — หายากมาก'; }
  else if (totalScore >= 13) { rating = 4; ratingLabel = 'หุ้นดี — คุ้มค่าแก่การลงทุน'; }
  else if (totalScore >= 9) { rating = 3; ratingLabel = 'หุ้นพอใช้ — ต้องดูเพิ่มเติม'; }
  else if (totalScore >= 5) { rating = 2; ratingLabel = 'หุ้นเสี่ยง — ระวัง'; }
  else { rating = 1; ratingLabel = 'หุ้นไม่ผ่าน — ไม่ตรงเกณฑ์ VI'; }

  return {
    ticker,
    totalScore,
    maxScore: 20,
    rating,
    ratingLabel,
    categories,
  };
}

// ===================================================================
// 5.5 PIOTROSKI F-SCORE (Quality & Health)
// ===================================================================

export function calculateFScore(
  history: StockHistory[]
): FScoreResult | null {
  // Need at least 2 years of data to calculate changes
  if (history.length < 2) return null;

  // Find the most recent year with SUFFICIENT data for F-Score
  // We need at least Total Assets and Net Profit to be non-zero/non-null
  let currentIndex = history.length - 1;
  while (currentIndex >= 1) {
    const h = history[currentIndex];
    // Check for critical F-Score components:
    // ROA needs Net Profit & Total Assets
    // CFO needs Operating Cash Flow
    // GPM needs Gross Profit & Revenue
    // If major components are missing, skip this year
    const hasData = (h.totalAssets && h.totalAssets > 0) && 
                    (h.netProfit !== null && h.netProfit !== undefined) &&
                    (h.revenue !== null && h.revenue !== undefined);
    
    if (hasData) {
      break;
    }
    currentIndex--;
  }

  // If we couldn't find a valid year with a preceding year
  if (currentIndex < 1) return null;

  const current = history[currentIndex];
  const prev = history[currentIndex - 1];

  let score = 0;
  const criteria: FScoreCriteria[] = [];

  // Add a note about the year being used
  const currentYear = current.year;
  const prevYear = prev.year;

  // --- Profitability ---

  // 1. ROA > 0
  const roa = current.roa ?? 0; // percentage
  const pass1 = roa > 0;
  if (pass1) score++;
  criteria.push({
    name: 'Return on Assets (ROA)',
    condition: '> 0',
    value: `${roa.toFixed(2)}% (${currentYear})`,
    passed: pass1,
    score: pass1 ? 1 : 0
  });

  // 2. CFO > 0
  const cfo = current.operatingCashFlow ?? 0;
  const pass2 = cfo > 0;
  if (pass2) score++;
  criteria.push({
    name: 'Operating Cash Flow (CFO)',
    condition: '> 0',
    value: `${formatNumber(cfo)} (${currentYear})`,
    passed: pass2,
    score: pass2 ? 1 : 0
  });

  // 3. Delta ROA > 0 (Improving ROA)
  const prevRoa = prev.roa ?? 0;
  const pass3 = roa > prevRoa;
  if (pass3) score++;
  criteria.push({
    name: 'Change in ROA',
    condition: '> Previous Year',
    value: `${roa.toFixed(2)}% vs ${prevRoa.toFixed(2)}% (${currentYear} vs ${prevYear})`,
    passed: pass3,
    score: pass3 ? 1 : 0
  });

  // 4. Accrual (CFO > Net Income)
  const netIncome = current.netProfit ?? 0;
  const pass4 = cfo > netIncome;
  if (pass4) score++;
  criteria.push({
    name: 'Accruals (CFO > Net Income)',
    condition: 'CFO > Net Income',
    value: `${formatNumber(cfo)} vs ${formatNumber(netIncome)} (${currentYear})`,
    passed: pass4,
    score: pass4 ? 1 : 0
  });

  // --- Leverage, Liquidity, Source of Funds ---

  // 5. Delta Leverage (Lower Long Term Debt Ratio)
  // Leverage = Long Term Debt / Average Total Assets
  // We'll use Year-End Total Assets for simplicity as often done in simplified F-Score
  const currentLTD = current.longTermDebt ?? 0;
  const currentAssets = current.totalAssets ?? 1; // avoid div by zero
  const currentLeverage = currentLTD / currentAssets;

  const prevLTD = prev.longTermDebt ?? 0;
  const prevAssets = prev.totalAssets ?? 1;
  const prevLeverage = prevLTD / prevAssets;

  const pass5 = currentLeverage <= prevLeverage;
  if (pass5) score++;
  criteria.push({
    name: 'Change in Leverage (LTD/Assets)',
    condition: '<= Previous Year',
    value: `${(currentLeverage * 100).toFixed(2)}% vs ${(prevLeverage * 100).toFixed(2)}% (${currentYear} vs ${prevYear})`,
    passed: pass5,
    score: pass5 ? 1 : 0
  });

  // 6. Delta Current Ratio (Improving Liquidity)
  const currentCR = current.currentRatio ?? 0;
  const prevCR = prev.currentRatio ?? 0;
  const pass6 = currentCR > prevCR;
  if (pass6) score++;
  criteria.push({
    name: 'Change in Current Ratio',
    condition: '> Previous Year',
    value: `${currentCR.toFixed(2)} vs ${prevCR.toFixed(2)} (${currentYear} vs ${prevYear})`,
    passed: pass6,
    score: pass6 ? 1 : 0
  });

  // 7. No New Shares (Dilution Check)
  // Pass if current shares <= previous shares
  const currentShares = current.shares ?? 0;
  const prevShares = prev.shares ?? 0;
  // If shares data is missing, we might skip or assume pass. Let's assume pass if missing but if both exist check.
  let pass7 = true;
  if (currentShares > 0 && prevShares > 0) {
    pass7 = currentShares <= prevShares; // Allow small variance? No, strict.
  }
  if (pass7) score++;
  criteria.push({
    name: 'Change in Shares Outstanding',
    condition: '<= Previous Year',
    value: currentShares && prevShares ? `${formatNumber(currentShares)} vs ${formatNumber(prevShares)} (${currentYear} vs ${prevYear})` : 'Data N/A',
    passed: pass7,
    score: pass7 ? 1 : 0
  });

  // --- Operating Efficiency ---

  // 8. Delta Gross Margin (Improving GPM)
  const currentGPM = current.gpm ?? 0;
  const prevGPM = prev.gpm ?? 0;
  const pass8 = currentGPM > prevGPM;
  if (pass8) score++;
  criteria.push({
    name: 'Change in Gross Margin',
    condition: '> Previous Year',
    value: `${currentGPM.toFixed(2)}% vs ${prevGPM.toFixed(2)}% (${currentYear} vs ${prevYear})`,
    passed: pass8,
    score: pass8 ? 1 : 0
  });

  // 9. Delta Asset Turnover (Improving Efficiency)
  // Asset Turnover = Revenue / Total Assets (beginning of year assets is better, but we use year end)
  const currentRev = current.revenue ?? 0;
  const currentAT = (currentRev / currentAssets);

  const prevRev = prev.revenue ?? 0;
  const prevAT = (prevRev / prevAssets);

  const pass9 = currentAT > prevAT;
  if (pass9) score++;
  criteria.push({
    name: 'Change in Asset Turnover',
    condition: '> Previous Year',
    value: `${currentAT.toFixed(2)} vs ${prevAT.toFixed(2)} (${currentYear} vs ${prevYear})`,
    passed: pass9,
    score: pass9 ? 1 : 0
  });

  let grade: 'Strong' | 'Stable' | 'Weak' = 'Weak';
  if (score >= 7) grade = 'Strong';
  else if (score >= 4) grade = 'Stable';
  
  return {
    score,
    grade,
    year: currentYear,
    criteria
  };
}

export function calculateZScore(
  history: StockHistory[],
  marketCap: number | null
): ZScoreResult | null {
  if (history.length === 0) return null;

  // Use the most recent year with sufficient data
  // Iterate backwards to find a year with enough data
  let current: StockHistory | null = null;
  
  for (let i = history.length - 1; i >= 0; i--) {
    const h = history[i];
    if (h.totalAssets && h.totalLiabilities) {
       current = h;
       break;
    }
  }

  if (!current) return null;

  const totalAssets = current.totalAssets || 0;
  const totalLiabilities = current.totalLiabilities || 0;
  const retainedEarnings = current.retainedEarnings || 0;
  const ebit = current.ebit || 0;
  const revenue = current.revenue || 0;
  
  // Working Capital = Current Assets - Current Liabilities
  const currentAssets = current.totalCurrentAssets || 0;
  const currentLiabilities = current.totalCurrentLiabilities || 0;
  const workingCapital = currentAssets - currentLiabilities;

  // Market Value of Equity
  // Use marketCap if available, otherwise Price * Shares
  let marketValueEquity = marketCap || 0;
  if (marketValueEquity === 0 && current.price && current.shares) {
    marketValueEquity = current.price * current.shares;
  }

  // Check critical values to avoid division by zero or invalid result
  if (totalAssets <= 0 || totalLiabilities <= 0) return null;

  // A: Working Capital / Total Assets
  const A = workingCapital / totalAssets;

  // B: Retained Earnings / Total Assets
  const B = retainedEarnings / totalAssets;

  // C: EBIT / Total Assets
  const C = ebit / totalAssets;

  // D: Market Value of Equity / Total Liabilities
  const D = marketValueEquity / totalLiabilities;

  // E: Sales / Total Assets
  const E = revenue / totalAssets;

  // Z-Score Formula (for Public Manufacturing)
  // Z = 1.2A + 1.4B + 3.3C + 0.6D + 1.0E
  const score = (1.2 * A) + (1.4 * B) + (3.3 * C) + (0.6 * D) + (1.0 * E);

  let status: 'Safe' | 'Grey' | 'Distress' = 'Grey';
  if (score > 2.99) status = 'Safe';
  else if (score < 1.81) status = 'Distress';

  const components: ZScoreComponent[] = [
    { name: 'Working Capital / Total Assets', formula: '1.2 * A', value: A, weight: 1.2, score: 1.2 * A },
    { name: 'Retained Earnings / Total Assets', formula: '1.4 * B', value: B, weight: 1.4, score: 1.4 * B },
    { name: 'EBIT / Total Assets', formula: '3.3 * C', value: C, weight: 3.3, score: 3.3 * C },
    { name: 'Market Value of Equity / Total Liab', formula: '0.6 * D', value: D, weight: 0.6, score: 0.6 * D },
    { name: 'Sales / Total Assets', formula: '1.0 * E', value: E, weight: 1.0, score: 1.0 * E },
  ];

  return {
    score,
    status,
    year: current.year,
    components
  };
}

export function calculateCAGR(values: (number | null)[]): number | null {
  const firstIndex = values.findIndex((v): v is number => v != null && Number.isFinite(v));
  if (firstIndex === -1) return null;

  let lastIndex = -1;
  for (let i = values.length - 1; i > firstIndex; i--) {
    const value = values[i];
    if (value != null && Number.isFinite(value)) {
      lastIndex = i;
      break;
    }
  }

  if (lastIndex === -1) return null;

  const start = values[firstIndex] as number;
  const end = values[lastIndex] as number;
  const years = lastIndex - firstIndex;

  // CAGR is not meaningful when either endpoint is zero/negative.
  if (start <= 0 || end <= 0 || years <= 0) return null;
  return Math.pow(end / start, 1 / years) - 1;
}

export function calculateTrendAnalysis(
  ticker: string,
  history: StockHistory[]
): TrendAnalysis {
  const recent3 = history.slice(-3);
  const recent5 = history.slice(-5);
  const recent10 = history.slice(-10);

  const cagrs: CAGRData[] = [
    {
      metric: 'Revenue',
      cagr3y: calculateCAGR(recent3.map(h => h.revenue)),
      cagr5y: calculateCAGR(recent5.map(h => h.revenue)),
      cagr10y: calculateCAGR(recent10.map(h => h.revenue)),
      trend: getTrend(calculateCAGR(recent5.map(h => h.revenue))),
    },
    {
      metric: 'Net Profit',
      cagr3y: calculateCAGR(recent3.map(h => h.netProfit)),
      cagr5y: calculateCAGR(recent5.map(h => h.netProfit)),
      cagr10y: calculateCAGR(recent10.map(h => h.netProfit)),
      trend: getTrend(calculateCAGR(recent5.map(h => h.netProfit))),
    },
    {
      metric: 'EPS',
      cagr3y: calculateCAGR(recent3.map(h => h.eps)),
      cagr5y: calculateCAGR(recent5.map(h => h.eps)),
      cagr10y: calculateCAGR(recent10.map(h => h.eps)),
      trend: getTrend(calculateCAGR(recent5.map(h => h.eps))),
    },
    {
      metric: 'DPS',
      cagr3y: calculateCAGR(recent3.map(h => h.dps)),
      cagr5y: calculateCAGR(recent5.map(h => h.dps)),
      cagr10y: calculateCAGR(recent10.map(h => h.dps)),
      trend: getTrend(calculateCAGR(recent5.map(h => h.dps))),
    },
    {
      metric: 'BVPS',
      cagr3y: calculateCAGR(recent3.map(h => h.bvps)),
      cagr5y: calculateCAGR(recent5.map(h => h.bvps)),
      cagr10y: calculateCAGR(recent10.map(h => h.bvps)),
      trend: getTrend(calculateCAGR(recent5.map(h => h.bvps))),
    },
  ];

  // Earnings Quality
  const npmValues = recent5.map(h => h.npm).filter((v): v is number => v != null);
  let npmTrend: 'improving' | 'declining' | 'stable' = 'stable';
  if (npmValues.length >= 3) {
    const first = npmValues[0];
    const last = npmValues[npmValues.length - 1];
    if (last > first * 1.1) npmTrend = 'improving';
    else if (last < first * 0.9) npmTrend = 'declining';
  }

  const revGrowth = calculateCAGR(recent5.map(h => h.revenue));
  const profitGrowth = calculateCAGR(recent5.map(h => h.netProfit));
  let revenueVsProfit: 'healthy' | 'warning' | 'concern' = 'healthy';
  if (revGrowth !== null && profitGrowth !== null) {
    if (profitGrowth < revGrowth * 0.5) revenueVsProfit = 'concern';
    else if (profitGrowth < revGrowth) revenueVsProfit = 'warning';
  }

  const deValues = recent5.map(h => h.de).filter((v): v is number => v != null);
  let deTrend: 'improving' | 'stable' | 'deteriorating' = 'stable';
  if (deValues.length >= 3) {
    const first = deValues[0];
    const last = deValues[deValues.length - 1];
    if (last < first * 0.9) deTrend = 'improving';
    else if (last > first * 1.2) deTrend = 'deteriorating';
  }

  const dpsValues = history.map(h => h.dps).filter((v): v is number => v != null && v > 0);

  return {
    ticker,
    cagrs,
    earningsQuality: {
      npmTrend,
      revenueVsProfit,
      deTrend,
      dividendConsistency: dpsValues.length,
    },
  };
}

function getTrend(cagr: number | null): 'up' | 'down' | 'stable' {
  if (cagr === null) return 'stable';
  if (cagr > 0.03) return 'up';
  if (cagr < -0.03) return 'down';
  return 'stable';
}

// ===================================================================
// 7. SCENARIO ANALYSIS
// ===================================================================

export function calculateScenarioAnalysis(
  ticker: string,
  d0: number,
  currentPrice: number | null,
  years: number
): ScenarioAnalysis {
  const scenarios: Scenario[] = [
    { name: 'Bull Case', g: 0.07, ks: 0.10, probability: 0.25, fairPrice: 0 },
    { name: 'Base Case', g: 0.05, ks: 0.10, probability: 0.50, fairPrice: 0 },
    { name: 'Bear Case', g: 0.03, ks: 0.12, probability: 0.25, fairPrice: 0 },
  ];

  scenarios.forEach(s => {
    const result = calculateDDM(ticker, d0, s.g, s.ks, years, currentPrice);
    s.fairPrice = result.fairPrice;
  });

  const weightedFairPrice = scenarios.reduce(
    (sum, s) => sum + s.fairPrice * s.probability,
    0
  );

  return { ticker, scenarios, weightedFairPrice, currentPrice };
}

export function calculateInvestmentSignal(params: {
  result: DDMResult | null;
  consensus: ValuationConsensus | null;
  scorecard: StockScorecard | null;
  fScore: FScoreResult | null;
  zScore: ZScoreResult | null;
  trendAnalysis: TrendAnalysis | null;
  scenarioAnalysis: ScenarioAnalysis | null;
}): InvestmentSignal {
  const valuationCandidates: number[] = [];
  const qualityCandidates: number[] = [];
  const riskCandidates: number[] = [];
  const momentumCandidates: number[] = [];
  const scenarioCandidates: number[] = [];
  const reasons: string[] = [];

  if (params.result?.margin !== null && params.result?.margin !== undefined) {
    valuationCandidates.push(scoreFromUpside(params.result.margin));
    if (params.result.margin >= 15) reasons.push(`DDM margin +${params.result.margin.toFixed(1)}%`);
    if (params.result.margin <= -15) reasons.push(`DDM margin ${params.result.margin.toFixed(1)}%`);
  }

  if (params.consensus?.upside !== null && params.consensus?.upside !== undefined) {
    valuationCandidates.push(scoreFromUpside(params.consensus.upside));
    if (params.consensus.upside >= 15) reasons.push(`Consensus upside +${params.consensus.upside.toFixed(1)}%`);
    if (params.consensus.upside <= -10) reasons.push(`Consensus upside ${params.consensus.upside.toFixed(1)}%`);
  }

  if (params.scorecard) {
    const score = (params.scorecard.totalScore / Math.max(params.scorecard.maxScore, 1)) * 100;
    qualityCandidates.push(clamp(score, 0, 100));
    reasons.push(`VI Score ${params.scorecard.totalScore}/${params.scorecard.maxScore}`);
  }

  if (params.fScore) {
    const score = (params.fScore.score / 9) * 100;
    qualityCandidates.push(clamp(score, 0, 100));
    reasons.push(`F-Score ${params.fScore.score}/9 (${params.fScore.grade})`);
  }

  if (params.zScore) {
    let base = 55;
    if (params.zScore.status === 'Safe') base = 85;
    if (params.zScore.status === 'Distress') base = 20;
    const adjustment = clamp((params.zScore.score - 2) * 10, -15, 15);
    riskCandidates.push(clamp(base + adjustment, 0, 100));
    reasons.push(`Altman Z ${params.zScore.score.toFixed(2)} (${params.zScore.status})`);
  }

  if (params.trendAnalysis) {
    const cagrScores = params.trendAnalysis.cagrs
      .map((item) => scoreFromCagr(item.cagr5y))
      .filter((v): v is number => v !== null);
    if (cagrScores.length > 0) {
      momentumCandidates.push(average(cagrScores));
    }

    const quality = params.trendAnalysis.earningsQuality;
    if (quality.npmTrend === 'improving') momentumCandidates.push(70);
    if (quality.npmTrend === 'declining') momentumCandidates.push(35);
    if (quality.revenueVsProfit === 'healthy') momentumCandidates.push(70);
    if (quality.revenueVsProfit === 'warning') momentumCandidates.push(50);
    if (quality.revenueVsProfit === 'concern') momentumCandidates.push(30);

    if (quality.deTrend === 'improving') riskCandidates.push(75);
    if (quality.deTrend === 'stable') riskCandidates.push(55);
    if (quality.deTrend === 'deteriorating') riskCandidates.push(30);
  }

  if (params.scenarioAnalysis?.currentPrice && params.scenarioAnalysis.currentPrice > 0) {
    const weightedUpside =
      ((params.scenarioAnalysis.weightedFairPrice - params.scenarioAnalysis.currentPrice) /
        params.scenarioAnalysis.currentPrice) *
      100;
    scenarioCandidates.push(scoreFromUpside(weightedUpside));

    const bear = params.scenarioAnalysis.scenarios.find((s) => s.name.toLowerCase().includes('bear'));
    if (bear) {
      const bearUpside = ((bear.fairPrice - params.scenarioAnalysis.currentPrice) / params.scenarioAnalysis.currentPrice) * 100;
      scenarioCandidates.push(clamp(50 + bearUpside * 1.2, 10, 95));
      reasons.push(`Bear case ${bearUpside > 0 ? '+' : ''}${bearUpside.toFixed(1)}%`);
    }
  }

  const valuationScore = valuationCandidates.length ? average(valuationCandidates) : null;
  const qualityScore = qualityCandidates.length ? average(qualityCandidates) : null;
  const riskScore = riskCandidates.length ? average(riskCandidates) : null;
  const momentumScore = momentumCandidates.length ? average(momentumCandidates) : null;
  const scenarioScore = scenarioCandidates.length ? average(scenarioCandidates) : null;

  const weighted = [
    { value: valuationScore, weight: 0.35 },
    { value: qualityScore, weight: 0.25 },
    { value: riskScore, weight: 0.20 },
    { value: momentumScore, weight: 0.10 },
    { value: scenarioScore, weight: 0.10 },
  ].filter((x): x is { value: number; weight: number } => x.value !== null);

  const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);
  const score = totalWeight > 0 ? weighted.reduce((sum, item) => sum + item.value * item.weight, 0) / totalWeight : 50;

  let action: 'BUY' | 'HOLD' | 'SELL' = 'HOLD';
  if (score >= 72) action = 'BUY';
  else if (score < 45) action = 'SELL';

  const dimensionCount = weighted.length;
  const distance = Math.abs(score - 58);
  let confidence: 'High' | 'Medium' | 'Low' = 'Low';
  if (dimensionCount >= 4 && distance >= 16) confidence = 'High';
  else if (dimensionCount >= 3 && distance >= 8) confidence = 'Medium';

  return {
    action,
    score: clamp(score, 0, 100),
    confidence,
    valuationScore,
    qualityScore,
    riskScore,
    momentumScore,
    scenarioScore,
    reasons: reasons.slice(0, 5),
  };
}

// ===================================================================
// UTILITY FUNCTIONS
// ===================================================================

export function getStatus(
  price: number,
  mos30: number,
  mos40: number,
  mos50: number,
  fairPrice: number
): { label: string; color: string } {
  if (!price || price <= 0) return { label: '-', color: 'text-slate-400' };
  if (price <= mos50) return { label: 'MOS 50%', color: 'text-emerald-600 bg-emerald-100' };
  if (price <= mos40) return { label: 'MOS 40%', color: 'text-teal-600 bg-teal-100' };
  if (price <= mos30) return { label: 'MOS 30%', color: 'text-cyan-600 bg-cyan-100' };
  if (price < fairPrice) return { label: 'ต่ำกว่า FV', color: 'text-blue-600 bg-blue-100' };
  return { label: 'รอก่อนนะ', color: 'text-amber-600 bg-amber-100' };
}

export function calculateShares(budget: number, price: number): number {
  if (!price || price <= 0) return 0;
  return Math.floor(budget / price / 100) * 100;
}

export function formatNumber(num: number | null): string {
  if (num === null || num === undefined) return '-';
  if (Math.abs(num) >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  return num.toFixed(2);
}

export function formatPercent(val: number | null | undefined, decimals = 2): string {
  if (val === null || val === undefined) return '-';
  return (val * 100).toFixed(decimals) + '%';
}

export function getRatingStars(rating: number): string {
  return '⭐'.repeat(rating);
}

export function getRatingColor(rating: number): string {
  switch (rating) {
    case 5: return 'text-yellow-500 bg-yellow-50 border-yellow-200';
    case 4: return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    case 3: return 'text-blue-600 bg-blue-50 border-blue-200';
    case 2: return 'text-amber-600 bg-amber-50 border-amber-200';
    default: return 'text-red-600 bg-red-50 border-red-200';
  }
}

function scoreFromUpside(upsidePct: number): number {
  if (upsidePct >= 30) return 95;
  if (upsidePct >= 15) return 82;
  if (upsidePct >= 5) return 68;
  if (upsidePct >= -5) return 52;
  if (upsidePct >= -15) return 35;
  return 20;
}

function scoreFromCagr(cagr: number | null): number | null {
  if (cagr === null || Number.isNaN(cagr)) return null;
  if (cagr >= 0.15) return 90;
  if (cagr >= 0.10) return 78;
  if (cagr >= 0.05) return 65;
  if (cagr >= 0) return 50;
  if (cagr >= -0.05) return 35;
  return 20;
}

function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
