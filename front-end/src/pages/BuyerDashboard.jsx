import { useState, useEffect, memo } from 'react';
import { Link } from 'react-router-dom';
import { botAPI, marketplaceAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import BotTable from '../components/BotTable';
import FluidOrb from '../components/FluidOrb';

/* ── Starfield (reused from Auth/Landing) ── */
const Starfield = memo(() => {
  const [stars] = useState(() =>
    Array.from({ length: 100 }, (_, i) => ({
      id: i, left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
      size: `${Math.random() * 1.8 + 0.4}px`, animDelay: `${Math.random() * 5}s`,
      animDur: `${Math.random() * 4 + 2}s`, opacity: Math.random() * 0.4 + 0.3,
    }))
  );
  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-60">
      {stars.map(s => (
        <div key={s.id} className="absolute bg-white rounded-full animate-twinkle"
          style={{ left: s.left, top: s.top, width: s.size, height: s.size,
            opacity: s.opacity, animationDelay: s.animDelay, animationDuration: s.animDur }} />
      ))}
    </div>
  );
});

const DASHBOARD_STYLES = `
  @keyframes twinkle { 0%,100%{opacity:0.1;transform:scale(0.8)} 50%{opacity:1;transform:scale(1.1);box-shadow:0 0 8px 1px rgba(255,255,255,0.3)} }
  .animate-twinkle{animation:twinkle ease-in-out infinite}
  @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
  .fade-up{animation:fadeUp 0.6s cubic-bezier(.16,1,.3,1) both}
  .glass-card {
    background: rgba(255, 255, 255, 0.035);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 20px;
    transition: all 0.3s ease;
  }
  .glass-card:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 215, 0, 0.2);
    transform: translateY(-4px);
  }
  .stat-glow {
    text-shadow: 0 0 15px rgba(255, 215, 0, 0.3);
  }
`;

