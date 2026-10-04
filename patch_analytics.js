const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf-8');

// We need to parse previous month
// date-fns provides subMonths, let's just use native date or date-fns
const analyticsLogic = `
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
      analyticsMessage = \`Ақылды кеңес: Сіз бұл айда өткен айға қарағанда \${percent}% (\${formatMoney(diff)} ₸) көп жұмсадыңыз. Үнемдеуге тырысыңыз!\`;
      analyticsColor = "text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 border border-red-100 dark:border-red-900/50";
    } else if (diff < 0) {
      analyticsMessage = \`Керемет! Сіз бұл айда өткен айға қарағанда \${percent}% (\${formatMoney(Math.abs(diff))} ₸) аз жұмсадыңыз.\`;
      analyticsColor = "text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400 border border-green-100 dark:border-green-900/50";
    } else {
      analyticsMessage = \`Сіздің шығындарыңыз өткен аймен бірдей.\`;
    }
  }
`;

code = code.replace(/const balance = totalIncome - totalExpense;/, analyticsLogic);

const analyticsUI = `
                {accountBalances.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {accountBalances.map(a => (
                      <div key={a.account} className="bg-white/20 px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm shadow-sm border border-white/10">
                        {a.account}: {formatMoney(a.balance)} ₸
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {analyticsMessage && (
                <div className={\`mt-4 p-3 rounded-2xl text-xs font-bold leading-5 \${analyticsColor}\`}>
                  💡 {analyticsMessage}
                </div>
              )}
`;

code = code.replace(
  /                {accountBalances\.length > 0 && \([\s\S]*?<\/div>\n                \)}\n              <\/div>/,
  analyticsUI
);

fs.writeFileSync('src/app/page.tsx', code);
