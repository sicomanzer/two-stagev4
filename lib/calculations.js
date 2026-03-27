"use strict";
/**
 * VI Calculation Engine
 * รวมสูตรการคำนวณทั้งหมดสำหรับ Value Investing
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateDDM = calculateDDM;
exports.calculateImpliedGrowth = calculateImpliedGrowth;
exports.calculateGrahamNumber = calculateGrahamNumber;
exports.calculatePEG = calculatePEG;
exports.calculateDCF = calculateDCF;
exports.calculateConsensus = calculateConsensus;
exports.calculateScorecard = calculateScorecard;
exports.calculateFScore = calculateFScore;
exports.calculateZScore = calculateZScore;
exports.calculateCAGR = calculateCAGR;
exports.calculateTrendAnalysis = calculateTrendAnalysis;
exports.calculateScenarioAnalysis = calculateScenarioAnalysis;
exports.calculateInvestmentSignal = calculateInvestmentSignal;
exports.getStatus = getStatus;
exports.calculateShares = calculateShares;
exports.formatNumber = formatNumber;
exports.formatPercent = formatPercent;
exports.getRatingStars = getRatingStars;
exports.getRatingColor = getRatingColor;
// ===================================================================
// 1. TWO-STAGE DDM (อ.กวี ชูกิจเกษม)
// ===================================================================
function calculateDDM(ticker, d0, g, ks, years, currentPrice) {
    var tableData = [];
    var baseYear = new Date().getFullYear();
    // Year 0
    tableData.push({
        year: (baseYear - 1).toString(),
        dividend: d0,
        pv: null,
        growth: null,
        k: ks,
    });
    var pvSum = 0;
    var prevD = d0;
    // Explicit Years
    for (var t = 1; t <= years; t++) {
        var year = baseYear + t - 1;
        var dt = prevD * (1 + g);
        var pv = dt / Math.pow(1 + ks, t);
        pvSum += pv;
        tableData.push({
            year: year.toString(),
            dividend: dt,
            pv: pv,
            growth: g,
            k: null,
        });
        prevD = dt;
    }
    // Terminal Year
    var terminalYear = baseYear + years;
    var dTerminal = prevD * (1 + g);
    var tv = dTerminal / (ks - g);
    var pvTv = tv / Math.pow(1 + ks, years);
    tableData.push({
        year: "".concat(terminalYear, " (Terminal)"),
        dividend: dTerminal,
        pv: pvTv,
        growth: g,
        k: null,
        isTerminal: true,
    });
    var fairPrice = pvSum + pvTv;
    var margin = null;
    var status = 'Fair';
    var recommendation = 'HOLD';
    if (currentPrice) {
        margin = ((fairPrice - currentPrice) / currentPrice) * 100;
        if (margin >= 15) {
            status = 'Undervalued';
            recommendation = 'BUY';
        }
        else if (margin <= -15) {
            status = 'Overvalued';
            recommendation = 'SELL';
        }
    }
    return {
        ticker: ticker,
        currentPrice: currentPrice,
        d0: d0,
        g: g,
        ks: ks,
        fairPrice: fairPrice,
        margin: margin,
        status: status,
        recommendation: recommendation,
        tableData: tableData,
    };
}
function calculateImpliedGrowth(currentPrice, d0, ks) {
    if (!currentPrice || currentPrice <= 0 || d0 < 0 || ks <= 0)
        return null;
    // Formula: g = (Price * ks - D0) / (Price + D0)
    var impliedG = (currentPrice * ks - d0) / (currentPrice + d0);
    var expectationStatus = 'Moderate';
    if (impliedG >= 0.10) {
        expectationStatus = 'High';
    }
    else if (impliedG <= 0.03) {
        expectationStatus = 'Low';
    }
    // Realistic boundary check: it's very hard for a mature dividend stock to grow > 15% perpetually.
    var isRealistic = impliedG < 0.15 && impliedG >= 0;
    return {
        impliedG: impliedG,
        isRealistic: isRealistic,
        marketExpectationStatus: expectationStatus
    };
}
// ===================================================================
// 2. GRAHAM NUMBER (Benjamin Graham)
// ===================================================================
function calculateGrahamNumber(eps, bvps, currentPrice) {
    if (!eps || eps <= 0 || !bvps || bvps <= 0)
        return null;
    var grahamNumber = Math.sqrt(22.5 * eps * bvps);
    var margin = null;
    var status = 'N/A';
    if (currentPrice && currentPrice > 0) {
        margin = ((grahamNumber - currentPrice) / currentPrice) * 100;
        if (margin > 20)
            status = 'Very Undervalued';
        else if (margin > 0)
            status = 'Undervalued';
        else if (margin > -20)
            status = 'Fair';
        else
            status = 'Overvalued';
    }
    return { grahamNumber: grahamNumber, eps: eps, bvps: bvps, margin: margin, status: status };
}
// ===================================================================
// 3. PEG RATIO (Price/Earnings to Growth)
// ===================================================================
function calculatePEG(pe, epsGrowth // as decimal, e.g. 0.10 for 10%
) {
    if (!pe || pe <= 0 || !epsGrowth || epsGrowth <= 0)
        return null;
    var epsGrowthPercent = epsGrowth * 100;
    var peg = pe / epsGrowthPercent;
    var status = '';
    if (peg < 0.5)
        status = 'Very Undervalued';
    else if (peg < 1.0)
        status = 'Undervalued';
    else if (peg < 1.5)
        status = 'Fair';
    else if (peg < 2.0)
        status = 'Slightly Overvalued';
    else
        status = 'Overvalued';
    return { peg: peg, pe: pe, epsGrowth: epsGrowthPercent, status: status };
}
// ===================================================================
// 3.5 DCF (Discounted Cash Flow)
// ===================================================================
function calculateDCF(fcf0, // Free Cash Flow at year 0
shares, wacc, // Default WACC 8%
growthRate, // Phase 1 Growth 5%
terminalGrowthRate, // Terminal Growth 2%
years) {
    if (wacc === void 0) { wacc = 0.08; }
    if (growthRate === void 0) { growthRate = 0.05; }
    if (terminalGrowthRate === void 0) { terminalGrowthRate = 0.02; }
    if (years === void 0) { years = 5; }
    if (!fcf0 || fcf0 <= 0 || !shares || shares <= 0)
        return null;
    var fcfValues = [];
    var currentFCF = fcf0;
    var pvSum = 0;
    // 1. Explicit Forecast Period
    for (var t = 1; t <= years; t++) {
        currentFCF = currentFCF * (1 + growthRate);
        fcfValues.push(currentFCF);
        // Calculate Present Value of FCF
        var pv = currentFCF / Math.pow(1 + wacc, t);
        pvSum += pv;
    }
    // 2. Terminal Value Calculation (Gordon Growth Model)
    var terminalFCF = currentFCF * (1 + terminalGrowthRate);
    var terminalValue = terminalFCF / (wacc - terminalGrowthRate);
    // Present Value of Terminal Value
    var pvTerminalValue = terminalValue / Math.pow(1 + wacc, years);
    // 3. Enterprise Value
    var enterpriseValue = pvSum + pvTerminalValue;
    // *Usually we add cash and subtract debt here, but keeping it simple proxy for now*
    // 4. Fair Value Per Share
    var fairValue = enterpriseValue / shares;
    return {
        fairValue: fairValue,
        fcfValues: fcfValues,
        terminalValue: terminalValue,
        wacc: wacc,
        terminalGrowth: terminalGrowthRate,
        margin: null // calculated later
    };
}
// ===================================================================
// 4. VALUATION CONSENSUS (Multi-Model)
// ===================================================================
function calculateConsensus(ddmFair, grahamFair, peBandFair, // -1SD PE based fair price
dcfFair, currentPrice) {
    var models = [];
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
    var totalWeight = models.reduce(function (sum, m) { return sum + m.weight; }, 0);
    if (totalWeight > 0) {
        models.forEach(function (m) { return (m.weight = m.weight / totalWeight); });
    }
    var consensusFairPrice = models.reduce(function (sum, m) { return sum + m.fairPrice * m.weight; }, 0);
    var upside = currentPrice && currentPrice > 0
        ? ((consensusFairPrice - currentPrice) / currentPrice) * 100
        : null;
    return {
        ddm: ddmFair && ddmFair > 0 ? { fairPrice: ddmFair, weight: 0.35 } : null,
        graham: grahamFair && grahamFair > 0 ? { fairPrice: grahamFair, weight: 0.30 } : null,
        dcf: dcfFair && dcfFair > 0 ? { fairPrice: dcfFair, weight: 0.25 } : null,
        peBand: peBandFair && peBandFair > 0 ? { fairPrice: peBandFair, weight: 0.35 } : null,
        consensusFairPrice: consensusFairPrice,
        currentPrice: currentPrice,
        upside: upside,
    };
}
// ===================================================================
// 5. STOCK SCORECARD (VI Quality Score — /20)
// ===================================================================
function calculateScorecard(ticker, history, currentPrice, fairPrice, latestPE, latestPBV, peAvg, pbvAvg) {
    var categories = [];
    var totalScore = 0;
    // Need at least 5 years of data
    var recent5 = history.slice(-5);
    var recent10 = history.slice(-10);
    // --- 1. ROE > 15% consistently (3 pts) ---
    var roeValues = recent5.map(function (h) { return h.roe; }).filter(function (v) { return v != null; });
    var roeScore = 0;
    if (roeValues.length >= 3) {
        var avgROE = roeValues.reduce(function (a, b) { return a + b; }, 0) / roeValues.length;
        var allAbove15 = roeValues.every(function (v) { return v > 12; }); // Thaifin roe is percentage (e.g. 15.5)
        if (avgROE > 15 && allAbove15)
            roeScore = 3;
        else if (avgROE > 12)
            roeScore = 2;
        else if (avgROE > 8)
            roeScore = 1;
    }
    categories.push({
        name: 'ROE',
        score: roeScore,
        maxScore: 3,
        detail: roeValues.length > 0 ? "AVG ".concat((roeValues.reduce(function (a, b) { return a + b; }, 0) / roeValues.length).toFixed(1), "%") : 'N/A',
        icon: '📊',
    });
    totalScore += roeScore;
    // --- 2. D/E < 1.0 (2 pts) ---
    var deValues = recent5.map(function (h) { return h.de; }).filter(function (v) { return v != null; });
    var deScore = 0;
    if (deValues.length > 0) {
        var latestDE = deValues[deValues.length - 1];
        if (latestDE < 0.5)
            deScore = 2;
        else if (latestDE < 1.0)
            deScore = 1;
    }
    categories.push({
        name: 'D/E',
        score: deScore,
        maxScore: 2,
        detail: deValues.length > 0 ? "".concat(deValues[deValues.length - 1].toFixed(2), "x") : 'N/A',
        icon: '🏦',
    });
    totalScore += deScore;
    // --- 3. Dividend consistency (3 pts) ---
    // Fix: Check CONSECUTIVE years, not just total years
    var currentYear = new Date().getFullYear();
    var consecutiveYears = 0;
    var startedStreak = false;
    // Iterate backwards to find streak
    for (var i = history.length - 1; i >= 0; i--) {
        var h = history[i];
        // Skip current incomplete year if no dividend yet
        if (h.year === currentYear && (!h.dps || h.dps <= 0)) {
            continue;
        }
        if (h.dps && h.dps > 0) {
            consecutiveYears++;
            startedStreak = true;
        }
        else {
            // If we hit a zero after finding dividends, streak ends
            if (startedStreak)
                break;
            // If we hit a zero (gap) before finding any dividends in past years, streak is 0
            if (h.year < currentYear)
                break;
        }
    }
    var divScore = 0;
    if (consecutiveYears >= 10)
        divScore = 3;
    else if (consecutiveYears >= 7)
        divScore = 2;
    else if (consecutiveYears >= 5)
        divScore = 1;
    // Check if dividend is growing (Bonus)
    // Use dpsValues for Growth check (Trend)
    var dpsValues = history.map(function (h) { return h.dps; }).filter(function (v) { return v != null && v > 0; });
    if (divScore >= 2 && dpsValues.length >= 2) {
        var first = dpsValues[0];
        var last = dpsValues[dpsValues.length - 1];
        if (last > first)
            divScore = Math.min(divScore + 1, 3); // Bonus point for growth (max 3)
    }
    categories.push({
        name: 'เงินปันผล',
        score: divScore,
        maxScore: 3,
        detail: "\u0E08\u0E48\u0E32\u0E22\u0E15\u0E48\u0E2D\u0E40\u0E19\u0E37\u0E48\u0E2D\u0E07 ".concat(consecutiveYears, " \u0E1B\u0E35"),
        icon: '💰',
    });
    totalScore += divScore;
    // --- 4. EPS Growth CAGR > 5% (2 pts) ---
    var epsCAGR = calculateCAGR(recent5.map(function (h) { return h.eps; }));
    var epsScore = 0;
    if (epsCAGR !== null) {
        if (epsCAGR > 0.10)
            epsScore = 2;
        else if (epsCAGR > 0.05)
            epsScore = 1;
    }
    categories.push({
        name: 'EPS Growth',
        score: epsScore,
        maxScore: 2,
        detail: epsCAGR !== null ? "CAGR ".concat((epsCAGR * 100).toFixed(1), "%") : 'N/A',
        icon: '📈',
    });
    totalScore += epsScore;
    // --- 5. Revenue Growth CAGR > 5% (2 pts) ---
    var revCAGR = calculateCAGR(recent5.map(function (h) { return h.revenue; }));
    var revScore = 0;
    if (revCAGR !== null) {
        if (revCAGR > 0.10)
            revScore = 2;
        else if (revCAGR > 0.05)
            revScore = 1;
    }
    categories.push({
        name: 'Revenue Growth',
        score: revScore,
        maxScore: 2,
        detail: revCAGR !== null ? "CAGR ".concat((revCAGR * 100).toFixed(1), "%") : 'N/A',
        icon: '🏭',
    });
    totalScore += revScore;
    // --- 6. NPM Stability (1 pt) ---
    var npmValues = recent5.map(function (h) { return h.npm; }).filter(function (v) { return v != null; });
    var npmScore = 0;
    if (npmValues.length >= 3) {
        var avg_1 = npmValues.reduce(function (a, b) { return a + b; }, 0) / npmValues.length;
        var maxDeviation = Math.max.apply(Math, npmValues.map(function (v) { return Math.abs(v - avg_1) / avg_1; }));
        if (maxDeviation < 0.30)
            npmScore = 1;
    }
    categories.push({
        name: 'NPM Stability',
        score: npmScore,
        maxScore: 1,
        detail: npmValues.length > 0 ? "AVG ".concat(npmValues[npmValues.length - 1].toFixed(1), "%") : 'N/A',
        icon: '📉',
    });
    totalScore += npmScore;
    // --- 7. Payout Ratio 30%-70% (1 pt) ---
    var payoutScore = 0;
    var payoutDetail = 'นอกช่วง';
    // Find latest year with BOTH EPS and DPS
    for (var i = history.length - 1; i >= 0; i--) {
        var h = history[i];
        if (h.dps && h.dps > 0 && h.eps && h.eps > 0) {
            var payout = h.dps / h.eps;
            if (payout >= 0.30 && payout <= 0.70) {
                payoutScore = 1;
                payoutDetail = "\u0E2D\u0E22\u0E39\u0E48\u0E43\u0E19\u0E0A\u0E48\u0E27\u0E07 ".concat((payout * 100).toFixed(0), "%");
            }
            else {
                payoutDetail = "".concat((payout * 100).toFixed(0), "% (\u0E19\u0E2D\u0E01\u0E0A\u0E48\u0E27\u0E07)");
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
    var peScore = 0;
    if (latestPE && peAvg) {
        if (latestPE < peAvg * 0.8)
            peScore = 2;
        else if (latestPE < peAvg)
            peScore = 1;
    }
    categories.push({
        name: 'PE Band',
        score: peScore,
        maxScore: 2,
        detail: latestPE ? "PE ".concat(latestPE.toFixed(1), " vs AVG ").concat((peAvg === null || peAvg === void 0 ? void 0 : peAvg.toFixed(1)) || 'N/A') : 'N/A',
        icon: '📊',
    });
    totalScore += peScore;
    // --- 9. PBV below average (2 pts) ---
    var pbvScore = 0;
    if (latestPBV && pbvAvg) {
        if (latestPBV < pbvAvg * 0.8)
            pbvScore = 2;
        else if (latestPBV < pbvAvg)
            pbvScore = 1;
    }
    categories.push({
        name: 'PBV Band',
        score: pbvScore,
        maxScore: 2,
        detail: latestPBV ? "PBV ".concat(latestPBV.toFixed(2), " vs AVG ").concat((pbvAvg === null || pbvAvg === void 0 ? void 0 : pbvAvg.toFixed(2)) || 'N/A') : 'N/A',
        icon: '📊',
    });
    totalScore += pbvScore;
    // --- 10. MOS > 30% (2 pts) ---
    var mosScore = 0;
    if (currentPrice && fairPrice && fairPrice > 0) {
        var mos = ((fairPrice - currentPrice) / fairPrice) * 100;
        if (mos >= 50)
            mosScore = 2;
        else if (mos >= 30)
            mosScore = 1;
    }
    categories.push({
        name: 'Margin of Safety',
        score: mosScore,
        maxScore: 2,
        detail: currentPrice && fairPrice ? "MOS ".concat((((fairPrice - currentPrice) / fairPrice) * 100).toFixed(0), "%") : 'N/A',
        icon: '🛡️',
    });
    totalScore += mosScore;
    // Rating
    var rating = 1;
    var ratingLabel = '';
    if (totalScore >= 17) {
        rating = 5;
        ratingLabel = 'หุ้นพิเศษ — หายากมาก';
    }
    else if (totalScore >= 13) {
        rating = 4;
        ratingLabel = 'หุ้นดี — คุ้มค่าแก่การลงทุน';
    }
    else if (totalScore >= 9) {
        rating = 3;
        ratingLabel = 'หุ้นพอใช้ — ต้องดูเพิ่มเติม';
    }
    else if (totalScore >= 5) {
        rating = 2;
        ratingLabel = 'หุ้นเสี่ยง — ระวัง';
    }
    else {
        rating = 1;
        ratingLabel = 'หุ้นไม่ผ่าน — ไม่ตรงเกณฑ์ VI';
    }
    return {
        ticker: ticker,
        totalScore: totalScore,
        maxScore: 20,
        rating: rating,
        ratingLabel: ratingLabel,
        categories: categories,
    };
}
// ===================================================================
// 5.5 PIOTROSKI F-SCORE (Quality & Health)
// ===================================================================
function calculateFScore(history) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r;
    // Need at least 2 years of data to calculate changes
    if (history.length < 2)
        return null;
    // Find the most recent year with SUFFICIENT data for F-Score
    // We need at least Total Assets and Net Profit to be non-zero/non-null
    var currentIndex = history.length - 1;
    while (currentIndex >= 1) {
        var h = history[currentIndex];
        // Check for critical F-Score components:
        // ROA needs Net Profit & Total Assets
        // CFO needs Operating Cash Flow
        // GPM needs Gross Profit & Revenue
        // If major components are missing, skip this year
        var hasData = (h.totalAssets && h.totalAssets > 0) &&
            (h.netProfit !== null && h.netProfit !== undefined) &&
            (h.revenue !== null && h.revenue !== undefined);
        if (hasData) {
            break;
        }
        currentIndex--;
    }
    // If we couldn't find a valid year with a preceding year
    if (currentIndex < 1)
        return null;
    var current = history[currentIndex];
    var prev = history[currentIndex - 1];
    var score = 0;
    var criteria = [];
    // Add a note about the year being used
    var currentYear = current.year;
    var prevYear = prev.year;
    // --- Profitability ---
    // 1. ROA > 0
    var roa = (_a = current.roa) !== null && _a !== void 0 ? _a : 0; // percentage
    var pass1 = roa > 0;
    if (pass1)
        score++;
    criteria.push({
        name: 'Return on Assets (ROA)',
        condition: '> 0',
        value: "".concat(roa.toFixed(2), "% (").concat(currentYear, ")"),
        passed: pass1,
        score: pass1 ? 1 : 0
    });
    // 2. CFO > 0
    var cfo = (_b = current.operatingCashFlow) !== null && _b !== void 0 ? _b : 0;
    var pass2 = cfo > 0;
    if (pass2)
        score++;
    criteria.push({
        name: 'Operating Cash Flow (CFO)',
        condition: '> 0',
        value: "".concat(formatNumber(cfo), " (").concat(currentYear, ")"),
        passed: pass2,
        score: pass2 ? 1 : 0
    });
    // 3. Delta ROA > 0 (Improving ROA)
    var prevRoa = (_c = prev.roa) !== null && _c !== void 0 ? _c : 0;
    var pass3 = roa > prevRoa;
    if (pass3)
        score++;
    criteria.push({
        name: 'Change in ROA',
        condition: '> Previous Year',
        value: "".concat(roa.toFixed(2), "% vs ").concat(prevRoa.toFixed(2), "% (").concat(currentYear, " vs ").concat(prevYear, ")"),
        passed: pass3,
        score: pass3 ? 1 : 0
    });
    // 4. Accrual (CFO > Net Income)
    var netIncome = (_d = current.netProfit) !== null && _d !== void 0 ? _d : 0;
    var pass4 = cfo > netIncome;
    if (pass4)
        score++;
    criteria.push({
        name: 'Accruals (CFO > Net Income)',
        condition: 'CFO > Net Income',
        value: "".concat(formatNumber(cfo), " vs ").concat(formatNumber(netIncome), " (").concat(currentYear, ")"),
        passed: pass4,
        score: pass4 ? 1 : 0
    });
    // --- Leverage, Liquidity, Source of Funds ---
    // 5. Delta Leverage (Lower Long Term Debt Ratio)
    // Leverage = Long Term Debt / Average Total Assets
    // We'll use Year-End Total Assets for simplicity as often done in simplified F-Score
    var currentLTD = (_e = current.longTermDebt) !== null && _e !== void 0 ? _e : 0;
    var currentAssets = (_f = current.totalAssets) !== null && _f !== void 0 ? _f : 1; // avoid div by zero
    var currentLeverage = currentLTD / currentAssets;
    var prevLTD = (_g = prev.longTermDebt) !== null && _g !== void 0 ? _g : 0;
    var prevAssets = (_h = prev.totalAssets) !== null && _h !== void 0 ? _h : 1;
    var prevLeverage = prevLTD / prevAssets;
    var pass5 = currentLeverage <= prevLeverage;
    if (pass5)
        score++;
    criteria.push({
        name: 'Change in Leverage (LTD/Assets)',
        condition: '<= Previous Year',
        value: "".concat((currentLeverage * 100).toFixed(2), "% vs ").concat((prevLeverage * 100).toFixed(2), "% (").concat(currentYear, " vs ").concat(prevYear, ")"),
        passed: pass5,
        score: pass5 ? 1 : 0
    });
    // 6. Delta Current Ratio (Improving Liquidity)
    var currentCR = (_j = current.currentRatio) !== null && _j !== void 0 ? _j : 0;
    var prevCR = (_k = prev.currentRatio) !== null && _k !== void 0 ? _k : 0;
    var pass6 = currentCR > prevCR;
    if (pass6)
        score++;
    criteria.push({
        name: 'Change in Current Ratio',
        condition: '> Previous Year',
        value: "".concat(currentCR.toFixed(2), " vs ").concat(prevCR.toFixed(2), " (").concat(currentYear, " vs ").concat(prevYear, ")"),
        passed: pass6,
        score: pass6 ? 1 : 0
    });
    // 7. No New Shares (Dilution Check)
    // Pass if current shares <= previous shares
    var currentShares = (_l = current.shares) !== null && _l !== void 0 ? _l : 0;
    var prevShares = (_m = prev.shares) !== null && _m !== void 0 ? _m : 0;
    // If shares data is missing, we might skip or assume pass. Let's assume pass if missing but if both exist check.
    var pass7 = true;
    if (currentShares > 0 && prevShares > 0) {
        pass7 = currentShares <= prevShares; // Allow small variance? No, strict.
    }
    if (pass7)
        score++;
    criteria.push({
        name: 'Change in Shares Outstanding',
        condition: '<= Previous Year',
        value: currentShares && prevShares ? "".concat(formatNumber(currentShares), " vs ").concat(formatNumber(prevShares), " (").concat(currentYear, " vs ").concat(prevYear, ")") : 'Data N/A',
        passed: pass7,
        score: pass7 ? 1 : 0
    });
    // --- Operating Efficiency ---
    // 8. Delta Gross Margin (Improving GPM)
    var currentGPM = (_o = current.gpm) !== null && _o !== void 0 ? _o : 0;
    var prevGPM = (_p = prev.gpm) !== null && _p !== void 0 ? _p : 0;
    var pass8 = currentGPM > prevGPM;
    if (pass8)
        score++;
    criteria.push({
        name: 'Change in Gross Margin',
        condition: '> Previous Year',
        value: "".concat(currentGPM.toFixed(2), "% vs ").concat(prevGPM.toFixed(2), "% (").concat(currentYear, " vs ").concat(prevYear, ")"),
        passed: pass8,
        score: pass8 ? 1 : 0
    });
    // 9. Delta Asset Turnover (Improving Efficiency)
    // Asset Turnover = Revenue / Total Assets (beginning of year assets is better, but we use year end)
    var currentRev = (_q = current.revenue) !== null && _q !== void 0 ? _q : 0;
    var currentAT = (currentRev / currentAssets);
    var prevRev = (_r = prev.revenue) !== null && _r !== void 0 ? _r : 0;
    var prevAT = (prevRev / prevAssets);
    var pass9 = currentAT > prevAT;
    if (pass9)
        score++;
    criteria.push({
        name: 'Change in Asset Turnover',
        condition: '> Previous Year',
        value: "".concat(currentAT.toFixed(2), " vs ").concat(prevAT.toFixed(2), " (").concat(currentYear, " vs ").concat(prevYear, ")"),
        passed: pass9,
        score: pass9 ? 1 : 0
    });
    var grade = 'Weak';
    if (score >= 7)
        grade = 'Strong';
    else if (score >= 4)
        grade = 'Stable';
    return {
        score: score,
        grade: grade,
        year: currentYear,
        criteria: criteria
    };
}
function calculateZScore(history, marketCap) {
    if (history.length === 0)
        return null;
    // Use the most recent year with sufficient data
    // Iterate backwards to find a year with enough data
    var current = null;
    for (var i = history.length - 1; i >= 0; i--) {
        var h = history[i];
        if (h.totalAssets && h.totalLiabilities) {
            current = h;
            break;
        }
    }
    if (!current)
        return null;
    var totalAssets = current.totalAssets || 0;
    var totalLiabilities = current.totalLiabilities || 0;
    var retainedEarnings = current.retainedEarnings || 0;
    var ebit = current.ebit || 0;
    var revenue = current.revenue || 0;
    // Working Capital = Current Assets - Current Liabilities
    var currentAssets = current.totalCurrentAssets || 0;
    var currentLiabilities = current.totalCurrentLiabilities || 0;
    var workingCapital = currentAssets - currentLiabilities;
    // Market Value of Equity
    // Use marketCap if available, otherwise Price * Shares
    var marketValueEquity = marketCap || 0;
    if (marketValueEquity === 0 && current.price && current.shares) {
        marketValueEquity = current.price * current.shares;
    }
    // Check critical values to avoid division by zero or invalid result
    if (totalAssets <= 0 || totalLiabilities <= 0)
        return null;
    // A: Working Capital / Total Assets
    var A = workingCapital / totalAssets;
    // B: Retained Earnings / Total Assets
    var B = retainedEarnings / totalAssets;
    // C: EBIT / Total Assets
    var C = ebit / totalAssets;
    // D: Market Value of Equity / Total Liabilities
    var D = marketValueEquity / totalLiabilities;
    // E: Sales / Total Assets
    var E = revenue / totalAssets;
    // Z-Score Formula (for Public Manufacturing)
    // Z = 1.2A + 1.4B + 3.3C + 0.6D + 1.0E
    var score = (1.2 * A) + (1.4 * B) + (3.3 * C) + (0.6 * D) + (1.0 * E);
    var status = 'Grey';
    if (score > 2.99)
        status = 'Safe';
    else if (score < 1.81)
        status = 'Distress';
    var components = [
        { name: 'Working Capital / Total Assets', formula: '1.2 * A', value: A, weight: 1.2, score: 1.2 * A },
        { name: 'Retained Earnings / Total Assets', formula: '1.4 * B', value: B, weight: 1.4, score: 1.4 * B },
        { name: 'EBIT / Total Assets', formula: '3.3 * C', value: C, weight: 3.3, score: 3.3 * C },
        { name: 'Market Value of Equity / Total Liab', formula: '0.6 * D', value: D, weight: 0.6, score: 0.6 * D },
        { name: 'Sales / Total Assets', formula: '1.0 * E', value: E, weight: 1.0, score: 1.0 * E },
    ];
    return {
        score: score,
        status: status,
        year: current.year,
        components: components
    };
}
function calculateCAGR(values) {
    var filtered = values.filter(function (v) { return v != null && v > 0; });
    if (filtered.length < 2)
        return null;
    var start = filtered[0];
    var end = filtered[filtered.length - 1];
    var years = filtered.length - 1;
    if (start <= 0 || end <= 0 || years <= 0)
        return null;
    return Math.pow(end / start, 1 / years) - 1;
}
function calculateTrendAnalysis(ticker, history) {
    var recent3 = history.slice(-3);
    var recent5 = history.slice(-5);
    var recent10 = history.slice(-10);
    var cagrs = [
        {
            metric: 'Revenue',
            cagr3y: calculateCAGR(recent3.map(function (h) { return h.revenue; })),
            cagr5y: calculateCAGR(recent5.map(function (h) { return h.revenue; })),
            cagr10y: calculateCAGR(recent10.map(function (h) { return h.revenue; })),
            trend: getTrend(calculateCAGR(recent5.map(function (h) { return h.revenue; }))),
        },
        {
            metric: 'Net Profit',
            cagr3y: calculateCAGR(recent3.map(function (h) { return h.netProfit; })),
            cagr5y: calculateCAGR(recent5.map(function (h) { return h.netProfit; })),
            cagr10y: calculateCAGR(recent10.map(function (h) { return h.netProfit; })),
            trend: getTrend(calculateCAGR(recent5.map(function (h) { return h.netProfit; }))),
        },
        {
            metric: 'EPS',
            cagr3y: calculateCAGR(recent3.map(function (h) { return h.eps; })),
            cagr5y: calculateCAGR(recent5.map(function (h) { return h.eps; })),
            cagr10y: calculateCAGR(recent10.map(function (h) { return h.eps; })),
            trend: getTrend(calculateCAGR(recent5.map(function (h) { return h.eps; }))),
        },
        {
            metric: 'DPS',
            cagr3y: calculateCAGR(recent3.map(function (h) { return h.dps; })),
            cagr5y: calculateCAGR(recent5.map(function (h) { return h.dps; })),
            cagr10y: calculateCAGR(recent10.map(function (h) { return h.dps; })),
            trend: getTrend(calculateCAGR(recent5.map(function (h) { return h.dps; }))),
        },
        {
            metric: 'BVPS',
            cagr3y: calculateCAGR(recent3.map(function (h) { return h.bvps; })),
            cagr5y: calculateCAGR(recent5.map(function (h) { return h.bvps; })),
            cagr10y: calculateCAGR(recent10.map(function (h) { return h.bvps; })),
            trend: getTrend(calculateCAGR(recent5.map(function (h) { return h.bvps; }))),
        },
    ];
    // Earnings Quality
    var npmValues = recent5.map(function (h) { return h.npm; }).filter(function (v) { return v != null; });
    var npmTrend = 'stable';
    if (npmValues.length >= 3) {
        var first = npmValues[0];
        var last = npmValues[npmValues.length - 1];
        if (last > first * 1.1)
            npmTrend = 'improving';
        else if (last < first * 0.9)
            npmTrend = 'declining';
    }
    var revGrowth = calculateCAGR(recent5.map(function (h) { return h.revenue; }));
    var profitGrowth = calculateCAGR(recent5.map(function (h) { return h.netProfit; }));
    var revenueVsProfit = 'healthy';
    if (revGrowth !== null && profitGrowth !== null) {
        if (profitGrowth < revGrowth * 0.5)
            revenueVsProfit = 'concern';
        else if (profitGrowth < revGrowth)
            revenueVsProfit = 'warning';
    }
    var deValues = recent5.map(function (h) { return h.de; }).filter(function (v) { return v != null; });
    var deTrend = 'stable';
    if (deValues.length >= 3) {
        var first = deValues[0];
        var last = deValues[deValues.length - 1];
        if (last < first * 0.9)
            deTrend = 'improving';
        else if (last > first * 1.2)
            deTrend = 'deteriorating';
    }
    var dpsValues = history.map(function (h) { return h.dps; }).filter(function (v) { return v != null && v > 0; });
    return {
        ticker: ticker,
        cagrs: cagrs,
        earningsQuality: {
            npmTrend: npmTrend,
            revenueVsProfit: revenueVsProfit,
            deTrend: deTrend,
            dividendConsistency: dpsValues.length,
        },
    };
}
function getTrend(cagr) {
    if (cagr === null)
        return 'stable';
    if (cagr > 0.03)
        return 'up';
    if (cagr < -0.03)
        return 'down';
    return 'stable';
}
// ===================================================================
// 7. SCENARIO ANALYSIS
// ===================================================================
function calculateScenarioAnalysis(ticker, d0, currentPrice, years) {
    var scenarios = [
        { name: 'Bull Case', g: 0.07, ks: 0.10, probability: 0.25, fairPrice: 0 },
        { name: 'Base Case', g: 0.05, ks: 0.10, probability: 0.50, fairPrice: 0 },
        { name: 'Bear Case', g: 0.03, ks: 0.12, probability: 0.25, fairPrice: 0 },
    ];
    scenarios.forEach(function (s) {
        var result = calculateDDM(ticker, d0, s.g, s.ks, years, currentPrice);
        s.fairPrice = result.fairPrice;
    });
    var weightedFairPrice = scenarios.reduce(function (sum, s) { return sum + s.fairPrice * s.probability; }, 0);
    return { ticker: ticker, scenarios: scenarios, weightedFairPrice: weightedFairPrice, currentPrice: currentPrice };
}
function calculateInvestmentSignal(params) {
    var _a, _b, _c, _d, _e;
    var valuationCandidates = [];
    var qualityCandidates = [];
    var riskCandidates = [];
    var momentumCandidates = [];
    var scenarioCandidates = [];
    var reasons = [];
    if (((_a = params.result) === null || _a === void 0 ? void 0 : _a.margin) !== null && ((_b = params.result) === null || _b === void 0 ? void 0 : _b.margin) !== undefined) {
        valuationCandidates.push(scoreFromUpside(params.result.margin));
        if (params.result.margin >= 15)
            reasons.push("DDM margin +".concat(params.result.margin.toFixed(1), "%"));
        if (params.result.margin <= -15)
            reasons.push("DDM margin ".concat(params.result.margin.toFixed(1), "%"));
    }
    if (((_c = params.consensus) === null || _c === void 0 ? void 0 : _c.upside) !== null && ((_d = params.consensus) === null || _d === void 0 ? void 0 : _d.upside) !== undefined) {
        valuationCandidates.push(scoreFromUpside(params.consensus.upside));
        if (params.consensus.upside >= 15)
            reasons.push("Consensus upside +".concat(params.consensus.upside.toFixed(1), "%"));
        if (params.consensus.upside <= -10)
            reasons.push("Consensus upside ".concat(params.consensus.upside.toFixed(1), "%"));
    }
    if (params.scorecard) {
        var score_1 = (params.scorecard.totalScore / Math.max(params.scorecard.maxScore, 1)) * 100;
        qualityCandidates.push(clamp(score_1, 0, 100));
        reasons.push("VI Score ".concat(params.scorecard.totalScore, "/").concat(params.scorecard.maxScore));
    }
    if (params.fScore) {
        var score_2 = (params.fScore.score / 9) * 100;
        qualityCandidates.push(clamp(score_2, 0, 100));
        reasons.push("F-Score ".concat(params.fScore.score, "/9 (").concat(params.fScore.grade, ")"));
    }
    if (params.zScore) {
        var base = 55;
        if (params.zScore.status === 'Safe')
            base = 85;
        if (params.zScore.status === 'Distress')
            base = 20;
        var adjustment = clamp((params.zScore.score - 2) * 10, -15, 15);
        riskCandidates.push(clamp(base + adjustment, 0, 100));
        reasons.push("Altman Z ".concat(params.zScore.score.toFixed(2), " (").concat(params.zScore.status, ")"));
    }
    if (params.trendAnalysis) {
        var cagrScores = params.trendAnalysis.cagrs
            .map(function (item) { return scoreFromCagr(item.cagr5y); })
            .filter(function (v) { return v !== null; });
        if (cagrScores.length > 0) {
            momentumCandidates.push(average(cagrScores));
        }
        var quality = params.trendAnalysis.earningsQuality;
        if (quality.npmTrend === 'improving')
            momentumCandidates.push(70);
        if (quality.npmTrend === 'declining')
            momentumCandidates.push(35);
        if (quality.revenueVsProfit === 'healthy')
            momentumCandidates.push(70);
        if (quality.revenueVsProfit === 'warning')
            momentumCandidates.push(50);
        if (quality.revenueVsProfit === 'concern')
            momentumCandidates.push(30);
        if (quality.deTrend === 'improving')
            riskCandidates.push(75);
        if (quality.deTrend === 'stable')
            riskCandidates.push(55);
        if (quality.deTrend === 'deteriorating')
            riskCandidates.push(30);
    }
    if (((_e = params.scenarioAnalysis) === null || _e === void 0 ? void 0 : _e.currentPrice) && params.scenarioAnalysis.currentPrice > 0) {
        var weightedUpside = ((params.scenarioAnalysis.weightedFairPrice - params.scenarioAnalysis.currentPrice) /
            params.scenarioAnalysis.currentPrice) *
            100;
        scenarioCandidates.push(scoreFromUpside(weightedUpside));
        var bear = params.scenarioAnalysis.scenarios.find(function (s) { return s.name.toLowerCase().includes('bear'); });
        if (bear) {
            var bearUpside = ((bear.fairPrice - params.scenarioAnalysis.currentPrice) / params.scenarioAnalysis.currentPrice) * 100;
            scenarioCandidates.push(clamp(50 + bearUpside * 1.2, 10, 95));
            reasons.push("Bear case ".concat(bearUpside > 0 ? '+' : '').concat(bearUpside.toFixed(1), "%"));
        }
    }
    var valuationScore = valuationCandidates.length ? average(valuationCandidates) : null;
    var qualityScore = qualityCandidates.length ? average(qualityCandidates) : null;
    var riskScore = riskCandidates.length ? average(riskCandidates) : null;
    var momentumScore = momentumCandidates.length ? average(momentumCandidates) : null;
    var scenarioScore = scenarioCandidates.length ? average(scenarioCandidates) : null;
    var weighted = [
        { value: valuationScore, weight: 0.35 },
        { value: qualityScore, weight: 0.25 },
        { value: riskScore, weight: 0.20 },
        { value: momentumScore, weight: 0.10 },
        { value: scenarioScore, weight: 0.10 },
    ].filter(function (x) { return x.value !== null; });
    var totalWeight = weighted.reduce(function (sum, item) { return sum + item.weight; }, 0);
    var score = totalWeight > 0 ? weighted.reduce(function (sum, item) { return sum + item.value * item.weight; }, 0) / totalWeight : 50;
    var action = 'HOLD';
    if (score >= 72)
        action = 'BUY';
    else if (score < 45)
        action = 'SELL';
    var dimensionCount = weighted.length;
    var distance = Math.abs(score - 58);
    var confidence = 'Low';
    if (dimensionCount >= 4 && distance >= 16)
        confidence = 'High';
    else if (dimensionCount >= 3 && distance >= 8)
        confidence = 'Medium';
    return {
        action: action,
        score: clamp(score, 0, 100),
        confidence: confidence,
        valuationScore: valuationScore,
        qualityScore: qualityScore,
        riskScore: riskScore,
        momentumScore: momentumScore,
        scenarioScore: scenarioScore,
        reasons: reasons.slice(0, 5),
    };
}
// ===================================================================
// UTILITY FUNCTIONS
// ===================================================================
function getStatus(price, mos30, mos40, mos50, fairPrice) {
    if (!price || price <= 0)
        return { label: '-', color: 'text-slate-400' };
    if (price <= mos50)
        return { label: 'MOS 50%', color: 'text-emerald-600 bg-emerald-100' };
    if (price <= mos40)
        return { label: 'MOS 40%', color: 'text-teal-600 bg-teal-100' };
    if (price <= mos30)
        return { label: 'MOS 30%', color: 'text-cyan-600 bg-cyan-100' };
    if (price < fairPrice)
        return { label: 'ต่ำกว่า FV', color: 'text-blue-600 bg-blue-100' };
    return { label: 'รอก่อนนะ', color: 'text-amber-600 bg-amber-100' };
}
function calculateShares(budget, price) {
    if (!price || price <= 0)
        return 0;
    return Math.floor(budget / price / 100) * 100;
}
function formatNumber(num) {
    if (num === null || num === undefined)
        return '-';
    if (Math.abs(num) >= 1e9)
        return (num / 1e9).toFixed(2) + 'B';
    if (Math.abs(num) >= 1e6)
        return (num / 1e6).toFixed(2) + 'M';
    return num.toFixed(2);
}
function formatPercent(val, decimals) {
    if (decimals === void 0) { decimals = 2; }
    if (val === null || val === undefined)
        return '-';
    return (val * 100).toFixed(decimals) + '%';
}
function getRatingStars(rating) {
    return '⭐'.repeat(rating);
}
function getRatingColor(rating) {
    switch (rating) {
        case 5: return 'text-yellow-500 bg-yellow-50 border-yellow-200';
        case 4: return 'text-emerald-600 bg-emerald-50 border-emerald-200';
        case 3: return 'text-blue-600 bg-blue-50 border-blue-200';
        case 2: return 'text-amber-600 bg-amber-50 border-amber-200';
        default: return 'text-red-600 bg-red-50 border-red-200';
    }
}
function scoreFromUpside(upsidePct) {
    if (upsidePct >= 30)
        return 95;
    if (upsidePct >= 15)
        return 82;
    if (upsidePct >= 5)
        return 68;
    if (upsidePct >= -5)
        return 52;
    if (upsidePct >= -15)
        return 35;
    return 20;
}
function scoreFromCagr(cagr) {
    if (cagr === null || Number.isNaN(cagr))
        return null;
    if (cagr >= 0.15)
        return 90;
    if (cagr >= 0.10)
        return 78;
    if (cagr >= 0.05)
        return 65;
    if (cagr >= 0)
        return 50;
    if (cagr >= -0.05)
        return 35;
    return 20;
}
function average(values) {
    if (!values.length)
        return 0;
    return values.reduce(function (sum, value) { return sum + value; }, 0) / values.length;
}
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
