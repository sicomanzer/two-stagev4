import type {Metadata} from 'next';
import './globals.css'; // Global styles
import FloatingChatbot from '@/components/layout/FloatingChatbot';

export const metadata: Metadata = {
  title: 'VI Stock Analyzer — Two-Stage DDM Calculator',
  description: 'เครื่องมือวิเคราะห์หุ้นสำหรับนักลงทุน Value Investing — DDM, Graham Number, Stock Scorecard, PE/PBV Band, Trend Analysis',
  icons: {
    icon: '/icon.svg',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              // Setup MutationObserver to continuously strip 'bis_skin_checked' attribute
              // before React hydrates, preventing the mismatch error completely.
              const observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                  if (mutation.type === 'attributes' && mutation.attributeName === 'bis_skin_checked') {
                    mutation.target.removeAttribute('bis_skin_checked');
                  }
                  if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(function(node) {
                      if (node.nodeType === 1 && node.hasAttribute && node.hasAttribute('bis_skin_checked')) {
                        node.removeAttribute('bis_skin_checked');
                      }
                    });
                  }
                });
              });
              
              observer.observe(document.documentElement, {
                attributes: true,
                childList: true,
                subtree: true,
                attributeFilter: ['bis_skin_checked']
              });

              // Initial cleanup just in case
              document.querySelectorAll('[bis_skin_checked]').forEach(function(el) {
                el.removeAttribute('bis_skin_checked');
              });
            } catch (e) {
              // Ignore errors during patching
            }
          })();
        ` }} />
        {children}
        <FloatingChatbot />
      </body>
    </html>
  );
}
