import { useState, useEffect, memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { marketplaceAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import FluidOrb from '../components/FluidOrb';
import ConfirmModal from '../components/ConfirmModal';
import EditBotModal from '../components/EditBotModal';

/* ── Starfield (Reused) ── */
const Starfield = memo(() => {
  const [stars] = useState(() =>
    Array.from({ length: 110 }, (_, i) => ({
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

const CREATE_STYLES = `
  @keyframes twinkle { 0%,100%{opacity:0.1;transform:scale(0.8)} 50%{opacity:1;transform:scale(1.1);box-shadow:0 0 8px 1px rgba(255,255,255,0.3)} }
  .animate-twinkle{animation:twinkle ease-in-out infinite}
  @keyframes fadeUp { from{opacity:0;transform:translateY(25px)} to{opacity:1;transform:translateY(0)} }
  .fade-up{animation:fadeUp 0.8s cubic-bezier(.16,1,.3,1) both}
  .glass-card {
    background: rgba(255, 255, 255, 0.035);
    backdrop-filter: blur(14px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 24px;
    transition: all 0.4s ease;
  }
  .glass-card:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 215, 0, 0.2);
  }
  .input-glass {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    transition: all 0.3s ease;
    color: white;
  }
  .input-glass:focus {
    background: rgba(255,255,255,0.08);
    border-color: rgba(255,215,0,0.4);
    box-shadow: 0 0 0 4px rgba(255,215,0,0.05);
  }
  .gold-glow { text-shadow: 0 0 15px rgba(255, 215, 0, 0.3); }
`;

const PLATFORMS = [
  { value: 'email', label: 'Email', icon: '📧' },
  { value: 'whatsapp', label: 'WhatsApp', icon: '💬' },
  { value: 'telegram', label: 'Telegram', icon: '✈️' },
  { value: 'discord', label: 'Discord', icon: '🎮' },
  { value: 'slack', label: 'Slack', icon: '💼' },
  { value: 'instagram', label: 'Instagram', icon: '📸' },
];

const CATEGORIES = [
  'Customer Support', 'Marketing', 'Sales', 'Notifications', 
  'Analytics', 'Automation', 'Social Media', 'E-commerce', 'Other'
];

const CreateMarketplaceBotPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null });
  const [editingListing, setEditingListing] = useState(null);
  const [loadingListing, setLoadingListing] = useState(false);

  const [form, setForm] = useState({
    name: '',
    description: '',
    platform: '',
    price: '',
    features: '',
    category: '',
    image_url: '',
  });

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    try {
      setLoading(true);
      const response = await marketplaceAPI.getMyListings();
      if (response.data.success) {
        setListings(response.data.listings || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch listings.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({ name: '', description: '', platform: '', price: '', features: '', category: '', image_url: '' });
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.name || !form.platform || !form.price) {
      setError('Bot name, target protocol, and unit price are mandatory.');
      return;
    }

    const payload = {
      name: form.name,
      description: form.description,
      platform: form.platform,
      price: parseFloat(form.price),
      features: form.features
        ? form.features.split(',').map((f) => f.trim()).filter(Boolean)
        : [],
      category: form.category || null,
      image_url: form.image_url || null,
    };

    try {
      setSubmitting(true);
      const res = await marketplaceAPI.createListing(payload);
      if (res.data.success) {
        setSuccess('New autonomous agent initialised.');
        resetForm();
        fetchListings();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'System transmission error.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (listing) => {
    try {
      setLoadingListing(true);
      const response = await marketplaceAPI.getListing(listing.id);
      if (response.data.success) {
        setEditingListing(response.data.listing);
      }
    } catch (err) {
      setError('Failed to load bot details');
    } finally {
      setLoadingListing(false);
    }
  };

  const confirmDelete = async () => {
    try {
      const res = await marketplaceAPI.deleteListing(deleteModal.id);
      if (res.data.success) {
        setSuccess('Listing purged from registry.');
        fetchListings();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Purge failed.');
    } finally {
      setDeleteModal({ open: false, id: null });
    }
  };

  const handlePublish = async (id, publish) => {
    try {
      const res = await marketplaceAPI.publishListing(id, publish);
      if (res.data.success) {
        setSuccess(publish ? 'Agent deployed to global grid.' : 'Agent recalled to barracks.');
        fetchListings();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Status transition error.');
    }
  };

  const publishedCount = listings.filter((l) => l.status === 'published').length;
  const totalSales = listings.reduce((sum, l) => sum + (l.total_sales || 0), 0);

  const getPlatformEmoji = (platform) => {
    const p = PLATFORMS.find(x => x.value === platform);
    return p ? p.icon : '🤖';
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white relative overflow-hidden pb-32" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{CREATE_STYLES}</style>
      <Starfield />

      <div className="max-w-7xl mx-auto px-6 lg:px-12 pt-16 relative z-10">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] opacity-10 pointer-events-none">
          <FluidOrb />
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 fade-up">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">Manifest <span className="text-[#ffd700] gold-glow">Agent</span></h1>
            <p className="text-white/30 text-sm font-medium uppercase tracking-[0.2em]">Scale your automation empire</p>
          </div>
          <button
            onClick={() => { setShowForm(!showForm); }}
            className={`px-8 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all
              ${showForm ? 'bg-white/5 border border-white/10 text-white/40 hover:text-white' : 'bg-[#ffd700] text-[#050505] hover:scale-105'}
            `}
          >
            {showForm ? 'Abort' : 'Initialise New Agent'}
          </button>
        </div>

        {(error || success) && (
          <div className={`mb-8 px-6 py-4 rounded-2xl glass-card flex items-center justify-between fade-up ${error ? 'border-red-500/20 bg-red-500/5 text-red-400' : 'border-green-500/20 bg-green-500/5 text-green-400'}`}>
            <span className="text-sm font-medium">{error || success}</span>
            <button onClick={() => { setError(''); setSuccess(''); }} className="opacity-50 hover:opacity-100">&times;</button>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12 fade-up" style={{ animationDelay: '0.1s' }}>
          {[
            { label: 'Registry Size', value: listings.length, color: 'text-white/60' },
            { label: 'Deployed Agents', value: publishedCount, color: 'text-green-400' },
            { label: 'Draft Prototypes', value: listings.length - publishedCount, color: 'text-white/20' },
            { label: 'Network Revenue', value: totalSales, color: 'text-[#ffd700]' }
          ].map((s, idx) => (
            <div key={idx} className="glass-card p-6">
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-2">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {showForm && (
          <div className="glass-card p-8 mb-12 fade-up" style={{ animationDelay: '0.2s', background: 'rgba(255,255,255,0.02)' }}>
            <h2 className="text-xl font-bold mb-8 flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ffd700]" />
              Deploy New Neural Asset
            </h2>
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">Agent Designation *</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full px-5 py-3.5 rounded-xl input-glass outline-none text-sm placeholder-white/10"
                      placeholder="e.g. Nexus Protocol V.1"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">Protocol Interface *</label>
                    <div className="grid grid-cols-3 gap-2">
                      {PLATFORMS.map((p) => (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => setForm({ ...form, platform: p.value })}
                          className={`py-3 rounded-xl border transition-all flex flex-col items-center gap-1 ${
                            form.platform === p.value ? 'bg-[#ffd700]/10 border-[#ffd700]/40 text-[#ffd700]' : 'bg-white/5 border-white/5 text-white/20 hover:border-white/10'
                          }`}
                        >
                          <span className="text-xl">{p.icon}</span>
                          <span className="text-[9px] font-bold uppercase">{p.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">Dossier / Summary</label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      rows={5}
                      className="w-full px-5 py-3.5 rounded-xl input-glass outline-none text-sm placeholder-white/10 resize-none"
                      placeholder="Defining the core intelligence and utility..."
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div>
                  <label className="block text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">Acquisition Cost ($) *</label>
                  <input
                    type="number" step="0.01"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="w-full px-5 py-3.5 rounded-xl input-glass outline-none text-sm placeholder-white/10"
                    placeholder="29.99"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">Domain Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-5 py-3.5 rounded-xl input-glass outline-none text-sm pr-10 cursor-pointer appearance-none bg-[#111]"
                  >
                    <option value="">Select Domain</option>
                    {CATEGORIES.map((c) => (<option key={c} value={c}>{c}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">Intelligence Tags <span className="opacity-40 italic">(CSV)</span></label>
                  <input
                    type="text"
                    value={form.features}
                    onChange={(e) => setForm({ ...form, features: e.target.value })}
                    className="w-full px-5 py-3.5 rounded-xl input-glass outline-none text-sm placeholder-white/10"
                    placeholder="Auto-Response, CRM Sync..."
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-10 py-3.5 rounded-2xl bg-[#ffd700] text-[#050505] font-black text-xs uppercase tracking-widest hover:scale-[1.03] transition-all disabled:opacity-50"
                >
                  {submitting ? 'PROCESSING...' : 'DEPLOY TO GRID'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-8 py-3.5 rounded-2xl border border-white/10 text-white/40 font-bold text-xs uppercase tracking-widest hover:bg-white/5 transition-all"
                >
                  CANCEL
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="glass-card overflow-hidden fade-up" style={{ animationDelay: '0.3s' }}>
          <div className="p-8 border-b border-white/5 flex justify-between items-center">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-white/50">Neural Registry</h2>
            <span className="text-[10px] font-bold py-1 px-3 rounded-full bg-white/5 text-white/30 uppercase tracking-widest">{listings.length} Entries</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="px-8 py-4 text-[10px] font-bold text-white/20 uppercase tracking-widest">Bot Persona</th>
                  <th className="px-8 py-4 text-[10px] font-bold text-white/20 uppercase tracking-widest">Protocol</th>
                  <th className="px-8 py-4 text-[10px] font-bold text-white/20 uppercase tracking-widest">Value</th>
                  <th className="px-8 py-4 text-[10px] font-bold text-white/20 uppercase tracking-widest">Status</th>
                  <th className="px-8 py-4 text-[10px] font-bold text-white/20 uppercase tracking-widest text-right">Ops</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {listings.map((l) => (
                  <tr key={l.id} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="px-8 py-5">
                      <div className="font-bold text-sm text-white/90 group-hover:text-white">{l.name}</div>
                      <div className="text-[10px] text-white/20 font-medium uppercase mt-1">{l.category || 'Uncategorised'}</div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-lg mr-2 inline-block grayscale group-hover:grayscale-0 transition-all">{getPlatformEmoji(l.platform)}</span>
                      <span className="text-[11px] font-bold text-white/40 uppercase">{l.platform}</span>
                    </td>
                    <td className="px-8 py-5 text-sm font-bold text-[#ffd700]/80">${parseFloat(l.price).toFixed(2)}</td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${l.status === 'published' ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.4)]' : 'bg-white/10'}`} />
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${l.status === 'published' ? 'text-green-400' : 'text-white/20'}`}>{l.status}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handlePublish(l.id, l.status !== 'published')} className="text-[10px] font-bold text-white/40 hover:text-[#ffd700] uppercase tracking-widest">{l.status === 'published' ? 'Recall' : 'Deploy'}</button>
                        <button onClick={() => handleEdit(l)} className="text-[10px] font-bold text-white/40 hover:text-white uppercase tracking-widest">Adjust</button>
                        <button onClick={() => setDeleteModal({ open: false, id: l.id })} className="text-[10px] font-bold text-red-400/40 hover:text-red-400 uppercase tracking-widest">Purge</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, id: null })}
        onConfirm={confirmDelete}
        title="Purge Asset"
        message="Are you sure you want to permanently erase this agent specification from the registry? All sales metrics will be archived."
        confirmText="Confirm Purge"
        variant="danger"
      />

      {editingListing && (
        <EditBotModal
          listing={editingListing}
          isLoading={loadingListing}
          onClose={() => setEditingListing(null)}
          onUpdate={fetchListings}
        />
      )}
    </div>
  );
};

export default CreateMarketplaceBotPage;
