const fs = require('fs');
let code = fs.readFileSync('src/app/layout.tsx', 'utf-8');

const swScript = `
        <script
          dangerouslySetInnerHTML={{
            __html: \`
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(registration) {
                    console.log('ServiceWorker registration successful');
                  }, function(err) {
                    console.log('ServiceWorker registration failed: ', err);
                  });
                });
              }
            \`
          }}
        />
        {children}
`;

code = code.replace(/\{children\}/, swScript);
fs.writeFileSync('src/app/layout.tsx', code);
