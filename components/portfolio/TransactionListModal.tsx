import React, { useState, useEffect, useCallback } from 'react';
import { Trash2, Edit } from 'lucide-react';
import TransactionModal from './TransactionModal';

interface TransactionListModalProps {
  isOpen: boolean;
  onClose: () => void;
  portfolioId: string;
  ticker: string;
}

export default function TransactionListModal({ isOpen, onClose, portfolioId, ticker }: TransactionListModalProps) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/transactions?portfolio_id=${portfolioId}&ticker=${ticker}`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [portfolioId, ticker]);

  useEffect(() => {
    if (isOpen && ticker) {
      fetchTransactions();
    }
  }, [isOpen, ticker, fetchTransactions]);

  const handleDelete = async (id: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้?')) return;
    
    try {
      const res = await fetch(`/api/transactions?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setTransactions(transactions.filter(t => t.id !== id));
      } else {
        alert('ลบรายการไม่สำเร็จ');
      }
    } catch (error) {
      console.error(error);
      alert('เกิดข้อผิดพลาด');
    }
  };

  const handleEdit = (transaction: any) => {
    setEditingTransaction(transaction);
    setIsEditModalOpen(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl border border-slate-200 p-6 max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
          <h3 className="text-lg font-bold text-slate-800">
            ประวัติการซื้อขาย: <span className="text-emerald-600">{ticker}</span>
          </h3>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold px-2 py-1 rounded hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="text-center py-8 text-slate-400">Loading...</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-slate-400">ไม่มีประวัติการทำรายการ</div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-slate-500 bg-slate-50 text-xs uppercase font-bold sticky top-0">
                <tr>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2 text-center">Type</th>
                  <th className="px-4 py-2 text-right">Volume</th>
                  <th className="px-4 py-2 text-right">Price</th>
                  <th className="px-4 py-2 text-right">Commission</th>
                  <th className="px-4 py-2 text-right">Total</th>
                  <th className="px-4 py-2 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((tx) => {
                  const total = (tx.volume * tx.price) + (tx.type === 'BUY' ? Number(tx.commission) : -Number(tx.commission));
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2 text-slate-600">
                        {new Date(tx.transaction_date).toLocaleDateString('th-TH')}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${tx.type === 'BUY' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right font-medium">{tx.volume.toLocaleString()}</td>
                      <td className="px-4 py-2 text-right text-slate-600">{tx.price.toFixed(2)}</td>
                      <td className="px-4 py-2 text-right text-slate-500">{Number(tx.commission).toFixed(2)}</td>
                      <td className="px-4 py-2 text-right font-bold text-slate-800">{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-2 text-center flex justify-center gap-1">
                        <button
                          onClick={() => handleEdit(tx)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                          title="แก้ไขรายการ"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(tx.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="ลบรายการ"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <TransactionModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingTransaction(null);
        }}
        onSave={() => {
          fetchTransactions();
        }}
        portfolioId={portfolioId}
        initialData={editingTransaction}
      />
    </div>
  );
}
