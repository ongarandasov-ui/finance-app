const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf-8');

// 1. Calculate accountBalances
code = code.replace(
  /const balance = totalIncome - totalExpense;/,
  `const balance = totalIncome - totalExpense;\n\n  const accountBalances = ACCOUNTS.map(acc => {\n    const accTransactions = transactions.filter(t => t.account === acc || (!t.account && acc === "Kaspi Gold"));\n    const inc = accTransactions.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0);\n    const exp = accTransactions.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);\n    return { account: acc, balance: inc - exp };\n  }).filter(a => a.balance !== 0);`
);

// 2. Display Account Balances in Header (find balance UI)
const balanceUI = `
                <p className="text-2xl font-bold tracking-tight">{formatMoney(balance)} ₸</p>
                {accountBalances.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {accountBalances.map(a => (
                      <div key={a.account} className="bg-white/20 px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm shadow-sm border border-white/10">
                        {a.account}: {formatMoney(a.balance)} ₸
                      </div>
                    ))}
                  </div>
                )}
`;
code = code.replace(
  /<p className="text-2xl font-bold tracking-tight">{formatMoney\(balance\)} ₸<\/p>/,
  balanceUI
);

// 3. Add account dropdown to the form
const accountSelector = `
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Шот</label>
              <select 
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="w-full bg-gray-50 dark:bg-black border-0 p-4 rounded-2xl outline-none font-medium mt-1 focus:ring-2 focus:ring-black"
              >
                {ACCOUNTS.map(acc => (
                  <option key={acc} value={acc}>{acc}</option>
                ))}
              </select>
            </div>
`;
code = code.replace(
  /<div className="grid grid-cols-2 gap-4">/,
  `${accountSelector}\n            <div className="grid grid-cols-2 gap-4 mt-4">`
);

fs.writeFileSync('src/app/page.tsx', code);
