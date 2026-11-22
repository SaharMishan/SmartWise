
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserState, Transaction } from '../types';
import { Search, Download, ArrowUp, ArrowDown, Trash2, Calendar, ChevronDown, Filter, LayoutList, MoreVertical, Activity, Info, AlertCircle, X, Repeat, ArrowUpDown } from 'lucide-react';

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

  // Filters and Sorting state
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterDay, setFilterDay] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'description' | 'category' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const months = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
  const years = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 11 }, (_, i) => current - 5 + i);
  }, []);

  // Compute days of the selected month that actually have transactions
  const availableDays = useMemo(() => {
    const days = new Set<string>();
    state.transactions.forEach(t => {
      const parts = t.date.split('-');
      const tYear = parseInt(parts[0]);
      const tMonth = parseInt(parts[1]) - 1;
      if (tMonth === selectedMonth && tYear === selectedYear) {
        days.add(parseInt(parts[2]).toString());
      }
    });
    return Array.from(days).sort((a, b) => parseInt(a) - parseInt(b));
  }, [state.transactions, selectedMonth, selectedYear]);

  const filteredTransactions = useMemo(() => {
    let result = state.transactions.filter(t => {
      // Deep fix: String comparison to avoid timezone shifts
      const parts = t.date.split('-');
      const tYear = parseInt(parts[0]);
      const tMonth = parseInt(parts[1]) - 1;
      const tDay = parseInt(parts[2]).toString();

      const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            t.categoryName?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesMonth = tMonth === selectedMonth && tYear === selectedYear;

      const matchesType = filterType === 'all' || t.type === filterType;
      const matchesCategory = filterCategory === 'all' || t.categoryId === filterCategory;
      const matchesDay = filterDay === 'all' || tDay === filterDay;

      return matchesSearch && matchesMonth && matchesType && matchesCategory && matchesDay;
    });

    // Sort transactions
    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date') {
        comparison = a.date.localeCompare(b.date);
      } else if (sortBy === 'description') {
        comparison = a.description.localeCompare(b.description);
      } else if (sortBy === 'category') {
        const catA = a.categoryName || '';
        const catB = b.categoryName || '';
        comparison = catA.localeCompare(catB);
      } else if (sortBy === 'amount') {
        comparison = a.amount - b.amount;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [state.transactions, searchTerm, selectedMonth, selectedYear, filterType, filterCategory, filterDay, sortBy, sortOrder]);

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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 sm:space-y-8 pb-12 text-right max-w-7xl mx-auto relative">
      <AnimatePresence>
        {transactionToDelete && (
          <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setTransactionToDelete(null)} className="absolute inset-0 bg-black/60 backdrop-blur-xl" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative w-full sm:max-w-md bg-white dark:bg-[#1a1a1a] rounded-t-[32px] sm:rounded-[40px] p-6 sm:p-10 shadow-2xl border border-white/5 space-y-6">
              <div className="w-10 h-1.5 bg-gray-200 dark:bg-white/15 rounded-full mx-auto sm:hidden" />
              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-3xl flex items-center justify-center mx-auto"><AlertCircle size={34} /></div>
                <h2 className="text-xl sm:text-2xl font-black text-gray-800 dark:text-white">מחיקת פעולה</h2>
                <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                  <p className="text-base sm:text-lg font-black text-gray-800 dark:text-white">"{transactionToDelete.description}"</p>
                  <p className="text-brand font-black mt-1 tabular-nums">₪{transactionToDelete.amount.toLocaleString()}</p>
                </div>
                {transactionToDelete.recurringId && (
                   <p className="text-xs sm:text-sm font-bold text-gray-400 bg-brand/5 p-3 rounded-xl border border-brand/10">זוהי תנועה כחלק מסדרה קבועה.</p>
                )}
              </div>
              <div className="flex flex-col gap-2.5">
                {transactionToDelete.recurringId ? (
                  <>
                    <button onClick={() => confirmDelete(true)} className="w-full py-4 bg-rose-500 text-white rounded-2xl font-black text-sm shadow-lg hover:bg-rose-600 transition-colors min-h-[48px]">מחק מופע זה וכל העתידיים</button>
                    <button onClick={() => confirmDelete(false)} className="w-full py-4 bg-gray-100 dark:bg-white/5 text-gray-800 dark:text-white rounded-2xl font-black text-sm hover:bg-gray-200 transition-colors min-h-[48px]">מחק רק את המופע הנוכחי</button>
                  </>
                ) : (
                  <button onClick={() => confirmDelete(false)} className="w-full py-4 bg-rose-500 text-white rounded-2xl font-black shadow-lg hover:bg-rose-600 transition-colors min-h-[48px]">אישור מחיקה</button>
                )}
                <button onClick={() => setTransactionToDelete(null)} className="w-full py-3.5 rounded-2xl text-gray-500 font-black hover:bg-gray-50 dark:hover:bg-white/5 transition-colors min-h-[48px]">ביטול</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4 sm:gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black text-gray-800 dark:text-white">יומן פעולות</h1>
          <p className="text-sm sm:text-base text-gray-400 font-bold">פירוט מלא של כל התנועות הכספיות שלכם.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 w-full lg:w-auto">
           <div className="relative sm:col-span-6 lg:w-72">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input type="text" placeholder="חיפוש פעולה..." className="w-full h-12 sm:h-14 bg-white dark:bg-[#1e1e1e] dark:text-white rounded-2xl pr-11 pl-4 shadow-sm font-bold text-sm outline-none focus:ring-2 focus:ring-brand/20 transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
           </div>
           <div className="grid grid-cols-2 sm:col-span-6 gap-3">
             <div className="relative">
               <button onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)} className="w-full h-12 sm:h-14 flex items-center justify-between gap-2 bg-white dark:bg-[#1e1e1e] px-4 rounded-2xl shadow-sm border border-transparent hover:border-brand/20 transition-all">
                 <span className="flex items-center gap-2 min-w-0">
                   <Calendar size={18} className="text-brand shrink-0" />
                   <span className="text-gray-700 dark:text-gray-200 font-black text-xs sm:text-sm truncate">{months[selectedMonth]} {selectedYear}</span>
                 </span>
                 <ChevronDown size={14} className={`text-gray-400 shrink-0 transition-transform ${isMonthPickerOpen ? 'rotate-180' : ''}`} />
               </button>
               <AnimatePresence>
                 {isMonthPickerOpen && (
                   <>
                    <div className="fixed inset-0 z-[60]" onClick={() => setIsMonthPickerOpen(false)} />
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full right-0 sm:left-0 sm:right-auto mt-3 w-[calc(100vw-2rem)] sm:w-80 max-w-sm bg-white dark:bg-[#1e1e1e] rounded-[28px] sm:rounded-[32px] shadow-2xl z-[70] border border-gray-100 dark:border-white/5 overflow-hidden flex flex-col"
                    >
                      <div className="p-5 border-b border-gray-50 dark:border-white/5 bg-gray-50/50 dark:bg-white/5">
                         <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2.5 text-center">בחר שנה</p>
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
                            className={`py-3 px-1 text-xs font-black rounded-xl transition-all min-h-[42px] ${selectedMonth === i ? 'bg-brand text-white shadow-md' : 'hover:bg-gray-50 dark:hover:bg-white/5 text-gray-400'}`}>
                            {m}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                   </>
                 )}
               </AnimatePresence>
             </div>
             <button onClick={handleExportCSV} disabled={isExporting} className="h-12 sm:h-14 px-4 sm:px-6 bg-gray-900 dark:bg-brand text-white rounded-2xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all">
                {isExporting ? <Activity size={18} className="animate-spin" /> : <Download size={18} />}
                <span className="font-black text-xs sm:text-sm">ייצוא CSV</span>
             </button>
           </div>
        </div>
      </div>

      {/* סרגל סינון ומיון מתקדם */}
      <div className="bg-white dark:bg-[#1e1e1e] rounded-[24px] sm:rounded-[32px] p-4 sm:p-6 border border-gray-100 dark:border-white/5 shadow-sm space-y-3 lg:space-y-0 lg:flex lg:items-center lg:justify-between gap-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:flex-wrap items-center gap-2.5 flex-1">
          <div className="col-span-2 sm:col-span-3 lg:col-span-1 flex items-center gap-2 text-gray-400 font-bold text-xs">
            <Filter size={15} className="text-brand" />
            <span>סנן לפי:</span>
          </div>
          
          <select 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="bg-gray-50 dark:bg-[#121212] border border-gray-100 dark:border-white/10 rounded-xl px-3 py-2.5 text-xs font-black text-gray-700 dark:text-gray-200 cursor-pointer outline-none focus:border-brand min-h-[42px]"
          >
            <option value="all">כל הסוגים</option>
            <option value="expense">הוצאות בלבד</option>
            <option value="income">הכנסות בלבד</option>
          </select>

          <select 
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-gray-50 dark:bg-[#121212] border border-gray-100 dark:border-white/10 rounded-xl px-3 py-2.5 text-xs font-black text-gray-700 dark:text-gray-200 cursor-pointer outline-none focus:border-brand min-h-[42px]"
          >
            <option value="all">כל הקטגוריות</option>
            {state.categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select 
            value={filterDay}
            onChange={(e) => setFilterDay(e.target.value)}
            className="col-span-2 sm:col-span-1 bg-gray-50 dark:bg-[#121212] border border-gray-100 dark:border-white/10 rounded-xl px-3 py-2.5 text-xs font-black text-gray-700 dark:text-gray-200 cursor-pointer outline-none focus:border-brand min-h-[42px]"
          >
            <option value="all">כל הימים</option>
            {availableDays.map(day => (
              <option key={day} value={day}>יום {day}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2.5 pt-2 border-t border-gray-100 dark:border-white/5 lg:pt-0 lg:border-t-0">
          <div className="flex items-center gap-1.5 text-gray-400 font-bold text-xs shrink-0">
            <ArrowUpDown size={15} className="text-brand" />
            <span>מיין:</span>
          </div>

          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="flex-1 lg:flex-none bg-gray-50 dark:bg-[#121212] border border-gray-100 dark:border-white/10 rounded-xl px-3 py-2.5 text-xs font-black text-gray-700 dark:text-gray-200 cursor-pointer outline-none focus:border-brand min-h-[42px]"
          >
            <option value="date">תאריך</option>
            <option value="description">תיאור</option>
            <option value="category">קטגוריה</option>
            <option value="amount">סכום</option>
          </select>

          <button 
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="min-w-[42px] min-h-[42px] bg-gray-50 dark:bg-[#121212] border border-gray-100 dark:border-white/10 rounded-xl text-gray-500 hover:text-brand transition-colors flex items-center justify-center shrink-0"
            title={sortOrder === 'asc' ? 'סדר עולה' : 'סדר יורד'}
          >
            {sortOrder === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
          </button>
        </div>
      </div>

      <div className="bg-white/70 dark:bg-white/5 rounded-[28px] sm:rounded-[40px] overflow-hidden border border-white/60 dark:border-white/10 shadow-sm backdrop-blur-md">
        <div className="divide-y divide-gray-100 dark:divide-white/5">
          {filteredTransactions.length > 0 ? filteredTransactions.map((t) => {
            const isIncome = t.type === 'income';
            return (
              <div key={t.id} className="group flex items-center justify-between p-4 sm:p-6 md:p-7 hover:bg-white dark:hover:bg-white/5 transition-all gap-3">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 ${isIncome ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-500'}`}>
                    {isIncome ? <ArrowUp size={18} /> : <ArrowDown size={18} />}
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {t.recurringId && <Repeat size={13} className="text-brand shrink-0" />}
                      <h4 className="font-black text-gray-900 dark:text-gray-100 text-sm sm:text-base md:text-lg truncate">{t.description}</h4>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-bold text-gray-400">
                      <span dir="ltr">{t.date.split('-').reverse().join('/')}</span>
                      <span>·</span>
                      <span className="truncate">{t.categoryName}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
                   <p className={`text-base sm:text-xl md:text-2xl font-black tabular-nums ${isIncome ? 'text-emerald-500' : 'text-gray-900 dark:text-white'}`} dir="ltr">{isIncome ? '+' : '-'}₪{t.amount.toLocaleString()}</p>
                   <button onClick={() => setTransactionToDelete(t)} aria-label="מחק פעולה" className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-rose-500 bg-gray-100 dark:bg-white/5 rounded-2xl transition-all"><Trash2 size={18} /></button>
                </div>
              </div>
            );
          }) : (
            <div className="p-16 text-center text-gray-400 font-bold italic">לא נמצאו תנועות בחודש זה ({months[selectedMonth]} {selectedYear}).</div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default Ledger;
