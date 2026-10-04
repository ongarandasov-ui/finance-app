const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf-8');

code = code.replace(
  /const data = await file\.arrayBuffer\(\);/,
  `if (file.name.toLowerCase().endsWith('.pdf')) {
        alert("PDF файлдарын оқу әзірге қиындық тудырады. Kaspi қосымшасынан 'Excel' форматында жүктеп алуыңызды сұраймыз.");
        return;
      }
      const data = await file.arrayBuffer();`
);

code = code.replace(
  /accept="\.xlsx, \.xls"/,
  `accept=".xlsx, .xls, .pdf"`
);

fs.writeFileSync('src/app/page.tsx', code);
