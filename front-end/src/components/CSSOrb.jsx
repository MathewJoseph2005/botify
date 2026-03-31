import { memo } from 'react';

/**
 * Pure-CSS animated orb — visually equivalent to the Three.js FluidOrb
 * but uses ZERO WebGL contexts, zero GPU overdraw, and never crashes.
 *
 * Props:
 *   size   – width/height in px (default 540)
 *   className – extra classes for the outer wrapper
 */
const CSSOrb = memo(({ size = 540, className = '' }) => {
  const s = size;
  return (
    <div
      className={`relative pointer-events-none ${className}`}
      style={{ width: s, height: s }}
    >
      <style>{`
        @keyframes orb-rotate   { to { transform: rotate(360deg); } }
        @keyframes orb-morph    {
          0%,100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
          25%  { border-radius: 30% 60% 70% 40% / 50% 60% 40% 60%; }
          50%  { border-radius: 50% 60% 30% 60% / 30% 40% 70% 50%; }
          75%  { border-radius: 70% 30% 60% 40% / 40% 70% 30% 60%; }
        }
        @keyframes orb-pulse {
          0%,100% { opacity: 0.85; transform: scale(1); }
          50%      { opacity: 1;    transform: scale(1.04); }
        }
        @keyframes orb-shimmer {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>

      {/* Outer ambient halo */}
      <div style={{
        position: 'absolute',
        inset: '-15%',
        borderRadius: '50%',
        background: 'radial-gradient(ellipse at 50% 50%, rgba(255,215,0,0.07) 0%, rgba(92,32,98,0.05) 50%, transparent 75%)',
        filter: 'blur(24px)',
        animation: 'orb-pulse 6s ease-in-out infinite',
      }} />

      {/* Rotating conic gradient ring */}
      <div style={{
        position: 'absolute',
        inset: 0,
        borderRadius: '50%',
        background: 'conic-gradient(from 0deg, rgba(255,215,0,0.15) 0%, rgba(92,32,98,0.2) 30%, rgba(48,39,45,0.1) 60%, rgba(255,215,0,0.15) 100%)',
        animation: 'orb-rotate 12s linear infinite',
        opacity: 0.6,
      }} />

      {/* Main morphing orb body */}
      <div style={{
        position: 'absolute',
        inset: '8%',
        background: 'radial-gradient(ellipse at 38% 35%, rgba(255,230,80,0.18) 0%, rgba(92,32,98,0.35) 35%, rgba(30,25,35,0.9) 65%, rgba(15,12,18,0.98) 85%)',
        backgroundSize: '200% 200%',
        animation: 'orb-morph 8s ease-in-out infinite, orb-shimmer 10s ease infinite, orb-pulse 6s ease-in-out infinite',
        boxShadow: [
          'inset 0 0 60px rgba(255,215,0,0.08)',
          'inset 0 0 120px rgba(92,32,98,0.15)',
          '0 0 80px rgba(255,215,0,0.06)',
          '0 0 160px rgba(92,32,98,0.08)',
        ].join(', '),
        border: '1px solid rgba(255,215,0,0.12)',
      }} />

      {/* Inner highlight gleam */}
      <div style={{
        position: 'absolute',
        top: '18%',
        left: '22%',
        width: '30%',
        height: '22%',
        borderRadius: '50%',
        background: 'radial-gradient(ellipse at 50% 50%, rgba(255,240,120,0.22) 0%, transparent 70%)',
        filter: 'blur(8px)',
        animation: 'orb-pulse 4s ease-in-out infinite 1s',
      }} />
    </div>
  );
});

CSSOrb.displayName = 'CSSOrb';
export default CSSOrb;
