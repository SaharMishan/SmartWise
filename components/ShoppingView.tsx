
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

  const clearBought = async () => {
    if (!auth.currentUser || !confirm('למחוק את כל הפריטים שנקנו?')) return;
    const batch = writeBatch(db);
    state.shoppingList.filter(i => i.bought).forEach(i => {
      batch.delete(doc(db, 'users', auth.currentUser!.uid, 'shopping', i.id));
    });
    await batch.commit();
  };

  const deleteItem = async (id: string) => {
    if (!auth.currentUser) return;
    await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'shopping', id));
  };

  const currentList = state.shoppingList.filter(i => !i.bought);
  const boughtItems = state.shoppingList.filter(i => i.bought).sort((a,b) => new Date(b.lastAdded).getTime() - new Date(a.lastAdded).getTime());

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10 pb-32 max-w-4xl mx-auto text-right">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-4xl font-black text-gray-800 dark:text-white tracking-tight flex items-center gap-3">
             <ShoppingBag className="text-brand" size={32} /> רשימת קניות
          </h1>
          <p className="text-gray-400 font-bold text-lg mt-1">נהלו את הקניות של הבית בסטייל.</p>
        </div>
        <button 
          onClick={() => setShowHistory(!showHistory)}
          className={`flex items-center gap-2 px-8 py-4 rounded-[24px] font-black text-sm shadow-lg transition-all ${showHistory ? 'bg-brand text-white' : 'bg-white dark:bg-white/5 text-gray-500'}`}
        >
          <History size={20} /> {showHistory ? 'חזרה לרשימה' : 'מה קנינו בעבר?'}
        </button>
      </header>

      <div className="bg-white dark:bg-[#1e1e1e] p-4 rounded-[40px] shadow-2xl flex gap-3 border border-gray-100 dark:border-white/5">
        <input 
          type="text" 
          placeholder="מה צריך להביא הביתה?" 
          value={itemName} 
          onChange={(e) => setItemName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addItem(itemName)}
          className="flex-1 bg-gray-50 dark:bg-[#0a0a0a] border-none rounded-[30px] px-8 py-5 font-bold outline-none focus:ring-2 focus:ring-brand/20 transition-all text-xl"
        />
        <button onClick={() => addItem(itemName)} className="bg-brand text-white w-16 h-16 rounded-[30px] shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all">
          <Plus size={32} strokeWidth={3} />
        </button>
      </div>

      <AnimatePresence mode="wait">
        {showHistory ? (
          <motion.div key="history" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-8">
             <div className="bg-gradient-to-r from-brand/20 to-emerald-400/10 p-8 rounded-[40px] border border-brand/20">
               <div className="flex items-center gap-3 mb-2">
                 <Sparkles className="text-brand" size={20} />
                 <h4 className="font-black text-brand text-xl">קניות חכמות מהעבר</h4>
               </div>
               <p className="text-sm font-bold text-gray-500">בחרו פריטים שקניתם בעבר כדי להוסיף אותם שוב לסל בלחיצה אחת.</p>
             </div>
             
             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
               {boughtItems.length > 0 ? boughtItems.map(item => (
                 <motion.button 
                   whileHover={{ y: -5, scale: 1.02 }} whileTap={{ scale: 0.95 }}
                   key={item.id} 
                   onClick={() => toggleItem(item)}
                   className="p-6 bg-white dark:bg-[#1e1e1e] border border-gray-100 dark:border-white/10 rounded-[32px] font-black text-right shadow-sm hover:shadow-xl hover:border-brand transition-all flex flex-col justify-between min-h-[120px]"
                 >
                   <span className="text-lg text-gray-700 dark:text-gray-200">{item.name}</span>
                   <div className="flex justify-between items-center mt-4">
                     <span className="text-[10px] text-gray-300">נוסף לאחרונה</span>
                     <div className="w-8 h-8 bg-brand/10 text-brand rounded-xl flex items-center justify-center"><Plus size={16} /></div>
                   </div>
                 </motion.button>
               )) : <div className="col-span-full py-20 text-center text-gray-400 italic font-bold">ההיסטוריה תתמלא ככל שתשתמשו באפליקציה.</div>}
             </div>
          </motion.div>
        ) : (
          <motion.div key="list" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="space-y-6">
            <div className="grid gap-4">
              {currentList.map(item => (
                <motion.div layout key={item.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                  className="group bg-white dark:bg-[#1e1e1e] p-6 rounded-[35px] border border-gray-100 dark:border-white/5 flex items-center justify-between shadow-sm hover:shadow-xl hover:scale-[1.01] transition-all">
                  <div className="flex items-center gap-6">
                    <button 
                      onClick={() => toggleItem(item)}
                      className="w-12 h-12 rounded-[22px] border-2 border-brand/20 flex items-center justify-center text-brand hover:bg-brand/10 hover:border-brand transition-all"
                    >
                      <Check size={24} strokeWidth={3} />
                    </button>
                    <span className="font-black text-2xl text-gray-800 dark:text-white">{item.name}</span>
                  </div>
                  <button onClick={() => deleteItem(item.id)} className="p-3 text-gray-200 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                    <Trash2 size={24} />
                  </button>
                </motion.div>
              ))}
              {currentList.length === 0 && (
                <div className="py-24 text-center text-gray-400">
                  <div className="w-32 h-32 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                    <ShoppingCart size={64} className="opacity-10" />
                  </div>
                  <h3 className="text-2xl font-black text-gray-800 dark:text-white">הרשימה ריקה!</h3>
                  <p className="font-bold mt-2">הכל מוכן, הסופר מחכה לכם.</p>
                </div>
              )}
            </div>

            {boughtItems.length > 0 && (
              <div className="pt-12 border-t border-gray-100 dark:border-white/5 mt-12">
                 <div className="flex justify-between items-center mb-8">
                    <h3 className="font-black text-gray-400 text-sm uppercase tracking-widest flex items-center gap-2">
                       <Check size={16} /> פריטים שנקנו ({boughtItems.length})
                    </h3>
                    <button onClick={clearBought} className="text-rose-500 text-xs font-black hover:underline">נקה רשימת קניות</button>
                 </div>
                 <div className="flex flex-wrap gap-3 opacity-40 hover:opacity-100 transition-all duration-500">
                   {boughtItems.slice(0, 15).map(item => (
                     <button key={item.id} onClick={() => toggleItem(item)}
                      className="px-6 py-3 bg-gray-100 dark:bg-white/5 rounded-[20px] text-sm font-bold line-through flex items-center gap-3 hover:bg-brand/10 hover:text-brand hover:no-underline transition-all">
                       <RotateCcw size={14} /> {item.name}
                     </button>
                   ))}
                   {boughtItems.length > 15 && <span className="text-gray-300 font-bold self-center"> ועוד {boughtItems.length - 15}...</span>}
                 </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ShoppingView;
