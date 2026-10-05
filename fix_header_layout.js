const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf-8');

// 1. Change header flex layout to be fully inline
code = code.replace(
  /<header className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white dark:bg-\[#1C1C1E\] dark:border dark:border-gray-800 p-4 rounded-3xl shadow-sm gap-4">/,
  '<header className="flex justify-between items-center bg-white dark:bg-[#1C1C1E] dark:border dark:border-gray-800 p-4 rounded-3xl shadow-sm">'
);

// 2. Remove the "Plus" button from the header (the one right before <div className="relative"> for the 3-dots)
const plusButtonRegex = /<button \n\s*onClick=\{\(\) => setIsFormOpen\(!isFormOpen\)\}\n\s*className="bg-black hover:bg-gray-800 dark:hover:bg-gray-200 text-white p-3 rounded-full shadow-md transition-transform hover:scale-105"\n\s*>\n\s*\{isFormOpen && !editingId \? <X className="w-6 h-6" \/> : <Plus className="w-6 h-6" \/>\}\n\s*<\/button>/;
code = code.replace(plusButtonRegex, '');

// 3. Make the 3-dot button flex container just gap-2, w-auto, without justify-end w-full sm:w-auto
code = code.replace(
  /<div className="flex items-center justify-end w-full sm:w-auto gap-2">/,
  '<div className="flex items-center gap-2">'
);

// 4. Remove `md:hidden` from the FAB so it always shows
code = code.replace(
  /className="md:hidden fixed bottom-6 right-6 bg-black dark:bg-white text-white dark:text-black w-14 h-14 rounded-full flex items-center justify-center shadow-2xl z-40 transition-transform hover:scale-105"/,
  'className="fixed bottom-6 right-6 bg-black dark:bg-white text-white dark:text-black w-14 h-14 rounded-full flex items-center justify-center shadow-2xl z-40 transition-transform hover:scale-105"'
);

fs.writeFileSync('src/app/page.tsx', code);
