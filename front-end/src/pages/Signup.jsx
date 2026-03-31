import { useState, memo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import CSSOrb from '../components/CSSOrb';
import Logo from '../components/Logo';
import StarfieldCanvas from '../components/StarfieldCanvas';


/* ─── Particle Burst ─── */
const ParticleBurst = ({ active, success }) => {
  if (!active) return null;
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl z-20">
      {Array.from({ length: 22 }).map((_, i) => {
        const angle = (i / 22) * 360;
        const color = success
          ? ['#ffd700', '#fff', '#ffe066', '#ffd70099'][i % 4]
          : ['#818cf8', '#a78bfa', '#60a5fa', '#c084fc'][i % 4];
        return (
          <div key={i} style={{
            position: 'absolute', left: '50%', top: '45%',
            width: `${4 + Math.random() * 5}px`, height: `${4 + Math.random() * 5}px`,
            borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}`,
            animation: `particleFly 0.8s ease-out forwards`,
            animationDelay: `${i * 0.016}s`,
            '--angle': `${angle}deg`, '--dist': `${75 + Math.random() * 55}px`,
          }} />
        );
      })}
    </div>
  );
};

const SIGNUP_STYLES = `
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
  .fade-up-1{animation-delay:.05s}.fade-up-2{animation-delay:.13s}.fade-up-3{animation-delay:.21s}
  @keyframes shimmerSweep{0%{background-position:-200% center}100%{background-position:200% center}}
  .btn-shimmer{background:linear-gradient(90deg,#1a1a1a 30%,#2a2a2a 50%,#1a1a1a 70%);background-size:200% auto;animation:shimmerSweep 1.4s linear infinite}
  @keyframes particleFly{
    0%{transform:translate(-50%,-50%) rotate(var(--angle)) translateX(0);opacity:1}
    100%{transform:translate(-50%,-50%) rotate(var(--angle)) translateX(var(--dist));opacity:0}
  }
  @keyframes inputGlow{
    0%,100%{box-shadow:0 0 0 1px rgba(255,215,0,0.3)}
    50%{box-shadow:0 0 0 2px rgba(255,215,0,0.6),0 0 20px rgba(255,215,0,0.15)}
  }
  .input-focused{animation:inputGlow 2s ease infinite}
  @keyframes errorShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}}
  .error-shake{animation:errorShake 0.45s ease}
  @keyframes successPulse{0%{box-shadow:0 0 0 0 rgba(255,215,0,0.6)}70%{box-shadow:0 0 0 22px rgba(255,215,0,0)}100%{box-shadow:0 0 0 0 rgba(255,215,0,0)}}
  .success-pulse{animation:successPulse 0.7s ease}
  @keyframes orbFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-13px)}}
  .orb-float{animation:orbFloat 6s ease-in-out infinite}
  @keyframes orbSlideIn{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}
  .orb-slide{animation:orbSlideIn 1s cubic-bezier(.16,1,.3,1) both}
  @keyframes formSlideIn{from{opacity:0;transform:translateX(-40px)}to{opacity:1;transform:translateX(0)}}
  .form-slide{animation:formSlideIn 1s cubic-bezier(.16,1,.3,1) 0.1s both}
  @keyframes goldPulse{0%,100%{opacity:0.5;transform:scale(1)}50%{opacity:1;transform:scale(1.05)}}
  .gold-badge{animation:goldPulse 3s ease-in-out infinite}
  input,textarea,select{color:#fff!important;background:transparent!important}
  input::placeholder,textarea::placeholder{color:rgba(255,255,255,0.3)!important}
  option{color:#111;background:#fff}
  .role-pill{
    flex:1;padding:10px;border-radius:10px;font-size:13px;font-weight:600;
    cursor:pointer;text-align:center;transition:all 0.2s ease;
    border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.03);
    color:rgba(255,255,255,0.45);font-family:'Inter',sans-serif;
  }
  .role-pill:hover{background:rgba(255,255,255,0.07);color:rgba(255,255,255,0.75)}
  .role-pill.active{background:rgba(255,215,0,0.1);border-color:rgba(255,215,0,0.4);color:#ffd700}
`;

const Signup = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', confirmPassword: '', phone: '', role: 'buyer',
  });
  const [error, setError] = useState('');
  const [submitState, setSubmitState] = useState('idle');
  const [loading, setLoading] = useState(false);
  const [particleBurst, setParticleBurst] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const formRef = useRef(null);

  const handleChange = (e) => { setFormData({ ...formData, [e.target.name]: e.target.value }); setError(''); };

  const triggerParticles = () => {
    setParticleBurst(true);
    setTimeout(() => setParticleBurst(false), 1000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match'); setSubmitState('error');
      formRef.current?.classList.add('error-shake');
      setTimeout(() => { formRef.current?.classList.remove('error-shake'); setSubmitState('idle'); }, 500);
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long'); setSubmitState('error');
      formRef.current?.classList.add('error-shake');
      setTimeout(() => { formRef.current?.classList.remove('error-shake'); setSubmitState('idle'); }, 500);
      return;
    }
    setSubmitState('loading'); setLoading(true);
    try {
      const { confirmPassword, ...signupData } = formData;
      const response = await authAPI.signup(signupData);
      if (response.data.success) {
        setSubmitState('success'); triggerParticles();
        setTimeout(() => navigate('/login', { state: { message: 'Account created! Welcome to Botify.' } }), 1000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed. Please try again.');
      setSubmitState('error');
      formRef.current?.classList.add('error-shake');
      setTimeout(() => { formRef.current?.classList.remove('error-shake'); setSubmitState('idle'); }, 500);
    } finally { setLoading(false); }
  };

  const inputCls = (field) =>
    `w-full px-4 py-3 rounded-xl text-[14px] text-white outline-none transition-all duration-300
    bg-white/[0.05] border ${focusedField === field ? 'border-[#ffd700]/60 input-focused' : 'border-white/10'}
    placeholder-white/30 focus:bg-white/[0.08]`;

  return (
    <div className="relative min-h-screen bg-[#050505] overflow-hidden text-white antialiased"
      style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{SIGNUP_STYLES}</style>

      {/* dot grid */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(#222_1px,transparent_1px)] bg-[size:30px_30px] opacity-30 pointer-events-none" />
      <StarfieldCanvas count={50} opacity={0.8} />

      {/* ── SPLIT SCREEN ── */}
      <div className="relative z-10 flex min-h-screen">

        {/* ════ LEFT HALF — Form ════ */}
        <div className="flex flex-1 items-center justify-center px-6 py-20 lg:py-12 form-slide">
          <div ref={formRef} className="w-full max-w-md relative">

            {/* gold top accent */}
            <div className="absolute top-0 left-0 right-0 h-[1px] rounded-t-2xl"
              style={{ background: 'linear-gradient(90deg, transparent, #ffd700, transparent)' }} />

            <ParticleBurst active={particleBurst} success={submitState === 'success'} />

            <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-8 sm:p-10">

              {/* Header */}
              <div className="text-center mb-7 fade-up fade-up-1">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4"
                  style={{ background: 'linear-gradient(135deg,rgba(255,215,0,0.15),rgba(255,215,0,0.05))', border: '1px solid rgba(255,215,0,0.25)' }}>
                  <span className="text-xl">🚀</span>
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-white mb-1">{t('signup.title')}</h1>
                <p className="text-[13px] text-white/40">{t('signup.subtitle')}</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] fade-up"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
                    <span>⚠</span> {error}
                  </div>
                )}

                <div className="fade-up fade-up-2">
                  <label className="block text-[11px] font-semibold uppercase tracking-widest text-white/40 mb-2">{t('signup.fullName')}</label>
                  <input id="name" name="name" type="text" required value={formData.name} onChange={handleChange}
                    onFocus={() => setFocusedField('name')} onBlur={() => setFocusedField(null)}
                    className={inputCls('name')} placeholder="John Doe" />
                </div>

                <div className="fade-up fade-up-2">
                  <label className="block text-[11px] font-semibold uppercase tracking-widest text-white/40 mb-2">{t('signup.emailLabel')}</label>
                  <input id="email" name="email" type="email" required value={formData.email} onChange={handleChange}
                    onFocus={() => setFocusedField('email')} onBlur={() => setFocusedField(null)}
                    className={inputCls('email')} placeholder="you@example.com" />
                </div>

                <div className="fade-up fade-up-2">
                  <label className="block text-[11px] font-semibold uppercase tracking-widest text-white/40 mb-2">
                    {t('signup.phone')} <span className="normal-case text-white/25 tracking-normal">{t('signup.phoneOptional')}</span>
                  </label>
                  <input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleChange}
                    onFocus={() => setFocusedField('phone')} onBlur={() => setFocusedField(null)}
                    className={inputCls('phone')} placeholder="+1 234 567 8900" />
                </div>

                <div className="fade-up fade-up-2">
                  <label className="block text-[11px] font-semibold uppercase tracking-widest text-white/40 mb-2">{t('signup.iWantTo')}</label>
                  <div className="flex gap-3">
                    <button type="button" className={`role-pill${formData.role === 'buyer' ? ' active' : ''}`}
                      onClick={() => setFormData({ ...formData, role: 'buyer' })}>🛒 {t('signup.buyBots')}</button>
                    <button type="button" className={`role-pill${formData.role === 'seller' ? ' active' : ''}`}
                      onClick={() => setFormData({ ...formData, role: 'seller' })}>💼 {t('signup.sellBots')}</button>
                  </div>
                  <select name="role" value={formData.role} onChange={handleChange} style={{ display: 'none' }}>
                    <option value="buyer">buyer</option>
                    <option value="seller">seller</option>
                  </select>
                </div>

                <div className="fade-up fade-up-2">
                  <label className="block text-[11px] font-semibold uppercase tracking-widest text-white/40 mb-2">{t('signup.passwordLabel')}</label>
                  <input id="password" name="password" type="password" required value={formData.password} onChange={handleChange}
                    onFocus={() => setFocusedField('password')} onBlur={() => setFocusedField(null)}
                    className={inputCls('password')} placeholder="••••••••" />
                </div>

                <div className="fade-up fade-up-2">
                  <label className="block text-[11px] font-semibold uppercase tracking-widest text-white/40 mb-2">{t('signup.confirmPassword')}</label>
                  <input id="confirmPassword" name="confirmPassword" type="password" required value={formData.confirmPassword} onChange={handleChange}
                    onFocus={() => setFocusedField('confirmPassword')} onBlur={() => setFocusedField(null)}
                    className={inputCls('confirmPassword')} placeholder="••••••••" />
                </div>

                <div className="fade-up fade-up-3 pt-1">
                  <button type="submit" disabled={loading}
                    className={`w-full py-3.5 rounded-xl text-[14px] font-semibold tracking-wide transition-all duration-300
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
                        {t('signup.creatingAccount')}
                      </span>
                    )}
                    {submitState === 'success' && <span className="flex items-center justify-center gap-2">✓ {t('signup.accountCreated')}</span>}
                    {submitState === 'error' && <span>{t('signup.pleaseTryAgain')}</span>}
                    {submitState === 'idle' && t('signup.createAccount')}
                  </button>
                </div>

                <p className="text-center text-[13px] text-white/40 fade-up fade-up-3">
                  {t('signup.alreadyHaveAccount')}{' '}
                  <Link to="/login" className="font-semibold text-[#ffd700]/80 hover:text-[#ffd700] transition-colors">
                    {t('signup.signIn')}
                  </Link>
                </p>
              </form>
            </div>

            {/* bottom glow */}
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-3/4 h-16 pointer-events-none"
              style={{ background: 'rgba(255,215,0,0.06)', filter: 'blur(24px)', borderRadius: '50%' }} />
          </div>
        </div>

        {/* ════ RIGHT HALF — Orb + Branding ════ */}
        <div className="hidden lg:flex flex-col items-center justify-center w-1/2 relative overflow-hidden orb-slide">

          {/* ambient glow */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 80% 70% at 50% 50%, rgba(255,215,0,0.04) 0%, transparent 70%)' }} />

          {/* vertical divider on left edge */}
          <div className="absolute left-0 top-[10%] bottom-[10%] w-px"
            style={{ background: 'linear-gradient(to bottom, transparent, rgba(255,215,0,0.2), rgba(255,255,255,0.06), transparent)' }} />

          {/* FluidOrb */}
          <div className="relative w-[520px] h-[520px] orb-float">
            <CSSOrb size={420} />
          </div>

          {/* Branding */}
          <div className="absolute bottom-16 left-0 right-0 text-center px-12">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/25 mb-3">{t('signup.join')}</p>
            <div className="flex justify-center mb-4">
              <Logo size="lg" />
            </div>
            <p className="text-[13px] text-white/35 leading-relaxed max-w-xs mx-auto">
              {t('signup.tagline')}
            </p>
            <div className="flex justify-center gap-8 mt-8">
              {[['500+', 'Bots'], ['10K+', 'Users'], ['99.9%', 'Uptime']].map(([val, lbl]) => (
                <div key={lbl} className="text-center">
                  <div className="text-lg font-bold text-[#ffd700] gold-badge">{val}</div>
                  <div className="text-[11px] text-white/30 mt-0.5">{lbl}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
