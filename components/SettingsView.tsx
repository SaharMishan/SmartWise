
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
  
  const getUniqueColor = () => {
    const vibrantColors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', 
      '#F7DC6F', '#BB8FCE', '#82E0AA', '#F1948A', '#85C1E9',
      '#00b894', '#0984e3', '#fdcb6e', '#6c5ce7', '#e17055',
      '#e84393', '#fab1a0', '#74b9ff', '#00cec9', '#ffe119'
    ];
    
    const usedColors = state.categories.map(c => c.color.toUpperCase());
    const availableColors = vibrantColors.filter(color => !usedColors.includes(color.toUpperCase()));
    
    // Return first available, or a random one if all are used
    return availableColors.length > 0 
      ? availableColors[0] 
      : `#${Math.floor(Math.random()*16777215).toString(16)}`;
  };

  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [userName, setUserName] = useState(state.profile?.name || '');
  const [userGender, setUserGender] = useState(state.profile?.gender || 'male');

  const handleUpdateProfile = async () => {
    if (!auth.currentUser) return;
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), { name: userName, gender: userGender });
      alert('הפרופיל עודכן בהצלחה!');
    } catch (e) { console.error(e); }
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
    } catch (e) { 
      console.error(e);
      alert('שגיאה בהוספת קטגוריה');
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

  const handleDeleteCategory = async (id: string) => {
    if (!auth.currentUser || !confirm('האם למחוק קטגוריה זו? כל התנועות המשויכות אליה יישארו ללא קטגוריה.')) return;
    try {
      await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'categories', id));
    } catch (e) { console.error(e); }
  };

  const updateBudget = async (categoryId: string, amount: number) => {
    if (!auth.currentUser) return;
    try {
      await setDoc(doc(db, 'users', auth.currentUser.uid, 'budgets', categoryId), { categoryId, amount });
    } catch (e) { console.error(e); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 pb-32 text-right max-w-7xl mx-auto px-4">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-gray-800 dark:text-white tracking-tighter">הגדרות פרימיום</h1>
          <p className="text-gray-400 font-medium text-lg">ניהול החשבון והתאמה אישית של המערכת.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="flex flex-col gap-2">
          {[
            { id: 'profile', label: 'פרופיל אישי', icon: <User size={18} /> },
            { id: 'categories', label: 'ניהול קטגוריות', icon: <LayoutGrid size={18} /> },
            { id: 'budgets', label: 'ניהול תקציב', icon: <Target size={18} /> },
            { id: 'security', label: 'אבטחה ופרטיות', icon: <Shield size={18} /> }
          ].map(item => (
            <button key={item.id} onClick={() => setTab(item.id as any)}
              className={`flex items-center gap-4 px-6 py-4 rounded-2xl font-black transition-all ${tab === item.id ? 'bg-brand text-white shadow-lg' : 'text-gray-500 bg-white dark:bg-[#1e1e1e] hover:bg-emerald-50 dark:hover:bg-gray-800'}`}>
              {item.icon} {item.label}
            </button>
          ))}
        </div>

        <div className="md:col-span-3">
          <div className="bg-white dark:bg-[#1e1e1e] rounded-[40px] p-8 md:p-12 border border-gray-100 dark:border-gray-800 shadow-sm min-h-[600px]">
            
            {tab === 'categories' && (
              <div className="space-y-10">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-black text-gray-800 dark:text-white">ניהול קטגוריות ({state.categories.length})</h3>
                </div>

                <div className="flex flex-col md:flex-row gap-4 p-8 bg-gray-50 dark:bg-[#121212] rounded-[40px] border-2 border-dashed border-gray-200 dark:border-white/5">
                   <div className="flex-1 space-y-2">
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-2">שם קטגוריה חדשה</label>
                     <input 
                       type="text" 
                       placeholder="למשל: תחביבים, לימודים..." 
                       value={newCatName} 
                       onChange={(e) => setNewCatName(e.target.value)}
                       onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                       className="w-full bg-white dark:bg-[#1e1e1e] border-none rounded-2xl px-6 py-4 font-bold text-sm shadow-sm focus:ring-2 focus:ring-brand/20 transition-all" 
                     />
                   </div>
                   <div className="flex items-end">
                     <button 
                       onClick={handleAddCategory} 
                       disabled={isAddingLoading || !newCatName.trim()}
                       className="bg-brand text-white px-10 py-4 rounded-2xl font-black flex items-center gap-2 shadow-lg active:scale-95 transition-all disabled:opacity-50"
                     >
                       {isAddingLoading ? <RotateCcw className="animate-spin" size={20} /> : <Plus size={20} />} 
                       הוסף קטגוריה
                     </button>
                   </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {state.categories.sort((a,b) => a.name.localeCompare(b.name)).map(cat => (
                    <motion.div layout key={cat.id} className="relative p-5 bg-gray-50 dark:bg-[#121212] rounded-3xl border border-transparent hover:border-brand/20 transition-all group overflow-hidden">
                      {editingCatId === cat.id ? (
                        <div className="space-y-4">
                          <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full bg-white dark:bg-[#1e1e1e] border-none rounded-xl px-4 py-2 font-bold text-sm" />
                          <div className="flex items-center justify-between">
                            <input type="color" value={editColor} onChange={e => setEditColor(e.target.value)} className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-none" />
                            <div className="flex gap-2">
                              <button onClick={() => setEditingCatId(null)} className="p-2 text-gray-400 hover:text-red-500"><X size={18}/></button>
                              <button onClick={() => handleUpdateCategory(cat.id)} className="p-2 text-brand"><Check size={18}/></button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-5 h-5 rounded-lg shadow-inner" style={{ backgroundColor: cat.color }} />
                            <span className="font-bold text-gray-700 dark:text-gray-300">{cat.name}</span>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button onClick={() => { setEditingCatId(cat.id); setEditName(cat.name); setEditColor(cat.color); }} className="p-2 text-gray-400 hover:text-brand"><Edit2 size={16} /></button>
                            <button onClick={() => handleDeleteCategory(cat.id)} className="p-2 text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                  {state.categories.length === 0 && (
                    <div className="col-span-full py-20 text-center space-y-4">
                       <AlertCircle className="mx-auto text-gray-300" size={48} />
                       <p className="text-gray-400 font-bold">לא נמצאו קטגוריות. התחל להוסיף!</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === 'profile' && (
              <div className="space-y-12">
                <div className="flex flex-col md:flex-row items-center gap-8 border-b border-gray-50 dark:border-gray-800 pb-10">
                  <div className="w-32 h-32 bg-brand rounded-[40px] flex items-center justify-center text-white text-5xl font-black shadow-2xl">
                    {userName[0] || 'U'}
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-gray-800 dark:text-white">{userName}</h3>
                    <p className="text-brand font-bold flex items-center gap-2"><CheckCircle2 size={16} /> חבר פרימיום ב-SmartWise</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest mr-2">שם מלא</label>
                    <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} className="w-full bg-gray-50 dark:bg-[#121212] dark:text-white border-none rounded-2xl px-6 py-4 font-black" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest mr-2">מגדר</label>
                    <select value={userGender} onChange={(e) => setUserGender(e.target.value as any)} className="w-full bg-gray-50 dark:bg-[#121212] dark:text-white border-none rounded-2xl px-6 py-4 font-black appearance-none"><option value="male">זכר</option><option value="female">נקבה</option></select>
                  </div>
                </div>
                <button onClick={handleUpdateProfile} className="px-12 py-5 bg-brand text-white font-black rounded-[24px] shadow-xl active:scale-95 transition-all">עדכן פרופיל</button>
              </div>
            )}

            {tab === 'budgets' && (
              <div className="space-y-10">
                <h3 className="text-xl font-black text-gray-800 dark:text-white">ניהול תקציב חודשי</h3>
                <div className="grid grid-cols-1 gap-4">
                   {state.categories.map(cat => {
                     const currentBudget = state.budgets.find(b => b.categoryId === cat.id)?.amount || 0;
                     return (
                       <div key={cat.id} className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-gray-50 dark:bg-[#121212] rounded-3xl gap-4">
                         <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-xl" style={{ backgroundColor: cat.color }} />
                           <span className="font-black text-gray-800 dark:text-gray-200">{cat.name}</span>
                         </div>
                         <div className="relative">
                           <input type="number" defaultValue={currentBudget} onBlur={(e) => updateBudget(cat.id, Number(e.target.value))} className="bg-white dark:bg-[#1e1e1e] border-none rounded-xl pr-10 pl-4 py-3 font-black w-40 text-brand" />
                           <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-brand">₪</span>
                         </div>
                       </div>
                     );
                   })}
                </div>
              </div>
            )}

            {tab === 'security' && (
              <div className="space-y-12 max-w-md">
                <h4 className="text-xl font-black text-gray-800 dark:text-white flex items-center gap-3"><Key size={24} className="text-brand" /> שינוי סיסמה</h4>
                <div className="space-y-4">
                  <input type="password" placeholder="סיסמה חדשה" value={newPass} onChange={(e) => setNewPass(e.target.value)} className="w-full bg-gray-50 dark:bg-[#121212] dark:text-white border-none rounded-2xl px-6 py-5 font-bold" />
                  <input type="password" placeholder="אימות סיסמה" value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} className="w-full bg-gray-50 dark:bg-[#121212] dark:text-white border-none rounded-2xl px-6 py-5 font-bold" />
                  <button onClick={async () => { if (newPass !== confirmPass) return alert('סיסמאות לא תואמות'); if (auth.currentUser) await updatePassword(auth.currentUser, newPass); alert('סיסמה עודכנה!'); }} className="w-full bg-gray-900 text-white py-5 rounded-2xl font-black shadow-lg active:scale-95 transition-all">עדכן סיסמה</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default SettingsView;
