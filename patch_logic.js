const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf-8');

// 1. Add fetching logic for debts
code = code.replace(
  /const unsubSubs = onSnapshot\(qSubs, \(snapshot\) => {[\s\S]*?}\);/,
  `const unsubSubs = onSnapshot(qSubs, (snapshot) => {\n      setSubscriptions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subscription)));\n    });\n\n    const qDebts = query(\n      collection(db, "debts"),\n      where("userId", "==", user.uid)\n    );\n    const unsubDebts = onSnapshot(qDebts, (snapshot) => {\n      setDebts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Debt)));\n    });`
);

code = code.replace(
  /unsubSubs\(\);\n    };\n  }, \[user\]\);/,
  `unsubSubs();\n      unsubDebts();\n    };\n  }, [user]);`
);

// 2. Add selectedAccount to transaction creation
code = code.replace(
  /category: category,\n        date: new Date\(\).toISOString\(\),\n        userId: user.uid\n      }\);/,
  `category: category,\n        date: new Date().toISOString(),\n        userId: user.uid,\n        account: selectedAccount\n      });`
);
code = code.replace(
  /category: category,\n          userId: user.uid\n        }\);/,
  `category: category,\n          userId: user.uid,\n          account: selectedAccount\n        });`
);

// 3. Add Debt logic functions
const debtFunctions = `
  const handleAddDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await addDoc(collection(db, "debts"), {
        type: debtType,
        personName: debtPerson,
        amount: Number(debtAmount.replace(/\\D/g, "")),
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
`;
code = code.replace(/const handlePaySubscription = async/, debtFunctions + '\n  const handlePaySubscription = async');

fs.writeFileSync('src/app/page.tsx', code);
