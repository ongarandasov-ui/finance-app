const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf-8');

// 1. Replace <header> container
code = code.replace(
  /<header className="flex justify-between items-center bg-white dark:bg-\[#1C1C1E\] dark:border dark:border-gray-800 p-4 rounded-3xl shadow-sm">/,
  '<header className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white dark:bg-[#1C1C1E] dark:border dark:border-gray-800 p-4 rounded-3xl shadow-sm gap-4">'
);

// 2. Adjust left side (profile) container
code = code.replace(
  /<div className="flex items-center gap-3 px-2">/,
  '<div className="flex items-center gap-3 w-full sm:w-auto">'
);

// 3. Remove truncate from name, let it wrap if needed, adjust div to take flex-1 min-w-0
code = code.replace(
  /<div>\s*<h1 className="text-base sm:text-lg font-bold tracking-tight text-gray-900 dark:text-white leading-tight flex items-center gap-2 flex-wrap">/,
  '<div className="flex-1 min-w-0">\n              <h1 className="text-base sm:text-lg font-bold tracking-tight text-gray-900 dark:text-white leading-tight flex items-center gap-2 flex-wrap">'
);
code = code.replace(
  /<span className="truncate max-w-\[100px\] sm:max-w-none">\{user\.displayName \|\| "Қолданушы"\}<\/span>/,
  '<span className="break-words whitespace-normal">{user.displayName || "Қолданушы"}</span>'
);
code = code.replace(
  /<p className="text-xs text-gray-400 truncate max-w-\[120px\] sm:max-w-\[200px\]">\{user\.email\}<\/p>/,
  '<p className="text-xs text-gray-400 truncate">{user.email}</p>'
);

// 4. Adjust right side (buttons) container to be right aligned on mobile
code = code.replace(
  /<div className="flex items-center gap-1 sm:gap-2">/,
  '<div className="flex items-center justify-end w-full sm:w-auto gap-2">'
);

// 5. Restore paddings on buttons since we now have a dedicated row for them on mobile, so they have more space
code = code.replace(/p-2\.5 sm:p-3/g, 'p-3');

fs.writeFileSync('src/app/page.tsx', code);
