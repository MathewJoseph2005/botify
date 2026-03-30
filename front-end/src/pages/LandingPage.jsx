import React, { useEffect, useRef, useState, useMemo, memo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ArrowRight, Zap, Shield, Sparkles, Globe, BarChart3, Users } from 'lucide-react';
import FluidOrb from '../components/FluidOrb';
import GlassCard from '../components/GlassCard';

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
        opacity: Math.random() * 0.5 + 0.3,
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
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-60">
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
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
  body { font-family: 'Plus Jakarta Sans', sans-serif; }
  /* hide the global navbar when on landing page */
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
  
  @keyframes float {
    0%, 100% { transform: translateY(0px) scale(1); }
    50% { transform: translateY(-14px) scale(1.02); }
  }
  .animate-float { animation: float 6s ease-in-out infinite; }

  .bg-mesh {
    background-image: 
      radial-gradient(at 0% 0%, hsla(45,100%,50%,0.05) 0, transparent 50%), 
      radial-gradient(at 100% 0%, hsla(190,100%,50%,0.03) 0, transparent 50%);
  }
`;

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-[#020202] overflow-x-hidden text-white antialiased selection:bg-[#ffd700] selection:text-black">
      <style>{STYLES}</style>

      {/* Hero Section */}
      <div className="relative min-h-[100vh] flex flex-col pt-[180px] sm:pt-0">
        <div className="absolute inset-0 z-0 bg-mesh pointer-events-none" />
        <div className="absolute inset-0 z-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
        <Starfield />

        {/* Floating background orb - Matched to Login Page Style */}
        <div className="absolute top-[12%] left-1/2 -translate-x-1/2 w-[580px] h-[580px] z-0 pointer-events-none opacity-[0.35] animate-float">
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at center, rgba(255,215,0,0.04) 0%, transparent 70%)' }} />
          <FluidOrb />
        </div>

        {/* Global Nav */}
        <nav className="fixed top-0 left-0 w-full z-[100] px-6 py-8">
          <div className="max-w-[1400px] mx-auto flex items-center justify-between px-8 py-4 bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] rounded-[32px] shadow-2xl">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#ffd700] rounded-xl flex items-center justify-center rotate-3 shadow-[0_0_20px_rgba(255,215,0,0.4)]">
                <Zap className="w-4 h-4 text-black fill-black" />
              </div>
              <span className="text-xl font-extrabold tracking-tighter text-white">Botify</span>
            </div>
            <div className="hidden lg:flex items-center gap-12 text-[11px] font-black uppercase tracking-[0.2em] text-white/40">
              <a href="#features" className="hover:text-[#ffd700] transition-colors">Features</a>
              <Link to="/marketplace" className="hover:text-[#ffd700] transition-colors">Marketplace</Link>
              <a href="#about" className="hover:text-[#ffd700] transition-colors">Core Tech</a>
              <Link to="#" className="hover:text-[#ffd700] transition-colors flex items-center gap-1">EN <ChevronDown className="w-3 h-3" /></Link>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/login" className="hidden sm:block text-[11px] font-black uppercase tracking-[0.2em] py-3 px-8 text-white/60 hover:text-white transition-all">Login</Link>
              <Link to="/signup" className="text-[11px] font-black uppercase tracking-[0.2em] py-3.5 px-8 rounded-2xl bg-[#ffd700] text-black shadow-[0_10px_30px_rgba(255,215,0,0.2)] hover:scale-105 hover:shadow-[0_15px_40px_rgba(255,215,0,0.4)] active:scale-95 transition-all">
                Join Beta
              </Link>
            </div>
          </div>
        </nav>

        <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6">
          <div className="max-w-5xl mx-auto text-center space-y-10">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.08] backdrop-blur-md animate-fade-in">
              <div className="w-2 h-2 rounded-full bg-[#ffd700] animate-pulse shadow-[0_0_8px_#ffd700]" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ffd700]/80">Agentic Era is here</span>
            </div>

            <h1 className="text-6xl md:text-8xl font-[800] tracking-tighter leading-[0.95] text-glow-gold">
              Autonomous <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-b from-[#ffd700] via-[#ffd700] to-[#b89500]">Communication</span>
            </h1>

            <p className="text-lg md:text-xl font-medium text-white/40 max-w-3xl mx-auto leading-relaxed">
              The premium marketplace for agentic AI. Deploy verified bots across <span className="text-white/80">WhatsApp</span>, <span className="text-white/80">Telegram</span>, and <span className="text-white/80">Discord</span> with zero-latency infrastructure.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-10">
              <Link to="/marketplace" className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-white text-black font-black uppercase tracking-[0.2em] text-[12px] flex items-center justify-center gap-2 hover:bg-white/90 active:scale-95 transition-all group">
                Explore Marketplace <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link to="/login" className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-white/[0.03] border border-white/10 font-black uppercase tracking-[0.2em] text-[12px] hover:bg-white/[0.08] transition-all">
                Sell your Bots
              </Link>
            </div>
          </div>
        </main>
      </div>

      {/* Feature Marquee Section */}
      <section id="features" className="relative z-20 py-32 overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-10 mb-20 text-center md:text-left">
          <h2 className="text-sm font-black uppercase tracking-[0.4em] text-[#ffd700]/60 mb-6">Market Capabilities</h2>
          <p className="text-4xl md:text-6xl font-[700] tracking-tighter max-w-2xl leading-tight">
            Built for the <span className="opacity-40">Infinite</span> Scale of AI agents.
          </p>
        </div>

        <div className="w-full relative marquee-container select-none">
          {/* Gradient Edges */}
          <div className="absolute top-0 left-0 w-32 md:w-80 h-full bg-gradient-to-r from-[#020202] to-transparent z-20 pointer-events-none" />
          <div className="absolute top-0 right-0 w-32 md:w-80 h-full bg-gradient-to-l from-[#020202] to-transparent z-20 pointer-events-none" />

          <div className="animate-marquee">
            {doubled.map((box, i) => <MarqueeCard key={i} box={box} />)}
          </div>
        </div>
      </section>

      {/* Footer / Contact */}
      <footer id="about" className="relative z-20 bg-[#050505] border-t border-white/[0.03] pt-32 pb-16 px-10">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-20 mb-32">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-8">
                <Zap className="w-6 h-6 text-[#ffd700] fill-[#ffd700]" />
                <span className="text-2xl font-black tracking-tighter">Botify</span>
              </div>
              <p className="text-white/30 text-lg leading-relaxed max-w-md">
                We are building the backbone of the agentic economy. A secure, trustless environment for AI agents to communicate and transact globally.
              </p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#ffd700] mb-8">Navigation</p>
              <ul className="space-y-4 text-[13px] font-bold text-white/40">
                <li><Link to="/marketplace" className="hover:text-white transition-colors">Browse Market</Link></li>
                <li><Link to="/login" className="hover:text-white transition-colors">Developer Portal</Link></li>
                <li><a href="#" className="hover:text-white transition-colors">API Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Infrastructure Status</a></li>
              </ul>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#ffd700] mb-8">Company</p>
              <ul className="space-y-4 text-[13px] font-bold text-white/40">
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy Privacy</a></li>
                <li><a href="mailto:support@botify.com" className="hover:text-white transition-colors">Enterprise Sales</a></li>
                <li><a href="mailto:support@botify.com" className="hover:text-white transition-colors">Support Center</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-16 border-t border-white/[0.03] flex flex-col md:row items-center justify-between gap-8">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/10">© 2025 BOTIFY CORE SYSTEMS. INC.</p>
            <div className="flex gap-10 opacity-20 hover:opacity-100 transition-opacity">
              <div className="w-5 h-5 bg-white rounded-full" />
              <div className="w-5 h-5 bg-white rounded-full" />
              <div className="w-5 h-5 bg-white rounded-full" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}