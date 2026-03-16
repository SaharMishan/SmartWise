
import React from 'react';
import { 
  LayoutDashboard, ListOrdered, PiggyBank, Settings, BarChart3, 
  PlusCircle, CreditCard, Banknote, Landmark, Smartphone, Target,
  CheckSquare, ShoppingBag, Repeat, FileText
} from 'lucide-react';

export const DEFAULT_CATEGORIES = [
  { id: 'cat_1', name: 'סופר ופארם', color: '#00b894' },
  { id: 'cat_2', name: 'דיור וחשבונות', color: '#0984e3' },
  { id: 'cat_3', name: 'מסעדות ובתי קפה', color: '#fdcb6e' },
  { id: 'cat_4', name: 'פנאי ותרבות', color: '#6c5ce7' },
  { id: 'cat_5', name: 'תחבורה ורכב', color: '#e17055' },
  { id: 'cat_6', name: 'קניות וביגוד', color: '#e84393' },
  { id: 'cat_7', name: 'בריאות', color: '#fab1a0' },
  { id: 'cat_8', name: 'ילדים וחינוך', color: '#74b9ff' },
  { id: 'cat_9', name: 'חופשות וטיולים', color: '#00cec9' },
  { id: 'cat_10', name: 'בעלי חיים', color: '#ffe119' },
  { id: 'cat_11', name: 'ביטוח ופיננסים', color: '#a29bfe' },
  { id: 'cat_12', name: 'מתנות ותרומות', color: '#ff7675' },
  { id: 'cat_13', name: 'משכורת', color: '#55efc4' },
  { id: 'cat_14', name: 'הכנסות נוספות', color: '#81ecec' },
  { id: 'cat_15', name: 'כללי ואחר', color: '#b2bec3' }
];

export const PAYMENT_METHODS = [
  { id: 'credit', label: 'אשראי', icon: <CreditCard size={14} /> },
  { id: 'transfer', label: 'העברה בנקאית', icon: <Landmark size={14} /> },
  { id: 'bit', label: 'ביט', icon: <Smartphone size={14} /> },
  { id: 'paybox', label: 'פייבוקס', icon: <Smartphone size={14} /> },
  { id: 'cash', label: 'מזומן', icon: <Banknote size={14} /> },
  { id: 'check', label: 'צ׳קים', icon: <FileText size={14} /> }
];

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'דף הבית', icon: <LayoutDashboard size={18} /> },
  { id: 'add-transaction', label: 'הוספת תנועה', icon: <PlusCircle size={18} /> },
  { id: 'recurring-tracker', label: 'הוצאות קבועות', icon: <Repeat size={18} /> },
  { id: 'shopping', label: 'רשימת קניות', icon: <ShoppingBag size={18} /> },
  { id: 'tasks', label: 'מטלות ותזכורות', icon: <CheckSquare size={18} /> },
  { id: 'goals', label: 'יעדים ומטרות', icon: <Target size={18} /> },
  { id: 'ledger', label: 'פעולות', icon: <ListOrdered size={18} /> },
  { id: 'analytics', label: 'ניתוח נתונים', icon: <BarChart3 size={18} /> },
  { id: 'architect', label: 'חיסכון והשקעה', icon: <PiggyBank size={18} /> },
  { id: 'settings', label: 'הגדרות פרימיום', icon: <Settings size={18} /> },
];
