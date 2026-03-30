import { useState, useEffect, memo } from 'react';
import { botAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/ConfirmModal';
import FluidOrb from '../components/FluidOrb';

/* ── Starfield ─────────────────────────────────────────────────── */
const Starfield = memo(() => {
  const [stars] = useState(() =>
    Array.from({ length: 120 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: `${Math.random() * 1.8 + 0.4}px`,
      animDelay: `${Math.random() * 5}s`,
      animDur: `${Math.random() * 4 + 2}s`,
      opacity: Math.random() * 0.4 + 0.3,
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

const getFileIcon = (filename) => {
  const ext = filename?.split('.').pop()?.toLowerCase();
  if (['jpg','jpeg','png','gif','webp','svg'].includes(ext)) return '🖼️';
  if (['mp4','mov','avi'].includes(ext)) return '🎬';
  if (['mp3','wav','ogg'].includes(ext)) return '🎵';
  if (['pdf'].includes(ext)) return '📄';
  if (['xlsx','xls','csv'].includes(ext)) return '📊';
  if (['docx','doc'].includes(ext)) return '📝';
  if (['zip','rar','7z'].includes(ext)) return '🗜️';
  return '📎';
};

const EMAIL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap');
  @keyframes twinkle { 0%,100%{opacity:0.1;transform:scale(0.8)} 50%{opacity:1;transform:scale(1.1);box-shadow:0 0 8px 1px rgba(255,255,255,0.3)} }
  .animate-twinkle { animation: twinkle ease-in-out infinite; }
  @keyframes fadeUp { from{opacity:0;transform:translateY(25px)} to{opacity:1;transform:translateY(0)} }
  .fade-up { animation: fadeUp 0.8s cubic-bezier(.16,1,.3,1) both; }
  @keyframes spin-slow { to { transform: rotate(360deg); } }
  .animate-spin-slow { animation: spin-slow 1.2s linear infinite; }
  @keyframes pulse-gold { 0%,100%{box-shadow:0 0 0 0 rgba(255,215,0,0.4)} 50%{box-shadow:0 0 0 8px rgba(255,215,0,0)} }
  .pulse-gold { animation: pulse-gold 2s ease-in-out infinite; }
  .glass-card {
    background: rgba(255,255,255,0.035);
    backdrop-filter: blur(14px);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 24px;
    transition: all 0.4s ease;
  }
  .glass-card-hover:hover {
    background: rgba(255,255,255,0.055);
    border-color: rgba(255,215,0,0.2);
    transform: translateY(-2px);
  }
  .glass-card-selected {
    background: rgba(255,215,0,0.06) !important;
    border-color: rgba(255,215,0,0.35) !important;
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
    outline: none;
  }
  .input-glass::placeholder { color: rgba(255,255,255,0.12); }
  .input-glass option { background: #111; color: white; }
  .gold-glow { text-shadow: 0 0 20px rgba(255,215,0,0.5); }
  .gold-btn {
    background: linear-gradient(135deg, #ffd700, #f0bf00);
    color: #050505;
    font-weight: 900;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    border: none;
    border-radius: 14px;
    transition: all 0.25s ease;
    box-shadow: 0 0 20px rgba(255,215,0,0.15);
    padding: 11px 24px;
    cursor: pointer;
  }
  .gold-btn:hover:not(:disabled) { transform: scale(1.04); box-shadow: 0 0 28px rgba(255,215,0,0.35); }
  .gold-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; box-shadow: none; }
  .drop-zone {
    border: 1px dashed rgba(255,255,255,0.12);
    border-radius: 16px;
    background: rgba(255,255,255,0.02);
    transition: all 0.3s ease;
    cursor: pointer;
  }
  .drop-zone:hover, .drop-zone.drag-active { border-color: rgba(255,215,0,0.4); background: rgba(255,215,0,0.04); }
  .drop-zone.has-file { border-color: rgba(74,222,128,0.3); background: rgba(74,222,128,0.03); }
  .file-pill {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 12px;
    padding: 8px 14px;
    display: flex;
    align-items: center;
    gap: 10px;
    transition: all 0.2s;
  }
  .file-pill:hover { border-color: rgba(255,215,0,0.15); }
  .stat-card {
    background: rgba(255,255,255,0.02);
    border: 1px solid rgba(255,255,255,0.05);
    border-radius: 18px;
    padding: 20px;
    text-align: center;
    transition: all 0.3s ease;
  }
  .stat-card:hover { background: rgba(255,255,255,0.04); border-color: rgba(255,215,0,0.1); }
`;

const EmailBot = () => {
  const { user } = useAuth();

  const [bots, setBots] = useState([]);
  const [selectedBotId, setSelectedBotId] = useState(null);
  const [showCreateBotModal, setShowCreateBotModal] = useState(false);
  const [showEditBotModal, setShowEditBotModal] = useState(false);
  const [editingBot, setEditingBot] = useState(null);
  const [deleteBotModal, setDeleteBotModal] = useState({ open: false, botId: null });

  const [createBotForm, setCreateBotForm] = useState({ botName: '' });
  const [editBotForm, setEditBotForm] = useState({ botName: '' });

  const [subject, setSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [excelFile, setExcelFile] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [dragOver, setDragOver] = useState(false);

  const [campaigns, setCampaigns] = useState([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [botsLoading, setBotsLoading] = useState(false);
  const [campaignLoading, setCampaignLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testStatus, setTestStatus] = useState(null); // 'ok' | 'fail' | null
  const [result, setResult] = useState(null);

  useEffect(() => {
    fetchBots();
    fetchCampaigns();
  }, []);

  const fetchBots = async () => {
    try {
      setLoading(true);
      const response = await botAPI.listBots();
      if (response.data.success) {
        setBots(response.data.bots);
        if (response.data.bots.length > 0 && !selectedBotId) {
          setSelectedBotId(response.data.bots[0].bot_id);
        }
      }
    } catch (err) {
      setResult({ type: 'error', message: err.response?.data?.message || 'Failed to fetch bots.' });
    } finally {
      setLoading(false);
    }
  };

  const fetchCampaigns = async () => {
    try {
      setCampaignsLoading(true);
      const response = await botAPI.getCampaigns();
      if (response.data.success) setCampaigns(response.data.campaigns);
    } catch { /* silent */ } finally {
      setCampaignsLoading(false);
    }
  };

  const handleCreateBot = async (e) => {
    e.preventDefault();
    if (!createBotForm.botName) { setResult({ type: 'error', message: 'Bot name is required.' }); return; }
    try {
      setBotsLoading(true);
      const response = await botAPI.createBot({ botName: createBotForm.botName });
      if (response.data.success) {
        setResult({ type: 'success', message: 'Email bot deployed successfully!' });
        setCreateBotForm({ botName: '' });
        setShowCreateBotModal(false);
        await fetchBots();
      }
    } catch (err) {
      setResult({ type: 'error', message: err.response?.data?.message || 'Failed to create bot.' });
    } finally { setBotsLoading(false); }
  };

  const handleUpdateBot = async (e) => {
    e.preventDefault();
    if (!editBotForm.botName) { setResult({ type: 'error', message: 'Bot name is required.' }); return; }
    try {
      setBotsLoading(true);
      const response = await botAPI.updateBot(editingBot.bot_id, { botName: editBotForm.botName });
      if (response.data.success) {
        setResult({ type: 'success', message: 'Bot designation updated.' });
        setShowEditBotModal(false);
        setEditingBot(null);
        await fetchBots();
      }
    } catch (err) {
      setResult({ type: 'error', message: err.response?.data?.message || 'Failed to update bot.' });
    } finally { setBotsLoading(false); }
  };

  const handleDeleteBot = (botId) => setDeleteBotModal({ open: true, botId });

  const confirmDeleteBot = async () => {
    const botId = deleteBotModal.botId;
    setDeleteBotModal({ open: false, botId: null });
    try {
      setBotsLoading(true);
      const response = await botAPI.deleteBot(botId);
      if (response.data.success) {
        setResult({ type: 'success', message: 'Bot removed from registry.' });
        if (selectedBotId === botId) setSelectedBotId(null);
        await fetchBots();
      }
    } catch (err) {
      setResult({ type: 'error', message: err.response?.data?.message || 'Failed to delete bot.' });
    } finally { setBotsLoading(false); }
  };

  const handleTestConnection = async () => {
    if (!selectedBotId) { setResult({ type: 'error', message: 'Select a bot first.' }); return; }
    try {
      setTestLoading(true);
      setTestStatus(null);
      const response = await botAPI.testConnection(selectedBotId);
      if (response.data.success) {
        setTestStatus('ok');
        setResult({ type: 'success', message: response.data.message });
      }
    } catch (err) {
      setTestStatus('fail');
      setResult({ type: 'error', message: err.response?.data?.message || 'Test connection failed.' });
    } finally { setTestLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBotId) { setResult({ type: 'error', message: 'Select a bot first.' }); return; }
    if (!subject || !messageBody || !excelFile) {
      setResult({ type: 'error', message: 'Subject, message body, and recipient file are required.' }); return;
    }
    try {
      setCampaignLoading(true);
      const formData = new FormData();
      formData.append('subject', subject);
      formData.append('messageBody', messageBody);
      if (scheduledTime) formData.append('scheduledTime', scheduledTime);
      formData.append('excelFile', excelFile);
      attachments.forEach(file => formData.append('attachment', file));
      const response = await botAPI.emailCampaign(selectedBotId, formData);
      if (response.data.success) {
        setResult({ type: 'success', message: response.data.message });
        setSubject(''); setMessageBody(''); setScheduledTime('');
        setExcelFile(null); setAttachments([]);
        fetchCampaigns();
      }
    } catch (err) {
      setResult({ type: 'error', message: err.response?.data?.message || 'Failed to schedule campaign.' });
    } finally { setCampaignLoading(false); }
  };

  const handleFileDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) setExcelFile(file);
  };

  const selectedBot = bots.find(b => b.bot_id === selectedBotId);

  // Stats computed from campaigns
  const totalSent   = campaigns.reduce((s, c) => s + (c.sent_count || 0), 0);
  const totalFailed = campaigns.reduce((s, c) => s + (c.failed_count || 0), 0);
  const successRate = (totalSent + totalFailed) > 0
    ? Math.round((totalSent / (totalSent + totalFailed)) * 100)
    : 0;

  const statusDotColor = {
    completed: 'bg-green-400',
    sending:   'bg-blue-400',
    scheduled: 'bg-purple-400',
    failed:    'bg-red-400',
  };
  const statusTextColor = {
    completed: 'text-green-400',
    sending:   'text-blue-400',
    scheduled: 'text-purple-400',
    failed:    'text-red-400',
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center" style={{ fontFamily: "'Inter', sans-serif" }}>
        <style>{EMAIL_STYLES}</style>
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-2 border-[#ffd700]/20 border-t-[#ffd700] animate-spin-slow mx-auto mb-4" />
          <p className="text-white/30 text-sm uppercase tracking-widest font-semibold">Initialising bots…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white relative overflow-hidden pb-32" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{EMAIL_STYLES}</style>
      <Starfield />

      {/* Ambient orbs */}
      <div className="absolute top-[-5%] right-[-8%] w-[500px] h-[500px] opacity-[0.07] pointer-events-none"><FluidOrb /></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[380px] h-[380px] opacity-[0.04] pointer-events-none"><FluidOrb /></div>

      <div className="max-w-5xl mx-auto px-6 lg:px-12 pt-16 relative z-10">

        {/* ── Header ── */}
        <div className="mb-10 fade-up">
          <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.25em] mb-3">Botify · Email Engine</p>
          <h1 className="text-4xl font-bold tracking-tight mb-2">
            Email <span className="text-[#ffd700] gold-glow">Campaign</span> Hub
          </h1>
          <p className="text-white/30 text-sm max-w-lg leading-relaxed">
            Orchestrate intelligent bulk email campaigns. Select a bot agent, compose your message, and deploy to thousands instantly.
          </p>
        </div>

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10 fade-up" style={{ animationDelay: '0.08s' }}>
          {[
            { label: 'Bots',        value: bots.length,         color: 'text-white/70',   sub: 'configured'  },
            { label: 'Campaigns',   value: campaigns.length,    color: 'text-[#ffd700]',  sub: 'total'       },
            { label: 'Emails Sent', value: totalSent,           color: 'text-green-400',  sub: 'delivered'   },
            { label: 'Success Rate',value: `${successRate}%`,   color: 'text-blue-400',   sub: 'avg delivery'},
          ].map(s => (
            <div key={s.label} className="stat-card">
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-[10px] font-bold text-white/25 uppercase tracking-widest mt-1">{s.label}</p>
              <p className="text-[9px] text-white/15 mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Result Banner ── */}
        {result && (
          <div className={`mb-8 px-6 py-4 rounded-2xl glass-card flex items-center justify-between fade-up ${
            result.type === 'success' ? 'border-green-500/20 bg-green-500/5 text-green-400' : 'border-red-500/20 bg-red-500/5 text-red-400'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${result.type === 'success' ? 'bg-green-400' : 'bg-red-400'}`}
                style={{ boxShadow: result.type === 'success' ? '0 0 8px rgba(74,222,128,0.5)' : '0 0 8px rgba(248,113,113,0.5)' }} />
              <span className="text-sm font-medium">{result.message}</span>
            </div>
            <button onClick={() => setResult(null)} className="opacity-40 hover:opacity-100 text-lg leading-none transition-opacity ml-4 shrink-0">&times;</button>
          </div>
        )}

        {/* ── Bot Registry ── */}
        <section className="glass-card p-8 mb-8 fade-up" style={{ animationDelay: '0.12s' }}>
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-white/50 flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-[#ffd700]" />
                Bot Registry
              </h2>
              <p className="text-white/20 text-xs mt-1">{bots.length} agent{bots.length !== 1 ? 's' : ''} configured</p>
            </div>
            <button onClick={() => setShowCreateBotModal(true)} disabled={botsLoading} className="gold-btn">
              + New Agent
            </button>
          </div>

          {bots.length === 0 ? (
            <div className="text-center py-14">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl"
                style={{ background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.12)' }}>📧</div>
              <p className="text-white/30 text-sm mb-6">No email bots deployed. Create one to begin.</p>
              <button onClick={() => setShowCreateBotModal(true)} className="gold-btn">
                Initialise First Agent
              </button>
            </div>
          ) : (
            <div className="grid gap-3">
              {bots.map(bot => {
                const isSelected = selectedBotId === bot.bot_id;
                const initial = bot.bot_name?.[0]?.toUpperCase() || '?';
                return (
                  <div
                    key={bot.bot_id}
                    onClick={() => setSelectedBotId(bot.bot_id)}
                    className={`glass-card glass-card-hover p-4 cursor-pointer flex justify-between items-center group ${isSelected ? 'glass-card-selected' : ''}`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0 transition-all ${
                        isSelected ? 'text-[#050505]' : 'text-white/40'
                      }`} style={{
                        background: isSelected ? 'linear-gradient(135deg,#ffd700,#f0bf00)' : 'rgba(255,255,255,0.06)',
                        border: isSelected ? 'none' : '1px solid rgba(255,255,255,0.05)',
                        boxShadow: isSelected ? '0 0 16px rgba(255,215,0,0.3)' : 'none',
                      }}>
                        {initial}
                      </div>
                      <div>
                        <p className={`font-bold text-sm transition-colors ${isSelected ? 'text-[#ffd700]' : 'text-white/80'}`}>{bot.bot_name}</p>
                        <p className="text-xs text-white/25 mt-0.5">{bot.bot_email || `ID: ${bot.bot_id}`}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
                      <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest px-3 py-1 rounded-full"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        {new Date(bot.created_at).toLocaleDateString()}
                      </span>
                      <button onClick={e => { e.stopPropagation(); setEditingBot(bot); setEditBotForm({ botName: bot.bot_name }); setShowEditBotModal(true); }}
                        disabled={botsLoading}
                        className="px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white border border-white/5 hover:border-white/20 transition-all">
                        Edit
                      </button>
                      <button onClick={e => { e.stopPropagation(); handleDeleteBot(bot.bot_id); }}
                        disabled={botsLoading}
                        className="px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest text-red-400/40 hover:text-red-400 border border-red-500/5 hover:border-red-500/20 transition-all">
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Campaign Form ── */}
        {selectedBot && (
          <form onSubmit={handleSubmit} className="space-y-6 fade-up" style={{ animationDelay: '0.18s' }}>

            {/* Active Bot Banner */}
            <div className="glass-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              style={{ borderColor: 'rgba(255,215,0,0.15)', background: 'rgba(255,215,0,0.03)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black text-[#050505] shrink-0"
                  style={{ background: 'linear-gradient(135deg,#ffd700,#f0bf00)', boxShadow: '0 0 16px rgba(255,215,0,0.3)' }}>
                  {selectedBot.bot_name?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-0.5">Active Agent</p>
                  <p className="text-sm font-bold text-[#ffd700]">{selectedBot.bot_name}</p>
                  {selectedBot.bot_email && <p className="text-xs text-white/25">{selectedBot.bot_email}</p>}
                </div>
              </div>
              <button type="button" onClick={handleTestConnection} disabled={testLoading}
                className={`px-6 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all disabled:opacity-50 flex items-center gap-2 ${
                  testStatus === 'ok'
                    ? 'border border-green-500/30 text-green-400 bg-green-500/5'
                    : testStatus === 'fail'
                    ? 'border border-red-500/30 text-red-400 bg-red-500/5'
                    : 'border border-white/10 hover:border-[#ffd700]/30 text-white/50 hover:text-[#ffd700]'
                }`}>
                {testLoading
                  ? <><span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin-slow" />Testing…</>
                  : testStatus === 'ok' ? '✓ Connection OK'
                  : testStatus === 'fail' ? '✕ Connection Failed'
                  : '⚡ Ping Bot'}
              </button>
            </div>

            {/* Email Composition */}
            <section className="glass-card p-8">
              <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-white/50 mb-6 flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-[#ffd700]" />
                Email Composition
              </h2>
              <div className="space-y-5">
                <div>
                  <label className="block text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">
                    Subject Line <span className="text-[#ffd700]">*</span>
                  </label>
                  <input type="text" required value={subject} onChange={e => setSubject(e.target.value)}
                    placeholder="Your campaign subject line"
                    className="w-full px-5 py-3.5 rounded-xl input-glass text-sm" />
                  <p className="text-[10px] text-white/15 mt-2">Use {'{{name}}'} for personalisation</p>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-[10px] font-bold text-white/30 uppercase tracking-widest">
                      Message Body <span className="text-[#ffd700]">*</span>
                      <span className="ml-2 text-white/15 normal-case font-normal tracking-normal">(HTML supported)</span>
                    </label>
                    <span className="text-[10px] text-white/20">{messageBody.length} chars</span>
                  </div>
                  <textarea required rows={7} value={messageBody} onChange={e => setMessageBody(e.target.value)}
                    placeholder="<h1>Hello {{name}}!</h1>&#10;<p>Your message here…</p>"
                    className="w-full px-5 py-3.5 rounded-xl input-glass text-sm font-mono resize-y" />
                </div>
              </div>
            </section>

            {/* Payload Files */}
            <section className="glass-card p-8">
              <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-white/50 mb-6 flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-[#ffd700]" />
                Payload Files
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Recipients – Drag & Drop */}
                <div>
                  <label className="block text-[10px] font-bold text-white/30 uppercase tracking-widest mb-3">
                    Recipient List <span className="text-[#ffd700]">*</span>
                    <span className="ml-2 text-white/15 font-normal tracking-normal normal-case">.xlsx · .xls · .csv</span>
                  </label>
                  <div
                    className={`drop-zone p-6 text-center ${dragOver ? 'drag-active' : excelFile ? 'has-file' : ''}`}
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleFileDrop}
                    onClick={() => document.getElementById('email-file-input').click()}
                  >
                    {excelFile ? (
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-3xl">📊</span>
                        <p className="text-sm font-bold text-green-400">{excelFile.name}</p>
                        <p className="text-[11px] text-white/25">{(excelFile.size / 1024).toFixed(1)} KB</p>
                        <button type="button" onClick={e => { e.stopPropagation(); setExcelFile(null); }}
                          className="mt-1 text-[10px] font-bold uppercase tracking-widest text-red-400/50 hover:text-red-400 transition-colors">
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                          style={{ background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.12)' }}>
                          <svg className="w-5 h-5 text-[#ffd700]/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm text-white/50 font-medium">Drag & drop your file here</p>
                          <p className="text-xs text-white/25 mt-1">or click to browse</p>
                        </div>
                        <p className="text-[10px] text-white/15">Must contain an <strong className="text-white/30">Email</strong> column</p>
                      </div>
                    )}
                    <input id="email-file-input" type="file" accept=".xlsx,.xls,.csv"
                      onChange={e => { if (e.target.files[0]) setExcelFile(e.target.files[0]); }} className="hidden" />
                  </div>
                </div>

                {/* Attachments */}
                <div>
                  <label className="block text-[10px] font-bold text-white/30 uppercase tracking-widest mb-3">
                    Attachments <span className="text-white/15 font-normal tracking-normal normal-case">— optional</span>
                  </label>
                  <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl cursor-pointer transition-all text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white/70 mb-3"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Files
                    <input type="file" multiple className="hidden"
                      onChange={e => { if (e.target.files.length) setAttachments(prev => [...prev, ...Array.from(e.target.files)]); }} />
                  </label>
                  {attachments.length === 0 && (
                    <p className="text-[10px] text-white/20">Images, PDFs, documents — send alongside your email</p>
                  )}
                  {attachments.length > 0 && (
                    <div className="flex flex-col gap-2">
                      {attachments.map((file, idx) => (
                        <div key={idx} className="file-pill">
                          <span className="text-base shrink-0">{getFileIcon(file.name)}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-white/60 truncate">{file.name}</p>
                            <p className="text-[10px] text-white/25">{(file.size / 1024).toFixed(1)} KB</p>
                          </div>
                          <button type="button" onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                            className="text-red-400/40 hover:text-red-400 font-bold text-base transition-colors shrink-0">×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Scheduling */}
            <section className="glass-card p-8">
              <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-white/50 mb-6 flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-[#ffd700]" />
                Scheduling <span className="text-white/20 font-normal normal-case tracking-normal text-xs ml-1">— optional</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">
                    Dispatch Time
                  </label>
                  <input type="datetime-local" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)}
                    className="w-full px-5 py-3.5 rounded-xl input-glass text-sm"
                    style={{ colorScheme: 'dark' }} />
                  <p className="text-[10px] text-white/15 mt-2">Leave empty to send immediately</p>
                </div>
                <div className="flex flex-col justify-center gap-3 p-5 rounded-2xl"
                  style={{ background: 'rgba(255,215,0,0.03)', border: '1px solid rgba(255,215,0,0.08)' }}>
                  <p className="text-[10px] font-bold text-white/25 uppercase tracking-widest">Delivery Mode</p>
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${scheduledTime ? 'bg-purple-400' : 'bg-[#ffd700]'}`}
                      style={{ boxShadow: scheduledTime ? '0 0 8px rgba(192,132,252,0.6)' : '0 0 8px rgba(255,215,0,0.6)' }} />
                    <p className="text-sm font-bold text-white/70">
                      {scheduledTime ? `Scheduled: ${new Date(scheduledTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}` : 'Immediate dispatch'}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Submit */}
            <button type="submit" disabled={campaignLoading || !selectedBot}
              className="gold-btn w-full py-4 rounded-2xl text-sm flex items-center justify-center gap-2">
              {campaignLoading
                ? <><span className="w-4 h-4 rounded-full border-2 border-[#050505]/30 border-t-[#050505] animate-spin-slow" />Dispatching Campaign…</>
                : '📧 Launch Email Campaign'}
            </button>
          </form>
        )}

        {bots.length === 0 && !loading && (
          <section className="glass-card p-14 text-center fade-up" style={{ animationDelay: '0.2s' }}>
            <p className="text-white/25 text-sm">Create an email agent above to start sending campaigns.</p>
          </section>
        )}

        {/* ── Campaign History ── */}
        <section className="glass-card overflow-hidden mt-8 fade-up" style={{ animationDelay: '0.3s' }}>
          <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-white/50">Campaign Logs</h2>
              <p className="text-white/20 text-xs mt-1">{campaigns.length} record{campaigns.length !== 1 ? 's' : ''}</p>
            </div>
            <button onClick={fetchCampaigns} disabled={campaignsLoading}
              className="px-5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest text-white/30 hover:text-white border border-white/5 hover:border-white/15 transition-all disabled:opacity-40">
              {campaignsLoading ? 'Syncing…' : '↻ Refresh'}
            </button>
          </div>

          {campaignsLoading && campaigns.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 rounded-full border-2 border-[#ffd700]/20 border-t-[#ffd700] animate-spin-slow mx-auto mb-3" />
              <p className="text-white/25 text-xs uppercase tracking-widest">Loading records…</p>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-white/20 text-sm">No campaigns dispatched yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/5">
                    {['Bot', 'Subject', 'Recipients', 'Sent', 'Failed', 'Status', 'Date'].map(h => (
                      <th key={h} className="px-6 py-4 text-[10px] font-bold text-white/20 uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {campaigns.map(c => (
                    <tr key={c.id} className="group hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 text-sm font-bold text-white/80 group-hover:text-white">{c.bot_name}</td>
                      <td className="px-6 py-4 text-sm text-white/40 max-w-[180px] truncate">{c.subject}</td>
                      <td className="px-6 py-4 text-sm text-white/40">{c.recipient_count}</td>
                      <td className="px-6 py-4 text-sm font-bold text-green-400">{c.sent_count}</td>
                      <td className="px-6 py-4 text-sm font-bold text-red-400">{c.failed_count}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${statusDotColor[c.status] || 'bg-white/20'}`} />
                          <span className={`text-[10px] font-bold uppercase tracking-widest ${statusTextColor[c.status] || 'text-white/30'}`}>{c.status}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[11px] text-white/25">
                        {new Date(c.created_at).toLocaleDateString()}{' '}
                        {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* ── Create Bot Modal ── */}
      {showCreateBotModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card p-8 w-full max-w-md fade-up" style={{ background: 'rgba(10,10,10,0.92)' }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
                style={{ background: 'rgba(255,215,0,0.12)', border: '1px solid rgba(255,215,0,0.2)' }}>📧</div>
              <div>
                <h3 className="text-base font-bold leading-tight">Deploy Email Agent</h3>
                <p className="text-white/30 text-[11px]">Configure a new email bot</p>
              </div>
            </div>
            <form onSubmit={handleCreateBot} className="space-y-5">
              <div>
                <label className="block text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">Agent Designation</label>
                <input type="text" required autoFocus value={createBotForm.botName}
                  onChange={e => setCreateBotForm({ ...createBotForm, botName: e.target.value })}
                  placeholder="e.g., Newsletter Bot, Sales Outreach"
                  className="w-full px-5 py-3.5 rounded-xl input-glass text-sm" />
                <p className="text-[10px] text-white/20 mt-2">A unique name for easy identification</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreateBotModal(false)} disabled={botsLoading}
                  className="flex-1 px-4 py-3 rounded-xl border border-white/10 text-white/40 font-bold text-xs uppercase tracking-widest hover:bg-white/5 transition-all">Cancel</button>
                <button type="submit" disabled={botsLoading} className="flex-1 gold-btn py-3 rounded-xl text-xs flex items-center justify-center gap-2">
                  {botsLoading ? <><span className="w-3 h-3 rounded-full border-2 border-[#050505]/30 border-t-[#050505] animate-spin-slow" />Creating…</> : 'Deploy Agent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Bot Modal ── */}
      {showEditBotModal && editingBot && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card p-8 w-full max-w-md fade-up" style={{ background: 'rgba(10,10,10,0.92)' }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black text-[#050505]"
                style={{ background: 'linear-gradient(135deg,#ffd700,#f0bf00)' }}>
                {editingBot.bot_name?.[0]?.toUpperCase() || '?'}
              </div>
              <div>
                <h3 className="text-base font-bold leading-tight">Edit Agent Name</h3>
                <p className="text-white/30 text-[11px]">Rename <span className="text-[#ffd700]">{editingBot.bot_name}</span></p>
              </div>
            </div>
            <form onSubmit={handleUpdateBot} className="space-y-5">
              <div>
                <label className="block text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">New Designation</label>
                <input type="text" required autoFocus value={editBotForm.botName}
                  onChange={e => setEditBotForm({ ...editBotForm, botName: e.target.value })}
                  className="w-full px-5 py-3.5 rounded-xl input-glass text-sm" />
                {editingBot.bot_email && (
                  <p className="text-[10px] text-white/20 mt-2">Email: <span className="text-white/40">{editingBot.bot_email}</span></p>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowEditBotModal(false)} disabled={botsLoading}
                  className="flex-1 px-4 py-3 rounded-xl border border-white/10 text-white/40 font-bold text-xs uppercase tracking-widest hover:bg-white/5 transition-all">Cancel</button>
                <button type="submit" disabled={botsLoading} className="flex-1 gold-btn py-3 rounded-xl text-xs flex items-center justify-center gap-2">
                  {botsLoading ? <><span className="w-3 h-3 rounded-full border-2 border-[#050505]/30 border-t-[#050505] animate-spin-slow" />Saving…</> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={deleteBotModal.open}
        onClose={() => setDeleteBotModal({ open: false, botId: null })}
        onConfirm={confirmDeleteBot}
        title="Remove Bot Agent"
        message="Are you sure you want to permanently remove this email bot? All associated data will be archived."
        confirmText="Remove Agent"
        variant="danger"
      />
    </div>
  );
};

export default EmailBot;
