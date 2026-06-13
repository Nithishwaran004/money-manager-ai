export type TransactionType = "income" | "expense" | "transfer";

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  type: TransactionType;
  category: string; // Feed, Transport, Salary, custom etc.
  account: string; // Associated primary account name (e.g. Cash, Bank)
  toAccount?: string; // Only for transfer
  note: string; // Description or merchant
  entryMethod: "manual" | "voice";
}

export interface Account {
  id: string;
  name: string;
  type: "Cash" | "Bank" | "Credit Card" | "Other";
  balance: number;
}

export interface Category {
  id: string;
  name: string;
  type: "income" | "expense";
  icon: string; // Just icon name or emoji
  color: string; // color hex/class
}

export type ViewTab = "Home" | "Transactions" | "Stats" | "Chat" | "Settings";
export type TimeFilterType = "Daily" | "Weekly" | "Monthly" | "Calendar";
export type Language = "en" | "ta"; // English, Tamil

export const DEFAULT_ACCOUNTS: Account[] = [
  { id: "acc-1", name: "Cash", type: "Cash", balance: 5000 },
  { id: "acc-2", name: "Bank A/C", type: "Bank", balance: 45000 },
  { id: "acc-3", name: "Credit Card", type: "Credit Card", balance: 0 },
];

export const DEFAULT_CATEGORIES: Category[] = [
  // Expense categories
  { id: "c-1", name: "Food", type: "expense", icon: "Utensils", color: "#EF4444" },
  { id: "c-2", name: "Social Life", type: "expense", icon: "Users", color: "#F59E0B" },
  { id: "c-3", name: "Transport", type: "expense", icon: "FileText", color: "#3B82F6" },
  { id: "c-4", name: "Fuel", type: "expense", icon: "Fuel", color: "#06B6D4" },
  { id: "c-5", name: "Household", type: "expense", icon: "Home", color: "#10B981" },
  { id: "c-6", name: "Apparel", type: "expense", icon: "ShoppingBag", color: "#8B5CF6" },
  { id: "c-7", name: "Healthcare", type: "expense", icon: "HeartPulse", color: "#EC4899" },
  { id: "c-8", name: "Cinema", type: "expense", icon: "Film", color: "#6366F1" },
  { id: "c-9", name: "Rent", type: "expense", icon: "Wallet", color: "#14B8A6" },
  { id: "c-10", name: "Snacks & Tea", type: "expense", icon: "Coffee", color: "#D97706" },
  
  // Income categories
  { id: "c-11", name: "Salary", type: "income", icon: "CircleDollarSign", color: "#10B981" },
  { id: "c-12", name: "Bonus", type: "income", icon: "Sparkles", color: "#F59E0B" },
  { id: "c-13", name: "Allowance", type: "income", icon: "Gift", color: "#3B82F6" },
  { id: "c-14", name: "Interest", type: "income", icon: "TrendingUp", color: "#6366F1" },
];
