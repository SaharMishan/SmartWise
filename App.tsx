import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Portal from './components/Portal';
import Dashboard from './components/Dashboard';
import Ledger from './components/Ledger';
import Architect from './components/Architect';
import Analytics from './components/Analytics';
import SettingsView from './components/SettingsView';
import GoalsView from './components/GoalsView';
import TasksView from './components/TasksView';
import ShoppingView from './components/ShoppingView';
import RecurringTrackerView from './components/RecurringTrackerView';
import AddTransactionPage from './components/AddTransactionPage';
import QuickEntryModal from './components/QuickEntryModal';
import { AppView, UserState, Transaction, Category, Budget, UserProfile, Goal, Task, ShoppingItem, RecurringExpense } from './types';
import { NAV_ITEMS, DEFAULT_CATEGORIES } from './constants';
import { 
  Plus, LogOut, Sun, Moon, Menu, 
  LayoutDashboard, Target, ListOrdered, BarChart3, PiggyBank,
  CheckSquare, ShoppingBag, Repeat, X, Download, Monitor, Smartphone, Apple, Chrome, Info, Globe
} from 'lucide-react';
import { auth, db, onAuthStateChanged, signOut } from './firebase';
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

  const toggleTheme = () => setIsDarkMode(prev => !prev);

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
          if (view === 'portal') setView('dashboard');
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
      const newDoc = doc(collection(db, 'users', user.uid, 'transactions'));
      batch.set(newDoc, item);
    }
    await batch.commit();
  };

  const handleDeleteTransaction = async (id: string, deleteFuture: boolean = false) => {
    const user = auth.currentUser;
    if (!user) return;
    await deleteDoc(doc(db, 'users', user.uid, 'transactions', id));
  };

  const handleQuickEntrySave = async (t: any) => {
    const user = auth.currentUser;
    if (!user) return;
    if (editingTransaction) {
      await updateDoc(doc(db, 'users', user.uid, 'transactions', editingTransaction.id), t);
    } else {
      await addDoc(collection(db, 'users', user.uid, 'transactions'), t);
    }
    setIsQuickEntryOpen(false);
    setEditingTransaction(undefined);
  };

  useEffect(() => {
    const hasOverlay = isMobileMenuOpen || isInstallModalOpen;
    document.body.style.overflow = hasOverlay ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen, isInstallModalOpen]);

  const Logo = ({ size = "w-11 h-11", fontSize = "text-xl" }) => (
    <motion.button onClick={() => setView('dashboard')} className="flex items-center gap-3 text-right group">
      <div className={`${size} rounded-2xl bg-brand flex items-center justify-center text-white shadow-lg shadow-brand/20 font-black ${fontSize}`}>S</div>
      <div className="hidden sm:block">
        <h1 className="text-xl lg:text-2xl font-black text-brand leading-none">SmartWise</h1>
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Premium Strategy</p>
      </div>
    </motion.button>
  );

  const mobileMoreItems = NAV_ITEMS.filter(
    item => !['dashboard', 'add-transaction', 'shopping', 'tasks'].includes(item.id)
  );

  const InstallAppModal = () => (
    <AnimatePresence>
      {isInstallModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-6 md:p-10">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsInstallModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
          <motion.div initial={{ scale: 0.95, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 30 }} className="relative w-full max-w-5xl bg-white dark:bg-[#1a1a1a] rounded-t-[36px] sm:rounded-[44px] p-6 sm:p-10 md:p-14 shadow-2xl border border-white/10 overflow-y-auto no-scrollbar max-h-[90dvh] text-right" dir="rtl">
            <div className="w-12 h-1.5 bg-gray-200 dark:bg-white/10 rounded-full mx-auto mb-4 sm:hidden" />
            <button onClick={() => setIsInstallModalOpen(false)} className="absolute top-5 left-5 sm:top-8 sm:left-8 p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-2xl bg-gray-50 dark:bg-white/5 text-gray-400 hover:text-brand transition-all"><X size={24} /></button>
            <div className="text-center space-y-3 mb-8 sm:mb-12 pt-2">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-brand/10 text-brand rounded-[24px] sm:rounded-[28px] flex items-center justify-center mx-auto mb-3"><Download size={32} /></div>
              <h2 className="text-2xl sm:text-4xl font-black text-gray-800 dark:text-white">התקנת SmartWise</h2>
              <p className="text-sm sm:text-base text-gray-400 font-bold max-w-md mx-auto">הפוך את האפליקציה לחלק בלתי נפרד מהמכשיר שלך לגישה מהירה וחווית משתמש מלאה.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-8">
              {/* PC Section */}
              <div className="space-y-4 sm:space-y-6 bg-gray-50 dark:bg-white/5 p-6 sm:p-8 rounded-[32px] sm:rounded-[40px] border border-gray-100 dark:border-white/5">
                <div className="flex items-center gap-3 text-brand font-black"><Monitor size={22} /> <span className="text-lg sm:text-xl">מחשב (PC/Mac)</span></div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="flex items-center gap-2 text-xs font-black text-gray-700 dark:text-gray-200"><Globe size={14} className="text-brand" /> Chrome / Edge:</p>
                    <p className="text-xs font-bold leading-relaxed text-gray-500">לחץ על אייקון ה-<b>Install</b> המופיע בצד ימין של שורת הכתובת למעלה, ואז אשר את ההתקנה.</p>
                  </div>
                  <div className="space-y-2">
                    <p className="flex items-center gap-2 text-xs font-black text-gray-700 dark:text-gray-200"><Apple size={14} className="text-brand" /> Safari (Mac):</p>
                    <p className="text-xs font-bold leading-relaxed text-gray-500">עבור לתפריט <b>קובץ (File)</b> ובחר ב-<b>הוסף ל-Dock</b> (Add to Dock).</p>
                  </div>
                </div>
              </div>

              {/* Android Section */}
              <div className="space-y-4 sm:space-y-6 bg-gray-50 dark:bg-white/5 p-6 sm:p-8 rounded-[32px] sm:rounded-[40px] border border-gray-100 dark:border-white/5">
                <div className="flex items-center gap-3 text-brand font-black"><Smartphone size={22} /> <span className="text-lg sm:text-xl">אנדרואיד (Android)</span></div>
                <div className="space-y-3">
                  <div className="flex gap-3 items-start">
                    <div className="w-7 h-7 rounded-full bg-brand text-white flex items-center justify-center text-xs font-black shrink-0 shadow-lg shadow-brand/20">1</div>
                    <p className="text-xs font-bold leading-relaxed text-gray-500 dark:text-gray-400">פתח את האתר בדפדפן <b>Chrome</b>.</p>
                  </div>
                  <div className="flex gap-3 items-start">
                    <div className="w-7 h-7 rounded-full bg-brand text-white flex items-center justify-center text-xs font-black shrink-0 shadow-lg shadow-brand/20">2</div>
                    <p className="text-xs font-bold leading-relaxed text-gray-500 dark:text-gray-400">לחץ על תפריט 3 הנקודות בפינה העליונה.</p>
                  </div>
                  <div className="flex gap-3 items-start">
                    <div className="w-7 h-7 rounded-full bg-brand text-white flex items-center justify-center text-xs font-black shrink-0 shadow-lg shadow-brand/20">3</div>
                    <p className="text-xs font-bold leading-relaxed text-gray-500 dark:text-gray-400">בחר ב-<b>"התקנת אפליקציה"</b> או <b>"הוסף למסך הבית"</b>.</p>
                  </div>
                </div>
              </div>

              {/* iOS Section */}
              <div className="space-y-4 sm:space-y-6 bg-gray-50 dark:bg-white/5 p-6 sm:p-8 rounded-[32px] sm:rounded-[40px] border border-gray-100 dark:border-white/5">
                <div className="flex items-center gap-3 text-brand font-black"><Apple size={22} /> <span className="text-lg sm:text-xl">אייפון (iOS)</span></div>
                <div className="space-y-3">
                  <div className="flex gap-3 items-start">
                    <div className="w-7 h-7 rounded-full bg-brand text-white flex items-center justify-center text-xs font-black shrink-0 shadow-lg shadow-brand/20">1</div>
                    <p className="text-xs font-bold leading-relaxed text-gray-500 dark:text-gray-400">פתח את האתר בדפדפן <b>Safari</b>.</p>
                  </div>
                  <div className="flex gap-3 items-start">
                    <div className="w-7 h-7 rounded-full bg-brand text-white flex items-center justify-center text-xs font-black shrink-0 shadow-lg shadow-brand/20">2</div>
                    <p className="text-xs font-bold leading-relaxed text-gray-500 dark:text-gray-400">לחץ על כפתור ה-<b>שתף</b> (אייקון ריבוע עם חץ) בתחתית המסך.</p>
                  </div>
                  <div className="flex gap-3 items-start">
                    <div className="w-7 h-7 rounded-full bg-brand text-white flex items-center justify-center text-xs font-black shrink-0 shadow-lg shadow-brand/20">3</div>
                    <p className="text-xs font-bold leading-relaxed text-gray-500 dark:text-gray-400">גלול מטה ובחר ב-<b>"הוספה למסך הבית"</b>.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 sm:mt-12 text-center pb-2">
              <button onClick={() => setIsInstallModalOpen(false)} className="w-full sm:w-auto px-14 py-4 sm:py-5 bg-brand text-white font-black rounded-2xl sm:rounded-3xl shadow-xl shadow-brand/20 hover:scale-[1.02] active:scale-95 transition-all">הבנתי, תודה!</button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  if (loading) return null;

  return (
    <div className={`min-h-[100dvh] ${isDarkMode ? 'dark' : ''} bg-[#f8f9fa] dark:bg-[#0a0a0a] text-[#2d3436] dark:text-gray-100 transition-colors duration-500 overflow-x-hidden relative`}>
      <AnimatePresence mode="wait">
        {view === 'portal' ? (
          <Portal key="portal" isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
        ) : (
          <motion.div key="app-shell" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col lg:flex-row min-h-[100dvh] relative z-10">
            {/* Desktop Sidebar (lg and up so tablets get full width) */}
            <nav className="hidden lg:flex w-72 bg-white/80 dark:bg-[#121212]/80 backdrop-blur-2xl border-l border-gray-100 dark:border-white/5 flex-col p-8 z-50 shadow-2xl overflow-y-auto no-scrollbar shrink-0">
              <div className="mb-8 shrink-0"><Logo /></div>
              
              {/* Install App Button positioned under Logo */}
              <button onClick={() => setIsInstallModalOpen(true)} className="w-full flex items-center gap-4 px-6 py-4 mb-10 bg-brand/5 text-brand rounded-2xl border border-brand/20 hover:bg-brand/10 transition-all group">
                <div className="w-9 h-9 rounded-xl bg-brand text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform"><Download size={20} /></div>
                <div className="text-right">
                  <p className="text-xs font-black">התקנת אפליקציה</p>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">PWA Premium Experience</p>
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

            {/* Mobile & Tablet Top Bar */}
            <header className="lg:hidden sticky top-0 flex justify-between items-center px-4 sm:px-6 py-3.5 bg-white/90 dark:bg-[#121212]/90 backdrop-blur-xl z-40 border-b border-gray-100 dark:border-white/5">
               <Logo size="w-10 h-10" fontSize="text-xl" />
               <div className="flex items-center gap-2">
                 <button onClick={() => setIsInstallModalOpen(true)} aria-label="התקנת אפליקציה" className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-brand/10 rounded-2xl text-brand active:scale-95 transition-transform">
                   <Download size={20} />
                 </button>
                 <button onClick={toggleTheme} aria-label="החלפת מצב תצוגה" className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-gray-50 dark:bg-white/5 rounded-2xl text-gray-500 dark:text-gray-300 active:scale-95 transition-transform">
                   {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                 </button>
               </div>
            </header>

            <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-12 overflow-y-auto pb-28 lg:pb-12">
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

            {/* Mobile & Tablet Fixed Bottom Tab Bar */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-[#1a1a1a]/95 backdrop-blur-2xl border-t border-gray-100 dark:border-white/5 z-[100] px-2 sm:px-6 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_35px_rgba(0,0,0,0.08)]">
              <div className="max-w-lg mx-auto h-16 flex items-center justify-around">
                <button onClick={() => setView('dashboard')} className={`min-w-[56px] min-h-[44px] flex flex-col items-center justify-center gap-1 transition-colors ${view === 'dashboard' ? 'text-brand' : 'text-gray-400'}`}>
                  <LayoutDashboard size={22} /> <span className="text-[10px] font-black leading-none">הבית</span>
                </button>
                <button onClick={() => setView('shopping')} className={`min-w-[56px] min-h-[44px] flex flex-col items-center justify-center gap-1 transition-colors ${view === 'shopping' ? 'text-brand' : 'text-gray-400'}`}>
                  <ShoppingBag size={22} /> <span className="text-[10px] font-black leading-none">קניות</span>
                </button>
                <div className="relative -top-5">
                  <motion.button whileTap={{ scale: 0.92 }} onClick={() => setView('add-transaction')} aria-label="הוספת תנועה" className="w-14 h-14 bg-brand rounded-full flex items-center justify-center text-white shadow-xl shadow-brand/30 border-4 border-white dark:border-[#1a1a1a]">
                    <Plus size={28} strokeWidth={3} />
                  </motion.button>
                </div>
                <button onClick={() => setView('tasks')} className={`min-w-[56px] min-h-[44px] flex flex-col items-center justify-center gap-1 transition-colors ${view === 'tasks' ? 'text-brand' : 'text-gray-400'}`}>
                  <CheckSquare size={22} /> <span className="text-[10px] font-black leading-none">מטלות</span>
                </button>
                <button onClick={() => setIsMobileMenuOpen(true)} className={`min-w-[56px] min-h-[44px] flex flex-col items-center justify-center gap-1 transition-colors ${isMobileMenuOpen || mobileMoreItems.some(i => i.id === view) ? 'text-brand' : 'text-gray-400'}`}>
                  <Menu size={22} /> <span className="text-[10px] font-black leading-none">עוד</span>
                </button>
              </div>
            </nav>

            {/* Mobile & Tablet More Sheet (compact, fits cleanly without unnecessary scrolling) */}
            <AnimatePresence>
              {isMobileMenuOpen && (
                <>
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMobileMenuOpen(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] lg:hidden" />
                  <motion.div
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", damping: 28, stiffness: 300 }}
                    className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#1a1a1a] rounded-t-[32px] px-5 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] z-[120] lg:hidden shadow-2xl border-t border-gray-100 dark:border-white/10 max-h-[85dvh] overflow-y-auto overscroll-contain no-scrollbar"
                    dir="rtl"
                  >
                    <div className="w-10 h-1.5 bg-gray-200 dark:bg-white/15 rounded-full mx-auto mb-4" />
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-black text-gray-800 dark:text-white">תפריט וכלים נוספים</h3>
                      <button onClick={() => setIsMobileMenuOpen(false)} aria-label="סגור תפריט" className="min-w-[40px] min-h-[40px] rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-500">
                        <X size={18} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {mobileMoreItems.map(item => (
                        <button
                          key={item.id}
                          onClick={() => { setView(item.id as AppView); setIsMobileMenuOpen(false); }}
                          className={`p-3.5 rounded-2xl flex items-center gap-3 text-right transition-all border ${view === item.id ? 'bg-brand text-white border-brand shadow-md' : 'bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-gray-200 border-transparent'}`}
                        >
                          <div className={`shrink-0 ${view === item.id ? 'text-white' : 'text-brand'}`}>{item.icon}</div>
                          <span className="font-black text-xs leading-tight">{item.label}</span>
                        </button>
                      ))}
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-white/10 grid grid-cols-2 gap-2.5">
                      <button
                        onClick={() => { setIsMobileMenuOpen(false); setIsInstallModalOpen(true); }}
                        className="py-3 px-4 bg-brand/10 text-brand rounded-2xl flex items-center justify-center gap-2 font-black text-xs min-h-[44px]"
                      >
                        <Download size={16} />
                        <span>התקן אפליקציה</span>
                      </button>
                      <button
                        onClick={() => { setIsMobileMenuOpen(false); handleLogout(); }}
                        className="py-3 px-4 bg-rose-50 dark:bg-rose-900/15 text-rose-500 rounded-2xl flex items-center justify-center gap-2 font-black text-xs min-h-[44px]"
                      >
                        <LogOut size={16} />
                        <span>התנתקות</span>
                      </button>
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