const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf-8');

code = code.replace(
  /className="md:hidden fixed bottom-6 right-6 bg-black text-white dark:bg-white dark:text-black p-4 rounded-full shadow-2xl z-50 transition-transform active:scale-95"/,
  'className="fixed bottom-6 right-6 bg-black text-white dark:bg-white dark:text-black p-4 rounded-full shadow-2xl z-50 transition-transform active:scale-95 hover:scale-105"'
);

// We need to allow the FAB to be an X if the form is open! Wait, the FAB has `{!isFormOpen && (` wrapper.
// So if the form is open, the FAB disappears. The user clicks "Cancel" inside the form to close it. That's perfectly fine.

fs.writeFileSync('src/app/page.tsx', code);
