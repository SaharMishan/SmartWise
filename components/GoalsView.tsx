
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserState, Goal } from '../types';
import { db, auth } from '../firebase';
import { collection, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { 
  Target, Plus, Trash2, 
  Sparkles, BrainCircuit, Plane, Car, 
  Calculator, Edit2, Check, X, Calendar, AlertCircle
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface GoalsViewProps {
  state: UserState;
}

const GoalsView: React.FC<GoalsViewProps> = ({ state }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null);
  const [newGoal, setNewGoal] = useState({ title: '', targetAmount: '', deadline: '', currentAmount: '0' });
  const [editGoalData, setEditGoalData] = useState({ title: '', targetAmount: '', deadline: '', currentAmount: '' });
  const [aiAnalysis, setAiAnalysis] = useState<Record<string, string>>({});
  const [isAnalyzing, setIsAnalyzing] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 3500);
  };

  const handleAddGoal = async () => {
    if (!newGoal.title || !newGoal.targetAmount || !newGoal.deadline || !auth.currentUser) return;
    try {
      await addDoc(collection(db, 'users', auth.currentUser.uid, 'goals'), {
        title: newGoal.title,
        targetAmount: Number(newGoal.targetAmount),
        currentAmount: Number(newGoal.currentAmount),
        deadline: newGoal.deadline,
        createdAt: new Date().toISOString()
      });
      setIsAdding(false);
      setNewGoal({ title: '', targetAmount: '', deadline: '', currentAmount: '0' });
    } catch (e) {
      console.error(e);
      showError('שגיאה ביצירת היעד');
    }
  };

  const startEditing = (goal: Goal) => {
    setEditingGoalId(goal.id);
    setEditGoalData({
      title: goal.title,
      targetAmount: goal.targetAmount.toString(),
      currentAmount: goal.currentAmount.toString(),
      deadline: goal.deadline
    });
  };

  const handleUpdateGoal = async (id: string) => {
    if (!auth.currentUser || !editGoalData.title) return;
    try {
      const goalDocRef = doc(db, 'users', auth.currentUser.uid, 'goals', id);
      await updateDoc(goalDocRef, {
        title: editGoalData.title,
        targetAmount: Number(editGoalData.targetAmount),
        currentAmount: Number(editGoalData.currentAmount),
        deadline: editGoalData.deadline
      });
      setEditingGoalId(null);
    } catch (e) {
      console.error("Error updating goal:", e);
      showError("שגיאה בעדכון היעד");
    }
  };

  const confirmDeleteGoal = async () => {
    if (!auth.currentUser || !goalToDelete) return;
    try {
      const goalDocRef = doc(db, 'users', auth.currentUser.uid, 'goals', goalToDelete.id);
      await deleteDoc(goalDocRef);
      setGoalToDelete(null);
    } catch (e) { 
      console.error("Error deleting goal:", e); 
      showError("אירעה שגיאה במחיקת היעד.");
    }
  };

  const analyzeGoal = async (goal: Goal) => {
    setIsAnalyzing(goal.id);
    try {
      const monthsLeft = Math.max(1, Math.ceil((new Date(goal.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 30.44)));
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `כיועץ פיננסי משפחתי באפליקציית SmartWise, תן לי טיפ קצר ומעשי איך להגיע ליעד "${goal.title}". סכום יעד: ₪${goal.targetAmount}, חסר: ₪${goal.targetAmount - goal.currentAmount}, זמן: ${monthsLeft} חודשים. התזרים הפנוי הנוכחי של המשפחה הוא כ-₪${state.balance} לחודש. (מקסימום 25 מילים).`,
        config: { systemInstruction: "Family financial coach. Concise Hebrew.", temperature: 0.7 }
      });
      setAiAnalysis(prev => ({ ...prev, [goal.id]: response.text || 'נסי לנתח שוב מאוחר יותר.' }));
    } catch (e) {
      setAiAnalysis(prev => ({ ...prev, [goal.id]: 'תקשורת ה-AI נחה לרגע.' }));
    } finally { setIsAnalyzing(null); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 sm:space-y-10 pb-24 lg:pb-32 text-right">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-800 dark:text-white tracking-tight">היעדים והמטרות שלכם</h1>
          <p className="text-gray-400 font-medium text-sm sm:text-lg mt-1">חופשה, רכב או עתיד הילדים - הכל מתחיל בתכנון נכון.</p>
        </div>
        <button onClick={() => setIsAdding(true)} className="w-full sm:w-auto justify-center min-h-[48px] bg-brand text-white px-7 py-3.5 rounded-2xl font-black shadow-xl shadow-brand/20 active:scale-95 transition-all flex items-center gap-2">
          <Plus size={20} /> יעד משפחתי חדש
        </button>
      </header>

      <AnimatePresence>
        {errorMsg && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40 font-black text-sm flex items-center gap-3">
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {goalToDelete && (
          <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setGoalToDelete(null)} className="absolute inset-0 bg-black/70 backdrop-blur-xl" />
            <motion.div initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }} className="relative w-full max-w-md bg-white dark:bg-[#1a1a1a] rounded-t-[32px] sm:rounded-[40px] p-6 sm:p-10 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl border border-gray-100 dark:border-white/5 space-y-6 text-center">
              <div className="w-12 h-1.5 bg-gray-200 dark:bg-white/10 rounded-full mx-auto sm:hidden" />
              <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-3xl flex items-center justify-center mx-auto shadow-inner"><AlertCircle size={36} /></div>
              <h2 className="text-xl sm:text-2xl font-black text-gray-800 dark:text-white">מחיקת יעד</h2>
              <div className="p-4 sm:p-5 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                <p className="text-base sm:text-lg font-black text-gray-800 dark:text-white">"{goalToDelete.title}"</p>
                <p className="text-brand font-black mt-1 tabular-nums" dir="ltr">₪{goalToDelete.targetAmount.toLocaleString()}</p>
              </div>
              <p className="text-sm font-bold text-gray-400">האם אתה בטוח שברצונך למחוק את היעד? פעולה זו אינה ניתנת לביטול.</p>
              <div className="flex flex-col gap-3">
                <button onClick={confirmDeleteGoal} className="w-full py-4 min-h-[48px] bg-rose-500 text-white rounded-2xl font-black shadow-lg hover:bg-rose-600 transition-colors">אישור מחיקה</button>
                <button onClick={() => setGoalToDelete(null)} className="w-full py-3.5 min-h-[48px] text-gray-500 font-black hover:bg-gray-50 dark:hover:bg-white/5 rounded-2xl transition-all">ביטול</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAdding && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="bg-white dark:bg-[#1e1e1e] p-5 sm:p-8 rounded-[28px] sm:rounded-[40px] border border-brand/20 shadow-2xl space-y-6 sm:space-y-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest mr-2">שם היעד (למשל: תאילנד 2025)</label>
                <input type="text" value={newGoal.title} onChange={e => setNewGoal({...newGoal, title: e.target.value})}
                  className="w-full bg-gray-50 dark:bg-gray-800 dark:text-white border-none rounded-2xl px-4 sm:px-5 py-3.5 sm:py-4 font-bold outline-none focus:ring-2 focus:ring-brand/20" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest mr-2">סכום יעד (₪)</label>
                <input type="number" inputMode="decimal" value={newGoal.targetAmount} onChange={e => setNewGoal({...newGoal, targetAmount: e.target.value})}
                  className="w-full bg-gray-50 dark:bg-gray-800 dark:text-white border-none rounded-2xl px-4 sm:px-5 py-3.5 sm:py-4 font-bold outline-none focus:ring-2 focus:ring-brand/20" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest mr-2">תאריך יעד</label>
                <input type="date" value={newGoal.deadline} onChange={e => setNewGoal({...newGoal, deadline: e.target.value})}
                  className="w-full bg-gray-50 dark:bg-gray-800 dark:text-white border-none rounded-2xl px-4 sm:px-5 py-3.5 sm:py-4 font-bold outline-none focus:ring-2 focus:ring-brand/20" />
              </div>
            </div>
            <div className="flex gap-3 sm:justify-end">
              <button onClick={() => setIsAdding(false)} className="flex-1 sm:flex-none px-6 sm:px-8 py-3.5 min-h-[48px] text-gray-500 font-bold rounded-2xl hover:bg-gray-50 dark:hover:bg-white/5">ביטול</button>
              <button onClick={handleAddGoal} className="flex-1 sm:flex-none bg-brand text-white px-8 sm:px-10 py-3.5 min-h-[48px] rounded-2xl font-black shadow-lg">צור יעד</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8">
        {state.goals.length > 0 ? state.goals.map(goal => {
          const isEditing = editingGoalId === goal.id;
          const monthsLeft = Math.max(1, Math.ceil((new Date(goal.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 30.44)));
          const targetAmt = isEditing ? Number(editGoalData.targetAmount) || 1 : goal.targetAmount;
          const currentAmt = isEditing ? Number(editGoalData.currentAmount) || 0 : goal.currentAmount;
          const neededPerMonth = Math.max(0, (targetAmt - currentAmt) / monthsLeft);
          const progress = Math.min(100, Math.max(0, (currentAmt / Math.max(1, targetAmt)) * 100));

          return (
            <motion.div key={goal.id} layout className="bg-white dark:bg-[#1e1e1e] rounded-[28px] sm:rounded-[40px] p-5 sm:p-8 border border-gray-100 dark:border-gray-800 shadow-sm space-y-6 relative group overflow-hidden">
              <div className="absolute top-0 left-0 w-2 h-full bg-brand opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="flex justify-between items-start gap-2">
                <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 bg-emerald-50 dark:bg-emerald-900/20 text-brand rounded-2xl flex items-center justify-center shrink-0">
                    {goal.title.includes('טיסה') || goal.title.includes('חו"ל') ? <Plane size={20} /> : goal.title.includes('רכב') ? <Car size={20} /> : <Target size={20} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <input 
                        type="text" 
                        value={editGoalData.title} 
                        onChange={e => setEditGoalData({...editGoalData, title: e.target.value})}
                        className="w-full bg-gray-50 dark:bg-gray-800 dark:text-white border-none rounded-xl px-3 py-2 font-black text-base" 
                      />
                    ) : (
                      <h3 className="text-lg sm:text-xl font-black text-gray-800 dark:text-white truncate">{goal.title}</h3>
                    )}
                    <div className="flex items-center gap-1.5 mt-1">
                      <Calendar size={12} className="text-gray-400 shrink-0" />
                      {isEditing ? (
                        <input 
                          type="date" 
                          value={editGoalData.deadline} 
                          onChange={e => setEditGoalData({...editGoalData, deadline: e.target.value})}
                          className="bg-gray-50 dark:bg-gray-800 dark:text-white border-none rounded-lg px-2 py-1 text-xs font-bold text-gray-600 w-full" 
                        />
                      ) : (
                        <p className="text-gray-400 text-xs font-bold">יעד: {new Date(goal.deadline).toLocaleDateString('he-IL')}</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                   {isEditing ? (
                     <div className="flex gap-1">
                       <button onClick={() => handleUpdateGoal(goal.id)} aria-label="שמור יעד" className="min-w-[40px] min-h-[40px] flex items-center justify-center text-brand bg-brand/10 rounded-xl hover:bg-brand/20"><Check size={18} /></button>
                       <button onClick={() => setEditingGoalId(null)} aria-label="ביטול עריכה" className="min-w-[40px] min-h-[40px] flex items-center justify-center text-gray-400 bg-gray-100 dark:bg-white/5 rounded-xl"><X size={18} /></button>
                     </div>
                   ) : (
                     <div className="flex gap-0.5">
                       <button onClick={() => startEditing(goal)} aria-label={`ערוך ${goal.title}`} className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-gray-400 hover:text-brand transition-colors"><Edit2 size={17} /></button>
                       <button onClick={() => setGoalToDelete(goal)} aria-label={`מחק ${goal.title}`} className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-gray-400 hover:text-rose-500 transition-colors"><Trash2 size={17} /></button>
                     </div>
                   )}
                </div>
              </div>

              <div className="space-y-3">
                {isEditing ? (
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400">נחסך עד כה (₪)</label>
                      <input type="number" inputMode="decimal" value={editGoalData.currentAmount} onChange={e => setEditGoalData({...editGoalData, currentAmount: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-800 dark:text-white rounded-xl px-3 py-2.5 font-black text-sm outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400">סכום יעד (₪)</label>
                      <input type="number" inputMode="decimal" value={editGoalData.targetAmount} onChange={e => setEditGoalData({...editGoalData, targetAmount: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-800 dark:text-white rounded-xl px-3 py-2.5 font-black text-sm outline-none" />
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center text-xs font-black text-gray-400 gap-2">
                    <span className="tabular-nums truncate" dir="ltr">₪{goal.currentAmount.toLocaleString()} / ₪{goal.targetAmount.toLocaleString()}</span>
                    <span className="shrink-0">{Math.round(progress)}% הושלם</span>
                  </div>
                )}
                <div className="h-3 bg-gray-50 dark:bg-gray-800 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="h-full bg-brand shadow-[0_0_10px_rgba(0,184,148,0.4)]" />
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800/40 p-4 sm:p-5 rounded-2xl sm:rounded-3xl space-y-1.5">
                <div className="flex items-center gap-2.5">
                  <Calculator size={16} className="text-gray-400" />
                  <p className="text-xs sm:text-sm font-bold text-gray-600 dark:text-gray-300">נדרש לחסוך בכל חודש:</p>
                </div>
                <p className="text-2xl sm:text-3xl font-black text-gray-800 dark:text-white tabular-nums" dir="ltr">₪{Math.round(neededPerMonth).toLocaleString()}</p>
              </div>

              <div className="pt-3 border-t border-gray-50 dark:border-gray-800">
                <AnimatePresence mode="wait">
                  {aiAnalysis[goal.id] ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-brand/5 p-4 rounded-2xl border border-brand/10">
                      <div className="flex items-center gap-2 mb-2 text-brand">
                        <Sparkles size={14} />
                        <span className="text-[10px] font-black uppercase">תובנת SmartWise</span>
                      </div>
                      <p className="text-xs font-bold text-gray-600 dark:text-gray-300 leading-relaxed italic">
                        "{aiAnalysis[goal.id]}"
                      </p>
                    </motion.div>
                  ) : (
                    <button 
                      onClick={() => analyzeGoal(goal)} 
                      disabled={isAnalyzing === goal.id}
                      className="w-full min-h-[44px] flex items-center justify-center gap-2.5 py-2.5 rounded-2xl text-brand font-black text-sm hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-all"
                    >
                      {isAnalyzing === goal.id ? (
                        <div className="w-4 h-4 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
                      ) : <BrainCircuit size={18} />}
                      איך מגיעים לזה? ניתוח AI
                    </button>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        }) : (
          <div className="col-span-full py-20 sm:py-32 text-center space-y-6">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gray-50 dark:bg-gray-800 rounded-[32px] sm:rounded-[40px] flex items-center justify-center mx-auto text-gray-200 dark:text-gray-700">
              <Target size={44} />
            </div>
            <div className="max-w-md mx-auto">
              <h3 className="text-xl sm:text-2xl font-black text-gray-800 dark:text-white">עדיין אין לכם יעדים?</h3>
              <p className="text-gray-400 font-bold text-sm sm:text-base mt-2">הגדרת מטרה היא הצעד הראשון להגשמתה. הוסיפו את החלום הבא שלכם עכשיו.</p>
            </div>
            <button onClick={() => setIsAdding(true)} className="text-brand font-black hover:underline underline-offset-8 min-h-[44px] px-4">בואו נתחיל!</button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default GoalsView;
