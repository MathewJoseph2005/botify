import { useState, useEffect, memo } from 'react';
import { marketplaceAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

import Modal from '../components/Modal';
import DemoCheckoutModal from '../components/DemoCheckoutModal';
import StarfieldCanvas from '../components/StarfieldCanvas';


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
  { value: '', labelKey: 'marketplace.filters.allPlatforms', icon: '🌐' },
  { value: 'email', labelKey: 'marketplace.filters.email', icon: '📧' },
  { value: 'whatsapp', labelKey: 'marketplace.filters.whatsapp', icon: '💬' },
  { value: 'telegram', labelKey: 'marketplace.filters.telegram', icon: '✈️' },
  { value: 'discord', labelKey: 'marketplace.filters.discord', icon: '🎮' },
  { value: 'slack', labelKey: 'marketplace.filters.slack', icon: '💼' },
];

const SORT_OPTIONS = [
  { value: 'newest', labelKey: 'marketplace.sort.newest' },
  { value: 'popular', labelKey: 'marketplace.sort.popular' },
  { value: 'price_asc', labelKey: 'marketplace.sort.priceAsc' },
  { value: 'price_desc', labelKey: 'marketplace.sort.priceDesc' },
];

const Marketplace = () => {
  const { user, isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedBot, setSelectedBot] = useState(null);
  const [checkoutModal, setCheckoutModal] = useState({ open: false, bot: null });
  const [purchasedBotIds, setPurchasedBotIds] = useState([]); 
  const [resourceModal, setResourceModal] = useState({ open: false, bot: null, loading: false, resource: null });

  const [platform, setPlatform] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');

  useEffect(() => {
    fetchListings();
    if (isAuthenticated && user?.role_id === 3) {
      fetchUserPurchases();
    }
  }, [platform, sort, isAuthenticated]);

  const fetchUserPurchases = async () => {
    try {
      const res = await marketplaceAPI.getMyPurchases();
      if (res.data.success) {
        const botIds = res.data.purchases?.map(p => p.marketplace_bot_id) || [];
        setPurchasedBotIds(botIds);
      }
    } catch (err) {
      console.error('Error fetching purchases:', err);
    }
  };

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
      setError(err.response?.data?.message || t('marketplace.errors.load'));
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchListings();
  };

  const handlePurchase = (bot) => {
    if (!isAuthenticated) {
      setError(t('marketplace.errors.loginToPurchase'));
      return;
    }
    if (user?.role_id !== 3) {
      setError(t('marketplace.errors.buyerOnly'));
      return;
    }
    setCheckoutModal({ open: true, bot });
    setError('');
  };

  const handleCheckoutSuccess = () => {
    setCheckoutModal({ open: false, bot: null });
    setSuccess(t('marketplace.success.purchaseComplete'));
    fetchUserPurchases(); 
    fetchListings();
    setTimeout(() => setSuccess(''), 5000);
  };

  const handleViewResources = async (bot) => {
    try {
      setResourceModal({ open: true, bot, loading: true, resource: null });
      const res = await marketplaceAPI.getBotAccess(bot.id);
      if (res.data.success) {
        setResourceModal({ open: true, bot, loading: false, resource: res.data.bot });
      }
    } catch (err) {
      setError(err.response?.data?.message || t('marketplace.errors.resources'));
      setResourceModal(prev => ({ ...prev, loading: false }));
    }
  };

  const pIcons = { email: '📧', whatsapp: '💬', telegram: '✈️', discord: '🎮', slack: '💼' };

  return (
    <div className="min-h-screen bg-[#050505] text-white relative overflow-hidden pb-32" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{MARKETPLACE_STYLES}</style>
      <StarfieldCanvas count={45} opacity={0.5} />

      <div className="relative pt-20 pb-16 px-6 sm:px-12 max-w-7xl mx-auto z-10">
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[600px] opacity-20 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] opacity-20 pointer-events-none rounded-full"
            style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(255,215,0,0.12) 0%, rgba(92,32,98,0.08) 40%, transparent 70%)', filter: 'blur(60px)' }} />
        </div>

        <div className="text-center mb-16 fade-up">
          <p className="text-[#ffd700] text-[11px] font-bold uppercase tracking-[0.4em] mb-4">{t('marketplace.kicker')}</p>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tighter mb-6">
            {t('marketplace.title')}
          </h1>
          <p className="text-white/40 text-[15px] max-w-2xl mx-auto leading-relaxed">
            {t('marketplace.subtitle')}
          </p>
        </div>

        <div className="max-w-3xl mx-auto mb-12 fade-up fade-up-1">
          <form onSubmit={handleSearch} className="relative group">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('marketplace.searchPlaceholder')}
              className="w-full px-6 py-4 rounded-2xl input-glass outline-none text-[14px] placeholder-white/20 pr-32"
            />
            <button
              type="submit"
              className="absolute right-2 top-2 bottom-2 px-6 rounded-xl bg-[#ffd700] text-[#050505] font-bold text-xs hover:scale-[1.03] transition-all"
            >
              {t('marketplace.search')}
            </button>
          </form>

          {(error || success) && (
            <div className={`mt-4 px-5 py-3 rounded-xl border flex justify-between items-center ${error ? 'border-red-500/20 bg-red-500/5 text-red-400' : 'border-green-500/20 bg-green-500/5 text-green-400'}`}>
              <span className="text-xs">{error || success}</span>
              <button onClick={() => { setError(''); setSuccess(''); }} className="opacity-50 hover:opacity-100">&times;</button>
            </div>
          )}
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12 fade-up fade-up-2">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {PLATFORMS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPlatform(p.value)}
                className={`pill-filter px-4 py-2 rounded-full text-[12px] font-bold uppercase tracking-wider flex items-center gap-2 ${platform === p.value ? 'active' : ''}`}
              >
                <span>{p.icon}</span> {t(p.labelKey)}
              </button>
            ))}
          </div>
          
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="input-glass px-4 py-2 rounded-xl text-[12px] font-bold text-white/60 bg-transparent outline-none cursor-pointer"
          >
            {SORT_OPTIONS.map((s) => (
              <option key={s.value} value={s.value} className="bg-[#111]">{t(s.labelKey)}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 opacity-40">
            <div className="w-12 h-12 border-2 border-[#ffd700]/30 border-t-[#ffd700] rounded-full animate-spin mb-4" />
            <p className="text-[10px] font-bold uppercase tracking-[0.3em]">{t('marketplace.loading')}</p>
          </div>
        ) : listings.length === 0 ? (
          <div className="glass-card p-20 text-center fade-up">
            <div className="text-4xl mb-6 opacity-30">🔍</div>
            <h3 className="text-xl font-bold mb-2">{t('marketplace.empty.title')}</h3>
            <p className="text-white/30 text-sm italic">{search || platform ? t('marketplace.empty.filtered') : t('marketplace.empty.default')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 fade-up fade-up-3">
            {listings.map((bot) => (
              <div key={bot.id} className="glass-card flex flex-col group relative">
                <div className="absolute top-4 left-4 z-10 px-3 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-bold uppercase tracking-widest text-[#ffd700]">
                  {bot.platform}
                </div>
                
                <div className="relative h-44 rounded-t-3xl overflow-hidden bg-white/[0.02]">
                  {bot.image_url ? (
                    <img src={bot.image_url} alt={bot.name} className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-6xl opacity-20 grayscale group-hover:scale-110 group-hover:opacity-40 transition-all duration-700">
                      {pIcons[bot.platform] || '🤖'}
                    </div>
                  )}
                </div>

                <div className="p-6 flex flex-col flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold group-hover:text-[#ffd700] transition-colors">{bot.name}</h3>
                    <span className="text-[14px] font-black tracking-tight text-[#ffd700] gold-glow">
                      {parseFloat(bot.price) === 0 ? t('marketplace.free') : `$${parseFloat(bot.price).toFixed(2)}`}
                    </span>
                  </div>
                  <p className="text-[11px] text-white/30 font-medium uppercase tracking-widest mb-4">{t('marketplace.bySeller', { seller: bot.seller_name })}</p>
                  
                  {bot.description && (
                    <p className="text-[13px] text-white/50 mb-6 line-clamp-2 leading-relaxed italic">
                      "{bot.description}"
                    </p>
                  )}

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

                  <div className="mt-auto pt-4 border-t border-white/[0.03] flex items-center gap-3">
                    <button
                      onClick={() => setSelectedBot(bot)}
                      className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-[11px] font-bold uppercase tracking-widest hover:bg-white/5 transition-all active:scale-[0.98]"
                    >
                      {t('marketplace.details')}
                    </button>
                    {purchasedBotIds.includes(bot.id) ? (
                      <button
                        onClick={() => handleViewResources(bot)}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-[11px] font-black uppercase tracking-widest hover:bg-green-500/20 transition-all"
                      >
                        {t('marketplace.viewResources')}
                      </button>
                    ) : (
                      <button
                        onClick={() => handlePurchase(bot)}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-[#ffd700] text-[#050505] text-[11px] font-black uppercase tracking-widest hover:bg-[#fff6a0] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                      >
                        {t('marketplace.buyNow')}
                      </button>
                    )}
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
              <p className="text-[11px] font-bold uppercase tracking-[0.34em] text-white/20 mb-6">{t('marketplace.bySeller', { seller: selectedBot.seller_name })}</p>
              
              <div className="space-y-6 mb-8">
                <div>
                  <h4 className="text-[10px] font-bold text-[#ffd700] uppercase tracking-widest mb-2 opacity-60">{t('marketplace.summary')}</h4>
                  <p className="text-sm text-white/50 leading-relaxed italic">"{selectedBot.description || t('marketplace.noDescription')}"</p>
                </div>

                {selectedBot.config_json?.buyer_specs && (
                  <div>
                    <h4 className="text-[10px] font-bold text-[#ffd700] uppercase tracking-widest mb-3 opacity-60">Buyer Setup Specs</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {Array.isArray(selectedBot.config_json.buyer_specs.prerequisites) && selectedBot.config_json.buyer_specs.prerequisites.length > 0 && (
                        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                          <p className="text-white/40 uppercase tracking-widest text-[9px] mb-2">Prerequisites</p>
                          <ul className="space-y-1 text-white/70">
                            {selectedBot.config_json.buyer_specs.prerequisites.slice(0, 4).map((item, idx) => (
                              <li key={idx}>- {item}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {Array.isArray(selectedBot.config_json.buyer_specs.setup_steps) && selectedBot.config_json.buyer_specs.setup_steps.length > 0 && (
                        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                          <p className="text-white/40 uppercase tracking-widest text-[9px] mb-2">Setup Steps</p>
                          <ul className="space-y-1 text-white/70">
                            {selectedBot.config_json.buyer_specs.setup_steps.slice(0, 4).map((item, idx) => (
                              <li key={idx}>{idx + 1}. {item}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {selectedBot.config_json.buyer_specs.usage_instructions && (
                        <div className="rounded-xl border border-white/10 bg-white/5 p-3 md:col-span-2">
                          <p className="text-white/40 uppercase tracking-widest text-[9px] mb-2">Usage Guide</p>
                          <p className="text-white/70 leading-relaxed">{selectedBot.config_json.buyer_specs.usage_instructions}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedBot.features && selectedBot.features.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-bold text-[#ffd700] uppercase tracking-widest mb-3 opacity-60">{t('marketplace.capabilities')}</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {selectedBot.features.map((f, i) => (
                        <div key={i} className="flex items-center gap-3 text-xs text-white/40 group">
                          <span className="text-[#ffd700] opacity-40 group-hover:opacity-100 transition-opacity">◎</span> {f}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between p-1.5 pl-6 rounded-2xl bg-[#ffd700]/5 border border-[#ffd700]/10">
                <span className="text-2xl font-black text-[#ffd700] gold-glow">
                  {parseFloat(selectedBot.price) === 0 ? t('marketplace.free') : `$${parseFloat(selectedBot.price).toFixed(2)}`}
                </span>
                {purchasedBotIds.includes(selectedBot.id) ? (
                  <button
                    onClick={() => handleViewResources(selectedBot)}
                    className="px-8 py-3.5 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-[12px] font-black uppercase tracking-widest hover:bg-green-500/20 transition-all"
                  >
                    {t('marketplace.viewResources')}
                  </button>
                ) : (
                  <button
                    onClick={() => handlePurchase(selectedBot)}
                    className="px-8 py-3.5 rounded-xl bg-[#ffd700] text-[#050505] text-[12px] font-black uppercase tracking-widest hover:bg-[#fff6a0] transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {t('marketplace.purchaseBot')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Checkout Modal */}
      {checkoutModal.open && (
        <DemoCheckoutModal
          bot={checkoutModal.bot}
          isOpen={checkoutModal.open}
          onClose={() => setCheckoutModal({ open: false, bot: null })}
          onSuccess={handleCheckoutSuccess}
        />
      )}

      {/* Resource Modal */}
      {resourceModal.open && (
        <Modal onClose={() => setResourceModal({ open: false, bot: null, loading: false, resource: null })} maxWidth="max-w-2xl">
          <div className="p-2">
             <div className="flex items-center justify-between mb-8">
               <h2 className="text-2xl font-bold tracking-tight">{t('marketplace.resources.title')}</h2>
               <button onClick={() => setResourceModal({ open: false, bot: null, loading: false, resource: null })}
                 className="text-2xl text-white/30 hover:text-white">&times;</button>
             </div>

             {resourceModal.loading ? (
               <div className="py-20 text-center opacity-30">
                  <div className="w-8 h-8 border-2 border-[#ffd700]/30 border-t-[#ffd700] rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-[10px] font-bold uppercase tracking-widest">{t('marketplace.resources.loading')}</p>
               </div>
             ) : resourceModal.resource ? (
               <div className="space-y-8">
                  {resourceModal.resource.config_json?.buyer_specs && (
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-bold text-[#ffd700] uppercase tracking-widest opacity-60">Buyer Setup Specifications</h4>
                      <div className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-4 text-xs">
                        {Array.isArray(resourceModal.resource.config_json.buyer_specs.prerequisites) && resourceModal.resource.config_json.buyer_specs.prerequisites.length > 0 && (
                          <div>
                            <p className="text-white/35 uppercase tracking-widest text-[10px] mb-2">Prerequisites</p>
                            <ul className="space-y-1 text-white/75">
                              {resourceModal.resource.config_json.buyer_specs.prerequisites.map((item, idx) => (
                                <li key={idx}>- {item}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {Array.isArray(resourceModal.resource.config_json.buyer_specs.setup_steps) && resourceModal.resource.config_json.buyer_specs.setup_steps.length > 0 && (
                          <div>
                            <p className="text-white/35 uppercase tracking-widest text-[10px] mb-2">Setup Steps</p>
                            <ol className="space-y-1 text-white/75">
                              {resourceModal.resource.config_json.buyer_specs.setup_steps.map((item, idx) => (
                                <li key={idx}>{idx + 1}. {item}</li>
                              ))}
                            </ol>
                          </div>
                        )}

                        {resourceModal.resource.config_json.buyer_specs.usage_instructions && (
                          <div>
                            <p className="text-white/35 uppercase tracking-widest text-[10px] mb-2">Usage Guide</p>
                            <p className="text-white/75 leading-relaxed">{resourceModal.resource.config_json.buyer_specs.usage_instructions}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {resourceModal.resource.bot_script && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-end">
                        <h4 className="text-[10px] font-bold text-[#ffd700] uppercase tracking-widest opacity-60">{t('marketplace.resources.script')}</h4>
                        <button onClick={() => { navigator.clipboard.writeText(resourceModal.resource.bot_script); setSuccess(t('marketplace.resources.copied')); setTimeout(() => setSuccess(''), 2000); }}
                          className="text-[9px] font-bold text-white/20 hover:text-white uppercase tracking-widest transition-colors">{t('marketplace.resources.copyScript')}</button>
                      </div>
                      <div className="bg-black/40 border border-white/5 rounded-xl p-5 font-mono text-[11px] text-white/60 overflow-auto max-h-64 custom-scrollbar">
                        <pre>{resourceModal.resource.bot_script}</pre>
                      </div>
                    </div>
                  )}

                  {resourceModal.resource.github_link && (
                    <div className="p-6 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between group">
                       <div>
                         <h4 className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">{t('marketplace.resources.github')}</h4>
                         <p className="text-xs font-bold text-[#ffd700]">{resourceModal.resource.github_link}</p>
                       </div>
                       <a href={resourceModal.resource.github_link} target="_blank" rel="noopener noreferrer"
                        className="px-6 py-2 rounded-xl bg-white/10 text-[10px] font-bold uppercase tracking-widest group-hover:bg-[#ffd700] group-hover:text-[#050505] transition-all">{t('marketplace.resources.openGithub')}</a>
                    </div>
                  )}

                  {resourceModal.resource.config_json && (
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-bold text-[#ffd700] uppercase tracking-widest opacity-60">{t('marketplace.resources.config')}</h4>
                      <div className="bg-black/40 border border-white/5 rounded-xl p-5 font-mono text-[11px] text-white/40 overflow-auto max-h-48 custom-scrollbar">
                        <pre>{JSON.stringify(resourceModal.resource.config_json, null, 2)}</pre>
                      </div>
                    </div>
                  )}
               </div>
             ) : (
               <p className="text-white/20 text-center py-10 italic text-sm">{t('marketplace.resources.failed')}</p>
             )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Marketplace;
