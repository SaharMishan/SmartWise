
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserState, ShoppingItem } from '../types';
import { auth, db } from '../firebase';
import { collection, addDoc, deleteDoc, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { ShoppingBag, Plus, Trash2, History, Check, RotateCcw, ShoppingCart, Sparkles } from 'lucide-react';

interface ShoppingViewProps {
  state: UserState;
}

const ShoppingView: React.FC<ShoppingViewProps> = ({ state }) => {
  const [itemName, setItemName] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const addItem = async (name: string) => {
    const finalName = name.trim();
    if (!finalName || !auth.currentUser) return;
    
    const existing = state.shoppingList.find(i => i.name.toLowerCase() === finalName.toLowerCase());
    if (existing) {
      if (existing.bought) {
        await updateDoc(doc(db, 'users', auth.currentUser.uid, 'shopping', existing.id), {
          bought: false,
          lastAdded: new Date().toISOString()
        });
      }
      setItemName('');
      return;
    }

    try {
      await addDoc(collection(db, 'users', auth.currentUser.uid, 'shopping'), {
        name: finalName,
        bought: false,
        lastAdded: new Date().toISOString()
      });
      setItemName('');
    } catch (e) { console.error(e); }
  };

  const toggleItem = async (item: ShoppingItem) => {
    if (!auth.currentUser) return;
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid, 'shopping', item.id), {
        bought: !item.bought
      });
    } catch (e) { console.error(e); }
  };

  const confirmClearBought = async () => {
    if (!auth.currentUser) return;
    const batch = writeBatch(db);
    state.shoppingList.filter(i => i.bought).forEach(i => {
      batch.delete(doc(db, 'users', auth.currentUser!.uid, 'shopping', i.id));
    });
    await batch.commit();
    setShowClearConfirm(false);
  };

  const deleteItem = async (id: string) => {
    if (!auth.currentUser) return;
    await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'shopping', id));
  };

  const currentList = state.shoppingList.filter(i => !i.bought);
  const boughtItems = state.shoppingList.filter(i => i.bought).sort((a,b) => new Date(b.lastAdded).getTime() - new Date(a.lastAdded).getTime());

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 sm:space-y-10 pb-24 lg:pb-32 max-w-4xl mx-auto text-right">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl sm:text-4xl font-black text-gray-800 dark:text-white tracking-tight flex items-center gap-3">
             <ShoppingBag className="text-brand shrink-0" size={28} /> רשימת קניות
          </h1>
          <p className="text-gray-400 font-bold text-sm sm:text-lg mt-1">נהלו את הקניות של הבית בסטייל.</p>
        </div>
        <button 
          onClick={() => setShowHistory(!showHistory)}
          className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 min-h-[44px] rounded-2xl sm:rounded-[24px] font-black text-sm shadow-lg transition-all ${showHistory ? 'bg-brand text-white' : 'bg-white dark:bg-white/5 text-gray-500 dark:text-gray-300'}`}
        >
          <History size={18} /> {showHistory ? 'חזרה לרשימה' : 'מה קנינו בעבר?'}
        </button>
      </header>

      <div className="bg-white dark:bg-[#1e1e1e] p-2.5 sm:p-4 rounded-[28px] sm:rounded-[40px] shadow-2xl flex gap-2 sm:gap-3 border border-gray-100 dark:border-white/5 items-center">
        <input 
          type="text" 
          placeholder="מה צריך להביא הביתה?" 
          value={itemName} 
          onChange={(e) => setItemName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addItem(itemName)}
          className="flex-1 min-w-0 bg-gray-50 dark:bg-[#0a0a0a] dark:text-white border-none rounded-[20px] sm:rounded-[30px] px-4 sm:px-8 py-3.5 sm:py-5 font-bold outline-none focus:ring-2 focus:ring-brand/20 transition-all text-base sm:text-xl"
        />
        <button onClick={() => addItem(itemName)} aria-label="הוסף פריט" className="bg-brand text-white w-12 h-12 sm:w-16 sm:h-16 shrink-0 rounded-[20px] sm:rounded-[30px] shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all">
          <Plus size={26} strokeWidth={3} />
        </button>
      </div>

      <AnimatePresence mode="wait">
        {showHistory ? (
          <motion.div key="history" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-6 sm:space-y-8">
             <div className="bg-gradient-to-r from-brand/20 to-emerald-400/10 p-5 sm:p-8 rounded-[28px] sm:rounded-[40px] border border-brand/20">
               <div className="flex items-center gap-3 mb-2">
                 <Sparkles className="text-brand" size={20} />
                 <h4 className="font-black text-brand text-lg sm:text-xl">קניות חכמות מהעבר</h4>
               </div>
               <p className="text-xs sm:text-sm font-bold text-gray-500 dark:text-gray-300">בחרו פריטים שקניתם בעבר כדי להוסיף אותם שוב לסל בלחיצה אחת.</p>
             </div>
             
             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
               {boughtItems.length > 0 ? boughtItems.map(item => (
                 <motion.button 
                   whileHover={{ y: -5, scale: 1.02 }} whileTap={{ scale: 0.95 }}
                   key={item.id} 
                   onClick={() => toggleItem(item)}
                   className="p-4 sm:p-6 bg-white dark:bg-[#1e1e1e] border border-gray-100 dark:border-white/10 rounded-[24px] sm:rounded-[32px] font-black text-right shadow-sm hover:shadow-xl hover:border-brand transition-all flex flex-col justify-between min-h-[104px] sm:min-h-[120px]"
                 >
                   <span className="text-sm sm:text-lg text-gray-700 dark:text-gray-200 line-clamp-2">{item.name}</span>
                   <div className="flex justify-between items-center mt-3 sm:mt-4">
                     <span className="text-[10px] text-gray-400">נוסף לאחרונה</span>
                     <div className="w-8 h-8 bg-brand/10 text-brand rounded-xl flex items-center justify-center shrink-0"><Plus size={16} /></div>
                   </div>
                 </motion.button>
               )) : <div className="col-span-full py-16 text-center text-gray-400 italic font-bold">ההיסטוריה תתמלא ככל שתשתמשו באפליקציה.</div>}
             </div>
          </motion.div>
        ) : (
          <motion.div key="list" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="space-y-6">
            <div className="grid gap-3 sm:gap-4">
              {currentList.map(item => (
                <motion.div layout key={item.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                  className="group bg-white dark:bg-[#1e1e1e] p-3.5 sm:p-6 rounded-[24px] sm:rounded-[35px] border border-gray-100 dark:border-white/5 flex items-center justify-between gap-3 shadow-sm hover:shadow-xl transition-all">
                  <div className="flex items-center gap-3 sm:gap-6 min-w-0 flex-1">
                    <button 
                      onClick={() => toggleItem(item)}
                      aria-label={`סמן ${item.name} כנקנה`}
                      className="w-11 h-11 min-w-[44px] min-h-[44px] sm:w-12 sm:h-12 shrink-0 rounded-2xl sm:rounded-[22px] border-2 border-brand/20 flex items-center justify-center text-brand hover:bg-brand/10 hover:border-brand active:scale-95 transition-all"
                    >
                      <Check size={22} strokeWidth={3} />
                    </button>
                    <span className="font-black text-base sm:text-2xl text-gray-800 dark:text-white truncate">{item.name}</span>
                  </div>
                  <button
                    onClick={() => deleteItem(item.id)}
                    aria-label={`מחק ${item.name}`}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-gray-400 md:text-gray-300 hover:text-rose-500 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all shrink-0"
                  >
                    <Trash2 size={20} />
                  </button>
                </motion.div>
              ))}
              {currentList.length === 0 && (
                <div className="py-16 sm:py-24 text-center text-gray-400">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                    <ShoppingCart size={48} className="opacity-20" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-gray-800 dark:text-white">הרשימה ריקה!</h3>
                  <p className="font-bold text-sm sm:text-base mt-2">הכל מוכן, הסופר מחכה לכם.</p>
                </div>
              )}
            </div>

            {boughtItems.length > 0 && (
              <div className="pt-8 sm:pt-12 border-t border-gray-100 dark:border-white/5 mt-8 sm:mt-12">
                 <div className="flex justify-between items-center mb-6 sm:mb-8">
                    <h3 className="font-black text-gray-400 text-xs sm:text-sm uppercase tracking-widest flex items-center gap-2">
                       <Check size={16} /> פריטים שנקנו ({boughtItems.length})
                    </h3>
                    <button onClick={() => setShowClearConfirm(true)} className="text-rose-500 text-xs font-black hover:underline min-h-[44px] px-2">נקה רשימת קניות</button>
                 </div>
                 <div className="flex flex-wrap gap-2.5 sm:gap-3 opacity-70 sm:opacity-50 hover:opacity-100 transition-all duration-500">
                   {boughtItems.slice(0, 15).map(item => (
                     <button key={item.id} onClick={() => toggleItem(item)}
                      className="px-4 py-2.5 sm:px-6 sm:py-3 min-h-[44px] bg-gray-100 dark:bg-white/5 rounded-2xl sm:rounded-[20px] text-xs sm:text-sm font-bold line-through flex items-center gap-2 sm:gap-3 hover:bg-brand/10 hover:text-brand hover:no-underline transition-all">
                       <RotateCcw size={14} /> {item.name}
                     </button>
                   ))}
                   {boughtItems.length > 15 && <span className="text-gray-400 font-bold text-xs self-center"> ועוד {boughtItems.length - 15}...</span>}
                 </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clear Bought Confirmation Modal */}
      <AnimatePresence>
        {showClearConfirm && (
          <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowClearConfirm(false)} className="absolute inset-0 bg-black/70 backdrop-blur-xl" />
            <motion.div initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }} className="relative w-full max-w-md bg-white dark:bg-[#1a1a1a] rounded-t-[32px] sm:rounded-[40px] p-6 sm:p-10 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl border border-gray-100 dark:border-white/5 space-y-6 text-center">
              <div className="w-12 h-1.5 bg-gray-200 dark:bg-white/10 rounded-full mx-auto sm:hidden" />
              <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-3xl flex items-center justify-center mx-auto"><Trash2 size={32} /></div>
              <h2 className="text-xl sm:text-2xl font-black text-gray-800 dark:text-white">ניקוי פריטים שנקנו</h2>
              <p className="text-sm font-bold text-gray-400">האם למחוק לצמיתות את כל {boughtItems.length} הפריטים שסומנו כנקנו?</p>
              <div className="flex flex-col gap-3">
                <button onClick={confirmClearBought} className="w-full py-4 min-h-[48px] bg-rose-500 text-white rounded-2xl font-black shadow-lg hover:bg-rose-600 transition-colors">אישור מחיקה</button>
                <button onClick={() => setShowClearConfirm(false)} className="w-full py-3.5 min-h-[48px] text-gray-500 font-black hover:bg-gray-50 dark:hover:bg-white/5 rounded-2xl transition-all">ביטול</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ShoppingView;
