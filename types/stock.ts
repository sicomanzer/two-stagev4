// ===== Stock Data Types =====

export interface StockHistory {
  year: number;
  revenue: number | null;
  netProfit: number | null;
  eps: number | null;
  dps: number | null;
  dpsQ1?: number | null;
  dpsQ2?: number | null;
  dpsQ3?: number | null;
  dpsQ4?: number | null;
  dpsPayments?: number | null;
  de: number | null;
  npm: number | null;
  roe: number | null;
  roa: number | null;
  pe: number | null;
  pbv: number | null;
  price: number | null;
  bvps: number | null;
  shares?: number | null;
  source?: string;
  // New fields for Piotroski F-Score
  gpm?: number | null; // Gross Profit Margin
  currentRatio?: number | null;
  operatingCashFlow?: number | null;
  totalAssets?: number | null;
  longTermDebt?: number | null;
  // New fields for Altman Z-Score
  totalLiabilities?: number | null;
  totalCurrentAssets?: number | null;
  totalCurrentLiabilities?: number | null;
  retainedEarnings?: number | null;
  ebit?: number | null;
}

export interface FScoreCriteria {
  name: string;
  score: 0 | 1;
  value: number | string | null;
  condition: string;
  passed: boolean;
}

export interface FScoreResult {
  score: number; // 0-9
  grade: 'Strong' | 'Stable' | 'Weak';
  year: number;
  criteria: FScoreCriteria[];
}

export interface ZScoreComponent {
  name: string;
  formula: string;
  value: number | string;
  weight: number;
  score: number;
}

export interface ZScoreResult {
  score: number;
  status: 'Safe' | 'Grey' | 'Distress';
  year: number;
  components: ZScoreComponent[];
}

export interface BandDataPoint {
  date: string;
  value: number;
  price: number;
}

export interface BandStats {
  avg: number;
  sd: number;
}

export interface RatioBand {
  data: BandDataPoint[];
  stats: BandStats;
}

export interface RatioBands {
  pe: RatioBand;
  pbv: RatioBand;
}

export interface StockQuoteData {
  currentPrice: number;
  d0: number;
  roe: number | null;
  payoutRatio: number | null;
  pe: number | null;
  pbv: number | null;
  eps: number | null;
  debtToEquity: number | null;
  roa: number | null;
  marketCap: number | null;
  dividendYield: number | null;
  shortName?: string;
  longName?: string;
  currency?: string;
  history: StockHistory[];
  ratioBands: RatioBands;
}

// ===== DDM Types =====

export interface DDMTableRow {
  year: string;
  dividend: number;
  pv: number | null;
  growth: number | null;
  k: number | null;
  isTerminal?: boolean;
}

export interface DDMResult {
  ticker: string;
  currentPrice: number | null;
  d0: number;
  g: number;
  ks: number;
  fairPrice: number;
  margin: number | null;
  status: 'Undervalued' | 'Overvalued' | 'Fair';
  recommendation: 'BUY' | 'SELL' | 'HOLD';
  tableData: DDMTableRow[];
}

// ===== Multi-Model Valuation Types =====

export interface GrahamResult {
  grahamNumber: number;
  eps: number;
  bvps: number;
  margin: number | null;
  status: string;
}

export interface DCFResult {
  fairValue: number;
  fcfValues: number[];
  terminalValue: number;
  wacc: number;
  terminalGrowth: number;
  margin: number | null;
}

export interface PEGResult {
  peg: number;
  pe: number;
  epsGrowth: number;
  status: string;
}

export interface ValuationConsensus {
  ddm: { fairPrice: number; weight: number } | null;
  graham: { fairPrice: number; weight: number } | null;
  dcf: { fairPrice: number; weight: number } | null;
  peBand: { fairPrice: number; weight: number } | null;
  consensusFairPrice: number;
  currentPrice: number | null;
  upside: number | null;
}

export interface InvestmentSignal {
  action: 'BUY' | 'HOLD' | 'SELL';
  score: number;
  confidence: 'High' | 'Medium' | 'Low';
  valuationScore: number | null;
  qualityScore: number | null;
  riskScore: number | null;
  momentumScore: number | null;
  scenarioScore: number | null;
  reasons: string[];
}

// ===== Stock Scorecard Types =====

export interface ScoreCategory {
  name: string;
  score: number;
  maxScore: number;
  detail: string;
  icon: string;
}

export interface StockScorecard {
  ticker: string;
  totalScore: number;
  maxScore: number;
  rating: 1 | 2 | 3 | 4 | 5;
  ratingLabel: string;
  categories: ScoreCategory[];
}

// ===== Trend Analysis Types =====

export interface CAGRData {
  metric: string;
  cagr3y: number | null;
  cagr5y: number | null;
  cagr10y: number | null;
  trend: 'up' | 'down' | 'stable';
}

export interface TrendAnalysis {
  ticker: string;
  cagrs: CAGRData[];
  earningsQuality: {
    npmTrend: 'improving' | 'declining' | 'stable';
    revenueVsProfit: 'healthy' | 'warning' | 'concern';
    deTrend: 'improving' | 'stable' | 'deteriorating';
    dividendConsistency: number; // years of consecutive dividends
  };
}

// ===== Screening Result =====

export interface ScreeningResult {
  ticker: string;
  currentPrice: number | null;
  fairPrice: number;
  d0: number;
  g: number;
  ks: number;
  margin: number | null;
  status: string;
  recommendation: string;
  pe: number | null;
  pbv: number | null;
  eps: number | null;
  debtToEquity: number | null;
  roa: number | null;
  roe: number | null;
  payoutRatio: number | null;
  marketCap: number | null;
  dividendYield: number | null;
  mos30Price: number;
  mos40Price: number;
  mos50Price: number;
  shares30: number;
  cost30: number;
  shares40: number;
  cost40: number;
  shares50: number;
  cost50: number;
  statusLabel: string;
  statusColor: string;
  // Multi-model
  grahamNumber?: number;
  pegRatio?: number;
  consensusFairPrice?: number;
  // Scorecard
  viScore?: number;
  viRating?: number;
  // Trend
  epsCAGR5y?: number | null;
  revenueCAGR5y?: number | null;
  dpsCAGR5y?: number | null;
  // Error
  error?: string;
  tableData?: DDMTableRow[];
}

// ===== Scenario Analysis =====

export interface Scenario {
  name: string;
  g: number;
  ks: number;
  probability: number;
  fairPrice: number;
}

export interface ScenarioAnalysis {
  ticker: string;
  scenarios: Scenario[];
  weightedFairPrice: number;
  currentPrice: number | null;
}

// ===== App Mode =====

export type AppMode = 'single' | 'multi' | 'portfolio' | 'real_portfolio' | 'screener' | 'dividend_events';

export type GrowthMethod = 'sustainable' | 'historical' | 'preset';

export type BudgetMode = 'total' | 'per_ticker';

export interface AllocationRatio {
  mos30: number;
  mos40: number;
  mos50: number;
}
