const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf-8');

// Replace standard colors with dark variants
code = code.replace(/bg-gray-50/g, 'bg-gray-50 dark:bg-black');
code = code.replace(/bg-white/g, 'bg-white dark:bg-[#1C1C1E] dark:border dark:border-gray-800');
code = code.replace(/text-gray-900/g, 'text-gray-900 dark:text-white');
code = code.replace(/text-gray-800/g, 'text-gray-800 dark:text-gray-200');
code = code.replace(/text-gray-700/g, 'text-gray-700 dark:text-gray-300');
code = code.replace(/text-black/g, 'text-black dark:text-white');
// Buttons that are black in light mode should be white in dark mode?
// Or maybe just dark gray.
code = code.replace(/bg-black text-white/g, 'bg-black text-white dark:bg-white dark:text-black');
code = code.replace(/hover:bg-gray-800/g, 'hover:bg-gray-800 dark:hover:bg-gray-200');

// Header background 
code = code.replace(/bg-white/g, 'bg-white'); // already done

fs.writeFileSync('src/app/page.tsx', code);
