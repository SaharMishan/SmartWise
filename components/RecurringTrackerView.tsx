
import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserState, Transaction } from '../types';
import { auth, db } from '../firebase';
import { doc, writeBatch, collection, addDoc } from 'firebase/firestore';
import { 
  Repeat, Plus, Trash2, Wallet, 
  ArrowRight, ShieldCheck, CreditCard, Landmark, 
  TrendingUp, Activity, PieChart, Calendar, Edit2, 
  Settings2, AlertCircle, CheckCircle2, Info, Clock
} from 'lucide-react';
import QuickEntryModal from './QuickEntryModal';

interface RecurringTrackerViewProps {
  state: UserState;
}

const RecurringTrackerView: React.FC<RecurringTrackerViewProps> = ({ state }) => {
  const [editingSeries, setEditingSeries] = useState<Transaction | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const totalMonthlyRecurring = useMemo(() => {
    return activeSeries.reduce((sum, s) => sum + s.template.amount, 0);
  }, [activeSeries]);

  const deleteSeries = async (recurringId: string) => {
    if (!auth.currentUser || !confirm('האם לבטל את כל הסדרה העתידית? כל המופעים מהיום והלאה יימחקו מהיומן.')) return;
    
    const user = auth.currentUser;
    const batch = writeBatch(db);
    const today = new Date().toISOString().split('T')[0];

    const targets = state.transactions.filter(t => 
      t.recurringId === recurringId && t.date >= today
    );

    targets.forEach(t => {
      batch.delete(doc(db, 'users', user.uid, 'transactions', t.id));
    });

    await batch.commit();
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

    // Remove future ones to clean update
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10 pb-32 max-w-6xl mx-auto text-right px-4">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-800 dark:text-white tracking-tight flex items-center gap-3">
             <Repeat className="text-brand" size={32} /> ניהול הוצאות קבועות
          </h1>
          <p className="text-gray-400 font-bold text-lg">כאן תוכל לנהל, לערוך ולבטל סדרות תשלומים קבועות הפרוסות ביומן.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 bg-[#0a1120] rounded-[48px] p-10 text-white shadow-2xl relative overflow-hidden flex flex-col justify-between border border-white/5">
           <div className="absolute top-0 right-0 p-8 opacity-10"><Activity size={120} /></div>
           <div className="space-y-2 relative z-10">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-brand">התחייבות חודשית קבועה</span>
              <h2 className="text-6xl font-black text-white tracking-tighter" dir="ltr">₪{totalMonthlyRecurring.toLocaleString()}</h2>
           </div>
           <div className="mt-8 p-5 bg-white/5 rounded-3xl border border-white/5 relative z-10">
              <p className="text-xs font-bold text-gray-400 leading-relaxed">
                זהו הסכום המצטבר של כל הסדרות הפעילות שהגדרת. הוא יופיע אוטומטית בכל חודש עוקב ביומן שלך.
              </p>
           </div>
        </div>

        <div className="lg:col-span-8 bg-white dark:bg-[#1e1e1e] p-10 rounded-[48px] border border-gray-100 dark:border-white/5 shadow-sm flex flex-col md:flex-row items-center gap-10">
           <div className="w-24 h-24 bg-brand/10 text-brand rounded-[32px] flex items-center justify-center shrink-0">
              <ShieldCheck size={48} />
           </div>
           <div className="space-y-4">
              <h3 className="text-2xl font-black text-gray-800 dark:text-white">איך זה עובד?</h3>
              <p className="text-gray-500 dark:text-gray-400 font-bold leading-relaxed">
                כל תנועה שתסמן כ"קבועה" בעת ההזנה, תייצר סדרת תשלומים עתידית. 
                כאן תוכל לראות את כל הסדרות הפעילות, לשנות את הסכום שלהן לכל העתיד או לבטל אותן לחלוטין בלחיצה אחת.
              </p>
           </div>
        </div>
      </div>

      <div className="bg-white dark:bg-[#1e1e1e] rounded-[48px] p-6 md:p-12 border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden">
        <div className="flex items-center gap-4 mb-12">
           <div className="w-12 h-12 bg-gray-50 dark:bg-white/5 text-brand rounded-2xl flex items-center justify-center shadow-inner"><Settings2 size={24} /></div>
           <h3 className="text-2xl font-black text-gray-800 dark:text-white">סדרות תשלומים פעילות ({activeSeries.length})</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           {activeSeries.length > 0 ? activeSeries.map(series => (
             <motion.div 
               layout
               key={series.template.recurringId} 
               className="bg-gray-50 dark:bg-[#121212] p-8 rounded-[40px] border border-transparent hover:border-brand/30 transition-all group relative overflow-hidden"
             >
               <div className="absolute top-0 left-0 w-2 h-full bg-brand opacity-0 group-hover:opacity-100 transition-opacity" />
               
               <div className="flex justify-between items-start mb-6">
                 <div>
                    <h4 className="text-2xl font-black text-gray-800 dark:text-white mb-1">{series.template.description}</h4>
                    <span className="text-[10px] font-black text-brand bg-brand/10 px-3 py-1 rounded-full uppercase tracking-widest">
                      {series.template.categoryName}
                    </span>
                 </div>
                 <div className="text-left">
                    <p className="text-3xl font-black text-gray-900 dark:text-white" dir="ltr">₪{series.template.amount.toLocaleString()}</p>
                    <p className="text-[10px] font-bold text-gray-400 mt-1">לחודש</p>
                 </div>
               </div>

               <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-white dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/5">
                     <p className="text-[9px] font-black text-gray-400 uppercase mb-1">התחלה</p>
                     <p className="text-sm font-black text-gray-700 dark:text-gray-200" dir="ltr">{series.startDate.split('-').reverse().join('/')}</p>
                  </div>
                  <div className="bg-white dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/5">
                     <p className="text-[9px] font-black text-gray-400 uppercase mb-1">סיום משוער</p>
                     <p className="text-sm font-black text-gray-700 dark:text-gray-200" dir="ltr">{series.endDate.split('-').reverse().join('/')}</p>
                  </div>
               </div>

               <div className="flex items-center gap-3">
                  <button 
                    onClick={() => handleEditSeries(series.template)}
                    className="flex-1 bg-white dark:bg-white/5 py-4 rounded-2xl font-black text-gray-700 dark:text-white border border-gray-100 dark:border-white/5 hover:border-brand/50 transition-all flex items-center justify-center gap-2"
                  >
                    <Edit2 size={16} /> עריכת סדרה
                  </button>
                  <button 
                    onClick={() => deleteSeries(series.template.recurringId!)}
                    className="p-4 bg-rose-50 dark:bg-rose-900/10 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-all border border-rose-100 dark:border-rose-900/20"
                  >
                    <Trash2 size={20} />
                  </button>
               </div>
               
               <div className="mt-4 flex items-center gap-2 justify-center">
                  <Clock size={12} className="text-gray-400" />
                  <p className="text-[10px] font-bold text-gray-400">הסדרה כוללת {series.count} מופעים ביומן</p>
               </div>
             </motion.div>
           )) : (
             <div className="col-span-full py-20 text-center space-y-4">
                <Repeat size={60} className="mx-auto text-gray-200 dark:text-gray-800 opacity-20" />
                <p className="text-gray-400 font-black italic text-xl">לא נמצאו סדרות תשלומים קבועות ביומן.</p>
                <p className="text-gray-300 font-bold max-w-sm mx-auto">כדי ליצור אחת, סמן "קבוע" בעת הוספת תנועה חדשה ביומן.</p>
             </div>
           )}
        </div>
      </div>

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
