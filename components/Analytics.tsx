
import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserState, Transaction } from '../types';
import { 
  ResponsiveContainer, XAxis, YAxis, Tooltip, 
  PieChart, Pie, Cell, AreaChart, Area, CartesianGrid,
  BarChart, Bar
} from 'recharts';
import { 
  Calendar, ChevronDown, TrendingUp, 
  PieChart as PieIcon, Zap, Wallet, 
  BarChart3, TrendingDown, CreditCard, 
  ArrowRightLeft, X, ArrowUp, ArrowDown,
  ShoppingBag as ShoppingIcon, Hash
} from 'lucide-react';
import { PAYMENT_METHODS } from '../constants';

interface AnalyticsProps {
  state: UserState;
}

const PAYMENT_COLORS = ['#00b894', '#0984e3', '#fdcb6e', '#6c5ce7', '#e17055', '#e84393'];

const formatShortAxis = (value: number) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${Math.round(value / 1000)}k`;
  return `${value}`;
};

const Analytics: React.FC<AnalyticsProps> = ({ state }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const months = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
  const years = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 11 }, (_, i) => current - 5 + i);
  }, []);

  const monthTransactions = useMemo(() => {
    return state.transactions.filter(t => {
      const parts = t.date.split('-');
      const tYear = parseInt(parts[0]);
      const tMonth = parseInt(parts[1]) - 1;
      return tMonth === selectedMonth && tYear === selectedYear;
    });
  }, [state.transactions, selectedMonth, selectedYear]);

  const summary = useMemo(() => {
    const income = monthTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = monthTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const savingsRate = income > 0 ? Math.round(((income - expense) / income) * 100) : 0;
    const totalDays = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const now = new Date();
    const currentDay = (now.getMonth() === selectedMonth && now.getFullYear() === selectedYear) ? now.getDate() : totalDays;
    const dailyAvg = expense / Math.max(currentDay, 1);
    return { income, expense, savingsRate, dailyAvg, currentDay };
  }, [monthTransactions, selectedMonth, selectedYear]);

  const categoryData = useMemo(() => {
    const expenses = monthTransactions.filter(t => t.type === 'expense');
    const dataMap: Record<string, any> = {};
    expenses.forEach(t => {
      if (!dataMap[t.categoryId]) {
        dataMap[t.categoryId] = {
          id: t.categoryId,
          name: t.categoryName,
          value: 0,
          color: state.categories.find(c => c.id === t.categoryId)?.color || '#eee'
        };
      }
      dataMap[t.categoryId].value += t.amount;
    });
    return Object.values(dataMap).sort((a, b) => b.value - a.value);
  }, [monthTransactions, state.categories]);

  const paymentMethodData = useMemo(() => {
    const dataMap: Record<string, any> = {};
    monthTransactions.filter(t => t.type === 'expense').forEach(t => {
      const label = PAYMENT_METHODS.find(pm => pm.id === t.paymentMethod)?.label || 'אחר';
      if (!dataMap[t.paymentMethod]) {
        dataMap[t.paymentMethod] = { name: label, value: 0 };
      }
      dataMap[t.paymentMethod].value += t.amount;
    });
    return Object.values(dataMap);
  }, [monthTransactions]);

  const totalExpenses = useMemo(() => categoryData.reduce((sum, item) => sum + item.value, 0), [categoryData]);

  const dailyTrend = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const trend = Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, amount: 0 }));
    monthTransactions.filter(t => t.type === 'expense').forEach(t => {
      const day = parseInt(t.date.split('-')[2]);
      if (trend[day - 1]) trend[day - 1].amount += t.amount;
    });
    return trend;
  }, [monthTransactions, selectedMonth, selectedYear]);

  const selectedCategoryTransactions = useMemo(() => {
    if (!selectedCategoryId) return [];
    return monthTransactions.filter(t => t.categoryId === selectedCategoryId).sort((a, b) => b.date.localeCompare(a.date));
  }, [selectedCategoryId, monthTransactions]);

  const categorySummary = useMemo(() => {
    if (!selectedCategoryId) return null;
    const items = selectedCategoryTransactions;
    const incomeTotal = items.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expenseTotal = items.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const netTotal = incomeTotal - expenseTotal;
    const count = items.length;
    const avg = count > 0 ? (expenseTotal / count) : 0;
    const percentOfExpenses = totalExpenses > 0 ? (expenseTotal / totalExpenses) * 100 : 0;
    
    return { incomeTotal, expenseTotal, netTotal, count, avg, percentOfExpenses };
  }, [selectedCategoryId, selectedCategoryTransactions, totalExpenses]);

  const onPieClick = (data: any) => {
    if (selectedCategoryId === data.id) {
      setSelectedCategoryId(null);
    } else {
      setSelectedCategoryId(data.id);
    }
  };

  const visibleCategories = showAllCategories ? categoryData : categoryData.slice(0, 6);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 sm:space-y-8 md:space-y-10 pb-12 text-right max-w-7xl mx-auto">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-800 dark:text-white tracking-tight">אנליטיקה ותובנות</h1>
          <p className="text-gray-400 font-bold text-sm sm:text-base md:text-lg">ניתוח מעמיק של הרגלי הצריכה והצמיחה שלכם.</p>
        </div>
        <div className="relative w-full sm:w-auto">
          <button onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)} className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-3 bg-white dark:bg-[#1e1e1e] px-5 sm:px-7 py-3.5 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 text-gray-700 dark:text-gray-300 font-black hover:bg-emerald-50 transition-all min-h-[48px]">
            <span className="flex items-center gap-3"><Calendar size={20} className="text-brand" /> {months[selectedMonth]} {selectedYear}</span>
            <ChevronDown size={16} className={`transition-transform ${isMonthPickerOpen ? 'rotate-180' : ''}`} />
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
      </header>

      {/* Stats Grid - 2 columns on mobile, 4 on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 md:gap-6">
        {[
          { icon: <TrendingUp size={18} />, label: 'שיעור חיסכון', val: `${summary.savingsRate}%`, sub: 'מתוך ההכנסות', color: 'text-brand', bg: 'bg-emerald-50 dark:bg-brand/10' },
          { icon: <Zap size={18} />, label: 'ממוצע יומי', val: `₪${Math.round(summary.dailyAvg).toLocaleString()}`, sub: `לפי ${summary.currentDay} ימים`, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/10' },
          { icon: <Wallet size={18} />, label: 'סה"כ הכנסות', val: `₪${summary.income.toLocaleString()}`, sub: 'חודש נוכחי', color: 'text-emerald-500', bg: 'bg-emerald-50/50 dark:bg-emerald-900/10' },
          { icon: <TrendingDown size={18} />, label: 'סה"כ הוצאות', val: `₪${summary.expense.toLocaleString()}`, sub: 'חודש נוכחי', color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/10' }
        ].map((card, i) => (
          <motion.div key={i} whileHover={{ y: -3 }} className="bg-white dark:bg-[#1e1e1e] rounded-[28px] sm:rounded-[36px] p-4 sm:p-6 md:p-8 border border-gray-100 dark:border-white/5 shadow-sm space-y-2.5 sm:space-y-4">
             <div className={`p-2.5 sm:p-3 w-fit ${card.bg} ${card.color} rounded-xl sm:rounded-2xl`}>{card.icon}</div>
             <div className="space-y-0.5 sm:space-y-1 min-w-0">
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider truncate">{card.label}</p>
               <h3 className={`text-xl sm:text-2xl md:text-3xl font-black ${card.color} tabular-nums truncate`} dir="ltr">{card.val}</h3>
               <p className="text-[10px] text-gray-400 font-bold truncate">{card.sub}</p>
             </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        {/* Main Expenses Chart */}
        <div className="lg:col-span-7 xl:col-span-8 bg-white dark:bg-[#1e1e1e] rounded-[32px] md:rounded-[48px] p-5 sm:p-8 md:p-10 border border-gray-100 dark:border-white/5 shadow-sm">
           <div className="flex items-center justify-between mb-6 md:mb-10">
             <div className="flex items-center gap-3 sm:gap-4">
               <div className="w-11 h-11 sm:w-12 sm:h-12 bg-gray-50 dark:bg-white/5 text-brand rounded-2xl flex items-center justify-center shrink-0"><BarChart3 size={22} /></div>
               <div>
                 <h3 className="text-lg sm:text-xl font-black text-gray-800 dark:text-white">מגמת הוצאות יומית</h3>
                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">פריסה לאורך ימי החודש</p>
               </div>
             </div>
           </div>
           <div className="h-[230px] sm:h-[290px] md:h-[350px] w-full" dir="ltr">
             {monthTransactions.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyTrend} margin={{ top: 10, right: 8, left: -14, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00b894" stopOpacity={0.22}/>
                        <stop offset="95%" stopColor="#00b894" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" className="dark:opacity-5" />
                    <XAxis
                      dataKey="day"
                      interval={isMobile ? 4 : 2}
                      axisLine={false}
                      tickLine={false}
                      tick={{fill: '#888', fontSize: isMobile ? 9 : 10, fontWeight: 800}}
                    />
                    <YAxis
                      width={42}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={formatShortAxis}
                      tick={{fill: '#888', fontSize: isMobile ? 9 : 10, fontWeight: 800}}
                    />
                    <Tooltip 
                      contentStyle={{borderRadius: '18px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.12)', fontFamily: 'Assistant', fontSize: '12px'}}
                      formatter={(value: any) => [`₪${Number(value).toLocaleString()}`, 'סכום']}
                      labelFormatter={(label) => `יום ${label} לחודש`}
                    />
                    <Area type="monotone" dataKey="amount" stroke="#00b894" fillOpacity={1} fill="url(#colorAmt)" strokeWidth={isMobile ? 3 : 4} />
                  </AreaChart>
                </ResponsiveContainer>
             ) : (
                <div className="h-full flex flex-col items-center justify-center opacity-30">
                  <BarChart3 size={52} />
                  <p className="font-black text-sm italic mt-2">אין נתונים להצגה בחודש זה.</p>
                </div>
             )}
           </div>
        </div>

        {/* Categories Pie Chart + Clean Mobile Breakdown */}
        <div className="lg:col-span-5 xl:col-span-4 bg-white dark:bg-[#1e1e1e] rounded-[32px] md:rounded-[48px] p-5 sm:p-8 md:p-10 border border-gray-100 dark:border-white/5 shadow-sm relative overflow-hidden flex flex-col">
           <div className="flex items-center gap-3 sm:gap-4 mb-6">
             <div className="w-11 h-11 sm:w-12 sm:h-12 bg-gray-50 dark:bg-white/5 text-brand rounded-2xl flex items-center justify-center shrink-0"><PieIcon size={22} /></div>
             <div>
               <h3 className="text-lg sm:text-xl font-black text-gray-800 dark:text-white">התפלגות קטגוריות</h3>
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">לחץ על קטגוריה לפירוט</p>
             </div>
           </div>
           
           <div className="h-[220px] sm:h-[260px] w-full relative shrink-0" dir="ltr">
             {categoryData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={categoryData} 
                        cx="50%" 
                        cy="50%" 
                        innerRadius={isMobile ? 56 : 65} 
                        outerRadius={isMobile ? 82 : 95} 
                        paddingAngle={4} 
                        dataKey="value" 
                        stroke="none"
                        onClick={onPieClick}
                        className="cursor-pointer"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.color} 
                            stroke={selectedCategoryId === entry.id ? '#00b894' : 'none'}
                            strokeWidth={3}
                            style={{ outline: 'none' }}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: any) => [`₪${Number(value).toLocaleString()}`, 'סכום']}
                        contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontFamily: 'Assistant', fontSize: '12px'}}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-lg sm:text-2xl font-black text-gray-800 dark:text-white tabular-nums">₪{totalExpenses.toLocaleString()}</span>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-0.5">סה"כ הוצאות</span>
                  </div>
                </>
             ) : (
                <div className="h-full flex flex-col items-center justify-center opacity-30">
                  <PieIcon size={52} />
                  <p className="font-black text-sm italic mt-2">אין נתונים.</p>
                </div>
             )}
           </div>

           {/* Structured category list without internal scroll trap */}
           {categoryData.length > 0 && (
             <div className="mt-5 space-y-2.5">
               {visibleCategories.map(item => {
                 const percent = totalExpenses > 0 ? Math.round((item.value / totalExpenses) * 100) : 0;
                 const isSelected = selectedCategoryId === item.id;
                 return (
                   <button 
                     key={item.id}
                     onClick={() => onPieClick(item)}
                     className={`w-full p-3.5 rounded-2xl transition-all flex flex-col gap-2 border text-right ${isSelected ? 'bg-brand/10 border-brand shadow-sm' : 'bg-gray-50 dark:bg-white/5 border-transparent hover:border-gray-200 dark:hover:border-white/10'}`}
                   >
                     <div className="flex items-center justify-between gap-3 w-full">
                       <div className="flex items-center gap-2.5 min-w-0">
                         <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                         <span className="font-black text-xs sm:text-sm text-gray-800 dark:text-gray-200 truncate">{item.name}</span>
                       </div>
                       <div className="flex items-center gap-2 shrink-0">
                         <span className="text-[11px] font-bold text-gray-400 tabular-nums">{percent}%</span>
                         <span className="font-black text-xs sm:text-sm text-gray-900 dark:text-white tabular-nums" dir="ltr">₪{item.value.toLocaleString()}</span>
                       </div>
                     </div>
                     <div className="w-full h-1.5 bg-gray-200/70 dark:bg-white/10 rounded-full overflow-hidden">
                       <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(percent, 2)}%`, backgroundColor: item.color }} />
                     </div>
                   </button>
                 );
               })}

               {categoryData.length > 6 && (
                 <button
                   onClick={() => setShowAllCategories(!showAllCategories)}
                   className="w-full py-2.5 text-xs font-black text-brand bg-brand/5 hover:bg-brand/10 rounded-xl transition-colors"
                 >
                   {showAllCategories ? 'הצג פחות קטגוריות' : `הצג את כל ${categoryData.length} הקטגוריות`}
                 </button>
               )}
             </div>
           )}
        </div>
      </div>

      <AnimatePresence>
        {selectedCategoryId && categorySummary && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.97 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.97 }}
            className="space-y-4 sm:space-y-6"
          >
            {/* Intelligent Summary Header - 2x2 on mobile */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <div className={`bg-white dark:bg-[#1e1e1e] p-4 sm:p-6 rounded-[24px] sm:rounded-[32px] border shadow-sm flex flex-col items-center justify-center gap-1.5 sm:gap-2 ${categorySummary.netTotal >= 0 ? 'border-emerald-100 dark:border-emerald-900/20' : 'border-rose-100 dark:border-rose-900/20'}`}>
                 <div className={`p-2 rounded-xl ${categorySummary.netTotal >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                   {categorySummary.netTotal >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                 </div>
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider text-center">מאזן נטו לקטגוריה</p>
                 <h4 className={`text-lg sm:text-2xl font-black tabular-nums ${categorySummary.netTotal >= 0 ? 'text-emerald-500' : 'text-rose-500'}`} dir="ltr">
                   {categorySummary.netTotal >= 0 ? '+' : ''}₪{categorySummary.netTotal.toLocaleString()}
                 </h4>
              </div>
              <div className="bg-white dark:bg-[#1e1e1e] p-4 sm:p-6 rounded-[24px] sm:rounded-[32px] border border-emerald-50 dark:border-white/5 shadow-sm flex flex-col items-center justify-center gap-1.5 sm:gap-2">
                 <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl"><ArrowUp size={16} /></div>
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">סה"כ הכנסות</p>
                 <h4 className="text-lg sm:text-2xl font-black text-emerald-500 tabular-nums" dir="ltr">₪{categorySummary.incomeTotal.toLocaleString()}</h4>
              </div>
              <div className="bg-white dark:bg-[#1e1e1e] p-4 sm:p-6 rounded-[24px] sm:rounded-[32px] border border-rose-50 dark:border-white/5 shadow-sm flex flex-col items-center justify-center gap-1.5 sm:gap-2">
                 <div className="p-2 bg-rose-500/10 text-rose-500 rounded-xl"><ArrowDown size={16} /></div>
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">סה"כ הוצאות</p>
                 <h4 className="text-lg sm:text-2xl font-black text-rose-500 tabular-nums" dir="ltr">₪{categorySummary.expenseTotal.toLocaleString()}</h4>
              </div>
              <div className="bg-white dark:bg-[#1e1e1e] p-4 sm:p-6 rounded-[24px] sm:rounded-[32px] border border-gray-100 dark:border-white/5 shadow-sm flex flex-col items-center justify-center gap-1.5 sm:gap-2">
                 <div className="p-2 bg-purple-500/10 text-purple-500 rounded-xl"><Hash size={16} /></div>
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">תנועות</p>
                 <h4 className="text-lg sm:text-2xl font-black text-gray-800 dark:text-white tabular-nums">{categorySummary.count}</h4>
              </div>
            </div>

            <div className="bg-white dark:bg-[#1e1e1e] rounded-[32px] md:rounded-[48px] p-5 sm:p-8 md:p-12 border-2 border-brand/20 shadow-xl overflow-hidden">
               <div className="flex items-center justify-between gap-3 mb-6 md:mb-10">
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <div className="w-11 h-11 sm:w-14 sm:h-14 bg-brand/10 text-brand rounded-2xl flex items-center justify-center shrink-0"><ShoppingIcon size={24} /></div>
                    <div className="min-w-0">
                      <h3 className="text-lg sm:text-2xl font-black text-gray-800 dark:text-white truncate">
                        פירוט מלא: {categoryData.find(c => c.id === selectedCategoryId)?.name}
                      </h3>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        חודש {months[selectedMonth]} {selectedYear}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedCategoryId(null)}
                    aria-label="סגור פירוט"
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-gray-50 dark:bg-white/5 rounded-2xl text-gray-400 hover:text-rose-500 transition-all active:scale-95 shrink-0"
                  >
                    <X size={22} />
                  </button>
               </div>

               {/* Mobile Cards View */}
               <div className="md:hidden space-y-3">
                 {selectedCategoryTransactions.map(t => (
                   <div key={t.id} className="p-4 bg-gray-50/70 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 flex items-center justify-between gap-3">
                     <div className="min-w-0 space-y-1">
                       <p className="font-black text-sm text-gray-800 dark:text-white truncate">{t.description}</p>
                       <div className="flex items-center gap-2 text-[11px] font-bold text-gray-400">
                         <span dir="ltr">{t.date.split('-').reverse().join('/')}</span>
                         <span>·</span>
                         <span className="flex items-center gap-1">
                           {PAYMENT_METHODS.find(pm => pm.id === t.paymentMethod)?.label || 'אחר'}
                         </span>
                       </div>
                     </div>
                     <div className={`text-left shrink-0 ${t.type === 'income' ? 'text-emerald-500' : 'text-gray-900 dark:text-white'}`}>
                       <span className="text-base font-black tabular-nums" dir="ltr">{t.type === 'income' ? '+' : '-'}₪{t.amount.toLocaleString()}</span>
                     </div>
                   </div>
                 ))}
               </div>

               {/* Desktop Table View */}
               <div className="hidden md:block overflow-x-auto no-scrollbar">
                  <table className="w-full text-right border-collapse">
                    <thead>
                      <tr className="text-[11px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-white/5">
                        <th className="py-5 px-4">תאריך</th>
                        <th className="py-5 px-4">תיאור הפעולה</th>
                        <th className="py-5 px-4">אופן תשלום</th>
                        <th className="py-5 px-4 text-left">סכום</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                      {selectedCategoryTransactions.map(t => (
                        <tr key={t.id} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-all group">
                          <td className="py-5 px-4">
                            <span className="text-xs font-black text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-white/5 px-3 py-1.5 rounded-xl shadow-sm" dir="ltr">
                              {t.date.split('-').reverse().join('/')}
                            </span>
                          </td>
                          <td className="py-5 px-4 font-black text-gray-700 dark:text-gray-200 text-lg">{t.description}</td>
                          <td className="py-5 px-4">
                             <div className="flex items-center gap-2.5 text-xs font-bold text-gray-400">
                               <div className="p-2 bg-gray-50 dark:bg-white/5 rounded-lg">{PAYMENT_METHODS.find(pm => pm.id === t.paymentMethod)?.icon}</div>
                               {PAYMENT_METHODS.find(pm => pm.id === t.paymentMethod)?.label}
                             </div>
                          </td>
                          <td className="py-5 px-4 font-black">
                            <div className={`flex flex-col ${t.type === 'income' ? 'text-emerald-500' : 'text-gray-900 dark:text-white'}`}>
                              <span className="text-2xl tabular-nums" dir="ltr">{t.type === 'income' ? '+' : '-'} ₪{t.amount.toLocaleString()}</span>
                              <span className={`text-[10px] uppercase font-black tracking-widest ${t.type === 'income' ? 'text-emerald-400' : 'text-rose-400 opacity-60'}`}>
                                {t.type === 'income' ? 'הכנסה' : 'הוצאה'}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {/* Income vs Expenses Chart */}
        <div className="bg-white dark:bg-[#1e1e1e] rounded-[32px] md:rounded-[48px] p-5 sm:p-8 md:p-10 border border-gray-100 dark:border-white/5 shadow-sm">
           <div className="flex items-center gap-3 sm:gap-4 mb-6 md:mb-10">
             <div className="w-11 h-11 sm:w-12 sm:h-12 bg-gray-50 dark:bg-white/5 text-brand rounded-2xl flex items-center justify-center shrink-0"><ArrowRightLeft size={22} /></div>
             <div>
               <h3 className="text-lg sm:text-xl font-black text-gray-800 dark:text-white">הכנסות מול הוצאות</h3>
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">מאזן חודשי כולל</p>
             </div>
           </div>
           
           <div className="h-[220px] sm:h-[260px] w-full" dir="ltr">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={[{ name: months[selectedMonth], הכנסות: summary.income, הוצאות: summary.expense }]} margin={{ top: 10, right: 10, left: -12, bottom: 0 }}>
                 <XAxis dataKey="name" hide />
                 <YAxis width={42} axisLine={false} tickLine={false} tickFormatter={formatShortAxis} tick={{fill: '#888', fontSize: 10, fontWeight: 800}} />
                 <Tooltip
                   formatter={(value: any) => [`₪${Number(value).toLocaleString()}`, '']}
                   contentStyle={{borderRadius: '18px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontFamily: 'Assistant', fontSize: '12px'}}
                 />
                 <Bar dataKey="הכנסות" fill="#00b894" radius={[12, 12, 0, 0]} barSize={isMobile ? 44 : 60} />
                 <Bar dataKey="הוצאות" fill="#ff7675" radius={[12, 12, 0, 0]} barSize={isMobile ? 44 : 60} />
               </BarChart>
             </ResponsiveContainer>
           </div>

           <div className="flex items-center justify-center gap-6 mt-3 text-xs font-black text-gray-500">
             <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#00b894]" /> הכנסות</span>
             <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#ff7675]" /> הוצאות</span>
           </div>
           
           <div className="grid grid-cols-2 gap-3 sm:gap-6 mt-5">
              <div className="p-4 sm:p-5 bg-emerald-50 dark:bg-brand/10 rounded-2xl sm:rounded-3xl text-center">
                 <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider mb-1">נטו שנשאר</p>
                 <h4 className="text-lg sm:text-2xl font-black text-brand tabular-nums" dir="ltr">₪{(summary.income - summary.expense).toLocaleString()}</h4>
              </div>
              <div className="p-4 sm:p-5 bg-gray-50 dark:bg-white/5 rounded-2xl sm:rounded-3xl text-center">
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">יחס חיסכון</p>
                 <h4 className="text-lg sm:text-2xl font-black text-gray-800 dark:text-white tabular-nums">{summary.savingsRate}%</h4>
              </div>
           </div>
        </div>

        {/* Payment Methods Chart */}
        <div className="bg-white dark:bg-[#1e1e1e] rounded-[32px] md:rounded-[48px] p-5 sm:p-8 md:p-10 border border-gray-100 dark:border-white/5 shadow-sm flex flex-col">
           <div className="flex items-center gap-3 sm:gap-4 mb-6 md:mb-10">
             <div className="w-11 h-11 sm:w-12 sm:h-12 bg-gray-50 dark:bg-white/5 text-brand rounded-2xl flex items-center justify-center shrink-0"><CreditCard size={22} /></div>
             <div>
               <h3 className="text-lg sm:text-xl font-black text-gray-800 dark:text-white">אופן תשלום</h3>
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">היכן הכסף עובר?</p>
             </div>
           </div>
           
           <div className="h-[220px] sm:h-[240px] w-full shrink-0" dir="ltr">
             {paymentMethodData.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                    <Pie 
                      data={paymentMethodData} 
                      cx="50%" 
                      cy="50%" 
                      innerRadius={55} 
                      outerRadius={85} 
                      paddingAngle={4} 
                      dataKey="value" 
                      stroke="none"
                    >
                      {paymentMethodData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PAYMENT_COLORS[index % PAYMENT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any) => [`₪${Number(value).toLocaleString()}`, 'סכום']}
                      contentStyle={{borderRadius: '16px', border: 'none', fontFamily: 'Assistant', fontSize: '12px'}}
                    />
                 </PieChart>
               </ResponsiveContainer>
             ) : (
                <div className="h-full flex flex-col items-center justify-center opacity-30">
                  <CreditCard size={52} />
                  <p className="font-black text-sm italic mt-2">אין נתונים.</p>
                </div>
             )}
           </div>

           {/* Clean RTL Legend & Values */}
           {paymentMethodData.length > 0 && (
             <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
               {paymentMethodData.map((pm, index) => (
                 <div key={pm.name} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-2xl gap-2">
                   <div className="flex items-center gap-2.5 min-w-0">
                     <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: PAYMENT_COLORS[index % PAYMENT_COLORS.length] }} />
                     <span className="text-xs font-black text-gray-700 dark:text-gray-200 truncate">{pm.name}</span>
                   </div>
                   <span className="text-xs font-black text-gray-900 dark:text-white tabular-nums shrink-0" dir="ltr">₪{pm.value.toLocaleString()}</span>
                 </div>
               ))}
             </div>
           )}
        </div>
      </div>
    </motion.div>
  );
};

export default Analytics;
