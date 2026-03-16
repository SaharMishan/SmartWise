
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// Fixed relative imports since this file is already in the components/ directory
import Portal from './Portal';
import Dashboard from './Dashboard';
import Ledger from './Ledger';
import Architect from './Architect';
import Analytics from './Analytics';
import SettingsView from './SettingsView';
import GoalsView from './GoalsView';
import TasksView from './TasksView';
import ShoppingView from './ShoppingView';
import RecurringTrackerView from './RecurringTrackerView';
import AddTransactionPage from './AddTransactionPage';
import QuickEntryModal from './QuickEntryModal';
import { AppView, UserState, Transaction, Category, Budget, UserProfile, Goal, Task, ShoppingItem, RecurringExpense } from '../types';
import { NAV_ITEMS, DEFAULT_CATEGORIES } from '../constants';
import { 
  Plus, LogOut, Sun, Moon, Menu, 
  LayoutDashboard, Target, ListOrdered, BarChart3, PiggyBank,
  CheckSquare, ShoppingBag, Repeat, X, Download, Monitor, Smartphone, Apple, Chrome, Globe, Info
} from 'lucide-react';
import { auth, db, onAuthStateChanged, signOut } from '../firebase';
import { 
  collection, query, onSnapshot, orderBy, doc, writeBatch, deleteDoc, updateDoc, addDoc, getDocs, where
} from 'firebase/firestore';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('portal');
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isQuickEntryOpen, setIsQuickEntryOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>(undefined);

  const [state, setState] = useState<UserState>({
    balance: 0,
    isAuthenticated: false,
    transactions: [],
    categories: [], 
    budgets: [],
    goals: [],
    tasks: [],
    shoppingList: [],
    recurringExpenses: [],
    profile: null
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setIsMobileMenuOpen(false);
  }, [view]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userId = user.uid;
        
        onSnapshot(doc(db, 'users', userId), (snap) => {
          if (snap.exists()) setState(p => ({ ...p, profile: snap.data() as UserProfile, isAuthenticated: true }));
        });

        const catsRef = collection(db, 'users', userId, 'categories');
        onSnapshot(catsRef, (snap) => {
          const cats: Category[] = [];
          snap.forEach(d => cats.push({ ...d.data(), id: d.id } as Category));
          setState(p => ({ ...p, categories: cats }));
        });

        onSnapshot(collection(db, 'users', userId, 'tasks'), (snap) => {
          const items: Task[] = [];
          snap.forEach(d => items.push({ ...d.data(), id: d.id } as Task));
          setState(p => ({ ...p, tasks: items }));
        });

        onSnapshot(collection(db, 'users', userId, 'shopping'), (snap) => {
          const items: ShoppingItem[] = [];
          snap.forEach(d => items.push({ ...d.data(), id: d.id } as ShoppingItem));
          setState(p => ({ ...p, shoppingList: items }));
        });

        onSnapshot(collection(db, 'users', userId, 'recurring'), (snap) => {
          const items: RecurringExpense[] = [];
          snap.forEach(d => items.push({ ...d.data(), id: d.id } as RecurringExpense));
          setState(p => ({ ...p, recurringExpenses: items }));
        });

        onSnapshot(collection(db, 'users', userId, 'goals'), (snap) => {
          const gs: Goal[] = [];
          snap.forEach(d => gs.push({ ...d.data(), id: d.id } as Goal));
          setState(p => ({ ...p, goals: gs }));
        });

        const qTrans = query(collection(db, 'users', userId, 'transactions'), orderBy('date', 'desc'));
        onSnapshot(qTrans, (snapshot) => {
          const trans: Transaction[] = [];
          let currentBalance = 0;
          snapshot.forEach((doc) => {
            const data = doc.data() as Transaction;
            trans.push({ ...data, id: doc.id });
            if (data.type === 'income') currentBalance += data.amount;
            else currentBalance -= data.amount;
          });
          setState(prev => ({ ...prev, transactions: trans, balance: currentBalance, isAuthenticated: true }));
          setLoading(false);
        });

        onSnapshot(collection(db, 'users', userId, 'budgets'), (snap) => {
          const buds: Budget[] = [];
          snap.forEach(d => buds.push(d.data() as Budget));
          setState(p => ({ ...p, budgets: buds }));
        });

      } else {
        setState(prev => ({ 
          ...prev, 
          isAuthenticated: false, profile: null, 
          transactions: [], balance: 0, goals: [], 
          tasks: [], shoppingList: [], recurringExpenses: [], categories: []
        }));
        setView('portal');
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  const handleLogout = async () => {
    setLoading(true);
    await signOut(auth);
  };

  const handleBatchSave = async (items: Omit<Transaction, 'id'>[]) => {
    const user = auth.currentUser;
    if (!user) return;
    
    const batch = writeBatch(db);
    for (const item of items) {
      if (item.isRecurring) {
        const recurringId = 'rec_' + Math.random().toString(36).substr(2, 9);
        let currentDate = new Date(item.date);
        
        const endDate = item.expiryDate 
          ? new Date(item.expiryDate) 
          : new Date(new Date(item.date).setFullYear(new Date(item.date).getFullYear() + 3));
        
        while (currentDate <= endDate) {
          const dateStr = currentDate.toISOString().split('T')[0];
          const newDoc = doc(collection(db, 'users', user.uid, 'transactions'));
          batch.set(newDoc, { ...item, date: dateStr, recurringId });
          
          const expectedMonth = (currentDate.getMonth() + 1) % 12;
          currentDate.setMonth(currentDate.getMonth() + 1);
          if (currentDate.getMonth() !== expectedMonth) {
            currentDate.setDate(0);
          }
        }
      } else {
        const newDoc = doc(collection(db, 'users', user.uid, 'transactions'));
        batch.set(newDoc, item);
      }
    }
    await batch.commit();
  };

  const handleDeleteTransaction = async (id: string, deleteFuture: boolean = false) => {
    const user = auth.currentUser;
    if (!user) return;

    const trans = state.transactions.find(t => t.id === id);
    if (!trans) return;

    if (deleteFuture && trans.recurringId) {
      const batch = writeBatch(db);
      const currentEditDate = new Date(trans.date);
      const futureTrans = state.transactions.filter(t => 
        t.recurringId === trans.recurringId && 
        new Date(t.date) >= currentEditDate
      );
      
      futureTrans.forEach(t => {
        batch.delete(doc(db, 'users', user.uid, 'transactions', t.id));
      });
      await batch.commit();
    } else {
      await deleteDoc(doc(db, 'users', user.uid, 'transactions', id));
    }
  };

  const handleQuickEntrySave = async (t: any, updateFuture: boolean = false) => {
    const user = auth.currentUser;
    if (!user) return;

    if (editingTransaction) {
      if (updateFuture && editingTransaction.recurringId) {
        const batch = writeBatch(db);
        const currentEditDate = new Date(editingTransaction.date);

        const targets = state.transactions.filter(trans => 
          trans.recurringId === editingTransaction.recurringId && 
          new Date(trans.date) >= currentEditDate
        );

        targets.forEach(trans => {
          if (t.expiryDate && new Date(trans.date) > new Date(t.expiryDate)) {
            batch.delete(doc(db, 'users', user.uid, 'transactions', trans.id));
          } else {
            batch.update(doc(db, 'users', user.uid, 'transactions', trans.id), {
              ...t,
              date: trans.date 
            });
          }
        });

        await batch.commit();
      } else {
        await updateDoc(doc(db, 'users', user.uid, 'transactions', editingTransaction.id), t);
      }
    } else {
      if (t.isRecurring) {
        await handleBatchSave([t]);
      } else {
        await addDoc(collection(db, 'users', user.uid, 'transactions'), t);
      }
    }
    setIsQuickEntryOpen(false);
    setEditingTransaction(undefined);
  };

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const Logo = ({ size = "w-12 h-12", fontSize = "text-2xl" }) => (
    <motion.button onClick={() => setView('dashboard')} className="flex items-center gap-4 text-right group">
      <div className={`${size} rounded-2xl bg-brand flex items-center justify-center text-white shadow-lg shadow-brand/20 font-black ${fontSize}`}>S</div>
      <div className="hidden md:block">
        <h1 className="text-2xl font-black text-brand">SmartWise</h1>
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Premium Strategy</p>
      </div>
    </motion.button>
  );

  const InstallAppModal = () => (
    <AnimatePresence>
      {isInstallModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-10">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsInstallModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
          <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative w-full max-w-4xl bg-white dark:bg-[#1a1a1a] rounded-[48px] p-8 md:p-14 shadow-2xl border border-white/10 overflow-y-auto no-scrollbar max-h-[90vh]">
            <button onClick={() => setIsInstallModalOpen(false)} className="absolute top-8 left-8 text-gray-400 hover:text-brand transition-all"><X size={32} /></button>
            <div className="text-center space-y-4 mb-12">
              <div className="w-20 h-20 bg-brand/10 text-brand rounded-[28px] flex items-center justify-center mx-auto mb-4"><Download size={40} /></div>
              <h2 className="text-4xl font-black text-gray-800 dark:text-white">התקנת FinSmart</h2>
              <p className="text-gray-400 font-bold max-w-md mx-auto">הפוך את SmartWise לאפליקציה מלאה על המכשיר שלך לגישה מהירה וחווית משתמש חלקה.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* PC Section */}
              <div className="space-y-6 bg-gray-50 dark:bg-white/5 p-8 rounded-[40px] border border-gray-100 dark:border-white/5">
                <div className="flex items-center gap-3 text-brand font-black"><Monitor size={24} /> <span>מחשב (PC/Mac)</span></div>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-white dark:bg-white/10 flex items-center justify-center text-xs font-black shrink-0 shadow-sm">1</div>
                    <p className="text-xs font-bold leading-relaxed text-gray-600 dark:text-gray-300">השתמש בדפדפן <b>Chrome</b> או <b>Edge</b>.</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-white dark:bg-white/10 flex items-center justify-center text-xs font-black shrink-0 shadow-sm">2</div>
                    <p className="text-xs font-bold leading-relaxed text-gray-600 dark:text-gray-300">חפש את אייקון ה-<b>Install</b> (מחשב עם חץ) בצד ימין של שורת הכתובת.</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-white dark:bg-white/10 flex items-center justify-center text-xs font-black shrink-0 shadow-sm">3</div>
                    <p className="text-xs font-bold leading-relaxed text-gray-600 dark:text-gray-300">לחץ על <b>Install</b> והאפליקציה תתווסף לשולחן העבודה.</p>
                  </div>
                  <div className="p-3 bg-brand/5 rounded-xl flex items-start gap-2 text-[10px] font-bold text-brand">
                    {/* Fixed: Added missing Info icon */}
                    <Info size={14} className="shrink-0" /> פיירפוקס למחשב אינו תומך בהתקנה ישירה, מומלץ להשתמש בכרום.
                  </div>
                </div>
              </div>

              {/* Android Section */}
              <div className="space-y-6 bg-gray-50 dark:bg-white/5 p-8 rounded-[40px] border border-gray-100 dark:border-white/5">
                <div className="flex items-center gap-3 text-brand font-black"><Smartphone size={24} /> <span>אנדרואיד (Android)</span></div>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-white dark:bg-white/10 flex items-center justify-center text-xs font-black shrink-0 shadow-sm">1</div>
                    <p className="text-xs font-bold leading-relaxed text-gray-600 dark:text-gray-300">פתח את האתר בדפדפן <b>Chrome</b>.</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-white dark:bg-white/10 flex items-center justify-center text-xs font-black shrink-0 shadow-sm">2</div>
                    <p className="text-xs font-bold leading-relaxed text-gray-600 dark:text-gray-300">לחץ על 3 הנקודות בפינה העליונה.</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-white dark:bg-white/10 flex items-center justify-center text-xs font-black shrink-0 shadow-sm">3</div>
                    <p className="text-xs font-bold leading-relaxed text-gray-600 dark:text-gray-300">בחר ב-<b>"התקנת אפליקציה"</b> או <b>"הוסף למסך הבית"</b>.</p>
                  </div>
                </div>
              </div>

              {/* iOS Section */}
              <div className="space-y-6 bg-gray-50 dark:bg-white/5 p-8 rounded-[40px] border border-gray-100 dark:border-white/5">
                <div className="flex items-center gap-3 text-brand font-black"><Apple size={24} /> <span>אייפון (iOS)</span></div>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-white dark:bg-white/10 flex items-center justify-center text-xs font-black shrink-0 shadow-sm">1</div>
                    <p className="text-xs font-bold leading-relaxed text-gray-600 dark:text-gray-300">פתח את האתר בדפדפן <b>Safari</b> (חובה).</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-white dark:bg-white/10 flex items-center justify-center text-xs font-black shrink-0 shadow-sm">2</div>
                    <p className="text-xs font-bold leading-relaxed text-gray-600 dark:text-gray-300">לחץ על כפתור ה-<b>שתף</b> (Share) בתחתית המסך.</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-white dark:bg-white/10 flex items-center justify-center text-xs font-black shrink-0 shadow-sm">3</div>
                    <p className="text-xs font-bold leading-relaxed text-gray-600 dark:text-gray-300">גלול למטה ובחר ב-<b>"הוסף למסך הבית"</b>.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-12 text-center">
              <button onClick={() => setIsInstallModalOpen(false)} className="px-14 py-5 bg-brand text-white font-black rounded-3xl shadow-xl shadow-brand/20 hover:scale-[1.02] active:scale-95 transition-all">הבנתי, תודה!</button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  if (loading) return null;

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark' : ''} bg-[#f8f9fa] dark:bg-[#0a0a0a] text-[#2d3436] dark:text-gray-100 transition-colors duration-500 overflow-x-hidden relative`}>
      <AnimatePresence mode="wait">
        {view === 'portal' ? (
          <Portal key="portal" isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
        ) : (
          <motion.div key="app-shell" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col md:flex-row min-h-screen relative z-10">
            <nav className="hidden md:flex w-72 bg-white/80 dark:bg-[#121212]/80 backdrop-blur-2xl border-l border-gray-100 dark:border-white/5 flex-col p-8 z-50 shadow-2xl overflow-y-auto no-scrollbar">
              <div className="mb-8 shrink-0"><Logo /></div>
              
              {/* Install App Button in Sidebar */}
              <button onClick={() => setIsInstallModalOpen(true)} className="w-full flex items-center gap-4 px-6 py-4 mb-8 bg-brand/5 text-brand rounded-2xl border border-brand/20 hover:bg-brand/10 transition-all group">
                <div className="w-8 h-8 rounded-xl bg-brand text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform"><Download size={16} /></div>
                <div className="text-right">
                  <p className="text-xs font-black">התקנת אפליקציה</p>
                  <p className="text-[9px] font-bold text-gray-400">PWA Desktop & Mobile</p>
                </div>
              </button>

              <div className="space-y-2">
                {NAV_ITEMS.map(item => (
                  <button key={item.id} onClick={() => setView(item.id as AppView)}
                    className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 ${view === item.id ? 'bg-brand text-white shadow-lg font-black' : 'text-gray-400 hover:text-brand dark:hover:text-white dark:hover:bg-white/5'}`}>
                    {item.icon} <span className="text-sm font-bold">{item.label}</span>
                  </button>
                ))}
              </div>
              <div className="mt-10 pt-8 border-t border-gray-100 dark:border-white/5 space-y-3 shrink-0">
                <button onClick={toggleTheme} className="w-full flex items-center gap-4 px-6 py-4 text-gray-400 hover:text-brand dark:hover:text-white rounded-2xl transition-all">
                  {isDarkMode ? <Sun size={20} /> : <Moon size={20} />} <span className="font-bold text-sm">{isDarkMode ? 'בהיר' : 'כהה'}</span>
                </button>
                <button onClick={handleLogout} className="w-full flex items-center gap-4 px-6 py-4 text-gray-400 hover:text-red-500 rounded-2xl transition-all">
                  <LogOut size={20} /> <span className="font-bold text-sm">התנתקות</span>
                </button>
              </div>
            </nav>

            <div className="md:hidden flex justify-between items-center p-6 bg-white/90 dark:bg-[#121212]/90 backdrop-blur-xl z-40 border-b border-gray-100 dark:border-white/5">
               <Logo size="w-10 h-10" fontSize="text-xl" />
               <div className="flex items-center gap-2">
                 <button onClick={() => setIsInstallModalOpen(true)} className="p-3 bg-brand/10 rounded-2xl text-brand">
                   <Download size={20} />
                 </button>
                 <button onClick={toggleTheme} className="p-3 bg-gray-50 dark:bg-white/5 rounded-2xl text-gray-400">
                   {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                 </button>
               </div>
            </div>

            <main className="flex-1 p-5 md:p-14 overflow-y-auto pb-40 md:pb-14">
              <AnimatePresence mode="wait">
                <motion.div key={view} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  {view === 'dashboard' && <Dashboard state={state} onAddClick={() => setView('add-transaction')} onEditTransaction={(t) => { setEditingTransaction(t); setIsQuickEntryOpen(true); }} onDeleteTransaction={handleDeleteTransaction} isDarkMode={isDarkMode} />}
                  {view === 'goals' && <GoalsView state={state} />}
                  {view === 'tasks' && <TasksView state={state} />}
                  {view === 'shopping' && <ShoppingView state={state} />}
                  {view === 'recurring-tracker' && <RecurringTrackerView state={state} />}
                  {view === 'ledger' && <Ledger state={state} onAdd={() => setView('add-transaction')} onDelete={handleDeleteTransaction} />}
                  {view === 'analytics' && <Analytics state={state} />}
                  {view === 'architect' && <Architect state={state} />}
                  {view === 'settings' && <SettingsView state={state} />}
                  {view === 'add-transaction' && <AddTransactionPage state={state} onBack={() => setView('dashboard')} onSave={handleBatchSave} />}
                </motion.div>
              </AnimatePresence>
            </main>

            <QuickEntryModal isOpen={isQuickEntryOpen} initialData={editingTransaction} onClose={() => { setIsQuickEntryOpen(false); setEditingTransaction(undefined); }} onSave={handleQuickEntrySave} categories={state.categories} />
            <InstallAppModal />

            <nav className="md:hidden fixed bottom-6 left-6 right-6 h-20 bg-white/95 dark:bg-[#1a1a1a]/95 backdrop-blur-2xl rounded-[38px] border border-white/40 dark:border-white/5 z-[100] px-8 shadow-2xl flex items-center justify-between">
              <button onClick={() => setView('dashboard')} className={`flex flex-col items-center gap-1.5 ${view === 'dashboard' ? 'text-brand' : 'text-gray-400'}`}>
                <LayoutDashboard size={24} /> <span className="text-[10px] font-black">הבית</span>
              </button>
              <button onClick={() => setView('shopping')} className={`flex flex-col items-center gap-1.5 ${view === 'shopping' ? 'text-brand' : 'text-gray-400'}`}>
                <ShoppingBag size={24} /> <span className="text-[10px] font-black">קניות</span>
              </button>
              <div className="relative -top-8">
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setView('add-transaction')} className="w-16 h-16 bg-brand rounded-full flex items-center justify-center text-white shadow-xl border-[5px] border-white dark:border-[#1a1a1a]">
                  <Plus size={32} strokeWidth={3} />
                </motion.button>
              </div>
              <button onClick={() => setView('tasks')} className={`flex flex-col items-center gap-1.5 ${view === 'tasks' ? 'text-brand' : 'text-gray-400'}`}>
                <CheckSquare size={24} /> <span className="text-[10px] font-black">מטלות</span>
              </button>
              <button onClick={() => setIsMobileMenuOpen(true)} className="flex flex-col items-center gap-1.5 text-gray-400">
                <Menu size={24} /> <span className="text-[10px] font-black">עוד</span>
              </button>
            </nav>

            <AnimatePresence>
              {isMobileMenuOpen && (
                <>
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMobileMenuOpen(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] md:hidden" />
                  <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#1a1a1a] rounded-t-[48px] p-10 z-[120] md:hidden">
                    <div className="grid grid-cols-2 gap-4 pb-12">
                      {NAV_ITEMS.map(item => (
                        <button key={item.id} onClick={() => { setView(item.id as AppView); setIsMobileMenuOpen(false); }} className="p-6 bg-gray-50 dark:bg-white/5 rounded-3xl flex flex-col items-center gap-3">
                          <div className="text-brand">{item.icon}</div>
                          <span className="font-black text-xs">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
