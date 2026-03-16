
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
    } catch (e) { console.error(e); }
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
      alert("שגיאה בעדכון היעד");
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
      alert("אירעה שגיאה במחיקת היעד.");
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10 pb-32 text-right">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-800 dark:text-white tracking-tight">היעדים והמטרות שלכם</h1>
          <p className="text-gray-400 font-medium text-lg">חופשה, רכב או עתיד הילדים - הכל מתחיל בתכנון נכון.</p>
        </div>
        <button onClick={() => setIsAdding(true)} className="bg-brand text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-brand/20 active:scale-95 transition-all flex items-center gap-2">
          <Plus size={20} /> יעד משפחתי חדש
        </button>
      </header>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {goalToDelete && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setGoalToDelete(null)} className="absolute inset-0 bg-black/70 backdrop-blur-xl" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative w-full max-w-md bg-white dark:bg-[#1a1a1a] rounded-[40px] p-10 shadow-2xl border border-gray-100 dark:border-white/5 space-y-8 text-center">
              <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-3xl flex items-center justify-center mx-auto shadow-inner"><AlertCircle size={40} /></div>
              <h2 className="text-2xl font-black text-gray-800 dark:text-white">מחיקת יעד</h2>
              <div className="p-5 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                <p className="text-lg font-black text-gray-800 dark:text-white">"{goalToDelete.title}"</p>
                <p className="text-brand font-black mt-1">₪{goalToDelete.targetAmount.toLocaleString()}</p>
              </div>
              <p className="text-sm font-bold text-gray-400">האם אתה בטוח שברצונך למחוק את היעד? פעולה זו אינה ניתנת לביטול.</p>
              <div className="flex flex-col gap-3">
                <button onClick={confirmDeleteGoal} className="w-full py-4 bg-rose-500 text-white rounded-2xl font-black shadow-lg hover:bg-rose-600 transition-colors">אישור מחיקה</button>
                <button onClick={() => setGoalToDelete(null)} className="w-full py-4 text-gray-500 font-black hover:bg-gray-50 dark:hover:bg-white/5 rounded-2xl transition-all">ביטול</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAdding && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="bg-white dark:bg-[#1e1e1e] p-8 rounded-[40px] border border-brand/20 shadow-2xl space-y-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest mr-2">שם היעד (למשל: תאילנד 2025)</label>
                <input type="text" value={newGoal.title} onChange={e => setNewGoal({...newGoal, title: e.target.value})}
                  className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-5 py-4 font-bold outline-none focus:ring-2 focus:ring-brand/20" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest mr-2">סכום יעד (₪)</label>
                <input type="number" value={newGoal.targetAmount} onChange={e => setNewGoal({...newGoal, targetAmount: e.target.value})}
                  className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-5 py-4 font-bold outline-none focus:ring-2 focus:ring-brand/20" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest mr-2">תאריך יעד</label>
                <input type="date" value={newGoal.deadline} onChange={e => setNewGoal({...newGoal, deadline: e.target.value})}
                  className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-5 py-4 font-bold outline-none focus:ring-2 focus:ring-brand/20" />
              </div>
            </div>
            <div className="flex justify-end gap-4">
              <button onClick={() => setIsAdding(false)} className="px-8 py-4 text-gray-400 font-bold">ביטול</button>
              <button onClick={handleAddGoal} className="bg-brand text-white px-10 py-4 rounded-2xl font-black shadow-lg">צור יעד</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {state.goals.length > 0 ? state.goals.map(goal => {
          const isEditing = editingGoalId === goal.id;
          const monthsLeft = Math.max(1, Math.ceil((new Date(goal.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 30.44)));
          const targetAmt = isEditing ? Number(editGoalData.targetAmount) : goal.targetAmount;
          const currentAmt = isEditing ? Number(editGoalData.currentAmount) : goal.currentAmount;
          const neededPerMonth = Math.max(0, (targetAmt - currentAmt) / monthsLeft);
          const progress = Math.min(100, (currentAmt / targetAmt) * 100);

          return (
            <motion.div key={goal.id} layout className="bg-white dark:bg-[#1e1e1e] rounded-[40px] p-8 border border-gray-100 dark:border-gray-800 shadow-sm space-y-8 relative group overflow-hidden">
              <div className="absolute top-0 left-0 w-2 h-full bg-brand opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 text-brand rounded-2xl flex items-center justify-center shrink-0">
                    {goal.title.includes('טיסה') || goal.title.includes('חו"ל') ? <Plane /> : goal.title.includes('רכב') ? <Car /> : <Target />}
                  </div>
                  <div className="flex-1">
                    {isEditing ? (
                      <input 
                        type="text" 
                        value={editGoalData.title} 
                        onChange={e => setEditGoalData({...editGoalData, title: e.target.value})}
                        className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl px-3 py-1 font-black text-lg" 
                      />
                    ) : (
                      <h3 className="text-xl font-black text-gray-800 dark:text-white truncate">{goal.title}</h3>
                    )}
                    <div className="flex items-center gap-1 mt-1">
                      <Calendar size={12} className="text-gray-400" />
                      {isEditing ? (
                        <input 
                          type="date" 
                          value={editGoalData.deadline} 
                          onChange={e => setEditGoalData({...editGoalData, deadline: e.target.value})}
                          className="bg-gray-50 dark:bg-gray-800 border-none rounded-lg px-2 py-0.5 text-xs font-bold text-gray-600" 
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
                       <button onClick={() => handleUpdateGoal(goal.id)} className="p-2 text-brand bg-brand/10 rounded-xl hover:bg-brand/20"><Check size={16} /></button>
                       <button onClick={() => setEditingGoalId(null)} className="p-2 text-gray-400 bg-gray-100 dark:bg-white/5 rounded-xl"><X size={16} /></button>
                     </div>
                   ) : (
                     <div className="flex gap-1">
                       <button onClick={() => startEditing(goal)} className="p-2 text-gray-300 hover:text-brand transition-colors"><Edit2 size={16} /></button>
                       <button onClick={() => setGoalToDelete(goal)} className="p-2 text-gray-200 hover:text-rose-500 transition-colors"><Trash2 size={16} /></button>
                     </div>
                   )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-xs font-black uppercase tracking-widest text-gray-400">
                  {isEditing ? (
                    <div className="flex gap-2">
                       <input type="number" value={editGoalData.currentAmount} onChange={e => setEditGoalData({...editGoalData, currentAmount: e.target.value})} className="w-16 bg-gray-50 dark:bg-gray-800 rounded px-1 outline-none" />
                       <span>/</span>
                       <input type="number" value={editGoalData.targetAmount} onChange={e => setEditGoalData({...editGoalData, targetAmount: e.target.value})} className="w-16 bg-gray-50 dark:bg-gray-800 rounded px-1 outline-none" />
                    </div>
                  ) : (
                    <span>₪{goal.currentAmount.toLocaleString()} / ₪{goal.targetAmount.toLocaleString()}</span>
                  )}
                  <span>{Math.round(progress)}% הושלם</span>
                </div>
                <div className="h-3 bg-gray-50 dark:bg-gray-800 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="h-full bg-brand shadow-[0_0_10px_rgba(0,184,148,0.4)]" />
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800/40 p-5 rounded-3xl space-y-2">
                <div className="flex items-center gap-3">
                  <Calculator size={18} className="text-gray-400" />
                  <p className="text-sm font-bold text-gray-600 dark:text-gray-300">נדרש לחסוך בכל חודש:</p>
                </div>
                <p className="text-3xl font-black text-gray-800 dark:text-white">₪{Math.round(neededPerMonth).toLocaleString()}</p>
              </div>

              <div className="pt-4 border-t border-gray-50 dark:border-gray-800">
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
                      className="w-full flex items-center justify-center gap-3 py-3 rounded-2xl text-brand font-black text-sm hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-all"
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
          <div className="col-span-full py-32 text-center space-y-6">
            <div className="w-24 h-24 bg-gray-50 dark:bg-gray-800 rounded-[40px] flex items-center justify-center mx-auto text-gray-200 dark:text-gray-700">
              <Target size={48} />
            </div>
            <div className="max-w-md mx-auto">
              <h3 className="text-2xl font-black text-gray-800 dark:text-white">עדיין אין לכם יעדים?</h3>
              <p className="text-gray-400 font-bold mt-2">הגדרת מטרה היא הצעד הראשון להגשמתה. הוסיפו את החלום הבא שלכם עכשיו.</p>
            </div>
            <button onClick={() => setIsAdding(true)} className="text-brand font-black hover:underline underline-offset-8">בואו נתחיל!</button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default GoalsView;
