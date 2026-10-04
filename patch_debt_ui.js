const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf-8');

const debtWidget = `
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
                        <p className={\`text-xs font-bold \${d.type === 'i_owe' ? 'text-red-500' : 'text-green-500'}\`}>
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
`;
code = code.replace(
  /          <\/div>\n        <\/div>\n      <\/div>\n\n      {\/\* Goal Modal \*\/}/,
  `${debtWidget}\n          </div>\n        </div>\n      </div>\n\n      {/* Goal Modal */}`
);

const debtModal = `
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
                <button type="button" onClick={() => setDebtType("owes_me")} className={\`flex-1 py-3 rounded-2xl font-bold text-sm transition \${debtType === "owes_me" ? "bg-green-500 text-white" : "bg-gray-100 text-gray-400"}\`}>Маған қарыз</button>
                <button type="button" onClick={() => setDebtType("i_owe")} className={\`flex-1 py-3 rounded-2xl font-bold text-sm transition \${debtType === "i_owe" ? "bg-red-500 text-white" : "bg-gray-100 text-gray-400"}\`}>Мен қарызбын</button>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Сомасы (₸)</label>
                <input required type="text" inputMode="numeric" value={debtAmount} onChange={e => setDebtAmount(formatMoney(e.target.value.replace(/\\D/g, "")))} placeholder="10 000" className="w-full bg-gray-50 dark:bg-black border-0 p-4 rounded-2xl outline-none font-bold focus:ring-2 focus:ring-black" />
              </div>
              <button type="submit" className="w-full bg-black text-white dark:bg-white dark:text-black font-bold py-4 rounded-2xl mt-4 shadow-md hover:bg-gray-800 dark:hover:bg-gray-200 transition">Сақтау</button>
            </form>
          </div>
        </div>
      )}
`;

code = code.replace(
  /      {\/\* Mobile Floating Action Button \(FAB\) \*\/}/,
  `${debtModal}\n      {/* Mobile Floating Action Button (FAB) */}`
);

fs.writeFileSync('src/app/page.tsx', code);
