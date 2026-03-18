import React, { useState, useEffect } from 'react';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: any) => void;
  portfolioId: string;
  ticker?: string; // Optional pre-filled ticker
  initialData?: any; // Optional data for editing
}

export default function TransactionModal({ isOpen, onClose, onSave, portfolioId, ticker: initialTicker, initialData }: TransactionModalProps) {
  const [ticker, setTicker] = useState(initialTicker || '');
  const [type, setType] = useState<'BUY' | 'SELL'>('BUY');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [volume, setVolume] = useState('');
  const [price, setPrice] = useState('');
  const [commission, setCommission] = useState('');
  const [totalValue, setTotalValue] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAutoCommission, setIsAutoCommission] = useState(true);

  // Auto-calculate commission when price/volume changes
  useEffect(() => {
    if (isAutoCommission && price && volume) {
      const val = parseFloat(volume) * parseFloat(price);
      if (!isNaN(val)) {
        // 0.157% + VAT 7% = 0.16799%
        const comm = val * 0.0016799;
        setCommission(comm.toFixed(2));
      }
    }
  }, [price, volume, isAutoCommission]);

  // Sync Total Value when Price, Volume, or Commission changes
  // IMPORTANT: We need to avoid overwriting totalValue when user is typing in it
  // This effect runs when any dependency changes.
  useEffect(() => {
    if (isAutoCommission) {
        // If Auto, we always sync Total = Gross +/- Comm
        const p = parseFloat(price);
        const v = parseFloat(volume);
        const c = parseFloat(commission) || 0;
        
        if (!isNaN(p) && !isNaN(v)) {
            const gross = p * v;
            const total = type === 'BUY' ? gross + c : gross - c;
            setTotalValue(total.toFixed(2));
        }
    } else {
        // If Manual, we only sync Total if Commission changed and Total didn't initiate it?
        // This is tricky. Let's rely on event handlers for Manual mode updates.
        // But if user changes Price/Volume in Manual mode, Total should update too?
        // Yes, Total = NewPrice * NewVolume +/- OldCommission
        const p = parseFloat(price);
        const v = parseFloat(volume);
        const c = parseFloat(commission) || 0;
        
        if (!isNaN(p) && !isNaN(v)) {
             const gross = p * v;
             const total = type === 'BUY' ? gross + c : gross - c;
             // Check if calculated total is different from current totalValue state
             // Only update if significantly different to avoid fighting user input
             // Actually, if user is typing Total, this effect will fire if price/vol/comm changes.
             // But here only price/vol/comm are deps.
             // If user types Total -> handleTotalValueChange -> updates Commission -> triggers this effect -> updates Total.
             // This loop is safe if the math is consistent.
             // However, float precision might cause cursor jumps or slight changes.
             // Let's check diff.
             setTotalValue(prev => {
                const currentTotal = parseFloat(prev) || 0;
                if (Math.abs(total - currentTotal) > 0.01) {
                    return total.toFixed(2);
                }
                return prev;
             });
        }
    }
  }, [price, volume, commission, type, isAutoCommission]); // Removed totalValue from deps to avoid loop

  // Effect to populate form when editing
  useEffect(() => {
    if (initialData) {
      setTicker(initialData.ticker || '');
      setType(initialData.type || 'BUY');
      setDate(initialData.transaction_date ? initialData.transaction_date.split('T')[0] : new Date().toISOString().split('T')[0]);
      setVolume(initialData.volume?.toString() || '');
      setPrice(initialData.price?.toString() || '');
      setCommission(initialData.commission?.toString() || '');
      setNotes(initialData.notes || '');
      // If editing existing, likely want manual mode initially to preserve exact values
      // unless we want to force auto check? Let's check if it matches auto formula.
      // For simplicity, default to false (Manual) when editing to ensure data integrity.
      setIsAutoCommission(false); 
    } else if (isOpen) {
      // Reset defaults when opening in create mode
      if (!initialTicker) setTicker('');
      else setTicker(initialTicker); 
      setType('BUY');
      setDate(new Date().toISOString().split('T')[0]);
      setVolume('');
      setPrice('');
      setCommission('');
      setTotalValue('');
      setNotes('');
      setIsAutoCommission(true);
    }
  }, [initialData, isOpen, initialTicker]);

  const handleTotalValueChange = (val: string) => {
    setTotalValue(val);
    const newTotal = parseFloat(val);
    const p = parseFloat(price);
    const v = parseFloat(volume);
    
    if (!isNaN(newTotal) && !isNaN(p) && !isNaN(v)) {
      const gross = p * v;
      let newComm = 0;
      if (type === 'BUY') {
        newComm = newTotal - gross;
      } else {
        newComm = gross - newTotal;
      }
      // Allow negative commission? Usually not, but math allows it.
      setCommission(newComm.toFixed(2));
      setIsAutoCommission(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker || !volume || !price) return;

    setIsLoading(true);
    try {
      const url = initialData ? '/api/transactions' : '/api/transactions';
      const method = initialData ? 'PUT' : 'POST';
      const body: any = {
        portfolio_id: portfolioId,
        ticker: ticker.toUpperCase(),
        type,
        date,
        volume: parseFloat(volume),
        price: parseFloat(price),
        commission: commission ? parseFloat(commission) : 0,
        notes
      };

      if (initialData) {
        body.id = initialData.id;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) throw new Error('Failed to save transaction');

      const data = await res.json();
      onSave(data);
      onClose();
      // Reset form handled by useEffect
    } catch (error) {
      console.error(error);
      alert('บันทึกข้อมูลล้มเหลว');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          {initialData ? '✏️ แก้ไขรายการ (Edit)' : (type === 'BUY' ? '🟢 ซื้อหุ้น (Buy)' : '🔴 ขายหุ้น (Sell)')}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type Selector */}
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setType('BUY')}
              className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${type === 'BUY' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              ซื้อ (Buy)
            </button>
            <button
              type="button"
              onClick={() => setType('SELL')}
              className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${type === 'SELL' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              ขาย (Sell)
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">ชื่อหุ้น (Ticker)</label>
              <input
                type="text"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">วันที่ทำรายการ</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">ราคา (Price)</label>
              <input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">จำนวนหุ้น (Vol)</label>
              <input
                type="number"
                step="1"
                value={volume}
                onChange={(e) => setVolume(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="0"
                required
              />
            </div>
          </div>

          <div>
             <label className="block text-xs font-medium text-slate-500 mb-1">มูลค่าหุ้นรวม (Gross Amount)</label>
             <div className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-600">
               {price && volume ? (parseFloat(price) * parseFloat(volume)).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
             </div>
             <p className="text-[10px] text-slate-400 mt-1">ราคา x จำนวนหุ้น (ก่อนรวมค่าคอมฯ)</p>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-medium text-slate-500">ค่าคอมมิชชัน (Commission + VAT)</label>
              <div className="flex items-center gap-1.5">
                <input 
                  type="checkbox" 
                  id="auto-comm"
                  checked={isAutoCommission} 
                  onChange={(e) => setIsAutoCommission(e.target.checked)}
                  className="w-3 h-3 text-emerald-600 rounded focus:ring-emerald-500"
                />
                <label htmlFor="auto-comm" className="text-[10px] text-slate-600 cursor-pointer select-none">
                  Auto (0.168%)
                </label>
              </div>
            </div>
            <input
              type="number"
              step="0.01"
              value={commission}
              readOnly={isAutoCommission}
              onChange={(e) => {
                setCommission(e.target.value);
                // setIsAutoCommission(false); // No longer needed if readOnly enforces manual toggle
              }}
              className={`w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 ${isAutoCommission ? 'bg-slate-50 text-slate-500 border-slate-200 cursor-not-allowed' : 'bg-white border-slate-200'}`}
              placeholder={isAutoCommission ? "คำนวณอัตโนมัติ..." : "0.00"}
            />
            <p className="text-[10px] text-slate-400 mt-1">รวม VAT 7% แล้ว (ถ้ามี)</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">ยอดสุทธิ (Net Amount)</label>
            <input
              type="number"
              step="0.01"
              value={totalValue}
              onChange={(e) => handleTotalValueChange(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-700"
              placeholder="0.00"
            />
             <p className="text-[10px] text-slate-400 mt-1">
              {type === 'BUY' ? 'ราคารวมค่าคอมมิชชัน (Price * Vol + Comm)' : 'ราคาหลังหักค่าคอมมิชชัน (Price * Vol - Comm)'}
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">หมายเหตุ (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              rows={2}
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className={`flex-1 py-2.5 text-white font-bold rounded-xl transition-colors ${type === 'BUY' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}
            >
              {isLoading ? 'Saving...' : 'บันทึกรายการ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
