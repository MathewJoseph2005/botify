import React, { useEffect, useRef, useState, useMemo, memo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ArrowRight, Zap, Shield, Sparkles, Globe, BarChart3, Users } from 'lucide-react';
import CSSOrb from '../components/CSSOrb';
import GlassCard from '../components/GlassCard';
import Logo from '../components/Logo';
import StarfieldCanvas from '../components/StarfieldCanvas';
import { useLanguage } from '../context/LanguageContext';

const featuresList = [
  { role: 'Global', label: 'Market Reach', heading: 'Omnichannel Deployment', footer: 'WhatsApp, Telegram, Discord.', icon: <Globe className="w-5 h-5" /> },
  { role: 'Seller', label: 'Monetization', heading: 'Developer Revenue Share', footer: 'Automated payouts via Stripe.', icon: <Zap className="w-5 h-5" /> },
  { role: 'Buyer', label: 'Efficiency', heading: 'One-Click Bot Ignition', footer: 'Zero-code setup for buyers.', icon: <Sparkles className="w-5 h-5" /> },
  { role: 'Security', label: 'Integrity', heading: 'Sandboxed Script Audit', footer: '100% verified bot source code.', icon: <Shield className="w-5 h-5" /> },
  { role: 'Performance', label: 'Speed', heading: 'Ultra-Low Latency', footer: '< 200ms message response.', icon: <Zap className="w-5 h-5" /> },
  { role: 'Admin', label: 'Governance', heading: 'Role-Based Command', footer: 'Full RBAC permission control.', icon: <Shield className="w-5 h-5" /> },
  { role: 'Analytics', label: 'Insights', heading: 'Real-Time Data Streams', footer: 'Track every interaction live.', icon: <BarChart3 className="w-5 h-5" /> },
  { role: 'Scale', label: 'Capacity', heading: 'Infinite Session Scaling', footer: 'Run 1,000+ bots concurrently.', icon: <Users className="w-5 h-5" /> },
  { role: 'Support', label: 'Assistance', heading: 'AI-Powered Debugging', footer: 'Auto-healing for broken sessions.', icon: <Sparkles className="w-5 h-5" /> },
  { role: 'Future', label: 'Roadmap', heading: 'Agentic AI Marketplace', footer: 'Next-gen autonomous assistants.', icon: <Globe className="w-5 h-5" /> },
];

const doubled = [...featuresList, ...featuresList];


