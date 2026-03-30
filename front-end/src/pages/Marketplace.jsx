import { useState, useEffect, memo } from 'react';
import { marketplaceAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import FluidOrb from '../components/FluidOrb';
import Modal from '../components/Modal';

/* ── Starfield (reused) ── */
const Starfield = memo(() => {
  const [stars] = useState(() =>
    Array.from({ length: 120 }, (_, i) => ({
      id: i, left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
      size: `${Math.random() * 1.8 + 0.4}px`, animDelay: `${Math.random() * 5}s`,
      animDur: `${Math.random() * 4 + 2}s`, opacity: Math.random() * 0.4 + 0.3,
    }))
  );
  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-50">
      {stars.map(s => (
        <div key={s.id} className="absolute bg-white rounded-full animate-twinkle"
          style={{ left: s.left, top: s.top, width: s.size, height: s.size,
            opacity: s.opacity, animationDelay: s.animDelay, animationDuration: s.animDur }} />
      ))}
    </div>
  );
});

const MARKETPLACE_STYLES = `
  @keyframes twinkle { 0%,100%{opacity:0.1;transform:scale(0.8)} 50%{opacity:1;transform:scale(1.1);box-shadow:0 0 8px 1px rgba(255,255,255,0.3)} }
  .animate-twinkle{animation:twinkle ease-in-out infinite}
  @keyframes fadeUp { from{opacity:0;transform:translateY(25px)} to{opacity:1;transform:translateY(0)} }
  .fade-up{animation:fadeUp 0.8s cubic-bezier(.16,1,.3,1) both}
  .fade-up-1{animation-delay:0.1s} .fade-up-2{animation-delay:0.2s} .fade-up-3{animation-delay:0.3s}
  
  .glass-card {
    background: rgba(255, 255, 255, 0.03);
    backdrop-filter: blur(14px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 24px;
    transition: all 0.4s cubic-bezier(0.16,1,0.3,1);
  }
  .glass-card:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 215, 0, 0.25);
    transform: translateY(-6px);
    box-shadow: 0 20px 40px -12px rgba(0,0,0,0.5);
  }
  .pill-filter {
    transition: all 0.3s ease;
    border: 1px solid rgba(255,255,255,0.08);
    background: rgba(255,255,255,0.03);
    color: rgba(255,255,255,0.4);
  }
  .pill-filter:hover { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.8); }
  .pill-filter.active {
    background: rgba(255,215,0,0.1);
    border-color: rgba(255,215,0,0.4);
    color: #ffd700;
  }
  .gold-glow { text-shadow: 0 0 15px rgba(255, 215, 0, 0.4); }
  .input-glass {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.1);
    transition: all 0.3s ease;
  }
  .input-glass:focus {
    background: rgba(255,255,255,0.07);
    border-color: rgba(255,215,0,0.4);
    box-shadow: 0 0 0 3px rgba(255,215,0,0.1);
  }
`;

