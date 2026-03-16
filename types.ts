
export type TransactionType = 'income' | 'expense';
export type Gender = 'male' | 'female';
export type PaymentMethod = 'credit' | 'check' | 'bit' | 'paybox' | 'transfer' | 'cash';

export interface UserProfile {
  name: string;
  gender: Gender;
  securityQuestion: string;
  securityAnswer: string;
  email: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  isDefault?: boolean;
}

export interface Transaction {
  id: string;
  amount: number;
  categoryId: string;
  categoryName: string;
  description: string;
  date: string;
  type: TransactionType;
  paymentMethod: PaymentMethod;
  isRecurring?: boolean;
  expiryDate?: string; 
  recurringId?: string; // Link between instances of a recurring series
}

export interface Budget {
  categoryId: string;
  amount: number;
}

export interface Goal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  category?: string;
}

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
}

export interface ShoppingItem {
  id: string;
  name: string;
  bought: boolean;
  lastAdded: string;
}

export interface RecurringExpense {
  id: string;
  label: string;
  amount: number;
  category: string;
}

export type AppView = 'portal' | 'dashboard' | 'ledger' | 'architect' | 'analytics' | 'settings' | 'add-transaction' | 'goals' | 'tasks' | 'shopping' | 'recurring-tracker';

export interface UserState {
  balance: number;
  profile: UserProfile | null;
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  goals: Goal[];
  tasks: Task[];
  shoppingList: ShoppingItem[];
  recurringExpenses: RecurringExpense[];
  isAuthenticated: boolean;
}
