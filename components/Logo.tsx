
import React from 'react';

const Logo: React.FC<{ className?: string; size?: 'sm' | 'md' | 'lg' }> = ({ className = '', size = 'md' }) => {
  const iconSizes = {
    sm: 'h-6 w-6',
    md: 'h-10 w-10',
    lg: 'h-24 w-24'
  };

  const textSizes = {
    sm: 'text-xl',
    md: 'text-3xl',
    lg: 'text-6xl'
  };

  return (
    <div className={`flex items-center gap-4 select-none ${className}`}>
      <div className={`${iconSizes[size]} relative flex items-center justify-center transition-transform hover:rotate-[15deg] duration-500`}>
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_4px_10px_rgba(59,130,246,0.3)]">
          <defs>
            <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#3b82f6', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#1d4ed8', stopOpacity: 1 }} />
            </linearGradient>
          </defs>
          <path d="M50 0L61.7 38.3L100 50L61.7 61.7L50 100L38.3 61.7L0 50L38.3 38.3Z" fill="url(#logoGrad)" />
          <path d="M50 20L56.5 43.5L80 50L56.5 56.5L50 80L43.5 56.5L20 50L43.5 43.5Z" fill="white" fillOpacity="0.9" />
        </svg>
      </div>
      <span className={`${textSizes[size]} font-extrabold text-[#1a2b4b] tracking-tighter`}>admire</span>
    </div>
  );
};

export default Logo;
