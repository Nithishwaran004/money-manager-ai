/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { speechService } from "./services/speechService";
import { motion, AnimatePresence } from "motion/react";
import {
  Transaction,
  Account,
  Category,
  ViewTab,
  TimeFilterType,
  Language,
  DEFAULT_ACCOUNTS,
  DEFAULT_CATEGORIES,
} from "./types";
import { INITIAL_TRANSACTIONS, UI_STRINGS } from "./lib/locale";
import FinanceCharts from "./components/FinanceCharts";
import CalendarView from "./components/CalendarView";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  MessageSquare,
  Search,
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Trash2,
  Lock,
  Unlock,
  Key,
  Database,
  Download,
  FileSpreadsheet,
  Globe,
  PlusCircle,
  PiggyBank,
  ArrowRightLeft,
  Calendar as CalendarIcon,
  CheckCircle2,
  X,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  User,
  Sparkles,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  CreditCard,
  History,
  QrCode,
  ArrowRight,
  Briefcase,
  Layers,
  Award,
  Bell,
  Cpu
} from "lucide-react";

export default function App() {
  // Local state persistence
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem("mm_transactions");
    return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
  });

  const [accounts, setAccounts] = useState<Account[]>(() => {
    const saved = localStorage.getItem("mm_accounts");
    return saved ? JSON.parse(saved) : DEFAULT_ACCOUNTS;
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem("mm_categories");
    return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
  });

  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem("mm_lang");
    return (saved as Language) || "en";
  });

  const [securityPin, setSecurityPin] = useState<string | null>(() => {
    return localStorage.getItem("mm_security_pin") || null;
  });

  const [isLocked, setIsLocked] = useState<boolean>(() => {
    const pin = localStorage.getItem("mm_security_pin");
    return pin ? true : false;
  });

  const [pinInput, setPinInput] = useState<string>("");
  const [pinErrorMsg, setPinErrorMsg] = useState<string | null>(null);

  // Bottom Navigation state (Home is default)
  const [activeTab, setActiveTab] = useState<ViewTab>("Home");
  const [timeFilter, setTimeFilter] = useState<TimeFilterType>("Monthly");

  // Date and filter parameters
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [currentMonth, setCurrentMonth] = useState<number>(5); // June
  const [selectedDate, setSelectedDate] = useState<string>("2026-06-12");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Bottom Sheet triggers
  const [showAddTxSheet, setShowAddTxSheet] = useState<boolean>(false);
  const [showAddAccountSheet, setShowAddAccountSheet] = useState<boolean>(false);
  const [showAddCategorySheet, setShowAddCategorySheet] = useState<boolean>(false);

  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  // New Transaction form state
  const [txType, setTxType] = useState<"income" | "expense" | "transfer">("expense");
  const [txAmount, setTxAmount] = useState<string>("");
  const [txCategory, setTxCategory] = useState<string>("Food");
  const [txAccount, setTxAccount] = useState<string>("Cash");
  const [txToAccount, setTxToAccount] = useState<string>("Bank A/C");
  const [txDate, setTxDate] = useState<string>("2026-06-12");
  const [txNote, setTxNote] = useState<string>("");

  // Account form state
  const [accName, setAccName] = useState<string>("");
  const [accType, setAccType] = useState<"Cash" | "Bank" | "Credit Card" | "Other">("Cash");
  const [accBalance, setAccBalance] = useState<string>("");

  // Category form state
  const [catName, setCatName] = useState<string>("");
  const [catType, setCatType] = useState<"income" | "expense">("expense");
  const [catColor, setCatColor] = useState<string>("#10B981");

  // Chatbot Assistant Conversation state
  const [chatbotMessages, setChatbotMessages] = useState<Array<{ sender: "user" | "bot"; text: string; dataPreview?: any }>>([
    {
      sender: "bot",
      text: "Vanakkam! I am your AI MoneySense Assistant. 💸\n\nSpeak or type direct natural commands to balance your ledger! E.g:\n• 'Spent 250 on grocery' (English)\n• 'இன்று பெட்ரோல் ₹500 கழிக்கவும்' (Tamil)\n• 'inniku tea ₹40' (Tanglish)\n• 'salary credited 45000'",
    },
  ]);
  const [chatInput, setChatInput] = useState<string>("");
  const [isAssistantProcessing, setIsAssistantProcessing] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [speechNotSupported, setSpeechNotSupported] = useState<boolean>(false);
  
  // Unified speech service for offline Android speech recognition
  const [currentTranscript, setCurrentTranscript] = useState<string>("");

  // Visual notify toasts
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const strings = UI_STRINGS[lang];
  const recognitionRef = useRef<any>(null);

  const updateMsgDataPreview = (index: number, updatedFields: Partial<any>) => {
    setChatbotMessages((prev) =>
      prev.map((m, idx) => {
        if (idx === index) {
          return {
            ...m,
            dataPreview: {
              ...m.dataPreview,
              ...updatedFields,
            },
          };
        }
        return m;
      })
    );
  };

  // Auto scroll logic for AI thread
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatbotMessages, isAssistantProcessing]);

  // Persists databases to browsers localStorage
  useEffect(() => {
    localStorage.setItem("mm_transactions", JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem("mm_accounts", JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    localStorage.setItem("mm_categories", JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem("mm_lang", lang);
  }, [lang]);

  // Initialize unified speech service
  useEffect(() => {
    const initSpeechService = async () => {
      const available = await speechService.isAvailable();
      if (!available) {
        setSpeechNotSupported(true);
        showToast("⚠️ Speech recognition not supported on this device.");
      } else {
        // Set to auto mode for multi-language support (English + Tamil + Tanglish)
        speechService.setLanguage('auto');
        
        // Setup callbacks
        speechService.setCallbacks({
          onStart: () => {
            console.log("🎤 Speech recognition started");
            setIsListening(true);
            showToast("🎤 Listening... Speak in English or Tamil!");
          },
          onResult: (result) => {
            console.log("📝 Speech result:", result.transcript);
            setCurrentTranscript(result.transcript);
            if (result.isFinal) {
              setChatInput(result.transcript);
              showToast(`Heard: "${result.transcript}"`);
              setTimeout(() => {
                handleSendChatMessage(result.transcript);
              }, 500);
            }
          },
          onEnd: () => {
            console.log("🛑 Speech recognition ended");
            setIsListening(false);
          },
          onError: (error) => {
            console.error("❌ Speech recognition error:", error);
            setIsListening(false);
            showToast(`Speech error: ${error}`);
          }
        });
      }
    };
    
    initSpeechService();
    
    return () => {
      speechService.destroy();
    };
  }, []);

  const toggleListening = async () => {
    if (speechNotSupported) {
      showToast("Speech recognition not supported. Please type instead!");
      return;
    }

    // Speech recognition uses auto mode (independent of app language)
    // Accepts English, Tamil, and Tanglish

    if (isListening) {
      // Stop listening
      console.log("🛑 Stopping speech recognition...");
      await speechService.stopListening();
    } else {
      // Start listening
      console.log("🎤 Starting speech recognition...");
      try {
        await speechService.startListening();
      } catch (error: any) {
        console.error("Failed to start speech recognition:", error);
        showToast(`Speech recognition error: ${error.message || "Unknown error"}`);
      }
    }
  };


  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg(null);
    }, 3500);
  };

  // Switch month navigation
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  const formatMonthName = () => {
    const dates = new Date(currentYear, currentMonth, 1);
    return dates.toLocaleDateString(lang === "ta" ? "ta-IN" : "en-US", {
      month: "long",
      year: "numeric",
    });
  };

  // Bookkeeping Ledger sync equations
  const processLedgerEffects = (
    type: "income" | "expense" | "transfer",
    amount: number,
    accountName: string,
    toAccountName?: string,
    reverse = false
  ) => {
    setAccounts((prevAccounts) => {
      return prevAccounts.map((acc) => {
        let updatedBalance = acc.balance;
        const multiplier = reverse ? -1 : 1;

        if (type === "income") {
          if (acc.name === accountName) {
            updatedBalance += amount * multiplier;
          }
        } else if (type === "expense") {
          if (acc.name === accountName) {
            updatedBalance -= amount * multiplier;
          }
        } else if (type === "transfer") {
          if (acc.name === accountName) {
            updatedBalance -= amount * multiplier;
          }
          if (toAccountName && acc.name === toAccountName) {
            updatedBalance += amount * multiplier;
          }
        }
        return { ...acc, balance: updatedBalance };
      });
    });
  };

  // Transaction persistent builders
  const handleSaveTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(txAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert("Please specify a genuine transaction size.");
      return;
    }

    if (editingTransaction) {
      // Reverse old values first
      processLedgerEffects(
        editingTransaction.type,
        editingTransaction.amount,
        editingTransaction.account,
        editingTransaction.toAccount,
        true
      );

      const updatedTx: Transaction = {
        ...editingTransaction,
        type: txType,
        amount: amountNum,
        category: txCategory,
        account: txAccount,
        toAccount: txType === "transfer" ? txToAccount : undefined,
        date: txDate,
        note: txNote || txCategory,
      };

      setTransactions((prev) => prev.map((t) => (t.id === editingTransaction.id ? updatedTx : t)));
      processLedgerEffects(txType, amountNum, txAccount, txType === "transfer" ? txToAccount : undefined);
      showToast("Ledger record updated gracefully!");
    } else {
      const newTx: Transaction = {
        id: "tx-" + Date.now(),
        type: txType,
        amount: amountNum,
        category: txCategory,
        account: txAccount,
        toAccount: txType === "transfer" ? txToAccount : undefined,
        date: txDate,
        note: txNote || txCategory,
        entryMethod: "manual",
      };

      setTransactions((prev) => [newTx, ...prev]);
      processLedgerEffects(txType, amountNum, txAccount, txType === "transfer" ? txToAccount : undefined);
      showToast("Transaction synced on Ledger!");
    }

    setShowAddTxSheet(false);
    setEditingTransaction(null);
    resetTxForm();
  };

  const resetTxForm = () => {
    setTxType("expense");
    setTxAmount("");
    setTxCategory(categories.find((c) => c.type === "expense")?.name || "Food");
    setTxAccount(accounts[0]?.name || "Cash");
    setTxToAccount(accounts[1]?.name || "Bank A/C");
    setTxDate(new Date().toISOString().split("T")[0]);
    setTxNote("");
  };

  const handleEditTxClick = (tx: Transaction) => {
    setEditingTransaction(tx);
    setTxType(tx.type);
    setTxAmount(tx.amount.toString());
    setTxCategory(tx.category);
    setTxAccount(tx.account);
    if (tx.toAccount) setTxToAccount(tx.toAccount);
    setTxDate(tx.date);
    setTxNote(tx.note);
    setShowAddTxSheet(true);
  };

  const handleDeleteTx = (tx: Transaction) => {
    if (confirm("Delete this transaction entry from local ledger? This will instantly reverse matching sub-wallet balances.")) {
      processLedgerEffects(tx.type, tx.amount, tx.account, tx.toAccount, true);
      setTransactions((prev) => prev.filter((t) => t.id !== tx.id));
      showToast("Transaction dismissed and balanced.");
    }
  };

  // chatbot API communication pipeline
  const handleSendChatMessage = async (spokenMsg?: string) => {
    const textToSend = spokenMsg || chatInput;
    if (!textToSend.trim()) return;

    setChatbotMessages((prev) => [...prev, { sender: "user", text: textToSend }]);
    setChatInput("");
    setIsAssistantProcessing(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          transactions,
          accounts,
          categories,
          locale: lang,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        if (data.action === "parse" && data.parsedTransaction) {
          const txProps = data.parsedTransaction;
          
          // Resilient float parser supporting numbers, string formats, commas, or currency prefixes
          let parsedAmount = 0;
          if (txProps.amount !== undefined && txProps.amount !== null) {
            if (typeof txProps.amount === "number") {
              parsedAmount = txProps.amount;
            } else {
              const sanitizedStr = String(txProps.amount).replace(/,/g, "").replace(/[^\d.]/g, "");
              parsedAmount = parseFloat(sanitizedStr) || 0;
            }
          }

          setChatbotMessages((prev) => [
            ...prev,
            {
              sender: "bot",
              text: `${data.answerText || "Got it! Confirm these entries for the ledger:"}`,
              dataPreview: {
                type: txProps.type || "expense",
                amount: parsedAmount,
                category: txProps.category || "Food",
                account: txProps.account || "Cash",
                toAccount: txProps.toAccount,
                note: txProps.note || "",
                date: txProps.date || new Date().toISOString().split("T")[0],
              }
            }
          ]);
        } else {
          setChatbotMessages((prev) => [
            ...prev,
            { sender: "bot", text: data.answerText || "I failed to read the specific financial action." },
          ]);
        }
      } else {
        throw new Error(data.error || "NLP endpoint failed");
      }
    } catch (err: any) {
      console.error(err);
      setChatbotMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "I met network issues. Please type manual entry '+' or ask me again shortly!",
        },
      ]);
    } finally {
      setIsAssistantProcessing(false);
    }
  };

  // confirm parsed proposal
  const handleConfirmAISpend = (preview: any) => {
    const amountVal = parseFloat(preview.amount);
    if (isNaN(amountVal) || amountVal <= 0) {
      showToast("Cannot record empty sized transactions.");
      return;
    }

    const newTx: Transaction = {
      id: "tx-" + Date.now(),
      type: preview.type,
      amount: amountVal,
      category: preview.category || "Food",
      account: preview.account || "Cash",
      toAccount: preview.type === "transfer" ? (preview.toAccount || "Bank A/C") : undefined,
      date: preview.date || new Date().toISOString().split("T")[0],
      note: preview.note || preview.category || "Voice assistant entry",
      entryMethod: "voice",
    };

    setTransactions((prev) => [newTx, ...prev]);
    processLedgerEffects(newTx.type, newTx.amount, newTx.account, newTx.toAccount);

    setChatbotMessages((prev) => [
      ...prev,
      {
        sender: "bot",
        text: `✓ Confirmed! Added a ${strings[preview.type]} of ₹${amountVal} for '${newTx.category}' from account '${newTx.account}'.`,
      },
    ]);
    showToast("AI proposal logged on ledger with Double-Entry updates!");
  };

  // Add and update sub account wallets
  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accName.trim()) return;
    const balanceNum = parseFloat(accBalance) || 0;

    if (editingAccount) {
      setAccounts((prev) =>
        prev.map((a) => (a.id === editingAccount.id ? { ...a, name: accName, type: accType, balance: balanceNum } : a))
      );
      showToast("Wallet values customized.");
    } else {
      const newAcc: Account = {
        id: "acc-" + Date.now(),
        name: accName,
        type: accType,
        balance: balanceNum,
      };
      setAccounts((prev) => [...prev, newAcc]);
      showToast("New Wallet registered.");
    }

    setShowAddAccountSheet(false);
    setEditingAccount(null);
    setAccName("");
    setAccBalance("");
  };

  const handleDeleteAccount = (acc: Account) => {
    if (accounts.length <= 1) {
      alert(" FinTech requirements require at least one configured Primary Wallet!");
      return;
    }
    if (confirm(`Delete '${acc.name}'? Existing balanced ledger transactions associated with this account may show mismatch.`)) {
      setAccounts((prev) => prev.filter((a) => a.id !== acc.id));
      showToast("Account wallet removed.");
    }
  };

  // Add customized budget category labels
  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    const colors = ["#EF4444", "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#06B6D4", "#EC4899", "#14B8A6"];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const newCat: Category = {
      id: "cat-" + Date.now(),
      name: catName,
      type: catType,
      icon: "Layers",
      color: catColor || randomColor,
    };

    setCategories((prev) => [...prev, newCat]);
    setShowAddCategorySheet(false);
    setCatName("");
    showToast("Saved customized category label!");
  };

  // Advanced data filter sets
  const getFilteredTransactions = () => {
    let list = transactions.filter((t) => {
      const tDate = new Date(t.date);
      return tDate.getFullYear() === currentYear && tDate.getMonth() === currentMonth;
    });

    if (timeFilter === "Daily") {
      list = list.filter((t) => t.date === selectedDate);
    } else if (timeFilter === "Weekly") {
      const sel = new Date(selectedDate);
      const day = sel.getDay();
      const diff = sel.getDate() - day + (day === 0 ? -6 : 1);
      const startOfWeek = new Date(sel.setDate(diff));
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      list = transactions.filter((t) => {
        const d = new Date(t.date);
        return d >= startOfWeek && d <= endOfWeek;
      });
    }

    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (t) =>
          t.category.toLowerCase().includes(q) ||
          t.note.toLowerCase().includes(q) ||
          t.account.toLowerCase().includes(q) ||
          t.amount.toString().includes(q)
      );
    }

    return list;
  };

  const getFilteredSums = () => {
    const list = getFilteredTransactions();
    const income = list.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expense = list.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    return {
      income,
      expense,
      net: income - expense,
    };
  };

  // Security authorization lock verified
  const handleVerifyPIN = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === securityPin) {
      setIsLocked(false);
      setPinErrorMsg(null);
      setPinInput("");
      showToast("Access authorized. Welcome back!");
    } else {
      setPinErrorMsg(strings.pinError);
      setPinInput("");
    }
  };

  const handleUpdatePIN = (newPin: string) => {
    if (!newPin.trim()) {
      localStorage.removeItem("mm_security_pin");
      setSecurityPin(null);
      showToast("Passcode locks disabled.");
    } else {
      localStorage.setItem("mm_security_pin", newPin);
      setSecurityPin(newPin);
      showToast(strings.lockSuccess);
    }
  };

  // Backup CSV Export files
  const handleExportCSV = () => {
    let headers = "ID,Date,Type,Amount,Category,Account,Destination Account,Note,Entry Method\n";
    const dataRows = transactions
      .map((t) => {
        return `"${t.id}","${t.date}","${t.type}",${t.amount},"${t.category}","${t.account}","${t.toAccount || ""}","${t.note}","${t.entryMethod}"`;
      })
      .join("\n");

    const blob = new Blob([headers + dataRows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `MoneySense_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(strings.csvDownloaded);
  };

  // print audit reports
  const handlePrintPDF = () => {
    window.print();
    showToast(strings.pdfGenerated);
  };

  const handleResetAppLoad = () => {
    if (confirm("Reset database structures to master initial states? This clears customized sub-wallets.")) {
      localStorage.removeItem("mm_transactions");
      localStorage.removeItem("mm_accounts");
      localStorage.removeItem("mm_categories");
      localStorage.removeItem("mm_security_pin");
      setTransactions(INITIAL_TRANSACTIONS);
      setAccounts(DEFAULT_ACCOUNTS);
      setCategories(DEFAULT_CATEGORIES);
      setSecurityPin(null);
      setIsLocked(false);
      showToast("Databases reset.");
    }
  };

  const groupedTransactions = () => {
    const sorted = [...getFilteredTransactions()].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const groups: { [date: string]: Transaction[] } = {};
    sorted.forEach((t) => {
      groups[t.date] = groups[t.date] || [];
      groups[t.date].push(t);
    });

    return groups;
  };

  const activeSums = getFilteredSums();
  const totalNetBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

  // Dynamic advice engine based on savings status
  const getDynamicFintechAdvice = () => {
    const ratio = activeSums.income > 0 ? activeSums.expense / activeSums.income : 0;
    if (activeSums.income === 0 && activeSums.expense > 0) {
      return lang === "ta"
        ? "செலவுகள் அதிகம் உள்ளன. வருமானத்தை பதிவிடவும்!"
        : "You are spending without recorded income. Add some cash inflows below!";
    }
    if (ratio > 0.8) {
      return lang === "ta"
        ? "எச்சரிக்கை: வருமானத்தில் 80% மேல் செலவாகியுள்ளது!"
        : "High Burn Rate! You have spent over 80% of your earnings this month. Tighten your budget.";
    }
    if (activeSums.net > 0 && ratio <= 0.5) {
      return lang === "ta"
        ? "அருமை! உங்கள் சேமிப்பு விகிதம் 50% மேல் உள்ளது."
        : "Magnificent budget control! You've saved over 50% of your earnings. Tap + Wallet and secure it.";
    }
    return lang === "ta"
      ? "உங்கள் நிதி நிலையை தொடர்ந்து கண்காணிக்கவும்!"
      : "Steady status! Consider saving at least 20% of income for investments.";
  };

  // If locked, render premium fintech code pad screen
  if (isLocked && securityPin) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-0 sm:p-4 font-sans select-none antialiased">
        {/* Sleek Device Mock Shell on Desktop */}
        <div className="w-full max-w-sm sm:max-w-md sm:h-[820px] h-[100dvh] bg-slate-950 sm:rounded-[44px] sm:border-[8px] sm:border-slate-800 shadow-[0_24px_80px_rgba(0,0,0,0.85)] flex flex-col justify-between overflow-hidden relative">
          
          {/* Top simulated status header */}
          <div className="px-6 pt-4 pb-2 flex justify-between items-center text-[11px] font-bold text-slate-400 select-none bg-slate-950">
            <div className="w-12" />
            <div className="w-20 h-4 bg-black rounded-full" />
            <div className="w-12" />
          </div>

          <div className="flex-1 flex flex-col justify-between py-12 px-6">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-6 border border-emerald-500/20 shadow-[0_0_24px_rgba(16,185,129,0.15)] animate-pulse">
                <Lock size={32} />
              </div>
              <h2 className="text-xl font-extrabold text-white tracking-tight">{strings.pinTitle}</h2>
              <p className="text-xs text-slate-400 mt-2 px-4 leading-relaxed">
                {strings.pinLabel}
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex justify-center gap-3">
                {[0, 1, 2, 3].map((idx) => (
                  <div
                    key={idx}
                    className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-150 ${
                      pinInput.length > idx
                        ? "bg-emerald-400 border-emerald-400 scale-110 shadow-[0_0_8px_rgba(52,211,153,0.5)]"
                        : "border-slate-600 bg-transparent"
                    }`}
                  />
                ))}
              </div>

              {pinErrorMsg && (
                <p className="text-xs font-semibold text-rose-500 bg-rose-500/10 py-2 rounded-xl text-center border border-rose-500/20 max-w-xs mx-auto">
                  {pinErrorMsg}
                </p>
              )}

              {/* Pin numeric keypad pad for mobile */}
              <div className="grid grid-cols-3 gap-y-4 gap-x-6 max-w-xs mx-auto">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9", "Clear", "0", "Delete"].map((cell) => (
                  <button
                    key={cell}
                    type="button"
                    onClick={() => {
                      if (cell === "Clear") {
                        setPinInput("");
                      } else if (cell === "Delete") {
                        setPinInput((prev) => prev.slice(0, -1));
                      } else {
                        if (pinInput.length < 4) {
                          const updated = pinInput + cell;
                          setPinInput(updated);
                          if (updated === securityPin) {
                            setIsLocked(false);
                            setPinErrorMsg(null);
                            setPinInput("");
                            showToast("Access authorized. Welcome back!");
                          } else if (updated.length === 4) {
                            setTimeout(() => {
                              if (updated !== securityPin) {
                                setPinErrorMsg(strings.pinError);
                                setPinInput("");
                              }
                            }, 180);
                          }
                        }
                      }
                    }}
                    className="h-14 w-14 rounded-full bg-slate-900 border border-slate-850 hover:bg-slate-800 flex items-center justify-center text-sm font-bold text-slate-200 cursor-pointer active:scale-95 transition-all mx-auto"
                  >
                    {cell === "Delete" ? "⌫" : cell === "Clear" ? "C" : cell}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-[10px] text-slate-500 text-center italic mt-4">
              Demo bypass: Configure/disable passcode locks in Settings.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black p-0 sm:p-6 sm:pb-12 text-slate-100 font-sans selection:bg-emerald-500/30 selection:text-emerald-300 select-none antialiased flex items-center justify-center">
      
      {/* Toast Alert overlay */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: "-50%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] bg-slate-900/95 border border-emerald-500/30 text-white px-4 py-3 rounded-2xl text-xs font-semibold shadow-[0_12px_36px_rgba(0,0,0,0.5)] flex items-center gap-2 max-w-xs backdrop-blur-md"
          >
            <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
            <span>{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sleek Device Mock Shell on Desktop */}
      <div className="w-full max-w-sm sm:max-w-md sm:h-[820px] h-[100dvh] bg-slate-950 sm:rounded-[44px] sm:border-[8px] sm:border-slate-800 shadow-[0_24px_80px_rgba(0,0,0,0.85)] flex flex-col justify-between overflow-hidden relative">
        
        {/* Dynamic Island bar */}
        <div className="hidden sm:block absolute top-2 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-full z-50 flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-900 self-center absolute left-3" />
        </div>

        {/* Real Dynamic Status Bar */}
        <div className="px-6 pt-3 pb-1 flex justify-between items-center text-[11px] font-bold text-slate-400 select-none bg-slate-950/40 z-50">
          <div className="w-12" />
          <div className="hidden sm:block w-20 h-4" />
          <div className="w-12" />
        </div>

        {/* Outer app screen viewport container */}
        <div className="flex-1 overflow-y-auto no-scrollbar bg-slate-950 pb-24 relative flex flex-col">
          
          {/* Dynamic Content View Router */}

          {/* ==================== 1. HOME SCREEN ==================== */}
          {activeTab === "Home" && (
            <div className="px-5 space-y-6 pt-4 animate-fade-in">
              {/* Profile Bar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-400 to-teal-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/10 text-xs">
                    NR
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-400">Welcome elite,</span>
                    </div>
                    <h3 className="text-sm font-extrabold text-slate-100 truncate max-w-[150px]">
                      {lang === "ta" ? "நிதீஷ் ராம்" : "Nithis Ram"}
                    </h3>
                  </div>
                </div>

                {/* Switch language & Notification elements */}
                <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-full p-1">
                  <button
                    onClick={() => {
                      setLang((prev) => (prev === "en" ? "ta" : "en"));
                      showToast(lang === "en" ? "தமிழ் மொழி மாற்றப்பட்டது" : "Language switched to English");
                    }}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 active:scale-95 transition-all text-xs font-bold leading-none"
                    title="Switch language"
                  >
                    <Globe size={13} className="text-emerald-400" />
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab("Settings");
                      showToast("Opened Settings options!");
                    }}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 active:scale-95 transition-all text-xs"
                  >
                    <SettingsIcon size={13} />
                  </button>
                </div>
              </div>

              {/* Visually Stunning Fintech Debit Card */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-700 to-indigo-950 p-6 shadow-2xl border border-emerald-400/20 text-white min-h-[160px] flex flex-col justify-between">
                {/* Glossy background shapes */}
                <div className="absolute top-0 right-0 w-44 h-44 bg-white/5 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-emerald-400/10 rounded-full blur-xl pointer-events-none" />

                <div className="grid grid-cols-2 gap-4 z-10">
                  <div>
                    <span className="text-[10px] tracking-widest text-emerald-200/85 font-black uppercase leading-none block">
                      {strings.totalBalance}
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black mt-2 tracking-tight text-white">
                      ₹{totalNetBalance.toLocaleString()}
                    </h2>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] tracking-widest text-rose-200/85 font-black uppercase leading-none block">
                      {lang === "ta" ? "செலவிட்ட தொகை" : "Amount Spent"}
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black mt-2 tracking-tight text-rose-200">
                      ₹{activeSums.expense.toLocaleString()}
                    </h2>
                  </div>
                </div>

                <div className="flex justify-between items-center z-10 mt-6 border-t border-white/10 pt-4 text-[10px] font-bold text-emerald-100/70">
                  <span>{lang === "ta" ? "செயலில் உள்ள கணக்குகள்" : "Active Ledger"}</span>
                  <span className="font-mono text-white/90">•••• {accounts.length} Accounts</span>
                </div>
              </div>

              {/* 4 Quick Actions touch grid */}
              <div className="grid grid-cols-4 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setTxType("income");
                    setTxCategory(categories.find((c) => c.type === "income")?.name || "Salary");
                    setTxAmount("");
                    setTxNote("");
                    setShowAddTxSheet(true);
                  }}
                  className="bg-slate-900 hover:bg-slate-855 active:bg-slate-800 border border-slate-800 p-3 rounded-2xl flex flex-col items-center gap-1.5 transition-all text-xs cursor-pointer text-slate-300 hover:text-white"
                >
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <ArrowDownRight size={20} />
                  </div>
                  <span className="font-semibold text-[10px]">Add Cash</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTxType("expense");
                    setTxCategory(categories.find((c) => c.type === "expense")?.name || "Food");
                    setTxAmount("");
                    setTxNote("");
                    setShowAddTxSheet(true);
                  }}
                  className="bg-slate-900 hover:bg-slate-855 active:bg-slate-800 border border-slate-800 p-3 rounded-2xl flex flex-col items-center gap-1.5 transition-all text-xs cursor-pointer text-slate-300 hover:text-white"
                >
                  <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center">
                    <ArrowUpRight size={20} />
                  </div>
                  <span className="font-semibold text-[10px]">Pay out</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTxType("transfer");
                    setTxAmount("");
                    setTxNote("");
                    setShowAddTxSheet(true);
                  }}
                  className="bg-slate-900 hover:bg-slate-855 active:bg-slate-800 border border-slate-800 p-3 rounded-2xl flex flex-col items-center gap-1.5 transition-all text-xs cursor-pointer text-slate-300 hover:text-white"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center">
                    <ArrowRightLeft size={18} />
                  </div>
                  <span className="font-semibold text-[10px]">Transfer</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("Chat");
                    showToast("Moneysense Voice NLP Chatbot opened!");
                  }}
                  className="bg-slate-900 hover:bg-slate-855 active:bg-slate-800 border border-slate-800 p-3 rounded-2xl flex flex-col items-center gap-1.5 transition-all text-xs cursor-pointer text-slate-300 hover:text-white"
                >
                  <div className="w-10 h-10 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                    <Sparkles size={18} />
                  </div>
                  <span className="font-semibold text-[10px]">AI Assist</span>
                </button>
              </div>

              {/* Wallets sub account section (Horizontal lists) */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    My Sub-Wallets ({accounts.length})
                  </h4>
                  <button
                    onClick={() => {
                      setAccName("");
                      setAccBalance("");
                      setAccType("Cash");
                      setShowAddAccountSheet(true);
                    }}
                    className="text-[10px] text-emerald-400 font-bold hover:underline"
                  >
                    + Manage
                  </button>
                </div>

                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                  {accounts.map((acc) => (
                    <div
                      key={acc.id}
                      className="bg-slate-900/90 border border-slate-850 p-4 rounded-2xl min-w-[130px] flex-1 flex flex-col justify-between hover:border-slate-700 transition-all cursor-pointer group relative"
                    >
                      <div className="flex items-center justify-between gap-2.5">
                        <span className="text-[8px] bg-slate-800 border border-slate-750 font-bold px-1.5 py-0.5 rounded uppercase text-slate-400 block w-max">
                          {acc.type}
                        </span>
                        {/* Tiny quick action */}
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingAccount(acc);
                              setAccName(acc.name);
                              setAccType(acc.type);
                              setAccBalance(acc.balance.toString());
                              setShowAddAccountSheet(true);
                            }}
                            className="p-1 hover:bg-slate-850 text-slate-400 hover:text-white rounded"
                          >
                            <Edit2 size={9} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAccount(acc);
                            }}
                            className="p-1 hover:bg-slate-850 text-rose-500 rounded"
                          >
                            <Trash2 size={9} />
                          </button>
                        </div>
                      </div>
                      <h5 className="text-xs font-bold text-slate-200 mt-2 truncate max-w-[110px]">
                        {acc.name}
                      </h5>
                      <span className="text-base font-black text-slate-100 mt-2 block">
                        ₹{acc.balance.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Transactions List with "View All" */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Recent Transactions
                  </h4>
                  <button
                    onClick={() => {
                      setActiveTab("Transactions");
                      setTimeFilter("Monthly");
                    }}
                    className="text-xs text-emerald-400 font-extrabold flex items-center gap-1 hover:underline"
                  >
                    View All <ArrowRight size={12} />
                  </button>
                </div>

                {transactions.length === 0 ? (
                  <div className="bg-slate-900 rounded-3xl p-8 border border-slate-850 text-center text-slate-500">
                    <p className="text-xs">No entries registered.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {transactions.slice(0, 4).map((t) => {
                      const cat = categories.find((c) => c.name === t.category);
                      return (
                        <div
                          key={t.id}
                          onClick={() => handleEditTxClick(t)}
                          className="bg-slate-900 border border-slate-850 p-3 rounded-2xl flex items-center justify-between cursor-pointer hover:border-slate-700 transition-all active:scale-98"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0 text-xs"
                              style={{ backgroundColor: cat?.color || "#475569" }}
                            >
                              {t.category.substring(0, 2)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-extrabold text-slate-200 truncate block max-w-[130px]">
                                  {t.note || t.category}
                                </span>
                                {t.entryMethod === "voice" && (
                                  <span className="text-[7.5px] bg-indigo-500/10 text-indigo-400 px-1 border border-indigo-400/20 rounded flex items-center gap-0.5">
                                    <Sparkles size={8} /> AI
                                  </span>
                                )}
                              </div>
                              <span className="text-[9px] text-slate-400 font-semibold block mt-1 uppercase tracking-wider">
                                {t.category} • <span className="text-slate-500 font-bold">{t.account}</span>
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span
                              className={`text-xs font-black block leading-none ${
                                t.type === "income"
                                  ? "text-emerald-400"
                                  : t.type === "expense"
                                  ? "text-rose-400"
                                  : "text-slate-300"
                              }`}
                            >
                              {t.type === "income" ? "+" : t.type === "expense" ? "-" : ""}
                              ₹{t.amount.toLocaleString()}
                            </span>
                            <span className="text-[8px] text-slate-400 uppercase mt-1 block">
                              {t.date}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================== 2. LEDGER TRANSACTIONS HISTORY VIEW ==================== */}
          {activeTab === "Transactions" && (
            <div className="px-5 space-y-5 pt-4 animate-fade-in">
              {/* Header Toggles */}
              <div>
                <h3 className="text-lg font-black text-slate-100">{strings.tabTransactions}</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Manage budget and double entry history</p>
              </div>

              {/* Time Filters segmented control styled for touch */}
              <div className="bg-slate-900 p-1 rounded-2xl flex border border-slate-850">
                {(["Daily", "Weekly", "Monthly", "Calendar"] as TimeFilterType[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => {
                      setTimeFilter(v);
                      showToast(`Switched view to ${v}`);
                    }}
                    className={`flex-1 py-1.5 px-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                      timeFilter === v
                        ? "bg-slate-820 hover:bg-slate-700 text-emerald-400 shadow"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {v === "Daily"
                      ? strings.dailyView
                      : v === "Weekly"
                      ? strings.weeklyView
                      : v === "Monthly"
                      ? strings.monthlyView
                      : strings.calendarView}
                  </button>
                ))}
              </div>

              {/* Unified Search logs bar */}
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-3 text-slate-500" />
                <input
                  type="text"
                  placeholder={strings.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-850 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-2.5 p-0.5 bg-slate-800 text-slate-400 rounded-full hover:text-white"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>

              {/* Quick Metrics display row */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="bg-emerald-500/5 border border-emerald-500/10 p-2.5 rounded-2xl">
                  <span className="text-[8px] tracking-wider text-emerald-400 block font-bold uppercase">Income</span>
                  <span className="text-xs font-black text-emerald-300 block mt-1">+₹{activeSums.income.toLocaleString()}</span>
                </div>
                <div className="bg-rose-500/5 border border-rose-500/10 p-2.5 rounded-2xl">
                  <span className="text-[8px] tracking-wider text-rose-400 block font-bold uppercase">Expense</span>
                  <span className="text-xs font-black text-rose-300 block mt-1">-₹{activeSums.expense.toLocaleString()}</span>
                </div>
                <div className="bg-blue-500/5 border border-blue-500/10 p-2.5 rounded-2xl">
                  <span className="text-[8px] tracking-wider text-blue-400 block font-bold uppercase">Net Savings</span>
                  <span className="text-xs font-black text-blue-300 block mt-1">₹{activeSums.net.toLocaleString()}</span>
                </div>
              </div>

              {/* Calendar sub view wrapper */}
              {timeFilter === "Calendar" && (
                <div className="bg-slate-900 rounded-3xl p-3 border border-slate-850 text-slate-100">
                  <CalendarView
                    transactions={transactions}
                    categories={categories}
                    currentYear={currentYear}
                    currentMonth={currentMonth}
                    currencySymbol="₹"
                    onSelectDate={(dateStr) => {
                      setSelectedDate(dateStr);
                      setTimeFilter("Daily");
                      showToast(`Displaying entries for ${dateStr}`);
                    }}
                  />
                </div>
              )}

              {/* Calendar Month navigation helpers */}
              {timeFilter !== "Calendar" && (
                <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                  <div className="flex items-center gap-1">
                    <button onClick={handlePrevMonth} className="p-1.5 hover:bg-slate-900 border border-slate-850 rounded-lg text-slate-400 hover:text-white"><ChevronLeft size={14} /></button>
                    <span className="text-xs font-extrabold text-slate-200 px-2 w-28 text-center">{formatMonthName()}</span>
                    <button onClick={handleNextMonth} className="p-1.5 hover:bg-slate-900 border border-slate-850 rounded-lg text-slate-400 hover:text-white"><ChevronRight size={14} /></button>
                  </div>

                  {/* Manual day selection if Daily filter */}
                  {timeFilter === "Daily" && (
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="bg-slate-900 border border-slate-850 rounded-xl px-2 py-1 text-[11px] font-bold text-emerald-400 focus:outline-none"
                    />
                  )}
                </div>
              )}

              {/* Transactions Ledger grouping */}
              <div className="space-y-4">
                {getFilteredTransactions().length === 0 ? (
                  <div className="bg-slate-900 rounded-3xl p-12 border border-slate-850 text-center text-slate-500">
                    <CalendarIcon size={28} className="mx-auto mb-2 opacity-40 text-slate-400" />
                    <p className="text-xs font-medium">{strings.noTransactions}</p>
                    <p className="text-[10px] text-slate-500 mt-1">Change month navigation or register a manual transaction.</p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {Object.entries(groupedTransactions()).map(([dateStr, txList]) => {
                      const formattedDate = new Date(dateStr).toLocaleDateString(
                        lang === "ta" ? "ta-IN" : "en-US",
                        { weekday: "short", month: "short", day: "numeric" }
                      );

                      return (
                        <div key={dateStr} className="space-y-2">
                          <div className="sticky top-0 bg-slate-950/90 py-1 rounded text-[9.5px] font-bold text-slate-500 uppercase tracking-wider flex justify-between px-1 border-b border-slate-900">
                            <span>{formattedDate}</span>
                            <span>{txList.length} items</span>
                          </div>

                          <div className="space-y-2">
                            {txList.map((t) => {
                              const cat = categories.find((c) => c.name === t.category);
                              return (
                                <div
                                  key={t.id}
                                  onClick={() => handleEditTxClick(t)}
                                  className="bg-slate-900 border border-slate-850 p-3 rounded-2xl flex items-center justify-between cursor-pointer hover:border-slate-850 transition-all active:scale-98"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div
                                      className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0 text-xs"
                                      style={{ backgroundColor: cat?.color || "#475569" }}
                                    >
                                      {t.category.substring(0, 2)}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-extrabold text-slate-200 truncate block max-w-[140px]">
                                          {t.note || t.category}
                                        </span>
                                        {t.entryMethod === "voice" && (
                                          <span className="text-[7.5px] bg-indigo-500/10 text-indigo-400 px-1 border border-indigo-400/20 rounded flex items-center gap-0.5">
                                            <Sparkles size={8} /> AI
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-[9px] text-slate-400 font-semibold uppercase mt-0.5 block tracking-wider">
                                        {t.category} • <span className="text-slate-500 font-bold">{t.account}</span>
                                        {t.type === "transfer" && t.toAccount && (
                                          <>
                                            {" "}➔{" "}
                                            <span className="text-blue-400 font-bold lowercase bg-blue-500/5 px-1 border border-blue-500/10 rounded">
                                              {t.toAccount}
                                            </span>
                                          </>
                                        )}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <div className="text-right">
                                      <span
                                        className={`text-xs font-black block ${
                                          t.type === "income"
                                            ? "text-emerald-400"
                                            : t.type === "expense"
                                            ? "text-rose-400"
                                            : "text-slate-300"
                                        }`}
                                      >
                                        {t.type === "income" ? "+" : t.type === "expense" ? "-" : ""}
                                        ₹{t.amount.toLocaleString()}
                                      </span>
                                      <span className="text-[8px] text-slate-400 uppercase mt-0.5 block">
                                        {strings[t.type]}
                                      </span>
                                    </div>

                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteTx(t);
                                      }}
                                      className="p-1 px-2 hover:bg-slate-800 text-slate-500 hover:text-rose-400 rounded-lg active:scale-90 transition-all cursor-pointer"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================== 3. ANALYTICAL BREAKDOWN (STATS) ==================== */}
          {activeTab === "Stats" && (
            <div className="px-5 space-y-5 pt-4 animate-fade-in">
              <div>
                <h3 className="text-lg font-black text-slate-100">Financial Intelligence</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Automated Double-entry transaction flow analytics</p>
              </div>

              {/* Embedded FinanceCharts wrapped inside premium mobile style */}
              <div className="bg-slate-900 p-4 border border-slate-850 rounded-3xl text-xs text-slate-100 space-y-6">
                <FinanceCharts
                  transactions={transactions}
                  categories={categories}
                  accounts={accounts}
                  currencySymbol="₹"
                />
              </div>
            </div>
          )}

          {/* ==================== 4. INTEGRATED AI CONVERSATIONAL ASSISTANT ==================== */}
          {activeTab === "Chat" && (
            <div className="relative flex flex-col h-full bg-slate-950 animate-fade-in">
              {/* Chat screen top header */}
              <div className="px-5 py-3 border-b border-slate-900 flex justify-between items-center bg-slate-950/80 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-200">Moneysense Voice NLP</h3>
                    <span className="text-[8px] bg-indigo-500/10 text-indigo-400 border border-indigo-400/20 px-1 py-0.5 rounded font-black uppercase">Active Assistant</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setChatbotMessages([
                      {
                        sender: "bot",
                        text: "Thread cleared. Let's start fresh! Speak or type instructions.",
                      },
                    ]);
                  }}
                  className="p-1 px-2 text-[9px] bg-slate-900 border border-slate-850 text-slate-400 hover:text-white rounded-lg active:scale-95"
                >
                  Clear Chat
                </button>
              </div>

              {/* Chat content bubbled thread */}
              <div className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-4 max-h-[500px]">
                {chatbotMessages.map((msg, index) => (
                  <div key={index} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"} animate-scale-up`}>
                    <div
                      className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed border ${
                        msg.sender === "user"
                          ? "bg-slate-900 text-slate-100 border-slate-800 rounded-tr-none"
                          : "bg-indigo-950/30 text-indigo-200 border-indigo-400/10 rounded-tl-none shadow"
                      }`}
                    >
                      <p className="font-semibold whitespace-pre-line">{msg.text}</p>

                      {/* Proposals elements inside thread bubbles */}
                      {msg.dataPreview && (
                        <div className="mt-3.5 p-3 bg-slate-950/80 rounded-2xl border border-indigo-400/30 text-slate-200 space-y-2.5 shadow-2xl">
                          <div className="flex items-center gap-1">
                            <Sparkles size={10} className="text-emerald-400 animate-spin" />
                            <span className="font-black uppercase text-[8.5px] tracking-wider text-emerald-400">
                              PENDING LEDGER PROPOSAL
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-x-2 gap-y-2 text-[10px] font-bold text-slate-400">
                            <div className="flex flex-col">
                              <span className="text-[8px] text-indigo-300 uppercase tracking-wider mb-0.5">Type</span>
                              <select
                                value={msg.dataPreview.type}
                                onChange={(e) => {
                                  const val = e.target.value as "income" | "expense" | "transfer";
                                  updateMsgDataPreview(index, { type: val });
                                }}
                                className="bg-slate-900 border border-indigo-500/25 text-slate-100 rounded-lg p-1.5 focus:outline-none focus:border-indigo-400 font-extrabold capitalize cursor-pointer text-[11px]"
                              >
                                <option value="expense">Expense</option>
                                <option value="income">Income</option>
                                <option value="transfer">Transfer</option>
                              </select>
                            </div>

                            <div className="flex flex-col">
                              <span className="text-[8px] text-indigo-300 uppercase tracking-wider mb-0.5">Amount (₹)</span>
                              <input
                                type="number"
                                value={msg.dataPreview.amount === 0 ? "" : msg.dataPreview.amount}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  updateMsgDataPreview(index, { amount: val });
                                }}
                                className="bg-slate-900 border border-indigo-500/25 text-emerald-400 rounded-lg p-1.5 focus:outline-none focus:border-indigo-400 font-black text-[11px]"
                                placeholder="0"
                              />
                            </div>

                            <div className="flex flex-col">
                              <span className="text-[8px] text-indigo-300 uppercase tracking-wider mb-0.5">Category</span>
                              <select
                                value={msg.dataPreview.category}
                                onChange={(e) => {
                                  updateMsgDataPreview(index, { category: e.target.value });
                                }}
                                className="bg-slate-900 border border-indigo-500/25 text-slate-100 rounded-lg p-1.5 focus:outline-none focus:border-indigo-400 cursor-pointer text-[11px]"
                              >
                                {categories.map((c) => (
                                  <option key={c.name} value={c.name}>{c.name}</option>
                                ))}
                              </select>
                            </div>

                            <div className="flex flex-col">
                              <span className="text-[8px] text-indigo-300 uppercase tracking-wider mb-0.5">Account / From</span>
                              <select
                                value={msg.dataPreview.account}
                                onChange={(e) => {
                                  updateMsgDataPreview(index, { account: e.target.value });
                                }}
                                className="bg-slate-900 border border-indigo-500/25 text-slate-100 rounded-lg p-1.5 focus:outline-none focus:border-indigo-400 cursor-pointer text-[11px]"
                              >
                                {accounts.map((a) => (
                                  <option key={a.name} value={a.name}>{a.name}</option>
                                ))}
                              </select>
                            </div>

                            {msg.dataPreview.type === "transfer" && (
                              <div className="flex flex-col col-span-2">
                                <span className="text-[8px] text-indigo-300 uppercase tracking-wider mb-0.5">To Account</span>
                                <select
                                  value={msg.dataPreview.toAccount || ""}
                                  onChange={(e) => {
                                    updateMsgDataPreview(index, { toAccount: e.target.value });
                                  }}
                                  className="bg-slate-900 border border-indigo-500/25 text-slate-100 rounded-lg p-1.5 focus:outline-none focus:border-indigo-400 cursor-pointer text-[11px]"
                                >
                                  {accounts.map((a) => (
                                    <option key={a.name} value={a.name}>{a.name}</option>
                                  ))}
                                </select>
                              </div>
                            )}

                            <div className="flex flex-col col-span-2">
                              <span className="text-[8px] text-indigo-300 uppercase tracking-wider mb-0.5">Date</span>
                              <input
                                type="date"
                                value={msg.dataPreview.date || ""}
                                onChange={(e) => {
                                  updateMsgDataPreview(index, { date: e.target.value });
                                }}
                                className="bg-slate-900 border border-indigo-500/25 text-slate-100 rounded-lg p-1.5 focus:outline-none focus:border-indigo-400 text-[11px]"
                              />
                            </div>

                            <div className="flex flex-col col-span-2">
                              <span className="text-[8px] text-indigo-300 uppercase tracking-wider mb-0.5">Note</span>
                              <input
                                type="text"
                                value={msg.dataPreview.note || ""}
                                onChange={(e) => {
                                  updateMsgDataPreview(index, { note: e.target.value });
                                }}
                                className="bg-slate-900 border border-indigo-500/25 text-slate-100 rounded-lg p-1.5 focus:outline-none focus:border-indigo-400 text-[11px]"
                                placeholder="Add note or description..."
                              />
                            </div>
                          </div>

                          <div className="flex gap-2 pt-2.5 border-t border-slate-900">
                            <button
                              onClick={() => handleConfirmAISpend(msg.dataPreview)}
                              className="flex-grow py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-slate-950 font-black rounded-xl text-[10.5px] active:scale-95 transition-all text-center cursor-pointer shadow-lg shadow-emerald-500/10"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => {
                                setChatbotMessages((prev) => [
                                  ...prev,
                                  { sender: "bot", text: "Entry cancelled. Anything else you need to balance onto the ledger?" },
                                ]);
                              }}
                              className="py-2 px-3 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-[10.5px]"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isAssistantProcessing && (
                  <div className="flex justify-start">
                    <div className="bg-slate-900/60 border border-slate-850 rounded-2xl p-3 text-slate-400 text-xs flex items-center gap-1.5 font-medium animate-pulse">
                      <RefreshCw size={12} className="animate-spin text-emerald-400" />
                      <span>Gemini auto-categorizing inputs...</span>
                    </div>
                  </div>
                )}
                
                {/* Scroll anchor */}
                <div ref={chatBottomRef} />
              </div>

              {/* Bottom typing and speech active container */}
              <div className="p-3 border-t border-slate-900 bg-slate-950/90 absolute bottom-12 inset-x-0 space-y-2 z-10 pb-5">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendChatMessage();
                  }}
                  className="flex items-center gap-2.0"
                >
                  <button
                    type="button"
                    onClick={toggleListening}
                    className={`p-2.5 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                      isListening
                        ? "bg-rose-500 border-rose-400 text-slate-950 scale-105 shadow-[0_0_12px_rgba(239,68,68,0.4)] animate-pulse"
                        : "bg-slate-900 hover:bg-slate-850 border-slate-840 text-slate-300"
                    }`}
                    title="Speak fintech instruction"
                  >
                    {isListening ? <MicOff size={15} /> : <Mic size={15} />}
                  </button>

                  <input
                    type="text"
                    placeholder="E.g. Sent 25000 to Bank A/C from Cash"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    className="flex-grow px-3 py-2 bg-slate-900 border border-slate-850 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold"
                    disabled={isAssistantProcessing}
                  />

                  <button
                    type="submit"
                    className="p-2 px-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl text-xs font-black active:scale-95 transition-all cursor-pointer"
                    disabled={!chatInput.trim()}
                  >
                    Send
                  </button>
                </form>

                {/* Animated Speech waveform indicator */}
                {isListening ? (
                  <div className="flex items-center justify-center gap-1.5 py-1 text-[9px] text-rose-400">
                    <span className="w-1.5 h-3 bg-rose-400 animate-bounce" style={{ animationDelay: "0.1s" }} />
                    <span className="w-1.5 h-5 bg-rose-400 animate-bounce" style={{ animationDelay: "0.2s" }} />
                    <span className="w-1.5 h-2.5 bg-rose-400 animate-bounce" style={{ animationDelay: "0.3s" }} />
                    <span className="w-1.5 h-6 bg-rose-450 animate-bounce" style={{ animationDelay: "0.4s" }} />
                    <span className="text-slate-400 ml-1">Mic Listening (English/தமிழ்)... Speak details clearly</span>
                  </div>
                ) : (
                  <div className="text-[9px] text-slate-500 px-1 font-semibold flex justify-between">
                    <span>Ask spending queries: "how much spent on Food?"</span>
                    <span>Supports Tamil & English voice inputs</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================== 5. SETTINGS / CONFIG PANEL ==================== */}
          {activeTab === "Settings" && (
            <div className="px-5 space-y-6 pt-4 animate-fade-in">
              <div>
                <h3 className="text-lg font-black text-slate-100">Control Chamber</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Database parameters and backup settings</p>
              </div>

              {/* Passcode Security PIN Card */}
              <div className="bg-slate-900 p-4 border border-slate-850 rounded-3xl space-y-3 shadow-lg">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/10 text-violet-400 flex items-center justify-center">
                    <Lock size={15} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-100">Passcode PIN Protection</h4>
                    <span className="text-[9px] text-slate-400 block uppercase">Vault configuration</span>
                  </div>
                </div>

                <div className="pt-1.5 space-y-2.5">
                  <div className="flex justify-between items-center text-[10.5px]">
                    <span className="text-slate-400 font-semibold">Active Vault status:</span>
                    {securityPin ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1 text-[10px]">
                        ● Passcode Locks Screen Enabled
                      </span>
                    ) : (
                      <span className="text-slate-500">Unprotected</span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="password"
                      maxLength={4}
                      placeholder="Enter new 4-digit PIN"
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        if (val.length === 4) {
                          handleUpdatePIN(val);
                          e.target.value = "";
                        }
                      }}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs font-bold text-center tracking-widest text-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    {securityPin && (
                      <button
                        onClick={() => handleUpdatePIN("")}
                        className="px-3 bg-rose-500/10 border border-rose-500/15 hover:bg-rose-500/20 text-rose-400 rounded-xl text-[10px] font-bold active:scale-95"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Accounts Start Capital Balance Editor */}
              <div className="bg-slate-900 p-4 border border-slate-850 rounded-3xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-850/30 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                      <Wallet size={15} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-100">Double-Entry Wallets</h4>
                      <span className="text-[9px] text-slate-400 block">Configure liquid funds</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setEditingAccount(null);
                      setAccName("");
                      setAccBalance("");
                      setAccType("Cash");
                      setShowAddAccountSheet(true);
                    }}
                    className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl text-[9.5px] font-black active:scale-95"
                  >
                    + New Wallet
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {accounts.map((acc) => (
                    <div
                      key={acc.id}
                      onClick={() => {
                        setEditingAccount(acc);
                        setAccName(acc.name);
                        setAccType(acc.type);
                        setAccBalance(acc.balance.toString());
                        setShowAddAccountSheet(true);
                      }}
                      className="bg-slate-950 border border-slate-850 p-3 rounded-2xl flex flex-col justify-between hover:border-slate-700 transition-all cursor-pointer relative group"
                    >
                      <span className="text-[8px] bg-slate-900 border border-slate-800 font-bold px-1.5 py-0.5 rounded text-slate-400 uppercase w-max">
                        {acc.type}
                      </span>
                      <h5 className="text-[11px] font-extrabold text-slate-200 mt-2 truncate">{acc.name}</h5>
                      <span className="text-sm font-black text-slate-100 mt-1 block">
                        ₹{acc.balance.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom Category configurations */}
              <div className="bg-slate-900 p-4 border border-slate-850 rounded-3xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                      <Layers size={15} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-100">Category Tags</h4>
                      <span className="text-[9px] text-slate-400 block text-left">Custom budget filters</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setCatName("");
                      setCatColor("#EF4444");
                      setCatType("expense");
                      setShowAddCategorySheet(true);
                    }}
                    className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-[9.5px] font-bold active:scale-95"
                  >
                    + custom
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {categories.map((c) => (
                    <div
                      key={c.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-extrabold border bg-slate-950/60"
                      style={{ borderColor: `${c.color}25`, color: c.color }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.color }} />
                      <span>{c.name}</span>
                      <span className="text-[7px] text-slate-500 bg-slate-900 px-1 border border-slate-800 rounded font-bold uppercase">
                        {c.type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Backups & PDF Exports Card */}
              <div className="bg-slate-900 p-4 border border-slate-850 rounded-3xl space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                    <Database size={15} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-100">{strings.exportBackup}</h4>
                    <span className="text-[9px] text-slate-400 block uppercase">Spreadsheets & audits</span>
                  </div>
                </div>

                <div className="pt-1.5 space-y-2">
                  <button
                    onClick={handleExportCSV}
                    className="w-full bg-slate-950 border border-slate-850 hover:border-slate-700 py-2.5 px-4 rounded-2xl text-[10.5px] font-bold text-slate-300 text-left flex items-center justify-between cursor-pointer active:scale-98"
                  >
                    <span className="flex items-center gap-2">
                      <FileSpreadsheet size={13} className="text-slate-400" /> Export Excel CSV
                    </span>
                    <Download size={11} className="text-slate-400" />
                  </button>

                  <button
                    onClick={handlePrintPDF}
                    className="w-full bg-slate-950 border border-slate-850 hover:border-slate-700 py-2.5 px-4 rounded-2xl text-[10.5px] font-bold text-slate-300 text-left flex items-center justify-between cursor-pointer active:scale-98"
                  >
                    <span className="flex items-center gap-2">
                      <CalendarIcon size={13} className="text-slate-400" /> Print Statement PDF
                    </span>
                    <span className="text-[9px] bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-amber-400 font-bold">PRINT</span>
                  </button>

                  <button
                    onClick={() => {
                      showToast(strings.backupSuccess);
                    }}
                    className="w-full bg-slate-950 border border-slate-850 hover:border-slate-700 py-2.5 px-4 rounded-2xl text-[10.5px] font-bold text-slate-300 text-left flex items-center justify-between cursor-pointer active:scale-98"
                  >
                    <span className="flex items-center gap-2">
                      <Cpu size={13} className="text-slate-400" /> Local Sync Vault Backup
                    </span>
                    <span className="text-[90x] font-bold text-emerald-400 uppercase">✓ SYNC</span>
                  </button>
                </div>

                <div className="pt-2 border-t border-slate-850/40">
                  <button
                    onClick={handleResetAppLoad}
                    className="w-full py-2 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-400 rounded-xl text-[10px] font-black cursor-pointer active:scale-95 transition-all"
                  >
                    Reset Financial Database
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Dynamic bottom system tab bar navigation menu */}
        <div className="absolute bottom-0 inset-x-0 bg-slate-950/95 border-t border-slate-900/80 backdrop-blur-md px-3 py-1 flex justify-between items-center z-40 pb-5">
          <button
            onClick={() => {
              setActiveTab("Home");
              showToast("Fintech Dashboard loaded!");
            }}
            className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all cursor-pointer min-w-[55px] ${
              activeTab === "Home" ? "text-emerald-400 scale-105" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <Wallet size={17} />
            <span className="text-[8px] font-extrabold tracking-wider mt-1 block">Home</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("Transactions");
              showToast("Displaying Ledger records");
            }}
            className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all cursor-pointer min-w-[55px] ${
              activeTab === "Transactions" ? "text-emerald-400 scale-105" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <History size={17} />
            <span className="text-[8px] font-extrabold tracking-wider mt-1 block">Ledger</span>
          </button>

          {/* Centered highlighted core Floating Action Button "+" */}
          <div className="relative -mt-6">
            <button
              onClick={() => {
                setEditingTransaction(null);
                resetTxForm();
                setShowAddTxSheet(true);
              }}
              className="w-13 h-13 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-500 hover:to-teal-600 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/20 cursor-pointer transform hover:scale-105 border-[3px] border-slate-950 active:scale-95 transition-all"
              title="Add Manual ledger Record"
            >
              <Plus size={24} className="stroke-[3.5]" />
            </button>
          </div>

          <button
            onClick={() => {
              setActiveTab("Stats");
              showToast("Loading charts & analytics...");
            }}
            className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all cursor-pointer min-w-[55px] ${
              activeTab === "Stats" ? "text-emerald-400 scale-105" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <Layers size={17} />
            <span className="text-[8px] font-extrabold tracking-wider mt-1 block">Stats</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("Chat");
              showToast("Voice NLP chatbot online!");
            }}
            className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all cursor-pointer min-w-[55px] ${
              activeTab === "Chat" ? "text-emerald-400 scale-105" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <div className="relative">
              <MessageSquare size={17} />
              <span className="absolute -top-1.5 -right-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
            </div>
            <span className="text-[8px] font-extrabold tracking-wider mt-1 block">Ask AI</span>
          </button>
        </div>

        {/* ==================== BOTTOM SHEET: MANUAL TRANSACTION "+" FORM ==================== */}
        <AnimatePresence>
          {showAddTxSheet && (
            <div className="fixed inset-0 bg-black/60 z-[90] flex items-end justify-center">
              {/* Tap backdrop to close */}
              <div className="absolute inset-0 cursor-default" onClick={() => setShowAddTxSheet(false)} />

              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 350 }}
                className="w-full max-w-sm sm:max-w-md bg-slate-900 border-t border-slate-850 rounded-t-[32px] p-6 max-h-[92%] overflow-y-auto shadow-2xl relative z-10 text-slate-100"
              >
                {/* Grab handle indicator for touch */}
                <div className="w-12 h-1 bg-slate-800 rounded-full mx-auto mb-4" />

                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-base font-extrabold text-slate-200">
                    {editingTransaction ? "Edit Record" : "Add Entry"}
                  </h3>
                  <button
                    onClick={() => setShowAddTxSheet(false)}
                    className="p-1 px-2 text-[10px] bg-slate-950 border border-slate-850 text-slate-400 rounded-lg"
                  >
                    Close
                  </button>
                </div>

                {/* Segment selector flow selector */}
                <div className="bg-slate-950 p-1 rounded-xl flex border border-slate-850 mb-4">
                  {(["expense", "income", "transfer"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setTxType(t);
                        setTxCategory(categories.find((c) => c.type === (t === "transfer" ? "expense" : t))?.name || "Food");
                      }}
                      className={`flex-1 py-1.5 rounded-lg text-[10.5px] font-black capitalize transition-all cursor-pointer ${
                        txType === t ? "bg-slate-800 text-emerald-400 shadow" : "text-slate-400"
                      }`}
                    >
                      {strings[t]}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleSaveTransaction} className="space-y-4">
                  {/* Amount Value */}
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      {strings.amount} (₹)
                    </label>
                    <input
                      type="number"
                      required
                      placeholder="0.00"
                      value={txAmount}
                      onChange={(e) => setTxAmount(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-base font-black text-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      autoFocus
                    />
                  </div>

                  {/* Date Input */}
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      {strings.date}
                    </label>
                    <input
                      type="date"
                      required
                      value={txDate}
                      onChange={(e) => setTxDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs font-bold text-slate-200 focus:outline-none"
                    />
                  </div>

                  {/* Wallets selectors list */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        {txType === "transfer" ? "Source Account" : strings.account}
                      </label>
                      <select
                        value={txAccount}
                        onChange={(e) => setTxAccount(e.target.value)}
                        className="w-full px-2 py-2 bg-slate-950 border border-slate-850 text-xs font-semibold text-slate-100 rounded-xl focus:outline-none"
                      >
                        {accounts.map((a) => (
                          <option key={a.id} value={a.name}>
                            {a.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {txType === "transfer" ? (
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Destination Account
                        </label>
                        <select
                          value={txToAccount}
                          onChange={(e) => setTxToAccount(e.target.value)}
                          className="w-full px-2 py-2 bg-slate-950 border border-slate-850 text-xs font-semibold text-slate-100 rounded-xl focus:outline-none"
                        >
                          {accounts.map((a) => (
                            <option key={a.id} value={a.name} disabled={a.name === txAccount}>
                              {a.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          {strings.category}
                        </label>
                        <select
                          value={txCategory}
                          onChange={(e) => setTxCategory(e.target.value)}
                          className="w-full px-2 py-2 bg-slate-950 border border-slate-850 text-xs font-semibold text-slate-105 rounded-xl focus:outline-none"
                        >
                          {categories
                            .filter((c) => c.type === txType)
                            .map((c) => (
                              <option key={c.id} value={c.name}>
                                {c.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Notes / description */}
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      {strings.note}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Starbucks Mocha coffee, fuel refill..."
                      value={txNote}
                      onChange={(e) => setTxNote(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs font-semibold text-slate-205 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Confirm CTA */}
                  <div className="pt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddTxSheet(false)}
                      className="flex-1 py-3 border border-slate-850 hover:bg-slate-850 text-slate-400 rounded-xl text-xs font-black active:scale-95"
                    >
                      {strings.cancel}
                    </button>
                    <button
                      type="submit"
                      className="flex-grow py-3 bg-gradient-to-r from-emerald-400 to-teal-550 text-slate-950 hover:from-emerald-500 hover:to-teal-600 rounded-xl text-xs font-black active:scale-95"
                    >
                      {strings.save}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ==================== BOTTOM SHEET: CONFIGURE WALLET ACCOUNT ==================== */}
        <AnimatePresence>
          {showAddAccountSheet && (
            <div className="fixed inset-0 bg-black/60 z-[95] flex items-end justify-center">
              <div className="absolute inset-0 cursor-default" onClick={() => setShowAddAccountSheet(false)} />

              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 350 }}
                className="w-full max-w-sm sm:max-w-md bg-slate-900 border-t border-slate-855 rounded-t-[32px] p-6 max-h-[92%] overflow-y-auto shadow-2xl relative z-10 text-slate-100"
              >
                <div className="w-12 h-1 bg-slate-800 rounded-full mx-auto mb-4" />

                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-base font-extrabold text-slate-200">
                    {editingAccount ? "Modify Wallet" : "Provision New Wallet Account"}
                  </h3>
                  <button onClick={() => setShowAddAccountSheet(false)} className="px-2 py-1 bg-slate-950 border border-slate-850 rounded-lg text-[10px] text-slate-400">Close</button>
                </div>

                <form onSubmit={handleSaveAccount} className="space-y-4">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                      Wallet Label
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Bank Savings, HDFC, Pocket Money"
                      value={accName}
                      onChange={(e) => setAccName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-850 text-xs font-bold text-slate-200 rounded-xl focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                        Wallet Type
                      </label>
                      <select
                        value={accType}
                        onChange={(e: any) => setAccType(e.target.value)}
                        className="w-full px-2 py-2 bg-slate-950 border border-slate-850 text-xs font-semibold text-slate-100 rounded-xl focus:outline-none"
                      >
                        <option value="Cash">Cash Wallet</option>
                        <option value="Bank">Bank Account</option>
                        <option value="Credit Card">Credit Card</option>
                        <option value="Other">Other Assets</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                        Starter funds (₹)
                      </label>
                      <input
                        type="number"
                        required
                        placeholder="0.00"
                        value={accBalance}
                        onChange={(e) => setAccBalance(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-855 text-xs font-bold text-emerald-400 rounded-xl focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="pt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddAccountSheet(false)}
                      className="flex-1 py-3 border border-slate-850 text-slate-400 rounded-xl text-xs active:scale-95"
                    >
                      Close
                    </button>
                    <button
                      type="submit"
                      className="flex-grow py-3 bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-500 hover:to-teal-600 text-slate-950 rounded-xl text-xs font-bold active:scale-95"
                    >
                      Save Wallet Balance
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ==================== BOTTOM SHEET: CONFIGURE CATEGORY TAG ==================== */}
        <AnimatePresence>
          {showAddCategorySheet && (
            <div className="fixed inset-0 bg-black/60 z-[95] flex items-end justify-center">
              <div className="absolute inset-0 cursor-default" onClick={() => setShowAddCategorySheet(false)} />

              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 350 }}
                className="w-full max-w-sm sm:max-w-md bg-slate-900 border-t border-slate-855 rounded-t-[32px] p-6 max-h-[92%] overflow-y-auto shadow-2xl relative z-10 text-slate-100"
              >
                <div className="w-12 h-1 bg-slate-800 rounded-full mx-auto mb-4" />

                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-base font-extrabold text-slate-200">
                    Add Customized Category Tag
                  </h3>
                  <button onClick={() => setShowAddCategorySheet(false)} className="px-2 py-1 bg-slate-950 border border-slate-850 rounded-lg text-[10px] text-slate-400">Close</button>
                </div>

                <form onSubmit={handleSaveCategory} className="space-y-4">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                      Category Tag Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Subscriptions, Pet Care, Gifts"
                      value={catName}
                      onChange={(e) => setCatName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-850 text-xs font-bold text-slate-200 rounded-xl focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                        Category Flow
                      </label>
                      <select
                        value={catType}
                        onChange={(e: any) => setCatType(e.target.value)}
                        className="w-full px-2 py-2 bg-slate-950 border border-slate-850 text-xs font-semibold text-slate-100 rounded-xl"
                      >
                        <option value="expense">Expense Category</option>
                        <option value="income">Income Category</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                        Pick Color Badge
                      </label>
                      <input
                        type="color"
                        value={catColor}
                        onChange={(e) => setCatColor(e.target.value)}
                        className="w-full h-9 bg-slate-950 border border-slate-850 rounded-xl cursor-crosshair p-1"
                      />
                    </div>
                  </div>

                  <div className="pt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddCategorySheet(false)}
                      className="flex-1 py-3 border border-slate-850 text-slate-400 rounded-xl text-xs active:scale-95"
                    >
                      Close
                    </button>
                    <button
                      type="submit"
                      className="flex-grow py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-600 text-slate-950 rounded-xl text-xs font-bold active:scale-95"
                    >
                      Register Tag
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
