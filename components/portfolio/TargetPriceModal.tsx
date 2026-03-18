import React, { useState } from 'react';

interface TargetPriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (price: number | null) => void;
  ticker: string;
  currentTarget: number | null;
}

export default function TargetPriceModal(props: TargetPriceModalProps) {
  if (!props.isOpen) return null;
  return <TargetPriceForm {...props} />;
}

function TargetPriceForm({ onClose, onSave, ticker, currentTarget }: TargetPriceModalProps) {
  const [price, setPrice] = useState(currentTarget ? currentTarget.toString() : '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (price.trim() === '') {
      onSave(null);
    } else {
      const parsed = parseFloat(price);
      if (!isNaN(parsed)) {
        onSave(parsed);
      } else {
        alert('กรุณากรอกตัวเลขที่ถูกต้อง');
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4">
          ตั้งราคาแจ้งเตือน (Target Price)
        </h3>
        <p className="text-sm text-slate-500 mb-4">
          สำหรับหุ้น <span className="font-bold text-emerald-600">{ticker}</span>
        </p>
        
        <form onSubmit={handleSubmit}>
          <input
            type="number"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="ระบุราคาเป้าหมาย (เว้นว่างเพื่อลบ)"
            className="w-full px-4 py-2 rounded-xl border border-slate-200 mb-6 focus:ring-2 focus:ring-emerald-500 outline-none"
            autoFocus
          />
          
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-medium hover:bg-slate-200 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors"
            >
              บันทึก
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