const PLATFORMS = [
  { value: '', label: 'All', icon: '🌐' },
  { value: 'email', label: 'Email', icon: '📧' },
  { value: 'whatsapp', label: 'WhatsApp', icon: '💬' },
  { value: 'telegram', label: 'Telegram', icon: '✈️' },
  { value: 'discord', label: 'Discord', icon: '🎮' },
  { value: 'slack', label: 'Slack', icon: '💼' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest Arrivals' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
];

const Marketplace = () => {
  const { user, isAuthenticated } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [purchasing, setPurchasing] = useState(null);
  const [selectedBot, setSelectedBot] = useState(null);

  // Filters
  const [platform, setPlatform] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');

  useEffect(() => {
    fetchListings();
  }, [platform, sort]);

  const fetchListings = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (platform) params.platform = platform;
      if (search) params.search = search;
      if (sort) params.sort = sort;

      const res = await marketplaceAPI.browse(params);
      if (res.data.success) {
        setListings(res.data.listings);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load marketplace.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchListings();
  };

  const handlePurchase = async (botId) => {
    if (!isAuthenticated) {
      setError('Authorisation required. Please sign in as a Buyer.');
      return;
    }
    if (user?.role_id !== 3) {
      setError('Action restricted. Only Buyer accounts can acquire bots.');
      return;
    }
    
    try {
      setPurchasing(botId);
      setError('');
      const res = await marketplaceAPI.purchase(botId);
      if (res.data.success) {
        setSuccess('Acquisition successful. Deployment initialised in your dashboard.');
        fetchListings();
        setSelectedBot(null);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Transaction failed.');
    } finally {
      setPurchasing(null);
    }
  };

  const pIcons = { email: '📧', whatsapp: '💬', telegram: '✈️', discord: '🎮', slack: '💼' };

  return (
    <div className="min-h-screen bg-[#050505] text-white relative overflow-hidden pb-32" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{MARKETPLACE_STYLES}</style>
      <Starfield />

      {/* Hero / Header Section */}
      <div className="relative pt-20 pb-16 px-6 sm:px-12 max-w-7xl mx-auto z-10">
        {/* Orbs */}
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[600px] opacity-20 pointer-events-none">
          <FluidOrb />
        </div>

        <div className="text-center mb-16 fade-up">
          <p className="text-[#ffd700] text-[11px] font-bold uppercase tracking-[0.4em] mb-4">Autonomous Economy</p>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tighter mb-6">
            Elite <span className="text-[#ffd700] gold-glow">Bot</span> Marketplace
          </h1>
          <p className="text-white/40 text-[15px] max-w-2xl mx-auto leading-relaxed">
            Discover and acquire high-performance automated agents built for scale across global messaging protocols.
          </p>
        </div>

        {/* Global Search & Alert */}
        <div className="max-w-3xl mx-auto mb-12 fade-up fade-up-1">
          <form onSubmit={handleSearch} className="relative group">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by intelligence domain or protocol..."
              className="w-full px-6 py-4 rounded-2xl input-glass outline-none text-[14px] placeholder-white/20 pr-32"
            />
            <button
              type="submit"
              className="absolute right-2 top-2 bottom-2 px-6 rounded-xl bg-[#ffd700] text-[#050505] font-bold text-xs hover:scale-[1.03] transition-all"
            >
              SEARCH
            </button>
          </form>

          {error && (
            <div className="mt-4 px-5 py-3 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-xs flex justify-between items-center animate-shake">
              <span>{error}</span>
              <button onClick={() => setError('')} className="opacity-50 hover:opacity-100">&times;</button>
            </div>
          )}
          {success && (
            <div className="mt-4 px-5 py-3 rounded-xl border border-green-500/20 bg-green-500/5 text-green-400 text-xs flex justify-between items-center">
              <span>{success}</span>
              <button onClick={() => setSuccess('')} className="opacity-50 hover:opacity-100">&times;</button>
            </div>
          )}
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12 fade-up fade-up-2">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {PLATFORMS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPlatform(p.value)}
                className={`pill-filter px-4 py-2 rounded-full text-[12px] font-bold uppercase tracking-wider flex items-center gap-2 ${platform === p.value ? 'active' : ''}`}
              >
                <span>{p.icon}</span> {p.label}
              </button>
            ))}
          </div>
          
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="input-glass px-4 py-2 rounded-xl text-[12px] font-bold text-white/60 bg-transparent outline-none cursor-pointer"
          >
            {SORT_OPTIONS.map((s) => (
              <option key={s.value} value={s.value} className="bg-[#111]">{s.label}</option>
            ))}
          </select>
        </div>

        {/* Bot Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 opacity-40">
            <div className="w-12 h-12 border-2 border-[#ffd700]/30 border-t-[#ffd700] rounded-full animate-spin mb-4" />
            <p className="text-[10px] font-bold uppercase tracking-[0.3em]">Synching Neural Grid</p>
          </div>
        ) : listings.length === 0 ? (
          <div className="glass-card p-20 text-center fade-up">
            <div className="text-4xl mb-6 opacity-30">🔍</div>
            <h3 className="text-xl font-bold mb-2">Network Search Negative</h3>
            <p className="text-white/30 text-sm italic">Lower filter sensitivity or try a different frequency.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 fade-up fade-up-3">
            {listings.map((bot, idx) => (
              <div key={bot.id} className="glass-card flex flex-col group">
                {/* Visual Header */}
                <div className="relative h-44 rounded-t-3xl overflow-hidden bg-white/[0.02]">
                  {bot.image_url ? (
                    <img src={bot.image_url} alt={bot.name} className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-6xl opacity-20 grayscale group-hover:scale-110 group-hover:opacity-40 transition-all duration-700">
                      {pIcons[bot.platform] || '🤖'}
                    </div>
                  )}
                  {/* Platform Badge */}
                  <div className="absolute top-4 left-4 px-3 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-bold uppercase tracking-widest text-[#ffd700]">
                    {bot.platform}
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold group-hover:text-[#ffd700] transition-colors">{bot.name}</h3>
                    <span className="text-[14px] font-black tracking-tight text-[#ffd700] gold-glow">
                      {parseFloat(bot.price) === 0 ? 'FREE' : `$${parseFloat(bot.price).toFixed(2)}`}
                    </span>
                  </div>
                  <p className="text-[11px] text-white/30 font-medium uppercase tracking-widest mb-4">by {bot.seller_name}</p>
                  
                  {bot.description && (
                    <p className="text-[13px] text-white/50 mb-6 line-clamp-2 leading-relaxed italic">
                      "{bot.description}"
                    </p>
                  )}

                  {/* Features / Category */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    {bot.category && (
                      <span className="text-[9px] font-bold px-2 py-1 rounded-md bg-[#ffd700]/5 border border-[#ffd700]/10 text-[#ffd700]/70 uppercase">
                        {bot.category}
                      </span>
                    )}
                    {(bot.features || []).slice(0, 2).map((f, i) => (
                      <span key={i} className="text-[9px] font-bold px-2 py-1 rounded-md bg-white/5 border border-white/5 text-white/30 uppercase">
                        {f}
                      </span>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="mt-auto pt-4 border-t border-white/[0.03] flex items-center gap-3">
                    <button
                      onClick={() => setSelectedBot(bot)}
                      className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-[11px] font-bold uppercase tracking-widest hover:bg-white/5 transition-all active:scale-[0.98]"
                    >
                      Dossier
                    </button>
                    <button
                      onClick={() => handlePurchase(bot.id)}
                      disabled={purchasing === bot.id}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-[#ffd700] text-[#050505] text-[11px] font-black uppercase tracking-widest hover:bg-[#fff6a0] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                    >
                      {purchasing === bot.id ? 'PENDING...' : 'Acquire'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bot Detail Modal */}
      {selectedBot && (
        <Modal onClose={() => setSelectedBot(null)} maxWidth="max-w-xl">
          <div className="relative">
            {/* Modal Hero */}
            <div className="h-56 -mx-8 -mt-8 mb-6 relative bg-white/[0.02]">
              {selectedBot.image_url ? (
                <img src={selectedBot.image_url} alt={selectedBot.name} className="w-full h-full object-cover opacity-60" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-7xl opacity-20">
                  {pIcons[selectedBot.platform] || '🤖'}
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] to-transparent" />
              <button 
                onClick={() => setSelectedBot(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/50 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
              >
                &times;
              </button>
              
              <div className="absolute bottom-4 left-6 flex items-center gap-3">
                <span className="px-3 py-1 rounded-lg bg-[#ffd700]/10 border border-[#ffd700]/30 text-[10px] font-bold text-[#ffd700] uppercase tracking-widest">
                  {selectedBot.platform}
                </span>
                {selectedBot.category && (
                  <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-white/40 uppercase tracking-widest">
                    {selectedBot.category}
                  </span>
                )}
              </div>
            </div>

            <div className="px-2">
              <h2 className="text-3xl font-bold tracking-tight mb-2 text-white/95">{selectedBot.name}</h2>
              <p className="text-[11px] font-bold uppercase tracking-[0.34em] text-white/20 mb-6">Designed by {selectedBot.seller_name}</p>
              
              <div className="space-y-6 mb-8">
                <div>
                  <h4 className="text-[10px] font-bold text-[#ffd700] uppercase tracking-widest mb-2 opacity-60">Architectural Summary</h4>
                  <p className="text-sm text-white/50 leading-relaxed italic">"{selectedBot.description || 'No detailed dossier available for this unit.'}"</p>
                </div>

                {selectedBot.features && selectedBot.features.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-bold text-[#ffd700] uppercase tracking-widest mb-3 opacity-60">System Capabilities</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {selectedBot.features.map((f, i) => (
                        <div key={i} className="flex items-center gap-3 text-xs text-white/40 group">
                          <span className="text-[#ffd700] opacity-40 group-hover:opacity-100 transition-opacity">◎</span> {f}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-6 pt-4 border-t border-white/5">
                  <div>
                    <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-1">Grid Deployment</p>
                    <p className="text-xs font-bold text-white/60">{selectedBot.total_sales || 0} active units</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-1">Registration</p>
                    <p className="text-xs font-bold text-white/60">{new Date(selectedBot.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-1.5 pl-6 rounded-2xl bg-[#ffd700]/5 border border-[#ffd700]/10">
                <span className="text-2xl font-black text-[#ffd700] gold-glow">
                  {parseFloat(selectedBot.price) === 0 ? 'FREE' : `$${parseFloat(selectedBot.price).toFixed(2)}`}
                </span>
                <button
                  onClick={() => handlePurchase(selectedBot.id)}
                  disabled={purchasing === selectedBot.id}
                  className="px-8 py-3.5 rounded-xl bg-[#ffd700] text-[#050505] text-[12px] font-black uppercase tracking-widest hover:bg-[#fff6a0] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                >
                  {purchasing === selectedBot.id ? 'PROCESSING...' : 'INITIATE ACQUISITION'}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Marketplace;
