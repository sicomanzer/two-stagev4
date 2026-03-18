import { Calculator, TrendingUp, Trash2, RotateCcw } from 'lucide-react';
import { AppMode, BudgetMode, AllocationRatio, GrowthMethod } from '@/types/stock';

interface InputFormProps {
  mode: AppMode;
  isLoadingData: boolean;
  isClient: boolean;
  
  // Single Mode Props
  ticker: string;
  setTicker: (val: string) => void;
  fetchStockData: () => void;
  currentPrice: string;
  setCurrentPrice: (val: string) => void;
  
  // Multi Mode Props
  multiTickers: string;
  setMultiTickers: (val: string) => void;
  totalBudget: string;
  setTotalBudget: (val: string) => void;
  budgetMode: BudgetMode;
  setBudgetMode: (val: BudgetMode) => void;
  allocationRatio: AllocationRatio;
  setAllocationRatio: (val: AllocationRatio) => void;
  
  // Common Calculation Params
  d0: string;
  setD0: (val: string) => void;
  g: string;
  setG: (val: string) => void;
  ks: string;
  setKs: (val: string) => void;
  explicitYears: string;
  setExplicitYears: (val: string) => void;
  handleCalculate: (e: React.FormEvent) => void;
  
  // Growth Assistant
  isAssistantOpen: boolean;
  setIsAssistantOpen: (val: boolean) => void;
  assistantMethod: GrowthMethod;
  setAssistantMethod: (val: GrowthMethod) => void;
  roe: string;
  setRoe: (val: string) => void;
  payoutRatio: string;
  setPayoutRatio: (val: string) => void;
  divStart: string;
  setDivStart: (val: string) => void;
  divEnd: string;
  setDivEnd: (val: string) => void;
  yearsCount: string;
  setYearsCount: (val: string) => void;
  calculateAssistantG: () => string;
  applyAssistantG: () => void;
  onClearSearch?: () => void;
}

