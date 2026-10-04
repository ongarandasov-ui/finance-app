const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf-8');

const excelLogic = `
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    try {
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
`;

code = code.replace(/const handleSignIn = async \(\) => {/, excelLogic + '\n  const handleSignIn = async () => {');

// Add upload button UI in the header
const headerUI = `
          <div className="flex items-center gap-2">
            <label className="bg-green-500 hover:bg-green-600 text-white p-3 rounded-full cursor-pointer transition-transform shadow-md" title="Excel жүктеу (Kaspi)">
              <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleFileUpload} />
              <Download className="w-5 h-5 rotate-180" />
            </label>
`;

code = code.replace(/          <div className="flex items-center gap-2">/, headerUI);

fs.writeFileSync('src/app/page.tsx', code);