const MarqueeCard = memo(({ box }) => {
  const cardRef = useRef(null);
  const [isCentered, setIsCentered] = useState(false);

  useEffect(() => {
    let raf;
    const check = () => {
      if (cardRef.current) {
        const { left, right } = cardRef.current.getBoundingClientRect();
        const center = window.innerWidth / 2;
        const zone = window.innerWidth < 768 ? 100 : 180;
        setIsCentered(left < center + zone && right > center - zone);
      }
      raf = requestAnimationFrame(check);
    };
    check();
    return () => cancelAnimationFrame(raf);
  }, []);

  const cardCls = `h-full p-8 flex flex-col justify-between transition-all duration-700 cursor-pointer overflow-hidden relative group border-t-0 border-x-0 rounded-none border-b-2 ${isCentered
      ? 'bg-white/[0.08] border-[#ffd700] shadow-[0_20px_50px_rgba(255,215,0,0.1)] scale-105 z-10'
      : 'bg-transparent border-white/5 opacity-40 grayscale-[0.5]'
    }`;

  return (
    <div ref={cardRef} className="min-w-[300px] w-[300px] sm:min-w-[360px] shrink-0 px-4 py-12 transition-all duration-700">
      <div className={cardCls}>
        <div className={`mb-8 p-3 rounded-2xl w-fit transition-all duration-500 ${isCentered ? 'bg-[#ffd700] text-[#050505] rotate-3' : 'bg-white/5 text-white/40'}`}>
          {box.icon}
        </div>
        <div>
          <span className={`text-[10px] font-black uppercase tracking-[0.2em] mb-3 block transition-colors duration-500 ${isCentered ? 'text-[#ffd700]' : 'text-white/40'}`}>
            {box.label}
          </span>
          <h3 className={`text-2xl font-bold mb-4 tracking-tight leading-tight transition-colors duration-500 ${isCentered ? 'text-white' : 'text-white/60'}`}>
            {box.heading}
          </h3>
          <p className={`text-sm leading-relaxed transition-colors duration-500 ${isCentered ? 'text-white/70' : 'text-white/30'}`}>
            {box.footer}
          </p>
        </div>
        {isCentered && (
          <div className="absolute top-0 right-0 p-4 opacity-20">
            <ArrowRight className="w-12 h-12 -rotate-45" />
          </div>
        )}
      </div>
    </div>
  );
});

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700;900&display=swap');
  body { font-family: 'Plus Jakarta Sans', sans-serif; }
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
    animation: shooting-star 6s linear infinite;
    background: linear-gradient(90deg, transparent, #ffd700);
    height: 1px; border-radius: 999px;
    filter: drop-shadow(0 0 6px #ffd700);
  }
  
  @keyframes twinkle {
    0%, 100% { opacity: 0.1; transform: scale(0.8); }
    50% { opacity: 1; transform: scale(1.1); }
  }
  .animate-twinkle { animation-name: twinkle; animation-timing-function: ease-in-out; animation-iteration-count: infinite; }
  
  @keyframes scrollLeft {
    0%   { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  .animate-marquee { display: flex; width: max-content; animation: scrollLeft 50s linear infinite; }
  .marquee-container:hover .animate-marquee { animation-play-state: paused; }

  .text-glow-gold { text-shadow: 0 0 20px rgba(255,215,0,0.3); }
  
  @keyframes orbOverlapFloat {
    0%, 100% { transform: translateY(0) scale(1); }
    50% { transform: translateY(-14px) scale(1.03); }
  }
  .orb-main-float { animation: orbOverlapFloat 6s ease-in-out infinite; }

  .bg-mesh {
    background-image: 
      radial-gradient(at 0% 0%, hsla(45,100%,50%,0.05) 0, transparent 50%), 
      radial-gradient(at 100% 0%, hsla(190,100%,50%,0.03) 0, transparent 50%);
  }
`;

export default function LandingPage() {
  const { language, changeLanguage, t } = useLanguage();
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  const languages = [
    { code: 'en', name: 'English', flag: 'GB' },
    { code: 'es', name: 'Espanol', flag: 'ES' },
    { code: 'hi', name: 'Hindi', flag: 'IN' },
    { code: 'ml', name: 'Malayalam', flag: 'IN' },
    { code: 'ta', name: 'Tamil', flag: 'IN' },
  ];

  return (
    <div className="relative min-h-screen bg-[#020202] overflow-x-hidden text-white antialiased selection:bg-[#ffd700] selection:text-black">
      <style>{STYLES}</style>

      {/* Hero Section */}
      <div className="relative min-h-[100vh] flex flex-col pt-[180px] sm:pt-0">
        <div className="absolute inset-0 z-0 bg-mesh pointer-events-none" />
        <div className="absolute inset-0 z-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
        <StarfieldCanvas count={60} opacity={0.6} />

        {/* Floating background orb - Unified with Login Page Style */}
        <div className="absolute top-[15%] left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-none z-0">
           {/* Ambient central glow */}
           <div className="absolute w-[600px] h-[600px] opacity-[0.4] pointer-events-none"
             style={{ background: 'radial-gradient(ellipse 80% 70% at 50% 50%, rgba(255,215,0,0.06) 0%, transparent 70%)' }} />
           
           <div className="relative w-[540px] h-[540px] orb-main-float">
             <CSSOrb size={540} />
           </div>
        </div>

        {/* Global Nav */}
        <nav className="fixed top-0 left-0 w-full z-[100] px-6 py-8">
          <div className="max-w-[1400px] mx-auto flex items-center justify-between px-8 py-4 bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] rounded-[32px] shadow-2xl">
            <Link to="/" onClick={() => window.scrollTo(0, 0)}>
               <Logo size="md" />
            </Link>
            <div className="hidden lg:flex items-center gap-12 text-[11px] font-black uppercase tracking-[0.2em] text-white/40">
              <a href="#features" className="hover:text-[#ffd700] transition-colors">Features</a>
              <Link to="/marketplace" className="hover:text-[#ffd700] transition-colors">{t('nav.marketplace')}</Link>
              <a href="#about" className="hover:text-[#ffd700] transition-colors">Core Tech</a>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setLangMenuOpen((prev) => !prev)}
                  className="hover:text-[#ffd700] transition-colors flex items-center gap-1"
                >
                  {language.toUpperCase()} <ChevronDown className="w-3 h-3" />
                </button>
                {langMenuOpen && (
                  <div className="absolute right-0 mt-2 w-44 rounded-xl border border-white/10 bg-[#0b0b0b]/95 backdrop-blur-lg overflow-hidden z-50">
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => {
                          changeLanguage(lang.code);
                          setLangMenuOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left text-[12px] transition-all ${
                          language === lang.code
                            ? 'text-[#ffd700] bg-white/10'
                            : 'text-white/70 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {lang.flag} {lang.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/login" className="px-6 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all">{t('nav.login')}</Link>
              <Link to="/signup" className="px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-[0.15em] text-[#050505] bg-[#ffd700] shadow-[0_4px_30px_rgba(255,215,0,0.25)] hover:scale-[1.03] transition-all">{t('nav.signup')}</Link>
            </div>
          </div>
        </nav>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center flex-1 text-center px-6 mt-[120px] sm:mt-0">
          <div className="mb-6 px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.1] backdrop-blur-md fade-up">
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#ffd700]">The Autonomous Economy is Here</span>
          </div>
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-8 max-w-4xl leading-[0.95] fade-up delay-100">
            Trade High-End <br/> <span className="text-[#ffd700] text-glow-gold">Neural Bots.</span>
          </h1>
          <p className="text-white/40 text-sm md:text-lg max-w-2xl leading-relaxed mb-12 fade-up delay-200">
            The elite marketplace for AI-driven automation. Purchase verified bots for WhatsApp, Telegram, and E-mail with instant deployment.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-6 fade-up delay-300">
            <Link to="/signup" className="group relative px-10 py-5 bg-white text-black rounded-2xl font-black uppercase text-xs tracking-widest overflow-hidden hover:scale-[1.05] transition-transform">
              <span className="relative z-10">Start Transacting</span>
              <div className="absolute inset-x-0 bottom-0 h-1 bg-[#ffd700] transition-all group-hover:h-full group-hover:opacity-10 opacity-0" />
            </Link>
            <Link to="/marketplace" className="px-10 py-5 rounded-2xl font-black uppercase text-xs tracking-widest border border-white/10 hover:bg-white/5 transition-all flex items-center gap-2">
              Browse Grid <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 opacity-20 hover:opacity-100 transition-opacity cursor-pointer">
          <span className="text-[9px] font-black uppercase tracking-[0.4em]">Scroll</span>
          <div className="w-px h-12 bg-gradient-to-b from-white to-transparent" />
        </div>
      </div>

      {/* Marquee Section */}
      <section id="features" className="py-24 relative z-10">
        <div className="marquee-container overflow-hidden py-12 border-y border-white/5">
          <div className="animate-marquee">
            {doubled.map((box, i) => (
              <MarqueeCard key={i} box={box} />
            ))}
          </div>
        </div>
      </section>

      {/* Stats/About Section */}
      <section id="about" className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            {[
              { label: 'Network Throughput', val: '2.4M', sub: 'Daily interactions' },
              { label: 'Deployed Agents', val: '42k+', sub: 'Autonomous nodes' },
              { label: 'Developer Yield', val: '$1.8M', sub: 'Total seller payouts' },
              { label: 'System Uptime', val: '99.99%', sub: 'Zero-latency grid' },
            ].map((s, i) => (
              <div key={i} className="text-center group">
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mb-4 group-hover:text-[#ffd700] transition-colors">{s.label}</h4>
                <p className="text-5xl font-black tracking-tighter mb-2">{s.val}</p>
                <p className="text-xs text-white/30">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="py-48 flex flex-col items-center justify-center text-center px-6">
        <div className="w-[400px] h-[400px] absolute opacity-10 pointer-events-none rounded-full"
          style={{ background: 'radial-gradient(circle at 50% 50%, rgba(255,215,0,0.25) 0%, rgba(120,80,200,0.15) 40%, transparent 70%)', filter: 'blur(60px)' }} />
        <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-12 relative z-10">Ready to <span className="text-[#ffd700]">Automate?</span></h2>
        <Link to="/signup" className="relative z-10 px-12 py-6 bg-[#ffd700] text-black rounded-3xl font-black uppercase text-sm tracking-[0.2em] shadow-[0_20px_50px_rgba(255,215,0,0.3)] hover:scale-[1.05] transition-transform">
          Connect to the Grid
        </Link>
        <p className="mt-12 text-white/20 text-[10px] font-black uppercase tracking-[0.4em]">Proprietary 2024 Botify Engine</p>
      </section>
    </div>
  );
}