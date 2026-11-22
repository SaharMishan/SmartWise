import React, { useState, useMemo } from 'react';
// Added AnimatePresence to imports from framer-motion
import { motion, AnimatePresence } from 'framer-motion';
import { UserState } from '../types';
import { Shield, Zap, LayoutGrid, Calculator, PiggyBank, TrendingUp, Info, ArrowRight, Minus, Equal, Table, ChevronDown } from 'lucide-react';

interface ArchitectProps {
  state: UserState;
}

type RiskProfile = 'conservative' | 'balanced' | 'aggressive' | 'custom';

const Architect: React.FC<ArchitectProps> = ({ state }) => {
  const [initialCapital, setInitialCapital] = useState(state.balance > 0 ? state.balance : 50000);
  const [monthlyInvestment, setMonthlyInvestment] = useState(2000);
  const [years, setYears] = useState(15);
  const [riskProfile, setRiskProfile] = useState<RiskProfile>('balanced');
  const [customReturn, setCustomReturn] = useState(7);

  const profiles = {
    conservative: { label: 'סולידי', return: 4, icon: <Shield size={20} />, description: 'תיק השקעות מבוסס אג"ח ופקדונות.' },
    balanced: { label: 'מאוזן', return: 7, icon: <LayoutGrid size={20} />, description: 'שילוב מאוזן בין מניות לאגרות חוב.' },
    aggressive: { label: 'אגרסיבי', return: 11, icon: <Zap size={20} />, description: 'חשיפה גבוהה למניות וצמיחה מואצת.' },
    custom: { label: 'מותאם', return: customReturn, icon: <Calculator size={20} />, description: 'הזן תשואה שנתית משוערת באופן ידני.' }
  };

  const currentReturn = riskProfile === 'custom' ? customReturn : profiles[riskProfile].return;

  const calculation = useMemo(() => {
    const annualRate = currentReturn / 100;
    const monthlyRate = annualRate / 12;
    let currentBalance = initialCapital;
    let totalInvested = initialCapital;
    const yearlyBreakdown = [];

    for (let year = 1; year <= years; year++) {
      for (let m = 0; m < 12; m++) {
        currentBalance = (currentBalance * (1 + monthlyRate)) + monthlyInvestment;
      }
      totalInvested += (monthlyInvestment * 12);
      
      const profit = Math.max(0, currentBalance - totalInvested);
      const tax = profit * 0.25; // Capital gains tax on profit only
      
      yearlyBreakdown.push({
        year,
        invested: totalInvested,
        gross: currentBalance,
        profit: profit,
        tax: tax,
        net: currentBalance - tax
      });
    }

    const final = yearlyBreakdown[yearlyBreakdown.length - 1] || { invested: 0, gross: 0, profit: 0, tax: 0, net: 0 };
    return { ...final, yearlyBreakdown };
  }, [initialCapital, monthlyInvestment, years, currentReturn]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 sm:space-y-10 pb-24 lg:pb-32 text-right max-w-7xl mx-auto">
      <header>
        <h1 className="text-2xl sm:text-3xl font-black text-gray-800 dark:text-white tracking-tighter">חיסכון והשקעה</h1>
        <p className="text-gray-400 font-medium text-sm sm:text-lg mt-1">תכנון אסטרטגי לצמיחה של ההון המשפחתי לטווח ארוך.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-8">
        {/* Input Controls */}
        <div className="lg:col-span-7 bg-white dark:bg-[#1e1e1e] rounded-[28px] sm:rounded-[48px] p-5 sm:p-8 md:p-12 border border-gray-100 dark:border-white/5 shadow-sm space-y-8 sm:space-y-12">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-10">
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between gap-2">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider">הון התחלתי (₪)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={1000000}
                  step={1000}
                  value={initialCapital}
                  onChange={(e) => setInitialCapital(Math.max(0, Number(e.target.value) || 0))}
                  className="w-28 bg-gray-50 dark:bg-[#121212] text-brand font-black text-sm px-3 py-1.5 rounded-xl text-left tabular-nums outline-none focus:ring-2 focus:ring-brand/30"
                  dir="ltr"
                />
              </div>
              <div className="text-3xl sm:text-4xl font-black text-brand tabular-nums" dir="ltr">₪{initialCapital.toLocaleString()}</div>
              <input 
                type="range" min="0" max="1000000" step="5000" 
                value={Math.min(1000000, initialCapital)} 
                onChange={(e) => setInitialCapital(Number(e.target.value))} 
                className="w-full touch-slider bg-gray-100 dark:bg-white/10 rounded-full appearance-none cursor-pointer" 
              />
            </div>
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between gap-2">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider">הפקדה חודשית (₪)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={50000}
                  step={100}
                  value={monthlyInvestment}
                  onChange={(e) => setMonthlyInvestment(Math.max(0, Number(e.target.value) || 0))}
                  className="w-28 bg-gray-50 dark:bg-[#121212] text-brand font-black text-sm px-3 py-1.5 rounded-xl text-left tabular-nums outline-none focus:ring-2 focus:ring-brand/30"
                  dir="ltr"
                />
              </div>
              <div className="text-3xl sm:text-4xl font-black text-brand tabular-nums" dir="ltr">₪{monthlyInvestment.toLocaleString()}</div>
              <input 
                type="range" min="0" max="50000" step="100" 
                value={Math.min(50000, monthlyInvestment)} 
                onChange={(e) => setMonthlyInvestment(Number(e.target.value))} 
                className="w-full touch-slider bg-gray-100 dark:bg-white/10 rounded-full appearance-none cursor-pointer" 
              />
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-gray-50 dark:border-white/5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider">טווח השקעה (שנים)</label>
              <span className="text-base sm:text-lg font-black text-gray-800 dark:text-white tabular-nums">{years} שנים</span>
            </div>
            <input
              type="range" min="1" max="40" step="1"
              value={years}
              onChange={(e) => setYears(Number(e.target.value))}
              className="w-full touch-slider bg-gray-100 dark:bg-white/10 rounded-full appearance-none cursor-pointer"
            />
          </div>

          <div className="pt-6 sm:pt-10 border-t border-gray-50 dark:border-white/5">
            <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider block mb-4 sm:mb-6">מסלול תשואה שנתי</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {(Object.entries(profiles) as [RiskProfile, any][]).map(([key, p]) => (
                <button 
                  key={key} 
                  onClick={() => setRiskProfile(key)} 
                  className={`p-4 sm:p-6 rounded-[24px] sm:rounded-[32px] border-2 transition-all text-right flex flex-col justify-between h-32 sm:h-40 ${riskProfile === key ? 'border-brand bg-brand/5' : 'border-gray-100 dark:border-white/5 hover:border-brand/20'}`}
                >
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${riskProfile === key ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'bg-gray-100 dark:bg-white/5 text-gray-400'}`}>
                    {p.icon}
                  </div>
                  <div>
                    <p className="font-black text-sm text-gray-800 dark:text-white leading-none">{p.label}</p>
                    <p className="text-brand font-black text-xs mt-1.5 tabular-nums">{p.return}% לשנה</p>
                  </div>
                </button>
              ))}
            </div>
            
            <AnimatePresence>
              {riskProfile === 'custom' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-4 sm:mt-6 flex items-center justify-between sm:justify-start gap-4 bg-gray-50 dark:bg-white/5 p-4 sm:p-5 rounded-2xl sm:rounded-3xl">
                  <span className="text-xs font-black text-gray-500">תשואה מותאמת אישית:</span>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      inputMode="decimal"
                      value={customReturn} 
                      onChange={e => setCustomReturn(Number(e.target.value))} 
                      className="bg-white dark:bg-[#121212] border-none rounded-xl px-4 py-2 font-black text-brand w-24 text-center focus:ring-1 focus:ring-brand outline-none tabular-nums" 
                    />
                    <span className="text-brand font-black">%</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Projections Card */}
        <div className="lg:col-span-5 bg-gray-900 rounded-[32px] sm:rounded-[56px] p-6 sm:p-8 md:p-10 text-white shadow-2xl relative overflow-hidden flex flex-col justify-center">
          <div className="hidden sm:block absolute top-0 right-0 p-12 opacity-[0.03]"><TrendingUp size={160} /></div>
          
          <div className="space-y-1.5 relative z-10">
            <span className="text-[11px] font-black uppercase tracking-wider sm:tracking-[0.2em] text-gray-400">סכום סופי נטו (אחרי מס)</span>
            <h2 className="text-4xl sm:text-5xl xl:text-6xl font-black text-brand tracking-tighter tabular-nums break-words" dir="ltr">₪{Math.round(calculation.net).toLocaleString()}</h2>
          </div>

          <div className="mt-8 sm:mt-12 pt-6 sm:pt-10 border-t border-white/10 space-y-4 sm:space-y-5 relative z-10">
             <div className="flex justify-between items-center gap-2">
               <span className="text-xs font-bold text-gray-400">סך הפקדות (הקרן שלך):</span>
               <span className="font-black text-base sm:text-lg tabular-nums" dir="ltr">₪{Math.round(calculation.invested).toLocaleString()}</span>
             </div>
             <div className="flex justify-between items-center gap-2">
               <span className="text-xs font-bold text-gray-400">רווח שנצבר (ברוטו):</span>
               <span className="font-black text-base sm:text-lg text-emerald-400 tabular-nums" dir="ltr">₪{Math.round(calculation.profit).toLocaleString()}</span>
             </div>
             <div className="flex justify-between items-center gap-2 border-b border-white/10 pb-4 sm:pb-5">
               <div className="flex items-center gap-2 group cursor-help">
                 <span className="text-xs font-bold text-gray-400">מס רווחי הון (25% מהרווח):</span>
                 <Info size={14} className="text-gray-500 group-hover:text-brand shrink-0" />
               </div>
               <span className="font-black text-base sm:text-lg text-red-400 tabular-nums" dir="ltr">-₪{Math.round(calculation.tax).toLocaleString()}</span>
             </div>
          </div>

          <div className="mt-6 sm:mt-8 p-4 sm:p-5 bg-brand/10 rounded-2xl sm:rounded-3xl border border-brand/20 flex items-start gap-3 sm:gap-4">
             <Shield className="text-brand shrink-0 mt-0.5" size={18} />
             <p className="text-[11px] font-bold text-emerald-100 leading-relaxed">
               חישוב המס מתבצע על הרווח הריאלי בלבד. הקרן שהפקדת פטורה ממס בעת המשיכה.
             </p>
          </div>
        </div>

        {/* Detailed Yearly Growth */}
        <div className="lg:col-span-12 bg-white dark:bg-[#1e1e1e] rounded-[28px] sm:rounded-[48px] p-5 sm:p-8 md:p-12 border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden">
           <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-10">
             <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-50 dark:bg-white/5 text-brand rounded-2xl flex items-center justify-center shrink-0"><Table size={22} /></div>
             <h3 className="text-xl sm:text-2xl font-black text-gray-800 dark:text-white">פירוט צמיחה לפי ציר זמן</h3>
           </div>
           
           {/* Mobile Milestone Cards */}
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:hidden">
             {calculation.yearlyBreakdown.filter((_, i) => i === 0 || (i + 1) % 5 === 0 || i === years - 1).map(row => (
               <div key={row.year} className="p-4 rounded-2xl bg-gray-50 dark:bg-[#121212] border border-gray-100 dark:border-white/5 space-y-3">
                 <div className="flex items-center justify-between border-b border-gray-200/70 dark:border-white/5 pb-2.5">
                   <span className="font-black text-sm text-gray-500 dark:text-gray-400">שנה {row.year}</span>
                   <div className="text-left">
                     <span className="text-[10px] font-black text-brand block">יתרה נטו (בכיס)</span>
                     <span className="font-black text-lg text-gray-900 dark:text-white tabular-nums" dir="ltr">₪{Math.round(row.net).toLocaleString()}</span>
                   </div>
                 </div>
                 <div className="grid grid-cols-2 gap-2.5 text-xs">
                   <div>
                     <span className="text-[10px] font-bold text-gray-400 block">סך הפקדות</span>
                     <span className="font-black text-gray-700 dark:text-gray-200 tabular-nums" dir="ltr">₪{Math.round(row.invested).toLocaleString()}</span>
                   </div>
                   <div>
                     <span className="text-[10px] font-bold text-gray-400 block">יתרה ברוטו</span>
                     <span className="font-black text-gray-700 dark:text-gray-200 tabular-nums" dir="ltr">₪{Math.round(row.gross).toLocaleString()}</span>
                   </div>
                   <div>
                     <span className="text-[10px] font-bold text-gray-400 block">רווח שנצבר</span>
                     <span className="font-black text-emerald-500 tabular-nums" dir="ltr">+₪{Math.round(row.profit).toLocaleString()}</span>
                   </div>
                   <div>
                     <span className="text-[10px] font-bold text-gray-400 block">מס רעיוני</span>
                     <span className="font-black text-red-400 tabular-nums" dir="ltr">-₪{Math.round(row.tax).toLocaleString()}</span>
                   </div>
                 </div>
               </div>
             ))}
           </div>

           {/* Desktop / Tablet Table */}
           <div className="hidden md:block overflow-x-auto no-scrollbar">
             <table className="w-full text-right border-collapse">
                <thead>
                   <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 dark:border-white/5">
                      <th className="pb-6">שנה</th>
                      <th className="pb-6">סך הפקדות</th>
                      <th className="pb-6">יתרה ברוטו</th>
                      <th className="pb-6">רווח שנצבר</th>
                      <th className="pb-6">מס רעיוני</th>
                      <th className="pb-6 text-brand">יתרה נטו (בכיס)</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                   {calculation.yearlyBreakdown.filter((_, i) => i === 0 || (i + 1) % 5 === 0 || i === years - 1).map(row => (
                     <tr key={row.year} className="text-sm font-bold text-gray-700 dark:text-gray-300">
                        <td className="py-6 font-black text-gray-400">שנה {row.year}</td>
                        <td className="py-6 tabular-nums" dir="ltr">₪{Math.round(row.invested).toLocaleString()}</td>
                        <td className="py-6 tabular-nums" dir="ltr">₪{Math.round(row.gross).toLocaleString()}</td>
                        <td className="py-6 text-emerald-500 tabular-nums" dir="ltr">+₪{Math.round(row.profit).toLocaleString()}</td>
                        <td className="py-6 text-red-400 tabular-nums" dir="ltr">-₪{Math.round(row.tax).toLocaleString()}</td>
                        <td className="py-6 font-black text-gray-900 dark:text-white text-base tabular-nums" dir="ltr">₪{Math.round(row.net).toLocaleString()}</td>
                     </tr>
                   ))}
                </tbody>
             </table>
           </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Architect;