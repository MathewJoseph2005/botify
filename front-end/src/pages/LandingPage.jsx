import React, { useEffect, useRef, useState, useMemo, memo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import FluidOrb from '../components/FluidOrb';
import GlassCard from '../components/GlassCard';

const featuresList = [
  { role: 'Global', label: 'Market Reach', heading: 'Omnichannel Deployment', footer: 'WhatsApp, Telegram, Discord.' },
  { role: 'Seller', label: 'Monetization', heading: 'Developer Revenue Share', footer: 'Automated payouts via Stripe.' },
  { role: 'Buyer', label: 'Efficiency', heading: 'One-Click Bot Ignition', footer: 'Zero-code setup for buyers.' },
  { role: 'Security', label: 'Integrity', heading: 'Sandboxed Script Audit', footer: '100% verified bot source code.' },
  { role: 'Performance', label: 'Speed', heading: 'Ultra-Low Latency', footer: '< 200ms message response.' },
  { role: 'Admin', label: 'Governance', heading: 'Role-Based Command', footer: 'Full RBAC permission control.' },
  { role: 'Analytics', label: 'Insights', heading: 'Real-Time Data Streams', footer: 'Track every interaction live.' },
  { role: 'Scale', label: 'Capacity', heading: 'Infinite Session Scaling', footer: 'Run 1,000+ bots concurrently.' },
  { role: 'Support', label: 'Assistance', heading: 'AI-Powered Debugging', footer: 'Auto-healing for broken sessions.' },
  { role: 'Future', label: 'Roadmap', heading: 'Agentic AI Marketplace', footer: 'Next-gen autonomous assistants.' },
];

const doubled = [...featuresList, ...featuresList];

const Starfield = memo(() => {
  const [stars, setStars] = useState([]);
  const [shootingStars, setShootingStars] = useState([]);

  useEffect(() => {
    setStars(
      Array.from({ length: 150 }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        size: `${Math.random() * 2 + 0.5}px`,
        animationDelay: `${Math.random() * 5}s`,
        animationDuration: `${Math.random() * 4 + 2}s`,
        opacity: Math.random() * 0.5 + 0.5,
      }))
    );
    setShootingStars(
      Array.from({ length: 8 }, (_, i) => ({
        id: `s${i}`,
        left: `${Math.random() * 80 + 10}%`,
        top: `${Math.random() * 40 - 20}%`,
        animationDelay: `${Math.random() * 15}s`,
        animationDuration: `${Math.random() * 6 + 4}s`,
      }))
    );
  }, []);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-80">
      {stars.map((s) => (
        <div key={s.id} className="absolute bg-white rounded-full animate-twinkle"
          style={{
            left: s.left, top: s.top, width: s.size, height: s.size,
            opacity: s.opacity, animationDelay: s.animationDelay, animationDuration: s.animationDuration
          }} />
      ))}
      {shootingStars.map((s) => (
        <div key={s.id} className="absolute animate-shooting"
          style={{ left: s.left, top: s.top, animationDelay: s.animationDelay, animationDuration: s.animationDuration }} />
      ))}
    </div>
  );
});

