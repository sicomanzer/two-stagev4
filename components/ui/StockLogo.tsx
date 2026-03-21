import React, { useState } from 'react';

export default function StockLogo({ ticker, size = 'md' }: { ticker: string, size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const [errorIndex, setErrorIndex] = useState(0);
  const cleanTicker = ticker.replace('.BK', '').trim();

  // Try multiple known public sources for Thai stock logos gracefully
  const logoUrls = [
    `/api/logo?ticker=${cleanTicker}`,
    `https://jitta.com/images/stock/TH/${cleanTicker}.png`,
    `https://s3-symbol-logo.tradingview.com/${cleanTicker.toLowerCase()}--big.svg`,
    `https://logo.clearbit.com/${cleanTicker.toLowerCase()}.co.th`,
    `https://logo.clearbit.com/${cleanTicker.toLowerCase()}.com`
  ];

  const sizeClasses = {
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-8 h-8 text-sm',
    lg: 'w-12 h-12 text-xl',
    xl: 'w-16 h-16 text-3xl' // greatly increased text size for xl
  };

  // Generate a consistent colorful gradient based on the first letter
  const charCode = cleanTicker.charCodeAt(0) || 65;
  const gradients = [
    'from-blue-500 to-indigo-600',
    'from-emerald-500 to-teal-600',
    'from-orange-500 to-red-600',
    'from-purple-500 to-pink-600',
    'from-cyan-500 to-blue-600',
  ];
  const selectedGradient = gradients[charCode % gradients.length];

  if (errorIndex >= logoUrls.length) {
     return (
       <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br ${selectedGradient} text-white flex items-center justify-center font-black shadow-md flex-shrink-0`}>
         {cleanTicker.charAt(0).toUpperCase()}
       </div>
     );
  }

  return (
    <div className={`${sizeClasses[size]} bg-white border border-slate-100 rounded-full shadow-sm flex items-center justify-center flex-shrink-0 overflow-hidden`}>
      <img
        src={logoUrls[errorIndex]}
        alt={cleanTicker}
        className="w-full h-full object-contain scale-[1.35] transition-transform duration-300 hover:scale-[1.5]"
        onError={() => setErrorIndex(prev => prev + 1)}
      />
    </div>
  );
}
