
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  auth, 
  db,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  setPersistence, 
  browserLocalPersistence, 
  browserSessionPersistence,
  sendPasswordResetEmail,
  googleProvider,
  signInWithPopup
} from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { 
  ShieldCheck, Target, TrendingUp, User, Lock, 
  Mail, Sun, Moon, Check, X, 
  Zap, PiggyBank, Briefcase, PieChart, Star, Coins, BarChart3, 
  Crown, Activity, AlertCircle, LogIn, UserPlus, ArrowLeft, ArrowRight
} from 'lucide-react';
import { Gender } from '../types';

interface PortalProps {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const Portal: React.FC<PortalProps> = ({ isDarkMode, toggleTheme }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [rememberMe, setRememberMe] = useState(true);
  const [isLogin, setIsLogin] = useState(true);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetStatus, setResetStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        await setDoc(doc(db, 'users', user.uid), {
          name: user.displayName || 'משתמש גוגל',
          email: user.email,
          gender: 'male',
          createdAt: new Date().toISOString()
        });
      }
    } catch (err: any) {
      console.error(err);
      setError('כשלו הניסיונות להתחבר באמצעות גוגל.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetEmail) {
      setResetStatus({ type: 'error', msg: 'יש להזין אימייל.' });
      return;
    }
    setLoading(true);
    setResetStatus(null);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetStatus({ type: 'success', msg: 'נשלח אימייל לאיפוס סיסמה!' });
    } catch (err: any) {
      setResetStatus({ type: 'error', msg: getErrorMessage(err.code) });
    } finally {
      setLoading(false);
    }
  };

  const getErrorMessage = (code: string) => {
    switch (code) {
      case 'auth/invalid-email': return 'כתובת האימייל אינה תקינה.';
      case 'auth/user-not-found': return 'לא מצאנו משתמש עם האימייל הזה.';
      case 'auth/wrong-password': return 'הסיסמה שהזנת אינה נכונה.';
      case 'auth/invalid-credential': return 'הפרטים שהזנת (אימייל או סיסמה) אינם תואמים.';
      case 'auth/email-already-in-use': return 'האימייל הזה כבר רשום במערכת.';
      default: return 'אופס! משהו השתבש, ודא שהפרטים נכונים ונסה שוב.';
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('יש להזין אימייל וסיסמה כדי להמשיך.');
      return;
    }
    
    setLoading(true);
    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        if (!name) {
          setError('אנא הזן את שמך המלא.');
          setLoading(false);
          return;
        }
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, 'users', cred.user.uid), { 
          name, 
          email, 
          gender,
          createdAt: new Date().toISOString()
        });
      }
    } catch (err: any) {
      setError(getErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.02, filter: 'blur(10px)' }}
      className="h-screen w-screen bg-white dark:bg-[#0a0a0a] flex flex-col md:flex-row overflow-hidden font-['Assistant'] relative"
    >
      <AnimatePresence>
        {showResetModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowResetModal(false)} className="absolute inset-0 bg-black/70 backdrop-blur-xl" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className="relative w-full max-w-md bg-white dark:bg-[#1a1a1a] p-8 md:p-12 rounded-[40px] md:rounded-[50px] shadow-2xl space-y-8 border border-white/10"
            >
              <button onClick={() => setShowResetModal(false)} className="absolute top-6 left-6 md:top-8 md:left-8 text-gray-400 hover:text-brand transition-all"><X size={28} /></button>
              <div className="text-center space-y-4">
                <div className="w-20 h-20 bg-emerald-50 dark:bg-brand/10 rounded-3xl flex items-center justify-center text-brand mx-auto"><Lock size={40} /></div>
                <h2 className="text-2xl md:text-3xl font-black text-gray-800 dark:text-white">איפוס סיסמה</h2>
                <p className="text-sm md:text-base text-gray-400 font-bold">הכנס את המייל ונשלח לך קישור לאיפוס.</p>
              </div>
              <div className="space-y-4">
                <input type="email" placeholder="email@example.com" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-[#0a0a0a] border-none rounded-2xl px-6 py-4 md:py-5 font-bold dark:text-white outline-none ring-2 ring-transparent focus:ring-brand/30 transition-all text-sm md:text-base" />
                {resetStatus && <p className={`text-center text-xs font-black ${resetStatus.type === 'success' ? 'text-emerald-500' : 'text-red-500'}`}>{resetStatus.msg}</p>}
                <button onClick={handleResetPassword} className="w-full bg-brand text-white py-4 md:py-5 rounded-2xl font-black shadow-2xl active:scale-95 transition-all">שלח קישור לאיפוס</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Hero Side - Hidden on mobile */}
      <div className="hidden md:flex flex-1 bg-gradient-to-br from-[#f0fff4] via-white to-[#f7fee7] dark:from-[#0d1a14] dark:via-[#0a0a0a] dark:to-[#0d1a14] items-center justify-center p-16 relative overflow-hidden h-full">
        <div className="relative z-10 w-full max-w-2xl space-y-12 text-right">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="bg-white/80 dark:bg-[#121212]/80 backdrop-blur-3xl p-14 rounded-[64px] border border-white/40 dark:border-white/5 shadow-2xl space-y-10">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-brand rounded-[28px] flex items-center justify-center text-white shadow-xl">
                <Crown size={32} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-gray-800 dark:text-white">SmartWise Elite</h3>
                <p className="text-brand text-xs font-black uppercase tracking-[0.3em]">לשלוט • לחסוך • לצמוח</p>
              </div>
            </div>
            <h4 className="text-4xl font-black text-gray-800 dark:text-white tracking-tighter italic leading-tight">"הדרך המהירה והחכמה ביותר לחופש כלכלי."</h4>
            <div className="grid grid-cols-3 gap-6 pt-4">
              {[{ icon: <PiggyBank size={28}/>, label: "חיסכון" }, { icon: <ShieldCheck size={28}/>, label: "אבטחה" }, { icon: <TrendingUp size={28}/>, label: "צמיחה" }].map((item, i) => (
                <div key={i} className="text-center space-y-2">
                  <div className="w-14 h-14 bg-gray-50 dark:bg-white/5 rounded-[22px] flex items-center justify-center mx-auto text-brand shadow-sm">{item.icon}</div>
                  <p className="text-[10px] font-black uppercase text-gray-400">{item.label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Auth Side */}
      <div className="w-full md:w-[45%] flex flex-col bg-white dark:bg-[#0a0a0a] z-10 border-r border-gray-50 dark:border-white/5 h-full relative overflow-hidden">
        {/* Mobile Header - FIXED: Logo Right, Toggle Left */}
        <div className="w-full px-6 py-4 flex justify-between items-center md:hidden bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-md z-[50] border-b border-gray-50 dark:border-white/5 shrink-0" dir="rtl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center text-white shadow-lg font-black text-xl">S</div>
            <h2 className="text-xl font-black text-brand tracking-tighter">SmartWise</h2>
          </div>
          <button onClick={toggleTheme} className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl text-gray-400 hover:text-brand transition-all active:scale-90">
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>

        {/* Auth Content Container */}
        <div className="flex-1 flex flex-col items-center justify-between px-6 md:px-16 py-8 md:py-16 overflow-y-auto no-scrollbar overflow-x-hidden">
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="w-full max-w-md flex flex-col h-full justify-between gap-4 md:gap-12">
            
            {/* Desktop Header - FIXED: Logo Right, Toggle Left */}
            <div className="hidden md:flex items-center justify-between w-full shrink-0" dir="rtl">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-brand rounded-2xl flex items-center justify-center text-white shadow-lg font-black text-2xl">S</div>
                <h2 className="text-3xl font-black text-brand tracking-tighter">SmartWise</h2>
              </div>
              <button onClick={toggleTheme} className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl text-gray-400 hover:text-brand transition-all shadow-sm">
                {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
              </button>
            </div>

            <AnimatePresence mode="wait">
              {isLogin ? (
                <motion.div 
                  key="login-view"
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 30 }}
                  className="flex flex-col gap-6 md:gap-8 h-full justify-center"
                >
                  <div className="text-right space-y-2 shrink-0">
                    <h1 className="text-3xl md:text-4xl font-black text-gray-800 dark:text-white tracking-tighter leading-tight">
                      ברוכים השבים ל-<span className="text-brand">SmartWise.</span>
                    </h1>
                    <p className="text-gray-400 font-bold text-sm">התחברו כדי להמשיך בניהול הפיננסי החכם שלכם.</p>
                  </div>

                  <form onSubmit={handleSubmit} className="flex flex-col gap-4 md:gap-6">
                    <div className="flex flex-col gap-1 text-right">
                      <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest mr-2">אימייל</label>
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-gray-50 dark:bg-[#121212] dark:text-white border-none rounded-[20px] md:rounded-[24px] px-6 py-4 md:py-4 font-bold outline-none focus:ring-2 focus:ring-brand/20 transition-all text-base md:text-lg shadow-inner" placeholder="your@email.com" />
                    </div>
                    
                    <div className="flex flex-col gap-1 text-right">
                      <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest mr-2">סיסמה</label>
                      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-gray-50 dark:bg-[#121212] dark:text-white border-none rounded-[20px] md:rounded-[24px] px-6 py-4 md:py-4 font-bold outline-none focus:ring-2 focus:ring-brand/20 transition-all text-base md:text-lg shadow-inner" placeholder="••••••••" />
                    </div>

                    <div className="flex items-center justify-between px-1">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${rememberMe ? 'bg-brand border-brand shadow-lg shadow-brand/20' : 'border-gray-200 dark:border-white/10'}`}><Check size={14} className="text-white" /></div>
                        <input type="checkbox" className="hidden" checked={rememberMe} onChange={() => setRememberMe(!rememberMe)} />
                        <span className="text-sm font-bold text-gray-400">זכור אותי</span>
                      </label>
                      <button type="button" onClick={() => setShowResetModal(true)} className="text-sm font-bold text-gray-300 hover:text-brand transition-colors text-left">שכחת סיסמה?</button>
                    </div>

                    {error && <p className="text-rose-500 text-[10px] font-black text-center bg-rose-50 dark:bg-rose-900/10 py-2 rounded-xl px-4">{error}</p>}

                    <button type="submit" disabled={loading} className="w-full bg-brand py-5 md:py-5 text-lg md:text-xl font-black text-white rounded-[20px] md:rounded-[24px] shadow-2xl active:scale-95 transition-all hover:brightness-110 flex items-center justify-center gap-3">
                      {loading ? <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" /> : <><LogIn size={20} /> כניסה למערכת</>}
                    </button>

                    <div className="flex items-center gap-3 py-1">
                      <div className="flex-1 h-px bg-gray-100 dark:bg-white/5" />
                      <span className="text-[9px] font-black text-gray-300 uppercase tracking-[0.2em] whitespace-nowrap px-1">או</span>
                      <div className="flex-1 h-px bg-gray-100 dark:bg-white/5" />
                    </div>

                    <button 
                      type="button"
                      onClick={handleGoogleSignIn} 
                      disabled={loading} 
                      className="w-full flex items-center justify-center gap-3 py-5 md:py-5 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-[20px] md:rounded-[24px] font-black text-gray-700 dark:text-white shadow-sm hover:shadow-md hover:bg-gray-50 dark:hover:bg-white/10 transition-all active:scale-95 disabled:opacity-50"
                    >
                      <svg className="w-6 h-6" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      Google
                    </button>
                  </form>

                  <div className="text-center pt-2 pb-4 shrink-0">
                    <button onClick={() => setIsLogin(false)} className="text-brand font-black text-lg md:text-xl hover:underline underline-offset-[10px] decoration-2 transition-all flex items-center justify-center gap-2 mx-auto">
                      עדיין לא רשומים? בואו נתחיל <ArrowLeft size={18} />
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="register-view"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  className="flex flex-col gap-4 md:gap-6 h-full justify-center"
                >
                  <div className="text-right space-y-1 shrink-0">
                    <h1 className="text-3xl md:text-4xl font-black text-gray-800 dark:text-white tracking-tighter leading-tight">
                      הצטרפו ל-<span className="text-brand">SmartWise Elite.</span>
                    </h1>
                    <p className="text-gray-400 font-bold text-sm">יחד נבנה את הדרך שלכם לחופש כלכלי אמיתי.</p>
                  </div>

                  <form onSubmit={handleSubmit} className="flex flex-col gap-3 md:gap-4 overflow-y-auto no-scrollbar py-2">
                    <div className="flex flex-col gap-1 text-right">
                      <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest mr-2">שם מלא</label>
                      <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-gray-50 dark:bg-[#121212] dark:text-white border-none rounded-[18px] md:rounded-[22px] px-5 py-3.5 font-bold outline-none focus:ring-2 focus:ring-brand/20 transition-all text-base shadow-inner" placeholder="ישראל ישראלי" />
                    </div>

                    <div className="flex flex-col gap-1 text-right">
                      <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest mr-2">מגדר</label>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setGender('male')} className={`flex-1 py-3.5 rounded-2xl font-black text-sm transition-all border ${gender === 'male' ? 'bg-brand text-white border-brand shadow-lg shadow-brand/20' : 'bg-gray-50 dark:bg-[#121212] text-gray-400 border-transparent'}`}>זכר</button>
                        <button type="button" onClick={() => setGender('female')} className={`flex-1 py-3.5 rounded-2xl font-black text-sm transition-all border ${gender === 'female' ? 'bg-brand text-white border-brand shadow-lg shadow-brand/20' : 'bg-gray-50 dark:bg-[#121212] text-gray-400 border-transparent'}`}>נקבה</button>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-1 text-right">
                      <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest mr-2">אימייל</label>
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-gray-50 dark:bg-[#121212] dark:text-white border-none rounded-[18px] md:rounded-[22px] px-5 py-3.5 font-bold outline-none focus:ring-2 focus:ring-brand/20 transition-all text-base shadow-inner" placeholder="your@email.com" />
                    </div>
                    
                    <div className="flex flex-col gap-1 text-right">
                      <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest mr-2">סיסמה (לפחות 6 תווים)</label>
                      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-gray-50 dark:bg-[#121212] dark:text-white border-none rounded-[18px] md:rounded-[22px] px-5 py-3.5 font-bold outline-none focus:ring-2 focus:ring-brand/20 transition-all text-base shadow-inner" placeholder="••••••••" />
                    </div>

                    {error && <p className="text-rose-500 text-[10px] font-black text-center bg-rose-50 dark:bg-rose-900/10 py-2 rounded-xl px-4">{error}</p>}

                    <button type="submit" disabled={loading} className="w-full bg-brand py-4 md:py-5 text-lg md:text-xl font-black text-white rounded-[20px] md:rounded-[24px] shadow-2xl active:scale-95 transition-all hover:brightness-110 flex items-center justify-center gap-3 mt-2">
                      {loading ? <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" /> : <><UserPlus size={20} /> הרשמה חינם</>}
                    </button>
                  </form>

                  <div className="text-center pt-2 pb-4 shrink-0">
                    <button onClick={() => setIsLogin(true)} className="text-gray-400 font-bold text-base md:text-lg hover:text-brand transition-all flex items-center justify-center gap-2 mx-auto">
                      <ArrowRight size={18} /> כבר רשומים? המשיכו מכאן
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default Portal;
