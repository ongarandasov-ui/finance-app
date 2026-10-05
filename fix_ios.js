const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf-8');

const updatedInstallClick = `
  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        }
        setDeferredPrompt(null);
      });
    } else {
      // Check if iOS
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      if (isIOS) {
        alert("Орнату үшін: браузердің астындағы 'Бөлісу' (Share) батырмасын басып, 'На экран Домой' (Add to Home Screen) таңдаңыз.");
      } else {
        alert("Браузер мәзірінен 'Установить приложение' (Install App) батырмасын басыңыз.");
      }
    }
  };
`;

code = code.replace(/const handleInstallClick = \(\) => \{[\s\S]*?setDeferredPrompt\(null\);\n\s*\}\);\n\s*\}\n\s*\};/, updatedInstallClick);

// Change the condition to always render the install button
code = code.replace(/\{deferredPrompt && \(\n\s*<button onClick=\{\(\) => \{ handleInstallClick\(\); setIsMenuOpen\(false\); \}\} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium text-left w-full text-blue-600 dark:text-blue-400 transition-colors">\n\s*<Smartphone className="w-5 h-5" \/>\n\s*Телефонға орнату\n\s*<\/button>\n\s*\)\}/, 
  `<button onClick={() => { handleInstallClick(); setIsMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium text-left w-full text-blue-600 dark:text-blue-400 transition-colors">
     <Smartphone className="w-5 h-5" />
     Телефонға орнату
   </button>`
);

fs.writeFileSync('src/app/page.tsx', code);