const MarqueeCard = memo(({ box }) => {
  const cardRef = useRef(null);
  const [isCentered, setIsCentered] = useState(false);

  useEffect(() => {
    let raf;
    const check = () => {
      if (cardRef.current) {
        const { left, right } = cardRef.current.getBoundingClientRect();
        const center = window.innerWidth / 2;
        const zone = window.innerWidth < 768 ? 150 : 250;
        setIsCentered(left < center + zone && right > center - zone);
      }
      raf = requestAnimationFrame(check);
    };
    check();
    return () => cancelAnimationFrame(raf);
  }, []);

  const cardCls = `h-full p-6 flex flex-col justify-between hover:bg-white/[0.08] hover:border-blue-500/30 transition-all duration-500 hover:-translate-y-2 shadow-lg hover:shadow-2xl hover:shadow-blue-500/10 cursor-pointer overflow-hidden relative ${isCentered ? 'bg-white/[0.05] border-[#ffd700]/40' : 'bg-white/[0.02]'}`;

  return (
    <div ref={cardRef} className="min-w-[280px] w-[280px] sm:min-w-[320px] shrink-0 group px-3">
      <GlassCard className={cardCls}>
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="flex justify-between items-start mb-10">
          <span className={`text-[11px] font-semibold uppercase tracking-widest leading-none transition-colors duration-500 ${isCentered ? 'text-[#00ffcc]' : 'text-blue-400'}`}>{box.label}</span>
          <span className="text-[11px] font-medium text-white/50 bg-white/5 border border-white/5 px-2.5 py-1 rounded-md leading-none">{box.role}</span>
        </div>
        <div className="mb-6">
          <h3 className={`text-[19px] font-semibold transition-colors duration-500 leading-[1.2] ${isCentered ? 'text-[#ffd700] drop-shadow-[0_0_15px_rgba(255,215,0,0.6)]' : 'text-white/90 group-hover:text-white'}`}>{box.heading}</h3>
        </div>
        <div className={`pt-5 border-t transition-colors duration-500 ${isCentered ? 'border-[#ffd700]/40' : 'border-white/5 group-hover:border-blue-500/20'}`}>
          <p className={`text-[13px] transition-colors duration-500 leading-relaxed ${isCentered ? 'text-white drop-shadow-md' : 'text-white/50 group-hover:text-white/80'}`}>{box.footer}</p>
        </div>
      </GlassCard>
    </div>
  );
});

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  .navbar-glass { display: none !important; }
  html { scroll-behavior: smooth; }
  .hide-scrollbar::-webkit-scrollbar { display: none; }
  .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  @keyframes shooting-star {
    0%   { transform: rotate(135deg) translateX(0); opacity: 1; width: 0; }
    5%   { width: 140px; opacity: 1; }
    15%  { width: 0; transform: rotate(135deg) translateX(1000px); opacity: 0; }
    100% { width: 0; transform: rotate(135deg) translateX(1000px); opacity: 0; }
  }
  .animate-shooting {
    animation: shooting-star linear infinite;
    background: linear-gradient(90deg, transparent, #ffd700);
    height: 2px; border-radius: 999px;
    filter: drop-shadow(0 0 6px #ffd700);
  }
  @keyframes twinkle {
    0%, 100% { opacity: 0.1; transform: scale(0.8); }
    50% { opacity: 1; transform: scale(1.2); box-shadow: 0 0 10px 2px rgba(255,255,255,0.4); }
  }
  .animate-twinkle { animation-name: twinkle; animation-timing-function: ease-in-out; animation-iteration-count: infinite; }
  @keyframes scrollLeft {
    0%   { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  .animate-marquee { display: flex; width: max-content; animation: scrollLeft 35s linear infinite; }
  .marquee-container:hover .animate-marquee { animation-play-state: paused; }
`;

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-[#050505] overflow-x-hidden text-white antialiased selection:bg-white/20" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{STYLES}</style>

      <div className="relative min-h-[100vh]">
        <div className="absolute inset-0 z-0 bg-[radial-gradient(#222_1px,transparent_1px)] bg-[size:30px_30px] opacity-30 pointer-events-none" />
        <Starfield />

        <div className="absolute top-[18%] md:top-[12%] left-1/2 -translate-x-1/2 w-full max-w-4xl aspect-square z-0 pointer-events-none">
          <FluidOrb />
        </div>

        <nav className="relative z-50 flex items-center justify-between px-10 py-8 max-w-[1400px] mx-auto">
          <div className="flex flex-1 items-center">
            <span className="text-xl font-bold tracking-tight" style={{ color:'#ffd700', textShadow:'0 0 10px rgba(255,215,0,0.3)' }}>Botify</span>
          </div>
          <div className="hidden md:flex flex-1 items-center justify-center gap-10 text-[13px] font-medium text-white/80">
            <a href="#about-contact" className="hover:text-white transition-colors">About</a>
            <a href="#about-contact" className="hover:text-white transition-colors">Contact</a>
            <Link to="#" className="hover:text-white transition-colors">FAQ</Link>
            <Link to="#" className="flex items-center gap-1 hover:text-white transition-colors">ENG <ChevronDown className="w-3.5 h-3.5" /></Link>
          </div>
          <div className="flex flex-1 items-center justify-end gap-3.5">
            <Link to="/login" className="text-sm font-semibold text-white/70 hover:text-white transition-all px-6 py-2 border border-white/10 hover:bg-white/5 rounded-full">Login</Link>
            <Link to="/signup" className="text-sm font-bold text-[#050505] px-6 py-2 rounded-full transition-all hover:scale-105"
              style={{ background:'linear-gradient(135deg,#ffd700,#ffe066)', boxShadow:'0 0 15px rgba(255,215,0,0.2)' }}>
              Sign up
            </Link>
          </div>
        </nav>

        <main className="relative z-10 flex flex-col items-center justify-start min-h-[calc(100vh-100px)] px-4 pt-16">
          <div className="max-w-4xl mx-auto text-center space-y-6 pb-20">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-[1.1]">
              <span className="text-[#ffd700]">Elevate</span> Your Conversation.<br />Automate Your <span className="text-[#ffd700]">Success.</span>
            </h1>
            <p className="text-sm md:text-base font-normal text-white/60 max-w-2xl mx-auto leading-relaxed">
              Unlock the full potential of autonomous communication. Buy, sell, and deploy high-performance bots across WhatsApp, Telegram, and Discord—all from one liquid-smooth marketplace.
            </p>
          </div>

          <div className="w-full mt-10 md:mt-24 z-20 pb-20 overflow-hidden relative marquee-container">
            <div className="absolute top-0 left-0 w-16 md:w-40 h-full bg-gradient-to-r from-[#050505] to-transparent z-10 pointer-events-none" />
            <div className="absolute top-0 right-0 w-16 md:w-40 h-full bg-gradient-to-l from-[#050505] to-transparent z-10 pointer-events-none" />
            <div className="animate-marquee py-6">
              {doubled.map((box, i) => <MarqueeCard key={i} box={box} />)}
            </div>
          </div>
        </main>
      </div>

      <section id="about-contact" className="relative z-20 bg-[#0a0a0a] border-t border-white/5 py-8 px-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start justify-between gap-6">
          <div>
            <p className="text-[11px] font-semibold text-white/40 uppercase tracking-widest mb-2">About</p>
            <p className="text-[11px] text-white/25 leading-relaxed max-w-xs">
              Botify is a premium multi-messaging bot marketplace enabling autonomous communication across WhatsApp, Telegram, and Discord.
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-white/40 uppercase tracking-widest mb-2">Contact</p>
            <a href="mailto:support@botify.com" className="block text-[11px] text-white/25 hover:text-white/60 transition-colors">support@botify.com</a>
            <a href="mailto:sales@botify.com" className="block text-[11px] text-white/25 hover:text-white/60 transition-colors">sales@botify.com</a>
          </div>
          <div>
            <p className="text-[10px] text-white/15 mt-4 md:mt-0">© 2025 Botify. All rights reserved.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
