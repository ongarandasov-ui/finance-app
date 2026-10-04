const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf-8');

// 1. Remove Account Balance UI
code = code.replace(
  /                {accountBalances\.length > 0 && \([\s\S]*?<\/div>\n                \)}/,
  ""
);

// 2. Remove Account Dropdown UI
const dropdownRegex = /              <div>\n                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Шот<\/label>\n                <select[\s\S]*?<\/select>\n              <\/div>\n\n/;
code = code.replace(dropdownRegex, "");

// 3. Remove Account Tags from Transaction list
const tagsRegex = /                          {t\.account && \([\s\S]*?<\/span>\n                          \)}/;
code = code.replace(tagsRegex, "");

fs.writeFileSync('src/app/page.tsx', code);