const BuyerDashboard = () => {
  const { user } = useAuth();
  const [bots, setBots] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchBots();
    fetchPurchases();
  }, []);

  const fetchBots = async () => {
    try {
      setLoading(true);
      const response = await botAPI.listBots();
      if (response.data.success) {
        setBots(response.data.bots);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch bots.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchases = async () => {
    try {
      const response = await marketplaceAPI.getMyPurchases();
      if (response.data.success) {
        setPurchases(response.data.purchases);
      }
    } catch (err) {
      // silently fail
    }
  };

  const activeBots = bots.filter((b) => b.is_active).length;

  return (
    <div className="min-h-screen bg-[#050505] text-white relative overflow-hidden pb-20" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{DASHBOARD_STYLES}</style>
      <Starfield />

      {/* Ambient Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] opacity-20 pointer-events-none">
        <FluidOrb />
      </div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] opacity-10 pointer-events-none">
        <FluidOrb />
      </div>

      <div className="max-w-7xl mx-auto px-6 sm:px-8 pt-12 relative z-10">
        <div className="mb-10 fade-up">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#ffd700]/10 border border-[#ffd700]/20 text-[#ffd700] text-[10px] font-bold uppercase tracking-wider">Buyer</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Dashboard</h1>
          <p className="text-white/40 text-[14px]">Welcome back, <span className="text-white/80 font-medium">{user?.name}</span>. Here's your bot command center.</p>
        </div>

        {error && (
          <div className="mb-8 px-5 py-4 rounded-2xl glass-card border-red-500/20 bg-red-500/5 text-red-400 text-sm flex items-center justify-between fade-up">
            <span>{error}</span>
            <button onClick={() => setError('')} className="opacity-50 hover:opacity-100">&times;</button>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          {[
            { label: 'My Bots', value: bots.length, color: '#ffd700', icon: '🤖' },
            { label: 'Active Bots', value: activeBots, color: '#4ade80', icon: '⚡' },
            { label: 'Purchases', value: purchases.length, color: '#a78bfa', icon: '🛒' },
            { label: 'Inactive', value: bots.length - activeBots, color: '#94a3b8', icon: '🛡️' }
          ].map((stat, idx) => (
            <div key={idx} className="glass-card p-6 fade-up" style={{ animationDelay: `${idx * 0.05}s` }}>
              <div className="flex justify-between items-start mb-4">
                <span className="text-[20px]">{stat.icon}</span>
                <span className="text-[11px] font-semibold uppercase tracking-widest text-white/30">{stat.label}</span>
              </div>
              <p className="text-3xl font-bold stat-glow" style={{ color: stat.color }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Action Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10 fade-up" style={{ animationDelay: '0.2s' }}>
          <Link to="/marketplace" className="glass-card p-5 group flex items-center justify-between hover:border-[#ffd700]/40">
            <div>
              <p className="text-[13px] font-bold mb-1">Explore Marketplace</p>
              <p className="text-[11px] text-white/40">Discover elite bots</p>
            </div>
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </Link>
          <Link to="/email-bot" className="glass-card p-5 group flex items-center justify-between hover:border-[#ffd700]/40">
            <div>
              <p className="text-[13px] font-bold mb-1">Email Bot Manager</p>
              <p className="text-[11px] text-white/40">Manage email automated responses</p>
            </div>
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </Link>
          <button onClick={fetchBots} className="glass-card p-5 group flex items-center justify-between hover:border-[#ffd700]/40">
            <div>
              <p className="text-[13px] font-bold mb-1">Sync Systems</p>
              <p className="text-[11px] text-white/40">Refresh all bot data</p>
            </div>
            <span className="transition-transform group-hover:rotate-180 duration-500">↻</span>
          </button>
        </div>

        {/* My Bots Table */}
        <div className="glass-card overflow-hidden fade-up" style={{ animationDelay: '0.3s' }}>
          <div className="px-6 py-5 border-b border-white/5 flex justify-between items-center">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-white/50">My Integrated Bots</h2>
            <Link to="/email-bot" className="text-[11px] font-bold px-4 py-1.5 rounded-full bg-[#ffd700] text-[#050505] hover:scale-105 transition-all">
              + New Bot
            </Link>
          </div>
          <div className="p-2">
            <BotTable
              bots={bots}
              loading={loading}
              emptyMessage="Hyper-automation starts here. Deploy your first bot."
              emptyLinkText="Get Started"
              emptyLinkTo="/email-bot"
              showManage={true}
            />
          </div>
        </div>

        {/* Purchased Bots Section */}
        <div className="mt-12 fade-up" style={{ animationDelay: '0.4s' }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-white/50">Marketplace Acquisitions</h2>
            <Link to="/marketplace" className="text-[11px] font-bold text-[#ffd700] hover:underline">Browse More</Link>
          </div>

          {purchases.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <p className="text-white/30 text-sm mb-5">Your collection is empty.</p>
              <Link to="/marketplace" className="inline-block px-6 py-2 rounded-xl border border-[#ffd700]/20 text-[#ffd700] text-xs font-bold hover:bg-[#ffd700]/5 transition-all">
                Enter the Marketplace
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {purchases.map((purchase) => {
                const bot = purchase.marketplace_bots;
                const platformIcons = { email: '📧', whatsapp: '💬', telegram: '✈️', discord: '🎮' };
                return (
                  <div key={purchase.id} className="glass-card p-5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-lg">
                        {platformIcons[bot?.platform] || '🤖'}
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-white/90">{bot?.name || 'Bot Instance'}</h3>
                        <p className="text-[10px] text-white/30 uppercase tracking-tighter mt-0.5">
                          {bot?.platform} • {new Date(purchase.purchased_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-[11px] font-mono text-[#ffd700] bg-[#ffd700]/5 px-2 py-1 rounded-md border border-[#ffd700]/10">
                      ${parseFloat(purchase.amount).toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BuyerDashboard;
