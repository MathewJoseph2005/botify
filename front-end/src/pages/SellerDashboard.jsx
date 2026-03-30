import { useState, useEffect, memo } from 'react';
import { Link } from 'react-router-dom';
import { botAPI, marketplaceAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import BotTable from '../components/BotTable';
import ConfirmModal from '../components/ConfirmModal';
import FluidOrb from '../components/FluidOrb';
import SellerWalletDashboard from '../components/SellerWalletDashboard';

/* ── Starfield (reused) ── */
const Starfield = memo(() => {
  const [stars] = useState(() =>
    Array.from({ length: 110 }, (_, i) => ({
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
  .stat-glow { text-shadow: 0 0 15px rgba(255, 215, 0, 0.3); }
`;

const SellerDashboard = () => {
  const { user } = useAuth();
  const [bots, setBots] = useState([]);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('bots'); // bots or wallet

  const [deleteModal, setDeleteModal] = useState({ open: false, botId: null });

  useEffect(() => {
    fetchBots();
    fetchListings();
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

  const fetchListings = async () => {
    try {
      const response = await marketplaceAPI.getMyListings();
      if (response.data.success) {
        setListings(response.data.listings);
      }
    } catch (err) {
      // silently fail for listings
    }
  };

  const handleDeleteBot = async (botId) => {
    setDeleteModal({ open: true, botId });
  };

  const confirmDeleteBot = async () => {
    const botId = deleteModal.botId;
    setDeleteModal({ open: false, botId: null });
    try {
      const response = await botAPI.deleteBot(botId);
      if (response.data.success) {
        await fetchBots();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete bot.');
    }
  };

  const activeBots = bots.filter((b) => b.is_active).length;
  const publishedListings = listings.filter((l) => l.status === 'published').length;
  const totalSales = listings.reduce((sum, l) => sum + (l.total_sales || 0), 0);

  return (
    <div className="min-h-screen bg-[#050505] text-white relative overflow-hidden pb-20" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{DASHBOARD_STYLES}</style>
      <Starfield />

      {/* Ambient Orbs */}
      <div className="absolute top-[-5%] right-[-5%] w-[450px] h-[450px] opacity-20 pointer-events-none">
        <FluidOrb />
      </div>
      <div className="absolute bottom-[-5%] left-[-5%] w-[350px] h-[350px] opacity-10 pointer-events-none">
        <FluidOrb />
      </div>

      <div className="max-w-7xl mx-auto px-6 sm:px-8 pt-12 relative z-10">
        <div className="mb-10 fade-up">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#ffd700]/10 border border-[#ffd700]/20 text-[#ffd700] text-[10px] font-bold uppercase tracking-wider">Seller</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Hub</h1>
          <p className="text-white/40 text-[14px]">Welcome back, <span className="text-white/80 font-medium">{user?.name}</span>. Manage your high-performance bots and revenue.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-10 p-1 rounded-2xl bg-white/5 w-fit fade-up" style={{ border: '1px solid rgba(255,255,255,0.05)' }}>
          <button onClick={() => setActiveTab('bots')}
            className={`px-8 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'bots' ? 'bg-[#ffd700] text-[#050505]' : 'text-white/40 hover:text-white hover:bg-white/5'}`}>
            My Bots
          </button>
          <button onClick={() => setActiveTab('wallet')}
            className={`px-8 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'wallet' ? 'bg-[#ffd700] text-[#050505]' : 'text-white/40 hover:text-white hover:bg-white/5'}`}>
            Wallet & Earnings
          </button>
        </div>

        {error && (
          <div className="mb-8 px-5 py-4 rounded-2xl glass-card border-red-500/20 bg-red-500/5 text-red-400 text-sm flex items-center justify-between fade-up">
            <span>{error}</span>
            <button onClick={() => setError('')} className="opacity-50 hover:opacity-100">&times;</button>
          </div>
        )}

        {activeTab === 'bots' && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
              {[
                { label: 'Bots', value: bots.length, color: '#ffd700', icon: '✉️' },
                { label: 'Active', value: activeBots, color: '#4ade80', icon: '🟢' },
                { label: 'Listings', value: listings.length, color: '#a78bfa', icon: '🏬' },
                { label: 'Published', value: publishedListings, color: '#2dd4bf', icon: '✅' },
                { label: 'Sales', value: totalSales, color: '#ffd700', icon: '💰' }
              ].map((stat, idx) => (
                <div key={idx} className="glass-card p-5 fade-up" style={{ animationDelay: `${idx * 0.05}s` }}>
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[18px]">{stat.icon}</span>
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-white/30 truncate ml-2">{stat.label}</span>
                  </div>
                  <p className="text-2xl font-bold stat-glow" style={{ color: stat.color }}>{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-10 fade-up" style={{ animationDelay: '0.2s' }}>
              <Link to="/email-bot" className="glass-card p-5 group flex items-center justify-between hover:border-[#ffd700]/40">
                <div>
                  <p className="text-[13px] font-bold mb-1">Email Bots</p>
                  <p className="text-[11px] text-white/40">Control Panel</p>
                </div>
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </Link>
              <Link to="/email-forwarding" className="glass-card p-5 group flex items-center justify-between hover:border-indigo-500/40">
                <div>
                  <p className="text-[13px] font-bold mb-1">Email Forwarding</p>
                  <p className="text-[11px] text-white/40">Routing Bot</p>
                </div>
                <span className="transition-transform group-hover:translate-x-1 text-indigo-400">→</span>
              </Link>
              <Link to="/seller/create-bot" className="glass-card p-5 group flex items-center justify-between hover:border-[#ffd700]/40">
                <div>
                  <p className="text-[13px] font-bold mb-1">Manifest Agent</p>
                  <p className="text-[11px] text-white/40">Launch Revenue</p>
                </div>
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </Link>
              <button onClick={() => { fetchBots(); fetchListings(); }} className="glass-card p-5 group flex items-center justify-between hover:border-[#ffd700]/40">
                <div>
                  <p className="text-[13px] font-bold mb-1">Refresh Hub</p>
                  <p className="text-[11px] text-white/40">Sync system data</p>
                </div>
                <span className="transition-transform group-hover:rotate-180 duration-500">↻</span>
              </button>
            </div>

            {/* My Bots Table */}
            <div className="glass-card overflow-hidden fade-up" style={{ animationDelay: '0.3s' }}>
              <div className="px-6 py-5 border-b border-white/5 flex justify-between items-center">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-white/50">Deployment Portfolio</h2>
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
                  emptyMessage="Ready to scale? Create your first automation bot."
                  emptyLinkText="Launch First Bot"
                  emptyLinkTo="/email-bot"
                  onDelete={handleDeleteBot}
                  showManage={true}
                />
              </div>
            </div>
          </>
        )}

        {activeTab === 'wallet' && (
          <div className="fade-up">
            <SellerWalletDashboard />
          </div>
        )}
      </div>

      <ConfirmModal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, botId: null })}
        onConfirm={confirmDeleteBot}
        title="Terminate Bot"
        message="Are you sure you want to delete this bot instance? This action is irreversible."
        confirmText="Confirm Deletion"
        variant="danger"
      />
    </div>
  );
};

export default SellerDashboard;
