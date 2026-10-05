"use client";

import { useState, useEffect } from "react";
import { 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Wallet, 
  Plus, 
  Trash2,
  PieChart as PieChartIcon,
  X,
  LogOut,
  Loader2,
  Calendar,
  Pencil,
  Download,
  Filter,
  Moon,
  Sun
} from "lucide-react";
import { format, isToday, isYesterday, isSameMonth, isSameDay, parseISO } from "date-fns";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from "recharts";
import { auth, db, googleProvider } from "@/lib/firebase";
import { signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, writeBatch } from "firebase/firestore";
import { read, utils } from "xlsx";

type TransactionType = "income" | "expense";
type FilterPeriod = "all" | "today" | "yesterday" | "month" | "custom";
type TypeFilter = "all" | "income" | "expense";

interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  sourceOrDestination: string;
  reason: string;
  date: string;
  category: string;
  userId?: string;
  account?: string;
}

interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  userId?: string;
}

interface Budget {
  id: string;
  category: string;
  limitAmount: number;
  userId?: string;
}

interface Subscription {
  id: string;
  name: string;
  amount: number;
  category: string;
  userId?: string;
}

interface Debt {
  id: string;
  type: "i_owe" | "owes_me";
  personName: string;
  amount: number;
  isPaid: boolean;
  userId?: string;
}

const ACCOUNTS = ["Kaspi Gold", "Қолма-қол", "Halyk Bank", "Депозит", "Басқа"];

const INCOME_SOURCES = ["Негізгі жұмыс", "Қосымша табыс", "Фриланс", "Сыйлық", "Бизнес", "Ата-ана", "Досым"];
const INCOME_REASONS = ["Айлық", "Аванс", "Қарызды қайтарды", "Бонус", "Сатылым"];

const EXPENSE_CATEGORIES: Record<string, string[]> = {
  "Азық-түлік": ["Күнделікті", "Ет/Сүт", "Тәттілер", "Көкөністер"],
  "Тамақтану (Кафе)": ["Түскі ас", "Кофе", "Кешкі ас", "Фастфуд"],
  "Жол ақысы": ["Такси (Яндекс/InDrive)", "Автобус", "Бензин", "Көлік жуу"],
  "Коммуналдық": ["Пәтер ақысы", "Интернет", "Жарық/Су/Жылу", "Телефон (Тариф)"],
  "Киім": ["Аяқ киім", "Сырт киім", "Шалбар/Джинс", "Көйлек/Футболка", "Аксессуар"],
  "Көңіл көтеру": ["Кино", "Концерт", "Ойындар", "Жазылымдар"],
  "Денсаулық": ["Дәріхана", "Дәрігер", "Спортзал", "Анализдер"],
  "Басқа": []
};

