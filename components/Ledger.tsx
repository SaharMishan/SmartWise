
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserState, Transaction } from '../types';
import { Search, Download, ArrowUp, ArrowDown, Trash2, Calendar, ChevronDown, Filter, LayoutList, MoreVertical, Activity, Info, AlertCircle, X, Repeat } from 'lucide-react';

interface LedgerProps {
  state: UserState;
  onAdd: () => void;
  onDelete: (id: string, deleteFuture?: boolean) => void;
}

const Ledger: React.FC<LedgerProps> = ({ state, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);

  const months = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
  const years = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 11 }, (_, i) => current - 5 + i);
  }, []);

  const filteredTransactions = useMemo(() => {
    return state.transactions.filter(t => {
      // Deep fix: String comparison to avoid timezone shifts
      const parts = t.date.split('-');
      const tYear = parseInt(parts[0]);
      const tMonth = parseInt(parts[1]) - 1;

      const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            t.categoryName?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesMonth = tMonth === selectedMonth && tYear === selectedYear;
      return matchesSearch && matchesMonth;
    });
  }, [state.transactions, searchTerm, selectedMonth, selectedYear]);

  const confirmDelete = (deleteFuture: boolean = false) => {
    if (transactionToDelete) {
      onDelete(transactionToDelete.id, deleteFuture);
      setTransactionToDelete(null);
    }
  };

  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) return;
    setIsExporting(true);
    setTimeout(() => {
      const headers = ['תאריך', 'תיאור', 'קטגוריה', 'סוג', 'סכום'];
      const rows = filteredTransactions.map(t => [
        t.date.split('-').reverse().join('/'),
        t.description.replace(/,/g, ''),
        t.categoryName,
        t.type === 'income' ? 'הכנסה' : 'הוצאה',
        t.amount
      ]);
      const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(",")).join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `SmartWise_Export_${months[selectedMonth]}_${selectedYear}.csv`;
      link.click();
      setIsExporting(false);
    }, 600);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 pb-32 text-right max-w-7xl mx-auto px-4 relative">
      <AnimatePresence>
        {transactionToDelete && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setTransactionToDelete(null)} className="absolute inset-0 bg-black/60 backdrop-blur-xl" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-md bg-white dark:bg-[#1a1a1a] rounded-[40px] p-10 shadow-2xl border border-white/5 space-y-8">
              <div className="text-center space-y-4">
                <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-3xl flex items-center justify-center mx-auto"><AlertCircle size={40} /></div>
                <h2 className="text-2xl font-black text-gray-800 dark:text-white">מחיקת פעולה</h2>
                <div className="p-5 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                  <p className="text-lg font-black text-gray-800 dark:text-white">"{transactionToDelete.description}"</p>
                  <p className="text-brand font-black mt-1">₪{transactionToDelete.amount.toLocaleString()}</p>
                </div>
                {transactionToDelete.recurringId && (
                   <p className="text-sm font-bold text-gray-400 bg-brand/5 p-3 rounded-xl border border-brand/10">זוהי תנועה כחלק מסדרה קבועה.</p>
                )}
              </div>
              <div className="flex flex-col gap-3">
                {transactionToDelete.recurringId ? (
                  <>
                    <button onClick={() => confirmDelete(true)} className="w-full py-4 bg-rose-500 text-white rounded-2xl font-black shadow-lg hover:bg-rose-600 transition-colors">מחק מופע זה וכל המופעים העתידיים</button>
                    <button onClick={() => confirmDelete(false)} className="w-full py-4 bg-gray-100 dark:bg-white/5 text-gray-800 dark:text-white rounded-2xl font-black hover:bg-gray-200 transition-colors">מחק רק את המופע הנוכחי</button>
                  </>
                ) : (
                  <button onClick={() => confirmDelete(false)} className="w-full py-4 bg-rose-500 text-white rounded-2xl font-black shadow-lg hover:bg-rose-600 transition-colors">אישור מחיקה</button>
                )}
                <button onClick={() => setTransactionToDelete(null)} className="w-full py-4 rounded-2xl text-gray-500 font-black hover:bg-gray-50 transition-colors">ביטול</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-black text-gray-800 dark:text-white">יומן פעולות</h1>
          <p className="text-gray-400 font-bold">פירוט מלא של כל התנועות הכספיות שלכם.</p>
        </div>
        <div className="flex flex-wrap gap-4 w-full lg:w-auto">
           <div className="relative flex-1 lg:w-80">
              <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
              <input type="text" placeholder="חיפוש פעולה..." className="w-full h-14 bg-white dark:bg-[#1e1e1e] dark:text-white rounded-2xl pr-14 pl-6 shadow-sm font-bold outline-none focus:ring-2 focus:ring-brand/20 transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
           </div>
           <div className="relative">
             <button onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)} className="h-14 flex items-center gap-4 bg-white dark:bg-[#1e1e1e] px-6 rounded-2xl shadow-sm border border-transparent hover:border-brand/20 transition-all">
               <Calendar size={20} className="text-brand" />
               <span className="text-gray-700 dark:text-gray-200 font-black text-sm">{months[selectedMonth]} {selectedYear}</span>
               <ChevronDown size={14} className={`text-gray-400 transition-transform ${isMonthPickerOpen ? 'rotate-180' : ''}`} />
             </button>
             <AnimatePresence>
               {isMonthPickerOpen && (
                 <>
                  <div className="fixed inset-0 z-[60]" onClick={() => setIsMonthPickerOpen(false)} />
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full right-0 mt-3 w-80 bg-white dark:bg-[#1e1e1e] rounded-[32px] shadow-2xl z-[70] border border-gray-100 dark:border-white/5 overflow-hidden flex flex-col"
                  >
                    <div className="p-6 border-b border-gray-50 dark:border-white/5 bg-gray-50/50 dark:bg-white/5">
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 text-center">בחר שנה</p>
                       <div className="relative">
                          <select 
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            className="w-full bg-white dark:bg-[#121212] border-2 border-transparent rounded-2xl px-5 py-3 font-black text-gray-800 dark:text-white appearance-none text-center shadow-sm cursor-pointer outline-none"
                          >
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                          </select>
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-brand">
                            <ChevronDown size={16} />
                          </div>
                       </div>
                    </div>
                    <div className="p-4 grid grid-cols-3 gap-2 overflow-y-auto custom-scrollbar flex-1">
                      {months.map((m, i) => (
                        <button key={m} onClick={() => { setSelectedMonth(i); setIsMonthPickerOpen(false); }}
                          className={`py-3 px-1 text-[11px] font-black rounded-xl transition-all ${selectedMonth === i ? 'bg-brand text-white shadow-md' : 'hover:bg-gray-50 dark:hover:bg-white/5 text-gray-400'}`}>
                          {m}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                 </>
               )}
             </AnimatePresence>
           </div>
           <button onClick={handleExportCSV} disabled={isExporting} className="h-14 px-6 bg-gray-900 dark:bg-brand text-white rounded-2xl shadow-xl flex items-center gap-3 active:scale-95 transition-all">
              {isExporting ? <Activity size={18} className="animate-spin" /> : <Download size={20} />}
              <span className="font-black text-sm">ייצוא</span>
           </button>
        </div>
      </div>

      <div className="bg-white/50 dark:bg-white/5 rounded-[48px] overflow-hidden border border-white/60 dark:border-white/10 shadow-sm backdrop-blur-md">
        <div className="divide-y divide-gray-50 dark:divide-white/5">
          {filteredTransactions.length > 0 ? filteredTransactions.map((t) => {
            const isIncome = t.type === 'income';
            return (
              <div key={t.id} className="group flex flex-col md:flex-row md:items-center p-6 md:p-8 hover:bg-white dark:hover:bg-white/5 transition-all gap-4 md:gap-0">
                <div className="flex-shrink-0 md:w-32 flex md:flex-col items-center md:items-start gap-3 md:gap-1">
                   <div className="bg-gray-100 dark:bg-white/10 px-3 py-1.5 rounded-xl font-black text-[11px] text-gray-500 dark:text-gray-300" dir="ltr">{t.date.split('-').reverse().join('/')}</div>
                </div>
                <div className="flex-1 flex items-center gap-5">
                  <div className={`w-12 h-12 rounded-[18px] flex flex-col items-center justify-center shrink-0 ${isIncome ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-500'}`}>
                    {isIncome ? <ArrowUp size={20} /> : <ArrowDown size={20} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                        {t.recurringId && <Repeat size={14} className="text-brand shrink-0" />}
                        <h4 className="font-black text-gray-900 dark:text-gray-100 text-base md:text-lg">{t.description}</h4>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-black text-gray-400 bg-gray-50 dark:bg-white/5 px-2.5 py-1 rounded-lg border border-gray-100 dark:border-white/10">{t.categoryName}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between md:justify-end gap-6 md:w-48">
                   <p className={`text-xl md:text-2xl font-black ${isIncome ? 'text-emerald-500' : 'text-gray-900 dark:text-white'}`} dir="ltr">{isIncome ? '+' : '-'} ₪{t.amount.toLocaleString()}</p>
                   <button onClick={() => setTransactionToDelete(t)} className="p-3 text-gray-300 hover:text-rose-500 bg-gray-100 dark:bg-white/5 rounded-2xl transition-all relative z-10"><Trash2 size={18} /></button>
                </div>
              </div>
            );
          }) : (
            <div className="p-24 text-center text-gray-400 font-bold italic">לא נמצאו תנועות בחודש זה ({months[selectedMonth]} {selectedYear}).</div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default Ledger;
