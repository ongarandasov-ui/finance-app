const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf-8');

// Replace left side
code = code.replace(
  /<h1 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white leading-tight flex items-center gap-2">/,
  '<h1 className="text-base sm:text-lg font-bold tracking-tight text-gray-900 dark:text-white leading-tight flex items-center gap-2 flex-wrap">'
);
code = code.replace(
  /<span>\{user\.displayName \|\| "Қолданушы"\}<\/span>/,
  '<span className="truncate max-w-[100px] sm:max-w-none">{user.displayName || "Қолданушы"}</span>'
);
code = code.replace(
  /<span suppressHydrationWarning className="text-\[10px\] font-medium text-gray-400 bg-gray-100 dark:bg-\[#2C2C2E\] px-2 py-0\.5 rounded-full tracking-wide">/,
  '<span suppressHydrationWarning className="text-[10px] font-medium text-gray-400 bg-gray-100 dark:bg-[#2C2C2E] px-2 py-0.5 rounded-full tracking-wide whitespace-nowrap">'
);
code = code.replace(
  /<p className="text-xs text-gray-400 truncate max-w-\[200px\]">\{user\.email\}<\/p>/,
  '<p className="text-xs text-gray-400 truncate max-w-[120px] sm:max-w-[200px]">{user.email}</p>'
);

// Replace right side
code = code.replace(
  /<div className="flex items-center gap-2">/,
  '<div className="flex items-center gap-1 sm:gap-2">'
);
code = code.replace(
  /<label className="bg-green-500 hover:bg-green-600 text-white p-3 rounded-full cursor-pointer transition-transform shadow-md" title="Excel жүктеу \(Kaspi\)">/,
  '<label className="bg-green-500 hover:bg-green-600 text-white p-2.5 sm:p-3 rounded-full cursor-pointer transition-transform shadow-md" title="Excel жүктеу (Kaspi)">'
);
code = code.replace(
  /<Download className="w-5 h-5 rotate-180" \/>/,
  '<Download className="w-4 h-4 sm:w-5 sm:h-5 rotate-180" />'
);
code = code.replace(
  /className="bg-gray-100 dark:bg-\[#2C2C2E\] hover:bg-gray-200 dark:hover:bg-\[#3C3C3E\] text-gray-600 dark:text-gray-300 p-3 rounded-full transition-transform"/,
  'className="bg-gray-100 dark:bg-[#2C2C2E] hover:bg-gray-200 dark:hover:bg-[#3C3C3E] text-gray-600 dark:text-gray-300 p-2.5 sm:p-3 rounded-full transition-transform"'
);
code = code.replace(
  /\{isDarkMode \? <Sun className="w-5 h-5" \/> : <Moon className="w-5 h-5" \/>\}/,
  '{isDarkMode ? <Sun className="w-4 h-4 sm:w-5 sm:h-5" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5" />}'
);
code = code.replace(
  /className="bg-red-50 dark:bg-red-900\/20 hover:bg-red-100 dark:hover:bg-red-900\/40 text-red-500 dark:text-red-400 p-3 rounded-full transition-transform"/,
  'className="bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-500 dark:text-red-400 p-2.5 sm:p-3 rounded-full transition-transform"'
);
code = code.replace(
  /<LogOut className="w-5 h-5" \/>/,
  '<LogOut className="w-4 h-4 sm:w-5 sm:h-5" />'
);

fs.writeFileSync('src/app/page.tsx', code);