const PLACES_BY_CATEGORY: Record<string, string[]> = {
  "Азық-түлік": ["Magnum", "Small", "Toimart", "Galmart", "A-Store", "Jiffy", "Қазпошта"],
  "Тамақтану (Кафе)": ["KFC", "Burger King", "I'm", "Dodo Pizza", "Salam Bro", "Navat", "Starbucks", "Costa Coffee", "Zheka's Doner"],
  "Жол ақысы": ["Yandex Go", "InDrive", "Онай (Onay)", "Helios", "Sinooil", "Qazaq Oil", "Compass"],
  "Коммуналдық": ["Kaspi.kz", "Алсеко", "Астана-ЕРЦ", "Beeline", "Kcell", "Tele2", "Altel", "Kazakhtelecom"],
  "Киім": ["Zara", "LC Waikiki", "DeFacto", "Koton", "H&M", "Sportmaster", "Adidas", "Nike", "KIMEX"],
  "Көңіл көтеру": ["Kinopark", "Chaplin Cinemas", "Ticketon", "Netflix", "Spotify", "Yandex Music", "PlayStation"],
  "Денсаулық": ["Europharma", "Biosfera", "Садыхан", "Invivo", "Olymp", "Mediker", "Супер-Фарм"],
  "Басқа": ["Kaspi", "Halyk Bank"]
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF19A3', '#19FFD5', '#8884d8'];

// Helper for formatting money with spaces
const formatMoney = (val: number | string) => {
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return "0";
  return num.toLocaleString('ru-RU');
};

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Goal States
  const [isGoalFormOpen, setIsGoalFormOpen] = useState(false);
  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalCurrent, setGoalCurrent] = useState("");
  
  const [fundGoal, setFundGoal] = useState<Goal | null>(null);
  const [fundAmount, setFundAmount] = useState("");

  // Budget States
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isBudgetFormOpen, setIsBudgetFormOpen] = useState(false);
  const [budgetCategory, setBudgetCategory] = useState(Object.keys(EXPENSE_CATEGORIES)[0]);
  const [budgetLimit, setBudgetLimit] = useState("");

  // Subscription States
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isSubFormOpen, setIsSubFormOpen] = useState(false);
  const [subName, setSubName] = useState("");
  const [subAmount, setSubAmount] = useState("");
  const [subCategory, setSubCategory] = useState(Object.keys(EXPENSE_CATEGORIES)[0]);
  
  // Debt States
  const [debts, setDebts] = useState<Debt[]>([]);
  const [isDebtFormOpen, setIsDebtFormOpen] = useState(false);
  const [debtType, setDebtType] = useState<"i_owe" | "owes_me">("owes_me");
  const [debtPerson, setDebtPerson] = useState("");
  const [debtAmount, setDebtAmount] = useState("");

  const [selectedAccount, setSelectedAccount] = useState(ACCOUNTS[0]);

  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [displayAmount, setDisplayAmount] = useState(""); 
  
  const [sourceOrDestination, setSourceOrDestination] = useState("");
  const [reason, setReason] = useState("");
  const [category, setCategory] = useState(Object.keys(EXPENSE_CATEGORIES)[0]);

  // Filters
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>("today");
  const [customDate, setCustomDate] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    if (!user || !user.displayName) {
      setTransactions([]);
      return;
    }

    const q = query(
      collection(db, "transactions"), 
      where("userId", "==", user.uid)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Transaction[];
      
      data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTransactions(data);
    });

    const qGoals = query(
      collection(db, "goals"),
      where("userId", "==", user.uid)
    );
    const unsubGoals = onSnapshot(qGoals, (snapshot) => {
      setGoals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Goal)));
    });

    const qBudgets = query(
      collection(db, "budgets"),
      where("userId", "==", user.uid)
    );
    const unsubBudgets = onSnapshot(qBudgets, (snapshot) => {
      setBudgets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Budget)));
    });

    const qSubs = query(
      collection(db, "subscriptions"),
      where("userId", "==", user.uid)
    );
    const unsubSubs = onSnapshot(qSubs, (snapshot) => {
      setSubscriptions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subscription)));
    });

    const qDebts = query(
      collection(db, "debts"),
      where("userId", "==", user.uid)
    );
    const unsubDebts = onSnapshot(qDebts, (snapshot) => {
      setDebts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Debt)));
    });

    return () => {
      unsubscribe();
      unsubGoals();
      unsubBudgets();
      unsubSubs();
      unsubDebts();
    };
  }, [user]);

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await addDoc(collection(db, "goals"), {
        name: goalName,
        targetAmount: Number(goalTarget.replace(/\D/g, "")),
        currentAmount: Number(goalCurrent.replace(/\D/g, "") || 0),
        userId: user.uid
      });
      setIsGoalFormOpen(false);
      setGoalName("");
      setGoalTarget("");
      setGoalCurrent("");
    } catch (err: any) {
      alert("Қателік (Goals): " + err.message);
      console.error(err);
    }
  };

  const handleFundGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fundGoal) return;
    const added = Number(fundAmount.replace(/\D/g, ""));
    if (added <= 0) return;
    
    try {
      const newAmount = fundGoal.currentAmount + added;
      await updateDoc(doc(db, "goals", fundGoal.id), {
        currentAmount: newAmount
      });
      setFundGoal(null);
      setFundAmount("");
    } catch (err: any) {
      alert("Қателік: " + err.message);
      console.error(err);
    }
  };

  const handleAddBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await addDoc(collection(db, "budgets"), {
        category: budgetCategory,
        limitAmount: Number(budgetLimit.replace(/\D/g, "")),
        userId: user.uid
      });
      setIsBudgetFormOpen(false);
      setBudgetLimit("");
    } catch (err: any) {
      alert("Қателік (Budgets): " + err.message);
      console.error(err);
    }
  };

  const handleAddSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await addDoc(collection(db, "subscriptions"), {
        name: subName,
        amount: Number(subAmount.replace(/\D/g, "")),
        category: subCategory,
        userId: user.uid
      });
      setIsSubFormOpen(false);
      setSubName("");
      setSubAmount("");
    } catch (err: any) {
      alert("Қателік (Subscriptions): " + err.message);
      console.error(err);
    }
  };

  
  const handleAddDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await addDoc(collection(db, "debts"), {
        type: debtType,
        personName: debtPerson,
        amount: Number(debtAmount.replace(/\D/g, "")),
        isPaid: false,
        userId: user.uid
      });
      setIsDebtFormOpen(false);
      setDebtPerson("");
      setDebtAmount("");
    } catch (err: any) {
      alert("Қателік (Debts): " + err.message);
      console.error(err);
    }
  };

  const handlePayDebt = async (debt: Debt) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, "debts", debt.id), { isPaid: true });
      await addDoc(collection(db, "transactions"), {
        type: debt.type === "i_owe" ? "expense" : "income",
        amount: debt.amount,
        sourceOrDestination: debt.personName,
        reason: debt.type === "i_owe" ? "Қарызды қайтардым" : "Қарызын қайтарды",
        category: "Басқа",
        date: new Date().toISOString(),
        userId: user.uid,
        account: ACCOUNTS[0]
      });
      alert(debt.personName + " бойынша қарыз жабылды!");
    } catch (err: any) {
      alert("Қателік (Debt Pay): " + err.message);
    }
  };

  const handlePaySubscription = async (sub: Subscription) => {
    if (!user) return;
    await addDoc(collection(db, "transactions"), {
      type: "expense",
      amount: sub.amount,
      sourceOrDestination: sub.name,
      reason: "Тұрақты төлем",
      category: sub.category,
      date: new Date().toISOString(),
      userId: user.uid
    });
    alert(`${sub.name} сәтті төленді!`);
  };

  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    try {
      if (file.name.toLowerCase().endsWith('.pdf')) {
        alert("PDF файлдарын оқу әзірге қиындық тудырады. Kaspi қосымшасынан 'Excel' форматында жүктеп алуыңызды сұраймыз.");
        return;
      }
      const data = await file.arrayBuffer();
      const workbook = read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[] = utils.sheet_to_json(sheet, { header: 1 });
      
      // Kaspi format is usually something like: Date, Category, Detail, Amount
      // But it's very messy. Let's try to extract reasonably.
      // We will loop from row 5 down to skip Kaspi headers
      const batch = writeBatch(db);
      let count = 0;
      
      for (let i = 2; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length < 3) continue;
        
        let dateStr = row[0]; // "DD.MM.YY"
        let amountStr = String(row[row.length - 1]); // Amount is usually last column
        
        // Try parsing amount
        const amount = Number(amountStr.replace(/[^0-9.-]+/g,""));
        if (isNaN(amount) || amount === 0) continue;
        
        // Try parsing date if possible, else use today
        let d = new Date();
        if (typeof dateStr === 'string' && dateStr.includes('.')) {
          const parts = dateStr.split('.');
          if (parts.length >= 3) {
            const y = parts[2].length === 2 ? 2000 + parseInt(parts[2]) : parseInt(parts[2]);
            d = new Date(y, parseInt(parts[1]) - 1, parseInt(parts[0]));
          }
        }
        
        const isExpense = amount < 0;
        const absAmount = Math.abs(amount);
        
        const newDocRef = doc(collection(db, "transactions"));
        batch.set(newDocRef, {
          type: isExpense ? "expense" : "income",
          amount: absAmount,
          sourceOrDestination: String(row[2] || "Белгісіз"),
          reason: "Excel Import",
          category: String(row[1] || "Басқа"),
          date: d.toISOString(),
          userId: user.uid,
          account: "Kaspi Gold"
        });
        count++;
      }
      
      if (count > 0) {
        await batch.commit();
        alert(count + " транзакция сәтті жүктелді!");
      } else {
        alert("Ешқандай транзакция табылмады. Форматты тексеріңіз.");
      }
    } catch (err: any) {
      console.error(err);
      alert("Қателік: " + err.message);
    }
  };

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Auth error:", error);
      alert("Google арқылы кіру қателігі: " + error.message);
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove anything that isn't a digit
    const rawValue = e.target.value.replace(/\D/g, "");
    if (!rawValue) {
      setDisplayAmount("");
      setAmount("");
      return;
    }
    setDisplayAmount(formatMoney(rawValue));
    setAmount(rawValue);
  };

  const handleAddOrUpdateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !sourceOrDestination || !reason || !user) return;

    try {
      const data = {
        type,
        amount: parseFloat(amount),
        sourceOrDestination,
        reason,
        category: type === "income" ? "Кіріс" : category,
      };

      if (editingId) {
        await updateDoc(doc(db, "transactions", editingId), data);
        setEditingId(null);
      } else {
        await addDoc(collection(db, "transactions"), {
          ...data,
          date: new Date().toISOString(),
          userId: user.uid
        });
      }
      
      setAmount("");
      setDisplayAmount("");
      setSourceOrDestination("");
      setReason("");
      setIsFormOpen(false);
    } catch (error) {
      console.error("Error saving doc:", error);
    }
  };

  const handleEdit = (t: Transaction) => {
    setIsFormOpen(true);
    setEditingId(t.id);
    setType(t.type);
    setAmount(t.amount.toString());
    setDisplayAmount(formatMoney(t.amount));
    setSourceOrDestination(t.sourceOrDestination);
    setReason(t.reason);
    setCategory(t.category === "Кіріс" ? Object.keys(EXPENSE_CATEGORIES)[0] : t.category);
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    if (confirm("Өшіруге сенімдісіз бе?")) {
      try {
        await deleteDoc(doc(db, "transactions", id));
      } catch (error) {
        console.error("Error deleting doc:", error);
      }
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setAmount("");
    setDisplayAmount("");
    setSourceOrDestination("");
    setReason("");
  };

  // Filter transactions based on selected period AND type
  const filteredTransactions = transactions.filter(t => {
    // 1. Period filter
    const tDate = parseISO(t.date);
    let passesPeriod = true;
    if (filterPeriod === "today") passesPeriod = isToday(tDate);
    else if (filterPeriod === "yesterday") passesPeriod = isYesterday(tDate);
    else if (filterPeriod === "month") passesPeriod = isSameMonth(tDate, new Date());
    else if (filterPeriod === "custom" && customDate) {
      passesPeriod = isSameDay(tDate, new Date(customDate));
    }
    
    // 2. Type filter
    let passesType = true;
    if (typeFilter !== "all") passesType = t.type === typeFilter;

    return passesPeriod && passesType;
  });

  const handleExportCSV = () => {
    if (transactions.length === 0) return;
    
    // Calculate totals for the selected period
    const tIncome = filteredTransactions.filter(t => t.type === "income").reduce((a, b) => a + b.amount, 0);
    const tExpense = filteredTransactions.filter(t => t.type === "expense").reduce((a, b) => a + b.amount, 0);
    const tBalance = tIncome - tExpense;

    const headers = ["Күні", "Түрі", "Санат", "Қайда/Кімге", "Себебі", "Сома (₸)"];
    
    const rows = filteredTransactions.map(t => [
      format(parseISO(t.date), "dd.MM.yyyy HH:mm"),
      t.type === "income" ? "Кіріс" : "Шығыс",
      t.category,
      `"${t.sourceOrDestination}"`,
      `"${t.reason}"`,
      t.type === "income" ? `"${formatMoney(t.amount)}"` : `"-${formatMoney(t.amount)}"`
    ]);
    
    rows.push(["", "", "", "", "", ""]);
    rows.push(["", "", "", "", "Жалпы кіріс:", `"${formatMoney(tIncome)}"`]);
    rows.push(["", "", "", "", "Жалпы шығыс:", `"-${formatMoney(tExpense)}"`]);
    rows.push(["", "", "", "", "ҚОРЫТЫНДЫ БАЛАНС:", `"${formatMoney(tBalance)}"`]);
    
    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Қаржы_${filterPeriod}_${format(new Date(), "dd-MM-yyyy")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-[#1C1C1E] dark:border dark:border-gray-800 p-8 rounded-3xl shadow-sm text-center max-w-sm w-full border border-gray-100">
          <Wallet className="w-16 h-16 text-black dark:text-white mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Қаржы</h1>
          <p className="text-gray-500 mb-8">Жеке қаржыңызды бақылау үшін кіріңіз</p>
          <button 
            onClick={handleSignIn}
            className="w-full bg-black text-white dark:bg-white dark:text-black font-bold py-4 rounded-2xl hover:bg-gray-800 dark:hover:bg-gray-200 transition shadow-md flex items-center justify-center gap-2"
          >
            Google арқылы кіру
          </button>
        </div>
      </div>
    );
  }

  const totalIncome = filteredTransactions
    .filter((t) => t.type === "income")
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalExpense = filteredTransactions
    .filter((t) => t.type === "expense")
    .reduce((acc, curr) => acc + curr.amount, 0);

  
  const balance = totalIncome - totalExpense;

  // Smart Analytics
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  const thisMonthExpenses = transactions
    .filter(t => t.type === 'expense')
    .filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((sum, t) => sum + t.amount, 0);

  const lastMonthExpenses = transactions
    .filter(t => t.type === 'expense')
    .filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
    })
    .reduce((sum, t) => sum + t.amount, 0);

  let analyticsMessage = "";
  let analyticsColor = "text-gray-500 bg-gray-50 dark:bg-gray-800 dark:text-gray-400";
  if (lastMonthExpenses > 0) {
    const diff = thisMonthExpenses - lastMonthExpenses;
    const percent = Math.round(Math.abs(diff) / lastMonthExpenses * 100);
    if (diff > 0) {
      analyticsMessage = `Ақылды кеңес: Сіз бұл айда өткен айға қарағанда ${percent}% (${formatMoney(diff)} ₸) көп жұмсадыңыз. Үнемдеуге тырысыңыз!`;
      analyticsColor = "text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 border border-red-100 dark:border-red-900/50";
    } else if (diff < 0) {
      analyticsMessage = `Керемет! Сіз бұл айда өткен айға қарағанда ${percent}% (${formatMoney(Math.abs(diff))} ₸) аз жұмсадыңыз.`;
      analyticsColor = "text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400 border border-green-100 dark:border-green-900/50";
    } else {
      analyticsMessage = `Сіздің шығындарыңыз өткен аймен бірдей.`;
    }
  }


  const accountBalances = ACCOUNTS.map(acc => {
    const accTransactions = transactions.filter(t => t.account === acc || (!t.account && acc === "Kaspi Gold"));
    const inc = accTransactions.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
    const exp = accTransactions.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
    return { account: acc, balance: inc - exp };
  }).filter(a => a.balance !== 0);

  const expensesByCategory = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
      return acc;
    }, {} as Record<string, number>);

  const chartData = Object.keys(expensesByCategory).map(key => ({
    name: key,
    value: expensesByCategory[key]
  }));

  const reasonOptions = type === "income" ? INCOME_REASONS : EXPENSE_CATEGORIES[category];
  const placeOptions = type === "income" ? INCOME_SOURCES : (PLACES_BY_CATEGORY[category] || PLACES_BY_CATEGORY["Басқа"]);

  const getPlacePlaceholder = () => {
    if (type === "income") return "Мысалы: Негізгі жұмыс, Kaspi";
    if (category === "Азық-түлік") return "Мысалы: Magnum, Small, Galmart";
    if (category === "Тамақтану (Кафе)") return "Мысалы: KFC, Navat, Starbucks";
    if (category === "Жол ақысы") return "Мысалы: Yandex Go, InDrive, Helios";
    if (category === "Киім") return "Мысалы: DeFacto, LC Waikiki, Zara";
    if (category === "Коммуналдық") return "Мысалы: Kaspi, Алсеко";
    if (category === "Көңіл көтеру") return "Мысалы: Kinopark, Ticketon";
    if (category === "Денсаулық") return "Мысалы: Europharma, Olymp";
    return "Мысалы: Дүкеннің аты";
  };

  const getReasonPlaceholder = () => {
    if (type === "income") return "Мысалы: Аванс, Бонус";
    if (category === "Азық-түлік") return "Мысалы: Күнделікті, Ет/Сүт";
    if (category === "Тамақтану (Кафе)") return "Мысалы: Түскі ас, Кофе";
    if (category === "Жол ақысы") return "Мысалы: Такси, Автобус";
    if (category === "Киім") return "Мысалы: Аяқ киім, Куртка";
    if (category === "Коммуналдық") return "Мысалы: Пәтер ақысы, Свет";
    if (category === "Көңіл көтеру") return "Мысалы: Кино, Ойындар";
    if (category === "Денсаулық") return "Мысалы: Дәрі, Анализ";
    return "Мысалы: Себебін жазыңыз";
  };


  const kazakhMonths = ["қаңтар", "ақпан", "наурыз", "сәуір", "мамыр", "маусым", "шілде", "тамыз", "қыркүйек", "қазан", "қараша", "желтоқсан"];
  const d = new Date();
  const dateString = `${d.getDate()} ${kazakhMonths[d.getMonth()]}`;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-white p-4 md:p-8 pb-24 md:pb-8 font-sans selection:bg-blue-100">
      
      <datalist id="places-list">
        {placeOptions.map((place, i) => <option key={i} value={place} />)}
      </datalist>
      <datalist id="reasons-list">
        {reasonOptions?.map((r, i) => <option key={i} value={r} />)}
      </datalist>

      <div className="max-w-4xl mx-auto space-y-6">
        
        <header className="flex justify-between items-center bg-white dark:bg-[#1C1C1E] dark:border dark:border-gray-800 p-4 rounded-3xl shadow-sm">
          <div className="flex items-center gap-3 px-2">
            {user.photoURL ? (
              <img src={user.photoURL} alt="Аватар" className="w-12 h-12 rounded-full border border-gray-100" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                <span className="text-lg font-bold text-gray-500">
                  {user.email?.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-gray-900 dark:text-white leading-tight flex items-center gap-2 flex-wrap">
                <span className="truncate max-w-[100px] sm:max-w-none">{user.displayName || "Қолданушы"}</span>
                <span suppressHydrationWarning className="text-[10px] font-medium text-gray-400 bg-gray-100 dark:bg-[#2C2C2E] px-2 py-0.5 rounded-full tracking-wide whitespace-nowrap">
                  {dateString}
                </span>
              </h1>
              <p className="text-xs text-gray-400 truncate max-w-[120px] sm:max-w-[200px]">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <label className="bg-green-500 hover:bg-green-600 text-white p-2.5 sm:p-3 rounded-full cursor-pointer transition-transform shadow-md" title="Excel жүктеу (Kaspi)">
              <input type="file" accept=".xlsx, .xls, .pdf" className="hidden" onChange={handleFileUpload} />
              <Download className="w-4 h-4 sm:w-5 sm:h-5 rotate-180" />
            </label>

            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="bg-gray-100 dark:bg-[#2C2C2E] hover:bg-gray-200 dark:hover:bg-[#3C3C3E] text-gray-600 dark:text-gray-300 p-2.5 sm:p-3 rounded-full transition-transform"
              title="Қараңғы режим"
            >
              {isDarkMode ? <Sun className="w-4 h-4 sm:w-5 sm:h-5" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>
            <button 
              onClick={() => setIsFormOpen(!isFormOpen)}
              className="bg-black hover:bg-gray-800 dark:hover:bg-gray-200 text-white p-3 rounded-full shadow-md transition-transform hover:scale-105"
            >
              {isFormOpen && !editingId ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
            </button>
            <button 
              onClick={() => signOut(auth)}
              className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 p-3 rounded-full transition-transform"
              title="Шығу"
            >
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </header>

        {/* Date Filter Row */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:overflow-visible scrollbar-hide snap-x">
          <button 
            onClick={() => setFilterPeriod("today")}
            className={`flex-shrink-0 snap-center px-4 py-2 rounded-2xl text-sm font-medium transition ${filterPeriod === "today" ? "bg-black text-white dark:bg-white dark:text-black shadow-md" : "bg-white dark:bg-[#1C1C1E] dark:border dark:border-gray-800 text-gray-600 hover:bg-gray-100"}`}
          >
            Бүгін
          </button>
          <button 
            onClick={() => setFilterPeriod("yesterday")}
            className={`flex-shrink-0 snap-center px-4 py-2 rounded-2xl text-sm font-medium transition ${filterPeriod === "yesterday" ? "bg-black text-white dark:bg-white dark:text-black shadow-md" : "bg-white dark:bg-[#1C1C1E] dark:border dark:border-gray-800 text-gray-600 hover:bg-gray-100"}`}
          >
            Кеше
          </button>
          <button 
            onClick={() => setFilterPeriod("month")}
            className={`flex-shrink-0 snap-center px-4 py-2 rounded-2xl text-sm font-medium transition ${filterPeriod === "month" ? "bg-black text-white dark:bg-white dark:text-black shadow-md" : "bg-white dark:bg-[#1C1C1E] dark:border dark:border-gray-800 text-gray-600 hover:bg-gray-100"}`}
          >
            Осы ай
          </button>
          <button 
            onClick={() => setFilterPeriod("all")}
            className={`flex-shrink-0 snap-center px-4 py-2 rounded-2xl text-sm font-medium transition ${filterPeriod === "all" ? "bg-black text-white dark:bg-white dark:text-black shadow-md" : "bg-white dark:bg-[#1C1C1E] dark:border dark:border-gray-800 text-gray-600 hover:bg-gray-100"}`}
          >
            Барлық уақыт
          </button>
          
          <div className="relative flex-shrink-0 snap-center">
            <button 
              className={`flex items-center justify-center w-10 h-10 rounded-2xl transition ${filterPeriod === "custom" ? "bg-black text-white dark:bg-white dark:text-black shadow-md" : "bg-white dark:bg-[#1C1C1E] dark:border dark:border-gray-800 text-gray-600 hover:bg-gray-100"}`}
              title="Күнтізбеден таңдау"
            >
              <Calendar className="w-4 h-4" />
            </button>
            <input 
              type="date" 
              value={customDate}
              onChange={(e) => {
                if (e.target.value) {
                  setCustomDate(e.target.value);
                  setFilterPeriod("custom");
                }
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
          
          <button 
            onClick={handleExportCSV}
            className="flex-shrink-0 snap-center flex items-center gap-2 px-4 py-2 ml-auto bg-green-50 text-green-600 rounded-2xl text-sm font-medium hover:bg-green-100 transition"
            title="Excel (CSV) жүктеп алу"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Excel</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-[#1C1C1E] dark:border dark:border-gray-800 p-6 rounded-3xl shadow-sm">
            <div className="flex items-center space-x-4">
              <div className="p-4 bg-gray-50 dark:bg-black rounded-2xl">
                <Wallet className="w-6 h-6 text-gray-700 dark:text-gray-300" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-400">
                  {filterPeriod === "month" ? "Айдағы баланс" : filterPeriod === "all" ? "Жалпы баланс" : "Күндік баланс"}
                </p>
                
                <p className="text-2xl font-bold tracking-tight">{formatMoney(balance)} ₸</p>


              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-[#1C1C1E] dark:border dark:border-gray-800 p-6 rounded-3xl shadow-sm">
            <div className="flex items-center space-x-4">
              <div className="p-4 bg-green-50 rounded-2xl">
                <ArrowUpCircle className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-400">Кіріс</p>
                <p className="text-2xl font-bold tracking-tight text-green-600">+{formatMoney(totalIncome)} ₸</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-[#1C1C1E] dark:border dark:border-gray-800 p-6 rounded-3xl shadow-sm">
            <div className="flex items-center space-x-4">
              <div className="p-4 bg-red-50 rounded-2xl">
                <ArrowDownCircle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-400">Шығыс</p>
                <p className="text-2xl font-bold tracking-tight text-red-600">-{formatMoney(totalExpense)} ₸</p>
              </div>
            </div>
          </div>
        </div>

        {isFormOpen && (
          <div className="bg-white dark:bg-[#1C1C1E] dark:border dark:border-gray-800 p-6 rounded-3xl shadow-sm animate-in fade-in slide-in-from-top-4 border border-gray-100 relative">
            
            {editingId && (
              <button 
                onClick={handleCloseForm}
                className="absolute top-4 right-4 p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 transition"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <div className="flex space-x-2 bg-gray-100 p-1 rounded-2xl mb-6 mt-2">
              <button
                type="button"
                onClick={() => { setType("income"); setCategory("Кіріс"); }}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${type === "income" ? "bg-white dark:bg-[#1C1C1E] dark:border dark:border-gray-800 text-green-600 shadow-sm" : "text-gray-500 hover:text-gray-700 dark:text-gray-300"}`}
              >
                Кіріс
              </button>
              <button
                type="button"
                onClick={() => { setType("expense"); setCategory(Object.keys(EXPENSE_CATEGORIES)[0]); }}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${type === "expense" ? "bg-white dark:bg-[#1C1C1E] dark:border dark:border-gray-800 text-red-600 shadow-sm" : "text-gray-500 hover:text-gray-700 dark:text-gray-300"}`}
              >
                Шығыс
              </button>
            </div>

            <form onSubmit={handleAddOrUpdateTransaction} className="space-y-5">
              {type === "expense" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Санат</label>
                  <select 
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      setReason("");
                    }}
                    className="w-full bg-gray-50 dark:bg-black border-0 p-4 rounded-2xl focus:ring-2 focus:ring-black outline-none font-medium text-gray-800 dark:text-gray-200"
                  >
                    {Object.keys(EXPENSE_CATEGORIES).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Сома (₸)</label>
                  <input 
                    type="text"
                    inputMode="numeric"
                    required 
                    value={displayAmount}
                    onChange={handleAmountChange}
                    className="w-full bg-gray-50 dark:bg-black border-0 p-4 rounded-2xl focus:ring-2 focus:ring-black outline-none text-xl font-bold"
                    placeholder="0"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    {type === "income" ? "Кімнен / Қайдан?" : "Қайда төленді?"}
                  </label>
                  <input 
                    type="text" 
                    required 
                    list="places-list"
                    value={sourceOrDestination}
                    onChange={(e) => setSourceOrDestination(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-black border-0 p-4 rounded-2xl focus:ring-2 focus:ring-black outline-none font-medium"
                    placeholder={getPlacePlaceholder()}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Нақты не үшін? (Міндетті емес)
                  </label>
                  <input 
                    type="text" 
                    list="reasons-list"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-black border-0 p-4 rounded-2xl focus:ring-2 focus:ring-black outline-none font-medium"
                    placeholder={getReasonPlaceholder()}
                  />
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-black text-white dark:bg-white dark:text-black font-bold py-4 rounded-2xl hover:bg-gray-800 dark:hover:bg-gray-200 transition shadow-md"
              >
                {editingId ? "Өзгерісті сақтау" : "Қосу"}
              </button>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white dark:bg-[#1C1C1E] dark:border dark:border-gray-800 p-6 rounded-3xl shadow-sm">
            
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">Операциялар тарихы</h2>
              
              <div className="flex bg-gray-100 p-1 rounded-xl">
                <button 
                  onClick={() => setTypeFilter("all")}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${typeFilter === "all" ? "bg-white dark:bg-[#1C1C1E] dark:border dark:border-gray-800 shadow-sm text-black dark:text-white" : "text-gray-500"}`}
                >
                  Бәрі
                </button>
                <button 
                  onClick={() => setTypeFilter("income")}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${typeFilter === "income" ? "bg-white dark:bg-[#1C1C1E] dark:border dark:border-gray-800 shadow-sm text-green-600" : "text-gray-500"}`}
                >
                  Кіріс
                </button>
                <button 
                  onClick={() => setTypeFilter("expense")}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${typeFilter === "expense" ? "bg-white dark:bg-[#1C1C1E] dark:border dark:border-gray-800 shadow-sm text-red-600" : "text-gray-500"}`}
                >
                  Шығыс
                </button>
              </div>
            </div>

            {filteredTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <Wallet className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm font-medium">Бұл уақыт аралығында ештеңе жоқ</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTransactions.map(t => (
                  <div key={t.id} className="group flex justify-between items-center p-4 rounded-2xl hover:bg-gray-50 dark:bg-black transition border border-transparent hover:border-gray-100">
                    <div className="flex items-center space-x-4">
                      <div className={`p-3 rounded-2xl ${t.type === 'income' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                        {t.type === 'income' ? <ArrowUpCircle className="w-5 h-5" /> : <ArrowDownCircle className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-bold text-gray-900 dark:text-white">{t.reason || t.sourceOrDestination}</p>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-full">
                            {t.category}
                          </span>

                        </div>
                        {t.reason && t.sourceOrDestination && (
                          <p className="text-sm text-gray-500 mt-0.5">{t.sourceOrDestination}</p>
                        )}
                        <p className="text-xs text-blue-500 font-medium mt-1">
                          {format(parseISO(t.date), "dd MMMM yyyy, HH:mm")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <p className={`font-bold tracking-tight mr-2 ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {t.type === 'income' ? '+' : '-'}{formatMoney(t.amount)} ₸
                      </p>
                      <button 
                        onClick={() => handleEdit(t)} 
                        className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition"
                        title="Өңдеу"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(t.id)} 
                        className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition"
                        title="Өшіру"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-[#1C1C1E] dark:border dark:border-gray-800 p-6 rounded-3xl shadow-sm relative">
              <h2 className="text-lg font-bold mb-6 text-gray-800 dark:text-gray-200 flex items-center">
                <PieChartIcon className="w-5 h-5 mr-2 text-gray-400" />
                Шығыстар аналитикасы
              </h2>
              {chartData.length > 0 ? (
                <div className="h-64 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        innerRadius={70}
                        outerRadius={95}
                        paddingAngle={4}
                        cornerRadius={8}
                        dataKey="value"
                        stroke="none"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: any) => `${formatMoney(value)} ₸`} 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
                        itemStyle={{ fontWeight: 600 }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', marginTop: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-6">
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">Шығыс</p>
                    <p className="text-lg font-bold text-gray-800 dark:text-gray-200">{formatMoney(totalExpense)} ₸</p>
                  </div>
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-gray-400">
                  <PieChartIcon className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-sm font-medium">Шығыс жоқ</p>
                </div>
              )}
            </div>

            {/* Budget Widget */}
            <div className="bg-white dark:bg-[#1C1C1E] dark:border dark:border-gray-800 p-6 rounded-3xl shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center">
                  Бюджет лимиттері
                </h2>
                <button className="text-sm font-bold text-blue-500 hover:text-blue-600 transition" onClick={() => setIsBudgetFormOpen(true)}>
                  + Қосу
                </button>
              </div>
              
              {budgets.length === 0 ? (
                <p className="text-sm text-gray-400">Сізде бюджеттік шектеу жоқ. Көп шығын кететін санаттарға лимит қойыңыз!</p>
              ) : (
                <div className="space-y-5">
                  {budgets.map(b => {
                    // Calculate current spending for this category this month
                    const currentSpent = transactions
                      .filter(t => t.type === 'expense' && t.category === b.category && isSameMonth(parseISO(t.date), new Date()))
                      .reduce((sum, t) => sum + t.amount, 0);
                    const percent = Math.min((currentSpent / b.limitAmount) * 100, 100);
                    const isOver = currentSpent >= b.limitAmount;
                    return (
                      <div key={b.id}>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="font-bold text-gray-800 dark:text-gray-200">{b.category}</span>
                          <span className={`font-medium ${isOver ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                            {formatMoney(currentSpent)} / {formatMoney(b.limitAmount)} ₸
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-3 overflow-hidden">
                          <div className={`h-3 rounded-full transition-all duration-1000 ${isOver ? 'bg-red-500' : 'bg-black dark:bg-white'}`} style={{ width: `${percent}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Goals Widget */}
            <div className="bg-white dark:bg-[#1C1C1E] dark:border dark:border-gray-800 p-6 rounded-3xl shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center">
                  Мақсаттар
                </h2>
                <button className="text-sm font-bold text-blue-500 hover:text-blue-600 transition" onClick={() => setIsGoalFormOpen(true)}>
                  + Қосу
                </button>
              </div>
              
              {goals.length === 0 ? (
                <p className="text-sm text-gray-400">Әзірге мақсат жоқ. Ақша жинау үшін жаңа мақсат қосыңыз!</p>
              ) : (
                <div className="space-y-5">
                  {goals.map(g => {
                    const percent = Math.min((g.currentAmount / g.targetAmount) * 100, 100);
                    return (
                      <div key={g.id}>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="font-bold text-gray-800 dark:text-gray-200">{g.name}</span>
                          <span className="text-gray-500 font-medium">{formatMoney(g.currentAmount)} / {formatMoney(g.targetAmount)} ₸</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                          <div className="bg-black h-3 rounded-full transition-all duration-1000" style={{ width: `${percent}%` }}></div>
                        </div>
                        <button 
                          onClick={() => setFundGoal(g)} 
                          className="text-xs text-blue-500 font-bold mt-2 inline-flex items-center hover:text-blue-600 transition"
                        >
                          + Ақша қосу
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Subscriptions Widget */}
            <div className="bg-white dark:bg-[#1C1C1E] dark:border dark:border-gray-800 p-6 rounded-3xl shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center">
                  Тұрақты төлемдер
                </h2>
                <button className="text-sm font-bold text-blue-500 hover:text-blue-600 transition" onClick={() => setIsSubFormOpen(true)}>
                  + Қосу
                </button>
              </div>
              
              {subscriptions.length === 0 ? (
                <p className="text-sm text-gray-400">Жазылымдар жоқ. Spotify, Netflix сияқты төлемдерді қосыңыз.</p>
              ) : (
                <div className="space-y-4">
                  {subscriptions.map(s => (
                    <div key={s.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-black rounded-2xl">
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white">{s.name}</p>
                        <p className="text-xs text-gray-500">{formatMoney(s.amount)} ₸</p>
                      </div>
                      <button 
                        onClick={() => handlePaySubscription(s)}
                        className="bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded-xl text-xs font-bold hover:scale-105 transition-transform"
                      >
                        Төлеу
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Debts Widget */}
            <div className="bg-white dark:bg-[#1C1C1E] dark:border dark:border-gray-800 p-6 rounded-3xl shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center">
                  Қарыз дәптері
                </h2>
                <button className="text-sm font-bold text-blue-500 hover:text-blue-600 transition" onClick={() => setIsDebtFormOpen(true)}>
                  + Қосу
                </button>
              </div>
              
              {debts.filter(d => !d.isPaid).length === 0 ? (
                <p className="text-sm text-gray-400">Қазір сізде ешқандай қарыз жазбасы жоқ.</p>
              ) : (
                <div className="space-y-4">
                  {debts.filter(d => !d.isPaid).map(d => (
                    <div key={d.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-black rounded-2xl">
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white">{d.personName}</p>
                        <p className={`text-xs font-bold ${d.type === 'i_owe' ? 'text-red-500' : 'text-green-500'}`}>
                          {d.type === 'i_owe' ? 'Мен қарызбын' : 'Маған қарыз'}
                        </p>
                      </div>
                      <div className="flex flex-col items-end">
                        <p className="font-bold mb-1">{formatMoney(d.amount)} ₸</p>
                        <button 
                          onClick={() => handlePayDebt(d)}
                          className="text-xs font-bold bg-black dark:bg-white text-white dark:text-black px-3 py-1.5 rounded-lg hover:scale-105 transition"
                        >
                          Қайтарылды
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Goal Modal */}
      {isGoalFormOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1C1C1E] dark:border dark:border-gray-800 rounded-3xl p-6 w-full max-w-sm relative">
            <button onClick={() => setIsGoalFormOpen(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-black dark:text-white rounded-full hover:bg-gray-100 transition">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">Жаңа мақсат</h2>
            <form onSubmit={handleAddGoal} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Мақсат атауы</label>
                <input required type="text" value={goalName} onChange={e => setGoalName(e.target.value)} placeholder="Мысалы: Көлік алу" className="w-full bg-gray-50 dark:bg-black border-0 p-4 rounded-2xl outline-none font-medium focus:ring-2 focus:ring-black" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Қанша жинау керек? (₸)</label>
                <input required type="text" inputMode="numeric" value={goalTarget} onChange={e => setGoalTarget(formatMoney(e.target.value.replace(/\D/g, "")))} placeholder="0" className="w-full bg-gray-50 dark:bg-black border-0 p-4 rounded-2xl outline-none font-bold focus:ring-2 focus:ring-black" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Қазір қанша бар? (₸)</label>
                <input type="text" inputMode="numeric" value={goalCurrent} onChange={e => setGoalCurrent(formatMoney(e.target.value.replace(/\D/g, "")))} placeholder="0" className="w-full bg-gray-50 dark:bg-black border-0 p-4 rounded-2xl outline-none font-bold focus:ring-2 focus:ring-black" />
              </div>
              <button type="submit" className="w-full bg-black text-white dark:bg-white dark:text-black font-bold py-4 rounded-2xl mt-4 shadow-md hover:bg-gray-800 dark:hover:bg-gray-200 transition">Сақтау</button>
            </form>
          </div>
        </div>
      )}

      {/* Budget Modal */}
      {isBudgetFormOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1C1C1E] dark:border dark:border-gray-800 rounded-3xl p-6 w-full max-w-sm relative">
            <button onClick={() => setIsBudgetFormOpen(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-black dark:text-white rounded-full hover:bg-gray-100 transition">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">Жаңа лимит</h2>
            <form onSubmit={handleAddBudget} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Санатты таңдаңыз</label>
                <select 
                  value={budgetCategory}
                  onChange={e => setBudgetCategory(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-black border-0 p-4 rounded-2xl outline-none font-medium focus:ring-2 focus:ring-black"
                >
                  {Object.keys(EXPENSE_CATEGORIES).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Лимит сомасы (₸)</label>
                <input required type="text" inputMode="numeric" value={budgetLimit} onChange={e => setBudgetLimit(formatMoney(e.target.value.replace(/\D/g, "")))} placeholder="50 000" className="w-full bg-gray-50 dark:bg-black border-0 p-4 rounded-2xl outline-none font-bold focus:ring-2 focus:ring-black" />
              </div>
              <button type="submit" className="w-full bg-black text-white dark:bg-white dark:text-black font-bold py-4 rounded-2xl mt-4 shadow-md hover:bg-gray-800 dark:hover:bg-gray-200 transition">Сақтау</button>
            </form>
          </div>
        </div>
      )}

      {/* Sub Modal */}
      {isSubFormOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1C1C1E] dark:border dark:border-gray-800 rounded-3xl p-6 w-full max-w-sm relative">
            <button onClick={() => setIsSubFormOpen(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-black dark:text-white rounded-full hover:bg-gray-100 transition">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">Жаңа төлем</h2>
            <form onSubmit={handleAddSubscription} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Атауы</label>
                <input required type="text" value={subName} onChange={e => setSubName(e.target.value)} placeholder="Мысалы: Netflix" className="w-full bg-gray-50 dark:bg-black border-0 p-4 rounded-2xl outline-none font-medium focus:ring-2 focus:ring-black" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Санат</label>
                <select 
                  value={subCategory}
                  onChange={e => setSubCategory(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-black border-0 p-4 rounded-2xl outline-none font-medium focus:ring-2 focus:ring-black"
                >
                  {Object.keys(EXPENSE_CATEGORIES).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Сомасы (₸)</label>
                <input required type="text" inputMode="numeric" value={subAmount} onChange={e => setSubAmount(formatMoney(e.target.value.replace(/\D/g, "")))} placeholder="3000" className="w-full bg-gray-50 dark:bg-black border-0 p-4 rounded-2xl outline-none font-bold focus:ring-2 focus:ring-black" />
              </div>
              <button type="submit" className="w-full bg-black text-white dark:bg-white dark:text-black font-bold py-4 rounded-2xl mt-4 shadow-md hover:bg-gray-800 dark:hover:bg-gray-200 transition">Сақтау</button>
            </form>
          </div>
        </div>
      )}

      {/* Fund Goal Modal */}
      {fundGoal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1C1C1E] dark:border dark:border-gray-800 rounded-3xl p-6 w-full max-w-sm relative">
            <button onClick={() => { setFundGoal(null); setFundAmount(""); }} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-black dark:text-white rounded-full hover:bg-gray-100 transition">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">Ақша қосу: {fundGoal.name}</h2>
            <form onSubmit={handleFundGoal} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Қанша ақша қосасыз? (₸)</label>
                <input required type="text" inputMode="numeric" value={fundAmount} onChange={e => setFundAmount(formatMoney(e.target.value.replace(/\D/g, "")))} placeholder="5000" className="w-full bg-gray-50 dark:bg-black border-0 p-4 rounded-2xl outline-none font-bold focus:ring-2 focus:ring-black" />
              </div>
              <button type="submit" className="w-full bg-black text-white dark:bg-white dark:text-black font-bold py-4 rounded-2xl mt-4 shadow-md hover:bg-gray-800 dark:hover:bg-gray-200 transition">Қосу</button>
            </form>
          </div>
        </div>
      )}


      {/* Debt Modal */}
      {isDebtFormOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1C1C1E] dark:border dark:border-gray-800 rounded-3xl p-6 w-full max-w-sm relative">
            <button onClick={() => setIsDebtFormOpen(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-black dark:text-white rounded-full hover:bg-gray-100 transition">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">Жаңа қарыз</h2>
            <form onSubmit={handleAddDebt} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Кімге / Кімнен?</label>
                <input required type="text" value={debtPerson} onChange={e => setDebtPerson(e.target.value)} placeholder="Адамның аты" className="w-full bg-gray-50 dark:bg-black border-0 p-4 rounded-2xl outline-none font-medium focus:ring-2 focus:ring-black" />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setDebtType("owes_me")} className={`flex-1 py-3 rounded-2xl font-bold text-sm transition ${debtType === "owes_me" ? "bg-green-500 text-white" : "bg-gray-100 text-gray-400"}`}>Маған қарыз</button>
                <button type="button" onClick={() => setDebtType("i_owe")} className={`flex-1 py-3 rounded-2xl font-bold text-sm transition ${debtType === "i_owe" ? "bg-red-500 text-white" : "bg-gray-100 text-gray-400"}`}>Мен қарызбын</button>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Сомасы (₸)</label>
                <input required type="text" inputMode="numeric" value={debtAmount} onChange={e => setDebtAmount(formatMoney(e.target.value.replace(/\D/g, "")))} placeholder="10 000" className="w-full bg-gray-50 dark:bg-black border-0 p-4 rounded-2xl outline-none font-bold focus:ring-2 focus:ring-black" />
              </div>
              <button type="submit" className="w-full bg-black text-white dark:bg-white dark:text-black font-bold py-4 rounded-2xl mt-4 shadow-md hover:bg-gray-800 dark:hover:bg-gray-200 transition">Сақтау</button>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Floating Action Button (FAB) */}
      {!isFormOpen && (
        <button 
          onClick={() => {
            setIsFormOpen(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="md:hidden fixed bottom-6 right-6 bg-black text-white dark:bg-white dark:text-black p-4 rounded-full shadow-2xl z-50 transition-transform active:scale-95"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
