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
  const [accessModal, setAccessModal] = useState({ open: false, loading: false, bot: null, resource: null });
  const [accessError, setAccessError] = useState('');

  useEffect(() => {
    fetchBots();
    fetchPurchases();
  }, []);

  const fetchBots = async () => {
    try {
      setLoading(true);
      const response = await botAPI.listBots();
      if (response.data.success) {
        setBots(response.data.bots || []);
      }
    } catch (err) {
      console.error('Failed to fetch bots:', err);
      setError(err.response?.data?.message || 'Failed to fetch bots.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchases = async () => {
    try {
      const response = await marketplaceAPI.getMyPurchases();
      if (response.data.success) {
        setPurchases(response.data.purchases || []);
      }
    } catch (err) {
      console.error('Failed to fetch purchases:', err);
      // silently fail for purchases
    }
  };

  const handleViewPurchasedBot = async (purchase) => {
    const bot = purchase?.marketplace_bots;
    const botId = purchase?.marketplace_bot_id || bot?.id;

    if (!botId) {
      setError('Unable to open bot details. Missing bot id.');
      return;
    }

    setAccessError('');
    setAccessModal({ open: true, loading: true, bot, resource: null });

    try {
      const res = await marketplaceAPI.getBotAccess(botId);
      if (res.data.success) {
        setAccessModal({ open: true, loading: false, bot, resource: res.data.bot });
      } else {
        setAccessModal({ open: true, loading: false, bot, resource: null });
      }
    } catch (err) {
      setAccessError(err.response?.data?.message || 'Failed to load purchased bot access details.');
      setAccessModal({ open: true, loading: false, bot, resource: null });
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-10 fade-up" style={{ animationDelay: '0.2s' }}>
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
              <p className="text-[11px] text-white/40">Automated responses</p>
            </div>
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </Link>
          <Link to="/email-forwarding" className="glass-card p-5 group flex items-center justify-between hover:border-indigo-500/40">
            <div>
              <p className="text-[13px] font-bold mb-1">Email Forwarding</p>
              <p className="text-[11px] text-white/40">Configure routing</p>
            </div>
            <span className="transition-transform group-hover:translate-x-1 text-indigo-400">→</span>
          </Link>
          <button onClick={fetchBots} className="glass-card p-5 group flex items-center justify-between hover:border-[#ffd700]/40">
            <div>
              <p className="text-[13px] font-bold mb-1">Sync Systems</p>
              <p className="text-[11px] text-white/40">Refresh all data</p>
            </div>
            <span className="transition-transform group-hover:rotate-180 duration-500">↻</span>
          </button>
        </div>

        {/* My Bots Table */}
        <div className="glass-card overflow-hidden fade-up mb-12" style={{ animationDelay: '0.3s' }}>
          <div className="px-6 py-5 border-b border-white/5 flex justify-between items-center">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-white/50">My Integrated Bots</h2>
            <div className="flex gap-3">
               <Link to="/email-forwarding" className="text-[10px] font-bold px-4 py-1.5 rounded-full border border-white/10 text-white/40 hover:text-white hover:bg-white/5 transition-all flex items-center gap-2">
                 <span>📩</span> Forwarding
               </Link>
               <Link to="/email-bot" className="text-[10px] font-bold px-4 py-1.5 rounded-full bg-[#ffd700] text-[#050505] hover:scale-105 transition-all">
                 + New Bot
               </Link>
            </div>
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
                const platformIcons = { email: '📧', whatsapp: '💬', telegram: '✈️', discord: '🎮', slack: '💼', instagram: '📸' };
                return (
                  <button key={purchase.id} onClick={() => handleViewPurchasedBot(purchase)}
                    className="glass-card p-5 group flex items-start justify-between text-left transition-all hover:border-[#ffd700]/40">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-lg group-hover:bg-[#ffd700]/10 transition-colors">
                        {platformIcons[bot?.platform] || '🤖'}
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-white/90 group-hover:text-[#ffd700] transition-colors">{bot?.name || 'Bot Instance'}</h3>
                        <p className="text-[10px] text-white/30 uppercase tracking-tighter mt-0.5">
                          {bot?.platform} • {new Date(purchase.purchased_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                       <div className="text-[11px] font-mono text-[#ffd700] bg-[#ffd700]/5 px-2 py-1 rounded-md border border-[#ffd700]/10">
                         ${parseFloat(purchase.amount).toFixed(2)}
                       </div>
                       <span className="text-[9px] font-bold text-white/20 group-hover:text-white/40 uppercase tracking-widest transition-colors">Access →</span>
                    </div>
                  </button>
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-white/90">{bot?.name || 'Bot Instance'}</h3>
                        <p className="text-[10px] text-white/30 uppercase tracking-tighter mt-0.5">
                          {bot?.platform} • {new Date(purchase.purchased_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="text-[11px] font-mono text-[#ffd700] bg-[#ffd700]/5 px-2 py-1 rounded-md border border-[#ffd700]/10">
                        ${parseFloat(purchase.amount).toFixed(2)}
                      </div>
                      <span className="text-[9px] font-bold text-white/20 group-hover:text-white/40 uppercase tracking-widest transition-colors">Access →</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Purchased Bot Access Modal */}
        {accessModal.open && (
          <div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => {
              setAccessModal({ open: false, loading: false, bot: null, resource: null });
              setAccessError('');
            }}
          >
            <div
              className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{accessModal.bot?.name || 'Purchased Bot'}</h3>
                  <p className="text-sm text-gray-500">Access details provided by the seller</p>
                </div>
                <button
                  onClick={() => {
                    setAccessModal({ open: false, loading: false, bot: null, resource: null });
                    setAccessError('');
                  }}
                  className="text-gray-500 hover:text-gray-800 text-2xl leading-none"
                >
                  &times;
                </button>
              </div>

              <div className="p-6 space-y-5">
                {accessError && (
                  <div className="px-4 py-3 rounded-lg border bg-red-50 border-red-200 text-red-700 text-sm">
                    {accessError}
                  </div>
                )}

                {accessModal.loading ? (
                  <div className="py-8 text-center">
                    <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
                    <p className="mt-3 text-sm text-gray-500">Loading bot details...</p>
                  </div>
                ) : (
                  <>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Description</h4>
                      <p className="text-sm text-gray-700">
                        {accessModal.bot?.description || 'No description provided.'}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {accessModal.bot?.category && (
                        <span className="px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs font-medium">
                          {accessModal.bot.category}
                        </span>
                      )}
                      {accessModal.bot?.status && (
                        <span className="px-2 py-1 rounded bg-green-50 text-green-700 text-xs font-medium">
                          {accessModal.bot.status}
                        </span>
                      )}
                      <span className="px-2 py-1 rounded bg-gray-100 text-gray-700 text-xs font-medium">
                        {accessModal.bot?.platform || accessModal.resource?.platform || 'unknown'}
                      </span>
                    </div>

                    {Array.isArray(accessModal.bot?.features) && accessModal.bot.features.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-2">Features</h4>
                        <div className="flex flex-wrap gap-2">
                          {accessModal.bot.features.map((feature, idx) => (
                            <span key={`modal-feature-${idx}`} className="px-2 py-1 rounded bg-gray-100 text-gray-700 text-xs">
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">GitHub Link</h4>
                      {accessModal.resource?.github_link ? (
                        <a
                          href={accessModal.resource.github_link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800 underline break-all"
                        >
                          {accessModal.resource.github_link}
                        </a>
                      ) : (
                        <p className="text-sm text-gray-500">No GitHub link provided.</p>
                      )}
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Script</h4>
                      {accessModal.resource?.bot_script ? (
                        <pre className="text-xs bg-gray-900 text-green-200 p-4 rounded-lg overflow-auto max-h-72 whitespace-pre-wrap">
                          {accessModal.resource.bot_script}
                        </pre>
                      ) : (
                        <p className="text-sm text-gray-500">No script provided.</p>
                      )}
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Configuration</h4>
                      {accessModal.resource?.config_json && Object.keys(accessModal.resource.config_json).length > 0 ? (
                        <pre className="text-xs bg-gray-100 text-gray-800 p-4 rounded-lg overflow-auto max-h-72 whitespace-pre-wrap">
                          {JSON.stringify(accessModal.resource.config_json, null, 2)}
                        </pre>
                      ) : (
                        <p className="text-sm text-gray-500">No additional configuration provided.</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BuyerDashboard;
