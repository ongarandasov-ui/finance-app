const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf-8');

code = code.replace(
  /\{editingId && \(\n\s*<button \n\s*onClick=\{handleCloseForm\}\n\s*className="absolute top-4 right-4 p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 transition"\n\s*>\n\s*<X className="w-4 h-4" \/>\n\s*<\/button>\n\s*\)\}/,
  `<button 
                onClick={handleCloseForm}
                className="absolute top-4 right-4 p-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-500 transition"
              >
                <X className="w-4 h-4" />
              </button>`
);

fs.writeFileSync('src/app/page.tsx', code);
