const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf-8');

const overlay = `
              {isMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)}></div>
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#1C1C1E] border border-gray-100 dark:border-gray-800 rounded-2xl shadow-xl z-50 overflow-hidden py-2">
`;

code = code.replace(/\{isMenuOpen && \(\n\s*<div className="absolute right-0 mt-2 w-56 bg-white dark:bg-\[#1C1C1E\] border border-gray-100 dark:border-gray-800 rounded-2xl shadow-xl z-50 overflow-hidden py-2">/, overlay);

code = code.replace(/<\/div>\n\s*<\/div>\n\s*\)\}/, '</div>\n                </div>\n                </>\n              )}');

fs.writeFileSync('src/app/page.tsx', code);
