
import React, { useState, useMemo, useRef, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserState, Transaction } from '../types';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  Plus, Sparkles, List, Activity, 
  Edit2, Trash2, Calendar, ChevronDown,
  X, AlertCircle, Bot, Search, Scissors,
  Send, Loader2, Target, Check, LineChart, 
  Shield, Flame, Trophy, TrendingUp, ArrowUpRight, ArrowDownRight,
  Filter, ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';

interface DashboardProps {
  state: UserState;
  onAddClick: () => void;
  onEditTransaction: (t: Transaction) => void;
  onDeleteTransaction: (id: string, deleteFuture?: boolean) => void;
  isDarkMode: boolean;
}

interface FinancialReport {
  title: string;
  score: number;
  summary: string;
  preservationPoints: string[]; 
  improvementPoints: string[];  
  categoryCutting: { category: string; currentStatus: string; advice: string; expectedSaving: string }[];
  efficiencyRoadmap: { phase: string; actions: string[] }[];
  projectedSavings: string;
}

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

// Memoized Score Component - Prevents re-render when chat input changes
const PremiumScoreCircle = memo(({ score }: { score: number }) => {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score > 80 ? '#00b894' : score > 60 ? '#0984e3' : score > 40 ? '#f39c12' : '#e74c3c';

  return (
    <div className="relative flex flex-col items-center justify-center w-48 h-48 md:w-64 md:h-64 mx-auto my-4">
      <svg className="w-full h-full transform -rotate-90">
        <circle cx="50%" cy="50%" r={radius} stroke="currentColor" strokeWidth="12" fill="transparent" className="text-gray-100 dark:text-white/5" />
        <motion.circle 
          cx="50%" cy="50%" r={radius} stroke={color} strokeWidth="14" fill="transparent"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-5xl md:text-7xl font-black text-gray-800 dark:text-white tabular-nums leading-none tracking-tighter">
          {score}
        </span>
        <span className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mt-2 md:mt-3">Health Index</span>
      </div>
    </div>
  );
});

