
import React, { useState, useMemo, useRef, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserState, Transaction } from '../types';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  Plus, Sparkles, List, Activity, 
  Edit2, Trash2, Calendar, ChevronDown,
  X, AlertCircle, Bot, Search, Scissors,
  Send, Loader2, Target, Check, LineChart, 
  Shield, Flame, Trophy, TrendingUp, ArrowUpRight, ArrowDownRight
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
  
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [filters, setFilters] = useState({ description: '', type: 'all', category: 'all' });

  const months = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
  const years = useMemo(() => Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i), []);

  const fullMonthTransactions = useMemo(() => 
    state.transactions.filter(t => {
      const parts = t.date.split('-');
      return parseInt(parts[1]) - 1 === selectedMonth && parseInt(parts[0]) === selectedYear;
    }),
    [state.transactions, selectedMonth, selectedYear]
  );

  const displayTransactions = useMemo(() => 
    fullMonthTransactions.filter(t => {
      const matchesDesc = t.description.toLowerCase().includes(filters.description.toLowerCase());
      const matchesType = filters.type === 'all' || t.type === filters.type;
      const matchesCat = filters.category === 'all' || t.categoryId === filters.category;
      return matchesDesc && matchesType && matchesCat;
    }),
    [fullMonthTransactions, filters]
  );

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
  const dayOfMonth = (now.getMonth() === selectedMonth && now.getFullYear() === selectedYear) ? now.getDate() : daysInMonth;
  const daysRemaining = Math.max(daysInMonth - dayOfMonth, 1);
  const dailyBudget = monthBalance > 0 ? (monthBalance / daysRemaining) : 0;

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
      setShowReportModal(false);
      alert("שגיאה בחיבור ל-CFO Elite.");
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-24 text-right max-w-7xl mx-auto px-4">
      {/* Date Picker Modal */}
      <AnimatePresence>
        {isPickerOpen && (
          <div className="fixed inset-0 z-[2100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsPickerOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-xl" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-sm bg-white dark:bg-[#1a1a1a] rounded-[40px] p-8 md:p-10 shadow-2xl border border-white/5">
              <div className="space-y-6">
                <div className="text-center"><h3 className="text-2xl font-black mb-2">בחר חודש ושנה</h3></div>
                <div className="space-y-4">
                  <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 mr-2">שנה</label><div className="grid grid-cols-3 gap-2">{years.map(y => <button key={y} onClick={() => setSelectedYear(y)} className={`py-3 rounded-2xl font-black text-sm transition-all ${selectedYear === y ? 'bg-brand text-white shadow-lg' : 'bg-gray-50 dark:bg-white/5 text-gray-500'}`}>{y}</button>)}</div></div>
                  <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 mr-2">חודש</label><div className="grid grid-cols-3 gap-2">{months.map((m, i) => <button key={m} onClick={() => { setSelectedMonth(i); setIsPickerOpen(false); }} className={`py-3 rounded-xl font-black text-[11px] transition-all ${selectedMonth === i ? 'bg-brand text-white shadow-lg' : 'bg-gray-50 dark:bg-white/5 text-gray-500'}`}>{m}</button>)}</div></div>
                </div>
                <button onClick={() => setIsPickerOpen(false)} className="w-full py-5 bg-brand text-white rounded-[24px] font-black shadow-xl">אישור</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Report Modal */}
      <AnimatePresence>
        {showReportModal && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-0 md:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowReportModal(false)} className="absolute inset-0 bg-black/95 backdrop-blur-3xl" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 40 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 40 }} className="relative w-full h-full md:h-auto md:max-w-7xl bg-white dark:bg-[#0a0a0a] md:rounded-[56px] shadow-2xl border border-white/10 overflow-hidden flex flex-col md:max-h-[94vh]" dir="rtl">
               <div className="p-6 md:p-8 flex justify-between items-center shrink-0 border-b border-gray-100 dark:border-white/5">
                 <button onClick={() => setShowReportModal(false)} className="p-3 bg-gray-50 dark:bg-white/5 rounded-full hover:bg-gray-200 transition-colors"><X size={20} className="text-gray-500" /></button>
                 <div className="flex items-center gap-4">
                   <div className="text-right hidden sm:block"><h3 className="font-black text-xl md:text-2xl text-gray-800 dark:text-white">SmartWise Elite Hub</h3><p className="text-[10px] font-bold text-brand uppercase tracking-widest">Surgical AI Optimization</p></div>
                   <div className="w-12 h-12 md:w-14 md:h-14 bg-brand text-white rounded-[20px] md:rounded-[24px] flex items-center justify-center shadow-2xl shadow-brand/20"><Bot size={30} /></div>
                 </div>
               </div>
               
               <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                 {/* Report Content Panel */}
                 <div className="w-full md:w-[60%] border-l border-gray-100 dark:border-white/5 overflow-y-auto custom-scrollbar p-6 md:p-12 bg-gray-50/40 dark:bg-black/20 space-y-12 pb-24">
                    {isGeneratingReport ? (
                      <div className="flex flex-col items-center justify-center h-full space-y-8 py-20">
                         <div className="relative"><div className="w-20 h-20 md:w-24 md:h-24 border-4 border-brand/20 border-t-brand rounded-full animate-spin" /><Bot size={32} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-brand animate-pulse" /></div>
                         <div className="text-center space-y-2"><p className="text-xl font-black text-gray-800 dark:text-white">מנתח אסטרטגיה אישית...</p><p className="text-sm font-bold text-gray-400">ה-Elite Agent מחבר בין התנועות ליעדים שלך.</p></div>
                      </div>
                    ) : reportData ? (
                      <div className="space-y-12">
                         {/* Header & Score */}
                         <div className="bg-white dark:bg-white/5 p-8 md:p-12 rounded-[48px] border border-gray-100 dark:border-white/5 shadow-sm text-center flex flex-col items-center gap-6 relative overflow-hidden">
                            <PremiumScoreCircle score={reportData.score} />
                            <div className="relative z-10 space-y-2">
                              <h4 className="font-black text-3xl md:text-4xl text-gray-800 dark:text-white leading-tight">{reportData.title}</h4>
                              <p className="text-sm md:text-base font-bold text-gray-500 dark:text-gray-400 leading-relaxed max-w-lg mx-auto italic">"{reportData.summary}"</p>
                            </div>
                         </div>

                         {/* Preservation & Improvement - NEW TOP PLACEMENT */}
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white dark:bg-emerald-900/10 p-8 rounded-[40px] border border-emerald-100 dark:border-emerald-500/10 space-y-5">
                               <div className="flex items-center gap-3 text-emerald-600 font-black text-sm uppercase tracking-[0.2em]"><Shield size={20} /> מה לשמר</div>
                               <ul className="space-y-4">{reportData.preservationPoints.map((p, i) => <li key={i} className="text-sm font-bold text-gray-700 dark:text-gray-200 flex gap-4 leading-relaxed"><span className="w-2 h-2 rounded-full bg-emerald-500 mt-2 shrink-0" /> {p}</li>)}</ul>
                            </div>
                            <div className="bg-white dark:bg-rose-900/10 p-8 rounded-[40px] border border-rose-100 dark:border-rose-500/10 space-y-5">
                               <div className="flex items-center gap-3 text-rose-500 font-black text-sm uppercase tracking-[0.2em]"><AlertCircle size={20} /> מה לשפר</div>
                               <ul className="space-y-4">{reportData.improvementPoints.map((p, i) => <li key={i} className="text-sm font-bold text-gray-700 dark:text-gray-200 flex gap-4 leading-relaxed"><span className="w-2 h-2 rounded-full bg-rose-500 mt-2 shrink-0" /> {p}</li>)}</ul>
                            </div>
                         </div>

                         {/* Surgical Category Cutting Plan */}
                         <div className="bg-gray-900 rounded-[48px] p-8 md:p-12 text-white space-y-10 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-5 rotate-12"><Scissors size={180} /></div>
                            <div className="flex items-center gap-4 text-brand font-black text-2xl relative z-10"><Scissors size={28} /> תוכנית קיצוץ קטגוריאלית</div>
                            <div className="grid gap-6 relative z-10">
                               {reportData.categoryCutting.map((c, i) => (
                                 <div key={i} className="bg-white/5 hover:bg-white/10 p-6 rounded-[32px] border border-white/5 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    <div className="space-y-2 flex-1">
                                       <div className="flex items-center gap-3"><span className="px-2 py-0.5 bg-brand text-gray-900 text-[9px] font-black rounded-md uppercase tracking-widest">{c.category}</span><p className="text-[10px] font-bold text-gray-400">{c.currentStatus}</p></div>
                                       <p className="text-base font-black text-gray-100 leading-snug">{c.advice}</p>
                                    </div>
                                    <div className="bg-brand/20 text-brand px-5 py-2 rounded-2xl font-black text-sm whitespace-nowrap shadow-lg">חיסכון: ₪{c.expectedSaving}</div>
                                 </div>
                               ))}
                            </div>
                         </div>

                         {/* Efficiency Roadmap */}
                         <div className="space-y-10">
                            <div className="flex items-center gap-4 text-gray-800 dark:text-white font-black text-2xl"><Activity size={28} /> מפת דרכים אסטרטגית</div>
                            <div className="grid gap-6">
                               {reportData.efficiencyRoadmap.map((phase, i) => (
                                 <div key={i} className="bg-white dark:bg-white/5 p-8 rounded-[40px] border border-gray-100 dark:border-white/5 space-y-6">
                                    <div className="flex items-center gap-4 font-black text-brand text-lg"><div className="w-10 h-10 rounded-2xl bg-brand text-white flex items-center justify-center shadow-lg shadow-brand/20">{i+1}</div> {phase.phase}</div>
                                    <div className="grid gap-4 pr-12">
                                       {phase.actions.map((act, j) => <div key={j} className="text-sm md:text-base font-bold text-gray-600 dark:text-gray-300 flex items-center gap-4"><Check size={18} className="text-brand shrink-0" /> {act}</div>)}
                                    </div>
                                 </div>
                               ))}
                            </div>
                         </div>

                         {/* Projected Savings Total */}
                         <div className="bg-brand text-gray-900 p-10 rounded-[48px] text-center shadow-2xl shadow-brand/20 group">
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] mb-2 opacity-60">פוטנציאל חיסכון חודשי מיידי</p>
                            <h3 className="text-5xl md:text-6xl font-black tracking-tighter" dir="ltr">₪{reportData.projectedSavings}</h3>
                         </div>
                      </div>
                    ) : null}
                 </div>

                 {/* Interaction Chat Panel */}
                 <div className="flex-1 flex flex-col bg-white dark:bg-[#080808] border-r border-gray-100 dark:border-white/5 h-[400px] md:h-auto">
                   <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 space-y-8 pb-32">
                      <div className="flex items-center justify-center py-4"><div className="px-4 py-1.5 bg-gray-50 dark:bg-white/5 rounded-full text-[10px] font-black text-gray-400 uppercase tracking-widest border border-gray-100 dark:border-white/5">CFO Secure Connection</div></div>
                      {chatMessages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                           <div className={`max-w-[85%] p-6 rounded-[36px] text-sm font-bold shadow-sm leading-relaxed ${msg.role === 'user' ? 'bg-brand text-white rounded-br-none' : 'bg-gray-100 dark:bg-white/5 text-gray-800 dark:text-gray-100 rounded-bl-none border border-gray-100 dark:border-white/10 backdrop-blur-md shadow-xl'}`}>{msg.text}</div>
                        </div>
                      ))}
                      {isChatLoading && <div className="flex justify-end p-4"><Loader2 className="animate-spin text-brand" /></div>}
                      <div ref={chatEndRef} />
                   </div>
                   <div className="p-6 md:p-8 pt-0 bg-white dark:bg-[#080808] sticky bottom-0">
                      <div className="relative group">
                        <textarea 
                          rows={2}
                          placeholder="שאלו את ה-CFO: 'איך לצמצם בקניות?'..." 
                          value={chatInput} 
                          onChange={e => setChatInput(e.target.value)} 
                          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())} 
                          className="w-full bg-gray-50 dark:bg-white/10 border-none rounded-[32px] px-8 py-5 font-bold outline-none pr-10 pl-20 resize-none overflow-y-auto shadow-inner"
                        />
                        <button onClick={handleSendMessage} className="absolute left-3 bottom-5 w-12 h-12 bg-brand text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all"><Send size={20} /></button>
                      </div>
                   </div>
                 </div>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-black text-gray-800 dark:text-white tracking-tight">היי {state.profile?.name?.split(' ')[0] || 'משפחה'},</h1>
          <button onClick={() => setIsPickerOpen(true)} className="flex items-center gap-2 text-brand font-black hover:opacity-80 transition-all text-lg">
            <Calendar size={20} /><span>{months[selectedMonth]} {selectedYear}</span><ChevronDown size={16} className={`${isPickerOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
        <button onClick={onAddClick} className="w-full md:w-auto bg-brand text-white px-8 py-4 rounded-2xl font-black shadow-lg shadow-brand/20 flex items-center justify-center gap-2">
          <Plus size={18} strokeWidth={3} /> תנועה חדשה
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white dark:bg-[#1e1e1e] rounded-[40px] md:rounded-[48px] p-8 md:p-12 border border-gray-100 dark:border-white/5 shadow-sm relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 rounded-full blur-[100px] -mr-32 -mt-32" />
           <div className="space-y-2 relative z-10">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">יתרה חודשית סופית</span>
              <h2 className={`text-5xl md:text-8xl font-black tracking-tighter ${monthBalance < 0 ? 'text-rose-500' : 'text-gray-800 dark:text-white'}`} dir="ltr">₪{monthBalance.toLocaleString()}</h2>
           </div>
           <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-12 relative z-10">
              <div className="bg-gray-50/50 dark:bg-white/5 p-4 md:p-5 rounded-3xl text-center"><p className="text-[8px] md:text-[9px] font-black text-gray-400 mb-1">תקציב ליום</p><span className="text-lg md:text-xl font-black text-brand">₪{Math.round(dailyBudget)}</span></div>
              <div className="bg-gray-50/50 dark:bg-white/5 p-4 md:p-5 rounded-3xl text-center"><p className="text-[8px] md:text-[9px] font-black text-gray-400 mb-1">הכנסות</p><span className="text-lg md:text-xl font-black text-emerald-500">₪{summary.income.toLocaleString()}</span></div>
              <div className="bg-gray-50/50 dark:bg-white/5 p-4 md:p-5 rounded-3xl text-center"><p className="text-[8px] md:text-[9px] font-black text-gray-400 mb-1">הוצאות</p><span className="text-lg md:text-xl font-black text-gray-700 dark:text-gray-200">₪{summary.expense.toLocaleString()}</span></div>
              <div className="bg-gray-50/50 dark:bg-white/5 p-4 md:p-5 rounded-3xl text-center"><p className="text-[8px] md:text-[9px] font-black text-gray-400 mb-1">ימים לסוף</p><span className="text-lg md:text-xl font-black">{daysRemaining}</span></div>
           </div>
        </div>

        <div className="lg:col-span-4 bg-[#0a1120] rounded-[40px] md:rounded-[48px] p-8 text-white relative overflow-hidden flex flex-col justify-between border border-white/5 shadow-2xl group min-h-[280px]">
           <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform"><Bot size={120} /></div>
           <div className="relative z-10 space-y-4">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-brand text-white rounded-2xl flex items-center justify-center shadow-lg mb-4"><Sparkles size={28} /></div>
              <div><h4 className="text-2xl font-black mb-1">CFO Elite Hub</h4><p className="text-gray-400 text-sm font-medium leading-relaxed">ניתוח אסטרטגי פרימיום המבוסס על היעדים וההוצאות שלכם.</p></div>
           </div>
           <button onClick={generateFinancialReport} className="w-full py-5 bg-white text-[#0a1120] font-black rounded-[24px] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 relative z-10 mt-6 shadow-xl">
              <LineChart size={20} /><span>ניתוח מעמיק ושיחת ייעוץ</span>
           </button>
        </div>
      </div>

      <div className="bg-white dark:bg-[#1e1e1e] rounded-[40px] md:rounded-[48px] p-6 md:p-10 border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden">
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 md:mb-12">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-brand/10 text-brand rounded-2xl flex items-center justify-center shadow-inner"><List size={24} /></div>
               <div><h3 className="text-xl font-black text-gray-800 dark:text-white">יומן תנועות חודשי</h3><p className="text-[10px] text-gray-400 font-bold uppercase">סקירה וחיפוש פעולות</p></div>
            </div>
            <div className="flex-1 w-full md:max-w-md relative">
               <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
               <input 
                 type="text" 
                 placeholder="חיפוש תנועה..." 
                 value={filters.description}
                 onChange={e => setFilters({...filters, description: e.target.value})}
                 className="w-full bg-gray-50 dark:bg-white/5 border-none rounded-2xl pr-12 pl-6 py-4 font-bold text-sm outline-none focus:ring-2 focus:ring-brand/20 transition-all"
               />
            </div>
         </div>
         
         {displayTransactions.length > 0 ? (
           <>
             {/* Desktop Table View */}
             <div className="hidden md:block overflow-x-auto no-scrollbar">
                <table className="w-full text-right border-collapse">
                  <thead><tr className="text-[11px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-white/5"><th className="py-5 px-4 text-right">תאריך</th><th className="py-5 px-2 text-right">תיאור</th><th className="py-5 px-2 text-right">קטגוריה</th><th className="py-5 px-2 text-left">סכום</th><th className="py-5 px-4 text-center">ניהול</th></tr></thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                    {displayTransactions.map((t) => (
                      <tr key={t.id} className="group hover:bg-gray-50/50 dark:hover:bg-white/5 transition-all">
                        <td className="py-6 px-4 font-black text-xs text-gray-400" dir="ltr">{t.date.split('-').reverse().join('/')}</td>
                        <td className="py-6 px-2"><p className="text-base md:text-lg font-black text-gray-800 dark:text-white">{t.description}</p></td>
                        <td className="py-6 px-2"><span className="text-[10px] font-black px-3 py-1 bg-gray-50 dark:bg-white/5 rounded-full border border-gray-100 dark:border-white/10">{t.categoryName}</span></td>
                        <td className="py-6 px-2 text-left"><p className={`text-lg md:text-xl font-black ${t.type === 'income' ? 'text-emerald-500' : 'text-gray-900 dark:text-white'}`} dir="ltr">₪{t.amount.toLocaleString()}</p></td>
                        <td className="py-6 px-4 align-middle"><div className="flex items-center justify-center gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => onEditTransaction(t)} className="p-3 text-gray-400 hover:text-brand bg-gray-50 dark:bg-white/5 rounded-2xl"><Edit2 size={16} /></button><button onClick={() => onDeleteTransaction(t.id)} className="p-3 text-gray-400 hover:text-rose-500 bg-gray-50 dark:bg-white/5 rounded-2xl"><Trash2 size={16} /></button></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>

             {/* Mobile Card-Based List View */}
             <div className="md:hidden space-y-4">
                {displayTransactions.map((t) => (
                  <motion.div 
                    key={t.id} 
                    layout
                    className="bg-gray-50/50 dark:bg-white/5 p-5 rounded-[32px] border border-gray-100 dark:border-white/5 space-y-4"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                         <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${t.type === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-gray-200 dark:bg-white/10 text-gray-500'}`}>
                            {t.type === 'income' ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                         </div>
                         <div>
                            <p className="font-black text-gray-800 dark:text-white leading-tight">{t.description}</p>
                            <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest" dir="ltr">{t.date.split('-').reverse().join('/')}</p>
                         </div>
                      </div>
                      <p className={`text-xl font-black ${t.type === 'income' ? 'text-emerald-500' : 'text-gray-800 dark:text-white'}`} dir="ltr">
                        {t.type === 'income' ? '+' : '-'}₪{t.amount.toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                       <span className="text-[9px] font-black px-3 py-1 bg-white dark:bg-black/20 rounded-full border border-gray-100 dark:border-white/10 text-gray-400">
                         {t.categoryName}
                       </span>
                       <div className="flex items-center gap-2">
                          <button onClick={() => onEditTransaction(t)} className="p-2.5 bg-white dark:bg-white/10 text-gray-400 rounded-xl shadow-sm"><Edit2 size={16} /></button>
                          <button onClick={() => onDeleteTransaction(t.id)} className="p-2.5 bg-white dark:bg-white/10 text-gray-400 rounded-xl shadow-sm"><Trash2 size={16} /></button>
                       </div>
                    </div>
                  </motion.div>
                ))}
             </div>
           </>
         ) : <div className="py-24 text-center text-gray-400 font-bold italic">לא נמצאו תנועות התואמות את החיפוש.</div>}
      </div>
    </motion.div>
  );
};

export default Dashboard;
