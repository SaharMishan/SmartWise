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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10 pb-32 text-right max-w-7xl mx-auto px-4">
      <header>
        <h1 className="text-3xl font-black text-gray-800 dark:text-white tracking-tighter">חיסכון והשקעה</h1>
        <p className="text-gray-400 font-medium text-lg">תכנון אסטרטגי לצמיחה של ההון המשפחתי לטווח ארוך.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Input Controls */}
        <div className="lg:col-span-7 bg-white dark:bg-[#1e1e1e] rounded-[48px] p-8 md:p-12 border border-gray-100 dark:border-white/5 shadow-sm space-y-12">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">הון התחלתי (₪)</label>
              <div className="text-4xl font-black text-brand" dir="ltr">₪{initialCapital.toLocaleString()}</div>
              <input 
                type="range" min="0" max="1000000" step="5000" 
                value={initialCapital} 
                onChange={(e) => setInitialCapital(Number(e.target.value))} 
                className="w-full accent-brand h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer" 
              />
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">הפקדה חודשית (₪)</label>
              <div className="text-4xl font-black text-brand" dir="ltr">₪{monthlyInvestment.toLocaleString()}</div>
              <input 
                type="range" min="0" max="50000" step="100" 
                value={monthlyInvestment} 
                onChange={(e) => setMonthlyInvestment(Number(e.target.value))} 
                className="w-full accent-brand h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer" 
              />
            </div>
          </div>

          <div className="pt-10 border-t border-gray-50 dark:border-white/5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-6">מסלול תשואה שנתי</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(Object.entries(profiles) as [RiskProfile, any][]).map(([key, p]) => (
                <button 
                  key={key} 
                  onClick={() => setRiskProfile(key)} 
                  className={`p-6 rounded-[32px] border-2 transition-all text-right flex flex-col justify-between h-40 ${riskProfile === key ? 'border-brand bg-brand/5' : 'border-gray-50 dark:border-white/5 hover:border-brand/20'}`}
                >
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${riskProfile === key ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'bg-gray-100 dark:bg-white/5 text-gray-400'}`}>
                    {p.icon}
                  </div>
                  <div>
                    <p className="font-black text-sm text-gray-800 dark:text-white leading-none">{p.label}</p>
                    <p className="text-brand font-black text-xs mt-1">{p.return}% לשנה</p>
                  </div>
                </button>
              ))}
            </div>
            
            <AnimatePresence>
              {riskProfile === 'custom' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-6 flex items-center gap-4 bg-gray-50 dark:bg-white/5 p-5 rounded-3xl">
                  <span className="text-xs font-black text-gray-500">תשואה מותאמת אישית:</span>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      value={customReturn} 
                      onChange={e => setCustomReturn(Number(e.target.value))} 
                      className="bg-white dark:bg-[#121212] border-none rounded-xl px-4 py-2 font-black text-brand w-24 text-center focus:ring-1 focus:ring-brand outline-none" 
                    />
                    <span className="text-brand font-black">%</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Projections Card */}
        <div className="lg:col-span-5 bg-gray-900 rounded-[56px] p-10 text-white shadow-2xl relative overflow-hidden flex flex-col justify-center">
          <div className="absolute top-0 right-0 p-12 opacity-[0.03]"><TrendingUp size={160} /></div>
          
          <div className="space-y-1 relative z-10">
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">סכום סופי נטו (אחרי מס)</span>
            <h2 className="text-6xl md:text-7xl font-black text-brand tracking-tighter" dir="ltr">₪{Math.round(calculation.net).toLocaleString()}</h2>
          </div>

          <div className="mt-12 pt-10 border-t border-white/5 space-y-5 relative z-10">
             <div className="flex justify-between items-center">
               <span className="text-xs font-bold text-gray-400">סך הפקדות (הקרן שלך):</span>
               <span className="font-black text-lg">₪{Math.round(calculation.invested).toLocaleString()}</span>
             </div>
             <div className="flex justify-between items-center">
               <span className="text-xs font-bold text-gray-400">רווח שנצבר (ברוטו):</span>
               <span className="font-black text-lg text-emerald-400">₪{Math.round(calculation.profit).toLocaleString()}</span>
             </div>
             <div className="flex justify-between items-center border-b border-white/5 pb-5">
               <div className="flex items-center gap-2 group cursor-help">
                 <span className="text-xs font-bold text-gray-400">מס רווחי הון (25% מהרווח):</span>
                 <Info size={14} className="text-gray-600 group-hover:text-brand" />
               </div>
               <span className="font-black text-lg text-red-400">-₪{Math.round(calculation.tax).toLocaleString()}</span>
             </div>
          </div>

          <div className="mt-8 p-5 bg-brand/10 rounded-3xl border border-brand/20 flex items-start gap-4">
             <Shield className="text-brand shrink-0" size={20} />
             <p className="text-[11px] font-bold text-emerald-100 leading-relaxed">
               חישוב המס מתבצע על הרווח הריאלי בלבד. הקרן שהפקדת פטורה ממס בעת המשיכה.
             </p>
          </div>
        </div>

        {/* Detailed Yearly Growth Table */}
        <div className="lg:col-span-12 bg-white dark:bg-[#1e1e1e] rounded-[48px] p-8 md:p-12 border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden">
           <div className="flex items-center gap-4 mb-10">
             <div className="w-12 h-12 bg-gray-50 dark:bg-white/5 text-brand rounded-2xl flex items-center justify-center"><Table size={24} /></div>
             <h3 className="text-2xl font-black text-gray-800 dark:text-white">פירוט צמיחה לפי ציר זמן</h3>
           </div>
           
           <div className="overflow-x-auto no-scrollbar">
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
                        <td className="py-6">₪{Math.round(row.invested).toLocaleString()}</td>
                        <td className="py-6">₪{Math.round(row.gross).toLocaleString()}</td>
                        <td className="py-6 text-emerald-500">+₪{Math.round(row.profit).toLocaleString()}</td>
                        <td className="py-6 text-red-400">-₪{Math.round(row.tax).toLocaleString()}</td>
                        <td className="py-6 font-black text-gray-900 dark:text-white text-base">₪{Math.round(row.net).toLocaleString()}</td>
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