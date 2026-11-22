
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserState, Category } from '../types';
import { 
  User, Shield, Target, Plus, Trash2, LayoutGrid, Palette, Lock, 
  Key, CheckCircle2, Edit2, RotateCcw, Check, X, AlertCircle 
} from 'lucide-react';
import { db, auth, updatePassword } from '../firebase';
import { doc, setDoc, deleteDoc, collection, addDoc, updateDoc, writeBatch, getDocs } from 'firebase/firestore';
import { DEFAULT_CATEGORIES } from '../constants';

interface SettingsProps {
  state: UserState;
}

const SettingsView: React.FC<SettingsProps> = ({ state }) => {
  const [tab, setTab] = useState<'profile' | 'categories' | 'budgets' | 'security'>('categories');
  const [newCatName, setNewCatName] = useState('');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [isAddingLoading, setIsAddingLoading] = useState(false);
  const [statusBanner, setStatusBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  
  const showBanner = (type: 'success' | 'error', text: string) => {
    setStatusBanner({ type, text });
    setTimeout(() => setStatusBanner(null), 3500);
  };

  const getUniqueColor = () => {
    const vibrantColors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', 
      '#F7DC6F', '#BB8FCE', '#82E0AA', '#F1948A', '#85C1E9',
      '#00b894', '#0984e3', '#fdcb6e', '#6c5ce7', '#e17055',
      '#e84393', '#fab1a0', '#74b9ff', '#00cec9', '#ffe119'
    ];
    
    const usedColors = state.categories.map(c => c.color.toUpperCase());
    const availableColors = vibrantColors.filter(color => !usedColors.includes(color.toUpperCase()));
    
    return availableColors.length > 0 
      ? availableColors[0] 
      : `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`;
  };

  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [userName, setUserName] = useState(state.profile?.name || '');
  const [userGender, setUserGender] = useState(state.profile?.gender || 'male');

  const handleUpdateProfile = async () => {
    if (!auth.currentUser) return;
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), { name: userName, gender: userGender });
      showBanner('success', 'הפרופיל עודכן בהצלחה!');
    } catch (e) {
      console.error(e);
      showBanner('error', 'שגיאה בעדכון הפרופיל');
    }
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim() || !auth.currentUser) return;
    setIsAddingLoading(true);
    try {
      const color = getUniqueColor();
      await addDoc(collection(db, 'users', auth.currentUser.uid, 'categories'), {
        name: newCatName.trim(),
        color: color,
        isDefault: false,
        createdAt: new Date().toISOString()
      });
      setNewCatName('');
      showBanner('success', 'הקטגוריה נוספה בהצלחה');
    } catch (e) { 
      console.error(e);
      showBanner('error', 'שגיאה בהוספת קטגוריה');
    } finally {
      setIsAddingLoading(false);
    }
  };

  const handleUpdateCategory = async (id: string) => {
    if (!auth.currentUser || !editName.trim()) return;
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid, 'categories', id), {
        name: editName.trim(),
        color: editColor
      });
      setEditingCatId(null);
    } catch (e) { console.error(e); }
  };

  const confirmDeleteCategory = async () => {
    if (!auth.currentUser || !categoryToDelete) return;
    try {
      await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'categories', categoryToDelete.id));
      setCategoryToDelete(null);
      showBanner('success', 'הקטגוריה נמחקה');
    } catch (e) {
      console.error(e);
      showBanner('error', 'שגיאה במחיקת הקטגוריה');
    }
  };

  const updateBudget = async (categoryId: string, amount: number) => {
    if (!auth.currentUser) return;
    try {
      await setDoc(doc(db, 'users', auth.currentUser.uid, 'budgets', categoryId), { categoryId, amount });
    } catch (e) { console.error(e); }
  };

  const handlePasswordChange = async () => {
    if (!newPass || newPass.length < 6) {
      showBanner('error', 'הסיסמה חייבת להכיל לפחות 6 תווים');
      return;
    }
    if (newPass !== confirmPass) {
      showBanner('error', 'הסיסמאות אינן תואמות');
      return;
    }
    if (!auth.currentUser) return;
    try {
      await updatePassword(auth.currentUser, newPass);
      setNewPass('');
      setConfirmPass('');
      showBanner('success', 'הסיסמה עודכנה בהצלחה!');
    } catch (e) {
      console.error(e);
      showBanner('error', 'יש להתחבר מחדש כדי לשנות סיסמה');
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 sm:space-y-8 pb-24 lg:pb-32 text-right max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black text-gray-800 dark:text-white tracking-tighter">הגדרות פרימיום</h1>
          <p className="text-gray-400 font-medium text-sm sm:text-lg">ניהול החשבון והתאמה אישית של המערכת.</p>
        </div>
      </header>

      <AnimatePresence>
        {statusBanner && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className={`p-4 rounded-2xl font-black text-sm flex items-center gap-3 border ${
              statusBanner.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/40'
            }`}
          >
            {statusBanner.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{statusBanner.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 sm:gap-6">
        <div className="grid grid-cols-2 lg:flex lg:flex-col gap-2 sm:gap-2.5">
          {[
            { id: 'profile', label: 'פרופיל אישי', icon: <User size={18} /> },
            { id: 'categories', label: 'ניהול קטגוריות', icon: <LayoutGrid size={18} /> },
            { id: 'budgets', label: 'ניהול תקציב', icon: <Target size={18} /> },
            { id: 'security', label: 'אבטחה ופרטיות', icon: <Shield size={18} /> }
          ].map(item => (
            <button key={item.id} onClick={() => setTab(item.id as any)}
              className={`flex items-center justify-center lg:justify-start gap-2.5 sm:gap-4 px-3 sm:px-6 py-3.5 sm:py-4 min-h-[48px] rounded-2xl font-black text-xs sm:text-sm transition-all ${tab === item.id ? 'bg-brand text-white shadow-lg' : 'text-gray-500 bg-white dark:bg-[#1e1e1e] hover:bg-emerald-50 dark:hover:bg-gray-800'}`}>
              <span className="shrink-0">{item.icon}</span>
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </div>

        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-[#1e1e1e] rounded-[28px] sm:rounded-[40px] p-5 sm:p-8 md:p-12 border border-gray-100 dark:border-gray-800 shadow-sm lg:min-h-[600px]">
            
            {tab === 'categories' && (
              <div className="space-y-6 sm:space-y-10">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg sm:text-xl font-black text-gray-800 dark:text-white">ניהול קטגוריות ({state.categories.length})</h3>
                </div>

                <div className="flex flex-col md:flex-row gap-3 sm:gap-4 p-4 sm:p-8 bg-gray-50 dark:bg-[#121212] rounded-[24px] sm:rounded-[40px] border-2 border-dashed border-gray-200 dark:border-white/5">
                   <div className="flex-1 space-y-2">
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-2">שם קטגוריה חדשה</label>
                     <input 
                       type="text" 
                       placeholder="למשל: תחביבים, לימודים..." 
                       value={newCatName} 
                       onChange={(e) => setNewCatName(e.target.value)}
                       onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                       className="w-full bg-white dark:bg-[#1e1e1e] dark:text-white border-none rounded-2xl px-4 sm:px-6 py-3.5 sm:py-4 font-bold text-sm shadow-sm focus:ring-2 focus:ring-brand/20 transition-all" 
                     />
                   </div>
                   <div className="flex items-end">
                     <button 
                       onClick={handleAddCategory} 
                       disabled={isAddingLoading || !newCatName.trim()}
                       className="w-full md:w-auto justify-center min-h-[48px] bg-brand text-white px-8 sm:px-10 py-3.5 sm:py-4 rounded-2xl font-black flex items-center gap-2 shadow-lg active:scale-95 transition-all disabled:opacity-50"
                     >
                       {isAddingLoading ? <RotateCcw className="animate-spin" size={20} /> : <Plus size={20} />} 
                       הוסף קטגוריה
                     </button>
                   </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {[...state.categories].sort((a,b) => a.name.localeCompare(b.name)).map(cat => (
                    <motion.div layout key={cat.id} className="relative p-4 sm:p-5 bg-gray-50 dark:bg-[#121212] rounded-2xl sm:rounded-3xl border border-transparent hover:border-brand/20 transition-all group overflow-hidden">
                      {editingCatId === cat.id ? (
                        <div className="space-y-3">
                          <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full bg-white dark:bg-[#1e1e1e] dark:text-white border-none rounded-xl px-4 py-2.5 font-bold text-sm" />
                          <div className="flex items-center justify-between">
                            <input type="color" value={editColor} onChange={e => setEditColor(e.target.value)} className="w-9 h-9 rounded-lg cursor-pointer bg-transparent border-none" />
                            <div className="flex gap-2">
                              <button onClick={() => setEditingCatId(null)} aria-label="ביטול" className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-gray-400 hover:text-red-500 bg-white dark:bg-[#1e1e1e]"><X size={18}/></button>
                              <button onClick={() => handleUpdateCategory(cat.id)} aria-label="שמור" className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-brand bg-brand/10"><Check size={18}/></button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-5 h-5 rounded-lg shadow-inner shrink-0" style={{ backgroundColor: cat.color }} />
                            <span className="font-bold text-gray-700 dark:text-gray-300 truncate">{cat.name}</span>
                          </div>
                          <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all shrink-0">
                            <button onClick={() => { setEditingCatId(cat.id); setEditName(cat.name); setEditColor(cat.color); }} aria-label={`ערוך ${cat.name}`} className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-gray-400 hover:text-brand"><Edit2 size={16} /></button>
                            <button onClick={() => setCategoryToDelete(cat)} aria-label={`מחק ${cat.name}`} className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                  {state.categories.length === 0 && (
                    <div className="col-span-full py-16 text-center space-y-4">
                       <AlertCircle className="mx-auto text-gray-300" size={48} />
                       <p className="text-gray-400 font-bold">לא נמצאו קטגוריות. התחל להוסיף!</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === 'profile' && (
              <div className="space-y-8 sm:space-y-12">
                <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-8 border-b border-gray-50 dark:border-gray-800 pb-8 sm:pb-10 text-center sm:text-right">
                  <div className="w-20 h-20 sm:w-32 sm:h-32 bg-brand rounded-[28px] sm:rounded-[40px] flex items-center justify-center text-white text-3xl sm:text-5xl font-black shadow-2xl shrink-0">
                    {userName[0] || 'U'}
                  </div>
                  <div>
                    <h3 className="text-2xl sm:text-3xl font-black text-gray-800 dark:text-white">{userName}</h3>
                    <p className="text-brand font-bold flex items-center justify-center sm:justify-start gap-2 mt-1"><CheckCircle2 size={16} /> חבר פרימיום ב-SmartWise</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-2">שם מלא</label>
                    <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} className="w-full bg-gray-50 dark:bg-[#121212] dark:text-white border-none rounded-2xl px-5 py-4 font-black" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-2">מגדר</label>
                    <select value={userGender} onChange={(e) => setUserGender(e.target.value as any)} className="w-full bg-gray-50 dark:bg-[#121212] dark:text-white border-none rounded-2xl px-5 py-4 font-black appearance-none"><option value="male">זכר</option><option value="female">נקבה</option></select>
                  </div>
                </div>
                <button onClick={handleUpdateProfile} className="w-full sm:w-auto px-12 py-4 sm:py-5 min-h-[48px] bg-brand text-white font-black rounded-2xl sm:rounded-[24px] shadow-xl active:scale-95 transition-all">עדכן פרופיל</button>
              </div>
            )}

            {tab === 'budgets' && (
              <div className="space-y-6 sm:space-y-10">
                <h3 className="text-lg sm:text-xl font-black text-gray-800 dark:text-white">ניהול תקציב חודשי</h3>
                <div className="grid grid-cols-1 gap-3 sm:gap-4">
                   {state.categories.map(cat => {
                     const currentBudget = state.budgets.find(b => b.categoryId === cat.id)?.amount || 0;
                     return (
                       <div key={cat.id} className="flex items-center justify-between p-4 sm:p-6 bg-gray-50 dark:bg-[#121212] rounded-2xl sm:rounded-3xl gap-3">
                         <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                           <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl shrink-0" style={{ backgroundColor: cat.color }} />
                           <span className="font-black text-sm sm:text-base text-gray-800 dark:text-gray-200 truncate">{cat.name}</span>
                         </div>
                         <div className="relative shrink-0">
                           <input type="number" inputMode="decimal" defaultValue={currentBudget} onBlur={(e) => updateBudget(cat.id, Number(e.target.value))} className="bg-white dark:bg-[#1e1e1e] border-none rounded-xl pr-8 pl-3 py-2.5 sm:py-3 font-black w-28 sm:w-40 text-brand tabular-nums text-left" dir="ltr" />
                           <span className="absolute right-3 top-1/2 -translate-y-1/2 font-black text-brand text-sm">₪</span>
                         </div>
                       </div>
                     );
                   })}
                </div>
              </div>
            )}

            {tab === 'security' && (
              <div className="space-y-6 sm:space-y-10 max-w-md">
                <h4 className="text-lg sm:text-xl font-black text-gray-800 dark:text-white flex items-center gap-3"><Key size={22} className="text-brand" /> שינוי סיסמה</h4>
                <div className="space-y-4">
                  <input type="password" placeholder="סיסמה חדשה" value={newPass} onChange={(e) => setNewPass(e.target.value)} className="w-full bg-gray-50 dark:bg-[#121212] dark:text-white border-none rounded-2xl px-5 py-4 font-bold" />
                  <input type="password" placeholder="אימות סיסמה" value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} className="w-full bg-gray-50 dark:bg-[#121212] dark:text-white border-none rounded-2xl px-5 py-4 font-bold" />
                  <button onClick={handlePasswordChange} className="w-full bg-gray-900 text-white py-4 sm:py-5 min-h-[48px] rounded-2xl font-black shadow-lg active:scale-95 transition-all">עדכן סיסמה</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Category Delete Confirmation Modal */}
      <AnimatePresence>
        {categoryToDelete && (
          <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setCategoryToDelete(null)} className="absolute inset-0 bg-black/70 backdrop-blur-xl" />
            <motion.div initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }} className="relative w-full max-w-md bg-white dark:bg-[#1a1a1a] rounded-t-[32px] sm:rounded-[40px] p-6 sm:p-10 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl border border-gray-100 dark:border-white/5 space-y-6 text-center">
              <div className="w-12 h-1.5 bg-gray-200 dark:bg-white/10 rounded-full mx-auto sm:hidden" />
              <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-3xl flex items-center justify-center mx-auto"><AlertCircle size={32} /></div>
              <h2 className="text-xl sm:text-2xl font-black text-gray-800 dark:text-white">מחיקת קטגוריה</h2>
              <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl flex items-center justify-center gap-3">
                <div className="w-4 h-4 rounded-md" style={{ backgroundColor: categoryToDelete.color }} />
                <span className="font-black text-gray-800 dark:text-white">{categoryToDelete.name}</span>
              </div>
              <p className="text-sm font-bold text-gray-400">האם למחוק קטגוריה זו? כל התנועות המשויכות אליה יישארו ללא קטגוריה.</p>
              <div className="flex flex-col gap-3">
                <button onClick={confirmDeleteCategory} className="w-full py-4 min-h-[48px] bg-rose-500 text-white rounded-2xl font-black shadow-lg hover:bg-rose-600 transition-colors">אישור מחיקה</button>
                <button onClick={() => setCategoryToDelete(null)} className="w-full py-3.5 min-h-[48px] text-gray-500 font-black hover:bg-gray-50 dark:hover:bg-white/5 rounded-2xl transition-all">ביטול</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default SettingsView;
