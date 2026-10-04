const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf-8');

// 1. Add account to Transaction
code = code.replace(
  /category: string;\n  userId\?: string;\n}/,
  'category: string;\n  userId?: string;\n  account?: string;\n}'
);

// 2. Add Debt interface and Accounts constant
code = code.replace(
  /const INCOME_SOURCES = \[/,
  `interface Debt {\n  id: string;\n  type: "i_owe" | "owes_me";\n  personName: string;\n  amount: number;\n  isPaid: boolean;\n  userId?: string;\n}\n\nconst ACCOUNTS = ["Kaspi Gold", "Қолма-қол", "Halyk Bank", "Депозит", "Басқа"];\n\nconst INCOME_SOURCES = [`
);

// 3. Add Debt states and selectedAccount state
code = code.replace(
  /const \[type, setType\] = useState<TransactionType>\("expense"\);/,
  `// Debt States\n  const [debts, setDebts] = useState<Debt[]>([]);\n  const [isDebtFormOpen, setIsDebtFormOpen] = useState(false);\n  const [debtType, setDebtType] = useState<"i_owe" | "owes_me">("owes_me");\n  const [debtPerson, setDebtPerson] = useState("");\n  const [debtAmount, setDebtAmount] = useState("");\n\n  const [selectedAccount, setSelectedAccount] = useState(ACCOUNTS[0]);\n\n  const [type, setType] = useState<TransactionType>("expense");`
);

fs.writeFileSync('src/app/page.tsx', code);
