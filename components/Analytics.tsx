
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserState, Transaction } from '../types';
import { 
  ResponsiveContainer, XAxis, YAxis, Tooltip, 
  PieChart, Pie, Cell, AreaChart, Area, CartesianGrid,
  Legend, BarChart, Bar
} from 'recharts';
import { 
  Calendar, ChevronDown, TrendingUp, Activity, 
  PieChart as PieIcon, Zap, Wallet, 
  BarChart3, TrendingDown, Info, CreditCard, 
  ShoppingBag, ArrowRightLeft, MousePointer2, ChevronLeft, X,
  ShoppingBag as ShoppingIcon, Hash, Target
} from 'lucide-react';
import { PAYMENT_METHODS } from '../constants';

interface AnalyticsProps {
  state: UserState;
}

const Analytics: React.FC<AnalyticsProps> = ({ state }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

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
    const total = items.reduce((sum, t) => sum + t.amount, 0);
    const count = items.length;
    const avg = total / count;
    const percentOfExpenses = totalExpenses > 0 ? (total / totalExpenses) * 100 : 0;
    
    return { total, count, avg, percentOfExpenses };
  }, [selectedCategoryId, selectedCategoryTransactions, totalExpenses]);

  const onPieClick = (data: any) => {
    if (selectedCategoryId === data.id) {
      setSelectedCategoryId(null);
    } else {
      setSelectedCategoryId(data.id);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10 pb-32 text-right max-w-7xl mx-auto px-4">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-800 dark:text-white tracking-tight">אנליטיקה ותובנות</h1>
          <p className="text-gray-400 font-bold text-lg">ניתוח מעמיק של הרגלי הצריכה והצמיחה שלכם.</p>
        </div>
        <div className="relative group">
          <button onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)} className="flex items-center gap-4 bg-white dark:bg-[#1e1e1e] px-8 py-3.5 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 text-gray-700 dark:text-gray-300 font-black hover:bg-emerald-50 transition-all">
            <Calendar size={20} className="text-brand" /> {months[selectedMonth]} {selectedYear} <ChevronDown size={14} className={`transition-transform ${isMonthPickerOpen ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
             {isMonthPickerOpen && (
               <>
                <div className="fixed inset-0 z-[60]" onClick={() => setIsMonthPickerOpen(false)} />
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full left-0 mt-3 w-80 bg-white dark:bg-[#1e1e1e] rounded-[32px] shadow-2xl z-[70] border border-gray-100 dark:border-white/5 overflow-hidden flex flex-col"
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
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { icon: <TrendingUp size={20} />, label: 'שיעור חיסכון', val: `${summary.savingsRate}%`, sub: 'מתוך ההכנסות', color: 'text-brand', bg: 'bg-emerald-50 dark:bg-brand/10' },
          { icon: <Zap size={20} />, label: 'ממוצע יומי', val: `₪${Math.round(summary.dailyAvg).toLocaleString()}`, sub: `מבוסס על ${summary.currentDay} ימים`, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/10' },
          { icon: <Wallet size={20} />, label: 'סה"כ הכנסות', val: `₪${summary.income.toLocaleString()}`, sub: 'חודש נוכחי', color: 'text-emerald-500', bg: 'bg-emerald-50/50 dark:bg-emerald-900/10' },
          { icon: <TrendingDown size={20} />, label: 'סה"כ הוצאות', val: `₪${summary.expense.toLocaleString()}`, sub: 'חודש נוכחי', color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/10' }
        ].map((card, i) => (
          <motion.div key={i} whileHover={{ y: -5 }} className="bg-white dark:bg-[#1e1e1e] rounded-[40px] p-8 border border-gray-100 dark:border-white/5 shadow-sm space-y-4">
             <div className={`p-3 w-fit ${card.bg} ${card.color} rounded-2xl`}>{card.icon}</div>
             <div className="space-y-1">
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{card.label}</p>
               <h3 className={`text-3xl font-black ${card.color}`}>{card.val}</h3>
               <p className="text-[10px] text-gray-400 font-bold">{card.sub}</p>
             </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Expenses Chart */}
        <div className="lg:col-span-8 bg-white dark:bg-[#1e1e1e] rounded-[48px] p-10 border border-gray-100 dark:border-white/5 shadow-sm">
           <div className="flex items-center justify-between mb-12">
             <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-gray-50 dark:bg-white/5 text-brand rounded-2xl flex items-center justify-center"><BarChart3 size={24} /></div>
               <div>
                 <h3 className="text-xl font-black text-gray-800 dark:text-white">מגמת הוצאות יומית</h3>
                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">פריסה לאורך ימי החודש</p>
               </div>
             </div>
           </div>
           <div className="h-[350px] w-full" dir="ltr">
             {monthTransactions.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyTrend}>
                    <defs>
                      <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00b894" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#00b894" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" className="dark:opacity-5" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 10, fontWeight: 800}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 10, fontWeight: 800}} />
                    <Tooltip 
                      contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', fontFamily: 'Assistant'}}
                      formatter={(value: any) => [`₪${value.toLocaleString()}`, 'סכום']}
                      labelFormatter={(label) => `יום ${label} לחודש`}
                    />
                    <Area type="monotone" dataKey="amount" stroke="#00b894" fillOpacity={1} fill="url(#colorAmt)" strokeWidth={4} />
                  </AreaChart>
                </ResponsiveContainer>
             ) : (
                <div className="h-full flex flex-col items-center justify-center opacity-30">
                  <BarChart3 size={60} />
                  <p className="font-black text-sm italic mt-2">אין נתונים להצגה בחודש זה.</p>
                </div>
             )}
           </div>
        </div>

        {/* Categories Pie Chart */}
        <div className="lg:col-span-4 bg-white dark:bg-[#1e1e1e] rounded-[48px] p-10 border border-gray-100 dark:border-white/5 shadow-sm relative overflow-hidden">
           <div className="flex items-center gap-4 mb-10">
             <div className="w-12 h-12 bg-gray-50 dark:bg-white/5 text-brand rounded-2xl flex items-center justify-center"><PieIcon size={24} /></div>
             <div>
               <h3 className="text-xl font-black text-gray-800 dark:text-white">התפלגות קטגוריות</h3>
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">לחץ על קטגוריה לפירוט</p>
             </div>
           </div>
           
           <div className="h-[320px] w-full relative" dir="ltr">
             {categoryData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={categoryData} 
                        cx="50%" 
                        cy="50%" 
                        innerRadius={70} 
                        outerRadius={100} 
                        paddingAngle={5} 
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
                      <Tooltip contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)'}} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-4">
                    <span className="text-2xl font-black text-gray-800 dark:text-white">₪{totalExpenses.toLocaleString()}</span>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">סה"כ</span>
                  </div>
                </>
             ) : (
                <div className="h-full flex flex-col items-center justify-center opacity-30">
                  <PieIcon size={60} />
                  <p className="font-black text-sm italic mt-2">אין נתונים.</p>
                </div>
             )}
           </div>

           <div className="mt-4 flex flex-wrap gap-2 justify-center max-h-[120px] overflow-y-auto no-scrollbar">
             {categoryData.map(item => (
               <button 
                key={item.id}
                onClick={() => onPieClick(item)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-black transition-all flex items-center gap-2 border ${selectedCategoryId === item.id ? 'bg-brand text-white border-brand' : 'bg-gray-50 dark:bg-white/5 text-gray-500 border-transparent'}`}
               >
                 <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                 {item.name}
               </button>
             ))}
           </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedCategoryId && categorySummary && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-6"
          >
            {/* Intelligent Summary Header */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-[#1e1e1e] p-6 rounded-[32px] border border-gray-100 dark:border-white/5 shadow-sm flex flex-col items-center justify-center gap-2">
                 <div className="p-2 bg-brand/10 text-brand rounded-xl"><Wallet size={16} /></div>
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">סה"כ לקטגוריה</p>
                 <h4 className="text-2xl font-black text-gray-800 dark:text-white" dir="ltr">₪{categorySummary.total.toLocaleString()}</h4>
              </div>
              <div className="bg-white dark:bg-[#1e1e1e] p-6 rounded-[32px] border border-gray-100 dark:border-white/5 shadow-sm flex flex-col items-center justify-center gap-2">
                 <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl"><Target size={16} /></div>
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">אחוז מסך ההוצאות</p>
                 <h4 className="text-2xl font-black text-gray-800 dark:text-white">{Math.round(categorySummary.percentOfExpenses)}%</h4>
              </div>
              <div className="bg-white dark:bg-[#1e1e1e] p-6 rounded-[32px] border border-gray-100 dark:border-white/5 shadow-sm flex flex-col items-center justify-center gap-2">
                 <div className="p-2 bg-purple-500/10 text-purple-500 rounded-xl"><Hash size={16} /></div>
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">מספר תנועות</p>
                 <h4 className="text-2xl font-black text-gray-800 dark:text-white">{categorySummary.count}</h4>
              </div>
              <div className="bg-white dark:bg-[#1e1e1e] p-6 rounded-[32px] border border-gray-100 dark:border-white/5 shadow-sm flex flex-col items-center justify-center gap-2">
                 <div className="p-2 bg-orange-500/10 text-orange-500 rounded-xl"><TrendingUp size={16} /></div>
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ממוצע לתנועה</p>
                 <h4 className="text-2xl font-black text-gray-800 dark:text-white" dir="ltr">₪{Math.round(categorySummary.avg).toLocaleString()}</h4>
              </div>
            </div>

            <div className="bg-white dark:bg-[#1e1e1e] rounded-[48px] p-8 md:p-12 border-2 border-brand/20 shadow-2xl overflow-hidden">
               <div className="flex items-center justify-between mb-10">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-brand/10 text-brand rounded-2xl flex items-center justify-center"><ShoppingIcon size={28} /></div>
                    <div>
                      <h3 className="text-2xl font-black text-gray-800 dark:text-white">
                        פירוט מלא: {categoryData.find(c => c.id === selectedCategoryId)?.name}
                      </h3>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        סוף חודש {months[selectedMonth]} {selectedYear}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedCategoryId(null)}
                    className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl text-gray-400 hover:text-rose-500 transition-all active:scale-95"
                  >
                    <X size={24} />
                  </button>
               </div>

               <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full text-right border-collapse">
                    <thead>
                      <tr className="text-[11px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-white/5">
                        <th className="py-6 px-4">תאריך</th>
                        <th className="py-6 px-4">תיאור הפעולה</th>
                        <th className="py-6 px-4">אופן תשלום</th>
                        <th className="py-6 px-4 text-left">סכום</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                      {selectedCategoryTransactions.map(t => (
                        <tr key={t.id} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-all group">
                          <td className="py-6 px-4">
                            <span className="text-xs font-black text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-white/5 px-3 py-1.5 rounded-xl shadow-sm" dir="ltr">
                              {t.date.split('-').reverse().join('/')}
                            </span>
                          </td>
                          <td className="py-6 px-4 font-black text-gray-700 dark:text-gray-200 text-lg">{t.description}</td>
                          <td className="py-6 px-4">
                             <div className="flex items-center gap-2.5 text-xs font-bold text-gray-400">
                               <div className="p-2 bg-gray-50 dark:bg-white/5 rounded-lg">{PAYMENT_METHODS.find(pm => pm.id === t.paymentMethod)?.icon}</div>
                               {PAYMENT_METHODS.find(pm => pm.id === t.paymentMethod)?.label}
                             </div>
                          </td>
                          <td className="py-6 px-4 font-black text-gray-900 dark:text-white text-2xl text-left" dir="ltr">₪{t.amount.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Income vs Expenses Chart */}
        <div className="bg-white dark:bg-[#1e1e1e] rounded-[48px] p-10 border border-gray-100 dark:border-white/5 shadow-sm">
           <div className="flex items-center gap-4 mb-10">
             <div className="w-12 h-12 bg-gray-50 dark:bg-white/5 text-brand rounded-2xl flex items-center justify-center"><ArrowRightLeft size={24} /></div>
             <div>
               <h3 className="text-xl font-black text-gray-800 dark:text-white">הכנסות מול הוצאות</h3>
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">מאזן חודשי כולל</p>
             </div>
           </div>
           
           <div className="h-[280px] w-full" dir="ltr">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={[{ name: months[selectedMonth], הכנסות: summary.income, הוצאות: summary.expense }]}>
                 <XAxis dataKey="name" hide />
                 <YAxis axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 10, fontWeight: 800}} />
                 <Tooltip contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)'}} />
                 <Bar dataKey="הכנסות" fill="#00b894" radius={[15, 15, 0, 0]} barSize={60} />
                 <Bar dataKey="הוצאות" fill="#ff7675" radius={[15, 15, 0, 0]} barSize={60} />
               </BarChart>
             </ResponsiveContainer>
           </div>
           
           <div className="grid grid-cols-2 gap-6 mt-6">
              <div className="p-5 bg-emerald-50 dark:bg-brand/10 rounded-3xl text-center">
                 <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">נטו שנשאר</p>
                 <h4 className="text-2xl font-black text-brand" dir="ltr">₪{(summary.income - summary.expense).toLocaleString()}</h4>
              </div>
              <div className="p-5 bg-gray-50 dark:bg-white/5 rounded-3xl text-center">
                 <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">יחס חיסכון</p>
                 <h4 className="text-2xl font-black text-gray-800 dark:text-white">{summary.savingsRate}%</h4>
              </div>
           </div>
        </div>

        {/* Payment Methods Chart */}
        <div className="bg-white dark:bg-[#1e1e1e] rounded-[48px] p-10 border border-gray-100 dark:border-white/5 shadow-sm">
           <div className="flex items-center gap-4 mb-10">
             <div className="w-12 h-12 bg-gray-50 dark:bg-white/5 text-brand rounded-2xl flex items-center justify-center"><CreditCard size={24} /></div>
             <div>
               <h3 className="text-xl font-black text-gray-800 dark:text-white">אופן תשלום</h3>
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">היכן הכסף עובר?</p>
             </div>
           </div>
           
           <div className="h-[280px] w-full" dir="ltr">
             {paymentMethodData.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                    <Pie 
                      data={paymentMethodData} 
                      cx="50%" 
                      cy="50%" 
                      innerRadius={60} 
                      outerRadius={90} 
                      paddingAngle={5} 
                      dataKey="value" 
                      stroke="none"
                    >
                      {paymentMethodData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={['#00b894', '#0984e3', '#fdcb6e', '#6c5ce7', '#e17055', '#e84393'][index % 6]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{borderRadius: '20px', border: 'none'}} />
                    <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{fontSize: '10px', fontWeight: 800, paddingTop: '20px'}} />
                 </PieChart>
               </ResponsiveContainer>
             ) : (
                <div className="h-full flex flex-col items-center justify-center opacity-30">
                  <CreditCard size={60} />
                  <p className="font-black text-sm italic mt-2">אין נתונים.</p>
                </div>
             )}
           </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Analytics;
