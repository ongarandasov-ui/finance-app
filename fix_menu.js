const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf-8');

// 1. Add MoreVertical to lucide-react imports
code = code.replace(/Sun\n\} from "lucide-react";/, 'Sun,\n  MoreVertical,\n  Smartphone\n} from "lucide-react";');

// 2. Add states for menu and install prompt
const statesInjection = `
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        }
        setDeferredPrompt(null);
      });
    }
  };

  const handleExcelClick = () => {
    document.getElementById('excel-upload')?.click();
    setIsMenuOpen(false);
  };
`;
// Insert after `const [isDarkMode, setIsDarkMode] = useState(false);`
code = code.replace(/const \[isDarkMode, setIsDarkMode\] = useState\(false\);/, 'const [isDarkMode, setIsDarkMode] = useState(false);' + statesInjection);

// 3. Replace the right-side buttons with the 3-dot menu and Dropdown
const rightSideRegex = /<div className="flex items-center justify-end w-full sm:w-auto gap-2">[\s\S]*?<button \n\s*onClick=\{\(\) => signOut\(auth\)\}[\s\S]*?<\/button>\n\s*<\/div>/;
const newRightSide = `<div className="flex items-center justify-end w-full sm:w-auto gap-2">
            <button 
              onClick={() => setIsFormOpen(!isFormOpen)}
              className="bg-black hover:bg-gray-800 dark:hover:bg-gray-200 text-white p-3 rounded-full shadow-md transition-transform hover:scale-105"
            >
              {isFormOpen && !editingId ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
            </button>

            <div className="relative">
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="bg-gray-100 dark:bg-[#2C2C2E] hover:bg-gray-200 dark:hover:bg-[#3C3C3E] text-gray-600 dark:text-gray-300 p-3 rounded-full transition-transform"
              >
                <MoreVertical className="w-6 h-6" />
              </button>
              
              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#1C1C1E] border border-gray-100 dark:border-gray-800 rounded-2xl shadow-xl z-50 overflow-hidden py-2">
                  <div className="flex flex-col">
                    <input type="file" accept=".xlsx, .xls, .pdf" className="hidden" id="excel-upload" onChange={handleFileUpload} />
                    <button onClick={handleExcelClick} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium text-left w-full text-gray-700 dark:text-gray-200 transition-colors">
                      <Download className="w-5 h-5 text-green-500 rotate-180" />
                      Excel-ден жүктеу
                    </button>
                    
                    <button onClick={() => { setIsDarkMode(!isDarkMode); setIsMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium text-left w-full text-gray-700 dark:text-gray-200 transition-colors">
                      {isDarkMode ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-gray-500" />}
                      {isDarkMode ? "Күндізгі режим" : "Түнгі режим"}
                    </button>

                    {deferredPrompt && (
                      <button onClick={() => { handleInstallClick(); setIsMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium text-left w-full text-blue-600 dark:text-blue-400 transition-colors">
                        <Smartphone className="w-5 h-5" />
                        Телефонға орнату
                      </button>
                    )}

                    <div className="h-px bg-gray-100 dark:bg-gray-800 my-1"></div>
                    
                    <button onClick={() => { signOut(auth); setIsMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium text-left w-full text-red-500 transition-colors">
                      <LogOut className="w-5 h-5" />
                      Жүйеден шығу
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>`;

code = code.replace(rightSideRegex, newRightSide);

fs.writeFileSync('src/app/page.tsx', code);
