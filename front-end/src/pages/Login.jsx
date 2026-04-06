import { useState, useRef, memo, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { authAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import RoleSelectModal from '../components/RoleSelectModal';
import CSSOrb from '../components/CSSOrb';
import Logo from '../components/Logo';
import StarfieldCanvas from '../components/StarfieldCanvas';

/* ─────────────── Particle burst on submit ─────────────── */
const ParticleBurst = ({ active, success }) => {
  const particles = Array.from({ length: 24 });
  if (!active) return null;
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl z-20">
      {particles.map((_, i) => {
        const angle = (i / particles.length) * 360;
        const dist = 80 + Math.random() * 60;
        const color = success
          ? ['#ffd700', '#fff', '#ffd700cc', '#ffe066'][i % 4]
          : ['#818cf8', '#a78bfa', '#60a5fa', '#c084fc'][i % 4];
        return (
          <div key={i} style={{
            position: 'absolute',
            left: '50%', top: '50%',
            width: `${4 + Math.random() * 5}px`,
            height: `${4 + Math.random() * 5}px`,
            borderRadius: '50%',
            background: color,
            boxShadow: `0 0 8px ${color}`,
            animation: `particleFly 0.75s ease-out forwards`,
            animationDelay: `${i * 0.015}s`,
            '--angle': `${angle}deg`,
            '--dist': `${dist}px`,
          }} />
        );
      })}
    </div>
  );
};

/* ─────────────── Cinematic success portal overlay ─────────────── */
const SuccessPortal = ({ userName, tl }) => {
  const orbParticles = Array.from({ length: 16 }, (_, i) => ({
    a: (i / 16) * 360,
    r: `${100 + Math.random() * 60}px`,
    color: ['#ffd700','#fff6a0','#ffffff','#ffe066'][i % 4],
    size: `${4 + Math.random() * 5}px`,
    delay: `${0.55 + i * 0.04}s`,
  }));

  return (
    <div className="portal-bg fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: 'radial-gradient(ellipse at center, rgba(10,8,2,0.98) 0%, rgba(5,5,5,0.99) 100%)', fontFamily:"'Inter',sans-serif" }}>

      {/* Twinkling star field */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({length:60}).map((_,i) => (
          <div key={i} className="absolute bg-white rounded-full animate-twinkle"
            style={{
              left:`${Math.random()*100}%`, top:`${Math.random()*100}%`,
              width:`${Math.random()*1.5+0.5}px`, height:`${Math.random()*1.5+0.5}px`,
              opacity: Math.random()*0.5+0.2,
              animationDuration:`${Math.random()*3+2}s`,
              animationDelay:`${Math.random()*3}s`,
            }} />
        ))}
      </div>

      {/* Warp-out wrapper */}
      <div className="warp-out flex flex-col items-center">

        {/* Outer ring */}
        <div className="ring-expand ring-pulse relative flex items-center justify-center"
          style={{
            width: 220, height: 220, borderRadius: '50%',
            border: '2px solid rgba(255,215,0,0.55)',
            background: 'radial-gradient(circle, rgba(255,215,0,0.06) 0%, transparent 70%)',
          }}>

          {/* Orbit particles */}
          {orbParticles.map((p, i) => (
            <div key={i} style={{
              position:'absolute', left:'50%', top:'50%',
              width: p.size, height: p.size, borderRadius:'50%',
              background: p.color, boxShadow:`0 0 8px ${p.color}`,
              animation: `particleRing 0.85s ease-out forwards`,
              animationDelay: p.delay,
              '--a': `${p.a}deg`, '--r': p.r,
            }} />
          ))}

          {/* Rotating conic aura */}
          <div className="orb-aura absolute inset-[-16px] rounded-full"
            style={{
              border: '1.5px solid rgba(255,215,0,0.18)',
              background: 'conic-gradient(from 0deg, rgba(255,215,0,0.12) 0%, transparent 50%, rgba(255,215,0,0.12) 100%)',
            }}
          />

          {/* Inner gold orb glow */}
          <div style={{
            width: 120, height: 120, borderRadius: '50%',
            background: 'radial-gradient(circle at 38% 35%, rgba(255,230,80,0.55) 0%, rgba(255,215,0,0.2) 45%, transparent 70%)',
            boxShadow: '0 0 50px rgba(255,215,0,0.35), 0 0 100px rgba(255,215,0,0.15)',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <span style={{ fontSize: 42, filter:'drop-shadow(0 0 12px rgba(255,215,0,0.8))' }}>✓</span>
          </div>
        </div>

        {/* Welcome text */}
        <div className="welcome-in text-center mt-8">
          <p style={{ fontSize:11, fontWeight:700, letterSpacing:'0.3em', textTransform:'uppercase', color:'rgba(255,215,0,0.5)', marginBottom:8 }}>
            {tl('login.authenticated')}
          </p>
          <h2 style={{ fontSize:26, fontWeight:700, color:'#fff', letterSpacing:'-0.02em', marginBottom:4 }}>
            {tl('login.welcomeBack')}{userName ? ',\u00a0' : '!'}
            {userName && <span style={{ color:'#ffd700' }}>{userName.split(' ')[0]}</span>}
            {userName && '!'}
          </h2>
          <p style={{ fontSize:13, color:'rgba(255,255,255,0.35)', marginBottom:24 }}>
            {tl('login.redirecting')}
          </p>
          {/* Staggered loading dots */}
          <div style={{ display:'flex', justifyContent:'center', gap:8 }}>
            {[0,1,2].map(i => (
              <div key={i}
                className={['dot-1','dot-2','dot-3'][i]}
                style={{ width:8, height:8, borderRadius:'50%', background:'rgba(255,215,0,0.7)', boxShadow:'0 0 8px rgba(255,215,0,0.4)' }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const LOGIN_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  @keyframes twinkle {
    0%,100%{opacity:0.1;transform:scale(0.8)}
    50%{opacity:1;transform:scale(1.2);box-shadow:0 0 10px 2px rgba(255,255,255,0.4)}
  }
  .animate-twinkle{animation-name:twinkle;animation-timing-function:ease-in-out;animation-iteration-count:infinite}
  @keyframes shooting-star {
    0%{transform:rotate(135deg) translateX(0);opacity:1;width:0}
    5%{width:140px;opacity:1}
    15%{width:0;transform:rotate(135deg) translateX(1000px);opacity:0}
    100%{width:0;transform:rotate(135deg) translateX(1000px);opacity:0}
  }
  .animate-shooting{animation:shooting-star linear infinite;background:linear-gradient(90deg,transparent,#ffd700);height:2px;border-radius:999px;filter:drop-shadow(0 0 6px #ffd700)}
  @keyframes fadeSlideUp{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}
  .fade-up{animation:fadeSlideUp 0.7s cubic-bezier(.16,1,.3,1) both}
  .fade-up-1{animation-delay:.05s}
  .fade-up-2{animation-delay:.12s}
  .fade-up-3{animation-delay:.2s}
  @keyframes shimmerSweep {
    0%{background-position:-200% center}
    100%{background-position:200% center}
  }
  .btn-shimmer{
    background:linear-gradient(90deg,#1a1a1a 30%,#2a2a2a 50%,#1a1a1a 70%);
    background-size:200% auto;
    animation:shimmerSweep 1.4s linear infinite;
  }
  .btn-success{background:#ffd700!important;color:#050505!important}
  .btn-error{background:#ef4444!important}
  @keyframes particleFly{
    0%{transform:translate(-50%,-50%) rotate(var(--angle)) translateX(0);opacity:1}
    100%{transform:translate(-50%,-50%) rotate(var(--angle)) translateX(var(--dist));opacity:0}
  }
  @keyframes inputGlow{
    0%,100%{box-shadow:0 0 0 1px rgba(255,215,0,0.3)}
    50%{box-shadow:0 0 0 2px rgba(255,215,0,0.6),0 0 20px rgba(255,215,0,0.15)}
  }
  .input-focused{animation:inputGlow 2s ease infinite}
  @keyframes cardReveal{
    from{opacity:0;transform:translateY(40px) scale(0.97)}
    to{opacity:1;transform:translateY(0) scale(1)}
  }
  .card-reveal{animation:cardReveal 0.8s cubic-bezier(.16,1,.3,1) 0.1s both}
  @keyframes successPulse{
    0%{box-shadow:0 0 0 0 rgba(255,215,0,0.6)}
    70%{box-shadow:0 0 0 20px rgba(255,215,0,0)}
    100%{box-shadow:0 0 0 0 rgba(255,215,0,0)}
  }
  .success-pulse{animation:successPulse 0.7s ease}
  @keyframes errorShake{
    0%,100%{transform:translateX(0)}
    20%{transform:translateX(-8px)}
    40%{transform:translateX(8px)}
    60%{transform:translateX(-5px)}
    80%{transform:translateX(5px)}
  }
  .error-shake{animation:errorShake 0.45s ease}
  @keyframes orbFloat{
    0%,100%{transform:translateY(0) scale(1)}
    50%{transform:translateY(-14px) scale(1.02)}
  }
  .orb-float{animation:orbFloat 6s ease-in-out infinite}
  @keyframes orbSlideIn{from{opacity:0;transform:translateX(-40px)}to{opacity:1;transform:translateX(0)}}
  .orb-slide{animation:orbSlideIn 1s cubic-bezier(.16,1,.3,1) both}
  @keyframes formSlideIn{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}
  .form-slide{animation:formSlideIn 1s cubic-bezier(.16,1,.3,1) 0.15s both}
  input,textarea,select{color:#fff!important;background:transparent!important}
  input::placeholder,textarea::placeholder{color:rgba(255,255,255,0.3)!important}
  option{color:#111;background:#fff}
  @keyframes goldPulse{
    0%,100%{opacity:0.5;transform:scale(1)}
    50%{opacity:1;transform:scale(1.05)}
  }
  .gold-badge{animation:goldPulse 3s ease-in-out infinite}

  /* ── Success Portal ── */
  @keyframes portalBg{
    0%{opacity:0} 15%{opacity:1} 75%{opacity:1} 100%{opacity:0}
  }
  .portal-bg{animation:portalBg 2.2s cubic-bezier(.4,0,.2,1) both}

  @keyframes ringExpand{
    0%{transform:scale(0.2);opacity:0.9}
    60%{transform:scale(1.05);opacity:1}
    80%{transform:scale(0.98);opacity:1}
    100%{transform:scale(1);opacity:1}
  }
  .ring-expand{animation:ringExpand 0.7s cubic-bezier(.16,1,.3,1) both}

  @keyframes ringPulse{
    0%,100%{box-shadow:0 0 0 0 rgba(255,215,0,0),0 0 60px rgba(255,215,0,0.2)}
    50%{box-shadow:0 0 0 30px rgba(255,215,0,0),0 0 80px rgba(255,215,0,0.5)}
  }
  .ring-pulse{animation:ringPulse 1s ease-in-out 0.8s infinite}

  @keyframes orbAura{
    0%{transform:scale(0) rotate(0deg);opacity:0}
    20%{opacity:1}
    100%{transform:scale(1) rotate(360deg);opacity:1}
  }
  .orb-aura{animation:orbAura 1s cubic-bezier(.16,1,.3,1) 0.15s both}

  @keyframes welcomeIn{
    from{opacity:0;transform:translateY(22px)}
    to{opacity:1;transform:translateY(0)}
  }
  .welcome-in{animation:welcomeIn 0.6s cubic-bezier(.16,1,.3,1) 0.55s both}

  @keyframes dotsFlow{
    0%,100%{opacity:0.3;transform:scale(0.8)}
    50%{opacity:1;transform:scale(1.15)}
  }
  .dot-1{animation:dotsFlow 1s ease 0.9s infinite}
  .dot-2{animation:dotsFlow 1s ease 1.1s infinite}
  .dot-3{animation:dotsFlow 1s ease 1.3s infinite}

  @keyframes warpOut{
    0%{opacity:1;transform:scale(1)}
    60%{opacity:1;transform:scale(1.08)}
    100%{opacity:0;transform:scale(1.4)}
  }
  .warp-out{animation:warpOut 0.6s cubic-bezier(.4,0,1,1) 1.5s both}

  @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}

  @keyframes particleRing{
    0%{transform:translate(-50%,-50%) rotate(var(--a)) translateX(0);opacity:1}
    100%{transform:translate(-50%,-50%) rotate(var(--a)) translateX(var(--r));opacity:0}
  }
`;

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { t: tl } = useLanguage();
  const successMessage = location.state?.message;

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitState, setSubmitState] = useState('idle'); // idle | loading | success | error
  const [particleBurst, setParticleBurst] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [heldGoogleToken, setHeldGoogleToken] = useState(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [isProcessingGoogleRole, setIsProcessingGoogleRole] = useState(false);
  const [showPortal, setShowPortal] = useState(false);
  const [portalUser, setPortalUser] = useState(null);
  const formRef = useRef(null);

  const handleChange = (e) => { setFormData({ ...formData, [e.target.name]: e.target.value }); setError(''); };

  const triggerParticles = () => {
    setParticleBurst(true);
    setTimeout(() => setParticleBurst(false), 900);
  };

  const handleRoleSelect = async (roleId) => {
    if (!heldGoogleToken || isProcessingGoogleRole) return;
    setIsProcessingGoogleRole(true); setError('');
    try {
      const API_URL = import.meta.env.VITE_API_URL || '/api';
      const res = await axios.post(`${API_URL}/auth/google?role_id=${roleId}`, { id_token: heldGoogleToken });
      if (res.data.success) {
        login(res.data.token, res.data.user); setShowRoleModal(false); setHeldGoogleToken(null);
        const r = res.data.user.role_name;
        if (r === 'admin') navigate('/dashboard/admin');
        else if (r === 'seller') navigate('/dashboard/seller');
        else navigate('/dashboard/buyer');
      }
    } catch (err) { setError(err.response?.data?.message || tl('login.errors.googleSignup')); }
    finally { setIsProcessingGoogleRole(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSubmitState('loading'); setLoading(true);
    try {
      const response = await authAPI.login(formData);
      if (response.data.success) {
        setSubmitState('success');
        triggerParticles();
        login(response.data.token, response.data.user);
        // Show cinematic portal
        setPortalUser(response.data.user);
        setShowPortal(true);
        setTimeout(() => {
          try {
            const r = response.data.user.role_name;
            if (r === 'admin') navigate('/dashboard/admin');
            else if (r === 'seller') navigate('/dashboard/seller');
            else navigate('/dashboard/buyer');
          } catch (navErr) {
            console.error('Navigation error:', navErr);
            setError(tl('login.errors.navigate'));
            setShowPortal(false);
          }
        }, 2200);
      }
    } catch (err) {
      setSubmitState('error');
      console.error('Login error:', err);
      setError(err.response?.data?.message || tl('login.errors.loginFailed'));
      if (formRef.current) formRef.current.classList.add('error-shake');
      setTimeout(() => {
        if (formRef.current) formRef.current.classList.remove('error-shake');
        setSubmitState('idle');
      }, 500);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) return;
    const scriptId = 'google-gsi-client';
    const existingScript = document.getElementById(scriptId);
    const script = existingScript || document.createElement('script');
    if (!existingScript) {
      script.id = scriptId;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }
    const initializeGoogleSignIn = () => {
      if (!window.google?.accounts || !clientId || window.__botifyGoogleGisInitialized) {
        return;
      }

      window.__botifyGoogleGisInitialized = true;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response) => {
          const id_token = response?.credential; if (!id_token) return;
          setHeldGoogleToken(id_token); setError(''); setLoading(true);
          try {
            const res = await authAPI.googleSignIn({ id_token });
            if (res.data.success) {
              if (res.data.isNewUser) { setShowRoleModal(true); }
              else {
                setSubmitState('success'); triggerParticles();
                login(res.data.token, res.data.user);
                // Show cinematic portal
                setPortalUser(res.data.user);
                setShowPortal(true);
                setTimeout(() => {
                  const r = res.data.user.role_name;
                  if (r === 'admin') navigate('/dashboard/admin');
                  else if (r === 'seller') navigate('/dashboard/seller');
                  else navigate('/dashboard/buyer');
                }, 2200);
              }
            }
          } catch (err) { setError(err.response?.data?.message || tl('login.errors.googleSignin')); setHeldGoogleToken(null); }
          finally { setLoading(false); }
        },
      });

      const container = document.getElementById('googleSignInDiv');
      if (container) window.google.accounts.id.renderButton(container, { theme: 'filled_black', size: 'large', width: 320 });
    };

    script.onload = initializeGoogleSignIn;
    if (window.google?.accounts) {
      initializeGoogleSignIn();
    };
    script.onerror = () => setError(tl('login.errors.googleScript'));
    return () => { /* Keep GIS script mounted to avoid duplicate initialization warnings. */ };
  }, []);

  const btnClass = submitState === 'success' ? 'btn-success success-pulse'
    : submitState === 'error' ? 'btn-error'
    : submitState === 'loading' ? 'btn-shimmer'
    : '';

  return (
    <div className="relative min-h-screen bg-[#050505] overflow-hidden text-white antialiased"
      style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{LOGIN_STYLES}</style>

      {/* Global bg: dot grid */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(#222_1px,transparent_1px)] bg-[size:30px_30px] opacity-30 pointer-events-none" />
      <StarfieldCanvas count={55} opacity={0.8} />

      {/* ── SPLIT SCREEN WRAPPER ── */}
      <div className="relative z-10 flex min-h-screen">

        {/* ════ LEFT HALF — Orb + Branding ════ */}
        <div className="hidden lg:flex flex-col items-center justify-center w-1/2 relative overflow-hidden orb-slide">

          {/* left-side ambient glow */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 80% 70% at 50% 50%, rgba(255,215,0,0.04) 0%, transparent 70%)' }} />

          {/* FluidOrb */}
          <div className="relative w-[520px] h-[520px] orb-float">
            <CSSOrb size={420} />
          </div>

          {/* Branding below orb */}
          <div className="absolute bottom-16 left-0 right-0 text-center px-12">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/25 mb-3">{tl('login.poweredBy')}</p>
            <div className="flex justify-center mb-4">
              <Logo size="lg" />
            </div>
            <p className="text-[13px] text-white/35 leading-relaxed max-w-xs mx-auto">
              {tl('login.tagline')}
            </p>

            {/* stats row */}
            <div className="flex justify-center gap-8 mt-8">
              {[['500+', tl('login.stats.bots')], ['10K+', tl('login.stats.users')], ['99.9%', tl('login.stats.uptime')]].map(([val, lbl]) => (
                <div key={lbl} className="text-center">
                  <div className="text-lg font-bold text-[#ffd700] gold-badge">{val}</div>
                  <div className="text-[11px] text-white/30 mt-0.5">{lbl}</div>
                </div>
              ))}
            </div>
          </div>

          {/* vertical divider */}
          <div className="absolute right-0 top-[10%] bottom-[10%] w-px"
            style={{ background: 'linear-gradient(to bottom, transparent, rgba(255,215,0,0.2), rgba(255,255,255,0.06), transparent)' }} />
        </div>

        {/* ════ RIGHT HALF — Form ════ */}
        <div className="flex flex-1 items-center justify-center px-6 py-24 lg:py-16 form-slide">
          <div ref={formRef} className="w-full max-w-md relative">

            {/* gold top accent */}
            <div className="absolute top-0 left-0 right-0 h-[1px] rounded-t-2xl"
              style={{ background: 'linear-gradient(90deg, transparent, #ffd700, transparent)' }} />

            <ParticleBurst active={particleBurst} success={submitState === 'success'} />

            {/* Card */}
            <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-8 sm:p-10">

              {/* Header */}
              <div className="text-center mb-8 fade-up fade-up-1">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4"
                  style={{ background: 'linear-gradient(135deg,rgba(255,215,0,0.15),rgba(255,215,0,0.05))', border: '1px solid rgba(255,215,0,0.25)' }}>
                  <span className="text-xl">🤖</span>
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-white mb-1">{tl('login.title')}</h1>
                <p className="text-[13px] text-white/40">{tl('login.subtitle')}</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">

                {successMessage && (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] fade-up"
                    style={{ background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.2)', color: '#ffd700' }}>
                    <span>✓</span> {successMessage}
                  </div>
                )}

                {error && (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] fade-up"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
                    <span>⚠</span> {error}
                  </div>
                )}

                {/* Email */}
                <div className="fade-up fade-up-2">
                  <label className="block text-[11px] font-semibold uppercase tracking-widest text-white/40 mb-2">
                    {tl('login.emailLabel')}
                  </label>
                  <input id="email" name="email" type="email" required
                    value={formData.email} onChange={handleChange}
                    onFocus={() => setFocusedField('email')} onBlur={() => setFocusedField(null)}
                    className={`w-full px-4 py-3 rounded-xl text-[14px] text-white outline-none transition-all duration-300
                      bg-white/[0.05] border ${focusedField === 'email' ? 'border-[#ffd700]/60 input-focused' : 'border-white/10'}
                      placeholder-white/30 focus:bg-white/[0.08]`}
                    placeholder={tl('login.placeholders.email')} />
                </div>

                {/* Password */}
                <div className="fade-up fade-up-2">
                  <label className="block text-[11px] font-semibold uppercase tracking-widest text-white/40 mb-2">
                    {tl('login.passwordLabel')}
                  </label>
                  <input id="password" name="password" type="password" required
                    value={formData.password} onChange={handleChange}
                    onFocus={() => setFocusedField('password')} onBlur={() => setFocusedField(null)}
                    className={`w-full px-4 py-3 rounded-xl text-[14px] text-white outline-none transition-all duration-300
                      bg-white/[0.05] border ${focusedField === 'password' ? 'border-[#ffd700]/60 input-focused' : 'border-white/10'}
                      placeholder-white/30 focus:bg-white/[0.08]`}
                    placeholder={tl('login.placeholders.password')} />
                </div>

                {/* Remember / Forgot */}
                <div className="flex items-center justify-between fade-up fade-up-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input id="remember-me" type="checkbox" className="w-4 h-4 rounded accent-[#ffd700]" />
                    <span className="text-[12px] text-white/40">{tl('login.rememberMe')}</span>
                  </label>
                  <Link to="/forgot-password"
                    className="text-[12px] font-semibold text-[#ffd700]/80 hover:text-[#ffd700] transition-colors">
                    {tl('login.forgotPassword')}
                  </Link>
                </div>

                {/* Submit */}
                <div className="fade-up fade-up-3 relative">
                  <button type="submit" disabled={loading}
                    className={`w-full py-3.5 rounded-xl text-[14px] font-semibold tracking-wide transition-all duration-300 relative overflow-hidden
                      ${submitState === 'success' ? 'bg-[#ffd700] text-[#050505] success-pulse' : ''}
                      ${submitState === 'error' ? 'bg-red-600 text-white' : ''}
                      ${submitState === 'loading' ? 'btn-shimmer text-white cursor-not-allowed' : ''}
                      ${submitState === 'idle' ? 'bg-[#1a1a1a] text-white hover:bg-[#222] border border-white/10 hover:border-[#ffd700]/30' : ''}
                      disabled:opacity-70`}>
                    {submitState === 'loading' && (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                        {tl('login.signingIn')}
                      </span>
                    )}
                    {submitState === 'success' && <span className="flex items-center justify-center gap-2">✓ {tl('login.welcomeBack')}!</span>}
                    {submitState === 'error' && <span>{tl('login.tryAgain')}</span>}
                    {submitState === 'idle' && tl('login.signIn')}
                  </button>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3 fade-up fade-up-3">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-[11px] text-white/25 tracking-widest uppercase">{tl('login.or')}</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>

                {/* Google */}
                <div className="flex justify-center fade-up fade-up-3">
                  <div id="googleSignInDiv" />
                </div>

                {/* Sign up link */}
                <p className="text-center text-[13px] text-white/40 fade-up fade-up-3">
                  {tl('login.noAccount')}{' '}
                  <Link to="/signup" className="font-semibold text-[#ffd700]/80 hover:text-[#ffd700] transition-colors">
                    {tl('login.signUp')}
                  </Link>
                </p>
              </form>
            </div>

            {/* bottom glow */}
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-3/4 h-16 pointer-events-none"
              style={{ background: 'rgba(255,215,0,0.06)', filter: 'blur(24px)', borderRadius: '50%' }} />
          </div>
        </div>
      </div>

      <RoleSelectModal isOpen={showRoleModal} onSelectRole={handleRoleSelect} isLoading={isProcessingGoogleRole} />
      {showPortal && <SuccessPortal userName={portalUser?.name} tl={tl} />}
    </div>
  );
};

export default Login;
