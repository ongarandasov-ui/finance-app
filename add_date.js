const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf-8');

// Date Formatter
const dateReplacer = `
  const kazakhMonths = ["қаңтар", "ақпан", "наурыз", "сәуір", "мамыр", "маусым", "шілде", "тамыз", "қыркүйек", "қазан", "қараша", "желтоқсан"];
  const d = new Date();
  const dateString = \`\${d.getDate()} \${kazakhMonths[d.getMonth()]}\`;
`;

// Insert it right before return
code = code.replace(/  return \(\n    <div className="min-h-screen/, dateReplacer + '\n  return (\n    <div className="min-h-screen');

// Inject into Header
const headerInjection = `              <h1 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white leading-tight flex items-center gap-2">
                <span>{user.displayName || "Қолданушы"}</span>
                <span suppressHydrationWarning className="text-[10px] font-medium text-gray-400 bg-gray-100 dark:bg-[#2C2C2E] px-2 py-0.5 rounded-full tracking-wide">
                  {dateString}
                </span>
              </h1>`;

code = code.replace(/              <h1 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white leading-tight">\n                \{user\.displayName \|\| "Қолданушы"\}\n              <\/h1>/, headerInjection);

fs.writeFileSync('src/app/page.tsx', code);
