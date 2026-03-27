import React from 'react';

export default function GlassCard({ children, className = '' }) {
  return (
    <div className={`bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl shadow-2xl ${className}`}>
      {children}
    </div>
  );
}
