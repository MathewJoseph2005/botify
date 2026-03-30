import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

/* ── inline keyframes so the navbar needs zero extra CSS files ────────────── */
const NAV_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

  /* scroll-in */
  @keyframes navSlideDown {
    from { opacity: 0; transform: translateY(-18px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .nav-enter { animation: navSlideDown 0.55s cubic-bezier(.16,1,.3,1) both; }

  /* gold shimmer on logo */
  @keyframes logoShimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }
  .logo-shimmer {
    background: linear-gradient(90deg, #ffd700 30%, #fff6a0 50%, #ffd700 70%);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: logoShimmer 3.5s linear infinite;
  }

  /* active link gold underline */
  .nav-link { position: relative; }
  .nav-link::after {
    content: '';
    position: absolute;
    bottom: -3px;
    left: 0;
    width: 0;
    height: 2px;
    background: #ffd700;
    border-radius: 99px;
    transition: width 0.25s ease;
  }
  .nav-link:hover::after,
  .nav-link.active::after { width: 100%; }

  /* mobile menu slide */
  @keyframes mobileOpen {
    from { opacity: 0; transform: translateY(-8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .mobile-open { animation: mobileOpen 0.25s ease both; }

  /* avatar pulse ring */
  @keyframes avatarPulse {
    0%,100% { box-shadow: 0 0 0 0 rgba(255,215,0,0.35); }
    50%      { box-shadow: 0 0 0 6px rgba(255,215,0,0); }
  }
  .avatar-ring { animation: avatarPulse 2.5s ease infinite; }

  /* scrolled glass */
  .navbar-glass {
    background: rgba(5,5,5,0.55);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    border-bottom: 1px solid rgba(255,255,255,0.07);
    transition: background 0.4s ease, box-shadow 0.4s ease, border-color 0.4s ease;
  }
  .navbar-glass.scrolled {
    background: rgba(5,5,5,0.82);
    border-bottom-color: rgba(255,215,0,0.12);
    box-shadow: 0 4px 40px rgba(0,0,0,0.5);
  }

  /* pill badge for user role */
  .role-badge {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    padding: 2px 7px;
    border-radius: 999px;
    text-transform: uppercase;
    background: rgba(255,215,0,0.12);
    border: 1px solid rgba(255,215,0,0.28);
    color: #ffd700;
  }
`;

/* ── nav link items ───────────────────────────────────────────────────────── */
const NAV_PUBLIC = [
  { to: '/marketplace', label: 'Marketplace', icon: '🛒' },
  { to: '/faq', label: 'FAQ', icon: '❓' },
];
const NAV_AUTH = [
  { to: '/dashboard', label: 'Dashboard', icon: '🎛️', roles: [1, 2, 3] },
  { to: '/email-bot', label: 'Email Bot', icon: '✉️', roles: [1, 2, 3] },
  { to: '/whatsapp-bot', label: 'WhatsApp', icon: '📱', roles: [1, 2, 3] },
  { to: '/email-forwarding', label: 'Forwarding', icon: '📨', roles: [2, 3] },
];

/* ── role label helper ───────────────────────────────────────────────────── */
const roleLabel = (roleId) => {
  const map = { 1: 'Admin', 2: 'Seller', 3: 'Buyer' };
  return map[roleId] || 'User';
};

/* ── initials avatar ─────────────────────────────────────────────────────── */
const Avatar = ({ name }) => {
  const initials = (name || 'U')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
  return (
    <div
      className="avatar-ring flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold text-[#050505] flex-shrink-0"
      style={{ background: 'linear-gradient(135deg,#ffd700,#ffe066)' }}
    >
      {initials}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════ */
const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuth();
  const { t, language, changeLanguage } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  const languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
    { code: 'ml', name: 'മലയാളം', flag: '🇮🇳' },
    { code: 'ta', name: 'தமிழ்', flag: '🇮🇳' },
  ];

  /* scroll detection */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* close mobile menu on route change */
  useEffect(() => {
    setMobileOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  const handleLogout = () => {
    logout();
    setMobileOpen(false);
    setUserMenuOpen(false);
    navigate('/');
  };

  const links = [
    ...NAV_PUBLIC,
    ...(isAuthenticated
      ? NAV_AUTH.filter((item) => !item.roles || item.roles.includes(user?.role_id))
      : []),
  ];

  return (
    <>
      <style>{NAV_STYLES}</style>

      <nav
        className={`sticky top-0 z-50 nav-enter navbar-glass${scrolled ? ' scrolled' : ''}`}
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-[60px]">

            {/* ── LOGO ────────────────────────────────────────────────── */}
            <Link to="/" className="flex items-center gap-2 group" onClick={() => setMobileOpen(false)}>
              {/* orb dot */}
              <div
                className="w-7 h-7 rounded-full flex-shrink-0"
                style={{
                  background: 'radial-gradient(circle at 35% 35%, #ffe066, #ffd700 55%, #b8860b)',
                  boxShadow: '0 0 14px rgba(255,215,0,0.5)',
                }}
              />
              <span className="text-xl font-bold logo-shimmer tracking-tight">Botify</span>
            </Link>

            {/* ── DESKTOP NAV LINKS ───────────────────────────────────── */}
            <div className="hidden md:flex items-center gap-1">
              {links.map(({ to, label, icon }) => (
                <Link
                  key={to}
                  to={to}
                  className={`nav-link flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-200
                    ${isActive(to)
                      ? 'text-[#ffd700] active'
                      : 'text-white/50 hover:text-white hover:bg-white/[0.06]'
                    }`}
                >
                  <span className="text-[13px] leading-none">{icon}</span>
                  {label}
                </Link>
              ))}
            </div>

            {/* ── DESKTOP RIGHT SIDE ──────────────────────────────────── */}
            <div className="hidden md:flex items-center gap-3">
              {isAuthenticated ? (
                <div className="relative">
                  {/* User trigger button */}
                  <button
                    onClick={() => setUserMenuOpen((v) => !v)}
                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition-all duration-200 hover:bg-white/[0.06] border border-transparent hover:border-white/10"
                  >
                    <Avatar name={user?.name} />
                    <div className="text-left">
                      <p className="text-[13px] font-semibold text-white/90 leading-tight">{user?.name}</p>
                      <span className="role-badge">{roleLabel(user?.role_id)}</span>
                    </div>
                    {/* chevron */}
                    <svg
                      className={`w-3.5 h-3.5 text-white/30 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown */}
                  {userMenuOpen && (
                    <div
                      className="absolute right-0 top-full mt-2 w-52 rounded-2xl border border-white/10 shadow-2xl overflow-hidden mobile-open"
                      style={{ background: 'rgba(15,15,15,0.95)', backdropFilter: 'blur(20px)' }}
                    >
                      {/* user info header */}
                      <div className="px-4 py-3 border-b border-white/[0.06]">
                        <p className="text-[12px] text-white/40 mb-0.5">Signed in as</p>
                        <p className="text-[13px] font-semibold text-white truncate">{user?.name}</p>
                        <p className="text-[11px] text-white/30 truncate">{user?.email}</p>
                      </div>

                      {/* menu items */}
                      <div className="p-1.5">
                        <Link
                          to="/dashboard"
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] text-white/70 hover:text-white hover:bg-white/[0.07] transition-all"
                        >
                          <span>🎛️</span> Dashboard
                        </Link>
                        <Link
                          to="/email-bot"
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] text-white/70 hover:text-white hover:bg-white/[0.07] transition-all"
                        >
                          <span>✉️</span> Email Bot
                        </Link>
                        <Link
                          to="/whatsapp-bot"
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] text-white/70 hover:text-white hover:bg-white/[0.07] transition-all"
                        >
                          <span>📱</span> WhatsApp Bot
                        </Link>
                        {(user?.role_id === 2 || user?.role_id === 3) && (
                          <Link
                            to="/email-forwarding"
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] text-white/70 hover:text-white hover:bg-white/[0.07] transition-all"
                          >
                            <span>📨</span> Forwarding Bot
                          </Link>
                        )}
                      </div>

                      {/* logout */}
                      <div className="p-1.5 border-t border-white/[0.06]">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Sign out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {/* Language Selector */}
                  <div className="relative">
                    <button
                      onClick={() => setLangMenuOpen((v) => !v)}
                      className="px-3 py-1.5 text-[13px] font-semibold text-white/60 hover:text-white transition-colors rounded-lg hover:bg-white/[0.06] flex items-center gap-1"
                    >
                      <span className="text-sm">{languages.find(l => l.code === language)?.flag}</span>
                      {language.toUpperCase()}
                    </button>
                    {langMenuOpen && (
                      <div
                        className="absolute right-0 top-full mt-2 w-40 rounded-xl border border-white/10 shadow-2xl overflow-hidden mobile-open"
                        style={{ background: 'rgba(15,15,15,0.95)', backdropFilter: 'blur(20px)' }}
                      >
                        {languages.map((lang) => (
                          <button
                            key={lang.code}
                            onClick={() => {
                              changeLanguage(lang.code);
                              setLangMenuOpen(false);
                            }}
                            className={`w-full px-3 py-2 text-left text-[13px] flex items-center gap-2 transition-all ${
                              language === lang.code
                                ? 'text-[#ffd700] bg-white/[0.1]'
                                : 'text-white/60 hover:text-white hover:bg-white/[0.06]'
                            }`}
                          >
                            <span className="text-sm">{lang.flag}</span>
                            {lang.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <Link
                    to="/login"
                    className="px-4 py-1.5 text-[13px] font-semibold text-white/60 hover:text-white transition-colors rounded-lg hover:bg-white/[0.06]"
                  >
                    Log in
                  </Link>
                  <Link
                    to="/signup"
                    className="px-4 py-1.5 text-[13px] font-semibold text-[#050505] rounded-xl transition-all duration-200 hover:scale-[1.04] active:scale-[0.97]"
                    style={{
                      background: 'linear-gradient(135deg,#ffd700,#ffe066)',
                      boxShadow: '0 0 18px rgba(255,215,0,0.35)',
                    }}
                  >
                    Get started
                  </Link>
                </div>
              )}
            </div>

            {/* ── MOBILE HAMBURGER ────────────────────────────────────── */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl border border-white/10 text-white/70 hover:text-white hover:bg-white/[0.07] transition-all"
              aria-label="Toggle menu"
            >
              {mobileOpen ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* ── MOBILE MENU ─────────────────────────────────────────────── */}
        {mobileOpen && (
          <div
            className="md:hidden mobile-open border-t border-white/[0.06]"
            style={{ background: 'rgba(8,8,8,0.97)', backdropFilter: 'blur(20px)' }}
          >
            <div className="px-4 py-3 space-y-1">
              {links.map(({ to, label, icon }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-medium transition-all
                    ${isActive(to)
                      ? 'text-[#ffd700] bg-[rgba(255,215,0,0.08)] border border-[rgba(255,215,0,0.15)]'
                      : 'text-white/60 hover:text-white hover:bg-white/[0.06]'
                    }`}
                >
                  <span className="text-base">{icon}</span>
                  {label}
                </Link>
              ))}
            </div>

            {/* mobile auth section */}
            <div className="px-4 py-3 border-t border-white/[0.06]">
              {isAuthenticated ? (
                <>
                  {/* user info */}
                  <div className="flex items-center gap-3 px-3 py-2.5 mb-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <Avatar name={user?.name} />
                    <div>
                      <p className="text-[13px] font-semibold text-white/90 leading-tight">{user?.name}</p>
                      <span className="role-badge">{roleLabel(user?.role_id)}</span>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign out
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-2">
                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-center py-2.5 px-4 rounded-xl text-[14px] font-semibold text-white/70 border border-white/10 hover:text-white hover:bg-white/[0.06] transition-all"
                  >
                    Log in
                  </Link>
                  <Link
                    to="/signup"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-center py-2.5 px-4 rounded-xl text-[14px] font-bold text-[#050505] transition-all"
                    style={{
                      background: 'linear-gradient(135deg,#ffd700,#ffe066)',
                      boxShadow: '0 0 18px rgba(255,215,0,0.3)',
                    }}
                  >
                    Get started
                  </Link>
                </div>
              )}
            </div>

            {/* bottom gold line */}
            <div className="h-[1px] w-full" style={{ background: 'linear-gradient(90deg,transparent,rgba(255,215,0,0.2),transparent)' }} />
          </div>
        )}

        {/* backdrop – close user dropdown when clicking outside */}
        {userMenuOpen && (
          <div className="fixed inset-0 z-[-1]" onClick={() => setUserMenuOpen(false)} />
        )}
      </nav>
    </>
  );
};

export default Navbar;
