const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf-8');

code = code.replace(
  /const handleAddGoal = async \(e: React.FormEvent\) => {([\s\S]*?)setIsGoalFormOpen\(false\);/m,
  `const handleAddGoal = async (e: React.FormEvent) => {\n    e.preventDefault();\n    if (!user) return;\n    try {\n      await addDoc(collection(db, "goals"), {\n        name: goalName,\n        targetAmount: Number(goalTarget.replace(/\\D/g, "")),\n        currentAmount: Number(goalCurrent.replace(/\\D/g, "") || 0),\n        userId: user.uid\n      });\n      setIsGoalFormOpen(false);`
);

code = code.replace(
  /const handleAddBudget = async \(e: React.FormEvent\) => {([\s\S]*?)setIsBudgetFormOpen\(false\);/m,
  `const handleAddBudget = async (e: React.FormEvent) => {\n    e.preventDefault();\n    if (!user) return;\n    try {\n      await addDoc(collection(db, "budgets"), {\n        category: budgetCategory,\n        limitAmount: Number(budgetLimit.replace(/\\D/g, "")),\n        userId: user.uid\n      });\n      setIsBudgetFormOpen(false);`
);

code = code.replace(
  /const handleAddSubscription = async \(e: React.FormEvent\) => {([\s\S]*?)setIsSubFormOpen\(false\);/m,
  `const handleAddSubscription = async (e: React.FormEvent) => {\n    e.preventDefault();\n    if (!user) return;\n    try {\n      await addDoc(collection(db, "subscriptions"), {\n        name: subName,\n        amount: Number(subAmount.replace(/\\D/g, "")),\n        category: subCategory,\n        userId: user.uid\n      });\n      setIsSubFormOpen(false);`
);

// Add catch blocks
code = code.replace(/setGoalCurrent\("");\n  };/g, 'setGoalCurrent("");\n    } catch (err: any) { alert("Қателік: " + err.message); console.error(err); }\n  };');
code = code.replace(/setBudgetLimit\("");\n  };/g, 'setBudgetLimit("");\n    } catch (err: any) { alert("Қателік: " + err.message); console.error(err); }\n  };');
code = code.replace(/setSubAmount\("");\n  };/g, 'setSubAmount("");\n    } catch (err: any) { alert("Қателік: " + err.message); console.error(err); }\n  };');

fs.writeFileSync('src/app/page.tsx', code);
