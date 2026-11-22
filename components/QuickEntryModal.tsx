
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, ArrowUp, ArrowDown, Repeat, AlertCircle, Calendar } from 'lucide-react';
import { Transaction, Category } from '../types';

interface QuickEntryModalProps {
  isOpen: boolean;
  initialData?: Transaction;
  onClose: () => void;
  onSave: (t: any, updateFuture?: boolean) => void;
  categories: Category[];
}

const QuickEntryModal: React.FC<QuickEntryModalProps> = ({ isOpen, initialData, onClose, onSave, categories }) => {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [expiryDate, setExpiryDate] = useState('');
  const [updateFutureMode, setUpdateFutureMode] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setAmount(initialData.amount.toString());
        const foundCategory = categories.find(c => c.id === initialData.categoryId) || categories[0] || null;
        setCategory(foundCategory);
        setDescription(initialData.description);
        setType(initialData.type as 'expense' | 'income');
        setDate(initialData.date);
        setIsRecurring(initialData.isRecurring || false);
        setExpiryDate(initialData.expiryDate || '');
        setUpdateFutureMode(initialData.isRecurring || false); 
      } else {
        setAmount('');
        setCategory(categories.length > 0 ? categories[0] : null);
        setDescription('');
        setType('expense');
        setDate(new Date().toISOString().split('T')[0]);
        setIsRecurring(false);
        setExpiryDate('');
        setUpdateFutureMode(false);
      }
    }
  }, [initialData, isOpen, categories]);

  const handleSave = () => {
    if (!amount || !category) return;

    const baseData = {
      amount: parseFloat(amount),
      categoryId: category.id,
      categoryName: category.name,
      type,
      description: description || category.name,
      date: date,
      paymentMethod: initialData?.paymentMethod || 'credit',
      isRecurring: isRecurring,
      expiryDate: isRecurring ? (expiryDate || null) : null
    };

    onSave(baseData, updateFutureMode);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-end md:items-center justify-center p-0 md:p-4">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={onClose} 
            className="absolute inset-0 bg-black/50 backdrop-blur-md" 
          />
          <motion.div 
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            className="relative w-full md:max-w-lg bg-white dark:bg-[#1a1a1a] rounded-t-[36px] md:rounded-[48px] p-5 sm:p-8 md:p-10 shadow-[0_40px_100px_rgba(0,0,0,0.3)] space-y-5 md:space-y-6 border border-white/10 overflow-y-auto no-scrollbar max-h-[92dvh] pb-[calc(1.25rem+env(safe-area-inset-bottom))] md:pb-10"
            dir="rtl"
          >
            <div className="w-10 h-1.5 bg-gray-200 dark:bg-white/15 rounded-full mx-auto md:hidden" />
            <button onClick={onClose} aria-label="סגור" className="absolute top-4 left-4 md:top-7 md:left-7 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-2xl bg-gray-50 dark:bg-white/5 text-gray-400 hover:text-brand transition-all active:scale-90">
              <X size={22} />
            </button>

            <div className="text-center space-y-3 md:space-y-4 pt-1">
              <span className="text-[11px] font-black uppercase tracking-[0.25em] text-gray-400">
                {initialData ? 'עריכת פעולה פיננסית' : 'רישום פעולה מהיר'}
              </span>
              
              <div className="flex items-center justify-center gap-3" dir="ltr">
                 <span className={`text-3xl md:text-5xl font-black ${type === 'income' ? 'text-brand' : 'text-gray-800 dark:text-white'}`}>₪</span>
                 <input 
                  type="number" 
                  inputMode="decimal"
                  autoFocus 
                  placeholder="0" 
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="text-5xl md:text-7xl font-black bg-transparent border-none outline-none w-full max-w-[240px] md:max-w-[300px] text-center placeholder:text-gray-200 dark:placeholder:text-white/10 dark:text-white tabular-nums"
                 />
              </div>
            </div>

            <div className="flex bg-gray-50 dark:bg-white/5 p-1.5 rounded-[22px] border border-gray-100 dark:border-white/5">
              <button 
                type="button"
                onClick={() => setType('expense')}
                className={`flex-1 py-3 rounded-[18px] text-sm font-black flex items-center justify-center gap-2 transition-all min-h-[44px] ${type === 'expense' ? 'bg-white dark:bg-white/10 text-gray-800 dark:text-white shadow-md' : 'text-gray-400'}`}
              >
                <ArrowDown size={18} /> הוצאה
              </button>
              <button 
                type="button"
                onClick={() => setType('income')}
                className={`flex-1 py-3 rounded-[18px] text-sm font-black flex items-center justify-center gap-2 transition-all min-h-[44px] ${type === 'income' ? 'bg-brand text-white shadow-[0_8px_18px_rgba(0,184,148,0.3)]' : 'text-gray-400'}`}
              >
                <ArrowUp size={18} /> הכנסה
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                 <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-2">תאריך</label>
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} 
                      className="w-full bg-gray-50 dark:bg-white/5 border-none rounded-2xl px-4 py-3.5 font-bold text-sm text-gray-700 dark:text-white outline-none min-h-[48px]" />
                 </div>
                 <div className="space-y-1.5 flex flex-col justify-end">
                    <button 
                      type="button"
                      onClick={() => setIsRecurring(!isRecurring)} 
                      className={`min-h-[48px] px-4 rounded-2xl border-2 font-black text-xs flex items-center justify-center gap-2 transition-all ${isRecurring ? 'bg-brand border-brand text-white' : 'border-gray-100 dark:border-white/10 text-gray-400'}`}
                    >
                      <Repeat size={16} />
                      תנועה קבועה
                    </button>
                 </div>
              </div>

              {isRecurring && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-2 flex items-center gap-1">
                    <Calendar size={12} /> תאריך תפוגה (אופציונלי)
                  </label>
                  <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full bg-emerald-50 dark:bg-brand/5 border-none rounded-2xl px-4 py-3.5 font-bold text-sm text-brand outline-none min-h-[48px]" />
                  <p className="text-[10px] text-gray-400 font-bold mr-2">השאר ריק ל-3 שנים קדימה כברירת מחדל.</p>
                </motion.div>
              )}

              {initialData && initialData.recurringId && (
                <div className="bg-brand/5 p-3.5 rounded-2xl border border-brand/10 space-y-2.5">
                  <p className="text-xs font-black text-brand text-center">שינוי סדרה קבועה - יחול מהחודש הנבחר והלאה</p>
                  <div className="flex gap-2">
                     <button 
                      type="button"
                      onClick={() => setUpdateFutureMode(false)}
                      className={`flex-1 py-2.5 px-2 rounded-xl text-[11px] font-black transition-all min-h-[40px] ${!updateFutureMode ? 'bg-brand text-white shadow-md' : 'bg-white dark:bg-white/5 text-gray-400'}`}
                     >
                       רק המופע הזה
                     </button>
                     <button 
                      type="button"
                      onClick={() => setUpdateFutureMode(true)}
                      className={`flex-1 py-2.5 px-2 rounded-xl text-[11px] font-black transition-all min-h-[40px] ${updateFutureMode ? 'bg-brand text-white shadow-md' : 'bg-white dark:bg-white/5 text-gray-400'}`}
                     >
                       מעתה והלאה
                     </button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-2">קטגוריה נבחרת</label>
                {categories.length > 0 ? (
                  <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto p-0.5 no-scrollbar">
                    {categories.map(c => (
                      <button 
                        type="button"
                        key={c.id}
                        onClick={() => setCategory(c)}
                        className={`px-3.5 py-2 rounded-2xl text-xs font-black transition-all border-2 min-h-[38px] ${category?.id === c.id ? 'bg-brand/10 border-brand text-brand' : 'bg-white dark:bg-white/5 border-gray-100 dark:border-white/5 text-gray-500 hover:border-brand/30'}`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-2xl flex items-center gap-2 text-red-500 text-xs font-bold">
                    <AlertCircle size={14} /> לא נמצאו קטגוריות.
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-2">תיאור הפעולה</label>
                <input 
                  type="text" 
                  placeholder="למשל: קניות לשבת, דלק..." 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-white/5 border-none rounded-2xl px-4 py-3.5 font-bold text-base text-gray-700 dark:text-white focus:ring-2 focus:ring-brand/30 outline-none transition-all shadow-inner"
                />
              </div>
            </div>

            <button 
              type="button"
              onClick={handleSave}
              disabled={!amount || !category}
              className="w-full bg-brand py-4 md:py-5 rounded-[22px] md:rounded-[28px] text-white font-black text-lg md:text-xl shadow-[0_15px_35px_rgba(0,184,148,0.3)] hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:scale-100 min-h-[54px]"
            >
              <Check size={22} strokeWidth={3} />
              <span>{initialData ? (updateFutureMode ? 'עדכון מהיום והלאה' : 'עדכון מופע בודד') : (isRecurring ? 'שמירה כהוצאה קבועה' : 'שמירה מהירה')}</span>
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default QuickEntryModal;
