import React from 'react';

const Logo = ({ className = '', size = 'md' }) => {
  const sizes = {
    sm: { box: 'w-6 h-6 rounded-lg', icon: 'w-3.5 h-3.5', text: 'text-base' },
    md: { box: 'w-7 h-7 rounded-xl', icon: 'w-4 h-4', text: 'text-xl' },
    lg: { box: 'w-9 h-9 rounded-2xl', icon: 'w-5 h-5', text: 'text-2xl' },
  };
  const sc = sizes[size] || sizes.md;

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Icon portion: Yellow box + Lightning Bolt */}
      <div 
        className={`${sc.box} flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(255,215,0,0.4)]`}
        style={{ background: '#ffd700' }}
      >
        <svg 
          className={sc.icon} 
          viewBox="0 0 24 24" 
          fill="#050505"
        >
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      </div>

      {/* Text portion: Bold White */}
      <span 
        className={`${sc.text} font-bold text-white tracking-tight`}
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        Botify
      </span>
    </div>
  );
};

export default Logo;