export default function InputForm({
  mode,
  isLoadingData,
  isClient,
  ticker,
  setTicker,
  fetchStockData,
  currentPrice,
  setCurrentPrice,
  multiTickers,
  setMultiTickers,
  totalBudget,
  setTotalBudget,
  budgetMode,
  setBudgetMode,
  allocationRatio,
  setAllocationRatio,
  d0,
  setD0,
  g,
  setG,
  ks,
  setKs,
  explicitYears,
  setExplicitYears,
  handleCalculate,
  isAssistantOpen,
  setIsAssistantOpen,
  assistantMethod,
  setAssistantMethod,
  roe,
  setRoe,
  payoutRatio,
  setPayoutRatio,
  divStart,
  setDivStart,
  divEnd,
  setDivEnd,
  yearsCount,
  setYearsCount,
  calculateAssistantG,
  applyAssistantG,
  onClearSearch
}: InputFormProps) {
  
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
      <h2 className="text-lg font-semibold text-slate-800 mb-3">
        {mode === 'single' ? 'พารามิเตอร์การประเมิน' : 'พารามิเตอร์การสแกน'}
      </h2>
      {!isClient ? (
        <div className="h-[400px] flex items-center justify-center text-slate-400 animate-pulse bg-slate-50 rounded-xl">
          Loading...
        </div>
      ) : (
        <form onSubmit={handleCalculate} className="space-y-3">
        
        {mode === 'multi' && (
          <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-bold text-slate-700">งบประมาณการลงทุน</label>
              <div className="flex bg-white rounded-lg p-1 border border-slate-200 text-[10px] font-medium">
                <button
                  type="button"
                  onClick={() => setBudgetMode('total')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    budgetMode === 'total' 
                    ? 'bg-emerald-100 text-emerald-700 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  รวมทั้งหมด
                </button>
                <button
                  type="button"
                  onClick={() => setBudgetMode('per_ticker')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    budgetMode === 'per_ticker' 
                    ? 'bg-emerald-100 text-emerald-700 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  ต่อบริษัท
                </button>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  {budgetMode === 'total' ? 'เงินทุนรวม (บาท)' : 'เงินลงทุนต่อบริษัท (บาท)'}
                </label>
                <input
                  type="text"
                  value={totalBudget}
                  onChange={(e) => {
                    const val = e.target.value.replace(/,/g, '');
                    if (!isNaN(Number(val))) {
                      setTotalBudget(Number(val).toLocaleString());
                    } else if (val === '') {
                      setTotalBudget('');
                    }
                  }}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-medium text-slate-500 mb-1">MOS 30%</label>
                  <input
                    type="number"
                    value={allocationRatio.mos30}
                    onChange={(e) => setAllocationRatio({...allocationRatio, mos30: parseFloat(e.target.value)})}
                    className="w-full px-2 py-1 text-sm rounded-lg border border-slate-200 outline-none text-center"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-slate-500 mb-1">MOS 40%</label>
                  <input
                    type="number"
                    value={allocationRatio.mos40}
                    onChange={(e) => setAllocationRatio({...allocationRatio, mos40: parseFloat(e.target.value)})}
                    className="w-full px-2 py-1 text-sm rounded-lg border border-slate-200 outline-none text-center"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-slate-500 mb-1">MOS 50%</label>
                  <input
                    type="number"
                    value={allocationRatio.mos50}
                    onChange={(e) => setAllocationRatio({...allocationRatio, mos50: parseFloat(e.target.value)})}
                    className="w-full px-2 py-1 text-sm rounded-lg border border-slate-200 outline-none text-center"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {mode === 'single' ? (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อหุ้น (Ticker)</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                placeholder="เช่น ADVANC"
                className="w-full min-w-0 sm:flex-1 px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              />
              <div className="grid grid-cols-2 sm:flex gap-2 sm:shrink-0">
                <button
                  type="button"
                  onClick={() => fetchStockData()}
                  disabled={isLoadingData || !ticker}
                  className="w-full sm:w-auto px-4 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium whitespace-nowrap"
                >
                  {isLoadingData ? 'Loading...' : 'ดึงข้อมูล'}
                </button>
                {onClearSearch && (
                  <button
                    type="button"
                    onClick={onClearSearch}
                    className="w-full sm:w-auto px-3 py-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 hover:text-red-600 border border-red-200 text-sm font-medium whitespace-nowrap transition-all flex items-center justify-center gap-1"
                    title="เคลียร์การค้นหา"
                  >
                    <RotateCcw size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-slate-700">รายชื่อหุ้น (Ticker:Price, ...)</label>
              <button
                type="button"
                onClick={() => setMultiTickers('')}
                className="text-xs font-semibold text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors"
              >
                <Trash2 size={12} />
                Clear All
              </button>
            </div>
            <textarea
              value={multiTickers}
              onChange={(e) => setMultiTickers(e.target.value.toUpperCase())}
              placeholder="ADVANC:240, PTT:35, AOT"
              rows={3}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all resize-none"
            />
            <p className="text-[10px] text-slate-400 mt-1">ระบุชื่อหุ้น หรือ ชื่อหุ้น:ราคา เพื่อคำนวณ Margin</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">เงินปันผลปีล่าสุด (D0)</label>
          <input
            type="number"
            step="0.0001"
            value={d0}
            onChange={(e) => setD0(e.target.value)}
            className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
            required
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-sm font-medium text-slate-700">อัตราการเติบโต g (%)</label>
            <button 
              type="button"
              onClick={() => setIsAssistantOpen(!isAssistantOpen)}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              <TrendingUp size={12} />
              ช่วยคำนวณค่า g
            </button>
          </div>
          <input
            type="number"
            step="0.01"
            value={g}
            onChange={(e) => setG(e.target.value)}
            className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
            required
          />
          {(() => {
            const gNum = parseFloat(g);
            const ksNum = parseFloat(ks);
            if (!isNaN(gNum) && !isNaN(ksNum) && gNum >= ksNum) {
              return (
                <p className="text-[10px] mt-1 text-red-600">
                  อัตราการเติบโต (g) ต้องน้อยกว่า ks เพื่อให้แบบจำลองทำงานได้
                </p>
              );
            }
            return null;
          })()}
        </div>

        {/* Growth Assistant Panel */}
        {isAssistantOpen && (
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAssistantMethod('sustainable')}
                className={`flex-1 py-1 px-2 text-[10px] font-bold rounded-lg border transition-all ${
                  assistantMethod === 'sustainable' 
                  ? 'bg-emerald-600 border-emerald-600 text-white' 
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Sustainable
              </button>
              <button
                type="button"
                onClick={() => setAssistantMethod('historical')}
                className={`flex-1 py-1 px-2 text-[10px] font-bold rounded-lg border transition-all ${
                  assistantMethod === 'historical' 
                  ? 'bg-emerald-600 border-emerald-600 text-white' 
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Historical
              </button>
              <button
                type="button"
                onClick={() => setAssistantMethod('preset')}
                className={`flex-1 py-1 px-2 text-[10px] font-bold rounded-lg border transition-all ${
                  assistantMethod === 'preset' 
                  ? 'bg-emerald-600 border-emerald-600 text-white' 
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                GDP/Preset
              </button>
            </div>

            {assistantMethod === 'sustainable' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">ROE (%)</label>
                  <input
                    type="number"
                    value={roe}
                    onChange={(e) => setRoe(e.target.value)}
                    className="w-full px-2 py-1 text-sm rounded-lg border border-slate-200 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Payout (%)</label>
                  <input
                    type="number"
                    value={payoutRatio}
                    onChange={(e) => setPayoutRatio(e.target.value)}
                    className="w-full px-2 py-1 text-sm rounded-lg border border-slate-200 outline-none"
                  />
                </div>
              </div>
            )}

            {assistantMethod === 'historical' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">ปันผลปีแรก</label>
                    <input
                      type="number"
                      value={divStart}
                      onChange={(e) => setDivStart(e.target.value)}
                      placeholder="เช่น 5.00"
                      className="w-full px-2 py-1 text-sm rounded-lg border border-slate-200 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">ปันผลล่าสุด</label>
                    <input
                      type="number"
                      value={divEnd}
                      onChange={(e) => setDivEnd(e.target.value)}
                      placeholder="เช่น 8.50"
                      className="w-full px-2 py-1 text-sm rounded-lg border border-slate-200 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">จำนวนปีที่ผ่านไป</label>
                  <input
                    type="number"
                    value={yearsCount}
                    onChange={(e) => setYearsCount(e.target.value)}
                    className="w-full px-2 py-1 text-sm rounded-lg border border-slate-200 outline-none"
                  />
                </div>
              </div>
            )}

            {assistantMethod === 'preset' && (
              <div className="flex gap-2">
                <button type="button" onClick={() => setG('2')} className="flex-1 py-2 bg-white border border-slate-200 rounded-lg text-xs hover:bg-slate-50">2% (Conservative)</button>
                <button type="button" onClick={() => setG('3')} className="flex-1 py-2 bg-white border border-slate-200 rounded-lg text-xs hover:bg-slate-50">3% (GDP Growth)</button>
              </div>
            )}

            {assistantMethod !== 'preset' && (
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                <div className="text-xs">
                  <span className="text-slate-500">ผลลัพธ์: </span>
                  <span className="font-bold text-emerald-600">{calculateAssistantG()}%</span>
                </div>
                <button
                  type="button"
                  onClick={applyAssistantG}
                  className="px-3 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  ใช้ค่านี้
                </button>
              </div>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">ผลตอบแทนที่คาดหวัง ks (%)</label>
          <input
            type="number"
            step="0.01"
            value={ks}
            onChange={(e) => setKs(e.target.value)}
            className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">จำนวนปี Explicit (ปี)</label>
          <input
            type="number"
            value={explicitYears}
            onChange={(e) => setExplicitYears(e.target.value)}
            className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
            required
          />
        </div>

        {mode === 'single' && (
          <div className="pt-2 border-t border-slate-100">
            <label className="block text-sm font-medium text-slate-700 mb-1">ราคาปัจจุบัน (ใส่เพื่อหา Margin)</label>
            <input
              type="number"
              step="0.01"
              value={currentPrice}
              onChange={(e) => setCurrentPrice(e.target.value)}
              placeholder="ไม่บังคับ"
              className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
            />
          </div>
        )}

        <button
          type="submit"
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center space-x-2 mt-3"
        >
          <Calculator size={20} />
          <span>{mode === 'single' ? 'คำนวณมูลค่าที่เหมาะสม' : 'สแกนหุ้นทั้งหมด'}</span>
        </button>
      </form>
      )}
    </div>
  );
}