const Dashboard: React.FC<DashboardProps> = ({ 
  state, 
  onAddClick, 
  onEditTransaction, 
  onDeleteTransaction, 
  isDarkMode 
}) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [reportData, setReportData] = useState<FinancialReport | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [mobileReportTab, setMobileReportTab] = useState<'report' | 'chat'>('report');
  const [reportError, setReportError] = useState<string | null>(null);
  
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [filters, setFilters] = useState({ 
    description: '', 
    type: 'all', 
    category: 'all',
    day: 'all',
    sortBy: 'date',
    sortOrder: 'desc' as 'asc' | 'desc'
  });

  const activeFiltersCount = [
    filters.type !== 'all',
    filters.category !== 'all',
    filters.day !== 'all',
    filters.sortBy !== 'date' || filters.sortOrder !== 'desc'
  ].filter(Boolean).length;

  const months = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
  const years = useMemo(() => Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i), []);

  const fullMonthTransactions = useMemo(() => 
    state.transactions.filter(t => {
      const parts = t.date.split('-');
      return parseInt(parts[1]) - 1 === selectedMonth && parseInt(parts[0]) === selectedYear;
    }),
    [state.transactions, selectedMonth, selectedYear]
  );

  // Compute available days of the selected month that actually have transactions
  const availableDays = useMemo(() => {
    const days = new Set<string>();
    fullMonthTransactions.forEach(t => {
      const parts = t.date.split('-');
      if (parts[2]) {
        days.add(parseInt(parts[2]).toString());
      }
    });
    return Array.from(days).sort((a, b) => parseInt(a) - parseInt(b));
  }, [fullMonthTransactions]);

  const displayTransactions = useMemo(() => {
    let result = fullMonthTransactions.filter(t => {
      const parts = t.date.split('-');
      const tDay = parts[2] ? parseInt(parts[2]).toString() : '';

      const matchesDesc = t.description.toLowerCase().includes(filters.description.toLowerCase()) ||
                          t.categoryName?.toLowerCase().includes(filters.description.toLowerCase());
      const matchesType = filters.type === 'all' || t.type === filters.type;
      const matchesCat = filters.category === 'all' || t.categoryId === filters.category;
      const matchesDay = filters.day === 'all' || tDay === filters.day;

      return matchesDesc && matchesType && matchesCat && matchesDay;
    });

    // Sort transactions
    result.sort((a, b) => {
      let comparison = 0;
      if (filters.sortBy === 'date') {
        comparison = a.date.localeCompare(b.date);
      } else if (filters.sortBy === 'description') {
        comparison = a.description.localeCompare(b.description);
      } else if (filters.sortBy === 'category') {
        const catA = a.categoryName || '';
        const catB = b.categoryName || '';
        comparison = catA.localeCompare(catB);
      } else if (filters.sortBy === 'amount') {
        comparison = a.amount - b.amount;
      }

      return filters.sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [fullMonthTransactions, filters]);

  const summary = useMemo(() => {
    return fullMonthTransactions.reduce((acc, t) => {
      if (t.type === 'income') acc.income += t.amount;
      else acc.expense += t.amount;
      return acc;
    }, { income: 0, expense: 0 });
  }, [fullMonthTransactions]);

  const monthBalance = summary.income - summary.expense;
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const now = new Date();
  
  const isCurrentMonth = now.getMonth() === selectedMonth && now.getFullYear() === selectedYear;
  const isFutureMonth = selectedYear > now.getFullYear() || (selectedYear === now.getFullYear() && selectedMonth > now.getMonth());
  
  let daysRemaining = 0;
  let daysDivisor = 1;

  if (isCurrentMonth) {
    const currentDay = now.getDate();
    daysRemaining = Math.max(daysInMonth - currentDay, 0);
    daysDivisor = Math.max(daysInMonth - currentDay + 1, 1); // include today
  } else if (isFutureMonth) {
    daysRemaining = daysInMonth;
    daysDivisor = daysInMonth;
  } else {
    // Past month
    daysRemaining = 0;
    daysDivisor = daysInMonth; // calculate average daily surplus over the entire month
  }

  // Smart calculations for budgets and actual spent
  const totalBudgetsLimit = state.budgets.reduce((sum, b) => sum + b.amount, 0);
  const totalMonthlyLimit = totalBudgetsLimit > 0 ? totalBudgetsLimit : summary.income;
  const remainingDailyBudget = totalMonthlyLimit > 0 ? Math.max(0, (totalMonthlyLimit - summary.expense) / daysDivisor) : 0;

  const daysPassed = isCurrentMonth ? Math.max(now.getDate(), 1) : (isFutureMonth ? 1 : daysInMonth);
  const averageDailySpend = summary.expense / daysPassed;

  const handleHeaderSort = (field: 'date' | 'description' | 'category' | 'amount') => {
    setFilters(prev => ({
      ...prev,
      sortBy: field,
      sortOrder: prev.sortBy === field ? (prev.sortOrder === 'asc' ? 'desc' : 'asc') : 'desc'
    }));
  };

  const topCategories = useMemo(() => {
    const cats: Record<string, {name: string, value: number, color: string}> = {};
    fullMonthTransactions.filter(t => t.type === 'expense').forEach(t => {
      if (!cats[t.categoryId]) {
        cats[t.categoryId] = { 
          name: t.categoryName, 
          value: 0, 
          color: state.categories.find(c => c.id === t.categoryId)?.color || '#ccc'
        };
      }
      cats[t.categoryId].value += t.amount;
    });
    return Object.values(cats).sort((a, b) => b.value - a.value);
  }, [fullMonthTransactions, state.categories]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const generateFinancialReport = async () => {
    setIsGeneratingReport(true);
    setShowReportModal(true);
    setReportData(null);
    setReportError(null);
    setChatMessages([]);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const promptData = {
        period: `${months[selectedMonth]} ${selectedYear}`,
        income: summary.income,
        expense: summary.expense,
        balance: monthBalance,
        categories: topCategories,
        goals: state.goals.map(g => ({ title: g.title, target: g.targetAmount, current: g.currentAmount })),
        topExpenses: fullMonthTransactions.filter(t => t.type === 'expense').sort((a,b) => b.amount - a.amount).slice(0, 15)
      };
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analyze performance for ${promptData.period}: ${JSON.stringify(promptData)}. Direct Hebrew response.`,
        config: {
          systemInstruction: "You are the SmartWise Elite CFO. Professional, high-level Hebrew. Provide a surgical optimization report. MANDATORY: Analyze current status per category and provide EXACT amount reduction strategies for each main category. Tonality: Elite, actionable, surgical.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              score: { type: Type.NUMBER },
              summary: { type: Type.STRING },
              preservationPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
              improvementPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
              categoryCutting: { 
                type: Type.ARRAY, 
                items: { 
                  type: Type.OBJECT,
                  properties: {
                    category: { type: Type.STRING },
                    currentStatus: { type: Type.STRING },
                    advice: { type: Type.STRING },
                    expectedSaving: { type: Type.STRING }
                  }
                }
              },
              efficiencyRoadmap: { 
                type: Type.ARRAY, 
                items: { 
                  type: Type.OBJECT,
                  properties: { phase: { type: Type.STRING }, actions: { type: Type.ARRAY, items: { type: Type.STRING } } }
                }
              },
              projectedSavings: { type: Type.STRING }
            },
            required: ["title", "score", "summary", "preservationPoints", "improvementPoints", "categoryCutting", "efficiencyRoadmap", "projectedSavings"]
          }
        }
      });
      
      if (response.text) {
        setReportData(JSON.parse(response.text));
        setChatMessages([{ role: 'model', text: `הניתוח האסטרטגי עבור ${months[selectedMonth]} מוכן. זיהיתי פוטנציאל לחיסכון של כ-₪${JSON.parse(response.text).projectedSavings} בחודש. איך תרצו שנתחיל ביישום?` }]);
      }
    } catch (error) { 
      console.error(error);
      setReportError("שגיאה בחיבור ל-CFO Elite. נסו שוב בעוד מספר שניות.");
    } finally { setIsGeneratingReport(false); }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsChatLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Context: ${JSON.stringify({summary, balance: monthBalance})}. User: "${userMsg}"`,
        config: { systemInstruction: "SmartWise Elite CFO Hub. Professional financial advisor. Focus on strategic Hebrew advice.", thinkingConfig: { thinkingBudget: 0 } }
      });
      setChatMessages(prev => [...prev, { role: 'model', text: response.text || 'משהו השתבש בשידור.' }]);
    } catch (error) { console.error(error); } finally { setIsChatLoading(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-8 text-right max-w-7xl mx-auto">
      {/* Date Picker Modal */}
      <AnimatePresence>
        {isPickerOpen && (
          <div className="fixed inset-0 z-[2100] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsPickerOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-xl" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative w-full sm:max-w-sm bg-white dark:bg-[#1a1a1a] rounded-t-[32px] sm:rounded-[40px] p-6 sm:p-8 shadow-2xl border border-white/5 max-h-[85dvh] overflow-y-auto no-scrollbar">
              <div className="w-10 h-1.5 bg-gray-200 dark:bg-white/15 rounded-full mx-auto mb-4 sm:hidden" />
              <div className="space-y-5">
                <div className="text-center"><h3 className="text-xl sm:text-2xl font-black">בחר חודש ושנה</h3></div>
                <div className="space-y-4">
                  <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 mr-2">שנה</label><div className="grid grid-cols-3 gap-2">{years.map(y => <button key={y} onClick={() => setSelectedYear(y)} className={`py-2.5 rounded-2xl font-black text-sm transition-all min-h-[42px] ${selectedYear === y ? 'bg-brand text-white shadow-lg' : 'bg-gray-50 dark:bg-white/5 text-gray-500'}`}>{y}</button>)}</div></div>
                  <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 mr-2">חודש</label><div className="grid grid-cols-3 gap-2">{months.map((m, i) => <button key={m} onClick={() => { setSelectedMonth(i); setIsPickerOpen(false); }} className={`py-2.5 rounded-xl font-black text-xs transition-all min-h-[42px] ${selectedMonth === i ? 'bg-brand text-white shadow-lg' : 'bg-gray-50 dark:bg-white/5 text-gray-500'}`}>{m}</button>)}</div></div>
                </div>
                <button onClick={() => setIsPickerOpen(false)} className="w-full py-4 bg-brand text-white rounded-2xl font-black shadow-xl min-h-[48px]">אישור</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Report Modal - Tabbed on Mobile, Split on Desktop */}
      <AnimatePresence>
        {showReportModal && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-0 md:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowReportModal(false)} className="absolute inset-0 bg-black/95 backdrop-blur-3xl" />
            <motion.div initial={{ scale: 0.96, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0, y: 20 }} className="relative w-full h-[100dvh] md:h-auto md:max-w-7xl bg-white dark:bg-[#0a0a0a] md:rounded-[56px] shadow-2xl border border-white/10 overflow-hidden flex flex-col md:max-h-[94dvh]" dir="rtl">
               <div className="px-4 py-3.5 sm:p-6 md:p-8 flex justify-between items-center shrink-0 border-b border-gray-100 dark:border-white/5">
                 <button onClick={() => setShowReportModal(false)} aria-label="סגור" className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-gray-50 dark:bg-white/5 rounded-full hover:bg-gray-200 transition-colors"><X size={20} className="text-gray-500" /></button>
                 <div className="flex items-center gap-3">
                   <div className="text-right"><h3 className="font-black text-base sm:text-xl md:text-2xl text-gray-800 dark:text-white leading-none">SmartWise Elite Hub</h3><p className="text-[10px] font-bold text-brand uppercase tracking-widest mt-1">Surgical AI Optimization</p></div>
                   <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-brand text-white rounded-2xl md:rounded-[24px] flex items-center justify-center shadow-lg shadow-brand/20 shrink-0"><Bot size={24} /></div>
                 </div>
               </div>

               {/* Mobile Mode Switcher (eliminates double scroll) */}
               <div className="md:hidden px-4 py-2.5 bg-gray-50 dark:bg-[#121212] border-b border-gray-100 dark:border-white/5 shrink-0">
                 <div className="grid grid-cols-2 gap-1.5 bg-gray-200/60 dark:bg-white/5 p-1 rounded-2xl">
                   <button
                     onClick={() => setMobileReportTab('report')}
                     className={`py-2.5 rounded-xl font-black text-xs transition-all min-h-[40px] ${mobileReportTab === 'report' ? 'bg-white dark:bg-[#1e1e1e] text-brand shadow-sm' : 'text-gray-500'}`}
                   >
                     דוח אסטרטגי
                   </button>
                   <button
                     onClick={() => setMobileReportTab('chat')}
                     className={`py-2.5 rounded-xl font-black text-xs transition-all min-h-[40px] ${mobileReportTab === 'chat' ? 'bg-white dark:bg-[#1e1e1e] text-brand shadow-sm' : 'text-gray-500'}`}
                   >
                     שיחה עם CFO ({chatMessages.length})
                   </button>
                 </div>
               </div>
               
               <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                 {/* Report Content Panel */}
                 <div className={`${mobileReportTab === 'report' ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-[60%] border-l border-gray-100 dark:border-white/5 overflow-y-auto custom-scrollbar p-4 sm:p-8 md:p-12 bg-gray-50/40 dark:bg-black/20 space-y-8 md:space-y-12 pb-12 flex-1`}>
                    {isGeneratingReport ? (
                      <div className="flex flex-col items-center justify-center h-full space-y-6 py-16">
                         <div className="relative"><div className="w-20 h-20 md:w-24 md:h-24 border-4 border-brand/20 border-t-brand rounded-full animate-spin" /><Bot size={32} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-brand animate-pulse" /></div>
                         <div className="text-center space-y-2"><p className="text-lg sm:text-xl font-black text-gray-800 dark:text-white">מנתח אסטרטגיה אישית...</p><p className="text-sm font-bold text-gray-400">ה-Elite Agent מחבר בין התנועות ליעדים שלך.</p></div>
                      </div>
                    ) : reportData ? (
                      <div className="space-y-8 md:space-y-12">
                         {/* Header & Score */}
                         <div className="bg-white dark:bg-white/5 p-6 sm:p-8 md:p-12 rounded-[32px] md:rounded-[48px] border border-gray-100 dark:border-white/5 shadow-sm text-center flex flex-col items-center gap-4 relative overflow-hidden">
                            <PremiumScoreCircle score={reportData.score} />
                            <div className="relative z-10 space-y-2">
                              <h4 className="font-black text-2xl sm:text-3xl md:text-4xl text-gray-800 dark:text-white leading-tight">{reportData.title}</h4>
                              <p className="text-sm md:text-base font-bold text-gray-500 dark:text-gray-400 leading-relaxed max-w-lg mx-auto italic">"{reportData.summary}"</p>
                            </div>
                         </div>

                         {/* Preservation & Improvement */}
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                            <div className="bg-white dark:bg-emerald-900/10 p-6 md:p-8 rounded-[32px] md:rounded-[40px] border border-emerald-100 dark:border-emerald-500/10 space-y-4">
                               <div className="flex items-center gap-3 text-emerald-600 font-black text-sm uppercase tracking-[0.2em]"><Shield size={20} /> מה לשמר</div>
                               <ul className="space-y-3">{reportData.preservationPoints.map((p, i) => <li key={i} className="text-sm font-bold text-gray-700 dark:text-gray-200 flex gap-3 leading-relaxed"><span className="w-2 h-2 rounded-full bg-emerald-500 mt-2 shrink-0" /> {p}</li>)}</ul>
                            </div>
                            <div className="bg-white dark:bg-rose-900/10 p-6 md:p-8 rounded-[32px] md:rounded-[40px] border border-rose-100 dark:border-rose-500/10 space-y-4">
                               <div className="flex items-center gap-3 text-rose-500 font-black text-sm uppercase tracking-[0.2em]"><AlertCircle size={20} /> מה לשפר</div>
                               <ul className="space-y-3">{reportData.improvementPoints.map((p, i) => <li key={i} className="text-sm font-bold text-gray-700 dark:text-gray-200 flex gap-3 leading-relaxed"><span className="w-2 h-2 rounded-full bg-rose-500 mt-2 shrink-0" /> {p}</li>)}</ul>
                            </div>
                         </div>

                         {/* Surgical Category Cutting Plan */}
                         <div className="bg-gray-900 rounded-[32px] md:rounded-[48px] p-6 sm:p-8 md:p-12 text-white space-y-6 md:space-y-10 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-5 rotate-12"><Scissors size={180} /></div>
                            <div className="flex items-center gap-3 text-brand font-black text-xl sm:text-2xl relative z-10"><Scissors size={24} /> תוכנית קיצוץ קטגוריאלית</div>
                            <div className="grid gap-4 relative z-10">
                               {reportData.categoryCutting.map((c, i) => (
                                 <div key={i} className="bg-white/5 hover:bg-white/10 p-5 rounded-[24px] border border-white/5 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                    <div className="space-y-1.5 flex-1">
                                       <div className="flex flex-wrap items-center gap-2"><span className="px-2 py-0.5 bg-brand text-gray-900 text-[10px] font-black rounded-md">{c.category}</span><p className="text-xs font-bold text-gray-400">{c.currentStatus}</p></div>
                                       <p className="text-sm sm:text-base font-black text-gray-100 leading-snug">{c.advice}</p>
                                    </div>
                                    <div className="bg-brand/20 text-brand px-4 py-2 rounded-xl font-black text-xs sm:text-sm whitespace-nowrap">חיסכון: ₪{c.expectedSaving}</div>
                                 </div>
                               ))}
                            </div>
                         </div>

                         {/* Efficiency Roadmap */}
                         <div className="space-y-6">
                            <div className="flex items-center gap-3 text-gray-800 dark:text-white font-black text-xl sm:text-2xl"><Activity size={24} /> מפת דרכים אסטרטגית</div>
                            <div className="grid gap-4">
                               {reportData.efficiencyRoadmap.map((phase, i) => (
                                 <div key={i} className="bg-white dark:bg-white/5 p-6 md:p-8 rounded-[28px] md:rounded-[40px] border border-gray-100 dark:border-white/5 space-y-4">
                                    <div className="flex items-center gap-3 font-black text-brand text-base sm:text-lg"><div className="w-9 h-9 rounded-xl bg-brand text-white flex items-center justify-center shadow-lg shadow-brand/20 shrink-0">{i+1}</div> {phase.phase}</div>
                                    <div className="grid gap-3 pr-4 sm:pr-12">
                                       {phase.actions.map((act, j) => <div key={j} className="text-sm font-bold text-gray-600 dark:text-gray-300 flex items-start gap-3"><Check size={16} className="text-brand shrink-0 mt-0.5" /> {act}</div>)}
                                    </div>
                                 </div>
                               ))}
                            </div>
                         </div>

                         {/* Projected Savings Total */}
                         <div className="bg-brand text-gray-900 p-8 md:p-10 rounded-[32px] md:rounded-[48px] text-center shadow-2xl shadow-brand/20">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-2 opacity-70">פוטנציאל חיסכון חודשי מיידי</p>
                            <h3 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter tabular-nums" dir="ltr">₪{reportData.projectedSavings}</h3>
                         </div>
                      </div>
                    ) : reportError ? (
                      <div className="flex flex-col items-center justify-center h-full space-y-5 py-16 text-center">
                        <div className="w-16 h-16 rounded-3xl bg-rose-50 dark:bg-rose-900/20 text-rose-500 flex items-center justify-center"><AlertCircle size={32} /></div>
                        <div className="space-y-2 max-w-sm">
                          <h4 className="text-xl font-black text-gray-800 dark:text-white">תקלת חיבור זמנית</h4>
                          <p className="text-sm font-bold text-gray-400">{reportError}</p>
                        </div>
                        <button onClick={generateFinancialReport} className="px-6 py-3 min-h-[44px] bg-brand text-white rounded-2xl font-black text-sm shadow-lg">נסה שוב</button>
                      </div>
                    ) : null}
                 </div>

                 {/* Interaction Chat Panel */}
                 <div className={`${mobileReportTab === 'chat' ? 'flex' : 'hidden'} md:flex flex-1 flex-col bg-white dark:bg-[#080808] border-r border-gray-100 dark:border-white/5 h-full overflow-hidden`}>
                   <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 md:p-10 space-y-5">
                      <div className="flex items-center justify-center py-2"><div className="px-4 py-1.5 bg-gray-50 dark:bg-white/5 rounded-full text-[10px] font-black text-gray-400 uppercase tracking-widest border border-gray-100 dark:border-white/5">CFO Secure Connection</div></div>
                      {chatMessages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                           <div className={`max-w-[88%] p-4 sm:p-5 rounded-[24px] text-sm font-bold shadow-sm leading-relaxed ${msg.role === 'user' ? 'bg-brand text-white rounded-br-none' : 'bg-gray-100 dark:bg-white/5 text-gray-800 dark:text-gray-100 rounded-bl-none border border-gray-100 dark:border-white/10'}`}>{msg.text}</div>
                        </div>
                      ))}
                      {isChatLoading && <div className="flex justify-end p-4"><Loader2 className="animate-spin text-brand" /></div>}
                      <div ref={chatEndRef} />
                   </div>
                   <div className="p-4 sm:p-6 bg-white dark:bg-[#080808] border-t border-gray-100 dark:border-white/5 shrink-0 pb-[calc(1rem+env(safe-area-inset-bottom))] md:pb-6">
                      <div className="relative group">
                        <textarea 
                          rows={2}
                          placeholder="שאלו את ה-CFO: 'איך לצמצם בקניות?'..." 
                          value={chatInput} 
                          onChange={e => setChatInput(e.target.value)} 
                          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())} 
                          className="w-full bg-gray-50 dark:bg-white/10 border-none rounded-[24px] px-5 py-3.5 font-bold text-base outline-none pr-5 pl-16 resize-none overflow-y-auto shadow-inner"
                        />
                        <button onClick={handleSendMessage} aria-label="שלח הודעה" className="absolute left-2.5 bottom-2.5 w-11 h-11 bg-brand text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all"><Send size={18} /></button>
                      </div>
                   </div>
                 </div>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-black text-gray-800 dark:text-white tracking-tight">היי {state.profile?.name?.split(' ')[0] || 'משפחה'},</h1>
          <button onClick={() => setIsPickerOpen(true)} className="flex items-center gap-2 text-brand font-black hover:opacity-80 transition-all text-base sm:text-lg min-h-[40px]">
            <Calendar size={20} /><span>{months[selectedMonth]} {selectedYear}</span><ChevronDown size={16} className={`${isPickerOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
        <button onClick={onAddClick} className="w-full sm:w-auto bg-brand text-white px-7 py-3.5 rounded-2xl font-black shadow-lg shadow-brand/20 flex items-center justify-center gap-2 min-h-[48px]">
          <Plus size={18} strokeWidth={3} /> תנועה חדשה
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-6">
        <div className="lg:col-span-8 bg-white dark:bg-[#1e1e1e] rounded-[32px] md:rounded-[48px] p-6 sm:p-8 md:p-12 border border-gray-100 dark:border-white/5 shadow-sm relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 rounded-full blur-[100px] -mr-32 -mt-32" />
           <div className="space-y-1.5 relative z-10">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">יתרה חודשית סופית</span>
              <h2 className={`text-4xl sm:text-6xl md:text-7xl xl:text-8xl font-black tracking-tighter tabular-nums ${monthBalance < 0 ? 'text-rose-500' : 'text-gray-800 dark:text-white'}`} dir="ltr">₪{monthBalance.toLocaleString()}</h2>
           </div>
           <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 mt-8 md:mt-12 relative z-10">
              <div className="bg-gray-50/70 dark:bg-white/5 p-3.5 sm:p-4 md:p-5 rounded-2xl sm:rounded-3xl text-center flex flex-col justify-center">
                <p className="text-[10px] font-black text-gray-400 mb-1 leading-tight">
                  {totalMonthlyLimit > 0 ? "תקציב יומי נותר" : "הוצאה ממוצעת ליום"}
                </p>
                <span className="text-base sm:text-lg md:text-xl font-black text-brand tabular-nums" dir="ltr">
                  ₪{Math.round(totalMonthlyLimit > 0 ? remainingDailyBudget : averageDailySpend)}
                </span>
                {totalMonthlyLimit > 0 && (
                  <span className="text-[10px] font-bold text-gray-400 mt-0.5 tabular-nums">
                    ממוצע: ₪{Math.round(averageDailySpend)}
                  </span>
                )}
              </div>
              <div className="bg-gray-50/70 dark:bg-white/5 p-3.5 sm:p-4 md:p-5 rounded-2xl sm:rounded-3xl text-center flex flex-col justify-center"><p className="text-[10px] font-black text-gray-400 mb-1">הכנסות</p><span className="text-base sm:text-lg md:text-xl font-black text-emerald-500 tabular-nums" dir="ltr">₪{summary.income.toLocaleString()}</span></div>
              <div className="bg-gray-50/70 dark:bg-white/5 p-3.5 sm:p-4 md:p-5 rounded-2xl sm:rounded-3xl text-center flex flex-col justify-center"><p className="text-[10px] font-black text-gray-400 mb-1">הוצאות</p><span className="text-base sm:text-lg md:text-xl font-black text-gray-700 dark:text-gray-200 tabular-nums" dir="ltr">₪{summary.expense.toLocaleString()}</span></div>
              <div className="bg-gray-50/70 dark:bg-white/5 p-3.5 sm:p-4 md:p-5 rounded-2xl sm:rounded-3xl text-center flex flex-col justify-center"><p className="text-[10px] font-black text-gray-400 mb-1">ימים לסוף</p><span className="text-base sm:text-lg md:text-xl font-black tabular-nums">{daysRemaining}</span></div>
           </div>
        </div>

        <div className="lg:col-span-4 bg-[#0a1120] rounded-[32px] md:rounded-[48px] p-6 sm:p-8 text-white relative overflow-hidden flex flex-col justify-between border border-white/5 shadow-2xl group lg:min-h-[280px]">
           <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform"><Bot size={110} /></div>
           <div className="relative z-10 space-y-3">
              <div className="w-11 h-11 md:w-14 md:h-14 bg-brand text-white rounded-2xl flex items-center justify-center shadow-lg"><Sparkles size={24} /></div>
              <div><h4 className="text-xl sm:text-2xl font-black mb-1">CFO Elite Hub</h4><p className="text-gray-400 text-xs sm:text-sm font-medium leading-relaxed">ניתוח אסטרטגי פרימיום המבוסס על היעדים וההוצאות שלכם.</p></div>
           </div>
           <button onClick={generateFinancialReport} className="w-full py-4 bg-white text-[#0a1120] font-black rounded-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 relative z-10 mt-5 shadow-xl min-h-[50px]">
              <LineChart size={20} /><span>ניתוח מעמיק ושיחת ייעוץ</span>
           </button>
        </div>
      </div>

      <div className="bg-white dark:bg-[#1e1e1e] rounded-[32px] md:rounded-[48px] p-5 sm:p-6 md:p-10 border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden">
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 mb-5 md:mb-8">
            <div className="flex items-center gap-3 sm:gap-4">
               <div className="w-11 h-11 bg-brand/10 text-brand rounded-2xl flex items-center justify-center shadow-inner shrink-0"><List size={22} /></div>
               <div><h3 className="text-lg sm:text-xl font-black text-gray-800 dark:text-white">יומן תנועות חודשי</h3><p className="text-[10px] text-gray-400 font-bold uppercase">סקירה וחיפוש פעולות</p></div>
            </div>
            <div className="flex items-center gap-2 w-full md:max-w-md">
              <div className="flex-1 relative">
                 <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                 <input 
                   type="text" 
                   placeholder="חיפוש תנועה..." 
                   value={filters.description}
                   onChange={e => setFilters({...filters, description: e.target.value})}
                   className="w-full bg-gray-50 dark:bg-white/5 border-none rounded-2xl pr-11 pl-4 py-3.5 font-bold text-sm outline-none focus:ring-2 focus:ring-brand/20 transition-all min-h-[48px]"
                 />
              </div>
              <button
                onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                className={`md:hidden px-4 min-h-[48px] rounded-2xl border font-black text-xs flex items-center gap-2 shrink-0 transition-colors ${isFiltersOpen || activeFiltersCount > 0 ? 'bg-brand text-white border-brand' : 'bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-300 border-transparent'}`}
              >
                <Filter size={16} />
                <span>סינון{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ''}</span>
              </button>
            </div>
         </div>
         
         {/* Advanced Filtering & Sorting Controls - Collapsible on mobile, visible on md+ */}
         <div className={`${isFiltersOpen ? 'grid' : 'hidden'} md:grid mb-6 md:mb-8 grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4 bg-gray-50/70 dark:bg-white/5 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-100 dark:border-white/10 text-right`}>
            {/* filter type */}
            <div className="flex flex-col gap-1.5">
               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">סוג תנועה</label>
               <select 
                  value={filters.type}
                  onChange={e => setFilters({...filters, type: e.target.value})}
                  className="bg-white dark:bg-[#121212] border border-gray-100 dark:border-white/10 px-3 py-3 rounded-xl sm:rounded-2xl font-bold text-xs text-gray-700 dark:text-gray-200 outline-none cursor-pointer focus:border-brand min-h-[44px]"
               >
                  <option value="all">כל התנועות</option>
                  <option value="expense">הוצאות בלבד</option>
                  <option value="income">הכנסות בלבד</option>
               </select>
            </div>

            {/* filter category */}
            <div className="flex flex-col gap-1.5">
               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">קטגוריה</label>
               <select 
                  value={filters.category}
                  onChange={e => setFilters({...filters, category: e.target.value})}
                  className="bg-white dark:bg-[#121212] border border-gray-100 dark:border-white/10 px-3 py-3 rounded-xl sm:rounded-2xl font-bold text-xs text-gray-700 dark:text-gray-200 outline-none cursor-pointer focus:border-brand min-h-[44px]"
               >
                  <option value="all">כל הקטגוריות</option>
                  {state.categories.map(cat => (
                     <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
               </select>
            </div>

            {/* filter day of month */}
            <div className="flex flex-col gap-1.5">
               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">יום בחודש</label>
               <select 
                  value={filters.day}
                  onChange={e => setFilters({...filters, day: e.target.value})}
                  className="bg-white dark:bg-[#121212] border border-gray-100 dark:border-white/10 px-3 py-3 rounded-xl sm:rounded-2xl font-bold text-xs text-gray-700 dark:text-gray-200 outline-none cursor-pointer focus:border-brand min-h-[44px]"
               >
                  <option value="all">כל הימים</option>
                  {availableDays.map(d => (
                     <option key={d} value={d}>{d}</option>
                  ))}
               </select>
            </div>

            {/* sort by */}
            <div className="flex flex-col gap-1.5">
               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">מיון לפי</label>
               <select 
                  value={filters.sortBy}
                  onChange={e => setFilters({...filters, sortBy: e.target.value})}
                  className="bg-white dark:bg-[#121212] border border-gray-100 dark:border-white/10 px-3 py-3 rounded-xl sm:rounded-2xl font-bold text-xs text-gray-700 dark:text-gray-200 outline-none cursor-pointer focus:border-brand min-h-[44px]"
               >
                  <option value="date">תאריך</option>
                  <option value="amount">סכום (מחיר)</option>
                  <option value="category">קטגוריה</option>
                  <option value="description">תיאור</option>
               </select>
            </div>

            {/* sort order */}
            <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">סדר מיון</label>
               <button 
                  onClick={() => setFilters({
                     ...filters, 
                     sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc'
                  })}
                  className="bg-white dark:bg-[#121212] border border-gray-100 dark:border-white/10 px-3 py-3 rounded-xl sm:rounded-2xl font-bold text-xs text-gray-700 dark:text-gray-200 flex items-center justify-between gap-2 hover:border-brand transition-colors w-full min-h-[44px]"
               >
                  <span>{filters.sortOrder === 'asc' ? 'עולה ↑' : 'יורד ↓'}</span>
                  <ArrowUpDown size={14} className="text-gray-400" />
               </button>
            </div>
         </div>

         {displayTransactions.length > 0 ? (
           <>
             {/* Desktop Table View */}
             <div className="hidden md:block overflow-x-auto no-scrollbar">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="text-[11px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-white/5">
                      <th 
                        onClick={() => handleHeaderSort('date')}
                        className="py-5 px-4 text-right cursor-pointer hover:text-brand transition-colors select-none"
                      >
                        <div className="flex items-center gap-1">
                          תאריך {filters.sortBy === 'date' && (filters.sortOrder === 'asc' ? '↑' : '↓')}
                        </div>
                      </th>
                      <th 
                        onClick={() => handleHeaderSort('description')}
                        className="py-5 px-2 text-right cursor-pointer hover:text-brand transition-colors select-none"
                      >
                        <div className="flex items-center gap-1">
                          תיאור {filters.sortBy === 'description' && (filters.sortOrder === 'asc' ? '↑' : '↓')}
                        </div>
                      </th>
                      <th 
                        onClick={() => handleHeaderSort('category')}
                        className="py-5 px-2 text-right cursor-pointer hover:text-brand transition-colors select-none"
                      >
                        <div className="flex items-center gap-1">
                          קטגוריה {filters.sortBy === 'category' && (filters.sortOrder === 'asc' ? '↑' : '↓')}
                        </div>
                      </th>
                      <th 
                        onClick={() => handleHeaderSort('amount')}
                        className="py-5 px-2 text-left cursor-pointer hover:text-brand transition-colors select-none"
                      >
                        <div className="flex items-center justify-end gap-1">
                          סכום {filters.sortBy === 'amount' && (filters.sortOrder === 'asc' ? '↑' : '↓')}
                        </div>
                      </th>
                      <th className="py-5 px-4 text-center">ניהול</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                    {displayTransactions.map((t) => (
                      <tr key={t.id} className="group hover:bg-gray-50/50 dark:hover:bg-white/5 transition-all">
                        <td className="py-5 px-4 font-black text-xs text-gray-400" dir="ltr">{t.date.split('-').reverse().join('/')}</td>
                        <td className="py-5 px-2"><p className="text-base md:text-lg font-black text-gray-800 dark:text-white">{t.description}</p></td>
                        <td className="py-5 px-2"><span className="text-[11px] font-black px-3 py-1 bg-gray-50 dark:bg-white/5 rounded-full border border-gray-100 dark:border-white/10">{t.categoryName}</span></td>
                        <td className="py-5 px-2 text-left"><p className={`text-lg md:text-xl font-black tabular-nums ${t.type === 'income' ? 'text-emerald-500' : 'text-gray-900 dark:text-white'}`} dir="ltr">₪{t.amount.toLocaleString()}</p></td>
                        <td className="py-5 px-4 align-middle"><div className="flex items-center justify-center gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => onEditTransaction(t)} className="p-2.5 min-w-[40px] min-h-[40px] flex items-center justify-center text-gray-400 hover:text-brand bg-gray-50 dark:bg-white/5 rounded-xl"><Edit2 size={16} /></button><button onClick={() => onDeleteTransaction(t.id)} className="p-2.5 min-w-[40px] min-h-[40px] flex items-center justify-center text-gray-400 hover:text-rose-500 bg-gray-50 dark:bg-white/5 rounded-xl"><Trash2 size={16} /></button></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>

             {/* Mobile Card-Based List View */}
             <div className="md:hidden space-y-3">
                {displayTransactions.map((t) => (
                  <motion.div 
                    key={t.id} 
                    layout
                    className="bg-gray-50/70 dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/5 space-y-3"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                         <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${t.type === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-gray-200/70 dark:bg-white/10 text-gray-600 dark:text-gray-300'}`}>
                            {t.type === 'income' ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                         </div>
                         <div className="min-w-0">
                            <p className="font-black text-sm text-gray-800 dark:text-white leading-tight truncate">{t.description}</p>
                            <p className="text-[11px] font-bold text-gray-400 mt-1" dir="ltr">{t.date.split('-').reverse().join('/')}</p>
                         </div>
                      </div>
                      <p className={`text-lg font-black tabular-nums shrink-0 ${t.type === 'income' ? 'text-emerald-500' : 'text-gray-800 dark:text-white'}`} dir="ltr">
                        {t.type === 'income' ? '+' : '-'}₪{t.amount.toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-gray-200/50 dark:border-white/5">
                       <span className="text-[11px] font-black text-gray-500 dark:text-gray-400 truncate">
                         {t.categoryName}
                       </span>
                       <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => onEditTransaction(t)} aria-label="ערוך תנועה" className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-white dark:bg-white/10 text-gray-500 hover:text-brand rounded-xl shadow-sm"><Edit2 size={16} /></button>
                          <button onClick={() => onDeleteTransaction(t.id)} aria-label="מחק תנועה" className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-white dark:bg-white/10 text-gray-500 hover:text-rose-500 rounded-xl shadow-sm"><Trash2 size={16} /></button>
                       </div>
                    </div>
                  </motion.div>
                ))}
             </div>
           </>
         ) : <div className="py-16 text-center text-gray-400 font-bold italic">לא נמצאו תנועות התואמות את החיפוש.</div>}
      </div>
    </motion.div>
  );
};

export default Dashboard;
