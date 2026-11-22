
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, ArrowRight, Check, Copy, CheckCircle2, AlertCircle, Repeat, Calendar } from 'lucide-react';
import { Transaction, UserState } from '../types';
import { PAYMENT_METHODS } from '../constants';

interface AddTransactionPageProps {
  onSave: (items: Omit<Transaction, 'id'>[]) => Promise<void>;
  onBack: () => void;
  state: UserState;
}

const AddTransactionPage: React.FC<AddTransactionPageProps> = ({ onSave, onBack, state }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const lastRowRef = useRef<HTMLDivElement>(null);
  
  const createEmptyRow = () => ({
    id: Math.random().toString(36).substr(2, 9),
    amount: '',
    categoryId: state.categories.length > 0 ? state.categories[0].id : '',
    description: '',
    type: 'expense',
    paymentMethod: 'credit',
    date: new Date().toISOString().split('T')[0],
    isRecurring: false,
    expiryDate: ''
  });

  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (items.length === 0 && state.categories.length > 0) {
      setItems([createEmptyRow()]);
    }
  }, [state.categories]);

  const addNewRow = () => {
    setItems(prev => [...prev, createEmptyRow()]);
    // Small delay to allow DOM to update before scroll
    setTimeout(() => {
      if (lastRowRef.current) {
        lastRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const updateItem = (id: string, field: string, value: any) => {
    setItems(prev => prev.map(item => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const duplicateRow = (item: any) => {
    setItems(prev => [...prev, { ...item, id: Math.random().toString(36).substr(2, 9) }]);
  };

  const removeRow = (id: string) => {
    if (items.length > 1) {
      setItems(prev => prev.filter(i => i.id !== id));
    } else {
      setItems([createEmptyRow()]);
    }
  };

  const handleSave = async () => {
    let finalItems: any[] = [];
    items.forEach(item => {
      if (item.amount && !isNaN(parseFloat(item.amount)) && item.categoryId) {
        finalItems.push({
          amount: parseFloat(item.amount),
          categoryId: item.categoryId,
          categoryName: state.categories.find(c => c.id === item.categoryId)?.name || 'כללי',
          description: item.description || state.categories.find(c => c.id === item.categoryId)?.name || 'ללא תיאור',
          date: item.date,
          type: item.type,
          paymentMethod: item.paymentMethod,
          isRecurring: item.isRecurring,
          expiryDate: item.expiryDate || null
        });
      }
    });

    if (finalItems.length === 0) return;
    setIsSaving(true);
    try {
      await onSave(finalItems);
      setShowSuccess(true);
      setItems([createEmptyRow()]);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error("Save failed", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 sm:space-y-8 pb-28 lg:pb-48 text-right max-w-[1400px] mx-auto relative">
      <AnimatePresence>
        {showSuccess && (
          <motion.div initial={{ opacity: 0, y: -100, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: -100, x: '-50%' }}
            className="fixed top-6 left-1/2 z-[1000] w-[calc(100vw-2rem)] max-w-md bg-brand text-white px-6 py-4 sm:px-8 sm:py-5 rounded-[28px] sm:rounded-[32px] shadow-2xl flex items-center gap-4 border border-brand/20">
            <CheckCircle2 size={26} className="shrink-0" />
            <div>
              <p className="font-black text-lg sm:text-xl">נשמר בהצלחה!</p>
              <p className="text-white/80 text-xs font-bold">כל התנועות עודכנו במערכת.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-between items-center gap-4">
        <div className="flex items-center gap-3 sm:gap-6">
          <button onClick={onBack} aria-label="חזרה" className="min-w-[44px] min-h-[44px] p-3 sm:p-4 bg-white dark:bg-[#1e1e1e] rounded-2xl sm:rounded-[24px] shadow-sm border border-gray-100 dark:border-white/5 text-gray-400 hover:text-brand transition-all shrink-0 flex items-center justify-center">
            <ArrowRight size={22} />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-800 dark:text-white tracking-tight">הוספת תנועה מרובה</h1>
            <p className="text-gray-400 font-bold text-xs sm:text-sm mt-0.5">
              הזנה מהירה של מספר פעולות במקביל.
              <span className="hidden lg:inline"> לחיצה על Enter בשדה התיאור תוסיף שורה חדשה.</span>
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-[28px] sm:rounded-[48px] p-3 sm:p-5 md:p-8 border border-white/60 dark:border-white/10 shadow-sm overflow-hidden">
        {state.categories.length > 0 ? (
          <div className="lg:max-h-[600px] lg:overflow-y-auto no-scrollbar pb-2 lg:pb-10 relative">
            <div className="hidden lg:grid grid-cols-[minmax(110px,1.1fr)_minmax(80px,0.9fr)_minmax(110px,1.3fr)_minmax(120px,1.5fr)_minmax(130px,1.5fr)_minmax(90px,1fr)_minmax(120px,2fr)_minmax(60px,0.5fr)] gap-2 px-3 mb-2 sticky top-0 z-10 bg-white/90 dark:bg-[#121212]/90 backdrop-blur-md py-2 rounded-xl">
              <div className="text-[11px] font-black text-gray-400 uppercase tracking-widest text-right px-2">תאריך</div>
              <div className="text-[11px] font-black text-gray-400 uppercase tracking-widest text-right px-2">סוג</div>
              <div className="text-[11px] font-black text-gray-400 uppercase tracking-widest text-right px-2">סכום</div>
              <div className="text-[11px] font-black text-gray-400 uppercase tracking-widest text-right px-2">קטגוריה</div>
              <div className="text-[11px] font-black text-gray-400 uppercase tracking-widest text-right px-2">אופן תשלום</div>
              <div className="text-[11px] font-black text-gray-400 uppercase tracking-widest text-right px-2">קבוע?</div>
              <div className="text-[11px] font-black text-gray-400 uppercase tracking-widest text-right px-2">תיאור</div>
              <div className="text-[11px] font-black text-gray-400 uppercase tracking-widest text-center">פעולות</div>
            </div>

            <div className="space-y-4">
              <AnimatePresence initial={false}>
                {items.map((item, idx) => (
                  <motion.div key={item.id} ref={idx === items.length - 1 ? lastRowRef : null} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                    className="grid grid-cols-2 lg:grid-cols-[minmax(110px,1.1fr)_minmax(80px,0.9fr)_minmax(110px,1.3fr)_minmax(120px,1.5fr)_minmax(130px,1.5fr)_minmax(90px,1fr)_minmax(120px,2fr)_minmax(60px,0.5fr)] gap-2.5 lg:gap-2 items-center bg-white dark:bg-[#1e1e1e] p-4 sm:p-5 lg:p-3 rounded-[24px] shadow-sm border border-gray-100 dark:border-white/5 hover:border-brand/30 transition-all">
                    
                    {/* Mobile Header Row indicator */}
                    <div className="col-span-2 flex items-center justify-between lg:hidden pb-1 border-b border-gray-100 dark:border-white/5">
                      <span className="text-xs font-black text-brand">שורה #{idx + 1}</span>
                      <span className="text-[10px] font-bold text-gray-400">{item.type === 'income' ? 'הכנסה' : 'הוצאה'}</span>
                    </div>

                    <div className="order-5 lg:order-none col-span-1">
                      <label className="text-[10px] font-black text-gray-400 mr-1 mb-1 block lg:hidden">תאריך</label>
                      <input type="date" value={item.date} onChange={(e) => updateItem(item.id, 'date', e.target.value)}
                        className="w-full bg-gray-50 dark:bg-[#121212] dark:text-white border-none rounded-2xl px-3 py-3 font-black text-xs min-h-[44px]" />
                    </div>

                    <div className="order-1 lg:order-none col-span-1">
                      <label className="text-[10px] font-black text-gray-400 mr-1 mb-1 block lg:hidden">סוג</label>
                      <select value={item.type} onChange={(e) => updateItem(item.id, 'type', e.target.value)}
                        className="w-full bg-gray-50 dark:bg-[#121212] dark:text-white border-none rounded-2xl px-3 py-3 font-black text-xs lg:text-[11px] min-h-[44px]">
                        <option value="expense">הוצאה</option><option value="income">הכנסה</option>
                      </select>
                    </div>

                    <div className="order-2 lg:order-none col-span-1">
                      <label className="text-[10px] font-black text-gray-400 mr-1 mb-1 block lg:hidden">סכום (₪)</label>
                      <input type="number" inputMode="decimal" placeholder="0" value={item.amount} onChange={(e) => updateItem(item.id, 'amount', e.target.value)}
                        className="w-full bg-gray-50 dark:bg-[#121212] dark:text-white border-none rounded-2xl px-3 py-3 font-black text-sm focus:ring-2 focus:ring-brand/30 min-h-[44px] tabular-nums" />
                    </div>

                    <div className="order-3 lg:order-none col-span-1">
                      <label className="text-[10px] font-black text-gray-400 mr-1 mb-1 block lg:hidden">קטגוריה</label>
                      <select value={item.categoryId} onChange={(e) => updateItem(item.id, 'categoryId', e.target.value)}
                        className="w-full bg-gray-50 dark:bg-[#121212] dark:text-white border-none rounded-2xl px-3 py-3 font-black text-xs lg:text-[11px] min-h-[44px]">
                        {state.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>

                    <div className="order-4 lg:order-none col-span-1">
                      <label className="text-[10px] font-black text-gray-400 mr-1 mb-1 block lg:hidden">אופן תשלום</label>
                      <select value={item.paymentMethod} onChange={(e) => updateItem(item.id, 'paymentMethod', e.target.value)}
                        className="w-full bg-gray-50 dark:bg-[#121212] dark:text-white border-none rounded-2xl px-3 py-3 font-black text-xs lg:text-[11px] min-h-[44px]">
                        {PAYMENT_METHODS.map(pm => <option key={pm.id} value={pm.id}>{pm.label}</option>)}
                      </select>
                    </div>

                    <div className="order-6 lg:order-none col-span-1 flex flex-col lg:flex-row items-stretch lg:items-center gap-1.5">
                      <label className="text-[10px] font-black text-gray-400 mr-1 mb-0.5 block lg:hidden">קבוע?</label>
                      <button 
                        type="button"
                        onClick={() => updateItem(item.id, 'isRecurring', !item.isRecurring)}
                        className={`flex items-center gap-1.5 px-3 py-2.5 min-h-[44px] rounded-2xl lg:rounded-xl border-2 transition-all shrink-0 w-full lg:w-auto justify-center ${item.isRecurring ? 'bg-brand/10 border-brand text-brand' : 'border-gray-100 dark:border-white/10 text-gray-400'}`}
                      >
                        <Repeat size={14} />
                        <span className="text-xs lg:text-[10px] font-black">קבוע</span>
                      </button>
                      <AnimatePresence>
                        {item.isRecurring && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-1 overflow-hidden w-full lg:w-auto">
                            <input type="date" value={item.expiryDate} onChange={(e) => updateItem(item.id, 'expiryDate', e.target.value)}
                              aria-label="תאריך סיום קבוע"
                              className="bg-gray-50 dark:bg-[#121212] dark:text-white border-none rounded-xl px-2 py-2 font-black text-[11px] w-full lg:min-w-[80px] min-h-[40px]" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="order-7 lg:order-none col-span-2 lg:col-span-1">
                      <label className="text-[10px] font-black text-gray-400 mr-1 mb-1 block lg:hidden">תיאור</label>
                      <input type="text" placeholder="תיאור התנועה..." value={item.description}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addNewRow())}
                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                        className="w-full bg-gray-50 dark:bg-[#121212] dark:text-white border-none rounded-2xl px-3 py-3 font-black text-xs lg:text-[11px] focus:ring-2 focus:ring-brand/30 min-h-[44px]" />
                    </div>

                    <div className="order-8 lg:order-none col-span-2 lg:col-span-1 flex items-center justify-center gap-2 pt-1 lg:pt-0">
                      <button type="button" onClick={() => duplicateRow(item)} aria-label="שכפל שורה" className="flex-1 lg:flex-none min-w-[44px] min-h-[44px] flex items-center justify-center gap-1.5 rounded-2xl bg-gray-50 dark:bg-white/5 lg:bg-transparent text-gray-500 lg:text-gray-300 hover:text-brand transition-all text-xs font-black">
                        <Copy size={16} />
                        <span className="lg:hidden">שכפל</span>
                      </button>
                      <button type="button" onClick={() => removeRow(item.id)} aria-label="מחק שורה" className="flex-1 lg:flex-none min-w-[44px] min-h-[44px] flex items-center justify-center gap-1.5 rounded-2xl bg-rose-50 dark:bg-rose-900/10 lg:bg-transparent text-rose-500 lg:text-gray-300 hover:text-red-500 transition-all text-xs font-black">
                        <Trash2 size={16} />
                        <span className="lg:hidden">הסר</span>
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3 sm:gap-5">
              <button onClick={addNewRow} className="flex-1 py-4 sm:py-6 min-h-[52px] border-2 border-dashed border-gray-200 dark:border-white/10 rounded-2xl sm:rounded-[32px] text-gray-500 font-black hover:border-brand hover:text-brand transition-all flex items-center justify-center gap-3">
                <Plus size={22} /><span>הוספת שורה נוספת</span>
              </button>
              <button onClick={handleSave} disabled={isSaving || !items.some(i => i.amount)}
                className="flex-1 py-4 sm:py-6 min-h-[52px] bg-brand text-white font-black text-lg sm:text-xl rounded-2xl sm:rounded-[32px] shadow-2xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 disabled:opacity-50 transition-all">
                {isSaving ? <div className="w-7 h-7 border-4 border-white/30 border-t-white rounded-full animate-spin" /> : <><Check size={24} strokeWidth={3} /><span>שמור תנועות</span></>}
              </button>
            </div>
          </div>
        ) : (
          <div className="py-20 text-center space-y-6">
            <AlertCircle size={48} className="mx-auto text-red-500" />
            <h3 className="text-xl sm:text-2xl font-black text-gray-800 dark:text-white">יש להגדיר קטגוריות תחילה</h3>
            <button onClick={() => onBack()} className="text-brand font-black hover:underline min-h-[44px] px-4">חזרה לדאשבורד</button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default AddTransactionPage;
