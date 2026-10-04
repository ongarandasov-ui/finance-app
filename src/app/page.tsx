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
  Filter
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
import { auth, db, googleProvider, appleProvider } from "@/lib/firebase";
import { signInWithPopup, signOut, onAuthStateChanged, User, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult, updateProfile } from "firebase/auth";
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";

// Add global declaration for recaptchaVerifier
declare global {
  interface Window {
    recaptchaVerifier: any;
  }
}

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
}

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
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  // Auth States
  const [authMethod, setAuthMethod] = useState<"options" | "phone" | "code" | "name">("options");
  const [phoneNumber, setPhoneNumber] = useState("+7");
  const [verificationCode, setVerificationCode] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [fullName, setFullName] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
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
    if (!window.recaptchaVerifier && typeof window !== 'undefined') {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible'
      });
    }
  }, []);

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

    return () => unsubscribe();
  }, [user]);

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Auth error:", error);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      await signInWithPopup(auth, appleProvider);
    } catch (error) {
      console.error("Apple Auth error:", error);
    }
  };

  const handlePhoneSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    try {
      const formattedPhone = phoneNumber.startsWith("+") ? phoneNumber : `+7${phoneNumber.replace(/\D/g, "")}`;
      const result = await signInWithPhoneNumber(auth, formattedPhone, window.recaptchaVerifier);
      setConfirmationResult(result);
      setAuthMethod("code");
    } catch (error: any) {
      console.error("SMS error", error);
      alert("Қателік: " + error.message);
    }
    setIsAuthLoading(false);
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult) return;
    setIsAuthLoading(true);
    try {
      const result = await confirmationResult.confirm(verificationCode);
      if (!result.user.displayName) {
         setAuthMethod("name");
      }
    } catch (error) {
      console.error("Code verification error", error);
      alert("Код қате немесе мерзімі біткен!");
    }
    setIsAuthLoading(false);
  };

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    if (user && fullName) {
      await updateProfile(user, { displayName: fullName });
      setUser({ ...user, displayName: fullName } as User); // Trigger re-render
    }
    setIsAuthLoading(false);
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!user || !user.displayName) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div id="recaptcha-container"></div>
        <div className="bg-white p-8 rounded-3xl shadow-sm max-w-sm w-full border border-gray-100">
          <div className="text-center mb-8">
            <Wallet className="w-16 h-16 text-black mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Қаржы</h1>
            <p className="text-gray-500">Жеке қаржыңызды бақылауға кіріңіз</p>
          </div>

          {user && !user.displayName ? (
            <form onSubmit={handleSaveName} className="space-y-4">
              <h3 className="text-lg font-bold text-center mb-2">Аты-жөніңізді енгізіңіз</h3>
              <input 
                type="text" 
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Мысалы: Оңғар"
                className="w-full bg-gray-50 border-0 p-4 rounded-2xl focus:ring-2 focus:ring-black outline-none font-medium"
              />
              <button 
                type="submit"
                disabled={isAuthLoading}
                className="w-full bg-black text-white font-bold py-4 rounded-2xl hover:bg-gray-800 transition shadow-md disabled:opacity-50"
              >
                {isAuthLoading ? "Сақталуда..." : "Бастау"}
              </button>
            </form>
          ) : authMethod === "options" ? (
            <div className="space-y-3">
              <button 
                onClick={handleSignIn}
                className="w-full bg-white text-gray-800 font-bold py-4 rounded-2xl hover:bg-gray-50 transition border border-gray-200 flex items-center justify-center gap-2"
              >
                Google арқылы кіру
              </button>
              <button 
                onClick={handleAppleSignIn}
                className="w-full bg-black text-white font-bold py-4 rounded-2xl hover:bg-gray-800 transition shadow-md flex items-center justify-center gap-2"
              >
                Apple арқылы кіру
              </button>
              <button 
                onClick={() => setAuthMethod("phone")}
                className="w-full bg-blue-50 text-blue-600 font-bold py-4 rounded-2xl hover:bg-blue-100 transition shadow-sm flex items-center justify-center gap-2"
              >
                Телефон нөмірімен кіру
              </button>
            </div>
          ) : authMethod === "phone" ? (
            <form onSubmit={handlePhoneSignIn} className="space-y-4">
              <input 
                type="tel" 
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+7 (___) ___-__-__"
                className="w-full bg-gray-50 border-0 p-4 rounded-2xl focus:ring-2 focus:ring-black outline-none font-bold text-lg"
              />
              <button 
                type="submit"
                disabled={isAuthLoading}
                className="w-full bg-black text-white font-bold py-4 rounded-2xl hover:bg-gray-800 transition shadow-md disabled:opacity-50"
              >
                {isAuthLoading ? "Күте тұрыңыз..." : "Код жіберу"}
              </button>
              <button 
                type="button"
                onClick={() => setAuthMethod("options")}
                className="w-full text-gray-400 font-medium py-2 hover:text-gray-600 transition"
              >
                Артқа қайту
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <p className="text-sm text-gray-500 text-center mb-2">SMS арқылы келген кодты енгізіңіз</p>
              <input 
                type="text" 
                required
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="000000"
                className="w-full bg-gray-50 border-0 p-4 rounded-2xl focus:ring-2 focus:ring-black outline-none font-bold text-center text-xl tracking-widest"
              />
              <button 
                type="submit"
                disabled={isAuthLoading}
                className="w-full bg-black text-white font-bold py-4 rounded-2xl hover:bg-gray-800 transition shadow-md disabled:opacity-50"
              >
                {isAuthLoading ? "Тексерілуде..." : "Растау"}
              </button>
            </form>
          )}
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

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-4 md:p-8 pb-24 md:pb-8 font-sans selection:bg-blue-100">
      
      <datalist id="places-list">
        {placeOptions.map((place, i) => <option key={i} value={place} />)}
      </datalist>
      <datalist id="reasons-list">
        {reasonOptions?.map((r, i) => <option key={i} value={r} />)}
      </datalist>

      <div className="max-w-4xl mx-auto space-y-6">
        
        <header className="flex justify-between items-center bg-white p-4 rounded-3xl shadow-sm">
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
              <h1 className="text-lg font-bold tracking-tight text-gray-900 leading-tight">
                {user.displayName || "Қолданушы"}
              </h1>
              <p className="text-xs text-gray-400 truncate max-w-[200px]">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsFormOpen(!isFormOpen)}
              className="bg-black hover:bg-gray-800 text-white p-3 rounded-full shadow-md transition-transform hover:scale-105"
            >
              {isFormOpen && !editingId ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
            </button>
            <button 
              onClick={() => signOut(auth)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-600 p-3 rounded-full transition-transform"
              title="Шығу"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Date Filter Row */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:overflow-visible scrollbar-hide snap-x">
          <button 
            onClick={() => setFilterPeriod("today")}
            className={`flex-shrink-0 snap-center px-4 py-2 rounded-2xl text-sm font-medium transition ${filterPeriod === "today" ? "bg-black text-white shadow-md" : "bg-white text-gray-600 hover:bg-gray-100"}`}
          >
            Бүгін
          </button>
          <button 
            onClick={() => setFilterPeriod("yesterday")}
            className={`flex-shrink-0 snap-center px-4 py-2 rounded-2xl text-sm font-medium transition ${filterPeriod === "yesterday" ? "bg-black text-white shadow-md" : "bg-white text-gray-600 hover:bg-gray-100"}`}
          >
            Кеше
          </button>
          <button 
            onClick={() => setFilterPeriod("month")}
            className={`flex-shrink-0 snap-center px-4 py-2 rounded-2xl text-sm font-medium transition ${filterPeriod === "month" ? "bg-black text-white shadow-md" : "bg-white text-gray-600 hover:bg-gray-100"}`}
          >
            Осы ай
          </button>
          <button 
            onClick={() => setFilterPeriod("all")}
            className={`flex-shrink-0 snap-center px-4 py-2 rounded-2xl text-sm font-medium transition ${filterPeriod === "all" ? "bg-black text-white shadow-md" : "bg-white text-gray-600 hover:bg-gray-100"}`}
          >
            Барлық уақыт
          </button>
          
          <div className="relative flex-shrink-0 snap-center">
            <button 
              className={`flex items-center justify-center w-10 h-10 rounded-2xl transition ${filterPeriod === "custom" ? "bg-black text-white shadow-md" : "bg-white text-gray-600 hover:bg-gray-100"}`}
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
          <div className="bg-white p-6 rounded-3xl shadow-sm">
            <div className="flex items-center space-x-4">
              <div className="p-4 bg-gray-50 rounded-2xl">
                <Wallet className="w-6 h-6 text-gray-700" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-400">
                  {filterPeriod === "month" ? "Айдағы баланс" : filterPeriod === "all" ? "Жалпы баланс" : "Күндік баланс"}
                </p>
                <p className="text-2xl font-bold tracking-tight">{formatMoney(balance)} ₸</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm">
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
          <div className="bg-white p-6 rounded-3xl shadow-sm">
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
          <div className="bg-white p-6 rounded-3xl shadow-sm animate-in fade-in slide-in-from-top-4 border border-gray-100 relative">
            
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
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${type === "income" ? "bg-white text-green-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                Кіріс
              </button>
              <button
                type="button"
                onClick={() => { setType("expense"); setCategory(Object.keys(EXPENSE_CATEGORIES)[0]); }}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${type === "expense" ? "bg-white text-red-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
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
                    className="w-full bg-gray-50 border-0 p-4 rounded-2xl focus:ring-2 focus:ring-black outline-none font-medium text-gray-800"
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
                    className="w-full bg-gray-50 border-0 p-4 rounded-2xl focus:ring-2 focus:ring-black outline-none text-xl font-bold"
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
                    className="w-full bg-gray-50 border-0 p-4 rounded-2xl focus:ring-2 focus:ring-black outline-none font-medium"
                    placeholder={getPlacePlaceholder()}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Нақты не үшін?
                  </label>
                  <input 
                    type="text" 
                    required
                    list="reasons-list"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full bg-gray-50 border-0 p-4 rounded-2xl focus:ring-2 focus:ring-black outline-none font-medium"
                    placeholder={getReasonPlaceholder()}
                  />
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-black text-white font-bold py-4 rounded-2xl hover:bg-gray-800 transition shadow-md"
              >
                {editingId ? "Өзгерісті сақтау" : "Қосу"}
              </button>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white p-6 rounded-3xl shadow-sm">
            
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-gray-800">Операциялар тарихы</h2>
              
              <div className="flex bg-gray-100 p-1 rounded-xl">
                <button 
                  onClick={() => setTypeFilter("all")}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${typeFilter === "all" ? "bg-white shadow-sm text-black" : "text-gray-500"}`}
                >
                  Бәрі
                </button>
                <button 
                  onClick={() => setTypeFilter("income")}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${typeFilter === "income" ? "bg-white shadow-sm text-green-600" : "text-gray-500"}`}
                >
                  Кіріс
                </button>
                <button 
                  onClick={() => setTypeFilter("expense")}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${typeFilter === "expense" ? "bg-white shadow-sm text-red-600" : "text-gray-500"}`}
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
                  <div key={t.id} className="group flex justify-between items-center p-4 rounded-2xl hover:bg-gray-50 transition border border-transparent hover:border-gray-100">
                    <div className="flex items-center space-x-4">
                      <div className={`p-3 rounded-2xl ${t.type === 'income' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                        {t.type === 'income' ? <ArrowUpCircle className="w-5 h-5" /> : <ArrowDownCircle className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-bold text-gray-900">{t.reason}</p>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                            {t.category}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5">{t.sourceOrDestination}</p>
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

          <div className="bg-white p-6 rounded-3xl shadow-sm relative">
            <h2 className="text-lg font-bold mb-6 text-gray-800 flex items-center">
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
                  <p className="text-lg font-bold text-gray-800">{formatMoney(totalExpense)} ₸</p>
                </div>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-gray-400">
                <PieChartIcon className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm font-medium">Шығыс жоқ</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Floating Action Button (FAB) */}
      {!isFormOpen && (
        <button 
          onClick={() => {
            setIsFormOpen(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="md:hidden fixed bottom-6 right-6 bg-black text-white p-4 rounded-full shadow-2xl z-50 transition-transform active:scale-95"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
