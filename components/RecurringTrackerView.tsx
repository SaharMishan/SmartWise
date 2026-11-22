import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserState, Transaction } from '../types';
import { auth, db } from '../firebase';
import { doc, writeBatch, collection } from 'firebase/firestore';
import { 
  Repeat, Plus, Trash2, Wallet, 
  ShieldCheck, CreditCard, 
  TrendingUp, Activity, Edit2, 
  Settings2, Clock, AlertCircle
} from 'lucide-react';
import QuickEntryModal from './QuickEntryModal';

interface RecurringTrackerViewProps {
  state: UserState;
}

const RecurringTrackerView: React.FC<RecurringTrackerViewProps> = ({ state }) => {
  const [editingSeries, setEditingSeries] = useState<Transaction | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [seriesToDelete, setSeriesToDelete] = useState<{ recurringId: string; description: string; amount: number } | null>(null);

  // Group transactions by recurringId to identify active series across all time
  const activeSeries = useMemo(() => {
    const seriesMap: Record<string, Transaction[]> = {};
    
    state.transactions.forEach(t => {
      if (t.recurringId) {
        if (!seriesMap[t.recurringId]) seriesMap[t.recurringId] = [];
        seriesMap[t.recurringId].push(t);
      }
    });

    return Object.values(seriesMap).map(instances => {
      const sorted = [...instances].sort((a, b) => a.date.localeCompare(b.date));
      return {
        template: sorted[0],
        instances: sorted,
        count: sorted.length,
        startDate: sorted[0].date,
        endDate: sorted[sorted.length - 1].date,
        totalAmount: sorted.reduce((sum, t) => sum + t.amount, 0)
      };
    }).sort((a, b) => b.template.amount - a.template.amount);
  }, [state.transactions]);

  const totalMonthlyRecurringIncomes = useMemo(() => {
    return activeSeries
      .filter(s => s.template.type === 'income')
      .reduce((sum, s) => sum + s.template.amount, 0);
  }, [activeSeries]);

  const totalMonthlyRecurringExpenses = useMemo(() => {
    return activeSeries
      .filter(s => s.template.type === 'expense' || !s.template.type)
      .reduce((sum, s) => sum + s.template.amount, 0);
  }, [activeSeries]);

  const netMonthlyRecurring = totalMonthlyRecurringIncomes - totalMonthlyRecurringExpenses;

  const confirmDeleteSeries = async () => {
    if (!auth.currentUser || !seriesToDelete) return;
    
    const user = auth.currentUser;
    const batch = writeBatch(db);
    const today = new Date().toISOString().split('T')[0];

    const targets = state.transactions.filter(t => 
      t.recurringId === seriesToDelete.recurringId && t.date >= today
    );

    targets.forEach(t => {
      batch.delete(doc(db, 'users', user.uid, 'transactions', t.id));
    });

    await batch.commit();
    setSeriesToDelete(null);
  };

  const handleEditSeries = (transaction: Transaction) => {
    setEditingSeries(transaction);
    setIsModalOpen(true);
  };

  const formatDateString = (y: number, m: number, d: number) => {
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  };

  const generateSeries = (item: any, startFromDate: string, recurringId: string) => {
    const instances: any[] = [];
    const [startY, startM, startD] = startFromDate.split('-').map(Number);
    let currentY = startY;
    let currentM = startM;
    const targetDay = startD;

    let endY, endM, endD;
    if (item.expiryDate && item.expiryDate.includes('-')) {
      [endY, endM, endD] = item.expiryDate.split('-').map(Number);
    } else {
      endY = startY + 3;
      endM = startM;
      endD = startD;
    }

    const expiryStr = formatDateString(endY, endM, endD);
    let currentStr = "";
    let iterations = 0;

    while (currentStr <= expiryStr && iterations < 60) {
      let actualDay = targetDay;
      const lastDayOfMonth = new Date(currentY, currentM, 0).getDate();
      if (actualDay > lastDayOfMonth) actualDay = lastDayOfMonth;

      currentStr = formatDateString(currentY, currentM, actualDay);
      if (currentStr > expiryStr) break;

      instances.push({ 
        ...item, 
        date: currentStr, 
        recurringId, 
        isRecurring: true 
      });

      currentM++;
      if (currentM > 12) {
        currentM = 1;
        currentY++;
      }
      iterations++;
    }
    return instances;
  };

  const onSaveSeries = async (updatedData: any) => {
    if (!auth.currentUser || !editingSeries?.recurringId) return;
    
    const user = auth.currentUser;
    const batch = writeBatch(db);
    const startDate = editingSeries.date;

    const futureTargets = state.transactions.filter(t => 
      t.recurringId === editingSeries.recurringId && t.date >= startDate
    );
    
    futureTargets.forEach(t => {
      batch.delete(doc(db, 'users', user.uid, 'transactions', t.id));
    });

    const series = generateSeries(updatedData, startDate, editingSeries.recurringId);
    series.forEach(inst => {
      const newDoc = doc(collection(db, 'users', user.uid, 'transactions'));
      batch.set(newDoc, inst);
    });

    await batch.commit();
    setIsModalOpen(false);
    setEditingSeries(null);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 sm:space-y-10 pb-24 lg:pb-32 max-w-6xl mx-auto text-right">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-800 dark:text-white tracking-tight flex items-center gap-3">
             <Repeat className="text-brand shrink-0" size={28} /> ניהול הוצאות והכנסות קבועות
          </h1>
          <p className="text-gray-400 font-bold text-sm sm:text-lg mt-1">כאן תוכל לנהל, לערוך ולבטל סדרות תשלומים והכנסות קבועות הפרוסות ביומן.</p>
        </div>
      </header>

      {/* 3-Card Summary Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
        {/* Recurring Incomes Card */}
        <div className="bg-[#022c22] rounded-[24px] sm:rounded-[40px] p-4 sm:p-8 text-white shadow-2xl relative overflow-hidden flex flex-col justify-between border border-emerald-500/10 lg:min-h-[220px]">
           <div className="hidden sm:block absolute top-0 right-0 p-6 opacity-10 text-emerald-400"><TrendingUp size={100} /></div>
           <div className="space-y-1.5 sm:space-y-2 relative z-10">
              <span className="text-[10px] font-black uppercase tracking-wider sm:tracking-[0.2em] text-emerald-400 block">הכנסות קבועות</span>
              <h2 className="text-xl sm:text-3xl lg:text-4xl font-black text-white tracking-tighter tabular-nums" dir="ltr">₪{totalMonthlyRecurringIncomes.toLocaleString()}</h2>
           </div>
           <p className="text-[10px] sm:text-[11px] font-bold text-emerald-300/80 mt-3 sm:mt-6 relative z-10 leading-relaxed">
             סך ההכנסות הקבועות שמופיעות מדי חודש.
           </p>
        </div>

        {/* Recurring Expenses Card */}
        <div className="bg-[#450a0a] rounded-[24px] sm:rounded-[40px] p-4 sm:p-8 text-white shadow-2xl relative overflow-hidden flex flex-col justify-between border border-rose-500/10 lg:min-h-[220px]">
           <div className="hidden sm:block absolute top-0 right-0 p-6 opacity-10 text-rose-400"><CreditCard size={100} /></div>
           <div className="space-y-1.5 sm:space-y-2 relative z-10">
              <span className="text-[10px] font-black uppercase tracking-wider sm:tracking-[0.2em] text-rose-400 block">הוצאות קבועות</span>
              <h2 className="text-xl sm:text-3xl lg:text-4xl font-black text-white tracking-tighter tabular-nums" dir="ltr">₪{totalMonthlyRecurringExpenses.toLocaleString()}</h2>
           </div>
           <p className="text-[10px] sm:text-[11px] font-bold text-rose-300/80 mt-3 sm:mt-6 relative z-10 leading-relaxed">
             סך ההוצאות הקבועות שיורדות מדי חודש.
           </p>
        </div>

        {/* Net Balance Card */}
        <div className={`col-span-2 lg:col-span-1 rounded-[24px] sm:rounded-[40px] p-5 sm:p-8 text-white shadow-2xl relative overflow-hidden flex flex-col justify-between border lg:min-h-[220px] ${netMonthlyRecurring >= 0 ? 'bg-[#0f172a] border-white/5' : 'bg-[#450e1a] border-rose-900/20'}`}>
           <div className="hidden sm:block absolute top-0 right-0 p-6 opacity-10 text-brand"><Wallet size={100} /></div>
           <div className="space-y-1.5 sm:space-y-2 relative z-10">
              <span className="text-[10px] font-black uppercase tracking-wider sm:tracking-[0.2em] text-brand block">יתרה קבועה נטו</span>
              <h2 className={`text-2xl sm:text-3xl lg:text-4xl font-black tracking-tighter tabular-nums ${netMonthlyRecurring >= 0 ? 'text-brand' : 'text-rose-400'}`} dir="ltr">
                {netMonthlyRecurring >= 0 ? '+' : ''}₪{netMonthlyRecurring.toLocaleString()}
              </h2>
           </div>
           <p className="text-[11px] font-bold text-gray-400 mt-3 sm:mt-6 relative z-10 leading-relaxed">
             התזרים החודשי הקבוע שנשאר לאחר קיזוז ההוצאות מההכנסות הקבועות.
           </p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#1e1e1e] p-5 sm:p-8 rounded-[28px] sm:rounded-[40px] border border-gray-100 dark:border-white/5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8">
         <div className="w-12 h-12 sm:w-16 sm:h-16 bg-brand/10 text-brand rounded-2xl sm:rounded-[24px] flex items-center justify-center shrink-0">
            <ShieldCheck size={28} />
         </div>
         <div className="space-y-1.5">
            <h3 className="text-lg sm:text-xl font-black text-gray-800 dark:text-white">איך זה עובד?</h3>
            <p className="text-gray-500 dark:text-gray-400 font-bold leading-relaxed text-xs sm:text-sm">
              כל תנועה שתסמן כ"קבועה" בעת ההזנה (הוצאה או הכנסה), תייצר סדרת תנועות עתידית בהתאם לתאריך התפוגה שהגדרת. 
              כאן תוכל לראות את כל הסדרות הפעילות, לשנות את גובה הסכום לכל העתיד או לבטל אותן לחלוטין בלחיצה אחת.
            </p>
         </div>
      </div>

      <div className="bg-white dark:bg-[#1e1e1e] rounded-[28px] sm:rounded-[48px] p-4 sm:p-8 md:p-12 border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-10">
           <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-50 dark:bg-white/5 text-brand rounded-2xl flex items-center justify-center shadow-inner shrink-0"><Settings2 size={22} /></div>
           <h3 className="text-xl sm:text-2xl font-black text-gray-800 dark:text-white">סדרות פעילות ({activeSeries.length})</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
           {activeSeries.length > 0 ? activeSeries.map(series => {
             const isIncome = series.template.type === 'income';
             return (
               <motion.div 
                 layout
                 key={series.template.recurringId} 
                 className="bg-gray-50 dark:bg-[#121212] p-5 sm:p-8 rounded-[26px] sm:rounded-[40px] border border-transparent hover:border-brand/30 transition-all group relative overflow-hidden"
               >
                 <div className={`absolute top-0 left-0 w-2 h-full opacity-0 group-hover:opacity-100 transition-opacity ${isIncome ? 'bg-emerald-500' : 'bg-brand'}`} />
                 
                 <div className="flex justify-between items-start gap-3 mb-5">
                   <div className="min-w-0 flex-1">
                      <h4 className="text-lg sm:text-2xl font-black text-gray-800 dark:text-white mb-1.5 truncate">{series.template.description}</h4>
                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-[10px] font-black text-gray-500 dark:text-gray-400 bg-gray-200/60 dark:bg-white/5 px-2.5 py-0.5 rounded-full">
                          {series.template.categoryName}
                        </span>
                        <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${isIncome ? 'text-emerald-500 bg-emerald-500/10' : 'text-brand bg-brand/10'}`}>
                          {isIncome ? 'הכנסה קבועה' : 'הוצאה קבועה'}
                        </span>
                      </div>
                   </div>
                   <div className="text-left shrink-0">
                      <p className={`text-xl sm:text-3xl font-black tabular-nums ${isIncome ? 'text-emerald-500' : 'text-gray-900 dark:text-white'}`} dir="ltr">₪{series.template.amount.toLocaleString()}</p>
                      <p className="text-[10px] font-bold text-gray-400 mt-0.5">לחודש</p>
                   </div>
                 </div>

                 <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-5 sm:mb-8">
                    <div className="bg-white dark:bg-white/5 p-3 sm:p-4 rounded-2xl border border-gray-100 dark:border-white/5">
                       <p className="text-[10px] font-black text-gray-400 mb-1">התחלה</p>
                       <p className="text-xs sm:text-sm font-black text-gray-700 dark:text-gray-200 tabular-nums" dir="ltr">{series.startDate.split('-').reverse().join('/')}</p>
                    </div>
                    <div className="bg-white dark:bg-white/5 p-3 sm:p-4 rounded-2xl border border-gray-100 dark:border-white/5">
                       <p className="text-[10px] font-black text-gray-400 mb-1">סיום משוער</p>
                       <p className="text-xs sm:text-sm font-black text-gray-700 dark:text-gray-200 tabular-nums" dir="ltr">{series.endDate.split('-').reverse().join('/')}</p>
                    </div>
                 </div>

                 <div className="flex items-center gap-2.5 sm:gap-3">
                    <button 
                      onClick={() => handleEditSeries(series.template)}
                      className="flex-1 bg-white dark:bg-white/5 py-3.5 min-h-[48px] rounded-2xl font-black text-sm text-gray-700 dark:text-white border border-gray-100 dark:border-white/5 hover:border-brand/50 transition-all flex items-center justify-center gap-2"
                    >
                      <Edit2 size={16} /> עריכת סדרה
                    </button>
                    <button 
                      onClick={() => setSeriesToDelete({ recurringId: series.template.recurringId!, description: series.template.description, amount: series.template.amount })}
                      aria-label={`בטל סדרה ${series.template.description}`}
                      className="min-w-[48px] min-h-[48px] flex items-center justify-center bg-rose-50 dark:bg-rose-900/10 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-all border border-rose-100 dark:border-rose-900/20 shrink-0"
                    >
                      <Trash2 size={20} />
                    </button>
                 </div>
                 
                 <div className="mt-4 flex items-center gap-2 justify-center">
                    <Clock size={12} className="text-gray-400" />
                    <p className="text-[11px] font-bold text-gray-400">הסדרה כוללת {series.count} מופעים ביומן</p>
                 </div>
               </motion.div>
             );
           }) : (
             <div className="col-span-full py-16 sm:py-20 text-center space-y-4">
                <Repeat size={56} className="mx-auto text-gray-300 dark:text-gray-700 opacity-40" />
                <p className="text-gray-400 font-black italic text-lg sm:text-xl">לא נמצאו סדרות קבועות ביומן.</p>
                <p className="text-gray-400 font-bold text-xs sm:text-sm max-w-sm mx-auto">כדי ליצור אחת, סמן "תנועה קבועה" בעת הוספת תנועה חדשה ביומן.</p>
             </div>
           )}
        </div>
      </div>

      {/* Delete Series Confirmation Modal */}
      <AnimatePresence>
        {seriesToDelete && (
          <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSeriesToDelete(null)} className="absolute inset-0 bg-black/70 backdrop-blur-xl" />
            <motion.div initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }} className="relative w-full max-w-md bg-white dark:bg-[#1a1a1a] rounded-t-[32px] sm:rounded-[40px] p-6 sm:p-10 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl border border-gray-100 dark:border-white/5 space-y-6 text-center">
              <div className="w-12 h-1.5 bg-gray-200 dark:bg-white/10 rounded-full mx-auto sm:hidden" />
              <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-3xl flex items-center justify-center mx-auto"><AlertCircle size={32} /></div>
              <h2 className="text-xl sm:text-2xl font-black text-gray-800 dark:text-white">ביטול סדרה קבועה</h2>
              <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl">
                <p className="font-black text-gray-800 dark:text-white text-base">{seriesToDelete.description}</p>
                <p className="text-rose-500 font-black mt-1 tabular-nums" dir="ltr">₪{seriesToDelete.amount.toLocaleString()} / חודש</p>
              </div>
              <p className="text-sm font-bold text-gray-400">האם לבטל את כל הסדרה העתידית? כל המופעים מהיום והלאה יימחקו מהיומן.</p>
              <div className="flex flex-col gap-3">
                <button onClick={confirmDeleteSeries} className="w-full py-4 min-h-[48px] bg-rose-500 text-white rounded-2xl font-black shadow-lg hover:bg-rose-600 transition-colors">אישור ביטול סדרה</button>
                <button onClick={() => setSeriesToDelete(null)} className="w-full py-3.5 min-h-[48px] text-gray-500 font-black hover:bg-gray-50 dark:hover:bg-white/5 rounded-2xl transition-all">שמור סדרה</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <QuickEntryModal 
        isOpen={isModalOpen} 
        initialData={editingSeries || undefined} 
        categories={state.categories}
        onClose={() => { setIsModalOpen(false); setEditingSeries(null); }}
        onSave={onSaveSeries}
      />
    </motion.div>
  );
};

export default RecurringTrackerView;
