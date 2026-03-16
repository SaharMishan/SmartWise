
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserState, Task } from '../types';
import { auth, db } from '../firebase';
import { collection, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { 
  CheckSquare, Plus, Trash2, Calendar, AlertCircle, 
  Check, Info, Clock, Star, Zap
} from 'lucide-react';

interface TasksViewProps {
  state: UserState;
}

const TasksView: React.FC<TasksViewProps> = ({ state }) => {
  const [text, setText] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');

  const addTask = async () => {
    if (!text || !auth.currentUser) return;
    try {
      await addDoc(collection(db, 'users', auth.currentUser.uid, 'tasks'), {
        text,
        priority,
        completed: false,
        createdAt: new Date().toISOString()
      });
      setText('');
    } catch (e) { console.error(e); }
  };

  const toggleTask = async (task: Task) => {
    if (!auth.currentUser) return;
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid, 'tasks', task.id), {
        completed: !task.completed
      });
    } catch (e) { console.error(e); }
  };

  const deleteTask = async (id: string) => {
    if (!auth.currentUser) return;
    try {
      await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'tasks', id));
    } catch (e) { console.error(e); }
  };

  const sortedTasks = [...state.tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    const p = { high: 0, medium: 1, low: 2 };
    return p[a.priority] - p[b.priority];
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10 pb-32 max-w-4xl mx-auto">
      <header>
        <h1 className="text-3xl font-black text-gray-800 dark:text-white tracking-tight">מטלות ותזכורות</h1>
        <p className="text-gray-400 font-bold">ניהול הבית והמשפחה בצורה חכמה.</p>
      </header>

      <div className="bg-white dark:bg-[#1e1e1e] p-6 rounded-[32px] shadow-xl flex flex-col md:flex-row gap-4">
        <input 
          type="text" 
          placeholder="מה צריך לעשות?" 
          value={text} 
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTask()}
          className="flex-1 bg-gray-50 dark:bg-[#0a0a0a] border-none rounded-2xl px-6 py-4 font-bold outline-none ring-2 ring-transparent focus:ring-brand/20 transition-all"
        />
        <div className="flex gap-2">
          {(['low', 'medium', 'high'] as const).map(p => (
            <button 
              key={p} 
              onClick={() => setPriority(p)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${priority === p ? 'bg-brand text-white shadow-lg' : 'bg-gray-100 dark:bg-white/5 text-gray-400'}`}
            >
              {p === 'high' ? 'דחוף' : p === 'medium' ? 'רגיל' : 'פנאי'}
            </button>
          ))}
        </div>
        <button onClick={addTask} className="bg-brand text-white p-4 rounded-2xl shadow-lg shadow-brand/20 active:scale-95 transition-all">
          <Plus size={24} />
        </button>
      </div>

      <div className="grid gap-4">
        <AnimatePresence mode="popLayout">
          {sortedTasks.map(task => (
            <motion.div 
              layout
              key={task.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`p-6 rounded-[28px] border flex items-center justify-between transition-all ${task.completed ? 'bg-gray-50/50 dark:bg-white/5 opacity-60 grayscale border-transparent' : 'bg-white dark:bg-[#1e1e1e] border-gray-100 dark:border-white/5 shadow-sm'}`}
            >
              <div className="flex items-center gap-5">
                <button 
                  onClick={() => toggleTask(task)}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${task.completed ? 'bg-emerald-500 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-400 hover:border-brand/50 border-2 border-transparent'}`}
                >
                  {task.completed && <Check size={18} />}
                </button>
                <div className="space-y-1">
                  <p className={`font-bold text-lg ${task.completed ? 'line-through text-gray-400' : 'text-gray-800 dark:text-white'}`}>{task.text}</p>
                  <div className="flex items-center gap-3">
                     <span className={`text-[9px] font-black px-2 py-0.5 rounded-md ${task.priority === 'high' ? 'bg-rose-500 text-white' : task.priority === 'medium' ? 'bg-brand text-white' : 'bg-gray-400 text-white'}`}>
                       {task.priority === 'high' ? 'דחוף' : task.priority === 'medium' ? 'רגיל' : 'פנאי'}
                     </span>
                     <span className="text-[10px] text-gray-400 font-bold">{new Date(task.createdAt).toLocaleDateString('he-IL')}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => deleteTask(task.id)} className="p-3 text-gray-300 hover:text-rose-500 transition-colors">
                <Trash2 size={20} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
        {state.tasks.length === 0 && (
          <div className="py-20 text-center text-gray-400 italic">
            <CheckSquare size={48} className="mx-auto mb-4 opacity-20" />
            <p className="font-bold">אין מטלות פתוחות. זמן לנוח?</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default TasksView;
