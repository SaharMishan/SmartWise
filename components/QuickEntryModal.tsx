
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
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={onClose} 
            className="absolute inset-0 bg-black/40 backdrop-blur-xl" 
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 40 }}
            className="relative w-full max-w-lg bg-white dark:bg-[#1a1a1a] rounded-[48px] p-8 md:p-12 shadow-[0_40px_100px_rgba(0,0,0,0.3)] space-y-8 border border-white/10 overflow-y-auto no-scrollbar max-h-[90vh]"
          >
            <button onClick={onClose} className="absolute top-8 left-8 p-2 text-gray-400 hover:text-brand transition-all active:scale-90">
              <X size={28} />
            </button>

            <div className="text-center space-y-6">
              <span className="text-xs font-black uppercase tracking-[0.4em] text-gray-400">
                {initialData ? 'עריכת פעולה פיננסית' : 'רישום פעולה מהיר'}
              </span>
              
              <div className="flex items-center justify-center gap-4" dir="ltr">
                 <span className={`text-5xl font-black ${type === 'income' ? 'text-brand' : 'text-gray-800 dark:text-white'}`}>₪</span>
                 <input 
                  type="number" 
                  autoFocus 
                  placeholder="0" 
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="text-7xl font-black bg-transparent border-none outline-none w-full max-w-[300px] text-center placeholder:text-gray-100 dark:placeholder:text-white/5 dark:text-white"
                 />
              </div>
            </div>

            <div className="flex bg-gray-50 dark:bg-white/5 p-2 rounded-[28px] border border-gray-100 dark:border-white/5">
              <button 
                onClick={() => setType('expense')}
                className={`flex-1 py-4 rounded-[22px] text-sm font-black flex items-center justify-center gap-2 transition-all ${type === 'expense' ? 'bg-white dark:bg-white/10 text-gray-800 dark:text-white shadow-xl' : 'text-gray-400'}`}
              >
                <ArrowDown size={18} /> הוצאה
              </button>
              <button 
                onClick={() => setType('income')}
                className={`flex-1 py-4 rounded-[22px] text-sm font-black flex items-center justify-center gap-2 transition-all ${type === 'income' ? 'bg-brand text-white shadow-[0_10px_20px_rgba(0,184,148,0.3)]' : 'text-gray-400'}`}
              >
                <ArrowUp size={18} /> הכנסה
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex gap-4">
                 <div className="flex-1 space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-2">תאריך</label>
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} 
                      className="w-full bg-gray-50 dark:bg-white/5 border-none rounded-[22px] px-6 py-4 font-bold text-gray-700 dark:text-white outline-none" />
                 </div>
                 <div className="space-y-2 flex flex-col justify-end">
                    <button 
                      onClick={() => setIsRecurring(!isRecurring)} 
                      className={`h-[56px] px-6 rounded-[22px] border-2 font-black text-xs flex items-center gap-2 transition-all ${isRecurring ? 'bg-brand border-brand text-white' : 'border-gray-100 dark:border-white/10 text-gray-400'}`}
                    >
                      <Repeat size={16} />
                      קבוע
                    </button>
                 </div>
              </div>

              {isRecurring && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-2 flex items-center gap-1">
                    <Calendar size={12} /> תאריך תפוגה (אופציונלי)
                  </label>
                  <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full bg-emerald-50 dark:bg-brand/5 border-none rounded-[22px] px-6 py-4 font-bold text-brand outline-none" />
                  <p className="text-[9px] text-gray-400 font-bold mr-2">השאר ריק ל-3 שנים קדימה כברירת מחדל.</p>
                </motion.div>
              )}

              {initialData && initialData.recurringId && (
                <div className="bg-brand/5 p-4 rounded-[28px] border border-brand/10 space-y-3">
                  <p className="text-xs font-black text-brand text-center">שינוי סדרה קבועה - יחול מהחודש הנבחר והלאה</p>
                  <div className="flex gap-2">
                     <button 
                      onClick={() => setUpdateFutureMode(false)}
                      className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${!updateFutureMode ? 'bg-brand text-white shadow-md' : 'bg-white dark:bg-white/5 text-gray-400'}`}
                     >
                       רק את המופע הזה
                     </button>
                     <button 
                      onClick={() => setUpdateFutureMode(true)}
                      className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${updateFutureMode ? 'bg-brand text-white shadow-md' : 'bg-white dark:bg-white/5 text-gray-400'}`}
                     >
                       מעתה וכל העתידיים
                     </button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-2">קטגוריה נבחרת</label>
                {categories.length > 0 ? (
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1 no-scrollbar">
                    {categories.map(c => (
                      <button 
                        key={c.id}
                        onClick={() => setCategory(c)}
                        className={`px-5 py-2.5 rounded-[18px] text-xs font-black transition-all border-2 ${category?.id === c.id ? 'bg-brand/10 border-brand text-brand' : 'bg-white dark:bg-white/5 border-gray-50 dark:border-white/5 text-gray-400 hover:border-brand/30'}`}
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

              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-2">תיאור הפעולה</label>
                <input 
                  type="text" 
                  placeholder="למשל: קניות לשבת, דלק..." 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-white/5 border-none rounded-[22px] px-6 py-5 font-bold text-gray-700 dark:text-white focus:ring-2 focus:ring-brand/30 outline-none transition-all shadow-inner"
                />
              </div>
            </div>

            <button 
              onClick={handleSave}
              disabled={!amount || !category}
              className="w-full bg-brand py-6 rounded-[28px] text-white font-black text-xl shadow-[0_20px_40px_rgba(0,184,148,0.3)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:scale-100"
            >
              <Check size={24} strokeWidth={3} />
              <span>{initialData ? (updateFutureMode ? 'עדכון מהיום והלאה' : 'עדכון מופע בודד') : (isRecurring ? 'שמירה כהוצאה קבועה' : 'שמירה מהירה')}</span>
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default QuickEntryModal;
